// @ts-check
/**
 * 集成/打包校验（零依赖，Node 标准库）
 *
 * 用法：node scripts/verify.mjs [--json]
 *
 * 校验项（与 task-13 / Lead 的集成清单一一对应）：
 *  1. package.json：导出/文件清单/dsh.bundle.patch/dsh.client/engines 完整且引用文件存在
 *  2. locale zh/en 键集一致、无空值
 *  3. icon.svg 有效且 < 256KiB
 *  4. lib/index.js 为 Host 空壳（无 import、仅 apply 导出）
 *  5. lib/client.js：`__ModuleLoader__.load({id:<包名>, factory})` 包装、只依赖宿主 react、
 *     无 Host 业务标记、无绝对路径/Node 内建、无 src/host 模块
 *  6. 构建一致性：重新计算产物并与 lib/client.js 逐字节比对（等价 `build.mjs --check`）
 *  7. 源码边界：core/adapters/send 无 window/document、相对 import 带 .js、无 default/动态 import
 *
 * 退出码：0 全部通过；1 存在失败项。
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBundleSource } from './build.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_ICON_BYTES = 256 * 1024;
const JSON_OUT = process.argv.includes('--json');

/** @type {Array<{group: string, name: string, ok: boolean, detail: string}>} */
const checks = [];

/** @param {string} group @param {string} name @param {boolean} ok @param {string} [detail] */
function check(group, name, ok, detail = '') {
  checks.push({ group, name, ok: Boolean(ok), detail });
}

/** @param {string} p */
function read(p) {
  return readFileSync(p, 'utf8');
}

/** @param {string} p */
function exists(p) {
  return existsSync(p) && statSync(p).isFile();
}

/** @param {string} text @returns {string} */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** @param {any} obj @param {string} [prefix] @returns {string[]} */
function flattenKeys(obj, prefix = '') {
  /** @type {string[]} */
  const out = [];
  for (const [key, value] of Object.entries(obj ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) out.push(...flattenKeys(value, path));
    else out.push(path);
  }
  return out.sort();
}

/** @param {string} file */
function walkJs(file) {
  if (!existsSync(file)) return [];
  const stat = statSync(file);
  if (stat.isFile()) return file.endsWith('.js') ? [file] : [];
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(file)) out.push(...walkJs(join(file, entry)));
  return out;
}

// ── 1. package.json ──────────────────────────────────────────────────
const pkgPath = join(ROOT, 'package.json');
const pkg = JSON.parse(read(pkgPath));
check('package', 'name/version/type', typeof pkg.name === 'string' && pkg.name.length > 0 && typeof pkg.version === 'string' && pkg.type === 'module', `${pkg.name}@${pkg.version}`);
check('package', 'main → lib/index.js', pkg.main === 'lib/index.js' && exists(join(ROOT, 'lib/index.js')), String(pkg.main));
check('package', 'exports . / ./client', pkg.exports?.['.'] === './lib/index.js' && pkg.exports?.['./client'] === './lib/client.js' && exists(join(ROOT, 'lib/client.js')), `${pkg.exports?.['.']} / ${pkg.exports?.['./client']}`);
check('package', 'dsh.bundle.patch → cordis.patch.yml', pkg.dsh?.bundle?.patch === './cordis.patch.yml' && exists(join(ROOT, 'cordis.patch.yml')), String(pkg.dsh?.bundle?.patch));
check('package', 'dsh.client.platform=web', pkg.dsh?.client?.platform === 'web', String(pkg.dsh?.client?.platform));
check('package', 'dsh.client.inject 非空', Array.isArray(pkg.dsh?.client?.inject) && pkg.dsh.client.inject.length > 0, (pkg.dsh?.client?.inject ?? []).join(', '));
check('package', 'engines.node / engines.dsh', Boolean(pkg.engines?.node && pkg.engines?.dsh), `${pkg.engines?.node} · ${pkg.engines?.dsh}`);

/** @type {string[]} */
const fileEntries = Array.isArray(pkg.files) ? pkg.files : [];
/** @param {string} pattern @returns {string[]} */
function expandEntry(pattern) {
  if (!pattern.includes('*')) return [pattern];
  const dir = dirname(pattern);
  const suffix = pattern.slice(pattern.lastIndexOf('*') + 1);
  if (!existsSync(join(ROOT, dir))) return [];
  return readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith(suffix))
    .map((f) => join(dir, f));
}
/** @type {string[]} */
const covered = fileEntries.flatMap(expandEntry);
const requiredFiles = ['lib/client.js', 'lib/index.js', 'cordis.patch.yml', 'icon.svg', 'README.md'];
for (const required of requiredFiles) {
  check('package', `files 覆盖 ${required}`, covered.includes(required) && exists(join(ROOT, required)), covered.includes(required) ? 'ok' : 'missing');
}
check('package', 'files 覆盖 locale/*.json', covered.some((f) => f.startsWith('locale/') && f.endsWith('.json')), 'ok');

