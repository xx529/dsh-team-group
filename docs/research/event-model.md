# 取证：Agent Team / Subagent 的会话事件语义与「群聊消息」提取模型

> 任务：task-2（owner: scout-events）。只读取证，产物仅本文件。
> 结论的依据分三类，正文用标记区分：**[日志]** = 真实会话日志截取（已脱敏长文本）；**[类型]** = DSH 内置包里的类型/实现声明；**[推断]** = 二者之外的分析，未直接验证的另标 **UNVERIFIED**。

## 0. TL;DR（可直接落地的 8 条）

1. 一个 Team 的所有权威状态都写在 **Lead 会话日志**里（`teamId` 就是 lead sessionId）；teammate/subagent 各自是独立会话目录，父关系靠 session 头的 `parentSession`。
2. 群聊四类发言的**唯一权威来源**：
   - 用户发言 = 会话里的 `user/message`，且 `data.source.kind === 'user'` 并**带 `rpcId`**（真正的 UI 提交）；
   - agent→agent 消息 = 接收方会话里的 `agent/inbox/spliced`（`source.kind === 'agent-message'`，当前构建）或 `source.kind === 'team-message'`（旧构建/旧日志）；
   - subagent 最终结果 = 父会话里的 `agent/inbox/spliced`（`source.kind === 'subagent-settled'`）；
   - 每个 agent「每轮推理结束的最后输出」= 该 agent 自己会话里 `turn/end` 之前最后一个**非空 `assistant/message`** 的文本块（官方同款算法见 §4.3）。
3. `agent/inbox/spliced` 里的每个 inserted 消息**同时在同会话写成一条 id 相同的 `user/message`**（双写），二者必须按 `id` 去重，否则群聊每条消息重复两次。
4. send_message 的发送侧只有 `tool/call(name=send_message)` + `tool/result`，**当前构建返回 `{"sent":true}` 不含 messageId**；因此「发送事件」与「接收事件」无法用 messageId 关联，只能用 `(senderSessionId, targetId, 文本哈希, 时间窗)` 配对。
5. `seq` 只在**单个会话内**单调；跨会话合并必须用 `time`（epoch ms，全局可比）排序，`seq` 只做同会话内 tie-break。
6. seeded/forked 子会话会**原样复制父会话前缀事件（同 id / 同 seq / 同 time）**，所以跨会话合并必须按事件/消息 id 去重，不能按 seq 或 time 去重。
7. 身份解析：成员显示名 `lead` 是保留名；teammate 名来自 `team/member.member.name`（kebab-case）；subagent 的 label 来自 `subagent/descriptor.label`。消息正文里 `@` 只是自然语言，**不是结构化字段**，需要自己从文本解析（`send_message` 的 `target` 才是结构化目标）。
8. 渲染层可直接复用 `conversation.chat.node` 的按 `kind` 注册机制，但群聊消息**不应**由 ChatNode 派生，而应由上述 5 类事件投影成独立的消息模型（原因见 §7 陷阱）。

---

## 1. 会话日志结构

### 1.1 文件与行格式

路径：`~/.dsh/sessions/<workspace-slug>/<sessionId>/session.v4.jsonl.zstd`，JSON Lines，**zstd 压缩**，每行一个 JSON。当前工作区例子：

```
/Users/lzx/.dsh/sessions/--Users-lzx-Documents-GitHub-dsh-team-group--/session-fd60565f-cdbb-4234-88e2-146ddda95bae/session.v4.jsonl.zstd   # Lead
/Users/lzx/.dsh/sessions/--Users-lzx-Documents-GitHub-dsh-team-group--/abc7cc8b-5257-4d16-b626-46c855b02239/session.v4.jsonl.zstd            # teammate scout-events（本会话）
```

读法：`zstd -dc <file> | python3 -c ...`（zstd 在 `/Users/lzx/miniconda3/bin/zstd`）。

### 1.2 第一行：session header（扁平，**没有 data 包装**）

**[日志]** Lead 会话第一行：

```json
{"type":"session","version":4,"id":"session-fd60565f-cdbb-4234-88e2-146ddda95bae","createdAt":1793158414799,
 "cwd":"/Users/lzx/Documents/GitHub/dsh-team-group","isSeeded":false,"delegationDepth":0,"agentPreset":"standard"}
```

**[日志]** teammate 会话第一行（关键：`parentSession` / `origin` / `delegationDepth`）：

```json
{"type":"session","version":4,"id":"abc7cc8b-5257-4d16-b626-46c855b02239","createdAt":1793158783124,
 "cwd":"/Users/lzx/Documents/GitHub/dsh-team-group","parentSession":"session-fd60565f-cdbb-4234-88e2-146ddda95bae",
 "isSeeded":false,"origin":"subagent","delegationDepth":1,"agentPreset":"cordis"}
```

**[类型]** `SessionHeader`（`@deepseek-ai/dsh-api-session-controller` 生成声明，下称 `typert.host.js`）：

```ts
export interface SessionHeader {
  readonly version: typeof SESSION_FORMAT_VERSION;
  readonly id: SessionId;
  readonly createdAt: number;
  readonly cwd?: string;
  readonly parentSession?: SessionId;
  readonly isSeeded: boolean;
  readonly origin?: 'subagent';
  readonly delegationDepth?: number;
  readonly agentPreset?: string;
}
```

要点：`createdAt` 是 epoch ms；`isSeeded=true` 表示该会话是 fork 出来的（见 §7 陷阱 3）。

### 1.3 其余事件：统一信封

**[类型]**：

```ts
export type SessionEvent<T> = { type: K; seq: SessionSeq; time: number; data: SessionEventMap[K]; ignorable?: true } & SurfaceIntent<K>
```

