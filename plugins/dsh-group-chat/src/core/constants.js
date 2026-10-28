// @ts-check
/**
 * 群聊数据内核 · 常量与上限（单点收口）
 *
 * 契约来源：docs/architecture/group-chat-architecture.md
 *  - §4.3.1 排序 / §4.5 游标分页 / §4.8.2 上限 / §5.2 协议 / §6.6 折叠
 *
 * 约束：本文件不引用 DOM / Cordis / Node API；纯数据。
 * 命名约定：所有上限集中在 LIMITS，便于压测调参（架构 §3.1 设计原则 5）。
 */

/** 协议版本（§5.2 PROTOCOL_V1.version） */
export const PROTOCOL_VERSION = 1;

/** 全局上限与阈值（架构 §4.8.2 上限常量 + §5.4 限流 + §6.6 折叠） */
export const LIMITS = Object.freeze({
  /** 会话数上限（lead 全部后代） */
  maxSessions: 32,
  /** 成员目录上限 */
  maxMembers: 64,
  /** 后代深度上限（lead=0） */
  maxDepth: 3,
  /** 作用域回溯：parentSession 链最大跳数（F27/§4.8.2） */
  maxParentHops: 4,
  /** 每会话预取事件上限（防单个话多成员挤出他人，§4.5） */
  perSessionPrefetch: 400,
  /** 首屏消息条数 */
  firstScreen: 200,
  /** 向上分页条数（§4.5） */
  pageSize: 50,
  /** 内存消息上限（§4.5：超出从中间裁剪，保留首 200 + 最近 1800） */
  maxMessagesInMemory: 2000,
  /** 内存裁剪时保留的头部条数 */
  memoryKeepHead: 200,
  /** 单条消息渲染文本上限（64KB，§6.6） */
  textRender: 64 * 1024,
  /** 单条消息存储文本上限（256KB，§4.8.2 textStore） */
  textStore: 256 * 1024,
  /** 单批事件上限 */
  eventBatch: 500,
  /** 合并节流（ms，仅 UI 侧用，内核不 sleep） */
  mergeDebounceMs: 120,
  /** 发送目标数上限（§5.4） */
  maxTargetsPerBatch: 8,
  /** 每个目标最小发送间隔（ms，§5.4） */
  minIntervalMs: 200,
  /** 手动重试次数上限（§5.4） */
  maxRetry: 2,
  /** 单目标 prompt 超时（ms，§5.4） */
  promptTimeoutMs: 30000,
  /** 只读判定：全员 inactive 持续时长（ms，§6.4.4） */
  readonlyIdleMs: 90000,
  /** 弱键配对时间窗（ms，§4.3.3 ③） */
  weakKeyTimeWindowMs: 5000,
  /** 同发刷新后丢 batchId 时的前缀归并时间窗（ms，§4.4；M6 收紧到 5s） */
  fanoutTimeWindowMs: 5 * 60 * 1000,
  /** 无 batchId 时仅允许「同批副本」归并的时间窗（M6：两次同文群发不应误合并） */
  fanoutSignatureWindowMs: 5000,
  /** localBatches TTL（§5.3.1） */
  localBatchTtlMs: 5 * 60 * 1000,
  /** 无 rpcId 时 localBatches 弱匹配时间窗（H1：±2min） */
  localBatchFallbackWindowMs: 2 * 60 * 1000,
  /** 折叠软换行估算：每行字符数（M1；CJK 近似，窄屏可 UI 传更小值） */
  foldCharsPerLine: 40,
  /** 折叠：行数阈值（§6.6） */
  foldMaxLines: 8,
  /** 折叠：字符阈值（§6.6） */
  foldMaxChars: 400,
  /** 初始任务摘要：最大字符数（§4.2.1） */
  promptExcerptMaxChars: 160,
  /** 初始任务摘要：最大行数（§4.2.1） */
  promptExcerptMaxLines: 2,
  /** 时间近邻配对窗口（ms，任务卡二级回退，TCF §3.3） */
  taskNeighborWindowMs: 1000,
});

