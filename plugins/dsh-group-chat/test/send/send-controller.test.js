// @ts-check
/**
 * createSendController：单飞、重试、状态查询、dispose
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSendController } from '../../src/send/send-controller.js';
import { createMockSessionHost, IDS, makeSendDeps, threeTargets } from './helpers.js';

test('controller.send：正常发送并记住上一批结果', async () => {
  const { deps } = makeSendDeps();
  const controller = createSendController(deps);
  const result = await controller.send({
    text: 'hi',
    targets: threeTargets(),
    channelId: IDS.LEAD,
    clientBatchId: 'gc-ctl-1',
  });
  assert.equal(result.status, 'sent');
  assert.equal(controller.isSending(), false);
  assert.equal(controller.getLastResult().clientBatchId, 'gc-ctl-1');
});

test('controller：并发发送返回 busy，不产生第二个批次', async () => {
  /** @type {() => void} */
  let release = () => {};
  const gate = new Promise((resolve) => {
    release = /** @type {any} */ (resolve);
  });
  const host = createMockSessionHost({ onPrompt: () => gate });
  const { deps } = makeSendDeps({ host });
  const controller = createSendController(deps);
  const first = controller.send({ text: 'first', targets: [{ name: 'lead', sessionId: IDS.LEAD }], channelId: IDS.LEAD, clientBatchId: 'gc-ctl-a' });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(controller.isSending(), true);
  const second = await controller.send({ text: 'second', targets: [{ name: 'lead', sessionId: IDS.LEAD }], channelId: IDS.LEAD, clientBatchId: 'gc-ctl-b' });
  assert.equal(second.status, 'failed');
  assert.equal(second.reason, 'busy');
  release();
  assert.equal((await first).status, 'sent');
});

test('controller.retry：只补失败目标、复用 requestId，最终 sent', async () => {
  const host = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const { deps } = makeSendDeps({ host });
  const controller = createSendController(deps);
  const first = await controller.send({ text: 'hi', targets: threeTargets(), channelId: IDS.LEAD, clientBatchId: 'gc-ctl-retry' });
  assert.equal(first.status, 'partial');
  const backendRequestId = first.deliveries.find((d) => d.target === 'backend').requestId;

  host.setResponse(IDS.BACKEND, 'ok');
  host.calls.length = 0;
  const retried = await controller.retry({ skipBackoff: true });
  assert.equal(retried.status, 'sent');
  assert.equal(host.calls.length, 1, '只重试 backend');
  assert.equal(host.calls[0].sessionId, IDS.BACKEND);
  assert.equal(host.calls[0].requestId, backendRequestId);
  assert.equal(controller.getLastResult().status, 'sent');
  assert.equal(controller.isSending(), false);
});

test('controller.dispose 后拒绝发送（readonly）', async () => {
  const { deps } = makeSendDeps();
  const controller = createSendController(deps);
  controller.dispose();
  const result = await controller.send({ text: 'hi', targets: [{ name: 'lead', sessionId: IDS.LEAD }], channelId: IDS.LEAD });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'readonly');
  assert.equal(controller.isSending(), false);
});
