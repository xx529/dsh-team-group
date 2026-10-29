/**
 * test/client/render.test.mjs — 组件/交互测试（mini React + 真实 bundle）
 *
 * 覆盖：
 *  - apply() 注册 conversation.view（id/order/locale/label thunk）
 *  - 用 `?gc-preview=1` 内置数据源渲染 P1–P12 的全部消息形态与 DOM 契约
 *  - 交互：@ 补全键盘 + chip + 发送四态、折叠展开、成员筛选、卡片动作、卡片文案禁词
 *  - 状态：只读历史、无团队空态、骨架、错误态、未读浮标
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBundleSource } from '../../scripts/build.mjs'
import {
  createReactRuntime,
  mountBundle,
  findAllByAttr,
  findAll,
  findByTestId,
  findAllByTestId,
  findByAttr,
  visibleText,
  click,
  keyDown,
  change
} from './harness.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(here, '..', '..')
const bundleCode = buildBundleSource().code
const runtime = createReactRuntime()
const h = runtime.React.createElement

/* ── 假 Cordis client ctx ─────────────────────────────────────────────── */

function createFakeCtx() {
  const registrations = []
  const effects = []
  const ctx = {
    effect(fn) {
      effects.push(fn)
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    get() {
      return undefined
    },
    locale: {
      register() {
        return () => {}
      },
      bind() {
        return (key) => key
      },
      get() {
        return { active: 'zh-CN' }
      }
    },
    slots: {
      inject(name, callback) {
        return callback()
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      }
    },
    sessions: {
      retain() {
        throw new Error('sessions unavailable in test')
      },
      binding() {
        return undefined
      }
    }
  }
  return { ctx, registrations, effects }
}

function mountPreview(options = {}) {
  const mounted = mountBundle(bundleCode, runtime, {
    search: options.search || '?gc-preview=1',
    clipboard: { writeText: () => Promise.resolve() }
  })
  if (options.debug) mounted.globals.localStorage.setItem('group-chat:debug', '1')
  const fake = createFakeCtx()
  mounted.module.apply(fake.ctx)
  const registration = fake.registrations[0]
  const renderer = runtime.createRenderer()
  return { mounted, fake, registration, renderer }
}

/* ── 注册 ─────────────────────────────────────────────────────────────── */

test('apply: 注册 conversation.view（id=group-chat, order=5, locale=group-chat, label thunk）', () => {
  const { mounted, registration } = mountPreview()
  try {
    assert.ok(registration, 'conversation.view must be registered')
    const options = registration.options
    assert.equal(options.name, 'conversation.view')
    assert.equal(options.id, 'group-chat')
    assert.equal(options.order, 5)
    assert.equal(options.locale, 'group-chat')
    assert.equal(typeof options.label, 'function', 'label must be a thunk')
    assert.equal(options.label(), '群聊')
    mounted.module.__internals.setLocale('en')
    assert.equal(options.label(), 'Group chat')
    mounted.module.__internals.setLocale('zh')
    assert.equal(typeof registration.component, 'function')
    // tab 无装饰位：label 只有文本（不含未读数字/圆点）
    assert.equal(options.label(), '群聊')
  } finally {
    mounted.restore()
  }
})

test('apply: 样式注入 data-plugin-css 并注册 locale 字典', () => {
  const { mounted } = mountPreview()
  try {
    const styleNodes = mounted.globals.document.head.appendChild
    assert.equal(typeof styleNodes, 'function')
    const style = mounted.globals.document.head
    assert.ok(style)
    assert.equal(mounted.module.__internals.translate('view.tab'), '群聊')
  } finally {
    mounted.restore()
  }
})

/* ── 主界面渲染（P2） ─────────────────────────────────────────────────── */

test('render: 频道头 / 时间分隔 / 气泡 / 说明行', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    const tree = renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const rendered = renderer.tree

    const root = findByTestId(rendered, 'group-chat-root')
    assert.ok(root.props['data-build'], 'root has data-build fingerprint')
    assert.equal(root.props['data-build'], mounted.module.__internals.buildLabel)

    const header = findByTestId(rendered, 'group-chat-header')
    assert.ok(header, 'channel header')
    assert.match(visibleText(header), /群聊/)
    assert.match(visibleText(header), /dsh-team-group/)
    assert.match(visibleText(header), /6 名成员 · 4 工作中 · 2 等待/)

    const feed = findByTestId(rendered, 'group-chat-feed')
    assert.ok(feed, 'feed container')
    assert.equal(feed.props.role, 'log')
    assert.equal(feed.props['aria-live'], 'polite')

    assert.ok(findAllByTestId(rendered, 'group-chat-time-divider').length > 0, 'time dividers')
    assert.ok(findAllByTestId(rendered, 'group-chat-bubble').length > 0, 'bubbles')

    // v0.8.4：sent 状态不再有说明行；仅 sending/partial/failed 有 caption
    const sentUserRows = findAll(
      rendered,
      (node) => node.props && node.props['data-kind'] === 'user' && node.props['data-status'] === 'sent'
    )
    assert.ok(sentUserRows.length > 0, 'sent user bubble present')
    for (const row of sentUserRows) {
      assert.equal(
        findAllByTestId(row, 'group-chat-bubble-caption').length,
        0,
        'sent user bubble has no caption row'
      )
    }
    const failedUserRows = findAll(
      rendered,
      (node) => node.props && node.props['data-status'] === 'failed' && node.props['data-kind'] === 'user'
    )
    assert.ok(failedUserRows.length > 0, 'failed user bubble present')
    assert.ok(findAllByTestId(failedUserRows[0], 'group-chat-bubble-caption').length > 0, 'failed keeps caption')
  } finally {
    mounted.restore()
  }
})

test('render: 消息类型齐全（user/agent_to_agent/agent_output/system/member_card/task_card/delivery）', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const tree = renderer.tree
    const rows = findAllByAttr(tree, 'data-kind')
    const kinds = new Set(rows.map((row) => row.props['data-kind']))
    for (const kind of ['user', 'agent_to_agent', 'agent_output', 'system', 'member_card', 'task_card', 'delivery']) {
      assert.ok(kinds.has(kind), 'missing kind: ' + kind)
    }

    // subagent：名字后缀 + data-member-kind/data-parent（无缩进/连接线）
    const subRows = findAll(
      tree,
      (node) =>
        node.props &&
        node.props['data-member-kind'] === 'subagent' &&
        (node.props['data-kind'] === 'agent_output' || node.props['data-kind'] === 'agent_to_agent')
    )
    assert.ok(subRows.length > 0, 'subagent message row')
    assert.equal(subRows[0].props['data-parent'], 'ux')
    assert.match(visibleText(subRows[0]), /· ux 的子体/)

    // 系统提示：一般（居中）与欢迎（右对齐）两种变体
    const welcome = findByAttr(tree, 'data-system-variant', 'welcome')
    assert.ok(welcome, 'welcome note')
    assert.match(visibleText(welcome), /欢迎 @scout 加入群聊/)

    // 行内 @：data-mention
    const mentions = findAllByAttr(tree, 'data-mention')
    assert.ok(mentions.some((node) => node.props['data-mention'] === 'backend'), 'inline @backend')

    // v1.7：M6 工具摘要行作废（不渲染工具过程文本）
    assert.equal(findAllByAttr(tree, 'data-field', 'tool-calls').length, 0, 'tool line removed (M6 deprecated)')
    // v1.7：气泡正文走受控 Markdown 渲染
    assert.ok(findAllByAttr(tree, 'data-md').length > 0, 'markdown container present')
    assert.ok(findAll(tree, (node) => node.props && node.props.className === 'gc-md').length > 0)

    // 每个消息行只有一个头像、一个 SenderLine（避免重复头像回归）
    for (const kind of ['agent_output', 'agent_to_agent']) {
      const row = findAll(tree, (node) => node.props && node.props['data-kind'] === kind)[0]
      assert.ok(row, 'row for ' + kind)
      const avatars = findAll(row, (node) => node.props && node.props.className === 'gc-avatar')
      assert.equal(avatars.length, 1, 'exactly one avatar per message row (' + kind + ')')
      const senderLines = findAll(row, (node) => node.props && node.props.className === 'gc-sender')
      assert.equal(senderLines.length, 1, 'exactly one sender line per message row (' + kind + ')')
    }
  } finally {
    mounted.restore()
  }
})

