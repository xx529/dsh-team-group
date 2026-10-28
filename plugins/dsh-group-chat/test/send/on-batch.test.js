// @ts-check
/**
 * F-07 发送侧：prompt 前回调 onBatch（UI 用它注册 localBatches，替换本地 echo）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChannelBatch } from '../../src/send/send-batch.js';
import { retryChannelBatch } from '../../src/send/retry.js';
import { createMockSessionHost, IDS, makeSendDeps } from './helpers.js';

const LEAD = IDS.LEAD;
const UX = IDS.UX;

test('onBatch 在 prompt 前调用一次，参数含 clientBatchId/requestIds/targets/sessionIds', async () => {
  const order = [];
  const host = createMockSessionHost({
    onPrompt: () => {
      order.push('prompt');
      return 'ok';
    },
  });
  const { deps } = makeSendDeps({ host });
  /** @type {any[]} */
  const batches = [];
  deps.onBatch = (batch) => {
    order.push('batch');
    batches.push(batch);
  };

  const result = await sendChannelBatch({
    text: 'hi',
    targets: [
      { name: 'lead', sessionId: LEAD },
      { name: 'ux', sessionId: UX },
    ],
    channelId: LEAD,
    clientBatchId: 'gc-onbatch-1',
    deps,
  });

  assert.equal(result.status, 'sent');
  assert.equal(batches.length, 1, '同一批只回调一次');
  assert.equal(order[0], 'batch', 'onBatch 必须早于第一个 prompt');
  assert.equal(order.filter((x) => x === 'batch').length, 1);

  const batch = batches[0];
  assert.equal(batch.clientBatchId, 'gc-onbatch-1');
  assert.equal(batch.text, 'hi');
  assert.equal(typeof batch.textHash, 'string');
  assert.equal(batch.textHash.length, 16);
  assert.equal(typeof batch.at, 'number');
  assert.equal(batch.channelId, LEAD);
  assert.equal(batch.attempt, 1);
  assert.deepEqual(batch.targetNames, ['lead', 'ux']);
  assert.deepEqual(batch.targets.map((t) => ({ name: t.name, sessionId: t.sessionId })), [
    { name: 'lead', sessionId: LEAD },
    { name: 'ux', sessionId: UX },
  ]);
  assert.deepEqual(batch.sessionIds, [LEAD, UX]);
  assert.deepEqual(Object.keys(batch.requestIds).sort(), [LEAD, UX].sort());
  assert.equal(typeof batch.requestIds[LEAD], 'string');
  assert.equal(typeof batch.requestIds[UX], 'string');
  assert.notEqual(batch.requestIds[LEAD], batch.requestIds[UX]);
});

test('retry：再次回调一次，复用同 clientBatchId 与失败目标 requestId，targets 只含失败目标', async () => {
  const host = createMockSessionHost({ responses: { [UX]: 'error' } });
  const { deps } = makeSendDeps({ host });
  /** @type {any[]} */
  const batches = [];
  deps.onBatch = (batch) => batches.push(batch);

  const first = await sendChannelBatch({
    text: 'hi',
    targets: [
      { name: 'lead', sessionId: LEAD },
      { name: 'ux', sessionId: UX },
    ],
    channelId: LEAD,
    clientBatchId: 'gc-onbatch-retry',
    deps,
  });
  assert.equal(first.status, 'partial');
  assert.equal(batches.length, 1);

  host.setResponse(UX, 'ok');
  host.calls.length = 0;
  const retried = await retryChannelBatch(first, deps, { skipBackoff: true });
  assert.equal(retried.status, 'sent');
  assert.equal(batches.length, 2, 'retry 也要回调一次');
  const retryBatch = batches[1];
  assert.equal(retryBatch.clientBatchId, 'gc-onbatch-retry', '复用同一 clientBatchId');
  assert.equal(retryBatch.attempt, 2);
  assert.deepEqual(retryBatch.sessionIds, [UX], '本次实发子集');
  assert.deepEqual(retryBatch.targets.map((t) => t.name), ['ux']);
  assert.equal(retryBatch.requestIds[UX], batches[0].requestIds[UX], 'requestId 必须复用');
  assert.deepEqual(retryBatch.targetNames, ['lead', 'ux'], '前缀用的原始 targetNames 不退化');
  assert.equal(host.calls.length, 1);
  assert.equal(host.calls[0].sessionId, UX);
});

