// @ts-check
/**
 * 群聊发送编排 · mode 选择与目标可用性预检（架构 §5.3 / Spike S3）
 *
 * **mode 契约（PRD §6.1/§6.3 冻结）**：所有目标统一 `'steer'`——插入最近 step 边界、不打断当前 step；
 * S3 实测 `steer` 也会唤醒 inactive/冷目标（区别只在 inbox 落点）。`queue` 同样会唤醒，但 PRD 已冻结
 * steer，v1 不提供双策略；如未来产品改口径，只需改本文件 `MODE_TABLE` / 调用方传入 `mode`（ADR 记录）。
 *
 * 为什么仍保留「lead vs 子会话」表：两者走同一个 `binding(id).session.prompt`，但**顺序**不同——
 * 必须「先 lead（顺带 resume 父链）→ 再成员」，否则子会话可能报 `subagent/parent-unavailable`（S3 硬约束）。
 */

/**
 * @typedef {import('./targets.js').SendTarget} SendTarget
 */

/** @type {Readonly<Record<string, 'steer'|'queue'>>} */
export const MODE_TABLE = Object.freeze({
  lead: 'steer',
  teammate: 'steer',
  subagent: 'steer',
  unknown: 'steer',
  system: 'steer',
});

/** 支持的 mode 值 */
export const SEND_MODES = Object.freeze(['steer', 'queue', 'inject']);

/**
 * 目标 mode（显式传入优先；否则按 kind 查表）
 * @param {SendTarget} target
 * @param {{mode?: string, strategy?: string}} [opts]
 * @returns {'steer'|'queue'|'inject'}
 */
export function resolveMode(target, opts = {}) {
  if (opts.mode && SEND_MODES.includes(opts.mode)) return /** @type {any} */ (opts.mode);
  if (opts.mode === 'auto') return 'steer';
  const kind = String(target?.kind ?? 'unknown');
  return MODE_TABLE[kind] ?? 'steer';
}

/**
 * 发送顺序：lead 优先，其余保持传入顺序（§5.3 4a/4b；禁止并行乱序）
 * @param {SendTarget[]} targets
 * @returns {SendTarget[]}
 */
export function orderByLeadFirst(targets) {
  const list = Array.isArray(targets) ? targets : [];
  const lead = list.find((t) => t.name === 'lead' || t.kind === 'lead');
  const rest = list.filter((t) => t !== lead);
  return lead ? [lead, ...rest] : rest.slice();
}

/**
 * 目标可用性预检（不发起网络；返回不可发送的原因码）
 * @param {SendTarget} target
 * @param {{readonly?: boolean, members?: import('../core/model.js').ChannelMember[], channelId?: string, isRunning?: (sessionId: string) => boolean}} [deps]
 * @returns {{sendable: boolean, reason?: string, detail?: string, warn?: string}}
 */
export function checkTargetAvailability(target, deps = {}) {
  if (deps.readonly === true) return { sendable: false, reason: 'readonly' };
  const name = String(target?.name ?? '');
  const sessionId = String(target?.sessionId ?? '');
  const members = Array.isArray(deps.members) ? deps.members : [];
  const member = members.find((m) => m.sessionId === sessionId) ?? members.find((m) => m.name === name);

  if (target?.addressable === false) return { sendable: false, reason: 'unaddressable', detail: name };
  if (target?.parentAvailable === false && (target?.kind === 'subagent' || member?.kind === 'subagent')) {
    return { sendable: false, reason: 'parent-offline', detail: name };
  }
  if (member && member.addressable === false) return { sendable: false, reason: 'unaddressable', detail: name };
  if (member && member.kind === 'subagent' && member.parentAvailable === false) {
    return { sendable: false, reason: 'parent-offline', detail: name };
  }
  if (!sessionId) {
    // lead 可用 channelId 兜底；其它成员没有 sessionId 说明名册映射失败
    if (name === 'lead' && deps.channelId) return { sendable: true };
    return { sendable: false, reason: 'unaddressable', detail: name };
  }
  // 离线不阻断（steer 会唤醒），只作为弱信号留给 UI
  const running = typeof target?.running === 'boolean' ? target.running : member?.status === 'running';
  const warn = running === false ? 'target-offline' : undefined;
  return { sendable: true, ...(warn ? { warn } : {}) };
}