- `seq`：会话内自增序号（**含 inherited 前缀**，不是从 0 重新开始）；
- `time`：epoch ms（全局可比）；
- `data`：按 type 定型的负载；
- `surfaceOp` / `sourceEventSeqs`：只对「surface 事件」（`system/message`、`user/message`、`assistant/message`、`tool/result`）存在，表示这条事件是 append/replace 到模型可见 surface 的操作；`sourceEventSeqs` 指回它引用的历史事件 seq（见 §4.1 的 `tool/result` 样例 `"sourceEventSeqs": [652]`）。

**[类型]** 完整事件词表在 `@deepseek-ai/dsh-session/lib/types/known-event-types.js` 的 `KNOWN_SESSION_EVENT_TYPES`，与群聊相关的子集：

```
agent/inbox/spliced, assistant/message, assistant/attempt, user/message, system/message,
tool/call, tool/result, turn/start, turn/end, step/start, step/end,
subagent/catalog, subagent/descriptor,
team/member, team/task, team/message/queued, team/message/delivered,
session/end-seed, goal/change, schedule/change, deliverables/presented, todo/write
```

### 1.4 turn / step 语义

- `turn/start` → 若干 `step/start`…`step/end` → `turn/end`。**[日志]** 一个 37 轮的会话统计：`step/start` 944、`assistant/message` 943、`step/end` 944、`turn/end` 37 —— 即**每一步恰有一条 `assistant/message`**（该步的模型输出，含 text / reasoning / tool-call 三类块）。
- **[类型]** `TurnEndReasonMap`：

```ts
export interface TurnEndReasonMap {
  completed: { kind: 'completed' };
  aborted:   { kind: 'aborted'; reason: TurnEndCancelCause };
  blocked:   { kind: 'blocked' };
  error:     { kind: 'error'; error: LlmFailure };
  'max-tokens': { kind: 'max-tokens' };
  interrupted: { kind: 'interrupted' };
  forked:    { kind: 'forked' };
}
```

**[日志]** 本会话（scout-events）第 1 轮真实结尾——就是 Lead 看到的「模型连接错误」：

```json
{"type":"turn/end","seq":142,"data":{"turn":1,"reason":{"kind":"error","error":{"message":"Connection error.","code":"TRANSPORT"}}}}
```

---

## 2. teammate 消息：发送侧与接收侧

### 2.1 发送侧：`send_message` 的 tool/call 与 tool/result

**[日志]** Lead 会话真实调用（当前构建，2026-10-28）：

```json
{"type":"tool/call","seq":340,"time":1793159,"data":{"turn":2,"step":22,
 "callId":"call_00_wqv39h0i61frwa3ftzzja3n2","name":"send_message",
 "arguments":"{\"message\":\"Lead 决策（请据此定稿原型与 UX 规格…\",\"target\":\"ux\"}"}}
```

参数只有 `target`（成员名或 `"lead"`）与 `message`（字符串）。

返回值随构建变化，**两代都真实存在**：

**[日志]** 当前构建（2026-10-28，本文件取证时）：

```json
{"type":"tool/result","seq":341,"data":{"turn":2,"step":22,
 "message":{"role":"tool","source":{"kind":"tool","callId":"call_00_wq…"},
 "toolCallId":"call_00_wq…","content":[{"type":"text","text":"{\"sent\":true}"}],"isError":false,
 "id":"…"},"sourceEventSeqs":[340],"surfaceOp":"append"}}
```

**[日志]** 旧构建（2026-10-11，`dsh-task-gantt` 会话 `session-4d51254b-…`）：

```json
{"type":"tool/result","seq":655,"data":{"turn":1,"step":100,"message":{"role":"tool",
 "toolCallId":"call_00_aTcC4R4HY7yNAIDwFLTO5599",
 "content":[{"type":"text","text":"{\"messageId\":\"team-message-38358bfc-6353-4ee6-9333-f12d1547f665\",\"status\":\"accepted\"}"}],
 "isError":false},"sourceEventSeqs":[652],"surfaceOp":"append"}}
```

`status` 实测取值：`accepted`（目标空闲，立即入 inbox）/ `queued`（目标正 running，排在下一个 step 边界）——**[日志]** 同一工作区统计：`accepted 297 / queued 71`。

> **群聊影响**：当前构建的 result 没有 messageId，无法与接收侧做一对一关联（§5.3 给出替代配对法）。

### 2.2 接收侧：`agent/inbox/spliced`（唯一的投递事件）

**[类型]** 事件 data（`@deepseek-ai/dsh-session` 的 Inbox API 与 `session-message.js`）：

```ts
export type InboxTarget = 'next-turn' | 'next-step';
export interface Inbox {
  readonly nextTurn: readonly UserMessage[]; readonly nextStep: readonly UserMessage[];
  splice(target: InboxTarget, start: number, deleteCount: number, inserted: UserMessage[]): UserMessage[];
}
```

**[类型]** 折叠 inbox 的权威写法（`dsh-experimental-agent-team/lib/types/session-message.js`）：

```js
const inbox = { 'next-turn': [], 'next-step': [] }
for (const event of events) {
  if (event.type !== 'agent/inbox/spliced') continue
  inbox[event.data.target].splice(event.data.start, event.data.removedCount ?? 0, ...event.data.inserted)
}
```

**关键：`agent/inbox/spliced` 既表示「放入」也表示「取出」**。`inserted` 为空 + `removedCount > 0` 就是消费/取消，不产生消息。

**[日志]** 本工作区 Lead 会话 seq 4 → 6 的一对（放入用户消息，随即被下一轮消费）：

```json
{"type":"agent/inbox/spliced","seq":4,"data":{"target":"next-turn","start":0,"inserted":[
 {"content":[{"type":"text","text":"# 背景\n我想在需要以一种群聊对话的视角…"}],
  "source":{"kind":"user","rpcId":"eafb5dd3-5a11-493c-80f8-9394d655f5fd","clientTimeZone":"Asia/Shanghai"},
  "role":"user","id":"affb2df0-5e5a-4762-97d9-d968c2d55b5d"}]}}
{"type":"agent/inbox/spliced","seq":6,"data":{"target":"next-turn","start":0,"removedCount":1,"inserted":[]}}
```

