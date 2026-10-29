// @ts-check
/**
 * 适配器 · ClientSessionSource（v1 生产实现，纯 Client）
 *
 * 契约：架构 §4.6 `ChannelSource` + §4.8.1 客户端 API 映射 + Spike S1（entries 是原始事件信封）。
 *
 * 依赖注入：`deps = {ctx, channelId, sessionId}`（T2 冻结形状），另支持可选：
 *   `deps.members`（useSessions 的 agentTeam 成员目录）、`deps.isRunning(id)`、`deps.getReadAccess(id)`、
 *   `deps.readonly`、`deps.now`、`deps.sourceKey`、`deps.toolFold`、`deps.maxMessages`。
 *
 * 不依赖 React / DOM / useSessions：可从事件与 `ctx.sessions` 自举成员目录（三源并集见 §4.8.2），
 * 有 `deps.members` 时优先使用（投影更准）。
 */

import { LIMITS } from '../core/constants.js';
import { normalizeChannel, normalizeEntries } from '../core/normalize.js';
import { deriveSnapshot } from '../core/roster.js';
import { buildPage, firstScreen, pageOlder as pageOlderCore } from '../core/paginate.js';
import { cloneCursor, compareOrderKey, makeCursor, orderKey } from '../core/timeline.js';

/**
 * @typedef {import('../core/model.js').ChannelPage} ChannelPage
 * @typedef {import('../core/model.js').ChannelCursor} ChannelCursor
 * @typedef {import('../core/model.js').ChannelMessage} ChannelMessage
 */

/**
 * 从 sessionId 推导频道根（lead）会话 id：
 * `binding(id).session.getSnapshot().subagent?.address?.parentSessionId ?? id`（API §B2）
 * @param {{sessions: any}} ctx
 * @param {string} sessionId
 * @param {string} [sourceKey]
 * @returns {string}
 */
export function deriveLeadSessionId(ctx, sessionId, sourceKey = 'group-chat') {
  const fallback = String(sessionId ?? '');
  if (!ctx || !ctx.sessions || !fallback) return fallback;
  let ref;
  try {
    ref = retainWithSourceFallback(ctx.sessions, fallback, sourceKey);
    const snapshot = ref?.binding?.session?.getSnapshot?.() ?? {};
    const parent =
      snapshot.subagent?.address?.parentSessionId ??
      snapshot.subagent?.address?.parentId ??
      snapshot.parentSessionId ??
      snapshot.parentSession;
    return parent ? String(parent) : fallback;
  } catch {
    return fallback;
  } finally {
    try {
      ref?.release?.();
    } catch {
      /* ignore */
    }
  }
}

/**
 * `SessionReferenceSource` 的第三方向声明合并是 UNVERIFIED（API H-4）→ 失败时退回既有 key `gateway`。
 * @param {any} sessions
 * @param {string} sessionId
 * @param {string} sourceKey
 * @returns {any}
 */
function retainWithSourceFallback(sessions, sessionId, sourceKey) {
  try {
    return sessions.retain(sessionId, { source: sourceKey });
  } catch {
    return sessions.retain(sessionId, { source: 'gateway' });
  }
}

/**
 * @typedef {Object} ClientSourceDeps
 * @property {any} ctx
 * @property {string} [channelId]
 * @property {string} [sessionId]
 * @property {import('../core/model.js').ChannelMember[]} [members]
 * @property {(sessionId: string) => boolean} [isRunning]
 * @property {(sessionId: string) => boolean} [getReadAccess]
 * @property {boolean} [readonly]
 * @property {() => number} [now]
 * @property {string} [sourceKey]
 * @property {'attach'|'delivery'|'none'} [toolFold]
 * @property {number} [maxMessages]
 * @property {boolean} [noRoster]
 */

export class ClientSessionSource {
  /** @param {ClientSourceDeps} deps */
  constructor(deps) {
    if (!deps || !deps.ctx || !deps.ctx.sessions) {
      throw new TypeError('ClientSessionSource: deps.ctx.sessions 必填');
    }
    this.deps = deps;
    this.ctx = deps.ctx;
    this.sourceKey = deps.sourceKey ?? 'group-chat';
    this.sessionId = String(deps.sessionId ?? deps.channelId ?? '');
    this.channelId = String(deps.channelId ?? deps.sessionId ?? '');
    if (!this.channelId) throw new TypeError('ClientSessionSource: 需要 channelId 或 sessionId');
    this.now = deps.now ?? (() => Date.now());
    /** @type {Map<string, any>} */
    this.refs = new Map();
    /** @type {Map<string, {events: any[], revision: number}>} */
    this.store = new Map();
    /** @type {Set<(kind: 'append'|'reset'|'status') => void>} */
    this.listeners = new Set();
    /** @type {Map<string, () => void>} */
    this.unsubscribers = new Map();
    /** @type {ChannelMessage[]} */
    this.messages = [];
    /** @type {import('../core/model.js').ChannelMember[]} */
    this.members = deps.members ?? [];
    this.closed = false;
    this._scheduled = false;
  }

