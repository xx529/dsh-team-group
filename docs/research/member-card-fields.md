# 取证：成员加入卡片可用字段（spawn_teammate / subagent / subagent_fork）

> 任务 task-20（owner: scout-events）。只读取证，仅写本文件。
> 标记：**[日志]** 真实会话日志截取；**[类型]** 内置包源码/类型；**[推断]** 分析结论；**UNVERIFIED** 未验证。

## 0. 结论先行（卡片字段的权威优先级）

**一次成员创建，信息最全的地方不是事件，而是创建方的 `tool/result`。**

| 优先级 | 来源 | 含 model？ | 含 description？ | 含 provider/context？ | 备注 |
|---|---|---|---|---|---|
| ✅ 1 | 创建方 `tool/call`(arguments) + `tool/result`(member 对象) | **是**（teammate） | 是 | 是 | 一个 result 就够渲染整张卡（teammate） |
| 2 | 子会话 `subagent/descriptor`（第 2 行） | **是**（continuable） | label≈description | provider/mode | 冷读/跨会话重建时唯一可用 |
| 3 | Lead 会话 `team/member`（provisioning→active） | **否** | 是 | 是 | 群聊「入群」触发点，但没有模型 |
| 4 | Lead 会话 `subagent/catalog` | 否 | label | mode | 无 provider/context 字段 |
| 5 | 子会话 `session` header | 否 | 否 | isSeeded/delegationDepth | 只给父子关系 |

> **推荐实现**：卡片 = `tool/call.arguments`（description/prompt/context）+ `tool/result.member`（name/provider/context/model/status）+ `team/member`（入群时刻，触发系统提示）。subagent 卡片额外用子会话 `subagent/descriptor` 补 `agentModel/mode/provider`。

---

## 1. `spawn_teammate` 精确 schema

**[类型]** `@deepseek-ai/dsh-experimental-tool-agent-team/lib/index.js`（`defineTool` 原文）：

```js
name: "spawn_teammate",
description: "Create one named, durable teammate. Only the Team Lead may call this tool.",
parameters: {
  name:        { type: "string", required: true, description: "Unique lower-kebab-case teammate name." },
  description: { type: "string", required: true, description: "Short description of the delegated responsibility." },
  prompt:      { type: "string", required: true, description: "Complete initial task for the teammate." },
  context:     { type: "string", enum: ["fresh","fork"],
                 description: "fresh starts without Lead history; fork inherits completed Lead turns. Defaults to fresh." }
},
output: jsonOutput(SPAWN_VALUE_SCHEMA)   // { member: MEMBER_VIEW_SCHEMA }
```

执行体关键行（决定 provider 与 model 来源）：

```js
const context = args.context ?? "fresh";
return { member: modelMember((await ctx.agentTeams.spawnTeammate(agent, {
  name: args.name, description: args.description,
  prompt: [{ type: "text", text: args.prompt }], context,
  provider: context === "fork" ? config.forkProvider : config.freshProvider, signal: exec.signal })).member) };
```

插件 Config 默认值：

```js
const Config = z.object({ interrupt: z.boolean().default(true), freshProvider: z.string().default("spawn"), forkProvider: z.string().default("fork") });
```

**结论**：
- `name` = 成员显示名（lower-kebab-case，**唯一**，群聊 @ 用它）；
- `description` = 角色描述（一句话职责，模型可见，用于 `list_agents`）；
- `prompt` = 初始任务全文（一条 text 消息，进入子会话 inbox）；
- `context` = 上下文策略（`fresh` 不带 Lead 历史 / `fork` 继承 Lead 已完成回合），**默认 fresh**；
- **没有任何 model/provider 参数**。provider 由 `context` 映射到插件配置（默认 `spawn` / `fork`）；**模型来自设置/继承**（见 §3.2 descriptor 与 §3.1 result.member.model）。

**[类型]** 返回的 `MEMBER_VIEW_SCHEMA`（群聊卡片能直接用的全部字段）：

```js
{ target: string, role: "lead"|"teammate", status: "running"|"inactive"|"provisioning"|"failed",
  description?: string, provider?: string, context?: "fresh"|"fork", model?: string, diagnostics: string[] }
```

