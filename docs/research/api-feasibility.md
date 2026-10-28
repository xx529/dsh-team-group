# 对话页新增「群聊」视图 —— DSH 插件技术取证报告

- 任务：task-1 / scout-api（只读取证）
- 取证环境：DSH Desktop，profile=desktop，Web GUI `http://127.0.0.1:62300`
- 结论级别：**可行**。A/B/C 三块都有**已安装且已上架的真实第三方插件先例**（`dsh-context` 的 `fleet` tab 就做同类事），不需要改 DSH 本体。
- 证据约定：本报告中「内置包」指 `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/<pkg>/`（下称 `<ASAR>/dsh/...`，用 read 工具可直接读）；「已装插件」指 `/Users/lzx/.dsh/profiles/desktop/node_modules/<pkg>/`。行号均为本轮实测。
- 未取证项统一标 **UNVERIFIED**，文末集中列出。

---

## 0. 结论摘要（给实现者的 8 条）

1. `conversation.view` 是 **list 型、scope=session** 的 slot，注册参数 `{name, id, order, label, locale?, children?, store?, inject?}`；**不需要任何 Host 代码**就能加一个 tab。
2. 视图组件会被自动注入 **18 个 standardProps**（含 `useSessions` / `useProjection` / `useChat` / `useConversation` / `inputActions` / `sessionId`），另有 4 个 ownerProps（`inspectCall` / `viewRequest` / `openView` / `completeViewRequest`）。
3. 跨会话读取**已有现成通路**：客户端 `ctx.sessions.retain(id, {source})` → `SessionReference.binding`（含 `eventSource` 事件窗口）和 `SessionListState.projectionsBySession`；服务端 `ctx.sessionQuery`（`observeSession` / `readSession` / `traceSession`）。
4. Lead 身份：`sessions.binding(sessionId)?.session.getSnapshot().subagent?.address?.parentSessionId ?? sessionId`（官方团队 UI 就是这么取的）。
5. 团队名册有**现成 wire projection**：`agentTeam`（Lead 会话日志派生，客户端读 `projectionsBySession[lead].values.agentTeam`）。**
6. 发送：浏览器侧**只需要** `binding(targetId).session.prompt(content, 'steer'|'queue')`；它内部自动分流——普通会话走 `remote.session.prompt`，子会话（teammate/subagent）走 `remote.subagents.prompt(... mode:'continuable' ...)`。
7. `agentTeams.sendMessage` **不是 @Remote，浏览器调不到**（要求 live Agent caller）；群聊 v1 走「人类 prompt」路径，不写 Team mailbox。
8. 「同时发给谁」只能靠**文本前缀**表达（`PromptContentPart` 只有 text/image/file），因为目标是各会话自己的日志；这既是限制也是让接收方看到说明的唯一持久手段。

---

## A. 视图挂载（view mounting）

### A1. `conversation.view` 的权威契约

来源：内置包生成的 slot 目录 `dsh-cordis-client-runner/lib/client.js`（该文件内是机器生成的 slot catalog，逐条含 registerOptions/ownerProps/standardProps/source）。`conversation.view` 条目原文要点：

- `kind: "list"`，`scope: "session"`
- `summary: "Registered Conversation target Views, rendered one at a time."`
- `registerOptions`：
  - `id` **required**，`type: "string"` — "Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it."
  - `order` optional，`type: "number"` — "Position among the entries, ascending (default 0)."
  - `label` optional，`type: "string | (() => string)"` — "A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
- `ownerProps`（`ConvViewOwnerProps`，由渲染器传入，见 A3）：
  ```ts
  interface ConvViewOwnerProps {
    inspectCall: ((callId: string) => void) | undefined
    viewRequest: ConversationViewRequest | null
    openView: (view: string, focus: string) => void
    completeViewRequest: () => void
  }
  ```
- `standardProps`（18 项，slot 组件直接作为 props 收到）：
  ```
  useRemoteAccess: (action: RemoteEndpoint) => boolean
  useResource: UseResource
  useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>
  usePanelInfo: UsePanelInfo
  useSessions: UseSessions
  useSessionStatus: UseSessionStatus
  useSessionRetainInfo: UseSessionRetainInfo
  useSessionAccess: (sessionId: SessionId, action: RemoteEndpoint) => boolean
  useWorkspaceAccess: (workspaceId: WorkspaceId, action: RemoteEndpoint) => boolean
  useChat: UseChat
  useConversation: UseConversation
  useInput: SnapshotSelectorHook<InputState>
  inputActions: InputActions
  useSession: SessionSnapshotSelector
  sessionId: SessionId
  useProjection: UseProjection
  useAccess: (action: RemoteEndpoint) => boolean
  useTrajectory: UseTrajectory
  ```
- `declaredBy: "an entry in 'conversation.session' (client-ui-conversation), so it exists while that entry is mounted"`
- `replaceRisk: "none"`
- `source: "packages/client/ui-conversation/src/client/contract/slots.ts:260"`
- 官方示例（同一 catalog，逐字）：
  ```js
  return {
    inject: ['slots'],
    apply(ctx) {
      ctx.slots.inject('conversation.view', () => ctx.slots.register(
        { name: 'conversation.view', id: 'my-entry', order: 100, label: 'My entry' },
        () => React.createElement('div', null, 'hello'),
      ))
    },
  }
  ```

### A2. 官方的实际注册写法（可照抄）

`dsh-client-ui-chat/lib/client.js` 第 13223 行起（chat 视图）：

```js
ctx.slots.inject("conversation.view", () => {
  return ctx.slots.register({
    name: "conversation.view",
    id: "chat",
    order: 0,
    label: () => t("view.chat"),   // t = ctx.locale.bind(NS)
    locale: NS,
    children: { "conversation.chat.flow": { kind: "single", scope: "session", inject: CHAT_FLOW_INJECT } },
    store: chatStore,
    inject: (sessionId) => { /* 返回 ownerProps 之外的额外注入 */ },
  }, ChatView);
});
```