// ── 2. locale 键集一致 ───────────────────────────────────────────────
const localeDir = join(ROOT, 'locale');
const zh = JSON.parse(read(join(localeDir, 'zh.json')));
const en = JSON.parse(read(join(localeDir, 'en.json')));
const zhKeys = flattenKeys(zh);
const enKeys = flattenKeys(en);
const missingEn = zhKeys.filter((k) => !enKeys.includes(k));
const missingZh = enKeys.filter((k) => !zhKeys.includes(k));
check('locale', 'zh/en 键集一致', missingEn.length === 0 && missingZh.length === 0, missingEn.length + missingZh.length === 0 ? `${zhKeys.length} keys` : `missing en:${missingEn.join(',')} missing zh:${missingZh.join(',')}`);
const emptyZh = zhKeys.filter((k) => !String(k.split('.').reduce((o, part) => o?.[part], zh)).trim());
const emptyEn = enKeys.filter((k) => !String(k.split('.').reduce((o, part) => o?.[part], en)).trim());
check('locale', '无空值', emptyZh.length === 0 && emptyEn.length === 0, emptyZh.length + emptyEn.length === 0 ? 'ok' : `empty:${[...emptyZh, ...emptyEn].join(',')}`);

// ── 3. icon.svg ──────────────────────────────────────────────────────
const iconPath = join(ROOT, 'icon.svg');
const iconText = exists(iconPath) ? read(iconPath) : '';
const iconSize = exists(iconPath) ? statSync(iconPath).size : 0;
const iconValid = /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/.test(iconText) && iconText.includes('</svg>') && (iconText.includes('viewBox') || (iconText.includes('width') && iconText.includes('height')));
check('icon', '有效 SVG 且 <256KiB', iconValid && iconSize > 0 && iconSize < MAX_ICON_BYTES, `${iconSize} B`);

