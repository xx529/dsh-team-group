// @ts-check
/**
 * test/send · mock SessionBinding 与发送 deps 构造器
 * 仅测试使用；不进入 client bundle。
 */

import { createSingleFlight } from '../../src/send/rate-limit.js';

const LEAD = 'session-lead-1';
const UX = 'session-ux-2';
const BACKEND = 'session-backend-3';

/** @typedef {{name: string, sessionId: string, kind?: string}} Target */

/**
 * mock Cordis `ctx.sessions`：`binding(id).session.prompt(parts, mode, signal, requestId)`
 * @param {{responses?: Record<string, any>, defaultBehavior?: any, onPrompt?: (call: any) => any}} [options]
 */
export function createMockSessionHost(options = {}) {
  const responses = options.responses ?? {};
  /** @type {any[]} */
  const calls = [];
  let active = 0;
  let maxActive = 0;
  const host = {
    calls,
    responses,
    /** @param {string} sessionId @param {any} behavior */
    setResponse(sessionId, behavior) {
      responses[sessionId] = behavior;
    },
    get maxActive() {
      return maxActive;
    },
    sessions: {
      /** @param {string} sessionId */
      binding(sessionId) {
        return {
          session: {
            /**
             * @param {any[]} parts
             * @param {string} mode
             * @param {AbortSignal|undefined} signal
             * @param {string} requestId
             */
            prompt(parts, mode, signal, requestId) {
              const call = {
                sessionId,
                parts: JSON.parse(JSON.stringify(parts)),
                mode,
                signal,
                requestId,
                startedAt: Date.now(),
              };
              calls.push(call);
              active += 1;
              maxActive = Math.max(maxActive, active);
              const behavior = options.onPrompt ? options.onPrompt(call) : responses[sessionId] ?? options.defaultBehavior ?? 'ok';
              let settled = false;
              const done = () => {
                if (settled) return;
                settled = true;
                active -= 1;
              };
              if (behavior === 'never') return /** @type {Promise<any>} */ (new Promise(() => {}));
              if (behavior === 'error') {
                done();
                const error = /** @type {any} */ (new Error(`network failed for ${sessionId}`));
                error.code = 'TRANSPORT';
                return Promise.reject(error);
              }
              if (behavior instanceof Error) {
                done();
                return Promise.reject(behavior);
              }
              if (behavior && typeof behavior.then === 'function') {
                return Promise.resolve(behavior).then(
                  (value) => {
                    done();
                    return value;
                  },
                  (error) => {
                    done();
                    throw error;
                  },
                );
              }
              if (typeof behavior === 'function') {
                try {
                  return Promise.resolve(behavior(call)).then(
                    (value) => {
                      done();
                      return value;
                    },
                    (error) => {
                      done();
                      throw error;
                    },
                  );
                } catch (error) {
                  done();
                  return Promise.reject(error);
                }
              }
              if (behavior && typeof behavior === 'object') {
                // RemoteResult {ok:false,error} 作为 resolve 值返回（供诊断测试）
                if ('ok' in behavior) {
                  done();
                  return Promise.resolve(behavior);
                }
                done();
                const error = /** @type {any} */ (new Error(behavior.message ?? behavior.code ?? 'remote error'));
                Object.assign(error, behavior);
                return Promise.reject(error);
              }
              done();
              return Promise.resolve({ ok: true, requestId });
            },
          },
        };
      },
    },
  };
  return host;
}

/**
 * 构造发送 deps（默认关闭限流/超时等待，避免测试变慢；需要时显式覆盖）
 * @param {{host?: any, members?: any[], overrides?: Record<string, any>}} [options]
 */
export function makeSendDeps(options = {}) {
  const host = options.host ?? createMockSessionHost();
  let sequence = 0;
  const singleFlight = createSingleFlight();
  const batchRegistry = new Map();
  /** @type {number[]} */
  const sleeps = [];
  let clock = 1_800_000_000_000;
  const deps = {
    ctx: host,
    members: options.members,
    uuid: () => `req-${++sequence}`,
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    minIntervalMs: 0,
    timeoutMs: 5000,
    maxRetry: 2,
    singleFlight,
    batchRegistry,
    ...options.overrides,
  };
  return {
    deps,
    host,
    sleeps,
    singleFlight,
    batchRegistry,
    rules: {
      LEAD,
      UX,
      BACKEND,
    },
    defaultMembers: [
      { sessionId: LEAD, name: 'lead', displayName: 'Lead', kind: 'lead', depth: 0, status: 'running', addressable: true },
      { sessionId: UX, name: 'ux', displayName: 'ux', kind: 'teammate', parentSessionId: LEAD, depth: 1, status: 'running', addressable: true },
      { sessionId: BACKEND, name: 'backend', displayName: 'backend', kind: 'teammate', parentSessionId: LEAD, depth: 1, status: 'inactive', addressable: true },
    ],
  };
}

/** 标准三目标（lead 首位） */
export function threeTargets() {
  return [
    { name: 'lead', sessionId: LEAD, kind: 'lead' },
    { name: 'ux', sessionId: UX, kind: 'teammate' },
    { name: 'backend', sessionId: BACKEND, kind: 'teammate' },
  ];
}

export const IDS = { LEAD, UX, BACKEND };
