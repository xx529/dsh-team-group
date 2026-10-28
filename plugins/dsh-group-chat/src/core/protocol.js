// @ts-check
/**
 * 群聊数据内核 · 同发协议（canonical 单点常量 + 解析/构造/剥离）
 *
 * 契约来源：docs/architecture/group-chat-architecture.md
 *  - §5.2 投递协议（V1.1-1 冻结：全角「：」「、」、@lead 必含且首位、仅 N>=2 注入）
 *  - §4.4 同发合并
 *
 * ⚠ 这是**协议文本**（给 agent 读），不是 UI 文案，不随 locale 变化（D-ARCH-08）。
 *   任何字节调整只改本文件 + 快照测试。
 */

import { PROTOCOL_VERSION } from './constants.js';

/** canonical 首行前缀字面量（唯一来源） */
const HEAD_PREFIX = '[群聊 · 同发] 收件人：';

/** canonical 第二行模板（唯一来源） */
const EXPLAIN_TEMPLATE = (/** @type {number} */ n) =>
  `（本消息由用户在「群聊」视图同时发送给上述 ${n} 位成员，各成员各自收到一份。）`;

/** 首行解析正则（与构造严格互逆） */
export const PARSE_HEAD = /^\[群聊 · 同发\] 收件人：(.+)$/;

/** 第二行解析正则（与构造严格互逆，N 为整数） */
export const PARSE_EXPLAIN =
  /^（本消息由用户在「群聊」视图同时发送给上述 (\d+) 位成员，各成员各自收到一份。）$/;

/**
 * canonical 常量的只读快照（快照测试用；任何字节变化都必须显式改这里）
 * @returns {{version:number, head:string, explain:string, headPrefix:string}}
 */
export function protocolSnapshot() {
  const names = ['lead', 'ux', 'backend'];
  return {
    version: PROTOCOL_VERSION,
    headPrefix: HEAD_PREFIX,
    head: buildHead(names),
    explain: buildExplain(names.length),
  };
}

/**
 * 构造首行：`[群聊 · 同发] 收件人：@lead、@ux、@backend`
 * @param {string[]} names 目标名（不含 @），调用方需保证 lead 在首位
 * @returns {string}
 */
export function buildHead(names) {
  if (!Array.isArray(names) || names.length === 0) {
    throw new TypeError('buildHead(names): names 必须是非空数组');
  }
  return `${HEAD_PREFIX}${names.map((n) => `@${n}`).join('、')}`;
}

/**
 * 构造第二行固定说明
 * @param {number} count 实发目标数
 * @returns {string}
 */
export function buildExplain(count) {
  if (!Number.isInteger(count) || count < 2) {
    throw new TypeError('buildExplain(count): count 必须是 >=2 的整数');
  }
  return EXPLAIN_TEMPLATE(count);
}

/**
 * 构造发送用 PromptContentPart 文本数组（§5.2 规则 2）
 *  - targets.length > 1 → [head, explain, body]
 *  - targets.length === 1 → [body]
 * @param {string[]} targets 目标名（不含 @；lead 在首位）
 * @param {string} body 用户正文（Markdown 源码，不转义）
 * @returns {string[]}
 */
export function buildParts(targets, body) {
  const text = typeof body === 'string' ? body : '';
  const names = dedupeTargets(targets);
  if (names.length <= 1) return [text];
  return [buildHead(names), buildExplain(names.length), text];
}

/**
 * 构造完整协议文本（复制/日志/弱对账用；发送请用 buildParts 保留 part 边界）
 * @param {string[]} targets
 * @param {string} body
 * @returns {string}
 */
export function buildText(targets, body) {
  return buildParts(targets, body).join('\n');
}

/**
 * 目标名去重（保序，去 `@` 前缀，去掉空与非法项）
 * @param {string[]} targets
 * @returns {string[]}
 */
