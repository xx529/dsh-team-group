// @ts-check
/** B2：轮次聚合（F26/§6.15.2） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateTurns, summarizeTurn, turnStatusFromReason } from '../../src/core/turns.js';
import { loadFixture } from '../fixtures/load.js';
import { ev } from './helpers.js';

const T = 1793158400000;

test('fixture 04：每 turn 一条；最新在前；error 状态；forked 丢弃', () => {
  const fx = loadFixture('04-assistant-turns');
  const turns = aggregateTurns(fx.sessions[0].events);
  assert.equal(turns.length, 2, 'turn1 done + turn2 error；turn3 forked 丢弃');
  assert.deepEqual(turns.map((t) => t.turnId), [2, 1], '最新在前');
  assert.deepEqual(turns.map((t) => t.status), ['error', 'done']);
  const t1 = turns.find((t) => t.turnId === 1);
  const t2 = turns.find((t) => t.turnId === 2);
  assert.equal(t1.summary, '第一轮最终答复');
  assert.equal(t1.stepCount, 2);
  assert.equal(t1.endedAt !== null, true);
  assert.equal(t2.summary, '第二轮草稿');
  assert.equal(t2.toolCount, 0, 'assistant content 内的 tool-call 不计入 tool/call 事件');
});

test('工具计数 + running（无 turn/end）+ 起始时间', () => {
  const events = [
    ev('turn/start', 1, T, { turn: 1 }),
    ev('tool/call', 2, T + 10, { turn: 1, step: 1, callId: 'c1', name: 'read' }),
    ev('tool/call', 3, T + 20, { turn: 1, step: 1, callId: 'c2', name: 'read' }),
    ev('tool/call', 4, T + 30, { turn: 2, step: 1, callId: 'c3', name: 'bash' }),
    ev('assistant/message', 5, T + 40, { turn: 1, step: 2, message: { role: 'assistant', content: [{ type: 'text', text: '进行中的输出' }] } }),
  ];
  const turns = aggregateTurns(events);
  assert.equal(turns.length, 2);
  const t1 = turns.find((t) => t.turnId === 1);
  assert.equal(t1.toolCount, 2);
  assert.equal(t1.stepCount, 2);
  assert.equal(t1.status, 'running');
  assert.equal(t1.startedAt, T);
  assert.equal(turns.find((t) => t.turnId === 2).toolCount, 1);
});

test('缺 turn/start：按 assistant/tool 推断轮次（M2），不再直接返回空', () => {
  assert.equal(aggregateTurns([]).length, 0);
  const inferred = aggregateTurns([
    ev('assistant/message', 1, T, { turn: 1, message: { content: [{ type: 'text', text: 'x' }] } }),
    ev('tool/call', 2, T + 1, { turn: 1, callId: 'c1', name: 'read' }),
  ]);
  assert.equal(inferred.length, 1);
  assert.equal(inferred[0].turnId, 1);
  assert.equal(inferred[0].inferred, true);
  assert.equal(inferred[0].toolCount, 1);
  assert.equal(inferred[0].summary, 'x');
  // 完全无关的事件 → 空数组 + emptyReason
  const none = aggregateTurns([ev('user/message', 1, T, { id: 'm', content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } })]);
  assert.equal(none.length, 0);
  assert.equal(none.emptyReason, 'no-turn-events');
  // 信封兼容 + transient 忽略（原用例）
  const envelope = [
    { type: 'event', event: ev('turn/start', 1, T, { turn: 1 }) },
    { type: 'transient', event: ev('assistant/message', 2, T + 1, { turn: 1, message: { content: [{ type: 'text', text: '流式' }] } }) },
    { type: 'event', event: ev('assistant/message', 3, T + 2, { turn: 1, message: { content: [{ type: 'text', text: '最终' }] } }) },
    { type: 'event', event: ev('turn/end', 4, T + 3, { turn: 1, reason: { kind: 'completed' } }) },
  ];
  const turns = aggregateTurns(envelope);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].status, 'done');
  assert.equal(turns[0].summary, '最终');
});

test('seeded/fork：session/end-seed cutoff 丢弃继承前缀轮次', () => {
  const fx = loadFixture('06-seeded-fork');
  const child = fx.sessions.find((s) => s.name === 'fork');
  const turns = aggregateTurns(child.events);
  assert.equal(turns.length, 1, '只保留 fork 自己的 turn');
  assert.equal(turns[0].summary, 'fork 自己的输出');
  assert.equal(turns[0].status, 'done');
});

test('turnStatusFromReason 映射 + summarizeTurn 截断', () => {
  assert.equal(turnStatusFromReason('completed'), 'done');
  assert.equal(turnStatusFromReason('aborted'), 'aborted');
  assert.equal(turnStatusFromReason('interrupted'), 'aborted');
  assert.equal(turnStatusFromReason('error'), 'error');
  assert.equal(turnStatusFromReason('max-tokens'), 'truncated');
  assert.equal(turnStatusFromReason('weird'), 'unknown');
  assert.equal(summarizeTurn('a\nb\nc'), 'a\nb…');
  const long = summarizeTurn('字'.repeat(200));
  assert.equal(long.length <= 120, true);
  assert.equal(long.endsWith('…'), true);
  assert.equal(summarizeTurn(''), '');
});