### 2.3 三种投递来源（`source.kind`）与文本前缀

| 场景 | 事件 | `source` | 正文前缀（真实文本） | 数据里的发送者 |
|---|---|---|---|---|
| 用户从 UI 发言 | `agent/inbox/spliced`(next-turn) + 双写 `user/message` | `{kind:'user', rpcId, clientTimeZone}` | 无 | 无（就是本人） |
| 父 agent 派生 subagent / spawn_teammate 的初始 prompt | 同上 | `{kind:'user'}`（**无 rpcId**） | 无 | 无 → 只能靠 `parentSession`/`origin` 判断 |
| teammate/subagent → 任一成员（**当前构建**） | `agent/inbox/spliced`(next-step 或 next-turn) | `{kind:'agent-message', form:'relay', senderSessionId}` | `Team message from <senderName>:` | `senderSessionId`（**名字只在文本里**） |
| 同一条消息在**旧构建** | 同上 | `{kind:'team-message', teamId, messageId, senderId, senderName}` | `Team message <messageId> from <senderName>:` | `senderId` + `senderName`（结构化） |
| subagent 结算 | `agent/inbox/spliced`(next-step) | `{kind:'subagent-settled', form:'notice', summary, senderSessionId}` | `<summary>` / `Its closing message:` / `It left no closing message.` / `Structured result: …` | `senderSessionId` |

**类型依据**（`typert.host.js`，`MessageSourceMap` 的对应成员）：

```ts
export interface AgentMessageSource { readonly kind: 'agent-message'; readonly form: 'relay'; readonly senderSessionId: SessionId }
export interface TeamMessageSource  { readonly kind: 'team-message'; readonly teamId: TeamId; readonly messageId: TeamMessageId; readonly senderId: SessionId; readonly senderName: string }
export interface SubagentSettledMessageSource { readonly kind: 'subagent-settled'; readonly form: 'notice'; readonly summary: string; readonly senderSessionId: SessionId }
```

**[日志]** 当前构建的 A→B 真实样例（我作为接收方、Lead 发来）：

```json
{"type":"agent/inbox/spliced","seq":144,"data":{"target":"next-step","start":0,"inserted":[
 {"content":[{"type":"text","text":"Team message from lead:"},
             {"type":"text","text":"你上一轮因模型连接错误（TRANSPORT）中断，任务 task-2 仍未完成。请继续…"}],
  "source":{"kind":"agent-message","form":"relay","senderSessionId":"session-fd60565f-cdbb-4234-88e2-146ddda95bae"},
  "role":"user","id":"5944…"}]}}
```

**[日志]** 旧构建的 A→B 真实样例（`dsh-task-gantt` 的子会话 `f828dda6-…`，来自 shell）：

```json
{"content":[{"type":"text","text":"Team message team-message-ea5bcf81-0e4a-4847-94a3-07d02d543df7 from shell:"},
            {"type":"text","text":"[shell → verify] 你的 tests/client-tab.spec.ts 现在对我这边全绿了…"}],
 "source":{"kind":"team-message","teamId":"session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99",
  "messageId":"team-message-ea5bcf81-0e4a-4847-94a3-07d02d543df7",
  "senderId":"7484fccf-2cb1-450c-9993-610a8930073e","senderName":"shell"},
 "role":"user","id":"5628464f-fcf3-4c14-8be9-9861f03978c7"}
```

**[类型]** 前缀与 source 的生成点（`@deepseek-ai/dsh-experimental-agent-team/lib/types/index.js`）：

```js
const content = [ { type: 'text', text: `Team message from ${membership.name}:` }, ...structuredClone(request.content) ];
const source = { kind: 'agent-message', form: 'relay', senderSessionId: caller.id };
if (target.id === root.id) { const input = createUserMessage({ content, source }); root.steer(input); messageId = input.id; }
```

→ 所以**发给 lead 与发给 teammate 用的是同一段 content**，两条路径在接收侧长得一样，接收方无法从 source 分辨「这条消息同时发给了几个人」——需要发送端自己把「同时发送给谁」写进正文（这正是群聊需求第 4 条要做的）。

### 2.4 旧构建的团队消息日志（`team/message/queued|delivered`）

**[日志]** 旧构建在 **Lead 会话**里另有一份权威日志（`--Users-lzx-Documents-GitHub-LiveShopping--/session-35a6a906-…`）：

```json
{"type":"team/message/queued","seq":242,"data":{"version":2,"teamId":"session-35a6a906-…","message":
 {"id":"team-message-501ef532-…","senderId":"ada7201c-…","senderName":"research-competitors",
  "targetId":"session-35a6a906-…","content":[{"type":"text","text":"research-competitors: task-1 已 claim…"}]}}}
{"type":"team/message/delivered","seq":249,"data":{"version":2,"teamId":"session-35a6a906-…",
 "messageId":"team-message-501ef532-…","targetId":"session-35a6a906-…"}}
```

**[日志]** `dsh-task-gantt` 工作区实测：`team/message/queued` 601 次、`team/message/delivered` 601 次，且**发送侧 tool/result 的 messageId 与接收侧注入 messageId 完全 1:1 对上**（368 distinct ids，双向 0 缺口）。

**[日志]** 但**当前构建不再写这两个事件**：本工作区 Lead 会话 344 条事件里 `team/member`、`team/task` 有，`team/message/*` 为 0，`send_message` 走 §2.1 的 `{"sent":true}`。

> **群聊影响**：解析器必须**同时支持两代**。优先级：接收侧 `agent/inbox/spliced` 是唯一「一定存在」的；`team/message/queued` 只在旧日志存在，可作为「权威消息账本」用来补齐/纠错。

### 2.5 能否区分「用户输入」与「peer 消息」

能，三层判据（从强到弱）：

