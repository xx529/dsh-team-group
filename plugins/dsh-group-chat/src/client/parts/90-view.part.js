/* ──────────────────────────────────────────────────────────────────────────
 * 90-view.part.js — GroupChatView 容器（唯一使用 hooks 的文件）
 *
 * 数据流（架构 §6.4.2）：
 *   props.sessionId → createChannelSource → store.commit(page)
 *                  → 选择器（filter + feed items）→ 渲染
 *                  → subscribe(append/reset/status) → 增量合并（120ms 批处理）
 * 订阅生命周期：useEffect 内 start()，卸载/切换会话时 stop()；
 * 旧频道的回调按 channelId 校验，避免串数据（PR1 F15）。
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * 把视图根嵌进宿主布局（F-01）：
 * slot 渲染器可能在 `.gc-root` 外包一层无高度规则的 div，导致 height:100% 失效、
 * 长 feed 把 composer 顶出可视区。这里把 root 的祖先链（最多 4 层，遇到宿主的
 * `viewArea` 容器即停）补成 flex 纵向填满链，卸载时恢复原 inline style。
 * CSS `:has()` 已覆盖主路径，本函数是版本兜底。
 */
function gcFitHostLayout(rootEl) {
  if (!rootEl || !rootEl.style) return function () {}
  const restore = []
  try {
    rootEl.style.height = '100%'
    rootEl.style.minHeight = '0'
    rootEl.style.overflow = 'hidden'
  } catch {}
  let node = rootEl.parentElement
  let depth = 0
  while (node && depth < 4) {
    try {
      restore.push([node, node.getAttribute('style')])
      node.style.flex = '1 1 auto'
      node.style.minHeight = '0'
      node.style.display = 'flex'
      node.style.flexDirection = 'column'
      node.style.overflow = 'hidden'
      const className = typeof node.className === 'string' ? node.className : ''
      if (className.indexOf('viewArea') >= 0) break
    } catch {
      break
    }
    node = node.parentElement
    depth += 1
  }
  return function restoreHostLayout() {
    for (let i = 0; i < restore.length; i += 1) {
      const entry = restore[i]
      try {
        const previous = entry[1]
        if (previous === null || previous === undefined) entry[0].removeAttribute('style')
        else entry[0].setAttribute('style', previous)
      } catch {}
    }
  }
}

/**
 * 会话父链查询（lead 回溯用）：优先 `sessions.list.byId`（F27/§4.8.2 口径），
 * 回退 `binding(sessionId).session.getSnapshot()`；读不到返回 undefined，不抛错。
 */
function gcLookupSessionParents(ctx) {
  let listState = null
  try {
    if (ctx && ctx.sessions && ctx.sessions.list && typeof ctx.sessions.list.getSnapshot === 'function') {
      listState = ctx.sessions.list.getSnapshot()
    }
  } catch {
    listState = null
  }
  return function lookup(sessionId) {
    try {
      const byId = (listState && (listState.byId || listState.sessions)) || null
      const entry = byId && sessionId ? byId[sessionId] : null
      if (entry) {
        return {
          id: sessionId,
          parentSessionId:
            entry.parentSessionId ||
            (entry.subagent && entry.subagent.address && entry.subagent.address.parentSessionId) ||
            '',
          parentSession: entry.parentSession
        }
      }
      if (!ctx || !ctx.sessions || typeof ctx.sessions.binding !== 'function') return undefined
      const binding = ctx.sessions.binding(sessionId)
      const snapshot =
        binding && binding.session && typeof binding.session.getSnapshot === 'function'
          ? binding.session.getSnapshot()
          : null
      if (!snapshot) return undefined
      return {
        id: sessionId,
        parentSessionId:
          snapshot.parentSessionId ||
          (snapshot.subagent && snapshot.subagent.address && snapshot.subagent.address.parentSessionId) ||
          '',
        parentSession: snapshot.parentSession
      }
    } catch {
      return undefined
    }
  }
}

/**
 * F27 作用域修正：任意 member session 打开群聊都解析 lead 频道。
 * core/roster.resolveLeadSessionId 优先（≤4 跳、防环），缺失时回退适配器 deriveLeadSessionId，再回退自身。
 */
function gcResolveLeadSessionId(ctx, sessionId) {
  const roster = gcCore('roster')
  if (roster && typeof roster.resolveLeadSessionId === 'function' && sessionId) {
    try {
      const resolved = roster.resolveLeadSessionId(sessionId, gcLookupSessionParents(ctx))
      if (typeof resolved === 'string' && resolved) return resolved
    } catch (error) {
      gcWarn('core resolveLeadSessionId failed:', gcShortError(error))
    }
  }
  try {
    const adapter = gcAdapter('client-session-source')
    if (adapter && typeof adapter.deriveLeadSessionId === 'function') {
      return adapter.deriveLeadSessionId(ctx, sessionId) || sessionId
    }
  } catch {}
  return sessionId
}

/**
 * 轮次轨迹数据（§6.15.2）：优先 core/turns 聚合该成员事件窗口；
 * 适配器未暴露事件窗口时，用 feed 内该成员的 agent_output 降级构造。
 */
function gcLoadTrajectoryTurns(source, store, sessionId) {
  const turnsMod = gcCore('turns')
  let events = null
  try {
    if (source && typeof source.getEvents === 'function') events = source.getEvents(sessionId)
    else if (source && typeof source.getMemberEvents === 'function') events = source.getMemberEvents(sessionId)
  } catch {}
  if (events && turnsMod && typeof turnsMod.aggregateTurns === 'function') {
    try {
      const turns = turnsMod.aggregateTurns(events)
      if (Array.isArray(turns)) return turns
    } catch (error) {
      gcWarn('core aggregateTurns failed, using fallback:', gcShortError(error))
    }
  }
  const state = store.getSnapshot()
  const messages = gcAsArray(state.messages).filter(function (message) {
    return message && message.sessionId === sessionId && message.kind === 'agent_output'
  })
  return messages
    .map(function (message, index) {
      return {
        index: index,
        turnId: index,
        startedAt: message.time,
        endedAt: message.time,
        status: message.isFinal ? 'done' : 'running',
        summary: gcClip(gcStr(message.text), 120),
        stepCount: 0,
        toolCount: typeof message.toolCallCount === 'number' ? message.toolCallCount : 0
      }
    })
    .reverse()
}

