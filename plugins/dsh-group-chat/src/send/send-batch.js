// @ts-check
/**
 * 群聊发送编排 · `sendChannelBatch`（T2 冻结入口）
 *
 * 契约：架构 §5.1–§5.5 + Spike S2/S3。
 *  - 目标解析：未 @ 默认 Lead；targets>1 注入 canonical 两行前缀（core/protocol 单点常量）
 *  - fan-out：逐目标 `sessions.binding(id).session.prompt([parts...], mode, signal, requestId)`，**串行、lead 先**
 *  - 四态：sending/sent/partial/failed；每目标独立结果
 *  - 幂等：`clientBatchId` + 每目标 `requestId`（重试复用同一 requestId，Host 按 rpcId 去重）
 *  - 单飞：同一频道同一时刻仅 1 个批次；限流：相邻 prompt ≥ 200ms
 *
 * T2 调用形状（frontend 实际代码）：
 *   `sendChannelBatch({text, mentions, targets:[{name,sessionId}], channelId, clientBatchId, deps:{ctx}})`
 *   → `{status, deliveries:[{target, sessionId, ok, error?}]}`
 * 额外字段（可选消费）：`clientBatchId, requestIds, targets, targetNames, prefixParts, echo, reason, messageKey, retryable, attempt, dropped`
 */

import { LIMITS } from '../core/constants.js';
import { buildParts } from '../core/protocol.js';
import { hashText, normalizeText } from '../core/dedupe.js';
import { normalizeSendTargets, targetNamesOf } from './targets.js';
import { orderByLeadFirst, resolveMode, checkTargetAvailability } from './mode.js';
import {
  classifyError,
  failureInfo,
  failedDelivery,
  failedDeliveryWithDiagnostics,
  describeError,
  sentDelivery,
} from './errors.js';
import { applyDeliveriesToEcho, createLocalEcho, deliveryStates, summarizeDeliveries } from './delivery.js';
import { createRateLimiter, defaultSingleFlight, withTimeout } from './rate-limit.js';

/**
 * @typedef {import('../core/model.js').DeliveryState} DeliveryState
 * @typedef {import('../core/model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./targets.js').SendTarget} SendTarget
 */

/**
 * @typedef {Object} SendRequest
 * @property {string} text
 * @property {string[]} [mentions]
 * @property {Array<string|{name?: string, label?: string, sessionId?: string, kind?: string, addressable?: boolean, parentAvailable?: boolean, running?: boolean}>} [targets]
 * @property {string} channelId
 * @property {string} [clientBatchId]
 * @property {'steer'|'queue'|'inject'|'auto'} [mode]
 * @property {SendDeps} [deps]
 */

/**
 * @typedef {Object} SendDeps
 * @property {any} [ctx]                     Cordis client ctx（真实路径）
 * @property {(sessionId: string) => any} [binding]
 * @property {(sessionId: string, parts: any[], mode: string, signal: AbortSignal|undefined, requestId: string) => Promise<any>} [prompt]
 * @property {() => string} [uuid]
 * @property {() => number} [now]
 * @property {(ms: number) => Promise<void>} [sleep]
 * @property {AbortSignal} [signal]
 * @property {import('../core/model.js').ChannelMember[]} [members]
 * @property {boolean} [readonly]
 * @property {number} [timeoutMs]
 * @property {number} [minIntervalMs]
 * @property {number} [maxRetry]
 * @property {number} [maxTargets]
 * @property {any} [singleFlight]
 * @property {Map<string, any>} [batchRegistry]
 * @property {any} [rateLimiter]
 * @property {(event: any) => void} [onDelivery]
 * @property {(echo: ChannelMessage) => void} [onEcho]
 * @property {(batch: {clientBatchId: string, channelId: string, attempt?: number, targets: Array<{name: string, sessionId: string, kind?: string}>, targetNames: string[], requestIds: Record<string, string>, sessionIds: string[]}) => void} [onBatch]  F-07：prompt 前回调，UI 用它维护 localBatches
 * @property {boolean} [suppressEcho]
 * @property {Record<string, any>} [localBatches]  M4：与 adapter ctx.localBatches 同一对象引用（UI 在 onBatch 写入）
 * @property {(error: any) => void} [onBatchError]  M4：onBatch 回调异常可观测钩子
 */

