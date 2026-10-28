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
const bundleCode = buildBundleSource({ modules: 'none' }).code
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
    assert.match(visibleText(header), /6 名成员 · 4 个运行中/)

    const feed = findByTestId(rendered, 'group-chat-feed')
    assert.ok(feed, 'feed container')
    assert.equal(feed.props.role, 'log')
    assert.equal(feed.props['aria-live'], 'polite')

    assert.ok(findAllByTestId(rendered, 'group-chat-time-divider').length > 0, 'time dividers')
    assert.ok(findAllByTestId(rendered, 'group-chat-bubble').length > 0, 'bubbles')

    const userCaption = findAllByTestId(rendered, 'group-chat-bubble-caption')[0]
    assert.ok(userCaption, 'user bubble caption')
    assert.match(visibleText(userCaption), /已同时发送给 Lead/)
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

    // 工具调用折叠行（agent_output.toolCallCount）
    assert.ok(findAllByAttr(tree, 'data-field', 'tool-calls').length > 0, 'tool collapse line')

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
    assert.match(visibleText(create), /复制任务 ID/)

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
    assert.match(visibleText(reopen), /未指派/)

    for (const card of cards) {
      const text = visibleText(card)
      assert.ok(!/返工|失败|failed/.test(text), 'task card must not contain forbidden wording: ' + text)
    }
    // 依赖为空时整行隐藏；有依赖才渲染 data-field=blocked-by
    assert.equal(findByAttr(create, 'data-field', 'blocked-by'), null)
    assert.ok(findByAttr(claim, 'data-field', 'blocked-by'), 'blocked-by row when blockedBy present')
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
  assert.match(css, /--gc-fold-max:\s*192px/)
  assert.match(css, /--gc-fold-mask:\s*56px/)
  // 只用主题 token 取色（不出现裸色值）
  const colorLiterals = css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) || []
  const allowed = colorLiterals.filter((value) => /rgba\(0, 0, 0/.test(value))
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
    assert.match(visibleText(toggle), /展开全部（约 \d+ 字）/)

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

    const copyTask = findAll(renderer.tree, (node) => node.props && node.props['data-action'] === 'copy-task-id')[0]
    assert.ok(copyTask)
    await renderer.act(() => click(copyTask))
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
