# Spike 取证 v1：S1–S6（编码前不确定点）

- 任务：task-14 / scout-api（只读取证，不写生产代码）
- 关联：`docs/architecture/group-chat-architecture.md` §1.1 Spike 清单；`docs/research/api-feasibility.md`；`docs/research/event-model.md`
- 证据根：`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/<pkg>/…`（下称 `<ASAR>/dsh/…`）
- 结论：**S1–S5 全部确定，无阻塞**。v1 纯 Client 方案成立。唯一新增实现约束见 S3-④（发送顺序）与 S4（动态标签）。

---

## 结论速览

| Spike | 结论 | 对 v1 的影响 |
|---|---|---|
| S1 | `eventSource.entries` 是**原始事件信封**：`{ type: 'event' \| 'transient', event: { type, seq, time, data, ignorable?, surfaceOp?, sourceEventSeqs? } }` —— **不是** ChatNode | **v1 纯 Client 成立**，不切 v2 Host |
| S2 | `prompt(..., requestId)` 的 `requestId` 原样落到接收侧 `user/message.data.source.rpcId`（普通会话与子会话两条路径都成立），且 Host 用同一个 rpcId 做**幂等去重** | 可精确对账 + 重试安全（同 requestId 重发不会重复投递） |
| S3 | `queue` 与 `steer` **都会唤醒** inactive 目标（二者 `wakeup=true`，区别只在 inbox 落点 `next-turn` vs `next-step`）；冷会话/冷子会话均自动 resume | 不需因「queue 不唤醒」而统一改 steer；但**子会话要求父 Agent 在线**，故发送顺序须 lead 先、成员后 |
| S4 | tab 只渲染 `label` 文本（`<span class="tabLabel">{label}</span>` + Tooltip），**无装饰位**；label thunk 可带静态后缀，但**不会因外部 store 变化而自动重读** | 「群聊」可用；**动态未读圆点不可靠**（D-ARCH-02 应保持降级） |
| S5 | 纯 client bundle 被接受：需一个 Loader 行 + `dsh.client`；Host 半最小合法形态是 `function apply() {}` + `export { apply }`（官方同名先例） | 保留空壳 Host 半即可，成本≈0 |
| S6 | open-computer-use 可操作 DSH Desktop（`com.deepseek.dsh` 正在运行），但存在焦点/窗口/AX 稀疏风险 | 可作为 e2e 兜底，不作主路径 |

---

## 方法与一处方法修正（重要）

asar 头 16 字节：`uint32le@0=4`、`@4`/`@8` 两个长度、`@12=json 长度`；JSON 索引从 offset 16 开始。**数据基址必须 4 字节对齐**：

```python
BASE = 16 + json_len
if BASE % 4: BASE += 4 - (BASE % 4)   # ← event-model.md 附录漏了这一步，会整体前移 2 字节
```

本轮实测 `json_len = 4748698`，`16+4748698 = 4748714`（不可被 4 整除）→ 正确基址 `4748716`。未对齐时每个文件开头多出 2 字节垃圾（表现为 `ap/**`、`ap//#region`），JS 仍可读但 `json.loads` 会失败。下文所有行号均在修正后的基址上取得。

---

## S1（关键）：`binding.eventSource.getSnapshot().entries` 的元素形状

### 结论

**是原始事件信封，不是 ChatNode/派生条目。**

```ts
type SessionEventLikeEntry =
  | { type: 'event';     event: SessionWireEvent }   // 持久事件
  | { type: 'transient'; event: SessionWireEvent }   // 客户端本地 assistant 流式行

interface SessionWireEvent {
  type: string;            // 'user/message' | 'assistant/message' | 'tool/call' | 'turn/start' | …
  seq: number;             // 持久事件为整数；transient 为**小数**（见下）
  time: number;            // host epoch ms
  data: JsonValue;         // 事件负载（user/message 的 data 即 UserMessage，含 source）
  ignorable?: true;
  surfaceOp?: JsonValue;
  sourceEventSeqs?: JsonValue;
}
```

