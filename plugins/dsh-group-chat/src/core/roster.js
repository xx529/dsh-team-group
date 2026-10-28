// @ts-check
/**
 * 群聊数据内核 · 成员目录合成与频道快照
 *
 * 契约来源：docs/architecture/group-chat-architecture.md
 *  - §4.1 ChannelMember / ChannelSnapshot
 *  - §4.8.2 成员目录合成算法（roster + sessions.list + subagent/catalog 三源并集）
 *  - §5.1 D-A 可寻址集合
 *  - §4.8.2 截断策略（teammate 永不截断；depth<=3、sessions<=32；必须可见）
 *
 * 纯函数：输入全部来自参数，不读 ctx / DOM。
 */

import { LIMITS, MEMBER_FALLBACK_NAME, SESSION_RANK } from './constants.js';

/**
 * @typedef {import('./model.js').ChannelMember} ChannelMember
 * @typedef {import('./model.js').ChannelSnapshot} ChannelSnapshot
 * @typedef {import('./model.js').MemberStatus} MemberStatus
 * @typedef {import('./model.js').ChannelTruncation} ChannelTruncation
 */

/**
 * @typedef {Object} RosterSources
 * @property {string} leadSessionId
 * @property {{model?: string, status?: string, name?: string}} [lead]
 * @property {any} [agentTeam]                     client 投影 `values.agentTeam`（`{members:[...]}` 或数组）
 * @property {any[]} [sessionSummaries]            `sessions.list.byId` 的值数组
 * @property {any[]} [catalogEntries]              `subagent/catalog` 归一化条目 `{childId,label,mode,childCreatedAt,sessionId,parentSessionId}`
 * @property {Record<string, {label?: string, mode?: string, agentModel?: string, provider?: string}>} [descriptors]
 * @property {boolean} [noRoster]                  投影缺失
 * @property {number} [maxDepth]
 * @property {number} [maxSessions]
 * @property {number} [maxMembers]
 */

/**
 * @typedef {Object} RosterResult
 * @property {ChannelMember} lead
 * @property {ChannelMember[]} members
 * @property {number} runningCount
 * @property {ChannelTruncation} [truncated]
 * @property {'no-roster'|'lead-only'} [degraded]
 * @property {string[]} warnings
 */

/**
 * 成员状态归一化
 * @param {unknown} raw
 * @returns {MemberStatus}
 */
export function normalizeMemberStatus(raw) {
  switch (raw) {
    case 'running':
      return 'running';
    case 'inactive':
    case 'idle':
    case 'done':
    case 'completed':
      return 'inactive';
    case 'provisioning':
    case 'starting':
      return 'provisioning';
    case 'failed':
    case 'error':
      return 'failed';
    default:
      return 'unknown';
  }
}

/**
 * D-A 可寻址判定：lead/teammate 恒 true；subagent 仅 running/provisioning。
 * @param {{kind: string, status: MemberStatus}} member
 * @returns {boolean}
 */
export function isAddressable(member) {
  if (member.kind === 'lead' || member.kind === 'teammate') return true;
  if (member.kind === 'subagent') {
    return member.status === 'running' || member.status === 'provisioning';
  }
  return false;
}

/**
 * 合成成员目录（三源并集 + 截断 + 显示名）。
 * @param {RosterSources} sources
 * @returns {RosterResult}
 */
