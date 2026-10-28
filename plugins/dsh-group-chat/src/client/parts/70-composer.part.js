/* ──────────────────────────────────────────────────────────────────────────
 * 70-composer.part.js — 输入区（目标行 / 文本输入 / @ 补全 / 发送键）
 *
 * v1 极简（UX PI-19）：只有「发给谁 + 说什么 + 发送」，不含附件/权限/模型控件。
 * 键盘：Enter 发送、Shift+Enter 换行；补全打开时 ↑↓ 移动、Enter/Tab 确认、Esc 关闭；
 * IME 组合输入期间不拦截按键（compositionstart/end）。
 * ────────────────────────────────────────────────────────────────────────── */

function gcTargetChipNames(draft, channel, sessionId) {
  const resolved = gcResolveTargets(draft, channel, sessionId)
  return resolved.targets.map(function (target) {
    return target.name
  })
}

function GcMentionPopup(props) {
  const t = props.t
  const options = gcAsArray(props.candidates)
  const active = typeof props.activeIndex === 'number' ? props.activeIndex : 0
  const nodes = []
  if (options.length === 0) {
    nodes.push(h('div', { key: 'empty', className: 'gc-mention-empty' }, t('mention.empty')))
  } else {
    for (let i = 0; i < options.length; i += 1) {
      const member = options[i]
      const kindText =
        member.kind === 'subagent' ? t('mention.sub.subagent') : member.kind === 'lead' ? t('mention.sub.lead') : t('mention.sub.teammate')
      const statusText = gcStatusText(member.status || 'unknown', t)
      const addressableNote = member.kind === 'teammate' && (member.status === 'inactive' || member.status === 'done') ? t('mention.sub.addressable') : ''
      const subParts = []
      if (member.parentName) subParts.push(t('member.subagentOf', { parent: member.parentName }))
      subParts.push(kindText)
      if (statusText) subParts.push(statusText)
      nodes.push(
        h(
          'li',
          {
            key: 'option-' + member.name,
            id: 'gc-mention-option-' + i,
            className: 'gc-mention-option',
            role: 'option',
            'data-mention': member.name,
            'aria-selected': i === active ? 'true' : 'false',
            onClick: function (event) {
              event.preventDefault()
              if (props.onSelect) props.onSelect(member.name)
            },
            onMouseEnter: function () {
              if (props.onHover) props.onHover(i)
            }
          },
          h(GcAvatar, { name: member.name, kind: member.kind, size: 24 }),
          h(
            'span',
            { className: 'gc-mention-option-main' },
            h('span', { className: 'gc-mention-option-name' }, member.name),
            h('span', { className: 'gc-mention-option-sub' }, subParts.filter(Boolean).join(' · ') + addressableNote)
          )
        )
      )
    }
  }
  return h(
    'div',
    {
      className: 'gc-mention-popup',
      'data-testid': 'group-chat-mention-popup',
      role: 'listbox',
      id: 'gc-mention-listbox',
      'aria-label': t('a11y.mention'),
      'aria-activedescendant': options.length > 0 ? 'gc-mention-option-' + active : undefined
    },
    h(
      'div',
      { className: 'gc-mention-head' },
      h('span', null, t('mention.header')),
      h('span', { className: 'gc-spacer' }),
      h('span', null, t('mention.hint'))
    ),
    h('ul', { className: 'gc-mention-list' }, nodes),
    h('div', { className: 'gc-mention-foot' }, t('mention.footer'))
  )
}

function GcTargetRow(props) {
  const t = props.t
  const draft = props.draft
  const channel = props.channel
  const names = gcTargetChipNames(draft, channel, props.sessionId)
  const mentions = gcAsArray(draft.mentions)
  const children = [h('span', { key: 'label', className: 'gc-target-label' }, t('composer.targetLabel'))]

  children.push(
    h(
      'span',
      { key: 'lead', className: 'gc-chip', 'data-tone': 'lead' },
      t('composer.leadChip')
    )
  )

  for (let i = 0; i < mentions.length; i += 1) {
    const name = mentions[i]
    children.push(
      h(
        'button',
        {
          key: 'mention-' + name,
          type: 'button',
          className: 'gc-chip',
          'data-tone': 'mention',
          'data-mention': name,
          title: t('composer.removeMention', { name: name }),
          onClick: function (event) {
            event.preventDefault()
            if (props.onRemoveMention) props.onRemoveMention(name)
          }
        },
        '@' + name
      )
    )
  }

  children.push(
    h(
      'span',
      { key: 'hint', className: 'gc-target-hint' },
      names.length > 1 ? t('composer.multi', { n: names.length }) : t('composer.toLeadHint')
    )
  )

  return h(
    'div',
    {
      className: 'gc-target-row',
      'data-testid': 'group-chat-target-row',
      'data-targets': names.join(',')
    },
    children
  )
}

