// @ts-check
/**
 * 部分失败重试：只补失败目标、复用 requestId、成功目标不重发、≤2 次、结果合并
 * 契约：架构 §5.3 第 7 步 / §5.4 / SC30
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChannelBatch } from '../../src/send/send-batch.js';
import { planRetry, retryChannelBatch } from '../../src/send/retry.js';
import { createMockSessionHost, IDS, makeSendDeps, threeTargets } from './helpers.js';

test('部分失败 → 只重试失败项；成功目标不重发；requestId 复用；最终 sent', async () => {
  const host = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const { deps } = makeSendDeps({ host });
  const first = await sendChannelBatch({ text: 'hi', targets: threeTargets(), channelId: IDS.LEAD, clientBatchId: 'gc-retry-1', deps });
  assert.equal(first.status, 'partial');
  assert.equal(host.calls.length, 3);
  const backendRequestId = first.deliveries.find((d) => d.target === 'backend').requestId;
  const leadRequestId = first.deliveries.find((d) => d.target === 'lead').requestId;

  // 恢复 backend
  const retryHost = createMockSessionHost({ defaultBehavior: 'ok' });
  const retry = await retryChannelBatch(first, { ...deps, ctx: retryHost }, { skipBackoff: true });
  assert.equal(retry.status, 'sent');
  assert.equal(retryHost.calls.length, 1, '只补失败目标');
  assert.equal(retryHost.calls[0].sessionId, IDS.BACKEND);
  assert.equal(retryHost.calls[0].requestId, backendRequestId, '复用原 requestId（Host rpcId 幂等）');
  assert.notEqual(retryHost.calls[0].requestId, leadRequestId);
  assert.equal(retry.attempt, 2);
  const byTarget = Object.fromEntries(retry.deliveries.map((d) => [d.target, d]));
  assert.equal(byTarget.lead.ok, true);
  assert.equal(byTarget.ux.ok, true);
  assert.equal(byTarget.backend.ok, true);
});

test('重试上限 2 次：第三次重试返回 retry-exhausted（不发起 prompt）', async () => {
  const host = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const { deps } = makeSendDeps({ host });
  const first = await sendChannelBatch({ text: 'hi', targets: threeTargets(), channelId: IDS.LEAD, clientBatchId: 'gc-retry-limit', deps });
  assert.equal(first.attempt, 1);

  const host2 = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const second = await retryChannelBatch(first, { ...deps, ctx: host2 }, { skipBackoff: true });
  assert.equal(second.attempt, 2);
  assert.equal(second.status, 'partial');

  const host3 = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const third = await retryChannelBatch(second, { ...deps, ctx: host3 }, { skipBackoff: true });
  assert.equal(third.attempt, 3);
  assert.equal(third.status, 'partial');

  const host4 = createMockSessionHost({ defaultBehavior: 'ok' });
  const fourth = await retryChannelBatch(third, { ...deps, ctx: host4 }, { skipBackoff: true });
  assert.equal(fourth.retrySkipped, true);
  assert.equal(fourth.retryPlan.reason, 'retry-exhausted');
  assert.equal(host4.calls.length, 0, '超限后不再发请求');
});

test('planRetry：不可重试目标不纳入补发；无失败 → no-retryable-target', () => {
  const base = {
    clientBatchId: 'b1',
    attempt: 1,
    deliveries: [
      { target: 'lead', sessionId: 'L', ok: true },
      { target: 'ghost', sessionId: 'G', ok: false, reason: 'unaddressable', retryable: false },
      { target: 'backend', sessionId: 'B', ok: false, reason: 'network', retryable: true },
    ],
    requestIds: { L: 'r1', B: 'r2' },
  };
  const plan = planRetry(base);
  assert.equal(plan.allowed, true);
  assert.deepEqual(plan.targets, [{ name: 'backend', sessionId: 'B' }]);
  assert.deepEqual(plan.skipped, ['ghost']);
  assert.equal(plan.nextAttempt, 2);

  const clean = planRetry({ ...base, deliveries: [{ target: 'lead', sessionId: 'L', ok: true }] });
  assert.equal(clean.allowed, false);
  assert.equal(clean.reason, 'no-retryable-target');
});

test('重试结果合并：成功目标保留、失败目标被新结果覆盖、聚合四态正确', async () => {
  const host = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const { deps } = makeSendDeps({ host });
  const first = await sendChannelBatch({ text: 'hi', targets: threeTargets(), channelId: IDS.LEAD, clientBatchId: 'gc-retry-merge', deps });
  const retryHost = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const second = await retryChannelBatch(first, { ...deps, ctx: retryHost }, { skipBackoff: true });
  assert.equal(second.status, 'partial');
  const retryPlanButAllFail = second.deliveries.filter((d) => !d.ok);
  assert.equal(retryPlanButAllFail.length, 1);

  const okHost = createMockSessionHost({ defaultBehavior: 'ok' });
  const third = await retryChannelBatch(second, { ...deps, ctx: okHost }, { skipBackoff: true });
  assert.equal(third.status, 'sent');
  assert.equal(third.deliveries.every((d) => d.ok), true);
  assert.equal(third.deliveries.length, 3);
});

test('退避：第 1/2 次重试分别等待 300/900ms（注入 sleep 记录）', async () => {
  const host = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const { deps, sleeps } = makeSendDeps({ host });
  const first = await sendChannelBatch({ text: 'hi', targets: threeTargets(), channelId: IDS.LEAD, clientBatchId: 'gc-retry-backoff', deps });
  const retryHost = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const second = await retryChannelBatch(first, { ...deps, ctx: retryHost });
  assert.deepEqual(sleeps, [300]);
  const retryHost2 = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const third = await retryChannelBatch(second, { ...deps, ctx: retryHost2 });
  assert.deepEqual(sleeps, [300, 900]);
  assert.equal(third.attempt, 3);
});
