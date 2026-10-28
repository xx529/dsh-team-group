// @ts-check
/**
 * 群聊数据内核（T1）· 公共 API
 *
 * ===== 导出契约（T2/T3 消费，冻结）=====
 *
 * 1) 排序/合并：`sortTimeline`（别名 `sortMessages`）、`compareMessages`、`orderKey`、`mergeTimeline`、`insertInOrder`
 * 2) 归一化：`normalizeChannel(sessions, ctx)` → `{messages, diagnostics, members}`；
 *            `normalize(events, ctx)`（单会话便捷）、`normalizeEntries(entries, ctx)`（S1 信封层）、`collectSession`
 * 3) 去重：`dedupeMessages`、`preferMessage`、`weakKeyOf`、`hashText`、`normalizeText`
 * 4) 同发：`mergeFanout`、`aggregateDeliveryState`
 * 5) 分页/上限：`firstScreen`、`pageOlder`、`capInMemory`、`selectPrefetch`、`cursorAfterOpen`、`buildPage`
 * 6) 协议：`buildParts`（发送用 part 数组）、`buildText`、`parseParts`、`parseText`、`stripProtocol`、`protocolSnapshot`、
 *          `buildFanoutPrefix`（T2 冻结名，string）、`buildFanoutPrefixParts`（string[]）、`fanoutSignature`
 * 7) 提及/目标：`computeMentionQuery`、`parseMentions`、`resolveTargets`、`filterMentionCandidates`、
 *               `resolveTargetSessionIds`、`isAddressable`
 * 8) 筛选：`matchesFilter`、`filterMessages`、`filterBanner`；折叠：`foldInfo`、`shouldFold`、`countLines`、`approximateChars`
 * 9) 成员目录：`deriveRoster`、`deriveSnapshot`、`deriveReadonly`、`memberById`、`memberByName`、`displayNameOf`
 * 10) 常量：`LIMITS`、`limits`、`SESSION_RANK`、`KIND_RANK`、`TASK_ACTION_LABELS`、`TASK_STATUS_LABELS`、
 *           `TASK_ACTION_LABEL_KEYS`、`TASK_STATUS_LABEL_KEYS`、`WELCOME_TEXT_TEMPLATE`、`MEMBER_TEXT`、`TOOL_NAMES`、`EVENT_TYPES`
 *
 * ===== 文案约定（Lead 2026-10-28 批准）=====
 * core 会填 canonical zh 的 `actionLabel`/`statusLabel`/`text`（欢迎提示），**T2 必须优先用 i18n key 渲染**
 * （`task.action.*` / `task.state.*` / `member.welcome`），core 的中文只作兜底/降级；meta 里保留了枚举与 memberName。
 *
 * ===== 纯函数约束 =====
 * 无 DOM / Cordis / Node API（无 fs/process/crypto）；可作为 Host/Client 共用内核。
 */

import {
  CONTEXT_SOURCE_KINDS,
  DEBUG_FLAG_KEY,
  DELIVERY_STATES,
  EVENT_TYPES,
  KIND_RANK,
  KIND_RANK_DEFAULT,
  LIMITS,
  MEMBER_PHASE_TO_STATUS,
  MEMBER_TEXT,
  MESSAGE_KINDS,
  PROTOCOL_VERSION,
  SESSION_RANK,
  SOURCE_KIND,
  SUBAGENT_TOOL_CONTEXT,
  TASK_ACTION_LABELS,
  TASK_ACTION_LABEL_KEYS,
  TASK_ACTIONS,
  TASK_STATUS_LABELS,
  TASK_STATUS_LABEL_KEYS,
  TASK_STATUSES,
  TOOL_NAMES,
  TOOL_SUMMARY_ID_PREFIX,
  WELCOME_TEXT_TEMPLATE,
  isContextSourceKind,
  limits,
} from './constants.js';
import {
  PARSE_EXPLAIN,
  PARSE_HEAD,
  buildExplain,
  buildHead,
  buildParts,
  buildText,
  buildFanoutPrefix,
  buildFanoutPrefixParts,
  dedupeTargets,
  fanoutSignature,
  hasProtocolPrefix,
  parseParts,
  parseText,
  protocolSnapshot,
  stripProtocol,
} from './protocol.js';
import {
  checkTargetCount,
  computeMentionQuery,
  filterMentionCandidates,
  parseMentions,
  resolveTargetSessionIds,
  resolveTargets,
} from './mentions.js';
import {
  deriveReadonly,
  deriveRoster,
  deriveSnapshot,
  displayNameOf,
  isAddressable,
  memberById,
  memberByName,
  normalizeMemberStatus,
} from './roster.js';
import {
  buildDirectory,
  collectSession,
  diffAction,
  emitSessionMessages,
  excerptPrompt,
  extractFiles,
  normalize,
  normalizeChannel,
  normalizeEntries,
  parseJsonSafe,
  prefixSenderName,
  senderOf,
  settlementClosingText,
  stripTeamPrefix,
  textBlocks,
  unwrapEntry,
} from './normalize.js';
import {
  dedupeMessages,
  hashText,
  normalizeText,
  pairNotificationCopies,
  preferMessage,
  weakKeyOf,
} from './dedupe.js';
import {
  aggregateDeliveryState,
  mergeFanout,
} from './fanout.js';
import {
  compareMessages,
  compareOrderKey,
  cloneCursor,
  encodeSeq,
  insertInOrder,
  kindRank,
  makeCursor,
  mergeTimeline,
  orderKey,
  refreshCursorKeys,
  sessionRankOf,
  sliceByOrder,
  sortMessages,
  sortTimeline,
  advanceOffset,
} from './timeline.js';
import {
  buildPage,
  capInMemory,
  computeHasMore,
  cursorAfterOpen,
  firstScreen,
  pageOlder,
  selectPrefetch,
} from './paginate.js';
import {
  filterBanner,
  filterMessages,
  matchesFilter,
} from './filter.js';
import {
  approximateChars,
  countLines,
  foldInfo,
  shouldFold,
} from './folding.js';