export function deriveRoster(sources) {
  const maxDepth = sources.maxDepth ?? LIMITS.maxDepth;
  const maxSessions = sources.maxSessions ?? LIMITS.maxSessions;
  const maxMembers = sources.maxMembers ?? LIMITS.maxMembers;
  const warnings = /** @type {string[]} */ ([]);

  /** @type {ChannelMember[]} */
  const members = [];
  /** @type {Map<string, ChannelMember>} */
  const byId = new Map();

  const push = (m) => {
    if (!m || !m.sessionId || byId.has(m.sessionId) || members.length >= maxMembers) return false;
    byId.set(m.sessionId, m);
    members.push(m);
    return true;
  };

  const leadStatus = normalizeMemberStatus(sources.lead?.status ?? 'running');
  /** @type {ChannelMember} */
  const lead = {
    sessionId: sources.leadSessionId,
    name: sources.lead?.name ?? 'lead',
    displayName: 'Lead',
    kind: 'lead',
    depth: 0,
    status: leadStatus === 'unknown' ? 'running' : leadStatus,
    model: sources.lead?.model,
    addressable: true,
    readable: true,
    badge: 'lead',
  };
  push(lead);

  /** @type {any[]} */
  let rosterMembers = [];
  if (Array.isArray(sources.agentTeam?.members)) rosterMembers = sources.agentTeam.members;
  else if (Array.isArray(sources.agentTeam)) rosterMembers = sources.agentTeam;

  const noRoster = sources.noRoster === true || rosterMembers.length === 0;
  if (noRoster) warnings.push('no-roster');

  /** @type {Map<string, {running?: boolean, status?: string}>} */
  const summaryById = new Map(
    (Array.isArray(sources.sessionSummaries) ? sources.sessionSummaries : []).map((summary) => [String(summary?.id ?? ''), summary]),
  );
  /** @type {Map<string, ChannelMember>} */
  const teammateBySession = new Map();
  for (const raw of rosterMembers) {
    if (!raw) continue;
    if (raw.role === 'lead' || raw.target === 'lead' || raw.name === 'lead') continue;
    const sessionId = String(raw.id ?? raw.sessionId ?? raw.target ?? '');
    if (!sessionId) continue;
    const summary = summaryById.get(sessionId);
    const baseStatus = normalizeMemberStatus(raw.status);
    const status =
      summary && typeof summary.running === 'boolean' && baseStatus !== 'failed' && baseStatus !== 'provisioning'
        ? /** @type {MemberStatus} */ (summary.running ? 'running' : 'inactive')
        : baseStatus;
    const member = {
      sessionId,
      name: String(raw.name ?? raw.target ?? MEMBER_FALLBACK_NAME),
      displayName: String(raw.name ?? raw.target ?? MEMBER_FALLBACK_NAME),
      kind: /** @type {'teammate'} */ ('teammate'),
      parentSessionId: sources.leadSessionId,
      depth: 1,
      status,
      description: typeof raw.description === 'string' ? raw.description : undefined,
      model: typeof raw.model === 'string' ? raw.model : undefined,
      addressable: true,
      readable: raw.readable !== false,
      badge: /** @type {'teammate'} */ ('teammate'),
    };
    if (push(member)) teammateBySession.set(sessionId, member);
  }

  // 补 roster 漏掉的 direct children（sessions.list.byId[*].parentSessionId === lead）
  // 注意：带 subagent/catalog 的直接子会话是 subagent，不是 teammate（EVT §5.1 判定规则）
  const catalogued = new Set(
    (Array.isArray(sources.catalogEntries) ? sources.catalogEntries : [])
      .map((c) => String(c?.childId ?? c?.id ?? ''))
      .filter(Boolean),
  );
  for (const s of Array.isArray(sources.sessionSummaries) ? sources.sessionSummaries : []) {
    if (!s) continue;
    const sid = String(s.id ?? s.sessionId ?? '');
    if (!sid || sid === sources.leadSessionId) continue;
    const parentId = String(s.parentSessionId ?? s.parentSession ?? s.subagent?.address?.parentSessionId ?? '');
    if (parentId !== sources.leadSessionId) continue;
    if (teammateBySession.has(sid)) continue;
    if (catalogued.has(sid)) continue;
    const desc = sources.descriptors?.[sid];
    const member = {
      sessionId: sid,
      name: desc?.label ? shortenLabel(desc.label) : MEMBER_FALLBACK_NAME,
      displayName: desc?.label ? shortenLabel(desc.label) : MEMBER_FALLBACK_NAME,
      kind: /** @type {'teammate'} */ ('teammate'),
      parentSessionId: sources.leadSessionId,
      depth: 1,
      status:
        typeof s.running === 'boolean'
          ? /** @type {MemberStatus} */ (s.running ? 'running' : 'inactive')
          : normalizeMemberStatus(s.status ?? 'unknown'),
      description: s.agentName ?? undefined,
      model: desc?.agentModel ?? s.model,
      addressable: true,
      readable: s.readable !== false,
      badge: /** @type {'teammate'} */ ('teammate'),
    };
    if (push(member)) teammateBySession.set(sid, member);
  }

  // subagent：catalog 为主（可自 member 会话递归），sessions.list 的 parentSessionId 补漏
  /** @type {Array<{childId:string,label?:string,mode?:string,createdAt:number,parentSessionId:string}>} */
  const subCandidates = [];
  for (const c of Array.isArray(sources.catalogEntries) ? sources.catalogEntries : []) {
    if (!c) continue;
    const childId = String(c.childId ?? c.id ?? '');
    if (!childId) continue;
    const parentSessionId = String(c.parentSessionId ?? c.sessionId ?? sources.leadSessionId);
    subCandidates.push({
      childId,
      label: c.label,
      mode: c.mode,
      createdAt: Number(c.childCreatedAt ?? c.createdAt ?? 0),
      parentSessionId,
    });
  }
  for (const s of Array.isArray(sources.sessionSummaries) ? sources.sessionSummaries : []) {
    if (!s) continue;
    const sid = String(s.id ?? s.sessionId ?? '');
    if (!sid || sid === sources.leadSessionId || teammateBySession.has(sid) || byId.has(sid)) continue;
    const parentId = String(s.parentSessionId ?? s.parentSession ?? s.subagent?.address?.parentSessionId ?? '');
    if (!parentId || !byId.has(parentId)) continue;
    if (subCandidates.some((c) => c.childId === sid)) continue;
    // 只有「父会话不是 lead」时这里才必然不是 teammate（teammate 已由 roster 覆盖）
    if (parentId === sources.leadSessionId && !noRoster) continue;
    subCandidates.push({
      childId: sid,
      label: s.subagent?.label ?? s.label,
      mode: s.subagent?.mode ?? s.mode,
      createdAt: Number(s.createdAt ?? s.subagent?.createdAt ?? 0),
      parentSessionId: parentId,
    });
  }

  // 截断：先保全部 teammate，再按 (depth 升序, createdAt 倒序) 补 subagent
  /** @type {ChannelTruncation|undefined} */
  let truncated;
  let depthCapHit = false;
  const accepted = [];
  const skipped = [];
  for (const cand of subCandidates) {
    const parent = byId.get(cand.parentSessionId);
    if (!parent) {
      skipped.push(cand);
      continue;
    }
    const depth = parent.depth + 1;
    if (depth > maxDepth) {
      depthCapHit = true;
      skipped.push(cand);
      continue;
    }
    accepted.push({ ...cand, depth, parent });
  }
  accepted.sort((a, b) => a.depth - b.depth || b.createdAt - a.createdAt);
  for (const cand of accepted) {
    if (members.length >= Math.min(maxSessions, maxMembers)) {
      skipped.push(cand);
      continue;
    }
    const desc = sources.descriptors?.[cand.childId];
    const status = deriveSubagentStatus(cand, sources);
    const label = cand.label ?? desc?.label;
    const name = label ? shortenLabel(label) : MEMBER_FALLBACK_NAME;
    const displayName = `${label ? shortenLabel(label) : MEMBER_FALLBACK_NAME} · ${cand.parent.displayName} 的子体`;
    const member = {
      sessionId: cand.childId,
      name,
      displayName,
      kind: /** @type {'subagent'} */ ('subagent'),
      parentSessionId: cand.parentSessionId,
      depth: cand.depth,
      status,
      description: label,
      model: desc?.agentModel,
      addressable: isAddressable({ kind: 'subagent', status }),
      parentAvailable: cand.parent.status === 'running' || cand.parent.status === 'inactive',
      readable: true,
      badge: /** @type {'subagent'} */ ('subagent'),
    };
    push(member);
  }

  if (skipped.length > 0) {
    truncated = {
      omittedSubagents: skipped.length,
      maxDepth,
      maxSessions,
      reason: depthCapHit ? 'depth-cap' : 'session-cap',
    };
    warnings.push(`truncated:${truncated.reason}`);
  }

  // 排序：lead → teammate（roster 序）→ subagent（depth 升序, 创建序）
  members.sort((a, b) => {
    const ra = SESSION_RANK[a.kind] ?? 9;
    const rb = SESSION_RANK[b.kind] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.depth !== b.depth) return a.depth - b.depth;
    return 0;
  });

  const runningCount = members.filter((m) => m.status === 'running').length;
  return {
    lead,
    members,
    runningCount,
    truncated,
    degraded:
      noRoster || rosterMembers.length === 0
        ? members.length > 1
          ? /** @type {'no-roster'} */ ('no-roster')
          : /** @type {'lead-only'} */ ('lead-only')
        : undefined,
    warnings,
  };
}

