/**
 * test/client/harness.mjs — 无依赖的测试宿主
 *
 * 目标：在没有 jsdom / 没有 pnpm install 的前提下，能加载**真实构建产物**
 * `lib/client.js` 并渲染 `conversation.view` 注册的组件，断言 DOM 契约。
 *
 * 组成：
 *  1. createReactRuntime()：mini React（createElement + useState/useRef/useMemo/
 *     useCallback/useEffect/useLayoutEffect/useSyncExternalStore + Fragment）
 *  2. createSandbox()：宿主全局（window.__ModuleLoader__ / document / location / …）
 *  3. loadBundle()：vm 里执行 bundle，返回 factory 导出的 { apply, __internals }
 *  4. 树查询工具：findByTestId / findAllByTestId / findByAttr / textOf
 */

import vm from 'node:vm'

const Fragment = Symbol.for('gc.fragment')

/* ── mini React ───────────────────────────────────────────────────────── */

export function createReactRuntime() {
  function createElement(type, props, ...children) {
    const merged = Object.assign({}, props || null)
    const kids = children.length > 0 ? children : merged.children
    merged.children = normalizeChildren(kids)
    delete merged.ref
    if (merged.key !== undefined) delete merged.key
    return { type, props: merged }
  }

  let hookContext = null

  function currentInstance() {
    if (!hookContext) throw new Error('hook called outside render')
    return hookContext.instance
  }

  function hookIndex() {
    const instance = currentInstance()
    const index = instance.hookIndex
    instance.hookIndex += 1
    return { instance, index }
  }

  function useState(initial) {
    const { instance, index } = hookIndex()
    if (!(index in instance.hooks)) instance.hooks[index] = typeof initial === 'function' ? initial() : initial
    const setter = (next) => {
      const value = typeof next === 'function' ? next(instance.hooks[index]) : next
      if (value === instance.hooks[index]) return
      instance.hooks[index] = value
      hookContext.invalidate()
    }
    return [instance.hooks[index], setter]
  }

  function useRef(initial) {
    const { instance, index } = hookIndex()
    if (!(index in instance.hooks)) instance.hooks[index] = { current: initial }
    return instance.hooks[index]
  }

  function useMemo(factory, deps) {
    const { instance, index } = hookIndex()
    const prev = instance.hooks[index]
    if (prev && depsEquals(prev.deps, deps)) return prev.value
    const value = factory()
    instance.hooks[index] = { value, deps }
    return value
  }

  function useCallback(fn, deps) {
    return useMemo(() => fn, deps)
  }

  function useEffectImpl(fn, deps) {
    const { instance, index } = hookIndex()
    const prev = instance.hooks[index]
    if (prev && depsEquals(prev.deps, deps)) return
    instance.pendingEffects.push({ slot: index, fn, deps, cleanup: prev ? prev.cleanup : undefined })
  }

  function useSyncExternalStore(subscribe, getSnapshot) {
    const { instance, index } = hookIndex()
    const prev = instance.hooks[index]
    if (!prev || prev.subscribe !== subscribe) {
      if (prev && typeof prev.unsubscribe === 'function') prev.unsubscribe()
      const ownerContext = hookContext
      const unsubscribe = subscribe(() => {
        ownerContext.invalidate()
      })
      instance.hooks[index] = { subscribe, unsubscribe, value: getSnapshot(), getSnapshot }
    } else {
      prev.value = getSnapshot()
    }
    return instance.hooks[index].value
  }

  const React = {
    createElement,
    Fragment,
    useState,
    useRef,
    useMemo,
    useCallback,
    useEffect: useEffectImpl,
    useLayoutEffect: useEffectImpl,
    useSyncExternalStore
  }

  /* ── 渲染器 ─────────────────────────────────────────────────────────── */

  function createRenderer(initialElement) {
    const instances = new Map()
    let rootElement = initialElement
    let tree = null
    let dirty = true
    let renderCount = 0

    function renderPass() {
      const usedKeys = new Set()
      const counter = new Map()
      const pendingEffects = []
      dirty = false

      function nextKey(parentKey, type) {
        const name = (type && (type.displayName || type.name)) || 'anon'
        const base = parentKey + '>' + name
        const ordinal = counter.get(base) || 0
        counter.set(base, ordinal + 1)
        return base + '#' + ordinal
      }

      function walk(node, parentKey) {
        if (node === null || node === undefined || node === false || node === true) return null
        if (typeof node === 'string' || typeof node === 'number') return { type: '#text', text: String(node) }
        if (Array.isArray(node)) return node.map((child) => walk(child, parentKey)).filter(Boolean)
        const type = node.type
        const props = node.props || {}
        if (typeof type === 'function') {
          const key = nextKey(parentKey, type)
          usedKeys.add(key)
          let instance = instances.get(key)
          if (!instance) {
            instance = { key, hooks: [], pendingEffects: [], type }
            instances.set(key, instance)
          }
          const previousContext = hookContext
          hookContext = {
            instance,
            invalidate: () => {
              dirty = true
            }
          }
          instance.hookIndex = 0
          instance.pendingEffects = []
          let output
          try {
            output = type(props)
          } finally {
            hookContext = previousContext
          }
          pendingEffects.push({ instance, effects: instance.pendingEffects })
          return walk(output, key)
        }
        const children = normalizeChildren(props.children)
          .map((child) => walk(child, parentKey))
          .filter(Boolean)
        const cleanProps = Object.assign({}, props)
        delete cleanProps.children
        return { type: String(type), props: cleanProps, children }
      }

      tree = walk(rootElement, 'root')
      // 清理卸载实例的订阅
      for (const [key, instance] of Array.from(instances.entries())) {
        if (!usedKeys.has(key)) {
          for (const hook of instance.hooks) {
            if (hook && typeof hook === 'object' && typeof hook.unsubscribe === 'function') hook.unsubscribe()
            if (hook && typeof hook === 'object' && typeof hook.cleanup === 'function') hook.cleanup()
          }
          instances.delete(key)
        }
      }
      // 执行 effects
      for (const group of pendingEffects) {
        for (const effect of group.effects) {
          if (typeof effect.cleanup === 'function') {
            try {
              effect.cleanup()
            } catch {}
          }
          const cleanup = effect.fn()
          const slot = group.instance.hooks[effect.slot]
          group.instance.hooks[effect.slot] = { deps: effect.deps, cleanup: typeof cleanup === 'function' ? cleanup : undefined }
          if (slot && typeof slot.cleanup === 'function' && slot.cleanup !== cleanup) {
            // deps 未变时保留原 cleanup（useEffect 不会重跑）
          }
        }
      }
      renderCount += 1
    }

    function flush(maxPasses = 5) {
      let pass = 0
      while (dirty && pass < maxPasses) {
        renderPass()
        pass += 1
      }
      return tree
    }

    return {
      render(element) {
        if (element !== undefined) rootElement = element
        dirty = true
        return flush()
      },
      rerender(element) {
        if (element !== undefined) rootElement = element
        dirty = true
        return flush()
      },
      get tree() {
        return tree
      },
      get renderCount() {
        return renderCount
      },
      /** 执行交互后把 store 触发的重渲染跑完 */
      async act(fn) {
        let result
        if (typeof fn === 'function') result = fn()
        if (result && typeof result.then === 'function') await result
        await Promise.resolve()
        dirty = true
        flush()
        await Promise.resolve()
        flush()
        return result
      },
      async settle() {
        for (let i = 0; i < 5; i += 1) {
          await Promise.resolve()
          if (dirty) flush()
        }
        return tree
      }
    }
  }

  return { React, createRenderer }
}

