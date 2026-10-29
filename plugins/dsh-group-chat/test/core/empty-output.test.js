// @ts-check
/**
 * F31：空 agent 输出 / 纯工具轮次不得产生空 bubble（用户图1 bug）
 * 真实 fixture：lead（4 turns：tools-only error / 空白文本 / 正常文本 / 文本+error）、beta/gamma（纯工具轮次）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byKind, normalizeFixture } from './helpers.js';
import { aggregateTurns } from '../../src/core/turns.js';
import { loadFixture } from '../fixtures/load.js';

const BAD_KINDS = new Set(['agent_output', 'system']);

test('fixture 20：无空 agent_output；system 提示仅随「有文本输出」的轮次出现', () => {
  const { result } = normalizeFixture('20-empty-output');
  assert.deepEqual(
    result.messages.filter((m) => m.kind === 'agent_output' && String(m.text ?? '').trim() === ''),
    [],
    '不得出现空 agent_output',
  );
  const hints = byKind(result.messages, 'system').filter((m) => m.meta?.event === 'turn-interrupted');
  assert.equal(hints.length, 1, '仅 turn4（有文本 + error）保留中断提示');
  assert.equal(hints[0].meta.turn, 4);
  assert.equal(hints[0].meta.turnEndReason, 'error');
  // 空输出轮次（turn1/turn2/turn5）不得有提示
  assert.equal(hints.some((m) => [1, 2, 5].includes(m.meta.turn)), false);
});

test('diagnostics.emptyAgentOutput 计数（v1.7.2）：lead turn1/2/5 + beta + gamma = 5', () => {
  const { result } = normalizeFixture('20-empty-output');
  assert.equal(result.diagnostics.emptyAgentOutput, 5);
});

test('lead 纯工具轮次（turn1, error）：无 agent_output、无空 system、保留 M6 工具摘要与计数', () => {
  const { result } = normalizeFixture('20-empty-output');
  const leadTurns = byKind(result.messages, 'agent_output').filter((m) => m.sessionId === 'session-lead-2001');
  assert.equal(leadTurns.some((m) => m.turn === 1), false, '工具轮次不出 agent_output');
  assert.equal(byKind(result.messages, 'system').some((m) => m.meta?.turn === 1 || m.meta?.turn === 5), false, '空输出轮次无提示');
  const summary = byKind(result.messages, 'delivery').find((m) => m.sessionId === 'session-lead-2001' && m.meta?.toolSummary);
  assert.ok(summary, 'M6 工具摘要仍产出（delivery + meta.toolSummary）');
  assert.equal(summary.toolCallCount, 2);
  assert.equal(summary.text, '', '工具摘要文本空但 kind=delivery，由 UI 进程行渲染，不是空气泡');
});

test('lead 空白文本轮次（turn2）不产 agent_output；正常文本（turn3）仍产出', () => {
  const { result } = normalizeFixture('20-empty-output');
  const outputs = byKind(result.messages, 'agent_output');
  assert.equal(outputs.some((m) => m.turn === 2), false);
  const t3 = outputs.find((m) => m.turn === 3);
  assert.ok(t3);
  assert.equal(t3.text, '正常输出');
  assert.equal(t3.isFinal, true);
  assert.equal(t3.meta.turnEndReason, 'completed');
});

test('有文本 + error 的 turn4：保留「气泡 + 提示」（v1.7.2）', () => {
  const { result } = normalizeFixture('20-empty-output');
  const t4 = byKind(result.messages, 'agent_output').find((m) => m.turn === 4);
  assert.equal(t4.text, '失败前的输出');
  assert.equal(t4.isFinal, false);
  assert.equal(t4.meta.turnEndReason, 'error');
  const hint = byKind(result.messages, 'system').find((m) => m.meta?.event === 'turn-interrupted');
  assert.ok(hint);
  assert.equal(hint.meta.turn, 4);
  assert.equal(hint.text, '', '文案由 UI i18n 渲染（meta 驱动）');
});

test('beta/gamma 纯工具轮次：各自无 agent_output，工具摘要保留', () => {
  const { result } = normalizeFixture('20-empty-output');
  for (const sid of ['session-beta-2002', 'session-gamma-2003']) {
    assert.equal(byKind(result.messages, 'agent_output').filter((m) => m.sessionId === sid).length, 0);
    const summary = byKind(result.messages, 'delivery').find((m) => m.sessionId === sid && m.meta?.toolSummary);
    assert.ok(summary, `${sid} 应保留工具摘要`);
    assert.equal(summary.toolCallCount, 2);
  }
});

test('turn 聚合/工具计数不受影响（aggregateTurns 仍统计 tool/call）', () => {
  const fx = loadFixture('20-empty-output');
  const lead = fx.sessions.find((s) => s.name === 'lead');
  const turns = aggregateTurns(lead.events);
  assert.equal(turns.length, 5, '5 个 turn（含空 aborted turn5）');
  const t1 = turns.find((t) => t.turnId === 1);
  assert.equal(t1.toolCount, 2);
  assert.equal(t1.status, 'error');
  assert.equal(turns.find((t) => t.turnId === 2).status, 'done');
  assert.equal(turns.find((t) => t.turnId === 5).status, 'aborted');
  assert.equal(turns.find((t) => t.turnId === 5).toolCount, 1);
});