外层 `type` 区分持久/瞬时，内层 `event` 恒有 `type/seq/time/data` —— 与 `dsh-client-ui-conversation/README.md` 对 adapter 的描述一致，但**现在有实现级证据**。

### 证据

1. `dsh-client-ui-chat` 等消费方一律按 `entry.event.*` 取值（不是 `entry.node`）：
   - `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/client/sessions/session.js:664` — `const event = entry.event;`
   - 同文件 `:597` — `this.eventSource.replace(visible, hasMore)`；`:645` — `this.eventSource.append(result.entry)`
2. 事件源实现本身暴露 entry 判别式：
   - `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/client/contract/events.js:91-102`（`settleAssistant`）：
     ```js
     const entries = materialize(this.window).filter(candidate =>
       (candidate.type !== 'transient' || candidate.event.data.attemptId !== attemptId));
     ...
     const index = entries.findIndex(candidate => candidate.event.seq > entry.event.seq);
     ```
     → 每个元素同时具备 `type`（外层判别）与 `event.{seq,data}`。
3. transient 行的**精确构造**（`<ASAR>/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/client/sessions/assistant-stream.js:109-125`）：
   ```js
   return { type: 'transient', entry: { type: 'transient', event: {
     type: 'assistant/live-chunk',
     seq: this.durableCursor + 1 - 1 / (this.transientInGap + 1),   // ← 小数 seq
     time: frame.time,
     data: { attemptId: frame.attemptId, turn, step, chunk },
   } } };
   ```
   同一文件 `:32-55` 在打开基线里也按同一形状 push（`visible.push({type:'transient', event:{...}})`）。
4. 持久行来自 Host 的 history page / follow 帧，形状由 `SessionEventEntry = { type: 'event'; event: SessionWireEvent }` 定义；客户端接收时逐字段白名单校验（`<ASAR>/…/lib/types/client/session-wire-event.js`，`assertSessionWireEvent`）：
   ```js
   for (const key of Object.keys(event)) {
     switch (key) { case 'type': case 'seq': case 'time': case 'data':
       case 'ignorable': case 'surfaceOp': case 'sourceEventSeqs': break;
       default: throw new Error(`${subject} has unexpected field ${key}`); }
   }
   ```
   → **可直接依赖的字段集合是封闭的 7 个**；未知字段会在入口被拒（Host 侧 merge-extensible 的类型在此被收窄）。
5. 窗口变更类型（增量合并用）：`contract/events.js:44/63/82` → `change.kind ∈ {'replace', 'prepend', 'append', 'settle-assistant'}`。

### 对实现的影响

- **v1 不切 v2 Host**：内核 `normalize(entries, memberCtx)` 直接吃 `entry.event`，不需要 ChatNode 或 `useChat`。
- 排序键：持久用 `(time, sessionRank, seq)`；transient 的 `seq` 是**小数**（`durableCursor + 1 - 1/(n+1)`，恒小于下一条持久 seq），所以「按 seq 单调、稳定插在持久行之间」天然成立，但**禁止 `Number.isInteger` 断言**、禁止用 `seq` 做 Map key 之外的整数运算（如 `seq+1` 定位）。
- 去重：transient 行有 `data.attemptId`；持久 `assistant/message` 结算时 `settle-assistant` 会把该 attempt 的 transient 行整批替换掉，内核按 `change` 精确增量即可，不必自行比对文本。
- 层数：`entries` 只到「事件」层，**不含 Turn/Step 分组、不含 markdown 解析**；这些仍需内核自己按 `turn/start|end`、`step/start|end` 聚合（与 event-model.md 的 Tier 模型一致）。
- 内容字段：`user/message.data` 即 `UserMessage`（`{id, content, source}`）；`assistant/message.data.message.content` 为 blocks，`data.stream` 为 `AssistantStreamRecord[]`。**不要**假设 `data.text`。

### 运行时验证（5 分钟，实现首日可选）

在 view 组件内临时（不落盘）打印，或由 Lead 在已登录页面的 DevTools 里通过调试钩子执行：

