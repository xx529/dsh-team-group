/**
 * test/client/logic.test.mjs — 纯函数层（不经 React）
 *
 * 直接加载构建产物（modules:'none' → 只有 client 自身），取 __internals 断言：
 * 折叠阈值 / 时间分隔 / 合并去重 / 成员筛选(D-B) / 发送目标(D-A,D-C) /
 * @ 补全触发 / 四态说明行 / 任务卡与成员卡文案 / 可寻址集合。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBundleSource } from '../../scripts/build.mjs'
import { createReactRuntime, createSandbox, loadBundle } from './harness.mjs'

const runtime = createReactRuntime()
const { code } = buildBundleSource({ modules: 'none' })
const { sandbox } = createSandbox({ language: 'zh-CN' })
const bundle = loadBundle(code, runtime, sandbox)
const gc = bundle.module.__internals

/* ── fixtures ─────────────────────────────────────────────────────────── */

const LEAD = { sessionId: 's-lead', name: 'lead', kind: 'lead', status: 'running', addressable: true }
const SCOUT = {
  sessionId: 's-scout',
  name: 'scout',
  kind: 'teammate',
  parentSessionId: 's-lead',
  status: 'inactive',
  addressable: true
}
const BACKEND = { sessionId: 's-backend', name: 'backend', kind: 'teammate', parentSessionId: 's-lead', status: 'running', addressable: true }
const SUB_RUNNING = {
  sessionId: 's-sub-1',
  name: '产品设计',
  kind: 'subagent',
  parentSessionId: 's-ux',
  parentName: 'ux',
  status: 'running',
  addressable: true
}
const SUB_DONE = {
  sessionId: 's-sub-2',
  name: '旧子体',
  kind: 'subagent',
  parentSessionId: 's-ux',
  parentName: 'ux',
  status: 'inactive',
  addressable: false
}
const UX = { sessionId: 's-ux', name: 'ux', kind: 'teammate', parentSessionId: 's-lead', status: 'inactive', addressable: true }

function channel(overrides = {}) {
  return Object.assign(
    {
      channelId: 's-lead',
      lead: LEAD,
      members: [LEAD, SCOUT, UX, BACKEND, SUB_RUNNING],
      runningCount: 2,
      readonly: false
    },
    overrides
  )
}

function message(overrides = {}) {
  return Object.assign(
    {
      id: 'm' + Math.random().toString(36).slice(2, 8),
      kind: 'agent_output',
      sessionId: 's-scout',
      sender: { sessionId: 's-scout', name: 'scout', kind: 'teammate' },
      targets: [],
      targetSessionIds: [],
      text: 'hello',
      time: 1000,
      seq: 1,
      isFinal: true
    },
    overrides
  )
}

/* ── 折叠（D6） ───────────────────────────────────────────────────────── */

test('foldDecision: 400 字 / 8 行阈值', () => {
  assert.equal(gc.foldDecision('short').foldable, false)
  assert.equal(gc.foldDecision('a'.repeat(400)).foldable, false)
  assert.equal(gc.foldDecision('a'.repeat(401)).foldable, true)
  assert.equal(gc.foldDecision(Array(8).fill('x').join('\n')).foldable, false)
  assert.equal(gc.foldDecision(Array(9).fill('x').join('\n')).foldable, true)
  const decision = gc.foldDecision('中文'.repeat(300))
  assert.equal(decision.foldable, true)
  assert.equal(decision.chars, 600)
})

/* ── 时间分隔 ─────────────────────────────────────────────────────────── */

test('buildFeed: 首条必插分隔；间隔 ≥5 分钟或跨天插分隔', () => {
  const now = Date.now()
  const base = now - 60 * 60 * 1000
  const merged = gc.mergeMessages(
    [],
    [
      message({ id: 'a', time: base }),
      message({ id: 'b', time: base + 60 * 1000 }),
      message({ id: 'c', time: base + 6 * 60 * 1000 })
    ],
    channel(),
    gc.limits()
  )
  const feed = gc.buildFeed(merged, now)
  const dividers = feed.filter((item) => item.type === 'divider')
  assert.equal(dividers.length, 2, 'first message + 6min gap')
  assert.ok(dividers[0].text.startsWith(gc.translate('time.today')))
  const messages = feed.filter((item) => item.type === 'message')
  assert.equal(messages.length, 3)
  assert.equal(messages[1].tight, true, 'same sender within 60s is tight')
})

