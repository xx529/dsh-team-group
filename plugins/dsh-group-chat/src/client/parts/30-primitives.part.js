/* ──────────────────────────────────────────────────────────────────────────
 * 30-primitives.part.js — 基础原子组件（无状态、纯函数，便于组件测试）
 * ────────────────────────────────────────────────────────────────────────── */

/* ── 图标（16×16 stroke，颜色继承 currentColor） ─────────────────────── */

function GcIconFilter(props) {
  const size = (props && props.size) || 14
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('path', {
      d: 'M2 3.5h12M4.5 8h7M6.5 12.5h3',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round'
    })
  )
}

function GcIconSend(props) {
  const size = (props && props.size) || 16
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('path', {
      d: 'M8 13V3.5M8 3.5 4 7.5M8 3.5l4 4',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    })
  )
}

function GcIconChevron(props) {
  const size = (props && props.size) || 12
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('path', {
      d: props && props.direction === 'up' ? 'M3.5 10 8 5.5l4.5 4.5' : 'M3.5 6 8 10.5 12.5 6',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    })
  )
}

function GcIconAt(props) {
  const size = (props && props.size) || 20
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
    h('circle', { cx: 12, cy: 12, r: 4, stroke: 'currentColor', strokeWidth: 1.5 }),
    h('path', {
      d: 'M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8',
      stroke: 'currentColor',
      strokeWidth: 1.5,
      strokeLinecap: 'round'
    })
  )
}

/* ── 头像 / 状态点 / pill ─────────────────────────────────────────────── */

function gcAvatarLetter(name) {
  const value = gcStr(name).trim()
  if (!value) return '?'
  const first = Array.from(value)[0]
  return first ? first.toUpperCase() : '?'
}

function GcAvatar(props) {
  const kind = props.kind || 'teammate'
  const size = props.size || 32
  return h(
    'span',
    {
      className: 'gc-avatar',
      'data-kind': kind,
      'data-size': String(size),
      'aria-hidden': 'true',
      title: props.title || undefined
    },
    gcAvatarLetter(props.name)
  )
}

function GcStatusDot(props) {
  const state = props.state || 'unknown'
  return h('span', { className: 'gc-dot', 'data-state': state, 'aria-hidden': 'true' })
}

function GcPill(props) {
  return h(
    'span',
    { className: 'gc-pill', 'data-status': props.status || 'pending' },
    props.label === undefined || props.label === null || props.label === '' ? props.status : props.label
  )
}

/* ── 富文本（Markdown-lite：段落 / 换行 / 行内代码 / 粗体 / @提及） ──── */

const GC_INLINE_TOKEN = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(@[0-9A-Za-z_\u4e00-\u9fa5.\-]+)/g

function gcRenderInline(text, options) {
  const opts = options || {}
  const mentionSet = opts.mentionSet || null
  const onMention = opts.onMention
  const out = []
  const value = gcStr(text)
  let last = 0
  let match = GC_INLINE_TOKEN.exec(value)
  let key = 0
  while (match) {
    if (match.index > last) out.push(value.slice(last, match.index))
    const token = match[0]
    if (token.charAt(0) === '`') {
      out.push(h('code', { key: 'c' + key }, token.slice(1, -1)))
    } else if (token.slice(0, 2) === '**') {
      out.push(h('strong', { key: 'b' + key }, token.slice(2, -2)))
    } else {
      const name = token.slice(1)
      const known = !mentionSet || mentionSet.has(name)
      if (known) {
        out.push(
          h(
            'span',
            {
              key: 'm' + key,
              className: 'gc-mention',
              'data-mention': name,
              'data-clickable': onMention ? 'true' : 'false',
              role: onMention ? 'button' : undefined,
              tabIndex: onMention ? 0 : undefined,
              onClick: onMention
                ? function (event) {
                    event.stopPropagation()
                    onMention(name)
                  }
                : undefined,
              onKeyDown: onMention
                ? function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onMention(name)
                    }
                  }
                : undefined
            },
            token
          )
        )
      } else {
        out.push(token)
      }
    }
    last = match.index + token.length
    key += 1
    match = GC_INLINE_TOKEN.exec(value)
  }
  if (last < value.length) out.push(value.slice(last))
  return out.length > 0 ? out : [value]
}

function GcRichText(props) {
  const text = gcStr(props.text)
  const blocks = text.split(/\n{2,}/)
  const nodes = []
  for (let i = 0; i < blocks.length; i += 1) {
    const lines = blocks[i].split('\n')
    const children = []
    for (let j = 0; j < lines.length; j += 1) {
      if (j > 0) children.push(h('br', { key: 'br' + i + '-' + j }))
      const inline = gcRenderInline(lines[j], {
        mentionSet: props.mentionSet,
        onMention: props.onMention
      })
      for (let k = 0; k < inline.length; k += 1) children.push(inline[k])
    }
    nodes.push(h('p', { key: 'p' + i }, children))
  }
  return h(Fragment, null, nodes)
}

/* ── SenderLine ───────────────────────────────────────────────────────── */

function gcRoleLabel(kind, t) {
  const key = GC_ROLE_LABEL_KEY[kind] || 'member.roleFallback'
  return t(key)
}

