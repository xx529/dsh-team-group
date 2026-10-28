// @ts-check
/**
 * 群聊发送编排 · 可选的进程内控制器（单飞 + 手动重试 + 批次状态）
 *
 * T2 v1 直接调用 `sendChannelBatch` 即可（其内部已有模块级单飞）；控制器用于需要
 * 「同一频道一个发送入口 + 记住上一批结果 + 重试按钮直接调用」的场景，逻辑与 send-batch/retry 一致。
 */

import { failureInfo } from './errors.js';
import { createSingleFlight } from './rate-limit.js';
import { batchRegistry, sendChannelBatch } from './send-batch.js';
import { planRetry, retryChannelBatch } from './retry.js';

/**
 * @param {import('./send-batch.js').SendDeps & {singleFlight?: any, batchRegistry?: Map<string, any>}} [deps]
 */
export function createSendController(deps = {}) {
  const singleFlight = deps.singleFlight ?? createSingleFlight();
  const registry = deps.batchRegistry ?? batchRegistry;
  /** @type {Promise<import('./send-batch.js').SendResult>|null} */
  let inFlight = null;
  let inFlightBatchId = '';
  /** @type {import('./send-batch.js').SendResult|null} */
  let lastResult = null;
  let disposed = false;

  /** @param {string} reason @param {string} [batchId] */
  function failed(reason, batchId = '') {
    const info = failureInfo(reason);
    /** @type {any} */
    const result = {
      status: 'failed',
      deliveries: [],
      clientBatchId: batchId,
      channelId: '',
      text: '',
      targets: [],
      targetNames: [],
      prefixParts: [],
      requestIds: {},
      mode: 'steer',
      attempt: 0,
      reason,
      messageKey: info.messageKey,
      retryable: info.retryable,
      dropped: [],
      warnings: [],
    };
    return result;
  }

  return {
    /**
     * 发送（同频道单飞：第二次调用立即返回 busy，不排队）
     * @param {import('./send-batch.js').SendRequest} request
     */
    async send(request) {
      if (disposed) return failed('readonly', String(request?.clientBatchId ?? ''));
      if (inFlight) {
        const busy = failed('busy', String(request?.clientBatchId ?? ''));
        busy.warnings = ['controller-busy', `in-flight:${inFlightBatchId}`];
        return busy;
      }
      const batchId = String(request?.clientBatchId ?? '');
      inFlightBatchId = batchId;
      const promise = sendChannelBatch({
        ...request,
        deps: { ...(request.deps ?? {}), ...deps, singleFlight, batchRegistry: registry },
      });
      inFlight = promise;
      try {
        const result = await promise;
        lastResult = result;
        return result;
      } finally {
        if (inFlight === promise) inFlight = null;
        inFlightBatchId = '';
      }
    },

    /**
     * 手动重试上一批（只补失败目标、复用 requestId、≤2 次）
     * @param {{maxRetry?: number, skipBackoff?: boolean}} [opts]
     */
    async retry(opts = {}) {
      if (disposed) return failed('readonly', lastResult?.clientBatchId ?? '');
      if (inFlight) return failed('busy', lastResult?.clientBatchId ?? '');
      if (!lastResult) return failed('unknown');
      const plan = planRetry(lastResult, { maxRetry: opts.maxRetry ?? deps.maxRetry });
      if (!plan.allowed) return { ...lastResult, retryPlan: plan, retrySkipped: true };
      inFlightBatchId = lastResult.clientBatchId;
      const promise = retryChannelBatch(lastResult, { ...deps, singleFlight, batchRegistry: registry }, opts);
      inFlight = /** @type {any} */ (promise);
      try {
        const merged = await promise;
        lastResult = merged;
        return merged;
      } finally {
        inFlight = null;
        inFlightBatchId = '';
      }
    },

    /** @returns {boolean} */
    isSending() {
      return inFlight !== null;
    },

    /** @returns {string} */
    inFlightId() {
      return inFlightBatchId;
    },

    /** @returns {import('./send-batch.js').SendResult|null} */
    getLastResult() {
      return lastResult;
    },

    /** 清除控制器状态（不清理 registry——重试幂等记录保留） */
    dispose() {
      disposed = true;
      inFlight = null;
      inFlightBatchId = '';
      lastResult = null;
    },
  };
}
