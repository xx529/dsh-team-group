// @ts-check
/** B2：resolveLeadSession(Id)（F27/§4.8.2） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLeadSession, resolveLeadSessionId } from '../../src/core/roster.js';

const S = (id, parent) => ({ id, parentSessionId: parent });

test('3 跳链回溯 lead；root 自身直接返回', () => {
  const sessions = [S('lead'), S('t1', 'lead'), S('sub1', 't1'), S('sub2', 'sub1')];
  assert.equal(resolveLeadSessionId('sub2', sessions), 'lead');
  assert.equal(resolveLeadSessionId('t1', sessions), 'lead');
  assert.equal(resolveLeadSessionId('lead', sessions), 'lead');
  const r = resolveLeadSession('sub2', sessions);
  assert.deepEqual({ lead: r.leadSessionId, hops: r.hops, degraded: r.degraded }, { lead: 'lead', hops: 3, degraded: false });
});

test('≤4 跳上限：超长链在 4 跳处回退当前 id 并 degraded', () => {
  const sessions = [S('root'), S('a', 'root'), S('b', 'a'), S('c', 'b'), S('d', 'c'), S('e', 'd'), S('f', 'e')];
  const r = resolveLeadSession('f', sessions);
  assert.equal(r.hops, 4);
  assert.equal(r.leadSessionId, 'b', '沿 4 条 parent 边后仍有 parent → 回退当前 id');
  assert.equal(r.degraded, true);
});

test('防环：a↔b 不死循环', () => {
  const sessions = [S('a', 'b'), S('b', 'a')];
  const r = resolveLeadSession('a', sessions);
  assert.equal(r.cycle, true);
  assert.equal(r.degraded, true);
  assert.ok(['a', 'b'].includes(r.leadSessionId));
});

test('lookup 函数 / Map / sessions.list.byId 形状；缺失回退 startId', () => {
  const lookupFn = (id) => (id === 'x' ? { parentSessionId: 'root' } : undefined);
  assert.equal(resolveLeadSessionId('x', lookupFn), 'root');
  assert.equal(resolveLeadSessionId('missing', lookupFn), 'missing');

  const map = new Map([['x', { parentSession: 'root' }], ['root', {}]]);
  assert.equal(resolveLeadSessionId('x', map), 'root');

  const list = { byId: { x: { parentSessionId: 'root' }, root: {} } };
  assert.equal(resolveLeadSessionId('x', list), 'root');
  assert.equal(resolveLeadSessionId('root', list), 'root');

  // snapshot 形状：subagent.address.parentSessionId
  const snapshotFn = (id) => (id === 'child' ? { subagent: { address: { parentSessionId: 'lead' } } } : {});
  assert.equal(resolveLeadSessionId('child', snapshotFn), 'lead');
  assert.equal(resolveLeadSessionId('', lookupFn), '');
});
