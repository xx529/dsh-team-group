/* ──────────────────────────────────────────────────────────────────────────
 * 80-states.part.js — 骨架 / 空态 / 错误态 / 筛选空态 / 未读浮标
 * ────────────────────────────────────────────────────────────────────────── */

function GcSkeleton(props) {
  const t = props && props.t ? props.t : gcTranslate
  const rows = []
  const widths = [
    [122, 92, 176],
    [96, 148, 120],
    [140, 110, 160],
    [88, 132, 148],
    [116, 100, 138]
  ]
  for (let i = 0; i < 5; i += 1) {
    const group = widths[i]
    rows.push(
      h(
        'div',
        { key: 'skeleton-' + i, className: 'gc-row', 'data-testid': 'group-chat-skeleton' },
        h('span', { className: 'gc-skeleton-avatar' }),
        h(
          'div',
          { className: 'gc-skeleton-body' },
          h('div', { className: 'gc-skeleton-bar', style: { width: group[0] + 'px' } }),
          h('div', { className: 'gc-skeleton-bar', style: { width: group[1] + 'px' } }),
          h('div', { className: 'gc-skeleton-bar', style: { width: group[2] + 'px' } })
        )
      )
    )
  }
  return h(
    'div',
    { className: 'gc-skeleton', role: 'status', 'aria-label': t('a11y.feed'), 'aria-busy': 'true' },
    h('div', { className: 'gc-col' }, rows)
  )
}

function GcEmptyNoTeam(props) {
  const t = props.t
  return h(
    'div',
    { className: 'gc-center-state', 'data-testid': 'group-chat-empty-no-team' },
    h('div', { className: 'gc-empty-icon', 'aria-hidden': 'true' }, h(GcIconAt, { size: 20 })),
    h('div', { className: 'gc-empty-title' }, t('empty.noTeam')),
    h('div', { className: 'gc-empty-desc' }, t('empty.noTeamDesc')),
    props.onOpenChat
      ? h(
          'button',
          {
            type: 'button',
            className: 'gc-empty-action',
            'data-action': 'how-to-team',
            onClick: function (event) {
              event.preventDefault()
              props.onOpenChat()
            }
          },
          t('empty.howToTeam')
        )
      : null
  )
}

function GcEmptyTeam(props) {
  const t = props.t
  return h(
    'div',
    { className: 'gc-center-state', 'data-testid': 'group-chat-empty' },
    h('div', { className: 'gc-empty-icon', 'aria-hidden': 'true' }, h(GcIconAt, { size: 20 })),
    h('div', { className: 'gc-empty-title' }, t('empty.team')),
    h('div', { className: 'gc-empty-desc' }, t('empty.teamDesc'))
  )
}

function GcErrorState(props) {
  const t = props.t
  const error = props.error || {}
  const retryable = error.retryable !== false
  const message =
    error.code === 'no-source'
      ? t('error.source')
      : gcStr(error.message)
        ? t('error.load') + '（' + gcStr(error.message) + '）'
        : t('error.load')
  const children = [h('span', { key: 'text' }, message)]
  if (error.code === 'no-source') {
    children.push(h('span', { key: 'hint', className: 'gc-empty-desc' }, t('error.sourceHint')))
  }
  if (retryable && props.onRetry) {
    children.push(
      h(
        'button',
        {
          key: 'retry',
          type: 'button',
          className: 'gc-link',
          'data-action': 'retry-load',
          onClick: function (event) {
            event.preventDefault()
            props.onRetry()
          }
        },
        t('error.retry')
      )
    )
  }
  return h(
    'div',
    { className: 'gc-center-state' },
    h(
      'div',
      {
        className: 'gc-error-card',
        'data-testid': 'group-chat-error',
        'data-retryable': retryable ? 'true' : 'false',
        'data-tone': 'error',
        role: 'alert'
      },
      children
    )
  )
}

function GcFilterEmpty(props) {
  const t = props.t
  return h(
    'div',
    { className: 'gc-center-state', 'data-testid': 'group-chat-filter-empty' },
    h('div', { className: 'gc-empty-desc' }, t('filter.empty'))
  )
}

function GcUnreadPill(props) {
  const t = props.t
  const count = props.count || 0
  if (count <= 0) return null
  return h(
    'button',
    {
      type: 'button',
      className: 'gc-unread-pill',
      'data-testid': 'group-chat-unread-pill',
      'data-count': String(count),
      'aria-label': t('a11y.unread'),
      onClick: function (event) {
        event.preventDefault()
        if (props.onJumpLatest) props.onJumpLatest()
      }
    },
    h('span', { className: 'gc-dot', 'data-state': 'running' }),
    t('unread.jump', { n: count })
  )
}
