# 群聊视图插件（DSH Conversation View）· 实施架构设计

| 项 | 内容 |
| --- | --- |
| 文档版本 | **v1.6.1**（v1.6 + **两处视觉契约修正**：气泡圆角/内边距按发送者区分、发送键改 business-primary 底 + bg-base 箭头；实现期如需变更走「契约变更记录」附录 §13） |
| 作者 | architect（Agent Team teammate） |
| 任务 | task-6（v1.0）→ task-9（v1.1）→ task-17（v1.2 气泡流）→ task-23（v1.3 成员卡）→ task-30（v1.4 creator 消息 + 欢迎提示）→ task-35（v1.5 四项裁决 + DOM 契约冻结）→ task-45（v1.6 任务卡片消息）→ task-49（v1.6.1 气泡/发送键视觉修正） |
| 阶段 | 阶段 2–3 之间：**只做设计，不写生产代码**；代码实现以用户确认 Figma 原型为门禁（PRD §9） |
| 上游输入 | `docs/research/api-feasibility.md`（624 行，简称 **API**）<br>`docs/research/event-model.md`（658 行，简称 **EVT**）<br>`docs/research/member-card-fields.md`（**341 行**，task-20 成员卡片字段取证，简称 **MCF**）<br>`docs/research/task-card-fields.md`（**399 行**，task-42 任务卡字段/操作者/动作取证，简称 **TCF**）<br>`docs/specs/group-chat-prd.md` **v0.7.1**（1290 行，F21/M9 任务卡 + D-A~D-D，简称 **PRD**）<br>`docs/ux/group-chat-ux.md` **v3.3**（445 行，含 §4.2 任务卡片、P11/P12，简称 **UX**）<br>`docs/ux/prototype.md`（289 行）+ `docs/ux/prototype/01-tabs.png … 13-task-cards.png`（v3.3）<br>`tests/design/test-plan.md` §13（tester DOM 契约建议）+ `tests/design/prototype-review.md`<br>Figma 文档 `team-group` · Page `0:1`（**当前帧**：P1 `16:151` / P2 `16:239` / P4 `10:663` / P5 `17:436` / P6 `17:528` / P3 `25:1112` / P7 `10:1411` / P8 `17:703` / P9 `17:790` / **P10 `21:954`** / **P11 `25:1221`** / **P12 `29:1322`** / F0 `25:1170`，令牌板 `10:78`，组件库 `10:197`；旧帧已删除） |
| 下游消费者 | frontend / backend（实现拆分 §9）、tester（验收 §8.6）、Lead（决策记录见顶部） |
| 证据标记 | **[证据]** 直接读到代码/类型/日志/CSS/inspect 结果；**[推断]** 基于证据的推理；**[UNVERIFIED]** 未实测，实现期必须验证 |
| 写作用域 | 仅写 `docs/architecture/**`；未安装插件、未改配置、未写生产代码、未对 Figma 做写操作 |

---

## 决策记录 v1.6.1（两处视觉契约冲突裁定 · 数据/发送契约不变）

> 实现期发现两处视觉契约与真实 DSH/原型冲突，Lead 裁定如下；**只改 UI 契约，数据/发送契约不动**。

| # | 修正 | 冻结内容 | 落点 |
| --- | --- | --- | --- |
| V1.6.1-1 | **气泡圆角/内边距按发送者区分** | **用户气泡** `radius 20 / padding 10×16`（对齐真实 DSH 与 prototype.md §5），变量 **`--gc-user-bubble-radius: 20px`**；**agent / 系统 / 卡片消息气泡** `radius 12 / padding 10×14`，变量 **`--gc-bubble-radius: 12px`**。**不得再用单一 radius 值**；两个内边距变量分别为 `--gc-user-bubble-padding: 10px 16px` / `--gc-bubble-padding: 10px 14px`（实现落 `src/styles/group-chat.css`） | §6.7.2（并同步 §6.2、§6.5、§8.4 的表述） |
| V1.6.1-2 | **发送键配色修正** | 发送键改为 **`--dsw-alias-state-business-primary` 底 + `--dsw-alias-bg-base` 箭头**（蓝底深箭头）；hover 用同色 + 轻微透明度（opacity .9），**不再用** `--dsw-alias-button-primary-fill` / `--dsw-alias-label-primary-inverted`（原行作废） | §6.7.1 |

> **不变项**：§4 数据契约（含 task_card/member_card）、§5 发送契约、DOM 契约、其它令牌与尺寸完全不变。

---

## 决策记录 v1.6（任务卡片消息 `task_card`/M9 · 历史冻结）

> 依据：PRD v0.7.1（F21/M9 + 用户拍板「严格映射真实枚举、无 failed/返工」）+ `docs/research/task-card-fields.md`（TCF）+ UX v3.3 §4.2 + Figma P12 `29:1322`。**§4 既有消息语义与 §5 发送契约不变**，仅新增 `task_card` 类型与派生规则。

| # | 变更 | 冻结内容 | 落点 |
| --- | --- | --- | --- |
| V1.6-1 | **新增消息类型** | `kind:'task_card'`（M9），`sender = 操作者（actor）`；payload `TaskCardPayload{action,task{...},actionLabel,statusLabel,actor,time,dedupeKey,replay?}`。**谁改任务谁发话**：不新增系统卡、不伪造「任务机器人」 | §4.1、§4.2.2、§6.2、§6.5 |
| V1.6-2 | **操作者配对（四级回退）** | `team/task` 是 Lead 会话的整快照（无 actor/action/time）；按 **`(taskId, revision)`** 与操作者会话的 `tool/call`(`team_task_create`/`team_task_update`) + 同 `callId` 的 `tool/result` 精确配对 → 同 taskId 时间近邻（<1s）→ `ownerId` 反推 → 系统操作者；`ownEvents()` 过滤 fork/seeded；journal 先于 result 3–128ms，**不能按时间先后判断** | §4.2.2、§4.3.2 |
| V1.6-3 | **动作识别** | 首选 `tool/call.arguments.action`（create 取工具名）；缺失时按 revision diff（先判 status 跃迁，再判 owner，最后 edit）；歧义消解：claim 的 owner==actor、reassign 仅 lead 且 owner!=actor；release vs reassign-清空按 actor 是否原 owner | §4.2.2 |
| V1.6-4 | **状态/动作严格映射（用户拍板）** | 任务状态仅 **`pending / in_progress / completed / deleted`**，动作仅 **create/claim/complete/reopen/reassign/edit/set_dependencies/delete/release**；**平台无 failed → 不做失败卡、不出现「返工」「失败」字样**；`reopen` 显示「重新打开」+ 真实 `pending`（owner 已丢弃时「未指派」）；`delete` = 「取消」+ 已取消墓碑；`release` = 「放回」+ 待认领。**禁止伪造 failed**；本任务书草稿中的「reopen→返工」措辞按 PRD v0.7.1/用户裁决作废 | §4.2.2、§6.5、§6.9 |
| V1.6-5 | **UI 契约** | `TaskCardMessage = SenderLine(actor) + CardBody`（动作标签 11 + 状态 pill 20/999 + task id mono 11 + subject 14/600 + 描述：create 卡 2 行折叠、后续卡 1 行/隐藏 + 信息行（负责人/依赖/完成时间）+「复制任务 ID」文字链；宽 max 520、layer-1、border-l2、r12、p16；**不参与长文折叠**、无任务详情页）。状态 pill 只允许四枚举，颜色走 token | §6.2、§6.5、§6.7 |
| V1.6-6 | **去重/回放/帧/测试** | 去重键 **`${teamId}:${taskId}:${revision}`**（一条 revision 一张卡）；历史按 revision 升序回放；fork/seeded 过滤；DOM `data-kind=task_card` + `data-card=task` + `data-task-id/revision/action/status/owner/actor/blocked-by`（+ `data-replay`）；P12 `29:1322`（6 变体）+ P2 紧凑卡 `29:1454`；E34–E36、SC35–SC38 | §4.3.2、§6.5.2、§8、§8.6、§12.2 |

> **不变项**：§4 中 user/agent_to_agent/agent_output/system/delivery/member_card 的既有语义与去重；§5 canonical 前缀/lead 先/四态/重试/对账；数据/发送契约完全不变。

---

## 决策记录 v1.5（四项 Lead 裁决 + tester DOM 契约冻结 · 历史冻结）

> 依据：PRD v0.6.2（D-A~D-D）+ `tests/design/test-plan.md` §13 + UX v3.2（P11）。本版只补**可寻址/筛选/无团队发送/模型继承**四项口径与 **DOM 测试契约**，不改变 §4 数据模型与 §5 发送契约。

| # | 裁决/变更 | 冻结内容 | 落点 |
| --- | --- | --- | --- |
| V1.5-1 | **D-A @ 可寻址集合** | Lead **恒可寻址**；teammate **恒可寻址**（inactive 也能被 prompt 冷唤醒，S3 已证）；subagent **仅 running/provisioning** 出现在补全与可 @，`one-shot` 完成后不可寻址；`@all` 不支持。补全列表按此过滤；失效 chip 在发送前剔除并提示 | §5.1、§6.4 |
| V1.5-2 | **D-B 筛选语义** | 单选成员；命中 = `sender.name === 该成员` **或** `targets` 包含该成员；**不做正文文本搜索**；父成员筛选**包含其 subagent 消息**（子体归入父），选 subagent 只显示其自身消息（**不反向包含父**）；v1 不做多选/时间/类型组合；无匹配显示「该成员暂无消息」 | §6.4.4、§6.9、§8.3.2 E12/E32 |
| V1.5-3 | **D-C 无团队发送** | 单 agent 会话（无团队）**允许发送**：目标 = 当前会话（lead），走普通会话 `prompt`，产生该会话的普通用户消息；不出现多目标说明行；`@lead` 与默认等价；频道头无成员区/筛选 | §5.1、§7 R-01、§8.3.2 E31 |
| V1.5-4 | **D-D 模型继承文案** | 只显示模型名、不显示 provider 内部名；`spawn_teammate` → `{model}（继承 Lead）`；`subagent`/`subagent_fork` → `{model}（继承 {creator 名}）`（如 `（继承 ux）`）；无继承信息只显示模型名；整行缺省隐藏 | §6.5、§6.9、§8.6 SC32/SC33 |
| V1.5-5 | **DOM 契约冻结（tester §13 全量采纳）** | §6.5.2 冻结 `data-testid` / `data-*` / `role`：feed、time-divider、bubble、caption、unread-pill、newmessages-hint、filter-banner、readonly-banner、reconnect-banner、fold-toggle、mention-popup/option、composer/send、target-row、error、member card actions/fields 等；**实现不得改名**，新增需升版本并同步 test-plan | §6.5.2、§8、§8.6 |
| V1.5-6 | **P11 映射** | 只读历史 / 筛选态帧 = P11 `25:1221`（左栏只读、右栏筛选；任务书早期称 P11/P12，当时 UX 未拆第二帧）。**v1.6 更正：P12 已独立为任务卡帧 `29:1322`**。只读横幅 `当前为只读历史，不能发送` + 频道头 `· 团队已结束` + 输入 40% 禁用；筛选条 `正在只看 scout（n 条）· 清除` + 频道头 `· 筛选: scout` | §12.2、§6.4.4、§6.9 |

> **不变项**：§4 领域模型/游标/去重/排序、§5 发送契约（canonical 前缀、lead 先、四态、重试、对账）完全不变；`conversation.view` 仍无 tab 未读装饰。

---

## 决策记录 v1.4（入群消息 = creator SenderLine + 卡片 body + 欢迎提示 · 历史冻结）

> Lead/用户纠正：成员入群卡**不是一条独立的系统卡**，而是 **creator 发出的一条消息**（sender = 创建者），卡片是该消息的 body；另有前置的**右对齐欢迎系统提示（M4 ②）**。本版按 UX v3.1（task-28）+ 本任务修订 §4.2/§4.3/§6.2/§6.5/§6.7/§6.9/§8.6/§12.2；**§5 发送契约与 §4 既有消息语义不变**，仅调整 v1.3 新增的 member_card 结构与派生规则。

| # | 变更 | 冻结内容 | 落点 |
| --- | --- | --- | --- |
| V1.4-1 | **删除孤立卡片路径** | 不再存在「不属于任何消息的卡片」渲染分支：`member_card` **必须是 ChannelMessage**，`sender = creator`（spawn_teammate→lead；subagent/subagent_fork→调用方成员），`memberCard.member` 只描述**新成员**；卡片是这条消息的 body，视觉上从属于 creator 的 SenderLine。 | §4.1、§6.2、§6.5 |
| V1.4-2 | **一次创建 = 两条消息** | ① `kind:'system'` 的**欢迎提示**（M4 ②：右对齐 12/400 `state-business-primary`，文案 `欢迎 @{name} 加入群聊`）；② `kind:'member_card'` 的 **creator 带卡消息**（sender=creator，header 走统一 SenderLine：头像 32 + 名字 14/600 + 角色小标签 11「主 Agent」/「Teammate」+ 时间 11）。两条共享 `creationId`，`pairOrder` = 0（欢迎）/ 1（卡片）。 | §4.2、§4.2.1、§4.3.1 |
| V1.4-3 | **触发与排序/去重** | teammate 触发 `team/member phase==='active'`；subagent 触发 `subagent/catalog`（`childCreatedAt`）；**两条消息的 anchor time 相同**，欢迎在前、卡片在后（同 `creationId` 时先比 `pairOrder` 再比 `sessionRank/seq`）。去重 id：欢迎 `mc:<memberSessionId>:welcome`、卡片 `mc:<memberSessionId>`；fork/seeded 继承前缀过滤 + id 去重；历史回放同规则；成员重建（新 session）算新成员。 | §4.2.1、§4.3.1、§4.3.2 |
| V1.4-4 | **卡片 body 结构** | 卡片 body 不再含头像/名字/时间（这些在 creator SenderLine）：标题 `「@{name}」加入群聊` 13/500、描述 12/19、label+value 信息行（模型/上下文/父成员/创建方式）、初始任务 2 行 + 展开、文字动作（查看会话；查看任务仅 teammate）。卡片不参与长文折叠；不新增弹窗/大图/动效。 | §6.2、§6.5、§6.7 |
| V1.4-5 | **模型/上下文口径** | 按 UX v3.1：模型**只显示模型名**（如 `deepseek-flash`），继承时 `{model}（继承 {parent}）`；provider 内部名不直出。上下文按工具名：`spawn_teammate fresh`→「全新上下文（fresh）」、`fork`→「继承 Lead 已完成回合（fork）」、`subagent`→「全新上下文（subagent）」、`subagent_fork`→「继承父会话（subagent_fork）」；`descriptor.mode=one-shot` 追加「· 一次性（one-shot）」。 | §4.2.1、§6.7、§6.9 |
| V1.4-6 | **动作与测试/帧** | 动作不变（`uiWorkspace.openSession` 主路径 + 复制 ID 降级；无权限禁用）。E28–E30、fixture 16 改为「1 次创建 = 2 条消息」断言；§8.6 SC32–SC34 同步；P10 重建为 `21:954`（变体 `21:966`/`21:989`），P2 卡片节点 `21:1027`、reaction `21:1039`。 | §8、§8.6、§12.2 |

> **不变项**：§5 前缀/发送顺序/四态/重试/对账，§4 中 user/agent_to_agent/agent_output/system（默认居中）/delivery 的既有语义与去重规则；`data-kind` / `data-status` / `data-message-id` / `data-member-kind` / `data-parent` 测试契约保持。

---

## 决策记录 v1.3（成员加入卡片 `member_card` · 历史冻结）

> Lead 决策：新增「成员加入卡片」消息类型（PRD v0.5 编号 **M8**；UX 文档仍标 M7，同一类型），跟随「<创建者> 拉了 @<成员> 进群」系统提示。**本版只新增消息类型/字段与 UI/测试，§5 发送契约与 §4 既有消息语义完全不变**；数据来源以 `docs/research/member-card-fields.md`（task-20）为准。

| # | 变更 | 冻结内容 | 落点 |
| --- | --- | --- | --- |
| V1.3-1 | **新增消息类型** | 选**新增 `kind:'member_card'`**（不是 system 子类型）：需要独立的卡片渲染器、动作（查看会话/查看任务/展开初始任务）、DOM 契约（PRD 证据口径 `data-card="member-join"` + `data-member-id`；同时保留 `data-testid="member-join-card"`）与去重键（memberSessionId）；system 仍只承载纯文本提示行。字段见 §4.1 `MemberCardPayload`（creator/member/time/actions） | §4.1、§4.2、§6.2、§6.5 |
| V1.3-2 | **字段来源与回退** | 优先级：① 创建方 `tool/result.member` 快照（teammate 含 model）+ `tool/call.arguments`；② 子会话 `subagent/descriptor`（冷读唯一真相，subagent model 首选）；③ Lead `team/member`（入群触发）；④ `subagent/catalog`；⑤ 会话 header。**model 回退链**：`descriptor.agentModel` → `result.member.model` → 成员视图当前 model → 隐藏该行；**provider 内部名（spawn/fork）不直出**，上下文策略由 `context`/工具名推导为 i18n 文案 | §4.2.1、§6.7、§6.9 |
| V1.3-3 | **触发、去重与历史** | teammate 触发 = `team/member` 且 `phase==='active'`（等 active 再渲染，避免闪「创建中」）；subagent 触发 = `subagent/catalog`（sessionId=childId）；`tool/call`+`tool/result` 为主数据源。去重主键 **`mc:<memberSessionId>`**（兜底 `mc:<callId>`）；fork/seeded 会话只吃 own 持久事件（§4.3 已丢弃继承前缀）并按键去重，同一次创建只出 1 张卡；历史会话照常回放 | §4.2、§4.3.2、§4.2.1 |
| V1.3-4 | **UI 契约** | 紧跟系统提示插入 `MemberJoinCard`（左对齐、max-width 520、`bg-layer-1`、`border-l2`、radius 12、padding 16；头像 40/radius 10；头部名 14/600 + 角色小字 11 + 右侧时间 11；标题 `「@name」加入群聊` 13/500；描述 12/19，空则「暂无角色描述」；label+value 信息行；初始任务 11/17 两行截断 +「展开」；动作仅文字链接）。**卡片不参与长文折叠**，空值隐藏行而非留空 | §6.2、§6.5、§6.7、§6.9 |
| V1.3-5 | **动作「查看会话」** | 精确 API：客户端 Cordis 服务 **`uiWorkspace.openSession(target: SessionTarget): void`**（`ctx.get('uiWorkspace')`；`SessionTarget = SessionId \| SubagentAddress`，见 §6.5.1）。降级：`uiWorkspace` 不可用/抛错 → Toast「无法直接跳转，已复制会话 ID」并写剪贴板；无读权限 → 动作禁用 + 提示；`openView(view,focus)` **只切当前会话视图，不能跨会话**，不可作为主路径 | §6.5.1、§11 RK9 |
| V1.3-6 | **测试/追溯/帧** | 新增 E28–E30、F20/SC32–SC34（PRD v0.5 编号，落盘后核对）、P10 `19:855` + P2 `16:239`；fixture `16-member-card.jsonl` | §8、§8.6、§12.2 |

> **不变项**：§5 前缀 canonical / 发送顺序 / 四态 / 重试 / 对账，以及 §4 既有消息类型（user/agent_to_agent/agent_output/system/delivery）的语义与去重规则。PRD v0.5 若新增 F20/SC32–SC34 编号，与本记录一一对齐。

---

## 决策记录 v1.2（UI 契约对齐「钉钉式气泡流」· 历史冻结）

> Lead 决策：UX 已把原型重做为气泡流（v2，旧帧删除）。**本版只改 UI 契约（§6 + §12.2），数据契约 §4 与发送契约 §5 完全不变**；实现以本版 §6 为准。
> 原则：去掉一切不传递信息的装饰——不再有角色徽标、每行时间戳、「→ 发送给」chip 行、FinalTag、绿色勾药丸、系统药丸、subagent 缩进连接线。

| # | 变更 | 冻结内容 | 落点 |
| --- | --- | --- | --- |
| V1.2-1 | **组件树去装饰** | 删除 `MessageHeader` 内的 RoleBadge / 「→ 发送给 @x」chips / 行内时间 / FinalTag；改为 **SenderLine**（头像 + 名字 14/500 + 11px 状态）、自适应 **Bubble**（max-width 600 / 窄屏 70%、radius 12、padding 10×14、正文 14/22）、居中 **TimeDivider**（日期变化或间隔 ≥5 分钟）、**BubbleCaption**（气泡下 11px：同发说明/发送态）、**CollapsedNote**（居中系统提示 11.5px）、**ToolCollapseLine**（11px 单行文本链接） | §6.2、§6.5 |
| V1.2-2 | **消息渲染映射** | M2 的 `@目标` **内联正文首行**（`state-business-primary`）；M3 最终输出 = **普通气泡**（无徽标）；M1 = 右对齐气泡 + 气泡下 caption；subagent = 名字后缀 **`· <父> 的子体`**（11px caption），**无缩进、无连接线** | §6.5 |
| V1.2-3 | **令牌表** | 删除角色徽标 Pill / 头像栈 / @chip / FinalTag / 连接线行；补充气泡 bg（他人 `bg-layer-2`、自己 `bg-layer-3`）、caption 字色、TimeDivider 字色、失败红边等实际 token | §6.7 |
| V1.2-4 | **窄屏** | 频道头改为**群头像 + 成员数文本**（`8 名成员 · 3 个运行中`）；删除「头像栈收起为 成员 N ▾」逻辑；消息列 720 流式、气泡 max-width 70% | §6.8 |
| V1.2-5 | **i18n** | 删除 badge/chip 文案 key；新增 caption/time/status 文案 key（`msg.deliveredTo`、`msg.partialDelivered`、`time.today`、`status.running/done/failed`、`member.subagentOf`、`channel.membersRunning` 等） | §6.9 |
| V1.2-6 | **Figma 帧映射** | 更新为新帧 ID（P1 `16:151` / P2 `16:239` / P4 `10:663` / P5 `17:436` / P6 `17:528` / P7 `10:1411` / P8 `17:703` / P9 `17:790` / F0 `10:1126`）；旧帧（10:226/10:409/10:585/10:792/10:922/10:1180/10:1281）已删除 | §12.2 |

> **不变项**：§4 领域模型 / 游标 / 去重 / 排序 / 数据范围，§5 前缀 canonical / 发送顺序 / 四态 / 重试 / 对账，全部维持 v1.1 冻结内容。UI 简化不得改变 `data-kind` / `data-status` / `data-message-id` / `data-member-kind` / `data-parent` 等测试契约。

---

## 决策记录 v1.1（Lead 已批准 · 历史冻结）

> 以下 8 条为 Lead 于 2026-10-28 批准并冻结的决策，**优先于本文 v1.0 的对应描述**；正文相关章节已按此更新，实现与验收以此为准。

| # | 决策 | 冻结内容 | 正文落点 |
| --- | --- | --- | --- |
| V1.1-1 | **同发前缀 canonical** | 首行 `[群聊 · 同发] 收件人：@lead、@ux、@backend`（全角「：」与「、」，`@lead` 必含，仅 N≥2 注入）；第二行固定说明 `（本消息由用户在「群聊」视图同时发送给上述 N 位成员，各成员各自收到一份。）`（N 为整数实发目标数）；**protocol.js 单点常量**，任何文本调整只改这一处 + 快照测试 | §5.2、§4.4、§8.6 SC27 |
| V1.1-2 | **新增「部分失败 partial」态** | 发送状态由三态扩展为四态：`sending / sent / partial / failed`；`partial` 展示「已送达 X/Y」并列出失败目标；重试**只补失败项**，成功项不重发，气泡始终 1 条 | §4.1、§5.3、§5.4、§5.5、§6.4–§6.5、§8.6 SC30 |
| V1.1-3 | **数据范围与截断** | 纳入 lead **全部后代**；深度 ≤ **3**、会话上限 **32**；subagent 显示父归属（v1.1 括号式 `<label>（<父名> 的子体）`，**v1.2 起改为后缀式 `· <父名> 的子体`**，见 V1.2-2）；超限按「先保 lead+全部 teammate，再按 depth 升序、创建时间倒序补 subagent」截断，并在频道头与消息流顶部提示「已省略 N 个深层子会话」 | §4.1、§4.8.2、§6.2、§7 R-17 |
| V1.1-4 | **v2 Host 路由不排期** | 默认不实现；**Spike S1 已通过（entries 是原始事件）→ v2 确定不启用**。仅当未来出现同等证据等级的「S1 类失败」（客户端拿不到 `type+seq+data`）时，才重新评估本接口 | §3.3、§4.7、§1.1 |
| V1.1-5 | **D9 未读降级** | v1 **不做 tab 5px 圆点**（`conversation.view` 无装饰位）；改为消息区「↓ N 条新消息」浮标 + 频道头「N 条新消息」提示；进入视图即清零 | §6.1、§6.2、§6.4.1、§8.6 SC21 |
| V1.1-6 | **SC9/SC10 证据口径** | 改为「同一 `clientBatchId` + N 个目标 `requestId` + 群聊仅 1 条气泡 + N 条投递记录」；不再要求跨目标同一 messageId（物理不存在） | §4.4、§8.6 |
| V1.1-7 | **e2e 执行方式（S6 后为双轨）** | **有已鉴权 GUI URL → Playwright 为主**（页面内交互/断言）；**无 token → open-computer-use MCP 操作 DSH Desktop 真实窗口为主路径**（每步 `get_app_state` 复核 + 截图留证）；open-computer-use 同时作为兜底冒烟。两种方式都不写入生产会话，限测试 workspace | §8.1、§8.3、§8.6、§11 |
| V1.1-8 | **文档定位** | 本文 v1.1 是 T1/T2/T3 三条实现任务的**唯一契约源**；与 PRD/UX 冲突时以本文决策记录为准，并在 §13 记录变更 | 全文、§13 |

> 与 `docs/specs/group-chat-prd.md` **v0.2** 的两处已知差异（等 PRD v0.3 同步）：
> ① PRD v0.2 §F8/SC9/SC27 的前缀写作 `[群聊 · 同发] 收件人: @lead @X @Y`（ASCII 冒号 + 空格分隔）；v1.1 按 Lead 决策改为全角「：」「、」形式。
> ② PRD v0.2 §F9/§6.5 仍写「仅三态」；v1.1 按 Lead 决策扩展为四态（新增 `partial`）。
> 两处都由 `src/core/protocol.js` / `src/send/delivery.js` 的单点常量承载，PRD v0.3 落盘后只需核对常量与快照测试，不改变本文架构。

### Spike 结论增补（S1–S6，依据 `docs/research/spikes-v1.md`，2026-10-28，最后一批契约修订）

| Spike | 取证结论（已实测） | 对本文的契约修订 | 落点 |
| --- | --- | --- | --- |
| S1 | `eventSource.entries` 元素为 `{ type:'event'\|'transient', event:{ type,seq,time,data, ignorable?, surfaceOp?, sourceEventSeqs? } }`，**是原始事件**；`type==='transient'` 是流式行，其 `seq` 为**小数**（`durableCursor+1-1/(n+1)`）；`SessionWireEvent` 字段封闭为 7 个；窗口变更 `change.kind ∈ {replace, prepend, append, settle-assistant}` | **v1 纯 Client 成立，不启用 v2 Host**；内核只消费 `entry.type==='event'` 的持久事件，丢弃 transient；**禁止对 `seq` 做整数断言/整数运算**；只读 7 个白名单字段 | §1.1 S1、§4.2、§4.3、§4.6、§7 R-14 |
| S2 | `requestId` 原样落 `user/message.data.source.rpcId`（普通会话与子会话两条路径均成立）；Host `hasPromptRequest` 用同一 rpcId 做**幂等去重**（inbox + 已落库日志）；`remote.subagents.prompt` 还返回 `{messageId}`（= `user/message.data.id`）可作双保险 | **对账升级为「rpcId 精确对账 + messageId 双保险 + 弱对账兜底」**；**重试复用同一 requestId 安全**，Host 不会双投；成功目标永不重发；重试 ≤2 次 + 退避 | §1.1 S2、§5.3、§5.4、§5.5 |
| S3 | `queue` 与 `steer` **都会唤醒** inactive/冷目标（区别仅在 inbox 落点：`next-turn` vs `next-step`）；只有 `inject` 不唤醒；**`subagents.prompt` 要求父 Agent 在线**，否则报 `subagent/parent-unavailable`；`sessions.list.byId[*].agentAvailable` 可作弱信号 | **新增硬约束：群发顺序必须「先 lead（顺带 resume 父链）→ 再成员」，禁止并行乱序**；错误矩阵新增 `subagent/parent-unavailable`；`steer` 语义按 PRD 冻结（最近 step 边界插入，UI 文案不得写「下一轮」） | §1.1 S3、§5.3、§5.4、§5.5 |
| S4 | tab 只渲染 label 文本（`<span class="tabLabel">` + Tooltip），**无 icon/badge 装饰位**；label thunk 只在 tab 行重新投影时重读，**不响应外部 store 变化** | **D9 未读保持降级**：不做 tab 圆点，改消息区浮标 + 频道头提示（V1.1-5 已定，现由 S4 证实）；label 内不要放动态状态 | §1.1 S4、§6.1、§6.2、§8.6 SC21 |
| S5 | 纯 client bundle 合法；最小 Host 半（官方同位先例）为 `/** Host plugin body */ function apply() {} export { apply }`；`main`→Host 半、`exports['./client']`→浏览器半，缺一报错 | 保留空壳 Host 半，`apply()` 不注册任何东西，运行成本≈0；**删除 v1.0 的「是否允许纯 client」UNVERIFIED** | §3.5、§3.6、§1.1 S5 |
| S6 | open-computer-use 可操作运行中的 DSH Desktop（`com.deepseek.dsh`），但 AX 可能稀疏、有真实副作用、不能进 CI | e2e 双轨：**有已鉴权 GUI URL → Playwright 为主**；**无 token → open-computer-use 为主路径**；open-computer-use 也作兜底冒烟；限测试 workspace、每步 `get_app_state` 复核、截图留证 | §8.3.1、§8.6、§11 RK8 |