- `locale: NS` + `label: () => t('...')` 是本地化惯例：先 `ctx.locale.register(NS, {zh, en})`，再 `ctx.locale.bind(NS)`（`dsh-client-ui-conversation/lib/client.js` 中 `ctx.effect(() => ctx.locale.register(NS, {zh, en}), "ui-conversation: dictionaries"); const t = ctx.locale.bind(NS);`）。
- Tab 可见性由注册本身决定：`viewTabs()` 遍历 `slots.entries("conversation.view")`，用 `resolveSlotLabel(entry.options.label) ?? entry.options.id` 生成标签；`chat` 被固定（`FIXED_VIEW_ID = "chat"`），其余可被用户 pin/unpin 进 **More conversation views** 菜单。

### A3. 渲染与切换（openView / focus / header 联动）

`dsh-client-ui-conversation/lib/client.js`：

- 渲染点（DefaultConversationViews）：
  ```js
  renderSlot("conversation.view",
    { inspectCall, viewRequest, openView, completeViewRequest: actions.completeViewRequest },
    { only: viewId })
  ```
  即 ownerProps 由外层合并注入，`only` 指定当前选中的 view id。
- 打开/切换（registerConversationSession 的 inject 返回 `openView`）：
  ```js
  const openView = (view, focus) => {
    if (!viewTabs().some((tab) => tab.id === view)) return;
    activateView(sessionId, view);       // 写入会话级 active target
    actions.openView(view, focus);       // 一次性 focus 请求
  };
  ```
- 选择规则：已持久化的用户选择优先，否则注册的 `chat` 优先，**不会**退化为「第一个注册的 view」。
- Header 的 More 菜单：`conversation.session.header.views.actions`（list，root scope）；每行收到 `entries`（`{id,label,pinned,active}`）、`onOpen(id)`、`onPinnedChange(id,pinned)`、`onDismiss()`。
- ownerProps 里的 `openView(view, focus)` 可让「群聊里点某人 → 跳到那个会话的 chat 视图」；`viewRequest`/`completeViewRequest` 是「一次性 focus 目标」机制（例如点工具调用直接定位）。

### A4. 第三方注册先例（决定性证据：本条不需要任何特权）

1. `dsh-terminal-panel/lib/client.js` 第 4076 行起：
   ```js
   ctx.slots.inject('conversation.view', () => ctx.slots.register({
     name: 'conversation.view', id: 'terminal-panel', order: 30, locale: NS, label: () => t('tab.terminal'),
     // 不返回 t / sessionId 等保留名：owner props 已由 renderer 合并且优先级最高（contract F28）。
     inject: () => ({}),
   }, TerminalPanel))
   ```
2. `dsh-capability-settings/lib/client.js` 第 10154 行起：`{ name:"conversation.view", id:"capability", order:40, label:"能力" }`，并在组件内用 `props?.sessionId` 拿会话（`resolveViewSessionId`）。
3. `dsh-context/lib/client.js` 第 28 行：`id:"context", order:20, locale:WP, label:()=>t('tab.context')`；另有 `id:"fleet", order:30`（由设置项 `fleetTab()` 控制是否注册）。

→ **已占用 id 实测**：`chat(0)`、`context(20)`、`trajectory(10)`、`terminal-panel(30)`、`fleet(30)`、`capability(40)`。新群聊视图建议 `id: "group-chat"`、`order: 5`（在 chat 之后、trajectory 之前），不覆盖任何现有 id。

> 说明：客户端 inspect（`cordis_inspect_query platform=client provider=Slots`）本轮 **超时不可用**——`curl http://127.0.0.1:62300/` 返回 `HTTP 401 / "dsh web authentication required; reopen the URL printed by dsh web."`，页面侧 inspect 通道无已鉴权页面可应答。因此 slot 契约以上面的**机器生成 catalog（asar 内）+ 真实注册代码**为证据，等价或更强。

---

## B. 数据可达性（cross-session read）

### B1. 客户端：会话列表、投影、事件窗口

`dsh-cordis-client-runner/lib/client.js` 的声明目录（同一文件，`name`/`declaration` 对）给出客户端 Session API：

```ts
interface ISessions {
  readonly list: ObservableSnapshot<SessionListState>
  retain(target: SessionTarget, options: SessionRetainOptions): SessionReference
  using<T>(target: SessionTarget, options: SessionRetainOptions, operation: (ref: SessionReference) => T | Promise<T>): Promise<T>
  retainInfo(id: SessionId): ObservableSnapshot<SessionRetainInfo>
  readonly searchResultLimit: number
  create(opts?: {...}): Promise<SessionId>
  subagentAddress(id: SessionId): SubagentAddress | undefined
  refreshProjections(sessionId: SessionId): Promise<void>
  refresh(): Promise<void>
  search(query, signal): Promise<RemoteResult<{items: SessionSearchResultItem[]; hasMore: boolean}>>
  fork(opts): Promise<SessionId>
  scope(id: SessionId): AgentContext | undefined
  scopeOf(ctx: Context): SessionId | undefined
  sessionOf(ctx: Context): SessionFace | undefined
  binding(id: SessionId): SessionBinding | undefined
}

interface SessionListState {
  ids: SessionId[]
  byId: Record<SessionId, SessionSummary>
  phase: SessionListPhase          // 'pending' | 'ready'
  projectionsBySession: Readonly<Record<SessionId, SessionProjectionSnapshot>>
}
interface SessionProjectionSnapshot {
  readonly values: Readonly<Partial<SessionProjectionMap>>
  readonly state: 'idle' | 'loading' | 'ready' | 'migration-required' | 'error'
  readonly error: RemoteFailure | null
}
interface SessionBinding {
  readonly sessionId: SessionId
  readonly session: SessionFace            // = ISession & ObservableSnapshot<SessionSnapshot>
  readonly eventSource: SessionEventSource
  readonly ctx: AgentContext
}
interface SessionReference extends Disposable {
  readonly sessionId: SessionId
  readonly binding: SessionBinding
  readonly ready: Promise<SessionBinding>
  release(): void
}
interface SessionRetainOptions { readonly source: SessionReferenceSource; readonly signal?: AbortSignal | undefined }
type SessionEventSource = ObservableSnapshot<SessionEventWindow>
interface SessionEventWindow {
  readonly entries: readonly SessionEventLikeEntry[]
  readonly hasMore: boolean
  readonly revision: number
  readonly change: SessionEventChange
}
```