test('onBatch 回调抛错：不影响发送、warnings 可观测、onBatchError 被调用', async () => {
  const { deps, host } = makeSendDeps();
  let calls = 0;
  const reported = [];
  deps.onBatchError = (error) => reported.push(error);
  deps.onBatch = () => {
    calls += 1;
    throw new Error('ui onBatch boom');
  };
  const result = await sendChannelBatch({
    text: 'hi',
    targets: [{ name: 'lead', sessionId: LEAD }],
    channelId: LEAD,
    clientBatchId: 'gc-onbatch-throw',
    deps,
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 'sent');
  assert.equal(host.calls.length, 1);
  assert.deepEqual(result.diagnostics, []);
  assert.ok(result.warnings.includes('onBatch-callback-failed'), 'M4：回调异常必须可观测');
  assert.equal(reported.length, 1);
  assert.equal(reported[0].message, 'ui onBatch boom');
});

test('M4：批次终态后 localBatches 条目 closed=true（同一对象引用）', async () => {
  const { deps, host } = makeSendDeps();
  /** @type {Record<string, any>} */
  const localBatches = {};
  deps.localBatches = localBatches;
  deps.onBatch = (batch) => {
    localBatches[batch.clientBatchId] = batch;
  };
  const result = await sendChannelBatch({
    text: 'hi',
    targets: [{ name: 'lead', sessionId: LEAD }],
    channelId: LEAD,
    clientBatchId: 'gc-local-closed',
    deps,
  });
  assert.equal(result.status, 'sent');
  assert.equal(host.calls.length, 1);
  const entry = localBatches['gc-local-closed'];
  assert.ok(entry, 'onBatch 已写入');
  assert.equal(entry.closed, true);
  assert.equal(entry.status, 'sent');
  assert.equal(typeof entry.closedAt, 'number');
});

test('M4：外层异常（onBatch 已写入后失败）也会把 localBatches 标记 closed/failed', async () => {
  const { deps } = makeSendDeps();
  /** @type {Record<string, any>} */
  const localBatches = {};
  deps.localBatches = localBatches;
  deps.onBatch = (batch) => {
    localBatches[batch.clientBatchId] = batch;
  };
  deps.onEcho = () => {
    throw new Error('echo boom after onBatch');
  };
  const result = await sendChannelBatch({
    text: 'hi',
    targets: [{ name: 'lead', sessionId: LEAD }],
    channelId: LEAD,
    clientBatchId: 'gc-local-failed',
    deps,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.diagnostics[0].stage, 'echo');
  assert.equal(localBatches['gc-local-failed'].closed, true);
  assert.equal(localBatches['gc-local-failed'].status, 'failed');
});

test('retry 时 onBatch 抛错：重试仍成功 sent', async () => {
  const host = createMockSessionHost({ responses: { [UX]: 'error' } });
  const { deps } = makeSendDeps({ host });
  deps.onBatch = () => {
    throw new Error('ui boom on retry');
  };
  const first = await sendChannelBatch({
    text: 'hi',
    targets: [
      { name: 'lead', sessionId: LEAD },
      { name: 'ux', sessionId: UX },
    ],
    channelId: LEAD,
    clientBatchId: 'gc-onbatch-retry-throw',
    deps,
  });
  assert.equal(first.status, 'partial');
  host.setResponse(UX, 'ok');
  const retried = await retryChannelBatch(first, deps, { skipBackoff: true });
  assert.equal(retried.status, 'sent');
});
