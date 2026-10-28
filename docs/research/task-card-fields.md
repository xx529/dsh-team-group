# 取证：任务卡片字段（team/task 事件、操作者归属、动作识别、失败语义）

> 任务 task-42（owner: scout-events）。只读取证，仅写本文件。
> 标记：**[日志]** 真实会话日志截取；**[类型]** 内置包源码/类型；**[推断]** 分析；**UNVERIFIED** 未验证。

## 0. 结论先行

1. **`team/task` 是「整条任务快照」事件，不是「变更事件」**：只有 `{version, teamId, task}`，`task` 字段固定为 `id/revision/subject/description/status/blockedBy/writeScopes/[ownerId]`。**没有 actor、没有 action、没有 createdAt/updatedAt**。
2. **任务状态只有 4 个**：`pending | in_progress | completed | deleted`（zod `.strict()` 定义）。**没有 `failed`**；`failed` 只存在于**成员相位**（`team/member.member.phase`）。
3. **操作者必须自己配对**：`team/task` 只写 **Lead 会话**（journal 从 root.session.append），而 `team_task_update`/`create` 的 `tool/call` 落在**操作者自己会话**。配对键 = `(taskId, revision)`：操作者会话的 `tool/result` 里有新 revision，Lead 会话有同一 `(taskId, revision)` 的 `team/task`。**[日志] 实测 744 对配对成功，journal 时间比 tool/result 早 3–128ms（同一次事务内先 append 再返回）**。
4. **动作别靠 diff，优先读 `tool/call.arguments.action`**：7 个 action 全在参数里显式给出。diff 有歧义：`pending→in_progress + owner set` 既可能是 **claim** 也可能是 **reassign**；`in_progress→pending + owner drop` 既可能是 **release** 也可能是「reassign 清空 owner」。区分靠「操作者 == 新 owner」与「操作者是不是 lead」。
5. **失败/返工的落地方案**（DSH 无 failed）：`reopen`（completed→pending，且 **ownerId 被丢弃**）显示为「任务被重新打开 · 返工」；`delete`（→status='deleted' 墓碑）显示为「任务已取消」；**没有「执行失败」这个客观事件**，只能由操作者文字说明，建议 Lead 决策是否引入团队约定（见 §6）。

---

## 1. `team/task` 事件模型

### 1.1 权威 schema

**[类型]** `@deepseek-ai/dsh-experimental-agent-team/lib/index.js`（zod，`.strict()` 表示不接受额外字段）：

```js
const teamTaskSnapshotSchema = z.object({
  id: teamTaskIdSchema, revision: positiveSafeInteger, subject: z.string(),
  description: z.string(),
  status: z.enum(["pending","in_progress","completed","deleted"]),
  ownerId: sessionIdSchema.optional(),
  blockedBy: z.array(teamTaskIdSchema),
  writeScopes: z.array(z.string())
}).strict();

const teamTaskEventSchema = z.object({ version: z.literal(2), teamId: teamIdSchema, task: teamTaskSnapshotSchema }).strict();
```

→ **没有** `actor` / `action` / `createdAt` / `updatedAt` / `ownerName` / `failed` 字段。

### 1.2 真实样例

**[日志]** `dsh-HtDot/session-c7f2b830-…`（Lead 会话），从创建到认领到完成：

```json
{"type":"team/task","seq":157,"time":1792723147069,"data":{"version":2,"teamId":"session-c7f2b830-0695-49ef-ab37-38795cf0c84f",
 "task":{"id":"task-1","revision":1,"subject":"侦察：执行引擎与协议适配层现状",
 "description":"只读调查 HtDot 仓库 /Users/lzx/Documents/GitHub/HtDot 的 server 端执行…","status":"pending",
 "blockedBy":[],"writeScopes":[".planning/protocol-delegation/engine-report.md"]}}}

{"type":"team/task","seq":185,"time":1792723166068,"data":{"version":2,"teamId":"session-c7f2b830-…",
 "task":{"id":"task-1","revision":2,"subject":"侦察：执行引擎与协议适配层现状","description":"…","status":"in_progress",
 "blockedBy":[],"writeScopes":["…"],"ownerId":"55633fb6-caba-483a-a2ed-8ae8d05afed3"}}}

{"type":"team/task","seq":416,"time":1792723538001,"data":{"version":2,"teamId":"session-c7f2b830-…",
 "task":{"id":"task-3","revision":3,"subject":"侦察：前端执行方式入口、原型与既有验收","description":"…","status":"completed",
 "ownerId":"914f3321-c9a8-4385-a0fe-0b23ca8544ff","blockedBy":[],"writeScopes":["…"]}}}
```

