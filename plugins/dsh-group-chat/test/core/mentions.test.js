// @ts-check
/**
 * UT-24：目标解析（无 @ → lead；@ 去重；@all 不支持；不可寻址剔除）
 * D-A 可寻址集合 + 补全过滤（Architecture §5.1 / V1.5-1）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkTargetCount,
  computeMentionQuery,
  filterMentionCandidates,
  parseMentions,
  resolveTargetSessionIds,
  resolveTargets,
} from '../../src/core/mentions.js';
import { isAddressable } from '../../src/core/roster.js';

/** @returns {import('../../src/core/model.js').ChannelMember[]} */
function makeMembers() {
  return [
    { sessionId: 'S_LEAD', name: 'lead', displayName: 'Lead', kind: 'lead', depth: 0, status: 'running', addressable: true },
    { sessionId: 'S_UX', name: 'ux', displayName: 'ux', kind: 'teammate', parentSessionId: 'S_LEAD', depth: 1, status: 'inactive', addressable: true },
    { sessionId: 'S_BE', name: 'backend', displayName: 'backend', kind: 'teammate', parentSessionId: 'S_LEAD', depth: 1, status: 'running', addressable: true },
    { sessionId: 'S_SUB_RUN', name: '产品设计', displayName: '产品设计 · ux 的子体', kind: 'subagent', parentSessionId: 'S_UX', depth: 2, status: 'running', addressable: true },
    { sessionId: 'S_SUB_DONE', name: '旧子体', displayName: '旧子体 · ux 的子体', kind: 'subagent', parentSessionId: 'S_UX', depth: 2, status: 'inactive', addressable: false },
  ];
}

test('UT-24 无 @ → 默认 lead；@lead 与默认等价', () => {
  const members = makeMembers();
  const a = resolveTargets({ text: '同步进度', mentions: [] }, members);
  assert.deepEqual(a.targets, ['lead']);
  assert.equal(a.hasFanout, false);
  assert.equal(a.noTeam, false);
  const b = resolveTargets({ text: '@lead 同步进度', mentions: ['lead'] }, members);
  assert.deepEqual(b.targets, ['lead']);
});

test('UT-24 多目标：lead 首位 + 成员目录序 + 去重', () => {
  const members = makeMembers();
  const r = resolveTargets({ text: '', mentions: ['backend', 'ux', 'ux', '@backend'] }, members);
  assert.deepEqual(r.targets, ['lead', 'ux', 'backend']);
  assert.deepEqual(r.targetSessionIds, ['S_LEAD', 'S_UX', 'S_BE']);
  assert.equal(r.hasFanout, true);
  assert.deepEqual(r.dropped, []);
});

test('D-A 不可寻址剔除：one-shot 完成 subagent / 未知成员', () => {
  const members = makeMembers();
  const r = resolveTargets({ text: '', mentions: ['旧子体', 'ghost'] }, members);
  assert.deepEqual(r.targets, ['lead']);
  assert.deepEqual(r.dropped.map((d) => d.name).sort(), ['ghost', '旧子体'].sort());
  assert.ok(r.dropped.every((d) => d.reason === 'unaddressable' || d.reason === 'unknown'));
  assert.ok(r.notes.includes('member.leftNotSent'));
  // teammate 即使 inactive 仍可寻址
  const r2 = resolveTargets({ text: '', mentions: ['ux'] }, members);
  assert.deepEqual(r2.targets, ['lead', 'ux']);
  assert.equal(isAddressable(members[1]), true);
  assert.equal(isAddressable(members[4]), false);
});

test('D-A 补全过滤：lead + 全部 teammate（含 inactive）+ 仅 running/provisioning subagent', () => {
  const members = makeMembers();
  const all = filterMentionCandidates(members, '').map((m) => m.name);
  assert.deepEqual(all, ['lead', 'ux', 'backend', '产品设计']);
  assert.ok(!all.includes('旧子体'));
  assert.deepEqual(filterMentionCandidates(members, 'u').map((m) => m.name), ['ux', '产品设计']);
  assert.deepEqual(filterMentionCandidates(members, 'ba').map((m) => m.name), ['backend']);
  // displayName 也参与匹配（子体会显示父名后缀）
  assert.deepEqual(filterMentionCandidates(members, 'ux 的子体').map((m) => m.name), ['产品设计']);
  // 大小写不敏感 + 前缀优先
  assert.deepEqual(filterMentionCandidates(members, 'BA').map((m) => m.name), ['backend']);
});

test('@all 不支持：不产生目标也不崩', () => {
  const members = makeMembers();
  const r = resolveTargets({ text: '', mentions: ['all', '@all'] }, members);
  assert.deepEqual(r.targets, ['lead']);
  assert.equal(r.dropped.length, 1, 'all / @all 去重后只算一个非法提及');
});

test('无团队（D-C）：targets=[lead]，noTeam=true', () => {
  const r = resolveTargets({ text: '同步进度', mentions: [] }, [makeMembers()[0]]);
  assert.deepEqual(r.targets, ['lead']);
  assert.equal(r.noTeam, true);
  assert.equal(r.hasFanout, false);
});

test('超限：maxTargets 截断并给出 overflow note', () => {
  const members = makeMembers();
  const r = resolveTargets({ text: '', mentions: ['ux', 'backend', '产品设计'] }, members, { maxTargets: 2 });
  assert.equal(r.targets.length, 2);
  assert.deepEqual(r.targets, ['lead', 'ux']);
  assert.ok(r.dropped.some((d) => d.reason === 'overflow'));
  assert.ok(r.notes.includes('targets.overflow'));
  assert.equal(checkTargetCount(3, 2).ok, false);
  assert.equal(checkTargetCount(2, 2).ok, true);
});

test('computeMentionQuery：光标处 @ 查询（含中文名、空白终止、行首/分隔符）', () => {
  assert.deepEqual(computeMentionQuery('你好 @ux', 7), { active: true, query: 'ux', start: 3, end: 6 });
  assert.equal(computeMentionQuery('hello world', 5).active, false);
  assert.equal(computeMentionQuery('email a@b.com', 8).active, false); // @ 前不是分隔符
  assert.equal(computeMentionQuery('@', 1).active, true);
  assert.deepEqual(computeMentionQuery('(@产品', 4), { active: true, query: '产品', start: 1, end: 4 });
  assert.equal(computeMentionQuery('@ux 后面有空格', 7).active, false);
  // 越界光标被夹紧
  assert.equal(computeMentionQuery('@ux', 99).active, true);
});

test('parseMentions：长名优先，避免 @ux 命中 @ux-designer', () => {
  const members = [
    makeMembers()[0],
    { sessionId: 'S1', name: 'ux', displayName: 'ux', kind: 'teammate', depth: 1, status: 'inactive', addressable: true },
    { sessionId: 'S2', name: 'ux-designer', displayName: 'ux-designer', kind: 'teammate', depth: 1, status: 'inactive', addressable: true },
  ];
  assert.deepEqual(parseMentions('@ux-designer 你看下，再 @ux 确认', members), ['ux-designer', 'ux']);
  assert.deepEqual(parseMentions('@ux会怎样', members), []); // 名字后紧跟中文无边界 → 不命中
  assert.deepEqual(parseMentions('正文没有提及', members), []);
});

test('resolveTargetSessionIds：lead → channelId；未知成员忽略', () => {
  const ids = resolveTargetSessionIds(['lead', 'ux', 'ghost'], makeMembers(), 'S_LEAD');
  assert.deepEqual(ids, ['S_LEAD', 'S_UX']);
});
