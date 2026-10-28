// @ts-check
/**
 * 测试辅助：fixture → normalizeChannel + 常用构造器（仅测试使用）
 */
import { loadFixture, leadSessionIdOf, loadFixtureMeta } from '../fixtures/load.js';
import { normalizeChannel, normalizeEntries } from '../../src/core/normalize.js';

/**
 * @param {string} name
 * @param {any} [ctx]
 * @param {{envelope?: boolean}} [opts]
 * @returns {{result: any, lead: string, meta: any, sessions: any[]}}
 */
export function normalizeFixture(name, ctx = {}, opts = {}) {
  const fx = loadFixture(name);
  const lead = leadSessionIdOf(fx.sessions);
  const meta = loadFixtureMeta(name);
  let sessions = fx.sessions.map((s) => ({ sessionId: s.sessionId, header: s.header, events: s.events }));
  if (opts.envelope) {
    sessions = sessions.map((s) => ({ ...s, events: normalizeEntries(s.events).events }));
  }
  const result = normalizeChannel(sessions, {
    leadSessionId: lead,
    ...(meta && meta.localBatches ? { localBatches: meta.localBatches } : {}),
    ...ctx,
  });
  return { result, lead, meta, sessions };
}

/**
 * @param {any[]} messages
 * @param {string} kind
 * @returns {any[]}
 */
export function byKind(messages, kind) {
  return (messages ?? []).filter((m) => m.kind === kind);
}

/**
 * @param {any[]} messages
 * @param {string} id
 * @returns {any}
 */
export function byId(messages, id) {
  return (messages ?? []).find((m) => m.id === id);
}

/**
 * 手工构造标准成员目录（避开投影依赖，测试可控）
 * @param {{leadId?: string, teammates?: Array<{id: string, name: string, status?: string}>, subagents?: Array<{id: string, name: string, parentId: string, status?: string}>}} [input]
 * @returns {import('../../src/core/model.js').ChannelMember[]}
 */
export function makeMembers(input = {}) {
  const leadId = input.leadId ?? 'session-lead';
  /** @type {import('../../src/core/model.js').ChannelMember[]} */
  const members = [
    { sessionId: leadId, name: 'lead', displayName: 'Lead', kind: 'lead', depth: 0, status: 'running', addressable: true },
  ];
  for (const t of input.teammates ?? []) {
    const status = /** @type {any} */ (t.status ?? 'inactive');
    members.push({
      sessionId: t.id,
      name: t.name,
      displayName: t.name,
      kind: 'teammate',
      parentSessionId: leadId,
      depth: 1,
      status,
      addressable: true,
    });
  }
  for (const s of input.subagents ?? []) {
    const status = /** @type {any} */ (s.status ?? 'inactive');
    const parent = members.find((m) => m.sessionId === s.parentId) ?? members[0];
    members.push({
      sessionId: s.id,
      name: s.name,
      displayName: `${s.name} · ${parent.name} 的子体`,
      kind: 'subagent',
      parentSessionId: s.parentId,
      depth: parent.depth + 1,
      status,
      addressable: status === 'running' || status === 'provisioning',
    });
  }
  return members;
}

/**
 * 构造一条裸事件
 * @param {string} type
 * @param {number} seq
 * @param {number} time
 * @param {any} data
 * @returns {any}
 */
export function ev(type, seq, time, data) {
  return { type, seq, time, data };
}
