/* ──────────────────────────────────────────────────────────────────────────
 * 20-store.part.js — 纯函数层 + 视图 store
 *
 * 这里不碰 DOM/React，全部可单测（架构 §6.4 / §6.11 / §8.1 L1+L3）：
 *  - 排序/去重/内存上限（core.timeline 存在时以 core 为准）
 *  - 成员筛选（D-B）、折叠判定（D6）、时间分隔插入、发送目标解析（D-A/D-C）
 *  - 消息 → 气泡说明行模型（四态）
 *  - snapshot store（useSyncExternalStore 兼容）
 * ────────────────────────────────────────────────────────────────────────── */

function gcAsArray(value) {
  return Array.isArray(value) ? value : []
}

function gcStr(value) {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

/* ── 本地发送批次注册表（F-07：本地 echo 与权威消息去重） ───────────────
 * core 的 normalize 用 `ctx.localBatches[clientBatchId]` 通过 rpcId/targets/sessionIds
 * 反查批次，并给权威 user 消息打上 clientBatchId；这里维护一个**活对象**（引用共享），
 * 由 createClientSessionSource 的 deps.localBatches 传给 normalize。TTL 5 分钟、上限 50。
 * ──────────────────────────────────────────────────────────────────────── */

const GC_LOCAL_BATCH_TTL_MS = 5 * 60 * 1000
const GC_LOCAL_BATCH_MAX = 50

/** 活对象：deps.localBatches 与 normalize ctx.localBatches 共享同一引用。 */
const gcLocalBatches = Object.create(null)

function gcPruneLocalBatches(nowTs) {
  const now = typeof nowTs === 'number' ? nowTs : Date.now()
  const keys = Object.keys(gcLocalBatches)
  for (let i = 0; i < keys.length; i += 1) {
    const record = gcLocalBatches[keys[i]]
    if (!record || typeof record.at !== 'number' || now - record.at > GC_LOCAL_BATCH_TTL_MS) {
      delete gcLocalBatches[keys[i]]
    }
  }
  const remaining = Object.keys(gcLocalBatches).sort(function (a, b) {
    return (gcLocalBatches[a].at || 0) - (gcLocalBatches[b].at || 0)
  })
  let overflow = remaining.length - GC_LOCAL_BATCH_MAX
  for (let i = 0; i < overflow; i += 1) delete gcLocalBatches[remaining[i]]
}

/** 规范化 requestIds：支持 `{target:rpcId}` / `[{target,rpcId}]` / `rpcIds`。 */
function gcNormalizeRequestIds(record, targets) {
  const raw = record.requestIds || record.rpcIds || record.requestIdMap || null
  const out = Object.create(null)
  if (!raw) return out
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length; i += 1) {
      const item = raw[i]
      if (!item) continue
      if (typeof item === 'string') {
        const name = gcAsArray(targets)[i] || String(i)
        out[name] = item
      } else if (item.target && (item.rpcId || item.requestId)) {
        out[gcStr(item.target)] = gcStr(item.rpcId || item.requestId)
      }
    }
    return out
  }
  if (typeof raw === 'object') {
    Object.keys(raw).forEach(function (key) {
      const value = raw[key]
      if (typeof value === 'string') out[key] = value
      else if (value && (value.rpcId || value.requestId)) out[key] = gcStr(value.rpcId || value.requestId)
    })
  }
  return out
}

/** 注册一次本地发送（send-batch 在 prompt 前通过 deps.onBatch 回调；也由 gcPerformSend 兜底注册）。 */
function gcRememberBatch(record) {
  const input = record || {}
  const clientBatchId = gcStr(input.clientBatchId || input.batchId)
  if (!clientBatchId) return
  const targets = gcAsArray(input.targets || input.targetNames).map(function (item) {
    return typeof item === 'string' ? item : gcStr(item && item.name)
  })
  const sessionIds = gcAsArray(input.sessionIds || input.targetSessionIds).map(function (item) {
    return typeof item === 'string' ? item : gcStr(item && item.sessionId)
  })
  const at = typeof input.at === 'number' ? input.at : Date.now()
  gcLocalBatches[clientBatchId] = {
    clientBatchId: clientBatchId,
    channelId: gcStr(input.channelId),
    requestIds: gcNormalizeRequestIds(input, targets),
    targets: targets.filter(Boolean),
    sessionIds: sessionIds.filter(Boolean),
    // H1 弱匹配（无 rpcId）需要 text（或 textHash）+ targets 集合 + 时间窗
    ...(gcStr(input.text) ? { text: gcStr(input.text) } : null),
    ...(gcStr(input.textHash) ? { textHash: gcStr(input.textHash) } : null),
    ...(input.closed === true ? { closed: true } : null),
    at: at
  }
  gcPruneLocalBatches(at)
}

/** 按 rpcId 反查批次（core lookupBatchId 的 UI 兜底，两者读同一份数据）。 */
function gcLookupLocalBatchByRpc(rpcId) {
  if (!rpcId) return ''
  const keys = Object.keys(gcLocalBatches)
  for (let i = 0; i < keys.length; i += 1) {
    const record = gcLocalBatches[keys[i]]
    const ids = (record && record.requestIds) || {}
    const values = Object.keys(ids).map(function (key) {
      return ids[key]
    })
    if (values.indexOf(rpcId) >= 0) return record.clientBatchId || keys[i]
  }
  return ''
}

function gcLocalBatchIds() {
  return Object.keys(gcLocalBatches)
}