`SessionSnapshot`（同文件）关键字段：
```ts
{ sessionId, pendingSubmissions, running,
  subagent: { address: SubagentAddress; parentAvailable?: boolean } | null,
  removed, openState, openError, hasMore, loadingOlder, promptError,
  blank, lastAgentError, promptAttempted, awaitingFirstTurn }
```

**结论**：客户端已能按任意 `SessionId` 拿到「事件窗口 + 快照 + 投影」，这就是跨会话时间线合并的原料；`retain(..., {source})` 是登记引用计数（官方团队 UI 用 `sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView` 判断会话是否被主视图保留）。

### B2. Lead 身份与团队名册（已有 wire projection）

- Lead 推导（`dsh-experimental-client-ui-agent-team/lib/client.js` 第 475-477 行）：
  ```js
  const leadSessionId = (sessionId) =>
    (sessions.binding(sessionId)?.session.getSnapshot().subagent?.address)?.parentSessionId ?? sessionId;
  ```
- 名册来自 **`agentTeam` wire projection**，无需 RPC：
  - 内置 `dsh-experimental-agent-team/README.md` 第 172-176 行：「The `agentTeam` Session projection publishes the Lead Session's durable roster identities and phases, member errors, non-deleted task views, and any `failure`… Its `apply` replaces only the touched collection」。
  - 读取方式（`dsh-experimental-client-ui-agent-team/README.md` 第 52 行）：「the Team view from `projectionsBySession[lead].values.agentTeam`, member activity from Session status with the list summary as fallback, and the model from `projectionsBySession[member].values.modelSelection.next`」。
  - 代码级：`useSessions((state) => state.projectionsBySession[member.id]?.values.modelSelection?.next?.model)`、`useSessionStatus((state) => state.get(member.id)?.running)`、`useSessions((state) => state.byId[member.id]?.running)`（第 89-92 行）。
- `TeamMemberView`（host catalog `agentTeams`）字段：`{ id: SessionId, name, role:'lead'|'teammate', status:'running'|'inactive'|'provisioning'|'failed', description?, provider?, context?, model?, diagnostics }`。
- teammate ↔ lead 父子关系也可直接读 `SessionSummary.parentSessionId` / `origin:'subagent'`（见 B4）。

### B3. 当前会话的 chat/timeline（ChatNode）

- ChatNode 种类（catalog 中 `conversation.chat.node` 的 `keyDomain`，"already taken" 列表逐字）：
  `assistant-step, command, command-input, compaction, context, manual-compaction, model-retry, question-reply, steering, system-prompt, tool-call, turn-error, turn-max-tokens, turn-process, turn-tail, turn-trigger, unknown, user, workflow-run`
- 读取方式（`dsh-client-ui-chat/lib/client.js` ChatView，第 2745 行起）：
  `useChat((s) => s.order)`、`useChat((s) => s.nodes)`、`useChat((s) => s.navigation.items())`；节点级 keyed hook：`useChatNode(nodeKey)`（第 3713 行 `ChatNodeSeat`）。
- 增补：`useChat`/`useConversation`/`useProjection` 的**精确 TS 签名未随 app.asar 发布**（包内无 `.d.ts`），只有上面的字符串契约 + 真实调用点 → 精确类型 **UNVERIFIED**（用法可确定）。

### B4. Host 侧读其它会话（替代/补充路径）

- `ctx.sessionQuery`（host catalog 实测签名）：
  - `observeSession(sessionId, {signal?, projectionMode:'all'|'none'}): Promise<SessionObservation>`（含 `header`、`events`、`cursor`、`projections?`，`Symbol.dispose`/`retain()`）
  - `readSession(sessionId): Promise<SessionLogSnapshot>`、`listEvents(sessionId)`、`readSurface(sessionId)`、`listSessions()`、`filterSessions(filters)`
  - `traceSession(sessionId): Promise<SessionLineageTrace>` —— **父子谱系直接由它给出**（`ancestors` / `descendants` / `root`）
- `ctx.sessionController`（host，`@Remote`）：`list`、`search`、`page`、`follow`（stream）、`projections`、`control`（stream，baseline 覆盖**所有**会话投影）、`prompt`、`cancel`、`rename`、`fork`、`updateQueue`、`attachment`。`SessionAddress` 支持子会话：
  ```ts
  type SessionAddress =
    | { kind:'session'; sessionId: SessionId }
    | { kind:'subagent'; parentSessionId: SessionId; childSessionId: SessionId; mode: 'one-shot'|'continuable'|'unknown' }
  ```
- **现成先例**：`dsh-context` 的 `fleet` tab 就是跨会话聚合。其 host 侧 HTTP 路由 `/api/dsh-context/fleet` 用 `sessionQuery.observeSession(sessionId, {projectionMode:'none'})` 取原始事件，解析：
  - `subagent/descriptor` → `{mode,label,provider,agentProvider,agentModel,agentReasoningEffort,persona}`
  - `team/member` → 名册条目
  - `user/message` 且 `source.kind ∈ {'agent-message','team-message','subagent-settled'}` → 通信/回执，并用正则从文本首块剥出发送者
  - 最后一条 `assistant/message` → `lastReply`
  - （以上函数在 `dsh-context/lib/index.js` 压缩产物中，`Yr`/`$r`/`Zr` 附近；README 侧对应"fleet"）
  详见 C5 的路由写法。

### B5. 跨会话合并所需字段（结论）

