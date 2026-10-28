# ADR：群聊发送编排（T3 / v1 纯 Client）

- 状态：**Accepted（v1 实现已落盘）**
- 日期：2026-10-28
- 范围：`plugins/dsh-group-chat/src/send/**`、`lib/index.js`（空壳 Host 半）、`src/host/`（仅说明）
- 上游契约：`docs/architecture/group-chat-architecture.md` §5（v1.6 冻结）、§4.4、§10；`docs/research/spikes-v1.md` S2/S3；PRD v0.7.1 F7/F8/F9/F19；Lead 决策 V1.1-1/V1.1-2/V1.1-6/D-ARCH-01/01b/04/08/10

## 1. 背景

一次「群聊发送」在平台上是 **N 次独立 `prompt`**，不是事务（API R1）：

- 群聊输入框不 @ → 默认发给 Lead（当前频道根会话）；
- @ 一个或多个成员 → **Lead + 被 @ 成员同时收到同一份内容**，且接收方要能看到「同时发给了谁」；
- 发送状态必须可观测：`sending / sent / partial / failed`，部分失败只补失败目标；
- 浏览器侧唯一发送通路是 `binding(targetId).session.prompt(parts, mode, signal, requestId)`（API §C2），
  `agentTeams.sendMessage` **不是 @Remote**、浏览器调不到（API §C3）；且 `subagents.prompt` 要求父 Agent 在线（S3）。

因此发送语义必须由**正文协议文本 + 客户端编排**共同表达，不能依赖平台事务/跨目标 messageId（V1.1-6）。

## 2. 决策（v1）

### 2.1 单一入口、纯 Client

- 唯一入口：`src/send/send-batch.js` 的 **`sendChannelBatch(request)`**（T2 冻结签名）；
- Host 半 `lib/index.js` 仅空壳 `apply()`，**不注册路由/Service**；`src/host/` 只有说明文档；
- `sendChannelBatch` 可注入 `deps.ctx / binding / prompt / uuid / now / sleep / signal / members / singleFlight / batchRegistry`，便于单测与未来复用。

### 2.2 目标解析与顺序

- `targets` 由 T2 的 `core/mentions.resolveTargets` 产出（Lead 首位、D-A 可寻址过滤），本模块再做一次归一化与兜底：
  - 兼容 `[{name, sessionId}]`（T2 实际形状）与 `['lead','ux']`；
  - 缺省时用 `mentions + members` 解析，仍为空则 `targets=['lead']`（D-C 无团队发送）；
  - 上限 `LIMITS.maxTargetsPerBatch = 8`。
- **发送顺序 = lead 先 → 成员（传入顺序）**，串行；禁止并行乱序（S3 硬约束，避免 `subagent/parent-unavailable`）。

### 2.3 同发协议前缀（canonical 单点）

- 仅 `targetNames.length > 1` 时注入；单目标按普通用户消息发送（SC28）。
- 前缀来自 **`src/core/protocol.js` 的 `buildParts(targetNames, body)`**（全仓库唯一字面量，快照测试在 T1）：
  - part1：`[群聊 · 同发] 收件人：@lead、@ux、@backend`
  - part2：`（本消息由用户在「群聊」视图同时发送给上述 3 位成员，各成员各自收到一份。）`
  - part3：用户正文
- 逐目标发送 `prompt([{type:'text',text:part1},{type:'text',text:part2},{type:'text',text:body}], mode, signal, requestId)`，
  使接收侧可按 `content[0]/content[1]` 精确校验（SC27）；**不转义、不缩进正文**。
- 协议文本固定中文、不随 locale 变化（D-ARCH-08）。

### 2.4 mode 选择表

| 目标 | mode | 依据 |
| --- | --- | --- |
| Lead（普通会话） | `steer` | PRD §6.1/§6.3 冻结；插入最近 step 边界、不打断 |
| teammate / subagent（子会话） | `steer` | 同上；S3 实测 steer 也会唤醒 inactive/冷目标 |
| 不可寻址（one-shot 完成、已离开） | 不发送 | 预检 `unaddressable` |
| 父 Agent 离线（子会话） | 不发送（预检）或失败分类 `parent-unavailable`（Host 返回时） | API R4 / S3 |

