// @ts-check
/**
 * 群聊数据内核 · 安全 Markdown 子集解析（B1 / F22 / 架构 §6.12）
 *
 * 纯函数、零依赖、**无 DOM / Node API / innerHTML**。
 * 支持：段落/换行、粗体 `**x**`、斜体 `*x*`、行内代码 `` `x` ``、围栏代码块 ```lang、
 *       无序/有序列表、GFM 表格、链接 `[t](url)`（仅 http/https/mailto）。
 * 不支持：原始 HTML、图片、引用、任务列表、脚注 → **降级为纯文本**（内容不丢、不报错）。
 * 解析异常时整段退回纯文本 `plain:true`。
 *
 * AST：
 *  document { children: MdBlock[] }
 *  inline: text{value} | strong{children} | em{children} | code{value} | link{url,children} | break
 *  block : paragraph{children} | code_block{lang,value} | list{ordered,start?,items} | list_item{children}
 *          | table{header:{cells,align}, rows:[[{children}]]}（GFM；v1.7.2：单元格 = {children:Inline[]}）
 */

import { LIMITS } from './constants.js';

/** 允许的链接 scheme（小写、含冒号） */
export const ALLOWED_LINK_SCHEMES = Object.freeze(['http:', 'https:', 'mailto:']);

/** Markdown 渲染文本硬上限（与 textRender 一致；超出截断并标 truncated） */
const MD_MAX_CHARS = LIMITS.textRender;

/**
 * HTML 实体转义（前端渲染 text 节点时用 textContent 即可；此函数用于纯文本降级/安全输出）
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 链接是否安全（仅白名单 scheme；拒绝控制字符/空白）
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  const raw = String(url ?? '').trim();
  if (!raw || /[\u0000-\u001f\u007f\s]/.test(raw)) return false;
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*:)/.exec(raw);
  if (!m) return false;
  return ALLOWED_LINK_SCHEMES.includes(m[1].toLowerCase());
}

/**
 * @typedef {{type: string, [k: string]: any}} MdNode
 */

/**
 * 解析 Markdown 文本为 AST
 * @param {string} text
 * @param {{maxChars?: number}} [options]
 * @returns {{type: 'document', children: MdNode[], plain: boolean, truncated: boolean}}
 */
export function parseMarkdown(text, options = {}) {
  const maxChars = Number.isFinite(options.maxChars) ? Number(options.maxChars) : MD_MAX_CHARS;
  let source = String(text ?? '').replace(/\r\n?/g, '\n');
  let truncated = false;
  if (source.length > maxChars) {
    source = source.slice(0, maxChars);
    truncated = true;
  }
  try {
    const children = parseBlocks(source.split('\n'));
    return { type: 'document', children, plain: false, truncated };
  } catch {
    // 解析异常：整段纯文本（内容不丢）
    const children = source
      ? [{ type: 'paragraph', children: source.split('\n').flatMap((line, i) => (i === 0 ? [{ type: 'text', value: line }] : [{ type: 'break' }, { type: 'text', value: line }])) }]
      : [];
    return { type: 'document', children, plain: true, truncated };
  }
}

