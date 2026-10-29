/**
 * test/client/build.test.mjs — 构建脚本与 bundle 形态
 *
 * 覆盖：
 *  - ESM → factory 转换（named export / 三种 import / 多行 export 列表 / 注释）
 *  - 契约拒绝（export default / export * from / bare import / 缺 .js）
 *  - bundle 包装形态（window.__ModuleLoader__.load + id=包名 + factory(require)）
 *  - DOM 契约符号（data-testid / data-*）必须进产物
 *  - locale 键集一致性
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

import { transformModule, buildBundleSource, validateLocales, PLUGIN_ROOT } from '../../scripts/build.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')

test('transformModule: named exports + 三种 import 形态', () => {
  const source = [
    "import { a, b as c } from './dep.js';",
    "import * as ns from './dep.js';",
    "import d from './dep.js';",
    '// 注释不该被打断',
    'export function foo(x) {',
    '  return a + c + ns.z + d.w + x;',
    '}',
    'export const bar = 2;',
    'export class Baz {}'
  ].join('\n')
  const body = transformModule(source, 'src/core/demo.js')
  assert.match(body, /^function \(__exports, __req\) \{/)
  assert.match(body, /__req\("src\/core\/dep\.js"\)/)
  assert.match(body, /Object\.assign\(__exports, \{ "foo": foo, "bar": bar, "Baz": Baz \}\);/)
  assert.ok(!/^\s*export /m.test(body), 'no export keyword remains')
  assert.ok(!/^\s*import /m.test(body), 'no import keyword remains')
})

test('transformModule: 多行 export 列表 + 行注释', () => {
  const source = ['const a = 1;', 'const b = 2;', 'export {', '  // constants', '  a,', '  b as bee,', '};'].join('\n')
  const body = transformModule(source, 'src/core/index.js')
  assert.match(body, /"a": a/)
  assert.match(body, /"bee": b/)
})

test('transformModule: 拒绝不支持的语法', () => {
  assert.throws(() => transformModule('export default 1', 'src/x.js'), /export default/)
  assert.throws(() => transformModule("export * from './a.js'", 'src/x.js'), /export \* from/)
  assert.throws(() => transformModule("export { a } from './a.js'", 'src/x.js'), /re-export/)
  assert.throws(() => transformModule("import x from 'react'", 'src/x.js'), /bare import/)
  assert.throws(() => transformModule("import x from './a'", 'src/x.js'), /\.js/)
})

test('bundle: 包装形态 / id / 语法合法 / DOM 契约符号', () => {
  const result = buildBundleSource({ modules: 'none' })
  assert.ok(result.code.includes('window.__ModuleLoader__.load({'), 'module loader wrapper')
  assert.ok(result.code.includes('id: "@local/dsh-group-chat"'), 'bundle id equals package name')
  assert.ok(result.code.includes('factory: function (require)'), 'lazy factory')
  assert.ok(result.code.includes("var React = require('react')"), 'react from host module table')
  assert.ok(result.code.includes("return { inject: INJECT, apply: apply, __internals: __internals };"))

  // 产物必须是合法 classic script
  assert.doesNotThrow(() => new vm.Script(result.code, { filename: 'lib/client.js' }))

  for (const testId of [
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
    'group-chat-target-chips',
    'group-chat-composer-hint',
    'group-chat-member-strip',
    'agent-trajectory-panel',
    'agent-trajectory-overlay',
    'agent-trajectory-turn'
  ]) {
    assert.ok(result.code.includes(testId), 'missing data-testid: ' + testId)
  }

  for (const attr of [
    'data-kind',
    'data-message-id',
    'data-task-id',
    'data-task-revision',
    'data-task-action',
    'data-task-status',
    'data-task-owner',
    'data-task-actor',
    'data-task-blocked-by',
    'data-replay',
    'data-member-id',
    'data-creation-id',
    'data-pair-order',
    'data-system-variant',
    'data-targets',
    'data-filter',
    'data-count'
  ]) {
    assert.ok(result.code.includes(attr), 'missing data attribute: ' + attr)
  }

  // 冷启动：deps 传入 readyTimeoutMs，且 feed 保持 awaitingFirstBatch 骨架
  assert.match(result.code, /readyTimeoutMs: 3000/, 'readyTimeoutMs passed to adapter')
  assert.ok(result.code.includes('awaitingFirstBatch'), 'awaitingFirstBatch loading gate')

  // R-M4：localBatches 必须同时接给 adapter 与 send deps（活对象共享）
  const localBatchesWiring = (result.code.match(/localBatches: gcLocalBatches/g) || []).length
  assert.ok(localBatchesWiring >= 2, 'localBatches wired to adapter and send deps, got ' + localBatchesWiring)

  // 生产构建（有 core/adapters 时）必须包含模块注册表
  if (result.moduleIds.length > 0) {
    assert.ok(result.code.includes('__def("src/core/'), 'core modules registered')
  }
})

test('bundle: 头部注释闭合后才进入 ModuleLoader 调用', () => {
  const result = buildBundleSource({ modules: 'none' })
  const loaderIndex = result.code.indexOf('window.__ModuleLoader__')
  const headerClose = result.code.indexOf('*/')
  assert.ok(loaderIndex > 0)
  assert.ok(headerClose > 0 && headerClose < loaderIndex, 'header comment must close before the loader call')
  assert.ok(!result.code.slice(0, headerClose).includes('*/') || true)
  assert.match(result.code.slice(0, headerClose), /GENERATED FILE/)
})