并 `modelMember()` 把 `id` 改名为 `target`、其余原样暴露 → 所以 result 里 `target` 就是成员名，**但真正的 sessionId 不在 result 里**（需用 `team/member.member.id` / `subagent/catalog.childId` 补，见 §6）。

**[日志]** 真实样例（本工作区 Lead 会话 seq 460/461/462/463，2026-10-28）：

```json
{"type":"tool/call","seq":460,"data":{"turn":2,"step":1,"callId":"call_00_…","name":"spawn_teammate",
 "arguments":"{\"context\":\"fresh\",\"description\":\"架构设计：纯 Client 插件 + 数据/发送通路/测试策略/实现拆分\",\"name\":\"architect\",\"prompt\":\"你是 DSH Agent Teams 的架构师（architect）。工作区：/Users/lzx/Documents/GitHub/dsh-team-group。运行环境：DSH Desktop，…\"}"}}

{"type":"team/member","seq":461,"data":{"version":2,"teamId":"session-fd60565f-cdbb-4234-88e2-146ddda95bae",
 "member":{"id":"8c86b049-5ed9-46ab-bfb4-97686d705b3a","name":"architect",
 "description":"架构设计：纯 Client 插件 + 数据/发送通路/测试策略/实现拆分",
 "provider":"spawn","context":"fresh","phase":"provisioning"}}}

{"type":"subagent/catalog","seq":462,"data":{"version":0,"childId":"8c86b049-5ed9-46ab-bfb4-97686d705b3a",
 "childCreatedAt":1793159927776,"mode":"continuable",
 "label":"架构设计：纯 Client 插件 + 数据/发送通路/测试策略/实现拆分"}}

{"type":"team/member","seq":463,"data":{"version":2,"teamId":"session-fd60565f-…",
 "member":{"id":"8c86b049-…","name":"architect","description":"架构设计：…","provider":"spawn","context":"fresh","phase":"active"}}}
```

**[日志]** 同一次创建的 `tool/result`（**含 model，卡片首选来源**）：

```json
{"type":"tool/result","seq":464,"data":{"turn":2,"step":1,"message":{"role":"tool","toolCallId":"call_00_…",
 "content":[{"type":"text","text":"{\"member\":{\"target\":\"architect\",\"role\":\"teammate\",\"status\":\"running\",\"description\":\"架构设计：纯 Client 插件 + 数据/发送通路/测试策略/实现拆分\",\"provider\":\"spawn\",\"context\":\"fresh\",\"model\":\"deepseek-flash\",\"diagnostics\":[]}}"}],
 "isError":false}}}
```

> 注意 result 里 `model` 是**快照值**（当时生效的模型）；成员后来改模型不会更新这条历史 result。

### 1.1 谁能创建 teammate

**[类型]** 工具描述：「Only the Team Lead may call this tool.」；执行体 `callingAgent(exec.agent, "spawn_teammate")`。
**[日志]** teammate 尝试调用时真实报错（`25f42626-…` 会话）：

```json
{"type":"tool/result","isError":true,"content":[{"type":"text","text":"Error: only the Team Lead can create teammates"}]}
```

**[日志]** 全盘扫描：143 次 `spawn_teammate` 调用，其中调用方会话 `origin=subagent` 的 15 次里，真正的都是 **fork/seeded 子会话继承来的父会话调用副本**（同 seq/time）+ 1 次真实失败调用。
→ **结论：creator 恒为 Lead；卡片的「拉了 @xxx 进群」主语可靠地写作 `lead`。**（若将来放开，用调用方 sessionId→roster 名解析，见 §4）

---

## 2. `subagent` 与 `subagent_fork` 精确 schema

**[类型]** `@deepseek-ai/dsh-tool-subagent/lib/index.js`：**同一个工具实现，按配置换名挂载两次**：

```js
const toolName = config.toolName ?? "subagent";           // 另一行挂载时 config.toolName = "subagent_fork"
const wording = providerWording(subagentProvider.inheritsParentContext);  // fork provider 继承父上下文
```

参数（两工具完全一致）：