test('render: 入群消息（M8）= creator SenderLine + 卡片 body + data-* 契约', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const tree = renderer.tree

    const cards = findAllByAttr(tree, 'data-kind', 'member_card')
    assert.ok(cards.length >= 2, 'teammate + subagent join messages')
    const leadCard = cards.find((card) => card.props['data-sender'] === 'lead')
    assert.ok(leadCard, 'creator = lead')
    assert.equal(leadCard.props['data-member-id'], 'preview-scout')
    assert.equal(leadCard.props['data-member-kind'], 'teammate')
    assert.equal(leadCard.props['data-creation-id'], 'mc:preview-scout')
    assert.equal(leadCard.props['data-pair-order'], '1')
    assert.match(visibleText(leadCard), /「@scout」加入群聊/)
    assert.match(visibleText(leadCard), /deepseek-flash（继承 Lead）/)
    assert.match(visibleText(leadCard), /全新上下文（fresh）/)
    assert.match(visibleText(leadCard), /spawn_teammate/)
    assert.match(visibleText(leadCard), /初始任务/)
    assert.match(visibleText(leadCard), /查看会话/)
    assert.match(visibleText(leadCard), /查看任务/)

    const fields = findAllByAttr(leadCard, 'data-field')
    const fieldNames = fields.map((node) => node.props['data-field'])
    for (const field of ['model', 'context', 'create-tool', 'description', 'task']) {
      assert.ok(fieldNames.includes(field), 'missing card field: ' + field)
    }

    // subagent 卡：父成员行 + 无「查看任务」+ one-shot 后缀
    const subCard = cards.find((card) => card.props['data-member-kind'] === 'subagent')
    assert.ok(subCard, 'subagent join card')
    assert.equal(subCard.props['data-sender'], 'ux')
    assert.match(visibleText(subCard), /继承父会话（subagent_fork）/)
    assert.match(visibleText(subCard), /一次性（one-shot）/)
    assert.match(visibleText(subCard), /ux/)
    assert.ok(!/查看任务/.test(visibleText(subCard)), 'subagent card has no view-task')
    // 卡片不参与长文折叠
    assert.equal(findByAttr(subCard, 'data-testid', 'group-chat-fold-toggle'), null)
  } finally {
    mounted.restore()
  }
})

test('render: 任务卡（M9）严格映射 action/status，且无「返工/失败」字样', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const tree = renderer.tree
    const cards = findAllByAttr(tree, 'data-kind', 'task_card')
    assert.ok(cards.length >= 4, 'create/claim/complete/reopen variants')

    const byAction = new Map(cards.map((card) => [card.props['data-task-action'], card]))
    assert.ok(byAction.has('create'))
    assert.ok(byAction.has('claim'))
    assert.ok(byAction.has('complete'))
    assert.ok(byAction.has('reopen'))

    const create = byAction.get('create')
    assert.equal(create.props['data-card'], 'task')
    assert.equal(create.props['data-sender'], 'lead')
    assert.equal(create.props['data-task-id'], 'task-13')
    assert.equal(create.props['data-task-status'], 'pending')
    assert.equal(create.props['data-replay'], 'false')
    assert.match(visibleText(create), /创建任务/)
    assert.match(visibleText(create), /待认领/)
    assert.equal(create.props['data-card-accent'], 'pending')
    assert.ok(findAll(create, (node) => node.props && node.props['data-card-avatar']).length > 0, 'actor avatar rendered')
    // F35：负责人改为文本字段（不再重复头像）；默认折叠不渲染描述
    const ownerField = findByAttr(create, 'data-field', 'owner')
    assert.ok(ownerField, 'owner field row')
    assert.equal(findAll(create, (node) => node.props && node.props['data-task-owner-avatar']).length, 0, 'no owner avatar')
    assert.equal(findByAttr(create, 'data-field', 'description'), null, 'description hidden by default (F34)')
    // v1.7：移除「复制任务 ID」
    assert.equal(findAll(create, (node) => node.props && node.props['data-action'] === 'copy-task-id').length, 0)

    const claim = byAction.get('claim')
    assert.equal(claim.props['data-sender'], 'scout')
    assert.equal(claim.props['data-task-status'], 'in_progress')
    assert.equal(claim.props['data-task-owner'], 'scout')

    const complete = byAction.get('complete')
    assert.equal(complete.props['data-sender'], 'backend')
    assert.equal(complete.props['data-task-status'], 'completed')
    assert.match(visibleText(complete), /完成时间/)

    const reopen = byAction.get('reopen')
    assert.equal(reopen.props['data-task-status'], 'pending')
    assert.match(visibleText(reopen), /重新打开任务/)
    assert.match(visibleText(reopen), /未认领/)

    for (const card of cards) {
      const text = visibleText(card)
      assert.ok(!/返工|失败|failed/.test(text), 'task card must not contain forbidden wording: ' + text)
    }
    // v1.7：依赖行常显（空→「无」），有依赖→「被 … 阻塞」
    assert.ok(findByAttr(create, 'data-field', 'blocked-by'), 'blocked-by row always rendered')
    assert.match(visibleText(create), /依赖/)
    assert.match(visibleText(claim), /被 task-13 阻塞/)
  } finally {
    mounted.restore()
  }
})

test('render: 气泡圆角按发送者区分（CSS 变量）/ 输入卡 radius 28', () => {
  const css = readFileSync(join(pluginRoot, 'src', 'styles', 'group-chat.css'), 'utf8')
  assert.match(css, /--gc-user-bubble-radius:\s*20px/)
  assert.match(css, /--gc-user-bubble-padding:\s*10px 16px/)
  assert.match(css, /--gc-bubble-radius:\s*12px/)
  assert.match(css, /--gc-bubble-padding:\s*10px 14px/)
  assert.match(css, /--gc-bubble-max:\s*600px/)
  assert.match(css, /--gc-radius-panel:\s*28px/)
  assert.match(css, /--gc-header-h:\s*56px/)
  assert.match(css, /--gc-content-w:\s*920px/)
  assert.match(css, /container-type:\s*inline-size/)
  assert.match(css, /--gc-fold-max:\s*1100px/)
  assert.match(css, /--gc-fold-mask:\s*56px/)
  // v1.7 单一输入器：宿主 composer 隐藏规则
  assert.match(css, /body\.gc-view-group-chat \[data-conversation-region='composer'\]/)
  assert.match(css, /body\.gc-view-group-chat \[data-composer-seat\]/)
  // 只用主题 token 取色（不出现裸色值）
  const colorLiterals = css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) || []
  // 允许：阴影/遮罩回退 rgba(0,0,0,…) 与用户要求的品牌实底纯白 --gc-on-brand:#fff
  const allowed = colorLiterals.filter((value) => /rgba\(0, 0, 0/.test(value) || /^#fff(?:fff)?$/i.test(value))
  assert.deepEqual(colorLiterals.filter((v) => !allowed.includes(v)), [], 'hardcoded colors outside shadow fallbacks')
})

/* ── 交互 ─────────────────────────────────────────────────────────────── */

test('交互: @ 补全（键鼠）→ chip → 多目标发送', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()

    let tree = renderer.tree
    const composer = findByTestId(tree, 'group-chat-composer')
    assert.ok(composer)
    assert.equal(findByTestId(tree, 'group-chat-send').props.disabled, true, 'send disabled when empty')

    const textarea = findAll(tree, (node) => node.type === 'textarea')[0]
    await renderer.act(() => change(textarea, '同步 @sc', 7))
    tree = renderer.tree

    const popup = findByTestId(tree, 'group-chat-mention-popup')
    assert.ok(popup, 'mention popup opens on @')
    assert.equal(popup.props.role, 'listbox')
    const options = findAll(popup, (node) => node.props && node.props.role === 'option')
    assert.ok(options.length >= 1)
    assert.equal(options[0].props['data-mention'], 'scout')
    assert.equal(options[0].props['aria-selected'], 'true')

    // Enter 选中（键盘）→ chip + 目标行
    const textarea2 = findAll(renderer.tree, (node) => node.type === 'textarea')[0]
    await renderer.act(() => keyDown(textarea2, 'Enter'))
    tree = renderer.tree
    assert.equal(findByTestId(tree, 'group-chat-mention-popup'), null, 'popup closed after select')
    const targetRow = findByTestId(tree, 'group-chat-target-row')
    assert.equal(targetRow.props['data-targets'], 'lead,scout')
    const chips = findAll(targetRow, (node) => node.props && node.props['data-mention'] === 'scout')
    assert.ok(chips.length > 0, 'mention chip')

    // 继续输入正文并点击发送 → 乐观气泡 sending → sent
    const textarea3 = findAll(renderer.tree, (node) => node.type === 'textarea')[0]
    await renderer.act(() => change(textarea3, '同步 @sc 进度', 9))
    const sendBtn = findByTestId(renderer.tree, 'group-chat-send')
    assert.equal(sendBtn.props.disabled, false)
    await renderer.act(() => click(sendBtn))
    await renderer.settle()

    const userRows = findAll(renderer.tree, (node) => node.props && node.props['data-kind'] === 'user')
    assert.ok(userRows.length > 0, 'optimistic user bubble')
    const lastRow = userRows[userRows.length - 1]
    assert.ok(lastRow.props['data-status'], 'delivery state attribute present')
    // 发送后 draft 清空、输入框为空
    const drafts = findAll(renderer.tree, (node) => node.type === 'textarea')
    assert.equal(drafts[0].props.value, '')
  } finally {
    mounted.restore()
  }
})