```js
const ref = ctx.sessions.retain(sessionId, { source: 'gateway' });  // 'gateway' 是内置 source key
const win = ref.binding.eventSource.getSnapshot();
console.log(win.change, win.revision);
console.log(win.entries.slice(-3).map(e => ({
  outer: e.type, inner: e.event.type, seq: e.event.seq, time: e.event.time,
  dataKeys: Object.keys(e.event.data ?? {}),
})));
// 期望：outer ∈ {'event','transient'}；inner.type 为 'user/message'/'assistant/message'/'tool/call'/...
// 等待流式时：出现 outer==='transient', inner.type==='assistant/live-chunk', seq 为小数
```

判定线（架构 R-14）：若 `entries[0]` 出现 `kind`/`node`/`blocks` 之类而非 `type/seq/time/data` → 才降级 lead-only + v2。按本轮源码，**不会发生**。

---

## S2：`requestId` 是否进入接收侧 `user/message.source.rpcId`？如何精确对账

### 结论

**是。两条发送路径都把 `requestId` 原样写成 `source.rpcId`，且 Host 用它做幂等去重。**

- 普通会话（lead）：`source = { kind:'user', rpcId: request.requestId, clientTimeZone?, principal? }`
- 子会话（teammate/subagent）：`source = { kind:'user', rpcId: request.requestId, clientTimeZone?, principal? }`

### 证据（client 调用链）

`<ASAR>/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/client/sessions/session.js`：

- 普通会话（`:186-201`）：
  ```js
  result = await this.remote.session.prompt({
    requestId: requestId ?? randomUUID(),
    sessionId: this.sessionId,
    mode,
    content,
    clientTimeZone,
  }, signal);
  ```
- 子会话（`:204-215`）：
  ```js
  const routed = await this.remote.subagents.prompt({
    requestId: requestId ?? randomUUID(),
    parentSessionId: this.address.parentSessionId,
    childSessionId: this.address.childSessionId,
    mode: 'continuable',
    delivery: mode,
    content: routedContent,
    clientTimeZone,
  }, signal);
  ```
- `requestId` 来源：`beginSubmission()` 里 `randomUUID()`（同文件 `:159-171`），返回 `SubmissionHandle{requestId, abandon()}`。

### 证据（host 侧落库）

- 普通会话 Remote 入口 `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/index.js:3226`：
  ```js
  async prompt(request, signal) {
    ...
    const source = { kind: "user", rpcId: request.requestId,
      ...(clientTimeZone === void 0 ? {} : { clientTimeZone }),
      ...(principal === void 0 ? {} : { principal }) };
    return this.commands.prompt(request, source);
  }
  ```
- 内部 `prompt(request, source)`（同文件 `:925-951`）：
  ```js
  const agent = await this.resolveAgent(request.sessionId);
  if (hasPromptRequest(agent, request.requestId)) return { accepted: true };   // ← 幂等
  ...
  const message = createUserMessage({ content: await ...admitPromptContent(...), source });
  if (request.mode === "steer") agent.steer(message);
  else agent.followup(message);
  ```
- 幂等判定 `hasPromptRequest`（同文件 `:1128-1145`）**逐字**：
  ```js
  function hasPromptRequest(agent, requestId) {
    const matches = (message) => {
      const source = message.source;
      return source.kind === "user" && "rpcId" in source && source.rpcId === requestId;
    };
    if (agent.inbox.nextTurn.some(matches) || agent.inbox.nextStep.some(matches)) return true;
    return agent.session.snapshotEvents().some((event) => {
      if (event.type !== "user/message") return false;
      const source = event.data.source;
      return source.kind === "user" && "rpcId" in source && source.rpcId === requestId;
    });
  }
  ```
  → 判定位置覆盖 **inbox（未消费）+ 已落库日志** 两处，即「本次会话此刻能看到的一切」。
- 子会话 Remote 入口 `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-subagent/lib/index.js:3187-3210`：
  ```js
  async prompt(request, signal) {
    ...
    const parent = this.ctx.get("agents")?.get(parentSessionId);
    if (parent === void 0) throw new RemoteError("subagent/parent-unavailable", …);
    const principal = principalOf(this.ctx.invocation);
    const source = { kind: "user", rpcId: request.requestId, ...(clientTimeZone…), ...(principal…) };
    ...
    return { messageId: await this[deliverSubagentPrompt](parent, childSessionId, content, source, signal, delivery) };
  }
  ```