/* ── 合并 / 去重 / 上限 ───────────────────────────────────────────────── */

test('mergeMessages: 同 id 覆盖、local echo 被权威副本替换、结果有序', () => {
  const local = message({ id: 'local:batch-1', kind: 'user', clientBatchId: 'batch-1', time: 300, delivery: 'sending' })
  const first = message({ id: 'm1', time: 100 })
  const merged1 = gc.mergeMessages([], [first, local], channel(), gc.limits())
  assert.equal(merged1.length, 2)

  const authoritative = message({
    id: 'u:lead:1',
    kind: 'user',
    clientBatchId: 'batch-1',
    time: 300,
    delivery: 'sent',
    sender: { sessionId: 's-lead', name: 'user', kind: 'user' }
  })
  const merged2 = gc.mergeMessages(merged1, [authoritative], channel(), gc.limits())
  assert.equal(merged2.length, 2)
  assert.ok(merged2.some((m) => m.id === 'u:lead:1'))
  assert.ok(!merged2.some((m) => m.id === 'local:batch-1'))

  const again = gc.mergeMessages(merged2, [authoritative], channel(), gc.limits())
  assert.equal(again.length, 2, 'idempotent')
})

test('mergeMessages: 内存上限裁剪保留首尾', () => {
  const many = []
  for (let i = 0; i < 30; i += 1) many.push(message({ id: 'x' + i, time: i }))
  const merged = gc.mergeMessages([], many, channel(), { maxMessagesInMemory: 10 })
  assert.equal(merged.length, 10)
  assert.equal(merged[0].id, 'x0')
  assert.equal(merged[merged.length - 1].id, 'x29')
})

/* ── 成员筛选（D-B） ──────────────────────────────────────────────────── */

test('filterMessages: sender / targets / 子体归父 / 选子体不含父', () => {
  const ch = channel()
  const fromScout = message({ sender: { sessionId: 's-scout', name: 'scout', kind: 'teammate' } })
  const toScout = message({ targets: ['scout'] })
  const fromSub = message({
    sender: { sessionId: 's-sub-1', name: '产品设计', kind: 'subagent' },
    sessionId: 's-sub-1'
  })
  const fromLead = message({ sender: { sessionId: 's-lead', name: 'lead', kind: 'lead' } })
  const list = [fromScout, toScout, fromSub, fromLead]

  const byScout = gc.filterMessages(list, 'scout', ch).map((m) => m.id)
  assert.deepEqual(byScout.sort(), [fromScout.id, toScout.id].sort())

  const byUx = gc.filterMessages(list, 'ux', ch).map((m) => m.id)
  assert.deepEqual(byUx, [fromSub.id], 'teammate filter includes its subagent messages')

  const bySub = gc.filterMessages(list, '产品设计', ch).map((m) => m.id)
  assert.deepEqual(bySub, [fromSub.id], 'subagent filter does not include parent')

  assert.equal(gc.filterMessages(list, null, ch).length, 4)
})

/* ── 发送目标（D-A / D-C） ────────────────────────────────────────────── */

test('resolveTargets: 默认 Lead；多 @ 去重保序；lead 恒在首位', () => {
  const ch = channel()
  const single = gc.resolveTargets({ text: 'hi', mentions: [] }, ch)
  assert.deepEqual(single.targets.map((t) => t.name), ['lead'])

  const multi = gc.resolveTargets({ text: 'hi', mentions: ['ux', 'backend', 'ux'] }, ch)
  assert.deepEqual(multi.targets.map((t) => t.name), ['lead', 'ux', 'backend'])
  assert.equal(multi.targets[0].label, 'Lead')
  assert.equal(multi.targets.length, 3)
})

