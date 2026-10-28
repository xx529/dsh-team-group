/* ──────────────────────────────────────────────────────────────────────────
 * 65-trajectory.part.js — 轮次轨迹侧栏（F26 / §6.15.2）
 *
 * 右侧 380px 抽屉（窄屏全屏），只读；数据来自该成员会话事件窗口经 core/turns
 * 聚合（缺失时按该成员 agent_output 降级），不修改消息流、不新增订阅。
 * DOM 契约：agent-trajectory-panel / agent-trajectory-overlay /
 * data-action=close-trajectory / agent-trajectory-turn[data-turn-index][data-turn-status] /
 * agent-trajectory-load-older。
 * ────────────────────────────────────────────────────────────────────────── */

const GC_TRAJECTORY_STATUS_KEY = {
  done: 'trajectory.status.done',
  aborted: 'trajectory.status.aborted',
  error: 'trajectory.status.error',
  truncated: 'trajectory.status.truncated',
  running: 'trajectory.status.running',
  unknown: 'trajectory.status.unknown'
}

function gcTrajectoryStatusText(status, t) {
  const key = GC_TRAJECTORY_STATUS_KEY[status] || 'trajectory.status.unknown'
  return t(key)
}

function gcTrajectoryTime(turn) {
  const ts = typeof turn.startedAt === 'number' ? turn.startedAt : turn.time
  if (typeof ts !== 'number') return ''
  return gcMessageTimeText(ts)
}

function GcTrajectoryTurn(props) {
  const turn = props.turn || {}
  const t = props.t
  const status = gcStr(turn.status) || 'unknown'
  const summary = gcStr(turn.summary)
  const toolCount = typeof turn.toolCount === 'number' ? turn.toolCount : 0
  return h(
    'div',
    {
      className: 'gc-trajectory-turn',
      'data-testid': 'agent-trajectory-turn',
      'data-turn-index': String(turn.index === undefined ? '' : turn.index),
      'data-turn-status': status
    },
    h(
      'div',
      { className: 'gc-trajectory-turn-head' },
      h('span', null, gcTrajectoryTime(turn)),
      h('span', null, '#' + String(turn.index === undefined ? '' : turn.index)),
      h('span', { className: 'gc-trajectory-turn-status', 'data-status': status }, gcTrajectoryStatusText(status, t))
    ),
    h(
      'div',
      { className: 'gc-trajectory-turn-summary' },
      summary || t('trajectory.noOutput')
    ),
    toolCount > 0 ? h('div', { className: 'gc-trajectory-turn-tools' }, t('trajectory.toolCount', { n: toolCount })) : null
  )
}

function GcTrajectoryPanel(props) {
  const t = props.t
  const member = props.member || {}
  const turns = gcAsArray(props.turns)
  const overlay = h('div', {
    key: 'overlay',
    className: 'gc-trajectory-overlay',
    'data-testid': 'agent-trajectory-overlay',
    onClick: function (event) {
      event.preventDefault()
      if (props.onClose) props.onClose()
    }
  })
  const body = h(
    'aside',
    {
      className: 'gc-trajectory-panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': t('trajectory.title'),
      'data-testid': 'agent-trajectory-panel',
      'data-member-id': gcStr(member.sessionId)
    },
    h(
      'div',
      { className: 'gc-trajectory-head' },
      h(GcAvatar, { name: member.name, kind: member.kind, size: 32 }),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
        h('span', { className: 'gc-trajectory-title' }, t('trajectory.title')),
        h('span', { className: 'gc-trajectory-agent' }, gcStr(member.name)),
        h(
          'span',
          { className: 'gc-trajectory-meta' },
          [
            t('member.status.' + gcMemberWorkStatus(member)),
            gcStr(member.model)
          ]
            .filter(Boolean)
            .join(' · ')
        )
      ),
      h('span', { className: 'gc-spacer' }),
      h(
        'button',
        {
          type: 'button',
          className: 'gc-icon-btn',
          'data-action': 'close-trajectory',
          'aria-label': t('trajectory.close'),
          title: t('trajectory.close'),
          onClick: function (event) {
            event.preventDefault()
            if (props.onClose) props.onClose()
          }
        },
        h(GcIconClose, { size: 14 })
      )
    ),
    h(
      'div',
      { className: 'gc-trajectory-list' },
      turns.length === 0
        ? h('div', { className: 'gc-empty-desc', style: { padding: '24px 8px', textAlign: 'center' } }, t('trajectory.empty'))
        : turns.map(function (turn, index) {
            return h(GcTrajectoryTurn, { key: 'turn-' + (turn.index ?? index), turn: turn, t: t })
          })
    ),
    props.hasOlder
      ? h(
          'div',
          { className: 'gc-trajectory-foot' },
          h(
            'button',
            {
              type: 'button',
              className: 'gc-link',
              'data-testid': 'agent-trajectory-load-older',
              onClick: function (event) {
                event.preventDefault()
                if (props.onLoadOlder) props.onLoadOlder()
              }
            },
            t('trajectory.loadOlder')
          )
        )
      : null
  )
  return h(Fragment, null, overlay, body)
}