/** 批次终态（成功/失败后）：H1 只允许 rpcId 精确匹配，关闭弱匹配窗口。 */
function gcCloseBatch(clientBatchId) {
  const id = gcStr(clientBatchId)
  if (!id) return
  const record = gcLocalBatches[id]
  if (record) record.closed = true
}

/* ── 排序与合并 ───────────────────────────────────────────────────────── */

function gcMemberRankMap(channel) {
  const map = Object.create(null)
  const members = gcAsArray(channel && channel.members)
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i] || {}
    if (!member.sessionId) continue
    map[member.sessionId] = GC_SESSION_RANK[member.kind] !== undefined ? GC_SESSION_RANK[member.kind] : 3
  }
  if (channel && channel.lead && channel.lead.sessionId) map[channel.lead.sessionId] = 0
  return map
}

function gcRankOf(message, rankMap) {
  const sender = (message && message.sender) || {}
  if (rankMap && sender.sessionId && rankMap[sender.sessionId] !== undefined) return rankMap[sender.sessionId]
  if (sender.kind && GC_SESSION_RANK[sender.kind] !== undefined) return GC_SESSION_RANK[sender.kind]
  return 3
}

function gcSeqValue(message) {
  const seq = message && message.seq
  // Spike S1：seq 可能是小数，禁止整数断言/整数运算
  return typeof seq === 'number' && !Number.isNaN(seq) ? seq : 0
}

/** 排序键：time → (creationId, pairOrder) → sessionRank → sessionId → seq。 */
function gcCompareMessages(a, b, rankMap) {
  const at = typeof a.time === 'number' ? a.time : 0
  const bt = typeof b.time === 'number' ? b.time : 0
  if (at !== bt) return at - bt

  if (a.creationId && a.creationId === b.creationId) {
    const ao = typeof a.pairOrder === 'number' ? a.pairOrder : 0
    const bo = typeof b.pairOrder === 'number' ? b.pairOrder : 0
    if (ao !== bo) return ao - bo
  }

  const ar = gcRankOf(a, rankMap)
  const br = gcRankOf(b, rankMap)
  if (ar !== br) return ar - br

  const asid = gcStr(a.sender && a.sender.sessionId)
  const bsid = gcStr(b.sender && b.sender.sessionId)
  if (asid !== bsid) return asid < bsid ? -1 : 1

  const as = gcSeqValue(a)
  const bs = gcSeqValue(b)
  if (as !== bs) return as - bs

  const aid = gcStr(a.id)
  const bid = gcStr(b.id)
  return aid < bid ? -1 : aid > bid ? 1 : 0
}

/** 排序（core.timeline.sortMessages 存在时优先）。 */
function gcSortMessages(list, channel) {
  const items = gcAsArray(list).slice()
  const core = gcCore('timeline')
  if (core && typeof core.sortMessages === 'function') {
    try {
      for (let i = 0; i < items.length; i += 1) {
        if (typeof items[i].time !== 'number') items[i] = Object.assign({}, items[i], { time: 0 })
      }
      return core.sortMessages(items)
    } catch (error) {
      gcWarn('core sortMessages failed, using local order:', gcShortError(error))
    }
  }
  const rankMap = gcMemberRankMap(channel)
  return items.sort(function (a, b) {
    return gcCompareMessages(a, b, rankMap)
  })
}

/** 内存上限：超出时保留首 200 + 最近 N（§4.5，避免删掉正在读的位置）。 */
function gcTrimMessages(list, limits) {
  const max = limits && limits.maxMessagesInMemory ? limits.maxMessagesInMemory : GC_LOCAL_LIMITS.maxMessagesInMemory
  const items = gcAsArray(list)
  if (items.length <= max) return items
  const head = Math.min(200, Math.floor(max / 2))
  const tail = Math.max(0, max - head)
  return items.slice(0, head).concat(items.slice(items.length - tail))
}

/**
 * 合并权威消息与本地乐观消息。
 * - 同 id 覆盖（权威事件优先）
 * - `local:<clientBatchId>` 在权威副本到达后替换（同一气泡不闪断）
 */
function gcMergeMessages(existing, incoming, channel, limits) {
  const prev = gcAsArray(existing)
  const next = gcAsArray(incoming)
  const byId = new Map()
  const localsByBatch = new Map()

  for (let i = 0; i < prev.length; i += 1) {
    const item = prev[i]
    if (!item || !item.id) continue
    byId.set(item.id, item)
    if (typeof item.id === 'string' && item.id.indexOf('local:') === 0) {
      localsByBatch.set(item.clientBatchId || item.id.slice(6), item.id)
    }
  }

  for (let i = 0; i < next.length; i += 1) {
    let item = next[i]
    if (!item || !item.id) continue
    // H1（F30/SC47）：权威消息带 clientBatchId（或 meta.rpcId 经本地批次表反查）时，
    // 必须在这里删除 local:<batchId> —— 这是唯一能看到本地 echo 的层（core 只处理真实事件）。
    const rpcId = gcStr(item.meta && (item.meta.rpcId || item.meta.requestId || item.meta.rpcID))
    const batchId =
      gcStr(item.clientBatchId) || gcStr(item.meta && item.meta.clientBatchId) || gcLookupLocalBatchByRpc(rpcId)
    if (batchId && gcStr(item.kind) === 'user') {
      if (localsByBatch.has(batchId)) {
        byId.delete(localsByBatch.get(batchId))
        localsByBatch.delete(batchId)
      }
      if (!item.clientBatchId) item = Object.assign({}, item, { clientBatchId: batchId })
    }
    const old = byId.get(item.id)
    byId.set(item.id, old ? Object.assign({}, old, item) : item)
  }

  const merged = []
  byId.forEach(function (value) {
    merged.push(value)
  })
  return gcTrimMessages(gcSortMessages(merged, channel), limits)
}

