// @ts-check
/**
 * 群聊数据内核 · @ 提及与发送目标解析（D-A 可寻址集合）
 *
 * 契约来源：docs/architecture/group-chat-architecture.md
 *  - §5.1 目标解析（`targets = dedupe(['lead', ...mentions.filter(isAddressable)])`）
 *  - §5.1 D-A 可寻址：lead 恒可寻址；teammate 恒可寻址（含 inactive）；subagent 仅 running/provisioning
 *  - §5.1 无团队发送（D-C）：targets=['lead']，无多目标说明行
 *  - §5.2 顺序：`@lead` 必含且排第一，其后按成员目录顺序
 *
 * 语义边界（PRD F4）：**@ 只来自 chips**，正文里的字面 `@decorator` 不升级为提及；
 * `parseMentions` 仅用于「从文本恢复 chips / 高亮已有成员」，不作为发送目标来源。
 */

import { LIMITS } from './constants.js';
import { isAddressable, memberByName } from './roster.js';

/**
 * @typedef {import('./model.js').ChannelMember} ChannelMember
 */

/**
 * @typedef {Object} MentionQuery
 * @property {boolean} active        当前光标是否处于一个未完成的 @ 查询中
 * @property {string} query          已输入的名字片段（不含 @）
 * @property {number} start          `@` 在文本中的下标
 * @property {number} end            当前光标
 */

/**
 * 计算光标处的 @ 查询（输入法友好：只认「@ 前是空白/行首/常见分隔符」且中间无空白）。
 * @param {string} text
 * @param {number} caret
 * @returns {MentionQuery}
 */
