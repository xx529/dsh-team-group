// @ts-check
/**
 * UT-02/03：agent→agent 消息（当前构建 agent-message / 旧构建 team-message）
 * 契约：架构 §4.2、EVT §2.3–§2.5
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byKind, normalizeFixture } from './helpers.js';
import {
  prefixSenderName,
  stripTeamPrefix,
} from '../../src/core/normalize.js';

test('UT-02 当前构建：agent-message → agent_to_agent，剥 `Team message from X:`，sender 名解析为 lead', () => {
  const { result } = normalizeFixture('02-peer-agent-message');
  const peers = byKind(result.messages, 'agent_to_agent');
  assert.equal(peers.length, 1);
  const m = peers[0];
  assert.equal(m.sender.name, 'lead');
  assert.equal(m.sender.kind, 'lead');
  assert.equal(m.sessionId, 'session-scout-0102');
  assert.deepEqual(m.targets, ['scout'], '接收方 = 本会话成员名');
  assert.deepEqual(m.targetSessionIds, ['session-scout-0102']);
  assert.equal(m.text, '你上一轮因模型连接错误（TRANSPORT）中断，任务 task-2 仍未完成。请继续。');
  assert.ok(!m.text.startsWith('Team message'));
  assert.ok(String(m.rawText).startsWith('Team message from lead:'));
  assert.equal(m.meta.sourceKind, 'agent-message');
  // 双写 spliced + user/message 只出 1 条
  assert.equal(m.id, 'u:session-scout-0102:msg-peer-1');
});

test('UT-03 旧构建：team-message 结构化 senderName/messageId 优先于文本正则', () => {
  const { result } = normalizeFixture('03-peer-legacy-team-message');
  const peers = byKind(result.messages, 'agent_to_agent');
  assert.equal(peers.length, 1);
  const m = peers[0];
  assert.equal(m.id, 'm:team-message-abc123');
  assert.equal(m.sender.name, 'shell');
  assert.equal(m.sender.kind, 'teammate');
  assert.equal(m.meta.messageId, 'team-message-abc123');
  assert.equal(m.meta.sourceKind, 'team-message');
  assert.equal(m.targets[0], 'shell');
  assert.ok(!m.text.includes('Team message'));
  assert.ok(m.text.includes('[shell → verify]'));
});

test('peer 前缀支持带 messageId 的旧格式 `Team message <id> from X:`', () => {
  const parts = ['Team message team-message-1 from shell:', '正文'];
  assert.equal(prefixSenderName(parts), 'shell');
  assert.equal(stripTeamPrefix(parts), '正文');
  assert.equal(stripTeamPrefix(['普通第一块', '普通第二块']), '普通第一块\n普通第二块');
  assert.equal(prefixSenderName(['不是前缀']), undefined);
});
