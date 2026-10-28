/**
 * test/client/snapshot.mjs — 生成静态 HTML 预览（人工/截图核对 Figma 帧用）
 *
 * 用法：
 *   node test/client/snapshot.mjs [out.html] [search]
 * 默认：/tmp/group-chat-preview.html + `?gc-preview=1`
 *
 * 说明：
 *  - 不是生产代码，也不参与 npm test；
 *  - 用一个最小主题变量表（DSH 暗色实测值，docs/ux/group-chat-ux.md §11）填充
 *    --dsw-* token，便于在浏览器里看真实颜色；宿主里这些变量由 DSH 提供。
 */

import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { buildBundleSource } from '../../scripts/build.mjs'
import { createReactRuntime, mountBundle } from './harness.mjs'

const DARK_TOKENS = {
  '--dsw-alias-bg-base': '#151517',
  '--dsw-alias-bg-layer-1': '#232324',
  '--dsw-alias-bg-layer-2': '#2c2c2e',
  '--dsw-alias-bg-layer-3': '#353638',
  '--dsw-alias-bg-skeleton': 'rgba(255,255,255,0.08)',
  '--dsw-alias-border-l1': 'rgba(255,255,255,0.06)',
  '--dsw-alias-border-l2': 'rgba(255,255,255,0.12)',
  '--dsw-alias-border-l3': 'rgba(255,255,255,0.16)',
  '--dsw-alias-label-primary': '#f9fafb',
  '--dsw-alias-label-secondary': '#cfd3d6',
  '--dsw-alias-label-tertiary': '#adb2b8',
  '--dsw-alias-label-caption': '#81858c',
  '--dsw-alias-label-dimmed': '#5f6266',
  '--dsw-alias-label-primary-inverted': '#151517',
  '--dsw-alias-state-business-primary': '#7aaaff',
  '--dsw-alias-state-business-tertiary': '#34415b',
  '--dsw-alias-state-success-primary': '#22c55e',
  '--dsw-alias-state-success-tertiary': '#233c2c',
  '--dsw-alias-state-error-primary': '#f25a5a',
  '--dsw-alias-interactive-bg-hover': 'rgba(255,255,255,0.08)',
  '--dsw-specific-bubble': '#2c2c2e',
  '--dsw-specific-input-major': '#2c2c2e',
  '--dsw-specific-menu': '#303136',
  '--dsw-alias-button-primary-fill': '#f9fafb',
  '--dsw-alias-markdown-code-block': '#1b1b1c',
  '--dsw-alias-markdown-inline-code': '#2c2c2e',
  '--dsw-alias-link': '#7aaaff',
  '--dsw-alias-scrollbar-bg-l1': 'rgba(255,255,255,0.16)',
  '--dsw-alias-scrollbar-bg-hover-l1': 'rgba(255,255,255,0.28)',
  '--dsw-shadow-lv2': '0 12px 28px rgba(0,0,0,0.35)',
  '--dsw-alias-toast-bg': '#353638',
  '--dsw-alias-toast-label': '#f9fafb',
  '--dsw-alias-tooltip-bg': '#353638',
  '--dsw-font-markdown-code-font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace'
}