**[日志]** 全盘统计（所有工作区合计 **1176 条 `team/task`**）：

- status 分布：`pending 402 / in_progress 396 / completed 378`；**`deleted` 0 次，没有第四种状态出现过**；
- `data` 键集恒为 `(task, teamId, version)`；`task` 键集只有两种：
  - `(blockedBy, description, id, revision, status, subject, writeScopes)` ← 无 owner（402 条，= 全部 revision 1 + reopen/release 后）
  - 上面 + `ownerId`（774 条）；
- 含 `team/task` 的会话：**23 个 Lead 会话** + 3 个 seeded/fork 副本；**非 seeded 的 teammate/subagent 会话 0 个**（证明 journal 只写 Lead）。

### 1.3 revision 语义

**[类型]** `TeamTaskBoard.create()` 写 `revision: 1`；`update()` 末尾统一 `const task = { ...next, revision: current.revision + 1 }` 再 `appendAndFlush(root, 'team/task', {version:2, teamId, task})`。
→ **每次成功变更（含 edit/set_dependencies 这类不改变状态的操作）都 +1 并追加一条完整快照**；`expected_revision` CAS 失败会抛 `TEAM_TASK_STALE_REVISION`，不产生事件。

---

## 2. 工具 schema 与 action 语义

### 2.1 `team_task_create`

**[类型]** `dsh-experimental-tool-agent-team/lib/index.js`：

```js
name: "team_task_create", description: "Create one unowned pending task on the shared Team task board."
parameters: { subject:{required}, description:{required},
              blocked_by: {type:"array", items:{string}, description:"Task ids that must complete first."},
              write_scopes: {type:"array", items:{string}} }
output: TASK_VIEW_SCHEMA   // 含 id/revision/subject/description/status/ownerName/blockedBy/writeScopes/ready/writeScopeWarnings
```

**[类型]** 服务端固定：`status:'pending'`、`revision:1`、id = `task-${nextTaskNumber}`（1 起自增，删除也不复用）、`blockedBy` 校验存在且不重复/不自环、`writeScopes` 去重。

### 2.2 `team_task_update` 与 7 个 action

参数（**[类型]** 工具定义 + `UpdateTeamTaskRequest`）：

```js
parameters: { task_id:{required}, expected_revision:{required, integer}, action:{required, enum:[
  "claim","release","edit","set_dependencies","complete","reopen","reassign","delete"]},
  subject?, description?, blocked_by?: string[], write_scopes?: string[], owner?: string }
```

**[类型]** `TeamTaskBoard.update()` 状态机（原文整理）：

| action | 前置校验 | 对 task 快照的影响 | 授权 |
|---|---|---|---|
| `claim` | 状态必须 `pending` 且 `taskReady()`（所有 blocker 已 completed）；不能被别人占用 | `status='in_progress'`, `ownerId=caller.id` | 任何成员（自己认领） |
| `release` | 状态必须 `in_progress` | `status='pending'`, **删除 ownerId** | 当前 owner 或 lead |
| `edit` | 至少给 subject/description/write_scopes 之一 | 只改这三项，状态/owner 不变 | owner 或 lead |
| `set_dependencies` | 必须给 blocked_by | 只改 `blockedBy` | owner 或 lead |
| `complete` | 状态必须 `in_progress` | `status='completed'`（**保留 ownerId**） | owner 或 lead |
| `reopen` | 状态必须 `completed` | `status='pending'`, **删除 ownerId** | owner 或 lead |
| `reassign` | lead only；状态 pending/in_progress；新 owner 必须是 active 成员且任务 ready | `status='in_progress'`, `ownerId=assignee.id`；`owner` 为空串/省略 → `status='pending'` 且删 owner | **仅 lead** |
| `delete` | 不能被其它未删除任务依赖 | `status='deleted'`（墓碑，`list()` 过滤掉） | owner 或 lead |

