/* ──────────────────────────────────────────────────────────────────────────
 * 85-preview.part.js — 预览数据源（`?gc-preview=1`，仅开发/视觉对照）
 *
 * 用内置 fixture 直接渲染 P1–P12 的全部消息形态（含入群卡、任务卡、四态），
 * 不依赖 src/adapters，也不依赖真实会话。生产路径见 gcCreateChannelSource。
 * ────────────────────────────────────────────────────────────────────────── */

const GC_PREVIEW_LEAD_ID = 'preview-lead-session'

function gcPreviewMembers() {
  return [
    {
      sessionId: GC_PREVIEW_LEAD_ID,
      name: 'lead',
      displayName: 'Lead',
      kind: 'lead',
      depth: 0,
      status: 'running',
      addressable: true,
      model: 'deepseek-flash'
    },
    {
      sessionId: 'preview-scout',
      name: 'scout',
      displayName: 'scout',
      kind: 'teammate',
      depth: 1,
      parentSessionId: GC_PREVIEW_LEAD_ID,
      status: 'running',
      addressable: true,
      description: '负责接口取证与技术可行性，产出 docs/research 下的调研结论。'
    },
    {
      sessionId: 'preview-ux',
      name: 'ux',
      displayName: 'ux',
      kind: 'teammate',
      depth: 1,
      parentSessionId: GC_PREVIEW_LEAD_ID,
      status: 'inactive',
      addressable: true,
      description: '交互规格与高保真原型。'
    },
    {
      sessionId: 'preview-backend',
      name: 'backend',
      displayName: 'backend',
      kind: 'teammate',
      depth: 1,
      parentSessionId: GC_PREVIEW_LEAD_ID,
      status: 'running',
      addressable: true
    },
    {
      sessionId: 'preview-pm',
      name: 'pm',
      displayName: 'pm',
      kind: 'teammate',
      depth: 1,
      parentSessionId: GC_PREVIEW_LEAD_ID,
      status: 'inactive',
      addressable: true
    },
    {
      sessionId: 'preview-sub-1',
      name: '产品设计',
      displayName: '产品设计 · ux 的子体',
      kind: 'subagent',
      depth: 2,
      parentSessionId: 'preview-ux',
      parentName: 'ux',
      status: 'running',
      addressable: true
    }
  ]
}

function gcPreviewWelcomeMessage(time) {
  return {
    id: 'preview:welcome:scout',
    kind: 'system',
    sessionId: GC_PREVIEW_LEAD_ID,
    sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'lead', kind: 'system' },
    targets: [],
    targetSessionIds: [],
    text: '欢迎 @scout 加入群聊',
    time: time,
    seq: 1,
    isFinal: true,
    systemReason: 'member-welcome',
    creationId: 'mc:preview-scout',
    pairOrder: 0
  }
}

function gcPreviewMemberCard(time) {
  return {
    id: 'mc:preview-scout',
    kind: 'member_card',
    sessionId: GC_PREVIEW_LEAD_ID,
    sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'lead', kind: 'lead' },
    targets: [],
    targetSessionIds: [],
    text: '',
    time: time,
    seq: 2,
    isFinal: true,
    creationId: 'mc:preview-scout',
    pairOrder: 1,
    memberCard: {
      id: 'mc:preview-scout',
      member: {
        sessionId: 'preview-scout',
        name: 'scout',
        kind: 'teammate',
        description: '负责接口取证与技术可行性，产出 docs/research 下的调研结论。',
        model: 'deepseek-flash',
        modelInheritedFrom: 'lead',
        modelSource: 'result_snapshot',
        contextPolicy: 'fresh',
        lifecycleMode: 'continuable',
        createTool: 'spawn_teammate',
        promptExcerpt: '核对 conversation.view 的注册方式与跨会话读取通路，输出可复用的接口清单。',
        promptFull:
          '核对 conversation.view 的注册方式与跨会话读取通路，输出可复用的接口清单。包含 standardProps/ownerProps 精确签名、retain/eventSource 窗口形状、发送通路分流规则。',
        state: 'running'
      },
      time: time,
      actions: { viewSession: 'enabled', viewTask: 'enabled' },
      trigger: 'team-member-active'
    }
  }
}