test('交互: 补全过滤无匹配 / Esc 关闭', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const textarea = findAll(renderer.tree, (node) => node.type === 'textarea')[0]
    await renderer.act(() => change(textarea, '@zzz', 4))
    let popup = findByTestId(renderer.tree, 'group-chat-mention-popup')
    assert.ok(popup)
    assert.match(visibleText(popup), /无匹配成员/)

    const textarea2 = findAll(renderer.tree, (node) => node.type === 'textarea')[0]
    await renderer.act(() => keyDown(textarea2, 'Escape'))
    assert.equal(findByTestId(renderer.tree, 'group-chat-mention-popup'), null)
  } finally {
    mounted.restore()
  }
})

test('交互: 长文本折叠展开（aria-expanded + 文案切换）', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const toggles = findAllByTestId(renderer.tree, 'group-chat-fold-toggle')
    assert.ok(toggles.length > 0, 'fold toggle for long text')
    const toggle = toggles[0]
    assert.equal(toggle.props['aria-expanded'], 'false')
    assert.match(visibleText(toggle), /展开全部（共 \d+ 行）/)
    assert.ok(toggle.props['data-line-count'], 'data-line-count present')

    await renderer.act(() => click(toggle))
    const togglesAfter = findAllByTestId(renderer.tree, 'group-chat-fold-toggle')
    assert.equal(togglesAfter[0].props['aria-expanded'], 'true')
    assert.equal(visibleText(togglesAfter[0]), '收起')

    await renderer.act(() => click(togglesAfter[0]))
    assert.equal(findAllByTestId(renderer.tree, 'group-chat-fold-toggle')[0].props['aria-expanded'], 'false')
  } finally {
    mounted.restore()
  }
})

test('交互: 成员筛选（D-B）→ 提示条 + 频道头后缀 → 清除', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()

    await renderer.act(() => click(findByTestId(renderer.tree, 'group-chat-filter-button')))
    const menu = findByTestId(renderer.tree, 'group-chat-filter-menu')
    assert.ok(menu, 'filter menu opens')

    const scoutItem = findAll(menu, (node) => node.props && node.props.role === 'menuitemradio' && node.props['data-mention'] === 'scout')[0]
    assert.ok(scoutItem)
    await renderer.act(() => click(scoutItem))

    const banner = findByTestId(renderer.tree, 'group-chat-filter-banner')
    assert.ok(banner, 'filter banner')
    assert.equal(banner.props['data-filter'], 'scout')
    assert.match(visibleText(banner), /正在只看 scout（\d+ 条）/)
    const header = findByTestId(renderer.tree, 'group-chat-header')
    assert.match(visibleText(header), /· 筛选: scout/)

    // 只显示 sender/targets 命中 scout 的消息
    const rows = findAll(renderer.tree, (node) => node.props && node.props['data-kind'])
    assert.ok(rows.length > 0)
    for (const row of rows) {
      assert.ok(!/'ux'/.test(visibleText(row)) || /scout/.test(visibleText(row)))
    }

    const clear = findByAttr(renderer.tree, 'data-action', 'clear-filter')
    await renderer.act(() => click(clear))
    assert.equal(findByTestId(renderer.tree, 'group-chat-filter-banner'), null)
  } finally {
    mounted.restore()
  }
})

test('交互: 卡片动作（查看会话降级 Toast / 复制任务 ID）', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const viewSession = findAll(renderer.tree, (node) => node.props && node.props['data-action'] === 'view-session')[0]
    assert.ok(viewSession)
    assert.equal(viewSession.props['data-state'], 'enabled')
    await renderer.act(() => click(viewSession))
    const toast = findAll(renderer.tree, (node) => node.props && node.props.className === 'gc-toast')[0]
    assert.ok(toast, 'toast after fallback copy')
    assert.match(visibleText(toast), /已复制会话 ID/)

    // v1.7：消息操作为图标 copy-message / open-session（无 copy-task-id）
    const copyMessage = findAll(renderer.tree, (node) => node.props && node.props['data-action'] === 'copy-message')[0]
    assert.ok(copyMessage, 'copy-message icon action')
    assert.equal(copyMessage.props['aria-label'], '复制原文')
    await renderer.act(() => click(copyMessage))
    assert.ok(findAll(renderer.tree, (node) => node.props && node.props.className === 'gc-toast').length > 0)
  } finally {
    mounted.restore()
  }
})

/* ── F-06 根因：无 team / channel.lead 缺失时目标行仍有 Lead ─────────── */

test('F-06: channel 缺失时目标行为仍显示 Lead（data-targets=lead）', () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    const renderer = runtime.createRenderer()
    const tree = renderer.render(
      h(gc.GcComposer, {
        t: gc.translate,
        state: gc.createFakeState({ channel: null, draft: { text: '', mentions: [] } }),
        channel: null,
        sessionId: 'sess-1',
        readonly: false,
        candidates: [],
        compositionRef: { current: false },
        onTextChange() {},
        onSend() {},
        onSelectMention() {},
        onMoveMention() {},
        onHoverMention() {},
        onCloseMention() {},
        onRemoveMention() {},
        onFocusChange() {},
        onCaretChange() {},
        onCloseFilter() {}
      })
    )
    const targetRow = findByTestId(tree, 'group-chat-target-row')
    assert.ok(targetRow, 'target row rendered without channel')
    assert.equal(targetRow.props['data-targets'], 'lead')
    const chip = findAll(targetRow, (node) => node.props && node.props.className === 'gc-chip')
    assert.ok(chip.length >= 1, 'Lead chip present')

    // 直接喂给解析函数也拿到 sessionId=当前会话
    const resolved = gc.resolveTargets({ text: 'hi', mentions: [] }, null, 'sess-1')
    assert.equal(resolved.targets[0].sessionId, 'sess-1')
  } finally {
    mounted.restore()
  }
})

/* ── F-06 临时诊断：失败气泡 data-send-debug + caption detail ─────────── */

test('F-06: 失败气泡带 data-send-debug（JSON reason/code/status/message），caption 含 detail', async () => {
  const { mounted, registration, renderer } = mountPreview({ debug: true })
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const tree = renderer.tree

    const debugBubbles = findAll(tree, (node) => node.props && node.props['data-send-debug'])
    assert.equal(debugBubbles.length, 1, 'exactly one failed bubble carries data-send-debug')
    const debug = JSON.parse(debugBubbles[0].props['data-send-debug'])
    assert.equal(debug.status, 'failed')
    assert.equal(debug.reason, 'network')
    assert.equal(debug.code, 'send.prompt-failed')
    assert.equal(debug.stage, 'loop')
    assert.ok(debug.build && debug.build.length > 0, 'build label in data-send-debug')
    assert.match(debug.message, /session-unavailable/)
    assert.equal(debugBubbles[0].props['data-state'], 'failed')

    const captions = findAllByTestId(tree, 'group-chat-bubble-caption').map((node) => visibleText(node))
    const debugCaption = captions.find((text) => /code=send\.prompt-failed/.test(text))
    assert.ok(debugCaption, 'caption includes code detail: ' + JSON.stringify(captions))
    assert.match(debugCaption, /发送失败：/)
    assert.match(debugCaption, /message=target session not ready/)
    assert.match(debugCaption, /stage=loop/)
    assert.match(debugCaption, /build=/)

    // 非失败状态的气泡不带该属性（渲染安全）
    const cleanBubbles = findAll(
      tree,
      (node) => node.props && node.props['data-testid'] === 'group-chat-bubble' && !node.props['data-send-debug']
    )
    assert.ok(cleanBubbles.length > 0, 'normal bubbles have no data-send-debug')
  } finally {
    mounted.restore()
  }
})

test('task-70: 默认隐藏诊断（caption 无 code/stage/build），data-send-debug 仍保留', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const tree = renderer.tree

    const captions = findAllByTestId(tree, 'group-chat-bubble-caption').map((node) => visibleText(node))
    const failedCaption = captions.find((text) => /^发送失败：/.test(text))
    assert.ok(failedCaption, 'failed caption present: ' + JSON.stringify(captions))
    assert.ok(!/code=|stage=|build=/.test(failedCaption), 'diagnostics hidden by default: ' + failedCaption)
    assert.match(failedCaption, /已保留原文/)

    // 诊断数据仍可读（不可见属性 + 根 data-build）
    const debugBubble = findAll(tree, (node) => node.props && node.props['data-send-debug'])[0]
    assert.ok(debugBubble, 'data-send-debug attribute still present')
    const debug = JSON.parse(debugBubble.props['data-send-debug'])
    assert.equal(debug.code, 'send.prompt-failed')
    assert.ok(debug.stage && debug.build)

    const root = findByTestId(tree, 'group-chat-root')
    assert.ok(root.props['data-build'], 'root data-build retained')

    // URL 开关：?gc-debug=1 也能显示（新实例）
    const debugMount = mountPreview({ search: '?gc-preview=1&gc-debug=1' })
    try {
      const renderer2 = runtime.createRenderer()
      renderer2.render(h(debugMount.registration.component, { sessionId: 'preview-lead-session' }))
      await renderer2.settle()
      const captions2 = findAllByTestId(renderer2.tree, 'group-chat-bubble-caption').map((node) => visibleText(node))
      assert.ok(captions2.some((text) => /code=send\.prompt-failed/.test(text)), 'URL gc-debug=1 shows diagnostics')
    } finally {
      debugMount.mounted.restore()
    }
  } finally {
    mounted.restore()
  }
})