授权实现：

```js
const lead = membership.role === 'lead';
const owner = current.ownerId === caller.id;
const authorizeOwner = () => { if (!lead && !owner) throw new TeamError('task mutation requires its owner or Team Lead', 'TEAM_TASK_UNAUTHORIZED'); };
```

→ **teammate 可以自己 claim/complete/release/edit/delete 自己的任务；reassign 只能 lead。** `caller` 由工具执行体 `callingAgent(exec.agent, "team_task_update")` 确定，即**发起这次工具调用的 agent**（不是 Lead）。

### 2.3 真实 action 分布

**[日志]** 全盘 `team_task_update` 调用（去重后按真实调用方会话统计）：

| action | 实测次数 | 主要调用方 |
|---|---|---|
| `claim` | 359 | teammate（349）|
| `complete` | 391 | teammate（358）|
| `reassign` | 41 | **lead（41，全部）** |
| `edit` | 9 | lead 7 / teammate 2 |
| `set_dependencies` | 4 | lead 4 |
| `reopen` | 5 | lead 4 / teammate 1 |
| `release` | **0** | — |
| `delete` | **0** | — |

**[日志]** 真实 `team_task_update` 调用 + 结果（teammate `914f3321-…` = scout-ui，claim 后 complete）：

```json
{"type":"tool/call","seq":…,"data":{"callId":"call_…","name":"team_task_update",
 "arguments":"{\"task_id\":\"task-3\",\"expected_revision\":1,\"action\":\"claim\"}"}}
{"type":"tool/result","data":{"message":{"toolCallId":"call_…","content":[{"type":"text","text":
 "{\"id\":\"task-3\",\"revision\":2,\"subject\":\"侦察：前端执行方式入口、原型与既有验收\",\"description\":\"…\",\"status\":\"in_progress\",\"blockedBy\":[],\"writeScopes\":[\"…\"],\"ownerName\":\"scout-ui\",\"ready\":false,\"writeScopeWarnings\":[]}"}]}}}

{"type":"tool/call",…"arguments":"{\"action\":\"complete\",\"expected_revision\":2,\"task_id\":\"task-3\"}"}
{"type":"tool/result",…"content":[{"type":"text","text":"{\"id\":\"task-3\",\"revision\":3,…,\"status\":\"completed\",…,\"ownerName\":\"scout-ui\"}"}]}
```

**[日志]** 真实 reassign（lead，`session-dffb…`）：

```json
{"type":"tool/call","…":"team_task_update","arguments":"{\"action\":\"reassign\",\"expected_revision\":4,\"owner\":\"ux-designer\",\"task_id\":\"task-3\"}"}
→ result: {"id":"task-3","revision":5,"status":"in_progress","ownerName":"ux-designer",…}
```

---

## 3. 操作者归属（谁操作谁发话）

### 3.1 事实

- `team/task` 由 `TeamJournal.appendAndFlush(root, …)` 写入 `root.session`（root = Lead Agent）→ **只出现在 Lead 会话日志**；**[日志]** 非 seeded 子会话 0 条。
- 工具调用与它的 `tool/result` 落在**调用方会话**（lead 或 teammate）。
- `team/task` **不记录 actor**，所以必须配对。

### 3.2 配对算法（已实测）

```
pair(event_teamTask, caller_sessions):
  对每个 caller 会话 S（lead + 所有 teammate/subagent 子会话）:
    对每条 tool/result R，其 toolCallId 对应的 tool/call C:
      若 C.name ∈ {team_task_create, team_task_update}:
        V = parse(V.content[0].text)            # TASK_VIEW_SCHEMA
        key = (S.teamId 或 leadSessionId, V.id, V.revision)
        若 key 命中 team/task 事件 E（同 teamId/task.id/revision）:
          actor = memberOf(S.sessionId)          # 'lead' 或 teammate name
          action = C.arguments.action ?? 'create'
```

