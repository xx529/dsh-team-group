// @ts-check
/**
 * 群聊数据内核 · 轮次聚合（B2 / F26 / 架构 §6.15.2）
 *
 * 输入：某个成员会话的**原始事件窗口**（与 feed 同一份，不新增 Host / 不额外 retain）。
 * 以 `turn/start` – `turn/end` 为一个 turn；最新的在前。
 *  - turnIndex：数据里的 turn 序号（缺失时按出现顺序自增）
 *  - stepCount：区间内最大 step
 *  - toolCount：区间内全部 `tool/call` 数（含失败/中断调用）
 *  - summary：区间内最后一个非空 assistant/message 的 text 块（≤120 字 / ≤2 行）
 *  - status：`turn/end.reason.kind` 映射（completed→done、aborted/interrupted→aborted、
 *            error→error、max-tokens→truncated、无 end→running、其它→unknown）
 *  - forked turn 丢弃（与 feed 一致）；seeded 继承前缀可按 `cutoffSeq` 跳过。
 *
 * 零依赖、无 DOM / Node。
 */

/**
 * @typedef {Object} Turn
 * @property {number} index
 * @property {number} turnId
 * @property {number} startedAt
 * @property {number|null} endedAt
 * @property {'done'|'aborted'|'error'|'truncated'|'running'|'unknown'} status
 * @property {string} summary
 * @property {number} stepCount
 * @property {number} toolCount
 * @property {boolean} [inferred] 窗口缺少 turn/start 时按 assistant/tool 分段推断（M2）
 */

/**
 * @param {any} entry 原始事件或 S1 信封
 * @returns {any|null} 事件对象；transient/无效返回 null
 */
function unwrapEvent(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.type === 'event' && entry.event && typeof entry.event === 'object') return entry.event;
  if (entry.type === 'transient') return null;
  if (typeof entry.type === 'string' && (typeof entry.seq === 'number' || entry.data !== undefined)) return entry;
  return null;
}

/**
 * @param {any} content
 * @returns {string}
 */
function lastTextOf(content) {
  if (!Array.isArray(content)) return '';
  /** @type {string[]} */
  const texts = [];
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') texts.push(block.text);
  }
  return texts.length > 0 ? texts[texts.length - 1] : '';
}

/**
 * turn/end.reason.kind → 轨迹状态
 * @param {string} reasonKind
 * @returns {'done'|'aborted'|'error'|'truncated'|'unknown'}
 */
export function turnStatusFromReason(reasonKind) {
  const kind = String(reasonKind ?? '').toLowerCase();
  if (kind === 'completed') return 'done';
  if (kind === 'aborted' || kind === 'interrupted' || kind === 'cancelled' || kind === 'canceled') return 'aborted';
  if (kind === 'error' || kind === 'failed') return 'error';
  if (kind === 'max-tokens' || kind === 'max_tokens' || kind === 'truncated') return 'truncated';
  return 'unknown';
}

/**
 * 轮次摘要：末段文本 → ≤maxLines 行、≤maxChars 字（超出加 …）
 * @param {string} text
 * @param {{maxChars?: number, maxLines?: number}} [options]
 * @returns {string}
 */
export function summarizeTurn(text, options = {}) {
  const maxChars = Number.isFinite(options.maxChars) ? Number(options.maxChars) : 120;
  const maxLines = Number.isFinite(options.maxLines) ? Number(options.maxLines) : 2;
  const raw = String(text ?? '').replace(/\r\n?/g, '\n').trim();
  if (!raw) return '';
  const lines = raw.split('\n').map((line) => line.trim()).filter((line) => line !== '');
  let summary = lines.slice(0, Math.max(1, maxLines)).join('\n');
  if (lines.length > maxLines) summary += '…';
  if (summary.length > maxChars) summary = `${summary.slice(0, maxChars - 1)}…`;
  return summary;
}

/**
 * 聚合轮次（最新在前）
 * @param {any[]} events 原始事件 / S1 信封数组
 * @param {{cutoffSeq?: number, maxChars?: number, maxLines?: number}} [options]
 * @returns {Turn[]}
 */