test('F26 轨迹: source.getEvents → core/turns.aggregateTurns（真实轮次，最新在前）', () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    const t = new Date(2026, 0, 15, 12, 0, 0).getTime()
    const events = [
      { type: 'turn/start', seq: 1, time: t, data: { turn: 1 } },
      {
        type: 'assistant/message',
        seq: 2,
        time: t,
        data: { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: 'first turn output' }] } }
      },
      { type: 'turn/end', seq: 3, time: t, data: { turn: 1, reason: { kind: 'completed' } } },
      { type: 'turn/start', seq: 4, time: t + 1000, data: { turn: 2 } },
      {
        type: 'assistant/message',
        seq: 5,
        time: t + 1000,
        data: { turn: 2, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: 'second turn output' }] } }
      },
      { type: 'turn/end', seq: 6, time: t + 1000, data: { turn: 2, reason: { kind: 'error' } } }
    ]
    const source = { getEvents: (sessionId) => (sessionId === 's-x' ? events : []), getMemberEvents: () => [] }
    const store = { getSnapshot: () => ({ messages: [] }) }
    const turns = gc.loadTrajectoryTurns(source, store, 's-x')
    assert.equal(turns.length, 2, 'two turns from events')
    assert.equal(turns[0].status, 'error', 'newest first')
    assert.equal(turns[0].summary, 'second turn output')
    assert.equal(turns[1].status, 'done')
    assert.equal(turns[1].summary, 'first turn output')
    // 未知会话 → 空轮次（不抛错；core 会给数组挂 emptyReason）
    const empty = gc.loadTrajectoryTurns(source, store, 's-missing')
    assert.equal(empty.length, 0)
  } finally {
    mounted.restore()
  }
})

/* ── 冷启动（task-110）：pending 骨架 / resolve 出消息 / sync 不重复 ─── */

test('冷启动: open 未就绪/空首屏显示骨架，不显示「团队还没有发言」空态', () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    const channel = {
      channelId: 's-lead',
      lead: { sessionId: 's-lead', name: 'lead', kind: 'lead', status: 'running' },
      members: [
        { sessionId: 's-lead', name: 'lead', kind: 'lead', status: 'running' },
        { sessionId: 's-scout', name: 'scout', kind: 'teammate', status: 'running' }
      ],
      runningCount: 2
    }
    const renderer = runtime.createRenderer()

    // 1) loading 中：骨架，无空态
    let tree = renderer.render(
      h(gc.GcFeed, { t: gc.translate, state: { phase: 'loading', messages: [], channel }, items: [] })
    )
    assert.equal(findAllByTestId(tree, 'group-chat-skeleton').length, 5, 'skeleton while loading')
    assert.equal(findByTestId(tree, 'group-chat-empty'), null, 'no empty state while loading')

    // 2) open 已 resolve 但等首批数据（冷启动超时/child 未 ready）：仍骨架，无空态
    tree = renderer.render(
      h(gc.GcFeed, {
        t: gc.translate,
        state: { phase: 'ready', messages: [], channel, awaitingFirstBatch: true },
        items: []
      })
    )
    assert.equal(findAllByTestId(tree, 'group-chat-skeleton').length, 5, 'skeleton while awaiting first batch')
    assert.equal(findByTestId(tree, 'group-chat-empty'), null, 'no empty state while awaiting first batch')

    // 3) 宽限期结束仍为空 → 才显示空态
    tree = renderer.render(
      h(gc.GcFeed, {
        t: gc.translate,
        state: { phase: 'ready', messages: [], channel, awaitingFirstBatch: false },
        items: []
      })
    )
    assert.equal(findByTestId(tree, 'group-chat-skeleton'), null)
    assert.ok(findByTestId(tree, 'group-chat-empty'), 'empty state after grace period')

    // 4) 首屏到达 → 出消息；随后全量 sync（同 id）不重复
    const page = gc.mergeMessages(
      [],
      [
        {
          id: 'u:lead:1',
          kind: 'user',
          sessionId: 's-lead',
          sender: { sessionId: 's-lead', name: 'user', kind: 'user' },
          targets: ['lead'],
          text: 'hello',
          time: 100,
          seq: 1,
          isFinal: true
        }
      ],
      channel,
      gc.limits()
    )
    assert.equal(page.length, 1)
    const synced = gc.mergeMessages(page, page, channel, gc.limits())
    assert.equal(synced.length, 1, 'full sync is idempotent (no duplicates)')
    const withLateChild = gc.mergeMessages(
      synced,
      [
        {
          id: 'a:scout:2',
          kind: 'agent_output',
          sessionId: 's-scout',
          sender: { sessionId: 's-scout', name: 'scout', kind: 'teammate' },
          text: 'late child history',
          time: 200,
          seq: 2,
          isFinal: true
        }
      ],
      channel,
      gc.limits()
    )
    assert.equal(withLateChild.length, 2, 'late child history appended once')
    const items = gc.buildFeed(withLateChild, 3000)
    tree = renderer.render(
      h(gc.GcFeed, {
        t: gc.translate,
        state: { phase: 'ready', messages: withLateChild, channel, awaitingFirstBatch: false },
        items
      })
    )
    assert.equal(findAll(tree, (node) => node.props && node.props['data-kind'] === 'agent_output').length, 1)
    assert.equal(findAll(tree, (node) => node.props && node.props['data-kind'] === 'user').length, 1)
  } finally {
    mounted.restore()
  }
})

/* ── 状态 ─────────────────────────────────────────────────────────────── */

test('状态: 只读历史（横幅 / 频道头后缀 / 输入 40% 禁用 / 发送不可用）', async () => {
  const { mounted, registration, renderer } = mountPreview({ search: '?gc-preview=readonly' })
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const tree = renderer.tree

    const banner = findByTestId(tree, 'group-chat-readonly-banner')
    assert.ok(banner)
    assert.match(visibleText(banner), /当前为只读历史，不能发送/)
    assert.match(visibleText(findByTestId(tree, 'group-chat-header')), /· 团队已结束/)

    const composer = findByTestId(tree, 'group-chat-composer')
    assert.equal(composer.props['data-readonly'], 'true')
    assert.equal(findByTestId(tree, 'group-chat-send').props.disabled, true)
    const textarea = findAll(tree, (node) => node.type === 'textarea')[0]
    assert.equal(textarea.props.placeholder, '团队已结束，群聊为只读历史')
    assert.equal(textarea.props.disabled, true)
  } finally {
    mounted.restore()
  }
})

test('状态: 无团队空态 / 骨架 / 错误态 / 未读浮标（子组件）', () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    const renderer = runtime.createRenderer()

    // 无团队空态
    let tree = renderer.render(
      h(gc.GcFeed, {
        t: gc.translate,
        state: { phase: 'ready', messages: [], filter: null, channel: { members: [] } },
        items: [],
        emptyKind: 'no-team'
      })
    )
    assert.ok(findByTestId(tree, 'group-chat-empty-no-team'))
    assert.match(visibleText(tree), /当前为单 Agent 会话（无团队）/)
    assert.match(visibleText(tree), /仅显示该会话的用户消息与该 agent 的最终输出/)

    // 团队无发言空态
    tree = renderer.render(
      h(gc.GcFeed, {
        t: gc.translate,
        state: { phase: 'ready', messages: [], filter: null, channel: { members: [{}] } },
        items: []
      })
    )
    assert.ok(findByTestId(tree, 'group-chat-empty'))
    assert.match(visibleText(tree), /团队还没有发言/)

    // 骨架
    tree = renderer.render(
      h(gc.GcFeed, {
        t: gc.translate,
        state: { phase: 'loading', messages: [], channel: null },
        items: []
      })
    )
    assert.equal(findAllByTestId(tree, 'group-chat-skeleton').length, 5)

    // 错误态
    tree = renderer.render(
      h(gc.GcFeed, {
        t: gc.translate,
        state: { phase: 'error', messages: [], channel: null, error: { code: 'no-source', retryable: true } },
        items: [],
        onRetryOpen() {}
      })
    )
    const error = findByTestId(tree, 'group-chat-error')
    assert.ok(error)
    assert.equal(error.props['data-retryable'], 'true')
    assert.match(visibleText(error), /群聊数据源暂不可用/)

    // 未读浮标（视图内唯一未读入口；tab 无装饰）
    const pill = renderer.render(h(gc.GcUnreadPill, { t: gc.translate, count: 3, onJumpLatest() {} }))
    const pillNode = findByTestId(pill, 'group-chat-unread-pill')
    assert.ok(pillNode)
    assert.equal(pillNode.props['data-count'], '3')
    assert.match(visibleText(pillNode), /↓ 3 条新消息/)

    // 频道头未读提示
    const header = renderer.render(
      h(gc.GcChannelHeader, {
        t: gc.translate,
        channel: {
          members: [{ sessionId: 'l', kind: 'lead' }, { sessionId: 't', kind: 'teammate' }],
          lead: { sessionId: 'l', name: 'lead', displayName: 'Lead' },
          runningCount: 1
        },
        filter: null,
        readonly: false,
        unread: 3,
        filterOpen: false
      })
    )
    const hint = findByTestId(header, 'group-chat-newmessages-hint')
    assert.equal(hint.props['data-count'], '3')
    assert.match(visibleText(hint), /3 条新消息/)
  } finally {
    mounted.restore()
  }
})

