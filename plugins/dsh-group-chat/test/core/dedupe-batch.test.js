// @ts-check
/** B3：§5.3.1 localBatches + rpcId 对账 / echo→权威替换 / 晚到乱序重试刷新；subagent-settled post-fix 回归 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChannel, lookupBatchId, getLocalBatches } from '../../src/core/normalize.js';
import { mergeFanout } from '../../src/core/fanout.js';
import { normalizeFixture, byKind } from './helpers.js';
import { ev } from './helpers.js';

const T = 1793158400000;
const LEAD = 'S_LEAD';

function authoritativeEvent(seq = 1, rpcId = 'r1', id = 'msg-auth') {
  return ev('user/message', seq, T + seq, {
    id,
    role: 'user',
    content: [{ type: 'text', text: '同一条发送' }],
    source: { kind: 'user', rpcId },
  });
}

function echoMessage(batchId = 'b1') {
  return {
    id: `local:${batchId}`,
    kind: 'user',
    sessionId: LEAD,
    sender: { sessionId: LEAD, name: 'user', kind: 'user' },
    targets: ['lead'],
    targetSessionIds: [LEAD],
    text: '同一条发送',
    time: T,
    seq: 0,
    isFinal: false,
    delivery: 'sending',
    deliveries: { [LEAD]: 'sending' },
    clientBatchId: batchId,
    meta: { localEcho: true, clientBatchId: batchId },
  };
}

function normalizeWithBatch(events) {
  return normalizeChannel([{ sessionId: LEAD, header: {}, events }], {
    leadSessionId: LEAD,
    localBatches: { b1: { clientBatchId: 'b1', requestIds: { [LEAD]: 'r1' }, targets: ['lead'], sessionIds: [LEAD] } },
  });
}

test('H1 lookupBatchId：有 rpcId 仅认 requestIds；无 rpcId 需 textHash+targets+时间窗', () => {
  const ctx = {
    localBatches: {
      b1: {
        clientBatchId: 'b1',
        channelId: LEAD,
        requestIds: { [LEAD]: 'r1' },
        targets: ['lead', 'ux'],
        sessionIds: [LEAD, 'S_UX'],
        text: '同一条发送',
        at: T,
      },
    },
  };
  // 有 rpcId：精确命中；不匹配则禁止 sessionIds/targets 兜底（H1）
  assert.equal(lookupBatchId(ctx, 'r1', LEAD, []), 'b1');
  assert.equal(lookupBatchId(ctx, 'nope', 'S2', ['lead', 'ux'], { text: '同一条发送', time: T }), undefined);
  // 无 rpcId：textHash+targets+时间窗都满足才归并
  assert.equal(lookupBatchId(ctx, undefined, LEAD, ['lead', 'ux'], { text: '同一条发送', time: T + 1000, channelId: LEAD }), 'b1');
  // R-WEAK：跨频道/跨会话的弱匹配必须拒绝
  assert.equal(lookupBatchId(ctx, undefined, LEAD, ['lead', 'ux'], { text: '同一条发送', time: T, channelId: 'S_OTHER' }), undefined);
  assert.equal(lookupBatchId(ctx, undefined, 'S_OTHER', ['lead', 'ux'], { text: '同一条发送', time: T, channelId: LEAD }), undefined);
  assert.equal(lookupBatchId(ctx, undefined, LEAD, ['lead', 'ux'], { text: '不同的正文', time: T }), undefined);
  assert.equal(lookupBatchId(ctx, undefined, LEAD, ['lead', 'ux'], { text: '同一条发送', time: T + 3 * 60 * 1000 }), undefined);
  assert.equal(lookupBatchId(ctx, undefined, LEAD, ['lead'], { text: '同一条发送', time: T }), undefined);
  assert.equal(lookupBatchId(ctx, undefined, LEAD, ['lead', 'ux'], {}), undefined);
  // 终态批次：rpcId 仍可命中（晚到权威替换 echo），弱匹配禁用
  ctx.localBatches.b1.closed = true;
  assert.equal(lookupBatchId(ctx, 'r1', LEAD, []), 'b1');
  assert.equal(lookupBatchId(ctx, undefined, LEAD, ['lead', 'ux'], { text: '同一条发送', time: T, channelId: LEAD }), undefined);
  assert.equal(lookupBatchId({}, 'r1', LEAD, []), undefined);
  assert.deepEqual(getLocalBatches(undefined), {});
  assert.deepEqual(getLocalBatches({ localBatches: [] }), {}, '数组不是合法批次表');
});

test('H1 回归：同 session 的无关消息（rpcId 不匹配）不得归入旧 batch → 不误删 echo', () => {
  const unrelated = ev('user/message', 2, T + 1000, {
    id: 'msg-unrelated',
    role: 'user',
    content: [{ type: 'text', text: '另一条无关消息' }],
    source: { kind: 'user', rpcId: 'r-other' },
  });
  const result = normalizeWithBatch([unrelated]);
  const msg = byKind(result.messages, 'user')[0];
  assert.equal(msg.clientBatchId, undefined, '不得被旧 batch 的 sessionIds 兜底命中');
  const merged = mergeFanout([echoMessage('b1'), msg], { leadSessionId: LEAD });
  assert.equal(merged.messages.length, 2, 'echo 与无关消息都应保留（不误删/不误合）');
});

test('H1 回归：第二批次 echo 正常替换（不同 batchId 不串）', () => {
  const auth1 = byKind(normalizeWithBatch([authoritativeEvent(1, 'r1', 'msg-a')]).messages, 'user')[0];
  const auth2 = byKind(
    normalizeChannel([{ sessionId: LEAD, header: {}, events: [authoritativeEvent(2, 'r2', 'msg-b')] }], {
      leadSessionId: LEAD,
      localBatches: { b2: { clientBatchId: 'b2', requestIds: { [LEAD]: 'r2' }, targets: ['lead'] } },
    }).messages,
    'user',
  )[0];
  assert.equal(auth2.clientBatchId, 'b2');
  const merged = mergeFanout([echoMessage('b1'), echoMessage('b2'), auth1, auth2], { leadSessionId: LEAD });
  assert.equal(merged.messages.length, 2, '两个批次各自 1 条');
  assert.deepEqual(merged.messages.map((m) => m.id).sort(), ['u:S_LEAD:msg-a', 'u:S_LEAD:msg-b']);
});

test('echo + 权威（rpcId 命中）→ 只 1 条权威消息，无 local:*', () => {
  const result = normalizeWithBatch([authoritativeEvent()]);
  const auth = byKind(result.messages, 'user')[0];
  assert.equal(auth.clientBatchId, 'b1', '权威消息应拿到 clientBatchId');
  const merged = mergeFanout([echoMessage(), auth], { leadSessionId: LEAD });
  assert.equal(merged.messages.length, 1);
  assert.equal(merged.messages[0].id, 'u:S_LEAD:msg-auth');
  assert.ok(!merged.messages.some((m) => String(m.id).startsWith('local:')));
  assert.equal(merged.messages[0].delivery, 'sent');
  assert.equal(merged.messages[0].deliveries[LEAD], 'sent');
});

test('晚到/乱序：权威先于 echo 插入，结果仍 1 条', () => {
  const auth = byKind(normalizeWithBatch([authoritativeEvent()]).messages, 'user')[0];
  const merged = mergeFanout([auth, echoMessage()], { leadSessionId: LEAD });
  assert.equal(merged.messages.length, 1);
  assert.equal(merged.messages[0].id, 'u:S_LEAD:msg-auth');
});

test('刷新/重进视图：无 echo 时权威按 id 只 1 条（不等 localBatches）', () => {
  const result = normalizeChannel([{ sessionId: LEAD, header: {}, events: [authoritativeEvent()] }], { leadSessionId: LEAD });
  const users = byKind(result.messages, 'user');
  assert.equal(users.length, 1);
  assert.equal(users[0].id, 'u:S_LEAD:msg-auth');
  const merged = mergeFanout(users, { leadSessionId: LEAD });
  assert.equal(merged.messages.length, 1);
  assert.ok(!merged.messages.some((m) => String(m.id).startsWith('local:')));
});

test('重试/重复权威事件（同 id 同 rpcId）→ 仍 1 条；双 echo 也只 1 条', () => {
  const result = normalizeWithBatch([authoritativeEvent(1, 'r1', 'msg-auth'), authoritativeEvent(2, 'r1', 'msg-auth')]);
  assert.equal(byKind(result.messages, 'user').length, 1, '同 data.id 去重');
  const auth = byKind(result.messages, 'user')[0];
  const merged = mergeFanout([echoMessage('b1'), echoMessage('b1'), auth], { leadSessionId: LEAD });
  assert.equal(merged.messages.length, 1, '同一 clientBatchId 只 1 条');
  assert.equal(merged.messages[0].id, 'u:S_LEAD:msg-auth');
});

test('subagent-settled post-fix 回归：不再渲染 Background subagent summary', () => {
  const { result } = normalizeFixture('05-subagent-settled');
  assert.ok(!result.messages.some((m) => String(m.text).includes('Background subagent')));
  assert.ok(!result.messages.some((m) => String(m.text).includes('Its closing message:')));
  assert.equal(result.diagnostics.settlementsDropped, 0);
  assert.ok(result.diagnostics.ignoredSystemContext >= 1);
});
