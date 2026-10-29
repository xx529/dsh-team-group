// @ts-check
/**
 * 群聊数据内核 · 50 行折叠测量（B1 / F29 / 架构 §6.17）
 *
 * 零依赖、无 DOM：按 **渲染后行数** 近似（段落换行 / 列表项 / 代码块内容行），
 * 供 UI 决定是否挂「展开全部（共 N 行）」。
 * 真实高度由 UI 用 useLayoutEffect 测量；本模块给出与 CSS 行高一致的近似口径：
 *   lineCount = Math.ceil(contentHeight / 22)（含代码块行，近似）。
 *
 * 不折叠（system 提示/欢迎/同发说明/卡片）由**调用方**决定，不在此处判断。
 */

import { LIMITS } from './constants.js';
import { parseMarkdown } from './markdown.js';

/** 默认折叠阈值（渲染行数） */
export const FOLD_MAX_LINES = 50;
/** 正文行高（px），与架构 §6.17 的 50×22=1100 一致 */
export const FOLD_LINE_HEIGHT = 22;
/**
 * 软换行估算：每行字符数（M1）。内核无 DOM，用字符数近似宽度：
 *  - CJK 与拉丁统一按 1 字符计，默认 40 字符/行；
 *  - UI 已知实际宽度/字号时可传更精确的 `charsPerLine`。
 */
export const FOLD_CHARS_PER_LINE = LIMITS.foldCharsPerLine;

/**
 * 行内节点字符长度（strong/em/link 递归取 children；code/text 取 value）
 * @param {any} node
 * @returns {number}
 */
function inlineLength(node) {
  if (!node) return 0;
  if (node.type === 'text' || node.type === 'code') return String(node.value ?? '').length;
  if (node.type === 'strong' || node.type === 'em' || node.type === 'link') {
    return (Array.isArray(node.children) ? node.children : []).reduce((sum, child) => sum + inlineLength(child), 0);
  }
  return 0;
}

/**
 * AST → 渲染行数（近似，M1：长段落按软换行计入）
 * @param {{type: string, [k: string]: any}|null|undefined} ast
 * @param {{charsPerLine?: number}} [options]
 * @returns {number}
 */
export function renderedLineCount(ast, options = {}) {
  if (!ast || typeof ast !== 'object') return 0;
  const charsPerLine =
    Number.isFinite(options.charsPerLine) && options.charsPerLine > 0
      ? Math.max(1, Math.floor(options.charsPerLine))
      : FOLD_CHARS_PER_LINE;
  if (ast.type === 'document') {
    return (Array.isArray(ast.children) ? ast.children : []).reduce(
      (sum, child) => sum + renderedLineCount(child, { charsPerLine }),
      0,
    );
  }
  if (ast.type === 'paragraph') {
    // 先按显式 break 分视觉行，再对每行做软换行估算
    /** @type {number[]} */
    const lengths = [0];
    for (const node of Array.isArray(ast.children) ? ast.children : []) {
      if (node && node.type === 'break') lengths.push(0);
      else lengths[lengths.length - 1] += inlineLength(node);
    }
    return lengths.reduce((sum, len) => sum + Math.max(1, Math.ceil(len / charsPerLine)), 0);
  }
  if (ast.type === 'code_block') {
    const value = String(ast.value ?? '');
    return value === '' ? 1 : value.split('\n').length;
  }
  if (ast.type === 'table') {
    // v1.7.2 §6.12：表格按 1（表头）+ 1（分隔行）+ 数据行 计入 50 行阈值
    return 2 + (Array.isArray(ast.rows) ? ast.rows.length : 0);
  }
  if (ast.type === 'list') {
    const items = Array.isArray(ast.items) ? ast.items : [];
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + Math.max(1, renderedLineCount(item, { charsPerLine })), 0);
  }
  if (ast.type === 'list_item') {
    const children = Array.isArray(ast.children) ? ast.children : [];
    const n = children.reduce((sum, child) => sum + renderedLineCount(child, { charsPerLine }), 0);
    return Math.max(1, n);
  }
  // 未知节点按 1 行
  return 1;
}

/**
 * 测量渲染行数（string → 解析 Markdown 再计；AST 直接计）
 * @param {string|{type: string, [k: string]: any}} input
 * @param {{charsPerLine?: number}} [options]
 * @returns {number}
 */
export function measureLines(input, options = {}) {
  if (typeof input === 'string') {
    if (input === '') return 0;
    return renderedLineCount(parseMarkdown(input), options);
  }
  return renderedLineCount(input, options);
}

/**
 * 折叠判定（默认 50 行）
 * @param {string|{type: string, [k: string]: any}} input
 * @param {{maxLines?: number, charsPerLine?: number}} [options]
 * @returns {{lineCount: number, folded: boolean, hiddenLines: number, canExpand: boolean, maxLines: number, lineHeight: number, maxHeight: number, charsPerLine: number}}
 */
export function foldInfo(input, options = {}) {
  const maxLines = Number.isFinite(options.maxLines) && options.maxLines > 0 ? Math.floor(options.maxLines) : FOLD_MAX_LINES;
  const charsPerLine =
    Number.isFinite(options.charsPerLine) && options.charsPerLine > 0 ? Math.floor(options.charsPerLine) : FOLD_CHARS_PER_LINE;
  const lineCount = measureLines(input, { charsPerLine });
  const folded = lineCount > maxLines;
  return {
    lineCount,
    folded,
    hiddenLines: folded ? lineCount - maxLines : 0,
    canExpand: folded,
    maxLines,
    lineHeight: FOLD_LINE_HEIGHT,
    maxHeight: maxLines * FOLD_LINE_HEIGHT,
    charsPerLine,
  };
}