function gcPreviewSubagentCard(time) {
  return {
    id: 'mc:preview-sub-1',
    kind: 'member_card',
    sessionId: 'preview-ux',
    sender: { sessionId: 'preview-ux', name: 'ux', kind: 'teammate' },
    targets: [],
    targetSessionIds: [],
    text: '',
    time: time,
    seq: 9,
    isFinal: true,
    creationId: 'mc:preview-sub-1',
    pairOrder: 1,
    memberCard: {
      id: 'mc:preview-sub-1',
      member: {
        sessionId: 'preview-sub-1',
        name: '产品设计',
        kind: 'subagent',
        parentName: 'ux',
        description: '按 Figma 原型生成 768 窄屏布局标注。',
        model: 'deepseek-flash',
        modelInheritedFrom: 'ux',
        contextPolicy: 'fork',
        lifecycleMode: 'one_shot',
        createTool: 'subagent_fork',
        promptExcerpt: '按 P9 帧导出 768 窄屏的间距/字号/命中区标注。',
        promptFull: '按 P9 帧导出 768 窄屏的间距/字号/命中区标注，并核对 tab 行横向滚动与频道头。',
        state: 'running'
      },
      time: time,
      actions: { viewSession: 'enabled' },
      trigger: 'subagent-catalog'
    }
  }
}

function gcPreviewTaskCard(time, variant) {
  const base = {
    id: 'preview:task:1',
    kind: 'task_card',
    sessionId: GC_PREVIEW_LEAD_ID,
    text: '',
    time: time,
    seq: 20,
    isFinal: true
  }
  const table = {
    create: {
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'lead', kind: 'lead' },
      action: 'create',
      ownerName: '',
      status: 'pending',
      revision: 1,
      subject: '重绘任务卡片原型',
      description: '按成员卡语言出任务卡，覆盖创建、认领、完成与重新打开；插入 P2 示例并更新文档。'
    },
    claim: {
      sender: { sessionId: 'preview-scout', name: 'scout', kind: 'teammate' },
      action: 'claim',
      ownerName: 'scout',
      status: 'in_progress',
      revision: 2,
      subject: '重绘任务卡片原型',
      description: '我先出四个变体，再回填文档。',
      compact: true
    },
    complete: {
      sender: { sessionId: 'preview-backend', name: 'backend', kind: 'teammate' },
      action: 'complete',
      ownerName: 'backend',
      status: 'completed',
      revision: 3,
      subject: '补充发送通路错误码',
      description: ''
    },
    reopen: {
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'lead', kind: 'lead' },
      action: 'reopen',
      ownerName: '',
      status: 'pending',
      revision: 4,
      subject: '补充发送通路错误码',
      description: '需要补充部分投递的错误码说明，任务重新打开。'
    }
  }
  const row = table[variant] || table.create
  return Object.assign({}, base, {
    id: 'preview:task:' + variant,
    sender: row.sender,
    taskCard: {
      id: 'preview:task:' + variant,
      action: row.action,
      actionLabel: row.action,
      statusLabel: row.status,
      actor: {
        name: row.sender.name,
        sessionId: row.sender.sessionId,
        kind: row.sender.kind,
        source: 'paired'
      },
      time: time,
      dedupeKey: 'preview-team:task-13:' + row.revision,
      replay: false,
      compact: !!row.compact,
      task: {
        id: 'task-13',
        revision: row.revision,
        subject: row.subject,
        description: row.description,
        status: row.status,
        ownerId: row.ownerName ? (row.ownerName === 'lead' ? GC_PREVIEW_LEAD_ID : 'preview-' + row.ownerName) : '',
        ownerName: row.ownerName,
        blockedBy: variant === 'claim' ? ['task-13'] : [],
        writeScopes: []
      }
    }
  })
}