### 对实现的影响

- **精确对账**：发送侧保留 `{ requestId, targetId, targetName, sentAt }`；接收侧从 `entry.event.type === 'user/message' && entry.event.data.source?.rpcId` 命中即认领，把本地「发送中」气泡替换成权威消息（替换时保留「同时发送给 @a @b」的前缀解读）。
- **重试安全**：同 `requestId` 重发时 Host 直接 `{accepted:true}` 而不重复投递（普通会话有该早退；子会话路径见下注）。因此「超时 → 原样重试」不会造成双发，这直接消解架构 R1 的一半风险。
- 回归送只补失败目标：失败目标**复用原 requestId** 重试即可；成功目标**不要**重发。
- 对账窗口：`hasPromptRequest` 只看当前会话的 inbox + 内存日志（`snapshotEvents()`），若会话已被宿主驱逐并且日志被裁剪，幂等性不再保证 → 对账逻辑仍应以「收到 rpcId 匹配」为准，不要在发送侧无脑重试无限次（建议 ≤2 次 + 退避）。
- 补充：`remote.subagents.prompt` 返回 `{ messageId }`（inbox 身份），与 `user/message` 事件的 `data.id` 一致（同一条消息）；这条 `messageId` 可作为「主对账键」与 `rpcId` 双保险。

### 验证建议

单测级：mock 两个目标，断言 (a) 收到事件 `data.source.rpcId === 发送 requestId`；(b) 同 requestId 二次 `prompt` 不产生第二条 `user/message`（可用 `snapshotEvents()` 计数）。真机级：发一条 @tester 消息，在 tester 会话日志里搜 `"rpcId":"<uuid>"`。

---

## S3：`queue` / `steer` 对 inactive 目标是否唤醒

### 结论

| 目标状态 | `queue`（`followup`） | `steer` |
|---|---|---|
| 普通会话 Agent 已在线但 idle | **启动新一轮**（wakeup=true） | **启动新一轮**（wakeup=true） |
| 普通会话 Agent 不在线（cold） | `resolveAgent` **自动 resume** 后再投递 | 同左 |
| 子会话驻留但 idle | `followup` → `next-turn` 入队 + `wakeDriver` | `steer` → `next-step` 入队 + `wakeDriver` |
| 子会话未驻留（cold） | `coldResume` → materialize → `submitAdmitted`（沿用 delivery） | 同左 |
| 子会话的**父 Agent 不在线** | **失败**：`subagent/parent-unavailable` | 同左 |

**唯一差异是 inbox 落点，不是唤醒能力**：`queue` 排到「下一轮」，`steer` 插到「本步之后/下一步」。对 *running* 目标，`steer` 在最近 step 边界插入（可能改变当前回合走向），`queue` 只追加一个新回合。

### 证据

1. Agent 循环 `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-agent-loop/lib/index.js:800-813`：
   ```js
   send(message, target, wakeup) {
     const wakingAfterAbort = wakeup && this.phase.kind !== "idle" && this.phase.abort.signal.aborted;
     const resolvedTarget = wakingAfterAbort ? "next-turn" : target;
     this.inbox.splice(resolvedTarget, Infinity, 0, [message]);
     if (wakeup) this.wakeDriver(wakingAfterAbort);
   }
   followup(input) { this.send(input, "next-turn", true); }
   steer(input)    { this.send(input, "next-step", true); }
   inject(input)   { this.send(input, "next-step", false); }   // ← 只有 inject 不唤醒
   ```
   同文件 `:841` 起 `wakeDriver` 注释：「A wake sent while idle always opens its turn boundary」。
2. 普通会话 Host 投递 `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/index.js:925-951`：
   `const agent = await this.resolveAgent(request.sessionId);` → `if (mode === "steer") agent.steer(message); else agent.followup(message);`
   `resolveAgent` 是「Resolve **or resume** one ordinary Session, deduplicating concurrent resumes」（同文件 `:204-231`，内部 `resolve()` 先查 live，再 `this.resume(sessionId, observation)`）。
