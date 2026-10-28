// @ts-check
/**
 * 群聊数据内核 · 事件 → ChannelMessage 归一化（§4.2 矩阵 / §4.2.1 入群 / §4.2.2 任务卡）
 *
 * 输入分两层：
 *  1) `normalizeEntries(entries, ctx)`：S1 信封层，只保留 `entry.type==='event'`，丢弃 transient（小数 seq）；
 *  2) `normalizeChannel(sessions, ctx)`：多会话 → 成员目录 → 归一化 → 入群/任务卡派生 → 去重 → 同发合并 → 排序 → 内存上限。
 *
 * 纯函数：不读 DOM / Cordis / Node API；不修改入参。
 * 所有「推断字段」缺失时退化为 unknown 并保留 rawText，禁止猜测后丢弃消息（§4.1 字段推导上位规则）。
 */

import {
  EVENT_TYPES,
  LIMITS,
  MEMBER_FALLBACK_NAME,
  MEMBER_PHASE_TO_STATUS,
  isContextSourceKind,
  SOURCE_KIND,
  SUBAGENT_TOOL_CONTEXT,
  TASK_ACTION_LABELS,
  TASK_STATUS_LABELS,
  TOOL_NAMES,
  TOOL_SUMMARY_ID_PREFIX,
  WELCOME_TEXT_TEMPLATE,
} from './constants.js';
import { parseParts } from './protocol.js';
import { deriveRoster } from './roster.js';
import { normalizeMemberStatus } from './roster.js';
import { capInMemory } from './paginate.js';
import { dedupeMessages } from './dedupe.js';
import { mergeFanout } from './fanout.js';
import { sortTimeline } from './timeline.js';

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./model.js').ChannelMember} ChannelMember
 * @typedef {import('./model.js').NormalizeContext} NormalizeContext
 * @typedef {import('./model.js').NormalizeDiagnostics} NormalizeDiagnostics
 * @typedef {import('./model.js').SessionInput} SessionInput
 * @typedef {import('./model.js').SessionBundle} SessionBundle
 */

/** 已知但群聊不需要派生消息的事件类型（其余记 unknownEvents） */
const KNOWN_IRRELEVANT_EVENTS = new Set([
  'step/start',
  'step/end',
  'turn/start',
  'system/message',
  'assistant/attempt',
  'goal/change',
  'schedule/change',
  'todo/write',
  'compaction/start',
  'compaction/end',
  'llm/retry',
  'llm/retry-started',
  'model/selection',
  'command/run',
  'command/done',
  'deliverables/presented',
  'team/message/queued',
  'team/message/delivered',
  'subagent/settled',
]);

/** 会话事件信封（S1）→ 原始事件。返回 null 表示 transient/无效。 */
/**
 * @param {any} entry
 * @returns {{event: any, transient: boolean} | null}
 */
export function unwrapEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.type === 'event' && entry.event && typeof entry.event === 'object') {
    return { event: entry.event, transient: false };
  }
  if (entry.type === 'transient' && entry.event && typeof entry.event === 'object') {
    return { event: entry.event, transient: true };
  }
  if (typeof entry.type === 'string' && (typeof entry.seq === 'number' || entry.data !== undefined)) {
    return { event: entry, transient: false };
  }
  return null;
}

/**
 * 预处理窗口 entries：只保留持久事件（§4.2 第 3 条、S1）。
 * @param {any[]} entries
 * @returns {{events: any[], transientDropped: number, invalidDropped: number}}
 */
export function normalizeEntries(entries) {
  /** @type {any[]} */
  const events = [];
  let transientDropped = 0;
  let invalidDropped = 0;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const unwrapped = unwrapEntry(entry);
    if (!unwrapped) {
      invalidDropped += 1;
      continue;
    }
    if (unwrapped.transient) {
      transientDropped += 1;
      continue;
    }
    events.push(unwrapped.event);
  }
  return { events, transientDropped, invalidDropped };
}

/**
 * 解析 JSON 字符串（失败返回 undefined，不抛错）
 * @param {unknown} input
 * @returns {any}
 */
export function parseJsonSafe(input) {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return undefined;
    }
  }
  return input;
}

/**
 * 取 content 中的 text 块（丢弃 reasoning / tool-call）
 * @param {any} content
 * @returns {string[]}
 */
export function textBlocks(content) {
  if (!Array.isArray(content)) return [];
  /** @type {string[]} */
  const out = [];
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string') out.push(block.text);
  }
  return out;
}

/**
 * 单个会话的采集结果（中间态）
 * @typedef {Object} SessionScan
 * @property {string} sessionId
 * @property {any} header
 * @property {number} cutoff
 * @property {any[]} events
 * @property {any[]} teamMembers
 * @property {any[]} catalogs
 * @property {any[]} descriptors
 * @property {any[]} taskSnapshots
 * @property {Map<string, any>} calls
 * @property {Map<string, any>} results
 * @property {any[]} userMsgs
 * @property {any[]} splices
 * @property {Map<number, any>} assistantCandidates
 * @property {Map<number, any>} turnEnds
 * @property {Set<number>} forkedTurns
 * @property {Map<number, number>} toolCounts
 * @property {Map<number, number>} toolFirstSeq
 * @property {any[]} deliverables
 * @property {number} firstUserSeq
 * @property {number} inheritedDropped
 * @property {number} unknownEvents
 * @property {number} forkedTurnsDropped
 * @property {number} ignoredSubagentPrompts
 * @property {number} ignoredSystemContext
 * @property {number} eventsSeen
 */

/**
 * 采集单个会话（不产出消息；名称解析延后到目录合成后）
 * @param {SessionInput} session
 * @returns {SessionScan}
 */