/** Cordis client ctx（entry.apply 注入；卡片跳转 / 发送降级用）。 */
let gcCtx = null

function gcSetPluginContext(ctx) {
  gcCtx = ctx
}

/* ── 数据源与控制器 ───────────────────────────────────────────────────── */

/** `?gc-preview=1` 的变体（`readonly` / `truncated`）。 */
function gcPreviewVariant() {
  try {
    if (typeof location === 'undefined') return ''
    const match = /[?&]gc-preview=([^&]+)/.exec(location.search || '')
    return match ? match[1] : ''
  } catch {
    return ''
  }
}

/** `?gc-long=1`：预览用长 feed（布局回归截图）。 */
function gcPreviewLongRequested() {
  try {
    if (typeof location === 'undefined') return false
    return /(?:^|[?&])gc-long=(1|true)/.test(location.search || '')
  } catch {
    return false
  }
}

/** 当前活动数据源（预览发送走 source.prompt；生产走 send-batch/binding）。 */
let gcActiveSource = null

function gcCreateChannelSource(deps) {
  // 预览模式优先（`?gc-preview=1`）：不依赖真实会话/适配器
  const preview = gcPreviewVariant()
  if (gcIsPreviewRequested() || deps.preview) {
    return gcCreatePreviewSource({
      readonly: /readonly/.test(preview),
      truncated: /truncated/.test(preview),
      members: deps.members,
      long: gcPreviewLongRequested()
    })
  }
  const adapter = gcAdapter('client-session-source')
  if (adapter && typeof adapter.createClientSessionSource === 'function') {
    try {
      return adapter.createClientSessionSource(deps)
    } catch (error) {
      gcWarn('createClientSessionSource failed:', gcShortError(error))
    }
  }
  const adaptersIndex = gcAdapter('index')
  if (adaptersIndex && typeof adaptersIndex.createChannelSource === 'function') {
    try {
      return adaptersIndex.createChannelSource('client', deps)
    } catch (error) {
      gcWarn('createChannelSource(client) failed:', gcShortError(error))
    }
  }
  return null
}