test('resolveTargets: 无 channel / 无 lead 时兜底当前会话 Lead（F-06）', () => {
  // channel 完全缺失（单 agent / 首次进入）→ 仍必须有一个 Lead 目标
  const fallback = gc.resolveTargets({ text: 'hi', mentions: [] }, null, 'sess-1')
  assert.equal(fallback.targets.length, 1)
  assert.deepEqual(fallback.targets[0], { name: 'lead', sessionId: 'sess-1', kind: 'lead', label: 'Lead' })
  assert.equal(fallback.hasFanout, false)

  // channel 存在但没有 lead（名册为空）→ 用 channel.channelId 作为会话 id
  const byChannelId = gc.resolveTargets({ text: 'hi' }, { channelId: 'sess-2', members: [] }, 'sess-x')
  assert.equal(byChannelId.targets.length, 1)
  assert.equal(byChannelId.targets[0].name, 'lead')
  assert.equal(byChannelId.targets[0].sessionId, 'sess-2')

  // 连 sessionId 都没有 → 保持空并标记 channel-missing（由编排返回错误）
  const missing = gc.resolveTargets({ text: 'hi' }, null, '')
  assert.equal(missing.targets.length, 0)
  assert.ok(
    missing.dropped.some((item) => item.reason === 'channel-missing'),
    'channel-missing dropped reason'
  )

  // 团队会话行为不变
  const team = gc.resolveTargets({ text: 'hi', mentions: ['ux'] }, channel(), 'sess')
  assert.deepEqual(team.targets.map((item) => item.name), ['lead', 'ux'])
  assert.equal(team.hasFanout, true)

  // 提及全部不可寻址时仍保留 lead（不会退化成 0 目标）
  const dropped = gc.resolveTargets({ text: 'hi', mentions: ['ghost'] }, channel(), 'sess')
  assert.equal(dropped.targets.length, 1)
  assert.equal(dropped.targets[0].name, 'lead')
})

test('resolveTargets: 不可寻址 / 未知成员被剔除并记录', () => {
  const ch = channel({ members: [LEAD, UX, SUB_DONE] })
  const resolved = gc.resolveTargets({ text: 'hi', mentions: ['旧子体', 'ghost'] }, ch)
  assert.deepEqual(resolved.targets.map((t) => t.name), ['lead'])
  assert.equal(resolved.dropped.length, 2)
})

test('isAddressable: lead/teammate 恒可寻址；subagent 仅 running/provisioning', () => {
  assert.equal(gc.isAddressable(LEAD), true)
  assert.equal(gc.isAddressable(SCOUT), true, 'inactive teammate still addressable (D-A)')
  assert.equal(gc.isAddressable(SUB_RUNNING), true)
  assert.equal(gc.isAddressable(SUB_DONE), false)
})

test('mentionCandidates: 过滤 + 排序（lead → teammate → subagent）', () => {
  const ch = channel({ members: [LEAD, SCOUT, UX, BACKEND, SUB_RUNNING, SUB_DONE] })
  const all = gc.mentionCandidates(ch, '')
  assert.equal(all[0].name, 'lead')
  assert.ok(all.some((m) => m.name === 'scout'), 'inactive teammate listed')
  assert.ok(all.some((m) => m.name === '产品设计'))
  assert.ok(!all.some((m) => m.name === '旧子体'), 'one-shot finished subagent excluded')
  const filtered = gc.mentionCandidates(ch, 'sc')
  assert.deepEqual(filtered.map((m) => m.name), ['scout'])
})

/* ── @ 补全触发 ───────────────────────────────────────────────────────── */

test('mentionQuery: 触发条件与过滤词', () => {
  assert.deepEqual(gc.mentionQuery('@', 1), { start: 0, query: '' })
  assert.deepEqual(gc.mentionQuery('hello @sc', 9), { start: 6, query: 'sc' })
  assert.equal(gc.mentionQuery('mail@example.com', 16), null, 'mid-word @ does not trigger')
  assert.equal(gc.mentionQuery('hello @ sc', 10), null, 'space after @ ends the query')
  assert.equal(gc.mentionQuery('hello', 5), null)
})

test('insertMention: 替换当前查询并保留后续文本', () => {
  const query = gc.mentionQuery('请 @sc 看一下', 5)
  const next = gc.insertMention('请 @sc 看一下', query, 'scout')
  assert.equal(next, '请 @scout  看一下')
})