1. `source.kind`：`'user'` vs `'agent-message' / 'team-message' / 'subagent-settled'`。
2. 对 `kind === 'user'` 再细分：**[类型]** `MessageSourceMap` 里有 `'user-rpc': { kind: 'user'; rpcId: SessionRequestId; clientTimeZone?: string; principal?: Principal }`。**[日志]** 真用户消息：`{"kind":"user","rpcId":"eafb5dd3-…","clientTimeZone":"Asia/Shanghai"}`；**[日志]** spawn prompt：`{"kind":"user"}`（无 rpcId）。→ **有 `rpcId` 才是人，无 rpcId 的是父 agent 下发的初始任务**。
3. 会话头：`parentSession != null && origin === 'subagent'` 的会话里，第一条 `user/message` 一定是父 agent 的 prompt，不是用户。

---

## 3. subagent：创建、父子关系、结果回传

### 3.1 创建：`subagent` / `subagent_fork` / `spawn_teammate`

**[日志]** `subagent` 工具（`--Users-lzx-Documents-GitHub-HtDot--/session-25d8ef8e-…`）：

```json
{"type":"tool/call","seq":37,"data":{"turn":1,"step":4,"callId":"call_00_bznw…","name":"subagent",
 "arguments":"{\"description\":\"Map tech stack and integrations\",\"prompt\":\"You are a codebase mapper agent…\"}"}}
{"type":"tool/result",…,"content":[{"type":"text","text":"started subagent 27f5e98f-1b2f-4160-89ed-c5ad33d5c6a1"}]}
```

→ **异步**：tool/result 只有子会话 id，最终结果稍后以 `subagent-settled` 回来。

**[日志]** `spawn_teammate`（本工作区 Lead 会话 seq 183/187）：

```json
{"type":"tool/call","seq":183,"data":{"callId":"call_01_21f63…","name":"spawn_teammate",
 "arguments":"{\"name\":\"scout-api\",\"description\":\"只读取证：…\",\"context\":\"fresh\",\"prompt\":\"你是 DSH Agent Teams 的只读取证 scout（scout-api）…\"}"}}
{"type":"tool/result","seq":187,"data":{"message":{"toolCallId":"call_01_21f63…","content":[{"type":"text","text":
 "{\"member\":{\"target\":\"scout-api\",\"role\":\"teammate\",\"status\":\"running\",\"description\":\"只读取证：…\",\"provider\":\"spawn\",\"context\":\"fresh\"}}"}]}}}
```

### 3.2 子会话如何记录自己

**[日志]** teammate 会话第 2 行（**subagent/descriptor**，身份唯一来源）：

```json
{"type":"subagent/descriptor","seq":0,"data":{"version":3,"mode":"continuable","provider":"spawn",
 "label":"只读取证：Agent Team/Subagent 会话事件语义与群聊消息提取模型",
 "agentProvider":"tokfans","agentModel":"deepseek-flash"}}
```

**[日志]** Lead 会话里对应的**目录事件**（列出子会话，用于建团队成员目录）：

```json
{"type":"subagent/catalog","seq":185,"data":{"version":0,"childId":"22d29dbe-a75e-456c-963c-3846764b3d33",
 "childCreatedAt":1793158782958,"mode":"continuable","label":"只读取证：DSH 插件视图/数据/发送通路与打包可行性"}}
```

**[类型]** `SubagentCatalogEntry`（`dsh-subagent/typert.host.js`）：

```ts
export type SubagentCatalogEntry = { readonly id: SessionId; readonly createdAt: number } &
  ({ readonly mode: 'one-shot'; readonly label?: string } | { readonly mode: 'external'; readonly label?: string }
 | { readonly mode: 'continuable'; readonly label: string } | { readonly mode: 'unknown'; readonly label?: string })
```

**[类型]** `SubagentDescendantListEntry = SubagentListEntry & { parentId: SessionId; depth: number }`（`subagents.listDescendants(rootSessionId)` 的返回元素）。

### 3.3 结果如何回到父会话（subagent-settled）

**[类型]** 生成点（`@deepseek-ai/dsh-subagent/lib/index.js` / `types/continuation-messages.js`）：

```js
function createSettlementMessage(childId, terminal, continuable = true) {
  const summary = settlementSummary(childId, terminal.stopReason, continuable);
  const closingText = terminal.output.flatMap(b => b.type === 'text' && b.text.length > 0 ? [b] : []);
  return createUserMessage({ content: [
    { type: 'text', text: summary },
    ...(closingText.length === 0 ? [{ type: 'text', text: 'It left no closing message.' }]
      : [{ type: 'text', text: 'Its closing message:' }, ...closingText]),
    ...(terminal.structured !== undefined ? [{ type: 'text', text: `Structured result: ${JSON.stringify(terminal.structured)}` }] : []),
    ...(terminal.diagnostic !== undefined ? [{ type: 'text', text: terminal.diagnostic }] : []),
  ], source: { kind: 'subagent-settled', form: 'notice', summary: boundContextSummary(summary), senderSessionId: childId } });
}
```

**[日志]** 父会话收到的真实形态（`dsh-task-gantt` Lead）：

```json
{"content":[{"type":"text","text":"Background subagent 66b9735d-8df4-44df-9d74-b4083057e02f finished and will do no further work unless you send it more."},
            {"type":"text","text":"Its closing message:"},
            {"type":"text","text":"I've completed task-1. Summary of what I delivered and verified:\n\n## Deliverables…"}],
 "source":{"kind":"subagent-settled","form":"notice",
  "summary":"Background subagent 66b9735d-… finished and will do no further work unless you send it more.",
  "senderSessionId":"66b9735d-8df4-44df-9d74-b4083057e02f"},
 "role":"user","id":"cfb9d69f-…"}
```

> 群聊里 subagent 的「发言」有两个可选来源：**（推荐）子会话自己的最终 `assistant/message`**，或父会话的这条 `subagent-settled` 副本。二者内容相同 → 必须去重（保留子会话那份，它带正确的发言身份与时间）。

---

## 4. assistant 输出：怎么取「每轮推理结束的最后一段文本」

### 4.1 事件形状

**[日志]**（真实，短化）：

