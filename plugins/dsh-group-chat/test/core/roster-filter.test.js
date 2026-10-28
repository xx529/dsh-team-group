// @ts-check
/**
 * UT-20/32/33/34：成员目录（depth/session 截断、显示名、可寻址）、筛选语义（D-B）、只读判定
 * 契约：架构 §4.8.2 / §5.1 / §6.4.4
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveReadonly,
  deriveRoster,
  deriveSnapshot,
  isAddressable,
  memberByName,
  normalizeMemberStatus,
} from '../../src/core/roster.js';
import { filterMessages, matchesFilter } from '../../src/core/filter.js';
import { makeMembers } from './helpers.js';

const LEAD = 'session-lead';

test('UT-20 深度 ≤3、会话 ≤32 截断；teammate 永不截断；截断必须可见', () => {
  const catalogs = [];
  for (let i = 0; i < 40; i += 1) {
    catalogs.push({ childId: `sub-${i}`, label: `子体${i}`, mode: 'continuable', childCreatedAt: 1793158400000 + i, sessionId: LEAD });
  }
  // 深链：lead → t1 → s1 → s2 → s3(depth=4)
  catalogs.push({ childId: 'deep-1', label: '深1', mode: 'continuable', childCreatedAt: 1, sessionId: 't1' });
  catalogs.push({ childId: 'deep-2', label: '深2', mode: 'continuable', childCreatedAt: 2, sessionId: 'deep-1' });
  catalogs.push({ childId: 'deep-3', label: '深3', mode: 'continuable', childCreatedAt: 3, sessionId: 'deep-2' });
  catalogs.push({ childId: 'deep-4', label: '深4', mode: 'continuable', childCreatedAt: 4, sessionId: 'deep-3' });
  const roster = deriveRoster({
    leadSessionId: LEAD,
    agentTeam: { members: [{ id: 't1', name: 't1', role: 'teammate', status: 'inactive' }] },
    catalogEntries: catalogs,
  });
  assert.ok(roster.members.length <= 32);
  assert.equal(roster.members.filter((m) => m.kind === 'teammate').length, 1, 'teammate 不被截断');
  assert.ok(roster.truncated);
  assert.ok(roster.truncated.omittedSubagents > 0);
  assert.equal(roster.truncated.maxDepth, 3);
  assert.equal(roster.truncated.maxSessions, 32);
  assert.ok(roster.warnings.some((w) => w.startsWith('truncated:')));
  assert.ok(!roster.members.some((m) => m.name === '深4'), 'depth>3 的子会话必须省略');
});

test('显示名与可寻址：subagent 后缀「· 父名 的子体」；one-shot 完成后不可寻址', () => {
  const roster = deriveRoster({
    leadSessionId: LEAD,
    agentTeam: { members: [{ id: 'ux', name: 'ux', role: 'teammate', status: 'running' }] },
    catalogEntries: [
      { childId: 'sub-run', label: '产品设计', mode: 'continuable', childCreatedAt: 1, sessionId: 'ux' },
      { childId: 'sub-done', label: '旧子体', mode: 'one-shot', childCreatedAt: 2, sessionId: 'ux' },
    ],
    sessionSummaries: [{ id: 'sub-run', parentSessionId: 'ux', running: true }],
  });
  const run = roster.members.find((m) => m.sessionId === 'sub-run');
  const done = roster.members.find((m) => m.sessionId === 'sub-done');
  assert.equal(run.displayName, '产品设计 · ux 的子体');
  assert.equal(run.addressable, true);
  assert.equal(done.displayName, '旧子体 · ux 的子体');
  assert.equal(done.status, 'inactive');
  assert.equal(done.addressable, false);
  assert.equal(isAddressable(run), true);
  assert.equal(memberByName(roster.members, '产品设计'), run);
});

test('正常化状态映射 + snapshot 形状', () => {
  assert.equal(normalizeMemberStatus('running'), 'running');
  assert.equal(normalizeMemberStatus('idle'), 'inactive');
  assert.equal(normalizeMemberStatus('failed'), 'failed');
  assert.equal(normalizeMemberStatus('nonsense'), 'unknown');
  const members = makeMembers({ leadId: LEAD, teammates: [{ id: 't1', name: 't1', status: 'running' }] });
  const snapshot = deriveSnapshot(
    { lead: members[0], members, runningCount: 1 },
    { channelId: LEAD, readonly: true, readonlyReason: 'team-ended', now: 123 },
  );
  assert.equal(snapshot.channelId, LEAD);
  assert.equal(snapshot.readonly, true);
  assert.equal(snapshot.readonlyReason, 'team-ended');
  assert.equal(snapshot.generatedAt, 123);
});

test('UT-34 只读判定：无权限/归档/全员 inactive≥90s；不确定偏可写', () => {
  assert.equal(deriveReadonly({ canSend: false }).readonlyReason, 'permission');
  assert.equal(deriveReadonly({ archived: true }).readonlyReason, 'archived');
  const now = 1793158400000;
  assert.equal(deriveReadonly({ leadStatus: 'inactive', allInactiveSince: now - 60_000, now }).readonly, false);
  assert.equal(deriveReadonly({ leadStatus: 'inactive', allInactiveSince: now - 100_000, now }).readonlyReason, 'team-ended');
  assert.equal(deriveReadonly({ leadStatus: 'running' }).readonly, false);
});

test('UT-32/33 筛选：sender 或 targets 命中；父成员包含其 subagent；选 subagent 不含父；不做正文搜索', () => {
  const members = makeMembers({
    leadId: LEAD,
    teammates: [
      { id: 'ux', name: 'ux' },
      { id: 'scout', name: 'scout' },
    ],
    subagents: [{ id: 'sub-design', name: '产品设计', parentId: 'ux', status: 'running' }],
  });
  const base = {
    kind: 'agent_output',
    targets: [],
    targetSessionIds: [],
    text: '',
    time: 1,
    seq: 1,
    isFinal: true,
  };
  const msg = (sessionId, name, kind = 'agent_output', extra = {}) => ({
    ...base,
    id: `${sessionId}:${Math.random()}`,
    sessionId,
    sender: { sessionId, name, kind },
    ...extra,
  });
  const scoutMsg = msg('scout', 'scout');
  const uxMsg = msg('ux', 'ux');
  const subMsg = msg('sub-design', '产品设计', 'subagent');
  const toScout = msg(LEAD, 'lead', 'lead', { targets: ['scout'] });
  const textOnly = msg(LEAD, 'lead', 'lead', { text: '正文里提到 @scout 但没 target' });

  assert.equal(matchesFilter(scoutMsg, 'scout', members), true);
  assert.equal(matchesFilter(toScout, 'scout', members), true);
  assert.equal(matchesFilter(textOnly, 'scout', members), false, '不做正文文本搜索');
  // 父成员筛选包含子体
  assert.equal(matchesFilter(subMsg, 'ux', members), true);
  // 选 subagent 只显示其自身，不反向包含父
  assert.equal(matchesFilter(subMsg, '产品设计', members), true);
  assert.equal(matchesFilter(uxMsg, '产品设计', members), false);
  // 选择后可见集合
  const visible = filterMessages([scoutMsg, uxMsg, subMsg, toScout, textOnly], 'ux', members);
  assert.deepEqual(visible.map((m) => m.sender.name).sort(), ['ux', '产品设计'].sort());
  // 清除筛选恢复
  assert.equal(filterMessages([scoutMsg, uxMsg], undefined, members).length, 2);
});
