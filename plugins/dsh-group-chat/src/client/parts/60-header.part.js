/* ──────────────────────────────────────────────────────────────────────────
 * 60-header.part.js — 频道头 / 提示条 / 筛选菜单
 *
 * 频道头 56px：群头像（2×2 拼贴）+「群聊」+ 竖线 + 团队名 + 状态行 + 筛选按钮；
 * 无团队（单 agent 会话，D-C）时不显示成员状态行与筛选按钮。
 * ────────────────────────────────────────────────────────────────────────── */

function gcRunningCount(channel) {
  if (!channel) return 0
  if (typeof channel.runningCount === 'number') return channel.runningCount
  const members = gcAsArray(channel.members)
  let count = 0
  for (let i = 0; i < members.length; i += 1) {
    if (members[i] && members[i].status === 'running') count += 1
  }
  return count
}

function gcMemberCount(channel) {
  const members = gcAsArray(channel && channel.members)
  if (members.length > 0) return members.length
  return channel && channel.lead ? 1 : 0
}

function gcIsSingleAgent(channel) {
  if (!channel) return true
  if (channel.singleAgent === true) return true
  if (channel.degraded === 'lead-only') return true
  const members = gcAsArray(channel.members)
  return members.length <= 1
}

function GcGroupAvatar(props) {
  return h(
    'span',
    { className: 'gc-group-avatar', 'aria-hidden': 'true' },
    h('i', { 'data-slot': '0' }),
    h('i', { 'data-slot': '1' }),
    h('i', { 'data-slot': '2' }),
    h('i', { 'data-slot': '3' })
  )
}

function GcChannelHeader(props) {
  const t = props.t
  const channel = props.channel
  const singleAgent = gcIsSingleAgent(channel)
  const teamName = gcStr(channel && (channel.teamName || (channel.lead && (channel.lead.displayName || channel.lead.name))))

  const statusChildren = []
  if (!singleAgent) {
    const statusModel = gcMembersStatusModel(channel)
    statusChildren.push(h(GcStatusDot, { key: 'dot', state: statusModel.working > 0 ? 'running' : 'inactive' }))
    statusChildren.push(
      h(
        'span',
        { key: 'text' },
        t('channel.membersStatus', {
          n: statusModel.total,
          m: statusModel.working,
          k: statusModel.waiting
        })
      )
    )
  }
  if (props.readonly) {
    statusChildren.push(h('span', { key: 'ro', className: 'gc-status-suffix' }, t('readonly.suffix')))
  }
  if (props.filter) {
    statusChildren.push(
      h('span', { key: 'filter', className: 'gc-status-suffix' }, t('filter.suffix', { name: props.filter }))
    )
  }
  if (props.unread > 0) {
    statusChildren.push(
      h(
        'button',
        {
          key: 'newmessages',
          type: 'button',
          className: 'gc-newmessages-hint',
          'data-testid': 'group-chat-newmessages-hint',
          'data-count': String(props.unread),
          onClick: function (event) {
            event.preventDefault()
            if (props.onJumpLatest) props.onJumpLatest()
          }
        },
        t('channel.newMessages', { n: props.unread })
      )
    )
  }

  const titleRow = [h('span', { key: 'title', className: 'gc-header-title' }, t('channel.title'))]
  if (teamName) {
    titleRow.push(h('span', { key: 'divider', className: 'gc-header-divider' }))
    titleRow.push(h('span', { key: 'team', className: 'gc-header-team', title: teamName }, teamName))
  }

  if (!singleAgent && props.onOpenTrajectory) {
    const strip = gcMemberStripData(channel)
    if (strip.visible.length > 0) {
      const stripNodes = strip.visible.map(function (member) {
        const state = gcMemberWorkStatus(member)
        return h(
          'button',
          {
            key: 'member-' + (member.sessionId || member.name),
            type: 'button',
            className: 'gc-member-strip-item',
            'data-testid': 'group-chat-member-strip-item',
            'data-member-id': gcStr(member.sessionId),
            'data-member-state': state,
            'data-action': 'open-trajectory',
            title: member.name,
            'aria-label': member.name + ' · ' + t('member.status.' + state),
            onClick: function (event) {
              event.preventDefault()
              props.onOpenTrajectory(member)
            }
          },
          h(GcAvatar, { name: member.name, kind: member.kind, size: 24 }),
          h('span', { className: 'gc-member-status-dot', 'data-state': state, 'aria-hidden': 'true' })
        )
      })
      titleRow.push(
        h(
          'div',
          {
            key: 'member-strip',
            className: 'gc-member-strip',
            'data-testid': 'group-chat-member-strip'
          },
          stripNodes
        )
      )
    }
  }

  const mainChildren = [h('div', { key: 'row1', className: 'gc-header-row' }, titleRow)]
  if (statusChildren.length > 0) {
    mainChildren.push(h('div', { key: 'row2', className: 'gc-header-status' }, statusChildren))
  }

  const children = [
    h(GcGroupAvatar, { key: 'avatar' }),
    h('div', { key: 'main', className: 'gc-header-main' }, mainChildren)
  ]

  if (channel && channel.truncated && channel.truncated.omittedSubagents > 0) {
    children.push(
      h(
        'span',
        {
          key: 'truncated',
          className: 'gc-truncation-hint',
          'data-testid': 'group-chat-truncation-hint'
        },
        t('channel.omittedSubagents', { n: channel.truncated.omittedSubagents })
      )
    )
  }

  children.push(h('span', { key: 'spacer', className: 'gc-spacer' }))

  if (!singleAgent) {
    children.push(
      h(
        'button',
        {
          key: 'filter',
          type: 'button',
          className: 'gc-icon-btn',
          'data-testid': 'group-chat-filter-button',
          'aria-label': t('filter.button'),
          'aria-haspopup': 'menu',
          'aria-expanded': props.filterOpen ? 'true' : 'false',
          onClick: function (event) {
            event.preventDefault()
            if (props.onToggleFilter) props.onToggleFilter()
          }
        },
        h(GcIconFilter, { size: 14 })
      )
    )
  }

  return h(
    'div',
    {
      className: 'gc-header',
      'data-testid': 'group-chat-header',
      'data-single-agent': singleAgent ? 'true' : 'false'
    },
    children
  )
}