| 字段 | 来源 | 用途 |
|---|---|---|
| `sessionId` | `SessionBinding.sessionId` / `SessionSummary.sessionId` | 行归属、@ 归属 |
| `seq` | `SessionEvent.seq` / `SessionWireEvent.seq` | **会话内**单调；不能跨会话比较 |
| `time` | `SessionEvent.time` / `SessionWireEvent.time`（host 时钟 ms） | 跨会话主排序键 |
| `type` + `data` | `SessionEventMap`（`user/message`、`assistant/message`、`tool/call`、`tool/result`、`subagent/descriptor`、`team/member`…） | 渲染分派 |
| 发送者身份 | `user/message` 的 `source.kind`（`user` / `agent-message` / `team-message` / `subagent-settled`）+ `senderSessionId` / `senderName` | A→B 的 @xxx 展示 |
| 父子关系 | `SessionHeader.parentSession`、`SessionSummary.parentSessionId`、`SessionSnapshot.subagent.address`、`sessionQuery.traceSession()` | 名册与分组 |

排序建议：`(time, sessionId, seq)`；同毫秒冲突用 sessionId 二级排序保证确定性。

---

## C. 发送通路（sending）

### C1. 客户端发送 API（唯一需要用的）

```ts
interface ISession {
  prompt(content: PromptContentPart[], mode: 'queue' | 'steer', signal?: AbortSignal, requestId?: SessionRequestId)
    : Promise<RemoteResult<{ accepted: true }>>
  beginSubmission(input: BeginSubmissionInput): SubmissionHandle   // 乐观回显 + requestId
  cancel(); updateQueue(itemId, action); rename(title); command(line); loadOlder(); loadThrough(seq)
  readonly projections: ProjectionsFace
}
type PromptContentPart =
  | { type:'text'; text:string }
  | { type:'image'; mediaType; data; name? }
  | { type:'file'; receiptId }
```

调用：`ctx.sessions.binding(targetId)!.session.prompt([{type:'text', text}], 'steer')`。

### C2. 内部自动分流（决定「能不能发给 teammate / subagent」）

`dsh-api-session-controller/lib/types/client/sessions/session.js` 第 186-215 行 `prompt()`：

- `address === undefined`（普通会话）：
  ```js
  this.remote.session.prompt({ requestId, sessionId: this.sessionId, mode, content, clientTimeZone }, signal)
  ```
- `address !== undefined`（子会话，`session.subagent.address` 存在）：
  - 含 `file` part → 直接失败 `RemoteError('subagent/attachment-invalid', 'subagent continuation does not accept files', {reason:'SUBAGENT_FILE_UNSUPPORTED'})`
  - 否则：
  ```js
  this.remote.subagents.prompt({
    requestId, parentSessionId: this.address.parentSessionId, childSessionId: this.address.childSessionId,
    mode: 'continuable', delivery: mode, content, clientTimeZone,
  }, signal)
  ```

→ **同一句 API 同时覆盖 lead、teammate、subagent**，路由由会话自身地址决定，调用方不需要判断类型。

### C3. 权限/caller 约束（关键结论）

| 通路 | 是否 @Remote | 浏览器能否调用 | 说明 |
|---|---|---|---|
| `ISession.prompt` → `remote.session.prompt` / `remote.subagents.prompt` | 是 | **能** | 就是 composer 的人类发送路径；以「用户消息」身份进入目标会话（`source.kind: 'user'`），会触发目标新一轮回复 |
| `ctx.agentTeams.sendMessage(caller: Agent, request)` | **否**（host Service，无 `@Remote`） | **不能** | 要求 exact live sending Agent 作为 authority；`SendTeamMessageRequest = {target: string, content: ContentBlock[], signal}`，返回 `{messageId}` |
| `ctx.agentTeams.spawnTeammate / interrupt` | 否 | 不能 | Lead-only，同上 |
| `ctx.commands.execute(agent: Agent, line, qualifications, signal)` | 是（`@Remote`） | 需 agent scope | 客户端等价物是 `ISession.command(line)`，群聊不必要 |
| `ctx.subagents.sendMessage(sender: Agent, targetId, content, options)` | 否 | 不能 | 需 live sender Agent |

→ **群聊 v1 的语义定位**：用户是发送者，消息以普通 user message 落到每个目标会话。**不是** Team 的 peer mailbox 消息，因此不会产生 `agent-message` source，也不会进入 `agentTeam` 名册的通信统计。若产品要求「以 lead 身份/以 peer 身份投递」，必须在 Host 侧加一层（例如一个仅内部使用的 command 或 tool，让 **lead Agent** 去调 `agentTeams.sendMessage`），这已超出 v1 范围。

### C4. 「同时发给 lead 和 @ 的 teammate」+ 让接收方看到同时发送说明

限制与事实：
- `PromptContentPart` 只有 `text`/`image`/`file`，**没有元数据位**可以传「还给谁发了」。
- 接收方看到的是目标会话日志里的普通 `user/message`，文本就是它收到的全部上下文。
- 对方是 A→B 场景时，官方 peer 文本格式是 `Team message from <name>: <正文>`（`dsh-experimental-agent-team/README.md` 第 130 行：「The target stores `agent-message` source with the actual `senderSessionId`; the first content block is `Team message from <name>:`」）。

→ **推荐做法（唯一可靠的）**：给每个目标各发一条**同构文本**，首行是带机器可读前缀的收件人声明，正文相同：

```
[群聊 · 同发] 收件人: @lead @reviewer @tester
（本消息由用户在「群聊」视图同时发送给上述 N 位成员；各成员在自己的会话中各自收到一份，回复也各自回到自己的会话。）

<用户正文>
```