export {
  // constants
  LIMITS,
  limits,
  SESSION_RANK,
  KIND_RANK,
  KIND_RANK_DEFAULT,
  MESSAGE_KINDS,
  DELIVERY_STATES,
  MEMBER_PHASE_TO_STATUS,
  TASK_ACTIONS,
  TASK_STATUSES,
  TASK_ACTION_LABELS,
  TASK_STATUS_LABELS,
  TASK_ACTION_LABEL_KEYS,
  TASK_STATUS_LABEL_KEYS,
  WELCOME_TEXT_TEMPLATE,
  MEMBER_TEXT,
  SUBAGENT_TOOL_CONTEXT,
  SOURCE_KIND,
  TOOL_NAMES,
  EVENT_TYPES,
  TOOL_SUMMARY_ID_PREFIX,
  DEBUG_FLAG_KEY,
  PROTOCOL_VERSION,
  CONTEXT_SOURCE_KINDS,
  isContextSourceKind,
  // protocol
  PARSE_HEAD,
  PARSE_EXPLAIN,
  buildHead,
  buildExplain,
  buildParts,
  buildText,
  buildFanoutPrefix,
  buildFanoutPrefixParts,
  parseParts,
  parseText,
  stripProtocol,
  hasProtocolPrefix,
  protocolSnapshot,
  dedupeTargets,
  fanoutSignature,
  // mentions
  computeMentionQuery,
  parseMentions,
  resolveTargets,
  resolveTargetSessionIds,
  filterMentionCandidates,
  checkTargetCount,
  // roster
  deriveRoster,
  deriveSnapshot,
  deriveReadonly,
  displayNameOf,
  memberById,
  memberByName,
  isAddressable,
  normalizeMemberStatus,
  // normalize
  normalize,
  normalizeChannel,
  normalizeEntries,
  collectSession,
  buildDirectory,
  emitSessionMessages,
  senderOf,
  textBlocks,
  parseJsonSafe,
  extractFiles,
  unwrapEntry,
  prefixSenderName,
  stripTeamPrefix,
  settlementClosingText,
  excerptPrompt,
  diffAction,
  // dedupe
  dedupeMessages,
  preferMessage,
  normalizeText,
  hashText,
  weakKeyOf,
  pairNotificationCopies,
  // fanout
  mergeFanout,
  aggregateDeliveryState,
  // timeline
  compareMessages,
  sortTimeline,
  sortMessages,
  kindRank,
  sessionRankOf,
  orderKey,
  compareOrderKey,
  cloneCursor,
  encodeSeq,
  makeCursor,
  sliceByOrder,
  mergeTimeline,
  insertInOrder,
  advanceOffset,
  refreshCursorKeys,
  // paginate
  firstScreen,
  pageOlder,
  capInMemory,
  selectPrefetch,
  computeHasMore,
  cursorAfterOpen,
  buildPage,
  // filter
  matchesFilter,
  filterMessages,
  filterBanner,
  // folding
  foldInfo,
  shouldFold,
  countLines,
  approximateChars,
};