/* ── 筛选菜单（单选成员） ─────────────────────────────────────────────── */

function gcFilterMenuMembers(channel) {
  const index = gcMemberIndex(channel)
  const out = []
  const lead = channel && channel.lead
  if (lead) out.push(lead)
  for (let i = 0; i < index.members.length; i += 1) {
    const member = index.members[i]
    if (member && member.kind !== 'lead' && member.name) out.push(member)
  }
  return out
}

function GcFilterMenu(props) {
  const t = props.t
  const members = gcFilterMenuMembers(props.channel)
  const items = []
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i]
    const sub = member.kind === 'subagent' ? t('mention.sub.subagent') : member.kind === 'lead' ? t('mention.sub.lead') : t('mention.sub.teammate')
    items.push(
      h(
        'button',
        {
          key: 'filter-' + member.name,
          type: 'button',
          className: 'gc-filter-item',
          'data-mention': member.name,
          'data-active': props.filter === member.name ? 'true' : 'false',
          role: 'menuitemradio',
          'aria-checked': props.filter === member.name ? 'true' : 'false',
          onClick: function (event) {
            event.preventDefault()
            if (props.onSelect) props.onSelect(member.name)
          }
        },
        h(GcAvatar, { name: member.name, kind: member.kind, size: 24 }),
        h(
          'span',
          { className: 'gc-filter-item-main' },
          member.name,
          h('span', { className: 'gc-filter-item-sub' }, ' ' + sub)
        )
      )
    )
  }
  if (items.length === 0) {
    items.push(h('div', { key: 'empty', className: 'gc-mention-empty' }, t('filter.empty')))
  }
  return h(
    'div',
    {
      className: 'gc-filter-menu',
      role: 'menu',
      'data-testid': 'group-chat-filter-menu',
      'aria-label': t('filter.button')
    },
    items
  )
}

/* ── 提示条 ───────────────────────────────────────────────────────────── */

function GcBanners(props) {
  const t = props.t
  const state = props.state
  const channel = state.channel
  const nodes = []

  if (channel && channel.readonly) {
    nodes.push(
      h(
        'div',
        {
          key: 'readonly',
          className: 'gc-banner',
          'data-testid': 'group-chat-readonly-banner',
          'data-tone': 'readonly',
          role: 'status'
        },
        t('readonly.banner')
      )
    )
  }

  if (state.filter) {
    nodes.push(
      h(
        'div',
        {
          key: 'filter',
          className: 'gc-banner',
          'data-testid': 'group-chat-filter-banner',
          'data-filter': state.filter,
          'data-tone': 'filter',
          role: 'status'
        },
        h('span', null, t('filter.active', { name: state.filter, n: props.filterCount || 0 })),
        h(
          'button',
          {
            type: 'button',
            className: 'gc-link gc-banner-action',
            'data-action': 'clear-filter',
            onClick: function (event) {
              event.preventDefault()
              if (props.onClearFilter) props.onClearFilter()
            }
          },
          t('filter.clear')
        )
      )
    )
  }

  if (state.connection === 'paused') {
    nodes.push(
      h(
        'div',
        {
          key: 'reconnect',
          className: 'gc-banner',
          'data-testid': 'group-chat-reconnect-banner',
          'data-tone': 'error',
          role: 'alert'
        },
        h('span', null, t('error.reconnect')),
        h(
          'button',
          {
            type: 'button',
            className: 'gc-link gc-banner-action',
            'data-action': 'reconnect',
            onClick: function (event) {
              event.preventDefault()
              if (props.onReconnect) props.onReconnect()
            }
          },
          t('error.reconnectAction')
        )
      )
    )
  }

  if (nodes.length === 0) return null
  return h('div', { className: 'gc-banners' }, h('div', { className: 'gc-col' }, nodes))
}