- 首行用稳定正则解析（如 `/^\[群聊 · 同发\] 收件人: (.+)$/m`），客户端渲染时折叠成「已同发 @a @b」，不必每次读正文。
- 用户正文里手写的 `@name` 由客户端解析为收件人集合；未 @ 任何人的消息只发 lead（即 `收件人: @lead`）。
- 每个目标用**同一次点击生成的一组** `requestId`（各自独立）以便失败重试与本地回显对齐；`beginSubmission` 只在 UI 侧造回显，不要对每个目标都建 echo 以免串台。
- 目标是 teammate/subagent 时 `mode` 语义建议用 `'steer'`（最近 step 边界投递/唤醒），与 `agentTeams` 文档描述一致（「Steer gives a running target the message at its nearest step boundary and starts or cold-resumes an inactive target」）。

### C5. UI 触发 Host 操作的三种机制（按推荐度）

1. **@Remote（首选，无需 Host 代码）**
   - 客户端注入 `@deepseek-ai/dsh-api-remotes`（`dsh-context/package.json` 的 `dsh.client.inject` 就是这么写的），@Remote 命名空间经 `ctx.remote.<ns>.<method>` 暴露；`AgentContext.remote` 类型为 `ClientRemote & TypertRemoteScopeApi<'agent'>`。
   - 现成可用的命名空间：`session`（page/follow/projections/control/list/search/prompt/cancel…）、`subagents`（prompt/interruptByParent）、`commands`、`workspace`、`goal`、`schedule`、`fileUploads` 等。
   - 返回值为 `RemoteResult<T>`（`{ok:true,value}` / `{ok:false,error: RemoteError}`）；stream 方法返回 `AsyncIterable`，客户端用 `remote.$stream({name, open, ended})` 包成生命周期流（见 `dsh-api-session-controller/lib/types/client/transport.js`）。
2. **自定义 HTTP 路由（先例：dsh-context）**
   - Host：`ctx.inject(['connection'], (scope) => { route(scope, scope.get('connection'), '/api/dsh-context/fleet', async (req) => Response.json(...), 'dsh-context: fleet route') })`；路由走 `connection` 的 fetch handler，做 peer 准入。
   - Client：`await fetch('api/dsh-context/fleet', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({sessionId, full}) })`（**相对路径、无前导斜杠**，见 `dsh-context/lib/client.js` 第 14 行 `let sr = 'api/dsh-context/detail'` 与 `fetch(sr, …)`）。
   - 适用：需要在 Host 侧做重聚合/截断（冷会话、全量日志折叠）时，避免客户端拉整段事件。
3. **wire projection（适合「小、稳定、高频」的派生状态）**
   - Host：`ctx.sessionProjections.register({ key, stateSchema, init(header, inherited), apply(state, event), wire: { viewSchema, view(state) }, stateVersion })`，注册随 fiber 卸载自动撤销。
   - Client：`useSessions(s => s.projectionsBySession[sessionId]?.values.<key>)`；`useProjection('<key>')` 读当前会话。
   - 先例：`agentTeam`（名册/任务）、`modelSelection`、`title`、`inbox`、`turnOutline`。
   - 注意：`wire` 值只在该 key 注册期间出现在快照里，插件卸载即「能力缺失」；`apply` 必须纯函数，且只有 `Object.is` 变化才发帧。

> 组合建议：**群聊视图默认走 1（@Remote）**；仅当出现「冷会话首屏 / 大量长文本要服务端截断」的性能问题时，再加 2 的旁路接口。

---

## D. 打包与安装

### D1. 目录结构（实测：已安装的 `dsh-context`）

```
dsh-context/
├── package.json
├── cordis.patch.yml
├── icon.svg
├── README.md
├── LICENSE
├── lib/
│   ├── index.js        # Host half（Node/Cordis 插件，可不存在；dsh-context 有）
│   └── client.js       # Browser half（window.__ModuleLoader__.load 包一层）
└── locale/
    ├── en.json
    └── zh.json
```

### D2. `package.json` 关键字段（`dsh-context/package.json` 逐字摘）

```jsonc
{
  "name": "dsh-context",
  "version": "0.77.0",
  "type": "module",
  "icon": "icon.svg",
  "engines": { "node": "^22.19.0 || >=24.0.0", "dsh": ">=0.2.0-rc.2 || >=0.2.1-rc.2" },
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "exports": {
    ".": { "types": "./lib/index.d.ts", "default": "./lib/index.js" },
    "./client": "./lib/client.js",
    "./package.json": "./package.json",
    "./locale/*.json": "./locale/*.json"
  },
  "files": ["icon.svg","locale/*.json","lib/client.js","lib/index.js","lib/index.d.ts","cordis.patch.yml","README.md","LICENSE"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "inject": [
        "@deepseek-ai/dsh-api-remotes",
        "@deepseek-ai/dsh-client-connection",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-conversation",
        "@deepseek-ai/dsh-client-ui-settings",
        "@deepseek-ai/dsh-client-ui-sidebar-right"
      ],
      "platform": "web"
    },
    "compatibility": { "dshReleases": { "0.2.0-rc.2": "compatible", "0.2.1-rc.2": "compatible" } }
  },
  "peerDependencies": { "@deepseek-ai/cordis": "^4.0.4" }
}
```

要点：
- `dsh.client.platform: "web"` + `exports["./client"]` 是浏览器插件的必要条件；`dsh.bundle.patch` 指向 bundle patch 层。
- `dsh.client.inject` 是**客户端侧 Cordis 服务注入声明**（不是 npm 依赖）：要 `slots`、`locale`、`sessions`、`uiWorkspace`、`api-remotes` 等就写在这里。
- `icon.svg` + `locale/*.json` 是市场/设置页展示与本地化要求（`dsh-context` 两样都有；`dsh-experimental-client-ui-agent-team` 只有 `locale/{en,zh}.json`，无 icon —— icon 是市场条目要求，非运行必需）。

### D3. `cordis.patch.yml`（实测全文 6 行）

```yaml
# Bundle patch layer: the row loads the package's main entry as the host half
# (a plain Cordis plugin); the `dsh.client` declaration makes the web app load
# its ./client bundle as the browser half.
- insert:
    - id: dsh-context
      name: dsh-context
```