export function aggregateTurns(events, options = {}) {
  const list = Array.isArray(events) ? events : [];
  const raw = [];
  for (const entry of list) {
    const event = unwrapEvent(entry);
    if (!event || typeof event.type !== 'string') continue;
    raw.push(event);
  }
  // seeded/fork cutoff：显式传入优先，否则取 session/end-seed 的最大 seq
  let cutoff = Number.isFinite(options.cutoffSeq) ? Number(options.cutoffSeq) : -1;
  if (!Number.isFinite(options.cutoffSeq)) {
    for (const e of raw) {
      if (e.type === 'session/end-seed' && typeof e.seq === 'number' && e.seq > cutoff) cutoff = e.seq;
    }
  }

  /** @type {Map<number, {turnId:number, startedAt:number, endedAt:number|null, status:string, finalText:string, stepCount:number, toolCount:number, dropped:boolean}>} */
  const records = new Map();
  let order = 0;
  let currentTurn = null;
  let sawAnyTurnish = false;
  /** @type {Set<number>} */
  const explicitTurns = new Set();

  const ensure = (turnId, time) => {
    const id = Number.isFinite(turnId) ? Number(turnId) : order + 1;
    let rec = records.get(id);
    if (!rec) {
      rec = {
        turnId: id,
        startedAt: Number.isFinite(time) ? Number(time) : 0,
        endedAt: null,
        status: 'running',
        finalText: '',
        stepCount: 0,
        toolCount: 0,
        dropped: false,
      };
      records.set(id, rec);
    }
    if (Number.isFinite(time) && (!rec.startedAt || Number(time) < rec.startedAt)) rec.startedAt = Number(time);
    return rec;
  };

  for (const event of raw) {
    if (cutoff >= 0 && typeof event.seq === 'number' && event.seq <= cutoff) continue;
    if (event.type === 'session/end-seed') continue;
    const data = event.data ?? {};
    const time = Number(event.time ?? 0);
    if (event.type === 'turn/start') {
      sawAnyTurnish = true;
      order += 1;
      explicitTurns.add(Number.isFinite(data.turn) ? Number(data.turn) : order);
      currentTurn = Number.isFinite(data.turn) ? Number(data.turn) : order;
      ensure(currentTurn, time);
      continue;
    }
    if (event.type === 'turn/end') {
      const turnId = Number.isFinite(data.turn) ? Number(data.turn) : currentTurn ?? order;
      const rec = ensure(turnId, time);
      const reason = data.reason?.kind ?? 'unknown';
      rec.endedAt = time;
      rec.status = turnStatusFromReason(reason);
      if (String(reason).toLowerCase() === 'forked') rec.dropped = true;
      if (currentTurn === turnId) currentTurn = null;
      continue;
    }
    if (event.type === 'assistant/message') {
      sawAnyTurnish = true;
      const turnId = Number.isFinite(data.turn) ? Number(data.turn) : currentTurn ?? order;
      if (!Number.isFinite(data.turn) && currentTurn === null) order += 1;
      const rec = ensure(turnId, time);
      const text = lastTextOf(data.message?.content);
      if (text.trim() !== '') rec.finalText = text;
      if (Number.isFinite(data.step)) rec.stepCount = Math.max(rec.stepCount, Number(data.step));
      continue;
    }
    if (event.type === 'tool/call') {
      sawAnyTurnish = true;
      const turnId = Number.isFinite(data.turn) ? Number(data.turn) : currentTurn ?? order;
      const rec = ensure(turnId, time);
      rec.toolCount += 1;
      if (Number.isFinite(data.step)) rec.stepCount = Math.max(rec.stepCount, Number(data.step));
      continue;
    }
  }

  if (records.size === 0) {
    /** @type {any} */
    const empty = [];
    empty.emptyReason = sawAnyTurnish ? 'no-usable-turn-events' : 'no-turn-events';
    return empty;
  }

  /** @type {Turn[]} */
  const turns = [];
  let index = 0;
  for (const rec of records.values()) {
    if (rec.dropped) continue;
    index += 1;
    turns.push({
      index,
      turnId: rec.turnId,
      startedAt: rec.startedAt,
      endedAt: rec.endedAt,
      status: /** @type {any} */ (rec.endedAt === null ? 'running' : rec.status === 'running' ? 'unknown' : rec.status),
      summary: summarizeTurn(rec.finalText, { maxChars: options.maxChars ?? 120, maxLines: options.maxLines ?? 2 }),
      stepCount: rec.stepCount,
      toolCount: rec.toolCount,
      inferred: !explicitTurns.has(rec.turnId),
    });
  }
  // 最新在前
  turns.sort((a, b) => b.index - a.index);
  /** @type {any} */
  const result = turns;
  result.inferred = turns.some((t) => t.inferred === true);
  return result;
}