function gcStatusText(status, t) {
  if (!status || status === 'unknown') return ''
  const key = 'status.' + status
  const text = t(key)
  return text === key ? '' : text
}

function GcSenderLine(props) {
  const sender = props.sender || {}
  const t = props.t
  const line = [
    h('span', { key: 'name', className: 'gc-sender-name' }, props.name || sender.name || t('member.roleFallback'))
  ]
  if (props.parentName) {
    line.push(h('span', { key: 'parent', className: 'gc-sender-sub' }, t('member.subagentOf', { parent: props.parentName })))
  }
  if (props.statusText) {
    line.push(
      h(
        'span',
        { key: 'status', className: 'gc-sender-status' },
        h(GcStatusDot, { state: props.statusState || 'unknown' }),
        props.statusText
      )
    )
  }
  if (props.roleLabel) {
    line.push(h('span', { key: 'role', className: 'gc-sender-role' }, props.roleLabel))
  }
  if (props.time) {
    line.push(h('span', { key: 'time', className: 'gc-sender-time' }, props.time))
  }
  return h('div', { className: 'gc-sender', 'data-card': props.card ? 'true' : 'false' }, line)
}

/** SenderLine 与内容同列时的外层（头像 + 右侧内容块）。 */
function GcRowShell(props) {
  return h(
    'div',
    {
      className: 'gc-row',
      'data-self': props.self ? 'true' : 'false',
      'data-tight': props.tight ? 'true' : 'false',
      'data-kind': props.kind,
      'data-message-id': props.messageId,
      'data-status': props.status,
      'data-member-kind': props.memberKind,
      'data-parent': props.parent,
      role: 'article',
      'aria-label': props.ariaLabel
    },
    props.children
  )
}

function GcBubble(props) {
  const failedState = props.state === 'failed' || props.state === 'partial'
  const debug = failedState && props.debug ? props.debug : null
  return h(
    'div',
    {
      className: 'gc-bubble',
      'data-testid': 'group-chat-bubble',
      'data-self': props.self ? 'true' : 'false',
      'data-state': props.state || undefined,
      // 临时诊断（F-06）：失败气泡可被 AX/截图读取的真实 reason/code/status/message
      'data-send-debug': debug
        ? (function () {
            try {
              return JSON.stringify(debug)
            } catch {
              return undefined
            }
          })()
        : undefined
    },
    props.children
  )
}

/* ── 气泡下说明行 / 折叠 / 行操作 ────────────────────────────────────── */

function GcCaption(props) {
  const model = props.model
  if (!model) return null
  const children = [h('span', { key: 'text' }, model.text)]
  const actions = gcAsArray(model.actions)
  for (let i = 0; i < actions.length; i += 1) {
    if (i === 0) children.push(h('span', { key: 'sep', className: 'gc-caption-sep' }, '·'))
    children.push(
      h(
        'button',
        {
          key: actions[i].id,
          type: 'button',
          className: 'gc-link gc-caption-action',
          'data-action': actions[i].id,
          onClick: function (event) {
            event.preventDefault()
            if (props.onAction) props.onAction(actions[i].id)
          }
        },
        actions[i].label
      )
    )
  }
  return h(
    'div',
    {
      className: 'gc-caption',
      'data-testid': 'group-chat-bubble-caption',
      'data-tone': model.tone === 'error' ? 'error' : model.tone === 'muted' ? 'muted' : 'normal'
    },
    children
  )
}

function GcFoldMeta(props) {
  const t = props.t
  const decision = props.decision
  const expanded = !!props.expanded
  return h(
    'div',
    { className: 'gc-fold-meta' },
    h('span', null, t('msg.foldMeta', {
      n: decision.chars,
      state: expanded
        ? t('msg.foldStateExpanded', { lines: decision.lines })
        : t('msg.foldStateFolded', { lines: Math.min(decision.lines, 8) })
    })),
    h(
      'button',
      {
        type: 'button',
        className: 'gc-fold-toggle',
        'data-testid': 'group-chat-fold-toggle',
        'aria-expanded': expanded ? 'true' : 'false',
        onClick: function (event) {
          event.preventDefault()
          if (props.onToggle) props.onToggle()
        }
      },
      expanded ? t('msg.collapse') : t('msg.expandAll', { n: decision.chars })
    )
  )
}

function GcRowActions(props) {
  const t = props.t
  const actions = []
  actions.push(
    h(
      'button',
      {
        key: 'copy',
        type: 'button',
        className: 'gc-row-action',
        'data-action': 'copy',
        onClick: function (event) {
          event.preventDefault()
          if (props.onCopy) props.onCopy()
        }
      },
      t('msg.copy')
    )
  )
  if (props.onOpen) {
    actions.push(
      h(
        'button',
        {
          key: 'open',
          type: 'button',
          className: 'gc-row-action',
          'data-action': 'open-session',
          onClick: function (event) {
            event.preventDefault()
            props.onOpen()
          }
        },
        t('msg.openSession')
      )
    )
  }
  return h('div', { className: 'gc-row-actions', 'aria-label': t('msg.reactions') }, actions)
}

function GcToast(props) {
  if (!props.text) return null
  return h('div', { className: 'gc-toast', role: 'status', 'aria-live': 'polite' }, props.text)
}
