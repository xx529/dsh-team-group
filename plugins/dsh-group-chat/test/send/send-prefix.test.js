// @ts-check
/**
 * canonical 前缀快照一致性（SC27）：发送 parts 与 core/protocol 单点常量逐字节一致；
 * 单目标不注入（SC28）；重试沿用首次前缀（N 不退化）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChannelBatch } from '../../src/send/send-batch.js';
import { retryChannelBatch } from '../../src/send/retry.js';
import { buildParts, parseParts, protocolSnapshot } from '../../src/core/protocol.js';
import { createMockSessionHost, IDS, makeSendDeps, threeTargets } from './helpers.js';

test('多目标 parts[0]/[1]/[2] 与 core protocol 完全一致（全角「：」「、」，@lead 首位，N 实数）', async () => {
  const { deps, host } = makeSendDeps();
  const body = '@backend 接口清单我看了，发送通路按 host 路由来。';
  const result = await sendChannelBatch({
    text: body,
    targets: threeTargets(),
    channelId: IDS.LEAD,
    clientBatchId: 'gc-prefix',
    deps,
  });
  const expected = buildParts(['lead', 'ux', 'backend'], body);
  assert.deepEqual(result.prefixParts, expected);
  const snapshot = protocolSnapshot();
  assert.equal(result.prefixParts[0], snapshot.head);
  assert.equal(result.prefixParts[1], snapshot.explain);
  assert.equal(result.prefixParts[2], body);
  for (const call of host.calls) {
    assert.deepEqual(call.parts.map((p) => p.text), expected);
  }
  // 接收侧可按 content[0]/[1] 精确解析，正文剥除后 = 原文
  const parsed = parseParts(host.calls[0].parts.map((p) => p.text));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.targets, ['lead', 'ux', 'backend']);
  assert.equal(parsed.text, body);
});

test('单目标不注入前缀（SC28），content[0] 即用户正文', async () => {
  const { deps, host } = makeSendDeps();
  const body = '只发给 Lead';
  const result = await sendChannelBatch({
    text: body,
    targets: [{ name: 'lead', sessionId: IDS.LEAD }],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-prefix-single',
    deps,
  });
  assert.deepEqual(result.prefixParts, [body]);
  assert.deepEqual(host.calls[0].parts, [{ type: 'text', text: body }]);
});

test('重试沿用首次前缀（targetNames 全 3 位，N 不退化），且逐字节不变', async () => {
  const host = createMockSessionHost({ responses: { [IDS.BACKEND]: 'error' } });
  const { deps } = makeSendDeps({ host });
  const body = '三目标同发，backend 失败后重试';
  const first = await sendChannelBatch({
    text: body,
    targets: threeTargets(),
    channelId: IDS.LEAD,
    clientBatchId: 'gc-prefix-retry',
    deps,
  });
  assert.equal(first.status, 'partial');
  assert.equal(first.prefixParts.length, 3);

  // 只重试失败目标（T2 实际行为：targets 子集）
  host.calls.length = 0;
  host.sessions.binding(IDS.BACKEND); // noop
  const retryHost = createMockSessionHost({ defaultBehavior: 'ok' });
  const retry = await retryChannelBatch(first, { ...deps, ctx: retryHost }, { skipBackoff: true });
  assert.ok(retry.retryPlan);
  assert.equal(retry.retryPlan.targets.length, 1);
  assert.equal(retryHost.calls.length, 1);
  assert.equal(retryHost.calls[0].sessionId, IDS.BACKEND);
  assert.deepEqual(retryHost.calls[0].parts.map((p) => p.text), first.prefixParts, '重试 parts 与首次一致（含 N=3 说明行）');
  assert.equal(retry.status, 'sent');
});