/**
 * subagent 状态：优先会话运行态，其次 catalog.mode（one-shot 已完成 → inactive）。
 * @param {{mode?: string, createdAt: number}} cand
 * @param {RosterSources} sources
 * @returns {MemberStatus}
 */
function deriveSubagentStatus(cand, sources) {
  const summary = (Array.isArray(sources.sessionSummaries) ? sources.sessionSummaries : []).find(
    (s) => s && String(s.id ?? s.sessionId) === cand.childId,
  );
  if (summary) {
    if (summary.running === true) return 'running';
    if (summary.running === false) return 'inactive';
    if (summary.status) return normalizeMemberStatus(summary.status);
  }
  if (cand.mode === 'one-shot') return 'inactive';
  return 'unknown';
}

/**
 * 取展示名（lead 恒 'Lead'；其余 name）
 * @param {{name: string, kind: string}} m
 * @returns {string}
 */
export function displayNameOf(m) {
  return m.kind === 'lead' ? 'Lead' : m.name;
}

/**
 * 由 sessionId 查成员
 * @param {ChannelMember[]} members
 * @param {string} sessionId
 * @returns {ChannelMember|undefined}
 */
export function memberById(members, sessionId) {
  return members.find((m) => m.sessionId === sessionId);
}

/**
 * 由名字查成员（含 displayName 后缀匹配）
 * @param {ChannelMember[]} members
 * @param {string} name
 * @returns {ChannelMember|undefined}
 */
