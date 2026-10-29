#!/usr/bin/env node
/**
 * scripts/build.mjs — 零依赖拼接构建（架构 §3.5）
 *
 * 把
 *   src/core/* + src/adapters/* + src/send/*   （ES module → 每文件独立 factory）
 *   src/client/parts/*.part.js                 （按文件名顺序，共享一个作用域）
 *   src/client/entry.js                        （apply / inject / __internals）
 * 拼成单文件浏览器 bundle `lib/client.js`：
 *
 *   window.__ModuleLoader__.load({ id: '<包名>', factory(require) { ... } })
 *
 * 约定（与 T1/T3 的模块边界）：
 *  - 只用 named export；禁止 export default / export * from / 动态 import() / require() / Node API；
 *  - 相对 import 必须带 `.js` 后缀；
 *  - parts 是裸代码片段（无 import/export），文件名决定拼接顺序。
 *
 * 用法：
 *   node scripts/build.mjs            # 生成 lib/client.js
 *   node scripts/build.mjs --check    # 校验产物与源一致（不写盘）
 *   node scripts/build.mjs --stdout   # 打印产物（调试）
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, relative, resolve as resolvePath, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const PLUGIN_ROOT = resolvePath(__dirname, '..')
export const BUNDLE_ID = '@local/dsh-group-chat'
export const OUTPUT_PATH = join(PLUGIN_ROOT, 'lib', 'client.js')

/* ── 通用工具 ─────────────────────────────────────────────────────────── */

