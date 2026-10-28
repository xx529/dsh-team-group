// @ts-check
/**
 * F-02 回归：authority roster（agentTeam 投影）合并事件名册；历史消息/任务卡身份显示真实成员名；
 * 无名字时不得把 sessionId 短截断当显示名；事件名册里的 subagent 必须保留。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChannel } from '../../src/core/normalize.js';
import { MockChannelSource } from '../../src/adapters/mock-source.js';
import { ClientSessionSource } from '../../src/adapters/client-session-source.js';
import { createReplaySessionHost } from '../../src/adapters/replay-host.js';
import { ev, makeMembers } from './helpers.js';

const T = 1793158400000;
const LEAD = 'session-lead';
const UX = '8c86b049-1111-4111-8111-111111111111';
const PM = 'e51e798b-2222-4222-8222-222222222222';
const ARCH = '5e2a4b71-3333-4333-8333-333333333333';
const SUB = 'session-sub-1';
const GHOST = 'deadbeef-4444-4444-8444-444444444444';

const AUTHORITY = makeMembers({
  leadId: LEAD,
  teammates: [
    { id: UX, name: 'ux' },
    { id: PM, name: 'pm' },
    { id: ARCH, name: 'architect' },
  ],
});

/** 子会话里收到的 peer 消息：sender 由 authority 反解 */
function peerMessageFrom(senderSessionId, seq = 1, withPrefix = true) {
  return ev('user/message', seq, T + seq, {
    id: `msg-peer-${seq}`,
    role: 'user',
    content: withPrefix
      ? [{ type: 'text', text: 'Team message from someone:' }, { type: 'text', text: '进度同步' }]
      : [{ type: 'text', text: '进度同步' }],
    source: { kind: 'agent-message', senderSessionId },
  });
}

/** 任务卡：lead journal 快照 */
function taskSnapshot(seq, id, revision, status, ownerId) {
  return ev('team/task', seq, T + seq, {
    version: 2,
    teamId: LEAD,
    task: {
      id,
      revision,
      subject: `任务 ${id}`,
      description: 'desc',
      status,
      ...(ownerId ? { ownerId } : {}),
      blockedBy: [],
      writeScopes: [],
    },
  });
}

test('authority roster 覆盖历史消息 sender（ux/pm/architect），不显示 id 截断', () => {
  const sessions = [
    {
      sessionId: LEAD,
      header: { id: LEAD },
      events: [peerMessageFrom(PM, 1), peerMessageFrom(ARCH, 2)],
    },
    { sessionId: UX, header: { id: UX, parentSession: LEAD }, events: [] },
    { sessionId: PM, header: { id: PM, parentSession: LEAD }, events: [] },
    { sessionId: ARCH, header: { id: ARCH, parentSession: LEAD }, events: [] },
  ];
  const result = normalizeChannel(sessions, { leadSessionId: LEAD, members: AUTHORITY });
  const peers = result.messages.filter((m) => m.kind === 'agent_to_agent');
  assert.equal(peers.length, 2);
  assert.deepEqual(peers.map((m) => m.sender.name).sort(), ['architect', 'pm']);
  for (const m of peers) {
    assert.ok(!/^[0-9a-f]{8}$/i.test(m.sender.name), `sender 不能是 id 截断：${m.sender.name}`);
  }
  const names = result.members.map((m) => m.name);
  assert.deepEqual(names, ['lead', 'ux', 'pm', 'architect']);
  assert.equal(result.degraded, undefined, '有 authority roster → 不标 degraded');
});

