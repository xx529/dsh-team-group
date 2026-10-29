# PRD：DSH 对话页「群聊」视图（Group Chat / Team Channel）

| 项目 | 内容 |
| --- | --- |
| 文档版本 | **v0.8.1**（v0.8 + 用户 5 条线上问题：空输出抑制 / Markdown 表格 / 成员全名去遮罩 / 任务卡默认折叠 / 任务卡人物一致；F31–F35 + SC49–SC53） |
| 状态 | 规格先定（v0.8.1 基于线上问题修订，最终以用户确认的原型为准）；F/SC 编号只增不改 |
| 作者 | pm（Agent Team teammate） |
| 任务 | task-3（v0.1/v0.2）、task-7（v0.3）、task-16（v0.4）、task-22（v0.5）、task-29（v0.6）、task-32（v0.6.1）、task-34（v0.6.2）、task-44（v0.7）、task-76（v0.8，shared task board） |
| 上游输入 | 用户需求原文（R1–R6，§1.1）；Lead 数据范围假设（§1.5 A1–A3）；Lead 决策 D1–D10（§1.5）；架构审查决策 D-ARCH-01b/02/03/04/07/10（§12.4）；**用户 18 条反馈（§1.6）+ 5 条线上问题（§1.6 追加行 19–23）** |
| 调研依据 | `docs/research/api-feasibility.md`（scout-api，task-1）；`docs/research/event-model.md`（scout-events，task-2）；`docs/research/member-card-fields.md`（scout-events，task-20 成员卡字段取证）；`docs/research/task-card-fields.md`（scout-events，task-42 任务卡字段/操作者/动作取证） |
| 架构依据 | `docs/architecture/group-chat-architecture.md` v1.4（协议/状态/范围/成员加入消息与卡片字段来源逐字对齐，见 §12.4） |
| 视觉依据 | `docs/ux/group-chat-ux.md` v3.1「钉钉式气泡流」+ `docs/ux/prototype/01–09` 新 PNG + `11-member-join.png`（P10 `21:954` 成员加入消息）+ Figma 新帧 |
| 下游消费者 | ux（Figma 原型）、architect（技术方案）、frontend（实现）、tester（验收走查） |
| 编号规则 | F/SC 编号只增不改；v0.2 保留 v0.1 的 F1–F18、SC1–SC26，新增 F19、SC27–SC31；v0.3 不新增编号；v0.4 不动编号仅更新视觉；v0.5 新增 F20、SC32–SC34；v0.6 不动编号，仅纠正 F20/M8 语义与展示；v0.6.1 仅更新架构版本注记；v0.6.2 只冻结 4 项口径（D-A~D-D）；v0.7 新增 F21、SC35–SC38；v0.7.1 移除失败/返工口径；v0.8 新增 F22–F30、SC39–SC48；v0.8.1 新增 F31–F35、SC49–SC53 并修订受影响旧条目 |

## 变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v0.1 | 2026-10-28 | 初版：R1–R6 → F1–F18 + SC1–SC26；数据范围假设 A1–A7；§6 发送语义、§13 开放问题待决策 |
| v0.2 | 2026-10-28 | ① 落实 Lead 决策 D1–D10 为契约（§6 重写为「冻结契约」，§13 只保留未决项）；② 按调研重写 §4.3 事件→消息映射（事件类型、source.kind、双写去重、ownEvents/fork、排序键）；③ 修订 §7.11 数据量与增量窗口；④ 新增 F19 同发协议前缀 + SC27–SC31；⑤ 按调研修订 §12 依赖与 §14 风险（experimental 契约、fan-out 非原子、seeded fork 重复、前缀污染等）；⑥ 新增 §17 UNVERIFIED 清单 |
| v0.3 | 2026-10-28 | ① SC9/SC10 证据口径删除「同一 messageId」，改为 clientBatchId + N 个独立 requestId + 1 条气泡 + 每目标 1 条带前缀消息；② D9 未读降级：v1 不做 tab 圆点（无装饰位），改为消息区浮标 + 频道头提示，tab 标签恒为「群聊」；③ D4 三态扩展为四态（发送中/已发送/部分失败/失败，「已送达 X/Y」，重试只补失败项）；④ 冻结同发协议前缀 canonical（全角「：」「、」、第二行固定说明，targets>1 才插入，渲染剥除、手写 @ 不受影响）；⑤ 数据范围补 lead 全部后代、深度 ≤3、会话数 ≤32、subagent 显示父归属；同步 §12.4 架构决策对齐与追溯矩阵 |
| v0.4 | 2026-10-28 | 视觉展示口径对齐 UX v2「钉钉式气泡流」：① 删除角色徽标（Lead/Teammate/Subagent）与「最终输出·回复群聊」徽标，身份改由「头像+名字 14px+行内状态 11px」承载；② 删除「→ 发送给 @x」chip 行，@ 目标内联正文首行（business-primary）；③ 删除每行右侧时间戳，时间只保留居中分隔（日期变化或 ≥5 分钟）；④ 系统提示改居中 tertiary 纯文本（无药丸）、工具过程改气泡下一行摘要；⑤ 频道头瘦身为群头像 2×2 +「群聊」+团队名+状态行+单个筛选图标（去成员头像栈/「成员 N」）；⑥ subagent 从属改名字后缀「· <父名> 的子体」（去缩进/连接线）；⑦ 折叠链接改 12px 文本链接。功能语义与 F/SC 编号不变 |
| v0.5 | 2026-10-28 | 新增 F20「成员加入群聊卡片」+ M8 消息类型 + SC32–SC34：① 触发=成员 active 相位（teammate 等 `team/member phase=active`、subagent 用 `subagent/catalog`）；② 展示=「<creator> 拉了 @<name> 进群」系统提示 + 消息流内名片卡（非弹窗，不参与长文折叠）；③ 字段=名字/角色标识、角色描述、模型（provider·model）、上下文策略（全新/继承/一次性/可持续）、父成员（subagent）、创建方式、初始任务摘要（2 行截断 + 展开）、时间；④ 数据优先取 `spawn_teammate` tool/result 的 member 快照（含 model），`team/member` 无 model；subagent 上下文策略由工具名决定；creator 对 spawn_teammate 恒为 Lead，对 subagent 为调用方成员；⑤ 去重：同一成员仅 1 张卡、fork/seeded 用 ownEvents 过滤、历史可回放、失败/离开不删卡只更新状态；⑥ 空值回退不阻塞消息流 |
| v0.6 | 2026-10-28 | 入群卡语义纠正（用户反馈）：① M8 不再是孤立系统卡，而是 **creator 发出的一条消息**（sender=创建者：spawn_teammate 恒 Lead，subagent 为调用方成员），消息头含 creator 头像 32 + 名字 14/600 + 角色小标签 11（`主 Agent`/`Teammate`）+ 时间 11 同行，消息正文即卡片；② 其前新增右对齐蓝色欢迎提示（M4②）「欢迎 @<name> 加入群聊」（12/400 business-primary，无背景/无药丸），替代原「<creator> 拉了 @<name> 进群」居中提示；③ 卡片正文不变（标题/描述/模型/上下文策略/父成员/创建方式/初始任务 2 行+展开/查看会话·查看任务），仍不参与长文折叠；④ 模型行对齐 UX v3.1：只显示模型名、不显示 provider 内部名，继承时标「（继承 Lead）」；⑤ §4 消息模型、§7.15 边界、SC32–SC34、§11 追溯同步；F/SC 编号不变 |
| v0.7 | 2026-10-28 | 新增 F21「任务卡片消息」+ M9 + SC35–SC38：① 触发=`team_task_create`（create）与 `team_task_update`（claim/complete/reopen/reassign/release/delete/edit/set_dependencies）每次成功 revision 一张卡；② sender=操作者（创建/认领/完成/重新打开/改派可能不同人；消息头=操作者头像/名字/角色小标签/时间）；③ 卡片=动作标签+状态 pill+task id+subject+description（create 2 行+展开）+负责人+依赖+复制任务 ID；④ 平台限制：DSH 任务状态只有 pending/in_progress/completed/deleted，**无 failed**；状态 pill 只允许这四个真实枚举值，reopen 显示动作「重新打开」+ 真实状态 pending，不引入失败/返工概念，禁止伪造 failed；delete=取消、release=放回任务、edit=编辑、set_dependencies=依赖变更；⑤ 去重 `${teamId}:${taskId}:${revision}`、fork/seeded 用 ownEvents 过滤、历史按 revision 升序回放；⑥ journal 只写 Lead 会话，操作者靠 `(taskId, revision)` 配对 tool/result，配对失败回退「系统操作者」；delete/release 无真实样例标 🔶 按状态机推导 |
| v0.7.1 | 2026-10-28 | 用户拍板修正（不改 F/SC 编号）：① 删除「失败语义 / 返工」章节与全部相关措辞；② 任务卡状态严格映射 DSH 真实枚举 `pending/in_progress/completed/deleted`，状态 pill 只允许「待认领 / 进行中 / 已完成 / 已取消」四值；③ 动作严格映射 `team_task_update` 的 action：创建/认领/完成/重新打开/改派/编辑/依赖变更/取消/放回；④ `reopen` 卡显示动作「重新打开」+ 真实状态「待认领」，不得出现「返工/失败」字样；⑤ SC38 改为断言「重新打开」+ pending + 无 failed/返工 字样；F21/M9/A12/§7.16/§11/§12.3/§17 措辞同步 |
| v0.8 | 2026-10-29 | 用户 18 条反馈落地：新增 F22 Markdown 渲染、F23 任务卡重设计（去复制任务 ID/必须渲染头像/与气泡明显区分）、F24 单一输入器（隐藏宿主 composer，Enter 发送）、F25 @ 交互修订（仅 @ 触发/chip 移输入框下方彩色白字/描述小字/弹层不透明）、F26 成员状态与轮次轨迹侧栏、F27 作用域（member session 打开=lead 全量）、F28 降噪（去工具摘要+操作图标化）、F29 折叠改前 50 行、F30 防重复气泡；欢迎提示改居中（M4/M20 同步）；修订 F5/F6/F7/F8/F16/F20/F21 与 M6（作废）/M9；新增 SC39–SC48；§1.6 18 条映射、§11、§12.3、§13（O7–O9）、§17（U16–U18）同步 |
| v0.8.1 | 2026-10-29 | 用户 5 条线上问题：新增 F31 空输出抑制（无有效文本不渲染空气泡）、F32 Markdown 表格（GFM 表头/对齐/单元格，禁 HTML，原「表格降级纯文本」作废）、F33 成员条全名（头像+完整名字+状态点，去两端遮罩，全显禁 +N）、F34 任务卡默认折叠（目标/任务ID/状态/负责人/依赖/完成时间，描述等隐藏可展开、临时记忆）、F35 任务卡人物一致（外发送者=actor，卡内不重复 actor 头像，「负责人」字段行可不同人）；修订 F3/F5/F6/F20/F21/F22/F23/F26/F29/F30 与 M3/M9；新增 SC49–SC53；§1.6 追加 5 行、§9/§10/§11/§17 同步 |
| v0.6.1 | 2026-10-28 | 架构 v1.4（task-30）已落盘并核对：① §12.4 注记由「架构当前 v1.3」更新为「v1.4 已落盘、PRD/UX/架构三方一致」；② 全文 grep 核对，正文无「系统提示 + 名片卡」旧结构残留（仅 v0.5 历史变更记录保留原文），F20/M8/M4/SC32–SC34 均为「欢迎提示 M4② + creator 带卡消息 M8」；③ 不新增 F/SC，语义无实质差异 |
| v0.6.2 | 2026-10-28 | 按 Lead 决策关闭 tester 指出的口径：**D-A** @ 可寻址=Lead 恒可寻址、teammate 恒可寻址（inactive 可冷唤醒）、subagent 仅 running/provisioning、one-shot 完成不可寻址（F6/SC7）；**D-B** 筛选=sender 命中或 targets 命中，子体归入父成员，单选、不做多选/时间/类型组合（F11/SC14）；**D-C** 无团队会话允许发送，发送即该会话普通用户消息（F13/SC15）；**D-D** 模型继承文案：spawn_teammate→「（继承 Lead）」、subagent→「（继承 <creator>）」、无继承信息只显示模型名（F20/SC32/SC33）。同时在 §10 引用 `tests/design/test-plan.md` §13 的 DOM 契约（data-testid/data-*）；不新增 F/SC |

> 标记约定：
> 🔶 **假设** = 合理但尚未验证，需在原型/实现中确认；
> 🔵 **未决** = 仍需 Lead/用户决策（汇总 §13）；
> ✅ **已定** = Lead 决策或调研结论，实现必须遵守。

---

## 1. 背景、目标与范围

### 1.1 用户需求原文（R1–R6）

- **R1** 在对话页面上多一个 tab，就是群聊，点击后是一个类似聊天室的界面。
- **R2** 同时适配 agent teammate 与 subagent 的逻辑。
- **R3** 出现「A 对 B 说」的内容时，聊天内容里以 `@xxx` 形式展示；文本过长自动收起，有按钮看全部。
- **R4** 群聊中有输入框：不 @ 任何人时默认发给 lead（主 agent）；@ 一个或多个时，同时发给 lead 与被 @ 的 teammate，并明确说明这段内容同时发送给了谁。
- **R5** 群聊中要同时存在：我发送的话、agent 给 agent 发送的消息、agent 推理结束后的最后一段输出（视为其回复到群聊）。
- **R6** 其余逻辑按群聊该有的设计补齐（tab 切换、历史、实时更新、筛选、空态/异常等群聊惯例）。
- 备注：使用 Agent Team 完成；**必须先用 Figma 做交互原型供确认，原型确认后才开始代码实现**。

### 1.2 问题与用户

**问题**：Agent Team 运行期间，用户只能逐个打开 lead / teammate 的会话或轨迹去拼凑「谁在做什么、谁对谁说了什么」，缺少按时间线聚合的全局视角。

**目标用户（proto-persona）**：正在用 DSH Agent Teams 跑多 agent 任务的用户（开发者/技术 PM）。关注：进度、谁对谁说了什么、我发的消息发给了谁、是否已送达。

**现有视图**（调研实测占用，api-feasibility §A4）：`chat(order 0)`、`trajectory(10)`、`context(20)`、`terminal-panel(30)`、`fleet(30)`、`capability(40)`，均通过 `conversation.view` slot 注册。群聊作为**并列视图**新增，不覆盖现有 id。

### 1.3 目标（Goals）

- **G1** 用户可在对话页一键进入群聊，以聊天室形态**按时间线**观测整个 Agent Team 的工作与沟通。
- **G2** 用户可在群聊内指挥团队：默认对 lead 说话；用 `@` 同时向多个成员发送**同一份**内容，并清楚知道发送范围与结果。
- **G3** 群聊同时覆盖 teammate 与 subagent，显示上可区分「谁是谁、谁属于谁、谁在运行」。
- **G4** 群聊成为可验收契约：每条需求有功能编号与 Gherkin 场景，原型确认后可直接转实现与走查。

### 1.4 非目标（Non-goals）

- 不替换或改动现有 对话/轨迹/上下文/终端/fleet/能力 视图。
- 不做跨团队（跨 task）全局聚合；群聊是**单个团队频道**。
- 不做语音、视频、reaction、消息编辑/撤回、thread 回复（v1）。
- 不做对后端事件总线/传输层改造（由 architect 依据调研给出）。
- **v1 不写 Team peer mailbox**：群聊发送走「人类 prompt」路径，不调用 `agentTeams.sendMessage`（浏览器不可调，且会改变接收方 source 语义；api-feasibility §C3）。
- 本文档不含 Figma 原型与代码实现；原型确认是代码实现的**前置门禁**（§9）。

### 1.5 数据范围假设与决策（A1–A10）

- 🔶 **A1（Lead 已定）群聊 = 团队频道**：聚合 **lead 主会话 + 全部 teammate 会话 + 全部 subagent 子会话**，按时间线合并为单一消息流（范围与上限见 A10）。
- 🔶 **A2（Lead 已定）发言口径**：每个 agent **每轮推理结束时的最后一段输出**作为其群聊发言；中间过程（工具调用、推理草稿、token 流）不进群聊，留在轨迹/上下文视图。
- 🔶 **A3（Lead 已定）用户消息**：包含用户在群聊内新发送的消息 + lead 主会话中用户已发的消息（`source.kind='user'` 且带 `rpcId`）。
- ✅ **A4（D8）排序键**：`(time, sessionId, seq)`——`time` 为跨会话可比主键，`sessionId` 为同毫秒确定性次序，`seq` 仅会话内 tie-break；另按调研补充：`sessionId` 的次序定义为「lead → teammate → subagent → 会话 id 字典序」，与 event-model §7.1 的 sessionRank 建议等价。**禁止**用 `seq` 全局排序，**禁止**用 `createdAt` 当事件时间（seeded/fork 会话会错序）。
- ✅ **A5（D8）名册来源**：客户端读 `projectionsBySession[lead].values.agentTeam`；Lead 身份 = `binding(sessionId)?.session.getSnapshot().subagent?.address?.parentSessionId ?? sessionId`。投影缺失时降级为 `sessions.list` 的 `parentSessionId/origin` 推导。
- ✅ **A6（D8/D9）发言提取**：agent 最终输出 = 该 turn 内**最后一个非空 `assistant/message`** 的 `text` 块（忽略 `reasoning` / `tool-call`）；`turn/end.reason.kind='forked'` 与 `session/end-seed` 是合成事件，必须丢弃。
- ✅ **A7（D9）去重**：消息去重按事件/消息 `id`；必须过滤 inherited（seeded/fork）前缀（`ownEvents()` / `firstLiveSeq` / `isOwnSeq()`）；`agent/inbox/spliced.inserted` 与 `user/message` 同 id 双写只保留一份（优先 `user/message`）。
- ✅ **A8（D2/D3）投递身份**：以「用户消息」身份写入各目标会话（`source.kind='user'`），**不是** `agent-message`，也不写 Team mailbox。
- 🔶 **A9 协议前缀语言**：D2 的两行协议文本**固定中文**、不随 UI locale 变化（保证跨版本/跨语言可稳定解析）；群聊 UI 渲染为本地化文案。
- ✅ **A10（架构审查 D-ARCH-07）数据范围上限**：纳入 **lead 会话的全部后代**（teammate + subagent，`delegationDepth` 递减枚举），**深度 ≤3、会话数上限 32**；超限时截断并显示「已达数据范围上限」提示（不静默丢数据）；subagent 一律显示父成员归属。
- ✅ **A11（task-20 取证）成员加入消息字段来源**：字段优先级 = 创建方 `tool/call.arguments`（description/prompt/context）+ `tool/result.member` 快照（含 model）> 子会话 `subagent/descriptor`（agentModel/mode/provider）> lead 会话 `team/member`（入群时刻/id/description，**无 model**）> `subagent/catalog` > 会话 header。`provider`（spawn/fork）是内部配置名，**不直接展示给用户**；上下文策略由 `context`（teammate）/ 工具名（subagent）/ `isSeeded` 推导。creator 判定：`spawn_teammate` 恒为 Lead，`subagent`/`subagent_fork` 为调用方成员。详见 F20。
- ✅ **A12（task-42 取证）任务卡字段来源与操作者**：
  - 数据：`team/task` 是**整条任务快照**（`{version, teamId, task}`，task 含 `id/revision/subject/description/status/blockedBy/writeScopes/[ownerId]`），**没有 actor/action/time 字段**；每次成功变更 revision+1 并追加一条；
  - 动作：优先 `tool/call.arguments.action`（`team_task_create` 固定 `create`），diff 兜底（先判 status 跃迁 delete/reopen/complete，再判 owner 变化，最后 edit；claim vs reassign 用 `ownerId===actor`）；
  - 操作者：`team/task` 只写 **Lead 会话**，操作者的 `tool/call` 落在其自己会话；用 `(taskId, revision)` 配对（实测 744 对 0 误差），配对失败回退「系统操作者」，**禁止伪造成员**；
  - 状态：只有 `pending|in_progress|completed|deleted`（`failed` 仅存在于团队成员相位，不属于任务）；任务卡**只使用这四个真实枚举**，动作只映射真实 action，不引入失败/返工概念；
  - 去重：`${teamId}:${taskId}:${revision}`；fork/seeded 复制的事件须 `ownEvents()` 过滤。详见 F21。