function toPosix(path) {
  return path.split(sep).join('/')
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  const entries = readdirSync(dir).sort()
  for (const entry of entries) {
    const full = join(dir, entry)
    const info = statSync(full)
    if (info.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

/** `src/foo/bar.js` → 插件根相对路径（POSIX） */
function moduleIdOf(file) {
  return toPosix(relative(PLUGIN_ROOT, file))
}

/** 解析 import 说明符 → 插件根相对模块 id；非法时报错（构建期契约）。 */
export function resolveSpecifier(spec, importerId) {
  if (!spec.startsWith('.')) {
    throw new Error(
      `[build] ${importerId}: bare import '${spec}' is not allowed (only relative './x.js' targets from src/).`
    )
  }
  if (!spec.endsWith('.js')) {
    throw new Error(`[build] ${importerId}: import '${spec}' must include the '.js' extension.`)
  }
  const importerDir = dirname(join(PLUGIN_ROOT, importerId))
  const absolute = resolvePath(importerDir, spec)
  const id = toPosix(relative(PLUGIN_ROOT, absolute))
  if (id.startsWith('..')) {
    throw new Error(`[build] ${importerId}: import '${spec}' resolves outside the plugin root.`)
  }
  return id
}

/* ── ESM → factory 转换 ───────────────────────────────────────────────── */

const IMPORT_FROM_RE = /^import\s+([\s\S]+?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/
const IMPORT_SIDE_EFFECT_RE = /^import\s+['"]([^'"]+)['"]\s*;?\s*$/

/** 去掉 `// 注释` 与 `/* … *\/`（只用于 import/export 列表的解析）。 */
function stripLineComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

function parseClause(clause, moduleId) {  const text = clause.trim()
  const parts = []
  let rest = text
  if (rest.startsWith('*')) {
    const match = /^\*\s+as\s+([A-Za-z_$][\w$]*)$/.exec(rest)
    if (!match) throw new Error(`[build] ${moduleId}: unsupported namespace import '${text}'.`)
    return [{ kind: 'namespace', name: match[1] }]
  }
  if (rest.startsWith('{')) {
    return [{ kind: 'named', names: parseNamedList(rest, moduleId) }]
  }
  // 默认导入（可能后接 , { … } 或 , * as ns）
  const commaIndex = rest.indexOf(',')
  if (commaIndex < 0) {
    if (!/^[A-Za-z_$][\w$]*$/.test(rest)) throw new Error(`[build] ${moduleId}: bad default import '${text}'.`)
    parts.push({ kind: 'default', name: rest })
    return parts
  }
  const head = rest.slice(0, commaIndex).trim()
  if (!/^[A-Za-z_$][\w$]*$/.test(head)) throw new Error(`[build] ${moduleId}: bad default import '${text}'.`)
  parts.push({ kind: 'default', name: head })
  rest = rest.slice(commaIndex + 1).trim()
  if (rest.startsWith('*')) {
    const match = /^\*\s+as\s+([A-Za-z_$][\w$]*)$/.exec(rest)
    if (!match) throw new Error(`[build] ${moduleId}: unsupported namespace import '${text}'.`)
    parts.push({ kind: 'namespace', name: match[1] })
    return parts
  }
  if (rest.startsWith('{')) {
    parts.push({ kind: 'named', names: parseNamedList(rest, moduleId) })
    return parts
  }
  throw new Error(`[build] ${moduleId}: unsupported import clause '${text}'.`)
}

function parseNamedList(text, moduleId) {
  const match = /^\{([\s\S]*)\}$/.exec(text.trim())
  if (!match) throw new Error(`[build] ${moduleId}: bad named import '${text}'.`)
  const names = []
  for (const raw of match[1].split(',')) {
    const item = raw.trim()
    if (!item) continue
    const as = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(item)
    if (!as) throw new Error(`[build] ${moduleId}: bad named import item '${item}'.`)
    names.push({ imported: as[1], local: as[2] || as[1] })
  }
  return names
}

function rewriteImport(statement, moduleId, resolve) {
  const text = statement.trim()
  const sideEffect = IMPORT_SIDE_EFFECT_RE.exec(text)
  if (sideEffect) {
    const id = resolve(sideEffect[1], moduleId)
    return `__req(${JSON.stringify(id)}); /* side-effect import */`
  }
  const match = IMPORT_FROM_RE.exec(text)
  if (!match) throw new Error(`[build] ${moduleId}: unsupported import statement:\n${statement}`)
  const id = resolve(match[2], moduleId)
  const clause = parseClause(match[1], moduleId)
  const lines = []
  for (const part of clause) {
    if (part.kind === 'namespace') lines.push(`const ${part.name} = __req(${JSON.stringify(id)});`)
    else if (part.kind === 'default') lines.push(`const ${part.name} = __req(${JSON.stringify(id)});`)
    else {
      const bindings = part.names
        .map((item) => (item.imported === item.local ? item.imported : `${item.imported}: ${item.local}`))
        .join(', ')
      lines.push(`const { ${bindings} } = __req(${JSON.stringify(id)});`)
    }
  }
  return lines.join('\n')
}

/**
 * 把一个 ES module 源文件转成 factory body：
 *   function (__exports, __req) { ...; Object.assign(__exports, {...}) }
 */
export function transformModule(source, moduleId, resolve = resolveSpecifier) {
  if (/^\s*export\s+default\b/m.test(source)) {
    throw new Error(`[build] ${moduleId}: 'export default' is not supported (use a named export).`)
  }
  if (/^\s*export\s+\*\s+from\b/m.test(source)) {
    throw new Error(`[build] ${moduleId}: 'export * from' is not supported.`)
  }
  if (/^\s*export\s*\{[^}]*\}\s*from\b/m.test(source)) {
    throw new Error(`[build] ${moduleId}: re-export 'export {...} from' is not supported.`)
  }

  const lines = source.split('\n')
  const out = []
  const exported = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (/^import\b/.test(trimmed)) {
      let statement = line
      while (!/from\s*['"][^'"]+['"]\s*;?\s*$/.test(statement.trim()) && !IMPORT_SIDE_EFFECT_RE.test(statement.trim())) {
        index += 1
        if (index >= lines.length) {
          throw new Error(`[build] ${moduleId}: unterminated import statement.`)
        }
        statement += '\n' + lines[index]
      }
      out.push(rewriteImport(statement, moduleId, resolve))
      index += 1
      continue
    }

    const declared = /^export\s+(async\s+function|function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(trimmed)
    if (declared) {
      out.push(line.replace(/^(\s*)export\s+/, '$1'))
      exported.push({ exported: declared[2], local: declared[2] })
      index += 1
      continue
    }

    if (/^export\s*\{/.test(trimmed)) {
      let statement = line
      while (statement.indexOf('}') < 0) {
        index += 1
        if (index >= lines.length) {
          throw new Error(`[build] ${moduleId}: unterminated export list.`)
        }
        statement += '\n' + lines[index]
      }
      const joined = statement.trim()
      if (/\}\s*from\b/.test(joined)) {
        throw new Error(`[build] ${moduleId}: re-export 'export {...} from' is not supported.`)
      }
      const listOnly = /^export\s*\{([\s\S]*)\}\s*;?$/.exec(joined)
      if (!listOnly) throw new Error(`[build] ${moduleId}: bad export list.`)
      const listText = stripLineComments(listOnly[1])
      for (const raw of listText.split(',')) {
        const item = raw.trim()
        if (!item) continue
        const as = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(item)
        if (!as) throw new Error(`[build] ${moduleId}: bad export list item '${item}'.`)
        exported.push({ exported: as[2] || as[1], local: as[1] })
      }
      index += 1
      continue
    }

    if (/^export\b/.test(trimmed)) {
      throw new Error(`[build] ${moduleId}: unsupported export form: ${trimmed}`)
    }

    out.push(line)
    index += 1
  }

  const assignment =
    exported.length > 0
      ? '\nObject.assign(__exports, { ' +
        exported
          .map((item) => `${JSON.stringify(item.exported)}: ${item.local}`)
          .join(', ') +
        ' });'
      : ''
  return 'function (__exports, __req) {\n' + out.join('\n') + assignment + '\n}'
}

/* ── 收集模块 / parts / 资源 ──────────────────────────────────────────── */

export function collectModules(root = PLUGIN_ROOT) {
  const srcRoot = join(root, 'src')
  const files = walk(srcRoot).filter((file) => {
    const id = toPosix(relative(root, file))
    if (!id.endsWith('.js')) return false
    if (id.startsWith('src/client/')) return false
    return true
  })
  return files
    .map((file) => ({ id: toPosix(relative(root, file)), file }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function collectParts(root = PLUGIN_ROOT) {
  const partsDir = join(root, 'src', 'client', 'parts')
  const files = walk(partsDir).filter((file) => file.endsWith('.part.js'))
  return files
    .map((file) => ({ id: toPosix(relative(root, file)), file }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function readLocales(root = PLUGIN_ROOT) {
  const zh = readJson(join(root, 'locale', 'zh.json'))
  const en = readJson(join(root, 'locale', 'en.json'))
  return { zh, en }
}

export function validateLocales(locales) {
  const zhKeys = Object.keys(locales.zh).sort()
  const enKeys = Object.keys(locales.en).sort()
  const missingInEn = zhKeys.filter((key) => enKeys.indexOf(key) < 0)
  const missingInZh = enKeys.filter((key) => zhKeys.indexOf(key) < 0)
  if (missingInEn.length > 0 || missingInZh.length > 0) {
    throw new Error(
      '[build] locale key mismatch: ' +
        `missing in en=[${missingInEn.join(', ')}] ` +
        `missing in zh=[${missingInZh.join(', ')}]`
    )
  }
  return zhKeys
}

const REQUIRED_TESTIDS = [
  'group-chat-feed',
  'group-chat-time-divider',
  'group-chat-bubble',
  'group-chat-bubble-caption',
  'group-chat-fold-toggle',
  'group-chat-unread-pill',
  'group-chat-newmessages-hint',
  'group-chat-filter-banner',
  'group-chat-readonly-banner',
  'group-chat-reconnect-banner',
  'group-chat-mention-popup',
  'group-chat-composer',
  'group-chat-send',
  'group-chat-target-row',
  'group-chat-error',
  // v1.7（架构 §6.5.2）
  'group-chat-target-chips',
  'group-chat-composer-hint',
  'group-chat-member-strip',
  'group-chat-member-strip-item',
  'agent-trajectory-panel',
  'agent-trajectory-overlay',
  'agent-trajectory-turn',
  'agent-trajectory-load-older'
]

const REQUIRED_STRINGS = [
  // v1.7 图标动作与 Markdown 类名（架构 §6.5.2 / §6.12 / §6.16）
  'copy-message',
  'open-session',
  'gc-md-strong',
  'gc-md-pre',
  'gc-md-link',
  'gc-md-code',
  'gc-md-list',
  'gc-trajectory-panel',
  'gc-member-strip'
]

const REQUIRED_DATA_ATTRS = [
  'data-kind',
  'data-message-id',
  'data-status',
  'data-member-kind',
  'data-parent',
  'data-mention',
  'data-system-variant',
  'data-card',
  'data-sender',
  'data-member-id',
  'data-member-state',
  'data-creation-id',
  'data-pair-order',
  'data-action',
  'data-field',
  'data-task-id',
  'data-task-revision',
  'data-task-action',
  'data-task-status',
  'data-task-owner',
  'data-task-actor',
  'data-task-blocked-by',
  'data-replay',
  'data-filter',
  'data-count',
  'data-targets',
  'data-retryable',
  // v1.7
  'data-md',
  'data-md-link',
  'data-md-table',
  'data-card-accent',
  'data-card-avatar',
  'data-member-state',
  'data-turn-index',
  'data-turn-status',
  'data-line-count',
  'data-target'
]

/* ── 组装 bundle ──────────────────────────────────────────────────────── */

export function buildBundleSource(options = {}) {
  const root = options.root ? resolvePath(options.root) : PLUGIN_ROOT
  const pkg = readJson(join(root, 'package.json'))
  const id = options.id || pkg.name || BUNDLE_ID
  const locales = readLocales(root)
  const localeKeys = validateLocales(locales)
  const includeModules = options.modules !== 'none'
  const modules = includeModules ? collectModules(root) : []
  const parts = collectParts(root)
  const entryPath = join(root, 'src', 'client', 'entry.js')
  if (!existsSync(entryPath)) throw new Error('[build] missing src/client/entry.js')
  const cssPath = join(root, 'src', 'styles', 'group-chat.css')
  if (!existsSync(cssPath)) throw new Error('[build] missing src/styles/group-chat.css')
  const css = readFileSync(cssPath, 'utf8')

  const moduleChunks = []
  const moduleIds = []
  const hashParts = []
  for (const module of modules) {
    const source = readFileSync(module.file, 'utf8')
    hashParts.push(module.id, source)
    const body = transformModule(source, module.id, resolveSpecifier)
    moduleIds.push(module.id)
    moduleChunks.push(
      `/* ── ${module.id} ─────────────────────────────────────────── */\n__def(${JSON.stringify(module.id)}, ${body});\n`
    )
  }

  const partChunks = []
  for (const part of parts) {
    const source = readFileSync(part.file, 'utf8')
    hashParts.push(part.id, source)
    partChunks.push(`/* ── ${part.id} ─────────────────────────────────────────── */\n${source}\n`)
  }
  const entrySource = readFileSync(entryPath, 'utf8')
  hashParts.push('src/client/entry.js', entrySource)
  partChunks.push(`/* ── src/client/entry.js ──────────────────────────────────────── */\n${entrySource}\n`)
  hashParts.push('locale', JSON.stringify(locales), 'css', css)

  // 构建指纹：用于「页面实际加载的是哪个版本」的诊断展示（失败 caption 的 build=…）
  const buildHash = createHash('sha256').update(hashParts.join('\u0000')).digest('hex').slice(0, 12)
  const buildInfo = {
    id,
    version: pkg.version || '0.0.0',
    hash: buildHash,
    build: `${pkg.version || '0.0.0'}+${buildHash}`,
    modules: moduleIds,
    parts: parts.map((part) => part.id),
    localeKeys: localeKeys.length
  }

  const header = `/**
 * ${id} · client half (GENERATED FILE — do not edit)
 *
 * 由 scripts/build.mjs 从以下源拼接生成：
 *   - src/{core,adapters,send}/*.js（ES module → 每文件独立 factory）
 *   - src/client/parts/NN-*.part.js（按文件名顺序）
 *   - src/client/entry.js（apply / inject）
 *   - locale/{zh,en}.json（内联字典，键集 ${localeKeys.length}）
 *   - src/styles/group-chat.css（内联样式）
 *
 * 重新生成：node scripts/build.mjs   ·   一致性校验：node scripts/build.mjs --check
 */
window.__ModuleLoader__.load({
  id: ${JSON.stringify(id)},
  factory: function (require) {
    'use strict';

    var React = require('react');
    var h = React.createElement;
    var Fragment = React.Fragment;

    var __GC_BUILD = ${JSON.stringify(buildInfo, null, 2)};

    /* ── 模块注册表（src/core|adapters|send） ─────────────────────────── */
    var __modDefs = Object.create(null);
    var __modCache = Object.create(null);

    function __def(id, factory) {
      __modDefs[id] = factory;
    }

    function __req(id) {
      if (Object.prototype.hasOwnProperty.call(__modCache, id)) return __modCache[id];
      var factory = __modDefs[id];
      if (typeof factory !== 'function') {
        var known = Object.keys(__modDefs);
        throw new Error('[group-chat] module not found: ' + id + (known.length ? ' (available: ' + known.join(', ') + ')' : ''));
      }
      var exports = {};
      __modCache[id] = exports;
      factory(exports, __req);
      return exports;
    }

    function __has(id) {
      return Object.prototype.hasOwnProperty.call(__modDefs, id);
    }

    function __opt(id) {
      return __has(id) ? __req(id) : undefined;
    }

    /* ── 内联字典 / 样式 ──────────────────────────────────────────────── */
    var GC_LOCALE = ${JSON.stringify(locales)};
    var GC_CSS = ${JSON.stringify(css)};

`

  const code = header + moduleChunks.join('') + '\n' + partChunks.join('') + `
    return { inject: INJECT, apply: apply, __internals: __internals };
  },
});
`

  // 契约守卫：冻结的 DOM 选择器必须出现在产物里（架构 §6.5.2）
  const missing = REQUIRED_TESTIDS.filter((testId) => code.indexOf(testId) < 0)
    .concat(REQUIRED_DATA_ATTRS.filter((attr) => code.indexOf(attr) < 0))
    .concat(REQUIRED_STRINGS.filter((token) => code.indexOf(token) < 0))
  if (missing.length > 0) {
    throw new Error('[build] DOM contract symbols missing from bundle: ' + missing.join(', '))
  }

  // 语法校验（classic script：顶层不能有 import/export）
  // eslint-disable-next-line no-new
  new vm.Script(code, { filename: 'lib/client.js' })

  return { code, buildInfo, moduleIds, partIds: buildInfo.parts }
}

/* ── CLI ──────────────────────────────────────────────────────────────── */

function main(argv) {
  const args = argv.slice(2)
  const check = args.indexOf('--check') >= 0
  const stdout = args.indexOf('--stdout') >= 0
  const result = buildBundleSource()
  const outPath = OUTPUT_PATH

  if (stdout) {
    process.stdout.write(result.code)
    return 0
  }

  if (check) {
    if (!existsSync(outPath)) {
      process.stderr.write('[build] --check failed: lib/client.js does not exist. Run: node scripts/build.mjs\n')
      return 1
    }
    const current = readFileSync(outPath, 'utf8')
    if (current !== result.code) {
      process.stderr.write('[build] --check failed: lib/client.js is stale. Run: node scripts/build.mjs\n')
      return 1
    }
    process.stdout.write(
      `[build] up to date: lib/client.js (${result.moduleIds.length} modules, ${result.partIds.length} parts)\n`
    )
    return 0
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, result.code, 'utf8')
  process.stdout.write(
    '[build] wrote ' +
      toPosix(relative(process.cwd(), outPath)) +
      ` (${result.code.length} bytes · ${result.moduleIds.length} core/adapters/send modules · ${result.partIds.length} parts)\n`
  )
  return 0
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  try {
    process.exitCode = main(process.argv)
  } catch (error) {
    process.stderr.write(String((error && error.stack) || error) + '\n')
    process.exitCode = 1
  }
}
