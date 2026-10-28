// @ts-check
/**
 * SC35–SC38 / UT-（任务卡）：创建/认领/完成/重新打开/改派/取消/放回，操作者配对与回退
 * 契约：架构 §4.2.2（V1.6）+ docs/research/task-card-fields.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byKind, ev, makeMembers, normalizeFixture } from './helpers.js';
import { normalizeChannel } from '../../src/core/normalize.js';
import { TASK_STATUSES } from '../../src/core/constants.js';

const LEAD = 'session-lead-1601';
const SCOUT = 'session-scout-1602';
const BACK = 'session-backend-1603';
const T = 1793158400000;

function fixtureMembers() {
  return makeMembers({
    leadId: LEAD,
    teammates: [
      { id: SCOUT, name: 'scout' },
      { id: BACK, name: 'backend' },
    ],
  });
}

function normalize17() {
  return normalizeFixture('17-task-card', { members: fixtureMembers() });
}

function taskCards(result) {
  return byKind(result.messages, 'task_card');
}

test('SC35 创建卡：sender=lead / action=create / status=pending / owner 空', () => {
  const { result } = normalize17();
  const card = taskCards(result).find((m) => m.taskCard.task.id === 'task-13' && m.taskCard.task.revision === 1);
  assert.ok(card);
  const p = card.taskCard;
  assert.equal(card.sender.name, 'lead');
  assert.equal(card.sender.kind, 'lead');
  assert.equal(p.action, 'create');
  assert.equal(p.task.status, 'pending');
  assert.equal(p.task.ownerName, undefined);
  assert.equal(p.actor.source, 'paired');
  assert.equal(p.actionLabel, '创建任务');
  assert.equal(p.statusLabel, '待认领');
  assert.equal(p.compact, false);
  assert.ok(p.task.description.includes('ChannelSource 契约'));
  assert.equal(p.dedupeKey, `${LEAD}:task-13:1`);
  assert.equal(card.id, p.dedupeKey);
});

test('SC36 认领卡：sender=认领者（scout）/ owner 正确 / (taskId,revision) 精确配对', () => {
  const { result } = normalize17();
  const card = taskCards(result).find((m) => m.taskCard.task.id === 'task-13' && m.taskCard.task.revision === 2);
  assert.ok(card);
  const p = card.taskCard;
  assert.equal(card.sender.name, 'scout');
  assert.equal(card.sender.kind, 'teammate');
  assert.equal(p.action, 'claim');
  assert.equal(p.task.status, 'in_progress');
  assert.equal(p.task.ownerId, SCOUT);
  assert.equal(p.task.ownerName, 'scout');
  assert.equal(p.actor.name, 'scout');
  assert.equal(p.actor.source, 'paired');
  assert.equal(p.actionLabel, '认领任务');
});

test('SC37 完成卡：sender=完成者（backend）/ status=completed / owner 保留', () => {
  const { result } = normalize17();
  const card = taskCards(result).find((m) => m.taskCard.task.id === 'task-14' && m.taskCard.task.revision === 2);
  assert.ok(card);
  const p = card.taskCard;
  assert.equal(card.sender.name, 'backend');
  assert.equal(p.action, 'complete');
  assert.equal(p.task.status, 'completed');
  assert.equal(p.task.ownerId, BACK);
  assert.equal(p.task.ownerName, 'backend');
  assert.equal(p.statusLabel, '已完成');
});

test('SC38 重新打开卡：action=reopen / 真实 status=pending / 无 failed、无「返工/失败」字样', () => {
  const { result } = normalize17();
  const card = taskCards(result).find((m) => m.taskCard.task.id === 'task-13' && m.taskCard.task.revision === 3);
  assert.ok(card);
  const p = card.taskCard;
  assert.equal(card.sender.name, 'lead');
  assert.equal(p.action, 'reopen');
  assert.equal(p.task.status, 'pending');
  assert.equal(p.task.ownerId, undefined);
  assert.equal(p.task.ownerName, undefined);
  assert.equal(p.actionLabel, '重新打开');
  assert.equal(p.statusLabel, '待认领');
  assert.ok(!JSON.stringify(p).includes('失败'));
  assert.ok(!JSON.stringify(p).includes('返工'));
  assert.ok(!JSON.stringify(p).includes('failed'));
});

test('任务卡严格映射真实枚举：一条 revision 一张卡、按 revision 升序、同一时刻不重复', () => {
  const { result } = normalize17();
  const cards = taskCards(result);
  assert.equal(cards.length, 5);
  for (const card of cards) {
    assert.ok(TASK_STATUSES.includes(card.taskCard.task.status));
    assert.ok(!Object.prototype.hasOwnProperty.call(card.taskCard.task, 'failed'));
  }
  const keys = cards.map((m) => m.taskCard.dedupeKey);
  assert.equal(new Set(keys).size, keys.length, 'dedupeKey 唯一');
  const task13 = cards.filter((m) => m.taskCard.task.id === 'task-13').map((m) => m.taskCard.task.revision);
  assert.deepEqual(task13, [1, 2, 3]);
});

test('任务卡参与全局排序（team/task.time），且与普通消息交错稳定', () => {
  const { result } = normalize17();
  const cards = taskCards(result);
  const times = cards.map((m) => m.time);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test('UT-（回退 1）owner 反推：无 tool/result 时 actor=owner，source=owner-inferred', () => {
  const events = [
    ev('team/task', 1, T, { version: 2, teamId: LEAD, task: { id: 'task-9', revision: 1, subject: 's', description: 'd', status: 'pending', blockedBy: [], writeScopes: [] } }),
    ev('team/task', 2, T + 1000, {
      version: 2,
      teamId: LEAD,
      task: { id: 'task-9', revision: 2, subject: 's', description: 'd', status: 'in_progress', ownerId: 'S_T', blockedBy: [], writeScopes: [] },
    }),
  ];
  const members = makeMembers({ leadId: LEAD, teammates: [{ id: 'S_T', name: 't' }] });
  const result = normalizeChannel([{ sessionId: LEAD, header: {}, events }], { leadSessionId: LEAD, members });
  const cards = taskCards(result);
  const claim = cards.find((m) => m.taskCard.task.revision === 2);
  assert.equal(claim.taskCard.actor.name, 't');
  assert.equal(claim.taskCard.actor.source, 'owner-inferred');
  assert.equal(claim.taskCard.action, 'claim');
  assert.equal(claim.taskCard.task.ownerName, 't');
});

test('UT-（回退 2）系统操作者：无配对、无 owner 时卡片仍可展示（不伪造失败）', () => {
  const events = [
    ev('team/task', 1, T, { version: 2, teamId: LEAD, task: { id: 'task-8', revision: 1, subject: '无主任务', description: 'd', status: 'pending', blockedBy: [], writeScopes: [] } }),
  ];
  const result = normalizeChannel([{ sessionId: LEAD, header: {}, events }], { leadSessionId: LEAD });
  const card = taskCards(result)[0];
  assert.equal(card.taskCard.actor.name, '系统');
  assert.equal(card.taskCard.actor.kind, 'system');
  assert.equal(card.taskCard.actor.source, 'system-fallback');
  assert.equal(card.taskCard.action, 'create');
  assert.equal(card.taskCard.statusLabel, '待认领');
});

test('UT-（回退 3）时间近邻：同 taskId 且 |journal-call| < 1s 可配对', () => {
  const events = [
    ev('team/task', 10, T, { version: 2, teamId: LEAD, task: { id: 'task-7', revision: 1, subject: 's', description: 'd', status: 'pending', blockedBy: [], writeScopes: [] } }),
    ev('team/task', 20, T + 1000, { version: 2, teamId: LEAD, task: { id: 'task-7', revision: 2, subject: 's', description: 'd', status: 'in_progress', ownerId: SCOUT, blockedBy: [], writeScopes: [] } }),
    // 操作发生在 scout 会话，但 result 的 revision 是 3（窗口内缺 rev3 snapshot）→ 精确键不命中，走时间近邻
    ev('tool/call', 1, T + 950, { turn: 1, callId: 'c1', name: 'team_task_update', arguments: '{"task_id":"task-7","expected_revision":1,"action":"claim"}' }),
    ev('tool/result', 2, T + 960, { turn: 1, message: { toolCallId: 'c1', isError: false, content: [{ type: 'text', text: '{"id":"task-7","revision":3,"status":"in_progress","ownerName":"scout","ready":false}' }] } }),
  ];
  const members = fixtureMembers().concat();
  const result = normalizeChannel(
    [
      { sessionId: LEAD, header: {}, events },
      { sessionId: SCOUT, header: { parentSession: LEAD }, events: [ev('tool/call', 1, T + 950, { turn: 1, callId: 'c1', name: 'team_task_update', arguments: '{"task_id":"task-7","expected_revision":1,"action":"claim"}' }), ev('tool/result', 2, T + 960, { turn: 1, message: { toolCallId: 'c1', isError: false, content: [{ type: 'text', text: '{"id":"task-7","revision":3,"status":"in_progress","ownerName":"scout","ready":false}' }] } })] },
    ],
    { leadSessionId: LEAD, members },
  );
  const card = taskCards(result).find((m) => m.taskCard.task.revision === 2);
  assert.ok(card);
  assert.equal(card.taskCard.actor.source, 'time-neighbor');
  assert.equal(card.taskCard.actor.name, 'scout');
  assert.equal(card.taskCard.action, 'claim');
});

test('UT-（动作）delete / release / edit / set_dependencies 的 diff 与显式 action', () => {
  const task = (revision, status, extra = {}) => ({
    version: 2,
    teamId: LEAD,
    task: { id: 'task-6', revision, subject: 's', description: 'd', status, blockedBy: [], writeScopes: [], ...extra },
  });
  const events = [
    // 主链：completed → pending(reopen) → in_progress(claim) → pending(显式 release) → edit → set_dependencies
    ev('team/task', 1, T, task(1, 'completed')),
    ev('team/task', 2, T + 100, task(2, 'pending')),
    ev('team/task', 3, T + 200, task(3, 'in_progress', { ownerId: SCOUT })),
    ev('tool/call', 4, T + 250, { turn: 1, callId: 'cr', name: 'team_task_update', arguments: '{"task_id":"task-6","expected_revision":3,"action":"release"}' }),
    ev('tool/result', 5, T + 260, { turn: 1, message: { toolCallId: 'cr', isError: false, content: [{ type: 'text', text: '{"id":"task-6","revision":4,"status":"pending","ownerName":null}' }] } }),
    ev('team/task', 6, T + 300, task(4, 'pending')),
    ev('team/task', 7, T + 400, { version: 2, teamId: LEAD, task: { id: 'task-6', revision: 5, subject: 's', description: 'd2', status: 'pending', blockedBy: [], writeScopes: [] } }),
    ev('team/task', 8, T + 500, { version: 2, teamId: LEAD, task: { id: 'task-6', revision: 6, subject: 's', description: 'd2', status: 'pending', blockedBy: ['task-1'], writeScopes: [] } }),
    // 另一条任务：pending → deleted（取消墓碑）
    ev('team/task', 9, T + 600, { version: 2, teamId: LEAD, task: { id: 'task-5', revision: 1, subject: 's5', description: 'd', status: 'pending', blockedBy: [], writeScopes: [] } }),
    ev('team/task', 10, T + 700, { version: 2, teamId: LEAD, task: { id: 'task-5', revision: 2, subject: 's5', description: 'd', status: 'deleted', blockedBy: [], writeScopes: [] } }),
  ];
  const result = normalizeChannel([{ sessionId: LEAD, header: {}, events }], { leadSessionId: LEAD, members: fixtureMembers() });
  const byRev = new Map(taskCards(result).filter((m) => m.taskCard.task.id === 'task-6').map((m) => [m.taskCard.task.revision, m.taskCard]));
  assert.equal(byRev.get(2).action, 'reopen');
  assert.equal(byRev.get(3).action, 'claim');
  assert.equal(byRev.get(4).action, 'release', '显式 action 优先');
  assert.equal(byRev.get(4).statusLabel, '待认领');
  assert.equal(byRev.get(5).action, 'edit');
  assert.equal(byRev.get(6).action, 'set_dependencies');
  assert.equal(byRev.get(6).task.blockedBy[0], 'task-1');
  const deleted = taskCards(result).find((m) => m.taskCard.task.id === 'task-5' && m.taskCard.task.revision === 2);
  assert.equal(deleted.taskCard.action, 'delete');
  assert.equal(deleted.taskCard.task.deleted, true);
  assert.equal(deleted.taskCard.statusLabel, '已取消');
});

test('历史回放：historical=true → replay=true；task_card 不参与长文折叠（text 为空）', () => {
  const { result } = normalizeFixture('17-task-card', { members: fixtureMembers(), historical: true });
  const cards = taskCards(result);
  assert.ok(cards.length > 0);
  assert.ok(cards.every((m) => m.taskCard.replay === true));
  assert.ok(cards.every((m) => m.text === ''));
});
