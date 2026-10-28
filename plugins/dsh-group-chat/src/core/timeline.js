// @ts-check
/**
 * 群聊数据内核 · 排序 / 合并 / 游标
 *
 * 契约来源：docs/architecture/group-chat-architecture.md
 *  - §4.3.1 排序键 `(time ASC, creationId→pairOrder, kindRank, sessionRank, sessionId, seq ASC)`
 *  - §4.3.1 同毫秒 kind 序：member_card < task_card < 普通消息
 *  - §4.5 ChannelCursor（offset/revision/oldestKey/newestKey）
 *
 * ⚠ 禁止用 createdAt 当事件时间；seq 可能是小数（S1），比较一律按浮点。
 */

import { KIND_RANK, KIND_RANK_DEFAULT, SESSION_RANK } from './constants.js';

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./model.js').ChannelCursor} ChannelCursor
 */

/**
 * @param {string} kind
 * @returns {number}
 */
export function kindRank(kind) {
  return KIND_RANK[kind] ?? KIND_RANK_DEFAULT;
}

/**
 * 会话/发送者 rank（lead=0, teammate=1, subagent=2, system=3；user 与 lead 同档）
 * @param {ChannelMessage} m
 * @returns {number}
 */
export function sessionRankOf(m) {
  const kind = m?.sender?.kind;
  if (kind === 'lead' || kind === 'user') return SESSION_RANK.lead;
  if (kind === 'teammate') return SESSION_RANK.teammate;
  if (kind === 'subagent') return SESSION_RANK.subagent;
  return SESSION_RANK.system;
}

/**
 * 稳定比较器（§4.3.1）。完全相等时用 id 兜底，保证确定性排序。
 * @param {ChannelMessage} a
 * @param {ChannelMessage} b
 * @returns {number}
 */
export function compareMessages(a, b) {
  const at = Number(a?.time ?? 0);
  const bt = Number(b?.time ?? 0);
  if (at !== bt) return at < bt ? -1 : 1;

  // v1.4：同 creationId 的欢迎提示(0) 必须先于 creator 带卡消息(1)
  const ac = a?.creationId;
  const bc = b?.creationId;
  if (ac && bc && ac === bc) {
    const ap = a?.pairOrder ?? 1;
    const bp = b?.pairOrder ?? 1;
    if (ap !== bp) return ap - bp;
  }

  const ak = kindRank(String(a?.kind ?? ''));
  const bk = kindRank(String(b?.kind ?? ''));
  if (ak !== bk) return ak - bk;

  const ar = sessionRankOf(a);
  const br = sessionRankOf(b);
  if (ar !== br) return ar - br;

  const as = String(a?.sessionId ?? '');
  const bs = String(b?.sessionId ?? '');
  if (as !== bs) return as < bs ? -1 : 1;

  const asq = Number(a?.seq ?? 0);
  const bsq = Number(b?.seq ?? 0);
  if (asq !== bsq) return asq < bsq ? -1 : 1;

  const aid = String(a?.id ?? '');
  const bid = String(b?.id ?? '');
  if (aid === bid) return 0;
  return aid < bid ? -1 : 1;
}

/**
 * 排序（返回新数组，不修改入参；确定性：同输入两次结果完全一致）
 * @param {ChannelMessage[]} messages
 * @returns {ChannelMessage[]}
 */
export function sortTimeline(messages) {
  return [...(Array.isArray(messages) ? messages : [])].sort(compareMessages);
}

/** T2 冻结的导出名（等价于 sortTimeline） */
export const sortMessages = sortTimeline;

/**
 * 游标 orderKey 编码（字符串可直接字典序比较；仅用于「最早/最新已加载」边界）
 * 注意：不编码 creationId/pairOrder（边界消息属于同一 creationId 的概率可忽略）。
 * @param {ChannelMessage} m
 * @returns {string}
 */
export function orderKey(m) {
  const time = String(Math.max(0, Math.floor(Number(m?.time ?? 0)))).padStart(16, '0');
  const kind = String(kindRank(String(m?.kind ?? ''))).padStart(2, '0');
  const rank = String(sessionRankOf(m)).padStart(2, '0');
  const seq = encodeSeq(Number(m?.seq ?? 0));
  return `${time}:${kind}:${rank}:${seq}:${String(m?.sessionId ?? '')}:${String(m?.id ?? '')}`;
}

/**
 * @param {number} seq 允许小数（浮点比较）
 * @returns {string}
 */
