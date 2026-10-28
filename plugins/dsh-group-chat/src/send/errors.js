// @ts-check
/**
 * 群聊发送编排 · 错误分类与失败矩阵（架构 §5.5 + Spike S3）
 *
 * 约定：`reason` 是内部稳定码（T2 用 i18n key 渲染文案，不要直接展示 reason）；
 * `retryable` 决定「重试」按钮是否可用、以及 planRetry 是否把该目标纳入补发。
 */

/**
 * 失败矩阵（照抄架构 §5.5，并补充实现期发现的内部码）
 * @typedef {Object} FailureEntry
 * @property {boolean} retryable
 * @property {string} messageKey  i18n key（T2 文案）
 * @property {string} zh          canonical 中文兜底（core 不渲染，仅测试/降级）
 */

/** @type {Readonly<Record<string, FailureEntry>>} */
export const FAILURE_MATRIX = Object.freeze({
  network: { retryable: true, messageKey: 'send.error.network', zh: '发送失败：网络中断，已保留原文' },
  timeout: { retryable: true, messageKey: 'send.error.timeout', zh: '发送超时，已保留原文' },
  unaddressable: { retryable: false, messageKey: 'send.error.unaddressable', zh: '@{name} 已离开，未发送' },
  'parent-offline': { retryable: false, messageKey: 'send.error.parentOffline', zh: '子会话所属成员已离线，未发送' },
  'parent-unavailable': { retryable: true, messageKey: 'send.error.parentUnavailable', zh: '目标成员尚未唤醒，已跳过' },
  readonly: { retryable: false, messageKey: 'send.error.readonly', zh: '团队已结束，群聊为只读历史' },
  forbidden: { retryable: false, messageKey: 'send.error.forbidden', zh: '无权限向该成员发送' },
  'payload-too-large': { retryable: false, messageKey: 'send.error.payloadTooLarge', zh: '内容过长，请分段发送' },
  'rate-limited': { retryable: true, messageKey: 'send.error.rateLimited', zh: '发送过于频繁，请稍后重试' },
  aborted: { retryable: false, messageKey: 'send.error.aborted', zh: '发送已取消' },
  'session-missing': { retryable: false, messageKey: 'send.error.sessionMissing', zh: '会话不可用，未发送' },
  'empty-text': { retryable: false, messageKey: 'send.error.emptyText', zh: '消息不能为空' },
  'targets-overflow': { retryable: false, messageKey: 'send.error.targetsOverflow', zh: '收件人过多，请分批发送' },
  busy: { retryable: false, messageKey: 'send.busy', zh: '上一条消息还在发送中' },
  'channel-missing': { retryable: false, messageKey: 'send.error.channelMissing', zh: '当前会话不可用，无法发送' },
  'retry-exhausted': { retryable: false, messageKey: 'send.retryExhausted', zh: '重试次数已达上限' },
  unknown: { retryable: true, messageKey: 'send.error.unknown', zh: '发送失败，请重试' },
});

/** reason 全集（测试/断言用） */
export const FAILURE_REASONS = Object.freeze(Object.keys(FAILURE_MATRIX));

/**
 * @param {string} reason
 * @returns {FailureEntry}
 */
export function failureInfo(reason) {
  return FAILURE_MATRIX[reason] ?? FAILURE_MATRIX.unknown;
}

/**
 * 把任意异常/RemoteError 归类为失败矩阵 reason。
 * 兼容：字符串、Error（带 code/status/statusCode）、`{code}`、AbortError、超时标记。
 * @param {any} error
 * @param {{aborted?: boolean, timedOut?: boolean}} [hints]
 * @returns {string}
 */
export function classifyError(error, hints = {}) {
  if (hints.timedOut) return 'timeout';
  if (hints.aborted) return 'aborted';
  if (error === undefined || error === null) return 'unknown';
  if (typeof error === 'string') return classifyCode(error);
  if (typeof error === 'object') {
    // RemoteResult {ok:false,error} / 包装错误：先解包再分类
    if (error.ok === false) {
      return classifyError(error.error ?? error.errorMessage ?? error, hints);
    }
    if (error.name === 'AbortError') return 'aborted';
    if (error.timedOut === true || error.code === 'TIMEOUT' || error.code === 'gc/timeout') return 'timeout';
    const code = String(error.code ?? error.status ?? error.statusCode ?? '');
    const reason = classifyCode(code);
    if (reason !== 'unknown') return reason;
    const message = String(error.message ?? '');
    return classifyCode(message) === 'unknown' ? classifyMessage(message) : classifyCode(message);
  }
  return 'unknown';
}

/**
 * @param {string} value
 * @returns {string}
 */