test('isContextNoise: system 类上下文注入被过滤，正常系统提示保留（D-01 兜底）', () => {
  assert.equal(gc.isContextNoise(message({ kind: 'system', text: '<system-reminder>top secret' })), true)
  assert.equal(gc.isContextNoise(message({ kind: 'system', text: '<skill_content name="x">' })), true)
  assert.equal(gc.isContextNoise(message({ kind: 'system', text: 'Current runtime context: cwd=...' })), true)
  assert.equal(gc.isContextNoise(message({ kind: 'system', text: 'Time sampled at 2026-10-28' })), true)
  assert.equal(gc.isContextNoise(message({ kind: 'system', text: '团队已组建 · 8 名成员' })), false)
  assert.equal(gc.isContextNoise(message({ kind: 'system', text: '欢迎 @scout 加入群聊' })), false)
  // 非 system 消息不拦（避免误伤用户正文里引用 <system-reminder>）
  assert.equal(gc.isContextNoise(message({ kind: 'user', text: '<system-reminder>x' })), false)
})

/* ── F-07：本地 echo 与权威消息去重 ───────────────────────────────────── */

function clearLocalBatches(gc) {
  gc.localBatchIds().forEach((id) => {
    delete gc.localBatches[id]
  })
}

test('F-07: 权威消息 rpcId 命中批次 → 本地 echo 被替换，仅 1 条气泡', () => {
  const gc = bundle.module.__internals
  clearLocalBatches(gc)
  gc.rememberBatch({
    clientBatchId: 'batch-A',
    channelId: 's-lead',
    targets: [{ name: 'lead', sessionId: 's-lead' }],
    sessionIds: ['s-lead'],
    requestIds: { lead: 'rpc-1' }
  })
  assert.equal(gc.lookupLocalBatchByRpc('rpc-1'), 'batch-A')

  const local = message({
    id: 'local:batch-A',
    kind: 'user',
    clientBatchId: 'batch-A',
    time: 300,
    delivery: 'sending',
    sender: { sessionId: 's-lead', name: 'user', kind: 'user' }
  })
  const authoritative = {
    id: 'u:s-lead:1',
    kind: 'user',
    sessionId: 's-lead',
    sender: { sessionId: 's-lead', name: 'user', kind: 'user' },
    targets: ['lead'],
    targetSessionIds: ['s-lead'],
    text: 'hi',
    time: 301,
    seq: 2,
    isFinal: true,
    meta: { rpcId: 'rpc-1' }
  }
  const merged = gc.mergeMessages([local], [authoritative], channel(), gc.limits())
  assert.equal(merged.length, 1, 'only one bubble after authoritative arrives')
  assert.equal(merged[0].id, 'u:s-lead:1')
  assert.equal(merged[0].clientBatchId, 'batch-A', 'authoritative message tagged with batch id')

  // 幂等：再来一次仍然 1 条
  const again = gc.mergeMessages(merged, [authoritative], channel(), gc.limits())
  assert.equal(again.length, 1)
})

test('F-07: 权威消息直接带 clientBatchId 也能替换（无需注册表）', () => {
  const gc = bundle.module.__internals
  clearLocalBatches(gc)
  const local = message({ id: 'local:batch-C', kind: 'user', clientBatchId: 'batch-C', time: 100 })
  const authoritative = {
    id: 'u:s-lead:9',
    kind: 'user',
    sessionId: 's-lead',
    sender: { sessionId: 's-lead', name: 'user', kind: 'user' },
    targets: ['lead'],
    text: 'yo',
    time: 101,
    seq: 9,
    isFinal: true,
    clientBatchId: 'batch-C',
    meta: {}
  }
  const merged = gc.mergeMessages([local], [authoritative], channel(), gc.limits())
  assert.equal(merged.length, 1)
})