3. 子会话投递 `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-subagent/lib/index.js`：
   - `:1585-1592` `deliver()`：`if (delivery === "steer") local.handle.agent.steer(message); else local.handle.agent.followup(message);`
   - `:1561` / `:1577` `queuePrompt` / `steerPrompt` 只把 `delivery` 透传进 `deliverToChild`；
   - `:2080-2100` `deliverToChild` → `deliverFollowup` 循环：`const activation = this.resident.get(childId); if (activation === void 0) return this.coldResume(parent, childId, content, options);`
   - `:2141` `coldResume(...)` 注释「Cold-resume a persisted child and submit the waiting turn」，实现末尾 `return await this.submitMaterialized(activation, content, options, parent);`（`:2204`），`submitMaterialized` → `submitAdmitted(activation, content, options, parent)`（`:2218`）→ `this.deliver(activation, message, options.delivery)` + `finally { this.wake(activation) }`（`:2225-2230`）。
   - `:3184` 注释与 `:3193` 代码：父 Agent 不在线 → `throw new RemoteError("subagent/parent-unavailable", 'parent session "…" is not live', …)`。
4. 相关失败码（`<ASAR>/dsh/node_modules/@deepseek-ai/dsh-subagent/lib/index.js:3180-3186` 的 JSDoc）：`subagent/attachment-invalid`、`subagent/invalid-time-zone`、**`subagent/parent-unavailable`**、`subagent/not-resumable`、`subagent/unauthorized`、`subagent/delivery-unavailable`（DRAINING / ACTIVATION_CLOSING / ACTIVATION_LIMIT_REACHED / CONTINUATION_UNAVAILABLE / PERSISTENCE_UNAVAILABLE，见 `:85-92` 的 `rejectPrompt` 映射）。

### 对实现的影响（含一条新增硬约束）

① 不需要因为「queue 不唤醒」而统一改 `steer`——原架构 §5.3 的顾虑不成立。
② **语义建议保持**：对 running 成员用 `queue`（不打断当前回合），对 idle/cold 成员两者等价，用 `steer` 语义更贴近「插话即答」；但 `queue` 一定也会唤醒。
③ 目标 UI 文案应区分「排队到下一轮」与「插话到本步之后」，避免用户以为 steer 会立即打断。
④ **新增硬约束（重要）**：`subagents.prompt` 要求**父 Agent 在线**。因此群发顺序必须是 **先给 lead 发（`remote.session.prompt` 会顺带 resume lead，使其变为 live）→ 再给 teammate/subagent 发**。若并行发出，成员目标可能因 lead 尚未 live 而报 `subagent/parent-unavailable`。若 lead 本身就是当前会话且必然在线，则顺序无关，但代码里不要假设。
⑤ 可选 UI 提示：`SessionSummary.agentAvailable` / `SessionSnapshot.subagent.parentAvailable` 可作为「目标当前可否接收」的弱信号（前者在 `sessions.list` 的 byId 行里）。

### 若仍要实证（真机 5 分钟）

1. 选一个 inactive teammate，在群聊视图发 `queue`，观察该成员会话出现新 `turn/start`（说明被唤醒）。
2. 再发 `steer`，同样观察新 turn；对比首个 `user/message` 是否落在 `inbox.next-step` 语义（可在 lead 侧临时打印 `session.inbox.nextStep.length`，需 Host 侧调试，或直接看 UI 的「插话」气泡样式）。
3. 关闭 lead 会话（让 lead 离线）后向成员发送，确认返回 `subagent/parent-unavailable`，再按影响④的顺序重试应成功。

---

## S4：`conversation.view` 的 label 能否带后缀装饰

### 结论

- tab 渲染路径**只有文本**：`<button role="tab">` → `<Tooltip label={viewTab.label}>` → `<span class="tabLabel">{viewTab.label}</span>`；**没有 icon/badge/装饰 slot**。
- `label` thunk 的返回值会原样进入该文本，因此**可以**带静态后缀（如 `"群聊"`、`"群聊 Beta"`），也可以带 `" •"` 之类字符。
- **但不能可靠承载动态状态**：`viewTabs()` 只在 `refreshViews()` 时重建（订阅 `conversation.view` 注册表 + locale + developerTools 三个源），外部 store 变化不会触发 label 重读。

