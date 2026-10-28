// @ts-check
/** M6：无 clientBatchId 的「前缀签名」归并只允许同批副本，两次同文群发不误合并 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeFanout } from '../../src/core/fanout.js';

const T = 1793158400000;
function copy(sessionId, time, { batchId, text = '同一段话' } = {}) {
  return {
    id: `u:${sessionId}:${time}`,
    kind: 'user',
    sessionId,
    sender: { sessionId, name: 'user', kind: 'user' },
    targets: ['lead', 'ux'],
    targetSessionIds: [sessionId],
    text,
    time,
    seq: 1,
    isFinal: false,
    ...(batchId ? { clientBatchId: batchId } : {}),
    meta: batchId ? {} : { fanout: true },
  };
}

test('同一批同发副本（2 会话、5s 内）→ 1 条', () => {
  const out = mergeFanout([copy('lead', T), copy('ux', T + 200)], { leadSessionId: 'lead' });
  assert.equal(out.messages.length, 1);
  assert.equal(out.messages[0].sessionId, 'lead');
  assert.equal(out.messages[0].delivery, 'sent');
});

test('两次同文群发（间隔 >5s）→ 2 条，不误合并', () => {
  const out = mergeFanout(
    [copy('lead', T), copy('ux', T + 200), copy('lead', T + 10_000), copy('ux', T + 10_200)],
    { leadSessionId: 'lead' },
  );
  assert.equal(out.messages.length, 2, '两次独立发送各 1 条');
  assert.deepEqual(out.messages.map((m) => m.sessionId).sort(), ['lead', 'lead']);
});

test('R-M6：只有非 lead 副本（lead 未到）→ 保留临时气泡，不合并', () => {
  const out = mergeFanout([copy('ux', T), copy('backend', T + 100)], { leadSessionId: 'lead' });
  assert.equal(out.messages.length, 2);
  assert.ok(out.messages.every((m) => m.meta.temporary === true));
});

test('R-M6：同一会话出现多份副本 → 不合并（每会话 ≤1 才归并）', () => {
  const out = mergeFanout([copy('lead', T), copy('ux', T + 100), copy('ux', T + 150)], { leadSessionId: 'lead' });
  assert.equal(out.messages.length, 3);
});

test('签名组只有同一会话副本 → 不合并（sessions.size<2）', () => {
  const out = mergeFanout([copy('lead', T), copy('lead', T + 100)], { leadSessionId: 'lead' });
  assert.equal(out.messages.length, 2);
});

test('带 clientBatchId 的不同批次永不互相合并', () => {
  const out = mergeFanout([copy('lead', T, { batchId: 'b1' }), copy('ux', T + 100, { batchId: 'b2' })], {
    leadSessionId: 'lead',
  });
  assert.equal(out.messages.length, 2);
});
