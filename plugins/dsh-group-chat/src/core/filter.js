// @ts-check
/**
 * 群聊数据内核 · 成员筛选语义（D-B v0.6.2 冻结 / §6.4.4）
 *
 * 命中规则（单选，纯视图层，不改 messages）：
 *   sender.name === selected
 *   || targets.includes(selected)
 *   || selected 是 teammate 且消息 sender 是其 subagent（子体归入父成员）
 * 选 subagent 时只显示其自身消息（不反向包含父成员）。
 * **不做正文文本搜索**、不做多选/时间/类型组合。
 *
 * 冻结导出名：`matchesFilter(message, selectedName, members)`（T2 消费）。
 */

import { memberByName } from './roster.js';

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./model.js').ChannelMember} ChannelMember
 */

/**
 * 单条消息是否命中筛选
 * @param {ChannelMessage} message
 * @param {string|undefined|null} selectedName
 * @param {ChannelMember[]} members
 * @returns {boolean}
 */
export function matchesFilter(message, selectedName, members) {
  const selected = String(selectedName ?? '').replace(/^@/, '');
  if (!selected) return true;
  if (!message) return false;
  const senderName = String(message.sender?.name ?? '');
  if (senderName === selected) return true;
  if (selected === 'lead' && (message.sender?.kind === 'lead' || senderName === 'lead')) return true;
  if (Array.isArray(message.targets) && message.targets.some((t) => String(t).replace(/^@/, '') === selected)) return true;

  // 父成员筛选包含其 subagent 消息（子体归入父）
  const selectedMember = memberByName(Array.isArray(members) ? members : [], selected);
  if (!selectedMember || selectedMember.kind !== 'teammate') return false;
  const senderMember = (Array.isArray(members) ? members : []).find(
    (m) => m.sessionId === message.sender?.sessionId || m.name === senderName,
  );
  return Boolean(senderMember && senderMember.kind === 'subagent' && senderMember.parentSessionId === selectedMember.sessionId);
}

/**
 * 筛选消息（只改可见投影，不改未读计数与实时追加）
 * @param {ChannelMessage[]} messages
 * @param {string|undefined|null} selectedName
 * @param {ChannelMember[]} members
 * @returns {ChannelMessage[]}
 */
export function filterMessages(messages, selectedName, members) {
  const list = Array.isArray(messages) ? messages : [];
  if (!selectedName) return list.slice();
  return list.filter((m) => matchesFilter(m, selectedName, members));
}

/**
 * 筛选提示条数据（「正在只看 {name}（{n} 条）」）
 * @param {string} selectedName
 * @param {ChannelMessage[]} visible
 * @returns {{name: string, count: number}}
 */
export function filterBanner(selectedName, visible) {
  return { name: String(selectedName).replace(/^@/, ''), count: Array.isArray(visible) ? visible.length : 0 };
}