- 运行中/离线判定：`target.running` 或成员 `status`；**离线不阻断**（`steer` 可唤醒），仅作为 `warnings:['target-offline']` 弱信号交给 UI。
- `queue` 会唤醒但 PRD 已冻结 `steer`，v1 不提供双策略；若未来产品改口径，只需改 `src/send/mode.js` 的 `MODE_TABLE` 或调用方传 `mode`。
- 「投递身份 = 用户消息」（D-ARCH-01）而非 lead peer mailbox：接收方看到普通用户消息 + 两行前缀，这是唯一能持久告知接收方「同时发给谁」的手段（API §C4）。

### 2.5 四态状态机与本地 echo

```
点击发送
 ├─ 校验：text 非空 / 非只读 / 频道单飞可用 / 目标可解析
 ├─ 生成 clientBatchId + 每目标 requestId（uuid）
 ├─ 本地 echo：id=local:<clientBatchId>，delivery=sending，deliveries[target]=sending
 ├─ 串行 fan-out（lead 先）：每目标独立结果 → deliveries[target]=sent|failed(reason)
 ├─ 聚合：全 sent→sent；部分→partial；全失败→failed；仍有在途→sending
 └─ 返回 {status, deliveries, clientBatchId, requestIds, echo, ...}
```

- 返回固定的 T2 字段：`{status, deliveries:[{target, sessionId, ok, error?}]}`；`error` 是**内部 reason 码**（T2 用 `messageKey` 走 i18n），
  额外提供 `reason/messageKey/retryable/requestId/attempt` 便于渲染。
- echo 与权威事件合并由 T1 内核 `mergeFanout` 完成（按 `clientBatchId` 或「前缀签名 + time±5min」），群聊始终 **1 条气泡**（SC9/SC10）。

### 2.6 幂等、重试、单飞、限流

| 项 | 实现 |
| --- | --- |
| 幂等 | 同一 `clientBatchId` 的 `requestIds` 存在模块级 `batchRegistry`；重试复用同一 `requestId`（Host 按 rpcId 去重，S2 不双投） |
| 重试 | **手动**触发；`planRetry` 只纳入 `retryable!==false` 的失败目标；`attempt > maxRetry(2)` → `retry-exhausted`；退避 300/900ms |
| 成功目标 | 永不重发 |
| 前缀一致性 | 重试沿用批次登记里的 `targetNames/prefixParts`（即使 T2 只传失败目标子集，N 仍为首次实发数） |
| 单飞 | `createSingleFlight()` 按 `channelId` 加锁（带 120s 陈旧超时）；并发第二批返回 `busy` |
| 限流 | 同批相邻 prompt ≥ `minIntervalMs=200ms`；整批串行 |
| 超时 | 单目标 `promptTimeoutMs=30s` → 失败 `timeout`（可重试） |
| 中断 | 调用方 `deps.signal`；已 accepted 的不撤回，未发送目标标 `aborted` |
| 自动重试 | **不做**（UX Q2）；仅手动 |

> `batchRegistry` 是内存态：页面刷新后丢失。刷新后重试若 T2 只传失败目标子集，前缀将按子集 N 计算（已知限制，UI 可改为传 `prefixTargets`/完整 targets 规避；v1 接受）。

### 2.7 错误分类表（`FAILURE_MATRIX`，`src/send/errors.js`）

| reason | 触发 | retryable | i18n key |
| --- | --- | --- | --- |
| `network` | fetch/Remote 失败、connection/transport | ✓ | `send.error.network` |
| `timeout` | 30s 未 accepted | ✓ | `send.error.timeout` |
| `parent-unavailable` | Host 返回 `subagent/parent-unavailable`（父链未 live） | ✓ | `send.error.parentUnavailable` |
| `parent-offline` | 预检：子会话父 Agent 离线（`parentAvailable===false`） | ✗ | `send.error.parentOffline` |
| `unaddressable` | 成员不可寻址/已离开/名册映射失败 | ✗ | `send.error.unaddressable` |
| `readonly` | 团队结束/归档/只读 | ✗ | `send.error.readonly` |
| `forbidden` | 权限拒绝（403） | ✗ | `send.error.forbidden` |
| `payload-too-large` | 正文 > `textStore` | ✗ | `send.error.payloadTooLarge` |
| `rate-limited` | Host 429 | ✓ | `send.error.rateLimited` |
| `session-missing` | binding/session.prompt 不可用 | ✗ | `send.error.sessionMissing` |
| `aborted` | 调用方中断 | ✗ | `send.error.aborted` |
| `empty-text` | 空消息 | ✗ | `send.error.emptyText` |
| `targets-overflow` | 目标数 > 8 | ✗ | `send.error.targetsOverflow` |
| `busy` | 同频道已有在途批次 | ✗ | `send.busy` |
| `retry-exhausted` | 重试超过 2 次 | ✗ | `send.retryExhausted` |
| `unknown` | 未识别 | ✓ | `send.error.unknown` |