function classifyCode(value) {
  const v = String(value).toLowerCase();
  if (!v) return 'unknown';
  if (v.includes('subagent/parent-unavailable') || v.includes('parent-unavailable')) return 'parent-unavailable';
  if (v.includes('parent-offline') || v.includes('parent offline')) return 'parent-offline';
  if (v.includes('readonly') || v === 'group-chat/readonly') return 'readonly';
  if (v === '403' || v.includes('forbidden') || v.includes('permission') || v.includes('unauthorized')) return 'forbidden';
  if (v.includes('payload') || v.includes('too-large') || v.includes('too large') || v === '413') return 'payload-too-large';
  if (v.includes('rate-limited') || v.includes('rate limit') || v === '429') return 'rate-limited';
  if (v === 'abort' || v.includes('aborted') || v.includes('abort')) return 'aborted';
  if (v.includes('timeout') || v.includes('timed out')) return 'timeout';
  if (v.includes('session-missing') || v.includes('session unavailable')) return 'session-missing';
  if (v.includes('unaddressable') || v.includes('member-left') || v.includes('member.left')) return 'unaddressable';
  if (v.includes('empty-text') || v.includes('empty message')) return 'empty-text';
  if (v.includes('targets-overflow') || v.includes('too many targets')) return 'targets-overflow';
  if (v.includes('retry-exhausted')) return 'retry-exhausted';
  if (v === 'busy' || v.includes('in-flight')) return 'busy';
  if (v.includes('network') || v.includes('transport') || v.includes('fetch') || v.includes('connection') || v.includes('offline')) return 'network';
  if (v.includes('ecONNREFUSED'.toLowerCase()) || v.includes('enotfound') || v.includes('econn')) return 'network';
  return 'unknown';
}

/**
 * @param {string} message
 * @returns {string}
 */
function classifyMessage(message) {
  const m = message.toLowerCase();
  if (m.includes('parent')) return 'parent-unavailable';
  if (m.includes('network') || m.includes('fetch') || m.includes('connection')) return 'network';
  if (m.includes('permission') || m.includes('forbidden')) return 'forbidden';
  return 'unknown';
}

/**
 * 生成单目标失败交付项（ deliveries 元素，T2 可直接消费）
 * @param {{name: string, sessionId?: string}} target
 * @param {string} reason
 * @param {{requestId?: string, attempt?: number, detail?: string}} [extra]
 * @returns {{target: string, sessionId: string, ok: false, error: string, reason: string, retryable: boolean, messageKey: string, requestId?: string, attempt?: number, detail?: string}}
 */
export function failedDelivery(target, reason, extra = {}) {
  const info = failureInfo(reason);
  return {
    target: target.name,
    sessionId: target.sessionId ?? '',
    ok: false,
    error: reason,
    reason,
    retryable: info.retryable,
    messageKey: info.messageKey,
    ...(extra.requestId ? { requestId: extra.requestId } : {}),
    ...(typeof extra.attempt === 'number' ? { attempt: extra.attempt } : {}),
    ...(extra.detail ? { detail: extra.detail } : {}),
    ...(extra.errorName ? { errorName: extra.errorName } : {}),
    ...(extra.errorMessage ? { errorMessage: extra.errorMessage } : {}),
    ...(extra.errorCode !== undefined && extra.errorCode !== null && extra.errorCode !== '' ? { errorCode: extra.errorCode } : {}),
    ...(extra.errorStatus !== undefined && extra.errorStatus !== null && extra.errorStatus !== '' ? { errorStatus: extra.errorStatus } : {}),
    ...(extra.errorStatusCode !== undefined && extra.errorStatusCode !== null && extra.errorStatusCode !== ''
      ? { errorStatusCode: extra.errorStatusCode }
      : {}),
  };
}

/**
 * 生成单目标成功交付项
 * @param {{name: string, sessionId?: string}} target
 * @param {{requestId?: string, attempt?: number}} [extra]
 * @returns {{target: string, sessionId: string, ok: true, error?: undefined, reason?: undefined, retryable?: undefined, requestId?: string, attempt?: number}}
 */
export function sentDelivery(target, extra = {}) {
  return {
    target: target.name,
    sessionId: target.sessionId ?? '',
    ok: true,
    ...(extra.requestId ? { requestId: extra.requestId } : {}),
    ...(typeof extra.attempt === 'number' ? { attempt: extra.attempt } : {}),
  };
}

/**
 * 失败原因 → 用户文案 key（T2 渲染）
 * @param {string} reason
 * @returns {string}
 */
export function messageKeyOf(reason) {
  return failureInfo(reason).messageKey;
}

/** detail/diagnostics 的安全 JSON 上限（字） */
export const DIAGNOSTIC_JSON_LIMIT = 500;

/**
 * 安全 JSON（循环引用/Error/BigInt 不抛错），并截断到 limit 字
 * @param {any} value
 * @param {number} [limit]
 * @returns {string}
 */
