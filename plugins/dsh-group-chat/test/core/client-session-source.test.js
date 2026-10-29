// @ts-check
/**
 * CT-01…CT-06（ClientSessionSource / replay）+ S1 窗口形状 + deriveLeadSessionId
 * 契约：架构 §4.6 / §4.8.1 / Spike S1
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ClientSessionSource,
  createClientSessionSource,
  deriveLeadSessionId,
} from '../../src/adapters/client-session-source.js';
import { createReplaySessionHost } from '../../src/adapters/replay-host.js';
import { loadFixture, leadSessionIdOf } from '../fixtures/load.js';
import { ev } from './helpers.js';

const T = 1793158400000;

/** @param {string} name */
function setup(name) {
  const fx = loadFixture(name);
  const lead = leadSessionIdOf(fx.sessions);
  const sessions = fx.sessions.map((s) => ({ sessionId: s.sessionId, header: s.header, events: s.events }));
  const host = createReplaySessionHost(sessions);
  const source = createClientSessionSource({ ctx: { sessions: host }, channelId: lead, sessionId: lead });
  return { source, host, lead, sessions };
}

test('deriveLeadSessionId：子会话 → parentSessionId；根会话返回自身', () => {
  const host = createReplaySessionHost([
    { sessionId: 'lead', header: { id: 'lead' }, events: [] },
    { sessionId: 'child', header: { id: 'child', parentSession: 'lead' }, events: [] },
  ]);
  assert.equal(deriveLeadSessionId({ sessions: host }, 'child'), 'lead');
  assert.equal(deriveLeadSessionId({ sessions: host }, 'lead'), 'lead');
  assert.equal(deriveLeadSessionId({ sessions: host }, 'missing'), 'missing');
  // sessions 缺失时不抛错
  assert.equal(deriveLeadSessionId({}, 'x'), 'x');
});

test('open：从 lead 事件自举成员目录（BFS 发现 teammate），返回 ChannelPage', async () => {
  const { source, lead, host } = setup('07-fanout-3targets');
  const page = await source.open(lead);
  assert.equal(page.channel.channelId, lead);
  const memberNames = page.channel.members.map((m) => m.name).sort();
  assert.deepEqual(memberNames, ['backend', 'lead', 'ux']);
  assert.ok(page.messages.length >= 1);
  assert.ok(page.cursor.channelId === lead);
  assert.ok(page.cursor.offsets[lead] >= 0);
  assert.ok(page.cursor.revisions[lead] >= 1);
  // 引用已建立（打开期间不释放）
  assert.ok(host.refCount(lead) >= 1);
  source.close();
  assert.equal(host.refCount(lead), 0, 'close 释放 retain');
});

test('CT-02 sync：无变化返回空增量；append 后返回新消息且游标推进', async () => {
  const { source, host, lead } = setup('07-fanout-3targets');
  const page = await source.open(lead);
  const none = await source.sync(page.cursor);
  assert.deepEqual(none.messages, []);
  host.appendEvents(lead, [
    ev('turn/start', 900, T + 50000, { turn: 20 }),
    ev('assistant/message', 901, T + 50001, { turn: 20, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: '实时新增' }] } }),
    ev('turn/end', 902, T + 50002, { turn: 20, reason: { kind: 'completed' } }),
  ]);
  const delta = await source.sync(page.cursor);
  assert.equal(delta.messages.length, 1);
  assert.equal(delta.messages[0].text, '实时新增');
  assert.ok(delta.cursor.newestKey > page.cursor.newestKey);
  source.close();
});

test('CT-03 pageOlder：调用 session.loadOlder 后回填（不足一页时到顶）', async () => {
  const events = Array.from({ length: 260 }, (_, i) =>
    ev('user/message', i + 1, T + i, {
      id: `msg-${i}`,
      role: 'user',
      content: [{ type: 'text', text: `消息 ${i}` }],
      source: { kind: 'user', rpcId: `rpc-${i}` },
    }),
  );
  const host = createReplaySessionHost([{ sessionId: 'lead', header: { id: 'lead' }, events }]);
  const source = createClientSessionSource({ ctx: { sessions: host }, channelId: 'lead', sessionId: 'lead' });
  const open = await source.open('lead');
  assert.equal(open.messages.length, 200);
  const older = await source.pageOlder(open.cursor);
  assert.equal(older.messages.length, 50);
  const older2 = await source.pageOlder(older.cursor);
  assert.equal(older2.messages.length, 10);
  const older3 = await source.pageOlder(older2.cursor);
  assert.equal(older3.messages.length, 0);
  assert.equal(older3.hasMore, false);
  source.close();
});