/** 折叠回归填充（>50 行，用于 P3 与折叠测试；不改变视觉语言） */
const GC_PREVIEW_FOLD_FILLER =
  '\n' +
  Array.from({ length: 46 })
    .map(function (_, i) {
      return '· 折叠回归占位第 ' + (i + 1) + ' 行：验证默认只展示前 50 行 + 56px 渐隐遮罩 + 「展开全部（共 N 行）」。'
    })
    .join('\n')

function gcPreviewAgentMessage(time, options) {
  return Object.assign(
    {
      id: 'preview:agent:' + time + ':' + Math.random().toString(36).slice(2, 7),
      kind: 'agent_output',
      sessionId: 'preview-scout',
      sender: { sessionId: 'preview-scout', name: 'scout', kind: 'teammate' },
      targets: [],
      targetSessionIds: [],
      text: '',
      time: time,
      seq: time,
      isFinal: true
    },
    options
  )
}

const GC_PREVIEW_LONG_TEXT =
  '群聊视图的完整 UX 规格已经定稿，覆盖以下几个部分。一、入口与导航：群聊作为对话页视图 tab，与对话 / 轨迹 / 上下文 / 终端 / 编队 / 能力同级；激活态沿用现有 13px/500 字号、2px 下划线与 business-primary 颜色；未读不在 tab 上画圆点，改为消息区浮标。\n\n二、布局三档：1440 内容列 920，1280 收紧到 856，768 窄屏隐藏侧栏并把频道头压到 56；消息气泡 max-width 600（窄屏 70%），圆角 12，padding 10×14。\n\n三、消息类型：用户消息右对齐并带「已同时发送给…」说明行；agent→agent 的 @ 目标内联在正文首行；agent 最终输出就是普通发言；系统提示居中无底色；成员加入是 creator 发出的一条带卡消息（欢迎提示 + creator 消息头 + 卡片）。\n\n四、发送流程：未 @ 默认发给 Lead，@ 触发补全浮层，多目标只发出一条气泡并标注接收方；失败可重试、部分失败显示已送达 X/Y。\n\n五、折叠规则：正文 8 行或 400 字符先到者触发，渐变遮罩 + 「展开全部」文字链，展开保持顶部锚点。\n\n六、状态：加载骨架、空态、只读历史（横幅 + 禁用输入）、筛选态（顶部提示条 + 清除）、未读浮标（↓ N 条新消息 + 频道头提示）。\n\n七、可访问性：tab role=tablist、消息流 aria-live=polite 仅播报新消息摘要、折叠链接 aria-expanded、焦点环 2px、prefers-reduced-motion 关闭动效。'