const FENCE_RE = /^```([A-Za-z0-9_+.-]*)\s*$/;
const UL_RE = /^(\s*)([-*+])\s+(.*)$/;
const OL_RE = /^(\s*)(\d+)[.)]\s+(.*)$/;
const BLOCKQUOTE_RE = /^\s*>/;
/** 表格上限（v1.7.2 §6.12）：200 行 × 20 列 */
export const TABLE_MAX_ROWS = 200;
export const TABLE_MAX_COLS = 20;
const TABLE_SEP_CELL_RE = /^:?-+:?$/;
const TABLE_SEP_ROW_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const HEADING_RE = /^\s{0,3}#{1,6}\s+/;
const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;

/**
 * @param {string[]} lines
 * @returns {MdNode[]}
 */
function parseBlocks(lines) {
  /** @type {MdNode[]} */
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    const fence = FENCE_RE.exec(line);
    if (fence) {
      const lang = fence[1] || '';
      const body = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // 跳过结束围栏（未闭合则吞到结尾）
      blocks.push({ type: 'code_block', lang, value: body.join('\n') });
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // GFM 表格（表头 + 分隔行 + 数据行）；非法表格自然落回段落纯文本
    const table = tryParseTable(lines, i);
    if (table) {
      blocks.push(table.node);
      i = table.next;
      continue;
    }

    // 引用/标题/分隔线：不支持 → 纯文本段落（内容不丢）
    if (BLOCKQUOTE_RE.test(line) || HEADING_RE.test(line) || HR_RE.test(line)) {
      blocks.push(paragraphFromLines([line]));
      i += 1;
      continue;
    }

    // 列表（同类型连续行；任务列表 `- [ ]` 降级为普通文本项）
    const ul = UL_RE.exec(line);
    const ol = OL_RE.exec(line);
    if (ul || ol) {
      const ordered = Boolean(ol);
      const start = ol ? Number(ol[2]) : 1;
      /** @type {MdNode[]} */
      const items = [];
      while (i < lines.length) {
        const cur = lines[i];
        const mu = UL_RE.exec(cur);
        const mo = OL_RE.exec(cur);
        if (ordered ? !mo : !mu) break;
        const content = String((ordered ? mo[3] : mu[3]) ?? '');
        items.push({ type: 'list_item', children: [paragraphFromLines([content])] });
        i += 1;
      }
      blocks.push({ type: 'list', ordered, start, items });
      continue;
    }

    // 段落：连续非空、非块起始行，直到空行/围栏/列表
    /** @type {string[]} */
    const para = [];
    while (i < lines.length) {
      const cur = lines[i];
      if (cur.trim() === '') break;
      if (FENCE_RE.test(cur)) break;
      if (UL_RE.test(cur) || OL_RE.test(cur)) break;
      if (looksLikeTableStart(lines, i)) break;
      para.push(cur);
      i += 1;
    }
    if (para.length > 0) blocks.push(paragraphFromLines(para));
  }
  return blocks;
}

/**
 * 该行能否作为表格起始（表头 + 下一行分隔行）
 * @param {string[]} lines
 * @param {number} i
 * @returns {boolean}
 */
function looksLikeTableStart(lines, i) {
  const header = lines[i];
  const sep = lines[i + 1];
  if (typeof header !== 'string' || typeof sep !== 'string') return false;
  if (!hasUnescapedPipe(header)) return false;
  if (!TABLE_SEP_ROW_RE.test(sep)) return false;
  if (countColumns(header) !== countColumns(sep)) return false;
  return splitTableRow(sep).every((cell) => TABLE_SEP_CELL_RE.test(cell));
}

/**
 * @param {string} line
 * @returns {boolean}
 */
function hasUnescapedPipe(line) {
  const s = String(line);
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '\\') {
      i += 1;
      continue;
    }
    if (s[i] === '|') return true;
  }
  return false;
}

/**
 * 列数（按未转义管道切分；用于表头/分隔行列数对齐校验）
 * @param {string} line
 * @returns {number}
 */
function countColumns(line) {
  const s = String(line).trim();
  let start = s.startsWith('|') ? 1 : 0;
  let end = s.length;
  if (end > start && s.endsWith('|') && s[end - 2] !== '\\') end -= 1;
  let count = 1;
  let inCode = false;
  for (let i = start; i < end; i += 1) {
    const ch = s[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) count += 1;
  }
  return count;
}

/**
 * 切表格行：外层管道可省、`\|` 转义为字面管道、代码 span 内管道不切、单元格 trim
 * @param {string} line
 * @returns {string[]}
 */
function splitTableRow(line) {
  const s = String(line).trim();
  const cells = [];
  let buf = '';
  let i = s.startsWith('|') ? 1 : 0;
  const end = s.endsWith('|') && s[s.length - 2] !== '\\' ? s.length - 1 : s.length;
  let inCode = false;
  for (; i < end; i += 1) {
    const ch = s[i];
    if (ch === '\\' && s[i + 1] === '|') {
      buf += '|';
      i += 1;
      continue;
    }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) {
      cells.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  cells.push(buf.trim());
  return cells;
}

/**
 * 解析对齐行 → ['left'|'center'|'right'|null]
 * @param {string[]} sepCells
 * @returns {Array<'left'|'center'|'right'|null>}
 */
function parseTableAlign(sepCells) {
  return sepCells.map((cell) => {
    const c = cell.trim();
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (left) return 'left';
    if (right) return 'right';
    return null;
  });
}

/**
 * GFM 表格解析（合法才返回；非法 → null，调用方按段落纯文本降级）
 * @param {string[]} lines
 * @param {number} i
 * @returns {{node: MdNode, next: number}|null}
 */
function tryParseTable(lines, i) {
  if (!looksLikeTableStart(lines, i)) return null;
  const rawHeader = splitTableRow(lines[i]);
  const rawSep = splitTableRow(lines[i + 1]);
  if (rawHeader.length === 0 || rawHeader.length !== rawSep.length) return null;
  const cols = Math.min(rawHeader.length, TABLE_MAX_COLS);
  const align = parseTableAlign(rawSep).slice(0, cols);
  let truncated = rawHeader.length > TABLE_MAX_COLS;

  /** @type {Array<{children: MdNode[]}>} */
  const header = rawHeader.slice(0, cols).map((cell) => ({ children: parseInline(cell) }));
  /** @type {Array<Array<{children: MdNode[]}>>} */
  const rows = [];
  let j = i + 2;
  let seenRows = 0;
  while (j < lines.length) {
    const line = lines[j];
    if (line.trim() === '') break;
    if (FENCE_RE.test(line) || UL_RE.test(line) || OL_RE.test(line)) break;
    if (!hasUnescapedPipe(line)) break;
    if (seenRows >= TABLE_MAX_ROWS) {
      truncated = true;
      j += 1;
      continue;
    }
    const cells = splitTableRow(line);
    /** @type {Array<{children: MdNode[]}>} */
    const rowCells = [];
    for (let c = 0; c < cols; c += 1) rowCells.push({ children: parseInline(cells[c] ?? '') });
    rows.push(rowCells);
    seenRows += 1;
    j += 1;
  }
  return { node: { type: 'table', header: { cells: header, align }, rows, ...(truncated ? { truncated: true } : {}) }, next: j };
}

/**
 * @param {string[]} lines
 * @returns {MdNode}
 */
function paragraphFromLines(lines) {
  /** @type {MdNode[]} */
  const children = [];
  lines.forEach((line, idx) => {
    if (idx > 0) children.push({ type: 'break' });
    children.push(...parseInline(line));
  });
  return { type: 'paragraph', children };
}

/**
 * 行内解析：代码 → 粗体 → 斜体 → 链接；未知/不配对保留为 text
 * @param {string} line
 * @returns {MdNode[]}
 */
export function parseInline(line) {
  /** @type {MdNode[]} */
  const out = [];
  const s = String(line ?? '');
  let i = 0;
  let buf = '';
  const flush = () => {
    if (buf) {
      out.push({ type: 'text', value: buf });
      buf = '';
    }
  };
  while (i < s.length) {
    const ch = s[i];

    // 行内代码 `...`
    if (ch === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > i) {
        flush();
        out.push({ type: 'code', value: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
      buf += ch;
      i += 1;
      continue;
    }

    // 粗体 **...**
    if (ch === '*' && s[i + 1] === '*') {
      const end = s.indexOf('**', i + 2);
      if (end > i + 1) {
        flush();
        out.push({ type: 'strong', children: parseInline(s.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
      buf += '**';
      i += 2;
      continue;
    }

    // 斜体 *...*
    if (ch === '*') {
      const end = s.indexOf('*', i + 1);
      if (end > i + 1 && !s.slice(i + 1, end).includes('\n')) {
        flush();
        out.push({ type: 'em', children: parseInline(s.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
      buf += ch;
      i += 1;
      continue;
    }

    // 链接 [text](url)
    if (ch === '[') {
      const close = s.indexOf(']', i + 1);
      if (close > i && s[close + 1] === '(') {
        const endParen = s.indexOf(')', close + 2);
        if (endParen > close + 1) {
          const label = s.slice(i + 1, close);
          const url = s.slice(close + 2, endParen).trim();
          if (isSafeUrl(url)) {
            flush();
            out.push({ type: 'link', url, children: parseInline(label) });
            i = endParen + 1;
            continue;
          }
          // 非白名单 scheme：整段按纯文本（内容不丢）
          buf += s.slice(i, endParen + 1);
          i = endParen + 1;
          continue;
        }
      }
      buf += ch;
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

/**
 * AST/字符串 → 纯文本（保留换行；用于降级、摘要、搜索）
 * @param {string|{type: string, [k: string]: any}} input
 * @returns {string}
 */
export function markdownToPlainText(input) {
  if (typeof input === 'string') {
    const ast = parseMarkdown(input);
    return astToPlainText(ast).trim();
  }
  return astToPlainText(input).trim();
}

/**
 * @param {any} node
 * @returns {string}
 */
function astToPlainText(node) {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(astToPlainText).join('');
  switch (node.type) {
    case 'document':
      return (node.children ?? []).map(astToPlainText).join('\n\n');
    case 'paragraph':
      return (node.children ?? []).map(astToPlainText).join('');
    case 'text':
    case 'code':
      return String(node.value ?? '');
    case 'strong':
    case 'em':
    case 'link':
      return (node.children ?? []).map(astToPlainText).join('');
    case 'break':
      return '\n';
    case 'code_block':
      return String(node.value ?? '');
    case 'list':
      return (node.items ?? []).map(astToPlainText).join('\n');
    case 'table': {
      const headerCells = node.header?.cells ?? [];
      const lines = [headerCells, ...(node.rows ?? [])].map((cells) =>
        (cells ?? []).map((cell) => astToPlainText(cell?.children ?? cell).trim()).join(' | '),
      );
      return lines.join('\n');
    }
    case 'list_item':
      return (node.children ?? []).map(astToPlainText).join('\n');
    default:
      return node.value !== undefined ? String(node.value) : '';
  }
}