### 1.6 用户反馈 → F/SC 映射（v0.8 18 条 + v0.8.1 5 条线上问题）

| # | 反馈（用户原话要点） | 落点 |
| --- | --- | --- |
| 1 | 消息正文要支持 Markdown（粗体/列表/行内代码/代码块/链接） | F22、SC39 |
| 2 | 任务卡去掉「复制任务 ID」 | F23、F21、SC43 |
| 3 | 只保留群聊自己的输入框（隐藏宿主原生 composer） | F24、SC40 |
| 4 | 任务卡重新设计，与普通回复明显区分；头像不能缺失 | F23、SC43 |
| 5 | 成员选择弹层必须不透明，不得透出/叠字 | F25、SC41 |
| 6 | 点头像打开该 agent 的轮次轨迹侧栏 | F26、SC42 |
| 7 | @ 补全仅在输入 @ 时弹出；提示文案只留「键入 @ 可同时发送给多人」 | F25、SC41 |
| 8 | 消息操作改图标（复制原文/打开所属会话） | F28、SC45 |
| 9 | 「欢迎 @xxx 加入群聊」改居中系统提示 | F20、M4、SC48 |
| 10 | 频道头展示成员头像 + 工作中/等待状态 | F26、SC42 |
| 11 | 去掉「x 个工具调用 · 见轨迹」文案 | F28、SC45（M6 作废） |
| 12 | 从 teammate/subagent session 打开群聊 = lead 频道全量 | F27、SC44 |
| 13 | 折叠改为默认前 50 行，超过才折叠 | F29、SC46（F5 参数更新） |
| 14 | 选择成员弹层小字显示角色描述（不是状态） | F25、SC41 |
| 15 | Enter 发送、Shift+Enter 换行，内容不得回填/重复输出 | F24、SC40 |
| 16 | 修复偶发重复发送/重复气泡（echo 与权威消息去重） | F30、SC47 |
| 17 | @ chip 移到输入框下方（彩色底 + 白字） | F25、SC41 |
| 18 | 任务卡发送者头像必须渲染 | F23、SC43 |
| 19 | 线上：agent 空输出渲染了空气泡 | F31、SC49 |
| 20 | 线上：Markdown 表格不渲染 | F32、SC50 |
| 21 | 线上：成员条只显示头像/名字不全，两端黑色遮罩难看 | F33、SC51 |
| 22 | 线上：任务卡信息太满，应默认折叠 | F34、SC52 |
| 23 | 线上：任务卡出现两个操作者头像/人物不一致 | F35、SC53 |

> 编号规则：F22–F30 / SC39–SC48 为 v0.8 新增，F31–F35 / SC49–SC53 为 v0.8.1 新增，**只增不改**；旧 F/SC 仅同步展示描述，不重编号。

---

## 2. 角色与身份

### 2.1 角色表

| 角色 | 定义 | 群聊中的身份 | 数据来源（调研已确认） |
| --- | --- | --- | --- |
| 用户（我） | 当前操作者 | 「我」；群聊内消息为 M1 | `user/message`（`source.kind='user'` 且 `rpcId` 存在） |
| lead（主 agent） | 团队调度者 | 显示名 `Lead`（无角色徽标）；默认对话对象 | lead 会话（teamId = lead sessionId） |
| teammate | `spawn_teammate` 创建的具名成员 | 名称 = `team/member.member.name`（kebab-case） | 各自 teammate 会话 + lead 会话 `team/member` |
| subagent | `subagent` / `subagent_fork` 创建的子会话 | 显示名 `<descriptor.label>` + 后缀「· <父成员名> 的子体」（11px 灰字），如「产品设计 · ux 的子体」 | 子会话 `subagent/descriptor.label`；父会话 `subagent/catalog` |
| 系统 | 平台生命周期事件 | ① 一般事件：居中 11.5px tertiary 纯文本（无药丸）；② 成员加入欢迎提示：**居中** 11.5px tertiary 纯文本（无背景/无药丸） | `turn/end`、`team/member`、`subagent/catalog`、发送失败等 |

✅（D-A，v0.6.2）@ 可寻址：Lead 恒可寻址；teammate 恒可寻址（inactive 也可通过 prompt 冷唤醒）；subagent 仅在 `running`/`provisioning` 时出现在补全，`one-shot` 已完成的不再可寻址（详见 F6）。

### 2.2 显示名与头像/身份口径

| 项 | 口径 |
| --- | --- |
| 显示名唯一性 | teammate 名由 Host 保证唯一（`MEMBER_NAME=/^[a-z0-9]+(?:-[a-z0-9]+)*$/`）；lead 为保留名 `lead`；客户端仍做 name 去重兜底 |
| 头像 | 32×32 圆角 8 方形色块，首字母 12/500；Lead 用 `state-business-primary` 实底、其余 `state-business-tertiary`；同一 agent 跨会话同色；不拉外部图片 |
| 身份表示 | **头像 + 名字（14/500）+ 行内状态（11/400）**：6px 点 + 文案「运行中 / 已完成 / 失败」（来自 `TeamMemberView.status`：running/inactive/provisioning/failed）。**v0.4 起不再使用角色徽标**（Lead/Teammate/Subagent）与「最终输出 · 回复群聊」徽标 |
| subagent 命名 | 名字 `<descriptor.label>` + 后缀「· <父成员名> 的子体」（11px `label-caption` 灰字，紧跟名字，无缩进/连接线）；label 缺失时用 `子任务 <childId 前 8 位>` |
| 我（用户） | 固定「我」，不显示 email 等隐私信息 |
| 时间显示 | **不再每行显示时间**；只在居中时间分隔（日期变化或间隔 ≥5 分钟，如「今天 · 11:02」12/400 `label-caption`）出现（F2） |

### 2.3 从属关系可视化

- subagent 从属**只用名字后缀**表达：`<label> · <父名> 的子体`（11px 灰字，紧跟名字）；**v0.4 删除缩进与连接线**，与普通消息同构（钉钉式气泡流）。
- 父成员消息 hover 菜单可查看「本成员创建的子会话」列表（🔵 v1 是否必需见 §13）。
- 成员离开/结束时历史消息保留原名字与名字后缀，不因移出团队而丢失（§7.6）。

---

## 3. 视图位置与信息架构

### 3.1 tab 身份（D7，已定）

- **id = `group-chat`**（新 id，不覆盖现有 `chat/trajectory/context/terminal-panel/fleet/capability`）。
- **order = 5**（chat 0 之后、trajectory 10 之前 → 紧邻「对话」）。
- **label = 「群聊」**（i18n key `tab.groupChat`；zh「群聊」/ en「Group chat」）。
- 注册方式（实现层）：`conversation.view` list slot，`{name:'conversation.view', id:'group-chat', order:5, locale, label:()=>t('tab.groupChat')}`（api-feasibility §A1–A4）。
- **无团队仍显示**，进入后为空状态（D7 + D10，见 F13）。
- **tab 标签恒为「群聊」**：v1 不做 tab 未读圆点/计数（`conversation.view` 注册只有 `{id, order, label}`，无装饰位）；未读反馈见 F18（消息区浮标 + 频道头提示），架构 D-ARCH-02 对齐。

### 3.2 布局

页面结构（自上而下）：视图 tab 条 → 频道头 → 消息流 → 底部输入区。

- **频道头**：群头像 32×32（2×2 拼贴）+ 标题「群聊」+ 竖线 + 团队名 + **成员条（每个成员 24px 头像 + 完整名字 + 「工作中（绿点）/ 等待（灰点）」状态，实时更新；全部成员显示、禁止 `+N`；超宽横向滚动或换行，**不得使用两端渐变/黑色遮罩**；点击头像打开该 agent 轮次轨迹侧栏，见 F26/F33）** + 右侧筛选图标按钮。**无团队时不渲染成员区/筛选**（D10）。
- **消息流**：居中时间分隔、居中系统提示（含欢迎提示，v0.8 居中）、creator 带卡消息（M8）、任务卡消息（M9，独立卡片形态）、头像+名字行+气泡；按 §7.2 排序。
- **输入区（单一输入器，F24）**：**群聊视图激活时隐藏宿主原生 composer**，仅保留插件 composer：发送目标区（默认「@Lead」+ 已选 @ chips，位于输入框下方，彩色底+白字）→ 文本输入 → 发送按钮；Enter 发送、Shift+Enter 换行。
- 🔶 假设：不做左侧常驻成员侧栏（轨迹侧栏为右侧抽屉，F26）。

### 3.3 视图切换

- 切换为局部视图切换，不刷新页面；群聊保留滚动位置、筛选态、输入草稿（至少当前会话生命周期内）。
- 从群聊点消息「打开所属会话」通过 `openView(view, focus)` 跳转（api-feasibility §A3）。
- 首次进入：加载态 → 有数据定位最新；无数据空态（F12/F13）。

---

## 4. 消息模型（WHAT 层）

### 4.1 消息类型（M1–M7）

| ID | 类型 | 触发来源（调研确认） | 满足 |
| --- | --- | --- | --- |
| M1 | 用户消息 | `user/message`（`source.kind='user'` + `rpcId`）或群聊输入框发送 | R4、R5 |
| M2 | agent→agent 消息 | 接收方会话 `agent/inbox/spliced`（`source.kind='agent-message'`，旧构建 `team-message`），正文前缀 `Team message from X:` | R3、R5 |
| M3 | agent 最终输出 | 该 agent 会话每个 `turn` 内最后一个非空 `assistant/message` 的 text 块；**文本全空白且无卡片/附件时不渲染气泡（F31）** | R5 |
| M4 | 系统提示 | ① 一般事件（团队/成员/子会话生命周期、turn 失败、发送失败）：居中 tertiary 纯文本；② 欢迎提示（成员加入）：**居中** tertiary 纯文本「欢迎 @<name> 加入群聊」（v0.8 由右对齐改为居中） | R6 |
| M5 | 交付说明 | 产物/文件类事件（`deliverables/presented` 或本轮文本中的文件引用，🔶 解析可靠性待实现确认） | R6、R5 |
| M6 | ~~工具/过程摘要~~ | **v0.8 作废**：不再渲染「N 个工具调用」摘要行（用户反馈 11） | — |
| M7 | 筛选/只读提示条 | 视图级提示（「正在只看 scout」「历史只读」「N 条新消息」），不进入消息流合并 | R6 |
| M8 | 成员加入消息（creator 带卡） | 创建成员（`spawn_teammate` / `subagent` / `subagent_fork`）时，由 **creator 发出的一条消息**（sender = 创建者），消息正文即成员卡；此前插入一条欢迎提示（M4②） | R2、R6 |
| M9 | 任务卡片消息（操作者带卡） | `team_task_create` / `team_task_update` 每次成功 revision：由**操作者**发出的带卡消息（sender=操作者），正文=任务卡；**卡内不再重复操作者头像**；默认折叠（F34/F35） | R6 |

> R5 三类 = M1 / M2 / M3；M4–M9 为 R6 惯例补齐（M8 另满足 R2）。M6 = 工具/过程摘要（UX「M6 工具/过程」），M7 = 视图级提示条，M8 = 成员加入消息（对应 UX v3.1 的「M8 成员加入消息」；UX 迭代中曾编号 M7，PRD 稳定为 M8）。**M8 的 sender 是 creator，不是系统**：`spawn_teammate` 恒为 Lead；`subagent`/`subagent_fork` 为调用方成员。M9 = 任务卡片消息，**sender 是操作者**（谁操作谁发话，创建/认领/完成/重新打开可能不同人）；**v0.8 任务卡改为与气泡明显区分的独立卡片（F23）**。M6 自 v0.8 作废，不再渲染工具过程摘要。

### 4.2 消息字段（展示契约）

`messageId`（去重键）、`kind`(M1–M7)、`sender`（`senderKind`/`senderId`/`senderName`）、`targets[]`（目标显示名，如 `lead`/`ux`）、`targetIds[]`（目标会话 id）、`text`（**已剥协议前缀**）、`rawText`（原始文本，含前缀，供追溯）、`createdAt`/`time`、`seq`、`sessionId`、`turn?`、`delivery`（`sending`/`sent`/`partial`/`failed`，D4 + v0.3）、`attachments[]`、`sessionRef`、`collapsed`（UI 态）、`protocol?`（协议前缀解析结果：收件人列表 + N）、`clientBatchId?`（同发批次本地 id，非权威 messageId）。

> 归一化 schema 以 `docs/research/event-model.md` §6 为基线；差异以本 PRD 的 D1–D10 优先。

**视觉口径（UX v2「钉钉式气泡流」，✅ v0.4 已定；细节见 F3）**

统一消息行：

| 元素 | 规格 |
| --- | --- |
| 头像 | 32×32 圆角 8 方形色块，首字母 12/500；Lead `state-business-primary` 实底、其余 `state-business-tertiary`；同一 agent 跨会话同色 |
| 名字行 | 名字 14/500 `label-secondary` + 行内状态 11/400 `label-caption`（6px 点：运行中 `state-success-primary` / 已完成 `label-dimmed` / 失败 `state-error-primary`）；**无角色徽标** |
| 气泡 | 自适应宽度 max-width 600（窄屏 70%），圆角 12，padding 10×14，正文 14/22 `label-primary`；他人 `bg-layer-2`、自己 `bg-layer-3` |
| 行距 | 消息之间 16；同一发送者连续消息 8 |
| 时间 | 只在居中分隔显示：「今天 · 11:02」12/400 `label-caption`，插入条件=日期变化或间隔 ≥5 分钟；**无每行右侧时间戳** |

消息类型视觉：

| ID | 视觉 |
| --- | --- |
| M1 | 右对齐气泡；气泡下 11/400 `label-secondary` 单行「已同时发送给 Lead、@X、@Y」（**无绿勾、无底色、无药丸**） |
| M2 | 与普通 agent 气泡同构；`@目标` **内联正文首行**（`state-business-primary` 蓝）；**无「→ 发送给 @x」独立 chip 行** |
| M3 | 就是普通 agent 气泡；**无「最终输出 · 回复群聊」徽标**；**无有效文本不发泡（F31，空输出抑制）** |
| M4 | ① 一般事件：居中 11.5/400 `label-tertiary` 纯文本，**无背景药丸**；② 欢迎提示（v0.8）：**居中** 11.5/400 `label-tertiary` 纯文本，**无背景/无药丸**（`欢迎 @scout 加入群聊`） |
| M5 | 气泡内文件行（文件名 + 路径 + 「打开」），不展示文件内容 |
| M6 | **v0.8 作废**（不渲染工具过程摘要行；见 F28） |
| M7 | 视图级提示（筛选/只读/未读）——置顶细提示条，不参与消息合并 |
| M8 | **creator 发出的一条消息**（非系统卡）：① creator 消息头（头像 32 圆角 8 + 名字 14/600 + 角色小标签 11 `主 Agent`/`Teammate` + 时间 11 同行贴右；不做气泡）；② 卡片正文（宽 max 520、`bg-layer-1`、`border-l2`、radius 12、padding 16）：标题 13/500「@<name>」加入群聊、描述 12/19、label+value 信息行（label 11 caption / value 12 secondary，行高 22）、初始任务 11/17 tertiary 2 行截断 +「展开」文字链、动作为文字链；卡内不重复头像/名字；不参与长文折叠、不用弹窗/大图/动效。角色小标签为 11px caption 文本（无底色/无边框），不等同于 v0.4 删除的角色徽标 |
| M9 | **操作者发出的一条消息 + 独立任务卡片（F23/F34/F35，与普通气泡明显区分）**：① 消息头=操作者（头像 32 **必须渲染** + 名字 + 角色小标签 + 时间）；**卡内不再出现第二个操作者头像/名字**；② 卡片默认折叠：仅显示 目标（subject）、任务 ID、状态 pill、负责人（字段行：头像 20 + 名字，可与操作者不同）、依赖、完成时间；描述/硬性要求/验收标准默认隐藏，提供「展开全部/收起」；③ 展开后显示描述等全文；展开状态可临时记忆（会话内）；**无「复制任务 ID」动作**；状态 pill 严格四枚举；卡片不参与长文折叠、不用弹窗/大图/动效 |

### 4.3 事件 → 消息映射（按调研定稿，✅ 实现基线）

**数据源**：lead 会话 + 全部 teammate 子会话 + subagent 子会话（`subagents.listDescendants(rootSessionId)` 或客户端名册）；**范围上限：深度 ≤3、会话数 ≤32（A10）**，超限截断并提示。每个会话的读取路径：

- 客户端：`sessions.retain(sessionId, {source})` → `binding.eventSource`（`SessionEventWindow{entries, hasMore, revision}`）；名册投影 `projectionsBySession[lead].values.agentTeam`（api-feasibility §B1/B2）。
- Host 侧（冷会话/大日志兜底）：`sessionQuery.observeSession/readSession`；架构阶段决定是否加旁路路由（task-6）。

| 群聊消息 | 事件 | 条件（关键） | 产出与规则 |
| --- | --- | --- | --- |
| M1 用户消息 | `user/message` | `source.kind='user'` 且 `source.rpcId` 存在 | `senderKind=user`；无 `rpcId` 的 `user/message` 是父 agent 下发的任务 prompt，**不算用户发言** |
| M1 用户消息（群聊新发） | 目标会话 `user/message` | 群聊发送（§6）成功后各目标会话各一条 | 群聊 UI 一条气泡 + 收件人说明；按 `messageId`/弱键归并展示 |
| M2 agent→agent | `agent/inbox/spliced`（inserted 非空） | `source.kind='agent-message'`（当前构建）或 `'team-message'`（旧构建） | 发送者：`senderSessionId` 查名册 → 缺失时正则 `^Team message(?: <id>)? from ([^:]{1,64}):$` 取名字；正文剥前缀；`targets` = 本消息所在会话的成员名 |
| M2 发送侧（A→@B 的权威侧） | `tool/call` name=`send_message` | `arguments.target` + `arguments.message` | 发送侧生成 M2（带 target），接收侧同文本需按 §7.2 弱键去重 |
| M3 agent 最终输出 | `assistant/message` | 该 turn 最后一个非空 message 的 `text` 块 | `kind=agent-final`；`turn/end.reason.kind` 非 `completed` 时附带失败/中断/超 token 状态并追加 M4 系统提示；`forked` 丢弃 |
| M4 系统提示（生命周期） | `team/member`、`subagent/catalog`、`subagent/descriptor`、`turn/end(reason)`、发送失败 | — | 成员加入/离开、subagent 启动/完成、轮次失败、群发部分失败；其中成员加入的欢迎提示（M4②，v0.8 居中）由 `team/member phase=active` / `subagent/catalog` 触发 |
| M5 交付说明 | `deliverables/presented` 或文本内产物引用 | 🔶 解析可靠性待实现确认 | 文件卡片（路径 + 打开） |
| M6 工具/过程摘要（v0.8 作废） | — | — | **不产出/不渲染**（用户反馈 11；工具过程只用侧栏轨迹承载，见 F26） |
| M8 成员加入消息（creator 带卡） | 创建方 `tool/call`（name=`spawn_teammate`/`subagent`/`subagent_fork`）+ `tool/result.member`；teammate 用 `team/member`(phase=active)、subagent 用 `subagent/catalog`；子会话 `subagent/descriptor` | sender 解析：`tool/call` 所在会话的 agent（`sessionId==teamId` → Lead；否则 roster/descriptor 名）；关联键 `tool/call.callId ↔ tool/result.message.toolCallId`、`member.name ↔ team/member.member.name`、`member.id == catalog.childId == 子会话 id`；fork/seeded 用 `ownEvents()` 过滤 | 欢迎提示（M4②）+ creator 消息（消息头 sender=creator，正文=1 张卡）；字段优先级见 A11/F20；空值回退；不参与长文折叠 |
| M9 任务卡片消息（操作者带卡，v0.8 重设计 F23，v0.8.1 折叠/人物一致 F34/F35） | `team/task` journal（Lead 会话，每次成功 revision 一条整快照）+ 操作者会话的 `tool/call`（`team_task_create`/`team_task_update`）与同 `callId` 的 `tool/result`（TASK_VIEW_SCHEMA 含 id/revision/ownerName/ready） | 配对键 `(taskId, revision)`（journal 写于 result 之前，不能用时间先后判断）；动作=arguments.action（create=工具名）→ diff 兜底；actor=tool/call 所在会话 memberOf() → 配对失败回退「系统操作者」；fork/seeded 用 `ownEvents()` 过滤 | 1 张卡；独立卡片（状态色竖条/任务图标/状态 pill）；**外发送者=actor（头像+名字），卡内不重复 actor 头像**；**默认折叠仅目标/任务 ID/状态/负责人/依赖/完成时间，描述可展开**；负责人字段行可与 actor 不同；头像必须渲染；去重 `${teamId}:${taskId}:${revision}`；不得伪造 failed |
| 不产出消息 | `agent/inbox/spliced` 的 `removedCount>0 && inserted=[]`（消费/取消）、`session/end-seed`、`turn/end(reason=forked)` | — | 丢弃，不得渲染 |
| 兜底 | 旧构建 `team/message/queued`（存在则用） | — | 补齐 senderName/targetId/messageId；不存在不报错 |