### 证据

- `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js:18212-18222`（tab 渲染）：
  ```js
  visibleTabs.map((viewTab) => jsx("button", {
    role: "tab", "aria-selected": viewTab.id === active?.id,
    onClick: () => { selectView(viewTab.id); },
    children: jsx(Tooltip, { label: viewTab.label, portal: true,
      children: jsx("span", { className: css.tabLabel, children: viewTab.label }) })
  }, viewTab.id))
  ```
- 标签来源 `:19742-19752`：`slots.entries("conversation.view")` → `{ id, label: resolveSlotLabel(entry.options.label) ?? entry.options.id }`；`:19779` 处 `refreshViews` 比较 `tab.id === candidate.id && tab.label === candidate.label` 后才 `conversationViews.set(next)`。
- 重算触发（`refreshViews` 的三个订阅）：`slots.subscribe("conversation.view", refreshViews)`、`ctx.locale.subscribe(refreshViews)`、`ctx.configForms.developerTools.enabled.subscribe(refreshViews)`。
- `label` 契约：`type: "string | (() => string)"`，「A thunk is re-read on every projection, so localized text follows the active locale without re-registering」——**projection 指 tab 行的重新投影**，不是任意 React 渲染。

### 对实现的影响

- 「群聊」tab 名称直接用 `label: () => t('tab.groupChat')`（locale 切换会重建 → 中文/英文都正确）。
- **未读圆点（架构 D9 / D-ARCH-02）保持降级**：不要指望 `label: () => '群聊' + unread`。可行替代（按成本排序）：
  1. 不做 tab 级未读；在群聊视图内部与 header action 处展示未读（最低成本，建议 v1）；
  2. 用 `conversation.session.header.views.actions` 注册一个「More」行承载计数（该菜单是独立 React 渲染，能响应 store）；
  3. 若必须 tab 级，需在未读变化时人为触发一次重新投影（例如 locale 抖动）——**不推荐**，属 hack。
- 静态后缀（如 `"群聊"` 加全角空格 + 无）没有风险；但注意 `resolveSlotLabel` 对 thunk 的调用时机 = 投影时机，thunk 内不要做重计算。

---

## S5：纯 client bundle 是否被 loader 接受 / 最小 Host 壳

### 结论

**纯 client 插件合法**，但仍需一个可以被 Loader 装载的 Host 半（哪怕空实现），因为浏览器半是通过 `dsh.client` 声明由 host 侧扫描 Loader 行后派发 bundle 的（`dsh-client-modules`）。最小合法 Host 半：

```js
// lib/index.js  —— 官方同位先例逐字如此
/** Host plugin body; behavior lives in the browser export. */
function apply() {}
export { apply }
```

（ESM，无 `default`、无 `inject` 也可；行内 `name` 解析到 `main`。）

### 证据

- `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-experimental-client-ui-agent-team/lib/index.js` 全文：
  ```js
  /** Pure host half for the browser-discovered Agent Teams UI plugin. */
  /** Host plugin body; Team behavior lives in the browser export and Host RPC domain. */
  function apply() {}
  export { apply }
  ```
  其 `package.json`：`"main": "lib/index.js"`，`exports` 含 `"./client": "./lib/client.js"`，`"files": ["locale/*.json","lib/index.js","lib/client.js","lib/types/**/*.d.ts"]`，且 **`dsh` 段只有 `client`、没有 `bundle.patch`**（它由 `dsh-experimental-agent-team-profile` 这个 profile 包挂载）。
- `dsh-client-modules/README.md`（"Declaring a client plugin" / "Live plugin composition"）：
  「A browser plugin package declares `dsh.client` in its `package.json` with `platform: 'web'`, exports a `./client` bundle… The host half turns each declaration into a served bundle under `/plugins`」；「Enabling an ordinary plugin adds its Loader entry… Re-enabling loads one instance with its styles」。
