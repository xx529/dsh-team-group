// @ts-check
/**
 * UT-01/10/08/48：user/message 归一化（rpcId 判人 / 无 rpcId 子会话 prompt / 双写 spliced / 未知 kind / 空团队）
 * 契约：架构 §4.2 矩阵、§4.2 细节 2、§4.3.3 ①
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byId, byKind, ev, normalizeFixture } from './helpers.js';
import { normalizeChannel } from '../../src/core/normalize.js';

test('UT-01 有 rpcId 的用户消息 → user；双写 spliced 只出 1 条并并入投递元数据', () => {
  const { result, lead } = normalizeFixture('01-user-rpc');
  const users = byKind(result.messages, 'user');
  assert.equal(users.length, 1, '双写 spliced + user/message 只出 1 条');
  const m = users[0];
  assert.equal(m.id, `u:${lead}:msg-user-1`);
  assert.equal(m.text, '你好，团队进度同步一下');
  assert.equal(m.sender.kind, 'user');
  assert.equal(m.meta.messageId, 'msg-user-1');
  assert.equal(m.meta.inboxTarget, 'next-turn');
  assert.ok(typeof m.meta.deliveryTime === 'number');
  assert.equal(m.isFinal, false);
});

test('UT-01 无 rpcId 的子会话首条消息是父 agent 下发的任务 → 默认不出消息', () => {
  const { result } = normalizeFixture('01-user-rpc');
  assert.equal(result.diagnostics.ignoredSubagentPrompts, 1);
  assert.ok(!result.messages.some((m) => m.text.includes('只读取证 scout')), '子会话初始 prompt 不得进入群聊正文');
  // 可选打开时降级为 system（供调试视图）
  const withPrompt = normalizeFixture('01-user-rpc', { emitSubagentPrompt: true });
  const sys = byKind(withPrompt.result.messages, 'system').find((m) => m.meta?.event === 'subagent-prompt');
  assert.ok(sys);
});

test('UT-08 未知 source.kind：不崩、原样展示、标 unknown', () => {
  const events = [
    ev('user/message', 1, 1793158400000, {
      id: 'msg-unknown-1',
      role: 'user',
      content: [{ type: 'text', text: '来自未来构建的消息' }],
      source: { kind: 'future-kind', senderSessionId: 'S_X' },
    }),
  ];
  const result = normalizeChannel([{ sessionId: 'session-lead', header: {}, events }], { leadSessionId: 'session-lead' });
  const messages = result.messages.filter((m) => m.id === 's:session-lead:1');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].kind, 'system');
  assert.equal(messages[0].text, '来自未来构建的消息');
  assert.equal(messages[0].meta.unknownSource, true);
  assert.equal(messages[0].meta.sourceKind, 'future-kind');
});

test('UT-48 空输入 / 空团队 / 未知事件不抛错且确定性', () => {
  assert.deepEqual(normalizeChannel([], { leadSessionId: 'x' }).messages, []);
  const empty = normalizeChannel([{ sessionId: 'session-lead', header: {}, events: [] }], { leadSessionId: 'session-lead' });
  assert.equal(empty.messages.length, 0);

  const events = [
    ev('future/event', 1, 1793158400000, { foo: 'bar' }),
    ev('system/message', 2, 1793158400001, { text: 'system prompt' }),
    ev('assistant/attempt', 3, 1793158400002, { turn: 1 }),
  ];
  const a = normalizeChannel([{ sessionId: 'session-lead', header: {}, events }], { leadSessionId: 'session-lead' });
  const b = normalizeChannel([{ sessionId: 'session-lead', header: {}, events }], { leadSessionId: 'session-lead' });
  assert.equal(a.messages.length, 0);
  assert.equal(a.diagnostics.unknownEvents, 1);
  assert.deepEqual(a.messages, b.messages);
  assert.deepEqual(a.diagnostics, b.diagnostics);
});

test('UT-44 消息 id 构造：user/spliced 同 id 收敛幂等', () => {
  const base = ev('user/message', 5, 1793158400000, {
    id: 'msg-dup-1',
    role: 'user',
    content: [{ type: 'text', text: '同一条' }],
    source: { kind: 'user', rpcId: 'rpc-1' },
  });
  const spliced = ev('agent/inbox/spliced', 6, 1793158400001, {
    target: 'next-turn',
    start: 0,
    inserted: [{ id: 'msg-dup-1', content: [{ type: 'text', text: '同一条' }], source: { kind: 'user', rpcId: 'rpc-1' }, role: 'user' }],
  });
  const run = () =>
    normalizeChannel([{ sessionId: 'session-lead', header: {}, events: [spliced, base] }], { leadSessionId: 'session-lead' }).messages;
  assert.equal(run().length, 1);
  assert.deepEqual(run(), run());
});

test('未知 payload 形状（content 非数组 / 缺 data）不抛错', () => {
  const events = [
    /** @type {any} */ ({ type: 'user/message', seq: 1, time: 1793158400000, data: { id: 'x' } }),
    /** @type {any} */ ({ type: 'assistant/message', seq: 2, time: 1793158400001, data: {} }),
    /** @type {any} */ ({ type: 'tool/call', seq: 3, time: 1793158400002, data: { name: 'read', arguments: 'not-json' } }),
  ];
  const result = normalizeChannel([{ sessionId: 'session-lead', header: {}, events }], { leadSessionId: 'session-lead' });
  assert.ok(Array.isArray(result.messages));
});
