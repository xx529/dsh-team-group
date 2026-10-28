// @ts-check
/**
 * task-80：subagent-settled / form=notice 宿主通知不得作为群聊消息渲染
 * 真实样例形状：user/message source.kind='subagent-settled', form='notice', senderSessionId=子会话
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChannel } from '../../src/core/normalize.js';
import { normalizeFixture, byKind } from './helpers.js';
import { ev } from './helpers.js';

const T = 1793158400000;

test('fixture 19：12+ 条 Background subagent 通知全部不出现；真实用户与未知 kind 保留', () => {
  const { result } = normalizeFixture('19-subagent-notice');
  const joined = result.messages.map((m) => m.text).join('\n');
  assert.ok(!joined.includes('Background subagent'), '不得出现宿主通知正文');
  assert.ok(!joined.includes('Its closing message:'), '不得出现 closing message 模板');
  assert.ok(!joined.includes('Future notice injection'), '通用 form=notice + senderSessionId 也要丢弃');

  // 保留：1 条真实用户消息（rpc）+ 1 条 form=notice 但无 senderSessionId 的用户消息 + 1 条未知 kind 兜底
  assert.equal(result.messages.length, 3);
  const users = byKind(result.messages, 'user');
  assert.equal(users.length, 2);
  assert.ok(users.some((m) => m.text.includes('真实用户消息')));
  assert.ok(users.some((m) => m.text.includes('notice 但无 senderSessionId')));
  const sys = byKind(result.messages, 'system');
  assert.equal(sys.length, 1);
  assert.equal(sys[0].meta.unknownSource, true);
  assert.equal(sys[0].meta.sourceKind, 'future-kind');

  assert.equal(result.diagnostics.ignoredSystemContext, 12, '12 条 subagent-settled 归入上下文丢弃');
  assert.equal(result.diagnostics.ignoredNotices, 1, '1 条通用 notice 归入通知丢弃');
});

test('子会话内的 subagent-settled 通知同样丢弃（不因会话类型泄漏）', () => {
  const events = [
    ev('user/message', 1, T, {
      id: 'msg-child-settled',
      role: 'user',
      content: [{ type: 'text', text: 'Background subagent x finished and will do no further work.' }],
      source: { kind: 'subagent-settled', form: 'notice', senderSessionId: 'S_SUB' },
    }),
    ev('user/message', 2, T + 1, {
      id: 'msg-child-user',
      role: 'user',
      content: [{ type: 'text', text: '真实用户消息' }],
      source: { kind: 'user', rpcId: 'rpc-child' },
    }),
  ];
  const result = normalizeChannel(
    [{ sessionId: 'session-child', header: { parentSession: 'session-lead' }, events }],
    { leadSessionId: 'session-lead' },
  );
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].text, '真实用户消息');
  assert.equal(result.diagnostics.ignoredSystemContext + result.diagnostics.ignoredNotices, 1);
});

test('form=notice 但无 senderSessionId：不触发通用丢弃（避免误伤用户消息）', () => {
  const events = [
    ev('user/message', 1, T, {
      id: 'msg-notice-no-sender',
      role: 'user',
      content: [{ type: 'text', text: '普通用户消息（尽管带 notice form）' }],
      source: { kind: 'user', form: 'notice' },
    }),
  ];
  const result = normalizeChannel([{ sessionId: 'session-lead', header: {}, events }], { leadSessionId: 'session-lead' });
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].kind, 'user');
  assert.equal(result.diagnostics.ignoredNotices, 0);
});