**[日志]** 实测效果：`1128` 条 journal revision 中有 **744** 条成功配对；`journal.time - result.time ∈ [-128ms, -3ms]`（journal 先写、result 后返回），所以**不能用「journal 在 result 之后」判断配对**，必须用 `(taskId, revision)` 精确键。

### 3.3 回退链

| 优先级 | 方法 | 可靠性 | 备注 |
|---|---|---|---|
| 1 | `(taskId, revision)` 配对 tool/result | 高（实测 744 对，误差 0） | 需要能读到操作者会话事件 |
| 2 | 同 `(taskId)` 且 `|journal.time - call.time| < 1s` 的时间近邻 | 中 | 并发 claim 不同任务时可能错配 |
| 3 | 由 `ownerId` 反推：`claim`/`complete` 的 actor 通常是 owner | 中 | `reassign`/`delete` 的 actor 可能是 lead，会错 |
| 4 | 兜底：actor 显示为「系统」 | 低 | 卡片仍可展示动作与任务名 |

`memberOf(sessionId)` 的解析：`sessionId === teamId` → `'lead'`；否则 `team/member.member.id === sessionId` → `member.name`；否则该会话 `subagent/descriptor.label`。

**注意**：fork/seeded 子会话会复制父会话的 `tool/call` 与 `team/task`（**[日志]** 3 个会话含继承的 team/task），配对前必须用 `Session.ownEvents()`/`isOwnSeq()` 过滤，否则同一动作会被多个 fork 会话各配一次。

---

## 4. 动作识别

### 4.1 首选：显式 action（无歧义）

`team_task_create` → `create`；`team_task_update.arguments.action` → 7 种之一。**推荐实现直接把 action 写进卡片**，不要自己推断。

### 4.2 回退：revision diff 规则

设 `prev` = 同 taskId 的 `revision-1` 快照（`revision===1` 则视为 create），`next` = 当前快照：

| prev→next 可观测变化 | 判定 | 实测次数 |
|---|---|---|
| 无 prev（revision 1） | **create**（创建） | 378 |
| `status pending→in_progress` 且 `ownerId` 由空→X | **claim**（若 actor==X）或 **reassign**（若 actor 是 lead 且 X≠actor） | 372（claim）+ 4（reassign，in_progress→in_progress） |
| `status in_progress→in_progress` 且 `ownerId` 变化 | **reassign**（改派） | 4 |
| `status in_progress→completed` 且 owner 不变 | **complete**（完成） | 362 |
| `status in_progress→pending` 且 `ownerId` 被删除 | **release**（actor==原 owner）或 **reassign 清空**（actor==lead） | 9 |
| `status completed→pending` 且 `ownerId` 被删除 | **reopen**（重新打开/返工） | 7 |
| `status →deleted` | **delete**（取消） | 0（枚举存在，日志未出现） |
| 状态/owner 都不变，subject/description/writeScopes 变 | **edit** | 9 |
| 状态/owner 不变，blockedBy 变 | **set_dependencies**（依赖变更） | 4 |

> 歧义消解关键：**`claim` 的 `ownerId === actor.id`**（自己认领自己），**`reassign` 的 `ownerId !== actor.id` 且 actor 必为 lead**；`release` vs 「reassign 清空 owner」同理（actor 是否等于原 owner）。

### 4.3 动作识别总算法（伪代码，可直接实现）

