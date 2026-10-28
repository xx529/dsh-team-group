// @ts-check
/**
 * UT-04/05/07/47：assistant 输出（每 turn 末段，口径 A）/ forked 丢弃 / 中断提示 / 工具计数
 * 契约：架构 §4.2 矩阵 + §4.2「每轮最终输出的判定」
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byKind, ev, normalizeFixture } from './helpers.js';
import { normalizeChannel } from '../../src/core/normalize.js';

test('UT-04 每 turn 仅 1 条 agent_output，取最后一个非空 text 块，忽略 reasoning/tool-call', () => {
  const { result } = normalizeFixture('04-assistant-turns');
  const outputs = byKind(result.messages, 'agent_output');
  assert.equal(outputs.length, 2, 'turn1/turn2 各 1 条；turn3 被 fork 丢弃');
  const t1 = outputs.find((m) => m.turn === 1);
  const t2 = outputs.find((m) => m.turn === 2);
  assert.equal(t1.text, '第一轮最终答复');
  assert.equal(t1.isFinal, true);
  assert.equal(t2.text, '第二轮草稿');
  assert.equal(t2.isFinal, false, '非 completed 轮次 isFinal=false');
  assert.ok(!outputs.some((m) => m.text.includes('第一轮中间步骤')), '同 turn 中间步骤不得成消息');
  assert.ok(!outputs.some((m) => m.text.includes('只有推理')), 'reasoning 不进正文');
});

test('UT-05 turn/end(forked) 的 turn 整体丢弃，不产消息', () => {
  const { result } = normalizeFixture('04-assistant-turns');
  assert.ok(!result.messages.some((m) => m.text.includes('被 fork 丢弃的合成输出')));
  assert.equal(result.diagnostics.forkedTurnsDropped, 1);
});

test('UT-07 非 completed 轮次追加「本轮中断/失败」系统提示（i18n-neutral：meta.turnEndReason）', () => {
  const { result } = normalizeFixture('04-assistant-turns');
  const notes = byKind(result.messages, 'system').filter((m) => m.meta?.event === 'turn-interrupted');
  assert.equal(notes.length, 1);
  assert.equal(notes[0].meta.turnEndReason, 'error');
  assert.equal(notes[0].meta.turn, 2);
  assert.equal(notes[0].text, '', '文案由 UI i18n 渲染，core 不写中文');
});

test('UT-47 工具调用计数：挂到 agent_output.toolCallCount，不产生工具正文消息', () => {
  const { result } = normalizeFixture('12-tool-heavy');
  const outputs = byKind(result.messages, 'agent_output');
  const fold = outputs.find((m) => m.turn === 1);
  assert.equal(fold.toolCallCount, 30);
  assert.ok(!result.messages.some((m) => m.text.includes('docs/x.md')), '工具参数/结果不得进入正文');
  assert.ok(!result.messages.some((m) => m.kind === 'tool_call'));
});

test('工具调用但无文本输出的 turn → 独立 M6 摘要消息（Lead 约束兜底）', () => {
  const { result } = normalizeFixture('12-tool-heavy');
  const summaries = byKind(result.messages, 'delivery').filter((m) => m.meta?.toolSummary === true);
  assert.equal(summaries.length, 1, 'turn2 有 1 次工具调用且无文本输出');
  assert.equal(summaries[0].toolCallCount, 1);
  assert.equal(summaries[0].meta.turn, 2);
  assert.equal(summaries[0].text, '');
});

test('turnOpen（窗口内缺 turn/end）：输出 isFinal=false 且带 meta.turnOpen', () => {
  const T = 1793158400000;
  const events = [
    ev('turn/start', 1, T, { turn: 1 }),
    ev('assistant/message', 2, T + 100, { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: '还在进行中' }] } }),
  ];
  const result = normalizeChannel([{ sessionId: 'session-lead', header: {}, events }], { leadSessionId: 'session-lead' });
  const open = byKind(result.messages, 'agent_output')[0];
  assert.equal(open.isFinal, false);
  assert.equal(open.meta.turnOpen, true);
  assert.equal(open.meta.turnEndReason, undefined);
});

test('assistant/message 无 text 块（只工具）不出 agent_output', () => {
  const { result } = normalizeFixture('12-tool-heavy');
  // turn1 有文本输出，turn2 无 assistant/message 文本 → 只有独立摘要
  const turn2Outputs = byKind(result.messages, 'agent_output').filter((m) => m.turn === 2);
  assert.equal(turn2Outputs.length, 0);
});