```js
parameters: {
  cwd:         { type: "string", description: "Initial child working directory. …omitted inherits it." },   // 可选
  description: { type: "string", required: true, description: "A short (3-5 word) description of the delegated task, for display." },
  prompt:      { type: "string", required: true, description: <provider wording> },
  ...(presets.choices ? { agent_preset: { type: "string", enum: [...presets.choices] } } : {}),
  ...(modelSelectionEnabled ? {
    provider:         { type: "string", description: "LLM provider route for the child. …omit to inherit the parent route." },
    model:            { type: "string", description: "Model id interpreted by provider." },
    reasoning_effort: { type: "string", description: "Adapter-owned reasoning effort for the effective child route." }
  } : {})
}
```

输出（**结构化值只有 id**）：

```js
output: { schema: { kind: "activation", subagentId: string }, render: v => [{ type:"text", text: `started subagent ${v.subagentId}` }] }
```

**[日志]** 真实调用（`HtDot/session-25d8ef8e-…` seq 37）：

```json
{"type":"tool/call","seq":37,"name":"subagent","arguments":"{\"description\":\"Map tech stack and integrations\",\"prompt\":\"You are a codebase mapper agent. Working directory (git repo root): /Users/lzx/Documents/GitHub/HtDot\\n\\nFocus: **tech** …\"}"}
{"type":"tool/result","content":[{"type":"text","text":"started subagent 27f5e98f-1b2f-4160-89ed-c5ad33d5c6a1"}]}
```

**[日志]** 真实 `subagent_fork`（`research/session-25f42626-…` seq 23，旧构建，含已废弃的 `run_in_background`）：

```json
{"type":"tool/call","seq":23,"name":"subagent_fork","arguments":"{\"description\":\"depth probe fork\",\"prompt\":\"Reply with exactly the single word: pong\",\"run_in_background\":false}"}
```

### 2.1 与 spawn_teammate 的差异（卡片口径）

| 维度 | spawn_teammate（teammate） | subagent / subagent_fork |
|---|---|---|
| 名字 | `name`（必填，kebab，全局唯一） | 无 name；显示名 = `description`（进 descriptor.label） |
| 角色描述 | `description` 必填，独立于 prompt | `description` 必填（本身就是 3-5 词任务名） |
| 模型 | **参数不可指定**，来自设置/继承 | **可指定** `provider`+`model`+`reasoning_effort`（仅当 modelSelection 启用） |
| 上下文策略 | `context: fresh｜fork`（默认 fresh） | 由**工具名**决定：`subagent`=spawn(全新)；`subagent_fork`=fork(继承父会话) |
| preset | 无 | `agent_preset`（可选，spawn only） |
| 归属 | 进 Team roster，有 `team/member`、可 `send_message` | 不进 roster（仅 `subagent/catalog`），结果走 `subagent-settled` |
| 返回 | `{member:{…,model}}` | `started subagent <id>`（结构化只有 subagentId） |

---

## 3. 真实日志里可用的字段

### 3.1 `team/member`（入群触发点，无模型）

**[日志]** 全盘 268 条 `team/member`，`member` 键集**唯一**：`(context, description, id, name, phase, provider)`；`phase` 只观察到 `provisioning`(134) → `active`(134)，**无 failed/removed 样例**。

```json
{"type":"team/member","seq":169,"time":1792723159238,"data":{"version":2,"teamId":"session-c7f2b830-…",
 "member":{"id":"55633fb6-…","name":"scout-engine","description":"只读侦察服务端引擎与协议适配层，产出 engine-report.md",
 "provider":"spawn","context":"fresh","phase":"provisioning"}}}
```

> `teamId` = Lead 会话 id。**入群卡片的最佳触发事件是 `phase==='active'` 那条**（provisioning 紧跟 active，约 100–400ms，卡片可等 active 再渲染，避免闪「创建中」）。

### 3.2 子会话 `subagent/descriptor`（冷读唯一真相）

**[类型]** `@deepseek-ai/dsh-subagent/lib/types/descriptor.js`（`SUBAGENT_DESCRIPTOR_VERSION = 3`）：