export function collectSession(session) {
  const events = Array.isArray(session.events) ? session.events : [];
  const header = session.header ?? {};
  let cutoff = typeof session.cutoff === 'number' ? session.cutoff : -1;
  // fork/seed：客户端没有 ownEvents() → 用 session/end-seed 的 seq 作继承边界（§4.3.3 ②）
  for (const e of events) {
    if (e && e.type === EVENT_TYPES.endSeed && typeof e.seq === 'number' && e.seq > cutoff) cutoff = e.seq;
  }
  /** @type {SessionScan} */
  const scan = {
    sessionId: session.sessionId,
    header,
    cutoff,
    events: [],
    teamMembers: [],
    catalogs: [],
    descriptors: [],
    taskSnapshots: [],
    calls: new Map(),
    results: new Map(),
    userMsgs: [],
    splices: [],
    assistantCandidates: new Map(),
    turnEnds: new Map(),
    forkedTurns: new Set(),
    toolCounts: new Map(),
    toolFirstSeq: new Map(),
    toolLastTime: new Map(),
    deliverables: [],
    firstUserSeq: -1,
    inheritedDropped: 0,
    unknownEvents: 0,
    forkedTurnsDropped: 0,
    ignoredSubagentPrompts: 0,
    ignoredSystemContext: 0,
    eventsSeen: 0,
  };

  let currentTurn = -1;
  for (const e of events) {
    if (!e || typeof e.type !== 'string') continue;
    scan.eventsSeen += 1;
    if (cutoff >= 0 && typeof e.seq === 'number' && e.seq <= cutoff) {
      // 例外：subagent/descriptor 是会话自身身份（seeded 会话也保留），不当作继承消息丢弃
      if (e.type !== EVENT_TYPES.subagentDescriptor) {
        scan.inheritedDropped += 1;
        continue;
      }
    }
    if (e.type === EVENT_TYPES.endSeed) continue;
    scan.events.push(e);
    const data = e.data ?? {};
    switch (e.type) {
      case EVENT_TYPES.turnStart:
        currentTurn = Number(data.turn ?? currentTurn);
        break;
      case EVENT_TYPES.turnEnd: {
        const turn = Number(data.turn ?? currentTurn);
        const reason = data.reason?.kind ?? 'unknown';
        scan.turnEnds.set(turn, { reason, seq: Number(e.seq ?? 0), time: Number(e.time ?? 0) });
        if (reason === 'forked') {
          scan.forkedTurns.add(turn);
          scan.forkedTurnsDropped += 1;
        }
        break;
      }
      case EVENT_TYPES.assistantMessage: {
        const turn = Number(data.turn ?? currentTurn);
        const texts = textBlocks(data.message?.content);
        if (texts.length > 0 && texts.join('').trim() !== '') {
          scan.assistantCandidates.set(turn, {
            turn,
            seq: Number(e.seq ?? 0),
            time: Number(e.time ?? 0),
            step: data.step,
            texts,
          });
        }
        break;
      }
      case EVENT_TYPES.toolCall: {
        const turn = Number(data.turn ?? currentTurn);
        const call = {
          callId: String(data.callId ?? ''),
          name: String(data.name ?? ''),
          args: parseJsonSafe(data.arguments) ?? {},
          argsRaw: data.arguments,
          time: Number(e.time ?? 0),
          seq: Number(e.seq ?? 0),
          turn,
          step: data.step,
        };
        if (call.callId) scan.calls.set(call.callId, call);
        scan.toolCounts.set(turn, (scan.toolCounts.get(turn) ?? 0) + 1);
        if (!scan.toolFirstSeq.has(turn)) scan.toolFirstSeq.set(turn, call.seq);
        if (call.time > (scan.toolLastTime.get(turn) ?? 0)) scan.toolLastTime.set(turn, call.time);
        break;
      }
      case EVENT_TYPES.toolResult: {
        const callId = String(data.message?.toolCallId ?? data.callId ?? '');
        if (callId) {
          const texts = textBlocks(data.message?.content);
          const text = texts.join('\n');
          scan.results.set(callId, {
            callId,
            time: Number(e.time ?? 0),
            seq: Number(e.seq ?? 0),
            text,
            isError: data.message?.isError === true,
            parsed: parseJsonSafe(text),
          });
        }
        break;
      }
      case EVENT_TYPES.userMessage: {
        if (scan.firstUserSeq < 0) scan.firstUserSeq = Number(e.seq ?? 0);
        scan.userMsgs.push({ seq: Number(e.seq ?? 0), time: Number(e.time ?? 0), data });
        break;
      }
      case EVENT_TYPES.inboxSpliced: {
        const inserted = Array.isArray(data.inserted) ? data.inserted : [];
        if (inserted.length > 0) {
          scan.splices.push({
            seq: Number(e.seq ?? 0),
            time: Number(e.time ?? 0),
            target: data.target,
            inserted,
          });
        }
        break;
      }
      case EVENT_TYPES.teamMember: {
        const m = data.member ?? {};
        if (m.id) {
          scan.teamMembers.push({
            memberId: String(m.id),
            name: String(m.name ?? ''),
            description: typeof m.description === 'string' ? m.description : undefined,
            provider: typeof m.provider === 'string' ? m.provider : undefined,
            context: m.context === 'fork' ? 'fork' : m.context === 'fresh' ? 'fresh' : undefined,
            phase: m.phase === 'active' ? 'active' : m.phase === 'failed' ? 'failed' : 'provisioning',
            error: typeof m.error === 'string' ? m.error : undefined,
            time: Number(e.time ?? 0),
            seq: Number(e.seq ?? 0),
            sessionId: session.sessionId,
            teamId: data.teamId,
          });
        }
        break;
      }
      case EVENT_TYPES.subagentCatalog: {
        const childId = String(data.childId ?? '');
        if (childId) {
          scan.catalogs.push({
            childId,
            label: typeof data.label === 'string' ? data.label : undefined,
            mode: data.mode,
            childCreatedAt: Number(data.childCreatedAt ?? e.time ?? 0),
            time: Number(e.time ?? 0),
            seq: Number(e.seq ?? 0),
            sessionId: session.sessionId,
          });
        }
        break;
      }
      case EVENT_TYPES.subagentDescriptor: {
        scan.descriptors.push({
          sessionId: session.sessionId,
          label: typeof data.label === 'string' ? data.label : undefined,
          mode: data.mode,
          provider: typeof data.provider === 'string' ? data.provider : undefined,
          agentModel: typeof data.agentModel === 'string' ? data.agentModel : undefined,
          agentProvider: typeof data.agentProvider === 'string' ? data.agentProvider : undefined,
          time: Number(e.time ?? 0),
          seq: Number(e.seq ?? 0),
        });
        break;
      }
      case EVENT_TYPES.teamTask: {
        const task = data.task;
        if (task && task.id) {
          scan.taskSnapshots.push({
            teamId: String(data.teamId ?? ''),
            task: {
              id: String(task.id),
              revision: Number(task.revision ?? 1),
              subject: String(task.subject ?? ''),
              description: String(task.description ?? ''),
              status: task.status,
              ownerId: typeof task.ownerId === 'string' ? task.ownerId : undefined,
              blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy.map(String) : [],
              writeScopes: Array.isArray(task.writeScopes) ? task.writeScopes.map(String) : [],
            },
            time: Number(e.time ?? 0),
            seq: Number(e.seq ?? 0),
            sessionId: session.sessionId,
          });
        }
        break;
      }
      case EVENT_TYPES.deliverablesPresented: {
        scan.deliverables.push({
          seq: Number(e.seq ?? 0),
          time: Number(e.time ?? 0),
          files: extractFiles(data),
        });
        break;
      }
      default:
        if (!KNOWN_IRRELEVANT_EVENTS.has(e.type)) scan.unknownEvents += 1;
        break;
    }
  }
  return scan;
}

/**
 * 从 deliverables/presented 事件里尽力提取文件（形状 UNVERIFIED，按常见键兼容读取）
 * @param {any} data
 * @returns {{name: string, path: string}[]}
 */
export function extractFiles(data) {
  if (!data || typeof data !== 'object') return [];
  const arrays = [data.files, data.deliverables, data.items, data.attachments].filter(Array.isArray);
  /** @type {{name: string, path: string}[]} */
  const out = [];
  for (const arr of arrays) {
    for (const item of arr) {
      if (typeof item === 'string') {
        out.push({ name: basename(item), path: item });
        continue;
      }
      if (item && typeof item === 'object') {
        const path = String(item.path ?? item.filePath ?? item.file ?? item.url ?? '');
        const name = String(item.name ?? item.title ?? (path ? basename(path) : ''));
        if (path || name) out.push({ name: name || basename(path), path });
      }
    }
  }
  return out;
}

/** @param {string} p */
function basename(p) {
  const s = String(p);
  const i = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
  return i >= 0 ? s.slice(i + 1) : s;
}

/**
 * @typedef {Object} MemberDirectory
 * @property {ChannelMember[]} members
 * @property {ChannelMember} lead
 * @property {(sessionId: string) => ChannelMember|undefined} resolve
 * @property {(sessionId: string) => string} nameOf
 * @property {(name: string) => ChannelMember|undefined} byName
 * @property {boolean} noRoster
 * @property {any} [truncated]
 */

/**
 * 合成成员目录：优先用 ctx.members（适配器已按 §4.8.2 合成），否则从扫描结果推导。
 * @param {SessionScan[]} scans
 * @param {NormalizeContext} ctx
 * @returns {MemberDirectory}
 */
