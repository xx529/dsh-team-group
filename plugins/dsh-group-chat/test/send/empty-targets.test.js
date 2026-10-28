// @ts-check
/**
 * F-06 发送侧：空 targets 兜底 Lead / channel-missing 明确失败 / retry 空批次
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChannelBatch } from '../../src/send/send-batch.js';
import { planRetry, retryChannelBatch } from '../../src/send/retry.js';
import { failureInfo } from '../../src/send/errors.js';
import { IDS, makeSendDeps } from './helpers.js';

test('空 targets + channelId：合成 {name:"lead", sessionId:channelId} 并成功发送', async () => {
  const { deps, host } = makeSendDeps();
  const result = await sendChannelBatch({
    text: '单 agent 发送',
    targets: [],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-empty-targets',
    deps,
  });
  assert.equal(result.status, 'sent');
  assert.equal(host.calls.length, 1);
  assert.equal(host.calls[0].sessionId, IDS.LEAD, 'prompt 打到 channelId');
  assert.equal(result.deliveries.length, 1);
  assert.equal(result.deliveries[0].target, 'lead');
  assert.equal(result.deliveries[0].sessionId, IDS.LEAD);
  assert.equal(result.deliveries[0].ok, true);
  assert.equal(result.targetNames[0], 'lead');
  assert.equal(result.requestIds[IDS.LEAD] !== undefined, true, '仅 1 个目标时 requestIds 也可读');
  assert.deepEqual(result.diagnostics, []);
});

test('未传 targets（undefined）+ channelId：同样兜底 Lead', async () => {
  const { deps, host } = makeSendDeps();
  const result = await sendChannelBatch({
    text: '单 agent 发送',
    channelId: IDS.LEAD,
    clientBatchId: 'gc-undefined-targets',
    deps,
  });
  assert.equal(result.status, 'sent');
  assert.equal(host.calls.length, 1);
  assert.equal(host.calls[0].sessionId, IDS.LEAD);
});

test('空 targets + 空 channelId：明确失败 channel-missing（含 reason/messageKey/delivery）', async () => {
  const { deps, host } = makeSendDeps();
  const result = await sendChannelBatch({
    text: '无法确定会话',
    targets: [],
    channelId: '',
    clientBatchId: 'gc-channel-missing',
    deps,
  });
  assert.equal(host.calls.length, 0, '不得发起任何 prompt');
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'channel-missing');
  assert.equal(result.messageKey, 'send.error.channelMissing');
  assert.equal(result.retryable, false);
  assert.equal(result.deliveries.length, 1, '不得出现无信息的 deliveries=[]');
  assert.equal(result.deliveries[0].reason, 'channel-missing');
  assert.equal(result.deliveries[0].messageKey, 'send.error.channelMissing');
  assert.equal(failureInfo('channel-missing').retryable, false);
});

test('retry 空批次 + channelId：重试兜底 Lead 并成功', async () => {
  const previous = {
    status: 'failed',
    deliveries: [],
    clientBatchId: 'gc-retry-empty',
    channelId: IDS.LEAD,
    text: '重试一次',
    targets: [],
    targetNames: [],
    prefixParts: [],
    requestIds: {},
    mode: 'steer',
    attempt: 1,
    retryable: true,
  };
  const plan = planRetry(previous);
  assert.equal(plan.allowed, true);
  assert.deepEqual(plan.targets, [{ name: 'lead', sessionId: IDS.LEAD }]);

  const { deps, host } = makeSendDeps();
  // 模拟原批次已登记 attempts=1（真实链路里首次发送会写入 registry）
  deps.batchRegistry.set('gc-retry-empty', { attempts: 1, channelId: IDS.LEAD });
  const retried = await retryChannelBatch(previous, deps, { skipBackoff: true });
  assert.equal(host.calls.length, 1);
  assert.equal(host.calls[0].sessionId, IDS.LEAD);
  assert.equal(retried.status, 'sent');
  assert.equal(retried.attempt, 2);
  assert.equal(retried.deliveries.length, 1);
  assert.equal(retried.deliveries[0].ok, true);
});

test('retry 空批次 + 空 channelId：channel-missing（不发起 prompt）', async () => {
  const previous = {
    status: 'failed',
    deliveries: [],
    clientBatchId: 'gc-retry-no-channel',
    channelId: '',
    text: '重试一次',
    targets: [],
    targetNames: [],
    prefixParts: [],
    requestIds: {},
    mode: 'steer',
    attempt: 1,
    retryable: true,
  };
  const plan = planRetry(previous);
  assert.equal(plan.allowed, false);
  assert.equal(plan.reason, 'channel-missing');
  assert.equal(plan.messageKey, 'send.error.channelMissing');

  const { deps, host } = makeSendDeps();
  // 模拟原批次已登记 attempts=1（真实链路里首次发送会写入 registry）
  deps.batchRegistry.set('gc-retry-empty', { attempts: 1, channelId: IDS.LEAD });
  const retried = await retryChannelBatch(previous, deps, { skipBackoff: true });
  assert.equal(host.calls.length, 0);
  assert.equal(retried.retrySkipped, true);
  assert.equal(retried.retryPlan.reason, 'channel-missing');
});