/**
 * @typedef {Object} SendDeliveryItem
 * @property {string} target
 * @property {string} sessionId
 * @property {boolean} ok
 * @property {string} [error]
 * @property {string} [reason]
 * @property {boolean} [retryable]
 * @property {string} [messageKey]
 * @property {string} [requestId]
 * @property {number} [attempt]
 * @property {string} [detail]                 安全 JSON（≤500 字，失败诊断）
 * @property {string} [errorName]
 * @property {string} [errorMessage]
 * @property {string|number} [errorCode]
 * @property {string|number} [errorStatus]
 * @property {string|number} [errorStatusCode]
 */

/**
 * @typedef {Object} SendResult
 * @property {DeliveryState} status
 * @property {SendDeliveryItem[]} deliveries
 * @property {string} clientBatchId
 * @property {string} channelId
 * @property {string} text
 * @property {Array<{name: string, sessionId: string}>} targets
 * @property {string[]} targetNames
 * @property {string[]} prefixParts
 * @property {Record<string, string>} requestIds
 * @property {string} mode
 * @property {number} attempt
 * @property {ChannelMessage} [echo]
 * @property {string} [reason]
 * @property {string} [messageKey]
 * @property {boolean} retryable
 * @property {Array<{name: string, reason: string}>} [dropped]
 * @property {string[]} [warnings]
 * @property {Array<{target: string, sessionId?: string, requestId?: string, attempt?: number, reason: string, errorName: string, code?: string|number, status?: string|number, message: string, detail?: string}>} diagnostics
 */

/** 模块级批次登记表：重试一致性（同一 batchId 复用 targetNames/prefix/requestIds） */
export const batchRegistry = new Map();

/** 登记表上限（避免长会话内存增长） */
const REGISTRY_MAX = 200;

/**
 * @param {Map<string, any>} registry
 * @param {string} batchId
 * @param {any} record
 */
function rememberBatch(registry, batchId, record) {
  registry.set(batchId, record);
  if (registry.size > REGISTRY_MAX) {
    const first = registry.keys().next();
    if (!first.done) registry.delete(first.value);
  }
}

/**
 * @param {SendDeps} deps
 * @returns {() => string}
 */
