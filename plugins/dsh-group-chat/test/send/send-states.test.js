// @ts-check
/**
 * 六类发送状态与四态聚合：sent / partial / failed / sending / timeout / parent-unavailable / busy / readonly
 * 契约：架构 §5.3、V1.1-2、S3
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChannelBatch, deliveryStatesOf } from '../../src/send/send-batch.js';
import { createMockSessionHost, IDS, makeSendDeps, threeTargets } from './helpers.js';

test('状态 1：全部成功 → sent（3 条 deliveries 全 ok）', async () => {
  const { deps } = makeSendDeps();
  const result = await sendChannelBatch({ text: 'hi', targets: threeTargets(), channelId: IDS.LEAD, clientBatchId: 'gc-s1', deps });
  assert.equal(result.status, 'sent');
  assert.equal(result.deliveries.filter((d) => d.ok).length, 3);
  assert.deepEqual(Object.values(deliveryStatesOf(result)), ['sent', 'sent', 'sent']);
});

test('状态 2：部分失败 → partial；失败项带 reason/messageKey/retryable', async () => {
  const host = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const { deps } = makeSendDeps({ host });
  const result = await sendChannelBatch({ text: 'hi', targets: threeTargets(), channelId: IDS.LEAD, clientBatchId: 'gc-s2', deps });
  assert.equal(result.status, 'partial');
  const failed = result.deliveries.filter((d) => !d.ok);
  assert.equal(failed.length, 1);
  assert.equal(failed[0].target, 'backend');
  assert.equal(failed[0].reason, 'network');
  assert.equal(failed[0].retryable, true);
  assert.equal(failed[0].messageKey, 'send.error.network');
  assert.equal(result.reason, 'network');
  assert.equal(result.retryable, true);
});

test('状态 3：全部失败 → failed', async () => {
  const host = createMockSessionHost({ defaultBehavior: 'error' });
  const { deps } = makeSendDeps({ host });
  const result = await sendChannelBatch({ text: 'hi', targets: threeTargets(), channelId: IDS.LEAD, clientBatchId: 'gc-s3', deps });
  assert.equal(result.status, 'failed');
  assert.equal(result.deliveries.filter((d) => !d.ok).length, 3);
  assert.ok(result.deliveries.every((d) => d.reason === 'network'));
});

test('状态 4：sending 可见（onEcho 初始 sending + onDelivery 有 sending 事件）', async () => {
  const { deps } = makeSendDeps();
  /** @type {string[]} */
  const states = [];
  const result = await sendChannelBatch({
    text: 'hi',
    targets: threeTargets(),
    channelId: IDS.LEAD,
    clientBatchId: 'gc-s4',
    deps: { ...deps, onDelivery: (e) => states.push(e.state) },
  });
  assert.ok(states.includes('sending'));
  assert.equal(states.filter((s) => s === 'sending').length, 3);
  assert.equal(states.filter((s) => s === 'sent').length, 3);
  assert.equal(result.status, 'sent');
});

test('状态 5：超时 → timeout（retryable）+ 不抛错', async () => {
  const host = createMockSessionHost({ defaultBehavior: 'never' });
  const { deps } = makeSendDeps({ host, overrides: { timeoutMs: 20 } });
  const result = await sendChannelBatch({
    text: 'hi',
    targets: [{ name: 'lead', sessionId: IDS.LEAD }],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-s5',
    deps,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.deliveries[0].reason, 'timeout');
  assert.equal(result.deliveries[0].retryable, true);
  assert.equal(result.deliveries[0].messageKey, 'send.error.timeout');
});

test('状态 6：父 Agent 不可用 → parent-unavailable（可重试，S3）', async () => {
  const host = createMockSessionHost({
    responses: { [IDS.UX]: { code: 'subagent/parent-unavailable', message: 'parent agent is not live' } },
  });
  const { deps } = makeSendDeps({ host });
  const result = await sendChannelBatch({
    text: 'hi',
    targets: [threeTargets()[0], threeTargets()[1]],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-s6',
    deps,
  });
  assert.equal(result.status, 'partial');
  const failed = result.deliveries.find((d) => !d.ok);
  assert.equal(failed.reason, 'parent-unavailable');
  assert.equal(failed.retryable, true);
});

test('并发单飞：同频道第二批立即 busy（不排队、不产生 prompt）', async () => {
  /** @type {(value?: any) => void} */
  let release;
  const started = new Promise((resolve) => {
    release = resolve;
  });
  const host = createMockSessionHost({
    onPrompt: (call) => (call.sessionId === IDS.LEAD ? started : 'ok'),
  });
  void release;
  const { deps } = makeSendDeps({ host });
  const first = sendChannelBatch({ text: 'first', targets: threeTargets(), channelId: IDS.LEAD, clientBatchId: 'gc-first', deps });
  // 等第一个 prompt 进入
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = await sendChannelBatch({ text: 'second', targets: threeTargets(), channelId: IDS.LEAD, clientBatchId: 'gc-second', deps });
  assert.equal(second.status, 'failed');
  assert.equal(second.reason, 'busy');
  assert.ok(second.warnings.includes('channel-busy'));
  release();
  const firstResult = await first;
  assert.equal(firstResult.status, 'sent');
});

test('只读：全部失败 readonly，不发起任何 prompt', async () => {
  const { deps, host } = makeSendDeps();
  const result = await sendChannelBatch({
    text: 'hi',
    targets: threeTargets(),
    channelId: IDS.LEAD,
    clientBatchId: 'gc-readonly',
    deps: { ...deps, readonly: true },
  });
  assert.equal(result.status, 'failed');
  assert.equal(host.calls.length, 0);
  assert.ok(result.deliveries.every((d) => d.reason === 'readonly'));
  assert.ok(result.deliveries.every((d) => d.retryable === false));
});

test('不可寻址目标：跳过发送但保留失败交付项（partial）', async () => {
  const { deps, host } = makeSendDeps();
  const result = await sendChannelBatch({
    text: 'hi',
    targets: [
      { name: 'lead', sessionId: IDS.LEAD },
      { name: 'ghost', sessionId: 'S_GHOST', addressable: false },
    ],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-unaddressable',
    deps,
  });
  assert.equal(result.status, 'partial');
  assert.equal(host.calls.length, 1, '只向 lead 发送');
  const ghost = result.deliveries.find((d) => d.target === 'ghost');
  assert.equal(ghost.reason, 'unaddressable');
  assert.equal(ghost.retryable, false);
});
