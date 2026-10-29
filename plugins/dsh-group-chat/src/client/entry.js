/* ──────────────────────────────────────────────────────────────────────────
 * entry.js — 插件浏览器半入口（唯一有副作用的文件）
 *
 * 由 scripts/build.mjs 拼在全部 parts 之后、factory 返回之前。
 * 唯一的副作用面：样式注入 + locale 注册 + conversation.view 注册（架构 §6.1）。
 * label 保持纯文本（S4：tab 无装饰位，不做未读圆点）。
 * ────────────────────────────────────────────────────────────────────────── */

const INJECT = ['slots', 'locale', 'sessions']

const GC_CSS_MARK = 'group-chat/group-chat.css'

/** 注入插件样式（按 data-plugin-css 判重，卸载时回收）。 */
function gcInsertStyle() {
  if (typeof document === 'undefined' || !document || !document.head) return function () {}
  const selector = 'style[data-plugin-css=' + JSON.stringify(GC_CSS_MARK) + ']'
  try {
    if (document.querySelector(selector)) return function () {}
  } catch {}
  const el = document.createElement('style')
  el.dataset.plugin = 'dsh-group-chat'
  el.dataset.pluginCss = GC_CSS_MARK
  el.textContent = GC_CSS
  document.head.appendChild(el)
  return function () {
    if (el.parentNode) el.parentNode.removeChild(el)
  }
}

/**
 * 从 LocaleFace 快照里取 active 语言码。
 * 真实 API（asar `dsh-client-locale/lib/client.js` 实证）：
 *   getSnapshot() → {active, locales, revision}；subscribe(fn) 伴随变化。
 * 同时兼容旧形状 get()/getLocale()/bind() 返回值。
 */
function gcLocaleCodeFromValue(value) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const raw = value.active || value.locale || value.tag || value.lang || (value.current && value.current.active)
  return typeof raw === 'string' ? raw : ''
}

function gcReadHostLocale(ctx) {
  const face = ctx && ctx.locale
  if (!face) return ''
  const readers = ['getSnapshot', 'getLocale', 'get']
  for (let i = 0; i < readers.length; i += 1) {
    const reader = face[readers[i]]
    if (typeof reader !== 'function') continue
    try {
      const code = gcLocaleCodeFromValue(reader.call(face))
      if (code) return code
    } catch {}
  }
  return ''
}

/**
 * 跟随宿主 locale：
 * - 首选 LocaleFace.getSnapshot().active（宿主中文 → 插件中文）；
 * - 服务不可用才回退 navigator.language（navigator 也没有则默认 zh，见 gcDetectLocale）。
 */
function gcSyncHostLocale(ctx) {
  const code = gcReadHostLocale(ctx)
  if (code) {
    gcSetLocale(code)
    return true
  }
  return false
}

/** 订阅宿主 locale 切换（触发 gcSetLocale → 视图重渲染 + label thunk 重读）。 */
function gcSubscribeHostLocale(ctx) {
  const face = ctx && ctx.locale
  if (!face || typeof face.subscribe !== 'function') return function () {}
  try {
    const unsubscribe = face.subscribe(function () {
      gcSyncHostLocale(ctx)
    })
    return typeof unsubscribe === 'function' ? unsubscribe : function () {}
  } catch {
    return function () {}
  }
}

function gcRegisterLocale(ctx) {
  if (!ctx || !ctx.locale || typeof ctx.locale.register !== 'function') return function () {}
  return ctx.locale.register(NS, { zh: GC_LOCALE.zh, en: GC_LOCALE.en })
}

/**
 * 插件 apply：样式 → 字典 → conversation.view 注册。
 * @param {object} ctx Cordis client context（inject: slots / locale / sessions）
 */
function apply(ctx) {
  gcSetPluginContext(ctx)

  if (ctx && typeof ctx.effect === 'function') {
    ctx.effect(function () {
      return gcInsertStyle()
    }, 'group-chat: styles')
    ctx.effect(function () {
      return gcRegisterLocale(ctx)
    }, 'group-chat: dictionaries')
    ctx.effect(function () {
      return function () {
        try {
          if (typeof document !== 'undefined' && document.body) document.body.classList.remove('gc-view-group-chat')
        } catch {}
      }
    }, 'group-chat: host composer restore')
  } else {
    gcInsertStyle()
    gcRegisterLocale(ctx)
  }

  // 先注册字典再读 active；读不到才回退 navigator（默认 zh）
  gcSyncHostLocale(ctx)
  if (ctx && typeof ctx.effect === 'function') {
    ctx.effect(function () {
      return gcSubscribeHostLocale(ctx)
    }, 'group-chat: locale sync')
  } else {
    gcSubscribeHostLocale(ctx)
  }

  if (!ctx || !ctx.slots || typeof ctx.slots.inject !== 'function' || typeof ctx.slots.register !== 'function') {
    gcWarn('slots service unavailable; conversation.view not registered')
    return
  }

  ctx.slots.inject('conversation.view', function () {
    return ctx.slots.register(
      {
        name: 'conversation.view',
        id: GC_VIEW_ID,
        order: GC_VIEW_ORDER,
        locale: NS,
        // label thunk：locale 切换后宿主重新投影 tab 行时自动重读
        label: function () {
          return gcTranslate('view.tab')
        },
        // 不返回 t / sessionId 等保留名：owner props 由渲染器合并且优先级最高
        inject: function () {
          return {}
        }
      },
      GroupChatView
    )
  })

  gcDebug('registered conversation.view', GC_VIEW_ID, 'order', GC_VIEW_ORDER, 'build', GC_BUILD_ID)
}

