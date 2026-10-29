/* ──────────────────────────────────────────────────────────────────────────
 * 40-cards.part.js — 卡片消息（M8 成员加入 / M9 任务卡）
 *
 * 结构约束（架构 §6.2 / §6.5 / §6.5.2）：
 *  - M8 = creator 的 SenderLine + 卡片 body（不是孤立卡片）
 *  - M9 = 操作者(actor) 的 SenderLine + 任务卡 body；紧凑版用于密集流
 *  - 卡片不参与长文折叠；卡片内字段空值隐藏整行（不留「未知」）
 *  - 颜色/尺寸全走 CSS 类（颜色 token 在 group-chat.css）
 * ────────────────────────────────────────────────────────────────────────── */

const GC_TASK_ACTION_KEY = {
  create: 'task.action.create',
  claim: 'task.action.claim',
  complete: 'task.action.complete',
  reopen: 'task.action.reopen',
  reassign: 'task.action.reassign',
  edit: 'task.action.edit',
  set_dependencies: 'task.action.setDependencies',
  delete: 'task.action.delete',
  release: 'task.action.release'
}

const GC_TASK_STATE_KEY = {
  pending: 'task.state.pending',
  in_progress: 'task.state.inProgress',
  completed: 'task.state.completed',
  deleted: 'task.state.cancelled'
}

function gcTaskActionLabel(payload, t) {
  const key = GC_TASK_ACTION_KEY[payload && payload.action]
  if (key) {
    const text = t(key)
    if (text !== key) return text
  }
  return gcStr(payload && payload.actionLabel) || gcStr(payload && payload.action) || ''
}

function gcTaskStatusLabel(payload, t) {
  const status = gcStr(payload && payload.task && payload.task.status)
  const key = GC_TASK_STATE_KEY[status]
  if (key) {
    const text = t(key)
    if (text !== key) return text
  }
  return gcStr(payload && payload.statusLabel) || status
}

/** 成员卡上下文策略文案（V1.4-5 / D-D：按工具名 + mode 推导，provider 名永不直出）。 */
function gcMemberContextText(member, t) {
  if (!member) return ''
  const tool = gcStr(member.createTool)
  const policy = gcStr(member.contextPolicy)
  let key = ''
  if (tool === 'subagent') key = 'member.contextSubagent'
  else if (tool === 'subagent_fork') key = 'member.contextSubagentFork'
  else if (tool === 'spawn_teammate') key = policy === 'fork' ? 'member.contextForkLead' : 'member.contextFresh'
  else if (policy === 'fork') key = 'member.contextForkLead'
  else if (policy === 'fresh') key = 'member.contextFresh'
  if (!key) return ''
  let text = t(key)
  if (text === key) return ''
  if (gcStr(member.lifecycleMode) === 'one_shot') text += t('member.modeOneShot')
  return text
}

/** 成员卡模型文案（继承时 `{model}（继承 X）`；无模型整行隐藏）。 */
function gcMemberModelText(member, creatorName, t) {
  if (!member) return ''
  const model = gcStr(member.model)
  if (!model) return ''
  const inheritedFrom = gcStr(member.modelInheritedFrom)
  if (inheritedFrom) {
    if (inheritedFrom === 'lead') return t('member.modelInheritedLead', { model: model })
    return t('member.modelInheritedFrom', { model: model, parent: inheritedFrom })
  }
  if (gcStr(member.createTool) === 'spawn_teammate') return t('member.modelInheritedLead', { model: model })
  if (creatorName && (gcStr(member.createTool) === 'subagent' || gcStr(member.createTool) === 'subagent_fork')) {
    return t('member.modelInheritedFrom', { model: model, parent: creatorName })
  }
  return model
}

function GcFieldRow(props) {
  return h(
    'div',
    {
      className: 'gc-field-row',
      'data-field': props.field
    },
    h('span', { className: 'gc-field-label' }, props.label),
    h('span', { className: 'gc-field-value', 'data-mono': props.mono ? 'true' : undefined }, props.value)
  )
}

function GcTaskFieldRow(props) {
  return h(
    'div',
    {
      className: 'gc-task-field',
      'data-field': props.field
    },
    h('span', { className: 'gc-task-field-label' }, props.label),
    h('span', { className: 'gc-task-field-value' }, props.value)
  )
}

/* ── M8 成员加入消息 ─────────────────────────────────────────────────── */