> 以上 6 条为**最后一批契约修订**（Lead 已确认）；`docs/research/spikes-v1.md` 为证据源。S1 通过意味着 v2 Host 读接口**确定不实现**（除非未来出现新的 S1 类失败证据）。

---

## 0. 阅读前必读

### 0.1 结论一句话

**v1 用「纯 Client 插件」落地**：注册 `conversation.view`（`id=group-chat, order=5`），在浏览器内用 `ctx.sessions.retain(id)` → `SessionReference.binding.eventSource` 增量读取 lead + teammate + subagent 会话事件，用一份**纯函数内核**把事件归一化成群聊消息（去重/合并/排序/分页），发送走 `binding.session.prompt(..., 'steer', ...)` 逐目标 fan-out + 两行同发前缀（首行 canonical `[群聊 · 同发] 收件人：@lead、…`，第二行固定说明）；**不写 Host 业务代码**即可满足 PRD F1–F19 与 UX 全部主路径（仅保留一个无逻辑的空壳 Host 半以满足 bundle 入口约定，§3.5）。Host 侧**不实现 v2 读接口**（Spike S1 已通过，v2 失去唯一启用理由，V1.1-4）；只有未来出现「S1 类失败」新证据才重新评估。**v1.2 只改 UI 契约**（气泡流：去徽标/chip/行内时间/subagent 缩进，§6），§4 数据契约与 §5 发送契约完全不变。v1.0 遗留的两个平台能力冲突已由 Lead 决策关闭：D9 未读改为浮标+频道头提示（V1.1-5，Spike S4 证实 tab 无装饰位）、SC9/SC10 证据口径改为 clientBatchId（V1.1-6）；D2 投递身份由 UX 修订为「用户消息 + 前缀」。**Spike S1 已实测通过**（entries 是原始事件信封），v1 纯 Client 方案定型、v2 不启用；S2/S3 的结论已把发送对账升级为 rpcId 精确对账，并新增「先 lead 后成员」的发送顺序硬约束（见顶部 Spike 结论增补）。

### 0.2 五条不可动摇的架构结论

1. **数据面 = 每会话事件流，不是 ChatNode**。群聊消息必须由原始会话事件（`user/message`、`assistant/message`、`agent/inbox/spliced`、`subagent-settled` 等）投影，不能复用 `conversation.chat.node` 的 ChatNode（EVT §8：ChatNode 把 peer 消息塞进 `steering`、subagent 结算塞进 `context`，会丢 sender/targets/isFinal 语义）。
2. **排序键只能是 `(time, sessionRank, seq)`**；`seq` 仅会话内单调，`createdAt` 是 fork 时刻不能当事件时间（EVT §7.1）。
3. **发送只有一条通路**：`binding(targetId).session.prompt([{type:'text',text}], mode, signal, requestId)`。它内部自动分流普通会话 / 子会话（API §C2）；`agentTeams.sendMessage` **不是 @Remote**，浏览器调不到（API §C3）。
4. **一次「同发」= N 次独立 prompt，不是事务**（API R1）。因此 UI 必须按目标呈现交付状态（四态，含 `partial`）、只重试失败目标、并用「同一份文本 + 两行接收方前缀」把多目标语义**写进正文**（API §C4 / UX D2 / 决策 V1.1-1、V1.1-2）。
5. **样本数据放大必须从架构上封顶**：成员数上限、每会话事件窗口上限、内存消息上限、文本上限、订阅数上限；否则长任务会把浏览器拖死（API R3 / PRD N1）。

### 0.3 与上游文档的版本关系（务必先看）

- **PRD 已更新到 v0.2**（1043 行，新增 F19 同发协议 + SC27–SC31，简称 **PRD**）。本 v1.1 已核对：PRD §4.3 事件映射与本文 §4.2 一致；PRD §7 新增的部分失败/数据量条目已吸收（V1.1-2/V1.1-3）；PRD 新增的 F19/SC27–SC31 已并入本文 §8.6 追溯表。
- **PRD v0.3 预计同步两处**（v1.1 先按 Lead 决策冻结，均落在单点常量）：① 前缀 canonical 由 v0.2 的 `收件人: @lead @X @Y`（ASCII 冒号 + 空格分隔）改为 v1.1 的全角 `收件人：@lead、@ux、@backend`；② 发送状态由 v0.2 的「仅三态」扩展为四态（新增 `partial`）。**v1.1 与 v0.3 冲突时以本文决策记录为准**（V1.1-8）。
- **UX 文档与 Figma 原型帧的一致性**：本文写作时 `docs/ux/group-chat-ux.md` v1.0 与 `prototype.md` v1.0 已落盘，导出的 10 张 PNG 与 Figma 帧一一对应（`prototype.md` §1）。本文 §6.7/§6.8 的令牌与尺寸以 **UX §11 + 实际构建 CSS 复核**为准，并修正了 UX §11 中 3 类不存在的令牌（见 §6.7.3）。
- **Spike 已落盘并吸收**：`docs/research/spikes-v1.md`（S1–S6，445 行）已出结论，本文顶部的「Spike 结论增补」与 §1.1/§4.2/§4.6/§5.3/§5.5/§8.3 已按实测结果更新；**S1 通过 → v1 纯 Client 定型、v2 不启用**。
- **UX v1.0 写作期间的修订（重要）**：architect 写作期间 ux 于 2026-10-28 12:07 更新了 UX 文档，**D2 已从「以 lead 名义的 peer 消息」改为「以用户消息身份投递 + `[群聊 · 同发]` 收件人前缀」**。本文 §5.2 的投递协议、§5.6 的 v2 peer 备选、§10 的 D-ARCH-01 均已按**最新版 D2** 对齐（旧的「D2 与平台能力冲突」已消解，保留 v2 peer 作为未来增强，不进入 v1 范围）。

---

## 1. 架构摘要（可直接作为实现 checklist）

1. **形态**：本地 DSH plugin bundle（`dsh-group-chat`），v1 的**业务代码只在 client half**（`lib/client.js`）；另有一个空壳 Host 半 `lib/index.js`（无逻辑，仅为满足 bundle patch 的 main 入口，§3.5）；`dsh.client.platform="web"`，`dsh.bundle.patch` 指向 `cordis.patch.yml`。
2. **挂载**：`conversation.view` 注册 `{id:'group-chat', order:5, label:()=>t('view.tab'), locale:'group-chat'}`；不覆盖 `chat(0)/trajectory(10)/context(20)/terminal-panel(30)/fleet(30)/capability(40)` 任何一个已占用 id（API §A4）。**label 保持纯文本，不做未读圆点**（V1.1-5）。
3. **通道身份**：频道 id = **lead sessionId**（推导：`binding(sessionId).session.getSnapshot().subagent?.address?.parentSessionId ?? sessionId`，API §B2）；一个会话 = 一个频道（UX D10）。
4. **成员目录**：`roster = useSessions(s => s.projectionsBySession[lead]?.values.agentTeam)` 为主，`sessions.list.byId[*].parentSessionId` 补 direct children，`subagent/catalog` 事件补 subagent 目录；三者取并集、按 `sessionId` 去重（§4.8.2）。范围 = **lead 全部后代，深度 ≤3、会话 ≤32**，超限按 V1.1-3 截断并提示。
5. **消息面**：每成员 `retain(memberId, {source:'group-chat'})` → 订阅 `binding.eventSource`（`SessionEventWindow{entries,hasMore,revision,change}`）；内核 `normalize(events, memberCtx)` → `ChannelMessage[]`，三层去重 + `(time,sessionRank,seq)` 排序，增量按「每会话已消费 seq + window revision」推进；上滚可用 `loadOlder()/loadThrough(seq)` 扩窗后重算。
6. **消息类型（六类）**：`user(M1)`、`agent_to_agent(M2)`、`agent_output(M3)`、`system(M4)`、`delivery(M5)`、`member_card(M8，UX 文档 M7)`；DOM `data-kind` 用 PRD SC3 规定的 `user/agent_to_agent/agent_output` 字面量，系统/交付用 `system/delivery`；**v1.3 新增 `member_card`（M8 成员加入消息，v1.4 起 = creator SenderLine + 卡片 body，前置欢迎系统提示；独立渲染/动作/去重键）**。**v1.2 起 UI 统一为气泡流**（无徽标/chip 行/行内时间，见 §6.2/§6.5），既有数据契约不变。
7. **发送**：解析 `@` → `targets = 去重(['lead', ...mentions])`；对每个 target 生成独立 `requestId` 调用 `prompt(text, 'steer', signal, requestId)`（PRD §6.1/§6.3 冻结：全部目标用 `steer`，排队到最近 step 边界、不打断）；`targets.length>1` 时正文前置**两行 canonical 前缀**（V1.1-1）；UI 只渲染一条用户气泡（lead 侧副本），其余副本只作为交付证据（§5.3）。
8. **投递状态四态**：`sending / sent / partial / failed`；`partial` 显示「已送达 X/Y」，失败清单可展开，重试只补失败目标、成功目标不重发（V1.1-2）。
9. **同发合并**：不用 messageId（物理上不存在跨目标同 id，EVT §5.3/陷阱 2），而用「**客户端 batchId + 每目标 requestId**」关联；群聊 feed 中非 lead 副本按前缀识别后折叠为 `deliveries`；SC9/SC10 证据口径按 V1.1-6 冻结（clientBatchId + N 个 requestId + 1 条气泡）。
10. **性能**：首屏 200 条、上滚每页 50、内存上限 2000 条、会话数上限 32、单条文本渲染上限 64KB（超出按需展开/截断）、`@tanstack/react-virtual` 虚拟化（该模块在客户端模块注册表内，§6.3.1）、Markdown 仅对可视行渲染。
11. **主题**：颜色只用 `--dsw-alias-* / --dsw-specific-*`（暗色由 `body[data-ds-dark-theme]` 切换，[证据] 构建 CSS）；UX §11 中的 `--dsw-radius-xs/sm/md/xl/panel`、`--ds-font-family-code` **在构建中不存在**，改为插件本地常量/既有字体令牌（§6.7.3）。
12. **可测性**：内核 100% 纯函数（无 DOM/无 Cordis），用 EVT 的真实事件样例做 fixture；适配器可替换（`ChannelSource` 接口）→ v1 客户端实现 / 测试 Mock（v2 HTTP 实现仅在出现 S1 类失败时启用）。
13. **实施拆分**：**T1 数据内核 / T2 视图与壳（含脚手架与拼接构建） / T3 发送与命令** 三条可并行写，写作用域互不重叠（§9）；集成与 QA 各一轮，不占并行任务；v2 Host 不排期（V1.1-4）。

### 1.1 Spike 清单（S1–S6 全部出结论；无阻塞）

| # | 结论（`spikes-v1.md`） | 对实现的动作 |
| --- | --- | --- |
| S1 | **通过**：`entries` 是 `{type:'event'\|'transient', event:{type,seq,time,data,...}}` 的原始事件信封；transient 的 seq 为小数 | v1 纯 Client 定型，**v2 不启用**；内核只消费 `type==='event'`；禁止整数 seq 断言（§4.2/§4.3/§4.6） |
| S2 | **通过**：prompt 的 `requestId` 原样落 `user/message.source.rpcId`，Host 按 rpcId 幂等去重；子会话另有 `{messageId}` | 对账升级为 `rpcId` 精确对账 + messageId 双保险 + 弱对账兜底；**重试复用同一 requestId 安全**，≤2 次（§5.3/§5.4） |
| S3 | **通过（含新硬约束）**：`queue`/`steer` 都唤醒（仅 `inject` 不唤醒）；`subagents.prompt` 要求父 Agent 在线，否则 `subagent/parent-unavailable` | **发送顺序固定「先 lead → 再成员」、串行不并行**；错误矩阵加 `parent-unavailable`；mode 按 PRD 冻结 `steer`（§5.3/§5.5/§7 R-18） |
| S4 | **通过**：tab 只渲染 label 文本，无装饰位；label thunk 不响应外部 store | 不做 tab 未读圆点；改消息浮标 + 频道头提示（V1.1-5；§6.1/§6.2） |
| S5 | **通过**：纯 client bundle 合法；最小 Host 半 = `function apply() {} export { apply }` | 保留空壳 Host 半；`main` + `exports['./client']` 缺一报错（§3.5） |
| S6 | **通过**：open-computer-use 可操作 DSH Desktop；AX 可能稀疏、有真实副作用、不能进 CI | e2e 双轨：有 token → Playwright；无 token → open-computer-use（§8.3.1） |

---

## 2. 范围、约束与非目标

### 2.1 范围（In scope）

- 对话页新增「群聊」并列视图，聚合 **lead 主会话 + 全部 teammate 会话 + 全部 subagent 子会话**（UX D10 / PRD A1）。
- 消息：用户发言（含群聊内新发送）、agent→agent（`@target` 表达）、每 agent 每轮最终输出、系统提示、交付说明、工具过程折叠条（UX §4 M1–M6）。
- 交互：tab 切换、频道头、成员筛选、长文本折叠、`@` 补全、多目标同发 + 接收方清单、发送中/成功/失败与重试、只读历史、空/加载/错误态、窄屏（UX §2–§9）。
- 发送：默认 Lead；`@` 一个或多个 = Lead + 被 @ 成员同发（UX D1–D4）。

### 2.2 约束（Hard constraints）

| # | 约束 | 依据 |
| --- | --- | --- |
| C1 | 不改 DSH 本体、不注册既有 view id、不替换 composer | API §F「明确不做」 |
| C2 | 浏览器侧只能读「本 profile 内会话」且以用户既有权限为界；不得越权遍历其它工作区会话 | PRD §7.13；§4.9 |
| C3 | 不新增 Host 依赖即可交付 v1（Host 重启 + 页面刷新成本高，API §D5） | API §D5 |
| C4 | 只依赖相对稳定的面：`conversation.view` slot、`ISessions/ISession`、`remote.session/subagents`；Team 相关包是 experimental，一律做存在性判断 | API R5 |
| C5 | 视觉只用主题 token；禁止硬编码品牌色 | PRD N4 / UX §11 |
| C6 | 原型经用户确认前不写生产代码 | PRD §9 |
| C7 | 不改 `conversation.chat.node` 的既有注册；群聊自建渲染 | EVT §8 |

### 2.3 非目标（v1 明确不做）

语音/图片消息发送、reaction、编辑撤回、线程回复、`@all`、跨团队聚合、服务端事件总线改造、消息已读回执、自动重试、成员管理（邀请/移除）UI、群聊内改模型/权限、第三方插件在群聊里注册自定义消息类型（预留扩展点但不实现）。

---

## 3. 总体架构

### 3.1 设计原则

1. **单内核、双适配**：归一化/合并/分页/发送编排全部放在 `src/core`（纯 JS、无 DOM/Node API），client 适配器与未来 host 路由共用同一内核，避免两端算法漂移。
2. **传输可替换**：UI 只依赖 `ChannelSource` 接口（§4.6），v1 用 `ClientSessionSource`，v2 用 `HttpChannelSource`，测试用 `MockSource`。
3. **乐观 UI 与权威事件分离**：本地 echo 用 `clientBatchId` 标识，权威事件到达后按键替换；任何情况下不重复渲染。
4. **降级优先**：任一元数据缺失（`agentTeam` 投影不存在、成员不可寻址、子会话离线）都必须退化为「可读的历史 + 可用的输入区」，不白屏（PRD F12/N9）。
5. **数据放大有硬上限**：所有循环（成员、会话、事件、消息、文本）都有常量上限并集中在一个 `limits` 模块内，便于压测与调参。

### 3.2 逻辑架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DSH Web GUI（浏览器，已有页面）                                              │
│                                                                             │
│  conversation.view slot                                                     │
│  └─ GroupChatView (props: 18 standardProps + 4 ownerProps)                  │
│     ├─ ChannelHeader / MemberFilter / ReadonlyBanner                        │
│     ├─ MessageFeed（虚拟化 + 分组 + 折叠）  ← UI 层（T2）                    │
│     ├─ Composer（@ 补全 / 目标 chips / 发送）                                │
│     └─ GroupChatStore（snapshot store / useSyncExternalStore）               │
│           │                                                                 │
│           ▼                                                                 │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │ src/core（纯函数内核，T1）                                     │          │
│  │  normalizeEvents()  dedupe()  mergeFanout()  sortTimeline()    │          │
│  │  paginate()  ChannelCursor  protocol(prefix/parse)  limits     │          │
│  └───────────────────────────────────────────────────────────────┘          │
│           ▲                                    ▲                            │
│  ┌────────┴──────────────┐          ┌──────────┴───────────────────────┐    │
│  │ ClientSessionSource   │          │ HttpChannelSource（v2 可选）      │    │
│  │ ctx.sessions.retain() │          │ POST /api/group-chat/channel     │    │
│  │ binding.eventSource   │          │ (同契约，见 §4.7)                 │    │
│  │ useSessions(agentTeam)│          └──────────┬───────────────────────┘    │
│  └────────┬──────────────┘                     │                            │
└───────────┼────────────────────────────────────┼────────────────────────────┘
            │ Cordis client services             │ HTTP（同源、相对路径）
┌───────────▼────────────────────────────────────▼────────────────────────────┐
│ DSH Host（Node / Cordis，v1 不新增代码）                                     │
│  sessions / sessionQuery / sessionProjections / agents / agentTeams /       │
│  subagents / sessionController / connection.fetch（v2 路由挂载点）            │
│  Session 日志（session.v4.jsonl.zstd）← 唯一权威状态                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Host / Client 分工与 v1/v2 决策

| 能力 | v1（必做） | v2（不启用；仅 S1 类失败时备用） | 决策依据 |
| --- | --- | --- | --- |
| 成员目录 | Client：`projectionsBySession[lead].values.agentTeam` + `sessions.list` + `subagent/catalog` | Host：`agentTeams.listMembers(liveLeadAgent)` + `subagents.listDescendants(lead)` | v1 已有 wire projection，零 Host 代码（API §B2/B4、C5-3） |
| 事件读取 | Client：`retain(memberId,{source})` → `binding.eventSource` 增量窗口 | Host：`sessionQuery.observeSession(id,{projectionMode:'none'})` → 内核归一化 → 只回增量 | v1 每会话一条订阅；Spike S1 已确认 entries 为原始事件 → v2 读取路径不启用 |
| 归一化/去重/排序 | Client 内核 | 同内核（Host 侧复用同一份纯模块） | 单内核原则 |
| 发送 | Client：`binding.prompt(...)`（自动分流普通/子会话） | **保持 Client**（不在 v2 搬 Host） | `agentTeams.sendMessage` 无 @Remote（API §C3）；Host 侧 prompt 的 requestId/因果语义需另做 spike（§5.6） |
| 截断/摘要 | Client 截断（64KB/条） | Host 侧 head/middle/tail 截断 + `truncated` 标记 | 大文本时才需要 |
| 权限 | 复用用户对会话的既有访问权 + 成员必须在 lead 谱系内 | 同源 peer 准入 + `cwd` 相等 + 谱系校验（§4.9） | PRD §7.13 |
| 离线/断线 | `eventSource` 重订阅 + `refreshProjections` 兜底 | 轮询 `sync` 兜底 | N9 |

**v1/v2 判定线**（Lead 决策 V1.1-4）：只要「1 个 lead + 1 个 teammate 能出合并时间线」在真机验证通过，就走完整 v1；否则先上「降级 A：仅 lead 会话派生」。**v2 读接口不排期、不实现**：Spike S1 已通过（`entries` 是原始事件），唯一理论启用条件是未来出现**S1 类失败**（客户端拿不到 `type+seq+data`）。v1.0 曾列出的性能理由（首屏 P95、冷会话、大文本）**不再触发 v2**：这些场景优先用 v1 的截断/分页/上限策略解决；若实测量级超出预算，另立性能专项而不是启用 v2。

### 3.4 目录结构（插件 bundle）

```
plugins/dsh-group-chat/
├── package.json                 # dsh.bundle.patch / dsh.client(platform,inject) / engines / exports
├── cordis.patch.yml             # bundle patch：insert 一行（v1 只装 client half）
├── icon.svg                     # 市场/设置页展示（API §D2）
├── README.md                    # 安装、能力边界、已知限制
├── locale/{zh,en}.json          # 市场/设置页与 i18n 源（构建时校验与内联字典一致）
├── lib/
│   ├── client.js                # 浏览器半：window.__ModuleLoader__.load({id,factory})
│   └── index.js                 # v1：空壳 Host 半（无逻辑，满足 bundle 入口约定）；仅未来 S1 类失败时才在此注册读路由
├── src/
│   ├── core/                    # T1：纯函数内核（无 Cordis、无 DOM）
│   │   ├── constants.js         # limits / ranks / 阈值 / 协议版本
│   │   ├── model.js             # 领域模型（JSDoc 类型；见 §4.1）
│   │   ├── normalize.js         # 事件 → ChannelMessage（§4.2）
│   │   ├── dedupe.js            # 三层去重（§4.3）
│   │   ├── timeline.js          # 排序/合并/游标（§4.3/§4.5）
│   │   ├── fanout.js            # 同发合并（§4.4）
│   │   ├── protocol.js          # 前缀模板/解析/剥离（§5.2）
│   │   ├── mentions.js          # @ 解析、目标解析、失效成员剔除（§5.1）
│   │   ├── filter.js            # 成员筛选语义（§6.4.4）
│   │   └── paginate.js          # 200/50 分页与 memory cap（§4.5）
│   ├── adapters/
│   │   └── client-session-source.js  # T1：retain/eventSource/roster 适配器
│   ├── client/                  # T2：视图与交互
│   │   ├── parts/               # 由 scripts/build.mjs 按清单拼接为 lib/client.js
│   │   │   ├── 00-header.part.js
│   │   │   ├── 10-locale.part.js
│   │   │   ├── 20-store.part.js
│   │   │   ├── 30-primitives.part.js
│   │   │   ├── 40-view.part.js
│   │   │   ├── 50-header.part.js
│   │   │   ├── 60-feed.part.js
│   │   │   ├── 70-cards.part.js
│   │   │   ├── 80-composer.part.js
│   │   │   ├── 90-states.part.js
│   │   │   └── 99-footer.part.js
│   │   └── entry.js             # apply(ctx)：locale + slot 注册（唯一有副作用的文件）
│   ├── send/                    # T3：发送编排（§5.3）
│   │   ├── send-batch.js
│   │   ├── delivery.js
│   │   └── retry.js
│   ├── styles/group-chat.css    # T2：只含布局/尺寸；颜色全部 var(--dsw-*)
│   └── host/                    # T3：v2 可选 Host 半
│       └── channel-route.js
├── scripts/
│   └── build.mjs                # 零依赖拼接构建（§3.5）
└── test/
    ├── fixtures/                # T1：真实事件样例（EVT 摘录，脱敏）
    ├── core/                    # T1：单测（node --test）
    ├── client/                  # T2：组件/交互单测（jsdom 或纯渲染函数）
    ├── send/                    # T3：发送状态机单测
    └── e2e/                     # tester：Playwright（真实 GUI）
```

> 说明：仓库当前只有 `docs/`；`plugins/dsh-group-chat/` 是**规划路径**，实现任务按 §9 的 writeScopes 创建。

### 3.5 构建与依赖策略（为什么「免构建」还要一个拼接脚本）

**硬事实**：浏览器插件入口只有 `exports["./client"] → lib/client.js` 一个模块，`window.__ModuleLoader__.load({factory})` 只拿到 `require`（外部模块）；插件内部的多个源文件**没有**被浏览器单独加载的公开通道（[证据] API §D2/D4：`dsh.client.platform` + `exports['./client']`）。若坚持「一个文件写完」，T1/T2/T3 无法并行写（同一文件写冲突）。

**方案（推荐）**：**无转译、零依赖的拼接构建**。

- 源文件是**普通 ES2022 JavaScript**（无 JSX、无 TS、无 bundler 语法），React 元素用 `h()`/`jsx()` 手写；
- `scripts/build.mjs`（只用 Node 标准库）按 `src/client/parts/` 清单顺序拼接，并在头部/尾部注入 `window.__ModuleLoader__.load({id:'dsh-group-chat', factory})` 包装；
- 产出 `lib/client.js` 是**生成物**（不进 code review 手工 diff；CI/集成日由 Lead 重新生成后核对）；
- 好处：无 `pnpm install`、无网络依赖、确定性输出、可按文件并行；坏处：无类型检查（用 JSDoc + `// @ts-check` 获得编辑器提示）、无 tree-shaking（体积可控）。

**备选（若实现期允许装依赖）**：esbuild `--bundle --format=iife`；但会引入 `node_modules` 与构建链，且 Host release 身份变化会触发整页刷新（API §D5），对本地迭代不利。**默认不采用**。

**依赖声明**（`package.json` 关键段）：

```jsonc
{
  "name": "dsh-group-chat",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": "^22.19.0 || >=24.0.0", "dsh": ">=0.2.0-rc.2 || >=0.2.1-rc.2" },
  "main": "lib/index.js",              // v1 空壳 Host 半（无业务逻辑，仅满足 bundle 入口约定）；v2 在此注册读路由
  "exports": { ".": "./lib/index.js", "./client": "./lib/client.js",
               "./package.json": "./package.json", "./locale/*.json": "./locale/*.json" },
  "files": ["icon.svg","locale/*.json","lib/client.js","lib/index.js","cordis.patch.yml","README.md"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-conversation"
      ]
    },
    "compatibility": { "dshReleases": { "0.2.0-rc.2": "compatible", "0.2.1-rc.2": "compatible" } }
  },
  "peerDependencies": { "@deepseek-ai/cordis": "^4.0.4" }
}
```

> 依据 API §D2：`dsh.client.inject` 是客户端 Cordis 服务注入声明（不是 npm 依赖）；`@deepseek-ai/dsh-client-ui-primitives` / `@tanstack/react-virtual` / `@deepseek-ai/dsh-client-store` 属**框架引导期就注册的模块**（见 §6.3.1 的证据），不需要写进 inject，但实现时用 `require()` 取；若某版本缺失，降级为自写最小实现（§6.3.2）。

**cordis.patch.yml（v1）**：

```yaml
# Bundle patch：Loader 插入一行 → 加载本包 main（Host 半，v1 为空壳插件）
#                  dsh.client 声明 → Web 端加载 ./client（浏览器半，群聊视图）
- insert:
    - id: dsh-group-chat
      name: dsh-group-chat
```

**v1 仍需要一个 Host 半文件（Spike S5 已证实）**：bundle patch 的 insert 行会把包 `main` 当 Host 侧 Cordis 插件加载（API §D3，`dsh-context` 同款），浏览器半由 `dsh.client` 声明派发；纯 client bundle 合法，但需要可被 Loader 装载的最小 Host 半。S5 给出的官方同位先例（`dsh-experimental-client-ui-agent-team/lib/index.js`）即：

```js
// lib/index.js —— v1 空壳（无任何注册，运行成本≈0）
/** Host plugin body; behavior lives in the browser export. */
function apply() {}
export { apply }
```

因此 v1 保留该空壳；`main` 必须指向它、`exports['./client']` 必须指向浏览器半，二者缺一会导致 `dsh-client-modules` 激活期报错。v1.0 的「Loader 是否允许纯 client bundle」**UNVERIFIED 已由 S5 关闭**。

### 3.6 安装、升级、卸载、回滚与热更新边界

| 动作 | 步骤 | 备注 |
| --- | --- | --- |
| 安装 | `plugin_manager.list_plugins` → `install_bundle`（target=本地目录/tarball/market spec） | **UNVERIFIED**：本地已构建目录的 target 形态未取证（API H-3）。安装需 danger-full-access，由 Lead 执行 |
| 启用 | Loader 增加 entry → 浏览器收到新模块图 → 页面出现 tab | client bundle 变更可 HMR，无需重启（API §D5） |
| 升级（仅 client 变更） | 覆盖 `lib/client.js` → HMR combo URL 刷新 | 页面不刷新也可生效；若 HMR 异常则刷新页面 |
| 升级（含 Host 变更，v2） | 改 `lib/index.js` → **重启 Host + 刷新页面** | Host release 身份变化后页面不再接收新图（API §D5） |
| 关闭/卸载 | Loader 移除 entry → 插件样式/模块被驱逐；`plugin_manager` 卸载包 | 无数据迁移；群聊状态全部在内存（草稿可选 localStorage，按会话 key） |
| 回滚 | 禁用 entry 即回到「无群聊 tab」；不影响既有视图与会话日志 | 群聊不写任何 Host 状态，回滚零残留 |
| 验证清单 | ① tab 出现且顺序在「对话」右侧；② `cordis_inspect_query client Slots {root:'conversation.view'}` 的 occupants 含 `group-chat`（需页面已鉴权，API R8）；③ console 无 `__ModuleLoader__`/`data-plugin-css` 报错；④ 切走再切回滚动位置保持 | 与 API §D5 验证清单一致 |

**样式注入**：沿用第三方惯例——`<style data-plugin-css="group-chat">` 判重后 append（API §D4），插件卸载时由 `ctx.effect` 回收。

---

