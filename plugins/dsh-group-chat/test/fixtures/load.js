// @ts-check
/**
 * fixture 加载器（仅测试使用；不进入 client bundle）
 *
 * `.jsonl` 格式：
 *   {"__session": {"id": "...", "name": "...", "header": {...}}}   ← 会话分节
 *   {"type": "...", "seq": 1, "time": 1793158400000, "data": {...}} ← 原始事件（或 S1 信封）
 *
 * `.meta.json`：附加断言数据（localBatches / echo / expected）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} name
 * @returns {{sessions: Array<{sessionId: string, name?: string, header: any, events: any[], revision: number}>, lines: any[]}}
 */
export function loadFixture(name) {
  const file = path.join(DIR, name.endsWith('.jsonl') ? name : `${name}.jsonl`);
  const text = fs.readFileSync(file, 'utf8');
  /** @type {Array<{sessionId: string, name?: string, header: any, events: any[], revision: number}>} */
  const sessions = [];
  /** @type {any[]} */
  const lines = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const parsed = JSON.parse(line);
    lines.push(parsed);
    if (parsed && parsed.__session) {
      current = {
        sessionId: String(parsed.__session.id),
        name: parsed.__session.name,
        header: parsed.__session.header ?? { id: parsed.__session.id },
        events: [],
        revision: 1,
      };
      sessions.push(current);
      continue;
    }
    if (!current) throw new Error(`fixture ${name}: 事件出现在 __session 之前`);
    current.events.push(parsed);
  }
  return { sessions, lines };
}

/**
 * @param {string} name
 * @returns {any}
 */
export function loadFixtureMeta(name) {
  const base = name.replace(/\.jsonl$/, '').replace(/\.meta\.json$/, '');
  const file = path.join(DIR, `${base}.meta.json`);
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * fixture 名列表（测试自检用）
 * @returns {string[]}
 */
export function listFixtures() {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .sort();
}

/**
 * 取 lead 会话（先按名称 'lead'，否则第一个）
 * @param {Array<{sessionId: string, name?: string}>} sessions
 * @returns {string}
 */
export function leadSessionIdOf(sessions) {
  const lead = sessions.find((s) => s.name === 'lead') ?? sessions[0];
  return lead ? lead.sessionId : '';
}
