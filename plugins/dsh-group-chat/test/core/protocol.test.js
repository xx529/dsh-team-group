// @ts-check
/**
 * UT-21/22/23/25：同发协议 canonical 逐字节 / 解析剥除 / 单目标不注入
 * 契约：架构 §5.2（V1.1-1 冻结）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHead,
  buildExplain,
  buildParts,
  buildText,
  buildFanoutPrefix,
  buildFanoutPrefixParts,
  parseParts,
  parseText,
  stripProtocol,
  protocolSnapshot,
  hasProtocolPrefix,
  dedupeTargets,
  protocolSnapshot as snapshot,
} from '../../src/core/protocol.js';
import { buildFanoutPrefix as coreBuildFanoutPrefix } from '../../src/core/index.js';

const HEAD = '[群聊 · 同发] 收件人：@lead、@ux、@backend';
const EXPLAIN = '（本消息由用户在「群聊」视图同时发送给上述 3 位成员，各成员各自收到一份。）';

test('UT-21 canonical 首行/第二行逐字节快照（全角：、，@lead 首位，N 实数）', () => {
  assert.equal(snapshot().head, HEAD);
  assert.equal(snapshot().explain, EXPLAIN);
  assert.equal(buildHead(['lead', 'ux', 'backend']), HEAD);
  assert.equal(buildExplain(3), EXPLAIN);
  assert.equal(coreBuildFanoutPrefix(['lead', 'ux', 'backend']), `${HEAD}\n${EXPLAIN}`);
  assert.deepEqual(buildFanoutPrefixParts(['lead', 'ux', 'backend']), [HEAD, EXPLAIN]);
  // 中文全角标点必须原样保留
  assert.ok(HEAD.includes('：'));
  assert.ok(HEAD.includes('、'));
  assert.equal(protocolSnapshot().version, 1);
});

test('UT-25 前缀仅 targets>1 注入；N=1 不注入', () => {
  assert.deepEqual(buildParts(['lead'], '正文'), ['正文']);
  assert.equal(buildFanoutPrefix(['lead']), '');
  assert.deepEqual(buildFanoutPrefixParts(['lead']), []);
  assert.deepEqual(buildParts(['lead', 'ux'], '正文'), [buildHead(['lead', 'ux']), buildExplain(2), '正文']);
});

test('UT-22 解析/剥除：parts[0]/[1] 命中 → text=parts[2..]；rawText 全量', () => {
  const parts = buildParts(['lead', 'ux', 'backend'], '@backend 接口清单已确认');
  assert.deepEqual(parts, [HEAD, EXPLAIN, '@backend 接口清单已确认']);
  const parsed = parseParts(parts);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.targets, ['lead', 'ux', 'backend']);
  assert.equal(parsed.declaredCount, 3);
  assert.equal(parsed.text, '@backend 接口清单已确认');
  assert.equal(parsed.rawText, `${HEAD}\n${EXPLAIN}\n@backend 接口清单已确认`);
  assert.equal(hasProtocolPrefix(parts), true);
  assert.equal(stripProtocol(parts), '@backend 接口清单已确认');
});

test('UT-23 无前缀/旧前缀原样展示；手写 @ 不升级不误剥', () => {
  assert.equal(parseParts(['@ux 你看下这个']).ok, false);
  assert.equal(parseParts(['Team message from lead:', '请继续']).ok, false);
  const handwritten = '讨论：`[群聊 · 同发] 收件人：@lead、@ux` 这个格式是谁定的？';
  assert.equal(parseParts([handwritten]).ok, false);
  assert.equal(stripProtocol([handwritten]), handwritten);
  const oldAscii = '[群聊 · 同发] 收件人: @lead @ux\n（旧冒号版本）\n正文';
  assert.equal(parseText(oldAscii).ok, false);
  assert.equal(parseText(oldAscii).text, oldAscii);
  // 只有首行命中、第二行不命中 → 不剥（不丢消息）
  const half = ['[群聊 · 同发] 收件人：@lead、@ux', '普通第二行'];
  assert.equal(parseParts(half).ok, false);
  assert.equal(parseParts(half).reason, 'explain-mismatch');
});

test('buildText / dedupeTargets / 多行正文', () => {
  assert.equal(buildText(['lead', 'ux'], '第一行\n第二行'), `${buildHead(['lead', 'ux'])}\n${buildExplain(2)}\n第一行\n第二行`);
  assert.deepEqual(dedupeTargets(['@lead', 'lead', ' ux ', '']), ['lead', 'ux']);
  const parsed = parseParts(buildParts(['lead', 'ux'], 'a\nb'));
  assert.equal(parsed.text, 'a\nb');
});

test('非法输入不抛错（空数组/缺参）', () => {
  assert.equal(parseParts([]).ok, false);
  assert.equal(parseParts(/** @type {any} */ (null)).ok, false);
  assert.equal(stripProtocol([]), '');
  assert.throws(() => buildHead([]), TypeError);
  assert.throws(() => buildExplain(1), TypeError);
});