function depsEquals(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function normalizeChildren(kids) {
  const out = []
  const walk = (value) => {
    if (value === null || value === undefined || value === false || value === true) return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    out.push(value)
  }
  if (Array.isArray(kids)) kids.forEach(walk)
  else walk(kids)
  return out
}

/* ── 沙箱 ─────────────────────────────────────────────────────────────── */

export function createSandbox(overrides = {}) {
  const styleNodes = []
  const document = {
    head: {
      appendChild(node) {
        styleNodes.push(node)
        node.parentNode = document.head
        return node
      }
    },
    body: {
      appendChild(node) {
        node.parentNode = document.body
        return node
      },
      removeChild() {}
    },
    createElement(tag) {
      return { tagName: String(tag).toUpperCase(), dataset: {}, style: {}, textContent: '', children: [] }
    },
    querySelector() {
      return null
    },
    querySelectorAll() {
      return []
    },
    execCommand() {
      return false
    }
  }
  const location = { search: overrides.search || '', href: 'http://localhost/' }
  const navigator = {
    language: overrides.language || 'zh-CN',
    clipboard: overrides.clipboard === undefined ? undefined : overrides.clipboard
  }
  const storage = new Map()
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null
    },
    setItem(key, value) {
      storage.set(key, String(value))
    },
    removeItem(key) {
      storage.delete(key)
    }
  }
  const window = {}
  const globals = { window, document, location, navigator, localStorage }
  return { globals, document, location, localStorage, styleNodes }
}

/** 卸载/安装 globalThis 上的假宿主（navigator 等只有 getter，必须用 defineProperty）。 */
function installGlobals(globals) {
  const saved = []
  for (const [key, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
    saved.push([key, descriptor])
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
      enumerable: true
    })
  }
  return function restoreGlobals() {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
}

/**
 * 在**同一 realm**（globalThis）安装假宿主后执行 bundle。
 *
 * 用同一 realm 是为了避免跨 realm 的 Array/Object 原型差异（断言更直观），
 * 代价是测试期间 globalThis 上会出现 window/document/location 等，测试结束
 * 调用返回的 restore() 复原。
 *
 * @param {string} code bundle 源码
 * @param {object} runtime createReactRuntime() 的返回值
 * @param {object} [options] { search, language, console }
 */