function GcComposer(props) {
  const t = props.t
  const state = props.state
  const draft = state.draft || { text: '', mentions: [] }
  const readonly = !!props.readonly
  const mention = state.mention
  const busy = !!(state.send && state.send.inFlight)
  const canSend = !readonly && !busy && gcStr(draft.text).trim() !== ''
  const placeholder = readonly ? t('readonly.placeholder') : t('composer.placeholder')

  const popup = mention
    ? h(GcMentionPopup, {
        t: t,
        candidates: props.candidates,
        activeIndex: state.mentionIndex || 0,
        onSelect: props.onSelectMention,
        onHover: props.onHoverMention
      })
    : null

  function handleKeyDown(event) {
    const composition = props.compositionRef && props.compositionRef.current
    if (composition) return
    if (mention && event.key === 'Escape') {
      event.preventDefault()
      if (props.onCloseMention) props.onCloseMention()
      return
    }
    if (mention && props.candidates && props.candidates.length > 0) {
      const count = props.candidates.length
      const active = state.mentionIndex || 0
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (props.onMoveMention) props.onMoveMention((active + 1) % count)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (props.onMoveMention) props.onMoveMention((active - 1 + count) % count)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        if (props.onSelectMention) props.onSelectMention(props.candidates[active] && props.candidates[active].name)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        if (props.onCloseMention) props.onCloseMention()
        return
      }
    }
    if (event.key === 'Escape' && state.filterOpen && props.onCloseFilter) {
      event.preventDefault()
      props.onCloseFilter()
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend && props.onSend) props.onSend()
    }
  }

  function handleChange(event) {
    const value = event.target.value
    const caret = typeof event.target.selectionStart === 'number' ? event.target.selectionStart : value.length
    if (props.onTextChange) props.onTextChange(value, caret)
  }

  return h(
    'div',
    { className: 'gc-composer-area' },
    h(
      'div',
      {
        className: 'gc-composer',
        'data-testid': 'group-chat-composer',
        'data-focused': state.composerFocused ? 'true' : 'false',
        'data-readonly': readonly ? 'true' : 'false',
        'aria-disabled': readonly ? 'true' : undefined
      },
      popup,
      h(GcTargetRow, {
        t: t,
        draft: draft,
        channel: props.channel,
        sessionId: props.sessionId,
        onRemoveMention: props.onRemoveMention
      }),
      h(
        'div',
        { className: 'gc-input-row' },
        h('textarea', {
          className: 'gc-textarea',
          value: draft.text,
          placeholder: placeholder,
          rows: 1,
          'aria-label': t('a11y.send'),
          'aria-expanded': mention ? 'true' : 'false',
          'aria-controls': mention ? 'gc-mention-listbox' : undefined,
          role: 'combobox',
          'aria-autocomplete': 'list',
          disabled: readonly,
          onChange: handleChange,
          onKeyDown: handleKeyDown,
          onFocus: function () {
            if (props.onFocusChange) props.onFocusChange(true)
          },
          onBlur: function () {
            if (props.onFocusChange) props.onFocusChange(false)
          },
          onCompositionStart: function () {
            if (props.compositionRef) props.compositionRef.current = true
          },
          onCompositionEnd: function (event) {
            if (props.compositionRef) props.compositionRef.current = false
            if (props.onTextChange) props.onTextChange(event.target.value, event.target.selectionStart)
          },
          onClick: function (event) {
            if (props.onCaretChange) props.onCaretChange(event.target.selectionStart)
          }
        }),
        h(
          'button',
          {
            type: 'button',
            className: 'gc-send-btn',
            'data-testid': 'group-chat-send',
            'aria-label': t('composer.send'),
            disabled: !canSend,
            'aria-busy': busy ? 'true' : 'false',
            onClick: function (event) {
              event.preventDefault()
              if (canSend && props.onSend) props.onSend()
            }
          },
          h(GcIconSend, { size: 16 })
        )
      )
    )
  )
}
