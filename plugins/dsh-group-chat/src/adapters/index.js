// @ts-check
/**
 * 适配器层 · ChannelSource 工厂（架构 §4.6 / §9.1 done-when ⑥）
 *
 * `createChannelSource(kind, deps)`：
 *  - `'mock'`             → MockChannelSource（测试/组件预览，内存 fixture）
 *  - `'client'`           → ClientSessionSource（v1 生产实现，纯 Client）
 *  - `'replay'`           → ClientSessionSource（deps.ctx.sessions 换成 replay host，契约测试用）
 *
 * 两个实现共享同一内核，因此同一 fixture 的输出必须一致（CT-05）。
 */

import { MockChannelSource } from './mock-source.js';
import { ClientSessionSource, createClientSessionSource, deriveLeadSessionId } from './client-session-source.js';
import { createReplaySessionHost } from './replay-host.js';

/**
 * @param {'mock'|'client'|'replay'} kind
 * @param {any} deps
 * @returns {MockChannelSource|ClientSessionSource}
 */
export function createChannelSource(kind, deps) {
  switch (kind) {
    case 'mock':
      return new MockChannelSource(deps);
    case 'client':
    case 'replay':
      return createClientSessionSource(deps);
    default:
      throw new TypeError(`createChannelSource: 未知 kind "${kind}"（可选 mock/client/replay）`);
  }
}

export {
  MockChannelSource,
  ClientSessionSource,
  createClientSessionSource,
  deriveLeadSessionId,
  createReplaySessionHost,
};
