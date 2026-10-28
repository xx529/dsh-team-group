// @ts-check
/**
 * 群聊发送编排 · 单飞（single-flight）与频率限制（架构 §5.4 / Spike S3）
 *
 * - 单飞：同一频道同一时刻只允许 1 个发送批次；不同频道互不阻塞。
 * - 频率：同一批次内相邻 prompt 至少间隔 `minIntervalMs`（默认 200ms），且必须先 lead 后成员（串行）。
 * - 锁带陈旧超时（默认 120s），避免异常未释放导致永久卡死；测试可注入 now。
 */

import { LIMITS } from '../core/constants.js';

/**
 * @typedef {Object} SingleFlight
 * @property {(key: string, batchId: string) => {ok: boolean, reason?: 'busy'|'same-batch', holder?: string}} tryAcquire
 * @property {(key: string, batchId: string) => void} release
 * @property {(key: string) => {id: string, startedAt: number}|undefined} get
 * @property {() => void} clear
 */

/**
 * @param {{now?: () => number, staleMs?: number}} [opts]
 * @returns {SingleFlight}
 */
export function createSingleFlight(opts = {}) {
  const now = opts.now ?? (() => Date.now());
  const staleMs = opts.staleMs ?? 120_000;
  /** @type {Map<string, {id: string, startedAt: number}>} */
  const locks = new Map();
  return {
    tryAcquire(key, batchId) {
      const current = locks.get(key);
      if (current) {
        const age = now() - current.startedAt;
        if (age < staleMs) {
          if (current.id === batchId) return { ok: false, reason: 'same-batch', holder: current.id };
          return { ok: false, reason: 'busy', holder: current.id };
        }
        locks.delete(key); // 陈旧锁强制释放
      }
      locks.set(key, { id: batchId, startedAt: now() });
      return { ok: true };
    },
    release(key, batchId) {
      const current = locks.get(key);
      if (current && current.id === batchId) locks.delete(key);
    },
    get(key) {
      return locks.get(key);
    },
    clear() {
      locks.clear();
    },
  };
}

/** 模块级默认单飞（生产 client 直接使用；测试可注入自己的实例） */
export const defaultSingleFlight = createSingleFlight();

/**
 * @typedef {Object} RateLimiter
 * @property {<T>(fn: () => Promise<T>|T) => Promise<T>} run
 * @property {() => number} lastStartedAt
 * @property {() => number} count
 */

/**
 * 串行节流器：相邻任务开始时间至少间隔 minIntervalMs。
 * @param {{minIntervalMs?: number, now?: () => number, sleep?: (ms: number) => Promise<void>, signal?: AbortSignal}} [opts]
 * @returns {RateLimiter}
 */
export function createRateLimiter(opts = {}) {
  const minIntervalMs = opts.minIntervalMs ?? LIMITS.minIntervalMs;
  const now = opts.now ?? (() => Date.now());
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let last = -Infinity;
  let chain = Promise.resolve();
  let count = 0;
  return {
    run(fn) {
      const next = chain.then(async () => {
        const current = now();
        const wait = Number.isFinite(last) ? minIntervalMs - (current - last) : 0;
        if (wait > 0) await sleep(wait);
        last = now();
        count += 1;
        return fn();
      });
      chain = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
    lastStartedAt: () => last,
    count: () => count,
  };
}

/**
 * 30s 超时包装（arch §5.4：单目标 prompt 30s 未 accepted 视为 failed/timeout）
 * @template T
 * @param {Promise<T>|T} value
 * @param {{timeoutMs?: number, signal?: AbortSignal, sleep?: (ms: number) => Promise<void>}} [opts]
 * @returns {Promise<T>}
 */
export function withTimeout(value, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? LIMITS.promptTimeoutMs;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.resolve(value);
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const error = new Error('prompt timed out');
      // @ts-ignore
      error.code = 'gc/timeout';
      // @ts-ignore
      error.timedOut = true;
      reject(error);
    }, timeoutMs);
    Promise.resolve(value).then(
      (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