function gcCreateController(options) {
  const props = options.props
  const store = options.store
  const channelId = props.sessionId
  const limits = gcLimits()
  let source = null
  let unsubscribe = null
  let disposed = false
  let syncTimer = null
  let pendingSync = false
  let openAttempted = false

  function alive() {
    return !disposed
  }

  function withRoster(channel) {
    if (!options.getRoster) return channel
    return gcMergeRosterChannel(channel, options.getRoster(), options.leadSessionId)
  }

  let firstBatchTimer = null

  function clearFirstBatchWait() {
    if (firstBatchTimer && typeof clearTimeout === 'function') {
      clearTimeout(firstBatchTimer)
      firstBatchTimer = null
    }
    if (store.getSnapshot().awaitingFirstBatch) store.set({ awaitingFirstBatch: false })
  }

  function commitOpen(page) {
    if (!alive() || !page) return
    const state = store.getSnapshot()
    const channel = withRoster(page.channel || state.channel)
    const messages = gcMergeMessages([], page.messages, channel, limits)
    const empty = messages.length === 0
    store.set({
      channel: channel,
      messages: messages,
      cursor: page.cursor || state.cursor,
      phase: 'ready',
      error: null,
      reachedOldest: page.hasMore === false,
      // 冷启动 ready 前 open 可能超时返回空页：先保持骨架，不闪「团队还没有发言」
      awaitingFirstBatch: empty,
      ...(options.restoredDraft ? { draft: options.restoredDraft } : null)
    })
    if (empty) {
      const graceMs = Number(options.readyGraceMs) > 0 ? Number(options.readyGraceMs) : 10000
      if (firstBatchTimer && typeof clearTimeout === 'function') clearTimeout(firstBatchTimer)
      firstBatchTimer = setTimeout(function () {
        firstBatchTimer = null
        if (alive()) store.set({ awaitingFirstBatch: false })
      }, graceMs)
    } else {
      clearFirstBatchWait()
    }
    if (options.onOpen) options.onOpen(page)
  }

  function commitSync(page) {
    if (!alive() || !page) return
    const state = store.getSnapshot()
    const channel = withRoster(page.channel || state.channel)
    const incoming = gcAsArray(page.messages)
    const messages = gcMergeMessages(state.messages, incoming, channel, limits)
    if (messages.length > 0) clearFirstBatchWait()
    store.set({
      channel: channel,
      messages: messages,
      cursor: page.cursor || state.cursor,
      reachedOldest: page.hasMore === false ? true : state.reachedOldest
    })
    if (incoming.length > 0 && options.onAppend) options.onAppend(incoming, channel)
  }

  function fail(error, code) {
    if (!alive()) return
    const state = store.getSnapshot()
    store.set({
      phase: state.messages.length > 0 ? 'ready' : 'error',
      error: {
        code: code || 'open-failed',
        message: gcShortError(error),
        retryable: true
      },
      connection: 'paused'
    })
  }

  function open() {
    if (!alive()) return Promise.resolve()
    openAttempted = true
    source = gcCreateChannelSource({
      ctx: gcCtx,
      channelId: channelId,
      sessionId: props.sessionId,
      // F-02：agentTeam 投影作为 authority 名册（适配器与事件名册 union；subagent 保留）
      members: options.getMembers ? options.getMembers() : undefined,
      // F5（H1 后）：本地批次活对象交给 core lookupBatchId 反查（UI 不删除 echo）
      localBatches: gcLocalBatches,
      // 冷启动：等待 retain.ready 的超时（大 session 更稳；adapter 默认 1.5s）
      readyTimeoutMs: 3000,
      props: props,
      t: gcTranslate
    })
    if (!source) {
      store.set({
        phase: 'error',
        error: { code: 'no-source', message: 'no ChannelSource adapter', retryable: true }
      })
      gcWarn('no ChannelSource adapter available (expected src/adapters/client-session-source.js)')
      return Promise.resolve()
    }
    gcActiveSource = source
    const openPromise = typeof source.open === 'function' ? source.open(channelId, { limit: limits.firstScreen }) : null
    const subscribePromise = Promise.resolve(openPromise)
      .then(function (page) {
        if (!alive()) return
        commitOpen(page)
        if (typeof source.subscribe === 'function') {
          unsubscribe = source.subscribe(function (kind) {
            if (!alive()) return
            if (kind === 'reset') {
              open().catch(function (error) {
                fail(error, 'reset-failed')
              })
              return
            }
            scheduleSync()
          })
        }
      })
      .catch(function (error) {
        fail(error, 'open-failed')
      })
    return subscribePromise
  }

  function scheduleSync() {
    if (!alive() || pendingSync) return
    pendingSync = true
    const wait = limits.batchMs || 120
    if (typeof setTimeout === 'function') {
      syncTimer = setTimeout(function () {
        syncTimer = null
        pendingSync = false
        syncNow()
      }, wait)
      return
    }
    pendingSync = false
    syncNow()
  }

  function syncNow() {
    if (!alive() || !source || typeof source.sync !== 'function') return Promise.resolve()
    const state = store.getSnapshot()
    if (!state.cursor) return Promise.resolve()
    return Promise.resolve(source.sync(state.cursor))
      .then(function (page) {
        commitSync(page)
        store.set({ connection: 'live' })
      })
      .catch(function (error) {
        fail(error, 'sync-failed')
      })
  }

  function loadOlder() {
    if (!alive() || !source || typeof source.pageOlder !== 'function') return Promise.resolve()
    const state = store.getSnapshot()
    if (!state.cursor || state.loadingOlder || state.reachedOldest) return Promise.resolve()
    store.set({ loadingOlder: true })
    return Promise.resolve(source.pageOlder(state.cursor, limits.pageOlder))
      .then(function (page) {
        if (!alive() || !page) return
        const current = store.getSnapshot()
        const channel = withRoster(page.channel || current.channel)
        const merged = gcMergeMessages(current.messages, page.messages, channel, limits)
        store.set({
          messages: merged,
          cursor: page.cursor || current.cursor,
          loadingOlder: false,
          reachedOldest: page.hasMore === false
        })
      })
      .catch(function (error) {
        if (!alive()) return
        store.set({ loadingOlder: false })
        fail(error, 'load-older-failed')
      })
  }

  function start() {
    const state = store.getSnapshot()
    if (state.phase !== 'loading' || state.messages.length > 0) {
      store.set(gcInitialState())
    }
    return open()
  }

  function stop() {
    disposed = true
    if (syncTimer && typeof clearTimeout === 'function') {
      clearTimeout(syncTimer)
      syncTimer = null
    }
    if (firstBatchTimer && typeof clearTimeout === 'function') {
      clearTimeout(firstBatchTimer)
      firstBatchTimer = null
    }
    pendingSync = false
    if (typeof unsubscribe === 'function') {
      try {
        unsubscribe()
      } catch (error) {
        gcWarn('unsubscribe failed:', gcShortError(error))
      }
    }
    unsubscribe = null
    if (source && typeof source.close === 'function') {
      try {
        source.close()
      } catch (error) {
        gcWarn('source close failed:', gcShortError(error))
      }
    }
    source = null
    gcActiveSource = null
  }

  return {
    start: start,
    stop: stop,
    reload: function () {
      if (!openAttempted) return start()
      if (source && typeof source.close === 'function') {
        try {
          source.close()
        } catch {}
      }
      source = null
      store.set({ phase: 'loading', error: null })
      return open()
    },
    syncNow: syncNow,
    loadOlder: loadOlder,
    hasSource: function () {
      return !!source
    }
  }
}

/* ── 发送（T3 send-batch 优先，缺失时降级直发） ──────────────────────── */

function gcNewRequestId() {
  try {
    if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {}
  return gcUid('req')
}

function gcBindingFor(sessionId) {
  try {
    if (!gcCtx || !gcCtx.sessions || typeof gcCtx.sessions.binding !== 'function') return null
    return gcCtx.sessions.binding(sessionId)
  } catch {
    return null
  }
}

/** 降级直发（仅开发调试：无 canonical 前缀，T3 落盘后不再使用）。 */
function gcFallbackSend(request) {
  const targets = gcAsArray(request.targets)
  const deliveries = []
  let chain = Promise.resolve()
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i]
    chain = chain.then(function () {
      const binding = gcBindingFor(target.sessionId)
      if (!binding || !binding.session || typeof binding.session.prompt !== 'function') {
        deliveries.push({ target: target.name, sessionId: target.sessionId, ok: false, error: 'session-unavailable' })
        return null
      }
      return Promise.resolve(
        binding.session.prompt([{ type: 'text', text: request.text }], 'steer', undefined, gcNewRequestId())
      ).then(
        function () {
          deliveries.push({ target: target.name, sessionId: target.sessionId, ok: true })
        },
        function (error) {
          deliveries.push({
            target: target.name,
            sessionId: target.sessionId,
            ok: false,
            error: gcShortError(error)
          })
        }
      )
    })
  }
  return chain.then(function () {
    return { status: gcAggregateDeliveries(deliveries), deliveries: deliveries }
  })
}

