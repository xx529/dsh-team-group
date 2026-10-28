// @ts-check
/**
 * 群聊发送编排 · 目标归一化（兼容 T2 传入的两种形状）
 *
 * T2（frontend）实际传入：`targets: Array<{name, sessionId, kind, label}>`
 * 也兼容字符串数组（`['lead','ux','backend']`）与缺省（由 mentions + 成员目录解析）。
 *
 * 语义（架构 §5.1）：
 *  - targets 必须含 lead 且 lead 首位；未 @ 默认 Lead（由调用方 resolveTargets 保证，缺省时这里兜底）；
 *  - teammate 恒可寻址；subagent 仅 running/provisioning（若传入 addressable 字段则以它为准）；
 *  - 单批最多 LIMITS.maxTargetsPerBatch 个目标。
 */

import { LIMITS } from '../core/constants.js';
import { resolveTargets } from '../core/mentions.js';

/**
 * @typedef {Object} SendTarget
 * @property {string} name
 * @property {string} sessionId
 * @property {string} [kind]
 * @property {boolean} [addressable]
 * @property {boolean} [parentAvailable]
 * @property {boolean} [running]
 */

/**
 * @typedef {Object} NormalizeTargetsInput
 * @property {Array<string|{name?: string, label?: string, sessionId?: string, id?: string, kind?: string, addressable?: boolean, parentAvailable?: boolean, running?: boolean}>} [targets]
 * @property {string[]} [mentions]
 * @property {string} [text]
 * @property {import('../core/model.js').ChannelMember[]} [members]
 * @property {string} [channelId]
 * @property {number} [maxTargets]
 */

/**
 * @typedef {Object} NormalizeTargetsResult
 * @property {SendTarget[]} targets
 * @property {Array<{name: string, reason: string}>} dropped
 * @property {boolean} noTeam
 */

/**
 * @param {NormalizeTargetsInput} input
 * @returns {NormalizeTargetsResult}
 */
export function normalizeSendTargets(input) {
  const channelId = String(input.channelId ?? '');
  const members = Array.isArray(input.members) ? input.members : [];
  const maxTargets = Math.max(1, input.maxTargets ?? LIMITS.maxTargetsPerBatch);
  const raw = Array.isArray(input.targets) ? input.targets : [];

  /** @type {Array<{name: string, reason: string}>} */
  const dropped = [];
  /** @type {SendTarget[]} */
  let targets = [];
  /** @type {Set<string>} */
  const seen = new Set();

  for (const item of raw) {
    if (item === undefined || item === null) continue;
    /** @type {SendTarget|undefined} */
    let target;
    if (typeof item === 'string') {
      const name = item.trim().replace(/^@/, '');
      if (!name) continue;
      const member = members.find((m) => m.name === name);
      target = {
        name,
        sessionId: name === 'lead' ? channelId : String(member?.sessionId ?? ''),
        kind: member?.kind ?? (name === 'lead' ? 'lead' : 'unknown'),
        addressable: member?.addressable,
        parentAvailable: member?.parentAvailable,
        running: member?.status === 'running',
      };
    } else if (typeof item === 'object') {
      const name = String(item.name ?? item.label ?? item.sessionId ?? item.id ?? '')
        .trim()
        .replace(/^@/, '');
      const member = members.find((m) => m.name === name || (item.sessionId && m.sessionId === item.sessionId));
      const sessionId = String(item.sessionId ?? item.id ?? member?.sessionId ?? (name === 'lead' ? channelId : ''));
      target = {
        name: name || String(item.label ?? sessionId),
        sessionId,
        kind: item.kind ?? member?.kind ?? 'unknown',
        addressable: typeof item.addressable === 'boolean' ? item.addressable : member?.addressable,
        parentAvailable: typeof item.parentAvailable === 'boolean' ? item.parentAvailable : member?.parentAvailable,
        running: typeof item.running === 'boolean' ? item.running : member?.status === 'running',
      };
    }
    if (!target) continue;
    const key = target.sessionId || `name:${target.name}`;
    if (seen.has(key)) {
      dropped.push({ name: target.name, reason: 'duplicate' });
      continue;
    }
    seen.add(key);
    targets.push(target);
  }

  // 缺省：由 mentions + 成员目录解析（未 @ 默认 lead）
  if (targets.length === 0) {
    const resolved = resolveTargets(
      { text: input.text ?? '', mentions: input.mentions ?? [] },
      members,
      { maxTargets },
    );
    targets = resolved.targetMembers.map((m) => ({
      name: m.kind === 'lead' ? 'lead' : m.name,
      sessionId: m.sessionId,
      kind: m.kind,
      addressable: m.addressable,
      parentAvailable: m.parentAvailable,
      running: m.status === 'running',
    }));
    for (const d of resolved.dropped) dropped.push({ name: d.name, reason: d.reason });
    if (targets.length === 0 && channelId) targets = [{ name: 'lead', sessionId: channelId, kind: 'lead' }];
  }

  // lead 首位（只在 lead 存在时调整，避免 retry 子集被补上 lead）
  const leadIndex = targets.findIndex((t) => t.name === 'lead' || t.kind === 'lead');
  if (leadIndex > 0) {
    const [lead] = targets.splice(leadIndex, 1);
    targets.unshift(lead);
  }

  // 目标数上限
  if (targets.length > maxTargets) {
    for (const extra of targets.slice(maxTargets)) dropped.push({ name: extra.name, reason: 'overflow' });
    targets = targets.slice(0, maxTargets);
  }

  const noTeam = !members.some((m) => m.kind === 'teammate' || m.kind === 'subagent');
  return { targets, dropped, noTeam };
}

/**
 * 目标名列表（用于 canonical 前缀；lead 固定写作 `lead`）
 * @param {SendTarget[]} targets
 * @returns {string[]}
 */
export function targetNamesOf(targets) {
  return (Array.isArray(targets) ? targets : []).map((t) => t.name);
}

/**
 * 目标 → sessionId（lead 用 channelId 兜底）
 * @param {SendTarget} target
 * @param {string} channelId
 * @returns {string}
 */
export function sessionIdOf(target, channelId) {
  if (target.sessionId) return target.sessionId;
  return target.name === 'lead' ? String(channelId ?? '') : '';
}