/**
 * T2/T3 消费的 `limits` 别名（前端已冻结该导出名；同时保留 LIMITS 供内核使用）。
 * 额外给出折叠阈值的短名 `foldLines` / `foldChars`（架构 §6.6）。
 */
export const limits = Object.freeze({
  ...LIMITS,
  foldLines: LIMITS.foldMaxLines,
  foldChars: LIMITS.foldMaxChars,
});

/**
 * 会话排序权重（§4.3.1 sessionRank）
 * @type {Readonly<Record<'lead'|'teammate'|'subagent'|'system', number>>}
 */
export const SESSION_RANK = Object.freeze({
  lead: 0,
  teammate: 1,
  subagent: 2,
  system: 3,
});

/**
 * 同毫秒 kind 序（§4.3.1：member_card < task_card < 普通消息）
 * 数值越小越靠前。
 * @type {Readonly<Record<string, number>>}
 */
export const KIND_RANK = Object.freeze({
  member_card: 0,
  task_card: 1,
});

/** 普通消息的 kindRank 默认值 */
export const KIND_RANK_DEFAULT = 2;

/** 消息 kind 全集（§4.1 MessageKind） */
export const MESSAGE_KINDS = Object.freeze([
  'user',
  'agent_to_agent',
  'agent_output',
  'system',
  'delivery',
  'member_card',
  'task_card',
]);

/** 交付状态全集（§4.1 DeliveryState 四态） */
export const DELIVERY_STATES = Object.freeze(['sending', 'sent', 'partial', 'failed']);

/** 成员相位 → 成员状态（team/member.phase） */
export const MEMBER_PHASE_TO_STATUS = Object.freeze({
  provisioning: 'provisioning',
  active: 'active',
  failed: 'failed',
});

/** 任务动作全集（TCF §2.2，create + 7 个 update action + release） */
export const TASK_ACTIONS = Object.freeze([
  'create',
  'claim',
  'complete',
  'reopen',
  'reassign',
  'edit',
  'set_dependencies',
  'delete',
  'release',
]);

/** 任务状态全集（严格四枚举，无 failed，TCF §1.1） */
export const TASK_STATUSES = Object.freeze(['pending', 'in_progress', 'completed', 'deleted']);

/**
 * 任务动作 canonical 中文文案（core 兜底；T2 必须优先用 i18n key，见 index.js 约定）
 * i18n key 形如 `task.action.create`。
 */
export const TASK_ACTION_LABELS = Object.freeze({
  create: '创建任务',
  claim: '认领任务',
  complete: '完成任务',
  reopen: '重新打开',
  reassign: '改派任务',
  edit: '编辑任务',
  set_dependencies: '依赖变更',
  delete: '取消任务',
  release: '放回',
});

/**
 * 任务状态 canonical 中文文案（core 兜底；T2 优先 i18n `task.state.*`）
 */
export const TASK_STATUS_LABELS = Object.freeze({
  pending: '待认领',
  in_progress: '进行中',
  completed: '已完成',
  deleted: '已取消',
});

/** 认可动作的上位标签（canonical，T2 用 i18n key） */
export const TASK_ACTION_LABEL_KEYS = Object.freeze({
  create: 'task.action.create',
  claim: 'task.action.claim',
  complete: 'task.action.complete',
  reopen: 'task.action.reopen',
  reassign: 'task.action.reassign',
  edit: 'task.action.edit',
  set_dependencies: 'task.action.set_dependencies',
  delete: 'task.action.delete',
  release: 'task.action.release',
});

/** 认可状态的上位标签 key */
export const TASK_STATUS_LABEL_KEYS = Object.freeze({
  pending: 'task.state.pending',
  in_progress: 'task.state.in_progress',
  completed: 'task.state.completed',
  deleted: 'task.state.deleted',
});