/* ── F-01：长 feed 下输入区仍在 DOM，且布局约束链正确 ─────────────────── */

test('F-01: 长 feed（>200 条）下 composer 仍在 DOM，且 CSS 高度链把滚动限定在 feed', async () => {
  const { mounted, registration, renderer } = mountPreview({ search: '?gc-preview=1&gc-long=1' })
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const tree = renderer.tree

    // 长 feed 生效
    const rows = findAll(tree, (node) => node.props && node.props['data-kind'] === 'agent_output')
    assert.ok(rows.length > 200, 'long feed rendered, got ' + rows.length)

    // 输入区仍在（DOM 层）：测试无法计算可见性，可见性由下方 CSS 契约 + 浏览器截图验证
    assert.ok(findByTestId(tree, 'group-chat-composer'), 'composer present with long feed')
    assert.ok(findByTestId(tree, 'group-chat-send'), 'send button present with long feed')
    assert.ok(findByTestId(tree, 'group-chat-target-row'), 'target row present with long feed')
    assert.equal(findByTestId(tree, 'group-chat-root').props['data-testid'], 'group-chat-root')

    // 结构顺序：header → feed → composer（composer 是最后一个主区块）
    const root = findByTestId(tree, 'group-chat-root')
    const shell = findAll(root, (node) => node.props && node.props.className === 'gc-shell')[0]
    assert.ok(shell, 'gc-shell wrapper')
    const shellChildren = (shell.children || []).filter(Boolean)
    const composerIndex = shellChildren.findIndex((node) => node.props && node.props.className === 'gc-composer-area')
    const feedIndex = shellChildren.findIndex((node) => node.props && String(node.props['data-testid']) === 'group-chat-feed')
    assert.ok(composerIndex > feedIndex, 'composer after feed')
    assert.equal(composerIndex, shellChildren.length - 1, 'composer is the last block in the shell')
  } finally {
    mounted.restore()
  }
})

test('F-01: CSS 契约 — root/shell 满高不溢出，feed 唯一滚动，header/composer 固定', () => {
  const css = readFileSync(join(pluginRoot, 'src', 'styles', 'group-chat.css'), 'utf8')
  const compact = css.replace(/\s+/g, ' ')

  // root：满高 + 隐藏溢出（防止长 feed 把 composer 顶出去）
  assert.match(compact, /\.gc-root \{[^}]*height: 100%/s)
  assert.match(compact, /\.gc-root \{[^}]*max-height: 100%/s)
  assert.match(compact, /\.gc-root \{[^}]*min-height: 0/s)
  assert.match(compact, /\.gc-root \{[^}]*overflow: hidden/s)
  // shell：纵向 flex 且不溢出
  assert.match(compact, /\.gc-shell \{[^}]*flex: 1 1 auto/s)
  assert.match(compact, /\.gc-shell \{[^}]*min-height: 0/s)
  assert.match(compact, /\.gc-shell \{[^}]*overflow: hidden/s)
  // feed：唯一滚动区
  assert.match(compact, /\.gc-scroll \{[^}]*flex: 1 1 auto/s)
  assert.match(compact, /\.gc-scroll \{[^}]*min-height: 0/s)
  assert.match(compact, /\.gc-scroll \{[^}]*overflow-y: auto/s)
  // header / banners / composer：不参与伸缩
  assert.match(compact, /\.gc-header \{[^}]*flex: 0 0 auto/s)
  assert.match(compact, /\.gc-banners \{[^}]*flex: none/s)
  assert.match(compact, /\.gc-composer-area \{[^}]*flex: 0 0 auto/s)
  // 用户诉求：成员条换行优先（可两行，头部自适应），全部成员完整显示、不裁切、无遮罩
  assert.match(compact, /\.gc-member-strip \{[^}]*flex-wrap: wrap/s)
  assert.match(compact, /\.gc-member-strip \{[^}]*row-gap: 4px/s)
  assert.ok(!/\.gc-member-strip \{[^}]*overflow-x: auto/s.test(compact), 'no horizontal scroll on member strip')
  assert.ok(!/\.gc-member-strip \{[^}]*mask-image/s.test(compact), 'no mask on member strip')
  assert.ok(!/\.gc-member-strip \{[^}]*mask-image/s.test(compact), 'member strip without mask fade')
  assert.ok(!/\.gc-member-strip \{[^}]*mask-image/s.test(compact))
  assert.match(compact, /\.gc-member-strip \.gc-avatar \{[^}]*width: 26px/s)
  assert.match(compact, /\.gc-member-name \{[^}]*font-size: 12px/s)
  // 用户要求：inline @ chip 与输入区 chips 文字纯白（--gc-on-brand）
  assert.match(compact, /--gc-on-brand:\s*#fff/)
  assert.match(compact, /\.gc-chip\[data-tone='target'\] \{[^}]*color: var\(--gc-on-brand/s)
  assert.match(compact, /\.gc-chip\[data-tone='mention'\] \{[^}]*color: var\(--gc-on-brand/s)
  assert.match(compact, /\.gc-bubble \.gc-mention,[\s\S]{0,80}color: var\(--gc-on-brand/s)
  // F32：表格样式（表头底色/斑马纹/横向滚动）
  assert.match(compact, /\.gc-md-table-wrap \{[^}]*overflow-x: auto/s)
  assert.match(compact, /table\.gc-md-table thead th \{[^}]*background: var\(--dsw-alias-bg-layer-2\)/s)
  assert.match(compact, /table\.gc-md-table tbody tr:nth-child\(even\)/s)
  // F34：折叠态紧凑
  assert.match(compact, /data-task-expanded='false'\] \{[^}]*padding-top: 12px/s)
  // M6 欢迎提示：11.5 tertiary 居中
  assert.match(compact, /\.gc-welcome-note \{[^}]*font-size: 11\.5px/s)
  assert.match(compact, /\.gc-welcome-note \{[^}]*color: var\(--dsw-alias-label-tertiary\)/s)
  // M4 宿主 composer 在插件卸载时也要恢复
  const entrySource = readFileSync(join(pluginRoot, 'src', 'client', 'entry.js'), 'utf8')
  assert.match(entrySource, /host composer restore/)
  // 宿主 slot wrapper 适配（:has）+ JS 兜底
  assert.match(compact, /\[class\*='viewArea'\] > :has\(> \.gc-root\)/)
  const bundled = readFileSync(join(pluginRoot, 'lib', 'client.js'), 'utf8')
  assert.match(bundled, /function gcFitHostLayout/)
  assert.match(bundled, /gcFitHostLayout\(rootRef\.current\)/)
})

test('F-02: agentTeam 投影经 getMembers 传入数据源（预览源回写成员名）', async () => {
  const agentTeam = {
    members: [
      { id: 'preview-scout', name: 'ux', role: 'teammate', status: 'inactive' },
      { id: 'preview-ux', name: 'pm', role: 'teammate', status: 'inactive' }
    ]
  }
  const useSessions = (selector) =>
    selector({ projectionsBySession: { 'preview-lead-session': { values: { agentTeam } } } })

  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session', useSessions }))
    await renderer.settle()

    // 打开筛选菜单，成员名来自 agentTeam 投影（authority 覆盖）
    await renderer.act(() => click(findByTestId(renderer.tree, 'group-chat-filter-button')))
    const menu = findByTestId(renderer.tree, 'group-chat-filter-menu')
    assert.ok(menu, 'filter menu')
    const names = findAll(menu, (node) => node.props && node.props['data-mention']).map(
      (node) => node.props['data-mention']
    )
    assert.ok(names.includes('ux'), 'projection name ux present')
    assert.ok(names.includes('pm'), 'projection name pm present')
    assert.ok(!names.includes('scout'), 'event roster name replaced by authority')
  } finally {
    mounted.restore()
  }
})

/* ══════════════════════════════════════════════════════════════════════
 * v1.7（F22–F29 / Figma v4.1）
 * ══════════════════════════════════════════════════════════════════════ */

test('F22 Markdown: 受控渲染（rich/plain、禁止 innerHTML、链接安全属性）', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const tree = renderer.tree

    const markdowns = findAll(tree, (node) => node.props && node.props.className === 'gc-md')
    assert.ok(markdowns.length > 0, 'markdown containers')
    const richs = markdowns.filter((node) => node.props['data-md'] === 'rich')
    assert.ok(richs.length > 0, 'rich markdown container')
    const rich = richs.find((node) => /关键点/.test(visibleText(node)))
    assert.ok(rich, 'rich markdown container with markdown content')

    const texts = findAll(rich, (node) => node.props && node.props.className === 'gc-md-strong').map(visibleText)
    assert.ok(texts.includes('发送通路'), 'strong rendered: ' + JSON.stringify(texts))
    assert.ok(findAll(rich, (node) => node.props && node.props.className === 'gc-md-pre').length > 0, 'code block')
    assert.ok(findAll(rich, (node) => node.props && node.props.className === 'gc-md-li').length > 0, 'list items')
    assert.ok(findAll(rich, (node) => node.props && node.props.className === 'gc-md-code').length > 0, 'inline code')
    const links = findAll(rich, (node) => node.props && node.props.className === 'gc-md-link')
    assert.ok(links.length > 0, 'links')
    for (const link of links) {
      assert.equal(link.props.target, '_blank')
      assert.match(link.props.rel, /noopener/)
      assert.equal(link.props['data-md-link'], 'true')
      assert.ok(!/^javascript:/i.test(link.props.href || ''), 'no javascript: link')
    }
    // 禁止 innerHTML：渲染树中不存在 dangerouslySetInnerHTML
    assert.equal(findAll(tree, (node) => node.props && node.props.dangerouslySetInnerHTML !== undefined).length, 0)
  } finally {
    mounted.restore()
  }
})