export function encodeSeq(seq) {
  if (!Number.isFinite(seq)) return '000000000000.000000';
  const neg = seq < 0 ? '-' : '';
  const abs = Math.abs(seq);
  const intPart = Math.floor(abs);
  const frac = abs - intPart;
  const fracStr = frac === 0 ? '' : frac.toFixed(6).slice(2);
  return `${neg}${String(intPart).padStart(12, '0')}.${fracStr.padEnd(6, '0')}`;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareOrderKey(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * 创建空游标（§4.5）
 * @param {string} channelId
 * @returns {ChannelCursor}
 */
export function makeCursor(channelId) {
  return { v: 1, channelId, offsets: {}, revisions: {} };
}

/**
 * 按 orderKey 过滤区间：afterKey < orderKey(m) <= beforeKey
 * @param {ChannelMessage[]} sorted
 * @param {{afterKey?: string, beforeKey?: string, limit?: number}} [opts]
 * @returns {ChannelMessage[]}
 */
export function sliceByOrder(sorted, opts = {}) {
  const { afterKey, beforeKey } = opts;
  const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : undefined;
  /** @type {ChannelMessage[]} */
  const out = [];
  for (const m of sorted) {
    const key = orderKey(m);
    if (afterKey !== undefined && compareOrderKey(key, afterKey) <= 0) continue;
    if (beforeKey !== undefined && compareOrderKey(key, beforeKey) > 0) continue;
    out.push(m);
    if (limit !== undefined && out.length >= limit) break;
  }
  return out;
}

/**
 * 合并两批已排序消息：按 id 去重（同 id 保留 seq 更大者，即「更新的同一事件」），再整体排序。
 * @param {ChannelMessage[]} existing
 * @param {ChannelMessage[]} incoming
 * @returns {{messages: ChannelMessage[], added: ChannelMessage[], updated: ChannelMessage[]}}
 */
export function mergeTimeline(existing, incoming) {
  const base = Array.isArray(existing) ? existing : [];
  const add = Array.isArray(incoming) ? incoming : [];
  /** @type {Map<string, ChannelMessage>} */
  const byId = new Map();
  for (const m of base) byId.set(m.id, m);
  /** @type {ChannelMessage[]} */
  const added = [];
  /** @type {ChannelMessage[]} */
  const updated = [];
  for (const m of add) {
    const prev = byId.get(m.id);
    if (!prev) {
      byId.set(m.id, m);
      added.push(m);
      continue;
    }
    if (Number(m.seq ?? 0) >= Number(prev.seq ?? 0) && m !== prev) {
      byId.set(m.id, m);
      updated.push(m);
    }
  }
  return { messages: sortTimeline([...byId.values()]), added, updated };
}

/**
 * 增量插入（单条 append ≤5ms 的快速路径）：在已排序数组中插到正确位置。
 * @param {ChannelMessage[]} sorted
 * @param {ChannelMessage} message
 * @returns {ChannelMessage[]} 新数组（含插入）
 */
export function insertInOrder(sorted, message) {
  const list = Array.isArray(sorted) ? sorted : [];
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compareMessages(list[mid], message) <= 0) lo = mid + 1;
    else hi = mid;
  }
  const next = list.slice();
  next.splice(lo, 0, message);
  return next;
}

/**
 * 更新游标中的会话偏移/revision（浮点 seq 比较，禁止整数断言）
 * @param {ChannelCursor} cursor
 * @param {string} sessionId
 * @param {number} seq
 * @param {number} [revision]
 * @returns {ChannelCursor}
 */
export function advanceOffset(cursor, sessionId, seq, revision) {
  const offsets = { ...(cursor.offsets ?? {}) };
  const prev = Number(offsets[sessionId] ?? -1);
  if (Number.isFinite(seq) && seq > prev) offsets[sessionId] = seq;
  cursor.offsets = offsets;
  if (typeof revision === 'number') {
    cursor.revisions = { ...(cursor.revisions ?? {}), [sessionId]: revision };
  }
  return cursor;
}

/**
 * 用一批消息刷新 oldestKey/newestKey
 * @param {ChannelCursor} cursor
 * @param {ChannelMessage[]} messages 已排序
 * @returns {ChannelCursor}
 */
export function refreshCursorKeys(cursor, messages) {
  const list = Array.isArray(messages) ? messages : [];
  if (list.length === 0) return cursor;
  const newest = orderKey(list[list.length - 1]);
  const oldest = orderKey(list[0]);
  if (!cursor.newestKey || compareOrderKey(newest, cursor.newestKey) > 0) cursor.newestKey = newest;
  if (!cursor.oldestKey || compareOrderKey(oldest, cursor.oldestKey) < 0) cursor.oldestKey = oldest;
  return cursor;
}

/**
 * 复制游标（适配器不得原地修改调用方游标；§4.5 契约要求 sync/pageOlder 返回新游标）
 * @param {ChannelCursor|undefined} cursor
 * @param {string} channelId
 * @returns {ChannelCursor}
 */
export function cloneCursor(cursor, channelId) {
  const base = cursor ?? makeCursor(channelId);
  return {
    v: 1,
    channelId: base.channelId ?? channelId,
    offsets: { ...(base.offsets ?? {}) },
    revisions: { ...(base.revisions ?? {}) },
    ...(base.oldestKey ? { oldestKey: base.oldestKey } : {}),
    ...(base.newestKey ? { newestKey: base.newestKey } : {}),
  };
}