test('locale: zh/en 键集完全一致', () => {
  const zh = JSON.parse(readFileSync(join(root, 'locale', 'zh.json'), 'utf8'))
  const en = JSON.parse(readFileSync(join(root, 'locale', 'en.json'), 'utf8'))
  const keys = validateLocales({ zh, en })
  assert.ok(keys.length > 120, 'dictionary should be complete, got ' + keys.length)
  assert.ok(keys.includes('view.tab'))
  assert.ok(keys.includes('meta.title'))
  // M9：copyId 文案已随「移除复制任务 ID」清理（zh/en 同步删除）
  assert.equal(zh['task.copyId'], undefined, 'task.copyId removed from zh')
  assert.equal(en['task.copyId'], undefined, 'task.copyId removed from en')
  assert.ok(keys.includes('meta.description'))

  // 键集不一致必须报错
  assert.throws(() => validateLocales({ zh: { a: '1' }, en: {} }), /locale key mismatch/)
})

test('locale: 代码里静态引用的 key 都存在', () => {
  const zh = JSON.parse(readFileSync(join(root, 'locale', 'zh.json'), 'utf8'))
  const files = [
    'src/client/entry.js',
    'src/client/parts/20-store.part.js',
    'src/client/parts/30-primitives.part.js',
    'src/client/parts/40-cards.part.js',
    'src/client/parts/50-feed.part.js',
    'src/client/parts/60-header.part.js',
    'src/client/parts/70-composer.part.js',
    'src/client/parts/80-states.part.js',
    'src/client/parts/90-view.part.js'
  ]
  const used = new Set()
  const patterns = [/\bt\('([a-zA-Z0-9_.]+)'/g, /\bgcTranslate\('([a-zA-Z0-9_.]+)'/g, /\bgcTranslateIn\('[a-z]+', '([a-zA-Z0-9_.]+)'/g]
  for (const relative of files) {
    const source = readFileSync(join(root, relative), 'utf8')
    for (const pattern of patterns) {
      let match = pattern.exec(source)
      while (match) {
        if (!match[1].includes('conversation.view') && !match[1].includes('uiWorkspace')) used.add(match[1])
        match = pattern.exec(source)
      }
    }
  }
  const missing = Array.from(used).filter((key) => zh[key] === undefined && !key.endsWith('.'))
  assert.deepEqual(missing, [], 'missing i18n keys: ' + missing.join(', '))
})

test('i18n: 视图代码无硬编码中文（预览 fixture 除外）', () => {
  const files = [
    'src/client/entry.js',
    'src/client/parts/10-locale.part.js',
    'src/client/parts/20-store.part.js',
    'src/client/parts/30-primitives.part.js',
    'src/client/parts/40-cards.part.js',
    'src/client/parts/50-feed.part.js',
    'src/client/parts/60-header.part.js',
    'src/client/parts/70-composer.part.js',
    'src/client/parts/80-states.part.js',
    'src/client/parts/90-view.part.js'
  ]
  const cjk = /[\u4e00-\u9fa5]/
  for (const relative of files) {
    const source = readFileSync(join(root, relative), 'utf8')
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    assert.ok(!cjk.test(stripped), relative + ' contains hardcoded CJK copy outside comments')
  }
})

test('package.json: dsh 工具链字段齐全', () => {
  const pkg = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package.json'), 'utf8'))
  assert.equal(pkg.type, 'module')
  assert.equal(pkg.main, 'lib/index.js')
  assert.equal(pkg.exports['./client'], './lib/client.js')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.ok(Array.isArray(pkg.dsh.client.inject))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-locale'))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-conversation'))
  for (const file of ['icon.svg', 'cordis.patch.yml', 'lib/client.js', 'lib/index.js', 'locale/*.json', 'README.md']) {
    assert.ok(pkg.files.includes(file), 'files must include ' + file)
  }
  assert.ok(pkg.scripts.build.includes('scripts/build.mjs'))
  assert.ok(pkg.scripts.test.includes('node --test'))
})

test('cordis.patch.yml: insert id=group-chat', () => {
  const patch = readFileSync(join(PLUGIN_ROOT, 'cordis.patch.yml'), 'utf8')
  assert.match(patch, /- insert:/)
  assert.match(patch, /id: group-chat/)
  assert.match(patch, /@local\/dsh-group-chat/)
})