```json
{"type":"assistant/message","seq":15,"time":1791648809717,"data":{"turn":1,"step":1,
 "message":{"role":"assistant",
  "content":[{"type":"text","text":"I'll start by reading the team brief…"},
             {"type":"tool-call","id":"call_00_ET_TR4j…","name":"read","arguments":"{\"file_path\":\"…\"}"}],
  "source":{"kind":"model","provider":"tokfans","model":"deepseek-flash",
   "replayState":{"response":{"kind":"pi-ai","responseId":"74b6b85b-…","stopReason":"toolUse"},"blocks":[{"type":"text"},{"type":"tool-call"}]}}},
 "usage":{"inputTokens":199,"outputTokens":1009,"totalTokens":359864,"cacheReadTokens":358656},
 "stream":[{"type":"chunk","time":…,"chunk":{…}}]}}
```

- **content 块类型**：`text` / `reasoning` / `tool-call`（`reasoning` 与正文**可区分**，可以直接不当发言）。
- `stream` 是**同一条事件里**的回放缓冲（流式增量），**不是**独立事件；取文本时优先用 `message.content`，`stream` 只作兜底。
- 每条 `assistant/message` 都带 `turn` / `step`。

### 4.2 「最后输出」的官方算法（建议照抄）

**[类型]** `@deepseek-ai/dsh-subagent/lib/index.js` 的 `AssistantOutputFold`：

```js
push(event) {
  if (event.type === 'assistant/message') { const content = event.data.message.content; if (content.length > 0) this.message = content }
  if (event.type === 'assistant/message' || event.type === 'assistant/attempt') this.pushText(joinAssistantStreamText(event.data.stream))
}
collect() { return this.message ?? (this.partial.length ? [{type:'text', text:this.partial.join('')}] : undefined) }
```

即：**扫完这段事件序列后，取最后一个「内容非空」的 `assistant/message` 的 content**；没有就退化为流式文本拼接。

### 4.3 群聊需要的口径（两种，按需求取舍）

- **口径 A「每轮最终答复」**（对应 turn）：在 `turn/start` 与 `turn/end` 之间取最后一个非空 `assistant/message` 的 `text` 块。语义最接近「推理完最后一段输出」。
- **口径 B「每步末段」**（对应 step）：取每条 `assistant/message` 的 `text` 块。一轮里会有 N 条（每步一条），噪音大。
- 建议：**turn 级**（口径 A）作为群聊发言；`turn/end.reason.kind` 不是 `completed` 时追加系统提示（如 `error` / `interrupted` / `max-tokens`）——`forked` 是 fork 种子合成的事件，**不是**真实发言，必须丢弃。

---

## 5. 团队结构：从 host 侧拿身份

### 5.1 成员视图（真实字段）

**[类型+日志验证]** `dsh-experimental-agent-team/lib/types/roster.js` 的 `list()` 构造（与 `list_agents` 工具真实返回一致）：

```js
// lead 行
{ id: root.id, name: 'lead', role: 'lead', status: availability(root), ...(model?{model}:{}) , diagnostics: [] }
// teammate 行
{ id: member.id, name: member.name, role: 'teammate', status: member.phase === 'failed' ? 'failed' : member.phase === 'provisioning' ? 'provisioning' : availability(live),
  description: member.description, provider: member.provider, context: member.context, ...(model?{model}:{}), diagnostics: [...] }
```

**[日志]** `list_agents` 真实返回：`[{"target":"lead","role":"lead","status":"running","model":"deepseek-flash","diagnostics":[]}]`
**[日志]** `spawn_teammate` 真实返回：`{"member":{"target":"scout-api","role":"teammate","status":"running","description":"…","provider":"spawn","context":"fresh"}}`

**名字规则**：`MEMBER_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`；`lead` 是保留伪成员（`resolveActiveMember` 里 `if (name === 'lead') return {id: root.id, name}`）。

**teammate 判定规则**（同文件 `tryMembership`，很关键）：`agent.session.header.parentSession` 存在 → 取父 Agent 的 team state 找 `members[].id === agent.id` 且 `phase ∈ {active, provisioning}` → 是 teammate；若是「有 subagent descriptor 的直接子会话」→ **不是 teammate**；否则该 agent 自己就是一个新 Team 的 lead。

### 5.2 团队状态权威事件（Lead 会话）

**[日志]** `team/member`（roster 变更，`phase` 从 `provisioning` → `active`）：

```json
{"type":"team/member","seq":184,"data":{"version":2,"teamId":"session-fd60565f-…",
 "member":{"id":"22d29dbe-…","name":"scout-api","description":"只读取证：…","provider":"spawn","context":"fresh","phase":"provisioning"}}}
```

**[日志]** `team/task`（任务板，全量快照，每次变更追加一条）：

```json
{"type":"team/task","seq":208,"data":{"version":2,"teamId":"session-fd60565f-…","task":{"id":"task-2","revision":2,
 "subject":"…","description":"…","status":"in_progress","blockedBy":[],"writeScopes":["docs/research/event-model.md"],
 "ownerId":"abc7cc8b-…"}}}
```

（注意 `team/task` 是**整条任务快照**，不是增量 → 取最新 revision 即可。）

### 5.3 读取其它会话的事件（host 侧）

**[类型]** `@deepseek-ai/dsh-api-session-controller` 的 `Session` 类（`typert.host.js`）：

```ts
export class Session {
  readonly header: SessionHeader;
  readonly inheritedEventCount: SessionLogOffset;   // 继承（seed）事件条数
  readonly firstLiveSeq: SessionLogOffset;          // 本会话自己产生的第一条 seq
  readonly firstLifecycleSeq: SessionLogOffset;
  snapshotEvents(fromSeq?, toSeqExclusive?): readonly SessionEvent[];
  ownEvents(): readonly SessionEvent[];             // 只返回自己的事件（去掉继承）
  isOwnSeq(seq): boolean;
  eventAt(seq): SessionEvent | undefined;
  deriveMessages(): Message[];
  deriveEventMessage(event): Message | null;
}
```