export function buildDirectory(scans, ctx) {
  const leadSessionId = ctx.leadSessionId;
  /** @type {Map<string, any>} */
  const descriptors = new Map();
  for (const scan of scans) for (const d of scan.descriptors) descriptors.set(scan.sessionId, d);

  // ① 事件名册：永远先建（team/member + subagent/catalog + descriptor + sessionSummaries）
  const eventRoster = buildEventRoster(scans, ctx, descriptors, leadSessionId);
  /** @type {ChannelMember[]} */
  let members = eventRoster.members;
  /** @type {any} */
  let derivedDegraded = eventRoster.degraded;
  /** @type {any} */
  let derivedTruncated = eventRoster.truncated;

  // ② authority roster（T2 传入的 agentTeam 投影）：按 sessionId 合并覆盖，保留事件名册里的 subagent
  const authority = Array.isArray(ctx.members)
    ? ctx.members
        .map((m) => {
          if (!m) return null;
          const sessionId = m.sessionId ?? m.id ?? m.target;
          if (!sessionId) return null;
          return { ...m, sessionId: String(sessionId), name: m.name ?? m.target ?? m.label };
        })
        .filter(Boolean)
    : [];
  if (authority.length > 0) {
    members = mergeAuthorityRoster(members, authority, leadSessionId);
    derivedDegraded = undefined; // 名册可用 → 不再标 degraded
  }

  const byId = new Map(members.map((m) => [m.sessionId, m]));
  let lead = members.find((m) => m.kind === 'lead') ?? members.find((m) => m.sessionId === leadSessionId);
  if (!lead) {
    lead = {
      sessionId: leadSessionId,
      name: 'lead',
      displayName: 'Lead',
      kind: /** @type {'lead'} */ ('lead'),
      depth: 0,
      status: /** @type {'running'} */ ('running'),
      addressable: true,
    };
    members.unshift(lead);
    byId.set(lead.sessionId, lead);
  }
  /** @type {Map<string, ChannelMember>} */
  const byName = new Map();
  for (const m of members) if (!byName.has(m.name)) byName.set(m.name, m);
  return {
    members,
    lead,
    noRoster: ctx.noRoster === true,
    degraded: derivedDegraded,
    truncated: derivedTruncated,
    resolve: (sessionId) => {
      if (!sessionId) return undefined;
      return byId.get(sessionId) ?? (sessionId === leadSessionId ? lead : undefined);
    },
    nameOf: (sessionId) => {
      const m = byId.get(sessionId);
      return m ? m.name : sessionId === leadSessionId ? 'lead' : MEMBER_FALLBACK_NAME;
    },
    byName: (name) => byName.get(String(name ?? '').replace(/^@/, '')),
  };
}

/**
 * 从事件流合成名册（不依赖 T2 投影；作为 authority roster 的底）
 * @param {SessionScan[]} scans
 * @param {NormalizeContext} ctx
 * @param {Map<string, any>} descriptors
 * @param {string} leadSessionId
 * @returns {{members: ChannelMember[], degraded: any, truncated: any}}
 */
function buildEventRoster(scans, ctx, descriptors, leadSessionId) {
  // 合成 agentTeam 投影（team/member 最新相位；model 从创建 result 补）
  const teamByName = new Map();
  for (const scan of scans) {
    for (const tm of scan.teamMembers) {
      teamByName.set(tm.name, tm);
      for (const call of scan.calls.values()) {
        if (call.name !== TOOL_NAMES.spawnTeammate || call.args?.name !== tm.name) continue;
        const res = scan.results.get(call.callId);
        const model = res?.parsed?.member?.model;
        if (typeof model === 'string') tm.model = model;
      }
    }
  }
  /** @type {any[]} */
  const sessionSummaries =
    Array.isArray(ctx.sessionSummaries) && ctx.sessionSummaries.length > 0
      ? ctx.sessionSummaries.map((summary) => ({
          id: String(summary.id ?? ''),
          parentSessionId: summary.parentSessionId,
          ...(typeof summary.running === 'boolean' ? { running: summary.running } : {}),
          ...(summary.status ? { status: summary.status } : {}),
        }))
      : scans.map((s) => ({
          id: s.sessionId,
          parentSessionId: s.header?.parentSession,
          status: 'inactive',
        }));
  const summaryById = new Map(sessionSummaries.map((s) => [String(s.id), s]));
  const leadSummary = summaryById.get(String(leadSessionId));
  /** @type {any[]} */
  const rosterMembers = [];
  for (const tm of teamByName.values()) {
    const summary = summaryById.get(String(tm.memberId));
    const phaseStatus = tm.phase === 'active' ? 'running' : tm.phase === 'failed' ? 'failed' : 'provisioning';
    // D-03：active 相位不等于 running；有真实运行态快照时以 running 为准
    const status =
      tm.phase === 'active' && summary && typeof summary.running === 'boolean'
        ? summary.running
          ? 'running'
          : 'inactive'
        : phaseStatus;
    rosterMembers.push({
      id: tm.memberId,
      name: tm.name,
      role: 'teammate',
      status,
      description: tm.description,
      model: tm.model,
    });
  }
  /** @type {any[]} */
  const catalogEntries = [];
  for (const scan of scans) {
    for (const c of scan.catalogs) {
      catalogEntries.push({ ...c, sessionId: scan.sessionId, parentSessionId: scan.sessionId });
    }
  }
  /** @type {Record<string, any>} */
  const descMap = {};
  for (const [sid, d] of descriptors) descMap[sid] = d;
  const roster = deriveRoster({
    leadSessionId,
    lead:
      leadSummary && typeof leadSummary.running === 'boolean'
        ? { status: leadSummary.running ? 'running' : 'inactive' }
        : {},
    agentTeam: { members: rosterMembers },
    catalogEntries,
    sessionSummaries,
    descriptors: descMap,
    noRoster: ctx.noRoster === true || rosterMembers.length === 0,
  });
  return { members: roster.members, degraded: roster.degraded, truncated: roster.truncated };
}

/**
 * authority roster（agentTeam 投影）按 sessionId 合并覆盖事件名册：
 *  - authority 优先 name/displayName/kind/status/description/model/addressable/parentSessionId；
 *  - 事件名册独有的成员（典型是 subagent）保留；
 *  - 排序 lead → teammate（authority 序优先）→ subagent（depth/事件序）。
 * @param {ChannelMember[]} eventMembers
 * @param {any[]} authorityMembers
 * @param {string} leadSessionId
 * @returns {ChannelMember[]}
 */
function mergeAuthorityRoster(eventMembers, authorityMembers, leadSessionId) {
  /** @type {Map<string, ChannelMember>} */
  const byId = new Map();
  /** @type {Map<string, number>} */
  const eventOrder = new Map();
  /** @type {Map<string, number>} */
  const authorityOrder = new Map();
  eventMembers.forEach((m, i) => {
    byId.set(m.sessionId, { ...m });
    eventOrder.set(m.sessionId, i);
  });
  authorityMembers.forEach((m, i) => authorityOrder.set(String(m.sessionId), i));
  const eventByName = new Map(eventMembers.map((m) => [m.name, m]));

  for (const raw of authorityMembers) {
    const sid = String(raw.sessionId);
    const prev = byId.get(sid);
    const kind = authorityKind(raw, prev);
    let name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name || isIdLikeName(name, sid)) {
      name = prev && prev.name && prev.name !== MEMBER_FALLBACK_NAME ? prev.name : '';
    }
    if (!name) {
      const textName = raw.description ? '' : '';
      name = textName || MEMBER_FALLBACK_NAME;
    }
    if (prev) {
      byId.set(sid, {
        ...prev,
        name,
        displayName: name,
        kind,
        status: raw.status ?? prev.status,
        description: typeof raw.description === 'string' ? raw.description : prev.description,
        model: typeof raw.model === 'string' ? raw.model : prev.model,
        addressable: typeof raw.addressable === 'boolean' ? raw.addressable : prev.addressable,
        parentSessionId: raw.parentSessionId ?? prev.parentSessionId,
        parentAvailable: typeof raw.parentAvailable === 'boolean' ? raw.parentAvailable : prev.parentAvailable,
        readable: raw.readable === false ? false : prev.readable,
      });
    } else {
      byId.set(sid, {
        sessionId: sid,
        name,
        displayName: name,
        kind,
        depth: typeof raw.depth === 'number' ? raw.depth : kind === 'lead' ? 0 : kind === 'teammate' ? 1 : 2,
        parentSessionId: raw.parentSessionId ?? (kind === 'teammate' ? leadSessionId : undefined),
        status: raw.status ?? 'unknown',
        description: typeof raw.description === 'string' ? raw.description : undefined,
        model: typeof raw.model === 'string' ? raw.model : undefined,
        addressable:
          typeof raw.addressable === 'boolean' ? raw.addressable : kind === 'lead' || kind === 'teammate',
        parentAvailable: typeof raw.parentAvailable === 'boolean' ? raw.parentAvailable : undefined,
        readable: raw.readable !== false,
      });
    }
  }

  /** @type {ChannelMember[]} */
  const list = [...byId.values()];
  const rank = (m) => (m.kind === 'lead' ? 0 : m.kind === 'teammate' ? 1 : 2);
  const tie = (m) =>
    authorityOrder.has(m.sessionId)
      ? authorityOrder.get(m.sessionId)
      : 1e6 + (eventOrder.get(m.sessionId) ?? 0);
  list.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 2 && (a.depth ?? 9) !== (b.depth ?? 9)) return (a.depth ?? 9) - (b.depth ?? 9);
    return tie(a) - tie(b);
  });

  // 重算 displayName 与派生字段（subagent 后缀要用合并后的父名）
  for (const m of list) {
    if (m.kind === 'lead') {
      m.displayName = 'Lead';
      m.depth = 0;
      if (!m.name) m.name = 'lead';
    } else if (m.kind === 'teammate') {
      m.displayName = m.name;
      if (typeof m.depth !== 'number') m.depth = 1;
    } else {
      const parent = m.parentSessionId ? byId.get(m.parentSessionId) : undefined;
      const parentName = parent ? parent.displayName || parent.name : MEMBER_FALLBACK_NAME;
      m.displayName = `${m.name} · ${parentName} 的子体`;
      if (typeof m.depth !== 'number') m.depth = (parent ? parent.depth : 1) + 1;
    }
    if (typeof m.addressable !== 'boolean') {
      m.addressable = m.kind === 'lead' || m.kind === 'teammate' || m.status === 'running' || m.status === 'provisioning';
    }
  }
  return list;
}