export function computeMentionQuery(text, caret) {
  const s = typeof text === 'string' ? text : '';
  const pos = Math.max(0, Math.min(Number.isInteger(caret) ? caret : s.length, s.length));
  const before = s.slice(0, pos);
  const at = before.lastIndexOf('@');
  if (at < 0) return { active: false, query: '', start: -1, end: pos };
  const prev = at === 0 ? '' : before[at - 1];
  if (prev && !/[\s([{（【「,，、:：>]/.test(prev)) return { active: false, query: '', start: -1, end: pos };
  const query = before.slice(at + 1);
  if (/[\s]/.test(query)) return { active: false, query: '', start: -1, end: pos };
  return { active: true, query, start: at, end: pos };
}

/**
 * 从文本里恢复已存在的成员 @（仅用于 UI 高亮/chips 恢复，不用于发送目标）。
 * 展开规则：先按名字长度倒序匹配，命中后从扫描串中剔除，避免 `@ux` 命中 `@ux-designer`。
 * @param {string} text
 * @param {ChannelMember[]} members
 * @returns {string[]} 成员名（按出现顺序、去重）
 */
export function parseMentions(text, members) {
  const s = typeof text === 'string' ? text : '';
  const list = Array.isArray(members) ? members : [];
  const names = [];
  /** @type {Array<{name:string, at:number, len:number}>} */
  const hits = [];
  let haystack = s;
  const sorted = [...list].sort((a, b) => b.name.length - a.name.length);
  for (const m of sorted) {
    if (!m || !m.name) continue;
    const token = `@${m.name}`;
    let from = 0;
    for (;;) {
      const idx = haystack.indexOf(token, from);
      if (idx < 0) break;
      const after = haystack[idx + token.length] ?? '';
      const boundaryOk = after === '' || /[\s,，、。.;；:：!！?？)）\]】」]/.test(after);
      if (boundaryOk) {
        hits.push({ name: m.name, at: idx, len: token.length });
        // 用等长占位替换，保持下标不变（避免短名再命中长名内部）
        haystack = `${haystack.slice(0, idx)}${'\u0000'.repeat(token.length)}${haystack.slice(idx + token.length)}`;
        break; // 每个成员只记录首次出现
      }
      from = idx + 1;
    }
  }
  hits.sort((a, b) => a.at - b.at);
  for (const h of hits) if (!names.includes(h.name)) names.push(h.name);
  return names;
}

/**
 * @typedef {Object} MentionChip
 * @property {string} name
 */

/**
 * 目标解析结果
 * @typedef {Object} ResolveTargetsResult
 * @property {string[]} targets                 最终目标名（去重、lead 首位、成员目录序）
 * @property {string[]} targetSessionIds
 * @property {ChannelMember[]} targetMembers
 * @property {Array<{name: string, reason: 'unaddressable'|'unknown'|'overflow'}>} dropped
 * @property {boolean} noTeam                   D-C：当前为单 agent 会话
 * @property {boolean} hasFanout                targets.length > 1（需要注入同发前缀）
 * @property {string[]} notes                   UI 提示用的稳定 code：'member.leftNotSent' / 'targets.overflow'
 */

/**
 * 解析发送目标（§5.1）。
 *
 * `draft.mentions` 是 Composer 的 chips（**唯一可信提及来源**）；`draft.text` 仅在
 * `mentions` 未提供时用于恢复（UI 兼容用，不改变协议语义）。
 *
 * @param {{text?: string, mentions?: string[]}} draft
 * @param {ChannelMember[]} members
 * @param {{maxTargets?: number}} [opts]
 * @returns {ResolveTargetsResult}
 */
export function resolveTargets(draft, members, opts = {}) {
  const list = Array.isArray(members) ? members : [];
  const maxTargets = Math.max(1, opts.maxTargets ?? LIMITS.maxTargetsPerBatch);
  const noTeam = !list.some((m) => m.kind === 'teammate' || m.kind === 'subagent');
  const chipNames = Array.isArray(draft?.mentions)
    ? draft.mentions
    : parseMentions(draft?.text ?? '', list);

  /** @type {Array<{name: string, reason: 'unaddressable'|'unknown'|'overflow'}>} */
  const dropped = [];
  const notes = [];
  /** @type {ChannelMember[]} */
  const picked = [];
  const lead = list.find((m) => m.kind === 'lead');
  if (lead) picked.push(lead);

  /** @type {Set<string>} */
  const seen = new Set();
  for (const raw of chipNames) {
    if (typeof raw !== 'string') continue;
    const name = raw.trim().replace(/^@/, '');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    if (name === 'lead' || name === (lead?.name ?? 'lead')) continue; // lead 已恒含
    const member = memberByName(list, name);
    if (!member) {
      dropped.push({ name, reason: 'unknown' });
      notes.push('member.leftNotSent');
      continue;
    }
    if (!isAddressable(member)) {
      dropped.push({ name, reason: 'unaddressable' });
      notes.push('member.leftNotSent');
      continue;
    }
    picked.push(member);
  }

  // 按成员目录顺序排列（lead 已首位），再追加目录外的兜底目标
  const order = new Map(list.map((m, i) => [m.sessionId, i]));
  const ordered = [...picked].sort((a, b) => {
    if (a.kind === 'lead') return -1;
    if (b.kind === 'lead') return 1;
    return (order.get(a.sessionId) ?? 1e9) - (order.get(b.sessionId) ?? 1e9);
  });

  let finalMembers = ordered;
  if (ordered.length > maxTargets) {
    for (const extra of ordered.slice(maxTargets)) {
      dropped.push({ name: extra.name, reason: 'overflow' });
    }
    notes.push('targets.overflow');
    finalMembers = ordered.slice(0, maxTargets);
  }

  const targets = dedupeNames(finalMembers.map((m) => (m.kind === 'lead' ? 'lead' : m.name)));
  if (targets.length === 0) targets.push('lead');
  return {
    targets,
    targetSessionIds: finalMembers.map((m) => m.sessionId),
    targetMembers: finalMembers,
    dropped,
    noTeam,
    hasFanout: targets.length > 1,
    notes: [...new Set(notes)],
  };
}

/**
 * @ 补全候选（D-A 过滤）：lead + 全部 teammate（含 inactive）+ subagent（仅 running/provisioning）。
 * 排序：lead → teammate（目录序）→ subagent（目录序），同组内前缀命中优先。
 * @param {ChannelMember[]} members
 * @param {string} [query]
 * @returns {ChannelMember[]}
 */
export function filterMentionCandidates(members, query = '') {
  const q = String(query ?? '').trim().toLowerCase();
  const list = (Array.isArray(members) ? members : []).filter((m) => m && isAddressable(m));
  const rank = { lead: 0, teammate: 1, subagent: 2 };
  return list
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => {
      if (!q) return true;
      const name = m.name.toLowerCase();
      const display = String(m.displayName ?? '').toLowerCase();
      return name.startsWith(q) || display.includes(q) || name.includes(q);
    })
    .sort((a, b) => {
      const ra = rank[a.m.kind] ?? 9;
      const rb = rank[b.m.kind] ?? 9;
      if (ra !== rb) return ra - rb;
      return a.i - b.i;
    })
    .map(({ m }) => m);
}

/**
 * 目标名 → sessionId（名册反查；lead → channelId）
 * @param {string[]} targets
 * @param {ChannelMember[]} members
 * @param {string} channelId
 * @returns {string[]}
 */
export function resolveTargetSessionIds(targets, members, channelId) {
  const out = [];
  for (const raw of Array.isArray(targets) ? targets : []) {
    const name = String(raw).replace(/^@/, '');
    if (name === 'lead') {
      out.push(channelId);
      continue;
    }
    const m = memberByName(members, name);
    if (m) out.push(m.sessionId);
  }
  return out;
}

/**
 * 成员请求发送超限时的文案 code（UI i18n）
 * @param {number} count
 * @param {number} [max]
 * @returns {{ok: boolean, code?: string}}
 */
export function checkTargetCount(count, max = LIMITS.maxTargetsPerBatch) {
  if (count > max) return { ok: false, code: 'targets.overflow' };
  return { ok: true };
}

/**
 * @param {string[]} names
 * @returns {string[]}
 */
function dedupeNames(names) {
  const out = [];
  const seen = new Set();
  for (const n of names) {
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}