function gcAggregateDeliveries(deliveries) {
  const list = gcAsArray(deliveries)
  if (list.length === 0) return 'failed'
  const ok = list.filter(function (item) {
    return item.ok
  }).length
  if (ok === list.length) return 'sent'
  return ok === 0 ? 'failed' : 'partial'
}

function gcInvokeSend(request) {
  if (gcActiveSource && typeof gcActiveSource.prompt === 'function') {
    return Promise.resolve(gcActiveSource.prompt(request)).then(function (result) {
      if (result && Array.isArray(result.deliveries)) return result
      return { status: (result && result.status) || 'sent', deliveries: (result && result.deliveries) || [] }
    })
  }
  const mod = gcSendModule('send-batch')
  if (mod && typeof mod.sendChannelBatch === 'function') {
    // 关键：不再静默降级成 fallback（会把「进入循环前抛异常」吞成空 deliveries/unknown），
    // 异常一律交给调用方记录为可诊断失败（含 stage/build）。
    try {
      return Promise.resolve(mod.sendChannelBatch(request)).then(function (result) {
        if (result && Array.isArray(result.deliveries)) return result
        return {
          status: result && result.status ? result.status : 'sent',
          deliveries: result && result.deliveries ? result.deliveries : [],
          diagnostics: result && result.diagnostics ? result.diagnostics : []
        }
      })
    } catch (error) {
      return Promise.reject(error)
    }
  }
  return gcFallbackSend(request)
}

/** 异常 → 可展示诊断（含 stage/build），供失败 caption 与 data-send-debug 使用。 */
function gcDebugFromException(error, stage) {
  const err = error && typeof error === 'object' ? error : {}
  return {
    reason: gcStr(err.reason) || gcStr(err.code) || gcStr(err.name) || 'exception',
    code: gcStr(err.code) || gcStr(err.name) || 'exception',
    status: 'failed',
    stage: gcStr(stage) || gcStr(err.stage) || 'invoke',
    message: gcClip(gcStr(err.message) || gcShortError(error), 200),
    build: GC_BUILD_LABEL
  }
}

function gcPerformSend(store, channelId, t) {
  const state = store.getSnapshot()
  if (state.send && state.send.inFlight) return Promise.resolve()
  const draft = state.draft || { text: '', mentions: [] }
  const text = gcStr(draft.text).trim()
  if (!text) return Promise.resolve()
  const channel = state.channel
  if (channel && channel.readonly) return Promise.resolve()

  const resolved = gcResolveTargets(draft, channel, channelId)
  const targets = resolved.targets
  const clientBatchId = gcUid('gcb')
  const now = Date.now()
  const optimistic = {
    id: 'local:' + clientBatchId,
    kind: 'user',
    sessionId: channelId,
    sender: { sessionId: channelId, name: 'user', kind: 'user' },
    targets: targets.map(function (target) {
      return target.name
    }),
    targetSessionIds: targets.map(function (target) {
      return target.sessionId
    }),
    text: text,
    rawText: text,
    time: now,
    seq: 0,
    isFinal: true,
    delivery: 'sending',
    clientBatchId: clientBatchId,
    meta: { draftMentions: gcAsArray(draft.mentions) }
  }

  gcRememberBatch({
    clientBatchId: clientBatchId,
    channelId: channelId,
    targets: targets,
    sessionIds: targets.map(function (target) {
      return target.sessionId
    }),
    text: text,
    at: now
  })

  const limits = gcLimits()
  store.set({
    messages: gcMergeMessages(state.messages, [optimistic], channel, limits),
    draft: { text: '', mentions: [] },
    mention: null,
    mentionIndex: 0,
    droppedMentions: resolved.dropped,
    send: { inFlight: { clientBatchId: clientBatchId, startedAt: now } }
  })
  gcSaveDraft(channelId, { text: '', mentions: [] })

  return gcInvokeSend({
    text: text,
    mentions: gcAsArray(draft.mentions),
    targets: targets,
    channelId: channelId,
    clientBatchId: clientBatchId,
    deps: {
      ctx: gcCtx,
      // R-M4：与 adapter 共享同一份活对象，send-batch 才能在终态把批次标 closed
      localBatches: gcLocalBatches,
      // H1 后：onBatch 在 requestIds 生成后/prompt 前回调；带上原始正文用于无 rpcId 弱匹配
      onBatch: function (batch) {
        gcRememberBatch(Object.assign({ text: text, channelId: channelId }, batch || {}))
      }
    }
  }).then(
    function (result) {
      const deliveries = {}
      const list = gcAsArray(result && result.deliveries)
      for (let i = 0; i < list.length; i += 1) {
        const item = list[i]
        const key = item.sessionId || item.target
        if (key) deliveries[key] = item.ok ? 'sent' : 'failed'
      }
      gcCloseBatch(clientBatchId)
      const status = result && result.status ? result.status : gcAggregateDeliveries(list)
      const sendDebug = gcSendDebugFromDeliveries(status, list, result && result.diagnostics)
      store.set(function (current) {
        return {
          send: { inFlight: null },
          messages: current.messages.map(function (message) {
            if (message.id !== 'local:' + clientBatchId) return message
            return Object.assign({}, message, {
              delivery: status,
              deliveries: deliveries,
              meta: Object.assign({}, message.meta, {
                sendDebug: sendDebug || undefined,
                sendErrorReason: sendDebug ? sendDebug.reason : undefined,
                sendErrorMessageKey: gcStr((list.filter(function (item) { return item && !item.ok })[0] || {}).messageKey) || undefined
              })
            })
          })
        }
      })
    },
    function (error) {
      gcCloseBatch(clientBatchId)
      store.set(function (current) {
        return {
          send: { inFlight: null },
          messages: current.messages.map(function (message) {
            if (message.id !== 'local:' + clientBatchId) return message
            return Object.assign({}, message, {
              delivery: 'failed',
              meta: Object.assign({}, message.meta, {
                error: gcShortError(error),
                sendDebug: gcDebugFromException(error, 'invoke'),
                sendErrorReason: gcStr(error && error.reason) || 'exception',
                sendErrorCode: gcStr(error && error.code) || gcStr(error && error.name) || 'exception',
                sendErrorStage: 'invoke'
              })
            })
          })
        }
      })
    }
  )
}