### D4. client 入口格式（bundler 产物，手写也可）

`dsh-experimental-client-ui-agent-team/lib/client.js` 第 1-3、506-512 行：

```js
window.__ModuleLoader__.load({
  id: "@deepseek-ai/dsh-experimental-client-ui-agent-team",
  factory: (require) => {
    var module = { exports: {} };
    /* ... React / primitives via require("...") ... */
    function apply(ctx) { /* 注册 locale + slot */ }
    exports.apply = apply;
    exports.inject = ["sessions", "uiWorkspace", "slots", "locale"];
    return module.exports;
  },
});
```

- `exports.inject` 与 `dsh.client.inject` 是两处互补声明：前者是**模块内**实际用到的服务名（Cordis 注入），后者是**构建/装配**声明。
- CSS 注入惯例：`document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]")` 判重后 `appendChild`（同上文件第 13-20 行）；`dsh-context` 用同一手法注入 tailwind 产物。

### D5. 安装与热更新

- 安装：`plugin_manager` 工具，动作 `list_plugins` → `install_bundle`（`target` 可为 Plugin entry id / bundle 包名 / 安装 spec），需要 danger-full-access 权限（本 scout 被禁止调用，由 Lead 执行）。安装后浏览器侧 HMR 会跟随 Host 的 Loader 图。
- 热更新的**边界**（`dsh-client-modules/README.md`，"Live plugin composition" / "Host release changes"）：
  - 打开中的 Web 页面通过 HMR 传输跟随 Host 的完整模块图：**启用插件 = 增加 Loader entry**，禁用 = 移除 entry 并等待其异步副作用结束再驱逐模块与样式；重新启用 = 只加载一个实例。
  - 已变化的模块行会切到带 revision 的 combo URL —— **client bundle 改动可不重启加载**。
  - 但「A page applies graphs and rebuilt frames only while the connected Host serves the release the page booted from」——Host release 身份（`version` + source `commit`）变了，页面**不会**接收新图，只能整页刷新。**改 Host 半代码 = 需要重启 Host + 刷新页面**。
  - 构建前置：`pnpm run build` 必须已产出每个包的 `lib/client.js`，否则激活时明确报错并列出缺包路径（"a missing bundle fails activation loudly"）。
- 验证清单（安装后）：
  1. 页面顶部 tab 行出现「群聊」（若有 ≥2 个 view，Official 会渲染 tab bar；单 view 时 tab bar 隐藏）。
  2. `cordis_inspect_query platform=client provider=Slots {root:"conversation.view"}` 的 `occupants` 里出现新 id（需页面已鉴权，见 A4 说明）。
  3. DevTools console 无 `__ModuleLoader__` / `data-plugin-css` 报错。
  4. 点 tab 后 `conversation.view` 的 `only:<id>` 生效（切换后原 chat 滚动位置保留）。

---

## E. 风险与降级

### E1. 主要风险（按影响排序）

| # | 风险 | 证据 | 规避 |
|---|---|---|---|
| R1 | **发送非原子**：一次「群发」= N 次独立 `prompt`，可能部分成功/部分失败；`agentTeams` 明确「does not retain or deduplicate send attempts」 | `dsh-experimental-agent-team/README.md` 第 68 行、207 行 | UI 逐目标展示 accepted/failed；只重试失败项；把「已同发」写进文本前缀而非依赖任何事务 |
| R2 | **跨会话顺序不确定**：`seq` 只在会话内单调，`time` 是 Host 时钟 | `SessionEvent` / `SessionWireHeader` 声明 | 排序键 `(time, sessionId, seq)`；本地乐观回显单独置顶，收到权威事件后替换 |
| R3 | **数据放大**：每追加一个语料源就多一条 follow 流 + 多份投影；官方团队投影本来就「whole-view broadcasts 给每个浏览器」 | `dsh-experimental-agent-team/README.md` 第 201 行 | 只 follow 群组范围（lead + 名册成员 + 直属 subagent），上限 N；分页用 `page`/`turnWindow`/`maxMessages`；列表虚拟化 |
| R4 | **子会话发送依赖父 Agent 在线**：continuable 子会话走 `subagents.prompt(parentSessionId, childSessionId, 'continuable')`；官方 UI 在父离线时锁住 Send | 会话 README「if their parent is offline, Send and the composer gestures lock」；`SessionSnapshot.subagent.parentAvailable` | 读 `parentAvailable` 逐目标禁用输入并给出原因；lead 会话离线时整组只读 |
| R5 | **契约不稳定**：Team 相关包是 experimental，「no stability promise… contracts can change freely」 | `dsh-experimental-agent-team/README.md` 第 202 行 | 只依赖稳定面（`conversation.view` slot、`ISessions/ISession`、`remote.session/subagents`），对 `agentTeam` 投影做存在性判断（`projectionsBySession[lead]?.values.agentTeam ?? 降级`） |
| R6 | **peer 消息文本解析脆弱**：@ 发送者依赖 `Team message from <name>:` 前缀 | Team README 第 130 行；`dsh-context` 用 `/^Team message \S+ from ([^:]{1,64}):\s*/` 解析 | 解析失败时原样降级展示；昵称长度上限 64（与 Host 侧 `{1,64}` 对齐） |
| R7 | **冷会话首屏**：`retain` 才建 binding；`useSessions` 里的投影可能是 cached hint（`state:'loading'`） | `SessionProjectionSnapshot.state` 枚举；`sessionQuery.observeSession` 的 live/prepared 区分 | 每成员独立 loading 态；`refreshProjections(id)` 兜底；必要时走 C5-2 的 Host 路由一次性取摘要 |
| R8 | **无 CLI/服务端 inspect 佐证**：本轮 client inspect 因页面 401 不可用 | `curl http://127.0.0.1:62300/` → 401 | 实现后由 Lead 在已登录页面用 `Slots.listSubTree{root:"conversation.view"}` 复核 |

### E2. 降级方案（若跨会话聚合不可行）