```ts
// 输入：lead 会话 + 全部成员子会话的「自己的」事件（ownEvents）
function buildTaskCards(sessions: Session[], leadId: SessionId): TaskCard[] {
  // ① 建 journal 索引：一 revision 一快照
  const snaps = new Map<string, TaskSnap>()          // key = `${taskId}:${revision}`
  for (const s of sessions) for (const e of s.ownEvents())
    if (e.type === 'team/task' && e.data.teamId === leadId)
      snaps.set(`${e.data.task.id}:${e.data.task.revision}`, { ...e.data.task, time: e.time, seq: e.seq })

  // ② 建调用索引：从操作者会话的 tool/call + tool/result 反推
  const ops = new Map<string, Op>()                  // key = `${taskId}:${revision}`
  for (const s of sessions)
    for (const call of s.ownEvents().filter(e => e.type === 'tool/call')) {
      if (call.data.name !== 'team_task_create' && call.data.name !== 'team_task_update') continue
      const result = nextResult(s, call.data.callId)                 // 同 callId 的 tool/result
      const view = parseJson(result.message.content[0].text)          // TASK_VIEW_SCHEMA
      const args = JSON.parse(call.data.arguments)
      ops.set(`${view.id}:${view.revision}`, {
        action: args.action ?? 'create',
        actorId: s.id, actorName: memberOf(s.id, leadId),
        ownerNameFromView: view.ownerName, ready: view.ready,
        callTime: call.time, args
      })
    }

  // ③ 组装：每条 revision 一张卡；扩展/歧义用 diff 或 args 修正
  const cards: TaskCard[] = []
  for (const [key, snap] of snaps) {
    const [taskId, revStr] = key.split(':')
    const rev = Number(revStr)
    const op = ops.get(key)                                          // 首选：显式 action
    const prev = snaps.get(`${taskId}:${rev - 1}`)
    let action = op?.action ?? diffAction(prev, snap, op?.actorName) // 回退：diff
    // 歧义修正（diff 路径才有意义）
    if (!op && action === 'claim_or_reassign')
      action = (snap.ownerId === op?.actorId) ? 'claim' : 'reassign'
    cards.push({
      kind: 'task', taskId, revision: rev, action,
      subject: snap.subject, description: snap.description,
      status: snap.status, blockedBy: snap.blockedBy, writeScopes: snap.writeScopes,
      owner: op?.ownerNameFromView ?? resolveOwnerName(snap.ownerId, leadId),
      actor: op?.actorName ?? 'system',                               // 回退：系统
      time: snap.time, dedupeKey: `${leadId}:${taskId}:${rev}`
    })
  }
  return cards.sort((a, b) => a.time - b.time)                        // 只有 time 跨会话可比
}

function diffAction(prev: TaskSnap | undefined, next: TaskSnap, actor?: string): Action | 'claim_or_reassign' {
  if (!prev) return 'create'
  if (next.status === 'deleted' && prev.status !== 'deleted') return 'delete'
  if (prev.status === 'completed' && next.status === 'pending') return 'reopen'
  if (prev.status === 'in_progress' && next.status === 'completed') return 'complete'
  if (prev.status === 'pending' && next.status === 'in_progress') return 'claim_or_reassign'
  if (prev.ownerId !== next.ownerId) return 'reassign'
  if (prev.status === 'in_progress' && next.status === 'pending') return 'release'
  if (!sameArray(prev.blockedBy, next.blockedBy)) return 'set_dependencies'
  return 'edit'
}
```

**判定顺序很重要**：`delete` / `reopen` / `complete` 先判 status 跃迁，再判 owner 变化，最后才落到 `edit`——否则 `edit` 会吞掉「reassign 同时改了描述」的组合动作（真实日志里 edit 与 reassign 常先后出现，见 `session-dffb…` 的 task-3/task-5）。

---

## 5. 「失败」语义结论

### 5.1 事实

- **[类型]** 任务状态枚举只 `pending|in_progress|completed|deleted`；`failed` 只出现在 `teamMemberSnapshotSchema.phase`（`provisioning|active|failed` + 可选 `error`）与成员视图 `status`。
- **[类型]** `member` 创建失败路径：`catch (error) { const failed = {...member, phase:'failed', error: errorMessage(error)} }`（spawnTeammate 内部）——**这是「成员创建失败」，不是「任务失败」**。
- **[日志]** 1176 条 `team/task` 中 `status='deleted'` 0 条、`failed` 0 条；全盘 `team_task_update` 无 `release`/`delete` 调用。
- **[类型]** 没有任何任务级 `team/task/failed` 之类事件类型（`KNOWN_SESSION_EVENT_TYPES` 里 team 事件只有 `team/member`、`team/task`、`team/message/queued|delivered`）。