function gcSendFailureReason(deliveries) {
  const list = gcAsArray(deliveries)
  for (let i = 0; i < list.length; i += 1) {
    if (!list[i].ok && list[i].error) return gcStr(list[i].error)
  }
  return 'failed'
}

function gcRetrySend(store, channelId, t) {
  const state = store.getSnapshot()
  const target = state.messages.filter(function (message) {
    return (
      message.kind === 'user' &&
      (message.delivery === 'failed' || message.delivery === 'partial') &&
      message.clientBatchId
    )
  })[0]
  if (!target) return Promise.resolve()
  const failedSessionIds = Object.keys(target.deliveries || {}).filter(function (key) {
    return target.deliveries[key] === 'failed'
  })
  const allTargets = gcAsArray(target.targetSessionIds).map(function (sessionId, index) {
    return {
      name: gcAsArray(target.targets)[index] || sessionId,
      sessionId: sessionId
    }
  })
  const retryTargets =
    failedSessionIds.length > 0
      ? allTargets.filter(function (item) {
          return failedSessionIds.indexOf(item.sessionId) >= 0
        })
      : allTargets
  return gcInvokeSend({
    text: target.text,
    mentions: [],
    targets: retryTargets,
    channelId: channelId,
    clientBatchId: target.clientBatchId,
    deps: { ctx: gcCtx }
  }).catch(function (error) {
    return { status: 'failed', deliveries: [], diagnostics: [gcDebugFromException(error, 'retry')] }
  }).then(function (result) {
    store.set(function (current) {
      return {
        messages: current.messages.map(function (message) {
          if (message.id !== target.id) return message
          const deliveries = Object.assign({}, message.deliveries || {})
          const list = gcAsArray(result && result.deliveries)
          for (let i = 0; i < list.length; i += 1) {
            const key = list[i].sessionId || list[i].target
            if (key) deliveries[key] = list[i].ok ? 'sent' : 'failed'
          }
          const status = result && result.status ? result.status : message.delivery
          const retryDebug = gcSendDebugFromDeliveries(
            status,
            gcAsArray(result && result.deliveries),
            gcAsArray(result && result.diagnostics)
          )
          return Object.assign({}, message, {
            delivery: status,
            deliveries: deliveries,
            meta: retryDebug
              ? Object.assign({}, message.meta, { sendDebug: retryDebug, sendErrorReason: retryDebug.reason })
              : message.meta
          })
        })
      }
    })
  })
}

/* ── 卡片动作 / 跳转 / 复制 ──────────────────────────────────────────── */

function gcOpenSession(sessionId, t, store) {
  const workspace = gcCtx && typeof gcCtx.get === 'function' ? gcCtx.get('uiWorkspace') : undefined
  try {
    if (workspace && typeof workspace.openSession === 'function' && sessionId) {
      workspace.openSession(sessionId)
      return Promise.resolve(true)
    }
  } catch (error) {
    gcWarn('uiWorkspace.openSession failed:', gcShortError(error))
  }
  return gcCopyText(sessionId).then(function (ok) {
    gcShowToast(store, ok ? t('member.sessionCopied') : t('toast.copyFailed'))
    return false
  })
}

function gcShowToast(store, text) {
  store.set({ toast: { text: text, at: Date.now() } })
  if (typeof setTimeout === 'function') {
    setTimeout(function () {
      const state = store.getSnapshot()
      if (state.toast && state.toast.text === text) store.set({ toast: null })
    }, 2200)
  }
}

function gcCopyMessage(store, message, t) {
  const text = gcStr(message.rawText || message.text)
  return gcCopyText(text).then(function (ok) {
    gcShowToast(store, ok ? t('toast.copied') : t('toast.copyFailed'))
  })
}

/* ── 折叠锚点稳定（展开后顶部偏移 ≤4px，SC5） ────────────────────────── */

function gcToggleFoldWithAnchor(store, scrollEl, messageId) {
  if (!scrollEl || typeof scrollEl.querySelector !== 'function') {
    const state = store.getSnapshot()
    store.set({
      folded: Object.assign({}, state.folded, { [messageId]: !state.folded[messageId] })
    })
    return
  }
  const selector = '[data-message-id="' + messageId + '"]'
  const before = scrollEl.querySelector(selector)
  const beforeTop = before ? before.getBoundingClientRect().top : null
  const state = store.getSnapshot()
  store.set({
    folded: Object.assign({}, state.folded, { [messageId]: !state.folded[messageId] })
  })
  gcRaf(function () {
    const after = scrollEl.querySelector(selector)
    if (!after || beforeTop === null) return
    const delta = after.getBoundingClientRect().top - beforeTop
    if (Math.abs(delta) > 0.5) scrollEl.scrollTop += delta
  })
}

/* ── 视图组件 ─────────────────────────────────────────────────────────── */

