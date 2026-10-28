// @ts-check
/**
 * CT-01…CT-06：ChannelSource 契约（MockChannelSource 实现）
 * 契约：架构 §4.6 / §8.1 L2
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { MockChannelSource } from '../../src/adapters/mock-source.js';
import { loadFixture, leadSessionIdOf } from '../fixtures/load.js';
import { ev } from './helpers.js';

const T = 1793158400000;

/** @param {string} name */
function fixtureSource(name, opts = {}) {
  const fx = loadFixture(name);
  const lead = leadSessionIdOf(fx.sessions);
  const sessions = fx.sessions.map((s) => ({ sessionId: s.sessionId, header: s.header, events: s.events }));
  const source = new MockChannelSource({ leadSessionId: lead, sessions, now: () => 42, ...opts });
  return { source, lead, sessions };
}

test('CT-01 open 幂等：重复 open 不重复消息、快照一致', async () => {
  const { source, lead } = fixtureSource('07-fanout-3targets');
  const a = await source.open(lead, { limit: 200 });
  const b = await source.open(lead, { limit: 200 });
  assert.deepEqual(a.messages.map((m) => m.id), b.messages.map((m) => m.id));
  assert.deepEqual(a.channel.members.map((m) => m.sessionId), b.channel.members.map((m) => m.sessionId));
  assert.equal(a.serverTime, 42);
  assert.ok(a.messages.length >= 1);
  assert.equal(typeof a.cursor.v, 'number');
  assert.equal(a.cursor.channelId, lead);
});

test('CT-02 sync 幂等：游标单调；无新事件返回空增量；append 后返回 1 条', async () => {
  const { source, lead } = fixtureSource('07-fanout-3targets');
  const page = await source.open(lead);
  const first = await source.sync(page.cursor);
  assert.deepEqual(first.messages, []);
  const emptyAgain = await source.sync(first.cursor);
  assert.deepEqual(emptyAgain.messages, []);
  assert.equal(emptyAgain.cursor.newestKey, first.cursor.newestKey);

  source.appendEvents(lead, [
    ev('turn/start', 500, T + 20000, { turn: 9 }),
    ev('assistant/message', 501, T + 20001, { turn: 9, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: '追加的一条' }] } }),
    ev('turn/end', 502, T + 20002, { turn: 9, reason: { kind: 'completed' } }),
  ]);
  const delta = await source.sync(first.cursor);
  assert.equal(delta.messages.length, 1);
  assert.equal(delta.messages[0].text, '追加的一条');
  assert.ok(delta.cursor.newestKey > first.cursor.newestKey);
});

test('CT-03 pageOlder：每页 50、幂等、到顶 hasMore=false', async () => {
  const events = Array.from({ length: 260 }, (_, i) =>
    ev('user/message', i + 1, T + i, {
      id: `msg-${i}`,
      role: 'user',
      content: [{ type: 'text', text: `消息 ${i}` }],
      source: { kind: 'user', rpcId: `rpc-${i}` },
    }),
  );
  const source = new MockChannelSource({ leadSessionId: 'lead', sessions: [{ sessionId: 'lead', header: {}, events }] });
  const open = await source.open('lead');
  assert.equal(open.messages.length, 200);
  assert.equal(open.hasMore, true);
  const older1 = await source.pageOlder(open.cursor);
  assert.equal(older1.messages.length, 50);
  const older2 = await source.pageOlder(older1.cursor);
  assert.equal(older2.messages.length, 10);
  const older3 = await source.pageOlder(older2.cursor);
  assert.equal(older3.messages.length, 0);
  assert.equal(older3.hasMore, false);
  // 幂等：同一游标重复调用同一页结果一致（游标不被原地修改）
  const cursorA = { ...open.cursor };
  const cursorB = { ...open.cursor };
  const pageA = await source.pageOlder(cursorA);
  const pageB = await source.pageOlder(cursorB);
  assert.deepEqual(pageA.messages.map((m) => m.id), pageB.messages.map((m) => m.id));
});