export function loadBundle(code, runtime, options = {}) {
  const fake = createSandbox(options)
  const restoreGlobals = installGlobals(fake.globals)

  let captured = null
  globalThis.window.__ModuleLoader__ = {
    load(descriptor) {
      captured = descriptor
    }
  }
  vm.runInThisContext(code, { filename: 'lib/client.js' })
  if (!captured || typeof captured.factory !== 'function') {
    throw new Error('bundle did not register a factory through window.__ModuleLoader__.load')
  }
  const moduleExports = captured.factory(function require(id) {
    if (id === 'react') return runtime.React
    throw new Error('unexpected require: ' + id)
  })
  restoreGlobals()

  return { id: captured.id, module: moduleExports, descriptor: captured, globals: fake.globals, restore: () => {} }
}

/**
 * 保持假宿主在 globalThis 上（渲染结束后再 restore）。
 * loadBundle 默认会复原；渲染类测试需要“安装但不复原”的版本，用本函数。
 */
export function mountBundle(code, runtime, options = {}) {
  const fake = createSandbox(options)
  const restoreGlobals = installGlobals(fake.globals)
  let captured = null
  globalThis.window.__ModuleLoader__ = {
    load(descriptor) {
      captured = descriptor
    }
  }
  try {
    vm.runInThisContext(code, { filename: 'lib/client.js' })
  } finally {
    // window.__ModuleLoader__ 需要保留，其余无妨
  }
  if (!captured || typeof captured.factory !== 'function') {
    throw new Error('bundle did not register a factory through window.__ModuleLoader__.load')
  }
  const moduleExports = captured.factory(function require(id) {
    if (id === 'react') return runtime.React
    throw new Error('unexpected require: ' + id)
  })
  return {
    id: captured.id,
    module: moduleExports,
    descriptor: captured,
    globals: fake.globals,
    restore() {
      restoreGlobals()
    }
  }
}

/* ── 树查询 ───────────────────────────────────────────────────────────── */

export function walkTree(tree, visit) {
  if (!tree) return
  if (Array.isArray(tree)) {
    tree.forEach((node) => walkTree(node, visit))
    return
  }
  visit(tree)
  const children = tree.children || []
  children.forEach((child) => walkTree(child, visit))
}

export function findAll(tree, predicate) {
  const out = []
  walkTree(tree, (node) => {
    if (predicate(node)) out.push(node)
  })
  return out
}

export function findByTestId(tree, testId) {
  return findAll(tree, (node) => node.props && node.props['data-testid'] === testId)[0] || null
}

export function findAllByTestId(tree, testId) {
  return findAll(tree, (node) => node.props && node.props['data-testid'] === testId)
}

export function findByAttr(tree, attribute, value) {
  return (
    findAll(tree, (node) => {
      if (!node.props) return false
      if (value === undefined) return node.props[attribute] !== undefined
      return node.props[attribute] === value
    })[0] || null
  )
}

export function findAllByAttr(tree, attribute, value) {
  return findAll(tree, (node) => {
    if (!node.props) return false
    if (value === undefined) return node.props[attribute] !== undefined
    return node.props[attribute] === value
  })
}

export function textOf(node) {
  if (!node) return ''
  if (typeof node === 'string') return node
  let out = ''
  walkTree(node, (item) => {
    if (item.type === '#text') out += item.text
    else if (typeof item.type === 'string' && (item.type === 'p' || item.type === 'span' || item.type === 'strong' || item.type === 'code')) return
  })
  // 上面的 walk 也会进入子节点，text 已收集；片段文本可能重复统计子节点，这里只取 #text
  return out
}

/** 元素可见文本（深度优先拼接 #text）。 */
export function visibleText(node) {
  let out = ''
  walkTree(node, (item) => {
    if (item.type === '#text') out += item.text
  })
  return out
}

/** 触发点击（会做 preventDefault/stopPropagation 桩）。 */
export function click(node) {
  if (!node || !node.props || typeof node.props.onClick !== 'function') {
    throw new Error('click: node has no onClick handler')
  }
  return node.props.onClick({
    preventDefault() {},
    stopPropagation() {},
    defaultPrevented: false,
    target: { value: '', selectionStart: 0 }
  })
}

/** 触发键盘事件。 */
export function keyDown(node, key, extra = {}) {
  if (!node || !node.props || typeof node.props.onKeyDown !== 'function') {
    throw new Error('keyDown: node has no onKeyDown handler')
  }
  return node.props.onKeyDown(
    Object.assign(
      {
        key,
        shiftKey: false,
        preventDefault() {},
        stopPropagation() {}
      },
      extra
    )
  )
}

/** 触发输入（textarea onChange）。 */
export function change(node, value, caret) {
  if (!node || !node.props || typeof node.props.onChange !== 'function') {
    throw new Error('change: node has no onChange handler')
  }
  return node.props.onChange({
    preventDefault() {},
    target: { value, selectionStart: caret === undefined ? value.length : caret }
  })
}