/* ── 时间分隔与紧凑行距（§6.5 / UX §4） ──────────────────────────────── */

const GC_DIVIDER_GAP_MS = 5 * 60 * 1000

function gcShouldInsertDivider(prevTs, nextTs) {
  if (typeof prevTs !== 'number') return true
  if (gcStartOfDay(new Date(prevTs)) !== gcStartOfDay(new Date(nextTs))) return true
  return nextTs - prevTs >= GC_DIVIDER_GAP_MS
}

function gcIsTightRow(prev, next) {
  if (!prev || !next) return false
  if (prev.kind !== next.kind) return false
  if (prev.kind === 'system' || prev.kind === 'member_card' || prev.kind === 'task_card') return false
  const a = prev.sender || {}
  const b = next.sender || {}
  if (!a.sessionId || a.sessionId !== b.sessionId) return false
  return Math.abs((next.time || 0) - (prev.time || 0)) <= 60000
}

/**
 * 消息 → 消息流条目（含居中时间分隔）。
 * `items: [{type:'divider', id, text} | {type:'message', id, message, tight}]`
 */
function gcBuildFeed(messages, nowTs) {
  const list = gcAsArray(messages)
  const items = []
  let prev = null
  for (let i = 0; i < list.length; i += 1) {
    const message = list[i]
    if (!message || !message.id) continue
    if (!prev || gcShouldInsertDivider(prev.time, message.time)) {
      items.push({
        type: 'divider',
        id: 'divider:' + message.id,
        text: gcTimeDividerText(message.time, nowTs)
      })
      prev = null
    }
    items.push({
      type: 'message',
      id: message.id,
      message: message,
      tight: gcIsTightRow(prev, message)
    })
    prev = message
  }
  return items
}

/* ── 成员状态条（F26/§6.15.1：working/waiting、最多 5+N） ─────────────── */

const GC_MEMBER_STRIP_MAX = Infinity // Lead 裁决：成员条全部显示（禁止 +N）

/** running→working（绿），其余→waiting（灰）；未知按 waiting。 */
function gcMemberWorkStatus(member) {
  if (!member) return 'waiting'
  return member.status === 'running' || member.status === 'provisioning' ? 'working' : 'waiting'
}

/** 成员条展示数据：lead → working teammate → waiting teammate → subagent，最多 5 个。 */
function gcMemberStripData(channel) {
  const members = gcAllMembers(channel)
  const rank = function (member) {
    if (member.kind === 'lead') return 0
    if (member.kind === 'teammate') return gcMemberWorkStatus(member) === 'working' ? 1 : 2
    return 3
  }
  const sorted = members.slice().sort(function (a, b) {
    return rank(a) - rank(b)
  })
  const visible = sorted.slice(0, sorted.length)
  return {
    visible: visible,
    overflow: 0
  }
}

/** 频道头状态：{n} 名成员 · {m} 工作中 · {k} 等待 */
function gcMembersStatusModel(channel) {
  const members = gcAllMembers(channel)
  let working = 0
  for (let i = 0; i < members.length; i += 1) {
    if (gcMemberWorkStatus(members[i]) === 'working') working += 1
  }
  return { total: members.length, working: working, waiting: Math.max(0, members.length - working) }
}

/* ── 成员索引与筛选（D-B） ────────────────────────────────────────────── */

function gcAllMembers(channel) {
  const members = gcAsArray(channel && channel.members).slice()
  const lead = channel && channel.lead
  if (lead && !members.some(function (member) { return member && member.sessionId === lead.sessionId })) {
    members.unshift(lead)
  }
  return members
}

function gcMemberIndex(channel) {
  const byName = new Map()
  const bySessionId = new Map()
  const members = gcAsArray(channel && channel.members)
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i] || {}
    if (member.name) byName.set(member.name, member)
    if (member.sessionId) bySessionId.set(member.sessionId, member)
  }
  if (channel && channel.lead) {
    if (channel.lead.name) byName.set(channel.lead.name, channel.lead)
    if (channel.lead.sessionId) bySessionId.set(channel.lead.sessionId, channel.lead)
  }
  return { byName: byName, bySessionId: bySessionId, members: members }
}

function gcParentNameOf(channel, message) {
  const sender = (message && message.sender) || {}
  if (sender.kind !== 'subagent') return ''
  const index = gcMemberIndex(channel)
  const member = index.bySessionId.get(sender.sessionId)
  if (member && member.parentName) return member.parentName
  if (member && member.parentSessionId) {
    const parent = index.bySessionId.get(member.parentSessionId)
    if (parent && parent.name) return parent.name
  }
  return ''
}

/** 本地兜底：与 core.filter.matchesFilter 语义一致（sender / targets / 子体归父）。 */
function gcMatchesFilter(message, selectedName, channel) {
  if (!selectedName) return true
  const core = gcCore('filter')
  if (core && typeof core.matchesFilter === 'function') {
    try {
      return !!core.matchesFilter(message, selectedName, gcAllMembers(channel))
    } catch (error) {
      gcWarn('core matchesFilter failed, using local filter:', gcShortError(error))
    }
  }
  const sender = (message && message.sender) || {}
  const targets = gcAsArray(message && message.targets)
  if (sender.name === selectedName) return true
  if (targets.indexOf(selectedName) >= 0) return true
  // 父成员筛选包含其 subagent 的消息；选 subagent 不反向包含父
  if (sender.kind === 'subagent') {
    const parentName = gcParentNameOf(channel, message)
    if (parentName && parentName === selectedName) return true
  }
  return false
}

