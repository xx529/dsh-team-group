// @ts-check
/**
 * UT-09/45/46/48 + fixture 10/11/13/13：S1 信封、文本上限、折叠判定、降级、内存上限
 * 契约：架构 §4.2 细节 3、§6.6、§4.5、§7 R-14/R-15
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byKind, ev, normalizeFixture } from './helpers.js';
import { loadFixture } from '../fixtures/load.js';
import { MockChannelSource } from '../../src/adapters/mock-source.js';
import { LIMITS } from '../../src/core/constants.js';
import { normalizeChannel, normalizeEntries } from '../../src/core/normalize.js';
import { approximateChars, countLines, foldInfo, shouldFold } from '../../src/core/folding.js';

test('UT-09 只消费 entry.type==="event"；transient（小数 seq）丢弃', () => {
  const raw = loadFixture('13-entry-envelope');
  const entries = normalizeEntries(raw.sessions[0].events);
  assert.equal(entries.transientDropped, 2);
  assert.equal(entries.events.length, 4);
  const messages = normalizeFixture('13-entry-envelope', {}, { envelope: true }).result.messages;
  assert.equal(messages.length, 2, '1 user + 1 agent_output，流式行不产生消息');
  assert.ok(!messages.some((m) => String(m.text).includes('流式增量')));
});

test('UT-09 禁止整数 seq 断言：持久事件 seq 为小数也能正常归一化/排序', () => {
  const events = [
    ev('user/message', 1.5, 1793158400000, {
      id: 'msg-frac-1',
      role: 'user',
      content: [{ type: 'text', text: '小数 seq 的持久事件' }],
      source: { kind: 'user', rpcId: 'rpc-frac' },
    }),
  ];
  const result = normalizeChannel([{ sessionId: 'session-lead', header: {}, events }], { leadSessionId: 'session-lead' });
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].seq, 1.5);
});

test('UT-45 textRender=64KB 截断，超长单条不撑破内存', () => {
  const { result } = normalizeFixture('10-long-text');
  const huge = result.messages.find((m) => m.id.endsWith('msg-long-80k'));
  assert.equal(huge.truncated, true);
  assert.equal(huge.text.length, LIMITS.textRender);
  assert.equal(huge.meta.textOriginalLength, 80 * 1024);
  // 正常消息不被截断
  const normal = result.messages.find((m) => m.id.endsWith('msg-long-1k'));
  assert.equal(normal.truncated, undefined);
});

test('UT-46 折叠阈值：8 行/400 字先到者；边界正确', () => {
  const eightLines = Array.from({ length: 8 }, (_, i) => `第${i + 1}行`).join('\n');
  assert.equal(shouldFold(eightLines), false, '8 行不折');
  assert.equal(shouldFold(`${eightLines}\n第9行`), true, '9 行折');
  assert.equal(shouldFold('字'.repeat(400)), false, '400 字不折');
  assert.equal(shouldFold('字'.repeat(401)), true, '401 字折');
  assert.equal(shouldFold('a'.repeat(380) + '\n'.repeat(7) + 'b'), false);
  assert.equal(countLines('a\nb\n'), 2);
  assert.equal(countLines(''), 0);
  assert.equal(foldInfo('字'.repeat(401)).reason, 'chars');
  assert.equal(foldInfo('a\nb\nc\nd\ne\nf\ng\nh\ni').reason, 'lines');
  assert.equal(approximateChars('x'.repeat(1234)), 1240);
});

test('UT-48 内存 2000 上限：normalizeChannel 自动中间裁剪并记 diagnostics', () => {
  const events = [];
  for (let i = 0; i < 2100; i += 1) {
    events.push(
      ev('user/message', i + 1, 1793158400000 + i, {
        id: `msg-cap-${i}`,
        role: 'user',
        content: [{ type: 'text', text: `消息 ${i}` }],
        source: { kind: 'user', rpcId: `rpc-${i}` },
      }),
    );
  }
  const result = normalizeChannel([{ sessionId: 'session-lead', header: {}, events }], { leadSessionId: 'session-lead' });
  assert.equal(result.messages.length, LIMITS.maxMessagesInMemory);
  assert.ok(result.diagnostics.memoryTrimmed >= 100);
  assert.ok(result.diagnostics.warnings.includes('memory-trimmed'));
  assert.equal(result.diagnostics.truncated, true);
});

test('fixture 11 无投影降级：成员仍可见、消息可读、degraded 标记', async () => {
  const fx = loadFixture('11-missing-roster');
  const lead = fx.sessions.find((s) => s.name === 'lead').sessionId;
  const source = new MockChannelSource({
    leadSessionId: lead,
    sessions: fx.sessions.map((s) => ({ sessionId: s.sessionId, header: s.header, events: s.events })),
  });
  const page = await source.open(lead);
  const names = page.channel.members.map((m) => m.name);
  assert.ok(names.includes('lead'));
  assert.ok(names.includes('scout'), 'team/member 推导 teammate');
  assert.ok(names.includes('代码地图'), 'catalog 推导 subagent');
  assert.equal(page.channel.degraded, 'no-roster');
  assert.equal(byKind(page.messages, 'user').length, 1);
  assert.equal(byKind(page.messages, 'agent_output').length, 2);
  source.close();
});

test('未知事件只计数，不进消息（future/event）', () => {
  const events = [ev('future/event', 1, 1793158400000, { foo: 1 }), ev('goal/change', 2, 1793158400001, {})];
  const result = normalizeChannel([{ sessionId: 'session-lead', header: {}, events }], { leadSessionId: 'session-lead' });
  assert.equal(result.messages.length, 0);
  assert.equal(result.diagnostics.unknownEvents, 1, 'goal/change 是已知无关事件');
});
