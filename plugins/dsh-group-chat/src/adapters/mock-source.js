// @ts-check
/**
 * 适配器 · MockChannelSource（测试/组件预览用，内存实现）
 *
 * 与 `ClientSessionSource` 共享同一套 `ChannelSource` 契约（§4.6）与同一内核，
 * 因此可作为契约测试的「同一套用例跑两个实现」的第一个实现（§8.1 L2）。
 *
 * 依赖：`src/core` 纯函数；不读 DOM / Cordis。
 */

import { LIMITS } from '../core/constants.js';
import { normalizeEntries, normalizeChannel } from '../core/normalize.js';
import { deriveSnapshot } from '../core/roster.js';
import { buildPage, firstScreen, pageOlder as pageOlderCore } from '../core/paginate.js';
import {
  cloneCursor,
  compareOrderKey,
  makeCursor,
  orderKey,
} from '../core/timeline.js';

/**
 * @typedef {import('../core/model.js').ChannelMessage} ChannelMessage
 * @typedef {import('../core/model.js').ChannelCursor} ChannelCursor
 * @typedef {import('../core/model.js').ChannelPage} ChannelPage
 * @typedef {import('../core/model.js').ChannelSnapshot} ChannelSnapshot
 */

/**
 * @typedef {Object} MockSourceOptions
 * @property {string} leadSessionId
 * @property {import('../core/model.js').SessionInput[]} sessions
 * @property {import('../core/model.js').ChannelMember[]} [members]        注入名册（缺省从事件推导）
 * @property {boolean} [noRoster]
 * @property {boolean} [historical]
 * @property {boolean} [readonly]
 * @property {'team-ended'|'lead-offline'|'archived'|'permission'} [readonlyReason]
 * @property {Record<string, any>} [localBatches]
 * @property {'attach'|'delivery'|'none'} [toolFold]
 * @property {any} [capabilities]
 * @property {() => number} [now]
 * @property {boolean} [hasMore]
 * @property {number} [maxMessages]
 * @property {Array<{id: string, parentSessionId?: string, running?: boolean, status?: string}>} [sessionSummaries]
 */

/** @implements {import('../core/model.js').ChannelPage|any} */
export class MockChannelSource {
  /** @param {MockSourceOptions} opts */
  constructor(opts) {
    if (!opts || !opts.leadSessionId) throw new TypeError('MockChannelSource: 需要 leadSessionId');
    this.leadSessionId = String(opts.leadSessionId);
    this.sessions = (opts.sessions ?? []).map((s) => ({
      sessionId: String(s.sessionId),
      header: s.header ?? { id: s.sessionId },
      events: Array.isArray(s.events) ? s.events : [],
      cutoff: s.cutoff,
      revision: s.revision,
    }));
    this.members = opts.members;
    this.noRoster = opts.noRoster === undefined ? !opts.members : opts.noRoster === true;
    this.historical = opts.historical === true;
    this.readonly = opts.readonly === true;
    this.readonlyReason = opts.readonlyReason;
    this.localBatches = opts.localBatches ?? {};
    this.toolFold = opts.toolFold;
    this.capabilitiesOverride = opts.capabilities;
    this.now = opts.now ?? (() => Date.now());
    this.hasMore = opts.hasMore === true;
    this.maxMessages = opts.maxMessages;
    this.sessionSummaries = opts.sessionSummaries;
    /** @type {Set<(kind: 'append'|'reset'|'status') => void>} */
    this.listeners = new Set();
    this.closed = false;
    this.channelId = this.leadSessionId;
  }

