/* ──────────────────────────────────────────────────────────────────────────
 * 50-feed.part.js — 消息流（时间分隔 / 各类消息行 / 折叠 / 系统提示）
 *
 * 渲染映射见架构 §6.5，DOM 契约见 §6.5.2（data-testid / data-kind / data-*）。
 * 全部为纯函数组件（无 hooks），便于在 mini React harness 中直接断言。
 * ────────────────────────────────────────────────────────────────────────── */

function gcMentionSetFor(channel) {
  const set = new Set()
  const members = gcAsArray(channel && channel.members)
  for (let i = 0; i < members.length; i += 1) {
    if (members[i] && members[i].name) set.add(members[i].name)
  }
  if (channel && channel.lead && channel.lead.name) set.add(channel.lead.name)
  return set
}

function gcMessageAriaLabel(message, t, channel) {
  const sender = (message && message.sender) || {}
  const index = gcMemberIndex(channel)
  const member = index.bySessionId.get(sender.sessionId)
  const name = sender.name || (member && member.name) || 'unknown'
  return t('a11y.message', {
    sender: name,
    time: gcMessageTimeText((message && message.time) || Date.now()),
    kind: (message && message.kind) || 'message'
  })
}

/* ── 时间分隔 ─────────────────────────────────────────────────────────── */

function GcTimeDivider(props) {
  return h('div', { className: 'gc-time-divider', 'data-testid': 'group-chat-time-divider' }, props.text)
}

/* ── 系统提示 / 欢迎提示 ──────────────────────────────────────────────── */

function GcSystemNote(props) {
  return h(
    'div',
    {
      className: 'gc-system-note',
      'data-kind': 'system',
      'data-message-id': props.message.id,
      'data-system-variant': 'default',
      role: 'article'
    },
    props.text
  )
}

function GcWelcomeNote(props) {
  return h(
    'div',
    {
      className: 'gc-welcome-note',
      'data-kind': 'system',
      'data-message-id': props.message.id,
      'data-system-variant': 'welcome',
      role: 'article'
    },
    h('span', null, props.text),
    h('span', { className: 'gc-welcome-time' }, gcMessageTimeText(props.message.time))
  )
}

/* ── 气泡内富文本 + 折叠 ─────────────────────────────────────────────── */

function GcFoldableBody(props) {
  const decision = props.decision
  const expanded = !!props.expanded
  const body = h(
    'div',
    {
      className: decision.foldable ? 'gc-foldable' : 'gc-foldable-static',
      'data-expanded': decision.foldable ? (expanded ? 'true' : 'false') : undefined
    },
    props.children
  )
  if (!decision.foldable) return body
  return h(Fragment, null, body, h(GcFoldMeta, { t: props.t, decision: decision, expanded: expanded, onToggle: props.onToggle }))
}

/* ── 普通消息行（M1 / M2 / M3 / M5） ─────────────────────────────────── */

function gcRenderBubbleContent(props) {
  const message = props.message
  const t = props.t
  const children = []

  if (message.kind === 'agent_to_agent') {
    const targets = gcAsArray(message.targets)
    if (targets.length > 0) {
      const prefix = []
      for (let i = 0; i < targets.length; i += 1) {
        prefix.push(
          h(
            'span',
            {
              key: 'target-' + targets[i],
              className: 'gc-mention',
              'data-mention': targets[i],
              'data-clickable': props.onMention ? 'true' : 'false',
              role: props.onMention ? 'button' : undefined,
              tabIndex: props.onMention ? 0 : undefined,
              onClick: props.onMention
                ? function (event) {
                    event.stopPropagation()
                    props.onMention(targets[i])
                  }
                : undefined
            },
            '@' + targets[i]
          ),
          ' '
        )
      }
      children.push(h('p', { key: 'targets' }, prefix))
    }
  }

  children.push(
    h(GcRichText, {
      key: 'text',
      text: message.text,
      mentionSet: gcMentionSetFor(props.channel),
      onMention: props.onMention
    })
  )

  if (message.kind === 'delivery' || message.kind === 'agent_output') {
    const files = gcAsArray(message.files)
    for (let i = 0; i < files.length; i += 1) {
      children.push(
        h(
          'div',
          { key: 'file-' + i, className: 'gc-file-row' },
          h('span', { className: 'gc-file-name' }, gcStr(files[i] && files[i].name)),
          h('span', { className: 'gc-file-path' }, gcStr(files[i] && files[i].path)),
          h(
            'button',
            {
              type: 'button',
              className: 'gc-link',
              'data-action': 'open-file',
              onClick: function (event) {
                event.preventDefault()
                if (props.onOpenFile) props.onOpenFile(files[i])
              }
            },
            t('msg.file.open')
          )
        )
      )
    }
  }

  return children
}