function gcFilterMessages(messages, selectedName, channel) {
  const list = gcAsArray(messages)
  if (!selectedName) return list
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    if (gcMatchesFilter(list[i], selectedName, channel)) out.push(list[i])
  }
  return out
}

function gcFilterCount(messages, selectedName, channel) {
  return gcFilterMessages(messages, selectedName, channel).length
}

/* ── 系统上下文噪音兜底（D-01 双保险） ────────────────────────────────── */

const GC_CONTEXT_NOISE_PREFIX = [
  '<system-reminder',
  '<skill_content',
  '<skill-catalog',
  '<runtime-context',
  'current runtime context',
  'time sampled at',
  '<agent-instructions'
]

/**
 * 宿主注入的系统上下文（instructions / runtime-context / skill catalog / time context）
 * 不应进入群聊 feed。T1 已在归一化丢弃；这里只对 **system 类消息** 再做一层兜底，
 * 不误伤正常发言（只在文本以已知注入标记开头时命中）。
 */
function gcIsContextNoise(message) {
  if (!message || message.kind !== 'system') return false
  const text = gcStr(message.text).trim().toLowerCase()
  if (!text) return false
  for (let i = 0; i < GC_CONTEXT_NOISE_PREFIX.length; i += 1) {
    if (text.indexOf(GC_CONTEXT_NOISE_PREFIX[i]) === 0) return true
  }
  return false
}

/** subagent-settled 副本（父会话通知）不渲染（F5/§4.3③）。 */
function gcIsSettledNotice(message) {
  if (!message) return false
  const meta = message.meta || {}
  return (
    message.systemReason === 'subagent-settled' ||
    meta.event === 'subagent-settled' ||
    meta.sourceKind === 'subagent-settled'
  )
}

/* ── 折叠判定（v1.7：50 行） ─────────────────────────────────────────── */

/**
 * v1.7（F29/§6.17）：默认展示前 50 行（50×22=1100px），超过才折叠。
 * 优先用 core/fold 的 foldInfo（渲染行数近似；代码块按 value 行数折算），
 * 缺失时本地按换行数近似（口径注明）。
 */
function gcFoldDecision(text, limits) {
  const value = gcStr(text)
  const fold = gcCore('fold')
  if (fold && typeof fold.foldInfo === 'function') {
    try {
      const info = fold.foldInfo(value)
      const lineCount = typeof info.lineCount === 'number' ? info.lineCount : 0
      return {
        foldable: !!info.folded,
        chars: countCodePoints(value),
        lines: lineCount,
        hidden: typeof info.hiddenLines === 'number' ? info.hiddenLines : Math.max(0, lineCount - 50),
        maxLines: typeof info.maxLines === 'number' ? info.maxLines : 50
      }
    } catch (error) {
      gcWarn('core foldInfo failed, using local:', gcShortError(error))
    }
  }
  const maxLines = 50
  const lines = value === '' ? 0 : value.split('\n').length
  return {
    foldable: lines > maxLines,
    chars: countCodePoints(value),
    lines: lines,
    hidden: Math.max(0, lines - maxLines),
    maxLines: maxLines
  }
}

function countCodePoints(value) {
  if (typeof value !== 'string') return 0
  let count = 0
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) i += 1
    count += 1
  }
  return count
}

/* ── 发送目标解析（D-A / D-C） ────────────────────────────────────────── */

function gcIsAddressable(member) {
  if (!member) return false
  const roster = gcCore('roster')
  if (roster && typeof roster.isAddressable === 'function') {
    try {
      return !!roster.isAddressable(member)
    } catch {}
  }
  if (member.kind === 'lead' || member.kind === 'teammate') return true
  if (member.kind === 'subagent') {
    if (member.addressable === false) return false
    const status = member.status || 'unknown'
    if (status === 'running' || status === 'provisioning') return true
    // 没有 status 时按可寻址处理（保守：宁可列出也不隐藏）
    if (status === 'unknown') return true
    return false
  }
  return false
}

function gcMentionCandidates(channel, query) {
  const allMembers = gcAllMembers(channel)
  const core = gcCore('mentions')
  if (core && typeof core.filterMentionCandidates === 'function' && allMembers.length > 0) {
    try {
      return core.filterMentionCandidates(allMembers, query)
    } catch (error) {
      gcWarn('core filterMentionCandidates failed, using local:', gcShortError(error))
    }
  }
  const index = gcMemberIndex(channel)
  const q = gcStr(query).toLowerCase()
  const lead = channel && channel.lead ? channel.lead : null
  const teammates = []
  const subagents = []
  for (let i = 0; i < index.members.length; i += 1) {
    const member = index.members[i]
    if (!member || !member.name || member.kind === 'lead') continue
    if (!gcIsAddressable(member)) continue
    if (member.kind === 'subagent') subagents.push(member)
    else teammates.push(member)
  }
  const byStatus = function (a, b) {
    const rank = { running: 0, provisioning: 0, inactive: 1, failed: 2, unknown: 3 }
    return (rank[a.status] === undefined ? 4 : rank[a.status]) - (rank[b.status] === undefined ? 4 : rank[b.status])
  }
  teammates.sort(byStatus)
  subagents.sort(byStatus)
  const all = (lead ? [lead] : []).concat(teammates, subagents)
  if (!q) return all
  return all.filter(function (member) {
    return (
      gcStr(member.name).toLowerCase().indexOf(q) >= 0 ||
      gcStr(member.displayName).toLowerCase().indexOf(q) >= 0
    )
  })
}

