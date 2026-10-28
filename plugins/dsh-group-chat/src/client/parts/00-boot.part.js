/* ──────────────────────────────────────────────────────────────────────────
 * 00-boot.part.js — 常量、宿主模块桥、日志
 *
 * 本文件不是 ES module：它由 scripts/build.mjs 按文件名顺序拼进 lib/client.js
 * 的 factory 作用域，与其它 parts 共享同一作用域（避免重名）。
 * 可用的构建期符号：React / h / Fragment / require / __def / __req / __has / __opt
 * （__def 等由构建 preamble 提供，用于访问 src/core、src/adapters、src/send 的模块）。
 * ────────────────────────────────────────────────────────────────────────── */

const NS = 'group-chat'
const GC_LOG = '[group-chat]'
const GC_BUILD_ID = __GC_BUILD.id
/** 构建指纹（version+hash）：失败诊断展示 `build=…`，用于确认页面实际加载的 bundle 版本。 */
const GC_BUILD_LABEL =
  (__GC_BUILD && (__GC_BUILD.build || __GC_BUILD.hash || __GC_BUILD.version)) || 'dev'
const GC_VIEW_ID = 'group-chat'
const GC_VIEW_ORDER = 5

/** 本地兜底上限（core 的 limits 存在时以其为准）。 */
const GC_LOCAL_LIMITS = {
  firstScreen: 200,
  pageOlder: 50,
  maxMessagesInMemory: 2000,
  textRender: 65536,
  foldLines: 8,
  foldChars: 400,
  maxMembers: 32,
  maxDepth: 3,
  batchMs: 120,
  unreadClearThreshold: 32,
  draftTtlMs: 24 * 60 * 60 * 1000
}

/** 会话在全局时间线中的排序权重（架构 §4.3.1）。 */
const GC_SESSION_RANK = { lead: 0, teammate: 1, subagent: 2, system: 3 }

/** 写入正文时用的角色小标签 key（v1.2 无徽标，仅卡片消息头使用）。 */
const GC_ROLE_LABEL_KEY = {
  lead: 'member.roleLead',
  teammate: 'member.roleTeammate',
  subagent: 'member.roleSubagent',
  system: 'member.roleFallback',
  user: 'member.roleFallback'
}

/** 安全地取构建期注册的可选模块（src/**），不存在返回 undefined。 */
function gcOptionalModule(id) {
  try {
    return typeof __opt === 'function' ? __opt(id) : undefined
  } catch (error) {
    try {
      console.warn(GC_LOG, 'optional module failed:', id, error && error.message)
    } catch {}
    return undefined
  }
}

function gcCore(name) {
  return gcOptionalModule('src/core/' + name + '.js')
}

function gcAdapter(name) {
  return gcOptionalModule('src/adapters/' + name + '.js')
}

function gcSendModule(name) {
  return gcOptionalModule('src/send/' + name + '.js')
}

/** limits：core 优先，缺失用本地兜底。 */
function gcLimits() {
  const mod = gcCore('constants')
  const fromCore = mod && (mod.limits || mod.LIMITS)
  return Object.assign({}, GC_LOCAL_LIMITS, fromCore && typeof fromCore === 'object' ? fromCore : null)
}

/** URL `?gc-debug=1` 也可临时打开诊断（不落盘）。 */
function gcIsDebugRequested() {
  try {
    if (typeof location === 'undefined' || !location) return false
    return /(?:^|[?&])gc-debug=(1|true)(?:&|$)/.test(location.search || '')
  } catch {
    return false
  }
}

let gcDebugVisibleOverride = null

/**
 * 诊断可见性：`localStorage['group-chat:debug']==='1'` 或 URL `?gc-debug=1`。
 * 默认关闭——失败 caption 只显示用户可读文案；`data-send-debug` 属性始终保留。
 * `gcSetDebugVisible(true/false/null)` 供测试与运行时强制覆盖（null = 跟随环境）。
 */
function gcDebugEnabled() {
  if (gcDebugVisibleOverride !== null) return gcDebugVisibleOverride
  try {
    if (typeof localStorage !== 'undefined' && localStorage && localStorage.getItem('group-chat:debug') === '1') {
      return true
    }
  } catch {}
  return gcIsDebugRequested()
}

/** 仅测试/诊断用：强制诊断可见性（null 恢复跟随 localStorage/URL）。 */
function gcSetDebugVisible(value) {
  gcDebugVisibleOverride = value === null || value === undefined ? null : Boolean(value)
}

function gcDebug() {
  if (!gcDebugEnabled()) return
  try {
    // eslint-disable-next-line no-console
    console.debug(GC_LOG, ...Array.prototype.slice.call(arguments))
  } catch {}
}

function gcWarn() {
  try {
    // eslint-disable-next-line no-console
    console.warn(GC_LOG, ...Array.prototype.slice.call(arguments))
  } catch {}
}

let GC_UID = 0

/** 本地 id（仅用于 UI key / clientBatchId，不是权威 id）。 */
function gcUid(prefix) {
  GC_UID += 1
  const rand = Math.random().toString(36).slice(2, 10)
  return (prefix || 'gc') + '-' + Date.now().toString(36) + '-' + GC_UID.toString(36) + rand
}

/** 稳定字符串化（日志/调试用，避免循环）。 */
function gcShortError(error) {
  if (error === null || error === undefined) return 'unknown'
  if (typeof error === 'string') return error
  if (error && typeof error.message === 'string' && error.message !== '') return error.message
  try {
    return String(error)
  } catch {
    return 'unknown'
  }
}

/** 安全执行（点击处理等边界，不把异常抛给宿主渲染器）。 */
function gcSafe(fn, label) {
  return function gcSafeHandler() {
    try {
      return fn.apply(null, arguments)
    } catch (error) {
      gcWarn('handler failed:', label || '', gcShortError(error))
      return undefined
    }
  }
}

/** 让布局稳定后再跑（测试环境无 rAF 时同步执行）。 */
function gcRaf(fn) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(function () {
      try {
        fn()
      } catch (error) {
        gcWarn('raf task failed:', gcShortError(error))
      }
    })
    return
  }
  try {
    fn()
  } catch (error) {
    gcWarn('task failed:', gcShortError(error))
  }
}

/** 取文本前 n 个码位（不切断代理对）。 */
function gcClip(text, n) {
  const s = typeof text === 'string' ? text : text === null || text === undefined ? '' : String(text)
  if (s.length <= n) return s
  return Array.from(s).slice(0, n).join('')
}

/** 复制到剪贴板（渐进降级）。 */
function gcCopyText(text) {
  const value = typeof text === 'string' ? text : String(text === null || text === undefined ? '' : text)
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
    return nav.clipboard.writeText(value).then(
      function () {
        return true
      },
      function () {
        return gcCopyFallback(value)
      }
    )
  }
  return Promise.resolve(gcCopyFallback(value))
}

function gcCopyFallback(value) {
  try {
    if (typeof document === 'undefined' || !document.body) return false
    const area = document.createElement('textarea')
    area.value = value
    area.setAttribute('readonly', 'readonly')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

function gcIsPreviewRequested() {
  try {
    if (typeof location === 'undefined') return false
    return /(?:^|[?&])gc-preview=[^&]*/.test(location.search || '')
  } catch {
    return false
  }
}