test('CT-04 subscribe 回调 append/reset；close 后不再回调', async () => {
  const { source, lead } = fixtureSource('07-fanout-3targets');
  await source.open(lead);
  /** @type {string[]} */
  const kinds = [];
  const unsub = source.subscribe((kind) => kinds.push(kind));
  source.appendEvents(lead, [ev('future/event', 900, T + 30000, {})]);
  assert.deepEqual(kinds, ['append']);
  source.setEvents(lead, []);
  assert.deepEqual(kinds, ['append', 'reset']);
  unsub();
  source.appendEvents(lead, [ev('future/event', 901, T + 30001, {})]);
  assert.deepEqual(kinds, ['append', 'reset'], 'unsubscribe 后不再回调');
  source.subscribe((kind) => kinds.push(kind));
  source.close();
  source.appendEvents(lead, [ev('future/event', 902, T + 30002, {})]);
  assert.deepEqual(kinds, ['append', 'reset'], 'close 后清空监听');
});

test('CT-06 capabilities / close：只读与关闭后不可发送', async () => {
  const { source, lead } = fixtureSource('07-fanout-3targets');
  assert.deepEqual(source.capabilities(), { canSend: true });
  source.close();
  assert.equal(source.capabilities().canSend, false);
  assert.equal(source.capabilities().reason, 'closed');
  await assert.rejects(() => source.open(lead), /closed/);

  const readonlySource = new MockChannelSource({
    leadSessionId: 'lead',
    sessions: [{ sessionId: 'lead', header: {}, events: [] }],
    readonly: true,
    readonlyReason: 'team-ended',
  });
  assert.deepEqual(readonlySource.capabilities(), { canSend: false, reason: 'readonly' });
});

test('CT-05 Mock 与 ClientSessionSource(replay) 同 fixture 输出一致', async () => {
  const { createClientSessionSource } = await import('../../src/adapters/client-session-source.js');
  const { createReplaySessionHost } = await import('../../src/adapters/replay-host.js');
  const fx = loadFixture('07-fanout-3targets');
  const lead = leadSessionIdOf(fx.sessions);
  const sessions = fx.sessions.map((s) => ({ sessionId: s.sessionId, header: s.header, events: s.events }));

  const mock = new MockChannelSource({ leadSessionId: lead, sessions });
  const mockPage = await mock.open(lead);
  const host = createReplaySessionHost(sessions);
  const clientSource = createClientSessionSource({ ctx: { sessions: host }, channelId: lead, sessionId: lead });
  const clientPage = await clientSource.open(lead);
  assert.deepEqual(clientPage.messages.map((m) => m.id), mockPage.messages.map((m) => m.id));
  assert.deepEqual(clientPage.messages.map((m) => m.kind), mockPage.messages.map((m) => m.kind));
  clientSource.close();
});

test('适配器冒烟：全部 fixture 都能 open（含 S1 信封 fixture）', async () => {
  const { listFixtures } = await import('../fixtures/load.js');
  for (const name of listFixtures()) {
    const fx = loadFixture(name);
    const lead = leadSessionIdOf(fx.sessions);
    const source = new MockChannelSource({
      leadSessionId: lead,
      sessions: fx.sessions.map((s) => ({ sessionId: s.sessionId, header: s.header, events: s.events })),
    });
    const page = await source.open(lead);
    assert.ok(Array.isArray(page.messages), `${name}: messages 必须是数组`);
    assert.equal(page.channel.channelId, lead);
    source.close();
  }
});

test('S1 信封输入：MockChannelSource 只消费 event，transient 丢弃', async () => {
  const fx = loadFixture('13-entry-envelope');
  const lead = leadSessionIdOf(fx.sessions);
  const source = new MockChannelSource({
    leadSessionId: lead,
    sessions: fx.sessions.map((s) => ({ sessionId: s.sessionId, header: s.header, events: s.events })),
  });
  const page = await source.open(lead);
  assert.equal(page.messages.length, 2);
  assert.ok(!page.messages.some((m) => String(m.text).includes('流式')));
  source.close();
});