### 5.2 可落地映射（不改 DSH，纯展示层）

| 用户语义 | DSH 可观测事实 | 卡片文案建议 |
|---|---|---|
| 任务失败 / 返工 | `reopen`（completed→pending，owner 被清空） | 「@X 重新打开了任务」+ 状态「待认领 · 返工」 |
| 任务取消 | `delete`（→status='deleted'） | 「@X 取消了任务」 |
| 任务放回（不干了） | `release`（in_progress→pending，owner 清空） | 「@X 放回了任务」 |
| 弃管/换人 | `reassign`（lead） | 「@lead 把任务改派给 @Y」 |
| 成员创建失败 | `team/member.phase='failed'` + `error` | 归入**成员卡**（「拉起 @X 失败：…」），不属于任务卡 |
| **纯「执行失败」** | **不存在** | 无客观信号 → 见 §5.3 |

### 5.3 给 Lead 的决策建议

- **方案 A（推荐，零改动）**：只做 4 种任务卡（创建/认领/完成/重新打开+改派/取消合并为「状态变更」卡），失败语义=「reopen=返工」。缺点：无「失败」这一独立卡片。
- **方案 B（团队约定，零平台改动）**：约定失败者必须 `team_task_update` 先 `edit` 在 description 追加 `FAILED: <原因>` 再 `release`/`reopen`；群聊解析 description 前缀渲染「失败」卡。脆弱但可立即用。
- **方案 C（改平台，成本高）**：扩展 `TeamTaskStatus` 加 `failed`——内置包不可改（asar 只读签名），只能 fork agent-team 插件，不建议。

---

## 6. 字段 → 来源 → 回退 映射表（任务卡）

| 卡片字段 | 权威来源 | 回退 | 备注 |
|---|---|---|---|
| 动作（create/claim/complete/…） | `tool/call.arguments.action`（create 为工具名） | revision diff（§4.2） | 首选显式值 |
| 操作者名（发送者=操作者） | 配对到的 tool/call 所在会话 → `memberOf(sessionId)` | `ownerId` 反推 → 「系统」 | §3 |
| 操作者会话 id | 同上 | — | 可点击跳转 |
| task id | `team/task.task.id` | `tool/result.id` | `task-N` |
| revision | `team/task.task.revision` | `tool/result.revision` | 一条 revision 一张卡 |
| 标题 | `task.subject` | — | 卡片主标题 |
| 描述摘要 | `task.description` | — | create 卡可展开全文（最长 16384 字节，见 `requiredText(…, 16_384)`）；后续卡建议只 1 行 |
| 状态 | `task.status`（pending/in_progress/completed/deleted） | — | deleted 需保留墓碑事件才有卡 |
| 负责人 | `task.ownerId` → `team/member(name)` / `teamId(lead)` | `tool/result.ownerName`（视图里有！） | **journal 无 ownerName，但同 revision 的 tool/result 有**，配对成功时直接用 `ownerName` 最省事 |
| 依赖 | `task.blockedBy`（task id 数组） | — | 显示「被 task-1、task-2 阻塞」 |
| 写入范围 | `task.writeScopes` | — | 可折叠 |
| 时间 | `team/task` 事件 `time` | `tool/result` time | 差 3–128ms，用 journal 时间更准 |
| 是否 ready | 派生：`status==='pending' && blockedBy 全部 completed`（`taskReady`） | tool/result `ready` | 卡片可标「可认领」 |
| 冲突警告 | 派生：与其它 in_progress 任务 writeScopes 重叠（`projectTaskView`） | tool/result `writeScopeWarnings` | 可选展示「写入范围与 task-5 重叠」 |

---

## 7. 去重 / 回放 / 顺序