```js
DESCRIPTOR_BASE_KEYS       = ["version","mode","provider","label"]
ONE_SHOT_DESCRIPTOR_KEYS   = base                            // one-shot 只有 4 个键
CONTINUABLE_DESCRIPTOR_KEYS= [...base,"agentProvider","agentModel","agentReasoningEffort","persona","toolFilter"]
```

含义：`version`(3) / `mode`(one-shot｜continuable) / `provider`(spawn｜fork) / `label`(显示名) / `agentProvider` / `agentModel` / `agentReasoningEffort` / `persona`(旧字段) / `toolFilter{allow,deny}`（工具白/黑名单，可用于卡片「能力范围」）。

**[日志]** 211 个 descriptor 实测分布：
- `provider`: **spawn 209 / fork 2**
- `mode`: **continuable 202 / one-shot 9**
- 键集合：187 个完整 6 键、**15 个额外带 `agentReasoningEffort`**、**8 个缺 `agentProvider/agentModel`**（旧版本记录，v1/v2）、1 个只有 base 4 键
- 真实样例：

```json
{"type":"subagent/descriptor","seq":0,"data":{"version":3,"mode":"continuable","provider":"spawn",
 "label":"只读取证：Agent Team/Subagent 会话事件语义与群聊消息提取模型",
 "agentProvider":"tokfans","agentModel":"deepseek-flash"}}
{"type":"subagent/descriptor","data":{"version":3,"mode":"continuable","provider":"spawn","label":"…","agentProvider":"tokfans","agentModel":"deepseek-flash","agentReasoningEffort":"…"}}
```

### 3.3 `subagent/catalog`（父会话侧的目录事件）

**[日志]** 键集：`(childCreatedAt, childId, label, mode, version)`（199/200；1 个旧记录无 label）：

```json
{"type":"subagent/catalog","seq":41,"data":{"version":0,"childId":"4b877229-…","childCreatedAt":1792035793752,
 "mode":"continuable","label":"Map codebase concerns"}}
```

**[日志]** `subagent` 工具调用与 catalog 不是一一对应（一个 `subagent` 调用产生一条 catalog，但 catalog 也可能来自 provider 侧其他来源）→ 关联用 `childId`。

### 3.4 modelSelection 投影 → **不可用作卡片来源**

**[日志]** 全盘仅 **21 条 `model/selection`** 事件（`{"provider":"tokfans","model":"deepseek-flash"}`），而 211 个 descriptor 会话里**带 model/selection 的为 0**。
**[推断]** 该事件仅在用户显式切换模型时写，不是每会话必有；投影值 `values.modelSelection.next` 也只在有记录时存在。
→ **卡片模型显示优先级：`descriptor.agentModel`（子会话） > `tool/result.member.model`（teammate 创建时快照） > 当前 `list_agents` 的 `model` > 回退「继承 Lead 模型」。**

---

## 4. 「谁拉了谁」——creator 判定

| 场景 | 可靠来源 | 结论 |
|---|---|---|
| teammate 创建 teammate | 运行时报错 `only the Team Lead can create teammates` | creator 只能是 **lead** |
| spawn_teammate | 调用所在 session = Lead 会话（`origin` 缺省、`delegationDepth=0`） | creator = `lead` |
| subagent / subagent_fork | 调用所在 session 的 agent = 子会话 `parentSession` | creator = 该会话所属 agent |

**解析 creator 名的可执行规则**：
1. 取 `tool/call` 所在的 `sessionId`（= 记录该事件的文件名/id，注意 fork/seeded 子会话会**继承**父会话的 tool/call，必须用 `Session.ownEvents()` 过滤，见 event-model.md §7.2）；
2. `sessionId === teamId`（= Lead 会话）→ `lead`；
3. 否则用 Lead 会话的 `team/member` 找 `member.id === sessionId` → `member.name`；
4. 再否则用该会话的 `subagent/descriptor.label`（subagent 嵌套 subagent 的情况）。

**[日志]** 佐证：teammate 会话的 header 就是 `parentSession=lead`、`origin=subagent`、`delegationDepth=1`。

---

## 5. 上下文策略的展示口径