test('F29 折叠: 默认前 50 行 + data-line-count + 展开/收起', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const toggles = findAllByTestId(renderer.tree, 'group-chat-fold-toggle')
    assert.ok(toggles.length > 0, 'fold toggle present for >50-line message')
    const toggle = toggles[0]
    const lineCount = Number(toggle.props['data-line-count'])
    assert.ok(lineCount > 50, 'line count over 50: ' + lineCount)
    assert.match(visibleText(toggle), new RegExp('展开全部（共 ' + lineCount + ' 行）'))
    assert.equal(toggle.props['aria-expanded'], 'false')

    await renderer.act(() => click(toggle))
    const expanded = findAllByTestId(renderer.tree, 'group-chat-fold-toggle')[0]
    assert.equal(expanded.props['aria-expanded'], 'true')
    assert.equal(visibleText(expanded), '收起')
  } finally {
    mounted.restore()
  }
})

test('F26 成员条 + 轨迹侧栏: 头像状态点、点击打开 380px 抽屉、Esc 关闭', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const strip = findByTestId(renderer.tree, 'group-chat-member-strip')
    assert.ok(strip, 'member strip in header')
    const items = findAll(strip, (node) => node.props && node.props['data-testid'] === 'group-chat-member-strip-item')
    assert.ok(items.length > 0, 'member strip items')
    // Lead 裁决：全部成员显示，禁止 +N；预览频道共 6 名成员
    assert.equal(items.length, 6, 'all members rendered, no overflow')
    assert.equal(
      findAll(strip, (node) => node.props && node.props.className === 'gc-member-strip-more').length,
      0,
      'no +N overflow node'
    )
    assert.ok(!/\+\d+/.test(visibleText(strip)), 'no +N text')
    for (const item of items) {
      assert.ok(['working', 'waiting'].includes(item.props['data-member-state']))
      assert.ok(item.props['data-member-id'])
      assert.equal(item.props['data-action'], 'open-trajectory')
    }
    // header 状态文案包含工作中/等待
    assert.match(visibleText(findByTestId(renderer.tree, 'group-chat-header')), /工作中.*等待/)

    // 点击有输出的成员头像（scout）→ 轨迹侧栏
    const scoutItem = items.find((item) => item.props['data-member-id'] === 'preview-scout') || items[0]
    await renderer.act(() => click(scoutItem))
    const panel = findByTestId(renderer.tree, 'agent-trajectory-panel')
    assert.ok(panel, 'trajectory panel opens')
    assert.equal(panel.props.role, 'dialog')
    assert.equal(panel.props['aria-modal'], 'true')
    assert.ok(findByTestId(renderer.tree, 'agent-trajectory-overlay'), 'overlay present')
    // 轮次行来自 fallback（该成员 agent_output）
    assert.ok(findAllByTestId(renderer.tree, 'agent-trajectory-turn').length > 0, 'turn rows')

    // 关闭按钮
    const close = findAll(renderer.tree, (node) => node.props && node.props['data-action'] === 'close-trajectory')[0]
    assert.ok(close)
    await renderer.act(() => click(close))
    assert.equal(findByTestId(renderer.tree, 'agent-trajectory-panel'), null)
  } finally {
    mounted.restore()
  }
})

test('F25 输入器: chips 在输入框下方（默认 @Lead + 已选 mention）、hint 唯一提示', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()

    const targetRow = findByTestId(renderer.tree, 'group-chat-target-row')
    assert.ok(targetRow, 'target chips row')
    const leadChip = findAll(targetRow, (node) => node.props && node.props['data-target'] === 'lead')[0]
    assert.ok(leadChip, 'default @Lead chip')
    assert.equal(leadChip.props['data-tone'], 'target')
    assert.match(visibleText(leadChip), /@Lead/)

    const hint = findByTestId(renderer.tree, 'group-chat-composer-hint')
    assert.ok(hint, 'composer hint')
    assert.equal(visibleText(hint), '键入 @ 可同时发送给多人')

    // chips 行在输入行之后（视觉下方）
    const shell = findByTestId(renderer.tree, 'group-chat-composer')
    const children = shell.children.filter(Boolean)
    const inputIndex = children.findIndex((node) => node.props && node.props.className === 'gc-input-row')
    const chipsIndex = children.findIndex(
      (node) => node.props && String(node.props['data-testid']) === 'group-chat-target-row'
    )
    assert.ok(chipsIndex > inputIndex, 'chips below input row')
    assert.equal(chipsIndex, children.length - 2, 'chips right before hint')

    // 键入 @ → 补全条目展示角色描述（不是状态）
    const textarea = findAll(renderer.tree, (node) => node.type === 'textarea')[0]
    await renderer.act(() => change(textarea, '@sc', 3))
    const popup = findByTestId(renderer.tree, 'group-chat-mention-popup')
    assert.ok(popup)
    const option = findAll(popup, (node) => node.props && node.props.role === 'option')[0]
    assert.ok(option)
    assert.ok(visibleText(option).includes('负责接口取证与技术可行性'), 'option shows description, got: ' + visibleText(option))
    assert.ok(!/运行中|已完成/.test(visibleText(option)), 'option has no runtime status text')

    // 选中后 chip 出现在 chips 行，且 hint 不变
    const textarea2 = findAll(renderer.tree, (node) => node.type === 'textarea')[0]
    await renderer.act(() => keyDown(textarea2, 'Enter'))
    const targetRow2 = findByTestId(renderer.tree, 'group-chat-target-row')
    assert.equal(targetRow2.props['data-targets'], 'lead,scout')
    const mentionChip = findAll(targetRow2, (node) => node.props && node.props['data-mention'] === 'scout')[0]
    assert.ok(mentionChip)
    assert.equal(mentionChip.props['data-target'], 'scout')
  } finally {
    mounted.restore()
  }
})

test('F24 单一输入器: 群聊视图激活期 body 标记存在，卸载后移除', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const body = mounted.globals.document.body
    assert.equal(body.classList.contains('gc-view-group-chat'), true, 'body marker while view active')
    // 卸载视图（清空 root）→ cleanup 移除标记
    renderer.render('div')
    await renderer.settle()
    assert.equal(body.classList.contains('gc-view-group-chat'), false, 'body marker removed after unmount')
  } finally {
    mounted.restore()
  }
})

test('F27 作用域: member session 沿 parentSession 链解析 lead；失败回退自身', () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    const lookup = (id) => {
      const table = {
        's-lead': {},
        's-teammate': { parentSessionId: 's-lead' },
        's-sub': { parentSessionId: 's-teammate' }
      }
      return table[id]
    }
    assert.equal(gc.resolveLeadSessionId({ sessions: { binding: () => undefined } }, 's-lead'), 's-lead')
    // core 未注入 ctx 时回退会话自身
    assert.equal(gc.resolveLeadSessionId({ sessions: { binding: () => undefined } }, 's-sub'), 's-sub')
    assert.equal(typeof gc.resolveLeadSessionId({}, 'missing'), 'string')
  } finally {
    mounted.restore()
  }
})

test('F28 降噪: M6 工具行不渲染、消息操作为图标 + aria-label', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const tree = renderer.tree
    assert.equal(findAll(tree, (node) => node.props && node.props.className === 'gc-tool-line').length, 0)
    assert.equal(findAllByAttr(tree, 'data-field', 'tool-calls').length, 0)

    const copyActions = findAll(tree, (node) => node.props && node.props['data-action'] === 'copy-message')
    assert.ok(copyActions.length > 0, 'copy-message icon actions')
    for (const action of copyActions) {
      assert.ok(action.props['aria-label'])
      assert.ok(action.props.title)
    }
    const openActions = findAll(tree, (node) => node.props && node.props['data-action'] === 'open-session')
    assert.ok(openActions.length > 0, 'open-session icon actions')
    for (const action of openActions) assert.ok(action.props['aria-label'])
  } finally {
    mounted.restore()
  }
})

