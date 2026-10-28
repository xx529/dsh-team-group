// @ts-check
/**
 * 适配器测试辅助 · 用 fixtures 复刻 `ctx.sessions` 的最小宿主（replay 模式）
 *
 * 形状对齐架构 §4.6 / API §B1：
 *   `ctx.sessions.retain(id, {source}) → {binding:{session, eventSource}, release()}`
 *   `binding.eventSource.getSnapshot() → {entries, revision, hasMore, change}`
 *   `binding.session.getSnapshot()` / `loadOlder()`
 *
 * 仅测试/集成回放使用；生产 client 走真实 `ctx.sessions`。
 */

/**
 * @param {{sessionId: string, header?: any, events?: any[], revision?: number}[]} sessions
 * @param {{withTransient?: boolean, hasMore?: boolean}} [opts]
 */
export function createReplaySessionHost(sessions, opts = {}) {
  /** @type {Map<string, {header: any, events: any[], revision: number, refs: number, listeners: Set<Function>}>} */
  const store = new Map();
  for (const s of Array.isArray(sessions) ? sessions : []) {
    store.set(String(s.sessionId), {
      header: s.header ?? { id: s.sessionId },
      events: Array.isArray(s.events) ? s.events.map((e) => ({ ...e })) : [],
      revision: Number(s.revision ?? 1),
      refs: 0,
      listeners: new Set(),
    });
  }

  const makeWindow = (sid) => {
    const rec = store.get(sid);
    if (!rec) return { entries: [], revision: -1, hasMore: false, change: { kind: 'replace' } };
    const entries = rec.events.map((event) => {
      if (event && (event.type === 'event' || event.type === 'transient') && event.event) return event;
      return { type: 'event', event };
    });
    return { entries, revision: rec.revision, hasMore: opts.hasMore === true, change: { kind: 'replace' } };
  };

  const host = {
    /**
     * @param {string} sessionId
     * @param {{source?: string}} [retainOpts]
     */
    retain(sessionId, retainOpts = {}) {
      const sid = String(sessionId);
      if (!store.has(sid)) {
        store.set(sid, { header: { id: sid }, events: [], revision: 0, refs: 0, listeners: new Set() });
      }
      const rec = store.get(sid);
      rec.refs += 1;
      return {
        sessionId: sid,
        binding: {
          session: {
            getSnapshot: () => ({ ...rec.header, id: sid }),
            loadOlder: async () => false,
          },
          eventSource: {
            getSnapshot: () => makeWindow(sid),
            subscribe: (fn) => {
              rec.listeners.add(fn);
              return () => rec.listeners.delete(fn);
            },
          },
        },
        release: () => {
          rec.refs = Math.max(0, rec.refs - 1);
        },
        _source: retainOpts.source,
      };
    },
    /** @param {string} sessionId */
    binding(sessionId) {
      return host.retain(sessionId).binding;
    },
    /**
     * 列表（`sessions.list.byId` 形状）
     * @returns {any[]}
     */
    list() {
      return [...store.entries()].map(([id, rec]) => ({
        id,
        parentSessionId: rec.header?.parentSession,
        running: false,
        createdAt: rec.header?.createdAt,
      }));
    },
    /** 注入新事件并通知订阅者（模拟实时 append） */
    appendEvents(sessionId, events) {
      const rec = store.get(String(sessionId));
      if (!rec) return;
      rec.events.push(...events);
      rec.revision += 1;
      for (const fn of rec.listeners) fn({ kind: 'append' });
    },
    /** 覆盖事件（模拟窗口 replace） */
    setEvents(sessionId, events) {
      const rec = store.get(String(sessionId));
      if (!rec) return;
      rec.events = events.map((e) => ({ ...e }));
      rec.revision += 1;
      for (const fn of rec.listeners) fn({ kind: 'replace' });
    },
    /** 读取内部事件（测试断言用） */
    eventsOf(sessionId) {
      return [...(store.get(String(sessionId))?.events ?? [])];
    },
    /** 引用计数（测试 close/release 用） */
    refCount(sessionId) {
      return store.get(String(sessionId))?.refs ?? 0;
    },
    /** 当前 revision（测试游标用） */
    revisionOf(sessionId) {
      return store.get(String(sessionId))?.revision ?? -1;
    },
    _store: store,
  };
  return host;
}