| 成员类型 | 判定字段（权威） | 取值 | 建议中文展示 |
|---|---|---|---|
| teammate | `tool/call.arguments.context`（同 `team/member.member.context` / `descriptor.provider`） | `fresh` | **全新上下文**（不继承 Lead 历史） |
| teammate | 同上 | `fork` | **继承 Lead 已完成回合** |
| subagent | 谁的 `tool/call.name` | `subagent` | **全新上下文** |
| subagent | 同上 | `subagent_fork` | **继承父会话上下文** |
| subagent（生命周期） | `descriptor.mode` | `continuable` | **可持续对话**（可继续追问） |
| subagent（生命周期） | `descriptor.mode` | `one-shot` | **一次性任务** |
| 兜底 | 会话 header `isSeeded` | `true` | **继承父会话历史**（fork 种子） |

> 展示建议：卡片第二行 `模型 · 全新上下文 · 可持续`；`provider` 本身（`spawn`/`fork`）是内部名，不建议直接给用户看。

---

## 6. 初始任务摘要与角色描述

- **prompt 完整可见**：`spawn_teammate.prompt` 与 `subagent.prompt` 都在 `tool/call.arguments` 里是**完整字符串**（JSON 转义后单行）。**[日志]** 实测长度：spawn_teammate 常见 1.3k–4.7k 字符；subagent 常见 1.5k–5.7k 字符。
- **截断建议**：卡片默认显示前 **2 行 / 120–160 字**（中文按 `chars` 计），提供「展开初始任务」按钮看全文；`prompt` 内含 `\n\n` 段落，按首个空行切「任务标题段」即可得到自然摘要。不要用 `description` 代替（那是角色描述，不是任务）。
- **role description**：`spawn_teammate.description` 与 `team/member.member.description`、`subagent/catalog.label` **是同一字符串**（[日志] 同一次创建 461/462 两条完全一致）。缺失回退：`subagent` 无 description 的旧记录 → 用 `descriptor.label` → 再缺用「未命名成员」。
- **成员名**：teammate `name`（kebab）；subagent 无独立名，展示名 = `description`（descriptor.label）。**@ 提及用 `name`（teammate）/ `label`（subagent）**。

---

## 7. 卡片字段 → 来源 → 回退（实现映射表）

| 卡片字段 | teammate 来源 | subagent 来源 | 缺失回退 | 可信度 |
|---|---|---|---|---|
| 成员显示名 | `tool/result.member.target` / `team/member.member.name` | `descriptor.label` / `catalog.label` | 从 prompt 首行临时取 | 高 |
| sessionId（点开会话） | `team/member.member.id` | `subagent/catalog.childId`（或 tool result 文本 `started subagent (\S+)`） | `descriptor` 所在会话目录名 | 高 |
| 角色描述 | `tool/call.arguments.description` | 同（= label） | 「未提供角色描述」 | 高 |
| 模型 | `tool/result.member.model`（快照） | `descriptor.agentModel` | `list_agents[].model` → 「继承 Lead 模型」 | 高/中 |
| provider 内部名 | `team/member.member.provider`（spawn/fork） | `descriptor.provider` | — | 高 |
| 上下文策略 | `tool/call.arguments.context`（默认 fresh） | 工具名（subagent/subagent_fork） | `header.isSeeded` | 高 |
| 生命周期 | `team/member.member.phase` | `descriptor.mode` | `status` → 「运行中」 | 高 |
| 父成员（creator） | 恒 `lead` | 调用方 sessionId → roster/descriptor 名 | 「lead」 | 高 |
| 上级/父成员（subagent 的父） | — | `header.parentSession` → roster 名或 `descriptor.label` | 「lead」 | 高 |
| 初始任务摘要 | `tool/call.arguments.prompt` | 同 | 「（无初始任务）」 | 高 |
| reasoning effort | 无参数；`descriptor.agentReasoningEffort` | `tool/call.arguments.reasoning_effort` 或 descriptor | 不展示 | 中 |
| 工具范围 | 无 | `descriptor.toolFilter.{allow,deny}` | 不展示 | 中 |
| 入群时间 | `team/member`(active) 的 `time` | `catalog.childCreatedAt` 或 `header.createdAt` | tool/call 的 `time` | 高 |

