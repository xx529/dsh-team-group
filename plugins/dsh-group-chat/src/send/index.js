// @ts-check
/**
 * 群聊发送编排（T3）· 公共 API
 *
 * 冻结入口（T2 消费）：
 *   `sendChannelBatch(request) → Promise<{status, deliveries, clientBatchId, requestIds, ...}>`
 *   request: `{ text, mentions?, targets?, channelId, clientBatchId?, mode?, deps:{ctx} }`
 *   targets 兼容 `[{name, sessionId}]` 与 `['lead','ux']`；未 @ 时由 mentions+成员目录解析（默认 lead）。
 *
 * 质量属性：串行 lead 先、单飞、200ms 限流、requestId 幂等、四态聚合、手动重试只补失败目标。
 */

import {
  sendChannelBatch,
  getBatchRecord,
  resetSendState,
  deliveryStatesOf,
  batchRegistry,
  safeCtxGet,
} from './send-batch.js';
import {
  classifyError,
  FAILURE_MATRIX,
  FAILURE_REASONS,
  failureInfo,
  messageKeyOf,
  failedDelivery,
  sentDelivery,
  failedDeliveryWithDiagnostics,
  describeError,
  extractErrorInfo,
  safeJson,
  DIAGNOSTIC_JSON_LIMIT,
} from './errors.js';
import {
  applyDeliveriesToEcho,
  createLocalEcho,
  deliveryStates,
  hasPending,
  summarizeDeliveries,
} from './delivery.js';
import { normalizeSendTargets, targetNamesOf, sessionIdOf } from './targets.js';
import { checkTargetAvailability, MODE_TABLE, orderByLeadFirst, resolveMode, SEND_MODES } from './mode.js';
import { backoffMs, mergeRetryResult, planRetry, retryChannelBatch } from './retry.js';
import { createSendController } from './send-controller.js';
import { createRateLimiter, createSingleFlight, defaultSingleFlight, withTimeout } from './rate-limit.js';

export {
  // 主入口
  sendChannelBatch,
  createSendController,
  safeCtxGet,
  // 重试
  planRetry,
  retryChannelBatch,
  mergeRetryResult,
  backoffMs,
  // 状态机 / echo
  createLocalEcho,
  applyDeliveriesToEcho,
  deliveryStates,
  deliveryStatesOf,
  summarizeDeliveries,
  hasPending,
  // 目标 / mode
  normalizeSendTargets,
  targetNamesOf,
  sessionIdOf,
  orderByLeadFirst,
  resolveMode,
  checkTargetAvailability,
  MODE_TABLE,
  SEND_MODES,
  // 单飞 / 限流 / 超时
  createSingleFlight,
  defaultSingleFlight,
  createRateLimiter,
  withTimeout,
  // 错误 / 诊断
  FAILURE_MATRIX,
  FAILURE_REASONS,
  classifyError,
  failureInfo,
  messageKeyOf,
  failedDelivery,
  sentDelivery,
  failedDeliveryWithDiagnostics,
  describeError,
  extractErrorInfo,
  safeJson,
  DIAGNOSTIC_JSON_LIMIT,
  // 批次登记（对账/调试）
  batchRegistry,
  getBatchRecord,
  resetSendState,
};