## 4. 数据契约

### 4.1 领域模型（定稿）

```ts
// ---------- 频道与成员 ----------
type ChannelId = string                    // = lead sessionId
type MemberKind = 'lead' | 'teammate' | 'subagent'

interface ChannelMember {
  sessionId: string
  name: string                             // 'lead' | teammate.name | subagent.label
  displayName: string                      // 群聊展示名（仅 UI 派生字段，不改数据契约）：lead→'Lead'；subagent→`${label} · ${parentName} 的子体`（v1.2 后缀式；V1.1-3 的括号式已被 V1.2-2 替换）
  kind: MemberKind
  parentSessionId?: string                 // teammate→lead；subagent→父成员
  depth: number                            // lead=0；teammate=1；subagent=父.depth+1（≤3，V1.1-3）
  status: 'running' | 'inactive' | 'provisioning' | 'failed' | 'unknown'
  description?: string
  model?: string
  addressable: boolean                     // v1.5 D-A：Lead/teammate 恒 true（inactive 可冷唤醒）；subagent 仅 running/provisioning 为 true，one-shot 完成后 false
  parentAvailable?: boolean                // 子会话父 Agent 是否在线（API R4）
  badge?: 'lead' | 'teammate' | 'subagent'
}

interface ChannelSnapshot {
  channelId: ChannelId
  lead: ChannelMember
  members: ChannelMember[]                 // 含 lead；顺序：lead → teammate(创建序) → subagent(depth 升序,创建序)
  runningCount: number
  readonly: boolean
  readonlyReason?: 'team-ended' | 'lead-offline' | 'archived' | 'permission'
  degraded?: 'no-roster' | 'lead-only'      // 名册缺失时的降级标记
  truncated?: {                             // V1.1-3：超出深度/会话上限时的截断信息
    omittedSubagents: number
    maxDepth: 3
    maxSessions: 32
    reason: 'session-cap' | 'depth-cap'
  }
  generatedAt: number
}

// ---------- 消息 ----------
type MessageKind = 'user' | 'agent_to_agent' | 'agent_output' | 'system' | 'delivery' | 'member_card' | 'task_card'   // v1.3 member_card(M8)；v1.6 task_card(M9)
// 四态（V1.1-2）：sending=发送中；sent=全部目标已接受；partial=部分目标失败；failed=全部失败
type DeliveryState = 'sending' | 'sent' | 'partial' | 'failed'

interface ChannelMessage {
  id: string                               // 去重主键（构造规则见 §4.3.2）
  kind: MessageKind
  sessionId: string                        // 权威事件所在会话
  sender: { sessionId: string; name: string; kind: MemberKind | 'user' | 'system' }
  targets: string[]                        // 结构化目标名（agent→agent / 同发用户消息）
  targetSessionIds: string[]
  text: string                             // 已剥离协议前缀的正文（Markdown 源码）
  rawText?: string                         // 原始文本（调试/复制保真）
  time: number                             // epoch ms，跨会话主排序键
  seq: number                              // 会话内序号，同会话 tie-break
  turn?: number                            // agent_output 的轮次
  isFinal: boolean                         // 是否为该轮最终输出（口径 A，EVT §4.3）
  files?: { name: string; path: string }[] // M5 交付
  toolCallCount?: number                   // M6 过程折叠条
  systemReason?: 'team-created' | 'member-welcome' | 'member-joined' | 'member-left'
              | 'subagent-created' | 'subagent-settled' | 'send-failed' | 'readonly'
  delivery?: DeliveryState                 // 用户消息的整体状态
  deliveries?: Record<string, DeliveryState> // targetSessionId → 状态
  clientBatchId?: string                   // 同发批次（本地生成，非权威 id）
  truncated?: boolean                      // 文本被截断（> limits.textRender）
  meta?: Record<string, unknown>           // source.kind / messageId / stopReason 等
  memberCard?: MemberCardPayload           // v1.3：kind='member_card' 时必填（PRD M8）
  taskCard?: TaskCardPayload               // v1.6：kind='task_card' 时必填（M9）
  creationId?: string                      // v1.4：同一次成员创建（欢迎提示 + creator 带卡消息共享）
  pairOrder?: number                       // v1.4：0=欢迎提示，1=creator 带卡消息（同 creationId 时排序用）
}

// ---------- 成员加入卡片（v1.3，数据来源见 §4.2.1 / MCF） ----------
type MemberRoleKind = 'teammate' | 'subagent'
type ContextPolicy = 'fresh' | 'fork' | 'unknown'          // 由 context（teammate）/ 工具名（subagent）/ isSeeded 推导
type LifecycleMode = 'one_shot' | 'continuable' | 'unknown' // descriptor.mode（subagent）；teammate 恒 unknown
type MemberLifecycle = 'provisioning' | 'active' | 'running' | 'inactive' | 'failed' | 'unknown'

// v1.4：不再有 payload.creator —— 消息 sender 就是 creator；这里只描述「新成员」
interface MemberCardPayload {
  id: string                               // 去重主键：`mc:<memberSessionId>`（兜底 `mc:<callId>`）
  member: {
    sessionId: string                      // team/member.id == catalog.childId == header.id
    name: string                           // teammate.name / descriptor.label
    kind: MemberRoleKind
    parentName?: string                    // subagent 的父成员显示名（teammate 无此字段）
    description?: string                   // 角色描述（tool/call.arguments.description）
    model?: string                         // 模型 id（如 deepseek-flash）；解析失败时省略该行
    modelInheritedFrom?: string            // v1.4：模型来自继承时的父名（展示 `{model}（继承 {parent}）`）
    modelSource?: 'descriptor' | 'result_snapshot' | 'roster_current' | 'unknown'
    contextPolicy: ContextPolicy           // fresh/fork；**创建 provider（spawn/fork 配置名）永不直出**
    lifecycleMode: LifecycleMode           // subagent: one-shot/continuable；one-shot 追加后缀
    createTool: 'spawn_teammate' | 'subagent' | 'subagent_fork' | 'unknown'
    promptExcerpt?: string                 // 初始任务首个空行前摘要（≤160 字 / 2 行）
    promptFull?: string                    // 展开用全文（受 limits 文本上限约束）
    state: MemberLifecycle
  }
  time: number                             // 入群 anchor（team/member.active.time / childCreatedAt）
  actions: {
    viewSession: 'enabled' | 'disabled'
    viewTask?: 'enabled' | 'disabled'      // 仅 teammate
    reason?: 'no-permission' | 'no-ui-workspace' | 'session-missing'
  }
  trigger: 'team-member-active' | 'subagent-catalog' | 'tool-result' | 'historical'
}

// ---------- 任务卡片（v1.6，数据来源见 §4.2.2 / TCF） ----------
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted'
type TaskAction = 'create' | 'claim' | 'complete' | 'reopen' | 'reassign'
                 | 'edit' | 'set_dependencies' | 'delete' | 'release'
type ActorSource = 'paired' | 'time-neighbor' | 'owner-inferred' | 'system-fallback'

interface TaskCardPayload {
  id: string                        // 去重键：`${teamId}:${taskId}:${revision}`
  action: TaskAction
  task: {
    id: string                      // task-N
    revision: number                // 每条成功变更加 1；一条 revision 一张卡
    subject: string
    description: string
    status: TaskStatus              // 严格四枚举；无 failed
    ownerId?: string
    ownerName?: string              // 优先取 tool/result.ownerName；否则 ownerId→名册
    blockedBy: string[]
    writeScopes: string[]
    deleted?: boolean               // status==='deleted' 的墓碑别名（便于 UI）
  }
  actionLabel: string               // i18n 后的动作文案（如「重新打开」）
  statusLabel: string               // i18n 后的状态文案（如「待认领」）
  actor: { name: string; sessionId?: string; kind: 'lead' | 'teammate' | 'subagent' | 'system'; source: ActorSource }
  time: number                      // team/task.time（journal 时间更准）
  dedupeKey: string                 // `${teamId}:${taskId}:${revision}`
  replay?: boolean                  // 历史回放标记
  compact?: boolean                 // P2 密集流紧凑版（动作行+标题+负责人+复制）
}

// 欢迎提示 = 独立的 system 消息（不是 payload 字段）：
//   { kind:'system', systemReason:'member-welcome', text:'欢迎 @{name} 加入群聊',
//     creationId:'mc:{memberSessionId}', pairOrder:0, time:anchor }
// creator 带卡消息：
//   { kind:'member_card', sender:{sessionId:creatorSessionId,name:creatorName,kind:creatorKind},
//     creationId:'mc:{memberSessionId}', pairOrder:1, time:anchor, memberCard:{member,actions,time,trigger} }


interface ChannelPage {
  channel: ChannelSnapshot
  messages: ChannelMessage[]
  cursor: ChannelCursor
  hasMore: boolean
  truncated: boolean
  serverTime: number
}
```

**字段推导的唯一上位规则**：字段来自事件本身或成员目录；**任何推断字段（senderName、targets）缺失时退化为 `unknown` 并保留 rawText**，禁止猜测后丢弃消息。

### 4.2 事件 → 消息归一化矩阵（来自 EVT §2–§7，按实现可执行粒度）

| 事件（所在会话） | 条件 | 产出 | 关键字段 | 证据 |
| --- | --- | --- | --- | --- |
| `user/message` | `data.source.kind==='user'` 且 **有 `rpcId`** | `kind:'user'` | `id=data.id`、`time/seq`；sender=user | EVT §2.5 |
| `user/message` | `source.kind==='user'` 且 **无 rpcId** 且是子会话首条 | `kind:'system'`（父 agent 下发的任务，不进群聊正文，仅折叠/忽略） | — | EVT §2.5 |
| `user/message` | `source.kind==='agent-message'`（当前构建，`senderSessionId`） | `kind:'agent_to_agent'` | targets=[本会话成员名]；sender 由 `senderSessionId` 查名册；正文剥 `^Team message(?: \S+)? from .+?:$` | EVT §2.3 |
| `user/message` | `source.kind==='team-message'`（旧构建，`senderName/messageId`） | `kind:'agent_to_agent'` | 优先用结构化 `senderName/messageId`；正文剥前缀 | EVT §2.4 |
| `user/message` | `source.kind==='subagent-settled'` | `kind:'system'`（**丢弃**，若子会话自己的 agent_output 已收） | 见 §4.3 ③ | EVT §3.3 |
| `assistant/message` | 该 `turn` 内最后一个**内容非空**的 text 块，且 `turn/end.reason.kind==='completed'` | `kind:'agent_output'`, `isFinal:true` | `id = ${sessionId}:turn:${turn}`；只有 `text` 块（丢弃 reasoning） | EVT §4.2–§4.3 |
| `assistant/message` | 同上但 `turn/end.reason.kind` ∈ `error/aborted/max-tokens/interrupted` | `kind:'agent_output'`, 追加 system 提示「本轮中断/失败」 | 系统条独立成消息 | EVT §4.3 |
| `turn/end` | `reason.kind==='forked'` 或事件 `session/end-seed` | **丢弃** | — | EVT §7.2 |
| `agent/inbox/spliced` | `inserted.length>0` | 不单独出消息；仅补 `投递时间/接收方/target` 元数据 | 与同 id `user/message` 合并 | EVT §9 陷阱 1 |
| `team/member` | Lead 会话，`phase==='active'` | **两条**（v1.4）：① `kind:'system'` 欢迎提示（`systemReason:'member-welcome'`，text=`欢迎 @{name} 加入群聊`）；② `kind:'member_card'`（sender=**creator**，即 lead；`memberCard.member`=新成员） | id/name/description/provider→contextPolicy；anchor=active 事件 time | MCF §1/§3.1 |
| `subagent/catalog` | 任一成员会话 | **两条**（v1.4）：① 欢迎提示（同上）；② `kind:'member_card'`（sender=**调用方成员**，即事件所在会话的 agent；member=childId/label） | childId/label/mode/childCreatedAt；anchor=childCreatedAt | MCF §2/§3.3 |
| `tool/call`(name∈{spawn_teammate,subagent,subagent_fork}) + 匹配 `tool/result` | 同一创建方会话的 **own** 持久事件（fork/seeded 继承前缀已丢弃） | **不单独出消息**：为上面两条提供 creator 判定、description/prompt/context、teammate model 快照、subagent 的 tool 名→上下文策略 | arguments{name/description/prompt/context 或 provider/model}；result.member{target,status,provider,context,model}；callId↔toolCallId | MCF §1/§2/§7 |
| 子会话 `subagent/descriptor` | 能读到子会话首个持久事件（冷读/历史回放） | 补充 member_card 的 model/mode/provider（**model 回退链首选**） | agentModel/agentProvider/mode/label | MCF §3.2 |
| `team/task` | Lead 会话，每条 revision | `kind:'task_card'`（**一条 revision 一张卡**；快照本身无 actor/action/time） | task{id,revision,subject,description,status,ownerId?,blockedBy,writeScopes}；time=事件 time | TCF §1/§7 |
| `tool/call`(name∈{team_task_create,team_task_update}) + 同 callId 的 `tool/result` | 操作者会话的 **own** 持久事件（fork/seeded 继承前缀已丢弃） | **不单独出消息**：为 task_card 提供 `action`/actor/`ownerName`/`ready`；与 journal 按 `(taskId, revision)` 配对 | arguments{task_id,expected_revision,action,owner,...}；result=TASK_VIEW_SCHEMA{id,revision,status,ownerName,ready} | TCF §2/§3 |
| `tool/call`+`tool/result` | 一组 | `toolCallCount` 聚合到 `kind:'delivery'` 折叠条（M6） | 不起独立气泡 | UX §4 M6 |

**两个实现细节（易踩）**：

1. `SessionEventMap['user/message']` 的 `data` **就是消息本体**（`{id, role:'user', content, source}`），没有 `{turn, step, message}` 包装——turn 归属要用前后 `turn/start` 推断或按会话顺序折叠（[证据] host `sessionQuery` inspect 的 `SessionEventMap`；assistant/message 才是 `{turn,step,message,stream,usage}`）。
2. `MessageSourceMap` 在**基础类型**里只有 `user / model / tool / system-prompt`；`agent-message / team-message / subagent-settled` 是 experimental agent-team 包通过声明合并加进来的（[证据] 基础 inspect 未见这些成员，而 EVT 日志与 experimental README 有）。→ 归一化必须对 **未知 `source.kind` 做「不崩、原样展示、标记 unknown」**，不能按枚举穷举断言。
3. **事件窗口的元素是信封而非裸事件**（Spike S1 实测）：`entry = { type:'event'|'transient', event:{ type,seq,time,data, ignorable?, surfaceOp?, sourceEventSeqs? } }`。归一化入口固定为 `normalize(entry.event)`，且**只接受 `entry.type==='event'` 的持久事件**；`transient`（`assistant/live-chunk`）一律丢弃——群聊发言只取持久 `assistant/message`。`SessionWireEvent` 字段是**封闭 7 个**，内核不得依赖额外字段。窗口变更 `change.kind ∈ {replace,prepend,append,settle-assistant}`，增量合并按 kind 分派（§4.6）。

#### 4.2.1 入群消息的数据来源、creator 与「两条消息」规则（v1.4）

**形态定稿**：一次成员创建 = **欢迎系统提示（M4 ②） + creator 带卡消息（M8）** 两条 ChannelMessage；**不存在孤立卡片**。卡片是 creator 这条消息的 body；`memberCard.member` 只描述新成员。

| 字段 | 首选来源 | 次选 / 回退 | 缺失时 |
| --- | --- | --- | --- |
| 新成员 sessionId | `team/member.member.id`（teammate）/ `subagent/catalog.childId`（subagent） | `tool/result` 文本 `started subagent (\S+)` | 用 descriptor 所在会话 id |
| 新成员名字 | `tool/result.member.target`（teammate）/ `descriptor.label`（subagent） | `team/member.member.name` / `catalog.label` | 成员短 id |
| 角色描述 | `tool/call.arguments.description` | `team/member.description` / `catalog.label` | 隐藏描述行（不写「未知」） |
| 模型 | subagent：`descriptor.agentModel`；teammate：`tool/result.member.model`（创建时快照） | 成员视图当前 model（`agentTeam`/`list_agents`） | **隐藏模型行**；继承时展示 `{model}（继承 {parent}）`，只显示模型名、不显示 provider |
| 上下文策略 | teammate：`tool/call.arguments.context`（默认 `fresh`）→「全新上下文（fresh）」/「继承 Lead 已完成回合（fork）」；subagent：工具名 →「全新上下文（subagent）」/「继承父会话（subagent_fork）」 | `descriptor.mode`：one-shot 追加「· 一次性（one-shot）」（continuable 省略）→ `header.isSeeded` | 工具名缺失 → 隐藏该行 |
| 生命周期 | `team/member.member.phase`（teammate）/ `descriptor.mode`（subagent） | 实时成员视图 `status` | 「运行中」 |
| **消息 sender = creator** | `spawn_teammate` 恒为 `lead`；`subagent`/`subagent_fork` = `tool/call` 所在会话的成员名 | 名册 `team/member.id===sessionId` → name；否则该会话 `descriptor.label`；再否则 `lead` | `lead` |
| 创建方式 | `tool/call.name` | — | 隐藏该行 |
| 初始任务 | `tool/call.arguments.prompt`（首个空行前摘要，≤160 字 / 2 行；全文用于展开） | — | 隐藏「初始任务」区块 |

**规则与边界**：

1. **provider 内部名（`spawn`/`fork`）绝不能直出**：它是插件配置值，可被改成任意字符串；用户可读的上下文策略必须由 `context` / 工具名 / `descriptor.mode` 推导（MCF §5/§9.2）。
2. **creator 判定 + 消息归属**：`spawn_teammate` 只有 Lead 能调（teammate 调用会报 `only the Team Lead can create teammates`），creator 恒为 `lead`；`subagent`/`subagent_fork` 的 creator = 调用事件所在会话的成员（Lead / teammate / 上层 subagent）。**creator 是消息 sender，不是卡片字段**；卡片 body 内不再出现 creator 头像/名字/角色。
3. **两条消息（v1.4 定稿）**：
   - 欢迎提示：`kind:'system'`、`systemReason:'member-welcome'`、`text='欢迎 @{name} 加入群聊'`、`creationId='mc:<memberSessionId>'`、`pairOrder=0`；
   - creator 带卡消息：`kind:'member_card'`、`sender={sessionId:creatorSessionId,name:creatorName,kind:creatorKind}`、`creationId` 同上、`pairOrder=1`、`memberCard={member,actions,time,trigger}`；
   - 两条 **time 相同**（anchor = `team/member.active.time` / `catalog.childCreatedAt`），排序先按 `time`，同 `creationId` 时按 `pairOrder`（0 在 1 前），再按 `sessionRank/sessionId/seq`（§4.3.1）。
4. **去重键**：欢迎 `mc:<memberSessionId>:welcome`、卡片 `mc:<memberSessionId>`（兜底后者 `mc:<callId>`）；`team/member`(provisioning+active)、`catalog`、`tool/call`、`tool/result` 四类事件合并为**同一组两条**，不各出一张；fork/seeded 子会话复制的父会话 `tool/call` 依赖 §4.3.3② 的继承前缀过滤 + id 去重双保险（实测两个 fork 会话各含一份 lead 的 spawn 调用，MCF §9.3）；同一 `memberId` 只出一组（phase 迁移幂等），成员重建（同名新会话）视为新成员再出一组。
5. **触发时机**：teammate 等 `phase==='active'` 再出两条（provisioning→active 约 100–400ms，避免闪「创建中」）；subagent 以 `catalog.childCreatedAt` 为 anchor。**不要**在 `tool/call` 开始时刻出卡。
6. **历史回放**：两条消息完全由事件派生，打开旧会话同样渲染；若 `tool/result` 不在窗口内，按 descriptor/team-member 回退（字段少但结构不变）；若旧数据只可恢复卡片、欢迎提示仍按 `catalog`/`team/member` 派生，保持成对。
7. **状态更新与去留**：成员失败/离开**不删消息**，只更新卡片状态区（运行中→已完成/失败）；`team/member` 当前未观测到 failed/removed 相位，先用 `list_agents`/成员视图 `status` 兜底（MCF §10.3）；v1 不做「退群提示」。
8. **创建失败不出入群消息**：`tool/result` 报错（如 teammate 创建 teammate → `only the Team Lead can create teammates`）或子会话创建失败时，**不产生欢迎提示与 creator 带卡消息**，只保留错误/系统提示，绝不伪造成员（PRD §7.15）。
9. **不新增 Host 依赖**：以上全部来自客户端已能读到的会话事件/投影（MCF 未要求 @Remote）。

#### 4.2.2 任务卡片的数据来源、操作者配对与动作识别（v1.6，TCF 为准）

**已确认事实**（TCF §0–§3）：
1. `team/task` 是**整条任务快照**（`{version,teamId,task}`），task 只有 `id/revision/subject/description/status/blockedBy/writeScopes/[ownerId]`，**无 actor、无 action、无 createdAt/updatedAt**；且**只写 Lead 会话 journal**。
2. 操作发生在**操作者自己的会话**：`tool/call`(`team_task_create`/`team_task_update`) + 同 `callId` 的 `tool/result`（`TASK_VIEW_SCHEMA` 含 `id/revision/ownerName/ready`）。
3. 配对键 = **`(taskId, revision)`**；实测 journal 比 result **早 3–128ms**（同事务先 append 后返回）→ **不能按时间先后判断配对**。
4. 状态枚举只有 `pending|in_progress|completed|deleted`；平台**没有任务级 failed**（failed 只属于成员相位 `team/member.phase`）。

**四级回退链（按优先级）**：

| 级别 | 方法 | 产出 | 可靠性 |
| --- | --- | --- | --- |
| 1 | `(taskId, revision)` 精确配对操作者会话的 `tool/result` | action=arguments.action（create 取工具名）；actor=配对会话成员；ownerName 取 result | 高（实测 744 对，误差 0） |
| 2 | 同 `(taskId)` 且 `abs(journal.time − call.time) < 1s` 的时间近邻 | 同上；`actor.source='time-neighbor'` | 中（并发 claim 不同任务可能错配） |
| 3 | 由 `ownerId` 反推（claim/complete 的 actor 通常是 owner） | actor=owner；`actor.source='owner-inferred'` | 中（reassign/delete 会错） |
| 4 | 兜底：actor 显示「系统操作者」 | `actor={name:'系统',kind:'system',source:'system-fallback'}`，卡片仍展示任务/动作/状态 | 低 |

- `memberOf(sessionId)`：`sessionId===teamId`→`lead`；否则 `team/member.member.id===sessionId`→`member.name`；否则该会话 `subagent/descriptor.label`。
- **ownEvents 过滤**：fork/seeded 会复制父会话的 `tool/call` 与 `team/task`（实测 3 个副本），配对/出卡前必须用 `ownEvents()`/`isOwnSeq()` 过滤，否则同一动作被多份配出。

**动作识别（首选显式 action，diff 兜底）**：

1. **首选**：`team_task_create` → `create`；`team_task_update.arguments.action` → 7 种之一。**直接把 action 写进卡片，不做推断**。
2. **回退**：无配对时按 `prev(revision-1) → next` diff，**判定顺序不可乱**（先 status 跃迁，再 owner，再依赖，最后 edit）：
   | 变化 | 动作 |
   | --- | --- |
   | 无 prev（revision===1） | create |
   | `deleted` 新出现 | delete（取消） |
   | completed→pending | reopen（重新打开） |
   | in_progress→completed | complete |
   | pending→in_progress | claim 或 reassign（owner==actor→claim；actor 为 lead 且 owner!=actor→reassign） |
   | owner 变化（in_progress→in_progress） | reassign |
   | in_progress→pending 且 owner 删除 | release（actor==原 owner）或 reassign-清空（actor==lead） |
   | 状态/owner 不变、blockedBy 变 | set_dependencies |
   | 状态/owner 不变、其它字段变 | edit |
3. 歧义消解关键：`claim` 的 `ownerId===actor`；`reassign` 仅 lead、且 `ownerId!==actor`；`release` vs reassign-清空看 actor 是否原 owner。

**状态/动作语义（PRD v0.7.1 用户拍板，严格映射）**：

| 动作 | actionLabel（zh） | 卡状态 pill = 真实 status | 备注 |
| --- | --- | --- | --- |
| create | 创建任务 | pending 待认领 | revision===1；description 可展开 |
| claim | 认领任务 | in_progress 进行中 | actor=owner |
| complete | 完成任务 | completed 已完成 | 可显示完成时间；owner 保留 |
| reopen | 重新打开 | **pending 待认领**（owner 已丢弃时负责人「未指派」） | **禁止出现「返工/失败」字样**（用户拍板） |
| reassign | 改派任务 | in_progress 进行中 | 仅 lead；显示新负责人 |
| edit | 编辑任务 | 状态不变（按真实快照） | 建议紧凑卡；内容是 subject/description 变化 |
| set_dependencies | 依赖变更 | 状态不变 | 建议紧凑卡；显示 blockedBy |
| delete | 取消任务 | deleted 已取消（墓碑） | 消息保留、任务列表过滤 |
| release | 放回 | pending 待认领 | 负责人「未指派」 |

- **平台无 failed**：不得伪造 `failed`、不得出现「失败/返工」第五种状态或红色警示 pill；`reopen` 只是「重新打开」动作 + 真实 pending 状态。
- **零真实样例**：release/delete 在 1176 条 revision 中未出现（TCF §2.3/§9），其文案与视觉按状态机推导，标 **UNVERIFIED**；edit/set_dependencies 真实存在但少，按 PRD F21 也各出一张（建议紧凑版）。

**去重 / 回放 / 排序**：
- 去重键 **`${teamId}:${taskId}:${revision}`**；一条 revision 一张卡；
- 历史回放按 revision 升序，`replay:true`（DOM `data-replay="true"`）；
- 时间用 `team/task.time`（比 result 更准）参与全群聊 `(time, sessionRank, seq)` 排序；同一毫秒 tie-break 建议 member_card < task_card < 普通消息（研究 §7.5），由实现常量固定。

**每轮最终输出的判定（口径 A，唯一）**：

```
for each session: 
  fold turns → 对每个 turn，取 turn 内最后一条 content 非空的 assistant/message 的 text 块
  → 该 turn 若 completed 则 isFinal=true；否则 isFinal=true 但附 system 提示
```

> 不要用「每一步一条」的口径 B（一轮 N 条会刷屏，EVT §4.3）。

### 4.3 去重与排序（三层，全部必做）

#### 4.3.1 排序

```
order(m):
  1) time ASC                                  // epoch ms，跨会话
  2) if a.creationId && a.creationId === b.creationId: pairOrder ASC   // v1.4：欢迎(0) 先于 creator 带卡消息(1)
  3) sessionRank ASC（lead=0, teammate=1, subagent=2, system=3）
  4) sessionId 字典序
  5) seq ASC（浮点比较）
```

- `time` 是 Host 时钟 epoch ms，跨会话可比（EVT §7.1）；
- **v1.4 成对规则**：欢迎提示与 creator 带卡消息共享 `creationId` 且 `time` 相同 → 先比 `pairOrder`，保证「欢迎在前、卡片在后」；`creationId` 不存在时退化为常规 `sessionRank` 排序。PRD v0.6 表述为「按 `(time, sessionIdRank, seq)` 归位」，**本架构在此基础上增加 `creationId→pairOrder` 前置 tie-break**（否则 system 的 sessionRank 会让欢迎排到 creator 消息之后）；两者语义一致：组内相对顺序固定、组间按时间归位；
- 同毫秒用 `sessionRank` + `sessionId` 字典序 + `seq` 稳定；
- **禁止**用 `createdAt`、**禁止**全局用 `seq`；
- **task_card 排序**：`time = team/task.time`；同一毫秒内建议固定 kind 序 `member_card < task_card < 普通消息`（研究 TCF §7.5），再用 sessionRank/seq；
- **`seq` 不保证整数**（Spike S1）：`transient` 行的 `seq` 是 `durableCursor + 1 - 1/(n+1)` 的小数；transient 虽在入口被丢弃，但**禁止** `Number.isInteger(seq)` 断言、禁止 `seq+1` 等整数运算，比较/排序统一按浮点处理。

#### 4.3.2 去重键（`id` 构造）

| 消息类型 | id 规则 | 理由 |
| --- | --- | --- |
| `user` | `u:${sessionId}:${data.id}`（`data.id` = 消息 id，与 spliced inserted id 相同） | 双写去重（EVT §7.2①） |
| `agent_to_agent` | 有 `messageId` → `m:${messageId}`；否则 `u:${sessionId}:${data.id}` | 旧构建有 messageId；新构建用接收侧 id（保存投递态） |
| `agent_output` | `a:${sessionId}:turn:${turn}` | 同一轮重复读取幂等；重放/重渲染稳定 |
| `system` | `s:${sessionId}:${seq}` | 事件唯一 |
| `delivery` | `d:${sessionId}:${firstToolSeq}` | 一组工具调用一条 |
| `member_card` | `mc:${memberSessionId}`（兜底 `mc:${callId}`） | 同一成员只出一组；卡片消息 `pairOrder=1` |
| `system`（欢迎提示） | `mc:${memberSessionId}:welcome` | 与卡片成对（`pairOrder=0`）；fork/seeded 复制事件靠 memberSessionId 收敛 |
| `task_card` | `${teamId}:${taskId}:${revision}` | 一条 revision 一张卡；不按时间/taskId 去重；fork/seeded 过滤后同键收敛 |
| 本地 echo | `local:${clientBatchId}` | 权威事件到达后替换（§5.3.3） |

#### 4.3.3 三层去重算法