export function dedupeTargets(targets) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(targets) ? targets : []) {
    if (typeof raw !== 'string') continue;
    const name = raw.trim().replace(/^@/, '');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * 从首行解析目标名数组
 * @param {string} line
 * @returns {{names: string[], raw: string[]} | null}
 */
function parseHeadNames(line) {
  const m = PARSE_HEAD.exec(line);
  if (!m) return null;
  const raw = m[1].split('、');
  const names = [];
  for (const token of raw) {
    const trimmed = token.trim();
    if (!trimmed.startsWith('@')) return null; // canonical 必须以 @ 开头，否则视为非协议
    const name = trimmed.slice(1).trim();
    if (!name) return null;
    names.push(name);
  }
  if (names.length === 0) return null;
  return { names, raw };
}

/**
 * 从 content parts（text 块数组）解析同发前缀。
 *
 * 严格口径（SC27）：只有 `parts[0]` 命中首行且 `parts[1]` 命中第二行才认为带前缀；
 * 解析成功 → text = parts[2..] 拼接（`\n`），targets = 首行解析结果，rawText = 全部原文。
 * 解析失败 → `ok:false`，调用方原样展示并标 `meta.prefixParseFailed`。
 *
 * @param {string[]} parts
 * @returns {{ok: boolean, targets: string[], text: string, rawText: string, declaredCount: number|null, reason?: string}}
 */
export function parseParts(parts) {
  const list = Array.isArray(parts) ? parts.filter((p) => typeof p === 'string') : [];
  const rawText = list.join('\n');
  if (list.length < 2) {
    return { ok: false, targets: [], text: rawText, rawText, declaredCount: null, reason: 'too-few-parts' };
  }
  const head = parseHeadNames(list[0]);
  if (!head) {
    return { ok: false, targets: [], text: rawText, rawText, declaredCount: null, reason: 'head-mismatch' };
  }
  const em = PARSE_EXPLAIN.exec(list[1]);
  if (!em) {
    return { ok: false, targets: [], text: rawText, rawText, declaredCount: null, reason: 'explain-mismatch' };
  }
  return {
    ok: true,
    targets: dedupeTargets(head.names),
    text: list.slice(2).join('\n'),
    rawText,
    declaredCount: Number(em[1]),
  };
}

/**
 * 解析单个已拼接字符串（旧构建 / 日志回放 / 弱对账用）。
 * 前两行命中 canonical → 剩余部分为正文；否则原样返回。
 * @param {string} text
 * @returns {{ok: boolean, targets: string[], text: string, rawText: string, declaredCount: number|null, reason?: string}}
 */
export function parseText(text) {
  const raw = typeof text === 'string' ? text : '';
  const nl = raw.indexOf('\n');
  if (nl < 0) {
    return { ok: false, targets: [], text: raw, rawText: raw, declaredCount: null, reason: 'single-line' };
  }
  const first = raw.slice(0, nl);
  const rest = raw.slice(nl + 1);
  const nl2 = rest.indexOf('\n');
  const second = nl2 < 0 ? rest : rest.slice(0, nl2);
  const body = nl2 < 0 ? '' : rest.slice(nl2 + 1);
  const head = parseHeadNames(first);
  const em = PARSE_EXPLAIN.exec(second);
  if (!head || !em) {
    return { ok: false, targets: [], text: raw, rawText: raw, declaredCount: null, reason: head ? 'explain-mismatch' : 'head-mismatch' };
  }
  return {
    ok: true,
    targets: dedupeTargets(head.names),
    text: body,
    rawText: raw,
    declaredCount: Number(em[1]),
  };
}

/**
 * 判断字符串/parts 是否带同发前缀
 * @param {string|string[]} input
 * @returns {boolean}
 */
export function hasProtocolPrefix(input) {
  if (Array.isArray(input)) return parseParts(input).ok;
  return parseText(/** @type {string} */ (input)).ok;
}

/**
 * 剥离同发前缀（渲染/复制用）。无前缀时原样返回。
 * @param {string|string[]} input
 * @returns {string}
 */
export function stripProtocol(input) {
  if (Array.isArray(input)) return parseParts(input).text;
  return parseText(/** @type {string} */ (input)).text;
}

/**
 * 前缀签名（同发归并的弱键之一，§4.4 刷新后丢失 batchId 时）
 * @param {string[]} targets 已去重目标名
 * @param {string} text 已剥前缀正文
 * @returns {string}
 */
export function fanoutSignature(targets, text) {
  return `${dedupeTargets(targets).join(',')}|${text}`;
}

/**
 * T2 冻结名：同发前缀（两行，`\n` 连接；targets<=1 返回空串）
 * @param {string[]} targets
 * @returns {string}
 */
export function buildFanoutPrefix(targets) {
  const names = dedupeTargets(targets);
  if (names.length <= 1) return '';
  return `${buildHead(names)}\n${buildExplain(names.length)}`;
}

/**
 * T2 冻结名：同发前缀 parts（发送时保留 part 边界）
 * @param {string[]} targets
 * @returns {string[]}
 */
export function buildFanoutPrefixParts(targets) {
  const names = dedupeTargets(targets);
  if (names.length <= 1) return [];
  return [buildHead(names), buildExplain(names.length)];
}