取 Agent：`ctx.get('agents').get(sessionId)?.session`（`agents.get(id: SessionId): Agent | undefined`，见 host Service `agents`）；`subagents.listChildren(parentSessionId)` / `listDescendants(rootSessionId)` 拿子会话目录。

> **群聊实现结论**：teammate/subagent 的会话事件在 host 侧**完整可读**（同进程 `agents.get(id)?.session.snapshotEvents()`；冷会话走持久化读取）。因此「聚合 lead + 全部子会话」在数据层可行；具体 Remote/HTTP 形态见 task-1（api-feasibility）。

---

## 6. 归一化 schema（建议定稿）

```ts
type SenderKind = 'user' | 'lead' | 'teammate' | 'subagent' | 'system'

interface ChatMessage {
  id: string                  // 去重键：事件/消息 id（见 §7.2）
  sessionId: string           // 发言所在会话
  senderId: string            // 'user' | 会话 id
  senderName: string          // lead / teammate name / subagent label / 用户名
  senderKind: SenderKind
  targets: string[]           // 结构化目标名（send_message.target 解析；默认 ['lead']）；用户消息为空
  targetIds: string[]         // 目标会话 id（可解析时）
  kind: MessageKind           // 'user' | 'agent-to-agent' | 'agent-final' | 'subagent-result' | 'system'
  text: string                // 已剥掉协议前缀的正文
  rawText: string             // 原始文本（含 'Team message …' 前缀），用于追溯
  time: number                // epoch ms（排序主键）
  seq: number                 // 会话内序号（同会话 tie-break）
  turn?: number               // kind=agent-final 时有效
  isFinalOutput: boolean      // true = 该 agent 本轮最终答复（口径 A）
  collapse: { collapsed: boolean; maxLines: number } // 长文本折叠建议
  meta?: Record<string, unknown> // source / messageId / stopReason 等原始字段
}

type MessageKind = 'user' | 'agent-to-agent' | 'agent-final' | 'subagent-result' | 'system'
```

字段推导规则（逐条可执行）：

| 字段 | 来源 |
|---|---|
| `id` | 优先 `source.messageId`（team-message）；否则 `user/message.id`（与 spliced item.id 相同）；agent-final 用 `${sessionId}:${turn}` |
| `senderKind` | `source.kind==='user' && rpcId` → `user`；`source.kind==='agent-message'/'team-message'` → 按 `senderSessionId/senderId` 对照 roster：lead 或 teammate；`subagent-settled` → `subagent` |
| `senderName` | `source.senderName`（team-message）→ 否则用 `senderSessionId` 查 roster/descriptor.label → 否则从正文前缀 `Team message from (.*):` 正则提取（agent-message 只能这样） |
| `targets` | 发送侧 `tool/call.arguments.target`；接收侧无结构化目标（一条消息一条接收方），`targets` 用「本条消息的接收者」= 当前 sessionId 对应成员名 |
| `text` | 剥掉 content[0] 的协议前缀（`Team message …:`），拼接余下 text 块 |
| `isFinalOutput` | kind==='agent-final' 且该消息是 turn 内最后一个非空 assistant/message 的 text 块 |
| `collapse` | 建议 `maxLines=8` 或 `chars>600` → `collapsed: true`（UX 定，见 task-4） |

---

## 7. 跨会话时间线合并与去重

### 7.1 排序键

```
sortKey = (time, sessionRank, seq)
```

- `time` 主键：epoch ms，**跨会话唯一可比**（日志实测同一条消息在 lead / 子会话里的 `time` 精确相同）；
- `sessionRank`：`lead=0`、teammate=1、subagent=2（同毫秒时的稳定次序，由 §5.1 身份决定）；
- `seq` 末位 tie-break（同一会话内保证严格有序）。

**不要**用 `seq` 做全局排序（每个会话独立自增）；也**不要**用 `createdAt` 当事件时间（fork 会话的 `createdAt` 是 fork 时刻，比其继承事件的 `time` 晚很多——**[日志]** 实测子会话 createdAt 2026-10-11 23:45，其内含事件 time 2026-10-11 00:24）。

### 7.2 去重（三层，必须全做）

**① 双写去重（同一个会话内）**：`agent/inbox/spliced.data.inserted[].id` 与 `user/message.data.id` **同 id 出现两次**。
**[日志]** 实测：Lead 会话 spliced inserted ids 2 / user-message ids 6 / 交集 2 / spliced-only 0；本会话同样 2/6/2/0。
→ 规则：**ids 相同的消息只保留一份，优先保留 `user/message`**（它是模型真正看到的 surface 形态），并把 spliced 的 `target` 等元数据合并进去。

**② fork/seed 去重（跨会话）**：`isSeeded:true` 的子会话把父会话事件前缀**原样复制**（同 id / 同 seq / 同 time）。
**[日志]** 实测 `dsh-task-gantt/8a600894-…`：`isSeeded:true`，前 200 条事件与父会话「按 seq 完全一致」=199、不同=0，最后一致 seq=3333；父会话 seq 819 的一条 `team-message` 同时出现在 lead 与两个 fork 子会话里（time 完全相同）。
→ 规则：跨会话合并**先按事件/消息 id 全局去重**；`Session.ownEvents()` / `inheritedEventCount` / `firstLiveSeq` / `isOwnSeq(seq)` 是过滤继承前缀的官方手段。
→ 注意 `session/end-seed`（`data:{inherited:true}`）与 `turn/end reason.kind==='forked'` 是合成事件，必须丢弃（**[类型]** `buildForkSeed` 在继承前缀后追加它们）。

**③ 通知副本去重（跨事件类型）**：同一份内存在两个地方：
- `send_message`（接收侧 spliced）与发送侧的 `tool/call` 参数是同一文本；
- teammate 自己的最终 `assistant/message` 与父会话的 `subagent-settled`「Its closing message:」是同一文本；
- 旧构建还有 `team/message/queued` 账本副本。
→ 规则：同一 `messageId` 只保留一条；无 messageId 时（当前构建）用 `(senderSessionId, targetId, sha256(text), time±5s)` 作为弱键配对，**保留「接收侧 spliced」那条**（它带投递时间与真实接收方）。