test('F-07: 无匹配时保留本地 echo，不误删其他批次', () => {
  const gc = bundle.module.__internals
  clearLocalBatches(gc)
  gc.rememberBatch({ clientBatchId: 'batch-D', channelId: 's-lead', requestIds: { lead: 'rpc-D' } })
  const localD = message({ id: 'local:batch-D', kind: 'user', clientBatchId: 'batch-D', time: 200 })
  const localE = message({ id: 'local:batch-E', kind: 'user', clientBatchId: 'batch-E', time: 201 })
  const unrelated = {
    id: 'u:s-lead:5',
    kind: 'user',
    sessionId: 's-lead',
    sender: { sessionId: 's-lead', name: 'user', kind: 'user' },
    targets: ['lead'],
    text: 'other',
    time: 202,
    seq: 5,
    isFinal: true,
    meta: { rpcId: 'rpc-unknown' }
  }
  const merged = gc.mergeMessages([localD, localE], [unrelated], channel(), gc.limits())
  assert.equal(merged.length, 3, 'unmatched authoritative keeps both echoes')
  assert.ok(merged.some((m) => m.id === 'local:batch-D'))
  assert.ok(merged.some((m) => m.id === 'local:batch-E'))

  // 命中 batch-D 时只删 D，不删 E
  const matching = Object.assign({}, unrelated, {
    id: 'u:s-lead:6',
    time: 203,
    seq: 6,
    meta: { rpcId: 'rpc-D' }
  })
  const merged2 = gc.mergeMessages([localD, localE], [matching], channel(), gc.limits())
  assert.ok(!merged2.some((m) => m.id === 'local:batch-D'), 'matched echo removed')
  assert.ok(merged2.some((m) => m.id === 'local:batch-E'), 'other echo kept')
})

test('F-07: 批次 TTL 5 分钟 / 上限 50 / requestIds 规范化', () => {
  const gc = bundle.module.__internals
  clearLocalBatches(gc)
  const now = Date.now()

  // 过期清理
  gc.rememberBatch({ clientBatchId: 'old', at: now - 6 * 60 * 1000, requestIds: { lead: 'r-old' } })
  assert.equal(gc.localBatchIds().length, 1)
  gc.pruneLocalBatches(now)
  assert.equal(gc.localBatchIds().length, 0, 'expired batch pruned')

  // 上限 50：保留最新
  for (let i = 0; i < 60; i += 1) {
    gc.rememberBatch({ clientBatchId: 'b' + i, at: now - (60 - i) * 1000, requestIds: { lead: 'r' + i } })
  }
  gc.pruneLocalBatches(now)
  assert.equal(gc.localBatchIds().length, 50)
  assert.ok(gc.localBatches['b59'], 'newest kept')
  assert.ok(!gc.localBatches['b0'], 'oldest dropped')

  // requestIds 数组/别名规范化
  gc.rememberBatch({ clientBatchId: 'arr', targetNames: ['lead', 'ux'], requestIds: ['rA', 'rB'] })
  assert.equal(gc.localBatches['arr'].requestIds.lead, 'rA')
  assert.equal(gc.localBatches['arr'].requestIds.ux, 'rB')
  gc.rememberBatch({ clientBatchId: 'obj', requestIds: { lead: { rpcId: 'rC' } } })
  assert.equal(gc.localBatches['obj'].requestIds.lead, 'rC')
  clearLocalBatches(gc)
})

/* ── 四态说明行 ───────────────────────────────────────────────────────── */