function gcPreviewMessages(now, options) {
  const opts = options || {}
  const m = function (minutes) {
    return now - minutes * 60 * 1000
  }
  const messages = [
    gcPreviewWelcomeMessage(m(24)),
    gcPreviewMemberCard(m(24)),
    gcPreviewAgentMessage(m(22), {
      kind: 'agent_to_agent',
      targets: ['backend'],
      targetSessionIds: ['preview-backend'],
      text: '接口清单已确认：conversation.view 的 slot 注册方式可用，跨会话读取走 host Service。请补发送通路签名。'
    }),
    gcPreviewTaskCard(m(20), 'create'),
    gcPreviewAgentMessage(m(18), {
      kind: 'user',
      sessionId: GC_PREVIEW_LEAD_ID,
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'user', kind: 'user' },
      targets: ['lead', 'ux', 'backend'],
      targetSessionIds: [GC_PREVIEW_LEAD_ID, 'preview-ux', 'preview-backend'],
      text: '接口清单我看了，发送通路按 host 路由来，别再走 client 直调。',
      delivery: 'sent',
      deliveries: { [GC_PREVIEW_LEAD_ID]: 'sent', 'preview-ux': 'sent', 'preview-backend': 'sent' },
      clientBatchId: 'preview-batch-1'
    }),
    gcPreviewAgentMessage(m(16), {
      kind: 'agent_output',
      sessionId: 'preview-ux',
      sender: { sessionId: 'preview-ux', name: 'ux', kind: 'teammate' },
      text: 'UX 规格已落盘，原型覆盖 tab、四类消息、@ 补全与发送四态。',
      toolCallCount: 3
    }),
    gcPreviewSubagentCard(m(14)),
    gcPreviewAgentMessage(m(13), {
      kind: 'agent_output',
      sessionId: 'preview-sub-1',
      sender: { sessionId: 'preview-sub-1', name: '产品设计', kind: 'subagent' },
      text: '768 窄屏标注已出：内容列 720（左右 24），气泡 max-width 70%，命中区 ≥44×44。'
    }),
    gcPreviewTaskCard(m(12), 'claim'),
    {
      id: 'preview:user:2',
      kind: 'user',
      sessionId: GC_PREVIEW_LEAD_ID,
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'user', kind: 'user' },
      targets: ['lead'],
      targetSessionIds: [GC_PREVIEW_LEAD_ID],
      text: '收到，我先补一版 host 路由的接口定义，10 分钟同步。',
      time: m(11),
      seq: m(11),
      isFinal: true,
      delivery: 'sending',
      clientBatchId: 'preview-batch-2'
    },
    {
      id: 'preview:user:3',
      kind: 'user',
      sessionId: GC_PREVIEW_LEAD_ID,
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'user', kind: 'user' },
      targets: ['lead', 'pm'],
      targetSessionIds: [GC_PREVIEW_LEAD_ID, 'preview-pm'],
      text: '那我先按这个方案改，回头把签名和错误码一起发上来。',
      time: m(9),
      seq: m(9),
      isFinal: true,
      delivery: 'failed',
      deliveries: { [GC_PREVIEW_LEAD_ID]: 'sent', 'preview-pm': 'failed' },
      clientBatchId: 'preview-batch-3',
      meta: {
        error: 'network-interrupted',
        sendDebug: {
          reason: 'network',
          code: 'send.prompt-failed',
          status: 'failed',
          stage: 'loop',
          message: 'target session not ready (session-unavailable)'
        }
      }
    },
    gcPreviewAgentMessage(m(8), {
      kind: 'delivery',
      sessionId: 'preview-backend',
      sender: { sessionId: 'preview-backend', name: 'backend', kind: 'teammate' },
      text:
        '**发送通路**已完成，关键点：\n\n- `sendChannelBatch` 负责 fan-out 与重试\n- 前缀 canonical：`[群聊 · 同发] 收件人：@lead、@ux`\n- 参考 [ADR](https://example.com/docs/adr/group-chat-send.md)\n\n```js\nconst result = await sendChannelBatch(request)\nconsole.log(result.status)\n```',
      files: [
        { name: 'group-chat-send.md', path: 'docs/adr/group-chat-send.md' },
        { name: 'send-batch.js', path: 'src/send/send-batch.js' }
      ],
      toolCallCount: 12
    }),
    gcPreviewTaskCard(m(7), 'complete'),
    gcPreviewTaskCard(m(6), 'reopen'),
    gcPreviewAgentMessage(m(5), {
      kind: 'agent_output',
      sessionId: 'preview-scout',
      sender: { sessionId: 'preview-scout', name: 'scout', kind: 'teammate' },
      text: GC_PREVIEW_LONG_TEXT + GC_PREVIEW_FOLD_FILLER,
      toolCallCount: 27
    }),
    {
      id: 'preview:system:end',
      kind: 'system',
      sessionId: GC_PREVIEW_LEAD_ID,
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'lead', kind: 'system' },
      targets: [],
      targetSessionIds: [],
      text: '接口清单校验 完成 · 用时 1 分 12 秒',
      time: m(3),
      seq: m(3),
      isFinal: true,
      systemReason: 'team-created'
    }
  ]
  if (opts.long === true) {
    // 长 feed（布局回归用）：追加 ~200 条，模拟团队跑很久后的消息流
    const speakers = [
      { sessionId: 'preview-scout', name: 'scout', kind: 'teammate' },
      { sessionId: 'preview-backend', name: 'backend', kind: 'teammate' },
      { sessionId: 'preview-ux', name: 'ux', kind: 'teammate' }
    ]
    for (let i = 0; i < 200; i += 1) {
      const speaker = speakers[i % speakers.length]
      const time = m(2) + i * 1500
      messages.push({
        id: 'preview:long:' + i,
        kind: 'agent_output',
        sessionId: speaker.sessionId,
        sender: { sessionId: speaker.sessionId, name: speaker.name, kind: speaker.kind },
        targets: [],
        targetSessionIds: [],
        text:
          '第 ' +
          (i + 1) +
          ' 条长 feed 消息：布局回归占位，用于验证消息流滚动时输入区始终贴在可视区底部（F-01）。',
        time: time,
        seq: time,
        isFinal: true,
        toolCallCount: i % 7 === 0 ? 3 : 0
      })
    }
  }
  return messages
}