**降级 A：仅 lead 会话派生「群聊」**（纯投影/纯渲染，零跨会话读）

- 数据源：lead 会话自身事件 + `agentTeam` 投影（名册/任务）。
- 信息损失：
  1. **看不到 agent→agent 的 peer 消息**——它们落在**目标**会话日志里，不在 lead 日志（Team README 第 130/184 行）。官方团队面板同样承认「No mailbox timeline — peer messages are not shown」（`dsh-experimental-client-ui-agent-team/README.md` 第 88 行）。
  2. **看不到 teammate / subagent 的最终输出**——`assistant/message` 在各自会话；只能拿到 `subagent-settled` 摘要或 `agentTeam` 里的状态/错误。
  3. **看不到工具调用细节**（`tool/call`、`tool/result` 在子会话）。
  4. 「同时发给谁」退化为**仅本地 UI 记录**（无接收方侧证据，接收方日志里只有文本前缀）。
- 仍能满足：用户发言、lead 每轮最终输出、名册与任务板、@ 解析与 @ 展示（lead 侧可见部分）。

**降级 B：只做「lead ↔ 单个 teammate」私聊 tab**（一次只 retain 一个子会话）
- 信息损失：无群聊合流、无多目标同发；实现量最小（单条 follow + 单条 prompt）。

**判定线**：只要 §B1 的 `retain + eventSource` 在真机验证通过（1 个 lead + 1 个 teammate 能出合并时间线），就走完整方案；否则退降级 A。建议实现顺序：**A 的壳 → 单会话合流验证 → 多会话合流 → 群发**。

---

## F. 推荐实现路线（Host / Client 分工）

### v1（推荐，纯 Client 插件，不改 Host）

```
client half（唯一必需）
  ├─ ctx.effect(() => ctx.locale.register('group-chat', {zh, en}))
  ├─ ctx.slots.inject('conversation.view', () => ctx.slots.register(
  │     { name:'conversation.view', id:'group-chat', order:5, locale:'group-chat',
  │       label: () => t('tab.groupChat') }, GroupChatView))
  └─ GroupChatView(props)   // 收到 18 个 standardProps + 4 个 ownerProps
        ├─ lead = binding(sessionId)?.session.getSnapshot().subagent?.address?.parentSessionId ?? sessionId
        ├─ 名册: useSessions(s => s.projectionsBySession[lead]?.values.agentTeam)
        ├─ 成员会话: sessions.list → byId[*].parentSessionId === lead / origin==='subagent'
        ├─ 读: sessions.retain(memberId, {source:'groupChat'}) → binding.eventSource 订阅，合并 (time, sessionId, seq)
        ├─ 渲染: user / assistant-final / tool / agent-message(@xxx) / subagent-settled，
        │        长文本 clamp + 「展开全文」（参考 TaskCard 的 scrollHeight 测量写法）
        └─ 发送: 解析 @ → targets = [lead, ...mentions]
                对每个 target: binding(t)?.session.prompt([{type:'text', text: 前缀+正文}], 'steer')
```

- 额外可选：`conversation.session.header.views.actions` 加一条「群聊设置」；`conversation.chat.assistant-actions` 加「同发到群聊」（先例：`dsh-context` 注册了 `conversation.chat.assistant-actions`）。
- 引用来源声明：本插件 `source: 'groupChat'` 需在 `SessionReferenceSourceMap` 做 declaration merge（官方做法见 `dsh-experimental-client-ui-agent-team` 使用的 `retainedBy.mainView`）——**第三方能否 merge，UNVERIFIED**（降级：直接用 `'gateway'` 或复用 `'mainView'`）。

### v2（仅在需要时）：Host 半补充

- 用途 A：冷会话/全量日志的服务端压缩 → 自定义路由 `POST /api/group-chat/summary`（照抄 `dsh-context` 的 `connection` 注入 + `sessionQuery.observeSession`）。
- 用途 B：把「群发」变成 Team mailbox 投递（需要**以 lead Agent 身份**调 `agentTeams.sendMessage`）→ 一个内部 command（`ctx.commands.register`）或专用 tool，由 UI 触发 `ISession.command('/group-send ...')`。注意：这会改变接收方看到的 source（`agent-message`），也就变成「agent 在发」而不是「用户在发」。

### 明确不做

- 不注册 `conversation.view` 的既有 id（`chat/trajectory/context/fleet/capability/terminal-panel`）。
- 不改 composer：群聊用自己的输入框（在 view 内部），避免与 `inputActions`/草稿持久化耦合。
- 不试图从浏览器调 `agentTeams.*`（无 @Remote）。

---

## G. 可复现的验证命令 / inspect 查询

```bash
# 1) 确认 Web GUI 与鉴权状态（401 = 当前 shell 无页面会话，client inspect 必然超时）
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:62300/

# 2) 在 app.asar 内直接读包（read 工具支持 asar 路径；bash 的 ls/grep 不行）
#    内置 slot 契约：
#    read <ASAR>/dsh/node_modules/@deepseek-ai/dsh-cordis-client-runner/lib/client.js  → 搜 "conversation.view"
#    官方 view 注册：
#    read <ASAR>/dsh/node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js       → 搜 'ctx.slots.register'
#    第三方先例：
#    read /Users/lzx/.dsh/profiles/desktop/node_modules/dsh-terminal-panel/lib/client.js   → 搜 conversation.view
#    read /Users/lzx/.dsh/profiles/desktop/node_modules/dsh-capability-settings/lib/client.js → 搜 conversation.view
#    read /Users/lzx/.dsh/profiles/desktop/node_modules/dsh-context/lib/client.js          → 搜 conversation.view / api/dsh-context

# 3) 若需要自己遍历 asar（只读，无需 node）：
#    头部格式：uint32le@0=4, @4..15 三个长度, @16 起 JSON 索引, 数据基址 = 16 + jsonLen
python3 - <<'PY'
import struct, json
P="/Applications/DeepSeek Harness.app/Contents/Resources/app.asar"
f=open(P,'rb'); a,b,c,d=struct.unpack('<IIII',f.read(16)); f.seek(16); IDX=json.loads(f.read(d)); BASE=16+d
def walk(n, pre=""):
    for k,v in n.get("files",{}).items():
        p=pre+"/"+k if pre else k
        if "files" in v: yield from walk(v,p)
        else: yield p,v
ents=dict(walk(IDX))
print(len(ents), "files")           # 21265
PY
```