function wrapHtml(body, options, cssText, gc) {
  const hostChromeCss = `
#host{display:flex;flex-direction:column;height:100%;min-height:0}
#host-topbar{flex:none;height:120px;box-sizing:border-box;border-bottom:1px solid rgba(255,255,255,0.16);display:flex;align-items:flex-end;padding:0 24px;gap:28px;font-size:13px;color:#81858c}
#host-topbar .tab{padding-bottom:9px;border-bottom:2px solid transparent}
#host-topbar .tab.active{color:#7aaaff;border-bottom-color:#7aaaff}
#host-view{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden}
#host-composer{flex:none;height:72px;margin:8px 24px 16px;border:1px solid rgba(255,255,255,0.12);border-radius:28px;display:flex;align-items:center;padding:0 16px;color:#81858c;font-size:14px;background:#2c2c2e}
/* nofix 变体：显式取消 :has() 适配，复现 F-01（composer 被推出可视区） */
${options.noFix ? '#host-slot{display:block!important;flex:0 0 auto!important;overflow:visible!important;min-height:0!important}' : ''}
`
  const tokens =
    ':root{' +
    Object.keys(DARK_TOKENS)
      .map((key) => key + ':' + DARK_TOKENS[key] + ';')
      .join('') +
    '}'
  return `<!doctype html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="utf-8">
<title>${escapeHtml(options.title || '群聊 · 群聊视图预览')}</title>
<style>
${tokens}
html,body{margin:0;height:100%;background:#151517;color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",sans-serif}
body{display:flex;height:100%}
#sidebar{flex:none;width:260px;height:100%;background:#1b1b1c;border-right:1px solid rgba(255,255,255,0.06)}
#host{flex:1 1 auto;min-width:0;height:100%;display:flex;flex-direction:column}
@media (max-width:900px){#sidebar{display:none}}
${hostChromeCss}
${cssText}
</style>
</head>
<body>
<div id="sidebar"></div>
<div id="host">
  <div id="host-topbar"><span class="tab">对话</span><span class="tab active">群聊</span><span class="tab">轨迹</span><span class="tab">上下文</span></div>
  <div id="host-view" class="kiGsTW_viewArea">
    <div id="host-slot">${body}</div>
  </div>
  <div id="host-composer">回复…（宿主原生 composer 占位）</div>
</div>
</body>
</html>`
}

const runtime = createReactRuntime()
const h = runtime.React.createElement

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function styleToCss(style) {
  return Object.keys(style)
    .map((key) => {
      const cssKey = key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())
      return cssKey + ':' + style[key]
    })
    .join(';')
}

const PROP_ALIAS = {
  className: 'class',
  tabIndex: 'tabindex',
  readOnly: 'readonly',
  colSpan: 'colspan'
}

function serializeAttrs(props) {
  const out = []
  for (const key of Object.keys(props)) {
    const value = props[key]
    if (value === undefined || value === null || value === false) continue
    if (key === 'children' || key === 'key') continue
    if (/^on[A-Z]/.test(key)) continue
    if (key === 'style') {
      out.push('style="' + escapeHtml(styleToCss(value)) + '"')
      continue
    }
    const name = PROP_ALIAS[key] || key
    if (value === true) {
      out.push(name)
      continue
    }
    out.push(name + '="' + escapeHtml(value) + '"')
  }
  return out.length > 0 ? ' ' + out.join(' ') : ''
}

function serializeNode(node) {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string') return escapeHtml(node)
  if (Array.isArray(node)) return node.map(serializeNode).join('')
  if (node.type === '#text') return escapeHtml(node.text)
  const tag = String(node.type)
  if (tag === 'br' || tag === 'img' || tag === 'input') return '<' + tag + serializeAttrs(node.props) + '>'
  const inner = (node.children || []).map(serializeNode).join('')
  return '<' + tag + serializeAttrs(node.props) + '>' + inner + '</' + tag + '>'
}

/**
 * 渲染预览 HTML。
 * @param {{search?: string, title?: string}} [options]
 */
function buildStaticState(gc, mode) {
  const now = Date.now()
  const channel = gc.previewChannel({ readonly: mode === 'readonly' })
  const messages = gc.previewMessages(now)
  const base = gc.createFakeState({ channel: channel, messages: messages, phase: 'ready' })
  if (mode === 'filter') {
    base.filter = 'scout'
    base.messages = gc.filterMessages(messages, 'scout', channel)
  }
  if (mode === 'readonly') {
    base.channel = gc.previewChannel({ readonly: true })
  }
  return base
}