**关联键**：`tool/call.callId ↔ tool/result.message.toolCallId`；`result.member.target(name) ↔ team/member.member.name`；`team/member.member.id == catalog.childId == 子会话 header.id`（三者同一个 sessionId，[日志] 已验证 8c86b049 一致）。

---

## 8. 卡片可用动作

| 动作 | 数据 | 实现 |
|---|---|---|
| 打开成员会话 | `team/member.member.id` / `catalog.childId` | 按 sessionId 打开（客户端 `sessions.retain/open`；具体 API 见 docs/research/api-feasibility.md） |
| 查看成员当前状态 | `list_agents` 的 `status/model` | 实时刷新（running/inactive/provisioning/failed） |
| 关联任务 | `team/task.ownerId === member.id` | 用 `team_task_list` 过滤 ownerName |
| 展开初始任务 | `tool/call.arguments.prompt` | 卡片内展开，无需再查 |
| 复制成员名/@ 提及 | `name` / `label` | 纯前端 |
| （可选）加入时提醒 | `send_message` 到该成员 | — |

> 注意：teammate 的 `team/member` 只有 `provisioning/active` 两种相位；subagent **没有** team/member 事件，「入群提示」需要由客户端在聚合时把 `subagent/catalog` 也当作入群（是否要把 subagent 算作「群成员」，见任务 task-10/PRD 口径）。

---

## 9. 实现注意（3 条）

1. **不要把 `provider` 当上下文策略讲给用户**：`provider` 是插件配置名（默认 `spawn`/`fork`，可被 Config 改成任意字符串）。用户可读的策略必须由 `context`（teammate）/工具名（subagent）推导。
2. **result 里的 `model` 是创建时快照**，成员后来被切模型不会刷新；若要展示「当前模型」需读 `list_agents`。卡片建议：主体显示快照 + 状态区显示当前值。
3. **fork/seeded 子会话会复制父会话的 `tool/call`**：统计/渲染「入群卡片」时必须用 `ownEvents()` 或按 `sessionId === 事件所属会话` 过滤，否则同一次创建会在 N 个 fork 子会话里各出现一次（[日志] 实测 8a600894/d9f89160 两个 fork 会话都含有 lead 的 spawn 调用）。

---

## 10. 未决 / UNVERIFIED

1. `subagent` 的 `provider`/`model`/`reasoning_effort` 参数只在 `modelSelectionSettings` 启用时出现；当前 desktop profile 是否启用未确认 → **UNVERIFIED**（若未启用，卡片模型只能靠 descriptor）。
2. `subagent/descriptor` 中 8 个缺 `agentProvider/agentModel` 的记录是旧版本（v1/v2）产物，其版本判定逻辑未逐行核对 → **UNVERIFIED**（回退到「继承 Lead 模型」即可）。
3. `team/member` 未观察到 `failed` / 成员移除（`removed`/`left`）相位；是否需要「退群提示」无法从现有日志证实 → **UNVERIFIED**。
4. teammate 的 `context: fork` 是否真的会 `isSeeded=true`（继承 Lead 完整历史）未在真实日志中观察到（143 次 spawn 全是 fresh；2 个 fork descriptor 来自 subagent_fork）→ **UNVERIFIED**。
5. `persona` 字段虽在 descriptor 白名单里，但当前 `tool-subagent` 已显式拒绝 `persona` 配置（`apply()` 抛错），仅历史记录可能有 → 卡片不展示。

## 附：复现命令

```bash
export PATH=/Users/lzx/miniconda3/bin:$PATH
D=~/.dsh/sessions/--Users-lzx-Documents-GitHub-dsh-team-group--
zstd -dc "$D"/session-*/session.v4.jsonl.zstd | python3 -c "
import sys,json
for l in sys.stdin:
    l=l.strip()
    if not l: continue
    try: e=json.loads(l)
    except: continue
    if e.get('type') in ('team/member','subagent/catalog') or (e.get('type')=='tool/call' and e['data'].get('name') in ('spawn_teammate','subagent','subagent_fork')):
        print(e['seq'], e['type'], json.dumps(e['data'], ensure_ascii=False)[:300])
"
```