// ── 4. lib/index.js 空壳 Host 半 ────────────────────────────────────
const hostPath = join(ROOT, 'lib/index.js');
const hostCode = exists(hostPath) ? stripComments(read(hostPath)) : '';
const hostImports = /\b(?:import|require)\s*[\(\s'"]/.test(hostCode);
const hostExports = (hostCode.match(/\bexport\b/g) ?? []).length;
check('host', 'lib/index.js 存在', exists(hostPath), hostPath.replace(ROOT + '/', ''));
check('host', '空壳：无 import/require', !hostImports, hostImports ? 'has import' : 'ok');
check('host', '空壳：仅 apply 导出', /function\s+apply\s*\(/.test(hostCode) && /export\s*\{\s*apply\s*\}/.test(hostCode) && hostExports === 1, `export count=${hostExports}`);

// ── 5. lib/client.js 包装与依赖 ────────────────────────────────────
const clientPath = join(ROOT, 'lib/client.js');
const clientCode = exists(clientPath) ? read(clientPath) : '';
const wrapMatch = /window\.__ModuleLoader__\.load\(\{\s*id:\s*"([^"]+)"/.exec(clientCode);
check('bundle', 'ModuleLoader 包装', Boolean(wrapMatch) && /factory:\s*function\s*\(require\)/.test(clientCode), wrapMatch ? `id=${wrapMatch[1]}` : 'missing');
check('bundle', 'bundle id == package.name', Boolean(wrapMatch) && wrapMatch[1] === pkg.name, wrapMatch ? wrapMatch[1] : '');
const requireSpecs = [...clientCode.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
const allowedRequires = new Set(['react']);
const badRequires = requireSpecs.filter((s) => !allowedRequires.has(s));
check('bundle', '只依赖宿主模块 react', badRequires.length === 0, [...new Set(requireSpecs)].join(', ') || 'none');
const hostMarkers = ['sessionQuery', 'connection.fetch', 'agentTeams', 'webServer.register', '/api/group-chat', 'process.env', 'node:fs', 'node:path'];
const foundMarkers = hostMarkers.filter((m) => clientCode.includes(m));
check('bundle', '不含 Host 业务/Node 标记', foundMarkers.length === 0, foundMarkers.join(', ') || 'ok');
check('bundle', '不含绝对路径', !clientCode.includes('/Users/lzx') && !clientCode.includes('/Users/'), 'ok');
check('bundle', '不含 src/host 模块', !clientCode.includes('src/host/'), 'ok');
check('bundle', '关键入口在产物内', ['sendChannelBatch', 'createClientSessionSource', 'conversation.view'].every((s) => clientCode.includes(s)), 'sendChannelBatch / createClientSessionSource / conversation.view');
const bundleSha = createHash('sha256').update(clientCode).digest('hex');
check('bundle', '产物大小合理', clientCode.length > 200_000, `${clientCode.length} B · sha256=${bundleSha.slice(0, 16)}…`);

// ── 6. 构建一致性（等价 build --check） ─────────────────────────────
let build = null;
try {
  build = buildBundleSource();
} catch (error) {
  check('build', '重新构建成功', false, String(error && error.message));
}
if (build) {
  check('build', 'lib/client.js 与源一致（fresh）', build.code === clientCode, build.code === clientCode ? `${build.moduleIds.length} modules · ${build.partIds.length} parts` : 'STALE: run node scripts/build.mjs');
  check('build', '模块数/parts 数', build.moduleIds.length >= 26 && build.partIds.length >= 11, `${build.moduleIds.length} modules · ${build.partIds.length} parts`);
  check('build', '内联 locale 键集', build.buildInfo?.localeKeys === zhKeys.length || build.buildInfo?.localeKeys === undefined, `localeKeys=${build.buildInfo?.localeKeys ?? 'n/a'} zh=${zhKeys.length}`);
}

// ── 7. 源码边界 ─────────────────────────────────────────────────────
const srcDirs = ['src/core', 'src/adapters', 'src/send', 'src/client'];
const srcFiles = srcDirs.flatMap((d) => walkJs(join(ROOT, d)));
/** @type {string[]} */
const boundaryIssues = [];
for (const file of srcFiles) {
  const rel = relative(ROOT, file);
  const code = stripComments(read(file));
  if (/\bexport\s+default\b/.test(code)) boundaryIssues.push(`${rel}: export default`);
  if (/^\s*export\s+\*/m.test(code)) boundaryIssues.push(`${rel}: export *`);
  if (/export\s*\{[^}]*\}\s*from\b/.test(code)) boundaryIssues.push(`${rel}: export ... from`);
  if (/\bimport\s*\(/.test(code)) boundaryIssues.push(`${rel}: dynamic import`);
  if (/\brequire\s*\(/.test(code)) boundaryIssues.push(`${rel}: require()`);
  const specifiers = [...code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const spec of specifiers) {
    if (!spec.startsWith('.')) boundaryIssues.push(`${rel}: non-relative import '${spec}'`);
    else if (!spec.endsWith('.js')) boundaryIssues.push(`${rel}: import without .js '${spec}'`);
  }
  if (rel.startsWith('src/core') || rel.startsWith('src/adapters') || rel.startsWith('src/send')) {
    if (/\bwindow\b/.test(code)) boundaryIssues.push(`${rel}: window`);
    if (/\bdocument\b/.test(code)) boundaryIssues.push(`${rel}: document`);
    if (/from\s+['"]node:/.test(code)) boundaryIssues.push(`${rel}: node builtin`);
  }
  if (read(file).includes('/Users/lzx')) boundaryIssues.push(`${rel}: absolute path`);
}
check('source', '源码边界（无 default/动态 import/非相对/node/DOM）', boundaryIssues.length === 0, boundaryIssues.length === 0 ? `${srcFiles.length} files` : boundaryIssues.slice(0, 5).join(' | '));
check('source', 'src/host 无 Host 业务 JS', walkJs(join(ROOT, 'src/host')).length === 0, 'only README');
check('source', '无越界源码目录引用', !srcFiles.some((f) => read(f).includes('src/host/')), 'ok');

// ── 汇总 ─────────────────────────────────────────────────────────────
const failed = checks.filter((c) => !c.ok);
if (JSON_OUT) {
  process.stdout.write(`${JSON.stringify({ ok: failed.length === 0, bundleSha256: bundleSha, checks }, null, 2)}\n`);
} else {
  let lastGroup = '';
  for (const c of checks) {
    if (c.group !== lastGroup) {
      process.stdout.write(`\n[${c.group}]\n`);
      lastGroup = c.group;
    }
    process.stdout.write(`  ${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}\n`);
  }
  process.stdout.write(`\n${failed.length === 0 ? '✅ ALL PASS' : `❌ ${failed.length} FAILED`} · ${checks.length} checks · lib/client.js sha256=${bundleSha}\n`);
}
process.exitCode = failed.length === 0 ? 0 : 1;