```
① 同会话双写：agent/inbox/spliced.inserted[i].id 与 user/message.data.id 相同 → 只保留 user/message，
   把 spliced 的 target/投递时间并入 meta。（EVT 实测：spliced-only = 0）
② fork/seed：会话头 isSeeded:true 时，继承前缀事件原样复制（同 id/seq/time）。
   client 侧无 Session.ownEvents()，改用窗口内「session/end-seed」事件 seq 作为继承边界：
     cutoff = max(seq of 'session/end-seed')  // 找不到则 0
     丢弃 seq <= cutoff 的事件；并按消息 id 全局去重兜底。
③ 通知副本：subagent-settled 的 closing message == 子会话 agent_output 文本 → 保留子会话那条；
   send_message 接收侧副本 == 发送侧 tool/call 参数 → 不产消息（只作为投递证据）；
   team/message/queued（旧构建）→ 作为权威账本补 senderName/messageId，不额外产消息。
```

> 弱键配对（当前构建无 messageId）：`(senderSessionId, targetSessionId, sha256(normalizedText), time±5s)` 仅用于把「发送记录」与「接收副本」关联为同一逻辑消息，**不用于合并两个真实发言**（EVT §7.2③）。

### 4.4 同发（fan-out）合并与协议

**问题**：一次同发 = N 次 prompt，N 个目标各自产生一条 `user/message`（不同 id、不同 rpcId）；若直接按事件渲染，群聊里会出现 N 条相同气泡，违反 UX D3/PRD F8。

**方案**：

1. 发送时给一次点击生成 `clientBatchId`（`gc-<uuidv4>`，仅本地/内存）；
2. 每个目标带独立 `requestId`（uuid v4），映射 `targetSessionId → requestId`；
3. 正文前置**两个独立 text part 组成的 canonical 前缀**（part1 收件人 / part2 固定说明，见 §5.2，V1.1-1），因此接收副本自带「同发」标记且可用 `content[0]/[1]` 精确校验；
4. 归一化时：
   - 前缀解析成功且 `targets.length > 1` 的用户消息 → 标记 `clientBatchId`（由本地 map 反查；刷新后丢失则按前缀文本 + time±5min 归并）；
   - **只有 lead 会话中的那一份渲染为 M1 气泡**（sender=user），其余会话副本进入该气泡的 `deliveries`；
   - 若 lead 副本尚未到达但其它副本已到：先渲染一份「临时气泡」（sessionId 取第一个到达的副本），lead 副本到达后按 `clientBatchId/前缀` 合并，气泡不闪断（保持同一 DOM key = `local:batchId` → 后续转 `u:lead:...` 时用 `key` 迁移策略：以 batchId 为 React key 直到权威 id 稳定）。
5. `deliveries` 状态：`sending`（本地）→ 每个目标独立收敛为 `sent` / `failed`；聚合态按 V1.1-2 计算（全成功 = `sent`；部分失败 = `partial`；全失败 = `failed`）。若观察到目标会话内出现对应 `requestId` 的 user/message，内部标记 delivered（UI「已发送」不因此新增状态）。

> **不使用 messageId 做跨目标关联**（V1.1-6 冻结）：EVT §2.1/§5.3 证明当前构建 `send_message` 返回 `{sent:true}`、接收侧无 messageId，且同一文本可合法重复。**SC9/SC10 的证据口径 = 同一 `clientBatchId` + N 个目标 `requestId` + 群聊 1 条气泡 + N 条 delivery 记录**；不再要求「跨目标同一 messageId」。

### 4.5 游标与分页（`ChannelCursor`）

```ts
interface ChannelCursor {
  v: 1
  channelId: string
  // 每会话已消费到的最远 seq（-1 = 未加载）
  offsets: Record<string, number>
  // 每个会话上次读取时的窗口 revision（用于识别事件窗口重置/重连）
  revisions: Record<string, number>
  // 全局「最早已加载消息」的 orderKey（向上分页锚点）
  oldestKey?: string
  // 全局「最新已合并消息」的 orderKey（增量去重/新消息浮标）
  newestKey?: string
}
```

**首屏**：取「每会话最近 N 条候选 → 归一化 → 全局排序 → 截取最后 200 条」。实现上不要求每会话精确 200，而是 `limit=200` 全局 + 每会话预取上限 `limits.perSessionPrefetch = 400` 事件，避免单个话多的 agent 挤掉别人（[推断]，联调时以真实数据调参）。

**向上分页**：`before = oldestKey`，每页 50 条；优先用会话级窗口扩展原语 `binding.session.loadOlder()` / `loadThrough(seq)`（PRD F10/SC12 指定），扩展后重读 `eventSource` 快照并重算该会话；引擎按会话分别取 `seq <= offset` 的事件回填，合并后截取 50；到顶（所有成员 `hasMore=false`）显示「已到最早消息」。

**内存上限**：`limits.maxMessagesInMemory = 2000`；超出时从**中间**裁剪（保留首 200 + 最近 1800，UI 显示「中间历史已折叠，向上加载可回填」——避免用户正在读的位置被删）。裁剪策略在 `paginate.js` 单测覆盖。

**增量**：见 §4.6。

### 4.6 客户端数据源契约（`ChannelSource`，与传输无关）

```ts
interface ChannelSource {
  /** 打开频道：返回快照 + 首屏消息 + 游标 */
  open(channelId: string, opts: { limit?: number }): Promise<ChannelPage>
  /** 增量同步：返回新消息 + 新游标（可多次调用，幂等） */
  sync(cursor: ChannelCursor): Promise<ChannelPage>
  /** 向上回填 */
  pageOlder(cursor: ChannelCursor, limit?: number): Promise<ChannelPage>
  /** 订阅权威变更通知（客户端实现基于 eventSource；HTTP 实现基于轮询/SSE） */
  subscribe(onChange: (kind: 'append' | 'reset' | 'status') => void): () => void
  /** 发送（由 send 模块编排，source 只提供「候选目标是否可发送」） */
  capabilities(): { canSend: boolean; reason?: string }
  close(): void
}
```

**v1 `ClientSessionSource` 的 `sync` 算法**（按 Spike S1 的窗口形状 / change 类型实现）：

```
for each member session:
  ref = ctx.sessions.retain(sessionId, { source: 'group-chat' })   // 引用计数，关闭时 release()
  win = ref.binding.eventSource.getSnapshot()                      // {entries, revision, hasMore, change}
  if (win.revision !== cursor.revisions[sessionId]) → 全量重算该会话（首次或重连）
  entries = win.entries.filter(e => e.type === 'event')             // 丢弃 transient 流式行
  newEntries = entries.filter(e => e.event.seq > cursor.offsets[sessionId])
  msgs += normalize(newEntries.map(e => e.event), memberCtx)
  cursor.offsets[sessionId] = Math.max(...newEntries.map(e => e.event.seq)) // 浮点比较，禁止整数断言
  cursor.revisions[sessionId] = win.revision
merge → dedupe → sort → 返回新增片段
```

- `change.kind` 分派：`append` → 增量；`prepend` / `replace` → 该会话全量重算；`settle-assistant` → 该 attempt 的 transient 行被持久 `assistant/message` 替换，内核直接重算该区间，不做文本比对；
- **不要**把 transient 当消息（§4.2 第 3 条）。

**关键约定**：

- `eventSource` 是 `ObservableSnapshot<SessionEventWindow>`（API §B1）；订阅方式**必须**用 `ctx.effect` 持有并在卸载时 dispose；
- `source` 参数：`SessionReferenceSource` 的 declaration merge 第三方是否允许 **UNVERIFIED**（API H-4）。降级：复用既有 key（如 `'gateway'`），仅影响引用计数语义，不影响功能；
- 事件窗口元素形状**已由 Spike S1 实测确认**（`{type:'event'|'transient', event:{type,seq,time,data,...}}`），无需再猜；实现首日仍建议照 `spikes-v1.md` §S1 的调试片段打印 3 条 entry 复核一次（防版本漂移）。

### 4.7 v2 HTTP 读接口（**不实现**；S1 已通过，仅未来 S1 类失败时重新评估）

> Lead 决策 V1.1-4 + Spike S1 结论：**S1 已通过（entries 是原始事件信封）→ 本节不实现**，`lib/index.js` 保持空壳。只有未来出现「S1 类失败」的新证据（客户端拿不到 `type/seq/time/data`）时才启用本节：届时客户端适配器切到 `HttpChannelSource`（§4.6 同一契约），UI/内核不变。

#### 4.7.1 挂载方式（照抄 `dsh-context` 先例）

```js
// lib/index.js（v2 才启用；v1 不写）
ctx.inject(['connection'], (scope) => {
  const register = scope.get('connection')?.fetch?.register
  if (typeof register !== 'function') return
  scope.effect(() => register({
    path: '/api/group-chat/channel',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: channelHandler(scope),           // (request) => Promise<Response>
  }), 'dsh-group-chat: channel route')
})
```

- 依据：`dsh-context` 的 `/api/dsh-context/fleet` 就是 `connection.fetch.register({path, methods:['POST'], requestBody:'buffered', fetch})`（[证据] `dsh-context/lib/index.js` 压缩产物中 `function B(e,t,n,r,i)` 与 `ei()`；API §C5-2）。
- 客户端用**相对路径、无前导斜杠** `fetch('api/group-chat/channel', {method:'POST', headers:{'content-type':'application/json'}, body})`（API §C5-2 的同源惯例）。
- 备选：`ctx.webServer.register({path, methods, handler})`（host catalog 有 `register(route: WebRoute)`）；选 `connection.fetch` 是因为 peer 准入由连接层统一处理。

#### 4.7.2 请求/响应 schema

```jsonc
// POST api/group-chat/channel
{
  "mode": "snapshot",            // "snapshot" | "sync" | "older"
  "channelId": "session-…",      // lead sessionId
  "cursor": { /* ChannelCursor；mode=snapshot 时省略 */ },
  "limit": 200                   // snapshot:200, older:50, sync:≤500
}

// 200
{
  "ok": true,
  "value": {
    "channel": { /* ChannelSnapshot */ },
    "messages": [ /* ChannelMessage[]，已按 §4.3 排序、去重、合并 */ ],
    "cursor": { /* ChannelCursor */ },
    "hasMore": true,
    "truncated": false,
    "serverTime": 1793158414799
  }
}

// 4xx/5xx（统一错误外壳，照 dsh-context 的 ok/error 形状）
{ "ok": false, "error": { "code": "group-chat/forbidden", "message": "…", "retryable": false } }
```

#### 4.7.3 错误码

| code | HTTP | 语义 | 客户端动作 |
| --- | --- | --- | --- |
| `group-chat/bad-request` | 400 | body 非 JSON / 缺 channelId / limit 越界 | 显示错误态，不重试 |
| `group-chat/forbidden` | 403 | 会话不属于本工作区/不在 lead 谱系/无权读 | 错误卡 + 提示「无权限」 |
| `group-chat/not-found` | 404 | 会话不存在或已删除 | 错误卡 |
| `group-chat/stale-cursor` | 409 | 游标过期/日志被压缩重写 | 自动 reset 重拉 snapshot（一次） |
| `group-chat/too-large` | 413 | 请求/游标体过大 | 缩小 limit 重试 |
| `group-chat/rate-limited` | 429 | 令牌桶耗尽（含 `retryAfterMs`） | 指数退避 1 次，提示「稍后重试」 |
| `group-chat/session-offline` | 200 内 `channel.readonly` | lead Agent 离线/团队结束 | 只读态（F17） |
| `gateway/internal` | 500 | 未捕获异常 | 可重试 1 次 |

#### 4.7.4 服务端实现要点（与 v1 同一内核）

1. 解析 `channelId` → `leadId`（若传入的是子会话，先 `sessionQuery.traceSession` 找 root）；
2. 校验：`lead.header.cwd` 与请求 peer 的 workspace 一致；成员 = `subagents.listDescendants(leadId)` ∩ 谱系；**拒绝遍历非后代**；
3. 每会话 `sessionQuery.observeSession(id, {projectionMode:'none'})`（[证据] 签名见 inspect；`SessionObservation{header, events, cursor, revision, source, retain(), dispose()}`，`source:'live'|'prepared'`）；
4. **缓存**：按 `(sessionId, revision)` LRU 缓存「已归一化消息索引」（上限 64 会话 × 2000 条），命中则只对新事件做增量；未命中则全量折叠一次；
5. 大文本：服务端按 `limits.textRender`（64KB）截断，`truncated:true`，可选 `?full=<messageId>` 二次取全文（v2.1 再做）；
6. 组合排序/去重/合并后返回；写 `cache-control: no-store`。

### 4.8 服务 / API 映射表

#### 4.8.1 Client 侧（v1 实际使用）

| 用途 | API | 证据 |
| --- | --- | --- |
| 当前会话 / 频道 id | `sessionId`（standardProp）+ `binding(id).session.getSnapshot().subagent?.address?.parentSessionId` | API §B2 |
| 成员名册 | `useSessions(s => s.projectionsBySession[lead]?.values.agentTeam)` | API §B2 |
| 成员会话枚举 | `useSessions(s => s.list.byId)` → 过滤 `parentSessionId === lead` / 成员 id | API §B1/B2 |
| 事件窗口 | `ctx.sessions.retain(id, {source})` → `ref.binding.eventSource` | API §B1 |
| 运行状态 | `useSessionStatus(s => s.get(id)?.running)`、`SessionSummary.running` | API §B2 |
| 会话可访问性 | `useSessionAccess(sessionId, action)`（standardProp） | API §A1 |
| 打开成员会话 | ownerProp `openView(view, focus)` | API §A3 |
| 发送 | `binding(target).session.prompt(parts, mode, signal, requestId)` | API §C1/C2 |
| 投影兜底刷新 | `ctx.sessions.refreshProjections(sessionId)` | API §B1 |
| 本地化 | `ctx.locale.register(NS,{zh,en})` + `props.locale` 惯例 | API §A2 |
| 插件副作用 | `ctx.effect(fn, label)` | API §A2 |

#### 4.8.2 成员目录合成算法（v1）

```
members = []
lead = deriveLead(sessionId)                        // 见上
roster = agentTeam?.members ?? []                    // 缺失 → degraded:'no-roster'
for m in roster: push(toMember(m))                   // lead + teammate
for s in sessions.list.byId where s.parentSessionId === lead: push(toChildMember(s))  // 补 roster 漏掉/未投影的
递归收集 lead 的全部后代（BFS）：
  对每个已知成员，读其会话事件里的 subagent/catalog → 子会话（label=事件 label, parent=该成员, depth=parent.depth+1）
  直到 depth > limits.maxDepth(=3) 或 会话数达到 limits.maxSessions(=32)
去重（sessionId）；过滤：archived / 无读权限 / depth > 3
排序：lead → teammate（roster 序）→ subagent（depth 升序，同 depth 按创建序）
超限截断（V1.1-3）：先保留 lead + 全部 teammate（不因上限丢弃 teammate），再按 (depth 升序, createdAt 倒序) 补 subagent，
  直到 32；被丢弃的 subagent 计数写入 channel.truncated = {omittedSubagents, maxDepth:3, maxSessions:32, reason}
显示名：subagent.displayName = `${label} · ${parent.displayName} 的子体`（v1.2 后缀式；仅渲染层，不影响 sender/targets 等数据字段）
```

**截断策略（明确规则，避免实现各自发挥）**：

1. **teammate 永不截断**：teammate 是团队主体，超限只丢 subagent；若 teammate 本身已超过 32（理论不可能，`spawn_teammate` 有成员上限），以 lead + 前 31 个 teammate 为准并标 `reason:'session-cap'`。
2. **subagent 保留优先级**：`depth` 小者优先（直属子会话先于孙代）；同 depth 按 `createdAt` 倒序（最近的先保留）。
3. **提示位置**：频道头成员数旁显示「已省略 N 个深层子会话」，消息流顶部插入一条 system 条（`systemReason:'truncated'`，只出现一次，可点击查看被省略的会话名列表）；提供「仅看最近 3 层」的说明文案。
4. **不静默**：任何截断都必须让用户在 UI 看到，禁止「数据少了一半但无提示」。

**上限常量（`src/core/constants.js`）**：`maxSessions=32`、`maxMembers=64`、**`maxDepth=3`**（V1.1-3）、`perSessionPrefetch=400`、`firstScreen=200`、`pageSize=50`、`maxMessagesInMemory=2000`、`textRender=64*1024`、`textStore=256*1024`、`eventBatch=500`、`mergeDebounceMs=120`、`syncIntervalMs=2000`（仅 v2 降级时启用的轮询兜底）。

#### 4.8.3 Host 侧服务映射（v2 路由 / 集成日排查用）

| 用途 | Service / 方法 | 说明 | 证据 |
| --- | --- | --- | --- |
| 活会话取 Agent | `ctx.agents.get(sessionId): Agent \| undefined`；`ctx.agents.list()/roots()` | 只有 live 会话能拿到 Agent；冷会话为 undefined | host `agents` Service |
| 团队名册（真源） | `ctx.agentTeams.listMembers(agent)` / `membership(agent)` / `tryMembership(agent)` | **要求 exact live Lead Agent**；非 live 时返回/不可用 → 退回投影或日志派生 | host `agentTeams` Service；EVT §5.1 |
| 子会话目录 | `ctx.subagents.listChildren(parentSessionId)`、`listDescendants(rootSessionId)` | durable discovery（可从日志重建），返回 `SubagentDescendantListEntry{parentId, depth,...}` | host `subagents`；EVT §3.2 |
| 读事件（首选） | `ctx.sessionQuery.observeSession(sessionId,{projectionMode:'none'})` | 返回 `SessionObservation{source:'live'\|'prepared', header, events, cursor, revision, retain(), disposition}`，含 Disposable | host `sessionQuery` inspect |
| 读全量日志/谱系 | `sessionQuery.readSession/listEvents/traceSession` | 冷会话、父链校验、跨工作区检测（`header.cwd`） | host `sessionQuery` |
| 活会话事件（备选） | `ctx.sessions.get(id): Session` → `ownEvents()/snapshotEvents()/firstLiveSeq/isOwnSeq()` | 只在 live 时可用；用于性能旁路（不必经 sessionQuery 反序列化） | host `sessions` Service |
| 投影 | `sessionProjections`（`agentTeam` 等）/ `SessionObservation.projections` | 服务端缓存/增量时读投影，避免重放事件 | host `sessionProjections`；API §C5-3 |
| 自定义路由 | `connection.fetch.register({path,methods:['POST'],requestBody:'buffered',fetch})` 或 `webServer.register(route)` | v2 读接口挂载（先例 dsh-context） | API §C5-2；host `connection`/`webServer` |
| 发送（v1 不用） | `remote.session.prompt` / `remote.subagents.prompt`（`ISession.prompt` 内部调用） | 浏览器侧唯一发送通路；Host 直调会话 prompt 的 requestId/因果语义 **UNVERIFIED**，不作为 v2 发送方案 | API §C2 |
| 发送（未来 peer 增强） | `ctx.agentTeams.sendMessage(caller: Agent, {target, content, signal})` | 需 live lead Agent；仅 §5.6 未来增强 | host `agentTeams`；API §C3 |

> **谁会调**：v1 只有**群聊视图 UI** 通过 `ChannelSource` / `sendBatch` 调用上述客户端 API；不暴露 tool、不注册 command、不注册 server route，因此无新增攻击面。v2 路由只接受**同源已准入 peer** 的 POST，并在 handler 内做谱系/工作区校验（§4.9）。

### 4.9 权限、数据范围与隐私

- **范围**：仅 lead 的**后代会话**（teammate + subagent）；不读同工作区其它根会话，不跨工作区（EVT H-6：无跨 workspace 团队证据）。
- **读**：v1 依赖用户已有会话访问权（会话语义上同一用户）；成员会话在 `retain` 前用 `useSessionAccess` 检查，失败 → 该成员降级为「不可读」占位（不阻断整个频道）。
- **发送**：`capabilities()` 检查 `sessions.binding(target)` 存在、`parentAvailable !== false`、会话未归档；只读态禁用。
- **隐私**：不展示系统提示词、token、完整文件内容；`rawText` 仅内存保留，不写日志；诊断日志默认关闭（`localStorage['group-chat:debug']==='1'`）。
- **v2 路由**：peer 准入由连接层完成；插件内再做 `cwd` 相等 + 谱系校验（双层，防越权）。错误一律 403 而非 404 泄漏存在性（对非后代）。

---

## 5. 发送通路

### 5.1 目标解析与成员目录（v1.5：D-A 可寻址 + D-C 无团队发送）

```
draft = { text, mentions: string[] }        // 来自 Composer 的 chips，而非文本扫描
targets = dedupe(['lead', ...mentions.filter(isAddressable)])
if targets.length === 0 → ['lead']
if mention 指向已离开/不可寻址成员 → 丢弃并在说明行提示（UX §6.7「@pm 已离开，未发送」）
```

- **@ 只来自 chips**：正文里的字面 `@decorator` 不升级为提及（PRD F4 语义边界 / 反模式「@ 语义双关」）。
- **可寻址集合（D-A v0.6.2 冻结）**：
  | 成员 | 可寻址？ | 判定依据 |
  | --- | --- | --- |
  | Lead | **恒可寻址** | 频道根会话，永远可 prompt |
  | teammate | **恒可寻址**（含 inactive） | `prompt(..., 'steer', ...)` 可冷唤醒 inactive/冷目标（S3 实测） |
  | subagent | **仅 `running`/`provisioning`** | `SessionSnapshot.running` + 成员状态；`one-shot` 完成后不再可寻址 |
  | 已离开/归档成员 | 否 | roster 移除或 archived |
- **补全过滤**：`MentionPopup` 只列出可寻址成员；不可寻址的历史成员不出现在列表；输入框残留的失效 chip 在发送前剔除并提示（`member.leftNotSent`）。
- **无团队发送（D-C）**：当前会话没有团队时**允许发送**，`targets = ['lead']`（即当前会话），走普通会话 `prompt`，产生该会话的普通用户消息；不出现「同时发送给…」说明行；`@lead` 与默认等价；不出现多目标能力（PRD F13/SC15）。
- **`@all` 不支持**（PRD F6 明确 v1 不做）。
- 目标名 → sessionId：由成员目录反查；`lead` → channelId；无团队时 lead 即当前会话。

### 5.2 投递协议（文本框定协议 v1.1 · canonical 冻结）

**依据**：UX D2 最新版（用户消息身份 + `[群聊 · 同发]` 收件人前缀）+ Lead 决策 V1.1-1（canonical 精确字节 + 第二行固定说明 + protocol.js 单点常量）。

**canonical 模板（bytes 冻结，不随 UI locale 变化；这是给 agent 读的协议文本，不是 UI 文案）**：

```
[群聊 · 同发] 收件人：@lead、@ux、@backend
（本消息由用户在「群聊」视图同时发送给上述 3 位成员，各成员各自收到一份。）
```

规则：

1. 仅当 `targets.length > 1` 时注入；单目标（默认 Lead）**不加前缀**，按普通用户消息发送（PRD F7/SC28）。
2. **前缀由两个独立 `PromptContentPart` 组成**（便于接收侧按 `content[0]/content[1]` 精确校验，符合 PRD SC27 的证据口径）：
   - part1：`[群聊 · 同发] 收件人：` + 收件人列表（`@lead` 必含且排第一，其后按成员目录顺序，全角「、」分隔，每个名字前加 `@`）；
   - part2：`（本消息由用户在「群聊」视图同时发送给上述 N 位成员，各成员各自收到一份。）`，其中 `N` 为**实发目标数**（整数，如 3）；
   - part3：用户正文原文（Markdown 源码，不转义、不缩进）。
   - 即 `prompt([part1, part2, part3], 'steer', signal, requestId)`；单目标时只有 `[part3]`。
3. **单点常量**（`src/core/protocol.js`，全仓库唯一字面量）：
   ```js
   const PROTOCOL_V1 = {
     version: 1,
     head: (names) => `[群聊 · 同发] 收件人：${names.map(n => '@' + n).join('、')}`,
     explain: (n) => `（本消息由用户在「群聊」视图同时发送给上述 ${n} 位成员，各成员各自收到一份。）`,
     parseHead: /^\[群聊 · 同发\] 收件人：(.+)$/,
     parseExplain: /^（本消息由用户在「群聊」视图同时发送给上述 (\d+) 位成员，各成员各自收到一份。）$/,
   }
   ```
   改文案只改这一处 + 快照测试；PRD v0.3 若定稿为不同字符串，也只改这里。
4. **解析/剥离**（渲染侧）：若 `content[0]` 命中 `parseHead` 且 `content[1]` 命中 `parseExplain` → `text = content[2..] 拼接`，`rawText = 全部原文`，`targets` 取头部解析结果；解析失败 → 原样渲染 + `meta.prefixParseFailed=true`（不丢消息）。
5. **副作用（有意）**：接收方在自己的会话里看到的是**普通用户消息 + 两行前缀**，因此能读到「同一份内容同时发给了谁」（满足 R4 的「告知接收方」）。代价是其它视图也会看到这两行——这是唯一能持久告知接收方的手段（API §C4）。
6. **已知限制**：用户手打相同模板可能被误合并 → 仅当本地存在同文本发送记录（time±5min 且 targets 一致）时才合并，否则按普通用户消息渲染（§4.4）。

### 5.3 发送时序与状态机

```
点击发送
  ├─ 1. 校验：text 非空 / 非只读 / 无 in-flight batch / 目标可达（capabilities）
  ├─ 2. 生成 clientBatchId、每个 target 的 requestId（uuid v4，**重试复用**）
  ├─ 3. 本地插入一条 echo：id=local:<batchId>, delivery='sending', deliveries[target]='sending'
  ├─ 4. **按固定顺序串行发送（S3 硬约束）**：
  │      4a. 先发 lead（binding(lead).session.prompt → 普通会话路径，顺带 resume lead，使父链在线）
  │      4b. 再逐个发 teammate / subagent（子会话路径要求父 Agent 在线，否则 subagent/parent-unavailable）
  │      ⚠ 禁止并行/乱序：成员目标若在 lead live 之前发出，会因父不可用而失败
  │      binding(target).session.prompt(parts, 'steer', signal, requestId)   // parts=[part1,part2,part3]（§5.2）；单目标仅 [正文]
  │      ok  → deliveries[target]='sent'
  │      err → deliveries[target]='failed'（记录 RemoteError.code/message）
  ├─ 5. 汇总（V1.1-2 四态）：全 sent → 'sent'；部分失败 → 'partial'（「已送达 X/Y」+ 失败清单）；
  │      全失败 → 'failed'；sending 仅在仍有目标在途时
  ├─ 6. 权威事件到达（rpcId 精确对账，S2）：
  │      lead 的 user/message.source.rpcId === requestId[lead] → 用权威消息替换 echo（保留 deliveries/说明行）
  │      其余目标同理按各自 requestId 认领；`messageId`（子会话 prompt 返回）作双保险
  └─ 7. 重试（仅 failed/partial 的失败目标）：复用原 requestId 重发（Host 幂等去重，不双投），≤2 次 + 退避；
         成功目标永不重发；重试前先对账一次
```

**`mode` 选择（契约按 PRD §6.1/§6.3 冻结为 `steer`；Spike S3 解释语义、不改变契约）**：

| 目标 | mode | 依据 |
| --- | --- | --- |
| lead / teammate / 可寻址 subagent（running 或 inactive） | `'steer'` | PRD §6.1/§6.3 冻结；S3 实测 `steer` 在最近 step 边界插入（running）且会唤醒 inactive/冷目标；**不打断当前 step** |
| 不可寻址（one-shot/external 子会话、已离开成员） | 不发送 | API R4 / §5.1 |
| 父 Agent 不在线（子会话） | 不发送（`parent-unavailable`） | S3：`subagents.prompt` 要求父 Agent live；靠「先 lead 后成员」避免 |

> UI 文案注意：`steer` 的语义是「插话到最近 step 边界」，**不要写「下一轮」**（那是 `queue`/followup 的语义）。S3 同时证明 `queue` 也会唤醒目标，但 PRD 已冻结 steer，v1 不再做 queue/steer 双策略；保留 `span.agentAvailable` / `parentAvailable` 作为「目标当前可否接收」的弱信号。

**对账（reconcile，S2 升级为精确对账）**：发送侧保留 `{ requestId, targetSessionId, targetName, sentAt }`；订阅/轮询时扫目标会话 `user/message`：

1. **主对账（强）**：`data.source.kind==='user' && data.source.rpcId === requestId` → 认领成功（普通会话与子会话两条路径均成立，S2 已实测）；子会话另有 `remote.subagents.prompt` 返回的 `{messageId}`（= `user/message.data.id`）作**双保险**；
2. **兜底（弱）**：rpcId 不可得时（仅极端异常），用「前缀文本 + time±5min + targetSessionId」弱匹配；
3. 用途：刷新后恢复「已发送」、重试前判重（避免重复投递）、`deliveries` 收敛；
4. **窗口边界**：Host 幂等只看当前 inbox + 内存日志（`hasPromptRequest`），会话被驱逐且日志裁剪后不保证；因此重试设上限（≤2 次 + 退避），不依赖无限幂等。
### 5.4 幂等、并发、限流