/**
 * @param {any} raw
 * @param {ChannelMember|undefined} prev
 * @returns {import('./model.js').MemberKind}
 */
function authorityKind(raw, prev) {
  const kind = String(raw.kind ?? '');
  if (kind === 'lead' || kind === 'teammate' || kind === 'subagent') return /** @type {any} */ (kind);
  if (raw.role === 'lead') return 'lead';
  if (raw.role === 'teammate') return 'teammate';
  return prev?.kind ?? 'teammate';
}

/**
 * 名字是否只是 sessionId 的截断（禁止把 id 当显示名）
 * @param {string} name
 * @param {string} sessionId
 * @returns {boolean}
 */
function isIdLikeName(name, sessionId) {
  const n = String(name).trim();
  if (!n) return true;
  if (sessionId && n === String(sessionId)) return true;
  if (sessionId && n.length >= 6 && String(sessionId).startsWith(n)) return true;
  return /^[0-9a-f]{8,}$/i.test(n);
}

/**
 * 发送者身份（缺失时退化为 unknown 且保留 rawText，不丢消息）
 * @param {MemberDirectory} dir
 * @param {string} sessionId
 * @param {{name?: string, kind?: string, unknown?: boolean}} [fallback]
 * @returns {import('./model.js').MessageSender}
 */
export function senderOf(dir, sessionId, fallback = {}) {
  const m = dir.resolve(sessionId);
  if (m) return { sessionId, name: m.name, kind: m.kind };
  return {
    sessionId: sessionId || '',
    name: fallback.name ?? MEMBER_FALLBACK_NAME,
    kind: /** @type {any} */ (fallback.kind ?? 'teammate'),
  };
}

/**
 * 由 ctx.localBatches 反查 clientBatchId（按 requestId 精确优先，其次目标名）
 * @param {NormalizeContext} ctx
 * @param {string} rpcId
 * @param {string} sessionId
 * @param {string[]} targets
 * @returns {string|undefined}
 */
export function lookupBatchId(ctx, rpcId, sessionId, targets) {
  const batches = ctx.localBatches;
  if (!batches || typeof batches !== 'object') return undefined;
  for (const [key, batch] of Object.entries(batches)) {
    if (!batch) continue;
    const batchId = batch.clientBatchId ?? key;
    const requestIds = batch.requestIds ?? {};
    if (rpcId && Object.values(requestIds).includes(rpcId)) return batchId;
    if (!rpcId && Array.isArray(batch.targets) && targets.length > 1) {
      const same = batch.targets.length === targets.length && batch.targets.every((t) => targets.includes(t.replace(/^@/, '')));
      if (same) return batchId;
    }
    if (batch.sessionIds && Array.isArray(batch.sessionIds) && batch.sessionIds.includes(sessionId)) return batchId;
  }
  return undefined;
}

/**
 * 一个会话产出基础消息（不含入群卡/任务卡）
 * @param {SessionScan} scan
 * @param {MemberDirectory} dir
 * @param {NormalizeContext} ctx
 * @returns {SessionBundle}
 */