### 7.3 推荐算法（伪代码）

```ts
// 1) 收集会话集合：lead 会话 + roster 全部 teammate 子会话 + subagent descendants
const sessions = [leadSession, ...descendants]           // subagents.listDescendants(rootSessionId)
// 2) 每会话取「自己的事件」，剔除继承前缀
const own = sessions.flatMap(s => s.ownEvents())          // 或 snapshotEvents(fromSeq = s.firstLiveSeq)
// 3) 丢弃合成事件
.filter(e => e.type !== 'session/end-seed'
          && !(e.type === 'turn/end' && e.data.reason.kind === 'forked'))
// 4) 抽出候选消息
const raw = own.flatMap(e => extract(e))                 // user/message | assistant/message(末段) | spliced.inserted
// 5) 三层去重
const byId = new Map(); const weak = new Map()
for (const m of raw) (m.dedupeId ? byId : weak).set(key(m), prefer(byId.get(key(m)), m))
// 6) 排序
return [...byId.values()].sort((a,b) => a.time - b.time || rank(a) - rank(b) || a.seq - b.seq)
```

`extract` 的事件映射表：

| 事件 | 条件 | 产出 |
|---|---|---|
| `user/message` | `source.kind==='user'` 且无 `rpcId` 且 会话是子会话首条 | 父 agent 下发的任务（kind=`system` 或 `user` 取决于产品口径） |
| `user/message` | 有 `rpcId` | kind=`user` |
| `user/message` | `source.kind==='agent-message'/'team-message'` | kind=`agent-to-agent`，`targets=[本会话成员]` |
| `user/message` | `source.kind==='subagent-settled'` | kind=`subagent-result`（若子会话自己的最终输出已收，丢弃本条） |
| `assistant/message` | 是该 turn 最后一条非空，且 `turn/end.reason.kind==='completed'` | kind=`agent-final`, `isFinalOutput=true` |
| `agent/inbox/spliced` | `inserted.length>0` | 仅用于「投递时间/接收方」元数据与 messageId 关联，不单独出消息 |
| `team/message/queued` | 旧构建 | 权威账本：补 senderName/targetId/messageId |

---

## 8. 事件与 ChatNode 的映射（渲染参考）

**[类型+日志]** `conversation.chat.node` 的注册键（`@deepseek-ai/dsh-client-ui-chat/lib/client.js`，`ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({ name:'conversation.chat.node', key, locale }, View))`）：

```
user, steering, context, turn-trigger, system-prompt, assistant-step,
command, manual-compaction, compaction, model-retry, turn-error,
turn-max-tokens, turn-process, turn-tail, unknown
```

节点 data 由投影生成（客户端 chat 投影，非本文件逐行核对），与事件的对应关系（**[推断]**，部分字段依据 `legacyContribution()` 分支）：

| ChatNode kind | 派生事件 | 说明 |
|---|---|---|
| `user` | `user/message`(kind=user) | 用户气泡 |
| `steering` | 投递到 `next-step` 的 inbox 消息（含 agent-message / team-message / steering 输入） | **peer 消息目前就落在 steering 节点里**（`data.seq` 指向消息） |
| `context` | 各类 `ContextFormed` 的注入消息（runtime-context / skill-catalog / agent-instructions / subagent-settled / tool-jobs …） | `sessionRecallLabels(source)` 决定召回标签 |
| `turn-trigger` | 唤醒本轮的来源消息（`data.source`，`turnTriggerDetails()` 按 kind 映射 i18n：`goal/agent-message/team-message/subagent-settled/webhook/schedule…`） | 「Team message received」文案即来自此 |
| `assistant-step` | `assistant/message` | 一步一条；`status:running/…`，`finalNode` 指向最终文本 |
| `tool-call` | `tool/call` + `tool/result` | 过程折叠 |
| `model-retry` | `llm/retry` / `llm/retry-started` / `assistant/attempt` | |
| `turn-error` / `turn-max-tokens` | `turn/end.reason.kind` | |
| `turn-process` / `turn-tail` | 轮级聚合/尾部动作（用量、fork、复制） | `turn-tail` 无独立事件 |
| `compaction` / `manual-compaction` | `compaction/*` / `command/run`+`command/done` | |

> **对群聊的启示**：现有 Chat 把 peer 消息塞进 `steering`、把 subagent 结算塞进 `context`，语义上不是「群聊发言」。群聊视图应自建 `ChatMessage` 模型（§6），只为「渲染器注册方式」参考 `conversation.chat.node`（key 注册 + `locale` 命名空间），**不要**复用 ChatNode 作为数据源（否则会丢掉 sender 身份、targets、isFinalOutput 等群聊必需字段，并继承 `context` 节点的召回折叠语义）。

---

## 9. 三个实现陷阱（真实数据踩点）

### 陷阱 1：`agent/inbox/spliced` 是「inbox 操作日志」，不是「消息日志」

- 同一事件既用于插入也用于删除：`{target, start, removedCount, inserted: []}` = 消费/取消。
- 每次插入**必然双写**成 `user/message`（同 id）。**[日志]** 实测交集 2/2、spliced-only 0。
- **后果**：如果直接把 spliced 当消息流，会（a）把「取出」误当消息、(b) 每条消息重复两次。
- **对策**：消息以 `user/message` 为主表；spliced 只取 inserted 且只用于补 `target`/投递时间；用 §7.2① 去重。

### 陷阱 2：当前构建拿不到 messageId，发送/接收无法一对一关联（且文案前缀会污染搜索与展示）