  /**
   * @param {string} channelId
   * @param {{limit?: number}} [opts]
   * @returns {Promise<ChannelPage>}
   */
  async open(channelId, opts = {}) {
    this._assertOpen();
    const resolved = String(channelId ?? this.channelId);
    if (resolved !== this.channelId) {
      this.close();
      this.closed = false;
      this.channelId = resolved;
      this.sessionId = this.sessionId || resolved;
    }
    const computed = this._refresh();
    const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : LIMITS.firstScreen;
    const pageMessages = firstScreen(computed.messages, limit);
    const cursor = makeCursor(this.channelId);
    for (const [sessionId, rec] of this.store) {
      cursor.offsets[sessionId] = rec.events.reduce(
        (max, e) => (typeof e.seq === 'number' && e.seq > max ? e.seq : max),
        -1,
      );
      cursor.revisions[sessionId] = rec.revision;
    }
    if (pageMessages.length > 0) {
      cursor.oldestKey = orderKey(pageMessages[0]);
      cursor.newestKey = orderKey(pageMessages[pageMessages.length - 1]);
    }
    return buildPage({
      channel: computed.channel,
      messages: pageMessages,
      cursor,
      hasMore: computed.messages.length > pageMessages.length || this._anyWindowHasMore(),
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * @param {ChannelCursor} cursor
   * @returns {Promise<ChannelPage>}
   */
  async sync(cursor) {
    this._assertOpen();
    const computed = this._refresh();
    /** @type {ChannelMessage[]} */
    const delta = [];
    for (const m of computed.messages) {
      if (!cursor?.newestKey || compareOrderKey(orderKey(m), cursor.newestKey) > 0) delta.push(m);
    }
    const next = cloneCursor(cursor, this.channelId);
    if (computed.messages.length > 0) {
      next.newestKey = orderKey(computed.messages[computed.messages.length - 1]);
      if (!next.oldestKey) next.oldestKey = orderKey(computed.messages[0]);
    }
    for (const [sessionId, rec] of this.store) {
      next.revisions[sessionId] = rec.revision;
      next.offsets[sessionId] = rec.events.reduce(
        (max, e) => (typeof e.seq === 'number' && e.seq > max ? e.seq : max),
        next.offsets[sessionId] ?? -1,
      );
    }
    return buildPage({
      channel: computed.channel,
      messages: delta,
      cursor: next,
      hasMore: false,
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * @param {ChannelCursor} cursor
   * @param {number} [limit]
   * @returns {Promise<ChannelPage>}
   */
  async pageOlder(cursor, limit = LIMITS.pageSize) {
    this._assertOpen();
    // 优先用会话级窗口扩展原语（§4.5/PRD F10）
    const loads = [];
    for (const [sessionId, ref] of this.refs) {
      const session = ref?.binding?.session;
      if (session && typeof session.loadOlder === 'function') {
        loads.push(
          Promise.resolve()
            .then(() => session.loadOlder())
            .catch(() => false),
        );
      }
    }
    if (loads.length > 0) await Promise.all(loads);
    const computed = this._refresh();
    const next = cloneCursor(cursor, this.channelId);
    const older = pageOlderCore(computed.messages, next.oldestKey, limit);
    if (older.length > 0) next.oldestKey = orderKey(older[0]);
    const remaining = computed.messages.filter(
      (m) => !next.oldestKey || compareOrderKey(orderKey(m), next.oldestKey) < 0,
    );
    return buildPage({
      channel: computed.channel,
      messages: older,
      cursor: next,
      hasMore: remaining.length > 0 || this._anyWindowHasMore(),
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * @param {(kind: 'append'|'reset'|'status') => void} onChange
   * @returns {() => void}
   */
  subscribe(onChange) {
    this.listeners.add(onChange);
    this._ensureRetained(this.channelId);
    for (const [sessionId, ref] of this.refs) this._subscribeWindow(sessionId, ref);
    return () => {
      this.listeners.delete(onChange);
    };
  }

  /** @returns {{canSend: boolean, reason?: string}} */
  capabilities() {
    if (this.closed) return { canSend: false, reason: 'closed' };
    if (this.deps.readonly === true) return { canSend: false, reason: 'readonly' };
    const leadRef = this.refs.get(this.channelId);
    if (!leadRef) return { canSend: false, reason: 'session-missing' };
    if (typeof this.deps.getReadAccess === 'function' && this.deps.getReadAccess(this.channelId) === false) {
      return { canSend: false, reason: 'permission' };
    }
    return { canSend: true };
  }

  close() {
    this.closed = true;
    for (const unsub of this.unsubscribers.values()) {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    }
    this.unsubscribers.clear();
    for (const ref of this.refs.values()) {
      try {
        ref?.release?.();
      } catch {
        /* ignore */
      }
    }
    this.refs.clear();
    this.store.clear();
    this.listeners.clear();
    this.messages = [];
  }

  /** UI 便捷：最近一次计算的全部消息（已排序去重） */
  getMessages() {
    return this.messages;
  }

  /** UI 便捷：最近一次计算的成员目录 */
  getMembers() {
    return this.members;
  }

  /**
   * UI 便捷（只读）：某会话已 retain 的事件窗口内**原始事件**（F3 轨迹真实轮次用）。
   * 与 feed 同一份窗口，不新增 retain；已关闭/未知会话返回 []，不抛错。
   * @param {string} [sessionId] 默认频道根会话
   * @returns {any[]}
   */
  getEvents(sessionId = this.channelId) {
    const sid = String(sessionId ?? this.channelId ?? '');
    if (!sid) return [];
    try {
      const stored = this.store.get(sid);
      if (stored && Array.isArray(stored.events)) return stored.events.slice();
      const win = this._windowOf(sid);
      return normalizeEntries(win.entries).events;
    } catch {
      return [];
    }
  }

  /**
   * getEvents 的别名（frontend 探测 `getEvents/getMemberEvents` 任一即可）
   * @param {string} [sessionId]
   * @returns {any[]}
   */
  getMemberEvents(sessionId = this.channelId) {
    return this.getEvents(sessionId);
  }

  /**
   * UI 便捷（只读）：窗口元信息 + 原始事件（轨迹侧栏可据此缓存/分页）
   * @param {string} [sessionId]
   * @returns {{sessionId: string, events: any[], entryCount: number, revision: number, hasMore: boolean, partial: boolean}}
   */
  getWindow(sessionId = this.channelId) {
    const sid = String(sessionId ?? this.channelId ?? '');
    if (!sid) return { sessionId: '', events: [], entryCount: 0, revision: 0, hasMore: false, partial: true };
    const stored = this.store.get(sid);
    const win = this._windowOf(sid);
    return {
      sessionId: sid,
      events: this.getEvents(sid),
      entryCount: win.entries.length,
      revision: Number(stored?.revision ?? win.revision ?? 0),
      hasMore: win.hasMore === true,
      partial: win.hasMore === true,
    };
  }

  // ── 内部 ─────────────────────────────────────────────────────
  _assertOpen() {
    if (this.closed) throw new Error('ClientSessionSource: closed');
  }

  /**
   * @param {string} sessionId
   * @returns {any}
   */
  _ensureRetained(sessionId) {
    const sid = String(sessionId);
    if (!sid) return undefined;
    const existing = this.refs.get(sid);
    if (existing) return existing;
    const ref = retainWithSourceFallback(this.ctx.sessions, sid, this.sourceKey);
    this.refs.set(sid, ref);
    this._subscribeWindow(sid, ref);
    return ref;
  }

  /**
   * @param {string} sessionId
   * @param {any} ref
   */
  _subscribeWindow(sessionId, ref) {
    if (this.unsubscribers.has(sessionId)) return;
    const es = ref?.binding?.eventSource;
    const subscribe = es?.subscribe ?? es?.subscribeValue;
    if (typeof subscribe !== 'function') return;
    try {
      const unsub = subscribe.call(es, () => this._schedule('append'));
      if (typeof unsub === 'function') this.unsubscribers.set(sessionId, unsub);
    } catch {
      /* 订阅失败不阻塞读取；sync 兜底 */
    }
  }

  _schedule(kind) {
    if (this._scheduled) return;
    this._scheduled = true;
    Promise.resolve().then(() => {
      this._scheduled = false;
      for (const fn of this.listeners) {
        try {
          fn(kind);
        } catch {
          /* ignore */
        }
      }
    });
  }

  /**
   * 读取一个会话窗口
   * @param {string} sessionId
   * @returns {{entries: any[], revision: number, hasMore: boolean}}
   */
  _windowOf(sessionId) {
    const ref = this.refs.get(sessionId);
    const win = ref?.binding?.eventSource?.getSnapshot?.();
    if (win && Array.isArray(win.entries)) {
      return { entries: win.entries, revision: Number(win.revision ?? 0), hasMore: win.hasMore === true };
    }
    if (win && Array.isArray(win.events)) {
      return { entries: win.events.map((event) => ({ type: 'event', event })), revision: Number(win.revision ?? 0), hasMore: false };
    }
    return { entries: [], revision: 0, hasMore: false };
  }

  _anyWindowHasMore() {
    for (const sessionId of this.refs.keys()) {
      const win = this.refs.get(sessionId)?.binding?.eventSource?.getSnapshot?.();
      if (win?.hasMore === true) return true;
    }
    return false;
  }

  /** @returns {{channel: any, messages: ChannelMessage[], diagnostics: any}} */
  _refresh() {
    this._ensureRetained(this.channelId);
    const seen = new Set();
    // BFS：从 lead 事件里的 catalog / team-member 发现后代会话（depth/session 上限内）
    for (let round = 0; round < LIMITS.maxDepth + 2; round += 1) {
      let discovered = 0;
      for (const sessionId of [...this.refs.keys()]) {
        if (seen.has(sessionId)) continue;
        seen.add(sessionId);
        const win = this._windowOf(sessionId);
        const { events } = normalizeEntries(win.entries);
        this.store.set(sessionId, { events, revision: win.revision });
        if (this.refs.size >= LIMITS.maxSessions) continue;
        for (const event of events) {
          const data = event?.data ?? {};
          const childIds = [];
          if (event.type === 'subagent/catalog' && data.childId) childIds.push(String(data.childId));
          if (event.type === 'team/member' && data.member?.id) childIds.push(String(data.member.id));
          for (const childId of childIds) {
            if (childId && !this.refs.has(childId) && this.refs.size < LIMITS.maxSessions) {
              this._ensureRetained(childId);
              discovered += 1;
            }
          }
        }
      }
      if (discovered === 0) break;
    }
    // 已不在成员目录的会话继续保留引用（历史可读），但不进入本次归一化集合之外的场景不适用
    /** @type {import('../core/model.js').SessionInput[]} */
    const sessions = [];
    for (const [sessionId] of this.refs) {
      const rec = this.store.get(sessionId);
      if (!rec) continue;
      let header = {};
      try {
        header = this.refs.get(sessionId)?.binding?.session?.getSnapshot?.() ?? {};
      } catch {
        header = {};
      }
      sessions.push({ sessionId, header, events: rec.events, revision: rec.revision });
    }
    // D-03：从会话快照读取真实 running（active 相位 ≠ running；避免「N members · N running」高估）
    /** @type {Array<{id: string, parentSessionId?: string, running?: boolean, status?: string}>} */
    const sessionSummaries = [];
    for (const [sessionId, ref] of this.refs) {
      let snapshot = /** @type {any} */ ({});
      try {
        snapshot = ref?.binding?.session?.getSnapshot?.() ?? {};
      } catch {
        snapshot = {};
      }
      sessionSummaries.push({
        id: sessionId,
        parentSessionId: snapshot.parentSession ?? snapshot.subagent?.address?.parentSessionId,
        ...(typeof snapshot.running === 'boolean'
          ? { running: snapshot.running, status: snapshot.running ? 'running' : 'inactive' }
          : {}),
      });
    }
    const result = normalizeChannel(sessions, {
      leadSessionId: this.channelId,
      members: this.deps.members,
      sessionSummaries,
      noRoster: this.deps.noRoster === undefined ? !this.deps.members : this.deps.noRoster,
      localBatches: this.deps.localBatches,
      toolFold: this.deps.toolFold,
      canRead: this.deps.getReadAccess,
      maxMessages: this.deps.maxMessages,
    });
    this.messages = result.messages;
    this.members = result.members;
    const lead = this.members.find((m) => m.kind === 'lead') ?? {
      sessionId: this.channelId,
      name: 'lead',
      displayName: 'Lead',
      kind: /** @type {'lead'} */ ('lead'),
      depth: 0,
      status: /** @type {'running'} */ ('running'),
      addressable: true,
    };
    const readonlyFromEvents = false;
    const channel = deriveSnapshot(
      {
        lead,
        members: this.members,
        runningCount: this.members.filter((m) => m.status === 'running').length,
        degraded: this.deps.members ? undefined : result.degraded,
        truncated: result.truncated,
      },
      {
        channelId: this.channelId,
        readonly: this.deps.readonly === true || readonlyFromEvents,
        now: this.now(),
      },
    );
    return { channel, messages: result.messages, diagnostics: result.diagnostics };
  }
}

/**
 * T2 冻结入口：`createClientSessionSource({ctx, channelId, sessionId})` → ChannelSource
 * @param {ClientSourceDeps} deps
 * @returns {ClientSessionSource}
 */
export function createClientSessionSource(deps) {
  return new ClientSessionSource(deps);
}
