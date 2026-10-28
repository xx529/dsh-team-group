// @ts-check
/**
 * PERF-01：1000 事件 sync 内核 ≤50ms（本机基准，取 5 次中位数与 P95 之一）
 * 契约：架构 §6.11 / §8.5（M1 本机）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChannel } from '../../src/core/normalize.js';
import { ev } from './helpers.js';

const BUDGET_MS = 50;
const SESSIONS = 5;
const EVENTS_PER_SESSION = 200; // 合计 1000 事件

function buildSessions() {
  const sessions = [];
  for (let s = 0; s < SESSIONS; s += 1) {
    const sessionId = s === 0 ? 'session-lead' : `session-${s}`;
    const events = [];
    let seq = 1;
    for (let i = 0; i < EVENTS_PER_SESSION / 4; i += 1) {
      const time = 1793158400000 + i * 100 + s;
      events.push(ev('user/message', seq, time, {
        id: `${sessionId}-u-${i}`,
        role: 'user',
        content: [{ type: 'text', text: `用户消息 ${i}` }],
        source: { kind: 'user', rpcId: `rpc-${sessionId}-${i}` },
      }));
      seq += 1;
      events.push(ev('turn/start', seq, time + 1, { turn: i + 1 }));
      seq += 1;
      events.push(ev('assistant/message', seq, time + 2, {
        turn: i + 1,
        step: 1,
        message: { role: 'assistant', content: [{ type: 'text', text: `回复 ${i}，包含一些文本用于模拟真实负载。`.repeat(3) }] },
      }));
      seq += 1;
      events.push(ev('turn/end', seq, time + 3, { turn: i + 1, reason: { kind: 'completed' } }));
      seq += 1;
    }
    sessions.push({ sessionId, header: { id: sessionId, parentSession: s === 0 ? undefined : 'session-lead' }, events });
  }
  return sessions;
}

test('PERF-01 1000 事件归一化 ≤50ms（本机 M1，取中位数/最大值）', () => {
  const sessions = buildSessions();
  // 预热
  normalizeChannel(sessions, { leadSessionId: 'session-lead' });
  const samples = [];
  for (let i = 0; i < 5; i += 1) {
    const t0 = process.hrtime.bigint();
    const result = normalizeChannel(sessions, { leadSessionId: 'session-lead' });
    const t1 = process.hrtime.bigint();
    samples.push(Number(t1 - t0) / 1e6);
    assert.ok(result.messages.length > 0);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  const p95 = samples[samples.length - 1];
  // 记录在测试输出中（便于汇报）
  console.log(`[perf] 1000 事件 sync: median=${median.toFixed(2)}ms p95=${p95.toFixed(2)}ms samples=${samples.map((s) => s.toFixed(2)).join(',')}`);
  assert.ok(median <= BUDGET_MS, `中位数 ${median.toFixed(2)}ms 超出 ${BUDGET_MS}ms 预算`);
});

test('PERF-03 首屏 200 条归一化 ≤250ms（同数据规模）', () => {
  const sessions = buildSessions();
  const t0 = process.hrtime.bigint();
  const result = normalizeChannel(sessions, { leadSessionId: 'session-lead' });
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  console.log(`[perf] 首屏归一化: ${ms.toFixed(2)}ms（${result.messages.length} 条）`);
  assert.ok(ms <= 250, `首屏归一化 ${ms.toFixed(2)}ms 超出 250ms 预算`);
});