export function emitSessionMessages(scan, dir, ctx) {
  const sid = scan.sessionId;
  const leadSessionId = ctx.leadSessionId;
  /** @type {ChannelMessage[]} */
  const messages = [];
  /** @type {Map<string, ChannelMessage>} */
  const byDataId = new Map();
  const self = dir.resolve(sid);
  const selfName = self ? self.name : sid === leadSessionId ? 'lead' : MEMBER_FALLBACK_NAME;
  const selfKind = self ? self.kind : 'teammate';

  /** @type {import('./model.js').MessageSender} */
  const selfSender = { sessionId: sid, name: selfName, kind: /** @type {any} */ (selfKind) };

  // ── user/message ────────────────────────────────────────────────
  for (const um of scan.userMsgs) {
    const data = um.data ?? {};
    const source = data.source ?? {};
    const parts = textBlocks(data.content);
    const fullText = parts.join('\n');
    const proto = parseParts(parts);
    const kind = String(source.kind ?? '');
    const rpcId = typeof source.rpcId === 'string' ? source.rpcId : undefined;

    // D-01：宿主注入的系统上下文（工作区指令 / 运行时上下文 / skill 目录 / 时间 / 后台任务 / system-prompt）
    // 不是群聊发言，直接丢弃；真正未知的 kind 仍走下方「不崩、原样展示、标记 unknown」兜底（UT-08）。
    if (isContextSourceKind(kind)) {
      scan.ignoredSystemContext += 1;
      continue;
    }

    if (kind === SOURCE_KIND.user || kind === '') {
      const isChild = sid !== leadSessionId;
      if (!rpcId && isChild) {
        scan.ignoredSubagentPrompts += 1;
        if (ctx.emitSubagentPrompt) {
          messages.push(makeMessage({
            id: `s:${sid}:${um.seq}:prompt`,
            kind: 'system',
            sessionId: sid,
            sender: selfSender,
            time: um.time,
            seq: um.seq,
            text: fullText,
            meta: { event: 'subagent-prompt' },
          }));
        }
        continue;
      }
      const targets = proto.ok ? proto.targets : [];
      const batchId = lookupBatchId(ctx, rpcId, sid, targets);
      const msg = makeMessage({
        id: `u:${sid}:${String(data.id ?? um.seq)}`,
        kind: 'user',
        sessionId: sid,
        sender: { sessionId: sid, name: 'user', kind: /** @type {'user'} */ ('user') },
        time: um.time,
        seq: um.seq,
        text: proto.ok ? proto.text : fullText,
        targets,
        targetSessionIds: proto.ok ? targets.map((t) => targetSessionId(dir, t, leadSessionId)).filter(Boolean) : [],
        meta: {
          ...(rpcId ? { rpcId } : {}),
          ...(proto.ok ? { fanout: true, declaredCount: proto.declaredCount, prefixParseOk: true } : {}),
          sourceKind: kind || 'user',
          ...(batchId ? { clientBatchId: batchId } : {}),
          ...(data.id ? { messageId: String(data.id) } : {}),
        },
      });
      if (proto.ok && fullText !== proto.text) msg.rawText = fullText;
      if (batchId) msg.clientBatchId = batchId;
      messages.push(msg);
      if (data.id) byDataId.set(String(data.id), msg);
      continue;
    }

    if (kind === SOURCE_KIND.agentMessage || kind === SOURCE_KIND.teamMessage) {
      const prefixName = prefixSenderName(parts);
      const senderSessionId = String(source.senderSessionId ?? source.senderId ?? '');
      const sender = senderOf(dir, senderSessionId, {
        name: typeof source.senderName === 'string' ? source.senderName : prefixName,
        kind: 'teammate',
        unknown: true,
      });
      if (typeof source.senderName === 'string' && senderSessionId) sender.name = source.senderName;
      const body = stripTeamPrefix(parts);
      const messageId = typeof source.messageId === 'string' ? source.messageId : undefined;
      const msg = makeMessage({
        id: messageId ? `m:${messageId}` : `u:${sid}:${String(data.id ?? um.seq)}`,
        kind: 'agent_to_agent',
        sessionId: sid,
        sender,
        targets: [selfName],
        targetSessionIds: [sid],
        time: um.time,
        seq: um.seq,
        text: body,
        meta: {
          sourceKind: kind,
          ...(messageId ? { messageId } : {}),
          ...(prefixName && !dir.resolve(senderSessionId) ? { senderNameFromText: prefixName } : {}),
          ...(source.teamId ? { teamId: String(source.teamId) } : {}),
        },
      });
      if (fullText !== body) msg.rawText = fullText;
      messages.push(msg);
      if (data.id) byDataId.set(String(data.id), msg);
      continue;
    }

    if (kind === SOURCE_KIND.subagentSettled) {
      const closingText = settlementClosingText(parts);
      messages.push(makeMessage({
        id: `s:${sid}:${um.seq}`,
        kind: 'system',
        sessionId: sid,
        sender: senderOf(dir, String(source.senderSessionId ?? ''), { name: 'subagent', kind: 'subagent' }),
        time: um.time,
        seq: um.seq,
        text: parts.join('\n'),
        systemReason: 'subagent-settled',
        meta: {
          copy: 'settlement',
          summary: String(source.summary ?? ''),
          senderSessionId: String(source.senderSessionId ?? ''),
          closingText,
        },
      }));
      continue;
    }

    // 未知 source.kind：不崩、原样展示、标 unknown（§4.2 细节 2）
    messages.push(makeMessage({
      id: `s:${sid}:${um.seq}`,
      kind: 'system',
      sessionId: sid,
      sender: selfSender,
      time: um.time,
      seq: um.seq,
      text: fullText,
      meta: { unknownSource: true, sourceKind: kind },
    }));
  }

  // ── inbox spliced 元数据 + 仅 spliced 的双写兜底 ─────────────────
  for (const sp of scan.splices) {
    for (const item of sp.inserted) {
      const itemId = String(item?.id ?? '');
      if (!itemId) continue;
      const existing = byDataId.get(itemId);
      if (existing) {
        existing.meta = {
          ...(existing.meta ?? {}),
          ...(sp.target ? { inboxTarget: sp.target } : {}),
          deliveryTime: sp.time,
        };
        continue;
      }
      // 双写缺失（异常构建）时才从 spliced 兜底出一条，标 fromSpliced
      const parts = textBlocks(item.content);
      const source = item.source ?? {};
      if (source.kind === SOURCE_KIND.user) {
        const proto = parseParts(parts);
        const msg = makeMessage({
          id: `u:${sid}:${itemId}`,
          kind: 'user',
          sessionId: sid,
          sender: { sessionId: sid, name: 'user', kind: /** @type {'user'} */ ('user') },
          time: sp.time,
          seq: sp.seq,
          text: proto.ok ? proto.text : parts.join('\n'),
          targets: proto.ok ? proto.targets : [],
          meta: { fromSpliced: true, inboxTarget: sp.target, messageId: itemId, sourceKind: source.kind },
        });
        messages.push(msg);
      }
    }
  }

  // ── assistant 输出（每 turn 末段，口径 A） ──────────────────────
  for (const [turn, cand] of scan.assistantCandidates) {
    if (scan.forkedTurns.has(turn)) continue;
    const id = `a:${sid}:turn:${turn}`;
    const toolCount = scan.toolCounts.get(turn) ?? 0;
    const end = scan.turnEnds.get(turn);
    messages.push(makeMessage({
      id,
      kind: 'agent_output',
      sessionId: sid,
      sender: selfSender,
      time: cand.time,
      seq: cand.seq,
      turn,
      isFinal: end ? end.reason === 'completed' : false,
      text: cand.texts.join('\n'),
      toolCallCount: ctx.toolFold === 'delivery' || ctx.toolFold === 'none' ? undefined : toolCount || undefined,
      meta: {
        ...(end ? { turnEndReason: end.reason } : { turnOpen: true }),
      },
    }));
    if (end && end.reason !== 'completed') {
      messages.push(makeMessage({
        id: `s:${sid}:${end.seq}:turn-end`,
        kind: 'system',
        sessionId: sid,
        sender: selfSender,
        time: end.time,
        seq: end.seq,
        text: '',
        meta: { event: 'turn-interrupted', turnEndReason: end.reason, turn },
      }));
    }
  }

  // ── M6 工具过程：无文本输出的 turn 出独立摘要（Lead 约束 2026-10-28） ──
  for (const [turn, count] of scan.toolCounts) {
    if (count <= 0) continue;
    const cand = scan.assistantCandidates.get(turn);
    const hasText = cand && cand.texts.join('').trim() !== '';
    const firstSeq = scan.toolFirstSeq.get(turn) ?? 0;
    if (hasText && ctx.toolFold !== 'delivery') {
      const out = messages.find((m) => m.id === `a:${sid}:turn:${turn}`);
      if (out) out.toolCallCount = count;
      continue;
    }
    const end = scan.turnEnds.get(turn);
    messages.push(makeMessage({
      id: `${TOOL_SUMMARY_ID_PREFIX}${sid}:${turn}:${firstSeq}`,
      kind: 'delivery',
      sessionId: sid,
      sender: selfSender,
      time: end ? end.time : (cand?.time ?? scan.toolLastTime.get(turn) ?? 0),
      seq: firstSeq,
      toolCallCount: count,
      text: '',
      meta: { toolSummary: true, turn },
    }));
  }

  // ── 文件交付（M5；形状 UNVERIFIED） ────────────────────────────
  for (const d of scan.deliverables) {
    if (!d.files || d.files.length === 0) continue;
    messages.push(makeMessage({
      id: `d:${sid}:${d.seq}`,
      kind: 'delivery',
      sessionId: sid,
      sender: selfSender,
      time: d.time,
      seq: d.seq,
      text: '',
      files: d.files,
      meta: { needsShapeVerification: true },
    }));
  }

  return {
    sessionId: sid,
    messages,
    creations: buildCreations(scan),
    taskSnapshots: scan.taskSnapshots,
    taskOps: buildTaskOps(scan),
    teamMembers: scan.teamMembers,
    catalogs: scan.catalogs,
    descriptors: scan.descriptors,
    spliced: buildSplicedMap(scan),
    toolCountsByTurn: scan.toolCounts,
    forkedTurns: scan.forkedTurns,
    turnEnds: scan.turnEnds,
  };
}

/**
 * @param {any} fields
 * @returns {ChannelMessage}
 */
function makeMessage(fields) {
  let text = typeof fields.text === 'string' ? fields.text : '';
  let truncated = fields.truncated === true;
  let textOriginalLength;
  if (text.length > LIMITS.textRender) {
    textOriginalLength = text.length;
    text = text.slice(0, LIMITS.textRender);
    truncated = true;
  }
  return {
    id: String(fields.id),
    kind: fields.kind,
    sessionId: String(fields.sessionId ?? ''),
    sender: fields.sender ?? { sessionId: '', name: '', kind: 'system' },
    targets: Array.isArray(fields.targets) ? fields.targets : [],
    targetSessionIds: Array.isArray(fields.targetSessionIds) ? fields.targetSessionIds : [],
    text,
    time: Number(fields.time ?? 0),
    seq: Number(fields.seq ?? 0),
    turn: fields.turn,
    isFinal: fields.isFinal === true,
    files: fields.files,
    toolCallCount: fields.toolCallCount,
    systemReason: fields.systemReason,
    delivery: fields.delivery,
    deliveries: fields.deliveries,
    clientBatchId: fields.clientBatchId,
    truncated: truncated || undefined,
    meta: textOriginalLength ? { ...(fields.meta ?? {}), textOriginalLength } : fields.meta,
    memberCard: fields.memberCard,
    taskCard: fields.taskCard,
    creationId: fields.creationId,
    pairOrder: fields.pairOrder,
  };
}

/**
 * 构建创建记录（spawn_teammate / subagent / subagent_fork）
 * @param {SessionScan} scan
 * @returns {import('./model.js').CreationRecord[]}
 */