/**
 * 解析一次发送的目标：`{lead} ∪ 已选 chip`，去重保序。
 * 返回 {targets, dropped}；targets 元素 = {name, sessionId, kind, label}
 *
 * F-06：单 agent 会话（channel 为 null / 无 lead / 名册为空）时必须仍有一个 Lead 目标，
 * 否则发送编排会拿到 0 个目标并返回 failed/unknown。`sessionId` 是当前会话 id，
 * 作为 lead 目标 sessionId 的兜底（优先 channel.channelId / channel.lead.sessionId）。
 */
function gcLeadFallbackTarget(channel, sessionId) {
  const channelId = gcStr(channel && (channel.channelId || (channel.lead && channel.lead.sessionId)))
  const resolved = channelId || gcStr(sessionId)
  if (!resolved) return null
  return { name: 'lead', sessionId: resolved, kind: 'lead', label: 'Lead' }
}

function gcResolveTargets(draft, channel, sessionId) {
  const allMembers = gcAllMembers(channel)
  const core = gcCore('mentions')
  if (core && typeof core.resolveTargets === 'function' && allMembers.length > 0) {
    try {
      const resolved = core.resolveTargets(draft || { mentions: [] }, allMembers)
      const members = gcAsArray(resolved && resolved.targetMembers)
      const targets = members.map(function (member) {
        const isLead = member.kind === 'lead'
        return {
          name: isLead ? 'lead' : member.name,
          sessionId: member.sessionId || '',
          kind: member.kind || 'unknown',
          label: isLead ? 'Lead' : member.name
        }
      })
      if (targets.length === 0) {
        const fallback = gcLeadFallbackTarget(channel, sessionId)
        if (fallback) targets.push(fallback)
      }
      return {
        targets: targets,
        dropped: gcAsArray(resolved && resolved.dropped),
        hasFanout: targets.length > 1,
        notes: gcAsArray(resolved && resolved.notes)
      }
    } catch (error) {
      gcWarn('core resolveTargets failed, using local:', gcShortError(error))
    }
  }
  const index = gcMemberIndex(channel)
  const out = []
  const seen = Object.create(null)
  const dropped = []

  function push(member) {
    if (!member || !member.name || seen[member.name]) return
    seen[member.name] = true
    out.push({
      name: member.name,
      sessionId: member.sessionId || '',
      kind: member.kind || 'unknown',
      label: member.kind === 'lead' ? 'Lead' : member.name
    })
  }

  const leadMember = (channel && channel.lead) || index.byName.get('lead')
  if (leadMember) {
    push(leadMember)
  } else {
    const fallback = gcLeadFallbackTarget(channel, sessionId)
    if (fallback) {
      seen[fallback.name] = true
      out.push(fallback)
    }
  }
  const mentions = gcAsArray(draft && draft.mentions)
  for (let i = 0; i < mentions.length; i += 1) {
    const name = gcStr(mentions[i])
    if (!name) continue
    const member = index.byName.get(name)
    if (!member) {
      dropped.push({ name: name, reason: 'missing' })
      continue
    }
    if (!gcIsAddressable(member)) {
      dropped.push({ name: name, reason: 'not-addressable' })
      continue
    }
    push(member)
  }
  if (out.length === 0) {
    dropped.push({ name: 'lead', reason: 'channel-missing' })
  }
  return { targets: out, dropped: dropped, hasFanout: out.length > 1, notes: [] }
}

/** @ 补全触发：返回 {start, query}（无触发返回 null）。 */
function gcMentionQuery(text, caret) {
  const core = gcCore('mentions')
  if (core && typeof core.computeMentionQuery === 'function') {
    try {
      const result = core.computeMentionQuery(text, caret)
      // core 返回 {active,start,end,query}；未触发时 active=false/start=-1
      if (!result || result.active === false || (typeof result.start === 'number' && result.start < 0)) return null
      return { start: result.start, end: result.end, query: gcStr(result.query) }
    } catch (error) {
      gcWarn('core computeMentionQuery failed:', gcShortError(error))
    }
  }
  const value = gcStr(text)
  const at = typeof caret === 'number' ? caret : value.length
  let i = at - 1
  while (i >= 0) {
    const ch = value.charAt(i)
    if (ch === '@') {
      const before = i === 0 ? ' ' : value.charAt(i - 1)
      if (/\s/.test(before) || i === 0) {
        const query = value.slice(i + 1, at)
        if (/\s/.test(query) || query.indexOf('\n') >= 0) return null
        return { start: i, query: query }
      }
      return null
    }
    if (/\s/.test(ch)) return null
    i -= 1
  }
  return null
}

/** 把补全选中的成员写成 chip 文本（插回输入框）。 */
function gcInsertMention(text, mentionQuery, name) {
  const value = gcStr(text)
  if (!mentionQuery) return value + '@' + name + ' '
  const before = value.slice(0, mentionQuery.start)
  const after = value.slice(mentionQuery.start + 1 + gcStr(mentionQuery.query).length)
  return before + '@' + name + ' ' + after
}

/* ── 四态说明行模型（§5.3 / UX §7） ───────────────────────────────────── */

function gcTargetListText(message) {
  const targets = gcAsArray(message && message.targets)
  if (targets.length === 0) return 'Lead'
  return targets
    .map(function (name) {
      return name === 'lead' ? 'Lead' : '@' + name
    })
    .join(gcListSeparator())
}