| 议题 | 设计 |
| --- | --- |
| 幂等 | 同一 `clientBatchId` 最多创建一个 echo、一次 fan-out；重试只补 failed/partial 中的失败目标且**复用原 `requestId`**——Host 按 rpcId 幂等去重（S2），重发不会双投；重试前先精确对账（§5.3），≤2 次 + 退避 |
| 并发 | 每频道单飞（`inFlightBatchId` 非空时发送按钮 loading+disabled，PRD SC23）；不同频道（会话切换）互不阻塞 |
| 限流 | **lead 先、成员后**的串行发送（S3 硬约束，禁止并行乱序）+ 每个 prompt 之间 `minIntervalMs=200`；单批最多 `maxTargetsPerBatch=8`（超出提示）；v2 路由不实现，无服务端令牌桶 |
| 中断 | 每批持有 `AbortController`；切会话/卸载视图时 abort 未完成目标（已 accepted 的不撤回）；UI 标「已取消的未发送目标」 |
| 失败重试 | 手动重试（PRD F9）；仅对失败目标、复用 requestId、≤2 次 + 退避；成功目标永不重发；发送不做自动重试（UX Q2） |
| 超时 | 单目标 prompt 30s 超时视为 failed（`timeout`），可重试 |

### 5.5 失败矩阵（用户可见文案走 i18n，`reason` 为内部码）

| reason | 触发 | UI | 可重试 |
| --- | --- | --- | --- |
| `network` | fetch/Remote 失败 | 「发送失败：网络中断，已保留原文」 | ✓ |
| `timeout` | 30s 未 accepted | 「发送超时，已保留原文」 | ✓ |
| `unaddressable` | 成员不可寻址/已离开 | 「@pm 已离开，未发送」 | ✗ |
| `parent-offline` | 预检发现子会话父 Agent 离线（`parentAvailable===false`） | 「子会话所属成员已离线，未发送」 | ✗（成员恢复后可重试） |
| `parent-unavailable` | 发送时 Host 返回 `subagent/parent-unavailable`（父链未 live；S3） | 「目标成员尚未唤醒，已跳过」 | ✓（按「先 lead 后成员」重排后重试，≤2 次） |
| `readonly` | 团队结束/归档 | 「团队已结束，群聊为只读历史」 | ✗ |
| `forbidden` | 权限拒绝 | 「无权限向该成员发送」 | ✗ |
| `payload-too-large` | 正文 > `textStore` | 「内容过长，请分段发送」 | ✗ |
| `rate-limited` | v2 429 | 「发送过于频繁，请稍后重试」 | ✓（退避） |

### 5.6 未来增强（不排期）：Host 侧 peer 投递（D2 最新版已不要求；S1 通过后更无必要）

**现状**：UX 最新版 D2 已明确 v1 以**用户消息身份**投递，因此本方案**不是 v1 的阻塞项**，仅作为未来增强记录。

**何时才需要**：如果未来产品希望 teammate 把群聊消息当作「lead 的 peer 消息」（例如需要 Team mailbox 统计、或希望 teammate 的上下文里出现 `agent-message` 语义），则需在 Host 侧以 **lead Agent** 身份调用 `ctx.agentTeams.sendMessage(caller=leadAgent, {target, content, signal})`（[证据] 签名见 host catalog；`SendTeamMessageResult{messageId}`）。约束与代价：

1. `caller` 必须是**活着的 lead Agent**（`ctx.agents.get(leadId) ?? undefined`）；lead 离线 → 不可用；
2. 接收侧 `source.kind='agent-message'`，正文首块是 `Team message from lead:`（EVT §2.3），**「来自用户」语义丢失**，需把「用户经群聊发送」写进正文前缀；
3. 会产生 Team mailbox 语义（agent 发消息，而不是用户发言），影响 lead 自己的上下文与 `agentTeam` 统计；
4. 需要 Host 路由 + 权限校验（不能把「以 lead 名义发言」暴露给任意 peer）；且发送不再走浏览器 `prompt`，`requestId/rpcId` 对账机制需重做。

**架构结论**：v1 采用「用户消息 + 群聊前缀」（可实现、今日可测、与 UX 最新版 D2 一致）；peer 身份列为**未来增强**，不排期、不阻塞实现（§10 D-ARCH-01 仅作记录）。

---

## 6. 客户端设计

### 6.1 Slot 注册与 props

```js
// src/client/entry.js（唯一有副作用的模块；由 scripts/build.mjs 与各 parts 一起拼进 lib/client.js）
window.__ModuleLoader__.load({
  id: 'dsh-group-chat',
  factory: (require) => {
    const React = require('react')
    const module = { exports: {} }

    // ---- 依赖各 parts：GroupChatView / ChannelController / send 模块等 ----

    module.exports.apply = (ctx) => {
      const NS = 'group-chat'
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'group-chat: locale')
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: 'group-chat',
        order: 5,                            // 紧跟 chat(0)；不撞 trajectory(10)/context(20)/terminal-panel(30)/fleet(30)/capability(40)
        locale: NS,
        label: () => t('view.tab'),          // thunk：locale 切换自动重读
      }, GroupChatView))
    }
    module.exports.inject = ['slots', 'locale', 'sessions']
    return module.exports
  },
})
```

- **label 保持纯文本、不做未读圆点**（V1.1-5 / Spike S4）：tab 渲染只有 `<span class="tabLabel">{label}</span>`，**无 icon/badge 装饰位**，且 label thunk 只在 tab 行重新投影时重读、**不响应外部 store 变化**。因此未读状态全部在视图内部表达（频道头提示 + 新消息浮标），禁止在 label 里拼动态状态。
- **不使用** `children`/`store`/`inject` 扩展点：群聊内部自管组件与 store，避免依赖 slot 的未公开语义（`store` 仅官方 chat 用过）。
- **ownerProps**：用 `openView('chat', focus)` 做「打开所属会话」；`inspectCall` 不在 v1 使用。
- **standardProps 使用清单**：`sessionId`（频道定位）、`useSessions`（roster/member/summary）、`useSessionStatus`（运行态）、`useSessionAccess`（读权限）、`useSession`（lead 快照，取 subagent.address）、`useSessionRetainInfo`（判断会话是否已被主视图保留，避免重复 retain 冲突）。其余（`useChat/useTrajectory/useInput/inputActions`）**不使用**（理由：群聊不依赖 ChatNode，也不复用 composer，API §F「明确不做」）。

### 6.2 组件树（T2 交付 · v1.2 气泡流）

```
GroupChatView(props)
├─ ChannelHeader（56px，padding 0 28，底边 1px border-l3）
│  ├─ GroupAvatar（32×32，圆角 8，2×2 头像拼贴：Lead=business-primary，其余 business-tertiary/layer-3/label-dimmed）
│  ├─ GroupTitle（「群聊」14/500 label-primary）
│  ├─ Divider（1×14，border-l2）
│  ├─ TeamName（lead 会话标题，14/400 label-secondary，单行省略）
│  ├─ StatusLine（6px 点 state-success-primary + 「{n} 名成员 · {m} 个运行中」11/400 label-tertiary）
│  ├─ FilterButton（32×32，interactive-bg-hover + 圆角 8；打开 MemberFilterPopover）
│  ├─ NewMessagesHint（未读「{n} 条新消息」11 caption；点击滚到底并清零，V1.1-5）
│  └─ TruncationHint（「已省略 N 个深层子会话」，V1.1-3；点击看列表）
├─ Banners（ReadonlyBanner / ReconnectBanner / FilterBanner / DegradedBanner）
├─ MessageFeed（@tanstack/react-virtual 虚拟列表）
│  ├─ TimeDivider（居中 12/400 label-caption，如「今天 · 11:02」；日期变化或间隔 ≥5 分钟才插入）
│  ├─ CollapsedNote（M4 ① 一般系统提示/完成提示：居中 11.5/400 label-tertiary，无背景药丸）
│  ├─ WelcomeNote（M4 ② 成员加入欢迎：**右对齐** 12/400 `state-business-primary`「欢迎 @{name} 加入群聊」，无底色；与 member_card 成对、pairOrder=0）
│  ├─ MemberJoinMessage（M8 = **creator 发出的一条带卡消息**；**不存在孤立卡片路径**）
│  │  ├─ SenderLine(creator)（头像 32 + 名字 14/600 label-primary + 角色小标签 11 label-caption「主 Agent」/「Teammate」+ 时间 11 同行贴右；不做气泡）
│  │  └─ CardBody（max-width 520、bg-layer-1、border-l2、radius 12、padding 16；视觉上从属于这条 creator 消息）
│  │     ├─ CardTitle（「@{name}」加入群聊 13/500 label-primary）
│  │     ├─ CardDescription（12/19 label-secondary 1–2 行；空→「暂无角色描述」label-tertiary）
│  │     ├─ InfoRows（label 11 label-caption / value 12 label-secondary；模型/上下文/创建方式/父成员，空值隐藏整行）
│  │     ├─ InitialTask（label 11 + 正文 11/17 label-tertiary 两行截断 +「展开」11 文字链；展开只影响本卡）
│  │     └─ CardActions（查看会话 12/500 business-primary；查看任务 12 secondary 仅 teammate；均为文字链接）
│  ├─ TaskCardMessage（M9 = 操作者发出的一条带卡消息；sender=actor，紧凑版用于密集流）
│  │  ├─ SenderLine(actor)（复用 M8：头像 32 + 名字 14/600 + 角色小标签 11「主 Agent」/「Teammate」+ 时间 11 贴右；不做气泡）
│  │  └─ CardBody（max-width 520、bg-layer-1、border-l2、radius 12、padding 16；紧凑版约 84px）
│  │     ├─ TaskActionRow（动作标签 11 label-caption + 状态 pill 20/999 + `task-N` 等宽 11 label-caption 贴右）
│  │     ├─ TaskTitle（subject 14/600 label-primary，单行省略）
│  │     ├─ TaskDescription（create 卡 11.5/17 label-tertiary 2 行 +「展开」；其它卡 1 行/隐藏）
│  │     ├─ TaskInfoRows（负责人 / 依赖 / 完成时间；label 11 caption / value 11.5 secondary，行高 20）
│  │     └─ CopyTaskId（「复制任务 ID」11.5 business-primary 文字链；无任务详情页）
│  ├─ MessageRow（不再有整行时间戳/徽标/chip 行/FinalTag）
│  │  ├─ SenderLine（agent 侧：头像 32 + 名字 14/500 label-secondary + 状态 11/400 label-caption + 6px 状态点）
│  │  │   └─ subagent 名字后缀：`· <父显示名> 的子体`（11 label-caption，无缩进/连接线）
│  │  ├─ Bubble（自适应：max-width 600 / 窄屏 70%；**自己=用户气泡 r20/p10×16，他人/系统/卡片 r12/p10×14**；正文 14/22；他人 bg-layer-2、自己 bg-layer-3）
│  │  │  ├─ MessageBody（MarkdownText；M2 的 `@目标` 内联正文首行，state-business-primary；自己右对齐）
│  │  │  ├─ FileRow（M5：文件名 + PathLabel + 「打开」）
│  │  │  └─ ToolCollapseLine（M6：11/400 label-caption 单行「{n} 个工具调用 · 见「轨迹」」）
│  │  ├─ BubbleCaption（气泡下 11/400 label-secondary：同发说明 / 发送中 / partial「已送达 X/Y」/ 失败原因 + 重试/复制）
│  │  └─ RowActions（hover/focus：复制、打开所属会话；无行内时间）
│  └─ (self) MessageRow：无 SenderLine，Bubble 右对齐 + BubbleCaption
├─ NewMessagesPill（「↓ N 条新消息」：layer-2 底 + border-l2 + 投影 + 6px 蓝点 + business-primary 文字）
├─ MemberFilterPopover（单选：其发言 + 发给它 + 被它 @；父成员含其 subagent）
└─ Composer
   ├─ TargetRow（「发送给」+ Lead badge + @chips + 提示文案）
   ├─ TextArea（placeholder「回复群聊…」，最多 336px 高后内部滚动）
   ├─ MentionPopup（listbox：↑↓ / Enter/Tab / Esc / 点击外部；380 宽；IME 组合期不拦截）
   └─ ToolRow（+ / 权限 / 自动继续 / 模型 / 发送键）——v1 仅保留「发送」
```

> 说明：Composer 内的「发送给」行与 @ 提及 chip 属于**输入区**，与消息气泡内的内联 @ 不是同一视觉；消息侧不再有 chip 行。

### 6.3 客户端可复用能力（实测证据）

#### 6.3.1 模块注册表（[证据] `dsh-web-frontend` 引导代码 `OZ()`）

浏览器引导期注册、可直接 `require()` 的模块：

| 模块 | 用途 | 本插件用法 |
| --- | --- | --- |
| `react` / `react/jsx-runtime` / `react-dom` | 渲染 | 用 `react` + `h()`（无转译） |
| `@tanstack/react-virtual` | 虚拟列表 | `MessageFeed` 必须使用（§6.11） |
| `@deepseek-ai/dsh-client-store` | `createSnapshotStore/defineStore/notifySubscribers/shallowEqual` | 可选；v1 用自带极简 store（减少未知 API 风险） |
| `@deepseek-ai/dsh-client-ui-primitives` | 组件库 | 见 §6.3.2 |
| `@deepseek-ai/dsh-client-ui-slots` | slot 渲染器 | 由框架使用 |
| `@deepseek-ai/cordis`, `zod`, `@deepseek-ai/dsh-client-ui-dockkit` | 框架 | 不使用 |

#### 6.3.2 UI primitives 可用导出（[证据] 从 bundle 导出表提取，101 个非图标导出）

**本插件直接复用**：

| 需求 | 组件/工具 |
| --- | --- |
| Markdown 正文 | `MarkdownText`（props 精确形状 UNVERIFIED，实现首日 spike） |
| 代码块/终端/JSON/差异 | `CodeBlock`、`TerminalBlock`、`JsonBlock`、`DiffBlock`、`ReadBlock`、`SearchBlock`、`WebBlock`、`useCodeHighlighter` |
| 按钮/图标 | `Button`、`Icon*`（Medium/Regular 两套 stroke）、`Pill`、`Tag`、`ReferenceChip`（**v1.2 起 Pill/Tag 不再用于消息头徽标**，仅菜单/浮层可用） |
| 弹层/菜单 | `Menu`、`MenuSurface`、`MenuItemButton`、`HoverCard`、`Tooltip`、`useAnchoredPosition`、`useDismissOnOutsidePointer`、`useAnchoredMaxHeight` |
| 状态/骨架 | `StateDot`、`TextShimmer`、`Toast` |
| 时间/剪贴板 | `relativeTime`、`writeClipboard` |
| IME | `observeComposition`（组合输入期间不拦截按键，UX §6.6） |
| 可访问性 | `focusWithoutRing`、`pointerModality`、`modalSelector`、`useModalLayer` |
| 文件 | `FileTypeIcon`、`PathLabel`、`classifyFileType`、`fileSizeText` |

**降级**：若某导出在目标版本不存在，用原生 `<button>`/`<ul role="listbox">` + 本插件 CSS 实现；**禁止**为此引入新依赖。

### 6.4 状态与数据流

#### 6.4.1 Store 形状

```ts
interface GroupChatState {
  channel?: ChannelSnapshot
  messages: ChannelMessage[]          // 已排序、已去重、已合并
  cursor?: ChannelCursor
  phase: 'idle' | 'loading' | 'ready' | 'error'
  error?: { code: string; message: string; retryable: boolean }
  loadingOlder: boolean
  reachedOldest: boolean
  unreadCount: number                 // 未贴底时新增计数（F18）；同时驱动「↓ N 条新消息」浮标与频道头 NewMessagesHint（V1.1-5）
  filter?: string                     // 成员筛选（name）
  draft: { text: string; mentions: string[] }
  send: { inFlight?: { clientBatchId: string; startedAt: number } }
  folded: Record<string, boolean>     // messageId → 展开状态（仅 UI）
  collapsedByDefault: boolean
}
```

#### 6.4.2 数据流

```
props.sessionId → deriveLead()
   → ChannelSource.open(lead)（或从同会话缓存恢复）
   → store.commit(page)
   → MessageFeed 选择器：filter(messages) + virtualizer
   → subscribe(append/reset/status)
        append → 增量归一化 → store.append（20ms 批处理）
        reset  → 清空并重拉 snapshot（一次）
```

- **订阅生命周期**：`useEffect` 内 `source.subscribe`，返回函数里 `source.close()`；会话切换时先 `close` 旧频道再 `open` 新频道（PRD F15「不串数据」）。
- **渲染节流**：事件批量（`eventBatch=500` / `mergeDebounceMs=120`）合并后再 setState；一次 append 只触发一次渲染。
- **选择器**：`filter` / `group` / `visibleRange` 全部记忆化；行组件 `React.memo`，`key` 用 `ChannelMessage.id`。
- **草稿**：按 `channelId` 存内存 Map；可选 localStorage（key `group-chat:draft:<channelId>`，只存文本+mentions，24h 过期）。切换会话恢复（SC18）。

#### 6.4.3 折叠状态

- 默认折叠判定：`textLength > 400 || text 行数 > 8`（UX D6）；
- 展开状态只存 `folded[id]`，不写回消息；
- 展开时记录被展开消息的 `scrollTop` 锚点，`requestAnimationFrame` 后恢复（SC5 要求顶部偏移 ≤4px）。

#### 6.4.4 筛选语义（F11 / D-B 冻结）与只读态（P11）

**筛选（D-B v0.6.2 冻结）**：

```
selected = 单选成员名（频道头筛选菜单）
match(m, selected):
  m.sender.name === selected            // 该成员发言
  || m.targets.includes(selected)       // 发给该成员 / 被它 @
  || (selected 是 teammate 且 m.sender 是其 subagent)   // 子体归入父成员筛选
  // 选 subagent 时：只显示该 subagent 自己的消息，不反向包含父成员
  // 不做正文文本搜索（不做 text.includes('@'+selected)）
  // 不做多选 / 时间范围 / 消息类型组合
no match → 顶部提示条「该成员暂无消息」
```

- 筛选是**纯视图层**（不改 messages，只改可见投影）；筛选不改变未读计数与实时追加（隐藏消息仍在后台累计）；清除后恢复原滚动位置。
- 频道头筛选图标打开菜单（单选），选中后顶部提示条 `正在只看 {name}（{n} 条）` + 右侧「清除」文字链；频道头状态位追加 `· 筛选: {name}`（UX P11 右）。
- 内联 `@名字` 点击 = 筛选该成员（UX Q6）；hover/菜单可「打开该成员会话」。
- **筛选空态**：该成员暂无消息时显示提示条（不是空频道空态）。

**只读态（P11 左，F17）**：

1. 判定：用户对 lead 无发送权限，或团队已结束/归档（lead `running===false` 且全部成员 `inactive` 持续 ≥ `readonlyIdleMs` 90s；归档字段名 UNVERIFIED），判定不确定性**偏向可写**。
2. 表现：顶部横幅 **`当前为只读历史，不能发送`**（`data-testid="group-chat-readonly-banner"`）；频道头状态位追加 `· 团队已结束`；输入区 40% 禁用、占位 `团队已结束，群聊为只读历史`；隐藏重试与所有写操作。
3. 仍可用：历史加载、筛选、复制、跳转、折叠展开（PRD F17/SC20）。

### 6.5 消息渲染映射表（kind → 组件 + 字段 · v1.2 气泡流）

| kind | 组件 | 行首（SenderLine） | 正文（Bubble） | 气泡下（BubbleCaption） | 数据字段 |
| --- | --- | --- | --- | --- | --- |
| `user`（M1） | `MessageRow(self)` | 无（右对齐，不显示自己头像/名字） | `Bubble` 自己样式（bg-layer-3）MarkdownText | 同发说明「已同时发送给 Lead、@ux、@backend」（**无绿勾**）/「发送给 Lead」/ 发送中 / partial「已送达 X/Y」/ 失败原因 + 重试/复制 | text, deliveries, delivery |
| `agent_to_agent`（M2） | `MessageRow` + `SenderLine` | 头像 + 名字 + 状态点 | `Bubble`（bg-layer-2）：**`@目标` 内联正文首行**（如 `@backend 接口清单已确认…`），无独立 chip 行 | 发送态（仅用户来源需要）/ 无则省略 | sender, targets |
| `agent_output`（M3） | `MessageRow` + `SenderLine` | 头像 + 名字 + 状态点 | `Bubble`（普通气泡，**无「最终输出」徽标**）MarkdownText（折叠） | 无（hover 提供「打开所属会话」） | turn, isFinal（仅排序/去重，不进 UI） |
| `system`（M4） | `CollapsedNote`（① 默认）/ `WelcomeNote`（② 成员欢迎） | — | ① 居中 11.5/400 label-tertiary 纯文本（无底色）；② **右对齐 12/400 `state-business-primary`**（无底色） | — | systemReason（②='member-welcome'） |
| `member_card`（M8） | `MemberJoinMessage` = `SenderLine(creator)` + `CardBody`；前置同组的 `WelcomeNote`（`system` 消息） | **sender=creator**：头像 32 + 名字 14/600 + 角色小标签 11（主 Agent / Teammate）+ 时间 11 | `CardBody`：`CardTitle` + `CardDescription` + `InfoRows`（模型 `{model}（继承 Lead/creator）` / 上下文 / 创建方式 / 父成员，空值隐藏行；D-D）+ `InitialTask`（2 行截断，可展开） | `CardActions`：查看会话 / 查看任务（文字链接） | sender=creator；memberCard{member,time,actions}；creationId/pairOrder |
| `task_card`（M9） | `TaskCardMessage` = `SenderLine(actor)` + `CardBody` | **sender=actor**（Lead / teammate；操作者头像 32 + 名字 14/600 + 角色标签 11 + 时间 11） | `CardBody`：`TaskActionRow`（动作标签 + 状态 pill + task id）+ `TaskTitle` + `TaskDescription`（create 可展开）+ `TaskInfoRows`（负责人/依赖/完成时间）+ `CopyTaskId` | `CopyTaskId`（文字链）；无详情页 | sender=actor；taskCard{action,task,actionLabel,statusLabel,actor,dedupeKey} |
| `delivery`（M5） | `MessageRow` + `Bubble` 内 `FileRow` | 头像 + 名字 + 状态点 | 文件名 + PathLabel + 「打开」 | — | files |
| 工具过程（M6） | `ToolCollapseLine` | — | 11/400 label-caption 单行「{n} 个工具调用 · 见「轨迹」」（无背景条） | — | toolCallCount |
| subagent 发言（S） | 与 `agent_to_agent`/`agent_output` **完全相同** | 名字后缀 `· <父显示名> 的子体`（11 caption）；**无缩进、无连接线** | 与普通气泡一致 | 同上 | sender.kind='subagent' |

- **统一规格**：Bubble `max-width:600px`（窄屏 `70%`）、正文 `14/22`；**用户气泡 `radius:20` / `padding:10px 16px`（`--gc-user-bubble-*`），agent/系统/卡片消息气泡 `radius:12` / `padding:10px 14px`（`--gc-bubble-*`）**；他人气泡 `--dsw-alias-bg-layer-2`，自己 `--dsw-alias-bg-layer-3`；消息间距 16（同一发送者连续消息 8）。
- **时间**：不再每行显示时间戳；只由 `TimeDivider` 表达（`今天 · 11:02`，12/400 label-caption，日期变化或间隔 ≥5 分钟）。
- **DOM 契约**：v1.5 起冻结为独立表，见 §6.5.2（tester 的唯一选择器来源，实现不得改名）。

#### 6.5.1 卡片动作「查看会话」的精确 API 与降级（V1.3-5）

**主路径（客户端 Cordis 服务，官方同款）**：

```ts
const uiWorkspace = ctx.get('uiWorkspace') as { openSession(target: SessionTarget): void } | undefined
// 官方 conversation 头部的 More 菜单就是这么做的：workspaceNavigation = ctx.get('uiWorkspace')
//   → workspaceNavigation.openSession(id)   （见 client-runner 声明 / ui-conversation 实现）

type SessionTarget = SessionId | SubagentAddress
interface SubagentAddress {
  kind: 'subagent'
  parentSessionId: SessionId
  childSessionId: SessionId
  mode: 'one-shot' | 'continuable' | 'unknown'
}
```

证据：`dsh-cordis-client-runner` 的 client 声明目录中 `uiWorkspace.openSession(target: SessionTarget): void`，描述为「Select a Session and show its Conversation as one UI navigation action」；`dsh-client-ui-conversation/lib/client.js` 的 `apply()` 内 `const workspaceNavigation = ctx.get("uiWorkspace")`，头部视图菜单 `open: (id) => workspaceNavigation.openSession(id)`。

**调用顺序**：

1. **权限预检**：`useSessionAccess(member.sessionId, 'read') === false` → `actions.viewSession='disabled'`，点击 Toast「无权限打开该会话」（不调用 API）；
2. **首选**：`uiWorkspace?.openSession(member.sessionId)`（已知会话身份）；
3. **子会话兜底**：若 member.kind==='subagent' 且首次调用未生效/抛错 → `uiWorkspace.openSession({ kind:'subagent', parentSessionId: creator/父会话 id, childSessionId: member.sessionId, mode })`（durable direct-parent address 形态）；
4. **无 uiWorkspace（未挂载 / 第三方注入不可用）**：降级 = `writeClipboard(member.sessionId)` + Toast「无法直接跳转，已复制会话 ID」；**不要**用 `openView('chat', focus)` 冒充——`openView` 只切「当前会话」的视图 tab，不能跨会话导航（v1.1 曾误以为可跳转，这里明确纠正）；
5. **目标会话已删除/不可读**：`actions.viewSession='disabled'` + 文案「会话不可用」；不抛错到控制台。

**注入声明**：`package.json` 的 `dsh.client.inject` 增加 `@deepseek-ai/dsh-client-ui-workspace`；代码里用 **`ctx.get('uiWorkspace')` 可选获取**（不写进硬 `inject` 数组，避免该服务缺失时整插件不激活）。**UNVERIFIED**：第三方 client 插件能否拿到 `uiWorkspace` 需在集成日实测；不能拿到就按第 4 步降级（功能不缺，只少一次跳转）。

**关于 `ctx.sessions`**：它只有数据面方法（`retain/binding/list/…`），**没有导航方法**；`retain` 只建立读引用，不会切换 UI。因此「查看会话」只能走 `uiWorkspace.openSession`，这也是官方 More 菜单的做法。

**「查看任务」**：`member.kind==='teammate'` 时可用，行为 = 打开该成员会话并在会话内切换到任务/看板（若宿主无该视图则降级为复制成员名 + 提示）；v1.3 只要求按钮存在且 `data-action` 正确，具体落地由实现任务定。**「展开」**：纯本地状态，不调 API。

#### 6.5.2 DOM 契约（v1.5 冻结 · tester 唯一选择器来源）

> 依据 `tests/design/test-plan.md` §13 全量采纳。**这些 `data-testid` / `data-*` / `role` 是实现契约**：不得改名或删除；新增只能升版本并同步 test-plan。所有属性值均为字符串，布尔状态用属性存在/取值表达。

| 区域 | 冻结选择器/属性 | 用途 |
| --- | --- | --- |
| 消息流容器 | `data-testid="group-chat-feed"` | SC2/3/12/13 |
| 时间分隔 | `data-testid="group-chat-time-divider"` | SC2/13 |
| 消息行 | `data-kind`（user/agent_to_agent/agent_output/system/delivery/member_card）+ `data-message-id` + `data-status`（sending/sent/partial/failed） | SC3/10/11/30 |
| 气泡 / 说明 | `data-testid="group-chat-bubble"` / `group-chat-bubble-caption` | SC5/9 |
| 内联 @ | `data-mention="<name>"`（正文首行） | SC4/7 |
| subagent 行 | `data-member-kind="subagent"` + `data-parent="<父名>"` | SC16/31 |
| 欢迎提示 | `data-kind="system"` + `data-system-variant="welcome"` | SC32/33 |
| 入群消息 | `data-kind="member_card"` + `data-sender="<creatorName>"` + `data-card="member-join"`（CardBody）+ `data-member-id` + `data-member-kind` + `data-member-state` + `data-creation-id` + `data-pair-order` | SC32/33/34 |
| 入群卡动作 | `data-action` ∈ {view-session, view-task, expand-task} + `data-state` ∈ {enabled, disabled} | SC34 |
| 入群卡字段行 | `data-field` ∈ {model, context, create-tool, parent, description, task} | SC34（无模型行断言） |
| 任务卡消息 | `data-kind="task_card"` + `data-card="task"` + `data-sender="<actorName>"` + `data-task-id` + `data-task-revision` + `data-task-action` + `data-task-status` + `data-task-owner` + `data-task-actor` + `data-task-blocked-by` + `data-replay` ∈ {true, false} | SC35–SC38 |
| 任务卡动作/字段 | `data-action="copy-task-id"`；`data-field` ∈ {owner, blocked-by, completion-time, description, revision} | SC35/36/37/38 |
| 折叠链接 | `data-testid="group-chat-fold-toggle"` + `aria-expanded` | SC5/6 |
| 未读浮标 | `data-testid="group-chat-unread-pill"` + `data-count` | SC13/21 |
| 频道头未读提示 | `data-testid="group-chat-newmessages-hint"` + `data-count` | SC21 |
| 筛选提示条 | `data-testid="group-chat-filter-banner"` + `data-filter="<name>"`；清除按钮 `data-action="clear-filter"` | SC14 |
| 只读横幅 | `data-testid="group-chat-readonly-banner"` | SC20 |
| 断线/重连横幅 | `data-testid="group-chat-reconnect-banner"` | SC24 |
| @ 补全浮层 | `data-testid="group-chat-mention-popup"` + `role="listbox"`；选项 `role="option"` + `data-mention="<name>"` + `aria-selected` | SC7 |
| 输入器 / 发送键 | `data-testid="group-chat-composer"` / `group-chat-send`；发送键 `disabled` + `aria-busy` | SC8/23/28 |
| 发送目标行 | `data-testid="group-chat-target-row"` + `data-targets="lead,ux"` | SC8/9 |
| 错误卡 | `data-testid="group-chat-error"` + `data-retryable` ∈ {true, false} | SC24 |
| tab | 由框架渲染（`role="tab"`，静态「群聊」；无未读装饰） | SC1 |