test('authority roster 覆盖任务卡 actor/owner（claim 的 ux、owner-inferred 的 pm）', () => {
  const sessions = [
    {
      sessionId: LEAD,
      header: { id: LEAD },
      events: [
        taskSnapshot(1, 'task-1', 1, 'pending'),
        taskSnapshot(2, 'task-1', 2, 'in_progress', UX),
        taskSnapshot(3, 'task-2', 1, 'pending'),
        taskSnapshot(4, 'task-2', 2, 'in_progress', PM),
      ],
    },
    {
      sessionId: UX,
      header: { id: UX, parentSession: LEAD },
      events: [
        ev('tool/call', 10, T + 2000, { turn: 1, callId: 'c1', name: 'team_task_update', arguments: '{"task_id":"task-1","expected_revision":1,"action":"claim"}' }),
        ev('tool/result', 11, T + 2001, {
          turn: 1,
          message: {
            toolCallId: 'c1',
            isError: false,
            content: [{ type: 'text', text: '{"id":"task-1","revision":2,"status":"in_progress","ownerName":"ux"}' }],
          },
        }),
      ],
    },
  ];
  const result = normalizeChannel(sessions, { leadSessionId: LEAD, members: AUTHORITY });
  const cards = result.messages.filter((m) => m.kind === 'task_card');
  const claim = cards.find((m) => m.taskCard.task.id === 'task-1' && m.taskCard.task.revision === 2);
  assert.equal(claim.sender.name, 'ux');
  assert.equal(claim.taskCard.actor.name, 'ux');
  assert.equal(claim.taskCard.actor.source, 'paired');
  assert.equal(claim.taskCard.task.ownerName, 'ux');

  const inferred = cards.find((m) => m.taskCard.task.id === 'task-2' && m.taskCard.task.revision === 2);
  assert.equal(inferred.taskCard.actor.name, 'pm', 'owner-inferred 用 authority 名');
  assert.equal(inferred.taskCard.actor.source, 'owner-inferred');
  assert.equal(inferred.taskCard.task.ownerName, 'pm');
});

test('无名字时回退可读名（成员），绝不显示 sessionId 截断', () => {
  const sessions = [
    {
      sessionId: LEAD,
      header: { id: LEAD },
      events: [
        peerMessageFrom(GHOST, 1, false),
        taskSnapshot(2, 'task-9', 1, 'pending'),
        taskSnapshot(3, 'task-9', 2, 'in_progress', GHOST),
      ],
    },
  ];
  const result = normalizeChannel(sessions, { leadSessionId: LEAD });
  const peer = result.messages.find((m) => m.kind === 'agent_to_agent');
  assert.equal(peer.sender.name, '成员');
  assert.ok(!/^[0-9a-f]{8}$/i.test(peer.sender.name));
  const card = result.messages.find((m) => m.kind === 'task_card' && m.taskCard.task.revision === 2);
  assert.equal(card.taskCard.task.ownerName, '成员');
  assert.equal(card.taskCard.actor.name, '成员');
});

test('authority 兼容 agentTeam 原始投影形状（id/name/role/status，无 kind/sessionId）', () => {
  const projection = [
    { id: LEAD, name: 'lead', role: 'lead', status: 'running' },
    { id: UX, name: 'ux', role: 'teammate', status: 'inactive' },
    { id: PM, name: 'pm', role: 'teammate', status: 'running' },
  ];
  const sessions = [
    { sessionId: LEAD, header: { id: LEAD }, events: [peerMessageFrom(PM, 1), peerMessageFrom(UX, 2)] },
    { sessionId: UX, header: { id: UX, parentSession: LEAD }, events: [] },
    { sessionId: PM, header: { id: PM, parentSession: LEAD }, events: [] },
  ];
  const result = normalizeChannel(sessions, { leadSessionId: LEAD, members: /** @type {any} */ (projection) });
  assert.deepEqual(result.members.map((m) => m.name), ['lead', 'ux', 'pm']);
  assert.equal(result.members.find((m) => m.sessionId === UX).kind, 'teammate');
  assert.equal(result.members.find((m) => m.sessionId === UX).status, 'inactive');
  assert.deepEqual(result.messages.filter((m) => m.kind === 'agent_to_agent').map((m) => m.sender.name).sort(), ['pm', 'ux']);
});