  /**
   * 打开频道（幂等：重复 open 产出同一结果）
   * @param {string} channelId
   * @param {{limit?: number}} [opts]
   * @returns {Promise<ChannelPage>}
   */
  async open(channelId, opts = {}) {
    this._assertOpen();
    this.channelId = channelId || this.leadSessionId;
    const computed = this._compute();
    const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : LIMITS.firstScreen;
    const pageMessages = firstScreen(computed.messages, limit);
    const cursor = makeCursor(this.channelId);
    for (const s of this.sessions) {
      const { events } = normalizeEntries(s.events);
      cursor.offsets[s.sessionId] = events.reduce((max, e) => (typeof e.seq === 'number' && e.seq > max ? e.seq : max), -1);
      cursor.revisions[s.sessionId] = Number(s.revision ?? 0);
    }
    if (pageMessages.length > 0) {
      cursor.oldestKey = orderKey(pageMessages[0]);
      cursor.newestKey = orderKey(pageMessages[pageMessages.length - 1]);
    }
    return buildPage({
      channel: computed.channel,
      messages: pageMessages,
      cursor,
      hasMore: computed.messages.length > pageMessages.length || this.hasMore,
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * 增量同步（幂等：cursor.newestKey 不变时返回空增量）
   * @param {ChannelCursor} cursor
   * @returns {Promise<ChannelPage>}
   */
  async sync(cursor) {
    this._assertOpen();
    const computed = this._compute();
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
   * 向上分页（幂等：同一 oldestKey 重复调用返回空页）
   * @param {ChannelCursor} cursor
   * @param {number} [limit]
   * @returns {Promise<ChannelPage>}
   */
  async pageOlder(cursor, limit = LIMITS.pageSize) {
    this._assertOpen();
    const computed = this._compute();
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
      hasMore: remaining.length > 0,
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * 订阅权威变更（mock：appendEvents 触发）
   * @param {(kind: 'append'|'reset'|'status') => void} onChange
   * @returns {() => void}
   */
  subscribe(onChange) {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  /**
   * @returns {{canSend: boolean, reason?: string}}
   */
  capabilities() {
    if (this.capabilitiesOverride) return this.capabilitiesOverride;
    if (this.closed) return { canSend: false, reason: 'closed' };
    if (this.readonly) return { canSend: false, reason: 'readonly' };
    return { canSend: true };
  }

  close() {
    this.closed = true;
    this.listeners.clear();
  }

  // ── 测试辅助 ────────────────────────────────────────────────
  /** 追加事件并通知订阅者 */
  appendEvents(sessionId, events) {
    const s = this.sessions.find((x) => x.sessionId === sessionId);
    if (!s) return;
    s.events = [...s.events, ...(Array.isArray(events) ? events : [])];
    this._emit('append');
  }

  /** 替换事件（窗口 replace）并通知 */
  setEvents(sessionId, events) {
    const s = this.sessions.find((x) => x.sessionId === sessionId);
    if (!s) return;
    s.events = Array.isArray(events) ? events : [];
    this._emit('reset');
  }

  /** 替换名册（成员增删） */
  setMembers(members) {
    this.members = members;
    this._emit('reset');
  }

  /** @param {'append'|'reset'|'status'} kind */
  _emit(kind) {
    for (const fn of this.listeners) {
      try {
        fn(kind);
      } catch {
        /* mock 不吞真实异常，只隔离订阅者 */
      }
    }
  }

  _assertOpen() {
    if (this.closed) throw new Error('MockChannelSource: closed');
  }

  /** @returns {{channel: ChannelSnapshot, messages: ChannelMessage[], diagnostics: any}} */
  _compute() {
    const sessionSummaries =
      Array.isArray(this.sessionSummaries) && this.sessionSummaries.length > 0
        ? this.sessionSummaries
        : this.sessions.map((s) => ({
            id: s.sessionId,
            parentSessionId: s.header?.parentSession,
            ...(typeof s.header?.running === 'boolean'
              ? { running: s.header.running, status: s.header.running ? 'running' : 'inactive' }
              : {}),
          }));
    /** @type {import('../core/model.js').NormalizeContext} */
    const ctx = {
      leadSessionId: this.leadSessionId,
      members: this.members,
      sessionSummaries,
      noRoster: this.noRoster,
      historical: this.historical,
      localBatches: this.localBatches,
      toolFold: this.toolFold,
      maxMessages: this.maxMessages,
    };
    const result = normalizeChannel(this.sessions, ctx);
    const lead = result.members.find((m) => m.kind === 'lead') ?? {
      sessionId: this.leadSessionId,
      name: 'lead',
      displayName: 'Lead',
      kind: /** @type {'lead'} */ ('lead'),
      depth: 0,
      status: /** @type {'running'} */ ('running'),
      addressable: true,
    };
    const channel = deriveSnapshot(
      {
        lead,
        members: result.members,
        runningCount: result.members.filter((m) => m.status === 'running').length,
        degraded: result.degraded,
        truncated: result.truncated,
      },
      {
        channelId: this.channelId,
        readonly: this.readonly,
        readonlyReason: this.readonlyReason,
        now: this.now(),
      },
    );
    return { channel, messages: result.messages, diagnostics: result.diagnostics };
  }
}