**排序**：`(time, sessionIdRank, seq)`，`sessionIdRank` = lead 0 / teammate 1 / subagent 2，再按 sessionId 字典序（A4）。

**去重**（必须全做，event-model §7.2）：
1. 双写：`spliced.inserted[].id` 与同会话 `user/message.id` 相同 → 保留 `user/message` 那份，合并投递元数据。
2. fork/seed：`isSeeded:true` 的子会话复制父会话前缀（同 id/seq/time）→ 先按 id 全局去重，并用 `ownEvents()`/`firstLiveSeq` 过滤继承前缀。
3. 通知副本：同一内容在发送侧 `tool/call.arguments`、接收侧 spliced、父会话 `subagent-settled`、旧构建 `team/message/queued` 多处出现 → 同 messageId 只保留一条；无 messageId 时用 `(senderSessionId, targetId, sha256(text), time±5s)` 弱键配对，**保留接收侧投递那条**（带真实接收方与投递时间）。
4. 群发「同一份发给 N 人」是 **N 条独立投递**，不得按文本合并成 1 条投递（群聊 UI 仍以 1 条用户气泡呈现，见 §6）。

---

## 5. 功能清单（F1–F35）

| ID | 功能 | 追溯 | 验收场景 |
| --- | --- | --- | --- |
| F1 | 群聊 tab 入口（id/order/label 已定） | R1、R6、D7 | SC1、SC2 |
| F2 | 聊天室布局与时间线合并 | R1、R6、D8 | SC2、SC3、SC13 |
| F3 | 消息类型渲染（M1–M7） | R3、R5、R6 | SC3、SC4、SC19 |
| F4 | agent→agent 的 `@xxx` 表达 | R3、R5 | SC4 |
| F5 | 长文本自动收起（v0.8：默认前 50 行；参数见 F29） | R3、D6 | SC5、SC6、SC46 |
| F6 | `@` 提及输入与自动补全（可寻址集合见 D-A；v0.8 交互见 F25） | R4、D5、D-A | SC7、SC31、SC41 |
| F7 | 无 @ 默认发送给 lead（触发新一轮） | R4、D1 | SC8、SC28 |
| F8 | 多目标同时发送 + 收件人说明 | R4、D1–D3 | SC9、SC10 |
| F9 | 发送中/已发送/失败重试（含部分失败） | R4、R6、D4 | SC11、SC23、SC30 |
| F10 | 历史加载与实时增量更新（事件窗口） | R5、R6、D8 | SC12、SC13 |
| F11 | 只看某成员筛选（sender/targets 命中 + 子体归属） | R6、D-B | SC14 |
| F12 | 空状态 / 加载态 / 错误态 | R6 | SC24 |
| F13 | 无团队（单 agent 会话）形态（允许发送） | R2、R6、D7、D10、D-C | SC15 |
| F14 | teammate 与 subagent 生命周期表现（含从属显示） | R2、R5、D5 | SC16、SC17、SC31 |
| F15 | 会话切换与视图状态保持 | R6 | SC18 |
| F16 | 消息操作最小集（v0.8：图标化，见 F28） | R6 | SC19、SC45 |
| F17 | 只读历史与归档态 | R6 | SC20 |
| F18 | 新消息提示与回到最新 | R6 | SC21 |
| F19 | 「同发」协议前缀的注入与渲染剥除 | R4、D2、D3 | SC27 |
| F20 | 成员加入消息（欢迎提示 + creator 带卡消息） | R2、R6、D5、A11、D-D | SC32、SC33、SC34 |
| F21 | 任务卡片消息（操作者=发送者，动作/状态严格映射 DSH 真实枚举；v0.8 重设计见 F23） | R6、A12 | SC35、SC36、SC37、SC38、SC43 |
| F22 | Markdown 渲染（粗体/列表/行内代码/代码块/链接，安全降级） | R6 | SC39 |
| F23 | 任务卡重设计（独立卡片/状态色/任务图标/负责人头像/去复制任务 ID/头像必渲染） | R6、A12、F21 | SC43 |
| F24 | 单一输入器（隐藏宿主 composer，仅插件 composer，Enter 发送） | R6、R4 | SC40 |
| F25 | @ 交互修订（仅 @ 触发/chip 在输入框下方彩色白字/描述小字/弹层不透明） | R4、D5、F6 | SC41 |
| F26 | 成员状态条 + agent 轮次轨迹侧栏 | R6、R2 | SC42 |
| F27 | 群聊作用域修正（member session 打开 = Lead 频道全量） | R6、A5 | SC44 |
| F28 | 降噪与图标操作（去工具摘要、复制/打开图标化） | R6 | SC45 |
| F29 | 折叠阈值修订（默认前 50 行，超过才折叠） | R3、F5 | SC46 |
| F30 | 防重复气泡（echo 与权威消息去重，一次发送 1 条） | R6、F9 | SC47 |
| F31 | 空输出抑制（无有效文本不渲染空气泡） | R5、R6 | SC49 |
| F32 | Markdown 表格（GFM 表头/对齐/单元格，禁 HTML） | R6、F22 | SC50 |
| F33 | 成员条全名与去遮罩（全显禁 +N，无两端遮罩） | R6、R2、F26 | SC51 |
| F34 | 任务卡默认折叠（目标/ID/状态/负责人/依赖/完成时间，描述可展开） | R6、A12、F21/F23 | SC52 |
| F35 | 任务卡人物一致（外发送者=actor，卡内不重复 actor 头像，负责人字段行） | R6、A12、F21/F23 | SC53 |

### F1 群聊 tab 入口（R1、D7）

- id=`group-chat`、order=5、label「群聊」，紧邻「对话」；不覆盖现有 id（✅ D7）。
- 点击切换聊天室视图；可键盘聚焦切换（`role=tab` + 方向键）。
- **无团队仍显示**；进入后为空状态（F13）。
- 🔶 tab 是否默认出现在 tab 行而非「More」菜单，取决于现有 pin 机制（§17 U5）；若默认落 More，产品要求默认 pinned（否则不满足 R1）。
- **v1 不做 tab 未读圆点**（无装饰位）：未读反馈放在消息区底部「↓ N 条新消息」浮标 + 频道头「N 条新消息」提示，tab 标签恒为「群聊」（F18；架构 D-ARCH-02）。

### F2 聊天室布局与时间线（R1、R6、D8）

- 结构：频道头 + 消息流 + 输入区（§3.2）；**无团队时不显示成员区**（D10）。
- 合并：lead + teammate + subagent 会话按 `(time, sessionIdRank, seq)` 升序；时间只以**居中间隔**表达（日期变化或间隔 ≥5 分钟），不再逐行显示时间戳。
- 行距：消息间 16；同一发送者连续消息 8（仅视觉紧凑，不合并数据）。
- 滚动：默认贴底；上滚不强制回底（F18）；到顶加载更早（F10）。
- 渲染 Markdown（标题/列表/表格/代码块/引用/链接），代码块横向滚动；不执行不可信 HTML。

### F3 消息类型渲染（M1–M7）（R3、R5、R6）

> 视觉规格见 §4.2；本条只定义每类消息的渲染规则。

| 类型 | 规则 |
| --- | --- |
| M1 用户消息 | 右对齐气泡；多目标时气泡下方 **11/400 `label-secondary` 单行**「已同时发送给 Lead、@X、@Y」（无绿勾/无底色/无药丸；D2，F19） |
| M2 agent→agent | 与普通 agent 气泡同构（头像 + 名字行 + 气泡，**无角色徽标**）；`@目标` **内联正文首行**（`state-business-primary` 蓝），多接收者 `@a @b` 依次排列；**无「→ 发送给 @x」独立 chip 行**；原文协议前缀已剥除（D9） |
| M3 agent 最终输出 | 就是普通 agent 气泡，**不加「最终输出 · 回复群聊」徽标**；hover 可「打开所属会话」；非 completed 轮次在名字行状态位显示而非额外徽标；**无有效文本（空白）不渲染气泡（F31）** |
| M4 系统提示 | 居中 11.5/400 `label-tertiary` 纯文本，**无背景药丸**；欢迎提示（「欢迎 @scout 加入群聊」）v0.8 也居中；如「团队已组建 · 8 名成员」「scout 创建了 subagent：数据校验」「向 backend 发送失败」 |
| M5 交付说明 | 气泡内文件行：文件名 + 路径 + 「打开」；不展示文件内容；🔵 打开方式（预览/新窗口/系统打开）为未决项（§13 O4） |
| M6 工具/过程摘要 | **v0.8 作废**：不渲染任何工具过程摘要行（F28） |
| M7 视图级提示 | 置顶细提示条（筛选「正在只看 scout」/只读「历史只读」/未读提示），不参与消息合并 |

- 系统提示不参与「同发送者合并」；多类型并存不互相吞并。

### F4 agent→agent 的 `@xxx` 表达（R3、R5）

- 发送者由**名字行**（头像 + 名字 14/500 + 行内状态 11/400，无角色徽标）承载；接收者**内联在正文首行**的 `@` 提及（`state-business-primary` 蓝），多接收者 `@a @b` 依次排列；**不设「→ 发送给 @x」独立 chip 行**。
- 解析优先级：结构化 `send_message` 的 `target`（发送侧）→ 接收侧 `source.senderSessionId` 反查名册 → 文本前缀正则（兜底）。**正文中的普通 `@` 字面量不升级为提及**（如代码 `@decorator`）。
- 前缀剥除：`^Team message(?: <id>)? from .+?:$` 与 D2 两行协议只进 `rawText`，不渲染进气泡正文（D9）。
- 旧构建 `team-message`：用 `source.messageId/senderName` 结构化字段，优先于文本解析。

### F5 长文本自动收起（R3、D6、F29 已定）

- ✅ 阈值（v0.8 由 F29 修订）：正文**超过 50 行**才折叠（**默认展示前 50 行**）；原 8 行/400 字符规则作废；系统提示、欢迎提示、同发说明行永不折叠。
- 折叠态展示前 50 行 + 渐变遮罩 + **12px 文本链接**「展开全部（共 N 行）」（`state-business-primary`，非按钮胶囊）；展开后变「收起 ⌃」；展开/收起保持被展开消息顶部位置稳定（±4px），不改变其它消息折叠状态。
- 空输出（无有效文本）不产生可折叠气泡（F31）；卡片消息的折叠自成一套（M8/M9，见 F34）。
- 代码块、表格、文件卡片折叠时整体截断；展开后完整渲染，代码块不折叠内部行。
- 键盘可操作（Tab + Enter/Space），`aria-expanded` 正确反映状态。

### F6 `@` 提及输入与自动补全（R4、D5、D-A 已定）

- ✅（D-A）可寻址集合：**Lead 恒可寻址**；**teammate 恒可寻址**（inactive 也可，通过 prompt 冷唤醒）；**subagent 仅 `running`/`provisioning`** 出现在 @ 补全，`one-shot` 已完成的不再可寻址；`@all` v1 **不支持**。
- ✅（F25）**仅当键入 `@` 时**弹出补全（聚焦/点击/普通输入不弹；选中后不自动重开，需再次键入 `@`）；条目=头像 + 显示名 + **角色描述小字**（如「负责接口取证与技术可行性」，不是状态）；支持过滤、上下键、Enter/Tab 确认、Esc 关闭。
- ✅（F25）弹层**背景不透明**（menu 主题 token），不得透出底层消息/出现叠字。
- ✅（F25）选中生成 chip（整体删除），chip 显示在**输入框下方**的发送目标区：彩色底（business-primary/tertiary）+ **白色文字**（如 `@ux`）；默认目标显示 `@Lead`。
- subagent 在列表与 chip 中显示 `<label>` + 后缀「<父名> 的子体」（D5）。
- 补全列表按上述集合过滤：成员从 running 变为已完成（one-shot subagent）后从列表移除；inactive teammate 仍在列表并可被选中；输入框中残留的失效提及在发送前提示并剔除（🔶 具体提示形态实现定）。
- 成员显示名一致（F33）：成员条显示**完整名字**，@ 补全/弹层/chip 使用同一名字（不截断、不缩写、不加 `…`）。
- 不阻塞中文输入法组合输入；无匹配显示「无匹配成员」并允许继续打字。

### F7 无 @ 默认发送给 lead（R4、D1 已定）

- 未选择提及时目标 = `lead`；输入框下方发送目标区显示默认 chip「@Lead」（v0.8，F25）；提示文案只保留「键入 @ 可同时发送给多人」（不再显示「未 @ 时默认发送给 Lead」，F25）。
- ✅ 发送语义（D1）：等价于在 lead 会话发送一条**用户消息**并**立即触发一轮新回复**；若 lead 正在运行，则以 `steer` 投递到其最近 step 边界排队，**不打断**当前 step。
- ✅ 单目标（N=1，仅 lead）**不注入**同发协议前缀（D2 前缀仅用于 targets>1），消息按普通用户消息进入 lead 会话。
- 消息显示：用户气泡 + 「发送给：Lead」；chip 与发送目标提示均在输入框下方（F25）。

### F8 多目标同时发送 + 收件人说明（R4、D1–D3 已定）

- ✅ 目标集合 = `{lead} ∪ 被 @ 成员`（R4：@ 任意成员时 lead 始终在接收方内）；N = 去重后目标数。
- ✅ 投递方式（D2/D3）：**同一份正文逐目标各发一条**（N 次独立 `prompt`），每个目标收到同构文本；群聊 UI 只显示 **1 条**用户气泡。
- ✅ 协议前缀（D2 + 架构 D-ARCH-01b，**targets>1 时注入**，固定中文 canonical 字符串，bytes 稳定不随 locale 变化）：
  ```
  [群聊 · 同发] 收件人：@lead、@ux、@backend
  （本消息由用户经「群聊」同时发送给上述 N 位成员，各成员各自收到一份。）

  <用户正文>
  ```
- ✅ 群聊 UI 说明行（D2）：「已同时发送给 Lead、@X、@Y」；该说明行由 UI 生成（不重复渲染协议前缀）。
- ✅ 同发批次用本地 `clientBatchId` 关联，N 个目标各自独立 `requestId`；当前构建**跨目标不存在同一 messageId**，验收以 clientBatchId + N 条投递为准（SC9/SC10，架构 D-ARCH-03）。
- ✅ 各目标收到的文本相同；「同时发给谁」只用文本前缀表达（`PromptContentPart` 无元数据位，api-feasibility §C4）。
- 对方的呈现（D2）：在该成员会话中为**普通用户消息**（`source.kind='user'`），不是 peer mailbox 消息；接收方可读到前缀说明。
- 群聊内只渲染 1 条气泡；投递记录（N 条）不进消息流（仅用于状态与重试，F9/F19）。

### F9 发送中/已发送/失败重试（R4、R6、D4 已定）

- ✅ 状态集合为四态：`发送中` / `已发送` / `部分失败` / `失败（可重试）`；**不做**已读、处理中/送达确认（D4 + v0.3 架构审查）。
- ✅ 「已发送」= 各目标 `prompt` 调用返回成功（目标会话接受），不代表模型已消费。
- 乐观插入：点击发送即渲染气泡（`sending`）；全部目标成功 → `sent`；任一失败 → `failed` 并列出失败目标与原因。
- ✅ 部分失败（fan-out 非原子）：气泡显示「已送达 X/Y」+ 失败目标清单；仅对失败目标提供「重试」，成功目标**不重发**；重试期间气泡保持一条（D4 + 调研 R1 + 架构 D-ARCH-04）。
- 失败原因可读：网络、成员已离开/离线（如 `parentAvailable=false`）、只读频道、超长等。
- 连点/重试幂等：同一目标并发提交只产生一次投递；客户端以 requestId（每目标独立）对齐回显（§17 U4 关于重试幂等）。

### F10 历史加载与实时增量更新（R5、R6、D8）

- ✅ 首屏最近 **200 条**（Lead 建议，§7.11）；向上滚动按**会话事件窗口**增量加载（`eventSource.hasMore` / `loadOlder` / `loadThrough(seq)`），每页 50 条。
- 实时：各会话事件窗口增量合并；新消息在合理时间（≤2s）内可见，不打断阅读；贴底自动滚，否则显示浮标（F18）。
- 幂等去重：同 id 只渲染一次；乱序按 `(time, sessionIdRank, seq)` 归位。
- 只读历史不再接收实时更新并顶部提示（F17）。
- 冷会话（未 retain）先 loading，再按窗口补齐；单成员加载失败不影响其它成员（N9）。

### F11 只看某成员筛选（R6、D-B 已定）

- ✅（D-B v1）单成员筛选 = 显示 **`sender` 是该成员 OR `targets` 包含该成员** 的消息；判定基于消息模型的 `sender`/`targets` 字段，不是正文文本搜索。
- ✅ 子体归属：subagent 的消息归入其**父成员**筛选——选父成员时包含其 subagent 的消息；选 subagent 自身时只显示该 subagent 的消息（不反向包含父成员）。
- ✅ 单选；v1 **不做**多选、时间范围、消息类型组合筛选。
- 筛选态顶部显示「正在只看 <成员>（n 条）」+「清除筛选」；清除恢复并回原位置；无匹配显示「该成员暂无消息」。
- 筛选不改变未读计数与实时追加；隐藏消息仍在后台累计。

### F12 空状态 / 加载态 / 错误态（R6）

- 空状态（团队存在但无发言）：「团队还没有发言」+「成员每轮结束后会在这里发言」；输入区可用。
- 加载态：骨架屏；>1s 显示进度；失败显示「加载失败，重试」。
- 错误态：数据源不可用/权限不足/事件流断开 → 可读文案 + 恢复动作；不白屏；不丢已加载历史与草稿。

### F13 无团队（普通单 agent 会话）形态（R2、D7、D10、D-C）

- ✅ tab 仍显示（D7）；进入后为空状态（无团队说明）。
- ✅ 数据范围（D10）：只显示**该会话的用户消息 + 该 agent 的最终输出**；**不显示频道头成员区（头像栈/状态行/筛选图标）**。
- ✅（D-C）输入区可用：无团队会话允许发送，发送即该会话的**普通用户消息**（发给 Lead 单 agent），空态输入区同样可用；不出现多目标能力（除 @lead，等价默认）。
- 若该会话已有消息则正常渲染（不强制空态）；无消息才显示空状态。

