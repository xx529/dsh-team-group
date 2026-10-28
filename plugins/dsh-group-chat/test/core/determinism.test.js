// @ts-check
/**
 * UT-48（确定性）+ §8.2 全 fixture 冒烟：同输入两次 normalize 完全一致；所有 fixture 不抛错
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { listFixtures } from '../fixtures/load.js';
import { normalizeFixture } from './helpers.js';

const ENVELOPE = new Set(['13-entry-envelope']);

test('全部 fixture 归一化两次结果完全一致（消息/诊断/成员）', () => {
  const names = listFixtures();
  assert.ok(names.length >= 18, `fixture 组数应 >= 18，实际 ${names.length}`);
  for (const name of names) {
    const key = name.replace(/\.jsonl$/, '');
    const a = normalizeFixture(name, {}, { envelope: ENVELOPE.has(key) }).result;
    const b = normalizeFixture(name, {}, { envelope: ENVELOPE.has(key) }).result;
    assert.deepEqual(
      a.messages.map((m) => m.id),
      b.messages.map((m) => m.id),
      `${name}: 消息 id 序列必须确定`,
    );
    assert.deepEqual(a.messages, b.messages, `${name}: 消息内容必须确定`);
    assert.deepEqual(a.diagnostics, b.diagnostics, `${name}: 诊断必须确定`);
    assert.deepEqual(a.members.map((m) => m.sessionId), b.members.map((m) => m.sessionId));
    // 通用不变量：id 唯一、time 单调、kind 合法
    const ids = a.messages.map((m) => m.id);
    assert.equal(new Set(ids).size, ids.length, `${name}: 消息 id 必须唯一`);
    for (let i = 1; i < a.messages.length; i += 1) {
      assert.ok(a.messages[i].time >= a.messages[i - 1].time, `${name}: time 必须单调`);
    }
    for (const m of a.messages) {
      assert.equal(typeof m.id, 'string');
      assert.equal(typeof m.text, 'string');
      assert.ok(['user', 'agent_to_agent', 'agent_output', 'system', 'delivery', 'member_card', 'task_card'].includes(m.kind));
    }
  }
});

test('fixture 清单与架构 §8.2 对齐（17 组，含 member-card / task-card）', () => {
  const names = listFixtures().map((n) => n.replace(/\.jsonl$/, ''));
  const expected = [
    '01-user-rpc',
    '02-peer-agent-message',
    '03-peer-legacy-team-message',
    '04-assistant-turns',
    '05-subagent-settled',
    '06-seeded-fork',
    '07-fanout-3targets',
    '08-interleaved-timeline',
    '09-same-second',
    '10-long-text',
    '11-missing-roster',
    '12-tool-heavy',
    '13-entry-envelope',
    '14-fanout-prefix-canonical',
    '15-partial-failure',
    '16-member-card',
    '17-task-card',
    '18-system-context',
  ];
  for (const name of expected) assert.ok(names.includes(name), `缺少 fixture ${name}`);
});
