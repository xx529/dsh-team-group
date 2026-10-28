// @ts-check
/**
 * UT-06/10/11/12/13/38：三层去重（双写 / fork-seed cutoff / 通知副本 / 弱键）
 * 契约：架构 §4.3.3
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byKind, ev, normalizeFixture } from './helpers.js';
import { normalizeChannel } from '../../src/core/normalize.js';
import {
  dedupeMessages,
  hashText,
  normalizeText,
  pairNotificationCopies,
  preferMessage,
  weakKeyOf,
} from '../../src/core/dedupe.js';

test('UT-06 subagent-settled 与子会话 agent_output 同文：只保留子会话那条', () => {
  const { result } = normalizeFixture('05-subagent-settled');
  const outputs = byKind(result.messages, 'agent_output');
  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].sessionId, 'session-sub-0402');
  assert.equal(outputs[0].sender.kind, 'subagent');
  assert.equal(result.diagnostics.settlementsDropped, 1);
  assert.ok(!result.messages.some((m) => m.meta?.copy === 'settlement'));
});

test('UT-10 双写 spliced/user 同 id 只保留 1 条，优先 user/message 并合入 spliced 元数据', () => {
  const userMessage = {
    id: 'u:s:msg-1',
    kind: 'user',
    sessionId: 's',
    sender: { sessionId: 's', name: 'user', kind: 'user' },
    targets: [],
    targetSessionIds: [],
    text: 'hi',
    time: 1,
    seq: 2,
    isFinal: false,
    meta: { messageId: 'msg-1' },
  };
  const splicedCopy = { ...userMessage, seq: 1, meta: { fromSpliced: true, inboxTarget: 'next-turn', deliveryTime: 1 } };
  const out = dedupeMessages([splicedCopy, userMessage], { leadSessionId: 's' });
  assert.equal(out.messages.length, 1);
  assert.equal(out.messages[0].meta.fromSpliced, undefined);
  assert.equal(out.messages[0].meta.inboxTarget, 'next-turn', 'loser meta 合入 winner');
  assert.equal(out.removed, 1);
  assert.equal(preferMessage(splicedCopy, userMessage), userMessage);
});

test('UT-11 fork/seed：end-seed cutoff 丢弃继承前缀；同 id 历史不重复', () => {
  const { result } = normalizeFixture('06-seeded-fork');
  const users = byKind(result.messages, 'user');
  assert.equal(users.length, 1, '继承前缀里的 user/message 不得重复出现');
  assert.equal(users[0].id, 'u:session-lead-0501:msg-shared-1');
  assert.ok(result.diagnostics.inheritedDropped >= 4);
  // fork 自己的输出保留
  assert.ok(result.messages.some((m) => m.kind === 'agent_output' && m.sessionId === 'session-fork-0502' && m.text === 'fork 自己的输出'));
  // 继承的 lead 回复只出现 1 次
  assert.equal(result.messages.filter((m) => m.text === 'lead 的回复').length, 1);
});

test('UT-12 通知副本弱键：settlement ↔ 子会话输出按 (sender,target,hash,time±5s) 配对', () => {
  const now = 1793158400000;
  const output = {
    id: 'a:s:turn:1',
    kind: 'agent_output',
    sessionId: 's',
    sender: { sessionId: 's', name: 'sub', kind: 'subagent' },
    targets: [],
    targetSessionIds: [],
    text: '完成，见 docs/api.md',
    time: now,
    seq: 5,
    isFinal: true,
  };
  const settlement = {
    id: 's:lead:9',
    kind: 'system',
    sessionId: 'lead',
    sender: { sessionId: 'lead', name: 'lead', kind: 'lead' },
    targets: [],
    targetSessionIds: [],
    text: 'settled',
    time: now + 100,
    seq: 9,
    isFinal: false,
    meta: { copy: 'settlement', senderSessionId: 's', closingText: '完成，见 docs/api.md' },
  };
  const deduped = dedupeMessages([output, settlement], { leadSessionId: 'lead' });
  assert.equal(deduped.messages.length, 1);
  assert.equal(deduped.messages[0].kind, 'agent_output');
  assert.equal(deduped.settlementsDropped, 1);
  assert.deepEqual(pairNotificationCopies([output, settlement]), [{ keep: 0, drop: 1 }]);
  // 时间超窗 → 不配对
  const far = { ...settlement, time: now + 60_000 };
  assert.equal(pairNotificationCopies([output, far]).length, 0);
});

test('UT-13 弱键不误合并「同一发送者两次真实发言」', () => {
  const now = 1793158400000;
  const mk = (seq, id) => ({
    id,
    kind: 'agent_to_agent',
    sessionId: 's',
    sender: { sessionId: 'lead', name: 'lead', kind: 'lead' },
    targets: ['s'],
    targetSessionIds: ['s'],
    text: '同一段话',
    time: now,
    seq,
    isFinal: false,
    meta: { sourceKind: 'agent-message' },
  });
  const a = mk(1, 'u:s:m1');
  const b = mk(2, 'u:s:m2');
  assert.equal(weakKeyOf(a, 's'), weakKeyOf(b, 's'), '弱键相同（文本/时间相同）');
  const deduped = dedupeMessages([a, b], { leadSessionId: 'lead' });
  assert.equal(deduped.messages.length, 2, '不同 id 的真实发言不得合并');
});

test('hashText / normalizeText 稳定性', () => {
  assert.equal(hashText('abc'), hashText('abc'));
  assert.notEqual(hashText('abc'), hashText('abd'));
  assert.equal(normalizeText('a  b\r\n\r\n\r\nc  '), 'a b\n\nc');
});