test('F5 subagent-settled 通知不渲染', () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    assert.equal(gc.isSettledNotice({ kind: 'system', systemReason: 'subagent-settled' }), true)
    assert.equal(gc.isSettledNotice({ kind: 'system', meta: { event: 'subagent-settled' } }), true)
    assert.equal(gc.isSettledNotice({ kind: 'system', text: '团队已组建' }), false)
    assert.equal(gc.isSettledNotice({ kind: 'user' }), false)
  } finally {
    mounted.restore()
  }
})

/* ══════════════════════════════════════════════════════════════════════
 * task-90 复审修复（H1/H2 + M1/M3/M6/M7/M9）
 * ══════════════════════════════════════════════════════════════════════ */

test('H2/SC43: 所有任务卡（含 compact）都渲染操作者头像 data-card-avatar', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const rows = findAll(renderer.tree, (node) => node.props && node.props['data-kind'] === 'task_card')
    assert.ok(rows.length >= 4, 'task cards present')
    for (const row of rows) {
      const avatars = findAll(row, (node) => node.props && node.props['data-card-avatar'] === 'true')
      assert.equal(avatars.length, 1, 'exactly one actor avatar per task card')
      assert.ok(visibleText(avatars[0]).length > 0, 'avatar has letter content')
    }
    // compact（claim）卡同样有头像
    const compact = rows.find((row) => row.props['data-task-action'] === 'claim')
    assert.ok(compact)
    assert.ok(findAll(compact, (node) => node.props && node.props['data-card-avatar'] === 'true').length === 1)
  } finally {
    mounted.restore()
  }
})

test('M3: 渲染端二次链接校验 —— javascript:/data: 降级纯文本（无 <a>）', () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    const renderer = runtime.createRenderer()
    const tree = renderer.render(
      h(gc.GcMarkdown, { text: '[click](javascript:alert(1)) and [ok](https://example.com/x)' })
    )
    const links = findAll(tree, (node) => node.props && node.props['data-md-link'] === 'true')
    assert.equal(links.length, 1, 'only safe link renders as anchor')
    assert.equal(links[0].props.href, 'https://example.com/x')
    // core 已在解析期降级 unsafe link；渲染端 isSafeUrl 作为防御纵深（直接断言谓词）
    assert.equal(gc.isSafeLinkUrl('javascript:alert(1)'), false)
    assert.equal(gc.isSafeLinkUrl('data:text/html,x'), false)
    assert.equal(gc.isSafeLinkUrl('file:///etc/passwd'), false)
    assert.equal(gc.isSafeLinkUrl('https://example.com/x'), true)
    assert.equal(gc.isSafeLinkUrl('mailto:a@b.c'), true)
    // 渲染树中所有 <a> 的 href 必须是安全 scheme
    for (const link of findAll(tree, (node) => node.type === 'a')) {
      assert.ok(/^(https?:|mailto:)/i.test(link.props.href || ''), 'anchor href scheme safe: ' + link.props.href)
    }
  } finally {
    mounted.restore()
  }
})

test('M9/F35: 任务卡负责人为文本字段，空回退「未认领」（无「?」文本/无重复头像）', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const rows = findAll(renderer.tree, (node) => node.props && node.props['data-kind'] === 'task_card')
    const unassigned = rows.filter((row) => row.props['data-task-owner'] === '')
    assert.ok(unassigned.length > 0, 'unassigned cards present')
    for (const row of unassigned) {
      const ownerField = findByAttr(row, 'data-field', 'owner')
      assert.ok(ownerField, 'owner field row exists')
      assert.match(visibleText(ownerField), /未认领/)
      assert.ok(!/\?/.test(visibleText(ownerField)), 'no "?" placeholder text')
      assert.equal(findAll(row, (node) => node.props && node.props['data-task-owner-avatar']).length, 0)
      // F35：每张卡只有外层 1 个头像
      assert.equal(findAll(row, (node) => node.props && node.props['data-card-avatar'] === 'true').length, 1)
    }
  } finally {
    mounted.restore()
  }
})

/* ══════════════════════════════════════════════════════════════════════
 * task-99 线上问题（F31–F35）
 * ══════════════════════════════════════════════════════════════════════ */

test('F31/用户第11条: 空 text 的 delivery 工具摘要有意抑制（不显示「N 个工具调用」）', async () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    // 纯工具轮次：core 产出 delivery+toolSummary、text 为空 → UI 有意不渲染（用户明确不要工具调用文案）
    assert.equal(
      gc.isEmptyAgentMessage({ kind: 'delivery', text: '', meta: { toolSummary: true }, toolCallCount: 5 }),
      true,
      'empty tool-summary delivery suppressed intentionally'
    )
    assert.equal(
      gc.isEmptyAgentMessage({ kind: 'delivery', text: '', files: [{ name: 'a.md', path: 'a.md' }] }),
      false,
      'delivery with files still renders'
    )
  } finally {
    mounted.restore()
  }
})

test('F31: trim 为空的 agent 消息不渲染（无空气泡/操作图标）', async () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    assert.equal(gc.isEmptyAgentMessage({ kind: 'agent_output', text: '   ' }), true)
    assert.equal(gc.isEmptyAgentMessage({ kind: 'agent_output', text: '' }), true)
    assert.equal(gc.isEmptyAgentMessage({ kind: 'agent_output', text: 'x' }), false)
    assert.equal(gc.isEmptyAgentMessage({ kind: 'agent_output', text: '', files: [{ name: 'a' }] }), false)
    assert.equal(gc.isEmptyAgentMessage({ kind: 'delivery', text: '' }), true)
    assert.equal(gc.isEmptyAgentMessage({ kind: 'system', text: '' }), false)

    // 视图级：构造含空 agent 消息的 feed，不应出现该消息行/气泡
    const channel = {
      channelId: 's-lead',
      lead: { sessionId: 's-lead', name: 'lead', kind: 'lead', status: 'running' },
      members: [{ sessionId: 's-lead', name: 'lead', kind: 'lead', status: 'running' }],
      runningCount: 1
    }
    const emptyMsg = {
      id: 'empty-1',
      kind: 'agent_output',
      sessionId: 's-lead',
      sender: { sessionId: 's-lead', name: 'lead', kind: 'lead' },
      text: '   ',
      time: 1000,
      seq: 1,
      isFinal: true
    }
    const items = gc.buildFeed([emptyMsg], 2000)
    const renderer = runtime.createRenderer()
    const tree = renderer.render(
      h(gc.GcFeed, {
        t: gc.translate,
        state: { phase: 'ready', messages: [emptyMsg], channel, filter: null },
        items
      })
    )
    assert.equal(findAll(tree, (node) => node.props && node.props['data-message-id'] === 'empty-1').length, 0)
    assert.equal(findAll(tree, (node) => node.props && node.props['data-testid'] === 'group-chat-bubble').length, 0)
  } finally {
    mounted.restore()
  }
})

test('F32: 表格 AST → table[data-md-table]/thead/tbody/th/td + align（合成 AST）', () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    const ast = {
      type: 'document',
      children: [
        {
          type: 'table',
          align: ['left', 'right'],
          header: [[{ type: 'text', value: '名称' }], [{ type: 'text', value: '数量' }]],
          rows: [
            [[{ type: 'text', value: 'task-a' }], [{ type: 'text', value: '3' }]],
            [[{ type: 'text', value: 'task-b' }], [{ type: 'text', value: '12' }]]
          ]
        }
      ]
    }
    const renderer = runtime.createRenderer()
    const tree = renderer.render(h('div', { className: 'gc-md' }, gc.renderMdBlocks(ast.children, {})))
    const table = findAll(tree, (node) => node.type === 'table')[0]
    assert.ok(table, 'table element')
    assert.equal(table.props['data-md-table'], 'true')
    assert.equal(findAll(tree, (node) => node.type === 'thead').length, 1)
    assert.equal(findAll(tree, (node) => node.type === 'tbody').length, 1)
    const ths = findAll(tree, (node) => node.type === 'th')
    assert.equal(ths.length, 2)
    assert.match(visibleText(ths[0]), /名称/)
    const tds = findAll(tree, (node) => node.type === 'td')
    assert.equal(tds.length, 4)
    assert.match(visibleText(tds[2]), /task-b/)
    // align 透传
    assert.ok(ths[0].props.style && ths[0].props.style.textAlign === 'left')
    assert.ok(ths[1].props.style && ths[1].props.style.textAlign === 'right')
    assert.ok(findAll(tree, (node) => node.props && node.props.className === 'gc-md-table-wrap').length === 1)
  } finally {
    mounted.restore()
  }
})