test('authority 不丢事件名册的 subagent；subagent sender 用 label + 父名后缀', () => {
  const sessions = [
    {
      sessionId: LEAD,
      header: { id: LEAD },
      events: [
        ev('subagent/catalog', 1, T + 1, { version: 0, childId: SUB, childCreatedAt: T, mode: 'continuable', label: '代码地图' }),
      ],
    },
    {
      sessionId: SUB,
      header: { id: SUB, parentSession: LEAD },
      events: [
        ev('subagent/descriptor', 0, T, { version: 3, mode: 'continuable', provider: 'spawn', label: '代码地图', agentModel: 'deepseek-flash' }),
        ev('turn/start', 1, T + 10, { turn: 1 }),
        ev('assistant/message', 2, T + 20, { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: '代码地图完成' }] } }),
        ev('turn/end', 3, T + 30, { turn: 1, reason: { kind: 'completed' } }),
      ],
    },
  ];
  const result = normalizeChannel(sessions, { leadSessionId: LEAD, members: AUTHORITY });
  const sub = result.members.find((m) => m.sessionId === SUB);
  assert.ok(sub, 'authority 合并后 subagent 保留');
  assert.equal(sub.name, '代码地图');
  assert.equal(sub.displayName, '代码地图 · Lead 的子体');
  const output = result.messages.find((m) => m.kind === 'agent_output' && m.sessionId === SUB);
  assert.equal(output.sender.name, '代码地图');
  assert.equal(output.sender.kind, 'subagent');
});

test('MockChannelSource：deps.members ∪ 事件名册（authority 名覆盖、subagent 保留）', async () => {
  const sessions = [
    {
      sessionId: LEAD,
      header: { id: LEAD, running: true },
      events: [
        ev('team/member', 1, T + 1, {
          version: 2,
          teamId: LEAD,
          member: { id: UX, name: '8c86b049', description: 'UI', provider: 'spawn', context: 'fresh', phase: 'active' },
        }),
        ev('subagent/catalog', 2, T + 2, { version: 0, childId: SUB, childCreatedAt: T, mode: 'continuable', label: '代码地图' }),
        peerMessageFrom(PM, 3),
      ],
    },
    { sessionId: UX, header: { id: UX, parentSession: LEAD }, events: [] },
    { sessionId: PM, header: { id: PM, parentSession: LEAD }, events: [] },
    { sessionId: SUB, header: { id: SUB, parentSession: LEAD }, events: [] },
  ];
  const source = new MockChannelSource({ leadSessionId: LEAD, members: AUTHORITY, sessions });
  const page = await source.open(LEAD);
  const ux = page.channel.members.find((m) => m.sessionId === UX);
  assert.equal(ux.name, 'ux', 'authority 名覆盖事件名册的 id 短名');
  assert.ok(page.channel.members.some((m) => m.sessionId === SUB), 'subagent 保留');
  const peer = page.messages.find((m) => m.kind === 'agent_to_agent');
  assert.equal(peer.sender.name, 'pm');
  source.close();
});

test('ClientSessionSource：deps.members 与事件名册 union 后 sender/任务卡身份正确', async () => {
  const sessions = [
    {
      sessionId: LEAD,
      header: { id: LEAD, running: true },
      events: [taskSnapshot(1, 'task-1', 1, 'pending'), taskSnapshot(2, 'task-1', 2, 'in_progress', UX)],
    },
    { sessionId: UX, header: { id: UX, parentSession: LEAD, running: false }, events: [] },
  ];
  const host = createReplaySessionHost(sessions);
  const source = new ClientSessionSource({ ctx: { sessions: host }, channelId: LEAD, sessionId: LEAD, members: AUTHORITY });
  const page = await source.open(LEAD);
  const card = page.messages.find((m) => m.kind === 'task_card' && m.taskCard.task.revision === 2);
  assert.equal(card.taskCard.actor.name, 'ux');
  assert.equal(card.taskCard.task.ownerName, 'ux');
  assert.equal(page.channel.members.find((m) => m.sessionId === UX).name, 'ux');
  source.close();
});