/**
 * 用户消息气泡下的说明行（无绿勾/无底色）。
 * 返回 {tone, text, actions:[{id:'retry'|'copy', label}]}
 */
function gcCaptionModel(message, t) {
  if (!message || message.kind !== 'user') return null
  const status = message.delivery || (message.deliveries ? gcAggregateDelivery(message.deliveries) : 'sent')
  const targets = gcAsArray(message.targets)
  const list = gcTargetListText(message)

  if (status === 'sending') {
    return { tone: 'muted', text: t('msg.sending'), actions: [] }
  }
  if (status === 'failed') {
    const reason = gcSendReasonText(message, t)
    // 诊断信息默认隐藏（仅 debug 开关打开时追加 code/message/stage/build）
    const detail = gcDebugEnabled() ? gcSendDetailText(message) : ''
    return {
      tone: 'error',
      text: detail ? t('msg.failedDetail', { reason: reason, detail: detail }) : t('msg.failed', { reason: reason }),
      actions: [
        { id: 'retry', label: t('msg.retry') },
        { id: 'copy', label: t('msg.copy') }
      ]
    }
  }
  if (status === 'partial') {
    const deliveries = message.deliveries || {}
    const entries = Object.keys(deliveries)
    let ok = 0
    const failed = []
    for (let i = 0; i < entries.length; i += 1) {
      const targetId = entries[i]
      const state = deliveries[targetId]
      if (state === 'sent') ok += 1
      else failed.push(gcTargetNameFor(message, targetId))
    }
    const total = entries.length || Math.max(targets.length, 1)
    const text =
      failed.length > 3
        ? t('msg.partialWithNamesMore', {
            ok: ok,
            total: total,
            names: failed
              .slice(0, 3)
              .map(function (n) {
                return '@' + n
              })
              .join(gcListSeparator()),
            n: failed.length - 3
          })
        : failed.length > 0
          ? t('msg.partialWithNames', {
              ok: ok,
              total: total,
              names: failed
                .map(function (n) {
                  return '@' + n
                })
                .join(gcListSeparator())
            })
          : t('msg.partialDelivered', { ok: ok, total: total })
    const detail = gcDebugEnabled() ? gcSendDetailText(message) : ''
    return {
      tone: 'normal',
      text: detail ? text + t('send.error.debugSuffix', { detail: detail }) : text,
      actions: [{ id: 'retry', label: t('msg.retry') }]
    }
  }
  return {
    tone: 'normal',
    text: targets.length > 1 ? t('msg.deliveredTo', { list: list }) : t('msg.sendToLead'),
    actions: [{ id: 'copy', label: t('msg.copy') }]
  }
}

function gcAggregateDelivery(deliveries) {
  const states = Object.keys(deliveries || {}).map(function (key) {
    return deliveries[key]
  })
  if (states.length === 0) return 'sent'
  if (states.indexOf('sending') >= 0) return 'sending'
  if (states.indexOf('failed') >= 0) return states.indexOf('sent') >= 0 ? 'partial' : 'failed'
  return 'sent'
}

/** 发送失败原因码 → i18n key（send-batch 的 reason/messageKey 为稳定内部码）。 */
const GC_SEND_REASON_KEY = {
  'parent-unavailable': 'send.error.parentUnavailable',
  'parent-offline': 'send.error.parentUnavailable',
  readonly: 'send.error.forbidden',
  forbidden: 'send.error.forbidden',
  unaddressable: 'send.error.forbidden',
  network: 'send.error.network',
  timeout: 'send.error.network',
  aborted: 'send.error.network',
  'rate-limited': 'send.error.busy',
  busy: 'send.error.busy',
  'retry-exhausted': 'send.error.retryExhausted',
  'targets-overflow': 'send.error.targetsOverflow',
  'payload-too-large': 'send.error.generic',
  'session-missing': 'send.error.generic',
  'channel-missing': 'send.error.channelMissing',
  failed: 'send.error.generic',
  exception: 'send.error.generic',
  'empty-text': 'send.error.generic',
  unknown: 'send.error.generic'
}

/** 诊断用：失败详情（本次临时展示，F-06 根因修复后降级为 tooltip/移除）。 */
function gcSendDebugModel(message) {
  const meta = (message && message.meta) || {}
  const debug = meta.sendDebug
  if (debug && typeof debug === 'object') {
    const model = {
      reason: gcStr(debug.reason),
      code: gcStr(debug.code),
      status: gcStr(debug.status),
      stage: gcStr(debug.stage),
      message: gcClip(gcStr(debug.message), 200),
      build: gcStr(debug.build) || GC_BUILD_LABEL
    }
    if (Array.isArray(debug.failedTargets) && debug.failedTargets.length > 0) {
      model.failedTargets = debug.failedTargets.slice(0, 5).map(function (item) {
        return {
          target: gcStr(item && item.target),
          code: gcStr(item && item.code),
          message: gcClip(gcStr(item && item.message), 120)
        }
      })
    }
    return model
  }
  // 只有显式诊断字段才追加 detail（裸 meta.error 保持旧文案，不重复展示）
  if (meta.sendDetail || meta.sendErrorCode || meta.sendErrorStatus) {
    return {
      reason: gcStr(meta.sendErrorReason || meta.error),
      code: gcStr(meta.sendErrorCode),
      status: gcStr(meta.sendErrorStatus),
      stage: gcStr(meta.sendErrorStage),
      message: gcClip(gcStr(meta.sendDetail || meta.error), 200),
      build: GC_BUILD_LABEL
    }
  }
  return null
}

