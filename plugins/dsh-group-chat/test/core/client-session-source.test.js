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

test('CT-02 sync：返回全量 computed messages（冷启动修复）；append 后含新消息且游标推进', async () => {
  const { source, host, lead } = setup('07-fanout-3targets');
  const page = await source.open(lead);
  const none = await source.sync(page.cursor);
  assert.equal(none.messages.length, page.messages.length, 'sync 返回全量（commitSync 按 id 合并）');
  host.appendEvents(lead, [
    ev('turn/start', 900, T + 50000, { turn: 20 }),
    ev('assistant/message', 901, T + 50001, { turn: 20, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: '实时新增' }] } }),
    ev('turn/end', 902, T + 50002, { turn: 20, reason: { kind: 'completed' } }),
  ]);
  const delta = await source.sync(page.cursor);
  assert.equal(delta.messages.length, page.messages.length + 1, '全量 + 新增');
  assert.ok(delta.messages.some((m) => m.text === '实时新增'));
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

/* ── 冷启动：retain.ready 异步（历史 open） ───────────────────────── */

/** 模拟 DSH 冷启动：ready 前 eventSource 为空窗口，ready 后才有历史 */
function makeColdHost(defs = {}) {
  /** @type {Map<string, any>} */
  const refs = new Map();
  /** @type {Map<string, {deferred: any, ws: any, notify: (events: any[]) => void}>} */
  const controls = new Map();
  const listeners = new Map();
  const host = {
    retain(sessionId) {
      const sid = String(sessionId);
      if (refs.has(sid)) return refs.get(sid);
      /** @type {any} */
      const deferred = {};
      deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
      });
      const ws = { entries: [], revision: 0, hasMore: false };
      const es = {
        getSnapshot: () => ws,
        subscribe(fn) {
          listeners.set(sid, fn);
          return () => {
            if (listeners.get(sid) === fn) listeners.delete(sid);
          };
        },
      };
      const ref = {
        ready: deferred.promise,
        binding: {
          session: { getSnapshot: () => ({ id: sid, parentSession: defs[sid]?.parentSession }) },
          eventSource: es,
        },
        release() {
          refs.delete(sid);
          listeners.delete(sid);
        },
      };
      refs.set(sid, ref);
      controls.set(sid, {
        deferred,
        ws,
        notify(events) {
          ws.entries = events.map((event) => ({ type: 'event', event }));
          ws.revision += 1;
          const fn = listeners.get(sid);
          if (fn) fn();
        },
      });
      return ref;
    },
  };
  return { host, controls };
}

test('cold-start：open 等待根会话 retain.ready 后返回历史消息', async () => {
  const T = 1793158400000;
  const history = [
    ev('user/message', 1, T, {
      id: 'm-history',
      role: 'user',
      content: [{ type: 'text', text: '冷启动历史消息' }],
      source: { kind: 'user', rpcId: 'rpc-history' },
    }),
  ];
  const { host, controls } = makeColdHost({ lead: {} });
  const source = createClientSessionSource({
    ctx: { sessions: host },
    channelId: 'lead',
    sessionId: 'lead',
    readyTimeoutMs: 200,
  });
  const openPromise = source.open('lead');
  let resolved = false;
  openPromise.then(() => {
    resolved = true;
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(resolved, false, 'ready 前 open 必须等待（不能立即返回空页）');
  controls.get('lead').notify(history);
  controls.get('lead').deferred.resolve();
  const page = await openPromise;
  assert.ok(page.messages.some((m) => m.text === '冷启动历史消息'), 'ready 后历史加载');
  assert.ok(page.cursor.offsets.lead >= 1);
  source.close();
});

test('cold-start：child 晚 ready 后 sync 返回全量并补入 child 旧历史', async () => {
  const T = 1793158400000;
  const leadHistory = [
    ev('team/member', 1, T, { member: { id: 'child', name: 'ux', kind: 'teammate' } }),
    ev('user/message', 2, T + 100, {
      id: 'm-lead',
      role: 'user',
      content: [{ type: 'text', text: 'lead 历史' }],
      source: { kind: 'user', rpcId: 'rpc-lead' },
    }),
  ];
  const childHistory = [
    ev('user/message', 1, T + 50, {
      id: 'm-child-old',
      role: 'user',
      content: [{ type: 'text', text: 'child 旧历史' }],
      source: { kind: 'user', rpcId: 'rpc-child' },
    }),
  ];
  const { host, controls } = makeColdHost({ lead: {}, child: { parentSession: 'lead' } });
  const source = createClientSessionSource({
    ctx: { sessions: host },
    channelId: 'lead',
    sessionId: 'lead',
    readyTimeoutMs: 200,
  });
  const openPromise = source.open('lead');
  controls.get('lead').notify(leadHistory);
  controls.get('lead').deferred.resolve();
  const page = await openPromise;
  assert.ok(page.messages.some((m) => m.text === 'lead 历史'));
  assert.equal(page.messages.some((m) => m.text === 'child 旧历史'), false, 'child 未 ready 时无其历史');

  controls.get('child').notify(childHistory);
  controls.get('child').deferred.resolve();
  await new Promise((r) => setTimeout(r, 0));
  const synced = await source.sync(page.cursor);
  assert.ok(synced.messages.some((m) => m.text === 'child 旧历史'), 'child 晚 ready 后 sync 全量补入旧历史');
  assert.ok(synced.messages.some((m) => m.text === 'lead 历史'));
  assert.ok(synced.cursor.offsets.child >= 1, 'cursor 更新 child offset');
  source.close();
});

test('cold-start 降级：ready reject / 超时都不崩，返回可用空页', async () => {
  const { host, controls } = makeColdHost({ lead: {} });
  const source = createClientSessionSource({
    ctx: { sessions: host },
    channelId: 'lead',
    sessionId: 'lead',
    readyTimeoutMs: 30,
  });
  const p = source.open('lead');
  controls.get('lead').deferred.reject(new Error('open failed'));
  const page = await p;
  assert.deepEqual(page.messages, []);
  assert.ok(page.channel);
  source.close();

  // 超时未 ready → 降级返回空页（不挂起）
  const second = makeColdHost({ lead: {} });
  const source2 = createClientSessionSource({
    ctx: { sessions: second.host },
    channelId: 'lead',
    sessionId: 'lead',
    readyTimeoutMs: 20,
  });
  const t0 = Date.now();
  const timed = await source2.open('lead');
  assert.ok(Date.now() - t0 >= 10, '应等待约 20ms 后超时降级');
  assert.deepEqual(timed.messages, []);
  source2.close();
});