test('captionModel: sending / sent 单发 / sent 多目标 / failed / partial', () => {
  assert.equal(gc.captionModel(message({ kind: 'agent_output' }), gc.translate), null)

  const sending = gc.captionModel(
    message({ kind: 'user', delivery: 'sending', targets: ['lead'], sender: { name: 'user', kind: 'user' } }),
    gc.translate
  )
  assert.equal(sending.text, '发送中…')
  assert.equal(sending.actions.length, 0)

  const single = gc.captionModel(
    message({ kind: 'user', delivery: 'sent', targets: ['lead'], sender: { name: 'user', kind: 'user' } }),
    gc.translate
  )
  assert.equal(single.text, '发送给 Lead')
  assert.deepEqual(single.actions.map((a) => a.id), ['copy'])

  const multi = gc.captionModel(
    message({
      kind: 'user',
      delivery: 'sent',
      targets: ['lead', 'ux', 'backend'],
      sender: { name: 'user', kind: 'user' }
    }),
    gc.translate
  )
  assert.equal(multi.text, '已同时发送给 Lead、@ux、@backend')

  const failed = gc.captionModel(
    message({
      kind: 'user',
      delivery: 'failed',
      targets: ['lead'],
      meta: { error: 'network-interrupted' },
      sender: { name: 'user', kind: 'user' }
    }),
    gc.translate
  )
  assert.equal(failed.tone, 'error')
  assert.match(failed.text, /发送失败：network-interrupted，已保留原文/)
  assert.deepEqual(failed.actions.map((a) => a.id), ['retry', 'copy'])

  const partial = gc.captionModel(
    message({
      kind: 'user',
      delivery: 'partial',
      targets: ['lead', 'ux', 'backend'],
      targetSessionIds: ['s-lead', 's-ux', 's-backend'],
      deliveries: { 's-lead': 'sent', 's-ux': 'sent', 's-backend': 'failed' },
      sender: { name: 'user', kind: 'user' }
    }),
    gc.translate
  )
  assert.match(partial.text, /已送达 2\/3/)
  assert.match(partial.text, /失败：@backend/)
  assert.deepEqual(partial.actions.map((a) => a.id), ['retry'])
})

test('sendDebug: 失败 caption 追加 detail（≤200 字），无 detail 保持旧文案', () => {
  const base = { kind: 'user', delivery: 'failed', targets: ['lead'], sender: { name: 'user', kind: 'user' } }

  const withDebug = message(
    Object.assign({}, base, {
      meta: { sendDebug: { reason: 'unknown', code: 'E_ASSERT_FAILED', status: 'failed', message: 'device offline' } }
    })
  )
  // 默认隐藏诊断 → caption 只有用户可读文案
  gc.setDebugVisible(null)
  const hidden = gc.captionModel(withDebug, gc.translate)
  assert.equal(hidden.tone, 'error')
  assert.match(hidden.text, /^发送失败：/)
  assert.ok(!/code=|stage=|build=/.test(hidden.text), 'diagnostics hidden by default')
  assert.ok(gc.sendDebugModel(withDebug), 'data-send-debug model still available')

  // debug 打开 → 显示诊断后缀
  gc.setDebugVisible(true)
  const caption = gc.captionModel(withDebug, gc.translate)
  assert.equal(caption.tone, 'error')
  assert.match(caption.text, /^发送失败：/)
  assert.match(caption.text, /code=E_ASSERT_FAILED/)
  assert.match(caption.text, /message=device offline/)
  assert.deepEqual(caption.actions.map((a) => a.id), ['retry', 'copy'])

  const debug = gc.sendDebugModel(withDebug)
  assert.equal(debug.code, 'E_ASSERT_FAILED')
  assert.equal(debug.status, 'failed')
  assert.equal(debug.reason, 'unknown')

  // detail 截断 ≤240（task-63：额外的 build=… 短指纹始终保留）
  const long = message(
    Object.assign({}, base, { meta: { sendDetail: 'x'.repeat(500), sendErrorCode: 'E_LONG' } })
  )
  assert.ok(gc.sendDetailText(long).length <= 240)
  assert.ok(gc.captionModel(long, gc.translate).text.length < 400)

  // 无 detail：保持旧文案 + 无 debug
  const plain = message(Object.assign({}, base, { meta: { error: 'network-interrupted' } }))
  assert.equal(gc.sendDebugModel(plain), null)
  assert.equal(gc.captionModel(plain, gc.translate).text, '发送失败：network-interrupted，已保留原文')
  gc.setDebugVisible(null)

  // en 下无中文（debug 打开，覆盖诊断后缀）
  gc.setDebugVisible(true)
  gc.setLocale('en')
  const enCaption = gc.captionModel(withDebug, gc.translate)
  assert.ok(!/[\u4e00-\u9fa5]/.test(enCaption.text), 'english caption has no CJK')
  assert.match(enCaption.text, /E_ASSERT_FAILED/)
  gc.setLocale('zh')
  gc.setDebugVisible(null)
})