### F14 teammate 与 subagent 生命周期表现（R2、R5、D5）

- 成员加入：`team/member` 阶段变化 → 系统提示 + 频道头状态行更新（「N 名成员 · M 个运行中」）；离开/结束：提示 + 状态行更新、历史保留。
- subagent 启动：父会话 `subagent/catalog` → 系统提示「X 创建了 subagent：<label>」；运行中显示在其名字行 11px 状态位（非徽标）；完成时插入其最终输出（优先子会话 M3，丢弃父会话 `subagent-settled` 副本，event-model §3.3）。
- subagent 显示从属：**名字后缀** `<label> · <父名> 的子体`（11px 灰字；无缩进/连接线，D5）。
- 同一 subagent 多轮：逐轮插入；中间过程（工具调用）不进群聊。
- subagent 失败/中断：插入失败系统提示；🔵 是否展示其最后一段输出未决（§13）。

### F15 会话切换与视图状态保持（R6）

- ✅（F27）切会话：群聊始终绑定 **Lead 频道**（沿 `parentSession` 链回溯到根；从 teammate/subagent session 打开也是 Lead 全量）；不同会话滚动位置/筛选/草稿分别保存（🔶 内存级即可，持久化范围未决）。
- 快速切换不串数据：旧会话实时更新不得渲染进新会话（以 sessionId 隔离）。
- 从群聊「打开会话」再返回：保持原位置。

### F16 消息操作最小集（图标：复制原文/打开所属会话）（R6）

- ✅（F28）消息操作为**图标**（不显示长文字）：`复制原文`（copy icon，aria-label「复制原文」）、`打开所属会话`（external-link icon，aria-label「打开所属会话」）；可放在气泡右下角/说明行内，hover 或聚焦时出现；触屏/窄屏常显或长按菜单。
- 复制为纯文本（Markdown 源码，不带 UI 标记）；复制成功轻量反馈（图标态或 toast）。
- 无权限/会话已删除时点击图标给提示而非报错。

### F17 只读历史与归档态（R6）

- 团队结束/任务完成 → 只读：输入区禁用 +「团队已结束，群聊为只读历史」；发送快捷键无效。
- 只读仍支持：历史加载、筛选、复制、跳转、折叠展开；无写操作副作用（重试按钮隐藏/禁用）。
- 🔵 保留期/归档清理策略未决（§13 O5）。

### F18 新消息提示与回到最新（R6）

- 未贴底时新消息 → 浮标「↓ N 条新消息」，点击滚到底并清零；贴底则自动滚。
- **频道头显示「N 条新消息」提示**（与浮标联动，悬浮/筛选态下仍可见）；v1 不使用 tab 圆点/未读数（无装饰位，F1）。
- 自己发送后强制滚到底（🔶 默认）。
- 切回群聊时若有新消息，定位最新并显示一次汇总提示。

### F19 「同发」协议前缀的注入与渲染剥除（R4、D2、D3）

- ✅ 注入：仅当 **targets>1** 时，对**每个**目标会话的正文前置 canonical 两行（中文固定，A9；全角「：」「、」，bytes 稳定）；正文与协议行之间空一行。
- ✅ canonical 首行：`[群聊 · 同发] 收件人：@lead、@ux、@backend`（lead 在前，其余按 @ 出现顺序）；第二行固定：`（本消息由用户经「群聊」同时发送给上述 N 位成员，各成员各自收到一份。）`。
- ✅ 收件人顺序：`@lead` 恒在首位，其余按用户 @ 的出现顺序去重排列；显示名与补全列表一致。
- ✅ 渲染剥除：群聊气泡只渲染 `<用户正文>`；协议行进 `rawText` 不渲染；UI 用本地化系统说明行表达收件人（「已同时发送给 Lead、@X、@Y」）。
- ✅ 非群聊入口发送的消息不含协议前缀；解析器必须容忍「无前缀」与「旧构建前缀」两种形态（降级原样展示，不报错）。
- ✅ 解析只在行首按精确模板匹配（`/^\[群聊 · 同发\] 收件人：(.+)\n/`），**正文中用户手写的 `@` 不受影响**，不升级为提及、不被误剥。
- 消息到达各目标后，由各目标会话自行渲染为普通用户消息；群聊不复制 N 条投递为 N 条气泡。

---

### F20 成员加入消息（欢迎提示 + creator 带卡消息）（R2、R6、D5、A11）

- ✅ **形态（v0.6，用户纠正）**：入群卡**不是孤立系统卡**，而是 **creator 发出的一条消息**（sender = 创建者），消息正文就是成员卡。结构三段（自上而下）：
  1. **欢迎提示（M4②，v0.8 居中）**：**居中** 11.5/400 `label-tertiary` 纯文本「欢迎 @<name> 加入群聊」，无背景/无药丸；
  2. **creator 消息头**：creator 头像 32（Lead 用 business-primary、teammate 用 business-tertiary）+ 名字 14/600 + 角色小标签 11（`主 Agent` / `Teammate`，纯文本无底色）+ 时间 11 同行贴右；**不做气泡**，头像下方直接接卡片；
  3. **卡片正文**：宽 max 520、`bg-layer-1`、`border-l2`、radius 12、padding 16；卡内不重复头像/名字。
