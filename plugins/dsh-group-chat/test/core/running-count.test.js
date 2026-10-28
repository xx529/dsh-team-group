// @ts-check
/**
 * D-03（数据侧）回归：成员 running 口径 = 会话快照的真实 running，而不是「phase=active 即 running」
 * 契约：架构 §4.1 ChannelMember.status / §4.8.2 成员目录；冒烟缺陷 RUN.md D-03
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveRoster, deriveSnapshot } from '../../src/core/roster.js';
import { normalizeChannel } from '../../src/core/normalize.js';
import { MockChannelSource } from '../../src/adapters/mock-source.js';
import { ClientSessionSource } from '../../src/adapters/client-session-source.js';
import { createReplaySessionHost } from '../../src/adapters/replay-host.js';
import { ev } from './helpers.js';

const T = 1793158400000;
const LEAD = 'session-lead';
const T1 = 'session-t1';
const T2 = 'session-t2';

function teamMemberEvent(seq, memberId, name) {
  return ev('team/member', seq, T + seq, {
    version: 2,
    teamId: LEAD,
    member: { id: memberId, name, description: `desc of ${name}`, provider: 'spawn', context: 'fresh', phase: 'active' },
  });
}

test('deriveRoster：phase=active 但会话 running=false → status=inactive；runningCount 按快照', () => {
  const roster = deriveRoster({
    leadSessionId: LEAD,
    agentTeam: { members: [{ id: T1, name: 't1', role: 'teammate', status: 'running' }, { id: T2, name: 't2', role: 'teammate', status: 'running' }] },
    sessionSummaries: [
      { id: LEAD, running: true },
      { id: T1, running: true },
      { id: T2, running: false },
    ],
  });
  assert.equal(roster.members.find((m) => m.sessionId === T1).status, 'running');
  assert.equal(roster.members.find((m) => m.sessionId === T2).status, 'inactive');
  const snapshot = deriveSnapshot(roster, { channelId: LEAD, now: 1 });
  assert.equal(snapshot.runningCount, 2, 'lead + t1 运行中');
});

test('normalizeChannel：ctx.sessionSummaries 修正事件推断的 active→running 高估', () => {
  const sessions = [
    {
      sessionId: LEAD,
      header: { id: LEAD, running: true },
      events: [teamMemberEvent(1, T1, 't1'), teamMemberEvent(2, T2, 't2')],
    },
    { sessionId: T1, header: { id: T1, parentSession: LEAD, running: true }, events: [] },
    { sessionId: T2, header: { id: T2, parentSession: LEAD, running: false }, events: [] },
  ];
  const withSummaries = normalizeChannel(sessions, {
    leadSessionId: LEAD,
    sessionSummaries: [
      { id: LEAD, running: true },
      { id: T1, running: true },
      { id: T2, running: false },
    ],
  });
  const t2 = withSummaries.members.find((m) => m.sessionId === T2);
  assert.equal(t2.status, 'inactive');
  assert.equal(withSummaries.members.filter((m) => m.status === 'running').length, 2);

  // 不给摘要时保持旧兜底（active→running），避免回归
  const withoutSummaries = normalizeChannel(sessions, { leadSessionId: LEAD });
  assert.equal(withoutSummaries.members.find((m) => m.sessionId === T2).status, 'running');
});

test('MockChannelSource：从 session header.running 计算 runningCount（不再 9/9 高估）', async () => {
  const source = new MockChannelSource({
    leadSessionId: LEAD,
    sessions: [
      { sessionId: LEAD, header: { id: LEAD, running: true }, events: [teamMemberEvent(1, T1, 't1'), teamMemberEvent(2, T2, 't2')] },
      { sessionId: T1, header: { id: T1, parentSession: LEAD, running: true }, events: [] },
      { sessionId: T2, header: { id: T2, parentSession: LEAD, running: false }, events: [] },
    ],
  });
  const page = await source.open(LEAD);
  assert.equal(page.channel.runningCount, 2);
  assert.equal(page.channel.members.find((m) => m.sessionId === T2).status, 'inactive');
  source.close();
});

test('ClientSessionSource：从 binding(id).session.getSnapshot().running 计算 runningCount', async () => {
  const sessions = [
    { sessionId: LEAD, header: { id: LEAD, running: true }, events: [teamMemberEvent(1, T1, 't1'), teamMemberEvent(2, T2, 't2')] },
    { sessionId: T1, header: { id: T1, parentSession: LEAD, running: true }, events: [] },
    { sessionId: T2, header: { id: T2, parentSession: LEAD, running: false }, events: [] },
  ];
  const host = createReplaySessionHost(sessions);
  const source = new ClientSessionSource({ ctx: { sessions: host }, channelId: LEAD, sessionId: LEAD });
  const page = await source.open(LEAD);
  assert.equal(page.channel.runningCount, 2);
  assert.equal(page.channel.members.find((m) => m.sessionId === T2).status, 'inactive');
  source.close();
});

test('T2 显式传入 deps.members 时优先使用投影状态（数据侧不覆盖）', async () => {
  const members = [
    { sessionId: LEAD, name: 'lead', displayName: 'Lead', kind: 'lead', depth: 0, status: 'running', addressable: true },
    { sessionId: T1, name: 't1', displayName: 't1', kind: 'teammate', parentSessionId: LEAD, depth: 1, status: 'inactive', addressable: true },
  ];
  const source = new MockChannelSource({
    leadSessionId: LEAD,
    members,
    sessions: [
      { sessionId: LEAD, header: { id: LEAD, running: true }, events: [teamMemberEvent(1, T1, 't1')] },
      { sessionId: T1, header: { id: T1, parentSession: LEAD, running: true }, events: [] },
    ],
  });
  const page = await source.open(LEAD);
  assert.equal(page.channel.members.find((m) => m.sessionId === T1).status, 'inactive', '投影 says inactive');
  assert.equal(page.channel.runningCount, 1);
  source.close();
});