test('sendDebug: stage/build 展示 + diagnostics 优先（deliveries 为空也出诊断）', () => {
  const base = { kind: 'user', delivery: 'failed', targets: ['lead'], sender: { name: 'user', kind: 'user' } }

  // diagnostics[0] 存在但 deliveries=[] → 必须展示 diagnostics 的 code/message/stage
  const debug = gc.sendDebugFromDeliveries('failed', [], [
    { stage: 'echo', reason: 'network', code: 'E_ECHO', message: 'echo stage exploded' }
  ])
  assert.ok(debug, 'debug built from diagnostics only')
  assert.equal(debug.stage, 'echo')
  assert.equal(debug.code, 'E_ECHO')
  assert.equal(debug.message, 'echo stage exploded')
  assert.equal(debug.status, 'failed')
  assert.ok(debug.build && debug.build.length > 0, 'build label present')
  assert.equal(debug.build, gc.buildLabel)

  // caption 含 stage=… 与 build=…（debug 打开时）
  const msg = message(Object.assign({}, base, { meta: { sendDebug: debug } }))
  gc.setDebugVisible(true)
  const caption = gc.captionModel(msg, gc.translate)
  assert.equal(caption.tone, 'error')
  assert.match(caption.text, /code=E_ECHO/)
  assert.match(caption.text, /message=echo stage exploded/)
  assert.match(caption.text, /stage=echo/)
  assert.match(caption.text, /build=/)
  assert.ok(caption.text.indexOf('build=') > caption.text.indexOf('stage='), 'build after stage')

  // data-send-debug 也会有 stage/build（由组件断言，这里断言 model 字段）
  const model = gc.sendDebugModel(msg)
  assert.equal(model.stage, 'echo')
  assert.ok(model.build)

  // 异常路径（gcDebugFromException）也带 stage/build，且不发空批次
  const ex = gc.debugFromException(new Error('boom before loop'), 'invoke')
  assert.equal(ex.stage, 'invoke')
  assert.equal(ex.status, 'failed')
  assert.equal(ex.code, 'Error')
  assert.match(ex.message, /boom before loop/)
  assert.ok(ex.build)

  // 空 deliveries 且无 diagnostics → 不生成诊断（caption 保持旧文案）
  assert.equal(gc.sendDebugFromDeliveries('failed', [], []), null)

  // 默认（debug 关）→ caption 不含诊断后缀，但 data-send-debug model 仍在
  gc.setDebugVisible(null)
  const hiddenCaption = gc.captionModel(msg, gc.translate)
  assert.ok(!/code=|stage=|build=/.test(hiddenCaption.text), 'diagnostics hidden by default')
  assert.ok(gc.sendDebugModel(msg).stage, 'debug model kept for data-send-debug')

  // en + debug 开：无中文
  gc.setDebugVisible(true)
  gc.setLocale('en')
  const enCaption = gc.captionModel(msg, gc.translate)
  assert.ok(!/[\u4e00-\u9fa5]/.test(enCaption.text), 'english caption without CJK')
  gc.setLocale('zh')
  gc.setDebugVisible(null)
})

test('captionModel: 英文模式下无中文', () => {
  gc.setLocale('en')
  const multi = gc.captionModel(
    message({ kind: 'user', delivery: 'sent', targets: ['lead', 'ux'], sender: { name: 'user', kind: 'user' } }),
    gc.translate
  )
  assert.equal(multi.text, 'Also sent to Lead, @ux')
  assert.ok(!/[\u4e00-\u9fa5]/.test(multi.text))
  gc.setLocale('zh')
})

/* ── 卡片文案（M8 / M9） ──────────────────────────────────────────────── */