- ✅ **触发**：`spawn_teammate`（teammate）与 `subagent` / `subagent_fork`（subagent）创建成员时。teammate 以 `team/member` 的 **`phase==='active'`** 那条为入群时刻（等 active 再渲染，避免 provisioning 闪烁/空卡）；subagent 以 `subagent/catalog` 的 `childCreatedAt` 为时间。
- ✅ **sender/creator 判定**：`spawn_teammate` 恒为 **Lead**（仅 Lead 可调，teammate 调用会报 `only the Team Lead can create teammates`）；`subagent`/`subagent_fork` 为**调用方成员**（Lead 或 teeammate/subagent，用 `tool/call` 所在会话解析，fork/seeded 需 `ownEvents()` 过滤）；消息头显示该 creator 的头像/名字/角色小标签。
- ✅ **卡片字段**：标题「@<name>」加入群聊、角色描述 12/19（1–2 行，空值「暂无角色描述」）、label+value 信息行（模型 / 上下文策略 / 父成员（仅 subagent）/ 创建方式）、初始任务（`tool/call.arguments.prompt` 前 2 行 / 120–160 字，2 行截断 +「展开」文字链，展开只影响本卡）、动作（`查看会话`；teammate 另有 `查看任务`；均文字链接，无按钮底）。时间显示在 creator 消息头（11px `label-caption`）。
- ✅ **数据来源优先级（A11）**：① 创建方 `tool/call.arguments`（description/prompt/context）+ `tool/result.member`（name/provider/context/**model 快照**）；② 子会话 `subagent/descriptor`（agentModel/mode/provider/label）；③ lead 会话 `team/member`（入群时刻、`member.id`、description，**无 model**）；④ `subagent/catalog`（childId/label/mode/childCreatedAt）；⑤ 会话 header（parentSession/isSeeded）。
- ✅ **模型行（UX v3.1 + D-D 已定）**：只显示模型名、**不显示 provider 内部名**；继承文案：`spawn_teammate` 创建的成员 **继承 Lead** → 显示 `deepseek-flash（继承 Lead）`；`subagent`/`subagent_fork` **继承创建者** → 显示 `deepseek-flash（继承 <creator 名>）`（如 `（继承 ux）`）；**无模型继承信息时只显示模型名**；整行缺省 → **隐藏该行**（不显示「未知」）。回退链：`descriptor.agentModel` → `spawn_teammate result.member.model`（创建时快照）→ 当前 `list_agents[].model`。
- ✅ **上下文策略**：teammate 由 `arguments.context` → `全新上下文（fresh）` / `继承 Lead 已完成回合（fork）`；subagent 由工具名 → `全新上下文（subagent）` / `继承父会话（subagent_fork）`；`descriptor.mode=one-shot` 时追加「· 一次性（one-shot）」，`continuable` 默认可省略（原型 P10 即省略）；工具名缺失隐藏该行。
- ✅ **父成员**：仅 subagent 显示（creator 名，如 `ux`）；teammate 不显示该行。
- ✅ **创建方式**：工具名 `spawn_teammate` / `subagent` / `subagent_fork`；未知隐藏该行。
- ✅ **空值回退**：无角色描述 →「暂无角色描述」（tertiary）；无模型 → 隐藏行；无父成员 → 不显示；无任务 → 隐藏整个「初始任务」区块；名字缺失 → 成员短 id。
- ✅ **动作**：`查看会话`（`team/member.member.id` / `catalog.childId` → 打开成员 Session）；`查看任务`（仅 teammate，`team/task.ownerId === member.id`）；`展开初始任务`。无权限时「查看会话」置灰并提示；只读历史中动作按只读态隐藏/置灰（🔶 实现确认）。
- ✅ **去重与回放**：同一成员（`member.id` / `catalog.childId`）只出现 **1 条**入群消息（欢迎提示 + creator 带卡消息为一组，不重复）；以 `team/member` 的 phase 迁移为幂等键；成员重建（同名新会话）视为新成员再次出卡。`fork/seeded` 子会话复制的父会话 `tool/call`/`team/member` 必须用 `ownEvents()`/归属会话过滤；历史加载（分页/重进视图/刷新）按同一规则回放，不新增、不丢卡。
- ✅ **状态与去留**：成员失败/离开**不删消息**，状态区更新（运行中→已完成/失败）；`team/member` 当前未观测到 failed/removed 相位，先以 `list_agents.status` 兜底（§17 U11）；v1 不做「退群提示」。
- ✅ **与消息流关系**：creator 带卡消息是消息流中的**普通成员消息**（按 `(time, sessionIdRank, seq)` 归位），cards 不参与长文折叠；初始任务在卡内独立折叠；不新增弹窗/大图/动效。带卡消息始终有卡片正文，不适用空输出抑制（F31）；欢迎提示为独立系统行（M4②）。

---

### F21 任务卡片消息（R6、A12）

- ✅ **触发**：`team_task_create`（action=create）与 `team_task_update`（`claim` / `complete` / `reopen` / `reassign` / `release` / `delete` / `edit` / `set_dependencies`）每成功一次 = `team/task` 追加一条新 revision → **一条 revision 一张卡**。`team/task` 只在 **Lead 会话**（journal），操作者由 `(taskId, revision)` 配对操作者会话的 `tool/call`/`tool/result` 得到；配对失败回退「系统操作者」（中性灰色，**不得伪造成员**）。
- ✅ **发送者 = 操作者（谁操作谁发话）**：创建者、认领者、完成者、重新打开者可能不同成员；消息头 = 操作者头像 32 + 名字 14/600 + 角色小标签 11（`主 Agent`/`Teammate`/`Subagent`）+ 时间 11，复用 M8 SenderLine；不是系统卡、无独立系统提示。
- ✅ **动作识别**：优先 `tool/call.arguments.action`；`team_task_create` 固定 `create`；无 action 时用 revision diff 兜底，顺序为 **status 跃迁（delete/reopen/complete）→ owner 变化（claim/reassign/release）→ 其它（set_dependencies/edit）**；`claim` 判定 `ownerId === actor`，`reassign` 为 lead 且 `ownerId !== actor`。
- ✅ **动作标签映射（严格映射真实 action）**：`create→创建`、`claim→认领`、`complete→完成`、`reopen→重新打开`、`reassign→改派`、`edit→编辑`、`set_dependencies→依赖变更`、`delete→取消`、`release→放回`。不新增平台不存在的动作。
- ✅ **状态 pill 映射（只允许四个真实值）**：`pending` → 「待认领」；`in_progress` → 「进行中」；`completed` → 「已完成」；`deleted` → 「已取消」。**不存在第五种状态**：不出现「返工」「失败」等派生/警示状态；`reopen` 的任务真实状态就是 `pending`。
- ✅ **状态/动作严格映射（用户拍板）**：DSH 任务状态枚举仅 `pending | in_progress | completed | deleted`，平台**没有 failed**；任务卡只使用这四个真实状态与 `team_task_update` 的真实 action，**不引入失败/返工概念**。`reopen`（completed→pending，owner 清空）显示动作「重新打开」+ 状态「待认领」；`delete` 显示「取消」+「已取消」；`release` 显示「放回」+「待认领」；任何情况下不得伪造 `failed` 或「返工」等平台不存在的状态。
- ✅ **卡片字段（v0.8.1，F23/F34/F35）**：**默认折叠**仅显示 目标（subject）、任务 ID、状态 pill、负责人（字段行：头像 20 + 名字；无 owner「未认领」）、依赖（`blockedBy` → 任务 ID/标题，无则「无」）、完成时间（completed 时显示；非完成隐藏或「—」）；**描述/硬性要求/验收标准默认隐藏**，「展开全部/收起」可展开（展开状态会话内临时记忆）；动作标签仍在顶部；**移除「复制任务 ID」**；**外消息头=操作者（头像必须渲染，缺失首字母占位），卡内不重复操作者头像**；卡片与普通气泡明显区分（左侧 3px 状态色竖条 + 顶部任务图标 + 状态 pill）。
- ✅ **去重与回放**：键 `${teamId}:${taskId}:${revision}`，同一 revision 只 1 张卡；历史按 revision 升序回放（`revision===1` 为 create）；`fork/seeded` 复制的 `team/task`/`tool/call` 必须 `ownEvents()`/`isOwnSeq()` 过滤；同毫秒排序按 `(time, sessionIdRank, seq)`。
- ✅ **边界**：`delete`/`release` 在真实日志零出现 → 卡片按状态机推导（🔶 UNVERIFIED，见 §17 U13）；`reassign` 目标成员已 failed 时的工具报错提示未取证（U15）；`edit`/`set_dependencies` 也出卡，但可作为次要动作弱化；`deleted` 为墓碑状态，`list()` 会过滤，卡片仍按 journal 事件渲染。

### F22 Markdown 渲染（R6，用户反馈 1）

- ✅ 消息正文（M1/M2/M3 气泡、M8/M9 卡片描述）支持 Markdown：**粗体/斜体、无序/有序列表、行内代码、代码块（等宽 + 语言标识）、链接、GFM 表格（F32）**；引用/任务列表等未支持语法降级为纯文本，不报错。
- ✅ 代码块使用等宽字体 + 语言标签（如 ```ts），超宽横向滚动；行内代码使用 caption 背景。
- ✅ **安全降级**：不执行不可信 HTML（`<script>`/`<img onerror>` 等一律按纯文本转义）；解析失败/未知语法时整段按纯文本渲染，不丢内容。
- ✅ 链接只允许 http(s)/mailto；点击外部链接走宿主默认行为并提示离开会话（🔶 具体确认交互由 UX 原型定）。

### F23 任务卡重设计（R6、A12、F21 修订，用户反馈 2/4/18 + 线上 22/23）

- ✅ **与普通气泡明显区分**：独立卡片形态（不是气泡）——`bg-layer-1` + radius 12 + padding 16 + **左侧 3px 状态色竖条**（待认领=neutral/进行中=business/已完成=success/已取消=dimmed）+ **顶部任务图标** + 动作标签 + 状态 pill。
- ✅ **人物一致（F35）**：外消息头 = 操作者（actor，头像 32 + 名字 + 角色小标签 + 时间）；**卡内不再出现第二个操作者头像/名字**；「负责人」只作为字段行（头像 20 + 名字）显示，**可与 actor 不同**（改派场景）。
- ✅ **默认折叠（F34）**：默认仅显示 目标（subject）、任务 ID、状态、负责人、依赖、完成时间；**描述/硬性要求/验收标准默认隐藏**，提供「展开全部/收起」；展开状态可临时记忆（会话内，不写库）。
- ✅ **头像必须渲染**：actor 头像缺失时用首字母色块占位（不得空白）；负责人无值时显示「未认领」且不渲染空头像框。
- ✅ **移除「复制任务 ID」动作**（用户反馈 2）；卡片不引入其它平台不存在的任务详情页跳转。
- ✅ 状态色与 pill 仍严格四枚举（F21），不得出现 failed/返工。
- 不参与长文折叠；不用弹窗/大图/动效。

### F24 单一输入器（R6，用户反馈 3/15）

- ✅ 群聊视图**激活时隐藏宿主原生 composer**（对话页底部「发消息或创建任务…」输入卡），**仅保留插件自己的 composer**；切走群聊视图时恢复宿主 composer。
- ✅ 插件 composer：发送目标区（输入框下方 chips）→ 文本输入 → 发送按钮；**Enter 发送、Shift+Enter 换行**（IME 组合期间不误发）。
- ✅ **不得回填/重复输出**：发送成功后清空输入框，不得把已发内容重新写回 composer；发送失败保留原文 + 重试（F9）。
- 🔶 隐藏宿主 composer 的实现方式（CSS/卸载/slot override）由架构定，验收以「群聊视图内只出现 1 个输入框」为准（O8）。

### F25 @ 交互修订（R4、D5、F6 修订，用户反馈 5/7/14/17）

- ✅ **仅键入 `@` 弹出**补全（普通文字输入、聚焦输入框、选中 chip 后都不弹；再次键入 `@` 才弹）。
- ✅ 提示文案只保留「**键入 @ 可同时发送给多人**」（去掉「未 @ 时默认发送给 Lead」；默认目标用 chip「@Lead」表达）。
- ✅ 成员条目小字显示**角色描述**（如「负责接口取证与技术可行性」），不显示运行状态；描述缺失回退「无描述」。
- ✅ 弹层**不透明**（menu token 实底），不得透出底层消息或出现叠字/不知名文本。
- ✅ `@` 目标 chip 移到**输入框下方**：彩色底（business-primary/tertiary）+ **白色文字**（`@Lead`/`@ux`），与输入区分行；已选多个按顺序排列，可整体删除。
- ✅ chip/目标区与发送语义不变（R4：无 @ 默认 Lead；@ 时 Lead + 被 @ 成员）。

### F26 成员状态与轮次轨迹侧栏（R6、R2，用户反馈 6/10）

- ✅ **频道头成员条（F33）**：每成员 = 头像 24px + **完整名字**（不截断）+ 状态「**工作中**（绿点）/ **等待**（灰点）」，随 running/inactive 实时更新；**全部成员显示、禁止 `+N`**；超宽横向滚动或换行，**不得使用两端渐变/黑色遮罩**；点击头像打开该 agent 的**轮次轨迹侧栏**。
- ✅ **轮次轨迹侧栏**（右侧抽屉，可关闭）：顶部 agent 名 + 状态 + 模型；列表按轮次（**时间、该轮最终输出摘要、工具数、轮次状态**）；点击某轮可定位/展开摘要（不新增页面跳转）。
- ✅ 侧栏数据来源：该 agent 会话的 `turn/start`–`turn/end` 区间 + 末段 `assistant/message` 文本 + `tool/call` 计数；数据缺失时该轮显示「无输出摘要」（O7）。
- ✅ 侧栏不阻塞消息流（抽屉覆盖，可按 Esc/点遮罩关闭）；窄屏全屏抽屉。

### F27 群聊作用域修正（R6、A5 补充，用户反馈 12）

- ✅ 群聊频道根 = **Lead 会话**：从 lead 或任一 teammate/subagent session 打开「群聊」，都展示**同一个 Lead 频道全量**（消息集合、时间线、成员完全一致），不是该成员私聊。
- ✅ 频道根解析：沿 `parentSession` 链向上找根会话（无 parentSession 的 Lead）；当前会话本身就是 Lead 时直接用自身（A5 推导 + 链式回溯）。
- ✅ 侧栏/频道头/发送目标均以 Lead 频道为准；切换会话不切换频道内容（F15 修订）。

### F28 降噪与图标操作（R6，用户反馈 8/11）

- ✅ 移除「N 个工具调用 · 见「轨迹」」摘要行（M6 作废）；工具过程只通过 F26 轨迹侧栏查看。
- ✅ 消息操作图标化（F16 修订）：`复制原文`（copy icon）+ `打开所属会话`（external-link icon），不显示长文字；图标带 `aria-label` 与 tooltip。
- ✅ 图标位置：气泡右下角/说明行内，hover/聚焦出现（触屏常显/长按菜单）；不得遮挡正文。
- ✅ 其它降噪：不渲染 raw 工具名/调用参数（过程在侧栏）。

### F29 折叠阈值修订（R3、D6 修订，用户反馈 13）

- ✅ **默认显示前 50 行**；正文**超过 50 行**才出现折叠链接（原 8 行/400 字符规则作废）。
- ✅ 折叠态 = 前 50 行 + 渐变遮罩 + 12px 文本链「展开全部（共 N 行）」；展开后「收起 ⌃」；锚点稳定（F5）。
- ✅ 行数按渲染后行数计（含代码块内行）；系统提示/欢迎提示/同发说明行永不折叠；卡片（M8/M9）不参与长文折叠；任务卡默认折叠走 F34（不是 50 行规则）；空输出不产生气泡（F31）。
- 🔶 50 行与视口高度的关系（超长行、代码块）由 UX/实现确认折行口径。

### F30 防重复气泡（R6、F9 补充，用户反馈 16）

- ✅ 同一次发送只渲染 **1 条**用户气泡：本地 echo（`local:<batchId>`）与权威 `user/message` 按 `clientBatchId`/`requestId` 去重，权威到达后替换 echo，不新增第二条。
- ✅ 修复偶发重复发送：发送中禁用重复提交；重试幂等（F9/§7.9）；刷新/重进视图后仍只 1 条。
- ✅ 去重失败时以权威消息为准（本地 echo 不得残留）；`data-message-id` 唯一。
- ✅ 与 F31 配合：空输出不生成占位气泡，也不参与去重计数。

### F31 空输出抑制（R5、R6，线上问题 19）

- ✅ agent 输出（M3）**无有效文本**（`text` 为空或仅空白/换行；`reasoning`/`tool-call` 不算正文）且无卡片/附件时，**不渲染气泡**，也不生成空占位。
- ✅ 运行中状态由成员条状态点/轨迹侧栏承担（F26），不靠空气泡表达「正在回复」。
- ✅ 历史回放同样抑制（旧轮次空输出不补泡）；`turn/end` 非 completed 且空输出时只保留系统状态提示（M4），不出泡。
- ✅ 与 F30 配合：空输出不参与去重计数；`data-message-id` 不产生。

### F32 Markdown 表格（R6，线上问题 20）

- ✅ 支持 **GFM 表格**：表头行、对齐标记（`:--`/`:-:`/`--:`）、单元格内行内 Markdown（粗体/行内代码/链接）；表格宽度自适应，超宽时横向滚动。
- ✅ 样式：表头加粗 + 底部 1px border、单元格 padding 6×10、斑马纹（偶数行 `bg-layer-2` 弱底）、边框 `border-l3`；字号与正文一致 14/22（窄屏可 13/20）。
- ✅ **禁 HTML**（同 F22）：表格内 HTML 一律转义；不执行脚本/事件属性。
- ✅ 降级：非法表格语法（缺分隔行/列数不齐）按纯文本或按行渲染，不吞内容；**原 v0.8「表格降级纯文本」作废**。
- ✅ 表格不参与长文 50 行折叠的「行」计算例外：按渲染后行数计（F29）。

### F33 成员条全名与去遮罩（R6、R2，线上问题 21）

- ✅ 成员条每项 = 头像 24px + **完整名字**（不截断、不加 `…`）+ 状态点（工作中绿/等待灰）；名字与成员条/发送者/`@` 补全使用同一显示名。
- ✅ **全部成员显示、禁止 `+N`**（不再折叠为「+N」）；成员多时**换行优先**，仍超宽则横向滚动。
- ✅ **删除两端渐变/黑色遮罩**（用户反馈像黑色遮罩）；不得用遮罩掩盖溢出；滚动条/边缘处理由 UX 定但不许黑色渐隐。
- ✅ 点击头像仍打开轨迹侧栏（F26）；状态点语义不变。

### F34 任务卡默认折叠（R6、A12，线上问题 22）

- ✅ 默认显示 6 项：**目标（subject）、任务 ID、状态、负责人、依赖、完成时间**（completed 时显示；非完成显示「—」或隐藏）。
- ✅ 默认隐藏：**描述、硬性要求、验收标准**（如字段存在）；提供「展开全部/收起」文字链（12px）。
- ✅ 展开状态**可临时记忆**（会话内 UI 态，不写库）；刷新/重进恢复默认折叠。
- ✅ 折叠不影响卡片的动作标签/状态色/任务图标；卡片本身不参与 50 行折叠（F29）。

### F35 任务卡人物一致（R6、A12，线上问题 23）

- ✅ **外发送者 = 操作者（actor）**：消息头显示 actor 头像 32 + 名字 + 角色小标签 + 时间；actor 由 F21 配对确定。
- ✅ **卡内不重复操作者头像/名字**：卡片 body 不再渲染第二个 actor 头像；「负责人」只作为字段行（头像 20 + 名字），可与 actor 不同（如 Lead 改派给 ux 时 actor=Lead、owner=ux）。
- ✅ 单个发送者的视觉关系清晰：卡内其他人物仅出现在「负责人」字段行；不出现两个相同头像并排。
- ✅ 头像缺失时首字母占位（F23），不得空白。

## 6. 发送与触发契约（D1–D5，✅ 已冻结）

> 本节为**契约**，实现与验收必须遵守；v0.1 的开放问题已由 D1–D5 关闭。

### 6.1 通路

- 统一使用客户端 `ISession.prompt(content, 'steer', signal, requestId)`；它按目标会话地址自动分流（api-feasibility §C2）：
  - 普通会话（lead/teammate）→ `remote.session.prompt`；
  - 子会话（subagent）→ `remote.subagents.prompt({parentSessionId, childSessionId, mode:'continuable', delivery:'steer'})`。
- 发送者身份 = 用户；接收方看到的是 `source.kind='user'` 的**普通用户消息**（D2/A8），不写 Team mailbox、不调 `agentTeams.sendMessage`。
- `PromptContentPart` 仅 `text`（v1 不走 image/file；子会话本身也不接受 file part）。

### 6.2 目标解析

- 输入框文本解析 `@` 得到提及集合；目标 = `{lead} ∪ mentions`，按显示名去重。
- 无 @ → N=1，仅 lead。
- 目标会话 id：`leadSessionId`（A5 推导）、teammate 的 `TeamMemberView.id`、活跃 subagent 的 `childSessionId`（来自 `subagent/catalog` + 名册）。
- 目标不可用时（已结束/父离线）→ 不投递并提示原因，其余目标照常（部分失败，F9）。

### 6.3 语义（D1）

- **发给 lead**：等价于在 lead 会话发送用户消息 → **立即触发新一轮**；lead 运行中则以 `steer` 投递到最近 step 边界，**排队不打断**。
- **发给 teammate/subagent**：同样以用户消息身份投递，`steer` 模式；空闲成员会被唤醒开始新一轮；运行中在最近 step 边界插入。
- 未 @ 的多目标能力**不改变**成员间既有的 Team mailbox 逻辑；群聊只是用户视角的一条发送捷径。

### 6.4 多目标扇出（D2/D3）

- 同一正文 fan-out 到各目标会话，逐目标各一次 `prompt`；每次独立 `requestId`；N 次调用**非原子**（调研风险 R1）。
- targets>1 时每个目标正文前置 §F8 的 canonical 两行协议前缀（D2），正文相同；群聊 UI 只 1 条气泡 + 系统说明行。
- 单目标（N=1）不注入前缀，按普通用户消息。
- UI 不伪造接收方状态；「同时发给谁」只在群聊 UI 说明行与协议前缀两处表达（D3）。

### 6.5 回执与失败（D4）

- 四态：`发送中` / `已发送` / `部分失败` / `失败（可重试）`；**不做已读/处理中/送达确认**。
- `部分失败` = 多目标中部分成功：显示「已送达 X/Y」+ 失败目标，重试只补失败项（D-ARCH-04）。
- 「已发送」= 各目标 `prompt` 返回接受；部分失败列出失败目标；重试只针对失败目标。
- 失败不丢文本、不生成重复气泡；重试以目标为单位记录状态（同一 `clientBatchId` 展示一条）。

### 6.6 只读与权限

- 团队结束/归档 → 不允许发送（F17）；无权限会话不进入聚合（§7.14）。
- 目标父 Agent 离线（`SessionSnapshot.subagent.parentAvailable === false`）→ 该目标禁用发送并说明（调研 R4）；lead 会话离线 → 整组只读。

---

## 7. 状态机与边界场景

### 7.1 视图状态

`未加载 → 加载中 → 就绪（空/有消息）→ 实时更新中`；`错误（可重试）`；`只读（团队结束/归档）`；`筛选态` 为叠加态。

### 7.2 排序与去重（D8/D9）

- 排序键 `(time, sessionIdRank, seq)`；同毫秒按 lead → teammate → subagent → sessionId 字典序（A4）；**禁止**用 seq 全局排序、用 createdAt 当事件时间。
- 去重三层：双写（spliced/user/message 同 id）、fork/seed 继承前缀（`ownEvents`/`firstLiveSeq`）、通知副本（发送侧 tool/call / 接收侧 spliced / subagent-settled / 旧 team-message 账本）（§4.3）。
- 群发 N 条投递是 N 条记录，不做文本级合并；UI 仅 1 条气泡。

### 7.3 无团队（D10、D-C）

按 F13：仅该会话用户消息 + 该 agent 最终输出；无成员区/筛选；tab 仍显示，无消息时空状态；**允许发送**（D-C，作为该会话普通用户消息）。

### 7.4 会话切换

- 取消旧会话的实时订阅/标脏；不同会话草稿与筛选态隔离；返回恢复（F15）。
- 旧会话异步到达的更新按 sessionId 丢弃，不串入新会话。

### 7.5 视图切换（tab 切走再切回）

- 滚动位置、筛选态、输入草稿保持（至少会话生命周期内）；🔵 持久化范围未决（§13）。

### 7.6 成员增删

- 新增：堆叠 + 系统提示 + 补全列表更新。
- 移除/结束：历史保留、名字行状态转为「已完成」灰点、补全列表移除；输入框中残留提及在发送前提示并剔除。
- 重名由 Host 规则保证不出现；客户端仍按 name 去重兜底。

### 7.7 subagent 运行中 / 完成 / 失败

- 运行中：名字行显示 11px「运行中」状态（绿点，非徽标），不展示中间过程。
- 完成：插入子会话 M3；父会话 `subagent-settled` 副本必须按 id/文本去重丢弃（event-model §3.3）。
- 失败/中断：系统提示 + 状态标记；🔵 是否展示最后一段输出未决。
- 同一 subagent 多轮逐轮插入。

### 7.8 超长消息

- 折叠（F5/F29：默认前 50 行，超过才折叠）；无空白长串强制换行；代码块横向滚动。
- 极端超长（>100k 字符）按需加载/截断渲染（🔶 实现上限待定）；不撑破布局。

### 7.9 并发发送

- 发送中禁用重复提交（或队列串行），防连点；重试幂等（§17 U4）。
- 多目标只 1 条气泡、N 次投递；快速切会话后再发送必须落到当前会话。
- lead 运行中：steer 排队到最近 step 边界，不打断（D1）。

### 7.10 发送失败与部分失败

- 单目标失败：气泡 failed + 原因 + 重试/复制原文。
- 部分失败：气泡 `partial` +「已送达 X/Y」+ 失败目标清单 + 仅重试失败项（成功项不重发）；重试成功后状态转 sent。
- 只读/离线时发送被拒绝并提示（F17/§6.6）。

### 7.11 数据量与增量加载（按调研修订）

- ✅ 首屏最近 **200 条**；向上滚动按**per-session 事件窗口**增量加载（`eventSource.hasMore` + `loadOlder()` / `loadThrough(seq)`），每页 **50 条**；加载到最早已无 `hasMore` 时显示「已到最早消息」。
- 只 follow 群组范围（lead + 全部后代：teammate + subagent，**深度 ≤3、会话数 ≤32**，A10），follower 数上限 = 32（调研风险 R3 数据放大）；超限截断并提示；不 follow 无关会话。
- 客户端缓存按消息而非全量事件；超过内存阈值（🔶 建议 5000 条/频道）后仅保留窗口尾部 + 可回读缓存。
- 冷会话首屏走 `retain` + 窗口补齐；若单会话日志过大，架构阶段考虑 Host 旁路摘要（task-6），PRD 只要求「首屏 ≤ 200 条且可增量」。
- 不得每次进入全量重扫所有会话日志（增量游标：`revision` / `hasMore` / 最后 seq）。

### 7.12 时间与排序异常

- 缺时间戳回退 seq；跨时区按本地展示；同毫秒稳定排序（§7.2）；seeded/fork 会话不得用 createdAt。

### 7.13 前缀污染与解析失败

- 协议前缀（`Team message …` / `[群聊 · 同发] …`）只进 rawText，不渲染正文。
- 解析失败（格式变化/旧构建）→ 原样展示 + 不阻塞其它消息（降级，不报错）。
- 用户正文里手写 `@` 不被误判为目标（目标只来自补全选择 + 发送时解析规则）。

### 7.14 权限与隐私

- 无权限会话不进入聚合；错误态可读（F12）。
- 不展示内部 token、系统提示词、完整文件内容；文件只显示路径与打开动作。
- 前端埋点不含消息正文（N8）。

### 7.15 成员加入消息边界（F20）

- **触发去抖**：teammate 等 `phase==='active'` 再插入「欢迎提示（M4②）+ creator 带卡消息（M8）」，provisioning 阶段不出（避免闪烁/空卡/重复）；subagent 以 `catalog.childCreatedAt` 为入群时间。
- **创建失败**：`tool/result` 报错（如 teammate 创建 teammate → `only the Team Lead can create teammates`）或会话创建失败时**不出「欢迎提示 + 带卡消息」**，只保留错误消息/系统提示，不伪造成员。
- **重复加载/历史回放**：同一成员 ID 只渲染 1 组（欢迎提示 + creator 带卡消息）；分页、切换会话再返回、刷新重放，内容与顺序一致（按 `(time, sessionIdRank, seq)` 归位）。
- **fork/seeded 去重**：继承父会话的 `tool/call`/`team/member` 必须按 `ownEvents()`/归属会话过滤，不得因 N 个 fork 子会话重复出卡。
- **字段缺失**：模型缺失隐藏行、描述缺失「暂无角色描述」、prompt 缺失隐藏初始任务区块；任一缺失不得阻塞消息流（降级不报错）。
- **成员失败/离开**：不删卡、状态更新；`team/member` 未见 failed/removed 相位 → 以 `list_agents.status` 兜底（U11）；v1 不做退群提示。
- **权限**：无权限读取成员会话时 `查看会话` 置灰并提示，不阻断卡片渲染。

### 7.16 任务卡边界（F21）

- **操作者配对失败**：`team/task` 与操作者 `tool/call` 的 `(taskId, revision)` 配不上时，卡片仍渲染，sender 回退「系统操作者」（中性色），**不得伪造成 Lead/某成员**。
- **动作缺失**：仅当能确定 `(taskId, revision)` 才出卡；无法识别动作时按 diff 兜底，再到「更新」类；不得丢弃该 revision 的卡。
- **fork/seeded**：继承副本用 `ownEvents()` 过滤；同一 revision 只出 1 张卡，不因 N 个 fork 会话重复。
- **历史回放**：按 revision 升序；不把「当前最新快照」当作新动作；回放卡带 `data-replay="true"`。
- **delete/release**：真实日志零样例，文案/视觉按状态机推导（U13）；`deleted` 墓碑仍保留卡（不因 `list()` 过滤而消失）。
- **禁止伪造状态**：任何情况下不渲染 DSH 枚举之外的任务状态（如 `failed`/「返工」）；状态 pill 仅四值；`team/member.phase='failed'` 只进成员卡（F20）。
- **长文本**：description 在 create 卡 2 行截断、其余卡 1 行；卡片不参与长文折叠（与 M8 一致）。

### 7.17 v0.8 新增边界

- **Markdown（F22）**：解析失败/未知语法→整段纯文本；HTML 一律转义不执行；代码块超宽横向滚动；链接仅 http(s)/mailto。
- **单一输入器（F24）**：群聊视图内只允许 1 个 composer；宿主 composer 隐藏期间不得抢占键盘/焦点；切走恢复；IME 组合期间 Enter 不发送。
- **成员状态/轨迹侧栏（F26）**：成员状态取自 running/inactive 实时投影；侧栏打开时消息流不暂停；无轨迹数据时显示「暂无轮次」；侧栏关闭后焦点回到触发头像。
- **作用域（F27）**：`parentSession` 链断裂/无权限时回退当前会话并提示；不得把成员私聊内容当频道消息。
- **防重复（F30）**：同一次发送最多 1 条用户气泡；echo 与权威消息任一到达都不得叠出第 2 条；重试不新增气泡。

---

## 8. 非功能需求（N1–N9）

| ID | 类别 | 要求 |
| --- | --- | --- |
| N1 | 性能 | 首屏 ≤200 条；列表虚拟化；增量追加不阻塞输入；滚动 60fps；分页 50 条不抖动；follower 数上限见 §7.11 |
| N2 | 可访问性 | tab `role=tab` + 方向键；消息流 `aria-live`（礼貌级）仅播报新消息摘要；折叠链接 `aria-expanded`；补全符合 combobox 语义；焦点不丢失；对比度 AA |
| N3 | i18n | 文案走 i18n（zh-CN 默认 / en）；日期数字本地化；协议前缀固定中文（A9），UI 说明行本地化 |
| N4 | 主题 | light/dark 沿用现有 token，不硬编码颜色；头像色两主题可辨 |
| N5 | 窄屏 | <768px：频道头收敛为「群聊 · 团队名 · N 名成员 ▾」单入口 + 筛选图标；气泡不横向溢出 |
| N6 | 数据一致性 | 同 id 幂等；乱序按排序键归位；会话切换不串流；筛选不丢消息；群发 N 条投递与 UI 1 条气泡一致 |
| N7 | 安全隐私 | 沿用会话权限；不渲染不可信 HTML；不泄露密钥/系统提示；复制仅可见文本 |
| N8 | 可观测性 | 埋点：tab 打开率、发送成功/失败率（含部分失败）、折叠展开、筛选；不采集正文 |
| N9 | 降级 | 实时通道断开显示「实时更新暂停 + 重连」，历史可读；单成员数据失败不阻塞他人；不白屏 |

---

## 9. 阶段门禁与 Figma 原型要求

| 阶段 | 产物 | 门禁 |
| --- | --- | --- |
| 阶段 1 调研 | `docs/research/api-feasibility.md`、`event-model.md` | ✅ 已落盘（v0.2 已吸收） |
| 阶段 2 原型 | Figma v4（+ v0.8.1 修订：空输出抑制/表格/成员全名/任务卡折叠与人物一致） | 覆盖 F1–F35 主路径 + SC1–SC53 可演示 |
| 阶段 3 确认 | 用户确认原型 | **确认后才进入实现**；未确认不得写代码 |
| 阶段 4 实现/验收 | 代码 + 走查 | 按 §10 场景验收 |

> Figma 原型要求（给 ux 的输入）：必须呈现 6 个状态画面（有团队实时 / 无团队 / 多目标发送前后 / 只读历史 / 成员加入消息）+ 任务卡变体（创建/认领/完成/重新打开），并标注 F/SC 编号；交互需可点击演示 tab 切换、折叠展开、@ 补全、发送目标说明、部分失败重试。

---

## 10. 验收标准（Gherkin）

> 每条场景末尾 `# 可观测证据` 给出 tester 可独立验证的观察点。中文 Gherkin 用 假定/当/那么/并且。
>
> **DOM 证据基线**：选择器以 `tests/design/test-plan.md` §13 的 `data-testid` / `data-*` 契约为准（架构 v1.4 §6.5 已冻结：`group-chat-feed`、`data-kind`、`data-message-id`、`data-status`、`data-sender`、`data-creation-id`、`data-pair-order`、`data-system-variant`、`data-card`、`data-member-id`、`data-action` 等；仍缺项见该表）。**任务卡**按 task-42 §8 建议：`data-task-id` / `data-task-revision` / `data-task-action` / `data-task-status` / `data-task-owner` / `data-task-actor` / `data-task-blocked-by` / `data-replay`，容器 `data-kind="task_card"` + `data-card="task"`；**v0.8 新增**：`group-chat-target-chips`（输入框下方 chip 区）、`data-member-state=working|waiting`（成员条）、`group-chat-member-strip`、`group-chat-trajectory-panel` + `data-turn-index`、`data-card-avatar`、Markdown 内容节点（strong/ul/code/pre/table）。**v0.8.1 新增**：`data-member-name`（完整名字）、`data-task-collapsed=true|false`（任务卡折叠）；成员条**不得存在 mask/黑色渐隐节点**。实现若改选择器，必须同时更新 test-plan §13 与本 PRD 证据，不得只改一处。

### SC1 群聊 tab 作为并列视图出现（R1、F1、D7）

```gherkin
场景 SC1：群聊 tab 以 group-chat/order=5 注册并显示
  假定 我已安装并启用群聊视图插件且打开一个会话的对话页
  当 我查看视图切换区
  那么 我应看到「群聊」tab，位于「对话」之后、「轨迹」之前
  并且 该 tab 不是下拉菜单项，也不替换默认视图
  # 可观测证据：tab accessible name 为「群聊」；同 tablist 容器；顺序在 chat 与 trajectory 之间；默认选中仍为原默认视图；截图
```

### SC2 点击后进入聊天室界面（R1、F1、F2）

```gherkin
场景 SC2：切换到群聊呈现聊天室布局
  假定 我在对话页且存在团队
  当 我点击「群聊」tab
  那么 视图切换为：频道头 + 消息流 + 底部输入区
  并且 消息按 (time, sessionId, seq) 升序、最新在底部
  并且 不触发整页刷新
  # 可观测证据：feed 容器可见（data-testid=group-chat-feed）；最后一条消息时间 ≥ 前一条；navigation count 不变；截图
```

### SC3 三类核心消息同时存在（R5、F2、F3、D8）

```gherkin
场景 SC3：群聊同时呈现我的消息、agent 间消息、agent 最终输出
  假定 团队完成一轮协作：我发过指令、scout 给 backend 发过消息、backend 结束一轮推理
  当 我打开群聊
  那么 我看到我发送的消息（M1）
  并且 我看到 scout 发给 backend 的消息（M2）
  并且 我看到 backend 本轮最终输出（M3）
  并且 三条按真实时间排列
  # 可观测证据：三条 DOM 的 kind 分别为 user/agent-to-agent/agent-final；时间戳单调递增；截图
```

### SC4 agent→agent 以 @ 形式展示（R3、F3、F4）

```gherkin
场景 SC4：A 对 B 的话以 @B 展示且协议前缀不渲染
  假定 scout 向 backend 发送了「请补充接口契约」
  当 我在群聊查看该消息
  那么 名字行为 scout（头像+名字+行内状态，无角色徽标）
  并且 正文首行内联 @backend（business-primary 蓝），无「→ 发送给 @backend」chip 行
  并且 正文中不出现「Team message from scout:」协议行
  # 可观测证据：名字行含 scout 且无角色徽标元素；正文首行元素 data-mention=backend；不存在 target-chip-row 元素；消息文本不含 /^Team message/；截图
```

### SC5 长文本自动收起并可看全部（R3、F5、D6）

```gherkin
场景 SC5：超长消息默认折叠，可展开与收起
  假定 存在一条渲染后 51 行的长消息
  当我查看该消息
  那么 默认只展示前 50 行并出现 12px 文本链「展开全部（共 N 行）」，aria-expanded=false
  当我点击「展开全部」
  那么 完整文本可见，链接变「收起 ⌃」，aria-expanded=true
  当我再次点击「收起」
  那么 恢复折叠
  # 可观测证据：折叠态只渲染前 50 行（节点高度约 50 行）；链接文案在「展开全部/收起」间切换；链接为 12px 文本样式；aria-expanded 变化；展开前后该消息顶部 Y 偏移 ≤4px；截图
```

### SC6 折叠阈值边界（F5、D6）

```gherkin
场景 SC6：50 行边界与不折叠内容（v0.8）
  假定 存在恰好 50 行的消息、51 行的消息、以及一条系统提示
  当我查看
  那么 50 行消息完整展示、不出现折叠链接
  并且 51 行消息折叠为前 50 行并出现「展开全部（共 51 行）」
  并且 系统提示、欢迎提示与「已同时发送给…」说明行永不折叠
  # 可观测证据：50 行消息无 group-chat-fold-toggle；51 行消息有折叠链接且默认 50 行；系统/欢迎/说明行无折叠链接；截图
```

### SC7 @ 提及自动补全（R4、F6、D-A）

```gherkin
场景 SC7：输入 @ 按可寻址集合出现成员补全
  假定 团队有 lead、scout（inactive）、backend（running）与一个已完成的 one-shot subagent
  当我键入「@」
  那么 补全浮层列出 lead、scout、backend（inactive teammate 仍可寻址）
  并且 已完成的 one-shot subagent 不出现在列表
  并且 subagent 选项显示为「<label> · <父名> 的子体」
  当我键入「sc」并用方向键选择后按 Enter
  那么 生成 @scout 的提及 chip（整体可删除）
  # 可观测证据：浮层 data-testid=group-chat-mention-popup + role=listbox；选项 role=option + data-mention；选项集合含 lead/scout/backend、不含已完成 one-shot subagent；inactive teammate 仍在；chip 节点 data-mention=scout；退格整体移除；截图
```

### SC8 无 @ 默认发送给 lead（F7、D1）

```gherkin
场景 SC8：不 @ 时发送给 Lead 并触发新一轮
  假定 我在群聊输入框未输入 @
  当我输入「请同步当前进度」并发送
  那么 该消息作为用户消息进入 lead 会话并触发 lead 新一轮回复
  并且 群聊显示「发送给：Lead」，不显示同发说明行
  并且 lead 会话收到的正文不包含「[群聊 · 同发]」前缀
  # 可观测证据：lead 会话出现该 user/message 且 content 不含协议前缀；lead 开始新一轮（新 turn 事件）；群聊只新增 1 条气泡；截图
```

### SC9 多目标同时发送并告知接收者（F8、D2、D3）

```gherkin
场景 SC9：@ 成员时同时发送给 Lead 与被 @ 成员
  假定 团队有 scout、backend
  当我输入「@scout @backend 请对齐接口字段」并发送
  那么 该消息同时发送给 Lead、scout、backend（同一 clientBatchId，3 个独立 requestId）
  并且 群聊气泡下方显示「已同时发送给 Lead、@scout、@backend」
  并且 三个目标会话各收到一条同文消息，首行均为「[群聊 · 同发] 收件人：@lead、@scout、@backend」
  并且 三个目标会话第二行均为「（本消息由用户经「群聊」同时发送给上述 3 位成员，各成员各自收到一份。）」
  # 可观测证据：群聊说明行文本；同一 clientBatchId 下 3 个独立 requestId 各成功 1 次（不要求跨目标同一 messageId）；三个目标会话 user/message 的 content[0].text 精确匹配 canonical 首行；群聊只新增 1 条气泡；截图/事件记录
```

### SC10 多目标发送不重复渲染（F8、F9）

```gherkin
场景 SC10：同一内容多目标投递只显示一条群消息
  假定 我刚刚执行 SC9 的多目标发送
  当 三个目标全部接受
  那么 群聊中该内容只出现一次（同一 clientBatchId 的 3 条投递折叠为 1 条气泡）
  并且 状态为「已发送」
  # 可观测证据：同 clientBatchId 投递记录 3 条、DOM 中该批次气泡命中 1 个节点；气泡数量 +1；状态文案「已发送」；截图
```

### SC11 发送失败可重试（F9、D4）

```gherkin
场景 SC11：发送失败展示错误并可重试
  假定 网络异常或目标成员已离开
  当我发送一条群聊消息
  那么 气泡显示失败态与可读原因
  并且 提供「重试」与「复制原文」
  当我点击「重试」且条件恢复
  那么 消息转为「已发送」，不产生重复气泡
  # 可观测证据：data-status=failed → sent；错误文案可见；重试后节点数仍为 1；截图
```

### SC12 历史分页加载（F10、§7.11）

```gherkin
场景 SC12：上滚按事件窗口加载更早历史
  假定 团队频道消息超过首屏 200 条
  当我滚动到消息流顶部
  那么 触发加载更早一页（50 条）并无抖动地插入上方
  并且 加载中显示占位，到最早时显示「已到最早消息」
  # 可观测证据：滚到顶部触发一次加载（调用 loadOlder/事件窗口 hasMore 变化）；插入后视口内首条消息不变；占位/结束提示可见；截图
```

### SC13 实时新增与滚动策略（F10、F18）

```gherkin
场景 SC13：运行中实时追加新消息
  假定 团队正在运行且我停留在群聊
  当 某成员一轮推理结束产生新发言
  那么 新消息在 2 秒内出现在消息流
  并且 贴底时自动滚到最新；已上滚时只显示「↓ N 条新消息」
  并且 点击浮标后滚到底并清零
  # 可观测证据：新消息节点出现时间差 ≤2s；未贴底时浮标文本含条数；点击后 scrollTop 到底且浮标消失；截图
```

### SC14 只看某成员筛选（F11、D-B）

```gherkin
场景 SC14：筛选按 sender 或 targets 命中，子体归入父成员
  假定 团队有 scout、backend，且 scout 有一个活跃 subagent「数据校验」
  当我在频道头选择只看 scout
  那么 消息流只显示 sender=scout 的消息与 targets 包含 scout 的消息
  并且 该 subagent 的消息因父成员归属一并显示
  并且 其他成员互相之间的消息不显示
  并且 顶部显示「正在只看 scout」提示条与清除入口（单选，无多选/时间/类型组合）
  当我点击清除
  那么 恢复全部消息并回到原滚动位置
  # 可观测证据：筛选提示条 data-testid=group-chat-filter-banner + data-filter=scout；清除按钮 data-action=clear-filter；DOM 中每条消息满足 sender=scout 或 targets 含 scout 或 parent=scout 的子体；无多选/时间/类型筛选控件；清除后消息数恢复且回到原滚动位置；截图
```

### SC15 无团队时的降级形态（R2、F13、D7、D10、D-C）

```gherkin
场景 SC15：普通单 Agent 会话进入群聊并可发送
  假定 当前会话没有任何 teammate/subagent
  当我点击「群聊」tab
  那么 tab 仍可见，页面显示「当前为单 Agent 会话（无团队）」
  并且 消息流只包含该会话的用户消息与该 agent 的最终输出
  并且 不出现频道头成员头像栈、状态行与筛选图标（无团队不渲染成员区）
  并且 输入区可用（data-testid=group-chat-composer 非 disabled，默认发送给 Lead）
  当我输入「继续」并发送
  那么 该消息作为该会话的普通用户消息发给 Lead，并触发 Lead 新一轮
  # 可观测证据：提示文本；发送者集合 ⊆ {我, agent}；频道头无成员头像栈/状态行/筛选图标；composer 非 disabled；发送后 feed 新增 1 条 data-kind=user 消息且 lead 会话出现该 user/message；data-testid=group-chat-feed；截图
```

### SC16 subagent 生命周期表现（R2、F14）

```gherkin
场景 SC16：subagent 启动、运行与完成
  假定 scout 创建了一个 subagent
  当 subagent 运行中
  那么 群聊出现系统提示「scout 创建了 subagent：<label>」，其名字行显示 11px 运行中状态（非徽标）
  当 subagent 完成一轮
  那么 其最终输出作为普通 agent 气泡插入群聊（名字 + 后缀「· scout 的子体」，无缩进/连接线）
  并且 同一份内容不因父会话 subagent-settled 副本重复出现
  并且 不展示工具调用等中间过程，也不再有「N 个工具调用」摘要行（F28）
  # 可观测证据：系统提示文本含 subagent label；完成消息名字行为「<label>」且后缀为「· scout 的子体」；无缩进/连接线元素；该文本 DOM 命中 1 次；无 tool-call 内容；截图
```

### SC17 成员加入与离开（F14）

```gherkin
场景 SC17：成员增删后历史与补全一致
  假定 团队已有 scout
  当 新成员 backend 加入
  那么 出现加入系统提示，补全列表包含 backend
  当 scout 结束/离开
  那么 出现离开系统提示，补全列表不再含 scout
  并且 scout 历史消息保留原名字与名字后缀
  # 可观测证据：补全选项集合变化；历史消息节点仍含 scout；频道头状态行「N 名成员 · M 个运行中」变化；截图
```

### SC18 会话切换与状态保持（F15）

```gherkin
场景 SC18：切换会话再返回，群聊状态保留
  假定 我在群聊已上滚并输入了半句草稿
  当我切换到其它会话再切回
  那么 恢复原滚动位置，草稿仍在
  并且 期间旧会话实时消息未串入新会话
  # 可观测证据：scrollTop 恢复（±4px）；输入框 value 保持；新会话消息流无旧会话 messageId；截图
```

### SC19 复制与跳转（F16）

```gherkin
场景 SC19：复制消息与跳转所属会话
  假定 群聊中有一条 agent 最终输出
  当我 hover 该消息并点击「复制」
  那么 剪贴板为该消息剥前缀后的纯文本
  并且 出现复制成功反馈
  当我点击「打开所属会话」
  那么 跳转到该消息所属成员会话/轨迹并定位
  # 可观测证据：剪贴板与消息 text 一致（不含协议前缀）；toast 出现；跳转后视图指向目标会话；截图
```

### SC20 只读历史（F17）

```gherkin
场景 SC20：团队结束后群聊只读
  假定 团队任务已完成
  当我打开群聊
  那么 输入区禁用并提示「团队已结束，群聊为只读历史」
  并且 历史、筛选、复制、折叠展开仍可用
  并且 不提供发送/重试等写操作
  # 可观测证据：textarea disabled=true；发送按钮 disabled；只读提示可见；筛选/折叠可点击；截图
```

### SC21 新消息浮标与回到最新（F18）

```gherkin
场景 SC21：未贴底时的新消息提示
  假定 我已上滚阅读历史
  当新消息到达
  那么 出现「↓ N 条新消息」浮标且不强制滚动
  并且 点击后滚到底并清零
  # 可观测证据：浮标可见且含条数；scrollTop 未突变；点击后到底；截图
```

### SC22 键盘与可访问性（N2）

```gherkin
场景 SC22：键盘可完成 tab 切换与折叠展开
  假定 我仅使用键盘
  当我在视图区用方向键切换 tab
  那么 可聚焦并选中「群聊」，焦点可见
  当我 Tab 到「展开全部」并按下 Enter
  那么 长消息展开且 aria-expanded=true
  并且 新消息到达时 aria-live 区域播报简要摘要
  # 可观测证据：focus ring；aria-selected/aria-expanded 正确；live region 更新；全程无鼠标；截图
```

### SC23 并发发送防重（F9、§7.9）

```gherkin
场景 SC23：连点发送只产生一条消息
  假定 我在输入框输入内容
  当我快速连续点击发送 3 次
  那么 群聊只产生 1 条消息
  并且 其余点击被忽略或排队
  # 可观测证据：消息节点 +1；发送按钮在发送中禁用/loading；提交调用只 1 次；截图
```

### SC24 错误态与恢复（F12、N9）

```gherkin
场景 SC24：数据加载失败给出可恢复错误
  假定 群聊数据源不可用
  当我打开群聊
  那么 显示可读错误与「重试」，不白屏
  当数据源恢复后我点击重试
  那么 正常加载并保留输入草稿
  # 可观测证据：错误节点含重试按钮；重试后 feed 渲染；草稿 value 仍在；截图
```

### SC25 窄屏适配（N5）

```gherkin
场景 SC25：窄屏下聊天室可用
  假定 视口宽度 375px
  当我打开群聊
  那么 频道头收敛为「群聊 · 团队名 · N 名成员 ▾」单入口且不横向溢出
  并且 气泡与输入区不横向溢出，长串自动换行
  # 可观测证据：document.scrollWidth ≤ 375；成员入口可展开；截图
```

### SC26 i18n 与主题（N3、N4）

```gherkin
场景 SC26：英文界面与深色主题
  假定 界面语言 en 且主题 dark
  当我打开群聊
  那么 全部 UI 文案为英文（无硬编码中文残留）
  并且 深色主题下消息正文/名字行状态/折叠链接对比度可读
  # 可观测证据：UI 文案无中文（消息正文与协议原文除外）；主题 token 生效；light/dark 截图各一
```

### SC27 同发协议前缀注入与剥除（F19、D2、D3）

```gherkin
场景 SC27：多目标发送在每个目标注入统一前缀，群聊渲染时剥除
  假定 团队有 ux 与 backend
  当我发送「@ux @backend 请补充状态机」
  那么 ux 会话与 backend 会话各收到一条用户消息，正文首行为「[群聊 · 同发] 收件人：@lead、@ux、@backend」
  并且 第二行为「（本消息由用户经「群聊」同时发送给上述 3 位成员，各成员各自收到一份。）」，其中 N=3
  并且 群聊气泡正文只有「请补充状态机」及发送目标说明，不含协议两行，正文中手写 @ 不被剥除
  # 可观测证据：两个目标会话 user/message 的 content[0]/[1] 文本与 canonical 精确逐字节匹配；群聊气泡文本不含「[群聊 · 同发]」；rawText 保留协议行；手写 @ 原样保留；截图
```

### SC28 无 @ 单发不带前缀（F7、D1）

```gherkin
场景 SC28：单目标发送不注入协议前缀
  假定 我在群聊输入框输入普通文本且未 @ 任何人
  当我发送
  那么 lead 会话收到的是普通用户消息，content 首块不是协议前缀
  并且 群聊气泡显示「发送给：Lead」
  # 可观测证据：lead user/message content[0].text 为用户正文本身；群聊无「已同时发送给」说明行；截图
```

### SC29 lead 运行中 steer 排队不打断（F7、D1）

```gherkin
场景 SC29：lead 运行中发送的消息在其最近 step 边界投递
  假定 lead 正在一轮推理中（running=true）
  当我在群聊发送一条默认发给 lead 的消息
  那么 该消息以 steer 方式排队，lead 当前 step 不被中断
  并且 群聊状态先「发送中」后「已发送」
  并且 该消息在 lead 的下一个 step 边界被消费
  # 可观测证据：发送调用 mode='steer'；lead 当前 turn/step 未出现 aborted；inbox spliced 事件在该 step 结束后出现；群聊状态文案变化；截图/事件记录
```

### SC30 部分目标失败仅重试失败项（F9、D4）

```gherkin
场景 SC30：多目标部分失败可精确重试
  假定 ux 会话可用、backend 已离线
  当我向 @ux @backend 发送消息
  那么 群聊气泡显示「部分失败」并列出失败目标 backend
  并且 状态说明显示「已送达 2/3」并区分成功项 ux 与失败项 backend
  当我点击重试且 backend 恢复
  那么 仅向 backend 重新投递，ux 不重复收到
  # 可观测证据：状态文案为「部分失败」且含「已送达 2/3」；失败清单文本含 backend；重试后 backend 会话收到 1 条、ux 会话仍为 1 条；气泡仍为 1 条并转「已发送」；截图
```

### SC31 subagent 可寻址与从属显示（F6、F14、D5）

```gherkin
场景 SC31：subagent 出现在补全并以「· <父名> 的子体」后缀显示
  假定 ux 创建了活跃 subagent，label 为「产品设计」
  当我在输入框键入「@」
  那么 补全列表出现「产品设计」及副标题「ux 的子体」
  并且 不出现 @all 选项
  当我选中并发送
  那么 该 subagent 会话收到用户消息，lead 同时在收件人内
  并且 其发言名字行为「产品设计」+ 后缀「· ux 的子体」（无缩进/连接线）
  # 可观测证据：选项含「产品设计」与副标题「ux 的子体」；无 @all 选项；子体会话 user/message 存在；名字行含后缀「· ux 的子体」且无缩进/连接线元素；截图
```

### SC32 spawn_teammate：欢迎提示 + Lead 带卡消息（F20、R2、A11、D-D）

```gherkin
场景 SC32：spawn_teammate 出现欢迎提示与 creator 带卡消息
  假定 Lead 调用 spawn_teammate 创建 scout（description=「负责接口取证」，context=fresh，模型继承 Lead：deepseek-flash）
  当 该成员进入 active 相位
  那么 群聊先出现一条**居中**欢迎提示「欢迎 @scout 加入群聊」（11.5px tertiary 纯文本，无背景/无药丸）
  并且 紧随一条 sender=Lead 的消息：消息头含 Lead 头像、名字、角色小标签「主 Agent」与时间
  并且 该消息正文是成员卡：标题「@scout」加入群聊、描述「负责接口取证」、模型「deepseek-flash（继承 Lead）」、上下文「全新上下文（fresh）」、创建方式 spawn_teammate
  并且 初始任务默认 2 行截断并带「展开」文字链；提供「查看会话」与「查看任务」文字链
  并且 该组内容只出现 1 次（刷新/历史回放后仍为 1 次）
  # 可观测证据：欢迎提示 data-kind=system + data-system-variant=welcome 且**居中**（不是右对齐）；creator 消息头 data-sender=lead；data-kind=member_card + data-card=member-join + data-member-id=<id> 命中 1；`data-field=model` 文本为「deepseek-flash（继承 Lead）」、`data-field=context` 为「全新上下文（fresh）」、`data-field=create-tool` 为 spawn_teammate；刷新后欢迎提示与带卡消息仍各 1（data-creation-id/data-pair-order 配对）；截图
```

### SC33 subagent：creator 为调用方成员 + 父成员/生命周期（F20、R2、A11、D-D）

```gherkin
场景 SC33：subagent 入群消息的 sender 是调用方成员
  假定 ux 调用 subagent_fork 创建「产品设计」（descriptor.mode=continuable）
  当 子会话创建
  那么 群聊先出现**居中**欢迎提示「欢迎 @产品设计 加入群聊」
  并且 紧随一条 sender=ux 的消息（消息头 ux 头像/名字/角色小标签「Teammate」/时间），正文为成员卡
  并且 卡片信息行显示父成员「ux」、模型「deepseek-flash（继承 ux）」、上下文「继承父会话（subagent_fork）」、创建方式 subagent_fork
  并且 卡片不提供「查看任务」动作（subagent 不进任务板）
  并且 若该 subagent 为 one-shot，上下文行追加「· 一次性（one-shot）」；continuable 可省略
  # 可观测证据：欢迎提示 data-system-variant=welcome、居中且文本「欢迎 @产品设计 加入群聊」；creator 消息头 data-sender=ux；data-kind=member_card + data-card=member-join；`data-field=model` 文本「deepseek-flash（继承 ux）」、`data-field=parent` 为 ux、`data-field=context` 为「继承父会话（subagent_fork）」、`data-field=create-tool` 为 subagent_fork；无 `data-action=view-task`；截图
```

### SC34 字段缺失回退且不阻塞消息流（F20、D-D）

```gherkin
场景 SC34：成员卡字段缺失时的回退
  假定 一条旧会话的入群数据缺 description、model 与 prompt
  当我打开群聊
  那么 欢迎提示与 creator 带卡消息照常出现，卡片显示「暂无角色描述」，不显示模型行，隐藏初始任务区块
  并且 creator 消息头与卡片仍显示成员名与「查看会话」
  并且 后续消息正常渲染、消息流顺序不受影响
  并且 该组（欢迎提示 + 带卡消息）仍只出现 1 次（重复加载不重复）
  # 可观测证据：`data-field=description` 文本「暂无角色描述」；不存在 `data-field=model` 与 `data-field=task` 节点；欢迎提示 + 带卡消息各 1（data-creation-id 相同、data-pair-order=0/1）、卡后仍有后续消息节点；截图
```

### SC35 任务创建卡（F21、R6、A12）

```gherkin
场景 SC35：Lead 创建任务出现 sender=Lead 的任务卡
  假定 Lead 调用 team_task_create 创建 task-1（subject=「接口取证」，description 多段，blocked_by 为空）
  当 revision=1 的 team/task 写入 journal 并配对到 Lead 的 tool/call
  那么 群聊出现一条 sender=Lead 的消息，正文为任务卡
  并且 卡片动作标签「创建」、状态 pill「待认领」、task id「task-1」、标题与描述首 2 行可见
  并且 负责人显示「未认领」、依赖显示「无」
  并且 操作者头像已渲染（非空白），且**没有**「复制任务 ID」动作
  # 可观测证据：data-kind=task_card + data-card=task；data-sender=lead；data-task-id=task-1；data-task-revision=1；data-task-action=create；data-task-status=pending；data-task-owner 为空且文案「未认领」；data-task-actor=lead；卡片有 data-card-avatar 且非空；不存在 data-action=copy-task-id；description 2 行截断+「展开」；截图
```

### SC36 认领卡 sender=认领者（F21、R6、A12）

```gherkin
场景 SC36：teammate 认领任务卡 sender=认领者且负责人正确
  假定 Lead 已创建 task-3（pending，revision=1），scout 调用 team_task_update action=claim expected_revision=1
  当 revision=2 写入 journal 并配对到 scout 的 tool/call
  那么 群聊出现一条 sender=scout 的任务卡（不是 Lead）
  并且 动作标签「认领」、状态 pill「进行中」、负责人「scout」
  并且 task id 仍为 task-3，revision=2 的卡与 revision=1 的创建卡并存（一 revision 一张卡）
  # 可观测证据：data-sender=scout；data-task-actor=scout；data-task-owner=scout；data-task-action=claim；data-task-status=in_progress；data-task-revision=2；同 task-3 两张卡（rev1/rev2）；截图
```

### SC37 完成卡状态已完成（F21、R6、A12）

```gherkin
场景 SC37：teammate 完成任务卡状态已完成
  假定 scout 是 task-3 的 owner（in_progress，revision=2），调用 team_task_update action=complete expected_revision=2
  当 revision=3 写入 journal
  那么 群聊出现 sender=scout 的任务卡：动作标签「完成」、状态 pill「已完成」、负责人仍「scout」
  # 可观测证据：data-sender=scout；data-task-action=complete；data-task-status=completed；data-task-owner=scout；data-task-revision=3；卡片头像 data-card-avatar 非空；截图
```

### SC38 重新打开卡（F21、R6、A12）

```gherkin
场景 SC38：reopen 卡显示「重新打开」且状态为 pending，UI 无 failed/返工
  假定 task-3（completed，revision=3，owner=scout），Lead 调用 team_task_update action=reopen expected_revision=3
  当 revision=4 写入 journal
  那么 群聊出现 sender=Lead 的任务卡：动作标签「重新打开」、状态 pill「待认领」（真实枚举 pending）
  并且 负责人显示「未认领」（reopen 清空 owner）
  并且 页面不存在 data-task-status=failed 的节点，也不出现「失败」「返工」字样（操作者正文除外）
  并且 卡片不参与长文折叠
  # 可观测证据：data-task-action=reopen；data-task-status=pending；data-task-owner 为空且「未认领」；全页无 data-task-status=failed、无「返工」文本/无失败 pill；description 1 行；截图
```

### SC39 Markdown 渲染（F22，反馈 1）

```gherkin
场景 SC39：消息正文按 Markdown 渲染且不安全 HTML 降级
  假定 一条 agent 消息正文含粗体、无序列表、行内代码、带语言标识的代码块与 http 链接
  当我查看该消息
  那么 粗体/列表/行内代码/代码块/链接按 Markdown 渲染
  并且 代码块等宽显示并带语言标签（如 ts）
  并且 正文中的 `<script>` 等 HTML 按纯文本转义、不执行
  # 可观测证据：气泡内 strong/ul/code/pre 节点存在；pre 含语言标签；`<script>` 以文本出现且无脚本执行；纯文本消息不报错；截图
```

### SC40 单一输入器（F24，反馈 3/15）

```gherkin
场景 SC40：群聊视图只有一个输入框，Enter 发送
  假定 我打开群聊视图
  那么 宿主原生 composer 不显示（无「发消息或创建任务…」输入卡），只显示插件 composer
  当我输入「测试」并按 Enter
  那么 消息发送成功
  当我按 Shift+Enter
  那么 输入框内换行、不发送
  并且 发送后输入框清空，已发内容不会被回填/重复输出
  当我切回「对话」视图
  那么 宿主 composer 恢复显示
  # 可观测证据：群聊视图内 group-chat-composer 存在且宿主 composer 隐藏；Enter 后 feed 新增 1 条 data-kind=user；Shift+Enter 后仍停留输入；输入框 value 为空；切回后宿主 composer 可见；截图
```

### SC41 @ 交互修订（F25，反馈 5/7/14/17）

```gherkin
场景 SC41：仅输入 @ 弹层，chip 在输入框下方且弹层不透明
  假定 我在群聊 composer，未输入 @
  当 我聚焦输入框或输入普通文字
  那么 不出现成员补全弹层
  当我键入「@」
  那么 弹出不透明（实底）的成员补全弹层，条目含显示名与角色描述小字（不是运行状态）
  当我选择 ux
  那么 输入框下方出现彩色底、白字的 chip「@ux」；默认目标 chip 显示「@Lead」
  并且 提示文案只有「键入 @ 可同时发送给多人」
  # 可观测证据：group-chat-mention-popup 仅键入 @ 后出现；弹层背景 opaque（computed background-color alpha=1）；条目 data-mention 与描述文本；chips 容器 group-chat-target-chips 在 composer 下方且颜色为 business 底+白字；提示文本匹配；截图
```

### SC42 成员状态与轮次轨迹侧栏（F26，反馈 6/10）

```gherkin
场景 SC42：频道头成员状态可点开轨迹侧栏
  假定 频道中有运行中与等待中的成员
  那么 频道头成员条显示 每成员头像 + **完整名字** + 绿点「工作中」/灰点「等待」，且全部成员显示（无 `+N`、无两端黑色遮罩）
  当我点击某成员头像
  那么 右侧打开该 agent 的轮次轨迹侧栏：agent 名/状态/模型 + 轮次列表（时间、最终输出摘要、工具数、状态）
  当我按 Esc 或点遮罩
  那么 侧栏关闭，消息流恢复
  # 可观测证据：group-chat-member-strip 含 data-member-state=working|waiting 与 data-member-name（完整名字）；无 +N 节点、无 mask 元素（无黑色渐变覆盖）；点击后 group-chat-trajectory-panel 可见，含 data-turn-index 行；Esc 关闭；截图
```

### SC43 任务卡重设计（F23，反馈 2/4/18）

```gherkin
场景 SC43：任务卡与气泡区分、头像必渲染、无复制任务 ID
  假定 群聊中有一条任务创建卡
  当我查看
  那么 卡片与普通气泡形态明显不同（独立卡片 + 左侧状态色竖条 + 任务图标 + 状态 pill）
  并且 默认只显示 目标/任务 ID/状态/负责人/依赖/完成时间，描述等默认隐藏
  并且 消息头只有 1 个操作者头像，卡片内不重复第二个操作者头像；负责人以字段行显示
  并且 卡片不存在「复制任务 ID」动作
  # 可观测证据：data-card=task 容器带状态色边框/图标；data-card-avatar 非空且页面同一 actor 头像仅消息头 1 处；data-task-collapsed=true；描述节点不可见；不存在 data-action=copy-task-id；与同屏 bubble 节点样式不同；截图
```

### SC44 群聊作用域（F27，反馈 12）

```gherkin
场景 SC44：从子会话打开群聊展示 Lead 全量
  假定 我在某个 teammate 会话页
  当我切换到「群聊」tab
  那么 显示的是 Lead 频道全量（与在 Lead 会话打开时相同的消息集合/时间线/成员）
  并且 不是该 teammate 的私聊视图
  # 可观测证据：两次打开（Lead session 与 teammate session）的 feed messageId 集合一致；频道头团队名/成员条一致；截图
```

### SC45 降噪与图标操作（F28，反馈 8/11）

```gherkin
场景 SC45：无工具摘要行，消息操作为图标
  假定 一条 agent 消息完成且含工具调用
  当 我查看消息
  那么 不出现「N 个工具调用 · 见轨迹」文本
  并且 消息操作以 copy / external-link 图标呈现（带 aria-label），不显示长文字
  当我点击复制图标
  那么 剪贴板为消息纯文本
  # 可观测证据：页面文本不含 /个工具调用/；操作按钮为 icon + aria-label=复制原文/打开所属会话；点击后剪贴板匹配；截图
```

### SC46 50 行折叠（F29，反馈 13）

```gherkin
场景 SC46：50 行内不折叠，超过才折叠
  假定 一条消息渲染后恰好 50 行、另一条 51 行
  当我查看
  那么 50 行消息不折叠
  并且 51 行消息折叠显示前 50 行 + 「展开全部（共 51 行）」
  并且 系统提示、欢迎提示、同发说明行永不折叠
  # 可观测证据：50 行无 group-chat-fold-toggle；51 行有且 aria-expanded=false；说明行无折叠；截图
```

### SC47 防重复气泡（F30，反馈 16）

```gherkin
场景 SC47：一次发送只出现 1 条用户气泡
  假定 我在群聊 composer 输入并发送一次
  当 本地 echo 与权威 user/message 先后到达
  那么 feed 中该内容只有 1 条用户气泡（不叠加 echo + 权威两条）
  并且 刷新/重进群聊后仍为 1 条
  并且 发送中连续点击发送不会产生第二条
  # 可观测证据：feed 中同一文本 data-kind=user 节点数=1；data-message-id 唯一；刷新后仍 1；截图
```

### SC48 欢迎提示居中（F20，反馈 9）

```gherkin
场景 SC48：欢迎 @xxx 加入群聊为居中系统提示
  假定 一名成员创建并进入 active
  当 群聊插入欢迎提示
  那么 该提示为居中的系统文本「欢迎 @<name> 加入群聊」（11.5px tertiary，无背景）
  并且 不是右对齐蓝色气泡
  # 可观测证据：data-kind=system + data-system-variant=welcome；节点水平居中（与内容列中心对齐）；无 business-primary 蓝字右对齐样式；截图
```

### SC49 空输出抑制（F31，线上 19）

```gherkin
场景 SC49：agent 空输出不渲染空气泡
  假定 某 agent 一轮结束但其末段文本为空（仅有 reasoning/tool-call），且无卡片/附件
  当我查看群聊
  那么 该轮不出现任何 agent 气泡（无空占位）
  并且 该 agent 的运行状态只体现在成员条状态点/轨迹侧栏
  并且 刷新/历史回放后仍无空气泡
  # 可观测证据：feed 中该 turn 无 data-kind=agent_output 节点；无空文本气泡节点；成员条/轨迹侧栏状态可见；截图
```

### SC50 Markdown 表格（F32，线上 20）

```gherkin
场景 SC50：GFM 表格按表格渲染
  假定 一条 agent 消息正文含 GFM 表格（表头 + 对齐 + 2 行数据）
  当我查看该消息
  那么 渲染为 table（thead/tbody/tr/td），对齐生效
  并且 表头加粗、单元格有 padding 与边框、斑马纹生效
  并且 表格内 HTML 被转义、不执行；超宽横向滚动
  # 可观测证据：气泡内 table 节点存在且 thead/tbody/td 数量正确；computed padding/border 非零；无原始 `|---|` 文本；窄屏表格可横向滚动；截图
```

### SC51 成员条全名与去遮罩（F33，线上 21）

```gherkin
场景 SC51：成员条显示完整名字、无 `+N`、无遮罩
  假定 团队有 8 名成员
  当我查看频道头
  那么 每名成员显示 头像 + 完整名字 + 状态点（工作中/等待）
  并且 8 名成员全部可见（无 `+N` 折叠）
  并且 成员条两端不存在黑色/渐变遮罩（不遮挡名字）
  并且 超宽时可横向滚动或换行
  # 可观测证据：group-chat-member-strip 子项数=8 且各含 data-member-name 完整文本；无 +N 文本节点；无 mask 元素/无黑色渐隐层；scrollWidth>clientWidth 时仍可滚动查看；截图
```

### SC52 任务卡默认折叠（F34，线上 22）

```gherkin
场景 SC52：任务卡默认仅显示关键字段，可展开
  假定 群聊中有一条任务卡（含描述/硬性要求/验收标准）
  当我查看
  那么 默认只显示 目标、任务 ID、状态、负责人、依赖、完成时间
  并且 描述/硬性要求/验收标准默认隐藏，提供「展开全部」
  当我点击「展开全部」
  那么 显示完整描述等字段，链接变「收起」
  并且 切换会话再返回，展开状态按临时记忆恢复（或按实现说明恢复到默认）
  # 可观测证据：data-task-collapsed=true；description 节点不可见；点击后 data-task-collapsed=false 且描述可见；卡片高度变化；截图
```

### SC53 任务卡人物一致（F35，线上 23）

```gherkin
场景 SC53：任务卡只有 1 个操作者头像，负责人为字段行
  假定 Lead 改派 task-3 给 ux（actor=Lead，owner=ux）
  当 群聊出现该任务卡
  那么 消息头显示 Lead 头像 + 名字（仅 1 处操作者头像）
  并且 卡内不出现第二个 Lead 头像/名字
  并且 「负责人」字段行显示 ux 头像 + 名字（与 actor 不同）
  # 可观测证据：data-sender=lead；页面同 actor 头像计数=1；data-task-owner=ux 且负责人行有头像；卡内无 actor 头像节点；截图
```

> 场景总数：**SC1–SC53（53 条）**。v0.2–v0.7.1 历史见各版变更记录；v0.8 新增 SC39–SC48；v0.8.1 新增 SC49–SC53（空输出抑制/Markdown 表格/成员全名去遮罩/任务卡默认折叠/任务卡人物一致），并改写 SC42/SC43 的旧口径。

---

## 11. 需求追溯矩阵

| 用户需求 | 功能 | 验收场景 |
| --- | --- | --- |
| R1 多一个「群聊」tab，点击是聊天室 | F1、F2 | SC1、SC2 |
| R2 同时适配 teammate 与 subagent | F13、F14、F20、F26、F27 | SC15、SC16、SC17、SC31–SC34、SC42、SC44 |
| R3 A 对 B 以 @ 展示；过长收起可看全部 | F3、F4、F5 | SC4、SC5、SC6 |
| R4 输入框；无 @ 默认 lead；@ 多个同时发送并说明接收者 | F6、F7、F8、F9、F19、F24、F25 | SC7–SC10、SC27–SC30、SC40、SC41 |
| R5 我的消息 + agent→agent + agent 最终输出 | F2、F3、F10、F14 | SC3、SC13、SC16 |
| R6 其它群聊惯例逻辑 | F2、F9–F18、F20、F21、F22–F35 | SC11、SC12、SC14、SC18–SC26、SC32–SC53 |
| 备注：先 Figma 原型确认再实现 | §9 阶段门禁 | 原型演示 F1–F35 主路径（阶段 3 人工确认） |

**反向检查**：R1–R6 每条 ≥1 功能 + ≥1 场景；F1–F35 每条 ≥1 场景；每个场景有可观测证据；无孤立功能。

**v0.8 变更行**：F22–F30（见 v0.8 变更记录）；SC39–SC48。
**v0.8.1 变更行**：F31 空输出抑制、F32 Markdown 表格、F33 成员条全名/去遮罩、F34 任务卡默认折叠、F35 任务卡人物一致；受影响 F3/F5/F6/F20/F21/F22/F23/F26/F29/F30 与 M3/M9；SC42/SC43 改写，新增 SC49–SC53；§1.6 追加 5 行。

**v0.3 变更行**：F1（未读降级）、F9（四态 + clientBatchId）、F19（canonical 前缀）；SC9/SC10、SC27、SC30。
**v0.4 变更行**：F3/F4/F5/F6/F14/F18（视觉口径）、SC4/SC15/SC16/SC17/SC25/SC26/SC31（去掉徽标/chip 行/缩进连接线，改名字后缀/状态行/居中分隔/12px 折叠链接）。
**v0.5 变更行**：F20（新增，R2/R6/D5/A11）、M8（新增消息类型）；SC32–SC34。
**v0.6 变更行**：F20/M8（语义纠正：creator 带卡消息 + 右对齐欢迎提示 M4②）、M4（新增欢迎提示变体）；SC32–SC34。
**v0.6.2 变更行**：F6（D-A）、F11（D-B）、F13（D-C）、F20（D-D）；SC7、SC14、SC15、SC32–SC34。
**v0.7 变更行**：F21（新增任务卡片消息，M9；R6/A12）、§4.1/§4.2/§4.3、§7.16；SC35–SC38。
**v0.7.1 变更行**：F21/M9 状态与动作严格映射 DSH 真实枚举（移除失败/返工概念）、SC38 改为「重新打开」+pending+无 failed/返工 字样；§7.16/§12.3/§17 措辞同步；不新增编号。

---

## 12. 依赖与调研结论落地

### 12.1 已确认可用的稳定面（实现基线）

| 依赖 | 结论 | 依据 |
| --- | --- | --- |
| `conversation.view` slot | list 型、scope=session；注册 `{id, order, label, locale}` 即可加 tab，无需 Host 代码 | api-feasibility §A1–A4，第三方先例 dsh-terminal-panel / dsh-capability-settings / dsh-context |
| 跨会话读取 | 客户端 `sessions.retain(id,{source})` → `binding.eventSource`（`SessionEventWindow`）；投影 `projectionsBySession` | api-feasibility §B1 |
| 团队名册 | `projectionsBySession[lead].values.agentTeam`（`TeamMemberView`） | api-feasibility §B2、event-model §5 |
| 发送 | `ISession.prompt(content,'steer',...)` 自动分流 session / subagents；浏览器可调 | api-feasibility §C1–C3 |
| 事件语义 | `user/message`、`agent/inbox/spliced`、`assistant/message`、`turn/end`、`team/member`、`subagent/catalog`、`subagent/descriptor` | event-model §2–§4 |
| 排序/去重 | `(time, sessionId, seq)`；id 去重 + ownEvents；双写与 fork 陷阱 | event-model §7 |

### 12.2 实验性契约风险（必须隔离）

| 风险 | 说明 | 规避 |
| --- | --- | --- |
| Team 包为 experimental | `agentTeam` 投影与 Team 相关契约「no stability promise, contracts can change freely」 | 只依赖稳定面（slot / ISessions / prompt）；对 `agentTeam` 做**存在性判断**，缺失时降级为 `sessions.list` 的 `parentSessionId/origin` 推导；版本升级需回归 |
| `agentTeam` 在非 lead 会话可能 undefined | 投影由 Lead 日志派生 | `?? 降级`；不因缺失阻塞群聊 |
| `team/message/queued` 仅旧构建 | 当前构建无该事件，send_message 返回 `{sent:true}` | 解析器「存在则用」，不依赖 |
| MessageId 缺失（当前构建） | 发送/接收无法一对一关联 | 弱键 `(senderSessionId, targetId, sha256(text), time±5s)` 配对；保留投递态 |
| 无 Host 契约承诺 | 调研基于打包产物（无 .d.ts） | 实现前置冒烟验证；UNVERIFIED 清单见 §17 |

### 12.3 其它依赖

| 依赖 | 提供方 | 影响 |
| --- | --- | --- |
| Figma 交互原型 | ux | 阶段 2 门禁；F/SC 编号为原型标注依据 |
| 现有 view tab 架构与主题 token | 现有构建 | F1 位置、N4 主题、N5 响应式 |
| i18n 资源 | 现有实现 | N3；协议前缀固定中文（A9） |
| 会话权限模型 | 现有实现 | §7.14、F12 |
| 成员卡字段取证（`docs/research/member-card-fields.md`） | scout-events（task-20） | F20 字段优先级/空值回退/去重；模型快照语义；creator 判定（A11） |
| 成员加入消息原型 P10（`docs/ux/prototype/11-member-join.png`，Figma `21:954`） | ux（task-28） | F20 视觉/结构（欢迎提示 + creator 消息头 + 卡片） |
| 任务卡字段取证（`docs/research/task-card-fields.md`） | scout-events（task-42） | F21 字段/动作识别/操作者配对/状态-动作映射/去重（A12） |
| 任务卡 UX 帧（P12） | ux | v0.7 设计已接入；v0.8 重设计以 UX/Figma v4 的 P12 修订为准 |
| v0.8 原型（P2/P3/P4/P10/P12 修订 + P13 轨迹侧栏） | ux（task-75） | F22–F30 视觉/交互以该原型为准；PRD 先定规格，原型落盘后按 v0.8.x 对齐 |
| DOM 契约（`tests/design/test-plan.md` §13） | tester | SC 证据的 data-testid/data-* 选择器基线；与架构 §6.5 同步 |
| §13 未决项决策 | Lead/用户 | 阻塞原型定稿的细节 |

### 12.4 与架构审查决策的对齐（v0.3–v0.6）

| 架构决策 | 内容 | PRD 落点 |
| --- | --- | --- |
| D-ARCH-01b | 同发前缀 canonical 冻结：`[群聊 · 同发] 收件人：@lead、@ux、@backend` + 第二行固定说明；`protocol.js` 单点常量 | F8、F19、SC9、SC27 |
| D-ARCH-02 | v1 不做 tab 未读圆点（`conversation.view` 无装饰位），改消息区浮标 + 频道头提示，tab 标签恒「群聊」 | F1、F18、§3.1 |
| D-ARCH-03 | SC9/SC10 证据口径改为 clientBatchId + N 个独立 requestId（跨目标不存在同一 messageId） | SC9、SC10、F8、F9 |
| D-ARCH-04 | 新增 `部分失败` 态：展示「已送达 X/Y」，重试只补失败目标 | F9、§6.5、§7.10、SC30 |
| D-ARCH-07 | 数据范围 = lead 全部后代，深度 ≤3、会话数 ≤32，超限截断提示，subagent 显示父归属 | A10、§4.3、§7.11、F14 |
| D-ARCH-10 | v2 Host 旁路路由不排期，仅在 Spike S1（eventSource 非原始事件）失败时作为降级方案 | §12.2 实验性风险（保持） |

> 本 PRD 与 `docs/architecture/group-chat-architecture.md` v1.4 的协议字符串、状态、范围上限、成员加入消息与卡字段来源必须逐字一致；任何变更需同步两处。
>
> ✅ 架构文档 v1.4（task-30）已落盘：入群消息 = 欢迎提示（M4②）+ creator 带卡消息（M8），与 PRD v0.6/v0.6.1 及 UX v3.1 三方逐字一致（已核对：F20/M8/M4/SC32–SC34）。后续任何变更需按架构 §13「契约变更记录」与本文档同步。

---

## 13. 剩余未决问题（≤6，需 Lead/用户决策）

> v0.1 的 Q1–Q6 已由 D1–D10 关闭；O3/O2/O6 已分别由 v0.3/v0.6.2 关闭。v0.8 新增 O7–O9（轨迹侧栏数据来源、宿主 composer 隐藏方式、Markdown 边界），以下为剩余未决细节（共 6 条）。

| ID | 问题 | 影响 | 初步倾向（仅供讨论） |
| --- | --- | --- | --- |
| **O1** | 点击消息中的 `@成员` 行为：筛选该成员，还是打开其会话？ | F4/F11 | 单击筛选，菜单/双击打开会话 |
| **O4** | 交付说明（M5）文件的打开方式：应用内预览 / 新窗口 / 系统打开？ | F3/F16 | 沿用现有产物打开方式（需实现确认） |
| **O5** | 归档/只读历史的保留期与清理策略（频道消息保留多久、归档后是否仍可进入） | F17/§7.11 | v1 不主动清理；沿用会话日志生命周期 |
| **O7** | 轨迹侧栏数据来源与轮次口径：客户端用 `useTrajectory`/ownEvents 的哪套？轮次列表排序（最新在上/正序）、最终输出摘要长度、工具数是否含失败调用？ | F26/SC42 | 优先 lead/成员会话 `turn/start–turn/end` 区间；最新在上；摘要 2 行；工具数含所有 `tool/call` |
| **O8** | 隐藏宿主 composer 的实现方式（CSS 隐藏/slot override/条件卸载）与跨 DSH 版本稳定性 | F24/SC40 | 由架构评估，验收只要求「群聊视图内仅 1 个输入框、切回恢复」 |
| **O9** | Markdown 支持边界：是否允许表格/引用/任务列表？外链点击是否弹确认？ | F22/SC39 | v1 支持粗体/列表/行内代码/代码块/链接，其余降级纯文本；外链走宿主默认行为 |

---

## 14. 风险与反模式

| 类型 | 风险 | 说明/依据 | 缓解 |
| --- | --- | --- | --- |
| 🔺 反模式 | 把轨迹事件全塞进群聊 | 工具调用/token 流会淹没「谁对谁说了什么」 | 严格 A2/A6 口径；过程通过「打开会话/轨迹」跳转 |
| 🔺 反模式 | @ 语义双关 | 正文 `@decorator` 误判；用户「发送给」与 agent「@」混淆 | 目标只来自结构化 target/补全；用户消息用「已同时发送给…」说明行 |
| 🔺 反模式 | 多目标生成多条重复气泡 | 用户无法判断是同一份 | F8/SC10/SC27：1 条气泡 + 说明行 + N 条投递记录 |
| ⚠️ 契约 | **experimental Team 契约变化** | Team 包无稳定性承诺；`agentTeam` 投影可能改字段 | 隔离实验面 + 存在性判断 + 降级路径 + 版本回归 |
| ⚠️ 发送 | **fan-out 非原子** | N 次独立 prompt，可能部分成功（调研 R1） | 逐目标状态 + 仅重试失败项（F9/SC30） |
| ⚠️ 数据 | **seeded/fork 重复** | fork 子会话复制父会话历史（同 id/seq/time） | ownEvents/firstLiveSeq + id 去重 + 丢弃合成事件（§7.2） |
| ⚠️ 数据 | **双写重复/合成事件** | spliced+user/message 双写；removedCount 是消费 | 以 user/message 为主表；spliced 只补投递元数据 |
| ⚠️ 解析 | 前缀解析脆弱 | `Team message from X:` 格式可能变 | 正则容错 + 失败原样展示 + rawText 保留 |
| ⚠️ 顺序 | 跨会话顺序不确定 | seq 仅会话内单调，time 为 Host 时钟 | (time, sessionIdRank, seq) + 稳定 tie-break |
| ⚠️ 规模 | follower 数据放大 | 多 follow 流 + 投影广播 | 只 follow 团队范围；分页/窗口/虚拟化（§7.11） |
| ⚠️ 可用性 | 父 Agent 离线 | subagent prompt 被锁 | `parentAvailable` 判断 + 可读提示（§6.6） |
| ⚠️ 冷启动 | 冷会话首屏慢 | retain 才建 binding，投影可能 loading | 每成员独立 loading + refreshProjections + 可选 Host 旁路（task-6） |

---

## 15. 成功指标（🔶 提案，需确认口径）

| 指标 | 目标 | 观测 |
| --- | --- | --- |
| 群聊打开率（有团队会话） | ≥40% | 埋点 N8 |
| 群聊发送成功率 | ≥99%（含部分失败按目标统计） | 埋点 |
| 首屏可交互时间 | P95 ≤1.5s（200 条） | 性能采集 |
| 长文本展开使用率 | ≥30% | 埋点 |
| 筛选使用率 | ≥15% | 埋点 |
| 发送目标误解反馈 | 上线 2 周内无「不知道发给谁」反馈 | 用户反馈 |

---

## 16. 自评（v0.8）

- **最强部分**：D1–D10 全部落成可验收契约（§6 + F/SC）；v0.5/v0.6 的 F20 把「入群卡」从系统卡纠正为 creator 带卡消息，语义、字段来源（A11）与验收三方一致。
- **最需注意的部分**：F20/M8 的 sender=creator 语义依赖调用方会话解析与 fork/seeded 过滤（§4.3/§7.15），实现时须先验 §17 U11/U12 与架构 v1.4 对齐。
- **最弱部分**：M5 交付说明的事件来源、subagent 失败时是否展示最后输出、筛选语义与文件打开方式仍待定（§13）；冷会话大量历史依赖架构阶段旁路方案。
- **最需验证的假设**：第三方 view 默认落在 tab 行（非 More 菜单）、`ctx.remote.*` 可直调、retry 复用 requestId 的幂等性、前缀解析跨构建稳定性（§17）。
- **下一步**：① 用户确认 P10/P2 新原型（6 状态画面，含成员加入消息）；② 架构 v1.4 已落盘并与 PRD v0.6.1 逐字对齐（已完成）；③ 实现前对 §17 各项做冒烟验证。

---

## 17. UNVERIFIED 清单（v0.7；源自调研 + 本 PRD 推导，实现前必须验证）

| ID | 未验证项 | 影响 | 建议验证方式 | 依据 |
| --- | --- | --- | --- | --- |
| U1 | 第三方 client 插件能否直接 `ctx.remote.*`（调研只见 dsh-context 走自定义 fetch，未见 `ctx.remote.session.*` 调用） | 若无 → 需 Host 旁路路由，影响 task-6 架构 | 实现前最小插件冒烟：`remote.session.prompt`/`remote.subagents.prompt` | api-feasibility §H2 |
| U2 | `SessionReferenceSourceMap` 是否允许第三方声明自有 source（如 `'groupChat'`） | 仅影响引用计数语义；不行可复用既有 key | 尝试声明 merge；失败则复用 `'mainView'`/`'gateway'` | api-feasibility §H4 |
| U3 | 父 Agent 离线时 `subagents.prompt` 的确切失败码 | 影响失败文案与重试分类（§6.6） | 构造父离线场景实测 RemoteError | api-feasibility §H5 |
| U4 | 重试复用同一 requestId 是否幂等（防重发） | 影响 F9 重试语义与「不重复投递」保证 | 用同 requestId 重复 prompt 观察是否去重 | 本 PRD §6.5/§7.9 推导 |
| U5 | 新 view 注册后默认出现在 tab 行还是「More」菜单（pin 机制） | 若不默认在 tab 行，R1「多一个 tab」不满足 | 安装后真机检查 tab 行 + More 菜单 | api-feasibility §A2–A3、§D5 |
| U6 | `agentTeam` 投影在 teammate 会话中是否 undefined（非 lead 会话） | 影响名册降级路径 | 在 teammate 页面读投影断言缺省 | api-feasibility §H7 |
| U7 | 协议前缀的跨构建/跨语言稳定性（旧构建 `Team message <id> from X:` vs 当前 `Team message from X:`；D2 中文前缀） | 影响解析与渲染剥除（§7.13） | 收集两代日志样本做解析回归 | event-model §2.3、§10.3 |
| U8 | `team/message/queued` 在哪些构建存在 | 仅影响旧日志补齐能力 | 多构建样本统计 | event-model §10.3 |
| U9 | 客户端 `Slots` inspect 通道当前 401 不可用（无法在线复核 slot 占位） | 验收时无法用 inspect 佐证 tab 注册 | 页面鉴权后 `Slots.listSubTree{root:"conversation.view"}` | api-feasibility §A4、§E1-R8 |
| U10 | `subagent` 的 `provider/model/reasoning_effort` 参数只在 modelSelection 启用时出现；desktop profile 是否启用未确认 | 影响 F20 模型行来源（可能只能靠 descriptor） | 实测一次 subagent 调用是否带 provider/model 参数 | member-card-fields §10.1 |
| U11 | `team/member` 未观测到 `failed`/成员移除相位 | 影响 F20 卡片状态更新与是否做退群提示 | 构造成员失败/结束场景观察事件；否则以 `list_agents.status` 兜底 | member-card-fields §10.3 |
| U12 | teammate `context=fork` 是否真的产生 `isSeeded=true` 未观测 | 影响上下文策略文案「继承 Lead 已完成回合」准确性 | 构造 fork teammate 实测子会话 header.isSeeded | member-card-fields §10.4 |
| U13 | `delete` / `release` 在真实日志零出现（1176 条 revision） | 其任务卡的文案/视觉/状态映射未经真实数据验证（F21） | 构造一次 delete/release 走查；无样例时按状态机推导并标 `data-task-action` | task-card-fields §9.1 |
| U14 | 任务卡时间与操作者 `tool/call.time` 的跨会话时钟一致性未单独验证 | 极端并发下卡片排序可能与动作先后不一致 | 压测同毫秒多成员同时操作；排序用 journal time + sessionRank/seq | task-card-fields §9.2 |
| U15 | `reassign` 目标成员已 failed 时 `TEAM_MEMBER_NOT_FOUND` 的工具报错未取证 | 该报错是否需要卡片/提示 | 构造目标 failed 的 reassign 实测；v1 先按工具报错提示、不出卡 | task-card-fields §9.5 |
| U16 | Markdown 渲染器选型与 XSS 边界未验证（宿主是否提供 markdown 组件/是否需自带 sanitizer；含 GFM 表格） | F22/F32/SC39/SC50 安全降级 | 首日 spike：用恶意 HTML 样本验证转义；优先复用宿主既有渲染能力 | 本 PRD F22/F32 |
| U17 | 轨迹侧栏所需轮次数据在客户端是否可得（`useTrajectory` 或 ownEvents 的 turn 边界/工具计数） | F26/SC42 数据来源 | 读会话语义或 spike 验证；缺失时降级为「最近 N 轮摘要」 | 本 PRD F26/O7 |
| U18 | 「隐藏宿主 composer」在 DSH 各版本的选择器/结构稳定性未验证 | F24/SC40 跨版本回归 | 冒烟：group-chat 视图内断言仅 1 个 composer；升级 DSH 后回归 | 本 PRD F24/O8 |

---

## 附录 A 术语

| 术语 | 含义 |
| --- | --- |
| 团队频道 | 群聊底层数据视图：一个 team 的 lead + 子会话按时间线合并 |
| agent 发言 | 某 agent 一轮推理结束后的最后一段 `assistant/message` 文本（A2/A6） |
| agent→agent 消息 | 接收方会话 `agent/inbox/spliced`（`agent-message`/旧 `team-message`），展示为 `@目标` |
| 同发（fan-out） | 同一份正文逐目标各投递一条；收件人由文本协议前缀 + 群聊 UI 说明行表达 |
| 轮次（turn） | 一个 agent 从接收输入到 `turn/end` 的区间；`turn/end.reason.kind` 区分 completed/error/interrupted/max-tokens/forked |
| 协议前缀 | D2 规定的两行固定中文文本，仅用于跨会话传递收件人信息 |

## 附录 B 参考

- 用户需求原文：§1.1（R1–R6）。
- Lead 数据范围假设：§1.4（A1–A3）；Lead 决策 D1–D10：§1.5 与 §6。
- 调研：`docs/research/api-feasibility.md`（task-1）、`docs/research/event-model.md`（task-2）。
- 现有对话页视图：对话 / 轨迹 / 上下文 / 终端 / fleet / 能力（群聊并列新增，id=group-chat/order=5）。