分类实现见 `classifyError()`：优先 `error.code`（含 `subagent/parent-unavailable`、403/429、AbortError、TIMEOUT），其次 `status/statusCode`，最后 message 关键字。

## 3. 与 T2 的接口（冻结）

```ts
sendChannelBatch({
  text: string,
  mentions?: string[],
  targets?: Array<{name: string, sessionId: string, kind?: string} | string>,
  channelId: string,
  clientBatchId?: string,
  mode?: 'steer'|'queue'|'inject'|'auto',
  deps: { ctx: ClientCtx },        // T2 实际只传 ctx；其余 deps 为测试/高级注入
}) => Promise<{
  status: 'sent'|'partial'|'failed'|'sending',
  deliveries: Array<{target: string, sessionId: string, ok: boolean, error?: string,
                     reason?: string, messageKey?: string, retryable?: boolean,
                     requestId?: string, attempt?: number}>,
  clientBatchId: string, requestIds: Record<string,string>,
  targets: Array<{name: string, sessionId: string}>,
  targetNames: string[], prefixParts: string[],
  echo?: ChannelMessage, reason?: string, messageKey?: string,
  retryable: boolean, attempt: number, warnings: string[]
}>
```

- T2 现有代码 `gcInvokeSend` 只消费 `status/deliveries`，兼容。
- 若 T2 要走重试按钮：直接再次 `sendChannelBatch`（同 `clientBatchId` + 只传失败目标）即可复用 requestId/前缀；
  或使用可选 `createSendController(deps)`（单飞 + `retry()` + `getLastResult()`）。

## 4. 备选方案与取舍

| 方案 | 结论 | 原因 |
| --- | --- | --- |
| Host 侧以 lead Agent 身份 `agentTeams.sendMessage`（peer 投递） | **v1 不采用** | 需 live lead Agent；语义变成「agent 发言」而非用户发言（D-ARCH-01）；`requestId/rpcId` 对账需重做；见架构 §5.6 |
| 平台事务/跨目标 messageId | **不可用** | 当前构建 `send_message` 返回 `{sent:true}`、无跨目标同 id（EVT §2.1/§5.3） |
| 前端直接遍历 `binding.prompt`（无协议前缀） | **不可用** | 接收方无法得知「同时发给了谁」（用户需求第 4 条） |
| v2 Host 读接口 | **不排期** | Spike S1 已证客户端可拿原始事件；仅「S1 类失败」时再启用（D-ARCH-10） |

## 5. v2 触发条件（不排期）

同时满足才重新评估 `POST /api/group-chat/channel`（架构 §4.7）：
1. 出现「S1 类失败」证据：客户端 `eventSource` 拿不到 `{type,seq,time,data}` 原始事件（或版本漂移导致窗口形状不可用）；
2. 该问题无法用 v1 的截断/分页/上限策略缓解。

发送通路**仍保留在 Client**（v2 也不把 `prompt` 搬到 Host），因为浏览器侧 `requestId/rpcId` 对账已由 S2 证实。

## 6. 未决 / 已知限制

1. **rpcId 精确对账**（S2 已证）在 T1 内核表现为「本地 batch 反查 + 前缀合并」；本模块只负责写 `requestIds`，对账 UI 由 T2/T1 完成。
2. **Host 幂等窗口**：会话被驱逐且日志裁剪后 `hasPromptRequest` 不保证；因此重试 ≤2 次且以「已收到 rpcId」为准（架构 §5.3）。
3. **batchRegistry 内存态**：刷新后丢失，重试前缀 N 可能退化为子集（见 §2.6 注）。
4. **`release`/`delete`** 等零样例语义不属于本模块。
5. **真实 GUI 联调**：T2 的发送路径已按本接口调用；集成日需验证 `ctx.sessions.binding` 的可调用性与错误码（宿主 RemoteError 的实际 code 形状）。

## 7. 验证

- 单测：`test/send/*.test.js`（mock SessionBinding，覆盖 6 类状态、前缀快照、部分失败、重试幂等、限流、单飞、错误分类、mode）。
- 运行：`cd plugins/dsh-group-chat && node --test test/send/*.test.js`（或 `npm test`）。
- 契约快照：前缀两行由 T1 `protocolSnapshot()` 保证；本模块只调用 `buildParts`，不复制字面量。