function GcMessageRow(props) {
  const message = props.message
  const t = props.t
  const channel = props.channel
  const self = message.kind === 'user'
  const index = gcMemberIndex(channel)
  const sender = message.sender || {}
  const member = index.bySessionId.get(sender.sessionId)
  const senderKind = sender.kind || (member && member.kind) || 'teammate'
  const senderName = sender.name || (member && member.name) || 'unknown'
  const parentName = senderKind === 'subagent' ? gcParentNameOf(channel, message) : ''
  const foldDecision = gcFoldDecision(message.text, gcLimits())
  const foldedMap = (props.state && props.state.folded) || {}
  const expanded = foldedMap[message.id] ? true : !foldDecision.foldable
  const captionModel = gcCaptionModel(message, t)
  const toolCount = typeof message.toolCallCount === 'number' ? message.toolCallCount : 0

  const bubble = h(
    GcBubble,
    { self: self, state: message.delivery || undefined, debug: gcSendDebugModel(message) },
    h(
      GcFoldableBody,
      {
        t: t,
        decision: foldDecision,
        expanded: expanded,
        onToggle: function () {
          if (props.onFold) props.onFold(message.id)
        }
      },
      gcRenderBubbleContent({
        message: message,
        t: t,
        channel: channel,
        onMention: props.onMention,
        onOpenFile: props.onOpenFile
      })
    )
  )

  const mainChildren = []

  if (!self) {
    mainChildren.push(
      h(GcSenderLine, {
        key: 'sender',
        t: t,
        sender: sender,
        name: senderName,
        kind: senderKind,
        parentName: parentName,
        statusText: gcStatusText((member && member.status) || 'unknown', t),
        statusState: (member && member.status) || 'unknown'
      })
    )
  }

  const sending = message.delivery === 'sending'
  const captionNode = captionModel
    ? h(GcCaption, {
        model: captionModel,
        onAction: function (action) {
          if (props.onCaptionAction) props.onCaptionAction(message, action)
        }
      })
    : null
  mainChildren.push(
    h(
      'div',
      { key: 'bubblewrap', className: 'gc-bubble-wrap', 'data-sending': sending ? 'true' : 'false' },
      sending ? captionNode : bubble,
      sending ? bubble : captionNode
    )
  )

  if (toolCount > 0) {
    mainChildren.push(
      h(
        'div',
        { key: 'tools', className: 'gc-tool-line', 'data-field': 'tool-calls' },
        h(
          'button',
          {
            type: 'button',
            className: 'gc-link',
            'data-action': 'open-trajectory',
            onClick: function (event) {
              event.preventDefault()
              if (props.onOpenTrajectory) props.onOpenTrajectory(message)
            }
          },
          t('msg.toolCalls', { n: toolCount })
        )
      )
    )
  }

  mainChildren.push(
    h(GcRowActions, {
      key: 'actions',
      t: t,
      onCopy: function () {
        if (props.onCopyMessage) props.onCopyMessage(message)
      },
      onOpen: props.onOpenSession
        ? function () {
            props.onOpenSession(message)
          }
        : null
    })
  )

  const children = []
  if (!self) {
    children.push(h(GcAvatar, { key: 'avatar', name: senderName, kind: senderKind, size: 32 }))
  }
  children.push(h('div', { key: 'main', className: 'gc-row-main' }, mainChildren))

  return h(
    GcRowShell,
    {
      self: self,
      tight: props.tight,
      kind: message.kind,
      messageId: message.id,
      status: message.delivery || undefined,
      memberKind: senderKind === 'subagent' ? 'subagent' : undefined,
      parent: parentName || undefined,
      ariaLabel: gcMessageAriaLabel(message, t, channel)
    },
    children
  )
}

/* ── 行分发 ───────────────────────────────────────────────────────────── */

function gcWelcomeText(message, t) {
  const payload = (message && message.memberCard && message.memberCard.member) || null
  const name = payload && payload.name ? payload.name : ''
  if (name) return t('member.welcome', { name: name })
  return gcStr(message && message.text)
}

