// @ts-check
/**
 * UT-17/18/19：首屏 200 / 每页 50 / 内存 2000 中间裁剪 / 每会话预取 400 / 游标
 * 契约：架构 §4.5
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPage,
  capInMemory,
  computeHasMore,
  cursorAfterOpen,
  firstScreen,
  pageOlder,
  selectPrefetch,
} from '../../src/core/paginate.js';
import { makeCursor, orderKey } from '../../src/core/timeline.js';

/** @param {number} n */
function synthetic(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `m-${String(i).padStart(5, '0')}`,
    kind: 'agent_output',
    sessionId: 's',
    sender: { sessionId: 's', name: 'lead', kind: 'lead' },
    targets: [],
    targetSessionIds: [],
    text: `第 ${i} 条`,
    time: 1793158400000 + i,
    seq: i,
    isFinal: true,
  }));
}

test('UT-17 首屏取最后 200 条', () => {
  const all = synthetic(500);
  const page = firstScreen(all);
  assert.equal(page.length, 200);
  assert.equal(page[0].id, 'm-00300');
  assert.equal(page[199].id, 'm-00499');
});

test('UT-17 向上分页 50：before=oldestKey，升序返回且不重复', () => {
  const all = synthetic(300);
  const cursor = makeCursor('c');
  cursor.oldestKey = orderKey(all[100]);
  const page1 = pageOlder(all, cursor.oldestKey);
  assert.equal(page1.length, 50);
  assert.equal(page1[0].id, 'm-00050');
  assert.equal(page1[49].id, 'm-00099');
  cursor.oldestKey = orderKey(page1[0]);
  const page2 = pageOlder(all, cursor.oldestKey);
  assert.ok(page2.every((m) => Number(m.id.slice(2)) < 50));
  assert.equal(page2.length, 50);
  // 到顶
  cursor.oldestKey = orderKey(all[0]);
  assert.equal(pageOlder(all, cursor.oldestKey).length, 0);
});

test('UT-18 内存 2000 上限：保留首 200 + 最近 1800，从中间裁剪', () => {
  const all = synthetic(2500);
  const capped = capInMemory(all, 2000, 200);
  assert.equal(capped.messages.length, 2000);
  assert.equal(capped.trimmed, true);
  assert.equal(capped.dropped, 500);
  assert.equal(capped.messages[0].id, 'm-00000');
  assert.equal(capped.messages[199].id, 'm-00199');
  assert.equal(capped.messages[200].id, 'm-00700', '中间 500 条被裁掉');
  assert.equal(capped.messages[1999].id, 'm-02499');
  // 未超上限不动
  assert.equal(capInMemory(synthetic(10)).trimmed, false);
});

test('UT-19 每会话预取 400（取窗口尾部）', () => {
  const events = Array.from({ length: 1000 }, (_, i) => ({ type: 'x', seq: i, time: i, data: {} }));
  const prefetched = selectPrefetch(events, 400);
  assert.equal(prefetched.length, 400);
  assert.equal(prefetched[0].seq, 600);
  assert.equal(prefetched[399].seq, 999);
});

test('游标：cursorAfterOpen 写 oldestKey/newestKey；buildPage 形状符合 §4.1', () => {
  const all = synthetic(10);
  const cursor = makeCursor('chan');
  cursorAfterOpen(cursor, all, { s: 7 });
  assert.equal(cursor.oldestKey, orderKey(all[0]));
  assert.equal(cursor.newestKey, orderKey(all[9]));
  assert.deepEqual(cursor.revisions, { s: 7 });
  const channel = { channelId: 'chan', lead: {}, members: [], runningCount: 0, readonly: false, generatedAt: 1 };
  const page = buildPage({ channel, messages: all, cursor, hasMore: true, truncated: false, now: 42 });
  assert.deepEqual(Object.keys(page).sort(), ['channel', 'cursor', 'hasMore', 'messages', 'serverTime', 'truncated'].sort());
  assert.equal(page.serverTime, 42);
  assert.equal(computeHasMore(all, false), true);
  assert.equal(computeHasMore([], false), false);
});