function GroupChatView(props) {
  const t = gcTranslate
  const storeRef = React.useRef(null)
  if (!storeRef.current) storeRef.current = gcCreateStore()
  const store = storeRef.current
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  // locale 变化时强制重渲染（宿主 LocaleFace.subscribe → gcSetLocale → 这里）
  React.useSyncExternalStore(gcSubscribeLocale, gcGetLocale, gcGetLocale)
  const scrollRef = React.useRef(null)
  const rootRef = React.useRef(null)
  const compositionRef = React.useRef(false)
  const atBottomRef = React.useRef(true)
  const prevCountRef = React.useRef(0)
  const controllerRef = React.useRef(null)
  const sessionId = props && props.sessionId ? props.sessionId : 'unknown-session'

  // 频道根（lead）会话 id：优先用适配器的 deriveLeadSessionId（node 端同一实现）
  // M7：冷启动时 sessions.list 可能尚未就绪；订阅 byId 快照变化后就绪重算
  const sessionsById =
    props && typeof props.useSessions === 'function'
      ? props.useSessions(function (sessionsState) {
          return sessionsState && sessionsState.byId ? sessionsState.byId : null
        })
      : null
  const leadScope = React.useMemo(
    function () {
      const resolved = gcResolveLeadSessionId(gcCtx, sessionId)
      return { leadSessionId: resolved, degraded: resolved === sessionId }
    },
    [sessionId, sessionsById]
  )
  const leadSessionId = leadScope.leadSessionId

  // 权威名册：useSessions 的 agentTeam 投影（D-03；缺投影时退回事件名册）
  const agentTeam =
    props && typeof props.useSessions === 'function'
      ? props.useSessions(function (sessionsState) {
          if (!sessionsState || !sessionsState.projectionsBySession) return undefined
          const projection = sessionsState.projectionsBySession[leadSessionId]
          return projection && projection.values ? projection.values.agentTeam : undefined
        })
      : undefined
  const rosterRef = React.useRef(agentTeam)
  rosterRef.current = agentTeam

  const limits = gcLimits()
  const channel = state.channel
  const readonly = !!(channel && channel.readonly)
  const singleAgent = gcIsSingleAgent(channel)
  const visible = gcFilterMessages(state.messages, state.filter, channel)
  const items = gcBuildFeed(visible, Date.now())
  const filterCount = state.filter ? visible.length : 0
  const mentionCandidates = state.mention ? gcMentionCandidates(channel, state.mention.query) : []

  function currentScroll() {
    return scrollRef.current || null
  }

  function isAtBottom() {
    const el = currentScroll()
    if (!el) return true
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    return distance <= (limits.unreadClearThreshold || 32)
  }

  function scrollToBottom(smooth) {
    const el = currentScroll()
    if (!el) return
    try {
      el.scrollTop = el.scrollHeight
    } catch {}
    store.set({ unreadCount: 0 })
  }

  function handleJumpLatest() {
    scrollToBottom()
    store.set({ unreadCount: 0 })
  }

  function handleScroll() {
    const el = currentScroll()
    if (!el) return
    atBottomRef.current = isAtBottom()
    if (atBottomRef.current && state.unreadCount > 0) store.set({ unreadCount: 0 })
    if (el.scrollTop < 48 && controllerRef.current) controllerRef.current.loadOlder()
  }

  /* 生命周期：打开频道 + 订阅（会话切换时重建） */
  React.useEffect(
    function () {
      const restored = gcLoadDraft(sessionId)
      store.set(Object.assign({}, gcInitialState(), { draft: restored }))
      const controller = gcCreateController({
        props: props,
        store: store,
        leadSessionId: leadSessionId,
        getRoster: function () {
          return rosterRef.current
        },
        getMembers: function () {
          return gcRosterMembersFrom(rosterRef.current)
        },
        restoredDraft: restored,
        onAppend: function () {
          const el = currentScroll()
          if (!el) return
          if (isAtBottom()) {
            gcRaf(function () {
              scrollToBottom()
            })
          }
        },
        onOpen: function () {
          const el = currentScroll()
          const saved = gcLoadScroll(sessionId)
          if (el && saved !== null) {
            gcRaf(function () {
              el.scrollTop = saved
            })
          } else if (el) {
            gcRaf(function () {
              scrollToBottom()
            })
          }
        }
      })
      controllerRef.current = controller
      controller.start()
      return function () {
        const snapshot = store.getSnapshot()
        gcSaveDraft(sessionId, snapshot.draft)
        const el = currentScroll()
        if (el) gcSaveScroll(sessionId, el.scrollTop)
        controller.stop()
        controllerRef.current = null
      }
    },
    [sessionId, leadSessionId]
  )

  /* 新消息：未贴底时累计未读，贴底自动滚到底 */
  React.useEffect(
    function () {
      const count = state.messages.length
      const prev = prevCountRef.current
      prevCountRef.current = count
      if (count <= prev) return
      if (isAtBottom()) {
        gcRaf(function () {
          scrollToBottom()
        })
        return
      }
      store.set(function (current) {
        return { unreadCount: current.unreadCount + (count - prev) }
      })
    },
    [state.messages.length]
  )

  /* 单一输入器（F24/§6.13）：body 标记隐藏宿主 composer；2×rAF 自检失败降级 */
  React.useEffect(
    function () {
      const leaveBody = gcEnterGroupChatBody()
      let disposed = false
      if (typeof gcVerifyHostComposerHidden === 'function') {
        gcVerifyHostComposerHidden().then(function (result) {
          if (disposed || !result || !result.degraded) return
          store.set({ composerFallback: true })
        })
      }
      return function () {
        disposed = true
        leaveBody()
      }
    },
    [sessionId]
  )

  /* M4：宿主若保留非激活 view（不卸载），按可见性恢复/隐藏宿主 composer */
  React.useEffect(
    function () {
      const el = rootRef.current
      if (!el || typeof IntersectionObserver === 'undefined') return function () {}
      let observer = null
      try {
        observer = new IntersectionObserver(
          function (entries) {
            const visible = entries.some(function (entry) {
              return entry.isIntersecting && entry.intersectionRatio > 0
            })
            if (visible) {
              gcEnterGroupChatBody()
            } else {
              try {
                if (typeof document !== 'undefined' && document.body) {
                  document.body.classList.remove('gc-view-group-chat')
                }
              } catch {}
            }
          },
          { threshold: 0.01 }
        )
        observer.observe(el)
      } catch {
        observer = null
      }
      return function () {
        if (observer) {
          try {
            observer.disconnect()
          } catch {}
        }
      }
    },
    [sessionId]
  )

  /* 轨迹侧栏：Esc 关闭（§6.15.2，关闭后焦点回输入框） */
  React.useEffect(
    function () {
      if (!state.trajectory) return
      const onKeyDown = function (event) {
        if (event && event.key === 'Escape') {
          event.preventDefault()
          store.set({ trajectory: null, trajectoryTurns: [] })
          try {
            const el = currentScroll()
            if (el && typeof el.focus === 'function') el.focus()
          } catch {}
        }
      }
      try {
        if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('keydown', onKeyDown)
      } catch {}
      return function () {
        try {
          if (typeof document !== 'undefined' && document.removeEventListener) document.removeEventListener('keydown', onKeyDown)
        } catch {}
      }
    },
    [state.trajectory]
  )

  /* 宿主布局约束（F-01）：保证 root 占满 conversation.view 可用高度 */
  React.useEffect(
    function () {
      return gcFitHostLayout(rootRef.current)
    },
    [sessionId]
  )

  /* 调试快照（localStorage['group-chat:debug']==='1'） */
  React.useEffect(function () {
    if (!gcDebugEnabled()) return
    try {
      const target = typeof window !== 'undefined' ? window : undefined
      if (!target) return
      target.__GROUP_CHAT_DEBUG__ = { snapshot: function () { return gcDiagnostics(store.getSnapshot()) } }
    } catch {}
    return function () {
      try {
        if (typeof window !== 'undefined' && window.__GROUP_CHAT_DEBUG__) delete window.__GROUP_CHAT_DEBUG__
      } catch {}
    }
  }, [])

  const actions = {
    onTextChange: function (text, caret) {
      const nextQuery = gcMentionQuery(text, caret)
      store.set(function (current) {
        return {
          draft: { text: text, mentions: gcAsArray(current.draft.mentions) },
          mention: nextQuery,
          mentionIndex: nextQuery ? 0 : current.mentionIndex
        }
      })
      gcSaveDraft(sessionId, { text: text, mentions: gcAsArray(store.getSnapshot().draft.mentions) })
    },
    onCaretChange: function (caret) {
      const current = store.getSnapshot()
      if (!current.mention) return
      const nextQuery = gcMentionQuery(current.draft.text, caret)
      if (!nextQuery) store.set({ mention: null })
    },
    onFocusChange: function (focused) {
      store.set({ composerFocused: !!focused })
    },
    onMoveMention: function (index) {
      store.set({ mentionIndex: index })
    },
    onHoverMention: function (index) {
      store.set({ mentionIndex: index })
    },
    onCloseMention: function () {
      store.set({ mention: null, mentionIndex: 0 })
    },
    onSelectMention: function (name) {
      if (!name) return
      const current = store.getSnapshot()
      const text = gcInsertMention(current.draft.text, current.mention, name)
      const mentions = gcAsArray(current.draft.mentions)
      const nextMentions = mentions.indexOf(name) >= 0 ? mentions : mentions.concat(name)
      store.set({
        draft: { text: text, mentions: nextMentions },
        mention: null,
        mentionIndex: 0
      })
      gcSaveDraft(sessionId, { text: text, mentions: nextMentions })
    },
    onRemoveMention: function (name) {
      const current = store.getSnapshot()
      const mentions = gcAsArray(current.draft.mentions).filter(function (item) {
        return item !== name
      })
      const token = '@' + name
      let text = gcStr(current.draft.text)
      const index = text.indexOf(token)
      if (index >= 0) {
        let end = index + token.length
        if (text.charAt(end) === ' ') end += 1
        text = text.slice(0, index) + text.slice(end)
      }
      store.set({ draft: { text: text, mentions: mentions } })
      gcSaveDraft(sessionId, { text: text, mentions: mentions })
    },
    onSend: function () {
      gcPerformSend(store, sessionId, t).then(function () {
        handleJumpLatest()
      })
    },
    onFold: function (messageId) {
      gcToggleFoldWithAnchor(store, currentScroll(), messageId)
    },
    onCopyMessage: function (message) {
      gcCopyMessage(store, message, t)
    },
    onOpenSession: function (message) {
      const target = gcAsArray(message.targetSessionIds)[0] || (message.sender && message.sender.sessionId)
      if (target) gcOpenSession(target, t, store)
    },
    onOpenFile: function () {
      gcShowToast(store, t('msg.openSession'))
    },
    onOpenTrajectory: function () {
      gcShowToast(store, t('msg.toolCalls', { n: 0 }))
    },
    onCaptionAction: function (message, action) {
      if (action === 'retry') {
        gcRetrySend(store, sessionId, t)
        return
      }
      gcCopyMessage(store, message, t)
    },
    onCardAction: function (message, action) {
      const payload = message.memberCard || {}
      if (action === 'view-session') {
        const target = payload.member && payload.member.sessionId
        if (target) gcOpenSession(target, t, store)
        return
      }
      if (action === 'view-task') {
        const target = payload.member && payload.member.sessionId
        if (target) gcOpenSession(target, t, store)
        return
      }
      if (action === 'expand-task') {
        store.set(function (current) {
          return {
            expandedCards: Object.assign({}, current.expandedCards, {
              [message.id]: !current.expandedCards[message.id]
            })
          }
        })
      }
    },
    onCopyTaskId: function (taskId) {
      gcCopyText(taskId).then(function (ok) {
        gcShowToast(store, ok ? t('toast.copied') : t('toast.copyFailed'))
      })
    },
    onMention: function (name) {
      store.set({ filter: name })
    },
    onToggleFilter: function () {
      store.set({ filterOpen: !store.getSnapshot().filterOpen })
    },
    onSelectFilter: function (name) {
      store.set({ filter: name, filterOpen: false })
    },
    onClearFilter: function () {
      const el = currentScroll()
      const before = el ? el.scrollTop : 0
      store.set({ filter: null, filterOpen: false })
      gcRaf(function () {
        if (el) el.scrollTop = before
      })
    },
    onCloseFilter: function () {
      store.set({ filterOpen: false })
    },
    onRetryOpen: function () {
      if (controllerRef.current) controllerRef.current.reload()
    },
    onReconnect: function () {
      if (controllerRef.current) controllerRef.current.syncNow()
    },
    onOpenTrajectoryMember: function (member) {
      actions.onOpenTrajectory(member)
    },
    onOpenTrajectory: function (member) {
      if (!member) return
      const current = store.getSnapshot()
      if (current.trajectory && current.trajectory.sessionId === member.sessionId) {
        store.set({ trajectory: null, trajectoryTurns: [] })
        return
      }
      const source = gcActiveSource
      store.set({
        trajectory: {
          sessionId: member.sessionId,
          name: member.name,
          kind: member.kind,
          status: member.status,
          model: member.model
        },
        trajectoryTurns: gcLoadTrajectoryTurns(source, store, member.sessionId)
      })
    },
    onCloseTrajectory: function () {
      store.set({ trajectory: null, trajectoryTurns: [] })
    },
    onLoadOlderTurns: function () {
      const state2 = store.getSnapshot()
      if (!state2.trajectory) return
      if (controllerRef.current && controllerRef.current.loadOlder) controllerRef.current.loadOlder()
      store.set({ trajectoryTurns: gcLoadTrajectoryTurns(gcActiveSource, store, state2.trajectory.sessionId) })
    },
    onOpenChat: function () {
      if (props && typeof props.openView === 'function') props.openView('chat', '')
      store.set({ toast: { text: t('empty.howToTeam'), at: Date.now() } })
    }
  }

  const emptyKind = singleAgent && state.messages.length === 0 ? 'no-team' : 'normal'

  return h(
    'div',
    {
      className: 'gc-root',
      'data-plugin': 'group-chat',
      'data-testid': 'group-chat-root',
      'data-build': GC_BUILD_LABEL,
      ref: rootRef
    },
    h(
      'div',
      { className: 'gc-shell' },
    h(GcChannelHeader, {
      t: t,
      channel: channel,
      filter: state.filter,
      readonly: readonly,
      unread: state.unreadCount,
      filterOpen: state.filterOpen,
      onToggleFilter: actions.onToggleFilter,
      onJumpLatest: handleJumpLatest,
      onOpenTrajectory: actions.onOpenTrajectory
    }),
    state.filterOpen
      ? h(GcFilterMenu, {
          t: t,
          channel: channel,
          filter: state.filter,
          onSelect: actions.onSelectFilter
        })
      : null,
    h(GcBanners, {
      t: t,
      state: state,
      filterCount: filterCount,
      onClearFilter: actions.onClearFilter,
      onReconnect: actions.onReconnect
    }),
    state.composerFallback
      ? h(
          'div',
          { className: 'gc-banners' },
          h(
            'div',
            { className: 'gc-col' },
            h(
              'div',
              { className: 'gc-banner', 'data-testid': 'group-chat-composer-fallback', role: 'status' },
              t('composer.hostFallback')
            )
          )
        )
      : null,
    state.filter && visible.length === 0
      ? h('div', { className: 'gc-col' }, h(GcFilterEmpty, { t: t }))
      : null,
    h(GcFeed, {
      t: t,
      state: state,
      items: items,
      emptyKind: emptyKind,
      scrollRef: scrollRef,
      onScroll: handleScroll,
      onFold: actions.onFold,
      onMention: actions.onMention,
      onCopyMessage: actions.onCopyMessage,
      onOpenSession: actions.onOpenSession,
      onOpenFile: actions.onOpenFile,
      onOpenTrajectory: actions.onOpenTrajectory,
      onCaptionAction: actions.onCaptionAction,
      onCardAction: actions.onCardAction,
      onCopyTaskId: actions.onCopyTaskId,
      onOpenTrajectoryMember: actions.onOpenTrajectoryMember,
      onRetryOpen: actions.onRetryOpen,
      onOpenChat: actions.onOpenChat
    }),
    state.trajectory
      ? h(GcTrajectoryPanel, {
          t: t,
          member: state.trajectory,
          turns: state.trajectoryTurns,
          hasOlder: false,
          onClose: actions.onCloseTrajectory,
          onLoadOlder: actions.onLoadOlderTurns
        })
      : null,
    h(GcUnreadPill, { t: t, count: state.unreadCount, onJumpLatest: handleJumpLatest }),
    h(GcComposer, {
      t: t,
      state: state,
      channel: channel,
      sessionId: sessionId,
      readonly: readonly,
      candidates: mentionCandidates,
      compositionRef: compositionRef,
      onTextChange: actions.onTextChange,
      onCaretChange: actions.onCaretChange,
      onFocusChange: actions.onFocusChange,
      onSend: actions.onSend,
      onSelectMention: actions.onSelectMention,
      onMoveMention: actions.onMoveMention,
      onHoverMention: actions.onHoverMention,
      onCloseMention: actions.onCloseMention,
      onRemoveMention: actions.onRemoveMention,
      onCloseFilter: actions.onCloseFilter
    }),
    h(GcToast, { text: state.toast && state.toast.text })
    )
  )
}