function buildCreations(scan) {
  /** @type {import('./model.js').CreationRecord[]} */
  const out = [];
  for (const call of scan.calls.values()) {
    if (call.name !== TOOL_NAMES.spawnTeammate && call.name !== TOOL_NAMES.subagent && call.name !== TOOL_NAMES.subagentFork) continue;
    const res = scan.results.get(call.callId);
    const record = {
      callId: call.callId,
      tool: call.name,
      creatorSessionId: scan.sessionId,
      failed: res ? res.isError === true : false,
      errorText: res?.isError ? res.text : undefined,
      args: call.args ?? {},
      time: call.time,
      seq: call.seq,
      memberName: call.args?.name ?? call.args?.description,
    };
    if (res && !res.isError) {
      if (call.name === TOOL_NAMES.spawnTeammate) {
        const member = res.parsed?.member ?? res.parsed;
        if (member && typeof member === 'object') record.resultMember = member;
        record.memberName = record.resultMember?.target ?? call.args?.name;
      } else {
        record.childSessionId = res.parsed?.subagentId ?? parseStartedSubagent(res.text);
      }
    }
    out.push(record);
  }
  return out;
}

/**
 * 构建任务操作记录（team_task_create / team_task_update）
 * @param {SessionScan} scan
 * @returns {import('./model.js').TaskOpRecord[]}
 */
function buildTaskOps(scan) {
  /** @type {import('./model.js').TaskOpRecord[]} */
  const out = [];
  for (const call of scan.calls.values()) {
    if (call.name !== TOOL_NAMES.taskCreate && call.name !== TOOL_NAMES.taskUpdate) continue;
    const res = scan.results.get(call.callId);
    if (res?.isError) continue;
    const view = res?.parsed;
    const args = call.args ?? {};
    const taskId = String(view?.id ?? args.task_id ?? args.taskId ?? '');
    if (!taskId) continue;
    const revision = Number(view?.revision ?? (Number(args.expected_revision) + 1));
    const action = call.name === TOOL_NAMES.taskCreate ? 'create' : String(args.action ?? 'edit');
    out.push({
      taskId,
      revision: Number.isFinite(revision) ? revision : undefined,
      action: /** @type {any} */ (action),
      actorSessionId: scan.sessionId,
      ownerName: typeof view?.ownerName === 'string' ? view.ownerName : undefined,
      ready: typeof view?.ready === 'boolean' ? view.ready : undefined,
      args,
      callTime: call.time,
      seq: call.seq,
    });
  }
  return out;
}

/** @param {SessionScan} scan */
function buildSplicedMap(scan) {
  /** @type {Map<string, {target?: string, time?: number}>} */
  const map = new Map();
  for (const sp of scan.splices) {
    for (const item of sp.inserted) {
      const id = String(item?.id ?? '');
      if (id) map.set(id, { target: sp.target, time: sp.time });
    }
  }
  return map;
}

/**
 * `Team message(?: <messageId>)? from <name>:` 前缀发送者名
 * @param {string[]} parts
 * @returns {string|undefined}
 */
export function prefixSenderName(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return undefined;
  const m = /^Team message(?: \S+)? from (.+?):$/.exec(parts[0]);
  return m ? m[1] : undefined;
}

/**
 * 剥离 peer 前缀（`Team message … from X:`），保留其余 text 块
 * @param {string[]} parts
 * @returns {string}
 */
export function stripTeamPrefix(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return '';
  if (/^Team message(?: \S+)? from .+?:$/.test(parts[0])) return parts.slice(1).join('\n');
  return parts.join('\n');
}

/**
 * subagent-settled 的 closing message 正文（用于与子会话 agent_output 去重）
 * @param {string[]} parts
 * @returns {string}
 */
export function settlementClosingText(parts) {
  const list = Array.isArray(parts) ? parts : [];
  const idx = list.findIndex((p) => p === 'Its closing message:');
  if (idx < 0) return '';
  return list.slice(idx + 1).join('\n');
}

/**
 * @param {string} text
 * @returns {string|undefined}
 */
function parseStartedSubagent(text) {
  const m = /started subagent\s+(\S+)/.exec(String(text ?? ''));
  return m ? m[1] : undefined;
}

/**
 * 目标名 → sessionId（lead 用 channelId）
 * @param {MemberDirectory} dir
 * @param {string} name
 * @param {string} leadSessionId
 * @returns {string}
 */
function targetSessionId(dir, name, leadSessionId) {
  if (name === 'lead') return leadSessionId;
  const m = dir.byName(name);
  return m ? m.sessionId : '';
}

/**
 * 归一化一个频道（多会话）
 * @param {SessionInput[]} sessions
 * @param {NormalizeContext} ctx
 * @returns {{messages: ChannelMessage[], diagnostics: NormalizeDiagnostics, members: ChannelMember[]}}
 */
export function normalizeChannel(sessions, ctx) {
  const list = Array.isArray(sessions) ? sessions : [];
  const leadSessionId = ctx.leadSessionId ?? list[0]?.sessionId ?? '';
  const context = { ...ctx, leadSessionId };
  /** @type {NormalizeDiagnostics} */
  const diagnostics = {
    sessions: list.length,
    events: 0,
    transientDropped: 0,
    inheritedDropped: 0,
    forkedTurnsDropped: 0,
    unknownEvents: 0,
    ignoredSubagentPrompts: 0,
    ignoredSystemContext: 0,
    duplicatesRemoved: 0,
    fanoutMerged: 0,
    memberCards: 0,
    taskCards: 0,
    settlementsDropped: 0,
    memoryTrimmed: 0,
    truncated: false,
    warnings: [],
  };

  /** @type {SessionScan[]} */
  const scans = [];
  for (const s of list) {
    if (!s || !s.sessionId) continue;
    // 兼容两种输入：裸事件数组 / S1 信封数组（只消费 type==='event'，丢弃 transient）
    const pre = normalizeEntries(s.events);
    diagnostics.transientDropped += pre.transientDropped;
    const scan = collectSession({ ...s, events: pre.events });
    diagnostics.events += scan.eventsSeen;
    diagnostics.inheritedDropped += scan.inheritedDropped;
    diagnostics.unknownEvents += scan.unknownEvents;
    diagnostics.forkedTurnsDropped += scan.forkedTurnsDropped;
    scans.push(scan);
  }
  const dir = buildDirectory(scans, context);
  const bundles = scans.map((scan) => emitSessionMessages(scan, dir, context));
  // ignoredSubagentPrompts / ignoredSystemContext 在 emit 阶段累加，故必须在 emit 之后再汇总
  for (const scan of scans) {
    diagnostics.ignoredSubagentPrompts += scan.ignoredSubagentPrompts;
    diagnostics.ignoredSystemContext += scan.ignoredSystemContext;
  }

  /** @type {ChannelMessage[]} */
  let messages = bundles.flatMap((b) => b.messages);
  const memberCards = buildMemberCards(scans, bundles, dir, context);
  const taskCards = buildTaskCards(scans, bundles, dir, context);
  diagnostics.memberCards = memberCards.length / 2; // 一组 = 欢迎 + 卡片
  diagnostics.taskCards = taskCards.length;
  messages.push(...memberCards, ...taskCards);

  const deduped = dedupeMessages(messages, {
    leadSessionId,
    weakWindowMs: LIMITS.weakKeyTimeWindowMs,
  });
  diagnostics.duplicatesRemoved = deduped.removed;
  diagnostics.settlementsDropped = deduped.settlementsDropped;

  const fanout = mergeFanout(deduped.messages, {
    leadSessionId,
    weakWindowMs: LIMITS.fanoutTimeWindowMs,
  });
  diagnostics.fanoutMerged = fanout.merged;

  let sorted = sortTimeline(fanout.messages);
  const capped = capInMemory(sorted, context.maxMessages ?? LIMITS.maxMessagesInMemory, LIMITS.memoryKeepHead);
  if (capped.trimmed) {
    diagnostics.memoryTrimmed = capped.dropped;
    diagnostics.warnings.push('memory-trimmed');
  }
  diagnostics.truncated = Boolean(capped.trimmed);
  if (dir.degraded) diagnostics.warnings.push(`degraded:${dir.degraded}`);
  return {
    messages: capped.messages,
    diagnostics,
    members: dir.members,
    degraded: dir.degraded,
    truncated: dir.truncated,
  };
}

/**
 * 入群消息（欢迎提示 + creator 带卡消息，§4.2.1 V1.4）与任务卡（§4.2.2 V1.6）
 * @param {SessionScan[]} scans
 * @param {SessionBundle[]} bundles
 * @param {MemberDirectory} dir
 * @param {NormalizeContext} ctx
 */