**使用规则**：① 组件测试/e2e 只用本表选择器，禁止按文案定位（文案会 i18n）；② `data-count`/`data-targets` 是逗号分隔或整数，tester 可解析；③ 本表与 §8.3.2/§8.6 的断言一一对应。

### 6.6 长文本折叠（UX D6）

- 阈值：`> 400 字符` 或 `> 8 行`（先到者）；实现用**测量后判定**（渲染前按 `\n` 数行 + 字符数估算，挂载后 `scrollHeight > 8*lineHeight` 校正）。
- 折叠态：`max-height: 192px`（8×24）+ 底部 56px 渐变（`linear-gradient(to bottom, transparent, var(--dsw-alias-bg-base))`，卡片内则为 `bg-layer-1`——**用变量而非图片**，UX 决策 6）。
- 按钮：`查看全部（约 {n} 字）` / `收起`；`aria-expanded`；32px 高、radius 8。
- 永不折叠：系统条、`已同时发送给…` 说明行、文件卡标题、消息头（UX §5）。
- 大消息：`text > textRender(64KB)` 时只渲染前 64KB + 「内容过长，复制全文/打开会话查看」。

### 6.7 主题令牌映射表（**实现契约**）

#### 6.7.1 颜色映射（只引用 alias/specific；暗色由 `body[data-ds-dark-theme]` 切换）

| 元素 | CSS 变量 | 状态 |
| --- | --- | --- |
| 视图 tab 激活文字/下划线 | `--dsw-alias-state-business-primary` | ✅ |
| 视图 tab 未激活 | `--dsw-alias-label-tertiary` | ✅ |
| 频道头背景 | `--dsw-alias-bg-base` | ✅ |
| 频道头底边 | `--dsw-alias-border-l3` | ✅ |
| 群头像拼贴（Lead 格） | `--dsw-alias-state-business-primary` | ✅ |
| 群头像拼贴（其余格） | `--dsw-alias-state-business-tertiary` / `--dsw-alias-bg-layer-3` / `--dsw-alias-label-dimmed` | ✅ |
| 群标题 / 分隔竖线 | `--dsw-alias-label-primary` / `--dsw-alias-border-l2` | ✅ |
| 团队名 | `--dsw-alias-label-secondary` | ✅ |
| 状态行文字 / 运行点 / 已完成点 | `--dsw-alias-label-tertiary` / `--dsw-alias-state-success-primary` / `--dsw-alias-label-dimmed` | ✅ |
| 筛选按钮底 / 图标 | `--dsw-alias-interactive-bg-hover` / `--dsw-alias-label-tertiary` | ✅ |
| 消息头像（Lead / 成员 / 用户） | 底 `--dsw-alias-state-business-primary` / `--dsw-alias-state-business-tertiary` / `--dsw-alias-label-dimmed`；字 `--dsw-alias-button-primary-fill` / `--dsw-alias-label-primary` | ✅ |
| SenderLine 名字 / 状态文字 | `--dsw-alias-label-secondary` / `--dsw-alias-label-caption` | ✅ |
| SenderLine 状态点（运行 / 完成 / 失败） | `--dsw-alias-state-success-primary` / `--dsw-alias-label-dimmed` / `--dsw-alias-state-error-primary` | ✅ |
| **气泡 bg（他人 / 自己）** | `--dsw-alias-bg-layer-2` / `--dsw-alias-bg-layer-3` | ✅ |
| **气泡正文 / 内联 @目标** | `--dsw-alias-label-primary` / `--dsw-alias-state-business-primary` | ✅ |
| **BubbleCaption（同发说明/发送态）** | `--dsw-alias-label-secondary` | ✅ |
| **失败气泡描边 / 失败文案** | `--dsw-alias-state-error-primary` | ✅ |
| **TimeDivider 文字** | `--dsw-alias-label-caption` | ✅ |
| **CollapsedNote（系统提示）文字** | `--dsw-alias-label-tertiary` | ✅ |
| **ToolCollapseLine 文字** | `--dsw-alias-label-caption` | ✅ |
| 折叠链接（展开全部/收起） | `--dsw-alias-state-business-primary`（12px 文本链接，无按钮底） | ✅ |
| 未读浮标 | 底 `--dsw-alias-bg-layer-2`、边 `--dsw-alias-border-l2`、投影 `--dsw-shadow-lv2`、蓝点 `--dsw-alias-state-business-primary`、文字 `--dsw-alias-state-business-primary` | ✅ |
| 输入卡 | 底 `--dsw-specific-input-major`、边 `--dsw-alias-border-l2`、聚焦边 `--dsw-alias-state-business-primary` | ✅ |
| 发送键（v1.6.1 修正） | 底 `--dsw-alias-state-business-primary`、箭头 `--dsw-alias-bg-base`；hover 同色 + opacity .9（原 `button-primary-fill`/`label-primary-inverted` 行作废） | ✅ |
| 补全浮层 / 键盘高亮行 | 底 `--dsw-specific-menu`、边 `--dsw-alias-border-l2`、投影 `--dsw-shadow-lv2`；高亮 `--dsw-alias-interactive-bg-hover` + 左竖条 `--dsw-alias-state-business-primary` | ✅ |
| 代码块 / 行内代码 / 链接 | `--dsw-alias-markdown-code-block`（banner 同族）/ `--dsw-alias-markdown-inline-code` / `--dsw-alias-link` | ✅ |
| 骨架 / 滚动条 / Toast / Tooltip | `--dsw-alias-bg-skeleton` / `--dsw-alias-scrollbar-bg-l1`·`hover-l1` / `--dsw-alias-toast-bg`·`toast-label` / `--dsw-alias-tooltip-bg` | ✅ |
| 只读提示条 | 底 `--dsw-alias-bg-layer-1`、字 `--dsw-alias-label-secondary` | ✅ |
| **欢迎提示（M4 ②）** | 文字 `--dsw-alias-state-business-primary`（右对齐、无底色） | ✅ |
| **creator 消息头（M8）头像** | 底 `--dsw-alias-state-business-primary`（Lead）/ `--dsw-alias-state-business-tertiary`（teammate）；字 `--dsw-alias-button-primary-fill` / `--dsw-alias-label-primary` | ✅ |
| **creator 消息头 名字 / 角色小标签 / 时间** | `--dsw-alias-label-primary` / `--dsw-alias-label-caption` / `--dsw-alias-label-caption` | ✅ |
| **卡片 body 容器** | 底 `--dsw-alias-bg-layer-1`、边 `--dsw-alias-border-l2` | ✅ |
| **卡片标题 / 描述 / 空描述** | `--dsw-alias-label-primary` / `--dsw-alias-label-secondary` / `--dsw-alias-label-tertiary` | ✅ |
| **卡片信息行 label / value** | `--dsw-alias-label-caption` / `--dsw-alias-label-secondary` | ✅ |
| **卡片初始任务正文 / 展开链接** | `--dsw-alias-label-tertiary` / `--dsw-alias-state-business-primary` | ✅ |
| **卡片动作（查看会话 / 查看任务）** | `--dsw-alias-state-business-primary` / `--dsw-alias-label-secondary`（禁用态 `--dsw-alias-label-dimmed`） | ✅ |
| **任务卡容器（M9）** | 底 `--dsw-alias-bg-layer-1`、边 `--dsw-alias-border-l2` | ✅ |
| **任务卡动作标签 / task id** | `--dsw-alias-label-caption`（task id 用等宽字体栈） | ✅ |
| **任务卡 subject / 描述** | `--dsw-alias-label-primary` / `--dsw-alias-label-tertiary` | ✅ |
| **任务卡信息行 label / value** | `--dsw-alias-label-caption` / `--dsw-alias-label-secondary` | ✅ |
| **任务卡「复制任务 ID」** | `--dsw-alias-state-business-primary` | ✅ |
| **状态 pill：待认领 / 已取消** | 底 `--dsw-alias-interactive-bg-hover`；字 `--dsw-alias-label-secondary` / `--dsw-alias-label-caption` | ✅ |
| **状态 pill：进行中** | 底 `--dsw-alias-state-business-tertiary`；字 `--dsw-alias-state-business-primary` | ✅ |
| **状态 pill：已完成** | 底 `--dsw-alias-state-success-tertiary`；字 `--dsw-alias-state-success-primary` | ✅ |
> 证据：令牌名取自构建产物 `lib/welcome/welcome.css`（385 个 `--dsw-*` 名，`body[data-ds-dark-theme]` 为暗色覆盖块），并在 `dsh-web-frontend/dist/assets/index-*.css` 中确认被引用。**具体色值不要在插件里写死**——UX §11 的色值表仅用于设计对照，实现一律 `var(...)`。

#### 6.7.2 非颜色规格（常量集中在 `src/styles/group-chat.css` 的 `:where(.gc-root)`；v1.2 气泡流）

| 规格 | 值 | 来源 |
| --- | --- | --- |
| tab | 13px / 500 / 下划线 2px / gap 32 / padding-bottom 9 | UX §3 + 实测 CSS |
| 会话头 | min-height 76，padding 10 28 0 20，底边 .5px border-l3 | UX §3 |
| 频道头 | **56px**，padding 0 28，底边 1px border-l3 | UX §3（v2 瘦身） |
| 群头像 | 32×32，radius 8，2×2 拼贴 | UX §3 |
| 消息头像 | 32×32，radius 8，首字母 12/500 | UX §4 |
| SenderLine | 名字 14/500；状态 11/400；名字与状态间距 8–12；状态点 6px | UX §4 |
| 气泡（通用） | max-width **600**（窄屏 **70%**）；正文 14/22；**圆角/内边距按发送者区分，见下两行** | UX §4 + 真实 DSH |
| **用户气泡** | `radius 20` / `padding 10×16`；CSS 变量 **`--gc-user-bubble-radius: 20px; --gc-user-bubble-padding: 10px 16px`** | prototype.md §5 / 真实 DSH |
| **agent / 系统 / 卡片消息气泡** | `radius 12` / `padding 10×14`；CSS 变量 **`--gc-bubble-radius: 12px; --gc-bubble-padding: 10px 14px`**（**禁止**用单一 radius 值） | 本文原值 / UX §4 |
| 气泡间距 | 消息间 16；同一发送者连续消息 8 | UX §4 |
| TimeDivider | 12/400；仅在日期变化或间隔 ≥5 分钟插入 | UX §4 |
| BubbleCaption | 11/400；气泡下 2–4px | UX §4 |
| CollapsedNote（系统提示） | 11.5/400；居中；无底色 | UX §4 |
| ToolCollapseLine | 11/400；单行文本链接 | UX §4/§5 |
| 折叠 | 8 行/400 字；遮罩 56px；链接 12px 文本（无按钮底） | UX §5 / D6 |
| 输入卡 | radius 28，正文 14 | UX §3 |
| 补全浮层 | 宽 380，radius 14，列表项 46px | UX §6 |
| 发送键 | 34px 圆形 | UX §7 |
| 命中区 | 窄屏 ≥44×44 | UX §9 |
| creator 消息头（M8） | 头像 32×32 radius 8；名字 14/600；角色小标签 11；时间 11 与名字同行贴右 | UX §4.1 |
| 卡片 body | max-width 520；padding 16；radius 12；行距 4–10；不做气泡、紧贴 creator 头像下方 | UX §4.1 |
| 卡片标题 / 描述 | 13/500 / 12/19 | UX §4.1 |
| 卡片信息行 | label 列宽 68（x=16）、value x=84；行高 22；label 11 / value 12 | UX §4.1 |
| 卡片初始任务 | 11/17，2 行截断；「展开」11 文字链 | UX §4.1 |
| 卡片动作 | 12px 文字链接（无按钮底） | UX §4.1 |
| 任务卡（M9） | max-width 520；padding 16；radius 12；紧凑版高度约 84px | UX §4.2 |
| 任务卡动作行 | 动作标签 11；状态 pill 高 20 / radius 999 / 11；task id 等宽 11 贴右 | UX §4.2 |
| 任务卡标题/描述/信息行 | subject 14/600 单行省略；description 11.5/17（create 2 行）；信息行 label 11 / value 11.5、行高 20 | UX §4.2 |
| 任务卡动作 | 「复制任务 ID」11.5 文字链；无详情页跳转 | UX §4.2 |

#### 6.7.3 UX §11 的令牌修正（**必须按此实现，否则编译期无错、运行期丢样式**）

| UX 写的令牌 | 实际情况 | 修正 |
| --- | --- | --- |
| `--dsw-radius-xs/sm/md/xl/panel` | 构建中**不存在**（仅见 `--dsw-radius-lg`，且需 CSS 实测确认） | 插件本地常量：`--gc-radius-xs:4px; --gc-radius-sm:8px; --gc-radius-md:12px; --gc-radius-lg:16px; --gc-radius-xl:20px; --gc-radius-panel:28px` |
| `--ds-font-family-code` | 不存在（前缀也不是 `--ds-`） | 用 `--dsw-font-markdown-code-font-family`（存在）；回退栈 `ui-monospace, SFMono-Regular, Menlo, monospace` |
| UX §11 的 Light 色值列 | 构建里 Light 是**默认块**、Dark 是 `body[data-ds-dark-theme]` 覆盖；UX 表中的部分值（如 bubble dark `#2c2c2e`）与构建 alias 链解析结果（`--dsw-static-neutral-bluish-850`）可能不同 | **不写值**，只写变量；视觉回归以真实 GUI 截图为准（§8.4） |

### 6.8 响应式（UX §3/§9 · v1.2）

| 档位 | 触发 | 变化 |
| --- | --- | --- |
| L（≥1280） | 默认 | 侧栏 260/220 随宿主；内容列 clamp(680,64%,920)；频道头 56px 全展示（群头像 32 + 群聊标题 + 团队名 + 状态行 + 筛选按钮） |
| M（1024–1279） | 容器查询 `@container (max-width:1279px)` | 内容列收窄 856；tab gap 26；正文 13.5/22；气泡 max-width 仍 600 |
| 窄屏（<768） | 容器查询 | 隐藏宿主侧栏（单列）；顶部栏 52 + tab 行 44（横向滚动）；**频道头保留 32 群头像 + 团队名 + 「{n} 名成员 · {m} 个运行中」文本**（删除「头像栈收起为 成员 N ▾」的旧逻辑），筛选进 32×32 图标按钮/下拉；消息列 **720 流式**（左右 24，不出现横向滚动）；气泡 max-width **70%**；标签/正文自动换行；命中区 ≥44×44 |

> 用**容器查询**而不是 `window.matchMedia`：群聊住在对话内容区，宽度取决于宿主侧栏；用 `container-type: inline-size` 在 `.gc-root` 上做断点（[推断]，实现时用真实侧栏拖拽验证）。窄屏不再有成员头像栈，「成员数」以文本表达。

### 6.9 i18n（v1.5 文案契约）

- 资源：`locale/zh.json`、`locale/en.json`（市场/设置页读取）+ `src/client/parts/10-locale.part.js` 内联同一份字典；`scripts/build.mjs` 校验键集一致。
- 命名空间 `group-chat`；`view.tab` 用 thunk（语言切换即时生效）；时间用 `relativeTime` + `Intl.DateTimeFormat`，即「今天 · 11:02」按 locale 格式化（`time.today` + 时间格式，不硬编码）。
- **协议前缀不 i18n**（§5.2）：它是给 agent 读的稳定协议文本；UI 说明行走 i18n。
- 说明：成员卡片文案沿用 UX §4.1 的 `member.*` 命名（与任务书所说的 `memberCard.*` 为同一组，不另起命名空间）。
- **v1.2 删除的 key**（v1 徽标/装饰文案，不再渲染）：
  `msg.sendTo`、`msg.finalTag`、角色徽标文案（Lead/Teammate/Subagent 徽标，含 `role.*`）、`msg.sentTo` 的 `✓` 前缀（改为无勾文案）。
- **v1.2 新增/更新的 key**：

| Key | zh-CN | en | 用途 |
| --- | --- | --- | --- |
| `channel.membersRunning` | {n} 名成员 · {m} 个运行中 | {n} members · {m} running | 频道头状态行 |
| `channel.newMessages` | {n} 条新消息 | {n} new messages | 频道头未读提示 |
| `msg.deliveredTo` | 已同时发送给 {list} | Also sent to {list} | M1 气泡下说明（**无勾**） |
| `msg.partialDelivered` | 已送达 {ok}/{total} | Delivered {ok}/{total} | partial 状态 |
| `msg.sendToLead` | 发送给 Lead | Sent to Lead | 单发说明 |
| `msg.sending` / `msg.failed` | 发送中… / 发送失败：{reason}，已保留原文 | Sending… / Failed: {reason}. Text kept | 发送态 caption |
| `msg.retry` / `msg.copy` | 重试 / 复制原文 | Retry / Copy text | 失败操作 |
| `msg.expandAll` / `msg.collapse` | 展开全部（约 {n} 字） / 收起 | Show all (~{n} chars) / Collapse | 折叠文本链接 |
| `msg.toolCalls` | {n} 个工具调用 · 见「轨迹」 | {n} tool calls · see Trajectory | ToolCollapseLine |
| `time.today` | 今天 | Today | TimeDivider 前缀（+ 格式化时间） |
| `status.running` / `status.done` / `status.failed` | 运行中 / 已完成 / 失败 | Running / Done / Failed | SenderLine 状态 |
| `member.subagentOf` | · {parent} 的子体 | · sub-agent of {parent} | subagent 名字后缀 |
| `member.leftNotSent` | {name} 已离开，未发送 | {name} left — not sent | 失效提及提示 |
| `member.welcome` | 欢迎 @{name} 加入群聊 | Welcome @{name} to the group | M4 ② 欢迎提示 |
| `member.cardTitle` | 「@{name}」加入群聊 | @{name} joined the group | 卡片标题 |
| `member.noDesc` | 暂无角色描述 | No description | 描述空回退 |
| `member.roleLead` | 主 Agent | Main agent | creator 角色小标签（Lead） |
| `member.roleTeammate` | Teammate | Teammate | creator 角色小标签（teammate） |
| `member.roleFallback` | 成员 | Member | 角色未知 |
| `member.contextFresh` | 全新上下文（fresh） | Fresh context (fresh) | teammate：fresh |
| `member.contextForkLead` | 继承 Lead 已完成回合（fork） | Continue from Lead's finished turn (fork) | teammate：fork |
| `member.contextSubagent` | 全新上下文（subagent） | Fresh context (subagent) | subagent：全新 |
| `member.contextSubagentFork` | 继承父会话（subagent_fork） | Forked parent context (subagent_fork) | subagent：fork |
| `member.modeOneShot` | · 一次性（one-shot） | · One-shot | one-shot 后缀 |
| `member.modelInheritedLead` | {model}（继承 Lead） | {model} (inherited from Lead) | spawn_teammate 继承 Lead（D-D） |
| `member.modelInheritedFrom` | {model}（继承 {parent}） | {model} (inherited from {parent}) | subagent 继承 creator（D-D） |
| `member.expandTask` | 展开 | Expand | 初始任务展开 |
| `member.collapseTask` | 收起 | Collapse | 初始任务收起 |
| `member.viewSession` | 查看会话 | Open session | 卡片动作 |
| `member.viewTask` | 查看任务 | Open task | 卡片动作（teammate） |
| `member.sessionCopied` | 无法直接跳转，已复制会话 ID | Cannot open directly — session ID copied | 降级 Toast |
| `member.noPermission` | 无权限打开该会话 | No permission to open this session | 动作禁用提示 |
| `filter.active` | 正在只看 {name}（{n} 条） | Filtered to {name} ({n}) | 筛选提示条（P11 右） |
| `filter.clear` | 清除 | Clear | 筛选清除文字链 |
| `filter.empty` | 该成员暂无消息 | No messages from this member | 筛选空态提示 |
| `filter.suffix` | · 筛选: {name} | · Filter: {name} | 频道头状态位后缀 |
| `readonly.banner` | 当前为只读历史，不能发送 | Read-only history — sending is disabled | 只读横幅（P11 左） |
| `readonly.placeholder` | 团队已结束，群聊为只读历史 | Team finished — read-only history | 只读输入区占位 |
| `readonly.suffix` | · 团队已结束 | · Team finished | 频道头状态位后缀 |
| `empty.noTeam` | 当前为单 Agent 会话（无团队） | Single-agent session (no team) | 无团队空态标题（D-C） |
| `empty.noTeamDesc` | 仅显示该会话的用户消息与该 agent 的最终输出 | Shows only this session's user messages and the agent's final output | 无团队空态说明 |
| `task.action.create` | 创建任务 | Task created | M9 动作标签 |
| `task.action.claim` | 认领任务 | Claimed | M9 动作标签 |
| `task.action.complete` | 完成任务 | Completed | M9 动作标签 |
| `task.action.reopen` | 重新打开 | Reopened | M9 动作标签（**禁止**「返工」） |
| `task.action.reassign` | 改派任务 | Reassigned | M9 动作标签 |
| `task.action.edit` | 编辑任务 | Task edited | M9 动作标签 |
| `task.action.setDependencies` | 依赖变更 | Dependencies changed | M9 动作标签 |
| `task.action.delete` | 取消任务 | Task cancelled | M9 动作标签 |
| `task.action.release` | 放回任务 | Task released | M9 动作标签 |
| `task.state.pending` | 待认领 | Unclaimed | 状态 pill |
| `task.state.inProgress` | 进行中 | In progress | 状态 pill |
| `task.state.completed` | 已完成 | Completed | 状态 pill |
| `task.state.cancelled` | 已取消 | Cancelled | 状态 pill（status=deleted） |
| `task.owner` | 负责人 | Owner | 信息行 |
| `task.blockedBy` | 依赖 | Blocked by | 信息行 |
| `task.completionTime` | 完成时间 | Completed at | 信息行（仅完成卡） |
| `task.copyId` | 复制任务 ID | Copy task ID | 卡片动作 |
| `task.unassigned` | 未指派 | Unassigned | 负责人空回退（reopen/release/delete） |
| `task.noBlockedBy` | 无 | None | 依赖空回退 |
| `task.actorSystem` | 系统操作者 | System | 配对四级回退兜底 |
| `member.cardTitle` 已有 | — | — | 见上表 |

### 6.10 可访问性（N2 / UX §9）

- 消息流容器 `role="log" aria-live="polite" aria-relevant="additions"`；只播报新消息摘要（`sender: 前 80 字`），不逐 token。
- 消息行 `role="article"`，`aria-label="sender 时间 kind"`。
- 折叠按钮 `aria-expanded` + `aria-controls`；键盘 Enter/Space。
- `@` 补全：combobox 语义（`role="combobox"` + `aria-expanded` + `aria-controls` + `role="listbox"/"option"` + `aria-activedescendant`）；Esc 关闭后焦点回输入框。
- 焦点环：2px `--dsw-alias-state-business-primary`，offset 2；浮层关闭焦点归还。
- 动效：仅 150–250ms opacity/transform；`prefers-reduced-motion: reduce` 全关。
- 对比度：正文/次要/徽标分别 ≥12:1 / ≥4.5:1（UX §9）。

### 6.11 性能策略

| 关注点 | 策略 | 预算 |
| --- | --- | --- |
| 首屏 | 200 条；骨架屏（5 条，防 CLS）；先渲染骨架再增量填充 | 可交互 P95 ≤1.5s |
| 归一化 | 单次 sync ≤500 事件；纯函数一次遍历；O(n log n) 排序 | ≤50ms/1000 事件（M1） |
| 合并 | 增量走「有序插入 + id 索引」，不做全量重排 | 单条 append ≤5ms |
| 渲染 | `@tanstack/react-virtual` 只渲染可视 ±6 行；行 `React.memo`；Markdown 懒渲染（`IntersectionObserver`） | 滚动 60fps |
| Markdown | 可视行才 parse；代码高亮仅在展开/可见时启用 `useCodeHighlighter` | 单行 ≤8ms |
| 文本 | `textRender=64KB` 截断；`>4000 字` 默认折叠 | — |
| 内存 | 消息上限 2000；每会话 offset 索引；事件窗口引用及时释放（close 时 dispose） | <120MB 增量 |
| 订阅 | 成员上限 32；只为「有变化」的成员重算；批量 120ms | CPU 空闲 <5% |
| 交互 | 输入不阻塞（发送为 async）；筛选/折叠只改投影 | 输入延迟 ≤1 帧 |

---

## 7. 可靠性与边界

| # | 场景 | 行为 | 依据 |
| --- | --- | --- | --- |
| R-01 | 当前会话无团队（D-C） | tab 仍显示；空态「当前为单 Agent 会话（无团队）」；只含 user + lead 的 agent_output；无成员区/状态行/筛选图标；**输入区可用**：发送 = 该会话普通用户消息（默认 Lead，`@lead` 等价），不出现多目标说明行 | PRD F13/D-C；UX §8 |
| R-02 | 会话切换 | 先 `close()` 旧频道（abort 订阅、释放 retain）→ 再 open；store 按 channelId 隔离；旧频道事件不得进入新频道（subscribe 回调校验 channelId） | PRD F15 |
| R-03 | 快速切视图（tab 切走再回） | 视图卸载但频道状态留在内存 Map（LRU 4 个频道）；滚动位置/筛选/草稿恢复 | PRD F15/§7.4 |
| R-04 | 成员新增 | roster 变更 → 增量 open 新成员（retain + 事件回填）；插入 `member-joined` 系统条；补全列表刷新 | PRD F14/SC17 |
| R-05 | 成员离开/失败 | 历史气泡保留（状态文字显示「已完成/失败」，v1.2 无徽标可灰化）；SenderLine 状态点变 label-dimmed；补全列表移除；输入框残留 chip 在发送时剔除并提示 | UX §6.7 / SC17 / V1.2 |
| R-06 | subagent 完成 | 子会话 agent_output 已收 → `subagent-settled` 副本降级为 system（去重）；子会话删除后历史仍在内存；运行中显示 6px 绿点 | EVT §3.3 / UX §8 |
| R-07 | subagent 失败/中断 | 插入失败系统条 + 其最后输出（标记 `isFinal` 但附「本轮中断」）；不展示中间过程 | PRD §7.6（🔵 是否展示最后输出，Lead 决策 §10 D-ARCH-06） |
| R-08 | 发送失败 | 气泡 failed + 原因 + 重试/复制；文本不丢；重试只补失败目标 | PRD F9 / §5.5 |
| R-09 | 部分目标失败（V1.1-2） | `delivery:'partial'` + 「已送达 X/Y」+ 失败目标清单；重试按钮只重试失败目标、复用 requestId（Host rpcId 幂等，不双投） | V1.1-2 / S2 |
| R-10 | 断线/重连 | `eventSource` revision 变化 → 该会话 reset 重算；3 次失败显示「实时更新暂停，重连」横幅 + 手动重试；已加载历史可读 | PRD N9 |
| R-11 | 超长/高频消息 | 单条 64KB 截断；高频用 120ms 批量；>2000 条内存裁剪；超长单行 `word-break: break-word` | PRD §7.7 |
| R-12 | 只读会话（团队结束/归档，P11 左） | 顶部横幅「当前为只读历史，不能发送」+ 频道头 `· 团队已结束` + 输入 40% 禁用（占位「团队已结束，群聊为只读历史」）；重试/写操作隐藏；筛选/复制/折叠仍可用；发送 API 直接拒绝（`readonly`） | PRD F17 / SC20 / UX P11 |
| R-13 | lead Agent 离线 | 频道只读（`readonlyReason:'lead-offline'`）；成员消息仍可读；发送禁用 | API R4 |
| R-14 | 事件窗口混入 transient 流式行 / 未来版本窗口形状漂移 | 归一化只消费 `entry.type==='event'`；**禁止整数 seq 断言**；发现 `entries` 无 `event.{type,seq,data}` 时进入「事件源不可读」错误态并上报诊断（S1 已证当前构建不会发生） | Spike S1 |
| R-15 | 投影 `agentTeam` 缺失 | `degraded:'no-roster'`；用 `sessions.list` 的 parentSessionId 推导成员；名册类信息（status/model）显示 unknown | API R5/H-7 |
| R-16 | 跨会话数据放大 | 成员/会话/事件/文本四重上限；「只订阅有变化的成员」；关闭视图即释放引用 | API R3 |
| R-17 | 后代超出深度/会话上限（V1.1-3） | 深度 ≤3、会话 ≤32；截断规则与提示见 §4.8.2；teammate 不截断、subagent 按 depth/创建时间保留；**禁止静默丢弃** | V1.1-3 |
| R-18 | 发送顺序错误导致 `subagent/parent-unavailable` | 强制「先 lead（resume 父链）→ 再成员」，串行不并行；捕获错误按失败目标处理并允许重排重试 | Spike S3 |
| R-19 | 入群消息字段缺失/重复/跳转失败（v1.4） | 字段按 §4.2.1 回退链取值，缺 model/description/初始任务时**隐藏行而不是留空**；一次创建恒为「1 欢迎 + 1 creator 带卡消息」两条（`creationId+pairOrder`），fork/seeded 复制事件靠继承前缀过滤 + id 去重，不重复；`uiWorkspace` 不可用时复制会话 ID + Toast（不假装跳转）；无权限禁用动作；**不存在孤立卡片** | MCF §7/§9；§4.2.1；§6.5.1 |

