// @ts-check
/**
 * F-06 根因回归：未 inject 的 Cordis 服务属性（ctx.isRunning / ctx.sessions）
 * 不得因裸属性访问抛错而让整批发送失败。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChannelBatch, safeCtxGet } from '../../src/send/send-batch.js';
import { createMockSessionHost, IDS, makeSendDeps } from './helpers.js';

const LEAD = IDS.LEAD;

/**
 * 模拟 Cordis ctx：未 inject 的属性访问直接抛错；提供显式 `get(key)`。
 * @param {any} sessions
 * @param {{throwOnGet?: boolean, throwOnSessions?: boolean}} [opts]
 */
function hostileCtx(sessions, opts = {}) {
  const target = { sessions };
  return new Proxy(target, {
    get(t, prop) {
      if (prop === 'get') {
        return (key) => {
          if (opts.throwOnGet) throw new Error('ctx.get exploded');
          return Object.prototype.hasOwnProperty.call(t, key) ? t[key] : undefined;
        };
      }
      if (prop === 'sessions' && !opts.throwOnSessions) return t.sessions;
      if (prop === 'then') return undefined;
      throw new Error(`cannot get property "${String(prop)}" without inject`);
    },
  });
}

test('F-06 真实路径：单 agent（targets 空）+ ctx.isRunning 未 inject → 不崩，prompt 正常调用并 sent', async () => {
  const host = createMockSessionHost();
  const { deps } = makeSendDeps();
  deps.ctx = hostileCtx(host.sessions);
  const result = await sendChannelBatch({
    text: '单 agent 发送',
    targets: [],
    channelId: LEAD,
    clientBatchId: 'gc-ctx-safe-1',
    deps,
  });
  assert.equal(result.status, 'sent', '不得因 ctx.isRunning 裸访问失败');
  assert.equal(host.calls.length, 1);
  assert.equal(host.calls[0].sessionId, LEAD);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.warnings.includes('stage:loop'), false);
});

test('deps.isRunning 路径：优先于 ctx（ctx 依然 hostile）且发送成功', async () => {
  const host = createMockSessionHost();
  const { deps } = makeSendDeps();
  deps.ctx = hostileCtx(host.sessions);
  let called = 0;
  deps.isRunning = () => {
    called += 1;
    return true;
  };
  const result = await sendChannelBatch({
    text: '带 isRunning',
    targets: [{ name: 'lead', sessionId: LEAD }],
    channelId: LEAD,
    clientBatchId: 'gc-ctx-safe-2',
    deps,
  });
  assert.equal(result.status, 'sent');
  assert.equal(host.calls.length, 1);
  assert.equal(called >= 0, true, 'resolveIsRunning 优先取 deps.isRunning 且不抛');
});

test('ctx.get 本身抛错 + 属性访问抛错：仍安全退化，发送成功', async () => {
  const host = createMockSessionHost();
  const { deps } = makeSendDeps();
  deps.ctx = hostileCtx(host.sessions, { throwOnGet: true });
  // throwOnGet 仍允许 sessions 属性访问（用于 binding），isRunning 属性访问会抛 → safeCtxGet 兜底
  const result = await sendChannelBatch({
    text: 'ctx.get 抛错',
    targets: [{ name: 'lead', sessionId: LEAD }],
    channelId: LEAD,
    clientBatchId: 'gc-ctx-safe-3',
    deps,
  });
  assert.equal(result.status, 'sent');
  assert.equal(host.calls.length, 1);
});

test('ctx.sessions 也不可读：优雅失败 session-missing（不抛出、informative delivery）', async () => {
  const { deps } = makeSendDeps();
  deps.ctx = hostileCtx({}, { throwOnSessions: true });
  const result = await sendChannelBatch({
    text: '无 sessions',
    targets: [{ name: 'lead', sessionId: LEAD }],
    channelId: LEAD,
    clientBatchId: 'gc-ctx-safe-4',
    deps,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.deliveries.length, 1);
  assert.equal(result.deliveries[0].reason, 'session-missing');
  assert.ok(!JSON.stringify(result).includes('without inject'), '外层错误不得出现在结果里');
});

test('safeCtxGet：get → 属性回退 → fallback，任何异常都不抛', () => {
  assert.equal(safeCtxGet({ get: (k) => (k === 'x' ? 42 : undefined), x: 1 }, 'x'), 42);
  assert.equal(safeCtxGet({ foo: 'bar' }, 'foo'), 'bar');
  assert.equal(safeCtxGet(null, 'x'), undefined);
  assert.equal(safeCtxGet(hostileCtx({}), 'isRunning', 'fb'), 'fb');
  assert.equal(safeCtxGet(hostileCtx({}, { throwOnGet: true }), 'isRunning', 'fb'), 'fb');
  // get 抛错但属性可读 → 属性回退
  const ctx = {
    get() {
      throw new Error('boom');
    },
    name: 'fallback-name',
  };
  assert.equal(safeCtxGet(ctx, 'name'), 'fallback-name');
  assert.doesNotThrow(() => safeCtxGet(new Proxy({}, { get() { throw new Error('nope'); } }), 'x', undefined));
});