function buildMemberCards(scans, bundles, dir, ctx) {
  const leadSessionId = ctx.leadSessionId;
  /** @type {Map<string, {memberId: string, teamMembers: any[], catalogs: any[], creations: any[], descriptor?: any}>} */
  const groups = new Map();
  const group = (memberId) => {
    const key = String(memberId);
    if (!groups.has(key)) groups.set(key, { memberId: key, teamMembers: [], catalogs: [], creations: [] });
    return groups.get(key);
  };
  for (const scan of scans) {
    for (const tm of scan.teamMembers) group(tm.memberId).teamMembers.push({ ...tm, creatorSessionId: scan.sessionId });
    for (const cat of scan.catalogs) group(cat.childId).catalogs.push({ ...cat, creatorSessionId: scan.sessionId });
    for (const d of scan.descriptors) {
      const g = group(scan.sessionId);
      g.descriptor = d;
    }
  }
  for (const b of bundles) {
    for (const cr of b.creations) {
      // 关联 memberSessionId：teammate 用 team/member.name；subagent 用 childId
      let memberId = cr.childSessionId ?? '';
      if (!memberId) {
        for (const scan of scans) {
          const tm = scan.teamMembers.find((m) => m.name === cr.memberName);
          if (tm) {
            memberId = tm.memberId;
            break;
          }
        }
      }
      if (!memberId) {
        for (const scan of scans) {
          const cat = scan.catalogs.find((c) => c.label && cr.args?.description && c.label === cr.args.description);
          if (cat) {
            memberId = cat.childId;
            break;
          }
        }
      }
      if (!memberId) continue;
      group(memberId).creations.push(cr);
    }
  }

  /** @type {ChannelMessage[]} */
  const out = [];
  for (const g of groups.values()) {
    const teammate = g.teamMembers.length > 0;
    const active = [...g.teamMembers].reverse().find((m) => m.phase === 'active');
    const failedTeam = g.teamMembers.some((m) => m.phase === 'failed');
    const anyCreation = g.creations[0];
    if (teammate) {
      // UT-39：等 active 再出；创建失败不出卡
      if (!active) continue;
      if (failedTeam) continue;
    } else {
      // subagent：catalog 触发；创建失败不出卡
      if (g.catalogs.length === 0) continue;
      if (anyCreation?.failed) continue;
    }
    const catalog = g.catalogs[0];
    const creation = g.creations[0];
    const descriptor = g.descriptor ?? [];
    const memberSessionId = g.memberId;
    const displayNameRaw = teammate
      ? active.name
      : (catalog?.label ?? descriptorLabel(descriptor) ?? creation?.args?.description ?? MEMBER_FALLBACK_NAME);
    const name = String(displayNameRaw || MEMBER_FALLBACK_NAME);
    const anchorTime = teammate ? Number(active.time) : Number(catalog?.childCreatedAt ?? creation?.time ?? 0);
    const anchorSeq = teammate ? Number(active.seq) : Number(catalog?.seq ?? creation?.seq ?? 0);
    const anchorSessionId = teammate ? active.sessionId : String(catalog?.creatorSessionId ?? creation?.creatorSessionId ?? leadSessionId);

    // creator：spawn_teammate 恒 lead；subagent = 调用方成员
    let creatorSessionId = leadSessionId;
    let creatorName = 'lead';
    let creatorKind = 'lead';
    if (!teammate) {
      creatorSessionId = String(catalog?.creatorSessionId ?? creation?.creatorSessionId ?? leadSessionId);
      const cm = dir.resolve(creatorSessionId);
      creatorName = cm ? cm.name : creatorSessionId === leadSessionId ? 'lead' : MEMBER_FALLBACK_NAME;
      creatorKind = cm ? cm.kind : creatorSessionId === leadSessionId ? 'lead' : 'teammate';
    }
    const memberEntry = dir.resolve(memberSessionId);

    const description = threeWay(creation?.args?.description, active?.description, catalog?.label ?? descriptorLabel(descriptor));
    const modelInfo = resolveModel({ teammate, creation, descriptor, memberEntry, creatorName });
    const contextPolicy = teammate
      ? (creation?.args?.context === 'fork' ? 'fork' : creation?.args?.context === 'fresh' ? 'fresh' : active?.context === 'fork' ? 'fork' : active?.context === 'fresh' ? 'fresh' : 'unknown')
      : (SUBAGENT_TOOL_CONTEXT[creation?.tool] ?? (descriptor?.provider === 'fork' ? 'fork' : descriptor?.provider === 'spawn' ? 'fresh' : 'unknown'));
    const lifecycleMode = teammate ? 'unknown' : mapLifecycleMode(descriptor?.mode);
    const promptFull = typeof creation?.args?.prompt === 'string' ? creation.args.prompt : undefined;
    const promptExcerpt = promptFull ? excerptPrompt(promptFull) : undefined;
    const state = teammate
      ? mapLifecycle(active.phase)
      : memberEntry ? normalizeMemberStatus(memberEntry.status) : 'unknown';
    const canRead = typeof ctx.canRead === 'function' ? ctx.canRead(memberSessionId) !== false : true;
    /** @type {import('./model.js').MemberCardPayload} */
    const payload = {
      id: `mc:${memberSessionId}`,
      member: {
        sessionId: memberSessionId,
        name,
        kind: teammate ? 'teammate' : 'subagent',
        parentName: teammate ? undefined : creatorName,
        description,
        model: modelInfo.model,
        modelInheritedFrom: modelInfo.inheritedFrom,
        modelSource: modelInfo.source,
        contextPolicy: /** @type {any} */ (contextPolicy),
        lifecycleMode: /** @type {any} */ (lifecycleMode),
        createTool: creation?.tool ?? 'unknown',
        promptExcerpt,
        promptFull: promptFull ? truncateText(promptFull, LIMITS.textStore) : undefined,
        state: /** @type {any} */ (state),
      },
      time: anchorTime,
      actions: {
        viewSession: canRead ? 'enabled' : 'disabled',
        ...(teammate ? { viewTask: /** @type {'enabled'|'disabled'} */ (canRead ? 'enabled' : 'disabled') } : {}),
        ...(canRead ? {} : { reason: 'no-permission' }),
      },
      trigger: teammate ? 'team-member-active' : 'subagent-catalog',
    };
    const creationId = `mc:${memberSessionId}`;
    out.push(makeMessage({
      id: `${creationId}:welcome`,
      kind: 'system',
      sessionId: anchorSessionId,
      sender: senderOf(dir, creatorSessionId),
      time: anchorTime,
      seq: anchorSeq,
      text: WELCOME_TEXT_TEMPLATE.replace('{name}', name),
      systemReason: 'member-welcome',
      creationId,
      pairOrder: 0,
      meta: { memberName: name, memberSessionId, memberKind: teammate ? 'teammate' : 'subagent' },
    }));
    out.push(makeMessage({
      id: creationId,
      kind: 'member_card',
      sessionId: anchorSessionId,
      sender: senderOf(dir, creatorSessionId),
      time: anchorTime,
      seq: anchorSeq,
      text: '',
      memberCard: payload,
      creationId,
      pairOrder: 1,
      meta: { memberName: name, memberKind: teammate ? 'teammate' : 'subagent' },
    }));
  }
  return out;
}

/**
 * @param {SessionScan[]} scans
 * @param {SessionBundle[]} bundles
 * @param {MemberDirectory} dir
 * @param {NormalizeContext} ctx
 */