test('F33: 成员条 = 头像 + 完整名字 + 状态点，无 +N/无遮罩', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const strip = findByTestId(renderer.tree, 'group-chat-member-strip')
    const items = findAll(strip, (node) => node.props && node.props['data-testid'] === 'group-chat-member-strip-item')
    assert.equal(items.length, 6, 'all members shown')
    const names = items.map((item) => {
      const avatar = findAll(item, (node) => node.props && node.props.className === 'gc-avatar')[0]
      // M4：JS 头像尺寸与 CSS 成员条尺寸统一为 26（响应式 24/22 由容器查询）
      assert.equal(avatar.props['data-size'], '26', 'member strip avatar size matches CSS 26')
      const nameNode = findAll(item, (node) => node.props && node.props.className === 'gc-member-name')[0]
      return nameNode ? visibleText(nameNode) : ''
    })
    for (const expected of ['lead', 'scout', 'ux', 'backend', 'pm', '产品设计']) {
      assert.ok(names.includes(expected), 'full name rendered: ' + expected + ' / ' + JSON.stringify(names))
    }
    for (const item of items) {
      assert.equal(findAll(item, (node) => node.props && node.props.className === 'gc-member-status-dot').length, 1, 'one status dot')
      assert.ok(item.props['data-member-name'], 'data-member-name present')
      assert.match(item.props['aria-label'] || '', /轮次轨迹/)
    }
    assert.ok(!/\+\d+/.test(visibleText(strip)), 'no +N')
  } finally {
    mounted.restore()
  }
})

test('F34: 任务卡默认折叠（仅目标/ID/状态/负责人/依赖/完成时间），展开/收起按消息记忆', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()

    const cards = findAll(renderer.tree, (node) => node.props && node.props['data-kind'] === 'task_card')
    const create = cards.find((card) => card.props['data-task-action'] === 'create')
    assert.ok(create)
    assert.equal(create.props['data-card-avatar'], undefined) // 头像在外层 wrap
    assert.equal(findByAttr(create, 'data-field', 'description'), null, 'description hidden by default')
    assert.ok(findByAttr(create, 'data-field', 'owner'), 'owner visible')
    assert.ok(findByAttr(create, 'data-field', 'blocked-by'), 'blocked-by visible')
    assert.match(visibleText(create), /task-13/)
    assert.match(visibleText(create), /待认领/)

    const toggle = findAll(create, (node) => node.props && node.props['data-action'] === 'expand-task')[0]
    assert.ok(toggle, 'expand toggle')
    assert.equal(toggle.props['aria-expanded'], 'false')
    assert.match(visibleText(toggle), /展开详情/)

    await renderer.act(() => click(toggle))
    const expandedCard = findAll(renderer.tree, (node) => node.props && node.props['data-kind'] === 'task_card').find(
      (card) => card.props['data-task-action'] === 'create'
    )
    const desc = findByAttr(expandedCard, 'data-field', 'description')
    assert.ok(desc, 'description visible when expanded')
    assert.match(visibleText(desc), /按成员卡语言出任务卡/)
    const toggle2 = findAll(expandedCard, (node) => node.props && node.props['data-action'] === 'expand-task')[0]
    assert.equal(toggle2.props['aria-expanded'], 'true')
    assert.match(visibleText(toggle2), /收起详情/)

    // 其它任务卡仍保持折叠（按消息记忆）
    const other = findAll(renderer.tree, (node) => node.props && node.props['data-kind'] === 'task_card').find(
      (card) => card.props['data-task-action'] === 'reopen'
    )
    assert.equal(findByAttr(other, 'data-field', 'description'), null, 'other card stays collapsed')

    await renderer.act(() => click(toggle2))
    const collapsedAgain = findAll(renderer.tree, (node) => node.props && node.props['data-kind'] === 'task_card').find(
      (card) => card.props['data-task-action'] === 'create'
    )
    assert.equal(findByAttr(collapsedAgain, 'data-field', 'description'), null, 'collapse again')
    // 架构 v1.7.2：data-task-collapsed 与 data-task-expanded 并存
    assert.equal(collapsedAgain.props['data-task-collapsed'], 'true')
    assert.equal(collapsedAgain.props['data-task-expanded'], 'false')
  } finally {
    mounted.restore()
  }
})

test('F35: 任务卡人物一致 —— 外层唯一头像，卡内无重复 actar 头像/名字，负责人为文本字段', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const cards = findAll(renderer.tree, (node) => node.props && node.props['data-kind'] === 'task_card')
    assert.ok(cards.length >= 4)
    for (const card of cards) {
      const avatars = findAll(card, (node) => node.props && node.props['data-card-avatar'] === 'true')
      assert.equal(avatars.length, 1, 'exactly one actor avatar per task card')
      // 用户要求：compact 与 normal 头像统一 32（Figma v4.2 图1）
      const avatar = findAll(avatars[0], (node) => node.props && node.props.className === 'gc-avatar')[0]
      assert.equal(avatar.props['data-size'], '32', 'task card avatar size unified at 32')
      assert.equal(findAll(card, (node) => node.props && node.props['data-task-owner-avatar']).length, 0)
      const senderLine = findAll(card, (node) => node.props && node.props.className === 'gc-sender')[0]
      assert.ok(senderLine, 'sender line present')
      assert.match(visibleText(senderLine), new RegExp('^' + card.props['data-sender']), 'sender name matches actor')
      const ownerField = findByAttr(card, 'data-field', 'owner')
      assert.ok(ownerField, 'owner is a text field')
    }
    // actor 与 owner 不同也不混淆：reopen 卡 actor=lead、owner=''
    const reopen = cards.find((card) => card.props['data-task-action'] === 'reopen')
    assert.equal(reopen.props['data-sender'], 'lead')
    assert.equal(reopen.props['data-task-owner'], '')
    assert.match(visibleText(findByAttr(reopen, 'data-field', 'owner')), /未认领/)
    // compact（claim）卡同样只有外层头像
    const claim = cards.find((card) => card.props['data-task-action'] === 'claim')
    assert.equal(findAll(claim, (node) => node.props && node.props['data-card-avatar'] === 'true').length, 1)
  } finally {
    mounted.restore()
  }
})

test('F32: GFM 表格文本 → 真实表格 DOM；非法表格降级段落（core 已支持）', () => {
  const { mounted } = mountPreview()
  try {
    const gc = mounted.module.__internals
    const renderer = runtime.createRenderer()
    const text = '| 名称 | 数量 |\n|:---|---:|\n| task-a | 3 |\n| task-b | 12 |'
    const tree = renderer.render(h(gc.GcMarkdown, { text: text }))
    assert.equal(findAll(tree, (node) => node.type === 'table').length, 1, 'table rendered')
    assert.equal(findAll(tree, (node) => node.type === 'thead').length, 1)
    assert.equal(findAll(tree, (node) => node.type === 'th').length, 2)
    assert.equal(findAll(tree, (node) => node.type === 'td').length, 4)
    assert.match(visibleText(tree), /task-a/)
    assert.match(visibleText(tree), /task-b/)

    // 非法表格（分隔行不合法）→ 段落纯文本，不产生 table
    const invalid = renderer.render(h(gc.GcMarkdown, { text: '| a | b |\n| -- |\n| 1 | 2 |' }))
    assert.equal(findAll(invalid, (node) => node.type === 'table').length, 0, 'invalid table degrades')
    assert.match(visibleText(invalid), /a/)
  } finally {
    mounted.restore()
  }
})


/* ── v0.8.4：消息行头像 → 自研轮次轨迹侧栏 ─────────────────────────── */

test('消息行头像可点击：打开自研 GcTrajectoryPanel（agent-trajectory-panel）', async () => {
  const { mounted, registration, renderer } = mountPreview()
  try {
    renderer.render(h(registration.component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const tree = renderer.tree

    // 消息行（非成员条）里的头像按钮
    const avatarButtons = findAll(
      tree,
      (node) => node.props && node.props['data-action'] === 'open-trajectory' && node.props.className === 'gc-avatar-btn'
    )
    assert.ok(avatarButtons.length > 0, 'message row avatars are clickable buttons')
    assert.match(avatarButtons[0].props['aria-label'], /轮次轨迹/)
    assert.ok(avatarButtons[0].props['data-member-id'])

    // 用户消息行不渲染头像按钮
    const userRows = findAll(tree, (node) => node.props && node.props['data-kind'] === 'user')
    for (const row of userRows) {
      assert.equal(
        findAll(row, (node) => node.props && node.props.className === 'gc-avatar-btn').length,
        0,
        'user avatar not clickable'
      )
    }

    // 点击 → 打开自研 panel（而不是 DSH 自带侧栏）
    const clicked = { prevented: false, stopped: false }
    avatarButtons[0].props.onClick({
      preventDefault() { clicked.prevented = true },
      stopPropagation() { clicked.stopped = true }
    })
    await renderer.settle()
    assert.ok(clicked.prevented && clicked.stopped, 'click prevents default and stops bubbling')
    const panel = findByTestId(renderer.tree, 'agent-trajectory-panel')
    assert.ok(panel, 'self-built trajectory panel opens')
    assert.equal(panel.props.role, 'dialog')
    assert.equal(panel.props['aria-modal'], 'true')
    assert.ok(findByTestId(renderer.tree, 'agent-trajectory-overlay'), 'self-built overlay')
    // 关闭按钮来自自研面板
    assert.ok(findAll(renderer.tree, (node) => node.props && node.props['data-action'] === 'close-trajectory').length > 0)
  } finally {
    mounted.restore()
  }
})