function GcMemberJoinMessage(props) {
  const message = props.message
  const t = props.t
  const payload = message.memberCard || {}
  const member = payload.member || {}
  const sender = message.sender || {}
  const memberName = gcStr(member.name) || gcStr(member.sessionId).slice(0, 8)
  const creatorName = gcStr(sender.name) || 'lead'
  const creatorKind = sender.kind === 'lead' ? 'lead' : sender.kind || 'teammate'
  const actions = payload.actions || {}
  const expanded = !!props.expanded
  const promptExcerpt = gcStr(member.promptExcerpt)
  const modelText = gcMemberModelText(member, creatorName, t)
  const contextText = gcMemberContextText(member, t)
  const createTool = gcStr(member.createTool)
  const parentName = gcStr(member.parentName)
  const description = gcStr(member.description)

  const fields = []
  if (modelText) fields.push(h(GcFieldRow, { key: 'model', field: 'model', label: t('member.fieldModel'), value: modelText }))
  if (contextText) {
    fields.push(h(GcFieldRow, { key: 'context', field: 'context', label: t('member.fieldContext'), value: contextText }))
  }
  if (createTool && createTool !== 'unknown') {
    fields.push(
      h(GcFieldRow, {
        key: 'tool',
        field: 'create-tool',
        label: t('member.fieldCreateTool'),
        value: createTool,
        mono: true
      })
    )
  }
  if (parentName) {
    fields.push(h(GcFieldRow, { key: 'parent', field: 'parent', label: t('member.fieldParent'), value: parentName }))
  }

  const bodyChildren = [
    h('div', { key: 'title', className: 'gc-card-title' }, t('member.cardTitle', { name: memberName })),
    h(
      'p',
      {
        key: 'desc',
        className: 'gc-card-desc',
        'data-empty': description ? 'false' : 'true',
        'data-field': 'description'
      },
      description || t('member.noDesc')
    ),
    fields.length > 0 ? h('div', { key: 'fields', className: 'gc-card-fields' }, fields) : null
  ]

  if (promptExcerpt) {
    bodyChildren.push(
      h(
        'div',
        { key: 'task', className: 'gc-card-task-block', 'data-field': 'task' },
        h(
          'div',
          { className: 'gc-card-task-head' },
          h('span', { className: 'gc-card-task-label' }, t('member.initialTask')),
          h(
            'button',
            {
              type: 'button',
              className: 'gc-card-action',
              'data-action': 'expand-task',
              'data-state': 'enabled',
              style: { marginLeft: 'auto', fontSize: '11px', lineHeight: '16px' },
              'aria-expanded': expanded ? 'true' : 'false',
              onClick: function (event) {
                event.preventDefault()
                if (props.onAction) props.onAction('expand-task')
              }
            },
            expanded ? t('member.collapseTask') : t('member.expandTask')
          )
        ),
        h(
          'p',
          {
            className: 'gc-card-task-body',
            'data-clamped': expanded ? 'false' : 'true'
          },
          expanded ? gcStr(member.promptFull) || promptExcerpt : promptExcerpt
        )
      )
    )
  }

  const viewSessionDisabled = actions.viewSession === 'disabled'
  const actionNodes = [
    h(
      'button',
      {
        key: 'view-session',
        type: 'button',
        className: 'gc-card-action',
        'data-action': 'view-session',
        'data-state': viewSessionDisabled ? 'disabled' : 'enabled',
        disabled: viewSessionDisabled,
        title: viewSessionDisabled ? t('member.noPermission') : t('member.viewSession'),
        onClick: function (event) {
          event.preventDefault()
          if (!viewSessionDisabled && props.onAction) props.onAction('view-session')
        }
      },
      t('member.viewSession')
    )
  ]
  if (gcStr(member.kind) === 'teammate' || actions.viewTask) {
    const viewTaskDisabled = actions.viewTask === 'disabled'
    actionNodes.push(
      h(
        'button',
        {
          key: 'view-task',
          type: 'button',
          className: 'gc-card-action',
          'data-tone': 'secondary',
          'data-action': 'view-task',
          'data-state': viewTaskDisabled ? 'disabled' : 'enabled',
          disabled: viewTaskDisabled,
          onClick: function (event) {
            event.preventDefault()
            if (!viewTaskDisabled && props.onAction) props.onAction('view-task')
          }
        },
        t('member.viewTask')
      )
    )
  }
  bodyChildren.push(h('div', { key: 'actions', className: 'gc-card-actions' }, actionNodes))

  return h(
    'div',
    {
      className: 'gc-card-row',
      'data-kind': 'member_card',
      'data-message-id': message.id,
      'data-sender': creatorName,
      'data-member-id': gcStr(member.sessionId),
      'data-member-kind': gcStr(member.kind) || 'teammate',
      'data-member-state': gcStr(member.state) || 'active',
      'data-parent': parentName || undefined,
      'data-creation-id': gcStr(message.creationId),
      'data-pair-order': String(typeof message.pairOrder === 'number' ? message.pairOrder : 1),
      role: 'article',
      'aria-label': t('member.cardTitle', { name: memberName })
    },
    h(GcAvatar, { name: creatorName, kind: creatorKind, size: 32 }),
    h(
      'div',
      { className: 'gc-row-main' },
      h(GcSenderLine, {
        t: t,
        sender: sender,
        name: creatorName,
        kind: creatorKind,
        roleLabel: gcRoleLabel(creatorKind, t),
        time: gcMessageTimeText(payload.time || message.time),
        card: true
      }),
      h(
        'div',
        {
          className: 'gc-card',
          'data-card': 'member-join',
          'data-testid': 'group-chat-member-card'
        },
        bodyChildren
      )
    )
  )
}