**日志与诊断**：统一前缀 `[group-chat]`；分级 `debug/info/warn/error`；`window.__GROUP_CHAT_DEBUG__`（仅在 `localStorage['group-chat:debug']==='1'` 时暴露）提供：当前 channel、members、cursor、最近 100 条归一化消息、错误环形缓冲；不输出正文全文（隐私）。

---

## 8. 测试策略

### 8.1 分层与可测点

| 层 | 目标 | 工具 | 覆盖 |
| --- | --- | --- | --- |
| L1 单测（内核） | 归一化/去重/排序/分页/协议/筛选/目标解析 | `node --test`（零依赖） | 纯函数 100% 分支；fixture 驱动 |
| L2 契约测试 | 适配器对 `ChannelSource` 契约的一致性；事件两代构建兼容 | 同一套契约测试跑 `MockSource` / `ClientSessionSource`（replay 模式）/ `HttpChannelSource`（可选） | 契约漂移报警 |
| L3 组件测试 | 折叠边界、@ 补全键盘、发送状态机、筛选投影 | 轻量 render 函数 + DOM 断言（jsdom 或 browser runtime，若不可用则纯 reducer 断言） | UX D1–D9 主路径 |
| L4 e2e | 真实 GUI 走查 | **双轨**：有已鉴权 URL → Playwright；无 token → open-computer-use（操作 DSH Desktop），见 §8.3.1 | SC1–SC34（v1.3 起） |
| L5 视觉回归 | 与 Figma 导出一致 | Playwright screenshot + 像素 diff | P1/P2/P3/P4/P5/P6/P7/P9 |
| L6 性能 | 首屏/增量/滚动/内存 | Playwright trace + `performance.mark` | §6.11 预算 |

### 8.2 Fixtures 与契约测试（关键）

**fixtures 来源**：EVT 已摘录的真实事件（脱敏，保留结构与时间）→ `test/fixtures/*.jsonl`：

| fixture | 内容 | 断言 |
| --- | --- | --- |
| `01-user-rpc.jsonl` | 真用户消息（有 rpcId）+ 双写 spliced | 只出 1 条 user；spliced 元数据并入 |
| `02-peer-agent-message.jsonl` | `source.kind='agent-message'` + `Team message from <name>:` 前缀 | 出 agent_to_agent；前缀被剥离；sender 名解析正确 |
| `03-peer-legacy-team-message.jsonl` | 旧构建 `team-message`（含 senderName/messageId） | 走结构化字段；不依赖文本正则 |
| `04-assistant-turns.jsonl` | 多 turn 多 step 的 assistant/message + turn/end（completed/error/forked/aborted） | 每 turn 仅 1 条 agent_output；forked 丢弃；中断追加 system |
| `05-subagent-settled.jsonl` | 子会话最终输出 + 父会话 settled 副本 | 只保留子会话那条；`messageId` 不重复 |
| `06-seeded-fork.jsonl` | `isSeeded:true` 会话（继承前缀 + `session/end-seed`） | 继承事件被 cutoff 丢弃；无重复历史 |
| `07-fanout-3targets.jsonl` | 同发 3 目标副本（当前构建，前缀） | 只 1 条 user 气泡；3 条 deliveries；顺序正确 |
| `08-interleaved-timeline.jsonl` | lead/teammate/subagent 交错、同毫秒 | 排序稳定（time→rank→seq），两次排序结果一致 |
| `09-same-second.jsonl` | 同一毫秒 20 条 | 不抖动、不丢 |
| `10-long-text.jsonl` | 1KB/400 字/8 行边界各一条 | 折叠判定与 SC6 一致 |
| `11-missing-roster.jsonl` | 无 `agentTeam` 投影 | 降级 no-roster，成员仍可见 |
| `12-tool-heavy.jsonl` | 一步 30 次工具调用 | 只出 1 条 toolFold 行，不进正文流 |
| `13-entry-envelope.jsonl` | `entry.type='event'\|'transient'` 混合窗口（S1） | 只消费 event；transient（含小数 seq）被丢弃；不对 seq 做整数断言 |
| `14-fanout-prefix-canonical.jsonl` | 3 目标同发，含 v1.1 canonical 两行前缀 | 解析/剥离精确匹配；说明行与 deliveries 正确；`rawText` 保留两行 |
| `15-partial-failure.jsonl` | 3 目标中 1 个失败 | 聚合状态 `partial`；「已送达 2/3」；重试只补失败目标 |
| `16-member-card.jsonl` | teammate（team/member provisioning→active + tool/call+result 快照）+ subagent（catalog+descriptor+fork 子会话副本） | 每次创建=**1 条欢迎 system（pairOrder 0）+ 1 条 member_card（pairOrder 1，sender=creator）**；同 `creationId` 排序欢迎在前；fork 副本被去重；teammate model 取 result 快照 / subagent 取 descriptor；provider 内部名不出现；无孤立卡片 |

**契约测试**（适配器）：`open/sync/pageOlder/subscribe/close` 的幂等（重复 sync 不产重复消息）、游标推进单调、reset 后一致、关闭后不再回调。

### 8.3 e2e（Playwright 操作真实 GUI）

#### 8.3.1 执行方式（S6 后为双轨；不再阻塞）

| 方式 | 适用 | 前置 | 约束 |
| --- | --- | --- | --- |
| **A. Playwright（首选）** | 有**已鉴权 GUI URL** 时 | DSH Desktop 打印的鉴权 URL（直接访问 `http://127.0.0.1:62300` 返回 401，API R8 / prototype.md §6 实测） | 全部 26+5 条用例可自动化；视觉回归也走这条 |
| **B. open-computer-use（无 token 主路径 / 兜底）** | 拿不到 token 时 | DSH Desktop 正在运行（`com.deepseek.dsh`，S6 实测）；每轮先 `get_app_state` | ① AX 可能稀疏 → 允许坐标点击兜底；② **有真实副作用**：只在测试 workspace/测试会话操作，发送前二次确认目标名；③ 焦点可能被占用 → 需要时用 `window_placement:'agent_display'` 并在结束时 `restore`；④ 不能进 CI |

- **前置数据**：一个真实团队会话（lead + ≥2 teammate + ≥1 subagent），或预置 fixture 会话；两种执行方式都不得写入生产会话。
- **主/兜底判定**：Lead 能在实现阶段提供一次已鉴权 URL → 用 A 跑全量、B 只做冒烟；否则用 B 跑核心用例（E1/E2/E7/E8/E11/E19/E21），其余用例用组件测试 + 人工走查补证，并在 QA 报告里注明覆盖缺口。
- **证据留存**：每个用例至少 1 张截图 + DOM/AX 断言文本；B 方式每步都要 `get_app_state` 复核（不凭记忆点击）。

#### 8.3.2 用例（与 SC 对齐）

| 用例 | 步骤 | 断言（可观测证据） | SC |
| --- | --- | --- | --- |
| E1 tab 入口 | 打开团队会话 → 看 tab 行 | `role=tab` 且 accessible name=群聊；与对话同 tablist；默认仍为对话 | SC1 |
| E2 进入群聊 | 点 tab | feed 可见；最后一条时间 ≥ 前一条；`performance.getEntriesByType('navigation').length` 不变（无 reload） | SC2 |
| E3 三类消息 | 造/选含 user+peer+final 的会话 | 3 个 `data-kind` 各 ≥1；时间单调 | SC3 |
| E4 @ 表达 | 找 agent→agent 消息 | SenderLine 名字为 sender；**正文首行**含 `[data-mention=backend]` 且文本 `@backend`（无独立 chip 行）；普通文本无该属性 | SC4 |
| E5 折叠/展开 | 找长消息 | 初始无「收起」；点「查看全部」→ 高度增加、`aria-expanded=true`；顶部 Y 偏移 ≤4px | SC5/SC6 |
| E6 @ 补全与可寻址集合（D-A） | 输入 `@` → `sc` → ↓ → Enter | `[data-testid="group-chat-mention-popup"] role=listbox` 出现；选项 `role=option`，集合 = lead + 全部 teammate（含 inactive）+ subagent（仅 running/provisioning），**不含 one-shot 已完成/已离开**；过滤后集合变化；高亮 `aria-activedescendant`；chip `data-mention=scout`；退格整体删除；Esc 后焦点回输入框 | SC7 |
| E7 默认 Lead | 不 @ 发送「测试」 | 「发送给：Lead」提示；消息 targets 含 lead；气泡 +1 | SC8 |
| E8 多目标同发 | `@ux @backend` 发送 | 说明行含 3 位；DOM 只 1 条 `data-kind=user`；deliveries 3 个状态 | SC9/SC10（口径见 §10 D-ARCH-03） |
| E9 失败重试 | 关闭目标可用性（如停 Host 网络/父离线）→ 发送 | 失败态 + 重试/复制；恢复后重试 → sent，气泡数不变 | SC11/SC23 |
| E10 分页 | 滚到顶 | 触发一次加载；锚点不跳；出现「已到最早消息」 | SC12 |
| E11 实时追加 | 让成员跑一轮 | ≤2s 出现；贴底自动滚；上滚显示浮标；点击到底清零 | SC13/SC21 |
| E12 筛选（D-B） | 频道头筛选 → 选 scout（teammate） | 提示条 `data-testid=group-chat-filter-banner` + `data-filter=scout`，文案「正在只看 scout（n 条）」；可见消息 = scout 发言 + `targets` 含 scout + scout 的 subagent 消息（父含子）；**不做正文 @ 文本搜索**；选 subagent 时只显示其自身消息（不反向含父）；`data-action=clear-filter` 清除后恢复原位置；无消息时显示「该成员暂无消息」 | SC14/SC17 |
| E13 无团队 | 普通单 agent 会话 | 空态「当前为单 Agent 会话（无团队）」+ 说明「仅显示该会话的用户消息与该 agent 的最终输出」；无成员区/状态行/筛选图标；输入区可用（D-C，发送见 E31） | SC15 |
| E14 subagent | 触发 subagent | 系统提示 CollapsedNote「创建了 subagent」；subagent 发言=普通气泡、名字后缀「· 父名 的子体」、无缩进/连接线；完成后插入最终输出 | SC16 |
| E15 成员增删 | spawn/结束 teammate | 系统条 + 补全列表变化；历史徽标保留 | SC17 |
| E16 会话切换 | 切走再切回 | scrollTop ±4px 恢复；草稿仍在；无串数据 | SC18 |
| E17 复制/跳转 | hover → 复制 / 打开会话 | 剪贴板=纯文本；view 切到目标会话 | SC19 |
| E18 只读历史（P11 左） | 只读/归档会话 | `data-testid=group-chat-readonly-banner` 文案「当前为只读历史，不能发送」；频道头含 `· 团队已结束`；输入区 40% 禁用且占位「团队已结束，群聊为只读历史」；重试/写操作隐藏；筛选/复制/折叠仍可用 | SC20 |
| E19 键盘/aria | 纯键盘 | 方向键切 tab；Enter 展开；live region 文本更新 | SC22 |
| E20 错误态 | 模拟事件源失败 | 错误卡 + 重试；草稿保留；不白屏 | SC24 |
| E21 窄屏 | viewport 375/768 | 无水平滚动（scrollWidth ≤ 视口）；成员入口可展开 | SC25 |
| E22 i18n/主题 | en + dark | 无硬编码中文（消息内容除外）；token 生效（截图 light/dark） | SC26 |
| E23 前缀 canonical（v1.1） | `@ux @backend` 发送 | 目标会话 `user/message` 的 `content[0]` 精确匹配首行（全角「：」「、」，`@lead` 在首位）、`content[1]` 精确匹配第二行（N=3）、`content[2]` 为正文；群聊气泡不含前缀 | SC27 |
| E24 单发无前缀 | 不 @ 发送 | lead 会话正文首块即用户正文；群聊显示「发送给：Lead」 | SC28 |
| E25 steer 排队 | lead running 时发送 | 发送调用 `mode='steer'`；当前 step 未 aborted；消息在下一 step 边界被消费 | SC29 |
| E26 部分失败四态（v1.1） | 1 目标失败 | `data-status=partial` + 「已送达 2/3」；重试只补失败项；气泡仍 1 条 | SC30 |
| E27 subagent 从属与截断 | 活跃 subagent / 超限目录 | 补全项含「父名 的子体」；消息行 SenderLine 名字后缀「· 父名 的子体」且**无缩进/连接线**；超 32 时出现截断提示 | SC31 / V1.1-3 |
| E28 teammate 入群消息（creator = Lead） | spawn 一个 teammate（context=fresh/model 快照） | 先出现**右对齐蓝字**「欢迎 @scout 加入群聊」（`data-kind=system` + `data-system-variant=welcome`）；紧跟**1 条** `data-kind=member_card` 消息，`sender=Lead`（`data-name=Lead`/SenderLine 角色标签「主 Agent」）+ 卡片 body：标题/描述/模型 `deepseek-flash（继承 Lead）`/上下文「全新上下文（fresh）」/创建方式 `spawn_teammate`/初始任务 2 行 +「展开」/「查看会话」「查看任务」；`data-member-id` 命中 1；刷新后仍为「1 欢迎 + 1 卡」；无孤立卡片；`spawn` 等创建 provider 内部名不出现 | SC32 |
| E29 subagent 入群消息（creator = 调用方）+ fork 去重 | 由 ux 创建 subagent（含 `subagent_fork`，descriptor.mode=continuable）+ 打开含 fork/seeded 副本的会话 | 欢迎提示「欢迎 @产品设计 加入群聊」；`data-kind=member_card` 消息 `sender=ux`（角色标签「Teammate」）；卡片 body 含父成员 `ux`、模型 `deepseek-flash（继承 ux）`、上下文「继承父会话（subagent_fork）」；one-shot 追加「· 一次性（one-shot）」；无「查看任务」；**同一次创建只 1 组（1 欢迎 + 1 卡）**（`data-member-id` 全局唯一）；fork 副本不重复；历史回放仍 1 组 | SC33 |
| E30 动作、空值与排序 | 点击「查看会话」；构造缺模型/缺描述/无初始任务/无权限数据；检查欢迎与卡的顺序 | 主路径走 `uiWorkspace.openSession`（降级：Toast「已复制会话 ID」）；**不存在模型 value 节点、不存在初始任务区块**、描述显示「暂无角色描述」；卡片仍显示 creator SenderLine 与「查看会话」；**欢迎提示紧邻卡片之前**（同 `creationId`、pairOrder 0→1），不会出现孤立卡片；后续消息正常渲染；组数=1；无权限动作禁用；卡片不参与长文折叠 | SC34 |
| E31 无团队发送（D-C） | 普通单 agent 会话打开群聊，不 @ 发送「同步进度」 | 空态「当前为单 Agent 会话（无团队）」；发送后该消息作为该会话普通用户消息出现（`data-kind=user`，targets 含 lead）；无「已同时发送给…」说明行；无多目标 chips；频道头无成员区/筛选 | SC15 |
| E32 筛选方向（D-B） | 团队含 teammate scout 及其 subagent；分别筛选 scout 与 subagent | 选 scout：含 scout 发言 + 发给/被 @ scout + **其 subagent 消息**；选 subagent：只显示该 subagent 消息（**不含父消息**）；两者都不做正文 `@` 文本搜索；单选、无多选控件 | SC14 |
| E33 P11 只读/筛选视觉回归 | 打开 P11 对应两态 | 只读：顶部 layer-2 圆角 8 横幅 + 频道头后缀 + 40% 禁用输入；筛选：顶部提示条 + 频道头 `· 筛选: scout` + 仅相关消息；与 `12-readonly-filter.png` 对比（仅 chrome/布局区） | SC14/SC20 |
| E34 任务创建/认领卡（操作者=发送者） | Lead 创建 task-13；scout 认领 | 创建卡：`data-kind=task_card`+`data-card=task`+`data-sender=lead`+`data-task-id=task-13`+`data-task-revision=1`+`data-task-action=create`+`data-task-status=pending`+`data-task-owner` 空（文案「未指派」）+ 描述 2 行 +「展开」+「复制任务 ID」；认领卡：`data-sender=scout`、`data-task-action=claim`、`data-task-status=in_progress`、负责人 scout；同 revision 仅 1 卡 | SC35/SC36 |
| E35 完成/重新打开/改派卡 | scout 完成任务；Lead 重新打开；Lead 改派给 backend | 完成卡：sender scout、action=complete、status=completed、完成时间可见、负责人仍 scout；重新打开卡：sender lead、action=reopen、status=pending、负责人「未指派」、**页面无「失败/返工」字样**、无 failed pill；改派卡：sender lead、action=reassign、status=in_progress、ownerName=backend | SC37/SC38 |
| E36 配对回退/去重/墓碑 | 构造无 tool/result 的 journal（回退链）、fork/seeded 副本、delete/release 数据 | 四级回退依次生效（精确→时间近邻→owner 反推→系统操作者），卡片仍渲染；fork 副本去重后每 revision 仅 1 卡；`data-replay=true` 历史卡按 revision 升序；delete 卡 status=deleted+「已取消」墓碑、release 卡 status=pending+「未指派」；`edit`/`set_dependencies` 各出一张紧凑卡 | SC35–SC38 |

> **执行方式**：E1–E36 优先用 Playwright（有鉴权 URL 时）；无 token 时用 open-computer-use 的「AX 定位 + 截图」跑 E1/E2/E7/E8/E11/E19/E21/E23/E26/E28/E29/E31/E33/E34/E35，其余以组件测试补证（§8.3.1）。

### 8.4 视觉回归

- **基准**：`docs/ux/prototype/01-tabs.png … 12-readonly-filter.png`（Figma `download_assets` 2× 导出；新增 P11 只读/筛选）。
- **方法**：Playwright `toHaveScreenshot`（同尺寸 viewport + deviceScaleFactor=2），**只比对 chrome/布局区**（tab 行、频道头、输入区、消息卡片骨架），消息正文区域用 mask 屏蔽（内容由数据驱动，不可与 mock 文案逐字对比）。
- **容差**：`maxDiffPixelRatio: 0.01`（字体渲染差异）；字体族不同导致的整体偏移用「区域对齐 + 结构化断言」（尺寸/间距/圆角 computed style）兜底。
- **必须单独断言（v1.5）**：tab 13px/500/下划线 2px/gap 32；会话头 76px；**频道头 56px（群头像 32、群聊标题、团队名、状态行）**；内容列 920/856/720；**气泡 max-width 600 / 正文 14/22；用户气泡 radius 20 / padding 10×16，agent/系统/卡片气泡 radius 12 / padding 10×14**；他人气泡 bg-layer-2、自己 bg-layer-3；**TimeDivider 居中 12/400**；BubbleCaption 11px；**无角色徽标 / 无 chip 行 / 无行内时间**；subagent **无缩进/连接线**、名字后缀「· 父名 的子体」；折叠遮罩 56px、链接 12px 文本；**P11**：只读横幅高 32/圆角 8/layer-2 底、输入区 40% 不透明、重试隐藏；筛选提示条 + 频道头 `· 筛选: scout` 后缀。

### 8.5 性能基准（脚本化）

| 指标 | 采集 | 阈值（P95，M1 本机） |
| --- | --- | --- |
| 首屏可交互（200 条，冷缓存） | `performance.mark('gc:feed-ready')` − navigationStart | ≤1.5s |
| 首屏归一化 | 内核 `perf.now()` 包裹 open | ≤250ms |
| 单条增量 append → 渲染 | mutation observer 时间差 | ≤16ms |
| 1000 事件 sync | 内核计时 | ≤50ms |
| 滚动帧率 | Playwright trace / `requestAnimationFrame` 采样 | ≥55fps |
| 内存增量（2000 条） | `performance.memory`（Chromium） | ≤120MB |
| 面板打开 CPU 空闲 | 30s 采样 | ≤5% |

### 8.6 验收标准 → 测试用例 → 架构落点（追溯表）

| SC | 验收要点 | 架构落点 | 测试 | 备注/偏离 |
| --- | --- | --- | --- | --- |
| SC1 | tab 并列可见、非菜单、默认视图不变 | §6.1 slot 注册 | E1 | — |
| SC2 | 切换为聊天室、升序、无刷新 | §6.2/§6.4 | E2 | — |
| SC3 | 三类消息并存且时间正确 | §4.2/§4.3 | E3 + fixture 01/02/04 | — |
| SC4 | A→B 以 @B 展示 | §4.2/§6.5 | E4 + fixture 02 | v1.2：`@B` **内联正文首行**（`data-mention` 在正文，不在 chip 行）；SenderLine 只显示 sender 名+状态 |
| SC5 | 折叠/展开、aria、不跳动 | §6.6 | E5 | — |
| SC6 | 未超阈值不折叠 | §6.6 | E5 + fixture 10 | 阈值 8 行/400 字（D6） |
| SC7 | @ 补全与可寻址集合（D-A） | §5.1/§6.5.2 | E6 + fixture | 选项集合 = lead + teammate（含 inactive）+ subagent（running/provisioning）；one-shot 完成/离开不可寻址；`group-chat-mention-popup` role=listbox |
| SC8 | 默认 Lead、不重复气泡 | §5.1/§5.3 | E7 | — |
| SC9 | 同发 Lead+@、说明行、同一份内容 | §4.4/§5.2 | E8 + fixture 07/14 | **证据口径（V1.1-6 冻结）**：同一 `clientBatchId` + 3 个目标 requestId + 1 条气泡；前缀两行精确匹配 canonical（全角：、） |
| SC10 | 同发只渲染 1 条 | §4.4 | E8 + fixture 07/14 | 同上；DOM 命中 1 个消息节点 |
| SC11 | 失败可重试、不重复气泡 | §5.3/§5.4 | E9 | 重试复用 requestId（S2：Host rpcId 幂等，不双投），≤2 次 |
| SC12 | 上滚分页、锚点稳定 | §4.5 | E10 | — |
| SC13 | 实时 ≤2s、滚动策略 | §4.6/§6.4 | E11 | 客户端 eventSource 推送，非 2s 轮询 |
| SC14 | 只看某成员（D-B） | §6.4.4/§6.5.2 | E12 + E32 | 命中 = sender 或 targets；父成员含其 subagent，选 subagent 不含父；不做正文搜索；单选；`group-chat-filter-banner`+`data-filter`+`clear-filter`；无匹配「该成员暂无消息」 |
| SC15 | 无团队降级与发送（D-C） | §5.1/§7 R-01 | E13 + E31 | 空态「当前为单 Agent 会话（无团队）」；**输入可用**，发送=该会话普通用户消息，无多目标说明行；无成员区/筛选 |
| SC16 | subagent 生命周期 | §4.2/§6.5 | E14 + fixture 05/06 | v1.2：无缩进/连接线，靠名字后缀「· 父名 的子体」表达从属 |
| SC17 | 成员增删一致 | §7 R-04/R-05 | E15 | — |
| SC18 | 切换保持、不串流 | §6.4/§7 R-02/R-03 | E16 | — |
| SC19 | 复制/跳转 | §6.5/§6.1 ownerProps.openView | E17 | `openView` 的 focus 是否支持 seq 定位 **UNVERIFIED** |
| SC20 | 只读历史（P11 左） | §6.4.4/§7 R-12/§6.5.2 | E18 + E33 | `group-chat-readonly-banner`「当前为只读历史，不能发送」+ 频道头 `· 团队已结束` + 输入 40% 禁用 + 重试隐藏；筛选/复制/折叠可用 |
| SC21 | 新消息浮标 | §6.4.1 unreadCount + §6.2 NewMessagesHint | E11 | **无 tab 圆点**（S4 证实无装饰位），未读全部在视图内表达（V1.1-5） |
| SC22 | 键盘与 aria | §6.10 | E19 | — |
| SC23 | 并发防重 | §5.4 单飞 | E9 | — |
| SC24 | 错误可恢复 | §7 R-10/§8.3 | E20 | — |
| SC25 | 窄屏 | §6.8 | E21 | 容器查询实现 |
| SC26 | i18n + 主题 | §6.9/§6.7 | E22 | 协议前缀不 i18n（§5.2 规则 6） |
| SC27 | 前缀注入与剥除（两条目标 + 第二行 N） | §5.2 protocol.js | E23 + fixture 14 | canonical 模板快照测试（全角「：」「、」，`@lead` 必含） |
| SC28 | 单发无前缀 | §5.2 规则 1 | E24 | N=1 不注入 |
| SC29 | lead 运行中 steer 排队 | §5.3 mode 表 | E25 | 断言 `mode='steer'`；当前 step 未 aborted |
| SC30 | 部分失败精确重试（四态） | §5.3/§5.4/§5.5 | E26 + fixture 15 | 新增 `partial` 态（V1.1-2）；成功项不重发 |
| SC31 | subagent 可寻址与从属显示 | §4.1 displayName/§5.1/§6.5 | E27 | 显示名统一为 **`<label> · <父名> 的子体`**（v1.2 后缀式，替换 v1.1 括号式 `（父名 的子体）`）；无 `@all` |
| SC32（F20） | 入群消息：欢迎提示 + creator 带卡消息（teammate） | §4.1 MemberCardPayload/§4.2.1/§6.2/§6.5 | E28 + fixture 16 | PRD v0.6 已落盘（1191 行）；证据：欢迎 `data-system-variant=welcome` + `member_card` 消息 `data-sender=lead` + `data-card="member-join"`；组数=1（1 欢迎 + 1 卡） |
| SC33（F20） | 入群消息：creator=调用方 + 父成员/上下文 + fork 去重 | §4.2/§4.3.2/§4.2.1 规则 3/4 | E29 + fixture 06/16 | `data-sender=ux`（角色标签 Teammate）；父成员/上下文「继承父会话（subagent_fork）」；one-shot 后缀；组数=1；历史回放仍 1 组 |
| SC34（F20） | 字段缺失回退、动作与成对排序 | §4.2.1 规则/§6.5.1/§6.7.2 | E30 | 无模型 value、无初始任务区块、描述「暂无角色描述」；欢迎紧邻 creator 消息之前（`data-creation-id` 相同、pairOrder 0→1），无孤立卡片；`uiWorkspace.openSession` 主路径 + 复制 ID 降级 |
| SC35（F21） | 任务创建卡：sender=Lead/action=create/status=pending/owner 空 | §4.2.2/§6.5/§6.5.2 | E34 + fixture | `data-kind=task_card`+`data-card=task`+`data-sender=lead`+`data-task-id/revision/action/status/owner/actor`；描述 2 行+展开；同 revision 1 卡 |
| SC36（F21） | 认领卡 sender=认领者、负责人正确 | §4.2.2/§6.5/§6.5.2 | E34 + fixture | `data-sender=scout`（非 Lead）；action=claim；status=in_progress；`data-task-owner=scout`；`(taskId,revision)` 配对 |
| SC37（F21） | 完成卡：action=complete、status=completed、负责人保留 | §4.2.2/§6.5/§6.5.2 | E35 + fixture | `data-sender=scout`；状态 pill「已完成」；负责人仍 scout；完成时间可见 |
| SC38（F21） | 重新打开卡：action=reopen、真实 status=pending、无 failed/返工 | §4.2.2/§6.5/§6.9 | E35 + fixture | `data-sender=lead`；action=reopen；status=pending；负责人「未指派」；**DOM 无 failed、页面无「失败/返工」字样**；无红色警示 pill |

---

## 9. 实现拆分（3 条可并行写 + 1 次集成 + 1 轮 QA）

> 前置：用户确认 Figma 原型（PRD §9 阶段 3 门禁）后开工。三条并行任务**共同依赖本文 §4/§5 的契约（已冻结）**，彼此不等待；集成日由 Lead 指定 owner 做一次合并 + 真实 GUI 联调。

### 9.1 T1 · 数据内核与客户端适配器（`gc-core`）

| 项 | 内容 |
| --- | --- |
| 目标 | 事件 → 群聊消息的可测内核 + v1 客户端数据源；不含任何 UI |
| writeScopes | `plugins/dsh-group-chat/src/core/`、`plugins/dsh-group-chat/src/adapters/`、`plugins/dsh-group-chat/test/core/`、`plugins/dsh-group-chat/test/fixtures/` |
| 依赖 | 本文 §4/§5（契约冻结）；无任务依赖 |
| done-when | ① 15 组 fixture 全绿（含 event/transient 信封、seeded、subagent-settled、fanout canonical 前缀、partial、长文本、交错时间线）；② 三层去重与排序有「两次执行结果一致」断言；③ **只消费 `entry.type==='event'`、不做整数 seq 断言**（单测断言小数 seq 被丢弃）；④ `ChannelSource` 契约测试在 `MockSource` + `ClientSessionSource(replay)` 双实现通过；⑤ 1000 事件 sync ≤50ms；⑥ 暴露 `createChannelSource(kind)` 工厂与 JSDoc 类型；⑦ 不含 `document`/`window` 引用 |
| 风险 | ① 版本漂移导致窗口形状变化 → 照 S1 调试片段首日复核一次；② `SessionReferenceSource` merge 受限 → 复用 `'gateway'`（仍 UNVERIFIED，不阻塞）；③ seeded 会话 cutoff 依赖 `session/end-seed` 出现 → 单测 + 真机双验证 |
| 不做 | 不写 UI、不写发送、不写样式 |

### 9.2 T2 · 群聊视图壳与交互（`gc-ui`）

