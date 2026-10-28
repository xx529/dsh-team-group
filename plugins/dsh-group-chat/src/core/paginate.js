// @ts-check
/**
 * 群聊数据内核 · 分页 / 内存上限 / 首屏（§4.5）
 *
 * - 首屏：全局最后 200 条（firstScreen）
 * - 向上分页：before=oldestKey，每页 50（pageSize）
 * - 内存上限 2000：从中间裁剪，保留首 200 + 最近 1800（避免用户正在读的位置被删）
 * - 每会话预取上限 400（防单个话多成员挤出他人）
 */

import { LIMITS } from './constants.js';
import { compareOrderKey, orderKey } from './timeline.js';

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./model.js').ChannelCursor} ChannelCursor
 * @typedef {import('./model.js').ChannelPage} ChannelPage
 * @typedef {import('./model.js').ChannelSnapshot} ChannelSnapshot
 */

/**
 * 首屏：已排序消息的最后 limit 条
 * @param {ChannelMessage[]} messages 已排序
 * @param {number} [limit]
 * @returns {ChannelMessage[]}
 */
export function firstScreen(messages, limit = LIMITS.firstScreen) {
  const list = Array.isArray(messages) ? messages : [];
  if (list.length <= limit) return list.slice();
  return list.slice(list.length - limit);
}

/**
 * 向上分页：orderKey < beforeKey 的最后 limit 条（返回仍按时间升序）
 * @param {ChannelMessage[]} messages 已排序
 * @param {string|undefined} beforeKey
 * @param {number} [limit]
 * @returns {ChannelMessage[]}
 */
export function pageOlder(messages, beforeKey, limit = LIMITS.pageSize) {
  const list = Array.isArray(messages) ? messages : [];
  const filtered = [];
  for (const m of list) {
    if (!beforeKey) {
      filtered.push(m);
      continue;
    }
    if (compareOrderKey(orderKey(m), beforeKey) < 0) filtered.push(m);
  }
  if (filtered.length <= limit) return filtered;
  return filtered.slice(filtered.length - limit);
}

/**
 * 内存裁剪：超出 max 时保留首 keepHead + 最近 (max-keepHead)，中间丢弃（§4.5）
 * @param {ChannelMessage[]} messages 已排序
 * @param {number} [max]
 * @param {number} [keepHead]
 * @returns {{messages: ChannelMessage[], trimmed: boolean, dropped: number}}
 */
export function capInMemory(messages, max = LIMITS.maxMessagesInMemory, keepHead = LIMITS.memoryKeepHead) {
  const list = Array.isArray(messages) ? messages : [];
  if (list.length <= max) return { messages: list, trimmed: false, dropped: 0 };
  const head = Math.min(keepHead, max);
  const tailCount = max - head;
  const out = [...list.slice(0, head), ...list.slice(list.length - tailCount)];
  return { messages: out, trimmed: true, dropped: list.length - max };
}

/**
 * 每会话预取：窗口尾部 limit 个事件（假设 events 已按 seq/time 升序）
 * @param {any[]} events
 * @param {number} [limit]
 * @returns {any[]}
 */
export function selectPrefetch(events, limit = LIMITS.perSessionPrefetch) {
  const list = Array.isArray(events) ? events : [];
  if (list.length <= limit) return list;
  return list.slice(list.length - limit);
}

/**
 * 是否还有更早消息（到顶判定）
 * @param {ChannelMessage[]} loaded
 * @param {boolean} [membersHasMore]
 * @returns {boolean}
 */
export function computeHasMore(loaded, membersHasMore = false) {
  return membersHasMore || (Array.isArray(loaded) ? loaded.length : 0) > 0;
}

/**
 * 首次打开后的游标：写 offsets/revisions/oldestKey/newestKey
 * @param {ChannelCursor} cursor
 * @param {ChannelMessage[]} pageMessages 已排序
 * @param {Record<string, number>} [revisions]
 * @returns {ChannelCursor}
 */
export function cursorAfterOpen(cursor, pageMessages, revisions = {}) {
  const page = Array.isArray(pageMessages) ? pageMessages : [];
  cursor.revisions = { ...revisions };
  if (page.length > 0) {
    cursor.oldestKey = orderKey(page[0]);
    cursor.newestKey = orderKey(page[page.length - 1]);
  }
  return cursor;
}

/**
 * 组装 ChannelPage（适配器统一出口）
 * @param {{channel: ChannelSnapshot, messages: ChannelMessage[], cursor: ChannelCursor, hasMore?: boolean, truncated?: boolean, now?: number}} input
 * @returns {ChannelPage}
 */
export function buildPage(input) {
  return {
    channel: input.channel,
    messages: input.messages,
    cursor: input.cursor,
    hasMore: input.hasMore === true,
    truncated: input.truncated === true,
    serverTime: input.now ?? Date.now(),
  };
}
