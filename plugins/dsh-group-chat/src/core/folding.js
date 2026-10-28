// @ts-check
/**
 * 群聊数据内核 · 长文本折叠判定（§6.6 / UX D6）
 *
 * 规则：`> 400 字符` 或 `> 8 行`（先到者）→ 默认折叠。
 * 永不折叠：系统条、`已同时发送给…` 说明行、文件卡标题、消息头（由 UI 保证；本模块只给建议）。
 */

import { LIMITS } from './constants.js';

/**
 * 行数（末尾换行不计入空行）
 * @param {string} text
 * @returns {number}
 */
export function countLines(text) {
  const s = String(text ?? '');
  if (s === '') return 0;
  const normalized = s.endsWith('\n') ? s.slice(0, -1) : s;
  return normalized.split('\n').length;
}

/**
 * 折叠判定
 * @param {string} text
 * @param {{maxLines?: number, maxChars?: number}} [opts]
 * @returns {{collapsed: boolean, lines: number, chars: number, reason?: 'chars'|'lines'}}
 */
export function foldInfo(text, opts = {}) {
  const s = String(text ?? '');
  const maxLines = opts.maxLines ?? LIMITS.foldMaxLines;
  const maxChars = opts.maxChars ?? LIMITS.foldMaxChars;
  const lines = countLines(s);
  const chars = s.length;
  if (chars > maxChars) return { collapsed: true, lines, chars, reason: 'chars' };
  if (lines > maxLines) return { collapsed: true, lines, chars, reason: 'lines' };
  return { collapsed: false, lines, chars };
}

/**
 * @param {string} text
 * @param {{maxLines?: number, maxChars?: number}} [opts]
 * @returns {boolean}
 */
export function shouldFold(text, opts = {}) {
  return foldInfo(text, opts).collapsed;
}

/**
 * 折叠按钮文案参数（`查看全部（约 N 字）` 的 N，向上取整到 10）
 * @param {string} text
 * @returns {number}
 */
export function approximateChars(text) {
  const n = String(text ?? '').length;
  return Math.max(10, Math.ceil(n / 10) * 10);
}