function buildTaskCards(scans, bundles, dir, ctx) {
  const leadSessionId = ctx.leadSessionId;
  /** @type {Map<string, import('./model.js').TaskSnapshotRecord>} */
  const snapshots = new Map();
  for (const b of bundles) {
    for (const task of b.taskSnapshots) {
      snapshots.set(`${task.task.id}:${task.task.revision}`, task);
    }
  }
  /** @type {Map<string, import('./model.js').TaskOpRecord>} */
  const ops = new Map();
  for (const b of bundles) {
    for (const op of b.taskOps) {
      if (typeof op.revision !== 'number') continue;
      ops.set(`${op.taskId}:${op.revision}`, op);
    }
  }
  /** @type {import('./model.js').TaskOpRecord[]} */
  const allOps = bundles.flatMap((b) => b.taskOps);
  const usedOps = new Set();
  /** @type {ChannelMessage[]} */
  const out = [];
  for (const snapshot of snapshots.values()) {
    const task = snapshot.task;
    const key = `${task.id}:${task.revision}`;
    const teamId = snapshot.teamId || leadSessionId;
    let op = ops.get(key);
    let source = /** @type {import('./model.js').ActorSource} */ ('paired');
    if (op) {
      usedOps.add(op);
    } else {
      // 二级回退：同 taskId 且时间近邻（<1s），注意 journal 比 result 早 3–128ms
      op = allOps.find(
        (o) => o.taskId === task.id && !usedOps.has(o) && Math.abs(snapshot.time - o.callTime) < LIMITS.taskNeighborWindowMs,
      );
      if (op) {
        usedOps.add(op);
        source = 'time-neighbor';
      }
    }
    let actor = op ? { sessionId: op.actorSessionId, name: dir.nameOf(op.actorSessionId), kind: /** @type {any} */ (dir.resolve(op.actorSessionId)?.kind ?? 'teammate') } : null;
    if (!actor && task.ownerId) {
      // 三级回退：owner 反推
      const owner = dir.resolve(task.ownerId);
      actor = { sessionId: task.ownerId, name: owner ? owner.name : MEMBER_FALLBACK_NAME, kind: /** @type {any} */ (owner?.kind ?? 'teammate') };
      source = 'owner-inferred';
    }
    if (!actor) {
      actor = { sessionId: '', name: '系统', kind: 'system' };
      source = 'system-fallback';
    }
    const ownerName = op?.ownerName ?? (task.ownerId ? dir.nameOf(task.ownerId) : undefined);
    const prev = snapshots.get(`${task.id}:${task.revision - 1}`);
    const nextForDiff = { ...task, ownerName };
    let action = op?.action ?? diffAction(prev?.task, nextForDiff, actor.name);
    // release vs reassign-清空：无显式 action 时看 actor 是否原 owner（TCF §4.2 歧义消解）
    if (!op && action === 'reassign' && prev?.task?.ownerId && !task.ownerId && task.status === 'pending') {
      const prevOwnerName = dir.nameOf(prev.task.ownerId);
      if (prevOwnerName === actor.name) action = 'release';
    }
    const dedupeKey = `${teamId}:${task.id}:${task.revision}`;
    const status = task.status;
    /** @type {import('./model.js').TaskCardPayload} */
    const payload = {
      id: dedupeKey,
      action,
      task: {
        id: task.id,
        revision: task.revision,
        subject: task.subject,
        description: task.description,
        status,
        ownerId: task.ownerId,
        ownerName,
        blockedBy: task.blockedBy,
        writeScopes: task.writeScopes,
        deleted: status === 'deleted',
      },
      actionLabel: TASK_ACTION_LABELS[action] ?? action,
      statusLabel: TASK_STATUS_LABELS[status] ?? status,
      actor: { name: actor.name, sessionId: actor.sessionId || undefined, kind: actor.kind, source },
      time: snapshot.time,
      dedupeKey,
      replay: ctx.historical === true,
      compact: action !== 'create',
    };
    out.push(makeMessage({
      id: dedupeKey,
      kind: 'task_card',
      sessionId: snapshot.sessionId,
      sender: { sessionId: actor.sessionId, name: actor.name, kind: /** @type {any} */ (actor.kind) },
      time: snapshot.time,
      seq: snapshot.seq,
      text: '',
      taskCard: payload,
      meta: { taskId: task.id, revision: task.revision, action, actorSource: source, teamId },
    }));
  }
  return out;
}

/**
 * revision diff 动作识别（§4.2.2 / TCF §4.2，判定顺序不可乱）
 * @param {import('./model.js').TaskCardTask|undefined} prev
 * @param {import('./model.js').TaskCardTask} next
 * @param {string} [actorName]
 * @returns {import('./model.js').TaskAction}
 */
export function diffAction(prev, next, actorName) {
  if (!prev) return 'create';
  if (next.status === 'deleted' && prev.status !== 'deleted') return 'delete';
  if (prev.status === 'completed' && next.status === 'pending') return 'reopen';
  if (prev.status === 'in_progress' && next.status === 'completed') return 'complete';
  if (prev.status === 'pending' && next.status === 'in_progress') {
    if (next.ownerName && actorName && next.ownerName !== actorName) return 'reassign';
    return 'claim';
  }
  if (prev.ownerId !== next.ownerId) {
    if (next.status === 'in_progress' && !next.ownerId) return 'release';
    return 'reassign';
  }
  if (prev.status === 'in_progress' && next.status === 'pending') return 'release';
  if (!sameArray(prev.blockedBy, next.blockedBy)) return 'set_dependencies';
  return 'edit';
}

/** @param {string[]} a @param {string[]} b */
function sameArray(a, b) {
  const x = Array.isArray(a) ? a : [];
  const y = Array.isArray(b) ? b : [];
  if (x.length !== y.length) return false;
  return x.every((v, i) => v === y[i]);
}

/**
 * 模型回退链：descriptor.agentModel → result.member.model → 名册当前 model → 隐藏
 * @param {{teammate: boolean, creation?: any, descriptor?: any, memberEntry?: any}} input
 * @returns {{model?: string, inheritedFrom?: string, source: 'descriptor'|'result_snapshot'|'roster_current'|'unknown'}}
 */
function resolveModel(input) {
  const { teammate, creation, descriptor, memberEntry, creatorName } = input;
  const inheritedFrom = teammate ? 'Lead' : creatorName ?? undefined;
  if (!teammate && descriptor?.agentModel) {
    return { model: descriptor.agentModel, inheritedFrom, source: 'descriptor' };
  }
  if (teammate && creation?.resultMember?.model) {
    return { model: creation.resultMember.model, inheritedFrom: 'Lead', source: 'result_snapshot' };
  }
  if (memberEntry?.model) {
    return { model: memberEntry.model, inheritedFrom, source: 'roster_current' };
  }
  return { source: 'unknown' };
}

/** @param {any} descriptor */
function descriptorLabel(descriptor) {
  return descriptor && typeof descriptor === 'object' && typeof descriptor.label === 'string' ? descriptor.label : undefined;
}

/**
 * 生成初始任务摘要：首个空行前，≤160 字 / 2 行
 * @param {string} prompt
 * @returns {string}
 */
export function excerptPrompt(prompt) {
  const text = String(prompt ?? '');
  const firstParagraph = text.split(/\n\s*\n/)[0] ?? '';
  const lines = firstParagraph.split('\n').slice(0, LIMITS.promptExcerptMaxLines);
  let out = lines.join('\n').trim();
  if (out.length > LIMITS.promptExcerptMaxChars) out = `${out.slice(0, LIMITS.promptExcerptMaxChars - 1)}…`;
  return out;
}

/** @param {'one-shot'|'continuable'|'external'|'unknown'|string|undefined} mode */
function mapLifecycleMode(mode) {
  if (mode === 'one-shot') return 'one_shot';
  if (mode === 'continuable') return 'continuable';
  return 'unknown';
}

/** @param {string} phase */
function mapLifecycle(phase) {
  return MEMBER_PHASE_TO_STATUS[phase] ?? 'unknown';
}

/**
 * @param {string} text
 * @param {number} max
 */
function truncateText(text, max) {
  const s = String(text ?? '');
  if (s.length <= max) return s;
  return `${s.slice(0, max - 20)}\n…（内容过长已截断）`;
}

/** @param {any} a @param {any} b @param {any} c */
function threeWay(a, b, c) {
  for (const v of [a, b, c]) if (typeof v === 'string' && v.trim() !== '') return v;
  return undefined;
}

/**
 * 单会话便捷入口（架构 §4.2 的 `normalize(events, memberCtx)`）
 * @param {any[]} events
 * @param {NormalizeContext & {sessionId?: string, header?: any, cutoff?: number}} ctx
 * @returns {ChannelMessage[]}
 */
export function normalize(events, ctx) {
  const sessionId = ctx.sessionId ?? ctx.leadSessionId ?? 'session';
  const result = normalizeChannel(
    [{ sessionId, header: ctx.header, events, cutoff: ctx.cutoff }],
    { ...ctx, leadSessionId: ctx.leadSessionId ?? sessionId },
  );
  return result.messages;
}