- 我们自己独立安装的插件（可自查 `dsh-context`）则是 **`dsh.bundle.patch` + `dsh.client` 双声明**：
  `/Users/lzx/.dsh/profiles/desktop/node_modules/dsh-context/package.json` 的 `dsh.bundle.patch: "./cordis.patch.yml"`，patch 内容：
  ```yaml
  - insert:
      - id: dsh-context
        name: dsh-context
  ```

### 对实现的影响

- 独立可安装插件形态 = `cordis.patch.yml`（插入一行空壳 host）+ `lib/index.js`（`export function apply(){}`）+ `lib/client.js`（真实 UI）+ `locale/*.json`（可选 `icon.svg` 供市场）。
- 空壳 Host 半**没有运行成本**：`apply()` 不做任何注册，Loader 装载后即结束；`dsh.client` 的浏览器半按需懒加载（"nothing runs until a plugin is first used"）。
- 若想省掉 patch 文件，可改为「随某个 bundle/profile 一起分发」，但那要改别人的包 → v1 不采用。
- 注意 `exports` 必须含 `"./client"`（否则 host 找不到浏览器半），`main` 必须指向 Host 半；两者缺一都会导致 `dsh-client-modules` 激活报错（"a missing bundle fails activation loudly"）。

---

## S6：e2e 鉴权替代方案 —— open-computer-use 操作 DSH Desktop

### 结论

**可行**，且目标应用当前就在运行（`list_apps` 实测：`DeepSeek Harness — com.deepseek.dsh [running]`）。但它是**兜底**手段，不建议作为主 e2e 路径；主路径仍是「Lead 提供已鉴权 GUI URL」+ 页面内 DevTools/调试钩子。

### 可用工具（本会话已挂载的 open-computer-use MCP）

| 工具 | 用途 | 风险 |
|---|---|---|
| `list_apps` | 确认 DSH Desktop 在运行（已实测） | 无（只读元数据） |
| `get_app_state` | 取 DSH 主窗口截图 + 无障碍树（**每轮必须先调**） | 只读；但会创建 app-use session |
| `query` | 按 text/role 精确定位控件（比整树便宜） | 只读；索引 120s 过期 |
| `click` / `set_value` / `type_text` / `press_key` | 点 tab、填输入框、回车发送 | **可产生真实副作用**（在真实会话里发消息）；控件索引过期/误点风险 |
| `scroll` / `drag` | 滚动群聊流、拖拽 | 滚动较安全；drag 在 Electron 内可能需全局指针回退 |
| `perform_secondary_action` | 触发 AX 次级动作 | 依赖 AX 暴露程度 |
| `window_placement: agent_display` | 把窗口挪到不可见显示器渲染/接收输入，不扰动用户 Space | 窗口会从用户桌面消失（需 `restore` 复原）；对 Electron 多窗口应用有兼容风险 |

### 主要风险

1. **AX 稀疏**：DSH Desktop 是 Electron/Chromium，若主窗口未开启完整无障碍树，`get_app_state` 可能只给出骨架，群聊 tab/消息列表定位困难 → 需退回坐标点击（`x,y`），稳定性差。
2. **真实副作用**：点击「发送」会在真实会话里投递消息。必须在专门测试会话/测试 workspace 里跑，且发送前二次确认目标名。
3. **焦点/窗口干扰**：`get_app_state` 默认 `keep` 会读用户当前窗口；用户正在其他 App 时可能抢焦点。`agent_display` 可规避但会造成窗口消失/复原抖动。
4. **鉴权绕过的性质**：它绕过的是 GUI 的 URL token，并未绕过 Host 的 peer 鉴权；因此能验证 UI，但不能替代「多客户端/权限」类用例。
5. **不可作为 CI**：需要真实桌面会话，无法在无头环境重复执行。

### 建议

- 主路径：Lead 提供带 token 的 GUI URL（本会话 `:62300` 返回 401 即属此类），由人工/浏览器插件做 e2e。
- 备用路径：open-computer-use 仅用于「装好后 tab 是否出现、群聊能否渲染、单人发送是否落库」三类冒烟；每步用 `get_app_state` 复核 + 截图留证；不用于批量/回归。
- 若要脚本化：优先 Playwright（`mcp__playwright__browser_navigate` 到带 token 的 URL），它比 AX 稳定一个量级；open-computer-use 只在 Playwright 拿不到 token 时使用。