test('CT-04 subscribe：窗口订阅触发（微任务合并）+ unsub/close 生效', async () => {
  const { source, host, lead } = setup('07-fanout-3targets');
  await source.open(lead);
  /** @type {string[]} */
  const kinds = [];
  const unsub = source.subscribe((kind) => kinds.push(kind));
  host.appendEvents(lead, [ev('future/event', 800, T + 60000, {})]);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(kinds, ['append']);
  unsub();
  host.appendEvents(lead, [ev('future/event', 801, T + 60001, {})]);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(kinds, ['append']);
  source.close();
  assert.equal(host.refCount(lead), 0);
});

test('CT-06 capabilities：只读 / 无 lead 引用时不可发送', async () => {
  const fx = loadFixture('07-fanout-3targets');
  const lead = leadSessionIdOf(fx.sessions);
  const host = createReplaySessionHost(fx.sessions.map((s) => ({ sessionId: s.sessionId, header: s.header, events: s.events })));
  const readonlySource = new ClientSessionSource({ ctx: { sessions: host }, channelId: lead, sessionId: lead, readonly: true });
  assert.deepEqual(readonlySource.capabilities(), { canSend: false, reason: 'readonly' });
  readonlySource.close();
  const source = createClientSessionSource({ ctx: { sessions: host }, channelId: lead, sessionId: lead });
  assert.equal(source.capabilities().canSend, false, '未 open 前没有 lead 引用');
  await source.open(lead);
  assert.equal(source.capabilities().canSend, true);
  source.close();
  assert.equal(source.capabilities().reason, 'closed');
});

test('S1：窗口 entries 是原始事件信封；transient 被丢弃（fixture 13 回放）', async () => {
  const fx = loadFixture('13-entry-envelope');
  const lead = leadSessionIdOf(fx.sessions);
  const host = createReplaySessionHost(fx.sessions.map((s) => ({ sessionId: s.sessionId, header: s.header, events: s.events })));
  // replay host 把 events 包装为 {type:'event', event} 信封（模拟真实窗口）
  const win = host.retain(lead).binding.eventSource.getSnapshot();
  assert.ok(win.entries.every((entry) => (entry.type === 'event' || entry.type === 'transient') && entry.event));
  assert.ok(win.entries.some((entry) => entry.type === 'transient'), 'transient 行进入窗口（S1）');
  const source = createClientSessionSource({ ctx: { sessions: host }, channelId: lead, sessionId: lead });
  const page = await source.open(lead);
  assert.ok(!page.messages.some((m) => String(m.text).includes('流式增量')), 'transient 不进消息');
  assert.equal(page.messages.filter((m) => m.kind === 'agent_output').length, 1);
  source.close();
});

test('getMessages/getMembers 便捷方法返回最近一次计算结果', async () => {
  const { source, lead } = setup('07-fanout-3targets');
  const page = await source.open(lead);
  assert.deepEqual(source.getMessages().map((m) => m.id), page.messages.map((m) => m.id));
  assert.ok(source.getMembers().some((m) => m.kind === 'lead'));
  source.close();
});

test('F3：getEvents/getMemberEvents 返回已 retain 窗口的原始事件，可直接 aggregateTurns', async () => {
  const { aggregateTurns } = await import('../../src/core/turns.js');
  const { source, lead } = setup('04-assistant-turns');
  await source.open(lead);
  const events = source.getEvents(lead);
  assert.ok(Array.isArray(events) && events.length > 0);
  assert.ok(events.every((e) => typeof e.type === 'string' && typeof e.seq === 'number'));
  assert.ok(events.some((e) => e.type === 'turn/start'), '含原始 turn 事件');
  const turns = aggregateTurns(events);
  assert.equal(turns.length, 2);
  assert.deepEqual(turns.map((t) => t.turnId), [2, 1]);
  // 别名 + 窗口元信息
  assert.deepEqual(source.getMemberEvents(lead), events);
  const win = source.getWindow(lead);
  assert.equal(win.sessionId, lead);
  assert.equal(win.events.length, events.length);
  assert.ok(win.entryCount >= events.length);
  assert.equal(typeof win.partial, 'boolean');
  // 未知会话 / 关闭后：安全返回空
  assert.deepEqual(source.getEvents('missing-session'), []);
  source.close();
  assert.deepEqual(source.getEvents(lead), []);
});
