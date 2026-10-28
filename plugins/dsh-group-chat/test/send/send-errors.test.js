// @ts-check
/**
 * 错误分类表 / 目标可用性预检 / mode 选择表 / targets 上限 / session-missing
 * 契约：架构 §5.3–§5.5、Spike S3
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FAILURE_MATRIX,
  FAILURE_REASONS,
  classifyError,
  failureInfo,
  messageKeyOf,
} from '../../src/send/errors.js';
import { checkTargetAvailability, MODE_TABLE, orderByLeadFirst, resolveMode } from '../../src/send/mode.js';
import { sendChannelBatch } from '../../src/send/send-batch.js';
import { IDS, makeSendDeps, threeTargets } from './helpers.js';

test('classifyError：失败矩阵覆盖（parent-unavailable/forbidden/rate-limited/network/timeout/abort/unknown）', () => {
  assert.equal(classifyError({ code: 'subagent/parent-unavailable' }), 'parent-unavailable');
  assert.equal(classifyError({ code: 'group-chat/forbidden' }), 'forbidden');
  assert.equal(classifyError({ status: 403 }), 'forbidden');
  assert.equal(classifyError({ code: 'rate-limited' }), 'rate-limited');
  assert.equal(classifyError({ statusCode: 429 }), 'rate-limited');
  assert.equal(classifyError({ code: 'group-chat/payload-too-large' }), 'payload-too-large');
  assert.equal(classifyError({ code: 'TRANSPORT', message: 'Connection error.' }), 'network');
  assert.equal(classifyError(new Error('fetch failed')), 'network');
  assert.equal(classifyError({ code: 'gc/timeout' }), 'timeout');
  assert.equal(classifyError({ timedOut: true }), 'timeout');
  const abort = new Error('aborted');
  abort.name = 'AbortError';
  assert.equal(classifyError(abort), 'aborted');
  assert.equal(classifyError({ code: 'readonly' }), 'readonly');
  assert.equal(classifyError({ code: 'parent-offline' }), 'parent-offline');
  assert.equal(classifyError(new Error('something odd')), 'unknown');
});

test('失败矩阵：retryable 与 i18n key 与架构 §5.5 一致', () => {
  assert.equal(FAILURE_MATRIX['parent-unavailable'].retryable, true);
  assert.equal(FAILURE_MATRIX['parent-offline'].retryable, false);
  assert.equal(FAILURE_MATRIX.unaddressable.retryable, false);
  assert.equal(FAILURE_MATRIX.readonly.retryable, false);
  assert.equal(FAILURE_MATRIX.forbidden.retryable, false);
  assert.equal(FAILURE_MATRIX.network.retryable, true);
  assert.equal(FAILURE_MATRIX.timeout.retryable, true);
  assert.equal(FAILURE_MATRIX['payload-too-large'].retryable, false);
  assert.equal(FAILURE_MATRIX['rate-limited'].retryable, true);
  assert.equal(FAILURE_MATRIX.busy.retryable, false);
  assert.equal(FAILURE_MATRIX['retry-exhausted'].retryable, false);
  assert.equal(messageKeyOf('network'), 'send.error.network');
  assert.equal(failureInfo('nope').messageKey, 'send.error.unknown');
  assert.ok(FAILURE_REASONS.length >= 15);
});

test('预检 parent-offline：父 Agent 离线的子会话不发送', async () => {
  const { deps, host } = makeSendDeps();
  const result = await sendChannelBatch({
    text: 'hi',
    targets: [
      { name: 'lead', sessionId: IDS.LEAD, kind: 'lead' },
      { name: 'sub-x', sessionId: 'S_SUB', kind: 'subagent', parentAvailable: false },
    ],
    channelId: IDS.LEAD,
    clientBatchId: 'gc-pre-offline',
    deps,
  });
  assert.equal(result.status, 'partial');
  assert.equal(host.calls.length, 1);
  const sub = result.deliveries.find((d) => d.target === 'sub-x');
  assert.equal(sub.reason, 'parent-offline');
  assert.equal(sub.retryable, false);
});

test('可用性判定：readonly / addressable=false / 无 sessionId；离线仅 warn 不阻断', () => {
  assert.equal(checkTargetAvailability({ name: 'lead', sessionId: 'L' }, { readonly: true }).reason, 'readonly');
  assert.equal(checkTargetAvailability({ name: 'x', sessionId: 'X', addressable: false }).reason, 'unaddressable');
  assert.equal(checkTargetAvailability({ name: 'x', sessionId: '' }).reason, 'unaddressable');
  assert.equal(
    checkTargetAvailability(
      { name: 's', sessionId: 'S', kind: 'subagent' },
      { members: [{ sessionId: 'S', name: 's', kind: 'subagent', depth: 2, status: 'inactive', addressable: false }] },
    ).reason,
    'unaddressable',
  );
  const offline = checkTargetAvailability({ name: 'u', sessionId: 'U', running: false }, {});
  assert.equal(offline.sendable, true);
  assert.equal(offline.warn, 'target-offline');
});

test('mode 选择表：lead/teammate/subagent 均为 steer；显式 mode 优先', () => {
  assert.equal(MODE_TABLE.lead, 'steer');
  assert.equal(MODE_TABLE.teammate, 'steer');
  assert.equal(MODE_TABLE.subagent, 'steer');
  assert.equal(resolveMode({ name: 'lead', sessionId: 'L', kind: 'lead' }), 'steer');
  assert.equal(resolveMode({ name: 'ux', sessionId: 'U', kind: 'teammate' }, { mode: 'queue' }), 'queue');
  assert.equal(resolveMode({ name: 'ux', sessionId: 'U', kind: 'teammate' }, { mode: 'auto' }), 'steer');
  assert.deepEqual(
    orderByLeadFirst([
      { name: 'ux', sessionId: 'U' },
      { name: 'lead', sessionId: 'L' },
      { name: 'backend', sessionId: 'B' },
    ]).map((t) => t.name),
    ['lead', 'ux', 'backend'],
  );
});

test('session-missing：binding 不可用时失败但不抛错', async () => {
  const { deps } = makeSendDeps();
  const result = await sendChannelBatch({
    text: 'hi',
    targets: [{ name: 'lead', sessionId: 'S_MISSING' }],
    channelId: 'S_MISSING',
    clientBatchId: 'gc-session-missing',
    deps: { ...deps, ctx: { sessions: { binding: () => null } } },
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.deliveries[0].reason, 'session-missing');
  assert.equal(result.deliveries[0].retryable, false);
});

test('目标数上限 8：溢出目标写入 dropped，其余正常发送', async () => {
  const { deps } = makeSendDeps();
  const targets = [{ name: 'lead', sessionId: IDS.LEAD }];
  for (let i = 0; i < 9; i += 1) targets.push({ name: `t${i}`, sessionId: `S_${i}` });
  const result = await sendChannelBatch({
    text: 'hi',
    targets,
    channelId: IDS.LEAD,
    clientBatchId: 'gc-overflow',
    deps,
  });
  assert.equal(result.deliveries.length, 8);
  assert.ok(Array.isArray(result.dropped));
  assert.ok(result.dropped.some((d) => d.reason === 'overflow'));
  assert.equal(result.status, 'sent');
});