/**
 * caption 里追加的 detail 文本：`code=… · message=… · stage=… · build=…`。
 * code/message/stage 截断 ≤200 字，build 是短指纹、始终保留（用于确认实际加载版本）。
 */
function gcSendDetailText(message) {
  const debug = gcSendDebugModel(message)
  if (!debug) return ''
  const parts = []
  if (debug.code) parts.push('code=' + debug.code)
  if (debug.message) parts.push('message=' + debug.message)
  if (debug.stage) parts.push('stage=' + debug.stage)
  let text = parts.join(' · ')
  if (text !== '') text = gcClip(text, 200)
  const build = gcStr(debug.build) || GC_BUILD_LABEL
  if (build) text = text === '' ? 'build=' + build : text + ' · build=' + build
  return text
}

/**
 * 由 sendChannelBatch 的 deliveries + diagnostics 汇总诊断对象（失败目标优先）。
 * send/errors.js 的字段：delivery{detail,errorName,errorMessage,errorCode,errorStatus}；
 * result.diagnostics[]{target,reason,errorName,code,status,message,detail}。
 */
function gcSendDebugFromDeliveries(status, deliveries, diagnostics) {
  const list = gcAsArray(deliveries)
  const failed = list.filter(function (item) {
    return item && !item.ok
  })
  const diags = gcAsArray(diagnostics)
  // 诊断优先：即使 deliveries 为空，只要 diagnostics 有内容也必须展示
  if (failed.length === 0 && diags.length === 0) return null
  const first = failed[0] || {}
  const diag = diags[0] || {}
  const stage = gcStr(diag.stage) || gcStr(first.stage) || gcStr(first.errorStage) || gcStr(diag.errorStage)
  const code =
    gcStr(diag.code) || gcStr(first.errorCode) || gcStr(first.code) || gcStr(first.reason) || gcStr(first.error) || 'unknown'
  const message = gcClip(
    gcStr(diag.message) ||
      gcStr(first.errorMessage) ||
      gcStr(first.detail) ||
      gcStr(first.message) ||
      gcStr(first.error),
    200
  )
  const detail = gcClip(gcStr(first.detail) || gcStr(diag.detail), 200)
  return {
    reason: gcStr(diag.reason) || gcStr(first.reason) || gcStr(first.error) || gcStr(status),
    code: code,
    status: gcStr(status) || 'failed',
    stage: stage || (gcStr(status) === 'failed' ? 'unknown' : ''),
    message: message,
    detail: detail || undefined,
    build: GC_BUILD_LABEL,
    failedTargets: failed.map(function (item) {
      return {
        target: gcStr(item.target),
        code: gcStr(item.errorCode || item.code || item.reason || item.error),
        message: gcClip(gcStr(item.errorMessage || item.detail || item.message || item.error), 120)
      }
    })
  }
}

function gcSendReasonText(message, t) {
  const meta = (message && message.meta) || {}
  if (meta.sendErrorMessageKey) {
    const text = t(meta.sendErrorMessageKey)
    if (text !== meta.sendErrorMessageKey) return text
  }
  const reason = gcStr(meta.error) || gcStr(meta.sendErrorReason)
  if (!reason) return t('send.error.generic')
  const key = GC_SEND_REASON_KEY[reason]
  if (key) {
    const text = t(key)
    if (text !== key) return text
  }
  return reason
}

function gcTargetNameFor(message, targetSessionId) {
  const ids = gcAsArray(message && message.targetSessionIds)
  const names = gcAsArray(message && message.targets)
  const index = ids.indexOf(targetSessionId)
  if (index >= 0 && names[index]) return names[index]
  return targetSessionId
}

/* ── store（useSyncExternalStore 兼容） ───────────────────────────────── */

function gcInitialState(overrides) {
  return Object.assign(
    {
      channel: null,
      messages: [],
      cursor: null,
      phase: 'loading',
      error: null,
      loadingOlder: false,
      reachedOldest: false,
      unreadCount: 0,
      filter: null,
      draft: { text: '', mentions: [] },
      send: { inFlight: null },
      folded: {},
      expandedCards: {},
      toast: null,
      filterOpen: false,
      composerFocused: false,
      mention: null,
      mentionIndex: 0,
      droppedMentions: [],
      // v1.7
      trajectory: null,
      trajectoryTurns: [],
      composerFallback: false
    },
    overrides || null
  )
}

function gcCreateStore(overrides) {
  let state = gcInitialState(overrides)
  let listeners = []

  function notify() {
    const snapshot = listeners.slice()
    for (let i = 0; i < snapshot.length; i += 1) {
      try {
        snapshot[i]()
      } catch (error) {
        gcWarn('store listener failed:', gcShortError(error))
      }
    }
  }

  return {
    getSnapshot: function () {
      return state
    },
    subscribe: function (listener) {
      listeners.push(listener)
      return function () {
        listeners = listeners.filter(function (item) {
          return item !== listener
        })
      }
    },
    set: function (patch) {
      const next = typeof patch === 'function' ? patch(state) : patch
      if (!next) return
      state = Object.assign({}, state, next)
      notify()
    },
    dispose: function () {
      listeners = []
    }
  }
}

/* ── 权威名册覆盖（D-03：成员数/running 以 agentTeam 投影为准） ───────── */

function gcNormalizeRosterStatus(raw) {
  switch (raw) {
    case 'running':
      return 'running'
    case 'provisioning':
      return 'provisioning'
    case 'failed':
      return 'failed'
    case 'inactive':
    case 'idle':
    case 'done':
    case 'completed':
      return 'inactive'
    default:
      return ''
  }
}