/* ── M9 任务卡 ───────────────────────────────────────────────────────── */

function gcTaskOwnerText(task, payload, t) {
  const ownerName = gcStr(task.ownerName) || gcStr(task.ownerId)
  if (ownerName) return ownerName
  const actorKind = gcStr(payload && payload.actor && payload.actor.kind)
  if (actorKind === 'system') return t('task.actorSystem')
  return t('task.unassigned')
}

function gcTaskBlockedByText(task, t) {
  const names = gcAsArray(task && task.blockedBy)
  if (names.length === 0) return ''
  return gcJoinNames(names)
}

function GcTaskCardMessage(props) {
  const message = props.message
  const t = props.t
  const payload = message.taskCard || {}
  const task = payload.task || {}
  const actor = payload.actor || message.sender || {}
  const actorName = gcStr(actor.name) || t('task.actorSystem')
  const actorKind = actor.kind === 'lead' || actor.kind === 'teammate' || actor.kind === 'subagent' ? actor.kind : 'lead'
  const actionLabel = gcTaskActionLabel(payload, t)
  const statusLabel = gcTaskStatusLabel(payload, t)
  const status = gcStr(task.status) || 'pending'
  const expanded = !!props.expanded
  const compact = !!payload.compact
  const description = gcStr(task.description)
  const requirements = gcStr(task.requirements || payload.requirements)
  const acceptance = gcStr(task.acceptance || payload.acceptance)
  const ownerRole = gcStr(task.ownerRole || payload.ownerRole)
  const ownerName = gcStr(task.ownerName) || gcStr(task.ownerId)
  const ownerText = ownerName || t('task.ownerUnassigned')
  const blockedBy = gcAsArray(task.blockedBy)
  const blockedText = blockedBy.length > 0 ? t('task.blockedByList', { list: gcJoinNames(blockedBy) }) : t('task.noBlockedBy')
  const timeText = gcMessageTimeText(payload.time || message.time)
  const taskId = gcStr(task.id) || gcStr(payload.id)

  // 默认折叠时只显示：目标（subject）/任务 ID/状态/负责人/依赖/完成时间
  const fields = [
    h(
      'div',
      { key: 'owner', className: 'gc-task-field', 'data-field': 'owner' },
      h('span', { className: 'gc-task-field-label' }, t('task.owner')),
      h(
        'span',
        { className: 'gc-task-field-value', 'data-owner-role': ownerRole || undefined },
        ownerText,
        ownerRole
          ? h('span', { className: 'gc-task-owner-role' }, ' · ' + ownerRole)
          : null
      )
    ),
    h(
      'div',
      { key: 'blocked', className: 'gc-task-field', 'data-field': 'blocked-by' },
      h('span', { className: 'gc-task-field-label' }, t('task.blockedBy')),
      h('span', { className: 'gc-task-field-value' }, blockedText)
    )
  ]
  if (status === 'completed') {
    fields.push(
      h(
        'div',
        { key: 'completion', className: 'gc-task-field', 'data-field': 'completion-time' },
        h('span', { className: 'gc-task-field-label' }, t('task.completionTime')),
        h('span', { className: 'gc-task-field-value' }, timeText)
      )
    )
  }

  const detailEntries = []
  if (description) detailEntries.push({ field: 'description', text: description })
  if (requirements) detailEntries.push({ field: 'requirements', text: requirements })
  if (acceptance) detailEntries.push({ field: 'acceptance', text: acceptance })
  const hasDetails = detailEntries.length > 0
  const detailNodes =
    expanded && hasDetails
      ? h(
          'div',
          { key: 'details', className: 'gc-task-details' },
          detailEntries.map(function (entry) {
            return h(
              'div',
              { key: entry.field, className: 'gc-task-detail-block', 'data-field': entry.field },
              h('span', { className: 'gc-task-detail-label' }, t('task.field.' + entry.field)),
              h('p', { className: 'gc-task-desc' }, entry.text)
            )
          })
        )
      : null

  const actions = []
  if (hasDetails) {
    actions.push(
      h(
        'button',
        {
          key: 'expand',
        type: 'button',
        className: 'gc-card-action',
        'data-action': 'expand-task',
        'data-state': 'enabled',
        'aria-expanded': expanded ? 'true' : 'false',
        disabled: !hasDetails,
        'aria-expanded': expanded ? 'true' : 'false',
        onClick: function (event) {
          event.preventDefault()
          if (hasDetails && props.onAction) props.onAction('expand-task')
        }
      },
        expanded ? t('task.collapse') : t('task.expand')
      )
    )
  }
  actions.push(
    h(GcRowActions, {
      key: 'icon-actions',
      t: t,
      onCopy: function () {
        if (props.onCopyMessage) props.onCopyMessage(message)
      },
      onOpen: function () {
        if (props.onOpenSession) props.onOpenSession(message)
      }
    })
  )

  const card = h(
    'div',
    {
      className: 'gc-card',
      'data-card': 'task',
      'data-card-accent': status,
      'data-compact': compact ? 'true' : 'false',
      'data-task-expanded': expanded ? 'true' : 'false', 'data-task-collapsed': expanded ? 'false' : 'true'
    },
    h(
      'div',
      { className: 'gc-task-head' },
      h('span', { className: 'gc-task-icon', 'aria-hidden': 'true' }, h(GcIconTasks, { size: 16 })),
      h('span', { className: 'gc-task-action' }, actionLabel),
      h(GcPill, { status: status, label: statusLabel }),
      h('span', { className: 'gc-task-id', title: taskId }, taskId)
    ),
    h('h3', { className: 'gc-task-title', title: gcStr(task.subject) }, gcStr(task.subject)),
    detailNodes,
    h('div', { className: 'gc-task-fields' }, fields),
    h('div', { className: 'gc-task-actions' }, actions)
  )

  const rowAttrs = {
    className: 'gc-card-row',
    'data-kind': 'task_card',
    'data-message-id': message.id,
    'data-card': 'task',
    'data-card-accent': status,
    'data-sender': actorName,
    'data-task-id': taskId,
    'data-task-revision': String(task.revision === undefined ? '' : task.revision),
    'data-task-action': gcStr(payload.action),
    'data-task-status': status,
    'data-task-owner': ownerName,
    'data-task-actor': actorName,
    'data-task-blocked-by': blockedBy.join(','),
    'data-replay': payload.replay ? 'true' : 'false',
    'data-task-expanded': expanded ? 'true' : 'false', 'data-task-collapsed': expanded ? 'false' : 'true',
    role: 'article',
    'aria-label': t('a11y.taskCard', { action: actionLabel, id: taskId })
  }

  // F35：人物一致 —— 外层 sender = 操作者（唯一头像 + 名字），卡内不再重复头像/名字
  return h(
    'div',
    rowAttrs,
    h(
      'span',
      { className: 'gc-card-avatar-wrap', 'data-card-avatar': 'true' },
      h(GcAvatar, { name: actorName, kind: actorKind, size: compact ? 24 : 32 })
    ),
    h(
      'div',
      { className: 'gc-row-main' },
      h(GcSenderLine, {
        t: t,
        sender: actor,
        name: actorName,
        kind: actorKind,
        roleLabel: gcRoleLabel(actorKind, t),
        time: timeText,
        card: true
      }),
      card
    )
  )
}