/** 纯函数导出（tester / 单测可直接取用，无需 React 环境）。 */
const __internals = {
  // 常量
  NS: NS,
  VIEW_ID: GC_VIEW_ID,
  VIEW_ORDER: GC_VIEW_ORDER,
  LIMITS: GC_LOCAL_LIMITS,
  SESSION_RANK: GC_SESSION_RANK,
  // 视图组件
  GroupChatView: GroupChatView,
  // 子组件（组件测试用）
  GcChannelHeader: GcChannelHeader,
  GcFeed: GcFeed,
  GcComposer: GcComposer,
  GcMemberJoinMessage: GcMemberJoinMessage,
  GcTaskCardMessage: GcTaskCardMessage,
  GcMessageRow: GcMessageRow,
  GcMentionPopup: GcMentionPopup,
  GcBanners: GcBanners,
  GcSkeleton: GcSkeleton,
  GcUnreadPill: GcUnreadPill,
  GcFilterMenu: GcFilterMenu,
  GcEmptyNoTeam: GcEmptyNoTeam,
  GcEmptyTeam: GcEmptyTeam,
  GcErrorState: GcErrorState,
  GcTargetRow: GcTargetRow,
  GcRichText: GcRichText,
  renderMdBlocks: gcRenderMdBlocks,
  renderMdInline: gcRenderMdInline,
  isEmptyAgentMessage: gcIsEmptyAgentMessage,
  GcMarkdown: GcMarkdown,
  GcTrajectoryPanel: GcTrajectoryPanel,
  GcMemberStrip: (typeof GcMemberStrip === 'function' ? GcMemberStrip : undefined),
  // 纯逻辑
  createStore: gcCreateStore,
  initialState: gcInitialState,
  mergeMessages: gcMergeMessages,
  sortMessages: gcSortMessages,
  buildFeed: gcBuildFeed,
  foldDecision: gcFoldDecision,
  filterMessages: gcFilterMessages,
  matchesFilter: gcMatchesFilter,
  resolveTargets: gcResolveTargets,
  mentionCandidates: gcMentionCandidates,
  mentionQuery: gcMentionQuery,
  insertMention: gcInsertMention,
  captionModel: gcCaptionModel,
  taskActionLabel: gcTaskActionLabel,
  taskStatusLabel: gcTaskStatusLabel,
  memberContextText: gcMemberContextText,
  memberModelText: gcMemberModelText,
  isAddressable: gcIsAddressable,
  isSingleAgent: gcIsSingleAgent,
  limits: gcLimits,
  translate: gcTranslate,
  translateIn: gcTranslateIn,
  setLocale: gcSetLocale,
  getLocale: gcGetLocale,
  subscribeLocale: gcSubscribeLocale,
  mergeRosterChannel: gcMergeRosterChannel,
  isContextNoise: gcIsContextNoise,
  sendDebugModel: gcSendDebugModel,
  sendDetailText: gcSendDetailText,
  sendDebugFromDeliveries: gcSendDebugFromDeliveries,
  debugFromException: gcDebugFromException,
  // F-07 本地批次（测试可直接读）
  localBatches: gcLocalBatches,
  rememberBatch: gcRememberBatch,
  pruneLocalBatches: gcPruneLocalBatches,
  lookupLocalBatchByRpc: gcLookupLocalBatchByRpc,
  localBatchIds: gcLocalBatchIds,
  closeBatch: gcCloseBatch,
  buildLabel: GC_BUILD_LABEL,
  // v1.7 helpers
  foldDecisionV17: gcFoldDecision,
  memberStripData: gcMemberStripData,
  memberWorkStatus: gcMemberWorkStatus,
  membersStatusModel: gcMembersStatusModel,
  isSettledNotice: gcIsSettledNotice,
  isSafeLinkUrl: gcIsSafeLinkUrl,
  resolveLeadSessionId: gcResolveLeadSessionId,
  loadTrajectoryTurns: gcLoadTrajectoryTurns,
  setDebugVisible: gcSetDebugVisible,
  debugVisible: gcDebugEnabled,
  normalizeRosterStatus: gcNormalizeRosterStatus,
  timeDividerText: gcTimeDividerText,
  createChannelSource: gcCreateChannelSource,
  createController: gcCreateController,
  performSend: gcPerformSend,
  saveDraft: gcSaveDraft,
  loadDraft: gcLoadDraft,
  diagnostics: gcDiagnostics,
  // 预览 fixture（?gc-preview=1 与截图核对用）
  previewMembers: gcPreviewMembers,
  previewChannel: gcPreviewChannel,
  previewMessages: gcPreviewMessages,
  createPreviewSource: gcCreatePreviewSource,
  createChannelSourceForTest: gcCreateChannelSource,
  createFakeState: gcInitialState
}
