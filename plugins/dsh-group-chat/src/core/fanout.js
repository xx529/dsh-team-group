// @ts-check
/**
 * 群聊数据内核 · 同发（fan-out）合并与四态聚合（§4.4 / V1.1-2）
 *
 * 问题：一次同发 = N 次独立 prompt → N 个目标各产生一条 user/message（不同 id、不同 rpcId）。
 * 方案：按 `clientBatchId`（本地发送记录反查）或「前缀签名 + time±5min」归并；
 *       **只有 lead 会话那一份渲染为 M1 气泡**，其余副本进入 `deliveries`。
 * 若 lead 副本未到而其它副本先到：保留一份临时气泡（最早到达），lead 副本到达后按 batch/前缀合并。
 */

import { LIMITS } from './constants.js';
import { normalizeText } from './dedupe.js';

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./model.js').DeliveryState} DeliveryState
 */

/**
 * 四态聚合（V1.1-2）：全 sent → sent；部分失败 → partial；全失败 → failed；仍有在途 → sending。
 * @param {Record<string, DeliveryState>|undefined} deliveries
 * @returns {DeliveryState|undefined}
 */
export function aggregateDeliveryState(deliveries) {
  if (!deliveries) return undefined;
  const states = Object.values(deliveries);
  if (states.length === 0) return undefined;
  if (states.some((s) => s === 'sending')) return 'sending';
  const sent = states.filter((s) => s === 'sent').length;
  if (sent === states.length) return 'sent';
  if (sent === 0) return 'failed';
  return 'partial';
}

/**
 * 归并同发副本
 * @param {ChannelMessage[]} messages
 * @param {{leadSessionId?: string, weakWindowMs?: number}} [opts]
 * @returns {{messages: ChannelMessage[], merged: number, removedIds: string[]}}
 */
export function mergeFanout(messages, opts = {}) {
  const leadSessionId = String(opts.leadSessionId ?? '');
  const windowMs = opts.weakWindowMs ?? LIMITS.fanoutTimeWindowMs;
  const list = Array.isArray(messages) ? messages : [];

  /** @type {Array<{kind: 'echo'|'copy', msg: ChannelMessage, index: number, batchId?: string}>} */
  const candidates = [];
  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    if (!m || m.kind !== 'user') continue;
    const isEcho = m.meta?.localEcho === true || String(m.id).startsWith('local:');
    const isCopy = m.meta?.fanout === true;
    if (!isEcho && !isCopy) continue;
    const batchId = typeof m.clientBatchId === 'string' ? m.clientBatchId : typeof m.meta?.clientBatchId === 'string' ? m.meta.clientBatchId : undefined;
    candidates.push({ kind: isEcho ? 'echo' : 'copy', msg: m, index: i, batchId });
  }

  /** @type {Map<string, {echoes: ChannelMessage[], copies: ChannelMessage[]}>} */
  const groups = new Map();
  for (const c of candidates) {
    const batchId =
      c.batchId ??
      `sig:${(c.msg.targets ?? []).join(',')}|${normalizeText(c.msg.text)}|${Math.floor(Number(c.msg.time ?? 0) / windowMs)}`;
    if (!groups.has(batchId)) groups.set(batchId, { echoes: [], copies: [] });
    const g = groups.get(batchId);
    if (c.kind === 'echo') g.echoes.push(c.msg);
    else g.copies.push(c.msg);
  }

  /** @type {Set<string>} */
  const removedIds = new Set();
  let merged = 0;
  /** @type {Map<string, ChannelMessage>} */
  const replacements = new Map();

  for (const [batchId, g] of groups) {
    if (g.copies.length === 0 && g.echoes.length === 0) continue;
    if (g.copies.length <= 1 && g.echoes.length === 0) {
      const only = g.copies[0];
      if (only) normalizeSingleCopy(only, leadSessionId, batchId);
      continue;
    }
    const echo = g.echoes[0];
    /** @type {ChannelMessage|undefined} */
    const leadCopy = g.copies.find((m) => m.sessionId === leadSessionId);
    const primary = leadCopy ?? g.copies[0] ?? echo;
    if (!primary) continue;

    // deliveries：先继承本地 echo 的逐目标状态，再把已到达副本标 sent
    /** @type {Record<string, DeliveryState>} */
    const deliveries = { ...(echo?.deliveries ?? {}) };
    for (const copy of g.copies) {
      // 每条副本落在「收到它的那个会话」→ deliveries 以副本所在会话为 key
      const targetId = copy.sessionId;
      if (targetId) deliveries[targetId] = 'sent';
    }
    // 前缀声明的目标顺序（lead 首位）；targets 取并集保序
    /** @type {string[]} */
    const targets = [];
    for (const m of [primary, ...g.copies, ...g.echoes]) {
      for (const t of m.targets ?? []) if (t && !targets.includes(t)) targets.push(t);
    }
    /** @type {string[]} */
    const targetSessionIds = [];
    for (const m of [primary, ...g.copies, ...g.echoes]) {
      for (const id of m.targetSessionIds ?? []) if (id && !targetSessionIds.includes(id)) targetSessionIds.push(id);
    }

    if (!batchId.startsWith('sig:')) primary.clientBatchId = batchId;
    primary.deliveries = deliveries;
    primary.delivery = aggregateDeliveryState(deliveries);
    if (targets.length > 0) primary.targets = targets;
    if (targetSessionIds.length > 0) primary.targetSessionIds = targetSessionIds;
    primary.meta = {
      ...(echo?.meta ?? {}),
      ...(primary.meta ?? {}),
      fanout: true,
      localEcho: false,
      clientBatchId: batchId,
    };
    replacements.set(primary.id, primary);
    for (const m of [...g.copies, ...g.echoes]) {
      if (m === primary) continue;
      removedIds.add(m.id);
      merged += 1;
    }
    if (echo && echo !== primary) removedIds.add(echo.id);
  }

  /** @type {ChannelMessage[]} */
  const out = [];
  for (const m of list) {
    if (removedIds.has(m.id)) continue;
    out.push(replacements.get(m.id) ?? m);
  }
  return { messages: out, merged, removedIds: [...removedIds] };
}

/**
 * 单副本（lead 副本未到 / 或只有自身）：补齐 deliveries 与状态，不隐藏自身（临时气泡）
 * @param {ChannelMessage} m
 * @param {string} leadSessionId
 * @param {string} batchId
 */
function normalizeSingleCopy(m, leadSessionId, batchId) {
  if (m.meta?.fanout !== true) return;
  const targetId = m.sessionId;
  /** @type {Record<string, DeliveryState>} */
  const deliveries = { ...(m.deliveries ?? {}) };
  if (targetId) deliveries[targetId] = 'sent';
  m.deliveries = deliveries;
  m.delivery = aggregateDeliveryState(deliveries);
  m.clientBatchId = m.clientBatchId ?? (batchId.startsWith('sig:') ? undefined : batchId);
  m.meta = { ...(m.meta ?? {}), localEcho: false };
  // 单副本且不是 lead 会话：保留为临时气泡（lead 副本到达后由下一轮 merge 合并）
  if (leadSessionId && m.sessionId !== leadSessionId) {
    m.meta = { ...(m.meta ?? {}), temporary: true };
  }
}
