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

function GcIconCopy(props) {
  const size = (props && props.size) || 14
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('rect', { x: 5.5, y: 2.5, width: 8, height: 9, rx: 1.6, stroke: 'currentColor', strokeWidth: 1.2 }),
    h('path', { d: 'M10.5 13.5v.4a1.1 1.1 0 0 1-1.1 1.1H3.1A1.1 1.1 0 0 1 2 13.9V6.1A1.1 1.1 0 0 1 3.1 5h.4', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' })
  )
}

function GcIconExternal(props) {
  const size = (props && props.size) || 14
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('path', { d: 'M6.5 3.5H3.9A1.4 1.4 0 0 0 2.5 4.9v7.2a1.4 1.4 0 0 0 1.4 1.4h7.2a1.4 1.4 0 0 0 1.4-1.4V9.5', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' }),
    h('path', { d: 'M9.5 2.5h4v4M13.2 2.8 7.6 8.4', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' })
  )
}

function GcIconTasks(props) {
  const size = (props && props.size) || 16
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('rect', { x: 2.5, y: 2.5, width: 11, height: 11, rx: 2, stroke: 'currentColor', strokeWidth: 1.2 }),
    h('path', { d: 'M5 8.2l2 2 4-4', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' })
  )
}

function GcIconClose(props) {
  const size = (props && props.size) || 14
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('path', { d: 'M3.5 3.5l9 9M12.5 3.5l-9 9', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' })
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

/* ── Markdown 受控渲染（F22 / §6.12；禁止 innerHTML） ─────────────────── */

function gcSplitMentions(value, mentionSet, onMention) {
  const text = gcStr(value)
  if (!text) return []
  const re = /(@[0-9A-Za-z_\u4e00-\u9fa5.\-]+)/g
  const out = []
  let last = 0
  let match = re.exec(text)
  let key = 0
  while (match) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    const name = token.slice(1)
    if (!mentionSet || mentionSet.has(name)) {
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
              : undefined
          },
          token
        )
      )
    } else out.push(token)
    last = match.index + token.length
    key += 1
    match = re.exec(text)
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function gcMarkdownMod() {
  return gcCore('markdown')
}

/** 链接安全（防御纵深）：core 已过滤一次，渲染端再校验 scheme。 */
function gcIsSafeLinkUrl(url) {
  const value = gcStr(url).trim()
  if (!value) return false
  const mod = gcMarkdownMod()
  if (mod && typeof mod.isSafeUrl === 'function') {
    try {
      return !!mod.isSafeUrl(value)
    } catch {}
  }
  return /^(https?:|mailto:)/i.test(value)
}

function gcRenderMdInline(children, options) {
  const list = gcAsArray(children)
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const node = list[i]
    if (!node) continue
    if (node.type === 'text') {
      const parts = gcSplitMentions(node.value, options.mentionSet, options.onMention)
      for (let j = 0; j < parts.length; j += 1) {
        if (typeof parts[j] === 'string') out.push(parts[j])
        else out.push(h(Fragment, { key: 'm' + i + '-' + j }, parts[j]))
      }
    } else if (node.type === 'strong') {
      out.push(h('strong', { key: 's' + i, className: 'gc-md-strong' }, gcRenderMdInline(node.children, options)))
    } else if (node.type === 'em') {
      out.push(h('em', { key: 'e' + i, className: 'gc-md-em' }, gcRenderMdInline(node.children, options)))
    } else if (node.type === 'code') {
      out.push(h('code', { key: 'c' + i, className: 'gc-md-code' }, gcStr(node.value)))
    } else if (node.type === 'link') {
      const url = gcStr(node.url)
      if (!gcIsSafeLinkUrl(url)) {
        // 渲染端二次校验失败 → 纯文本（不产生 <a>）
        out.push(h('span', { key: 'l' + i, className: 'gc-md-link-plain' }, gcRenderMdInline(node.children, options)))
      } else {
        out.push(
          h(
            'a',
            {
              key: 'l' + i,
              className: 'gc-md-link',
              href: url,
              target: '_blank',
              rel: 'noopener noreferrer',
              'data-md-link': 'true'
            },
            gcRenderMdInline(node.children, options)
          )
        )
      }
    } else if (node.type === 'break') {
      out.push(h('br', { key: 'b' + i }))
    } else if (typeof node.value === 'string') {
      out.push(node.value)
    }
  }
  return out
}

/**
 * F32：GFM 表格渲染（backend 冻结 AST：{type:'table', align[], header:Inline[][], rows:Inline[][][]}）。
 * 也兼容按行/单元格对象组织的变体；单元格内联走既有 inline 渲染（链接仍 isSafeUrl）。
 */
function gcRenderMdCellChildren(cell) {
  if (!cell) return []
  if (Array.isArray(cell)) return cell
  if (Array.isArray(cell.children)) return cell.children
  if (Array.isArray(cell.inline)) return cell.inline
  return [cell]
}

/**
 * F32/v1.7.2 表格渲染（AST：`header:{cells,align}` + `rows[][{children}]`）。
 * 兼容旧的 `header:Inline[][]` / `rows:Inline[][][]` 形态；DOM：data-md-table-wrap/table/th[data-align]/td[data-align]。
 */
function gcRenderMdTable(node, options, keyPrefix) {
  let headerCells = []
  let align = []
  let rows = []

  const header = node && node.header
  if (header && !Array.isArray(header) && Array.isArray(header.cells)) {
    headerCells = header.cells
    align = gcAsArray(header.align)
    rows = gcAsArray(node.rows)
  } else if (Array.isArray(header) && Array.isArray(node.rows)) {
    headerCells = header
    align = gcAsArray(node.align)
    rows = node.rows
  } else {
    // 兜底：按行对象（table_row/cells）组织
    const flattenRows = function (nodes) {
      const out = []
      const list = gcAsArray(nodes)
      for (let i = 0; i < list.length; i += 1) {
        const item = list[i]
        if (!item) continue
        if (item.type === 'thead' || item.type === 'tbody') {
          out.push.apply(out, flattenRows(item.children))
          continue
        }
        if (item.type === 'table_row' || Array.isArray(item.cells) || Array.isArray(item.children)) {
          out.push(gcAsArray(item.cells || item.children))
        }
      }
      return out
    }
    const allRows = flattenRows(node && node.children)
    headerCells = allRows[0] || []
    rows = allRows.slice(1)
  }

  const alignValue = function (index) {
    const value = align[index]
    return value === 'left' || value === 'center' || value === 'right' ? value : undefined
  }
  const alignStyle = function (index) {
    const value = alignValue(index)
    return value ? { textAlign: value } : undefined
  }

  const headRow = h(
    'tr',
    null,
    gcAsArray(headerCells).map(function (cell, index) {
      return h(
        'th',
        { key: 'th' + index, 'data-align': alignValue(index), style: alignStyle(index) },
        gcRenderMdInline(gcRenderMdCellChildren(cell), options)
      )
    })
  )
  const bodyRows = gcAsArray(rows).map(function (row, rowIndex) {
    return h(
      'tr',
      { key: 'tr' + rowIndex },
      gcAsArray(row).map(function (cell, cellIndex) {
        return h(
          'td',
          { key: 'td' + cellIndex, 'data-align': alignValue(cellIndex), style: alignStyle(cellIndex) },
          gcRenderMdInline(gcRenderMdCellChildren(cell), options)
        )
      })
    )
  })

  return h(
    'div',
    {
      key: keyPrefix,
      className: 'gc-md-table-wrap',
      'data-md-table-wrap': 'true',
      'data-md-truncated': node && node.truncated ? 'true' : undefined
    },
    h(
      'table',
      { className: 'gc-md-table', 'data-md-table': 'true' },
      h('thead', null, headRow),
      h('tbody', null, bodyRows)
    )
  )
}

function gcRenderMdBlocks(blocks, options) {
  const list = gcAsArray(blocks)
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const node = list[i]
    if (!node) continue
    if (node.type === 'paragraph') {
      out.push(h('p', { key: 'p' + i, className: 'gc-md-p' }, gcRenderMdInline(node.children, options)))
    } else if (node.type === 'code_block') {
      out.push(
        h(
          'pre',
          { key: 'pre' + i, className: 'gc-md-pre', 'data-lang': gcStr(node.lang) || undefined },
          h('code', null, gcStr(node.value))
        )
      )
    } else if (node.type === 'table') {
      out.push(gcRenderMdTable(node, options, 'table' + i))
    } else if (node.type === 'list') {
      const items = gcAsArray(node.items).map(function (item, itemIndex) {
        return h('li', { key: 'li' + i + '-' + itemIndex, className: 'gc-md-li' }, gcRenderMdBlocks(item.children, options))
      })
      out.push(
        h(
          node.ordered ? 'ol' : 'ul',
          { key: 'list' + i, className: 'gc-md-list', start: node.ordered && node.start ? node.start : undefined },
          items
        )
      )
    } else if (typeof node.value === 'string') {
      out.push(h('p', { key: 'raw' + i, className: 'gc-md-p' }, node.value))
    }
  }
  return out
}

/**
 * 气泡正文渲染：core/markdown 的受控 AST → React 节点（无 innerHTML）。
 * 模块缺失/解析异常 → `data-md="plain"` 的纯文本（保留换行）。
 */
function GcMarkdown(props) {
  const text = gcStr(props.text)
  const options = { mentionSet: props.mentionSet, onMention: props.onMention }
  const mod = gcMarkdownMod()
  if (mod && typeof mod.parseMarkdown === 'function') {
    try {
      const ast = mod.parseMarkdown(text)
      if (!ast || ast.plain === true) {
        return h('div', { className: 'gc-md', 'data-md': 'plain' }, gcSplitMentions(text, options.mentionSet, options.onMention))
      }
      return h(
        'div',
        {
          className: 'gc-md',
          'data-md': 'rich',
          'data-md-truncated': ast.truncated ? 'true' : undefined
        },
        gcRenderMdBlocks(ast.children, options)
      )
    } catch (error) {
      gcWarn('markdown render failed, plain fallback:', gcShortError(error))
    }
  }
  return h('div', { className: 'gc-md', 'data-md': 'plain' }, gcSplitMentions(text, options.mentionSet, options.onMention))
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
  const maxLines = decision.maxLines || 50
  const lineCount = decision.lines || 0
  return h(
    'div',
    { className: 'gc-fold-meta' },
    !expanded ? h('span', null, t('msg.foldMetaLines', { n: maxLines })) : null,
    h(
      'button',
      {
        type: 'button',
        className: 'gc-fold-toggle',
        'data-testid': 'group-chat-fold-toggle',
        'data-line-count': String(lineCount),
        'aria-expanded': expanded ? 'true' : 'false',
        onClick: function (event) {
          event.preventDefault()
          if (props.onToggle) props.onToggle()
        }
      },
      expanded ? t('msg.collapse') : t('msg.expandLines', { n: lineCount })
    )
  )
}

function GcRowActions(props) {
  const t = props.t
  const actions = [
    h(
      'button',
      {
        key: 'copy',
        type: 'button',
        className: 'gc-icon-action',
        'data-action': 'copy-message',
        'aria-label': t('msg.action.copy'),
        title: t('msg.action.copy'),
        onClick: function (event) {
          event.preventDefault()
          if (props.onCopy) props.onCopy()
        }
      },
      h(GcIconCopy, { size: 14 })
    )
  ]
  if (props.onOpen) {
    actions.push(
      h(
        'button',
        {
          key: 'open',
          type: 'button',
          className: 'gc-icon-action',
          'data-action': 'open-session',
          'aria-label': t('msg.action.openSession'),
          title: t('msg.action.openSession'),
          onClick: function (event) {
            event.preventDefault()
            props.onOpen()
          }
        },
        h(GcIconExternal, { size: 14 })
      )
    )
  }
  return h('div', { className: 'gc-row-actions', 'aria-label': t('msg.reactions') }, actions)
}

function GcToast(props) {
  if (!props.text) return null
  return h('div', { className: 'gc-toast', role: 'status', 'aria-live': 'polite' }, props.text)
}