/** 无名册时的成员显示名回退（禁止把 sessionId 短截断当名字；T2 可用 i18n 覆盖） */
export const MEMBER_FALLBACK_NAME = '成员';

/** 欢迎提示文案模板（canonical zh；T2 用 i18n `member.welcome`） */
export const WELCOME_TEXT_TEMPLATE = '欢迎 @{name} 加入群聊';

/** 成员卡片文案（canonical zh 兜底；T2 用 i18n `member.*`） */
export const MEMBER_TEXT = Object.freeze({
  noDescription: '暂无角色描述',
  noTask: '（无初始任务）',
  leadBadge: '主 Agent',
  teammateBadge: 'Teammate',
});

/** 工具名 → subagent 上下文策略（MCF §5） */
export const SUBAGENT_TOOL_CONTEXT = Object.freeze({
  subagent: 'fresh',
  subagent_fork: 'fork',
});

/**
 * 已知「系统上下文注入」型 source.kind（D-01 修复）：
 * 这些 `user/message` 是宿主注入的 prompt 片段（工作区指令 / 运行时上下文 / skill 目录 / 时间 / 后台任务），
 * **不是群聊发言**，归一化时必须丢弃（架构 §4.9：不展示系统提示词）。
 * 真实日志实测（htdot + team-group 两工作区 41 个会话）：agent-instructions / runtime-context / skill-catalog /
 * time-context / tool-jobs / skill-invocation / user-approval；
 * system-prompt 为 MessageSourceMap 基础类型；goal/schedule 为同类注入（保留扩展位）。
 */
export const CONTEXT_SOURCE_KINDS = Object.freeze([
  'agent-instructions',
  'runtime-context',
  'skill-catalog',
  'time-context',
  'tool-jobs',
  'skill-invocation',
  'user-approval',
  'subagent-settled',
  'system-prompt',
  'goal',
  'schedule',
]);

/** @param {string} kind @returns {boolean} */
export function isContextSourceKind(kind) {
  return CONTEXT_SOURCE_KINDS.includes(String(kind ?? ''));
}

/** 来源 kind 常量（会话事件 MessageSourceMap，含 experimental 扩展） */
export const SOURCE_KIND = Object.freeze({
  user: 'user',
  agentMessage: 'agent-message',
  teamMessage: 'team-message',
  subagentSettled: 'subagent-settled',
});

/** 需要统计/识别的工具名 */
export const TOOL_NAMES = Object.freeze({
  spawnTeammate: 'spawn_teammate',
  subagent: 'subagent',
  subagentFork: 'subagent_fork',
  taskCreate: 'team_task_create',
  taskUpdate: 'team_task_update',
  sendMessage: 'send_message',
});

/** 会话事件类型常量（KNOWN_SESSION_EVENT_TYPES 子集） */
export const EVENT_TYPES = Object.freeze({
  userMessage: 'user/message',
  assistantMessage: 'assistant/message',
  assistantAttempt: 'assistant/attempt',
  systemMessage: 'system/message',
  turnStart: 'turn/start',
  turnEnd: 'turn/end',
  stepStart: 'step/start',
  stepEnd: 'step/end',
  inboxSpliced: 'agent/inbox/spliced',
  toolCall: 'tool/call',
  toolResult: 'tool/result',
  teamMember: 'team/member',
  teamTask: 'team/task',
  teamMessageQueued: 'team/message/queued',
  teamMessageDelivered: 'team/message/delivered',
  subagentCatalog: 'subagent/catalog',
  subagentDescriptor: 'subagent/descriptor',
  subagentSettled: 'subagent/settled',
  endSeed: 'session/end-seed',
  deliverablesPresented: 'deliverables/presented',
});

/** 独立 M6 摘要消息的 id 前缀（lead 追加约束：有工具无输出时出摘要） */
export const TOOL_SUMMARY_ID_PREFIX = 'to:';

/** 调试开关 key（§7 日志与诊断） */
export const DEBUG_FLAG_KEY = 'group-chat:debug';
