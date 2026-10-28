// @ts-check
/**
 * UT-26/27/28/29 + fixture 14/15：同发合并、四态聚合、本地 echo 转换、幂等
 * 契约：架构 §4.4 / V1.1-2 / Spike S2
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byKind, normalizeFixture } from './helpers.js';
import {
  aggregateDeliveryState,
  mergeFanout,
} from '../../src/core/fanout.js';
import { normalizeChannel } from '../../src/core/normalize.js';

test('fixture 14：3 目标同发 → 1 条 user 气泡 + 3 条 deliveries + 前缀剥除 rawText 保留', () => {
  const { result } = normalizeFixture('14-fanout-prefix-canonical');
  const users = byKind(result.messages, 'user');
  assert.equal(users.length, 1, 'DOM 命中 1 条气泡');
  const m = users[0];
  assert.equal(m.sessionId, 'session-lead-1301');
  assert.deepEqual(m.targets, ['lead', 'ux', 'backend']);
  assert.deepEqual(Object.keys(m.deliveries).sort(), ['session-backend-1303', 'session-lead-1301', 'session-ux-1302'].sort());
  assert.equal(m.delivery, 'sent');
  assert.ok(!m.text.includes('[群聊 · 同发]'));
  assert.equal(m.text, '@backend 接口清单我看了，发送通路按 host 路由来。手写 @ux 不受影响。');
  assert.ok(String(m.rawText).startsWith('[群聊 · 同发] 收件人：@lead、@ux、@backend'));
  assert.equal(result.diagnostics.fanoutMerged, 2);
});

test('fixture 15：partial 态（lead/ux sent、backend failed）→ 1 气泡 + 「已送达 X/Y」证据', () => {
  const { result, meta, lead } = normalizeFixture('15-partial-failure');
  // 本地 echo（send 模块持久化的四态）加入后与权威副本合并
  const merged = mergeFanout([meta.echo, ...result.messages], { leadSessionId: lead });
  const users = merged.messages.filter((m) => m.kind === 'user');
  assert.equal(users.length, 1);
  const m = users[0];
  assert.equal(m.delivery, 'partial');
  assert.equal(m.deliveries['session-lead-1401'], 'sent');
  assert.equal(m.deliveries['session-ux-1402'], 'sent');
  assert.equal(m.deliveries['session-backend-1403'], 'failed');
  assert.equal(Object.values(m.deliveries).filter((s) => s === 'sent').length, 2);
  assert.equal(Object.values(m.deliveries).length, 3);
});

test('UT-26 四态聚合：全 sent / partial / failed / sending', () => {
  assert.equal(aggregateDeliveryState({ a: 'sent', b: 'sent' }), 'sent');
  assert.equal(aggregateDeliveryState({ a: 'sent', b: 'failed' }), 'partial');
  assert.equal(aggregateDeliveryState({ a: 'failed', b: 'failed' }), 'failed');
  assert.equal(aggregateDeliveryState({ a: 'sending', b: 'sent' }), 'sending');
  assert.equal(aggregateDeliveryState({}), undefined);
  assert.equal(aggregateDeliveryState(undefined), undefined);
});

test('本地 echo + 权威副本：保留权威 id、合入失败目标、不再显示 echo', () => {
  const T = 1793158400000;
  const lead = 'session-lead';
  const ux = 'session-ux';
  const echo = {
    id: 'local:gc-b1',
    kind: 'user',
    sessionId: lead,
    sender: { sessionId: lead, name: 'user', kind: 'user' },
    targets: ['lead', 'ux'],
    targetSessionIds: [lead, ux],
    text: '正文',
    time: T,
    seq: -1,
    isFinal: false,
    delivery: 'sending',
    deliveries: { [lead]: 'sent', [ux]: 'failed' },
    clientBatchId: 'gc-b1',
    meta: { localEcho: true, clientBatchId: 'gc-b1' },
  };
  const leadCopy = {
    ...echo,
    id: 'u:lead:msg-1',
    seq: 5,
    time: T + 10,
    delivery: undefined,
    deliveries: undefined,
    meta: { fanout: true, clientBatchId: 'gc-b1' },
  };
  const out = mergeFanout([echo, leadCopy], { leadSessionId: lead });
  assert.equal(out.messages.length, 1);
  const m = out.messages[0];
  assert.equal(m.id, 'u:lead:msg-1');
  assert.equal(m.delivery, 'partial');
  assert.equal(m.deliveries[ux], 'failed', '失败目标状态从 echo 继承，不因副本到达被抹掉');
  assert.equal(m.deliveries[lead], 'sent');
  assert.equal(m.meta.localEcho, false);
  assert.equal(m.clientBatchId, 'gc-b1');
});

test('UT-27 幂等：同一批消息重复 mergeFanout 结果稳定', () => {
  const { result } = normalizeFixture('14-fanout-prefix-canonical');
  const once = mergeFanout(result.messages.filter((m) => m.kind === 'user'), { leadSessionId: 'session-lead-1301' });
  const twice = mergeFanout(once.messages, { leadSessionId: 'session-lead-1301' });
  assert.deepEqual(twice.messages.map((m) => m.id), once.messages.map((m) => m.id));
  assert.equal(twice.merged, 0, '已合并的 1 条不会再次被合并');
});

test('lead 副本未到时保留临时气泡（不闪断）', () => {
  const T = 1793158400000;
  const copy = {
    id: 'u:ux:msg-9',
    kind: 'user',
    sessionId: 'session-ux',
    sender: { sessionId: 'session-ux', name: 'user', kind: 'user' },
    targets: ['lead', 'ux'],
    targetSessionIds: ['session-lead', 'session-ux'],
    text: '正文',
    time: T,
    seq: 3,
    isFinal: false,
    meta: { fanout: true },
  };
  const out = mergeFanout([copy], { leadSessionId: 'session-lead' });
  assert.equal(out.messages.length, 1);
  assert.equal(out.messages[0].meta.temporary, true);
  assert.equal(out.messages[0].delivery, 'sent');
});

test('单目标（无前缀）不被同发合并逻辑改动', () => {
  const { result } = normalizeFixture('01-user-rpc');
  const user = byKind(result.messages, 'user')[0];
  const out = mergeFanout(result.messages, { leadSessionId: 'session-lead-0001' });
  const after = out.messages.find((m) => m.id === user.id);
  assert.equal(after.clientBatchId, undefined);
  assert.equal(after.meta.fanout, undefined);
});

test('normalizeChannel 对同发副本只保留 1 条（不依赖调用方再 merge）', () => {
  const fx = normalizeFixture('07-fanout-3targets');
  const users = fx.result.messages.filter((m) => m.kind === 'user');
  assert.equal(users.length, 1);
  assert.equal(Object.keys(users[0].deliveries).length, 3);
});