1. **一条 revision 一张卡**：`team/task` 是整快照，去重键用 `${teamId}:${taskId}:${revision}`。不要按时间或 taskId 去重（同一任务会有多次变更）。
2. **create 卡的判断**：`revision === 1`（且该 taskId 在此前无快照）。
3. **无变化不产生卡**：`appendAndFlush` 只在成功变更后调用，所以每条 `team/task` 一定对应一次真实动作；但 `edit`/`set_dependencies` 也会出卡 → 建议产品决策：这两类折叠为「更新了任务描述/依赖」小卡或静默（Lead 定）。
4. **回放**：历史回放按 revision 升序出卡，跳过 `revision===1` 以外的开场（避免把「当前快照」当成新动作）；fork/seeded 会话的继承副本必须 `ownEvents()` 过滤，否则历史会被复制 N 份。
5. **排序**：用 `team/task.time`（epoch ms）与其它群聊消息统一排序；同一毫秒内建议 `member 卡 < task 卡 < 消息` 由 sessionRank/seq tie-break（见 event-model.md §7.1）。
6. **与成员卡的关系**：成员卡（`team/member`）与任务卡（`team/task`）都在 Lead 会话、都无 actor 字段；成员卡 actor 恒 `lead`，任务卡 actor 靠 §3 配对。

---

## 8. 可观测性建议（给 tester / 架构）

任务卡 DOM 建议挂：

```html
<article data-member-card-kind="task"
         data-task-id="task-3"
         data-task-revision="5"
         data-task-action="reassign"
         data-task-status="in_progress"
         data-task-owner="ux-designer"
         data-task-actor="lead"
         data-task-blocked-by="task-1,task-2">
```

- `data-task-action` 必须是 §2.2 的 8 个值之一（`create` + 7 个 action），便于 e2e 断言「谁操作谁发话」；
- `data-task-actor` 与 `data-task-owner` 分开，才能测「改派」；
- 回放场景加 `data-replay="true"`；失败/取消用 `data-task-status="deleted"` 或 `data-task-action="reopen"` 区分。

---

## 9. 未决 / UNVERIFIED

1. `delete`/`release` 在真实日志中**零出现**（1176 条 revision）；其卡片形态只能按状态机推导 → 相关文案与视觉未经真实数据验证，**UNVERIFIED**。
2. `team/task` 事件的 `time` 与操作者 `tool/call.time` 的先后：实测 journal 早 3–128ms，但**跨会话时钟一致性**（同一进程内 Date.now）未单独验证 → 排序上依赖 `time` 全局可比（event-model.md 已证同一时刻同毫秒一致），**UNVERIFIED** 于极端并发。
3. 客户端是否存在 `agentTeam` 投影的公开读取路径（`ctx.sessionProjections.stateOf(session,'agentTeam')` 是 host 侧投影；client 侧是否有等价数据源）→ 未核对，**UNVERIFIED**（纯 Client 方案需在 spikes 里确认）。
4. 『执行失败』是否可由 `send_message` 文本 + 任务 edit 组合成事实契约，属产品决策，非平台能力 → 待 Lead 拍板。
5. `team_task_update` 的 `owner` 参数要求「active 成员名」，若 owner 成员已 failed 则 reassign 会抛 `TEAM_MEMBER_NOT_FOUND` → 卡片「改派失败」态未取证，**UNVERIFIED**。

## 附：复现命令

```bash
export PATH=/Users/lzx/miniconda3/bin:$PATH
# 1) 所有 team/task 快照
grep -l . /dev/null; for f in ~/.dsh/sessions/*/*/session.v4.jsonl.zstd; do
  zstd -dc "$f" 2>/dev/null | grep -q '"type": *"team/task"' && echo "$f"
done
# 2) 任务动作分布
for f in ~/.dsh/sessions/*/*/session.v4.jsonl.zstd; do
  zstd -dc "$f" 2>/dev/null | python3 -c "
import sys,json
for l in sys.stdin:
    l=l.strip()
    if not l.startswith('{'): continue
    try: e=json.loads(l)
    except: continue
    if e.get('type')=='tool/call' and e['data'].get('name') in ('team_task_create','team_task_update'):
        a=e['data'].get('arguments') or '{}'
        try: a=json.loads(a)
        except: a={}
        print(e['data']['name'], a.get('action'))
"
done | sort | uniq -c
```