test('taskActionLabel / taskStatusLabel: i18n 优先，core 中文仅兜底', () => {
  assert.equal(gc.taskActionLabel({ action: 'reopen', actionLabel: '重新打开' }, gc.translate), '重新打开任务')
  assert.equal(gc.taskStatusLabel({ task: { status: 'deleted' }, statusLabel: '已取消' }, gc.translate), '已取消')
  assert.equal(gc.taskStatusLabel({ task: { status: 'pending' } }, gc.translate), '待认领')
  assert.equal(gc.taskStatusLabel({ task: { status: 'in_progress' } }, gc.translate), '进行中')
  assert.equal(gc.taskStatusLabel({ task: { status: 'completed' } }, gc.translate), '已完成')
  assert.equal(gc.taskActionLabel({ action: 'unknown-action', actionLabel: 'X' }, gc.translate), 'X')

  gc.setLocale('en')
  assert.ok(!/[\u4e00-\u9fa5]/.test(gc.taskActionLabel({ action: 'reopen' }, gc.translate)))
  assert.ok(!/[\u4e00-\u9fa5]/.test(gc.taskStatusLabel({ task: { status: 'pending' } }, gc.translate)))
  gc.setLocale('zh')

  // 平台无 failed：任何动作/状态文案不得出现「返工/失败」
  for (const action of ['create', 'claim', 'complete', 'reopen', 'reassign', 'edit', 'set_dependencies', 'delete', 'release']) {
    const label = gc.taskActionLabel({ action }, gc.translate)
    assert.ok(!/返工|失败/.test(label), 'forbidden wording in ' + action + ': ' + label)
  }
  for (const status of ['pending', 'in_progress', 'completed', 'deleted']) {
    const label = gc.taskStatusLabel({ task: { status } }, gc.translate)
    assert.ok(!/返工|失败/.test(label), 'forbidden wording in ' + status + ': ' + label)
  }
})

test('memberModelText / memberContextText: 继承与 one-shot 后缀；空值隐藏', () => {
  assert.equal(
    gc.memberModelText({ model: 'deepseek-flash', createTool: 'spawn_teammate' }, 'lead', gc.translate),
    'deepseek-flash（继承 Lead）'
  )
  assert.equal(
    gc.memberModelText({ model: 'deepseek-flash', modelInheritedFrom: 'ux', createTool: 'subagent_fork' }, 'ux', gc.translate),
    'deepseek-flash（继承 ux）'
  )
  assert.equal(gc.memberModelText({ model: '', createTool: 'spawn_teammate' }, 'lead', gc.translate), '')

  assert.equal(
    gc.memberContextText({ createTool: 'spawn_teammate', contextPolicy: 'fresh' }, gc.translate),
    '全新上下文（fresh）'
  )
  assert.equal(
    gc.memberContextText({ createTool: 'subagent_fork', contextPolicy: 'fork', lifecycleMode: 'one_shot' }, gc.translate),
    '继承父会话（subagent_fork）· 一次性（one-shot）'
  )
  assert.equal(gc.memberContextText({ createTool: 'unknown' }, gc.translate), '')
})

/* ── 频道形态 ─────────────────────────────────────────────────────────── */

test('isSingleAgent: 无团队判定', () => {
  assert.equal(gc.isSingleAgent({ members: [LEAD] }), true)
  assert.equal(gc.isSingleAgent({ members: [LEAD, SCOUT] }), false)
  assert.equal(gc.isSingleAgent({ members: [], degraded: 'lead-only' }), true)
})

/* ── store ────────────────────────────────────────────────────────────── */

test('store: set/subscribe 快照稳定', () => {
  const store = gc.createStore()
  const before = store.getSnapshot()
  assert.equal(before.phase, 'loading')
  let calls = 0
  const unsubscribe = store.subscribe(() => {
    calls += 1
  })
  store.set({ phase: 'ready' })
  assert.equal(store.getSnapshot().phase, 'ready')
  assert.notEqual(store.getSnapshot(), before)
  assert.equal(calls, 1)
  unsubscribe()
  store.set({ phase: 'error' })
  assert.equal(calls, 1)
})

test('draft: 按 channel 保存并在 TTL 内恢复', () => {
  gc.saveDraft('ch-1', { text: 'hi', mentions: ['ux'] })
  assert.deepEqual(gc.loadDraft('ch-1'), { text: 'hi', mentions: ['ux'] })
  assert.deepEqual(gc.loadDraft('ch-2'), { text: '', mentions: [] })
  gc.saveDraft('ch-1', { text: '', mentions: [] })
  assert.deepEqual(gc.loadDraft('ch-1'), { text: '', mentions: [] })
})

test('translate: 插值与未知 key', () => {
  assert.equal(gc.translate('channel.membersRunning', { n: 8, m: 3 }), '8 名成员 · 3 个运行中')
  assert.equal(gc.translate('does.not.exist'), 'does.not.exist')
})
