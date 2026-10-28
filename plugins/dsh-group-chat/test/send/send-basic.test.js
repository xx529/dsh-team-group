// @ts-check
/**
 * 发送基础：单目标 / 多目标 / 目标归一化 / 顺序 / echo / mode
 * 契约：架构 §5.1–§5.3、§4.4
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChannelBatch } from '../../src/send/send-batch.js';
import { IDS, makeSendDeps, threeTargets } from './helpers.js';

test('单目标（默认 Lead）：不注入前缀，parts 只有正文，mode=steer', async () => {
  const { deps, host } = makeSendDeps();
  const result = await sendChannelBatch({
    text: '同步进度',
    targets: [{ name: 'lead', sessionId: IDS.LEAD }],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-single',
    deps,
  });
  assert.equal(result.status, 'sent');
  assert.equal(result.deliveries.length, 1);
  assert.deepEqual(result.deliveries[0], {
    target: 'lead',
    sessionId: IDS.LEAD,
    ok: true,
    requestId: result.deliveries[0].requestId,
    attempt: 1,
  });
  assert.equal(result.prefixParts.length, 1);
  assert.deepEqual(result.prefixParts, ['同步进度']);
  assert.equal(host.calls.length, 1);
  assert.deepEqual(host.calls[0].parts, [{ type: 'text', text: '同步进度' }]);
  assert.equal(host.calls[0].mode, 'steer');
  assert.ok(host.calls[0].requestId);
  assert.equal(result.targetNames.length, 1);
});

test('多目标：lead 先、串行、canonical 前缀逐目标一致；群聊仍只 1 个 clientBatchId', async () => {
  const { deps, host } = makeSendDeps();
  const result = await sendChannelBatch({
    text: '接口清单确认了',
    targets: threeTargets(),
    channelId: IDS.LEAD,
    clientBatchId: 'gc-multi',
    deps,
  });
  assert.equal(result.status, 'sent');
  assert.equal(host.calls.length, 3);
  assert.deepEqual(host.calls.map((c) => c.sessionId), [IDS.LEAD, IDS.UX, IDS.BACKEND]);
  assert.equal(host.calls[0].parts.length, 3);
  for (const call of host.calls) {
    assert.deepEqual(call.parts, host.calls[0].parts, '每个目标收到完全相同的 parts');
    assert.equal(call.mode, 'steer');
  }
  assert.equal(host.calls[0].parts[2].text, '接口清单确认了');
  assert.equal(new Set(host.calls.map((c) => c.requestId)).size, 3, '每目标独立 requestId');
  assert.equal(result.clientBatchId, 'gc-multi');
  assert.equal(result.targetNames.length, 3);
  assert.equal(result.echo.clientBatchId, 'gc-multi');
  assert.equal(result.echo.delivery, 'sent');
  assert.equal(Object.keys(result.echo.deliveries).length, 3);
});

test('目标归一化：兼容字符串/对象；缺失 sessionId 用成员目录补齐；lead 排首位', async () => {
  const { deps, host } = makeSendDeps();
  const withMembers = { ...deps, members: makeSendDeps().defaultMembers };
  const result = await sendChannelBatch({
    text: 'hi',
    targets: ['ux', { name: 'lead' }, 'backend'],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-string-targets',
    deps: withMembers,
  });
  assert.equal(result.status, 'sent');
  assert.deepEqual(result.targets.map((t) => t.name), ['lead', 'ux', 'backend']);
  assert.deepEqual(host.calls.map((c) => c.sessionId), [IDS.LEAD, IDS.UX, IDS.BACKEND]);
});

test('未传 targets 时：由 mentions + 成员目录解析；无 @ → lead', async () => {
  const { deps, host } = makeSendDeps();
  const withMembers = { ...deps, members: makeSendDeps().defaultMembers };
  const r1 = await sendChannelBatch({ text: 'hi', channelId: IDS.LEAD, clientBatchId: 'gc-none-1', deps: withMembers });
  assert.deepEqual(r1.targetNames, ['lead']);
  assert.equal(host.calls.length, 1);

  const r2 = await sendChannelBatch({
    text: 'hi all',
    mentions: ['ux', 'backend'],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-none-2',
    deps: withMembers,
  });
  assert.deepEqual(r2.targetNames, ['lead', 'ux', 'backend']);
  assert.equal(r2.status, 'sent');
});

test('onEcho / onDelivery 回调：echo 初始 sending，逐目标 sending→sent', async () => {
  const { deps } = makeSendDeps();
  /** @type {any[]} */
  const echoes = [];
  /** @type {any[]} */
  const events = [];
  const result = await sendChannelBatch({
    text: 'hi',
    targets: threeTargets(),
    channelId: IDS.LEAD,
    clientBatchId: 'gc-callbacks',
    deps: { ...deps, onEcho: (echo) => echoes.push(echo), onDelivery: (event) => events.push(event) },
  });
  assert.equal(echoes.length, 1);
  assert.equal(echoes[0].id, 'local:gc-callbacks');
  assert.equal(echoes[0].delivery, 'sending');
  assert.deepEqual(echoes[0].targets, ['lead', 'ux', 'backend']);
  assert.deepEqual(
    events.map((e) => `${e.target}:${e.state}`),
    ['lead:sending', 'lead:sent', 'ux:sending', 'ux:sent', 'backend:sending', 'backend:sent'],
  );
  assert.equal(result.status, 'sent');
});

test('空文本快速失败，不产生 prompt 调用', async () => {
  const { deps, host } = makeSendDeps();
  const result = await sendChannelBatch({
    text: '   ',
    targets: [{ name: 'lead', sessionId: IDS.LEAD }],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-empty',
    deps,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'empty-text');
  assert.equal(host.calls.length, 0);
});
