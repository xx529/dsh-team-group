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
const { code } = buildBundleSource()
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

function guardBatches(gc) {
  gc.localBatchIds().forEach((id) => {
    delete gc.localBatches[id]
  })
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

test('foldDecision: v1.7 前 50 行阈值（行数口径，不再按字符数）', () => {
  assert.equal(gc.foldDecision('short').foldable, false)
  assert.equal(gc.foldDecision(Array(50).fill('x').join('\n')).foldable, false, 'exactly 50 lines is not folded')
  assert.equal(gc.foldDecision(Array(51).fill('x').join('\n')).foldable, true, '51 lines folds')
  const decision = gc.foldDecision(Array(80).fill('x').join('\n'))
  assert.equal(decision.foldable, true)
  assert.equal(decision.lines, 80)
  assert.equal(decision.hidden, 30)
  assert.equal(decision.maxLines, 50)
  // 长单行不折叠（v1.7 只看行数/渲染高度）
  assert.equal(gc.foldDecision('a'.repeat(2000)).foldable, false)
})

/* ── 时间分隔 ─────────────────────────────────────────────────────────── */

test('buildFeed: 首条必插分隔；间隔 ≥5 分钟或跨天插分隔（固定时钟，避免午夜 flake）', () => {
  const now = new Date(2026, 0, 15, 12, 0, 0).getTime()
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

test('mergeMessages: 同 id 覆盖 + 权威消息替换本地 echo（H1/SC47）', () => {
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
  // H1：权威消息带 clientBatchId → 删除 local:<batchId>，只保留 1 条用户气泡
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
  const q1 = gc.mentionQuery('@', 1)
  assert.equal(q1.start, 0)
  assert.equal(q1.query, '')
  const q2 = gc.mentionQuery('hello @sc', 9)
  assert.equal(q2.start, 6)
  assert.equal(q2.query, 'sc')
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

test('F27: resolveLeadSessionId 走 sessions.list.byId 父链（≤4 跳）+ 失败回退当前会话', () => {
  const gc = bundle.module.__internals
  const byId = {
    's-sub': { parentSessionId: 's-teammate' },
    's-teammate': { parentSessionId: 's-lead' },
    's-lead': {}
  }
  const ctx = {
    sessions: {
      list: { getSnapshot: () => ({ byId }) },
      binding() {
        return undefined
      }
    }
  }
  assert.equal(gc.resolveLeadSessionId(ctx, 's-sub'), 's-lead')
  assert.equal(gc.resolveLeadSessionId(ctx, 's-teammate'), 's-lead')
  assert.equal(gc.resolveLeadSessionId(ctx, 's-lead'), 's-lead')
  // 未知会话（读不到父链）→ 回退自身，不抛错
  assert.equal(gc.resolveLeadSessionId(ctx, 's-missing'), 's-missing')
  assert.equal(gc.resolveLeadSessionId({}, 's-any'), 's-any')

  // 环状父链不死循环
  const cyclic = {
    sessions: {
      list: { getSnapshot: () => ({ byId: { a: { parentSessionId: 'b' }, b: { parentSessionId: 'a' } } }) },
      binding() {
        return undefined
      }
    }
  }
  const resolved = gc.resolveLeadSessionId(cyclic, 'a')
  assert.equal(typeof resolved, 'string')
  assert.ok(resolved === 'a' || resolved === 'b')
})

test('F5: 批次记录携带 text（H1 弱匹配）与终态 closed；UI 不删除 echo', () => {
  const gc = bundle.module.__internals
  gc.localBatchIds().forEach((id) => delete gc.localBatches[id])
  gc.rememberBatch({
    clientBatchId: 'batch-H1',
    channelId: 's-lead',
    targets: ['lead', 'ux'],
    text: '同步进度',
    at: Date.now()
  })
  const record = gc.localBatches['batch-H1']
  assert.ok(record, 'batch registered')
  assert.equal(record.text, '同步进度')
  assert.deepEqual(record.targets, ['lead', 'ux'])
  assert.equal(record.closed, undefined, 'not closed before terminal state')
  gc.closeBatch('batch-H1')
  assert.equal(gc.localBatches['batch-H1'].closed, true, 'closed after terminal state')
  // H1：权威消息替换 echo（1 条）
  const local = message({ id: 'local:batch-H1', kind: 'user', clientBatchId: 'batch-H1', time: 1 })
  const auth = message({ id: 'u:s-lead:9', kind: 'user', clientBatchId: 'batch-H1', time: 2 })
  assert.equal(gc.mergeMessages([local], [auth], channel(), gc.limits()).length, 1)
  gc.localBatchIds().forEach((id) => delete gc.localBatches[id])
})

/* ── F5（B3 归并改由 core/fanout 负责；UI 不再二次删除 echo） ─────────── */

test('H1/SC47: echo 与权威消息合并后恒 1 条（快/慢/乱序/重试/刷新）', () => {
  const gc = bundle.module.__internals
  guardBatches(gc)
  const batch = 'batch-sc47'
  const echo = () =>
    message({
      id: 'local:' + batch,
      kind: 'user',
      clientBatchId: batch,
      time: 500,
      delivery: 'sending',
      sender: { sessionId: 's-lead', name: 'user', kind: 'user' },
      targets: ['lead'],
      targetSessionIds: ['s-lead']
    })
  const authoritative = (overrides) =>
    Object.assign(
      {
        id: 'u:s-lead:1',
        kind: 'user',
        sessionId: 's-lead',
        sender: { sessionId: 's-lead', name: 'user', kind: 'user' },
        targets: ['lead'],
        text: 'hi',
        time: 501,
        seq: 2,
        isFinal: true,
        clientBatchId: batch,
        meta: {}
      },
      overrides || {}
    )

  // 快：权威先到，echo 后到（乱序）
  const authFirst = gc.mergeMessages([], [authoritative()], channel(), gc.limits())
  assert.equal(authFirst.length, 1)
  const thenEcho = gc.mergeMessages(authFirst, [echo()], channel(), gc.limits())
  // echo 后到时仍会插入，但下一次权威刷新会清掉；UI 发送流程里 echo 永远先于权威
  assert.equal(thenEcho.length, 2)
  const cleanup = gc.mergeMessages(thenEcho, [authoritative()], channel(), gc.limits())
  assert.equal(cleanup.length, 1, 'out-of-order echo removed on next authoritative sync')

  // 慢：echo 先到，权威晚到
  let state = gc.mergeMessages([], [echo()], channel(), gc.limits())
  assert.equal(state.length, 1)
  state = gc.mergeMessages(state, [authoritative({ delivery: 'sent' })], channel(), gc.limits())
  assert.equal(state.length, 1, 'slow authoritative replaces echo')
  assert.equal(state[0].id, 'u:s-lead:1')

  // 重试：权威 partial 后再次到达同一批（sent）
  state = gc.mergeMessages(state, [authoritative({ delivery: 'partial', meta: { retry: 1 } })], channel(), gc.limits())
  assert.equal(state.length, 1)
  assert.equal(state[0].delivery, 'partial')
  state = gc.mergeMessages(state, [authoritative({ delivery: 'sent' })], channel(), gc.limits())
  assert.equal(state.length, 1, 'retry keeps single bubble')
  assert.equal(state[0].delivery, 'sent')

  // 刷新：只拿到权威消息（echo 丢失）→ 仍 1 条
  const refreshed = gc.mergeMessages([], [authoritative()], channel(), gc.limits())
  assert.equal(refreshed.length, 1)

  // 无 clientBatchId、靠 meta.rpcId + 本地批次表反查
  guardBatches(gc)
  gc.rememberBatch({ clientBatchId: 'batch-rpc', requestIds: { lead: 'rpc-sc47' }, targets: ['lead'] })
  const echoRpc = message({ id: 'local:batch-rpc', kind: 'user', clientBatchId: 'batch-rpc', time: 600 })
  const authRpc = message({
    id: 'u:s-lead:2',
    kind: 'user',
    clientBatchId: undefined,
    time: 601,
    meta: { rpcId: 'rpc-sc47' }
  })
  const rpcMerged = gc.mergeMessages([echoRpc], [authRpc], channel(), gc.limits())
  assert.equal(rpcMerged.length, 1, 'rpcId lookup removes echo')
  guardBatches(gc)
})

/* ── 四态说明行 ───────────────────────────────────────────────────────── */