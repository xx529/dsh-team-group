// @ts-check
/**
 * DSH 0.2.2 适配回归：`session/end-seed` 的两种语义
 *
 *  - fork 种子：`data.inherited === true` → 前缀来自父会话，群聊必须丢弃（防重复）；
 *  - 恢复/续写：`data === {}` → 同一会话在 DSH 0.2.x 被 resume 时追加的续写边界，
 *    前缀仍是本会话自己的历史，**不得**当 cutoff（否则重开/冷启动后群聊整段空白）。
 *
 * 证据（0.2.2 内置包）：
 *  - `dsh-session/lib/index.js` `buildForkSeed()` 只写 `{ inherited: true }`；
 *  - 同一文件 Session 构造器在 seed 续写时追加 `session/end-seed`、`data` 为 `{}`。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChannel } from '../../src/core/normalize.js';
import { aggregateTurns } from '../../src/core/turns.js';
import { ev } from './helpers.js';

const T = 1793158400000;

/** @returns {any[]} */
function sessionEvents() {
  return [
    ev('turn/start', 1, T, { turn: 1 }),
    ev('user/message', 2, T + 1, {
      id: 'msg-1',
      role: 'user',
      content: [{ type: 'text', text: '历史问题' }],
      source: { kind: 'user', rpcId: 'rpc-1' },
    }),
    ev('assistant/message', 3, T + 2, {
      turn: 1,
      step: 1,
      message: { role: 'assistant', content: [{ type: 'text', text: '历史回答' }] },
    }),
    ev('turn/end', 4, T + 3, { turn: 1, reason: { kind: 'completed' } }),
  ];
}

test('end-seed（data={}，resume 标记）不产生继承 cutoff：历史消息与轮次全部保留', () => {
  const events = sessionEvents().concat([{ type: 'session/end-seed', seq: 5, time: T + 4, data: {} }]);
  const result = normalizeChannel([{ sessionId: 'lead', header: {}, events }], { leadSessionId: 'lead' });
  assert.equal(result.diagnostics.inheritedDropped, 0, 'resume 标记不得丢弃历史');
  assert.equal(result.messages.filter((m) => m.kind === 'user').length, 1);
  assert.ok(result.messages.some((m) => m.kind === 'agent_output' && m.text === '历史回答'));
  assert.equal(aggregateTurns(events).length, 1, '轮次聚合同样不得丢弃 resume 前历史');
});

test('end-seed（data.inherited=true，fork 种子）仍按继承前缀丢弃', () => {
  const events = [
    ev('turn/start', 1, T, { turn: 1 }),
    ev('user/message', 2, T + 1, {
      id: 'msg-inherited',
      role: 'user',
      content: [{ type: 'text', text: '父会话历史' }],
      source: { kind: 'user', rpcId: 'rpc-inherited' },
    }),
    { type: 'session/end-seed', seq: 3, time: T + 2, data: { inherited: true } },
    ev('turn/start', 4, T + 3, { turn: 2 }),
    ev('assistant/message', 5, T + 4, {
      turn: 2,
      step: 1,
      message: { role: 'assistant', content: [{ type: 'text', text: 'fork 自己的输出' }] },
    }),
    ev('turn/end', 6, T + 5, { turn: 2, reason: { kind: 'completed' } }),
  ];
  const result = normalizeChannel([{ sessionId: 'fork', header: {}, events }], { leadSessionId: 'fork' });
  assert.ok(result.diagnostics.inheritedDropped >= 2, '继承前缀被丢弃');
  assert.ok(!result.messages.some((m) => m.text === '父会话历史'), '父会话历史不得重复出现');
  assert.ok(result.messages.some((m) => m.text === 'fork 自己的输出'), 'fork 自身输出保留');
  const turns = aggregateTurns(events);
  assert.equal(turns.length, 1, '只保留 fork 自己的 turn');
  assert.equal(turns[0].summary, 'fork 自己的输出');
});