function uuidFactory(deps) {
  if (typeof deps.uuid === 'function') return deps.uuid;
  return () => {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
      }
    } catch {
      /* ignore */
    }
    return `gc-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
  };
}

/**
 * 安全读取 Cordis ctx 服务（未 inject 的服务属性裸访问会抛
 * `cannot get property "xxx" without inject`）：
 *  - 优先 `ctx.get(key)`（Cordis 的显式服务读取，未注入返回 undefined）；
 *  - 再退回 try/catch 的属性读取；
 *  - 任何异常都返回 fallback，绝不向上抛。
 * @param {any} ctx
 * @param {string} key
 * @param {any} [fallback]
 * @returns {any}
 */
export function safeCtxGet(ctx, key, fallback = undefined) {
  if (!ctx || !key) return fallback;
  try {
    if (typeof ctx.get === 'function') {
      const value = ctx.get(key);
      if (value !== undefined && value !== null) return value;
    }
  } catch {
    /* ctx.get 本身可能因未注入/已 dispose 抛错，也覆盖「ctx.get 属性访问即抛」的代理 */
  }
  try {
    const value = ctx[key];
    return value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

/**
 * isRunning 解析：deps.isRunning（函数）→ safeCtxGet(ctx,'isRunning') → undefined
 * @param {SendDeps} deps
 * @returns {((sessionId: string) => boolean)|undefined}
 */
function resolveIsRunning(deps) {
  if (typeof deps.isRunning === 'function') return deps.isRunning;
  const fromCtx = safeCtxGet(deps.ctx, 'isRunning');
  return typeof fromCtx === 'function' ? fromCtx : undefined;
}

/**
 * 解析单目标 prompt 函数（真实路径 `binding(id).session.prompt`）
 * @param {SendTarget} target
 * @param {SendDeps} deps
 * @param {string} channelId
 * @returns {((parts: any[], mode: string, signal: AbortSignal|undefined, requestId: string) => Promise<any>) | undefined}
 */
function promptFor(target, deps, channelId) {
  const sessionId = target.sessionId || (target.name === 'lead' ? channelId : '');
  if (!sessionId) return undefined;
  if (typeof deps.prompt === 'function') {
    return (parts, mode, signal, requestId) => deps.prompt(sessionId, parts, mode, signal, requestId);
  }
  let binding;
  try {
    if (typeof deps.binding === 'function') {
      binding = deps.binding(sessionId);
    } else {
      const sessions = safeCtxGet(deps.ctx, 'sessions');
      binding = typeof sessions?.binding === 'function' ? sessions.binding(sessionId) : undefined;
    }
  } catch {
    return undefined;
  }
  const session = binding?.session;
  if (!session || typeof session.prompt !== 'function') return undefined;
  return (parts, mode, signal, requestId) => session.prompt(parts, mode, signal, requestId);
}

/**
 * @param {SendRequest & {request?: any}} request
 * @param {string} reason
 * @param {Array<{name: string, sessionId: string}>} targets
 * @returns {SendResult}
 */
function failureResult(request, reason, targets = []) {
  const info = failureInfo(reason);
  const deliveries = targets.map((t) => failedDelivery(t, reason));
  const summary = summarizeDeliveries(deliveries);
  return {
    status: 'failed',
    deliveries,
    clientBatchId: String(request.clientBatchId ?? ''),
    channelId: String(request.channelId ?? ''),
    text: String(request.text ?? ''),
    targets: targets.map((t) => ({ name: t.name, sessionId: t.sessionId })),
    targetNames: targets.map((t) => t.name),
    prefixParts: [],
    requestIds: {},
    mode: 'steer',
    attempt: 1,
    reason,
    messageKey: info.messageKey,
    retryable: info.retryable,
    dropped: [],
    warnings: [],
    diagnostics: [],
  };
}

/**
 * 群聊发送编排（一次 fan-out；单飞 + 限流 + 四态）
 * @param {SendRequest} request
 * @returns {Promise<SendResult>}
 */
export async function sendChannelBatch(request) {
  const deps = /** @type {SendDeps} */ (request?.deps ?? {});
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const uuid = uuidFactory(deps);
  const channelId = String(request?.channelId ?? '');
  const body = String(request?.text ?? '');
  const maxRetry = Number.isInteger(deps.maxRetry) ? Number(deps.maxRetry) : LIMITS.maxRetry;
  const minIntervalMs = Number.isFinite(deps.minIntervalMs) ? Number(deps.minIntervalMs) : LIMITS.minIntervalMs;
  const timeoutMs = Number.isFinite(deps.timeoutMs) ? Number(deps.timeoutMs) : LIMITS.promptTimeoutMs;
  const registry = deps.batchRegistry ?? batchRegistry;
  const singleFlight = deps.singleFlight ?? defaultSingleFlight;
  const batchId = String(request?.clientBatchId ?? `gc-${uuid()}`);

  if (!body.trim()) return { ...failureResult({ ...request, clientBatchId: batchId }, 'empty-text'), attempt: 1 };

  const existing = registry.get(batchId);
  const attempt = Number(existing?.attempts ?? 0) + 1;
  if (attempt > 1 + maxRetry) {
    return { ...failureResult({ ...request, clientBatchId: batchId }, 'retry-exhausted'), attempt };
  }

  // F-06：阶段标记 —— 外层异常时定位「进入 target 循环前」的抛错点
  // stage ∈ init|acquire|normalize|targets|echo|limiter|loop|finally
  let stage = 'init';
  /** @type {SendTarget[]} */
  let knownTargets = [];
  let knownTargetNames = [];
  let knownPrefixParts = [];
  /** @type {Record<string,string>} */
  let knownRequestIds = {};
  let knownMode = 'steer';
  /** @type {ChannelMessage|undefined} */
  let knownEcho;
  const lockKey = channelId || 'channel';

  /**
   * 外层异常兜底：带 stage 的 diagnostics + informative delivery（无 targets 时合成 lead/channelId 占位）
   * @param {any} error
   * @param {string} stageName
   * @param {string} [reasonOverride]
   * @returns {SendResult}
   */
  function failWithStage(error, stageName, reasonOverride) {
    const reason = reasonOverride ?? classifyError(error);
    const { info, detail } = describeError(error);
    const failTargets =
      knownTargets.length > 0
        ? knownTargets
        : [{ name: 'lead', sessionId: channelId || '', kind: 'lead' }];
    /** @type {SendDeliveryItem[]} */
    const deliveries = failTargets.map((t) => {
      const failed = failedDeliveryWithDiagnostics(t, reason, error, { attempt }).delivery;
      return { ...failed, stage: stageName };
    });
    const requestIdOf = (t) => knownRequestIds[t.sessionId || t.name];
    const diagnostics = failTargets.map((t) => ({
      stage: stageName,
      target: t.name,
      sessionId: t.sessionId ?? '',
      ...(requestIdOf(t) ? { requestId: requestIdOf(t) } : {}),
      reason,
      errorName: info.name,
      ...(info.code !== undefined ? { code: info.code } : {}),
      ...(info.status !== undefined ? { status: info.status } : {}),
      message: info.message,
      detail,
    }));
    logSendError(error, failTargets[0], requestIdOf(failTargets[0]) ?? '');
    // M4/H1：外层异常也属于终态（failed），关闭 localBatches 条目（弱匹配不再使用，rpcId 仍可替换 echo）
    markLocalBatchClosed(deps, batchId, 'failed', now);
    return {
      status: 'failed',
      deliveries,
      clientBatchId: batchId,
      channelId,
      text: body,
      targets: failTargets.map((t) => ({ name: t.name, sessionId: t.sessionId ?? '' })),
      targetNames: knownTargetNames.length > 0 ? knownTargetNames : failTargets.map((t) => t.name),
      prefixParts: knownPrefixParts,
      requestIds: knownRequestIds,
      mode: knownMode,
      attempt,
      ...(knownEcho ? { echo: knownEcho } : {}),
      reason,
      messageKey: failureInfo(reason).messageKey,
      retryable: failureInfo(reason).retryable,
      dropped: [],
      warnings: [`stage:${stageName}`],
      diagnostics,
    };
  }

  stage = 'acquire';
  let lock;
  try {
    lock = singleFlight.tryAcquire(lockKey, batchId);
  } catch (error) {
    // 锁获取异常：尝试释放（防半获取），再按 busy 归类
    try {
      singleFlight.release(lockKey, batchId);
    } catch {
      /* ignore */
    }
    return failWithStage(error, 'acquire', 'busy');
  }
  if (!lock.ok) {
    const result = { ...failureResult({ ...request, clientBatchId: batchId }, 'busy'), attempt };
    result.warnings = [lock.reason === 'same-batch' ? 'same-batch-in-flight' : 'channel-busy'];
    result.diagnostics = [
      {
        stage: 'acquire',
        reason: 'busy',
        errorName: 'LockBusy',
        message: lock.reason === 'same-batch' ? 'same batch is already in flight' : 'channel has an in-flight batch',
      },
    ];
    return result;
  }

  stage = 'normalize';
  try {
    const normalized = normalizeSendTargets({
      targets: request?.targets,
      mentions: request?.mentions,
      text: body,
      members: deps.members,
      channelId,
      maxTargets: deps.maxTargets,
    });
    let targets = orderByLeadFirst(normalized.targets);
    knownTargets = targets;
    stage = 'targets';
    if (targets.length === 0) {
      if (channelId) {
        // F-06：单 agent / channel.lead 缺失时 UI 可能解析出空 targets；频道根即 lead → 合成单目标继续发送
        targets = [{ name: 'lead', sessionId: channelId, kind: 'lead' }];
      } else {
        // channelId 也缺失：明确失败（带 reason/messageKey/delivery，不再返回无信息的 failed）
        const failed = failureResult({ ...request, clientBatchId: batchId }, 'channel-missing', [
          { name: 'lead', sessionId: '' },
        ]);
        return { ...failed, attempt };
      }
    }

    knownTargets = targets;
    const targetNames = Array.isArray(existing?.targetNames) && existing.targetNames.length > 0
      ? existing.targetNames
      : targetNamesOf(targets);
    knownTargetNames = targetNames;
    const prefixParts = Array.isArray(existing?.prefixParts) ? existing.prefixParts : buildParts(targetNames, body);
    const baseParts = prefixParts.length > 0 ? prefixParts : [body];
    const promptParts = baseParts.map((text) => ({ type: 'text', text }));

    /** @type {Record<string, string>} */
    const requestIds = { ...(existing?.requestIds ?? {}) };
    for (const target of targets) {
      const key = target.sessionId || target.name;
      if (!requestIds[key]) requestIds[key] = uuid();
    }
    knownRequestIds = requestIds;

    const mode = resolveMode(targets[0], { mode: request?.mode });
    knownMode = mode;

    /** @type {SendDeliveryItem[]} */
    const deliveries = [];
    /** @type {string[]} */
    const warnings = [];

    // F-07：prompt 前把本批 id/requestIds/targets 交给 UI（维护 localBatches，权威消息才能替换本地 echo）。
    // H1/M4：payload 含 text/textHash/at，供无 rpcId 的严格弱匹配；回调异常需可观测（warnings + onBatchError）。
    if (typeof deps.onBatch === 'function') {
      try {
        deps.onBatch({
          clientBatchId: batchId,
          channelId,
          attempt,
          targets: targets.map((t) => ({ name: t.name, sessionId: t.sessionId ?? '', kind: t.kind })),
          targetNames,
          requestIds: { ...requestIds },
          sessionIds: targets.map((t) => t.sessionId || (t.name === 'lead' ? channelId : '')).filter(Boolean),
          text: body,
          textHash: hashText(normalizeText(body)),
          at: now(),
        });
      } catch (error) {
        // 回调失败不得影响发送；但必须可观测
        warnings.push('onBatch-callback-failed');
        try {
          if (typeof deps.onBatchError === 'function') deps.onBatchError(error);
        } catch {
          /* ignore */
        }
        try {
          if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('[group-chat send] onBatch callback failed', error);
          }
        } catch {
          /* ignore */
        }
      }
    }

    stage = 'echo';
    const echoForOnEcho = deps.suppressEcho
      ? undefined
      : createLocalEcho({
          clientBatchId: batchId,
          channelId,
          text: body,
          targets,
          requestIds,
          prefixParts,
          now: now(),
          mentions: request?.mentions,
        });
    if (echoForOnEcho) knownEcho = echoForOnEcho;
    if (echoForOnEcho && typeof deps.onEcho === 'function') deps.onEcho(echoForOnEcho);

    stage = 'limiter';
    const limiter = deps.rateLimiter ?? createRateLimiter({ minIntervalMs, now, sleep: deps.sleep, signal: deps.signal });
    stage = 'loop';
    /** @type {Array<{target: string, sessionId?: string, requestId?: string, attempt?: number, reason: string, errorName: string, code?: string|number, status?: string|number, message: string, detail?: string}>} */
    const diagnostics = [];

    for (const target of targets) {
      const sessionId = target.sessionId || (target.name === 'lead' ? channelId : '');
      const attemptNo = attempt;
      const requestId = requestIds[sessionId || target.name] ?? uuid();

      if (deps.signal && deps.signal.aborted) {
        deliveries.push(failedDelivery(target, 'aborted', { requestId, attempt: attemptNo }));
        emitDelivery(deps, target, 'failed', 'aborted', requestId, attemptNo);
        continue;
      }

      const availability = checkTargetAvailability(target, {
        readonly: deps.readonly === true,
        members: deps.members,
        channelId,
        isRunning: resolveIsRunning(deps),
      });
      if (!availability.sendable) {
        deliveries.push(failedDelivery(target, availability.reason ?? 'unaddressable', { requestId, attempt: attemptNo, detail: availability.detail }));
        emitDelivery(deps, target, 'failed', availability.reason ?? 'unaddressable', requestId, attemptNo);
        continue;
      }
      if (availability.warn && !warnings.includes(availability.warn)) warnings.push(availability.warn);

      const prompt = promptFor(target, deps, channelId);
      if (!prompt) {
        deliveries.push(failedDelivery(target, 'session-missing', { requestId, attempt: attemptNo }));
        emitDelivery(deps, target, 'failed', 'session-missing', requestId, attemptNo);
        continue;
      }

      emitDelivery(deps, target, 'sending', undefined, requestId, attemptNo);
      /** @type {any} */
      let failedError;
      try {
        const outcome = await limiter.run(() =>
          withTimeout(prompt(promptParts, mode, deps.signal, requestId), { timeoutMs }),
        );
        // RemoteResult 兼容：prompt 可能 resolve `{ok:false,error}` 而不是 reject
        if (outcome && typeof outcome === 'object' && outcome.ok === false) {
          failedError = outcome.error ?? outcome;
        }
      } catch (error) {
        failedError = error;
      }
      if (failedError !== undefined) {
        const reason = classifyError(failedError, { aborted: deps.signal?.aborted === true });
        const { delivery, diagnostic } = failedDeliveryWithDiagnostics(target, reason, failedError, {
          requestId,
          attempt: attemptNo,
        });
        deliveries.push(delivery);
        diagnostics.push({ ...diagnostic, stage: 'loop' });
        emitDelivery(deps, target, 'failed', reason, requestId, attemptNo);
        logSendError(failedError, target, requestId);
      } else {
        deliveries.push(sentDelivery(target, { requestId, attempt: attemptNo }));
        emitDelivery(deps, target, 'sent', undefined, requestId, attemptNo);
      }
    }

    const summary = summarizeDeliveries(deliveries);
    const status = /** @type {DeliveryState} */ (summary.status ?? 'failed');
    const echo = echoForOnEcho ? applyDeliveriesToEcho(echoForOnEcho, deliveries) : undefined;
    rememberBatch(registry, batchId, {
      clientBatchId: batchId,
      channelId,
      targetNames,
      prefixParts,
      requestIds,
      attempts: attempt,
      text: body,
      lastStatus: status,
      updatedAt: now(),
    });

    markLocalBatchClosed(deps, batchId, status, now);

    return {
      status,
      deliveries,
      clientBatchId: batchId,
      channelId,
      text: body,
      targets: targets.map((t) => ({ name: t.name, sessionId: t.sessionId })),
      targetNames,
      prefixParts,
      requestIds,
      mode,
      attempt,
      echo,
      ...(status === 'failed' || status === 'partial'
        ? { reason: summary.firstReason, messageKey: summary.firstReason ? failureInfo(summary.firstReason).messageKey : undefined }
        : {}),
      retryable: summary.retryable,
      dropped: normalized.dropped,
      warnings,
      diagnostics,
    };
  } catch (error) {
    return failWithStage(error, stage);
  } finally {
    stage = 'finally';
    try {
      singleFlight.release(lockKey, batchId);
    } catch (releaseError) {
      // 释放失败不得改变发送结果，只记录
      try {
        if (typeof console !== 'undefined' && typeof console.error === 'function') {
          console.error('[group-chat send] release failed', releaseError);
        }
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * M4：批次终态后关闭 localBatches 条目（仍保留到 TTL，rpcId 精确匹配可继续，弱匹配不再使用）
 * @param {SendDeps} deps
 * @param {string} batchId
 * @param {string} status
 * @param {() => number} now
 */
function markLocalBatchClosed(deps, batchId, status, now) {
  const batches = deps?.localBatches;
  if (!batches || typeof batches !== 'object') return;
  const entry = batches[batchId];
  if (!entry || typeof entry !== 'object') return;
  entry.closed = true;
  entry.status = status;
  entry.closedAt = typeof now === 'function' ? now() : Date.now();
}

/**
 * 失败时保留 console.error（诊断用；不改变状态机）
 * @param {any} error
 * @param {SendTarget} target
 * @param {string} requestId
 */
function logSendError(error, target, requestId) {
  try {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[group-chat send]', error, { target: target?.name, requestId });
    }
  } catch {
    /* 日志失败不影响发送结果 */
  }
}

/**
 * 交付状态事件（T2 可用于逐目标状态渲染）
 * @param {SendDeps} deps
 * @param {SendTarget} target
 * @param {'sending'|'sent'|'failed'} state
 * @param {string} [reason]
 * @param {string} [requestId]
 * @param {number} [attempt]
 */
function emitDelivery(deps, target, state, reason, requestId, attempt) {
  if (typeof deps.onDelivery !== 'function') return;
  try {
    deps.onDelivery({
      target: target.name,
      sessionId: target.sessionId,
      state,
      ...(reason ? { reason, error: reason, messageKey: failureInfo(reason).messageKey } : {}),
      requestId,
      attempt,
    });
  } catch {
    /* 订阅者异常不得打断发送 */
  }
}

/**
 * 读取批次登记（调试/对账用）
 * @param {string} clientBatchId
 * @param {Map<string, any>} [registry]
 * @returns {any}
 */
export function getBatchRecord(clientBatchId, registry = batchRegistry) {
  return registry.get(String(clientBatchId));
}

/**
 * 清空模块级状态（仅测试/热更新用）
 * @param {{singleFlight?: any, registry?: Map<string, any>}} [opts]
 */
export function resetSendState(opts = {}) {
  (opts.registry ?? batchRegistry).clear();
  const sf = opts.singleFlight ?? defaultSingleFlight;
  if (sf && typeof sf.clear === 'function') sf.clear();
}

/**
 * 结果 → echo 状态表（T2 可直接用于本地消息）
 * @param {SendResult} result
 * @returns {Record<string, DeliveryState>}
 */
export function deliveryStatesOf(result) {
  return deliveryStates(result?.deliveries ?? []);
}
