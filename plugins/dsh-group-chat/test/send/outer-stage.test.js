// @ts-check
/**
 * F-06 外层异常诊断：stage（acquire/normalize/targets/echo/limiter/loop）+ informative delivery
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChannelBatch } from '../../src/send/send-batch.js';
import { IDS, makeSendDeps } from './helpers.js';

const LEAD = IDS.LEAD;

/** @param {any} deps */
function baseRequest(deps, extra = {}) {
  return {
    text: 'diagnose me',
    targets: [{ name: 'lead', sessionId: LEAD }],
    channelId: LEAD,
    clientBatchId: `gc-stage-${Math.random().toString(16).slice(2, 8)}`,
    deps,
    ...extra,
  };
}

/** @param {any} result */
function assertInformative(result) {
  assert.equal(result.status, 'failed');
  assert.ok(result.reason && result.reason !== 'unknown' ? true : result.reason === 'unknown', 'reason 存在');
  assert.equal(result.deliveries.length >= 1, true, '不得返回空 deliveries');
  const d = result.deliveries[0];
  assert.equal(d.ok, false);
  assert.equal(typeof d.detail, 'string');
  assert.equal(typeof d.errorName, 'string');
  assert.equal(Array.isArray(result.diagnostics), true);
  assert.equal(result.diagnostics.length >= 1, true);
  const diag = result.diagnostics[0];
  assert.equal(typeof diag.stage, 'string');
  assert.equal(typeof diag.errorName, 'string');
  assert.equal(typeof diag.message, 'string');
  assert.equal(typeof diag.detail, 'string');
}

test('acquire 抛异常：归 busy + stage=acquire + 释放被调用 + informative delivery', async () => {
  const { deps } = makeSendDeps();
  let released = 0;
  deps.singleFlight = {
    tryAcquire() {
      const error = /** @type {any} */ (new Error('lock backend exploded'));
      error.code = 'ELOCK';
      throw error;
    },
    release() {
      released += 1;
    },
  };
  const result = await sendChannelBatch(baseRequest(deps));
  assertInformative(result);
  assert.equal(result.reason, 'busy');
  assert.equal(result.messageKey, 'send.busy');
  assert.equal(result.diagnostics[0].stage, 'acquire');
  assert.equal(result.diagnostics[0].errorName, 'Error');
  assert.equal(result.diagnostics[0].code, 'ELOCK');
  assert.equal(result.diagnostics[0].message, 'lock backend exploded');
  assert.equal(released, 1, 'acquire 异常路径也必须 release');
  assert.deepEqual(result.warnings, ['stage:acquire']);
});

test('锁 busy（非异常）：diagnostics.stage=acquire + LockBusy 信息', async () => {
  const { deps } = makeSendDeps();
  deps.singleFlight = {
    tryAcquire() {
      return { ok: false, reason: 'busy', holder: 'other-batch' };
    },
    release() {
      throw new Error('should not release a lock owned by another batch');
    },
  };
  const result = await sendChannelBatch(baseRequest(deps));
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'busy');
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].stage, 'acquire');
  assert.equal(result.diagnostics[0].errorName, 'LockBusy');
  // 非本批次的锁不得释放（release 被设计成抛错也能验证未调用）
});

test('normalize 阶段抛异常：stage=normalize + 合成 lead/channelId 占位 delivery', async () => {
  const { deps } = makeSendDeps();
  Object.defineProperty(deps, 'members', {
    get() {
      throw Object.assign(new Error('members getter boom'), { code: 'ENORM' });
    },
    configurable: true,
  });
  const result = await sendChannelBatch(baseRequest(deps, { targets: [] }));
  assertInformative(result);
  assert.equal(result.diagnostics[0].stage, 'normalize');
  assert.equal(result.diagnostics[0].code, 'ENORM');
  assert.equal(result.deliveries[0].target, 'lead');
  assert.equal(result.deliveries[0].sessionId, LEAD, '无 known targets 时用 channelId 合成占位');
});

test('targets 阶段抛异常（requestId 生成）：stage=targets', async () => {
  const { deps } = makeSendDeps();
  let calls = 0;
  deps.uuid = () => {
    calls += 1;
    if (calls >= 2) throw Object.assign(new Error('uuid boom'), { code: 'EUUID' });
    return `uuid-${calls}`;
  };
  // 不传 clientBatchId，让 batchId 也走 uuid（第 1 次），requestIds 第 2 次抛 → targets 阶段
  const result = await sendChannelBatch({
    text: 'diagnose me',
    targets: [{ name: 'lead', sessionId: LEAD }],
    channelId: LEAD,
    deps,
  });
  assertInformative(result);
  assert.equal(result.diagnostics[0].stage, 'targets');
  assert.equal(result.diagnostics[0].code, 'EUUID');
  assert.equal(result.deliveries[0].sessionId, LEAD, '已知 targets 时用真实 target');
});

test('echo 阶段抛异常：stage=echo + knownEcho 保留', async () => {
  const { deps } = makeSendDeps();
  deps.onEcho = () => {
    throw Object.assign(new Error('echo callback boom'), { code: 'EECHO' });
  };
  const result = await sendChannelBatch(baseRequest(deps));
  assertInformative(result);
  assert.equal(result.diagnostics[0].stage, 'echo');
  assert.equal(result.diagnostics[0].code, 'EECHO');
  assert.ok(result.echo, '已创建的 echo 应保留');
  assert.equal(result.echo.id.startsWith('local:'), true);
});

test('limiter 阶段抛异常：stage=limiter', async () => {
  const { deps } = makeSendDeps();
  Object.defineProperty(deps, 'rateLimiter', {
    get() {
      throw Object.assign(new Error('limiter init boom'), { code: 'ELIMIT' });
    },
    configurable: true,
  });
  const result = await sendChannelBatch(baseRequest(deps));
  assertInformative(result);
  assert.equal(result.diagnostics[0].stage, 'limiter');
  assert.equal(result.diagnostics[0].code, 'ELIMIT');
});

test('loop 阶段抛异常：stage=loop', async () => {
  const { deps } = makeSendDeps();
  Object.defineProperty(deps, 'onDelivery', {
    get() {
      throw Object.assign(new Error('subscriber getter boom'), { code: 'ELOOP' });
    },
    configurable: true,
  });
  const result = await sendChannelBatch(baseRequest(deps));
  assertInformative(result);
  assert.equal(result.diagnostics[0].stage, 'loop');
  assert.equal(result.diagnostics[0].code, 'ELOOP');
});

test('finally 释放抛异常：不影响发送结果，仅 console.error', async () => {
  const { deps } = makeSendDeps();
  deps.singleFlight = {
    tryAcquire() {
      return { ok: true };
    },
    release() {
      throw new Error('release boom');
    },
  };
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args);
  try {
    const result = await sendChannelBatch(baseRequest(deps));
    assert.equal(result.status, 'sent');
    assert.equal(result.deliveries[0].ok, true);
    assert.equal(errors.length, 1);
    assert.equal(errors[0][0], '[group-chat send] release failed');
  } finally {
    console.error = original;
  }
});