export function memberByName(members, name) {
  if (!name) return undefined;
  const direct = members.find((m) => m.name === name);
  if (direct) return direct;
  return members.find((m) => m.name.toLowerCase() === String(name).toLowerCase());
}

/**
 * 生成 ChannelSnapshot（§4.1）
 * @param {RosterResult} roster
 * @param {{readonly?: boolean, readonlyReason?: string, now?: number, channelId?: string}} [opts]
 * @returns {ChannelSnapshot}
 */
export function deriveSnapshot(roster, opts = {}) {
  return {
    channelId: opts.channelId ?? roster.lead.sessionId,
    lead: roster.lead,
    members: roster.members,
    runningCount: roster.runningCount,
    readonly: opts.readonly === true,
    ...(opts.readonlyReason ? { readonlyReason: /** @type {any} */ (opts.readonlyReason) } : {}),
    ...(roster.degraded ? { degraded: roster.degraded } : {}),
    ...(roster.truncated ? { truncated: roster.truncated } : {}),
    generatedAt: opts.now ?? Date.now(),
  };
}

/**
 * 只读判定（§6.4.4：无权限 / 归档 / 团队结束；判定不确定时偏可写）。
 * @param {{canSend?: boolean, archived?: boolean, leadStatus?: MemberStatus, allInactiveSince?: number, now?: number, idleMs?: number}} input
 * @returns {{readonly: boolean, readonlyReason?: 'team-ended'|'lead-offline'|'archived'|'permission'}}
 */
