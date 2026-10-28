// @ts-check
/**
 * 群聊数据内核 · 三层去重（§4.3.3）
 *
 * ① 同会话双写：`agent/inbox/spliced.inserted[i].id` 与 `user/message.data.id` 同 id
 *    → 只保留 user/message，把 spliced 的 target/投递时间并入 meta。
 * ② fork/seed：继承前缀事件在 normalize 入口按 `session/end-seed` cutoff 丢弃；本层再做 id 全局去重兜底。
 * ③ 通知副本：`subagent-settled` 的 closing message == 子会话 agent_output → 保留子会话那条。
 *
 * 弱键（当前构建无 messageId，EVT §7.2 ③）：`(senderSessionId, targetSessionId, hash(text), time±5s)`，
 * 仅用于「发送记录 ↔ 接收副本」配对，**不用于合并两个真实发言**。
 * 注：无 crypto 依赖，用 FNV-1a 双种子代替 sha256（同一会话对 + ±5s 窗口下碰撞可忽略）。
 */

import { LIMITS } from './constants.js';

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 */

/**
 * 首选消息（同 id 冲突时）
 * @param {ChannelMessage} a
 * @param {ChannelMessage} b
 * @returns {ChannelMessage}
 */
export function preferMessage(a, b) {
  const aSpliced = a.meta?.fromSpliced === true;
  const bSpliced = b.meta?.fromSpliced === true;
  if (aSpliced !== bSpliced) return aSpliced ? b : a; // 优先 user/message（非 spliced）

  if (a.kind === 'agent_output' && b.kind === 'agent_output') {
    return Number(b.seq ?? 0) > Number(a.seq ?? 0) ? b : a;
  }
  if (a.kind === 'agent_to_agent' && b.kind === 'agent_to_agent') {
    const aHas = typeof a.meta?.messageId === 'string';
    const bHas = typeof b.meta?.messageId === 'string';
    if (aHas !== bHas) return aHas ? a : b;
  }
  return a;
}

/**
 * 把 loser 的 meta 并入 winner（winner 值优先）；不动 deliveries
 * @param {ChannelMessage} winner
 * @param {ChannelMessage} loser
 */
function mergeMeta(winner, loser) {
  if (!loser.meta) return;
  const { fromSpliced, ...rest } = loser.meta;
  winner.meta = { ...rest, ...(winner.meta ?? {}) };
}

/**
 * 去重主入口
 * @param {ChannelMessage[]} messages
 * @param {{leadSessionId?: string, weakWindowMs?: number}} [opts]
 * @returns {{messages: ChannelMessage[], removed: number, settlementsDropped: number, removedIds: string[]}}
 */
export function dedupeMessages(messages, opts = {}) {
  const weakWindowMs = opts.weakWindowMs ?? LIMITS.weakKeyTimeWindowMs;
  /** @type {Map<string, ChannelMessage>} */
  const byId = new Map();
  let removed = 0;
  for (const m of Array.isArray(messages) ? messages : []) {
    if (!m || !m.id) continue;
    const prev = byId.get(m.id);
    if (!prev) {
      byId.set(m.id, m);
      continue;
    }
    const winner = preferMessage(prev, m);
    const loser = winner === prev ? m : prev;
    mergeMeta(winner, loser);
    byId.set(m.id, winner);
    removed += 1;
  }

  /** @type {ChannelMessage[]} */
  const list = [...byId.values()];
  /** @type {string[]} */
  const removedIds = [];

  // ③ 通知副本：settlement 与子会话 agent_output 同文 → 去掉 settlement
  const outputs = list.filter((m) => m.kind === 'agent_output');
  let settlementsDropped = 0;
  for (const m of list) {
    if (!m || m.meta?.copy !== 'settlement') continue;
    const closing = normalizeText(String(m.meta?.closingText ?? ''));
    if (!closing) continue;
    const senderSessionId = String(m.meta?.senderSessionId ?? m.sender?.sessionId ?? '');
    const hit = outputs.find(
      (o) =>
        String(o.sender?.sessionId ?? '') === senderSessionId &&
        Math.abs(Number(o.time ?? 0) - Number(m.time ?? 0)) <= weakWindowMs &&
        normalizeText(o.text) === closing,
    );
    if (hit) {
      m.meta = { ...(m.meta ?? {}), droppedReason: 'settlement-copy' };
      removedIds.push(m.id);
      settlementsDropped += 1;
    }
  }
  /** @type {ChannelMessage[]} */
  const out = list.filter((m) => !removedIds.includes(m.id));

  // ② fork/seed id 去重兜底：id 相同已在上面处理；此处统计继承会话重复（不同会话同消息）
  // 说明：fork 复制事件与原事件 id 相同（同一 user/message data.id），故 byId 已收敛。
  return { messages: out, removed, settlementsDropped, removedIds };
}

/**
 * 归一化文本（弱键/去重比较用）
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * FNV-1a 32bit（双种子拼接成 16 hex）
 * @param {string} text
 * @returns {string}
 */
export function hashText(text) {
  const s = String(text ?? '');
  const h1 = fnv1a(s, 0x811c9dc5);
  const h2 = fnv1a(s, 0x01000193);
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/**
 * @param {string} text
 * @param {number} seed
 * @returns {number}
 */
function fnv1a(text, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * 弱键（§4.3.3 ③）：发送记录 ↔ 接收副本配对；不用于合并真实发言。
 * @param {{sessionId?: string, sender?: {sessionId?: string}, text?: string, time?: number}} message
 * @param {string} [targetSessionId]
 * @param {number} [windowMs]
 * @returns {string}
 */
export function weakKeyOf(message, targetSessionId = '', windowMs = LIMITS.weakKeyTimeWindowMs) {
  const senderSessionId = String(message?.sender?.sessionId ?? message?.sessionId ?? '');
  const time = Number(message?.time ?? 0);
  const bucket = Math.floor(time / windowMs);
  return `${senderSessionId}|${targetSessionId}|${hashText(normalizeText(message?.text ?? ''))}|${bucket}`;
}

/**
 * 弱键配对（返回成对的 index；只配对「有明确 copy 标识」的副本，避免误合并真实发言）
 * @param {ChannelMessage[]} messages
 * @param {{windowMs?: number}} [opts]
 * @returns {Array<{keep: number, drop: number}>}
 */
export function pairNotificationCopies(messages, opts = {}) {
  const windowMs = opts.windowMs ?? LIMITS.weakKeyTimeWindowMs;
  const list = Array.isArray(messages) ? messages : [];
  /** @type {Array<{keep: number, drop: number}>} */
  const pairs = [];
  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    if (m.meta?.copy !== 'settlement') continue;
    for (let j = 0; j < list.length; j += 1) {
      if (i === j) continue;
      const o = list[j];
      if (o.kind !== 'agent_output') continue;
      if (o.sender?.sessionId !== m.meta?.senderSessionId) continue;
      if (Math.abs(o.time - m.time) > windowMs) continue;
      if (normalizeText(o.text) !== normalizeText(String(m.meta?.closingText ?? ''))) continue;
      pairs.push({ keep: j, drop: i });
      break;
    }
  }
  return pairs;
}
