// @ts-check
/**
 * UT-14/15/16/44：排序（time → creationId/pairOrder → kindRank → sessionRank → sessionId → seq）
 * 契约：架构 §4.3.1
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byKind, normalizeFixture } from './helpers.js';
import {
  compareMessages,
  compareOrderKey,
  encodeSeq,
  insertInOrder,
  mergeTimeline,
  orderKey,
  sessionRankOf,
  sortMessages,
  sortTimeline,
} from '../../src/core/timeline.js';

test('UT-14 排序稳定：fixture 08 交错时间线，两次结果一致', () => {
  const a = normalizeFixture('08-interleaved-timeline').result.messages;
  const b = normalizeFixture('08-interleaved-timeline').result.messages;
  assert.deepEqual(a.map((m) => m.id), b.map((m) => m.id));
  // time 单调
  for (let i = 1; i < a.length; i += 1) assert.ok(a[i].time >= a[i - 1].time);
  // 同毫秒 2050：lead(0) → teammate(1) → subagent(2)
  const same = a.filter((m) => m.time === 1793158402050);
  assert.deepEqual(same.map((m) => m.sender.kind), ['lead', 'teammate', 'subagent']);
});

test('UT-15 同毫秒 20 条不抖动、不丢', () => {
  const { result } = normalizeFixture('09-same-second');
  const outputs = byKind(result.messages, 'agent_output');
  assert.equal(outputs.length, 20);
  const at = outputs.filter((m) => m.time === 1793158405000);
  assert.equal(at.length, 20);
  // lead 全部先于 teammate（sessionRank）
  const firstTeammate = at.findIndex((m) => m.sender.kind === 'teammate');
  assert.ok(at.slice(0, firstTeammate).every((m) => m.sender.kind === 'lead'));
  const sortedTwice = sortTimeline(sortTimeline(result.messages));
  assert.deepEqual(sortedTwice.map((m) => m.id), result.messages.map((m) => m.id));
});

test('UT-16 排序不使用 createdAt（fork 会话 createdAt 晚于内含事件 time）', () => {
  const { result } = normalizeFixture('06-seeded-fork');
  const forkOutput = result.messages.find((m) => m.sessionId === 'session-fork-0502');
  const leadOutput = result.messages.find((m) => m.sessionId === 'session-lead-0501' && m.kind === 'agent_output');
  assert.ok(leadOutput.time < forkOutput.time, '按事件 time 排序，不按 fork createdAt（更晚）');
  const ids = result.messages.map((m) => m.id);
  assert.ok(ids.indexOf(leadOutput.id) < ids.indexOf(forkOutput.id));
});

test('pairOrder：同一 creationId 的欢迎提示(0) 先于 creator 带卡消息(1)', () => {
  const { result } = normalizeFixture('16-member-card');
  const scout = result.messages.filter((m) => m.creationId === 'mc:session-scout-1502');
  assert.equal(scout.length, 2);
  assert.equal(scout[0].kind, 'system');
  assert.equal(scout[0].pairOrder, 0);
  assert.equal(scout[1].kind, 'member_card');
  assert.equal(scout[1].pairOrder, 1);
});

test('compareMessages：kindRank（member_card < task_card < 普通消息）在同毫秒生效', () => {
  const base = {
    id: 'x',
    sessionId: 's',
    sender: { sessionId: 's', name: 'lead', kind: 'lead' },
    targets: [],
    targetSessionIds: [],
    text: '',
    time: 100,
    seq: 1,
    isFinal: false,
  };
  const card = { ...base, id: 'c', kind: 'member_card' };
  const task = { ...base, id: 't', kind: 'task_card' };
  const plain = { ...base, id: 'p', kind: 'agent_output' };
  assert.ok(compareMessages(card, task) < 0);
  assert.ok(compareMessages(task, plain) < 0);
  assert.equal(sessionRankOf(plain), 0);
});

test('orderKey 单调 + mergeTimeline 幂等 + insertInOrder 等价排序', () => {
  const { result } = normalizeFixture('08-interleaved-timeline');
  const msgs = result.messages;
  // orderKey 是边界锚点（不含 creationId/pairOrder），只保证唯一可比较
  const keys = msgs.map((m) => orderKey(m));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(compareOrderKey(keys[0], keys[keys.length - 1]) < 0);
  const merged = mergeTimeline(msgs, msgs);
  assert.deepEqual(merged.messages.map((m) => m.id), msgs.map((m) => m.id));
  assert.deepEqual(merged.added, []);
  assert.deepEqual(merged.updated, []);

  let acc = [];
  for (const m of [...msgs].reverse()) acc = insertInOrder(acc, m);
  assert.deepEqual(acc.map((m) => m.id), msgs.map((m) => m.id));
});

test('sortMessages 是 sortTimeline 的别名（T2 冻结名）', () => {
  assert.equal(sortMessages, sortTimeline);
});

test('encodeSeq：浮点 seq 不丢失、不要求整数', () => {
  assert.equal(encodeSeq(1), '000000000001.000000');
  assert.equal(encodeSeq(1.5), '000000000001.500000');
  assert.ok(compareOrderKey(`a${encodeSeq(1)}`, `a${encodeSeq(1.5)}`) < 0);
  assert.equal(encodeSeq(Number.NaN), '000000000000.000000');
});
