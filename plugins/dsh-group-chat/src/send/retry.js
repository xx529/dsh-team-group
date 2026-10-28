// @ts-check
/**
 * 群聊发送编排 · 重试（架构 §5.3 第 7 步 / §5.4）
 *
 * 规则：
 *  - **只补失败目标**，成功目标永不重发（PRD F9 / SC30）；
 *  - **复用原 `requestId`**：Host 按 rpcId 幂等去重（Spike S2），重发不会双投；
 *  - 同一 `clientBatchId` 继续使用 → 群聊仍只有 1 条气泡；前缀沿用首次的 canonical 两行；
 *  - ≤ `maxRetry`（默认 2）次 + 退避；不自动重试（手动触发，UX Q2）。
 */

import { LIMITS } from '../core/constants.js';
import { failureInfo } from './errors.js';
import { sendChannelBatch } from './send-batch.js';
import { summarizeDeliveries, deliveryStates } from './delivery.js';
import { aggregateDeliveryState } from '../core/fanout.js';

/**
 * @typedef {import('./send-batch.js').SendResult} SendResult
 * @typedef {import('./send-batch.js').SendDeps} SendDeps
 * @typedef {import('../core/model.js').DeliveryState} DeliveryState
 */

/**
 * @typedef {Object} RetryPlan
 * @property {boolean} allowed
 * @property {number} attempt
 * @property {number} nextAttempt
 * @property {Array<{name: string, sessionId: string}>} targets
 * @property {string} clientBatchId
 * @property {Record<string, string>} requestIds
 * @property {string} [reason]
 * @property {string} [messageKey]
 * @property {string[]} skipped 非可重试失败目标名（保留失败态，不再补发）
 */

/**
 * 规划重试（纯函数，不发起请求）
 * @param {SendResult} result
 * @param {{maxRetry?: number}} [opts]
 * @returns {RetryPlan}
 */
export function planRetry(result, opts = {}) {
  const maxRetry = Number.isInteger(opts.maxRetry) ? Number(opts.maxRetry) : LIMITS.maxRetry;
  const attempt = Number(result?.attempt ?? 1);
  const deliveries = Array.isArray(result?.deliveries) ? result.deliveries : [];
  const failed = deliveries.filter((d) => !d.ok);
  const retryable = failed.filter((d) => d.retryable !== false);
  const skipped = failed.filter((d) => d.retryable === false).map((d) => d.target);
  /** @type {RetryPlan} */
  const plan = {
    allowed: false,
    attempt,
    nextAttempt: attempt + 1,
    targets: retryable.map((d) => ({ name: d.target, sessionId: d.sessionId })),
    clientBatchId: String(result?.clientBatchId ?? ''),
    requestIds: result?.requestIds ?? {},
    skipped,
  };
  if (attempt > maxRetry) {
    plan.reason = 'retry-exhausted';
    plan.messageKey = failureInfo('retry-exhausted').messageKey;
    return plan;
  }
  // F-06：上一批 deliveries 为空（历史空 targets bug）时，按 channelId 重试 lead；channelId 也空 → channel-missing
  if (deliveries.length === 0) {
    const channelId = String(result?.channelId ?? '');
    if (channelId) {
      plan.allowed = true;
      plan.targets = [{ name: 'lead', sessionId: channelId }];
      return plan;
    }
    plan.reason = 'channel-missing';
    plan.messageKey = failureInfo('channel-missing').messageKey;
    return plan;
  }
  if (retryable.length === 0) {
    plan.reason = 'no-retryable-target';
    plan.messageKey = failureInfo(failed.length > 0 ? failed[0].reason ?? 'unknown' : 'unknown').messageKey;
    return plan;
  }
  plan.allowed = true;
  return plan;
}

/**
 * 退避（ms）：第 1 次重试 300ms，第 2 次 900ms（≤2 次；不再放大）
 * @param {number} attempt 已完成次数（1 = 首次失败后）
 * @returns {number}
 */
export function backoffMs(attempt) {
  if (attempt <= 0) return 0;
  return attempt === 1 ? 300 : 900;
}

/**
 * 合并重试结果：失败目标用新结果覆盖，成功目标维持原值；聚合四态
 * @param {SendResult} previous
 * @param {SendResult} next
 * @returns {SendResult}
 */
export function mergeRetryResult(previous, next) {
  /** @type {Map<string, import('./send-batch.js').SendDeliveryItem>} */
  const byKey = new Map();
  for (const d of previous.deliveries ?? []) byKey.set(d.sessionId || d.target, d);
  for (const d of next.deliveries ?? []) byKey.set(d.sessionId || d.target, d);
  const deliveries = [...byKey.values()];
  const summary = summarizeDeliveries(deliveries);
  const status = /** @type {DeliveryState} */ (aggregateDeliveryState(deliveryStates(deliveries)) ?? summary.status ?? 'failed');
  return {
    ...next,
    deliveries,
    status,
    attempt: next.attempt,
    ...(status === 'failed' || status === 'partial'
      ? { reason: summary.firstReason, messageKey: summary.firstReason ? failureInfo(summary.firstReason).messageKey : undefined }
      : { reason: undefined, messageKey: undefined }),
    retryable: summary.retryable,
    echo: next.echo ?? previous.echo,
  };
}

/**
 * 执行一次重试（只发失败目标；复用 requestId；退避）
 * @param {SendResult} result
 * @param {SendDeps} [deps]
 * @param {{maxRetry?: number, skipBackoff?: boolean}} [opts]
 * @returns {Promise<SendResult & {retryPlan?: RetryPlan, retrySkipped?: boolean}>}
 */
export async function retryChannelBatch(result, deps = {}, opts = {}) {
  const plan = planRetry(result, { maxRetry: opts.maxRetry ?? deps.maxRetry });
  if (!plan.allowed) {
    return { ...result, retryPlan: plan, retrySkipped: true };
  }
  if (!opts.skipBackoff) {
    const wait = backoffMs(plan.attempt);
    if (wait > 0) {
      if (typeof deps.sleep === 'function') await deps.sleep(wait);
      else await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  const next = await sendChannelBatch({
    text: result.text,
    mentions: [],
    targets: plan.targets,
    channelId: result.channelId,
    clientBatchId: plan.clientBatchId,
    deps: { ...deps, maxRetry: opts.maxRetry ?? deps.maxRetry },
  });
  const merged = mergeRetryResult(result, next);
  return { ...merged, retryPlan: plan };
}