- `send_message` 当前返回 `{"sent":true}`；接收侧 source 只有 `{kind:'agent-message', form:'relay', senderSessionId}`，**没有 messageId**，发送者名字只在正文第一块 `Team message from <name>:` 里。
- 同一段正文还会在别处出现：发送侧 `tool/call.arguments.message`、父会话对子结果的 `subagent-settled` 副本。
- **后果**：按文本去重会误合并「同一段话同时发给多人」的 N 条投递（实测旧日志有同一 messageId 投递到 3 个会话的扇出：22 组）；按文本展示会把协议前缀渲染进气泡。
- **对策**：优先 `source.messageId`（旧构建）；当前构建用弱键 `(senderSessionId, targetId, sha256(text), time±5s)`，并**保留投递态**（`accepted`/`queued` 或 `next-step`/`next-turn`）作为「送达」展示；正文必须剥掉开头的 `Team message …:` 协议块（正则 `^Team message(?: \S+)? from .+?:$`）。

### 陷阱 3：fork/seed 子会话把父会话历史原样复制，「跨会话合并」会成倍重复

- `isSeeded:true` 的子会话：前缀事件保留**原 id / 原 seq / 原 time**，并追加 `session/end-seed` 与 `turn/end(reason=forked)` 合成事件；`createdAt` 是 fork 时刻（晚于内含事件）。
- **[日志]** 实测：`dsh-task-gantt/8a600894-…` 前 3333 条 seq 与父会话逐字节一致；一条 `team-message` 在 lead + 2 个 fork 子会话里各出现一次（time 相同）。
- **后果**：按时间线合并 N 个会话，历史消息会重复 N 倍；按 `seq`/`time` 去重会把「真正同步发生的不同消息」误删；用 `createdAt` 排序会把历史消息排到未来。
- **对策**：① `Session.ownEvents()` / `firstLiveSeq` / `isOwnSeq()` 过滤继承前缀；② 按事件/消息 `id` 全局去重；③ 丢弃 `session/end-seed` 与 `reason.kind==='forked'` 的 `turn/end`；④ 排序只用 `time`，不用 `createdAt`。

---

## 10. 未决 / UNVERIFIED

1. **`steering` vs `next-step`**：`agent/inbox/spliced.target` 只有 `next-turn` / `next-step` 两种（[类型] `InboxTarget`），客户端 `steering` 节点的派生规则未逐行核对 → UNVERIFIED。
2. **ChatNode 投影的精确字段**（如 `assistant-step.data.finalNode`、`turn-trigger.data.source`）来自渲染器读取代码，未读投影源码 → 表格中标 [推断] 部分为 UNVERIFIED。
3. **`team/message/queued` 在哪些构建写入**：实测 LiveShopping（10-12）/dsh-task-gantt（10-11~10-16）有，当前构建（10-28）无；无法确认是版本差异还是配置差异 → UNVERIFIED（解析器按「存在则用」处理即可）。
4. **`subagents.sendMessage` 与 `agentTeams.sendMessage` 的差异**：前者签名为 `sendMessage(sender: Agent, targetId: SessionId, content: ContentBlock[], options)`（[类型] host Service），后者走成员名解析；当前构建 `send_message` 工具实际调用哪条路径（取决于 target 是 teammate 还是 subagent）未从工具实现确认 → UNVERIFIED。两者产出的接收侧 source 均为 `agent-message`，对群聊归一化无影响。
5. **用户消息的 `principal` 字段**（多端/多用户场景）：类型里有 `principal?: Principal`，真实日志未出现 → UNVERIFIED。
6. **跨工作区（不同 `cwd`）的团队**：`teamId` 即 lead sessionId，未发现跨 workspace 团队证据 → 视为不支持。

---

## 附录：复现命令

```bash
export PATH=/Users/lzx/miniconda3/bin:$PATH
D=~/.dsh/sessions/--Users-lzx-Documents-GitHub-dsh-team-group--
# 事件类型直方图
zstd -dc "$D/session-fd60565f-cdbb-4234-88e2-146ddda95bae/session.v4.jsonl.zstd" \
  | python3 -c "import sys,json,collections;print(collections.Counter(json.loads(l)['type'] for l in sys.stdin if l.strip()))"
# 团队事件
zstd -dc "$D"/session-*/session.v4.jsonl.zstd | grep -E '"type": ?"team/(member|task|message)'
# 投递事件与 source
zstd -dc "$D"/*/session.v4.jsonl.zstd | python3 -c "import sys,json;[print(json.dumps(it.get('source'),ensure_ascii=False)) for l in sys.stdin if l.strip() for e in [json.loads(l)] if e.get('type')=='agent/inbox/spliced' for it in e['data'].get('inserted',[])]"
```

内置包取证（asar 无法用 bash/grep，用 Python 解析 asar 索引只读访问）：

```python
# asar 头：4B=4 | 4B=hsize | 4B=pad | 4B=json_size；JSON 起始 offset=16；文件数据 base=16+hsize
```

关键文件：
- `@deepseek-ai/dsh-session/lib/types/known-event-types.js`（事件词表）
- `@deepseek-ai/dsh-session/lib/types/fork.js`（`buildForkSeed`）
- `@deepseek-ai/dsh-api-session-controller/lib/typert.host.js`（`Session` / `SessionHeader` / `MessageSourceMap` / `TeamMessageSource` / `AgentMessageSource` / `SubagentSettledMessageSource` / `TurnEndReasonMap`）
- `@deepseek-ai/dsh-experimental-agent-team/lib/types/index.js`（`sendMessage` 前缀与 source）
- `@deepseek-ai/dsh-experimental-agent-team/lib/types/roster.js`（`TeamMemberView` 构造、`resolveActiveMember`、teammate 判定）
- `@deepseek-ai/dsh-experimental-agent-team/lib/types/session-message.js`（inbox 折叠 / `messageAccepted`）
- `@deepseek-ai/dsh-subagent/lib/index.js`（`createSettlementMessage` / `AssistantOutputFold` / `finalAssistantOutput`）
- `@deepseek-ai/dsh-client-ui-chat/lib/client.js`（`conversation.chat.node` 注册键、`legacyContribution`、`turnTriggerDetails`）
