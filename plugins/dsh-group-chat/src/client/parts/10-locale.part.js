/* ──────────────────────────────────────────────────────────────────────────
 * 10-locale.part.js — i18n 与时间格式化
 *
 * 字典来自 locale/{zh,en}.json（构建期内联为 GC_LOCALE，键集由构建校验）。
 * 命名空间：group-chat（架构 §6.9）。协议前缀不进 i18n（§5.2 规则 6）。
 * ────────────────────────────────────────────────────────────────────────── */

const GC_LOCALES = GC_LOCALE || { zh: {}, en: {} }
const GC_FALLBACK_LOCALE = 'zh'

let gcLocaleCode = gcDetectLocale()
/** locale 订阅者（视图用 useSyncExternalStore 订阅；label thunk 直接读 gcGetLocale） */
const gcLocaleListeners = new Set()

function gcDetectLocale() {
  try {
    if (typeof navigator !== 'undefined' && navigator && typeof navigator.language === 'string') {
      return /^zh/i.test(navigator.language) ? 'zh' : 'en'
    }
  } catch {}
  return GC_FALLBACK_LOCALE
}

/** 宿主 locale 变化时由 apply() 的订阅更新（label thunk 与视图共同响应）。 */
function gcSetLocale(code) {
  const next = code && /^zh/i.test(String(code)) ? 'zh' : code ? 'en' : gcLocaleCode
  if (next === gcLocaleCode) return
  gcLocaleCode = next
  gcLocaleListeners.forEach(function (listener) {
    try {
      listener()
    } catch (error) {
      gcWarn('locale listener failed:', gcShortError(error))
    }
  })
}

/** 订阅 locale 变化（useSyncExternalStore 兼容）。 */
function gcSubscribeLocale(listener) {
  gcLocaleListeners.add(listener)
  return function () {
    gcLocaleListeners.delete(listener)
  }
}

function gcGetLocale() {
  return gcLocaleCode
}

function gcLocaleTag() {
  return gcLocaleCode === 'zh' ? 'zh-CN' : 'en-US'
}

function gcDictionary(code) {
  return GC_LOCALES[code] || GC_LOCALES[GC_FALLBACK_LOCALE] || {}
}

/** `{name}` 占位替换；缺失变量保留原样，便于发现漏传。 */
function gcInterpolate(template, vars) {
  if (typeof template !== 'string') return ''
  if (!vars) return template
  return template.replace(/\{([a-zA-Z0-9_.]+)\}/g, function (match, key) {
    const value = vars[key]
    return value === null || value === undefined ? match : String(value)
  })
}

/** 翻译函数（纯函数，locale 由闭包/模块变量决定）。 */
function gcTranslate(key, vars) {
  const dict = gcDictionary(gcLocaleCode)
  const fallback = gcDictionary(GC_FALLBACK_LOCALE)
  const raw = dict[key] !== undefined ? dict[key] : fallback[key]
  if (raw === undefined) return key
  return gcInterpolate(raw, vars)
}

/** 取某个 locale 下的翻译（测试/标签用）。 */
function gcTranslateIn(code, key, vars) {
  const dict = gcDictionary(code)
  const raw = dict[key] !== undefined ? dict[key] : gcDictionary(GC_FALLBACK_LOCALE)[key]
  return raw === undefined ? key : gcInterpolate(raw, vars)
}

/** 列表连接符：中文「、」，其它「, 」（说明行/依赖行共用）。 */
function gcListSeparator() {
  return gcLocaleCode === 'zh' ? '、' : ', '
}

function gcJoinNames(names) {
  return gcAsArray(names).join(gcListSeparator())
}

/* ── 时间 ─────────────────────────────────────────────────────────────── */

function gcStartOfDay(date) {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function gcClockText(ts) {
  const date = new Date(ts)
  try {
    return new Intl.DateTimeFormat(gcLocaleTag(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  } catch {
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return hh + ':' + mm
  }
}

/**
 * 时间分隔文案（架构 §6.5 / UX §4）：`今天 · 11:02`；跨天用日期。
 * 分隔插入规则见 gcShouldInsertDivider（20-store）。
 */
function gcTimeDividerText(ts, nowTs) {
  const now = typeof nowTs === 'number' ? nowTs : Date.now()
  const today = gcStartOfDay(new Date(now))
  const day = gcStartOfDay(new Date(ts))
  const diffDays = Math.round((today - day) / 86400000)
  if (diffDays === 0) return gcTranslate('time.today') + ' · ' + gcClockText(ts)
  if (diffDays === 1) return gcTranslate('time.yesterday') + ' · ' + gcClockText(ts)
  const date = new Date(ts)
  try {
    const dayText = new Intl.DateTimeFormat(gcLocaleTag(), {
      month: '2-digit',
      day: '2-digit'
    }).format(date)
    return dayText + ' · ' + gcClockText(ts)
  } catch {
    return (
      String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') + ' · ' + gcClockText(ts)
    )
  }
}

/** 消息行时间（卡片消息头 11px 用）。 */
function gcMessageTimeText(ts) {
  return gcClockText(ts)
}