function GcFeedItem(props) {
  const message = props.message
  if (gcIsContextNoise(message)) return null
  if (message.kind === 'system') {
    const isWelcome =
      message.systemReason === 'member-welcome' || (message.meta && message.meta.systemVariant === 'welcome')
    if (isWelcome) return h(GcWelcomeNote, { message: message, text: gcWelcomeText(message, props.t) })
    return h(GcSystemNote, { message: message, text: gcStr(message.text) })
  }
  if (message.kind === 'member_card') {
    return h(GcMemberJoinMessage, {
      message: message,
      t: props.t,
      expanded: !!(props.state && props.state.expandedCards && props.state.expandedCards[message.id]),
      onAction: function (action) {
        if (props.onCardAction) props.onCardAction(message, action)
      }
    })
  }
  if (message.kind === 'task_card') {
    return h(GcTaskCardMessage, {
      message: message,
      t: props.t,
      expanded: !!(props.state && props.state.expandedCards && props.state.expandedCards[message.id]),
      onAction: function (action) {
        if (props.onCardAction) props.onCardAction(message, action)
      },
      onCopyId: function (id) {
        if (props.onCopyTaskId) props.onCopyTaskId(id)
      }
    })
  }
  return h(GcMessageRow, props)
}

/* ── 消息流容器 ───────────────────────────────────────────────────────── */

function GcFeedBody(props) {
  const state = props.state
  const t = props.t
  const channel = state.channel
  const items = props.items
  const nodes = []

  if (state.loadingOlder) {
    nodes.push(h('div', { key: 'loading', className: 'gc-feed-top' }, t('history.loadingOlder')))
  } else if (state.reachedOldest && items.length > 0) {
    nodes.push(h('div', { key: 'earliest', className: 'gc-feed-top' }, t('history.earliest')))
  }

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (item.type === 'divider') {
      nodes.push(h(GcTimeDivider, { key: item.id, text: item.text }))
      continue
    }
    nodes.push(
      h(GcFeedItem, {
        key: item.id,
        message: item.message,
        tight: item.tight,
        t: t,
        channel: channel,
        state: state,
        onFold: props.onFold,
        onMention: props.onMention,
        onCopyMessage: props.onCopyMessage,
        onOpenSession: props.onOpenSession,
        onOpenFile: props.onOpenFile,
        onOpenTrajectory: props.onOpenTrajectory,
        onCaptionAction: props.onCaptionAction,
        onCardAction: props.onCardAction,
        onCopyTaskId: props.onCopyTaskId
      })
    )
  }
  return h(Fragment, null, nodes)
}

function GcFeed(props) {
  const state = props.state
  const t = props.t
  const nodes = []

  if (state.phase === 'loading' && gcAsArray(state.messages).length === 0) {
    nodes.push(h(GcSkeleton, { key: 'skeleton', t: t }))
  } else if (state.phase === 'error' && gcAsArray(state.messages).length === 0) {
    nodes.push(h(GcErrorState, { key: 'error', t: t, error: state.error, onRetry: props.onRetryOpen }))
  } else if (props.emptyKind === 'no-team') {
    nodes.push(h(GcEmptyNoTeam, { key: 'empty-team', t: t, onOpenChat: props.onOpenChat }))
  } else if (props.items.length === 0 && !state.filter) {
    nodes.push(h(GcEmptyTeam, { key: 'empty', t: t }))
  } else {
    nodes.push(h(GcFeedBody, Object.assign({ key: 'body' }, props)))
  }

  const ariaText = gcAsArray(state.messages).length > 0 ? gcSrSummary(state.messages, t) : ''

  return h(
    'div',
    {
      className: 'gc-scroll',
      ref: props.scrollRef,
      onScroll: props.onScroll,
      'data-testid': 'group-chat-feed',
      role: 'log',
      'aria-live': 'polite',
      'aria-relevant': 'additions',
      'aria-label': t('a11y.feed'),
      tabIndex: 0
    },
    h('div', { className: 'gc-feed' }, h('div', { className: 'gc-col' }, nodes)),
    h('div', { className: 'gc-sr-only' }, ariaText)
  )
}

/** 读屏摘要：仅最近一条（不逐 token 播报，§6.10）。 */
function gcSrSummary(messages, t) {
  const list = gcAsArray(messages)
  const last = list[list.length - 1]
  if (!last) return ''
  const sender = gcStr(last.sender && last.sender.name) || 'unknown'
  const text = gcClip(gcStr(last.text), 80)
  if (last.kind === 'system') return text
  return sender + ': ' + text
}

/** 行内 @ 点击 → 筛选成员（UX Q6，二次点击打开会话由菜单承担）。 */
function gcMentionClickTarget(name) {
  return name
}
