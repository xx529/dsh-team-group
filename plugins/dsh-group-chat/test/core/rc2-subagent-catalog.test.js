// @ts-check
/**
 * DSH 0.2.2-rc.2 适配回归：Agent Teams 成员目录迁到 subagentCatalog。
 *
 * rc.2 起 `agentTeam` 投影只剩 `{enabled,tasks,failure}`（无 members），成员由
 * `subagent/catalog` v3（新增 name）与 `subagent/descriptor` 承载；成员条/`@` 必须用
 * catalog 的 name 作短名、label 作角色描述（F33/F25）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChannel } from '../../src/core/normalize.js';

const LEAD = 'session-lead';
const SUB = 'session-backend';

/**
 * 一条带 seq/time 的会话事件。
 * @param {number} seq
 * @param {string} type
 * @param {any} data
 * @param {number} [time]
 */
function ev(seq, type, data, time = 1793158400000 + seq) {
  return { type, seq, time, data };
}

test('rc2: subagent/catalog v3 的 name 作为成员短名，label 作为角色描述', () => {
  const result = normalizeChannel(
    [
      {
        sessionId: LEAD,
        header: {},
        events: [
          ev(1, 'session/title', { title: '团队' }),
          ev(2, 'subagent/catalog', {
            version: 3,
            childId: SUB,
            childCreatedAt: 1793158400002,
            mode: 'continuable',
            label: '负责后端接口',
            name: 'backend',
          }),
          ev(3, 'user/message', { text: '请实现接口', source: { kind: 'user' } }),
        ],
      },
      {
        sessionId: SUB,
        header: { parentSession: LEAD },
        events: [
          ev(1, 'subagent/descriptor', {
            version: 3,
            mode: 'continuable',
            provider: 'in-process',
            label: '负责后端接口',
          }),
          ev(2, 'user/message', { text: '实现接口', source: { kind: 'subagent' } }),
          ev(3, 'assistant/message', { text: '已完成', usage: {} }),
        ],
      },
    ],
    {
      leadSessionId: LEAD,
      sessionSummaries: [{ id: SUB, parentSessionId: LEAD, running: true }],
    },
  );

  const member = result.members.find((m) => m.sessionId === SUB);
  assert.ok(member, 'catalog 子会话必须进入成员目录');
  assert.equal(member.kind, 'subagent');
  assert.equal(member.name, 'backend', '成员短名必须来自 catalog.name（不是 id/label）');
  assert.equal(member.description, '负责后端接口', 'label 仅作角色描述');
  assert.equal(member.status, 'running', '运行态来自 sessionSummaries.running');
  assert.equal(member.addressable, true, 'continuable 且 running 可 @');
});

test('rc2: 历史 catalog 无 name 时退回 label，且不把 id 当名字', () => {
  const result = normalizeChannel(
    [
      {
        sessionId: LEAD,
        header: {},
        events: [
          ev(1, 'subagent/catalog', {
            version: 1,
            childId: SUB,
            childCreatedAt: 1793158400001,
            mode: 'continuable',
            label: '旧版子体',
          }),
        ],
      },
      {
        sessionId: SUB,
        header: { parentSession: LEAD },
        events: [
          ev(1, 'subagent/descriptor', { version: 3, mode: 'continuable', provider: 'in-process', label: '旧版子体' }),
        ],
      },
    ],
    {
      leadSessionId: LEAD,
      sessionSummaries: [{ id: SUB, parentSessionId: LEAD, running: false }],
    },
  );

  const member = result.members.find((m) => m.sessionId === SUB);
  assert.ok(member);
  assert.equal(member.name, '旧版子体');
  assert.notEqual(member.name, SUB);
  assert.equal(member.status, 'inactive');
  assert.equal(member.addressable, false, '非运行态 subagent 不可 @');
});
