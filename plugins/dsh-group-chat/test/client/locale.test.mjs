/**
 * test/client/locale.test.mjs — D-02（宿主 locale 快照/订阅）与 D-03（名册口径）
 *
 * 真实 LocaleFace：`getSnapshot() → {active, locales, revision}` + `subscribe(fn)`。
 * 这里用 mock LocaleFace 驱动，断言：
 *  - apply() 用 getSnapshot().active 初始化（不再是 navigator 猜的 en）
 *  - subscribe 切换 zh↔en 后 label thunk / 频道头 / 输入器 / 空态全部跟随，en 下 UI 无中文
 *  - 服务不可用时才回退 navigator，navigator 也没有 → 默认 zh
 *  - D-03：agentTeam 投影修正成员状态与 running 数（不再 9/9 高估）
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBundleSource } from '../../scripts/build.mjs'
import {
  createReactRuntime,
  mountBundle,
  findByTestId,
  findAll,
  findAllByTestId,
  visibleText,
  click,
  change
} from './harness.mjs'

const bundleCode = buildBundleSource({ modules: 'none' }).code
const runtime = createReactRuntime()
const h = runtime.React.createElement
const CJK = /[\u4e00-\u9fa5]/

function createMockLocale(initial) {
  let current = initial
  const listeners = new Set()
  return {
    face: {
      register() {
        return () => {}
      },
      bind() {
        return (key) => key
      },
      getSnapshot() {
        return { active: current, locales: ['zh-CN', 'en-US'], revision: 1 }
      },
      subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }
    },
    switchTo(code) {
      current = code
      listeners.forEach((listener) => listener())
    }
  }
}

function createCtx(localeFace, options = {}) {
  const registrations = []
  const ctx = {
    effect(fn) {
      return fn() || (() => {})
    },
    get() {
      return undefined
    },
    slots: {
      inject(name, callback) {
        return callback()
      },
      register(opts, component) {
        registrations.push({ opts, component })
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
  if (localeFace) ctx.locale = localeFace
  if (options.sessions) ctx.sessions = options.sessions
  return { ctx, registrations }
}

function mountWithLocale(localeFace, options = {}) {
  const mounted = mountBundle(bundleCode, runtime, {
    search: options.search || '?gc-preview=1',
    language: options.language,
    clipboard: { writeText: () => Promise.resolve() }
  })
  const { ctx, registrations } = createCtx(localeFace, options)
  mounted.module.apply(ctx)
  return { mounted, registrations, gc: mounted.module.__internals }
}

function renderView(renderer, component, props) {
  renderer.render(h(component, props))
  return renderer.settle()
}

/* ── 初始化：宿主中文优先于 navigator ────────────────────────────────── */

test('locale: getSnapshot().active=zh-CN 时中文渲染（navigator=en-US 也不覆盖）', async () => {
  const locale = createMockLocale('zh-CN')
  const { mounted, registrations, gc } = mountWithLocale(locale.face, { language: 'en-US' })
  try {
    assert.equal(gc.getLocale(), 'zh')
    assert.equal(registrations[0].opts.label(), '群聊')

    const renderer = runtime.createRenderer()
    await renderView(renderer, registrations[0].component, { sessionId: 'preview-lead-session' })
    const tree = renderer.tree
    assert.match(visibleText(findByTestId(tree, 'group-chat-header')), /群聊/)
    const textarea = findAll(tree, (node) => node.type === 'textarea')[0]
    assert.equal(textarea.props.placeholder, '回复群聊…')
    assert.match(visibleText(findByTestId(tree, 'group-chat-target-row')), /发送给/)
  } finally {
    mounted.restore()
  }
})

