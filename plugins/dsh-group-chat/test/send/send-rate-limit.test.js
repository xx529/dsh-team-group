// @ts-check
/**
 * 单飞与限流：lead 先、串行、相邻 prompt ≥200ms；同频道并发 busy；陈旧锁可接管
 * 契约：架构 §5.4 + Spike S3
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChannelBatch } from '../../src/send/send-batch.js';
import { createSingleFlight } from '../../src/send/rate-limit.js';
import { IDS, makeSendDeps, threeTargets, createMockSessionHost } from './helpers.js';

test('限流：同批 3 目标相邻 prompt 至少 200ms（伪时钟记录 sleep）', async () => {
  const { deps, sleeps, host } = makeSendDeps({ overrides: { minIntervalMs: 200 } });
  const result = await sendChannelBatch({
    text: 'hi',
    targets: threeTargets(),
    channelId: IDS.LEAD,
    clientBatchId: 'gc-rate',
    deps,
  });
  assert.equal(result.status, 'sent');
  assert.deepEqual(sleeps, [200, 200], '第 1 个 prompt 不等待，其后每个间隔 200ms');
  assert.deepEqual(host.calls.map((c) => c.sessionId), [IDS.LEAD, IDS.UX, IDS.BACKEND], 'lead 先、串行顺序');
  assert.equal(host.maxActive, 1, '不存在并行 prompt');
});

test('单飞：同频道不同批次并发 → 后者 busy；不同频道互不阻塞', async () => {
  /** @type {() => void} */
  let release = () => {};
  const gate = new Promise((resolve) => {
    release = /** @type {any} */ (resolve);
  });
  const host = createMockSessionHost({ onPrompt: () => gate });
  const { deps } = makeSendDeps({ host });
  const first = sendChannelBatch({
    text: 'first',
    targets: [{ name: 'lead', sessionId: IDS.LEAD }],
    channelId: 'channel-a',
    clientBatchId: 'gc-sf-1',
    deps,
  });
  await new Promise((resolve) => setTimeout(resolve, 5));

  const second = await sendChannelBatch({
    text: 'second',
    targets: [{ name: 'lead', sessionId: IDS.LEAD }],
    channelId: 'channel-a',
    clientBatchId: 'gc-sf-2',
    deps,
  });
  assert.equal(second.status, 'failed');
  assert.equal(second.reason, 'busy');

  release();
  const firstResult = await first;
  assert.equal(firstResult.status, 'sent');
});

test('单飞：同一 batchId 并发返回 busy + same-batch-in-flight', async () => {
  /** @type {() => void} */
  let release = () => {};
  const gate = new Promise((resolve) => {
    release = /** @type {any} */ (resolve);
  });
  const host = createMockSessionHost({ onPrompt: () => gate });
  const singleFlight = createSingleFlight();
  const { deps } = makeSendDeps({ host, overrides: { singleFlight } });
  const payload = { text: 'hi', targets: [{ name: 'lead', sessionId: IDS.LEAD }], channelId: IDS.LEAD, clientBatchId: 'gc-same', deps };
  const first = sendChannelBatch(payload);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = await sendChannelBatch(payload);
  assert.equal(second.status, 'failed');
  assert.equal(second.reason, 'busy');
  assert.ok(second.warnings.includes('same-batch-in-flight'));
  release();
  assert.equal((await first).status, 'sent');
});

test('单飞锁：陈旧超时后可被新批次接管；释放只影响自己的锁', () => {
  let now = 1000;
  const sf = createSingleFlight({ now: () => now, staleMs: 100 });
  assert.deepEqual(sf.tryAcquire('c', 'b1'), { ok: true });
  assert.equal(sf.tryAcquire('c', 'b2').ok, false);
  now += 50;
  assert.equal(sf.tryAcquire('c', 'b2').ok, false, '未过期仍是 busy');
  now += 200;
  assert.deepEqual(sf.tryAcquire('c', 'b2'), { ok: true }, '过期后新批次可接管');
  sf.release('c', 'b1');
  assert.equal(sf.get('c').id, 'b2', '旧批次释放不能清掉新锁');
  sf.release('c', 'b2');
  assert.equal(sf.get('c'), undefined);
});

test('限流异常不影响串行语义：一个失败后继续尝试后续目标', async () => {
  const host = createMockSessionHost({ responses: { [IDS.UX]: 'error' } });
  const { deps, host: h } = makeSendDeps({ host, overrides: { minIntervalMs: 10 } });
  const result = await sendChannelBatch({
    text: 'hi',
    targets: threeTargets(),
    channelId: IDS.LEAD,
    clientBatchId: 'gc-rate-fail',
    deps,
  });
  assert.equal(result.status, 'partial');
  assert.deepEqual(h.calls.map((c) => c.sessionId), [IDS.LEAD, IDS.UX, IDS.BACKEND]);
});