inspect 查询（Host 侧本轮全部命中）：

```jsonc
{"platform":"host","provider":"Service","method":"listService","input":{"service":"agentTeams"}}
{"platform":"host","provider":"Service","method":"listService","input":{"service":"subagents"}}
{"platform":"host","provider":"Service","method":"listService","input":{"service":"sessionController"}}
{"platform":"host","provider":"Service","method":"listService","input":{"service":"sessionQuery"}}
{"platform":"host","provider":"Service","method":"listService","input":{"service":"sessionProjections"}}
{"platform":"host","provider":"Service","method":"listService","input":{"service":"webServer"}}
{"platform":"host","provider":"Service","method":"listService","input":{"service":"commands"}}
{"platform":"host","provider":"Config","method":"listConfigs","input":{"limit":100}}
// 页面鉴权后可用：
{"platform":"client","provider":"Slots","method":"listSubTree","input":{"root":"conversation.view"}}
```

---

## H. 未决问题 / UNVERIFIED

1. **standardProps 的精确 TS 类型**（`UseChat`、`UseConversation`、`UseProjection`、`UseTrajectory`、`UseSessions`、`UseSessionStatus`、`UseSessionRetainInfo`、`InputState`、`InputActions`）——app.asar 只发布打包 JS，未含 `.d.ts`；本轮只有「机器生成的字符串契约 + 真实调用点」。需要发布包（npm）或 `.d.ts` 才能拿到签名。
2. **第三方 client 插件能否直接 `ctx.remote.*`**：`dsh-context` 在 `dsh.client.inject` 里声明了 `@deepseek-ai/dsh-api-remotes`，但它实际读数据走自定义 `fetch` 路由、openPath 走 `connection.rpc`；未见 `ctx.remote.session.*` 直接调用。需在实现时实测（若不行，退回 C5-2 的 HTTP 路由，功能不受损）。
3. **`plugin_manager.install_bundle` 对「本地已构建目录」的 target 形态**（本地目录 vs npm tarball vs market spec）——本轮禁止调用 plugin_manager，未取证。
4. **`SessionReferenceSourceMap` 的第三方 declaration merge** 是否被允许/受构建限制（若不行，复用既有 source key，仅影响引用计数语义，不影响功能）。
5. **父 Agent 离线时 `subagents.prompt` 的确切失败码**——文档只写「composer gestures lock」，未给出 RemoteError code。
6. **`session.view` 持久化的选择 key**（`readConversationViewPreference` 的存储位置）——若要做「默认打开群聊」需查；默认行为无需关心。
7. `agentTeam` 投影在**非 Lead 会话**（teammate 会话）中是否为 `undefined`——按 README 是 Lead 日志派生，实现须 `?? 降级`。

---

## I. 证据索引（本轮实际读到的位置）

| 主题 | 路径 | 位置 |
|---|---|---|
| `conversation.view` 契约 + standardProps/ownerProps | `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-cordis-client-runner/lib/client.js` | 搜 `"key": "conversation.view"`（generated slot catalog） |
| 官方 chat view 注册 | `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js` | 第 13223 行起 |
| 渲染 / openView / tab / More 菜单 | `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js` | 第 18038、19785、19987 行附近 |
| `ISessions` / `ISession` / `SessionListState` / `SessionBinding` / `SessionEventWindow` | 同上 client-runner 目录（decl 目录） | 搜 `interface ISessions` |
| 客户端 prompt 分流（session vs subagents） | `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/client/sessions/session.js` | 第 186-215 行 |
| `/remote` 装配与 @Remote 语义 | `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-api-remotes/README.md` | 全篇（尤其 "Use this package"） |
| session Remote 契约 | host catalog `Service.listService{service:"sessionController"}` | `page/follow/prompt/projections/control` |
| `agentTeams` 契约与 SendTeamMessageRequest | host catalog `Service.listService{service:"agentTeams"}` | — |
| Team mailbox 文本格式 / sendMessage 语义 / 实验性 | `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-experimental-agent-team/README.md` | 第 66-70、128-132、172-176、194-208 行 |
| 官方 Team UI 的 client 读法（lead/roster/projection） | `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-experimental-client-ui-agent-team/lib/client.js` | 第 88-92、469-498 行；README 第 50-52、88-92 行 |
| 第三方 view 注册 ① | `/Users/lzx/.dsh/profiles/desktop/node_modules/dsh-terminal-panel/lib/client.js` | 第 4076-4082 行 |
| 第三方 view 注册 ② | `/Users/lzx/.dsh/profiles/desktop/node_modules/dsh-capability-settings/lib/client.js` | 第 10154 行起 |
| 第三方 view 注册 ③ + fleet 跨会话聚合 + HTTP 路由 | `/Users/lzx/.dsh/profiles/desktop/node_modules/dsh-context/lib/client.js` / `lib/index.js` | client 第 14、28 行；server：`/api/dsh-context/{fleet,detail,attachment,balance,backfill,skills}` |
| bundle / package.json / patch 形态 | `/Users/lzx/.dsh/profiles/desktop/node_modules/dsh-context/{package.json,cordis.patch.yml}` | 全文 |
| client 模块加载 / HMR / release 身份 | `<ASAR>/dsh/node_modules/@deepseek-ai/dsh-client-modules/README.md` | "Live plugin composition" / "Host release changes" |
| `sessionProjections` 注册契约 | host catalog `Service.listService{service:"sessionProjections"}` | `register(...)` / `ProjectionDefinition` |