| 项 | 内容 |
| --- | --- |
| 目标 | 从 tab 注册到完整可交互 UI（含空/加载/错误/只读/窄屏），直接跑在真实 GUI 上；同时拥有**脚手架与拼接构建** |
| writeScopes | `plugins/dsh-group-chat/package.json`、`cordis.patch.yml`、`icon.svg`、`README.md`、`scripts/build.mjs`、`lib/client.js`（生成物）、`lib/index.js`（空壳 Host 半，S5）、`src/client/`、`src/styles/`、`locale/`、`test/client/` |
| 依赖 | §6（组件/令牌/交互契约）；消费 T1 的 `src/core` 与 T3 的 `src/send`（按契约调用，缺实现时用 mock 先行） |
| done-when | ① P1/P2/P3/P4/P5/P6/P7/P9/P10/P11/P12（**v1.6 新帧 ID**，§12.2）静态还原：频道头 56px/群头像、SenderLine、自适应 Bubble、居中 TimeDivider、BubbleCaption、CollapsedNote、ToolCollapseLine、MemberJoinMessage、只读/筛选态、**TaskCardMessage（6 变体 + 紧凑版）**；**无角色徽标/chip 行/行内时间/FinalTag/失败返工**；② 折叠阈值/aria/锚点稳定；③ @ 补全键盘 + IME；④ 发送四态可视化（sending/sent/partial/failed + 已送达 X/Y）；⑤ 未读仅浮标+频道头提示、tab 无圆点；⑥ subagent 名字后缀「· 父名 的子体」、无缩进/连接线 + 截断提示；⑦ 空/加载/错误/只读/窄屏（群头像+成员数文本）；⑧ i18n zh/en 无硬编码（§6.9 键集）；⑨ `node scripts/build.mjs` 产出可安装 bundle |
| 风险 | ① tab 未读不可实现（S4 已定案）→ 按 V1.1-5 只在视图内表达，不再尝试 label 动态后缀；② `MarkdownText` 的 props 未知 → 首日 spike；③ 本地预览需鉴权 URL → 由 Lead 提供或走 open-computer-use；④ 拼接构建的模块顺序 → 构建脚本内置依赖顺序断言 |
| 不做 | 不改 Host、不加依赖（除非 Lead 批准 esbuild 备选） |

### 9.3 T3 · 发送编排与命令（`gc-send`，含可选 v2 Host）

| 项 | 内容 |
| --- | --- |
| 目标 | 目标解析 → 两行 canonical 前缀 → lead 先/成员后的逐目标 prompt → 四态状态机/幂等重试/rpcId 对账/限流；v2 Host 读路由**不实现**（S1 通过） |
| writeScopes | `plugins/dsh-group-chat/src/send/`、`test/send/`、`docs/adr/group-chat-send.md`（`src/host/` 与 §4.7 路由在 v1 **不创建**，仅保留文档设计；空壳 `lib/index.js` 由 T2 脚手架创建） |
| 依赖 | §5（发送契约）；消费 T1 的 `mentions.js`/`protocol.js`；与 T2 通过 `sendChannelBatch(draft, deps)` 单一接口对接 |
| done-when | ① 单目标/多目标/全失败/**partial**/超时/不可寻址/父不可用 7 类状态机单测；② **lead 先→成员后的串行顺序**有断言（乱序用例必须失败）；③ 重试只补失败目标、复用 requestId、≤2 次（对账后无重复投递）；④ 前缀两行 bytes 与 v1.1 canonical 完全一致（快照测试，改一处常量即可切换）；⑤ `mode='steer'` 契约 + S3 语义落 ADR；⑥ 并发单飞 + 限流 |
| 风险 | ① rpcId 对账已由 S2 证实，剩余风险是「会话被驱逐 + 日志裁剪后幂等窗口收窄」→ 重试 ≤2 次、以收到 rpcId 为准；② `subagent/parent-unavailable` 在极端驱逐场景仍可能出现 → 捕获后按失败目标处理并提示；③ 前缀字节若随 PRD v0.3 调整 → 只改 `protocol.js` 常量 + 快照 |

### 9.4 集成（I1，非并行）与 QA（Q1）

- **I1 集成日（0.5–1 天）**：合成 `lib/client.js` → 本地安装（`plugin_manager install_bundle`，Lead 执行）→ 真实 GUI 联调（有鉴权 URL 用 Playwright，否则 open-computer-use）→ 用 S1 调试片段复核窗口形状；产出 `docs/adr/group-chat-integration.md`（实测 entry 形状、rpcId 对账、发送顺序、剩余 UNVERIFIED）。
- **Q1 QA（tester）**：§8.3 e2e 全量 + §8.4 视觉回归 + §8.5 性能；产出走查报告（每条 SC 的 DOM/截图证据），未过项进 task 板 reopened。
- **里程碑**：M1 契约+脚手架（T2 首个 PR）→ M2 内核 fixture 全绿（T1）→ M3 发送状态机全绿（T3）→ M4 集成（真实 GUI 可发可收）→ M5 QA/视觉/性能 → M6 用户验收（原型确认后的实现验收）。

---

## 10. 决策状态（v1.1：已决策项 + 仍待决项）

### 10.1 已决策（v1.1 冻结，实现按此执行，不再讨论）

| ID | 决策结果 | 依据 |
| --- | --- | --- |
| D-ARCH-01 | **投递身份 = 用户消息**（非 lead peer mailbox）：接收方看到 `source.kind='user'` 的普通用户消息 + 两行前缀。peer 身份列为未来增强、不排期 | UX D2 最新版 + Lead 批准 |
| D-ARCH-01b | **前缀 canonical 冻结**：首行 `[群聊 · 同发] 收件人：@lead、@ux、@backend`（全角「：」「、」、`@lead` 必含、仅 N≥2），第二行固定说明（含 N）；`protocol.js` 单点常量 + 快照测试 | Lead V1.1-1 |
| D-ARCH-02 | **不做 tab 未读圆点**：tab 只渲染 label 文本、无装饰位（S4 实证）；未读改消息区「↓ N 条新消息」浮标 + 频道头「{n} 条新消息」提示，进入即清零 | Lead V1.1-5 + Spike S4 |
| D-ARCH-03 | **SC9/SC10 证据口径 = 同一 `clientBatchId` + N 个目标 `requestId` + 1 条气泡 + N 条投递记录**（不用跨目标同一 messageId） | Lead V1.1-6 |
| D-ARCH-04 | **新增四态 `sending/sent/partial/failed`**：`partial` 显示「已送达 X/Y」+ 失败清单；重试只补失败项，成功项不重发 | Lead V1.1-2 |
| D-ARCH-05 | **e2e 双轨**：有已鉴权 URL → Playwright；无 token → open-computer-use 操作 DSH Desktop（也作兜底冒烟）；不写入生产会话 | Lead V1.1-7 + Spike S6 |
| D-ARCH-07 | **数据范围 = lead 全部后代，depth ≤3、会话 ≤32**；teammate 不截断、subagent 按 depth/创建时间保留；截断必须可见（频道头 + system 条） | Lead V1.1-3 |
| D-ARCH-08 | **协议前缀固定中文**：它是给 agent 读的协议文本，不是 UI 文案，不随 locale 变；UI 说明行走 i18n | 架构冻结（V1.1-1 的必然结果） |
| D-ARCH-09 | **令牌修正按本文 §6.7.3 执行**（radius/字体令牌缺失 → 本地常量；Light 值只作设计对照）；请 ux 在下一版文档同步 | 架构结论（v1.1） |
| D-ARCH-10 | **v2 Host 读路由不排期、不实现**：Spike S1 已通过（entries 是原始事件），v2 失去唯一启用理由 | Lead V1.1-4 + Spike S1 |

### 10.2 仍待 Lead 决策（仅 1 条）

| ID | 问题 | 建议（默认值，不阻塞开工） |
| --- | --- | --- |
| **D-ARCH-06** | **subagent 失败/中断时是否展示其最后一段输出**（PRD §7.6 🔵）：展示更有利于排障，但可能让用户误读为「已完成发言」 | **建议展示**，并在消息头打「本轮中断/失败」标记 + 系统条；若 Lead 不决，按「展示 + 标记」实现（可逆，改动小） |

### 10.3 跟踪项（不是决策，实现期间对齐）

1. **PRD 版本跟踪**：当前为 v0.6.2（D-A~D-D 已冻结，见第 4 条）；后续 PRD 版本只需核对 F/SC 编号与本文 v1.5 契约差异（不改架构）。
2. **UX 文档**：§11 的 `--dsw-radius-*`/`--ds-font-family-code` 修正，以及 D9 未读文案（tab 圆点 → 视图内提示）；不阻塞实现。
3. **UNVERIFIED 残留**（均不影响 v1 开工）：`SessionReferenceSourceMap` 第三方 merge、`hasPromptRequest` 在会话驱逐后的幂等窗口、DSH Desktop AX 树丰富度。
4. **PRD v0.6.2 已落盘**（1201 行）：F20/M8 + D-A~D-D 四项裁决已写入；tester 的 DOM 契约建议已由本文 §6.5.2 全量采纳。PRD 与本文仍需注意的唯一差异：PRD 写「按 `(time, sessionIdRank, seq)` 归位」，本文以 `creationId→pairOrder` 作为同组前置 tie-break（§4.3.1 已说明）。
5. **UX v3.2 的小不一致**：§4.1「creator 口径」仍写「`Lead 拉了 @scout 进群`」旧文案（与欢迎提示冲突）；无团队空态把输入可用性写成「待 O6 裁决」，但 D-C/本文已定**允许发送**；实现以本文为准。
6. **P12 交付**：P12 已由 UX 建为任务卡帧 `29:1322`（见第 11 条）；只读/筛选两态仍在 P11 `25:1221` 的左右栏，任务书早期「P12=筛选态别名」已作废。
7. **tester 同步**：`tests/design/test-plan.md` §13 的 DOM 契约已被本文 §6.5.2 冻结，建议 tester 下版把仍靠文本定位的断言改为 `data-testid`（不阻塞开工）。
8. **PRD v0.7.1 已落盘**（1290 行，F21/M9）：任务卡动作/状态严格映射真实枚举、**无 failed/返工**；本文 v1.6 已对齐。**task-45 草稿中「reopen→返工」的措辞按用户拍板/PRD v0.7.1 作废**（reopen = 「重新打开」+ 真实 pending）。
9. **零真实样例**：`release`/`delete` 在 1176 条 revision 中未出现（TCF §2.3/§9），卡片文案/视觉按状态机推导，标 **UNVERIFIED**；`edit`/`set_dependencies` 真实存在但少，按 PRD F21 各出一张**紧凑卡**（不静默）。
10. **UX §4.2 文案表小瑕疵**：i18n 表缺表头且 `task.state.done` 与 `task.state.cancelled` 行之间有空行/错位；实现以本文 §6.9 的 `task.*` 键为准，建议 ux 下版清理。
11. **P12 交付更正**：P12 已由 UX 建为任务卡帧 `29:1322`（此前「P12=筛选态别名」作废；筛选态仍在 P11 右栏）。

---

## 11. 风险登记（实现期跟踪）

| ID | 风险 | 等级 | 触发信号 | 缓解 |
| --- | --- | --- | --- | --- |
| RK1 | 客户端事件窗口形状随版本漂移（S1 已证当前是原始事件信封） | 低 | 集成日复核时窗口无 `event.{type,seq,data}` | 按 S1 调试片段定位；必要时启用 §4.7 备用读接口（当前不需要） |
| RK2 | 跨会话数据放大（长任务 20+ 成员、10k+ 消息）导致卡顿/内存涨 | 高 | 首屏 >2s、滚动掉帧、内存 >200MB | 四重上限 + 虚拟化 + 懒渲染 + 只订阅有变化成员（§4.8/§6.11） |
| RK3 | 发送非原子、部分失败，用户误以为全送达 | 中 | 失败率 >1%、用户反馈 | 四态 + `partial` 的「已送达 X/Y」+ 失败清单 + 重试只补失败（§5.3/§5.4） |
| RK4 | ~~重试可能重复投递~~（S2 已解） | 低 | — | Host 按 rpcId 幂等去重；重试复用 requestId + ≤2 次 + 对账（§5.3/§5.4） |
| RK5 | experimental 契约变更（Team/subagent 包） | 中 | DSH 升级后 tab 不出现/投影缺失 | 只依赖稳定面 + 存在性判断 + 降级标记（API R5） |
| RK6 | 未读圆点/同发证据口径等 UX/PRD 期望与平台能力冲突，临到验收才发现 | 中 | 走查不通过 | 提前把 D-ARCH-02/03 交 Lead 决策（§10）；D-ARCH-01 已由 UX 修订消解 |
| RK7 | 视觉回归因字体/DPR 差异大量误报 | 低 | diff 噪声 | 只比 chrome 区 + 结构化 computed style 断言（§8.4） |
| RK8 | ~~e2e 无鉴权 URL 无法执行~~（S6 已解） | 低 | open-computer-use AX 稀疏/副作用 | 双轨执行（§8.3.1）：有 token 用 Playwright；无 token 用 open-computer-use 跑核心用例并截图留证 |

---

## 12. 附录

### 12.1 证据索引（本文引用位置）

| 主题 | 证据 |
| --- | --- |
| `conversation.view` 契约 / 18+4 props / 已占用 id | API §A1–A4；内置 `dsh-cordis-client-runner/lib/client.js` 生成 catalog |
| 第三方 view 注册先例 | API §A4（`dsh-terminal-panel` / `dsh-capability-settings` / `dsh-context` 的 client.js 行号） |
| 跨会话读取（client） | API §B1（`ISessions.retain` / `SessionReference.binding.eventSource` / `SessionEventWindow`） |
| Lead 推导 / roster 投影 | API §B2（`dsh-experimental-client-ui-agent-team` 行 475-477；`agentTeam` wire projection README） |
| Host 读取（v2） | API §B4 + inspect：`sessionQuery.observeSession` 返回 `SessionObservation{header,events,cursor,revision,source,retain(),dispose()}`；`Session.ownEvents()/firstLiveSeq/isOwnSeq()` 见 host `sessions` Service |
| 发送分流 | API §C2（`dsh-api-session-controller/.../session.js` 186-215） |
| 权限 | API §C3（`agentTeams.sendMessage` 非 @Remote、需 live Agent caller） |
| 「同发」文本前缀方案 | API §C4 |
| Host 自定义路由先例 | API §C5-2 + `dsh-context/lib/index.js` 的 `connection.fetch.register({path,methods:['POST'],requestBody:'buffered',fetch})` |
| 事件语义 / 去重 / 陷阱 | EVT §2–§9（尤其 §7.2 三层去重、§9 三陷阱） |
| 消息 schema 起点 | EVT §6 |
| 主题令牌 | 构建产物 `lib/welcome/welcome.css`（385 个 `--dsw-*` 变量名；暗色块选择器为 `body[data-ds-dark-theme]`，Light 为默认块；颜色为 alias 链，例如 `--dsw-specific-bubble` → Light `--dsw-static-deepseek-50` / Dark `--dsw-static-neutral-bluish-850`）；`dsh-web-frontend/dist/assets/index-*.css` 引用 |
| primitives / react-virtual 可用 | `dsh-web-frontend/dist/assets/index-BXV-oxvX.js` 引导注册表 `OZ()`：`react`、`react/jsx-runtime`、`react-dom`、`react-dom/client`、`@deepseek-ai/cordis`、`zod`、`@tanstack/react-virtual`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/dsh-client-ui-dockkit`；primitives 导出表（101 个非图标）见 §6.3.2 |
| UX/原型 | `docs/ux/group-chat-ux.md` v3.2（379 行，含 P11 只读/筛选、模型继承文案）；`docs/ux/prototype.md`（241 行）；Figma Page `0:1`、帧 `16:151/16:239/25:1112/10:663/17:436/17:528/10:1411/17:703/17:790/21:954/25:1221/25:1170`、令牌板 `10:78`、组件库 `10:197` |
| 任务卡字段/操作者/动作 | `docs/research/task-card-fields.md`（399 行）：`team/task` 快照无 actor/action/time、`(taskId,revision)` 配对、四级回退、action/diff 规则、四状态无 failed |
| DOM 契约 / 测试计划 | `tests/design/test-plan.md`（§13 DOM 建议，v0.2 已对齐 v1.4）；`tests/design/prototype-review.md`（P11 只读/筛选评审） |
| Spike 结论（S1–S6） | `docs/research/spikes-v1.md`（445 行）：事件信封/transient 小数 seq、rpcId 对账与 Host 幂等、queue/steer 唤醒与 `subagent/parent-unavailable`、tab 无装饰位、空壳 Host 半、open-computer-use 可行性 |

### 12.2 Figma 帧 → 实现映射（v1.2 帧 ID）

| 帧 | Node | 实现落点 |
| --- | --- | --- |
| P1 tab 行 + 瘦身频道头 | `16:151` | §6.1 slot 注册 + §6.2 ChannelHeader |
| P2 群聊主界面（气泡流，含入群消息 + 紧凑任务卡示例） | `16:239` | §6.2/§6.5 SenderLine + Bubble + TimeDivider + BubbleCaption + WelcomeNote + MemberJoinMessage（入群卡节点 `21:1027`；**紧凑任务卡 `29:1454`**；reaction `21:1039`） |
| P3 折叠/展开 | `25:1112` | §6.6（折叠/展开两态） |
| P4 @ 补全 | `10:663` | §5.1/§6.2 Composer+MentionPopup |
| P5 发送态（发送中/失败/部分失败） | `17:436` | §5.2/§5.3/§5.5 + §6.5 BubbleCaption |
| P6 subagent 消息形态 | `17:528` | §6.5 subagent 名字后缀（无缩进/连接线） |
| P7 空状态与加载骨架 | `10:1411` | §6.2 状态组件 |
| P8 1280 窄桌面 | `17:703` | §6.8 M 档 |
| P9 768 窄屏 | `17:790` | §6.8 窄屏（群头像 + 成员数文本） |
| **P10 成员加入消息** | **`21:954`**（变体 A `21:966` / B `21:989`） | §6.2/§6.5 `WelcomeNote` + `MemberJoinMessage`（creator SenderLine + CardBody）+ §6.5.1 动作 |
| **P11 · 只读历史（左）/ 筛选态（右）** | **`25:1221`** | §6.4.4 只读态 + 筛选（D-B）+ §6.9 `readonly.*`/`filter.*`；`group-chat-readonly-banner` / `group-chat-filter-banner` + 频道头 `· 团队已结束` / `· 筛选: scout` |
| **P12 · 任务卡片消息（M9）** | **`29:1322`**（6 变体：创建/认领/完成/重新打开/改派/取消） | §4.2.2/§6.2/§6.5 `TaskCardMessage`（SenderLine(actor) + CardBody）+ §6.5.2 `data-task-*` |
| F0 交互流程图 | `25:1170` | §8.3 e2e 路径图（v2 图例） |
| 设计令牌板 | `10:78` | §6.7 token 表来源 |
| 基础组件库 | `10:197` | 组件尺寸/样式参照（v1.2 仅复用 Avatar/StatusDot 等基础形，不再用 Badge/Tag） |

> 旧帧（`10:226`/`10:409`/`10:585`/`10:792`/`10:922`/`10:1180`/`10:1281`；以及被重建前的 `17:647`/`10:1126`）已删除，实现与视觉回归只认上表新 ID。**P12 已由 UX 建为任务卡帧 `29:1322`**（此前「P12=筛选态别名」的说法作废；筛选态仍在 P11 右栏）。
> 复核状态：本版 architect 直接查看了 **P12（29:1322）** 的任务卡 6 变体（创建/认领/完成/重新打开/改派/取消；骨架=操作者 SenderLine + 动作标签 + 状态 pill + task id + subject/描述/负责人/依赖 + 复制任务 ID），并此前核对 P11/P2/P6/P10。`docs/ux/prototype/13-task-cards.png` 为 v3.3 导出；其余帧实现前由 T2 owner 按导出 PNG 逐帧核对。

### 12.3 复现命令（只读校验用）

```bash
# 1) 从安装包抽取主题令牌名（只读，asar 需 Python 解析索引）
python3 - <<'PY'
import struct, json
P="/Applications/DeepSeek Harness.app/Contents/Resources/app.asar"
f=open(P,'rb'); _,hsize,_,jsize=struct.unpack('<IIII', f.read(16))
f.seek(16); IDX=json.loads(f.read(jsize)); BASE=16+hsize
def walk(n, pre=""):
    for k,v in n.get("files",{}).items():
        p=pre+"/"+k if pre else k
        if "files" in v: yield from walk(v,p)
        else: yield p,v
ents=dict(walk(IDX)); e=ents['lib/welcome/welcome.css']
f.seek(BASE+int(e['offset'])); css=f.read(int(e['size'])).decode('utf8','ignore')
import re; print(sorted(set(re.findall(r'--dsw-[a-z0-9-]+', css))))
PY

# 2) 客户端模块注册表（确认 react-virtual / primitives 可用）
#    在 index-BXV-oxvX.js 中搜索 "dsh-client-ui-primitives" → 紧随的注册表对象

# 3) Host 侧契约（需要页面鉴权后进行 client inspect；host inspect 不需要）
#    {"platform":"host","provider":"Service","method":"listService","input":{"service":"sessionQuery"}}
#    {"platform":"host","provider":"Service","method":"listService","input":{"service":"sessions"}}
#    {"platform":"host","provider":"Service","method":"listService","input":{"service":"subagents"}}
```

### 12.4 术语

| 术语 | 含义 |
| --- | --- |
| 团队频道 / channel | 一个 lead 会话派生出的群聊视图实例；频道 id = lead sessionId |
| lead | 团队主 Agent；其会话根即频道根 |
| teammate | `spawn_teammate` 创建的具名成员，独立会话、父关系 `parentSession` |
| subagent | `subagent`/`subagent_fork` 创建的临时子会话 |
| 发言 / agent_output | 某 agent 一轮推理结束后的最后一段非空 text 输出（口径 A） |
| 同发 / fan-out | 一次用户发送，同一份文本投递到 Lead + 多个被 @ 成员 |
| 前缀协议 | 同发时写入正文首行的收件人声明（UX D2 模板） |
| 游标 / cursor | 每会话已消费 seq + 窗口 revision + 全局 oldest/newest key |
| 三层去重 | 双写去重 / seed-fork 去重 / 通知副本去重（EVT §7.2） |

---

## 13. 契约变更记录

| 版本 | 日期 | 变更 | 影响 |
| --- | --- | --- | --- |
| v1.0 | 2026-10-28 | 初版：v1 纯 Client 架构、数据契约、发送协议、UI 设计、测试策略、实现拆分；记录 3 个平台能力冲突（D2/D9/SC9-10）与 10 个 Lead 决策项 | 实现任务以本文 §4/§5 为冻结契约 |
| **v1.1** | 2026-10-28 | 落 Lead 决策（顶部「决策记录 v1.1」8 条 + 「Spike 结论增补」6 条）：① 两行 canonical 前缀（全角、`@lead`、protocol.js 单点）；② 四态 `partial`；③ 数据范围 depth≤3/会话≤32 + 截断可见；④ v2 不排期（S1 已通过→不实现）；⑤ D9 未读降级（浮标+频道头，S4 证实）；⑥ SC9/SC10 证据口径 clientBatchId；⑦ e2e 双轨（Playwright / open-computer-use）；⑧ 吸收 S1–S6：只消费 `entry.type==='event'`、禁止整数 seq 断言、rpcId 精确对账、重试复用 requestId、**先 lead 后成员**的发送顺序、`subagent/parent-unavailable` 错误项、空壳 Host 半定稿；⑨ §8.6 补 SC27–SC31，§10 改为「已决策 10 条 + 待决 1 条 + 跟踪项」 | **T1/T2/T3 唯一契约源**；PRD v0.3/UX 下版按 §10.3 同步 |
| **v1.2** | 2026-10-28 | **UI 契约对齐「钉钉式气泡流」（数据/发送契约不变）**：① §6.2 组件树去 RoleBadge/ChipRow/行内时间/FinalTag，新增 SenderLine/Bubble/TimeDivider/BubbleCaption/CollapsedNote/ToolCollapseLine；② §6.5 渲染映射（M2 @ 内联首行、M3 普通气泡、M1 右对齐+下 caption、subagent 名字后缀「· 父名 的子体」无缩进/连接线）；③ §6.7 令牌表删 Pill/头像栈/chip/连接线，补气泡 bg/caption/时间分隔/失败红边；④ §6.8 窄屏改群头像+成员数文本、消息列 720 流式；⑤ §6.9 删 badge/chip key、增 caption/time/status key；⑥ §12.2 帧映射更新到 16:151/16:239/17:647/17:436/17:528/17:703/17:790 等新 ID | §6.2/§6.5/§6.7/§6.8/§6.9/§12.2；T2 实现以 v1.2 为准 |
| **v1.3** | 2026-10-28 | **成员加入卡片 `member_card`（PRD M8 / UX M7）**：① §4.1 新增 kind + `MemberCardPayload`（creator/member/time/actions）；② §4.2 新增 4 行事件映射 + §4.2.1 字段来源/回退链/creator/去重/历史回放（依据 MCF task-20）；③ §4.3.2 去重键 `mc:<memberSessionId>`；④ §6.2/§6.5 新增 MemberJoinCard + 提示行 + §6.5.1「查看会话」精确 API（`uiWorkspace.openSession`）与降级；⑤ §6.7 卡片 token/尺寸；⑥ §6.9 新增 17 个 member.* key；⑦ §8 E28–E30、fixture 16、§8.6 SC32–SC34（F20）、§12.2 帧 P10 `19:855`。**§5 发送契约与 §4 既有消息语义不变** | T2/T3 实现以 v1.3 为准；PRD v0.5 落盘后核对 F20/SC32–34 编号 |
| **v1.4** | 2026-10-28 | **入群消息改为「欢迎提示 + creator 带卡消息」（数据/发送契约不变）**：① §4.1 删除 payload.creator，`sender=creator`；新增 `creationId/pairOrder`、`systemReason:'member-welcome'`、`modelInheritedFrom`；② §4.2/§4.2.1 一次创建 = 1 条欢迎 system（pairOrder 0）+ 1 条 member_card（pairOrder 1，sender=creator），补 creator 判定/排序/去重/历史回放；③ §4.3.1 排序加 `creationId→pairOrder` 规则、§4.3.2 欢迎去重 id；④ §6.2/§6.5 删除孤立卡片路径，改为 WelcomeNote + MemberJoinMessage(SenderLine creator + CardBody)；⑤ §6.7 令牌/尺寸改为 creator 头（头像 32/标签 11/时间 11）+ 卡片 body；⑥ §6.9 按 UX v3.1 重排 member.* key（welcome/context*/modelInherited 等 18 个）；⑦ §8 E28–E30/fixture16/SC32–SC34 改为成对断言；⑧ §12.2 P10 → `21:954`、P2 卡节点 `21:1027` | T2/T3 实现以 v1.4 为准 |
| **v1.5** | 2026-10-28 | **四项裁决 + DOM 契约冻结（数据/发送契约不变）**：① §5.1 D-A 可寻址（Lead/teammate 恒可寻址、subagent 仅 running/provisioning）+ D-C 无团队允许发送；② §6.4.4 D-B 筛选（sender/targets 命中、子体归入父、不做文本搜索、单选）+ 只读态（P11 横幅/占位/后缀）；③ §6.5.2 冻结 tester §13 全部 `data-testid`/`data-*`/`role`；④ §6.9 新增 filter.*/readonly.*/empty.noTeam 与 D-D 模型继承 key（继承 Lead / 继承 creator）；⑤ §8 E6/E12/E18 更新、新增 E31–E33、§8.4 视觉断言含 P11；⑥ §12.2 P3 `25:1112`、F0 `25:1170`、P11 `25:1221`（P12=同帧右栏）、§8.6 SC7/14/15/20/32/33 同步 | T2/T3 实现以 v1.5 为准 |
| **v1.6** | 2026-10-28 | **任务卡片消息 `task_card`/M9（数据/发送契约不变）**：① §4.1 新增 kind + `TaskCardPayload`（action/task/actionLabel/statusLabel/actor/time/dedupeKey/replay）；② §4.2/§4.2.2 `team/task` 快照 + `tool/call`(team_task_create/update)+result 按 `(taskId,revision)` 配对，四级回退（精确→时间近邻→owner 反推→系统）+ `ownEvents()` 过滤；动作优先 arguments.action、diff 兜底与歧义消解；③ §4.3.2 去重 `${teamId}:${taskId}:${revision}`、回放 revision 升序；④ §6.2/§6.5 TaskCardMessage=操作者 SenderLine+任务卡 body（动作标签/状态 pill/task id/subject/描述折叠/负责人/依赖/复制任务 ID，紧凑版）；⑤ §6.5.2 冻结 `data-task-*` + `data-card=task`；⑥ §6.7 状态四枚举 token、§6.9 task.* 20 keys；⑦ §8 E34–E36、§8.6 SC35–SC38、§12.2 P12 `29:1322` + P2 紧凑卡 `29:1454` | T2/T3 实现以 v1.6 为准 |
| **v1.6.1** | 2026-10-28 | **两处视觉契约修正（数据/发送契约不变）**：① 气泡圆角/内边距按发送者区分——用户 `r20/p10×16`（`--gc-user-bubble-radius/padding`），agent/系统/卡片 `r12/p10×14`（`--gc-bubble-radius/padding`），不再用单一值；② 发送键改为 `state-business-primary` 底 + `bg-base` 箭头（原 `button-primary-fill`/`label-primary-inverted` 行作废）；同步 §6.2/§6.5/§8.4 表述 | §6.7.1、§6.7.2 |

> 变更规则：§4 领域模型字段、§4.6 `ChannelSource` 方法签名、§5.2 协议模板为**冻结项**；变更需同时更新本文版本、§13、并通知 T1/T2/T3 owner 与 tester。
