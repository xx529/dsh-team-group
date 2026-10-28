// @ts-check
/**
 * F-06 诊断增强：失败 delivery 的 detail（安全 JSON ≤500）+ SendResult.diagnostics + RemoteResult 兼容
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChannelBatch } from '../../src/send/send-batch.js';
import { describeError, extractErrorInfo, safeJson, DIAGNOSTIC_JSON_LIMIT } from '../../src/send/errors.js';
import { createMockSessionHost, IDS, makeSendDeps } from './helpers.js';

const LEAD = IDS.LEAD;

/** @param {any} response @returns {Promise<any>} */
function sendWithBehavior(response, overrides = {}) {
  const host = createMockSessionHost({
    onPrompt: () => (typeof response === 'function' ? response() : response),
  });
  const { deps } = makeSendDeps({ host, overrides });
  return sendChannelBatch({
    text: 'hello',
    targets: [{ name: 'lead', sessionId: LEAD }],
    channelId: LEAD,
    clientBatchId: `gc-diag-${Math.random().toString(16).slice(2, 8)}`,
    deps,
  });
}

test('RemoteError 对象：detail 含 code/status/name/message，diagnostics 顶层可用', async () => {
  const remote = /** @type {any} */ (new Error('permission denied'));
  remote.name = 'RemoteError';
  remote.code = 'group-chat/forbidden';
  remote.status = 403;
  remote.statusCode = 403;

  const result = await sendWithBehavior(remote);
  assert.equal(result.status, 'failed');
  const delivery = result.deliveries[0];
  assert.equal(delivery.ok, false);
  assert.equal(delivery.reason, 'forbidden');
  assert.equal(delivery.errorName, 'RemoteError');
  assert.equal(delivery.errorCode, 'group-chat/forbidden');
  assert.equal(delivery.errorStatus, 403);
  assert.equal(typeof delivery.detail, 'string');
  assert.ok(delivery.detail.length <= 500);

  const parsed = JSON.parse(delivery.detail);
  assert.equal(parsed.code, 'group-chat/forbidden');
  assert.equal(parsed.status, 403);
  assert.equal(parsed.statusCode, 403);
  assert.equal(parsed.name, 'RemoteError');
  assert.equal(parsed.message, 'permission denied');

  assert.equal(result.diagnostics.length, 1);
  const diag = result.diagnostics[0];
  assert.equal(diag.target, 'lead');
  assert.equal(diag.requestId, delivery.requestId);
  assert.equal(diag.reason, 'forbidden');
  assert.equal(diag.errorName, 'RemoteError');
  assert.equal(diag.code, 'group-chat/forbidden');
  assert.equal(diag.status, 403);
  assert.equal(diag.message, 'permission denied');
  assert.ok(diag.detail.length <= 500);
});

test('RemoteResult {ok:false,error}（resolve 而非 reject）也按失败处理并提取 detail', async () => {
  const result = await sendWithBehavior(() => ({
    ok: false,
    error: { name: 'RemoteError', code: 'subagent/parent-unavailable', message: 'parent agent is not live', status: 409 },
  }));
  assert.equal(result.status, 'failed');
  const delivery = result.deliveries[0];
  assert.equal(delivery.reason, 'parent-unavailable');
  assert.equal(delivery.errorCode, 'subagent/parent-unavailable');
  const parsed = JSON.parse(delivery.detail);
  assert.equal(parsed.code, 'subagent/parent-unavailable');
  assert.equal(parsed.message, 'parent agent is not live');
  assert.equal(result.diagnostics[0].errorName, 'RemoteError');
  assert.equal(result.diagnostics[0].status, 409);
});

test('字符串 / 纯 Error：detail 仍可解析且含 message', async () => {
  const s1 = await sendWithBehavior(() => {
    throw 'fetch failed';
  });
  assert.equal(s1.deliveries[0].reason, 'network');
  assert.equal(JSON.parse(s1.deliveries[0].detail).message, 'fetch failed');

  const s2 = await sendWithBehavior(new Error('connection reset'));
  assert.equal(s2.deliveries[0].reason, 'network');
  assert.equal(JSON.parse(s2.deliveries[0].detail).name, 'Error');
  assert.equal(JSON.parse(s2.deliveries[0].detail).message, 'connection reset');
});

test('嵌套 error/cause：保留 cause.name/message/code', async () => {
  const result = await sendWithBehavior(() => {
    const cause = /** @type {any} */ (new Error('socket hang up'));
    cause.code = 'ECONNRESET';
    const error = /** @type {any} */ (new Error('prompt failed'));
    error.cause = cause;
    throw error;
  });
  const parsed = JSON.parse(result.deliveries[0].detail);
  assert.equal(parsed.name, 'Error');
  assert.equal(parsed.message, 'prompt failed');
  assert.equal(parsed.cause.name, 'Error');
  assert.equal(parsed.cause.message, 'socket hang up');
  assert.equal(parsed.cause.code, 'ECONNRESET');
});

test('超长 message 的 detail 截断到 ≤500；循环 cause 不抛错', async () => {
  const long = await sendWithBehavior(() => {
    const error = /** @type {any} */ (new Error('X'.repeat(5000)));
    error.code = 'group-chat/payload-too-large';
    throw error;
  });
  assert.ok(long.deliveries[0].detail.length <= 500);
  assert.ok(long.diagnostics[0].detail.length <= 500);

  const circular = /** @type {any} */ (new Error('circular'));
  circular.cause = circular;
  const info = describeError(circular);
  assert.equal(typeof info.detail, 'string');
  assert.ok(info.detail.length <= 500);
  assert.doesNotThrow(() => JSON.parse(info.detail));
});

test('console.error("[group-chat send]", error) 在真实错误时被调用（状态机不变）', async () => {
  const calls = [];
  const original = console.error;
  console.error = (...args) => calls.push(args);
  try {
    const remote = /** @type {any} */ (new Error('boom'));
    remote.code = 'network';
    const result = await sendWithBehavior(remote);
    assert.equal(result.status, 'failed');
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], '[group-chat send]');
    assert.equal(calls[0][1], remote);
  } finally {
    console.error = original;
  }
});

test('成功路径不产生 diagnostics；多目标仅失败目标有诊断', async () => {
  const host = createMockSessionHost({
    onPrompt: (call) => (call.sessionId === IDS.UX ? /** @type {any} */ ({ ok: false, error: { code: 'network', message: 'down' } }) : 'ok'),
  });
  const { deps } = makeSendDeps({ host });
  const result = await sendChannelBatch({
    text: 'hi',
    targets: [
      { name: 'lead', sessionId: IDS.LEAD },
      { name: 'ux', sessionId: IDS.UX },
    ],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-diag-multi',
    deps,
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].target, 'ux');
  assert.equal(result.diagnostics[0].reason, 'network');
});

test('safeJson / extractErrorInfo 纯函数边界', () => {
  assert.equal(safeJson({ a: 1 }), '{"a":1}');
  const circular = { name: 'X' };
  circular.self = circular;
  assert.equal(typeof safeJson(circular), 'string');
  assert.ok(safeJson(circular).length < 200);
  assert.ok(safeJson({ x: 'y'.repeat(2000) }).length <= 500);
  const info = extractErrorInfo({ ok: false, error: { code: 500, message: 'x' } });
  assert.equal(info.code, 500);
  assert.equal(info.message, 'x');
  assert.equal(extractErrorInfo(undefined).name, 'UnknownError');
  assert.equal(extractErrorInfo('plain').message, 'plain');
});
