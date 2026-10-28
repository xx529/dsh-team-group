// @ts-check
/**
 * UT-36–43：成员入群消息（欢迎提示 + creator 带卡消息；字段回退 / 模型链 / 上下文策略 / fork 去重）
 * 契约：架构 §4.2.1（V1.4）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { byKind, ev, makeMembers, normalizeFixture } from './helpers.js';
import { normalizeChannel } from '../../src/core/normalize.js';

const LEAD = 'session-lead-1501';
const SCOUT = 'session-scout-1502';
const DESIGN = 'session-design-1503';

test('UT-38 fixture 16：每次创建 = 1 欢迎 + 1 带卡消息；fork 副本不重复', () => {
  const { result } = normalizeFixture('16-member-card');
  const cards = byKind(result.messages, 'member_card');
  const welcomes = byKind(result.messages, 'system').filter((m) => m.systemReason === 'member-welcome');
  assert.equal(cards.length, 2, 'scout + 产品设计 各 1 张卡');
  assert.equal(welcomes.length, 2);
  assert.equal(result.diagnostics.memberCards, 2);
  // 每组 creationId 唯一
  const ids = cards.map((m) => m.creationId);
  assert.deepEqual(ids.sort(), [`mc:${SCOUT}`, `mc:${DESIGN}`].sort());
  // fork 会话复制了 spawn 事件，但不得重复出卡
  assert.equal(cards.filter((m) => m.memberCard.member.sessionId === SCOUT).length, 1);
});

test('UT-36 teammate 卡：sender=creator(lead)、model 取 result 快照、context=fresh、createTool=spawn_teammate', () => {
  const { result } = normalizeFixture('16-member-card');
  const card = byKind(result.messages, 'member_card').find((m) => m.memberCard.member.sessionId === SCOUT);
  assert.equal(card.sender.name, 'lead');
  assert.equal(card.sender.kind, 'lead');
  const p = card.memberCard;
  assert.equal(p.member.kind, 'teammate');
  assert.equal(p.member.name, 'scout');
  assert.equal(p.member.description, '只读取证：群聊事件模型');
  assert.equal(p.member.model, 'deepseek-flash');
  assert.equal(p.member.modelInheritedFrom, 'Lead');
  assert.equal(p.member.modelSource, 'result_snapshot');
  assert.equal(p.member.contextPolicy, 'fresh');
  assert.equal(p.member.lifecycleMode, 'unknown');
  assert.equal(p.member.createTool, 'spawn_teammate');
  assert.equal(p.member.state, 'active');
  assert.equal(p.actions.viewSession, 'enabled');
  assert.equal(p.actions.viewTask, 'enabled');
  assert.equal(p.trigger, 'team-member-active');
  assert.equal(card.pairOrder, 1);
  // 初始任务摘要：首个空行前、≤160 字；全文保留
  assert.ok(p.member.promptExcerpt.startsWith('你是 DSH Agent Teams 的只读取证 scout。'));
  assert.ok(p.member.promptExcerpt.length <= 160);
  assert.ok(p.member.promptFull.includes('docs/research/event-model.md'));
});

test('UT-37/42 subagent 卡：creator=调用方(ux/scout)、父成员、descriptor 模型、fork 上下文、one-shot 生命周期', () => {
  const { result } = normalizeFixture('16-member-card');
  const card = byKind(result.messages, 'member_card').find((m) => m.memberCard.member.sessionId === DESIGN);
  assert.equal(card.sender.name, 'scout', 'creator = 调用方成员');
  assert.equal(card.sender.kind, 'teammate');
  const p = card.memberCard;
  assert.equal(p.member.kind, 'subagent');
  assert.equal(p.member.name, '产品设计');
  assert.equal(p.member.parentName, 'scout');
  assert.equal(p.member.model, 'deepseek-flash');
  assert.equal(p.member.modelInheritedFrom, 'scout');
  assert.equal(p.member.modelSource, 'descriptor');
  assert.equal(p.member.contextPolicy, 'fork', 'subagent_fork → fork');
  assert.equal(p.member.lifecycleMode, 'one_shot');
  assert.equal(p.member.createTool, 'subagent_fork');
  assert.equal(p.actions.viewTask, undefined, 'subagent 无「查看任务」');
  assert.equal(p.trigger, 'subagent-catalog');
});

test('UT-38 欢迎提示紧邻 creator 消息之前（同 creationId、pairOrder 0→1）', () => {
  const { result } = normalizeFixture('16-member-card');
  const scoutIdx = result.messages.findIndex((m) => m.id === `mc:${SCOUT}:welcome`);
  assert.ok(scoutIdx >= 0);
  assert.equal(result.messages[scoutIdx + 1].id, `mc:${SCOUT}`);
  assert.equal(result.messages[scoutIdx].creationId, result.messages[scoutIdx + 1].creationId);
});

test('UT-39 触发时机：provisioning-only 不出卡；已 active 才出', () => {
  const T = 1793158400000;
  const sess = [
    {
      sessionId: LEAD,
      header: {},
      events: [
        ev('team/member', 1, T, { version: 2, teamId: LEAD, member: { id: 'S_T', name: 't', description: 'd', provider: 'spawn', context: 'fresh', phase: 'provisioning' } }),
      ],
    },
  ];
  const result = normalizeChannel(sess, { leadSessionId: LEAD });
  assert.equal(byKind(result.messages, 'member_card').length, 0);
});

test('UT-39 创建失败（tool/result isError）不出欢迎/卡', () => {
  const T = 1793158400000;
  const args = JSON.stringify({ name: 'x', description: 'd', prompt: 'p', context: 'fresh' });
  const result = normalizeChannel(
    [
      {
        sessionId: LEAD,
        header: {},
        events: [
          ev('tool/call', 1, T, { callId: 'c1', name: 'spawn_teammate', arguments: args }),
          ev('tool/result', 2, T + 5, { message: { toolCallId: 'c1', isError: true, content: [{ type: 'text', text: 'Error: only the Team Lead can create teammates' }] } }),
          ev('team/member', 3, T + 10, { version: 2, teamId: LEAD, member: { id: 'S_X', name: 'x', description: 'd', provider: 'spawn', context: 'fresh', phase: 'failed', error: 'only the Team Lead' } }),
        ],
      },
    ],
    { leadSessionId: LEAD },
  );
  assert.equal(byKind(result.messages, 'member_card').length, 0);
  assert.equal(result.messages.filter((m) => m.systemReason === 'member-welcome').length, 0);
});

test('UT-40 空值回退：无描述/无 model/无 prompt 时隐藏字段而非留空', () => {
  const T = 1793158400000;
  const result = normalizeChannel(
    [
      {
        sessionId: LEAD,
        header: {},
        events: [
          ev('team/member', 1, T, { version: 2, teamId: LEAD, member: { id: 'S_BARE', name: 'bare', provider: 'spawn', context: 'fresh', phase: 'active' } }),
        ],
      },
    ],
    { leadSessionId: LEAD },
  );
  const card = byKind(result.messages, 'member_card')[0];
  assert.ok(card);
  assert.equal(card.memberCard.member.description, undefined);
  assert.equal(card.memberCard.member.model, undefined);
  assert.equal(card.memberCard.member.modelInheritedFrom, undefined);
  assert.equal(card.memberCard.member.promptExcerpt, undefined);
  assert.equal(card.text, '', '卡片正文由 UI 组装，不做长文折叠来源');
  // 卡仍可用
  assert.equal(card.memberCard.actions.viewSession, 'enabled');
});

test('UT-41 模型回退链：无 descriptor/result 时用名册当前 model；provider 内部名不直出', () => {
  const T = 1793158400000;
  const members = makeMembers({ leadId: LEAD, teammates: [{ id: 'S_T', name: 't' }] });
  members[1].model = 'deepseek-pro';
  const result = normalizeChannel(
    [
      {
        sessionId: LEAD,
        header: {},
        events: [
          ev('team/member', 1, T, { version: 2, teamId: LEAD, member: { id: 'S_T', name: 't', description: 'd', provider: 'spawn', context: 'fresh', phase: 'active' } }),
        ],
      },
    ],
    { leadSessionId: LEAD, members },
  );
  const card = byKind(result.messages, 'member_card')[0];
  assert.equal(card.memberCard.member.model, 'deepseek-pro');
  assert.equal(card.memberCard.member.modelSource, 'roster_current');
  const json = JSON.stringify(card.memberCard);
  assert.ok(!json.includes('"provider"'), '不得把 provider 内部名放进卡片 payload');
  assert.ok(!card.memberCard.member.modelInheritedFrom?.includes('spawn'));
});

test('无权限 → 动作禁用 + reason', () => {
  const T = 1793158400000;
  const result = normalizeChannel(
    [
      {
        sessionId: LEAD,
        header: {},
        events: [
          ev('team/member', 1, T, { version: 2, teamId: LEAD, member: { id: 'S_T', name: 't', description: 'd', provider: 'spawn', context: 'fresh', phase: 'active' } }),
        ],
      },
    ],
    { leadSessionId: LEAD, canRead: () => false },
  );
  const card = byKind(result.messages, 'member_card')[0];
  assert.equal(card.memberCard.actions.viewSession, 'disabled');
  assert.equal(card.memberCard.actions.viewTask, 'disabled');
  assert.equal(card.memberCard.actions.reason, 'no-permission');
});

test('创建者归属：teammate 恒 lead；subagent 为 catalog 所在会话成员', () => {
  const { result } = normalizeFixture('16-member-card');
  const cards = byKind(result.messages, 'member_card');
  const teammateCard = cards.find((m) => m.memberCard.member.kind === 'teammate');
  const subCard = cards.find((m) => m.memberCard.member.kind === 'subagent');
  assert.equal(teammateCard.sender.name, 'lead');
  assert.equal(subCard.sender.name, 'scout');
  assert.equal(subCard.memberCard.member.parentName, 'scout');
});