function renderComposedState(gc, mode) {
  const t = gc.translate
  const now = Date.now()
  const state = buildStaticState(gc, mode)
  const channel = state.channel
  const visible = gc.filterMessages(state.messages, state.filter, channel)
  const items = gc.buildFeed(visible, now)
  const candidates = gc.mentionCandidates(channel, 'sc')
  const draft = mode === 'mention' ? { text: '同步 @sc', mentions: [] } : { text: '', mentions: [] }
  const composerState = Object.assign({}, state, {
    draft: draft,
    mention: mode === 'mention' ? { start: 3, query: 'sc' } : null,
    mentionIndex: 0,
    unreadCount: mode === 'main' ? 3 : 0
  })
  const singleAgent = gc.isSingleAgent(channel)
  const emptyKind = mode === 'empty' ? 'no-team' : 'normal'

  return h(
    'div',
    { className: 'gc-root', 'data-plugin': 'group-chat' },
    h(
      'div',
      { className: 'gc-shell' },
    h(gc.GcChannelHeader, {
      t: t,
      channel: channel,
      filter: state.filter,
      readonly: !!(channel && channel.readonly),
      unread: composerState.unreadCount,
      filterOpen: mode === 'menu',
      onToggleFilter() {},
      onJumpLatest() {}
    }),
    mode === 'menu' ? h(gc.GcFilterMenu, { t: t, channel: channel, filter: null, onSelect() {} }) : null,
    h(gc.GcBanners, {
      t: t,
      state: state,
      filterCount: visible.length,
      onClearFilter() {},
      onReconnect() {}
    }),
    h(gc.GcFeed, {
      t: t,
      state: mode === 'skeleton' ? Object.assign({}, state, { phase: 'loading', messages: [] }) : state,
      items: mode === 'skeleton' ? [] : items,
      emptyKind: emptyKind,
      scrollRef: null,
      onScroll() {}
    }),
    composerState.unreadCount > 0
      ? h(gc.GcUnreadPill, { t: t, count: composerState.unreadCount, onJumpLatest() {} })
      : null,
    h(gc.GcComposer, {
      t: t,
      state: composerState,
      channel: channel,
      readonly: !!(channel && channel.readonly),
      candidates: candidates,
      compositionRef: { current: false },
      onTextChange() {},
      onSend() {},
      onSelectMention() {},
      onMoveMention() {},
      onHoverMention() {},
      onCloseMention() {},
      onRemoveMention() {}
    })
    )
  )
}

export async function renderPreviewHtml(options = {}) {
  const bundle = buildBundleSource({ modules: 'none' })
  const code = bundle.code
  const mounted = mountBundle(code, runtime, {
    search: options.search || '?gc-preview=1',
    clipboard: { writeText: () => Promise.resolve() }
  })
  try {
    const registrations = []
    mounted.module.apply({
      effect(fn) {
        return fn() || (() => {})
      },
      get() {},
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
        register(opts, component) {
          registrations.push({ opts, component })
          return () => {}
        }
      },
      sessions: {
        retain() {
          throw new Error('no sessions')
        },
        binding() {
          return undefined
        }
      }
    })
    const renderer = runtime.createRenderer()
    const gc = mounted.module.__internals
    if (options.mode && options.mode !== 'view') {
      const tree = renderer.render(renderComposedState(gc, options.mode))
      await renderer.settle()
      return wrapHtml(serializeNode(tree), options, extractCss(code), gc)
    }
    renderer.render(h(registrations[0].component, { sessionId: 'preview-lead-session' }))
    await renderer.settle()
    const body = serializeNode(renderer.tree)
    return wrapHtml(body, options, extractCss(code), gc)
  } finally {
    mounted.restore()
  }
}

function extractCss(code) {
  // 从构建产物里取内联样式（GC_CSS 的 JSON 字符串）
  const match = /var GC_CSS = ("(?:[^"\\]|\\.)*");/.exec(code)
  if (!match) throw new Error('GC_CSS not found in bundle')
  return JSON.parse(match[1])
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const out = process.argv[2] || '/tmp/group-chat-preview.html'
  const search = process.argv[3] || '?gc-preview=1'
  const mode = process.argv[4] || 'view'
  const noFix = (process.argv[5] || '') === 'nofix'
  renderPreviewHtml({ search, mode, noFix }).then(
    (html) => {
      writeFileSync(out, html, 'utf8')
      process.stdout.write('[snapshot] wrote ' + out + ' (' + html.length + ' bytes, search=' + search + ')\n')
    },
    (error) => {
      process.stderr.write(String((error && error.stack) || error) + '\n')
      process.exitCode = 1
    }
  )
}