---

## 对 v1 架构的净影响清单

| # | 影响 | 动作 |
|---|---|---|
| 1 | S1 确认原始事件 → v1 纯 Client 成立 | 不切 v2；内核 `normalize(entry.event)` |
| 2 | transient `seq` 为小数 | 排序/插值逻辑按浮点处理；禁止整数断言 |
| 3 | `SessionWireEvent` 字段封闭（7 个） | 内核只读这 7 个字段，未知字段不可能出现（入口已拒） |
| 4 | requestId → `source.rpcId` + Host 幂等 | 对账精确化；重试复用 requestId（≤2 次），成功目标不重发 |
| 5 | queue 也唤醒 | 保留 `queue` 用于 running 目标；不必强制 steer |
| 6 | `subagents.prompt` 需父 Agent 在线 | **发送顺序：lead 先 → 成员后**；捕获 `subagent/parent-unavailable` 并给 UI 提示 |
| 7 | tab 无装饰位、label thunk 不响应外部 store | 未读圆点按 D9 降级（view 内展示或 header action），不改 tab |
| 8 | 空壳 Host 半 `function apply(){}` | 独立安装包 = patch + 空壳 host + client bundle |

## 仍属 UNVERIFIED（不阻塞）

1. `SessionReferenceSourceMap` 第三方 declaration merge 是否被构建允许（若不行 → 复用 `'gateway'`，只影响引用计数语义）。
2. `hasPromptRequest` 的幂等窗口在「会话被宿主驱逐 + 日志裁剪」后的确切边界（源码只看当前内存/日志；建议按 ≤2 次重试设计，不依赖无限幂等）。
3. `subagents.prompt` 在父 Agent 被驱逐但 child Activation 仍在的极端场景行为（源码要求 `agents.get(parent)`，故判失败；是否需要 UI 兜底提示由产品定）。
4. AX 树在 DSH Desktop 上的实际丰富度（S6 未实际执行 `get_app_state`，按「不用实际执行」的要求）。

---

## 附：本轮取证命令（可复现）

```bash
# 1) asar 读取（注意 4 字节对齐修正）
python3 - <<'PY'
import struct, json
P="/Applications/DeepSeek Harness.app/Contents/Resources/app.asar"
f=open(P,'rb'); a,b,c,d=struct.unpack('<IIII',f.read(16)); f.seek(16)
IDX=json.loads(f.read(d)); BASE=16+d
if BASE % 4: BASE += 4 - (BASE % 4)
def walk(n,pre=""):
    for k,v in n.get("files",{}).items():
        p=pre+"/"+k if pre else k
        if "files" in v: yield from walk(v,p)
        else: yield p,v
ents=dict(walk(IDX))
def get(p):
    m=ents[p]; f.seek(BASE+int(m["offset"])); return f.read(m["size"]).decode('utf-8','replace')
print(get("dsh/node_modules/@deepseek-ai/dsh-agent-loop/lib/index.js").split('\n')[799:813])
PY

# 2) 关键文件清单（本轮全部实读）
#   dsh-api-session-controller/lib/types/client/contract/events.js            (eventSource 实现)
#   dsh-api-session-controller/lib/types/client/sessions/assistant-stream.js   (transient 构造)
#   dsh-api-session-controller/lib/types/client/sessions/session.js            (prompt 分流 / publish)
#   dsh-api-session-controller/lib/types/client/session-wire-event.js          (字段白名单)
#   dsh-api-session-controller/lib/index.js                                    (prompt/resolveAgent/hasPromptRequest)
#   dsh-subagent/lib/index.js                                                  (queuePrompt/steerPrompt/deliver/coldResume)
#   dsh-agent-loop/lib/index.js                                                (followup/steer/inject 唤醒语义)
#   dsh-client-ui-conversation/lib/client.js                                   (tab 渲染 / refreshViews)
#   dsh-experimental-client-ui-agent-team/lib/index.js + package.json           (inert host 最小形态)
```