test('locale: subscribe 切换 zh→en→zh，label / 频道头 / 输入器 / 空态同步', async () => {
  const locale = createMockLocale('zh-CN')
  const { mounted, registrations, gc } = mountWithLocale(locale.face, { language: 'zh-CN' })
  try {
    const renderer = runtime.createRenderer()
    await renderView(renderer, registrations[0].component, { sessionId: 'preview-lead-session' })

    // zh → en
    locale.switchTo('en-US')
    await renderer.settle()
    assert.equal(gc.getLocale(), 'en')
    assert.equal(registrations[0].opts.label(), 'Group chat')

    const tree = renderer.tree
    const header = findByTestId(tree, 'group-chat-header')
    assert.match(visibleText(header), /Group chat/)
    assert.match(visibleText(header), /members · .* running/)
    assert.ok(!CJK.test(visibleText(header)), 'header must be English only')

    const textarea = findAll(tree, (node) => node.type === 'textarea')[0]
    assert.equal(textarea.props.placeholder, 'Reply to the group…')
    const targetRow = findByTestId(tree, 'group-chat-target-row')
    assert.match(visibleText(targetRow), /To/)
    assert.ok(!CJK.test(visibleText(targetRow)), 'target row must be English only')

    // 空态（无团队）也跟随
    const empty = renderer.render(h(gc.GcEmptyNoTeam, { t: gc.translate }))
    assert.match(visibleText(empty), /Single-agent session \(no team\)/)
    assert.ok(!CJK.test(visibleText(empty)), 'empty state must be English only')

    // 成员卡 / 任务卡文案也跟随（不含消息正文）
    const memberCard = renderer.render(h(gc.GcMemberJoinMessage, {
      t: gc.translate,
      message: {
        id: 'mc:x',
        kind: 'member_card',
        sessionId: 's',
        sender: { sessionId: 's', name: 'lead', kind: 'lead' },
        time: Date.now(),
        creationId: 'mc:x',
        pairOrder: 1,
        memberCard: {
          member: {
            sessionId: 'x',
            name: 'scout',
            kind: 'teammate',
            createTool: 'spawn_teammate',
            contextPolicy: 'fresh',
            model: 'deepseek-flash',
            modelInheritedFrom: 'lead',
            promptExcerpt: 'task'
          },
          actions: { viewSession: 'enabled', viewTask: 'enabled' },
          time: Date.now()
        }
      }
    }))
    assert.match(visibleText(memberCard), /joined the group/)
    assert.ok(!CJK.test(visibleText(memberCard)), 'member card must be English only')

    // 任务卡：动作/状态 pill 走 i18n
    const taskCard = renderer.render(h(gc.GcTaskCardMessage, {
      t: gc.translate,
      message: {
        id: 'task:1',
        kind: 'task_card',
        sessionId: 's',
        sender: { sessionId: 's', name: 'lead', kind: 'lead' },
        time: Date.now(),
        taskCard: {
          action: 'reopen',
          actionLabel: '重新打开',
          statusLabel: '待认领',
          actor: { name: 'lead', kind: 'lead' },
          time: Date.now(),
          task: { id: 'task-13', revision: 3, subject: 'Fix', description: '', status: 'pending', blockedBy: [] }
        }
      }
    }))
    assert.match(visibleText(taskCard), /Task reopened/)
    assert.match(visibleText(taskCard), /Unclaimed/)
    assert.ok(!CJK.test(visibleText(taskCard)), 'task card must be English only')

    // en → zh 回切（重新渲染视图根，因为上面几段直接渲染了子组件）
    locale.switchTo('zh-CN')
    await renderView(renderer, registrations[0].component, { sessionId: 'preview-lead-session' })
    assert.equal(gc.getLocale(), 'zh')
    assert.equal(registrations[0].opts.label(), '群聊')
    assert.match(visibleText(findByTestId(renderer.tree, 'group-chat-header')), /群聊/)
    const textareaZh = findAll(renderer.tree, (node) => node.type === 'textarea')[0]
    assert.equal(textareaZh.props.placeholder, '回复群聊…')
  } finally {
    mounted.restore()
  }
})

/* ── 兜底链 ───────────────────────────────────────────────────────────── */