/** `values.agentTeam` 可能是 `{members:[...]}` 或数组。 */
function gcRosterMembersFrom(agentTeam) {
  if (!agentTeam) return []
  if (Array.isArray(agentTeam)) return agentTeam
  if (Array.isArray(agentTeam.members)) return agentTeam.members
  return []
}

/**
 * 用 `agentTeam` 投影修正频道成员状态与 running 数（事件名册会把 active 的 teammate 高估为 running）。
 * 只改 status/model/description，不删成员（subagent 仍由适配器从事件/目录补充）。
 * @param {object|null} channel
 * @param {any} agentTeam `projectionsBySession[lead].values.agentTeam`
 * @param {string} leadSessionId
 */
function gcMergeRosterChannel(channel, agentTeam, leadSessionId) {
  if (!channel) return channel
  const rawMembers = gcRosterMembersFrom(agentTeam)
  if (rawMembers.length === 0) return channel

  const rawById = new Map()
  for (let i = 0; i < rawMembers.length; i += 1) {
    const raw = rawMembers[i]
    if (!raw) continue
    const id = gcStr(raw.id || raw.sessionId || raw.target)
    if (id) rawById.set(id, raw)
  }
  if (rawById.size === 0) return channel

  const current = gcAsArray(channel.members)
  let changed = false
  const members = []
  const seen = new Set()
  for (let i = 0; i < current.length; i += 1) {
    const member = current[i]
    if (!member || !member.sessionId) continue
    seen.add(member.sessionId)
    const raw = rawById.get(member.sessionId)
    if (!raw) {
      members.push(member)
      continue
    }
    const rawStatus = gcNormalizeRosterStatus(raw.status)
    const next = Object.assign({}, member)
    if (rawStatus && rawStatus !== member.status) {
      next.status = rawStatus
      changed = true
    }
    if (!member.model && gcStr(raw.model)) next.model = gcStr(raw.model)
    if (!member.description && gcStr(raw.description)) next.description = gcStr(raw.description)
    if (member.kind === 'teammate' && gcStr(raw.name) && gcStr(raw.name) !== member.name) {
      next.name = gcStr(raw.name)
      next.displayName = gcStr(raw.name)
      changed = true
    }
    members.push(next)
  }

  // 投影里存在、事件名册里缺的 teammate 补进来（lead 不重复）
  rawById.forEach(function (raw, id) {
    if (seen.has(id) || id === leadSessionId) return
    if (raw.role === 'lead' || raw.name === 'lead') return
    const status = gcNormalizeRosterStatus(raw.status) || 'unknown'
    members.push({
      sessionId: id,
      name: gcStr(raw.name) || id.slice(0, 8),
      displayName: gcStr(raw.name) || id.slice(0, 8),
      kind: 'teammate',
      parentSessionId: leadSessionId,
      depth: 1,
      status: status,
      description: gcStr(raw.description) || undefined,
      model: gcStr(raw.model) || undefined,
      addressable: true,
      badge: 'teammate'
    })
    changed = true
  })

  const rank = function (member) {
    return member.kind === 'lead' ? 0 : member.kind === 'teammate' ? 1 : 2
  }
  members.sort(function (a, b) {
    return rank(a) - rank(b)
  })
  const runningCount = members.filter(function (member) {
    return member.status === 'running'
  }).length

  if (!changed && runningCount === channel.runningCount) return channel
  return Object.assign({}, channel, { members: members, runningCount: runningCount })
}

/* ── 频道级内存（草稿 / 滚动位置，切换会话恢复） ─────────────────────── */

const gcDraftMemory = new Map()
const gcScrollMemory = new Map()

function gcSaveDraft(channelId, draft) {
  if (!channelId) return
  if (!draft || (!gcStr(draft.text) && gcAsArray(draft.mentions).length === 0)) {
    gcDraftMemory.delete(channelId)
    return
  }
  gcDraftMemory.set(channelId, {
    text: gcStr(draft.text),
    mentions: gcAsArray(draft.mentions).slice(),
    updatedAt: Date.now()
  })
}

function gcLoadDraft(channelId, ttlMs) {
  const saved = channelId ? gcDraftMemory.get(channelId) : null
  if (!saved) return { text: '', mentions: [] }
  const ttl = ttlMs || GC_LOCAL_LIMITS.draftTtlMs
  if (Date.now() - saved.updatedAt > ttl) {
    gcDraftMemory.delete(channelId)
    return { text: '', mentions: [] }
  }
  return { text: saved.text, mentions: saved.mentions.slice() }
}

function gcSaveScroll(channelId, top) {
  if (channelId && typeof top === 'number') gcScrollMemory.set(channelId, top)
}

function gcLoadScroll(channelId) {
  const value = channelId ? gcScrollMemory.get(channelId) : undefined
  return typeof value === 'number' ? value : null
}

/* ── 调试快照（§7 诊断，不输出正文全文） ─────────────────────────────── */

function gcDiagnostics(state) {
  const channel = state && state.channel ? state.channel : null
  const messages = gcAsArray(state && state.messages)
  return {
    channelId: channel ? channel.channelId : null,
    members: channel ? gcAsArray(channel.members).length : 0,
    messages: messages.length,
    phase: state ? state.phase : 'idle',
    filter: state ? state.filter : null,
    unread: state ? state.unreadCount : 0,
    lastIds: messages.slice(-5).map(function (m) {
      return { id: m.id, kind: m.kind, time: m.time }
    })
  }
}