function gcPreviewChannel(options) {
  const opts = options || {}
  const members = gcPreviewMembers()
  const readonly = opts.readonly === true
  return {
    channelId: GC_PREVIEW_LEAD_ID,
    lead: members[0],
    members: members,
    teamName: 'dsh-team-group',
    runningCount: members.filter(function (member) {
      return member.status === 'running'
    }).length,
    readonly: readonly,
    readonlyReason: readonly ? 'team-ended' : undefined,
    truncated: opts.truncated
      ? { omittedSubagents: 2, maxDepth: 3, maxSessions: 32, reason: 'session-cap' }
      : undefined,
    generatedAt: Date.now()
  }
}

function gcPreviewCursor(channelId) {
  return {
    v: 1,
    channelId: channelId,
    offsets: {},
    revisions: {}
  }
}

function gcCreatePreviewSource(options) {
  const opts = options || {}
  const listeners = new Set()
  let channel = gcPreviewChannel(opts)
  if (opts.members) {
    channel = gcMergeRosterChannel(channel, opts.members, channel.lead.sessionId)
  }
  let messages = gcPreviewMessages(Date.now(), { long: opts.long === true })
  let closed = false

  function page(extra) {
    return Object.assign(
      {
        channel: channel,
        messages: messages.slice(),
        cursor: gcPreviewCursor(channel.channelId),
        hasMore: true,
        truncated: false,
        serverTime: Date.now()
      },
      extra || null
    )
  }

  return {
    open: function () {
      return Promise.resolve(page())
    },
    sync: function () {
      return Promise.resolve(page({ messages: [] }))
    },
    pageOlder: function () {
      return Promise.resolve(page({ messages: [] }))
    },
    subscribe: function (onChange) {
      listeners.add(onChange)
      return function () {
        listeners.delete(onChange)
      }
    },
    capabilities: function () {
      return channel.readonly ? { canSend: false, reason: 'readonly' } : { canSend: true }
    },
    close: function () {
      closed = true
      listeners.clear()
    },
    // 预览发送：本地追加一条已发送消息
    prompt: function (request) {
      if (closed) return Promise.resolve({ status: 'failed', deliveries: [] })
      const now = Date.now()
      messages = messages.concat([
        {
          id: 'preview:local:' + now,
          kind: 'user',
          sessionId: channel.channelId,
          sender: { sessionId: channel.channelId, name: 'user', kind: 'user' },
          targets: gcAsArray(request && request.targets ? request.targets.map(function (target) { return target.name }) : ['lead']),
          targetSessionIds: [],
          text: gcStr(request && request.text),
          time: now,
          seq: now,
          isFinal: true,
          delivery: 'sent'
        }
      ])
      listeners.forEach(function (listener) {
        try {
          listener('append')
        } catch {}
      })
      return Promise.resolve({ status: 'sent', deliveries: [] })
    }
  }
}