export function safeJson(value, limit = DIAGNOSTIC_JSON_LIMIT) {
  const seen = new WeakSet();
  /** @param {string} key @param {any} val */
  const replacer = (key, val) => {
    if (typeof val === 'bigint') return `${val}n`;
    if (val instanceof Error) {
      return {
        name: val.name,
        message: val.message,
        ...(val.code !== undefined ? { code: scalar(val.code) } : {}),
        ...(val.status !== undefined ? { status: scalar(val.status) } : {}),
        ...(val.statusCode !== undefined ? { statusCode: scalar(val.statusCode) } : {}),
        ...(val.cause ? { cause: val.cause } : {}),
      };
    }
    if (val && typeof val === 'object') {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
      if (Array.isArray(val)) return val;
      const out = {};
      for (const k of Object.keys(val)) {
        try {
          out[k] = val[k];
        } catch {
          out[k] = '[Unreadable]';
        }
      }
      return out;
    }
    if (typeof val === 'function') return '[Function]';
    return val;
  };
  let json;
  try {
    json = JSON.stringify(value, replacer);
  } catch {
    try {
      json = JSON.stringify({ name: 'UnserializableError', message: String(value) });
    } catch {
      json = '{"name":"UnserializableError","message":"<unknown>"}';
    }
  }
  if (typeof json !== 'string') json = String(json);
  return json.length > limit ? `${json.slice(0, Math.max(0, limit - 1))}…` : json;
}

/**
 * @param {any} value
 * @returns {any}
 */
function scalar(value) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

/**
 * 提取可直接展示/诊断的错误字段（兼容 Error / RemoteError / RemoteResult / 字符串 / 嵌套 error）
 * @param {any} input
 * @returns {{name: string, message: string, code?: any, status?: any, statusCode?: any, reason?: any, cause?: {name?: string, message?: string, code?: any}, [k: string]: any}}
 */
export function extractErrorInfo(input) {
  let value = input;
  // RemoteResult {ok:false,error}
  if (value && typeof value === 'object' && value.ok === false) {
    value = value.error ?? value.errorMessage ?? value.message ?? value;
  }
  // 双层包装：{error:{code,message}} / {data:{...}}（不覆盖已有 code/message）
  if (
    value &&
    typeof value === 'object' &&
    value.code === undefined &&
    value.message === undefined &&
    value.error &&
    typeof value.error === 'object'
  ) {
    value = value.error;
  }
  if (value === undefined || value === null) return { name: 'UnknownError', message: '' };
  if (typeof value === 'string') return { name: 'Error', message: cap(value, 300) };
  if (typeof value === 'number' || typeof value === 'boolean') {
    return { name: 'Error', message: String(value) };
  }
  if (typeof value !== 'object') return { name: 'Error', message: cap(String(value), 300) };

  /** @type {any} */
  const info = {
    name: cap(String(value.name ?? value.type ?? value.kind ?? 'RemoteError'), 80),
    message: cap(String(value.message ?? value.errorMessage ?? value.reason ?? value.detail ?? ''), 300),
  };
  for (const key of ['code', 'status', 'statusCode', 'reason', 'kind', 'target', 'sessionId', 'method']) {
    const v = value[key];
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') info[key] = scalar(v);
  }
  if (value.data !== undefined && typeof value.data !== 'object') info.data = scalar(value.data);
  if (value.cause) {
    const cause = value.cause;
    info.cause =
      cause instanceof Error || typeof cause === 'object'
        ? {
            name: String(cause.name ?? 'Error'),
            message: cap(String(cause.message ?? ''), 200),
            ...(cause.code !== undefined ? { code: scalar(cause.code) } : {}),
          }
        : { name: 'Error', message: cap(String(cause), 200) };
  }
  if (!info.code && info.cause?.code) info.code = info.cause.code;
  return info;
}

/**
 * 生成失败诊断：`detail` 为安全 JSON（≤500 字），`info` 为结构化字段
 * @param {any} error
 * @param {number} [limit]
 * @returns {{info: any, detail: string}}
 */
export function describeError(error, limit = DIAGNOSTIC_JSON_LIMIT) {
  const info = extractErrorInfo(error);
  return { info, detail: safeJson(info, limit) };
}

/**
 * 失败交付项追加诊断字段（基于 describeError 的结果）
 * @param {{name: string, sessionId?: string}} target
 * @param {string} reason
 * @param {any} error
 * @param {{requestId?: string, attempt?: number}} [extra]
 * @returns {{delivery: any, diagnostic: {target: string, sessionId: string, requestId?: string, attempt?: number, reason: string, errorName: string, code?: any, status?: any, message: string, detail: string}}}
 */
export function failedDeliveryWithDiagnostics(target, reason, error, extra = {}) {
  const { info, detail } = describeError(error);
  const delivery = failedDelivery(target, reason, {
    ...extra,
    detail,
    errorName: info.name,
    errorMessage: info.message,
    errorCode: info.code,
    errorStatus: info.status,
    errorStatusCode: info.statusCode,
  });
  return {
    delivery,
    diagnostic: {
      target: target.name,
      sessionId: target.sessionId ?? '',
      ...(extra.requestId ? { requestId: extra.requestId } : {}),
      ...(typeof extra.attempt === 'number' ? { attempt: extra.attempt } : {}),
      reason,
      errorName: info.name,
      ...(info.code !== undefined ? { code: info.code } : {}),
      ...(info.status !== undefined ? { status: info.status } : {}),
      message: info.message,
      detail,
    },
  };
}

/**
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function cap(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
