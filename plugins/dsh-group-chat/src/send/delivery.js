// @ts-check
/**
 * 群聊发送编排 · 四态状态机与本地 echo（架构 §5.3 / V1.1-2）
 *
 * 四态：sending（仍有在途） / sent（全部成功） / partial（部分失败） / failed（全部失败）。
 * 本地 echo 的 id = `local:<clientBatchId>`，权威事件到达后由内核 `mergeFanout` 按 batchId 合并。
 */

import { aggregateDeliveryState } from '../core/fanout.js';
import { FAILURE_MATRIX } from './errors.js';

/**
 * @typedef {Object} SendDelivery
 * @property {string} target
 * @property {string} sessionId
 * @property {boolean} ok
 * @property {string} [error]
 * @property {string} [reason]
 * @property {boolean} [retryable]
 * @property {string} [messageKey]
 * @property {string} [requestId]
 * @property {number} [attempt]
 */

/**
 * 创建本地乐观用户消息（ChannelMessage 形状，与 T2 的 optimistic 兼容）
 * @param {{
 *   clientBatchId: string,
 *   channelId: string,
 *   text: string,
 *   targets: Array<{name: string, sessionId?: string}>,
 *   requestIds?: Record<string, string>,
 *   prefixParts?: string[],
 *   now?: number,
 *   mentions?: string[],
 * }} input
 * @returns {import('../core/model.js').ChannelMessage}
 */
export function createLocalEcho(input) {
  const targetNames = input.targets.map((t) => t.name);
  const targetSessionIds = input.targets.map((t) => t.sessionId ?? '');
  /** @type {Record<string, import('../core/model.js').DeliveryState>} */
  const deliveries = {};
  for (const id of targetSessionIds) if (id) deliveries[id] = 'sending';
  return {
    id: `local:${input.clientBatchId}`,
    kind: 'user',
    sessionId: input.channelId,
    sender: { sessionId: input.channelId, name: 'user', kind: /** @type {'user'} */ ('user') },
    targets: targetNames,
    targetSessionIds,
    text: input.text,
    rawText: input.text,
    time: input.now ?? Date.now(),
    seq: 0,
    isFinal: true,
    delivery: 'sending',
    deliveries,
    clientBatchId: input.clientBatchId,
    meta: {
      localEcho: true,
      clientBatchId: input.clientBatchId,
      ...(input.requestIds ? { requestIds: input.requestIds } : {}),
      ...(input.prefixParts && input.prefixParts.length > 1
        ? { protocolHead: input.prefixParts[0], protocolExplain: input.prefixParts[1] }
        : {}),
      ...(input.mentions && input.mentions.length > 0 ? { draftMentions: input.mentions } : {}),
    },
    isLocal: true,
  };
}

/**
 * deliveries 数组 → 按 sessionId 的状态表（T2 store 形状）
 * @param {SendDelivery[]} deliveries
 * @returns {Record<string, import('../core/model.js').DeliveryState>}
 */
export function deliveryStates(deliveries) {
  /** @type {Record<string, import('../core/model.js').DeliveryState>} */
  const states = {};
  for (const d of Array.isArray(deliveries) ? deliveries : []) {
    const key = d.sessionId || d.target;
    if (!key) continue;
    states[key] = d.ok ? 'sent' : 'failed';
  }
  return states;
}

/**
 * 汇总结果（供 result 与 echo 复用）
 * @param {SendDelivery[]} deliveries
 * @returns {{status: import('../core/model.js').DeliveryState|undefined, sent: number, failed: number, total: number, failedTargets: string[], failedSessionIds: string[], retryable: boolean, firstReason?: string}}
 */
export function summarizeDeliveries(deliveries) {
  const list = Array.isArray(deliveries) ? deliveries : [];
  const states = deliveryStates(list);
  const status = aggregateDeliveryState(states);
  const failed = list.filter((d) => !d.ok);
  const retryable = failed.some((d) => (d.retryable ?? FAILURE_MATRIX[d.reason ?? 'unknown']?.retryable ?? FAILURE_MATRIX.unknown.retryable) !== false);
  return {
    status,
    sent: list.length - failed.length,
    failed: failed.length,
    total: list.length,
    failedTargets: failed.map((d) => d.target),
    failedSessionIds: failed.map((d) => d.sessionId).filter(Boolean),
    retryable,
    firstReason: failed[0]?.reason,
  };
}

/**
 * 把一次发送结果写回 echo（返回新对象，不修改入参）
 * @param {import('../core/model.js').ChannelMessage} echo
 * @param {SendDelivery[]} deliveries
 * @param {{reason?: string}} [extra]
 * @returns {import('../core/model.js').ChannelMessage}
 */
export function applyDeliveriesToEcho(echo, deliveries, extra = {}) {
  const summary = summarizeDeliveries(deliveries);
  return {
    ...echo,
    delivery: summary.status,
    deliveries: deliveryStates(deliveries),
    meta: {
      ...(echo.meta ?? {}),
      ...(summary.status === 'failed' || summary.status === 'partial'
        ? { error: summary.firstReason ?? extra.reason ?? 'unknown' }
        : {}),
    },
  };
}

/**
 * 是否仍有在途目标
 * @param {SendDelivery[]} deliveries
 * @returns {boolean}
 */
export function hasPending(deliveries) {
  return (Array.isArray(deliveries) ? deliveries : []).some((d) => d.reason === 'sending');
}