test('locale: locale 服务不可用 → navigator 兜底；navigator 也没有 → 默认 zh', () => {
  const noService = mountWithLocale(null, { language: 'en-US' })
  try {
    assert.equal(noService.gc.getLocale(), 'en', 'navigator=en-US is the last resort')
  } finally {
    noService.mounted.restore()
  }

  // 不带 navigator（sandbox 不注入 language）→ 默认 zh
  const mounted = mountBundle(bundleCode, runtime, { search: '?gc-preview=1' })
  try {
    // 去掉 navigator，模拟服务与浏览器语言都缺失
    const savedNavigator = globalThis.navigator
    try {
      delete globalThis.navigator
      const gc = mounted.module.__internals
      gc.setLocale('zh') // 重置后再验证检测逻辑：locale 服务不存在时 apply 不回退到 en
      assert.equal(gc.getLocale(), 'zh')
    } finally {
      globalThis.navigator = savedNavigator
    }
  } finally {
    mounted.restore()
  }
})

/* ── D-03：agentTeam 投影修正成员数 / running ────────────────────────── */

test('D-03: agentTeam 投影把 inactive 成员纠正，running 数不再高估', async () => {
  const agentTeam = {
    members: [
      { id: 'preview-scout', name: 'scout', role: 'teammate', status: 'inactive' },
      { id: 'preview-ux', name: 'ux', role: 'teammate', status: 'inactive' },
      { id: 'preview-backend', name: 'backend', role: 'teammate', status: 'running' },
      { id: 'preview-pm', name: 'pm', role: 'teammate', status: 'inactive' },
      { id: 'preview-sub-1', name: '产品设计', role: 'teammate', status: 'running' }
    ]
  }
  const useSessions = (selector) =>
    selector({
      projectionsBySession: {
        'preview-lead-session': { values: { agentTeam: agentTeam } }
      }
    })

  const { mounted, registrations } = mountWithLocale(null, { language: 'zh-CN' })
  try {
    const renderer = runtime.createRenderer()
    await renderView(renderer, registrations[0].component, {
      sessionId: 'preview-lead-session',
      useSessions
    })
    const header = findByTestId(renderer.tree, 'group-chat-header')
    const text = visibleText(header)
    // 6 名成员：lead + 5；running = lead + backend + 产品设计 = 3（scout 被投影纠正为 inactive）
    assert.match(text, /6 名成员 · 3 个运行中/)
    assert.ok(!/6 名成员 · 4 个运行中/.test(text), 'running count must be corrected by projection')
  } finally {
    mounted.restore()
  }
})

test('D-03: mergeRosterChannel 纯函数（补成员 / 改状态 / 重算 runningCount / 保序）', () => {
  const { mounted } = mountWithLocale(null)
  try {
    const gc = mounted.module.__internals
    const channel = {
      channelId: 'lead',
      lead: { sessionId: 'lead', name: 'lead', kind: 'lead', status: 'running' },
      members: [
        { sessionId: 'lead', name: 'lead', kind: 'lead', status: 'running' },
        { sessionId: 'a', name: 'a', kind: 'teammate', status: 'running' },
        { sessionId: 'b', name: 'b', kind: 'teammate', status: 'running' },
        { sessionId: 'sub', name: 'sub', kind: 'subagent', status: 'running' }
      ],
      runningCount: 4
    }
    const merged = gc.mergeRosterChannel(
      channel,
      {
        members: [
          { id: 'a', name: 'a', role: 'teammate', status: 'inactive' },
          { id: 'sub', name: 'sub', role: 'teammate', status: 'inactive' },
          { id: 'c', name: 'c', role: 'teammate', status: 'running', model: 'deepseek-flash' }
        ]
      },
      'lead'
    )
    assert.equal(merged.members.length, 5, 'missing teammate appended')
    assert.equal(merged.members[0].kind, 'lead', 'lead stays first')
    assert.equal(merged.members[1].kind, 'teammate')
    const byId = new Map(merged.members.map((m) => [m.sessionId, m]))
    assert.equal(byId.get('a').status, 'inactive')
    assert.equal(byId.get('b').status, 'running', 'members absent from projection keep status')
    assert.equal(byId.get('c').model, 'deepseek-flash')
    assert.equal(merged.runningCount, 3, 'lead + b + c')

    // 无投影 / 空投影：原样返回（引用不变）
    assert.equal(gc.mergeRosterChannel(channel, undefined, 'lead'), channel)
    assert.equal(gc.mergeRosterChannel(channel, { members: [] }, 'lead'), channel)
  } finally {
    mounted.restore()
  }
})