export function deriveReadonly(input) {
  if (input.canSend === false) return { readonly: true, readonlyReason: 'permission' };
  if (input.archived === true) return { readonly: true, readonlyReason: 'archived' };
  const now = input.now ?? Date.now();
  const idleMs = input.idleMs ?? LIMITS.readonlyIdleMs;
  if (input.leadStatus === 'inactive' && typeof input.allInactiveSince === 'number' && now - input.allInactiveSince >= idleMs) {
    return { readonly: true, readonlyReason: 'team-ended' };
  }
  if (input.leadStatus === 'inactive') return { readonly: false, readonlyReason: 'lead-offline' };
  return { readonly: false };
}

/** @param {string} label */
function shortenLabel(label) {
  const s = String(label).replace(/\s+/g, ' ').trim();
  return s.length > 24 ? `${s.slice(0, 24)}…` : s;
}

/**
 * 作用域回溯：任意 member session → lead sessionId（F27 / §4.8.2）
 *
 * - 沿 `parentSession` 链最多 `maxHops`（默认 4）跳；
 * - `seen` 防环；无 parent / parent===自身 / 回溯失败 → 回退 `startId`（不抛错）；
 * - `sessionsOrLookup` 支持：函数 `(id)=>{parentSessionId,parentSession}` / Map / 数组 /
 *   `{[id]: summary}` / `sessions.list.byId` 形状。
 *
 * @param {string} startId
 * @param {any} sessionsOrLookup
 * @param {{maxHops?: number}} [options]
 * @returns {{leadSessionId: string, hops: number, degraded: boolean, cycle: boolean}}
 */
export function resolveLeadSession(startId, sessionsOrLookup, options = {}) {
  const start = String(startId ?? '');
  const maxHops = Number.isInteger(options.maxHops) && options.maxHops >= 0 ? options.maxHops : LIMITS.maxParentHops;
  const parentOf = makeParentLookup(sessionsOrLookup);
  const seen = new Set();
  let id = start;
  let hops = 0;
  let degraded = false;
  let cycle = false;
  for (let hop = 0; hop <= maxHops; hop += 1) {
    if (!id) return { leadSessionId: start, hops, degraded: true, cycle };
    if (seen.has(id)) {
      cycle = true;
      degraded = true;
      break;
    }
    seen.add(id);
    const parent = parentOf(id);
    if (!parent || parent === id) break;
    if (hop === maxHops) {
      // 已到最大跳数仍有 parent → 视为无法完整回到根，回退当前 id 并标 degraded
      degraded = true;
      break;
    }
    id = parent;
    hops += 1;
  }
  return { leadSessionId: id || start, hops, degraded, cycle };
}

/**
 * 便捷版：只返回 leadSessionId（F27 接线用）
 * @param {string} startId
 * @param {any} sessionsOrLookup
 * @param {{maxHops?: number}} [options]
 * @returns {string}
 */
export function resolveLeadSessionId(startId, sessionsOrLookup, options = {}) {
  return resolveLeadSession(startId, sessionsOrLookup, options).leadSessionId;
}

/**
 * @param {any} input
 * @returns {(id: string) => string|undefined}
 */
function makeParentLookup(input) {
  if (typeof input === 'function') {
    return (id) => parentOfValue(input(id));
  }
  /** @type {Map<string, any>|null} */
  let map = null;
  if (input instanceof Map) map = input;
  else if (Array.isArray(input)) map = new Map(input.map((item) => [String(item?.id ?? item?.sessionId ?? ''), item]));
  else if (input && typeof input === 'object') {
    const source = input.byId && typeof input.byId === 'object' ? input.byId : input;
    map = new Map(Object.entries(source));
  }
  if (!map) return () => undefined;
  return (id) => parentOfValue(map.get(id));
}

/**
 * @param {any} value
 * @returns {string|undefined}
 */
function parentOfValue(value) {
  if (!value) return undefined;
  if (typeof value === 'string') return value || undefined;
  if (typeof value !== 'object') return undefined;
  const parent =
    value.parentSessionId ??
    value.parentSession ??
    value.subagent?.address?.parentSessionId ??
    value.parent ??
    value.parentId;
  return parent ? String(parent) : undefined;
}
