// @ts-check
/**
 * D-01 回归：宿主系统上下文注入（user/message 的 source.kind）不得进入群聊消息
 * 契约：架构 §4.9（不展示系统提示词）＋ UT-08（真未知 kind 仍兜底为 system + unknownSource）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byKind, ev, normalizeFixture } from './helpers.js';
import { normalizeChannel } from '../../src/core/normalize.js';
import { CONTEXT_SOURCE_KINDS, isContextSourceKind } from '../../src/core/constants.js';

const T = 1793158400000;

test('fixture 18：agent-instructions/runtime-context/skill-catalog/time-context/tool-jobs/system-prompt 全部丢弃', () => {
  const { result } = normalizeFixture('18-system-context');
  const kinds = result.messages.map((m) => m.kind).sort();
  assert.deepEqual(kinds, ['system', 'user'], '只保留 1 条真实用户消息 + 1 条真未知 kind 的 system 兜底');
  assert.equal(result.diagnostics.ignoredSystemContext, 10, 'lead 8 条 + child 2 条系统上下文');
  assert.equal(result.diagnostics.ignoredSubagentPrompts, 1, 'child 首条 spawn prompt 仍按既有规则忽略');
  const joined = result.messages.map((m) => m.text).join('\n');
  for (const marker of ['system-reminder', 'Current runtime context', 'skill_content', 'Time sampled', 'background job', 'You are the Team Lead']) {
    assert.ok(!joined.includes(marker), `系统上下文不得出现在消息正文：${marker}`);
  }
  // 真未知 kind 保持 UT-08 兜底
  const unknown = byKind(result.messages, 'system').find((m) => m.meta?.unknownSource === true);
  assert.ok(unknown, 'future-context 应保留 system 兜底');
  assert.equal(unknown.meta.sourceKind, 'future-context');
  assert.ok(unknown.text.includes('来自未来构建'));
});

test('逐个 kind：CONTEXT_SOURCE_KINDS 中每个 kind 都不产消息；未知 kind 仍兜底', () => {
  assert.ok(CONTEXT_SOURCE_KINDS.length >= 10);
  assert.equal(isContextSourceKind('agent-instructions'), true);
  assert.equal(isContextSourceKind('runtime-context'), true);
  assert.equal(isContextSourceKind('skill-catalog'), true);
  assert.equal(isContextSourceKind('time-context'), true);
  assert.equal(isContextSourceKind('tool-jobs'), true);
  assert.equal(isContextSourceKind('system-prompt'), true);
  assert.equal(isContextSourceKind('skill-invocation'), true);
  assert.equal(isContextSourceKind('user-approval'), true);
  assert.equal(isContextSourceKind('future-context'), false);
  assert.equal(isContextSourceKind(''), false);

  /** @type {any[]} */
  const events = [];
  let seq = 1;
  for (const kind of CONTEXT_SOURCE_KINDS) {
    events.push(
      ev('user/message', seq, T + seq, {
        id: `msg-${kind}`,
        role: 'user',
        content: [{ type: 'text', text: `payload of ${kind}` }],
        source: { kind },
      }),
    );
    seq += 1;
  }
  events.push(
    ev('user/message', seq, T + seq, {
      id: 'msg-unknown-kind',
      role: 'user',
      content: [{ type: 'text', text: '来自未来构建的未知来源' }],
      source: { kind: 'future-kind' },
    }),
  );
  const result = normalizeChannel([{ sessionId: 'session-lead', header: {}, events }], { leadSessionId: 'session-lead' });
  assert.equal(result.messages.length, 1, '只有未知 kind 出 1 条 system');
  assert.equal(result.messages[0].kind, 'system');
  assert.equal(result.messages[0].meta.unknownSource, true);
  assert.equal(result.diagnostics.ignoredSystemContext, CONTEXT_SOURCE_KINDS.length);
});

test('子会话里的系统上下文同样丢弃（不因会话类型不同而泄漏）', () => {
  const events = [
    ev('user/message', 1, T, {
      id: 'msg-child-ctx',
      role: 'user',
      content: [{ type: 'text', text: '<system-reminder> child injection' }],
      source: { kind: 'agent-instructions' },
    }),
    ev('user/message', 2, T + 1, {
      id: 'msg-child-rpc',
      role: 'user',
      content: [{ type: 'text', text: '真实用户发给子会话的消息' }],
      source: { kind: 'user', rpcId: 'rpc-child' },
    }),
  ];
  const result = normalizeChannel(
    [{ sessionId: 'session-child', header: { parentSession: 'session-lead' }, events }],
    { leadSessionId: 'session-lead' },
  );
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].kind, 'user');
  assert.equal(result.messages[0].text, '真实用户发给子会话的消息');
  assert.equal(result.diagnostics.ignoredSystemContext, 1);
});

test('unknown event 计数不受影响（context 是已知事件类型，只是内容被丢弃）', () => {
  const { result } = normalizeFixture('18-system-context');
  assert.equal(result.diagnostics.unknownEvents, 0);
});
