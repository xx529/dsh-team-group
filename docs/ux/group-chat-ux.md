# UX 规格：DSH 对话页「群聊」视图

| 项 | 内容 |
| --- | --- |
| 版本 | **v3.3**（2026-10-28；对齐 PRD v0.6.2 / 架构 v1.5（含 D-A/D-B/D-C/D-D 裁决与 DOM 契约）/ Figma 原型 v3.1；含 D1–D10、M8 入群消息、P11 只读/筛选态） |
| 作者 | ux（Agent Team teammate） |
| 上游 | `docs/specs/group-chat-prd.md`（v0.6.2，F1–F20 / SC1–SC34）、`docs/architecture/group-chat-architecture.md`（v1.5）、Lead 决策 D1–D10 + D-A~D-D |
| 下游 | Figma 原型（`docs/ux/prototype.md`）、architect、frontend、tester |
| 视觉基准 | DSH 0.2.1-rc.3 真实构建：`dsh-client-ui-theme`（design-platform.css / base.css）、`dsh-client-ui-conversation`（实测 CSS）、桌面端真实截图（`docs/ux/ref/`） |

> 原则：**只做聚合视角，不发明视觉语言**。所有颜色绑定 `--dsw-alias-*` / `--dsw-specific-*` 主题 token，字号/圆角/间距对齐现有对话页；群聊 tab 与现有 tab 视觉完全同族。

---

## 1. 目标与范围

- 在对话页新增第 2 个视图 tab「群聊」，以聊天室形态按时间线聚合 **lead 主会话 + 全部 teammate 会话 + 全部 subagent 子会话**（D10）。
- 用户可在群聊内继续指挥团队：未 @ 默认发给 Lead；@ 一个或多个成员时，**同一份内容** fan-out 给 Lead + 被 @ 成员，并向所有接收方声明接收方清单（D2/D3）。
- 同时适配 teammate 与 subagent：subagent 消息与普通消息同一样式，仅在名字后加 11px 灰字后缀「· <父成员> 的子体」表达从属（D5 / v2）。
- 非目标：不做跨团队聚合、不做语音/表情回应/编辑撤回/线程回复、不改动现有视图行为（见 PRD §1.4）。

---

## 2. 信息架构

```
对话页（会话级）
├─ 会话头：会话标题（crumb） · 智能体团队徽标 · 模式 · N 个子智能体
├─ 视图 tab 行：对话 · [群聊] · 轨迹 · 上下文 · 终端 · 编队 · 能力 · ···
└─ 视图内容区
   └─ 群聊（团队频道，一个会话 = 一个频道）
      ├─ 频道头：群头像 32（2×2 拼贴） · 标题「群聊」 · 团队名（取 lead 会话标题） · 8 名成员 · 3 个运行中 · 单个筛选图标
      ├─ 消息流（时间线）：日期分隔 → 系统提示 / 成员发言 / agent→agent / 用户消息
      │   ├─ 顶部：加载更早（骨架 / 已到最早）
      │   ├─ 尾部：新消息浮标「↓ N 条新消息」
      │   └─ 筛选态：顶部提示条「正在只看 scout（n 条）· 清除」
      └─ 输入区（v1 极简，PI-19 裁决）：发送目标行（Lead / @chips）→ 文本输入（@ 补全）→ 右下圆形发送键；**不含附件「+」、完全权限、自动继续、模型名控件**（会话级设置在原生 composer 已有，附件 v1 非目标）
```

**入口与导航**

| 项 | 规格 |
| --- | --- |
| tab 名称 | 「群聊」（en: Group chat） |
| 位置 | 紧邻「对话」右侧；注册 order=5，与现有视图同级并列（D7） |
| 激活态 | 文字 `--dsw-alias-state-business-primary` + 2px 下划线（圆角 2，bottom -1） |
| 未激活态 | `--dsw-alias-label-tertiary` |
| 未读表达（D9 修正） | `conversation.view` 注册仅 `{id, order, label}`，无 tab 装饰位 → **tab 始终只有「群聊」文字，不画圆点、不显示计数**。未读反馈放在消息区：底部悬浮 `↓ N 条新消息`（点击回到底部并清零）+ 频道头显示 `N 条新消息` |
| 无团队 | tab 仍显示；进入后为空状态，说明如何组建团队（D7 / F13） |
| 切换会话 | 群聊重新绑定该会话的频道；滚动位置、筛选态、输入草稿按会话隔离保存（F15） |
| 切换视图 | 局部切换不重载页面；切走再切回保持滚动位置与草稿 |

---

## 3. 布局三档

真实基准（来自 DSH 实测 CSS）：会话头 `min-height 76px / padding 10px 28px 0 20px / border-bottom .5px --dsw-alias-border-l3`；tab 行 `min-height 25px，margin-top 10，gap 32`；内容列 `--dsh-chat-content-width: clamp(680px, 64%, 920px)`；输入卡 `max-width = 内容列 + 32，radius 28`。

| 档位 | 画布 | 侧栏 | 会话头 | 内容列 | 输入卡 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 桌面 L | 1440×900 | 260 | 76 | 920（左右各 130） | 952 | 主帧；群头像 32 + 团队名 + 8 名成员 · 3 个运行中 + 筛选图标 |
| 桌面 M | 1280×800 | 220 | 72 | 856 | 872 | 间距收紧：tab gap 32→26，消息 13.5/22 |
| 窄屏 | 768×900 | 无（单列） | 顶部栏 52 + tab 行 44 | 720（左右 24） | 736 | 顶部栏只留「‹ 群聊 · 团队名 · 8 名成员 ▾」；筛选/成员进下拉；消息不横向溢出 |

**纵向结构（1440）**：会话头 76 → 频道头 56（瘦身版，见下）→ 消息流（弹性，约 600）→ 输入区 164（贴底、吸底）。

**频道头（v2 瘦身，钉钉式）**：高度 56、`padding 0 28`、底部 1px `--dsw-alias-border-l3`。

| 元素 | 规格 |
| --- | --- |
| 群头像 | 32×32，圆角 8，2×2 四人头像拼贴（Lead 用 business-primary，其余 business-tertiary / layer-3 / label-dimmed） |
| 标题 | 「群聊」14/500 `label-primary` |
| 分隔 | 1px × 14 竖线 `border-l2` |
| 团队名 | 团队名（取 lead 会话标题）14/400 `label-secondary` |
| 状态行 | 6px 绿点 + `8 名成员 · 3 个运行中` 11/400 `label-tertiary` |
| 右侧 | 仅一个 32×32 筛选图标按钮（三条漏斗线，`interactive-bg-hover` 底、圆角 8）；**去掉成员头像栈与「成员 8」文字按钮** |

---

## 4. 消息类型与视觉（v2 · 气泡化）

> v2 原则：**去掉一切不传递信息的装饰**。不再有角色徽标、每行时间戳、「→ 发送给」chip 行、绿色勾药丸、满宽卡片、系统药丸。统一为「头像 + 名字行 + 自适应气泡」，@ 内联到正文。

**统一消息行**（内容列 920，左右内边距 130）

| 元素 | 规格 |
| --- | --- |
| 头像 | 32×32，圆角 8（方形感），首字母 12/500；Lead 用 `state-business-primary` 实底 + `button-primary-fill` 字，其余 `state-business-tertiary` + `label-primary` |
| 名字行 | 名字 14/500 `label-secondary`；行内状态 11/400 `label-caption`（6px 点：`state-success-primary` 运行中 / `label-dimmed` 已完成），间距 8/12 |
| 气泡 | 自适应宽度，`max-width 600`（窄屏 70%），圆角 12，`padding 10×14`，正文 14/22 `label-primary`；他人 `bg-layer-2`，自己 `bg-layer-3` |
| 行距 | 消息之间 16（同一发送者连续消息可 8） |
| 时间分隔 | 居中 12/400 `label-caption`（如 `今天 · 11:02`），只在**日期变化或间隔 ≥5 分钟**处插入；**不再有每行右侧时间戳** |

**消息类型**

| ID | 类型 | 视觉 |
| --- | --- | --- |
| M1 | 用户消息 | 右对齐气泡；气泡下 11/400 `label-secondary` 单行 `已同时发送给 Lead、@ux、@backend`（**无绿勾、无底色**） |
| M2 | agent→agent | 同普通 agent 气泡；`@目标` 内联在**正文首行**，颜色 `state-business-primary`（如 `@backend 接口清单已确认…`）；**删除「→ 发送给 @x」独立 chip 行** |
| M3 | agent 最终输出 | 就是普通 agent 气泡，**不加「最终输出 · 回复群聊」徽标**；hover 可提供「打开所属会话」 |
| M4 | 系统提示 | ① 一般事件：居中 11.5/400 `label-tertiary` 纯文本，**无背景药丸**（`团队已组建 · 8 名成员`、`接口清单校验 完成 · 用时 1 分 12 秒`）；② 欢迎提示（成员加入）：**右对齐 12/400 `state-business-primary` 蓝字**，无背景/无药丸，文案 `欢迎 @scout 加入群聊`（对应钉钉右上角那条） |
| M5 | 交付说明 | 气泡内文件行（文件名 + 路径 + 「打开」），不展示文件内容 |
| M6 | 工具/过程摘要 | 气泡下 11/400 `label-caption` 一行 `3 个工具调用 · 见「轨迹」`，**无背景条**；只给指针，不展示工具内容 |
| M7 | 视图级提示条 | 筛选态（正在只看 scout）/ 只读历史 / `N 条新消息` 等视图级提示：顶部细提示或消息区浮标，**不进入消息流合并**、不参与时间线排序 |
| M8 | 成员加入消息 | **creator 发出的一条带卡消息**（sender = 创建者）：先右侧欢迎提示（M4 ②），再 creator 消息头（头像 32 + 名字 14/600 + 角色小标签 11 + 时间 11 同行），消息正文即成员卡（宽 max 520、`bg-layer-1`、`border-l2`、radius 12、padding 16）；不参与长文折叠（详见 §4.1） |
| M9 | 任务卡片消息 | **谁操作谁发话**：发送者 = 操作者（Lead 或 teammate），消息头沿用 M8 语言（头像 32 + 名字 14/600 + 角色小标签 11 + 时间 11）；卡片正文 = 动作标签（创建任务/认领任务/完成任务/重新打开任务/改派任务/取消任务/编辑任务/依赖变更/放回任务）+ 状态 pill + task id（等宽小字）+ 标题 14/600 + 描述（创建卡 2 行折叠）+ 负责人/依赖信息行 + 「复制任务 ID」文字链；宽 max 520、`bg-layer-1`、`border-l2`、radius 12、padding 16（详见 §4.2） |
| S | subagent 发言 | 与普通消息**完全相同**的样式；名字显示 `接口清单校验` + 后缀 11 `label-caption` `· ux 的子体`；**删除缩进与连接线** |

> 编号与 PRD v0.5 §4.1 一致：M1 用户 / M2 agent→agent / M3 最终输出 / M4 系统提示 / M5 交付 / M6 工具过程 / M7 视图级提示条 / M8 成员加入卡（S 为 subagent 发言的样式说明，非独立消息类型）。

**对比 v1 删除的装饰**：角色徽标（Lead/Teammate/Subagent）、每行时间戳、「→ 发送给」行、绿色勾药丸、满宽卡片与描边、系统提示药丸、subagent 缩进连接线、≥26px 的「查看全部」按钮胶囊（改为 12px 文本链接）。

### 4.1 成员加入卡片（M8）

**形态**：入群卡不是孤立卡片，而是 **creator 发出的一条消息**（sender = 创建者），消息正文就是卡片。结构三段（自上而下）：

1. **欢迎系统提示（M4 ②）**：右对齐、12/400、`state-business-primary` 蓝字，无背景/无药丸，文案 `欢迎 @{name} 加入群聊`。
2. **creator 消息头**：creator 头像 32（Lead 用 business-primary，teammate 用 business-tertiary，首字母 12/500）+ 名字 14/600 `label-primary` + 角色小标签 11 `label-caption`（`主 Agent` / `Teammate`）+ 时间 11 `label-caption`（与名字同一行、贴右）；**不做气泡**，头像下方直接接卡片。
3. **卡片正文**：成员卡（宽 max 520、`bg-layer-1`、`border-l2`、radius 12、padding 16）——视觉上从属这条消息，不是悬浮卡。

**触发**：`spawn_teammate` / `subagent` / `subagent_fork` 创建成员时，在成员 active 时刻插入上述「欢迎提示 + creator 带卡消息」。无弹窗/大图/插画/旋转动效。

**触发时机**：卡片在 `team/member.phase === 'active'` 之后插入（`provisioning → active` 约 100–400ms），**不是** `tool/call` 开始时刻——避免出现「卡已出现但成员还没就绪」的空卡。

**creator 口径**
- `spawn_teammate`：creator **恒为 Lead**（仅 lead 可调用；teammate 调用会被拒绝）→ 由 **Lead 发出带卡消息**（sender = Lead · 主 Agent），前置欢迎提示 `欢迎 @scout 加入群聊`。
- `subagent` / `subagent_fork`：creator = **调用方成员名**（父成员可能是 Lead 或任意 teammate）→ 由**该成员发出带卡消息**（sender = 该成员 · Teammate），前置 `欢迎 @产品设计 加入群聊`。
- 同一成员只发一次带卡消息；欢迎提示与带卡消息共享 `creationId`（`pairOrder` 0 = 欢迎、1 = 卡片），anchor time 相同，排序欢迎在前。

**卡片结构**（自上而下，padding 16，行距 4–10）

| 区块 | 内容与规格 |
| --- | --- |
| 发送者消息头（卡片外） | 头像 32 圆角 8 + 名字 14/600 + 角色小标签 11（`主 Agent` / `Teammate`）+ 时间 11 `label-caption` 同行贴右；卡内不再重复头像/名字 |
| 卡片标题 | `「@scout」加入群聊` 13/500 `label-primary`；下方接角色描述（成员身份在发送者头与描述里） |
| 角色描述 | 12/19 `label-secondary`，1–2 行；为空显示 `暂无角色描述`（`label-tertiary`） |
| 信息行 | `label + value` 两列：label 11 `label-caption`（x=16，宽 68）、value 12 `label-secondary`（x=84）；行高 22 |
| 初始任务 | label `初始任务` 11 caption + 正文 11/17 tertiary **2 行截断**，右上角「展开」11 文字链（`state-business-primary`）；展开只影响本卡 |
| 动作 | `查看会话` 12/500 business-primary；`查看任务` 12 secondary（仅 teammate）；均文字链接，无按钮底 |

**字段**

| 字段 | 取值 | 来源 | 空值回退 |
| --- | --- | --- | --- |
| 名字 / 头像 | 成员名 / 首字母色块 | 团队目录（agentTeams/subagents 成员视图） | 名字缺失显示成员短 id |
| 角色 | `Teammate` / `Subagent` + 创建者/父成员 | 创建工具调用 | 无角色信息时只显示「成员」 |
| 模型 | 只显示模型名，不显示 provider 内部名：`deepseek-flash`；模型来自继承时 `deepseek-flash（继承 Lead）`。回退链：`descriptor.agentModel` → `spawn_teammate result.member.model` → `list_agents.model` → **隐藏该行** | 成员 descriptor / 成员视图 | 全链路缺省 → 隐藏该行（不显示「未知」） |
| 上下文策略（按工具名确定，PRD v0.5 口径） | `spawn_teammate` + `arguments.context=fresh` → `全新上下文（fresh）`；`arguments.context=fork` → `继承 Lead 已完成回合（fork）`；`subagent` → `全新上下文（subagent）`；`subagent_fork` → `继承父会话（subagent_fork）` | 创建工具名 + 创建参数 | 工具名缺失 → 隐藏该行 |
| 父成员 | 仅 subagent 显示（如 `ux`） | 子会话 parent | teammate 卡不显示该行 |
| 创建方式 | `spawn_teammate` / `subagent` / `subagent_fork` | 工具名 | 未知时隐藏该行 |
| 初始任务 | 创建时的 prompt / description 摘要 | 工具调用参数 | 无任务时隐藏整个「初始任务」区块 |

**变体与状态**

- 变体 A（Lead 发消息拉 teammate）：发送者头 = Lead · 主 Agent；卡内有初始任务 + `查看会话` + `查看任务`；上下文 `fresh` 或 `fork`。
- 变体 B（teammate 发消息拉 subagent）：发送者头 = 该 teammate（如 ux · Teammate），欢迎提示 `欢迎 @产品设计 加入群聊`；卡内显示父成员；生命周期后缀取自 `descriptor.mode`——`one-shot` 追加「· 一次性（one-shot）」，`continuable` 默认可省略（原型 P10 即省略），无 `查看任务`。
- 运行中可在角色小字后追加 6px 绿点 + `运行中`（与消息行一致，不新增徽标）。
- 卡片高度随信息行数量自适应（2–4 行 → 约 240–310px）；空值回退会减少行数而非留空。

**边界与去重**

- `fork` / `seeded` 子会话会复制父会话的 `tool/call` 事件，必须按 **ownEvents** 过滤（仅本会话产生的事件）后再判断「是否新成员加入」，否则同一成员会重复出卡。
- 同一 `memberId` 只出一张卡（以 `team/member` 的 phase 迁移为幂等键）；成员重建（同名新会话）视为新成员，再次出卡。
- 团队已结束 / 只读历史时插入的卡按只读态渲染（不显示动作链接，待实现确认）。
- 卡片不参与长文折叠规则；`初始任务` 折叠状态仅本卡 UI 态，不入库。

**文案**

| Key | zh-CN | en |
| --- | --- | --- |
| member.welcome | 欢迎 @{name} 加入群聊 | Welcome @{name} to the group |
| member.cardTitle | 「@{name}」加入群聊 | @{name} joined the group |
| member.noDesc | 暂无角色描述 | No description |
| member.roleLead | 主 Agent | Main agent |
| member.roleTeammate | Teammate | Teammate |
| member.roleFallback | 成员 | Member |
| member.contextFresh | 全新上下文（fresh） | Fresh context (fresh) |
| member.contextForkLead | 继承 Lead 已完成回合（fork） | Continue from Lead's finished turn (fork) |
| member.contextSubagent | 全新上下文（subagent） | Fresh context (subagent) |
| member.contextSubagentFork | 继承父会话（subagent_fork） | Forked parent context (subagent_fork) |
| member.modeOneShot | · 一次性（one-shot） | · One-shot |
| member.modelInherited | {model}（继承 {parent}） | {model} (inherited from {parent}) |
| member.expandTask | 展开 | Expand |
| member.collapseTask | 收起 | Collapse |
| member.viewSession | 查看会话 | Open session |
| member.viewTask | 查看任务 | Open task |
| member.sessionCopied | 无法直接跳转，已复制会话 ID | Cannot open directly — session ID copied |
| member.noPermission | 无权限打开该会话 | No permission to open this session |

> 与架构 v1.5 §6.9 的 18 个 `member.*` key 一一对齐；`member.joinNotice`（「拉了」口径）已废弃删除，欢迎语义改由 `member.welcome` 承担。

### 4.2 任务卡片消息（M9）

> **严格映射原则**：任务卡片**只映射 `team_task_update` 的真实 `action` 与 `task.status` 四个枚举**（`pending / in_progress / completed / deleted`），不新增平台不存在的状态与语义；`reopen` 显示为「重新打开」，状态按真实 task 数据回落为 `pending`（owner 已丢弃）或 `in_progress`（owner 保留）。

**形态**：与 M8 成员加入同一套「操作者发话」语言——**谁改任务谁发消息**，发送者 = 操作者（可能是 Lead，也可能是某个 teammate）。不新增系统卡、不伪造「任务机器人」。

**结构**

1. **操作者消息头**：头像 32（Lead 用 business-primary，teammate 用 business-tertiary）+ 名字 14/600 + 角色小标签 11（`主 Agent` / `Teammate`）+ 时间 11（贴右）。
2. **卡片正文**（宽 max 520、`bg-layer-1`、`border-l2`、radius 12、padding 16）：
   - 顶部动作行：动作标签 11 caption（`创建任务` / `认领任务` / `完成任务` / `重新打开任务` / `改派任务` / `取消任务`）+ **状态 pill**（20 高、999 圆角）+ 右侧 `task-N` 等宽 11 caption。
   - 标题：任务 subject 14/600 `label-primary`（单行，过长省略）。
   - 描述：仅创建卡默认展示，11.5/17 `label-tertiary` **2 行截断 + 「展开」**；后续卡只显示变更说明（有则显示、无则隐藏）。
   - 信息行（label 11 caption / value 11.5 secondary，行高 20）：`负责人`（未指派时显示「未指派」，reopen 后为「未指派（reopen 后丢弃）」）、`依赖`（`blocked_by` 名称或 ID，空则整行隐藏）、`完成时间`（仅完成卡）、`revision`（可选，默认隐藏）。
   - 动作：`复制任务 ID` 文字链（11.5 business-primary）；**不引入「任务详情页」跳转**（v1 无该页面）。
3. **紧凑版**（用于 P2 等密集消息流）：仅保留 动作行 + 标题 + 负责人 + 复制链接，高度约 84px。

**状态色（全部走主题 token）**

| 状态（真实枚举） | pill 底 | pill 文字 | 说明 |
| --- | --- | --- | --- |
| 待认领（pending） | `interactive-bg-hover` | `label-secondary` | 创建后未认领；`reopen` 后（owner 丢弃）也回落此态 |
| 进行中（in_progress） | `state-business-tertiary` | `state-business-primary` | 认领 / 改派后（`reassign` 后仍为 in_progress） |
| 已完成（completed） | `state-success-tertiary` | `state-success-primary` | 可显示完成时间 |
| 已取消（deleted） | `interactive-bg-hover` | `label-caption` | 墓碑态：列表过滤，消息保留 |

> 不使用琥珀/警示色，不引入第五种状态；`reopen` 不是独立状态，只是「重新打开」这个动作产生的一次状态回退。

**动作与操作者口径（取证结论）**

- `team/task` 是整条快照（`id/revision/subject/description/status/blockedBy/writeScopes/[ownerId]`），**无 actor / action / 时间**；操作者取 `tool/call` 所在会话成员，动作用 `tool/call.arguments.action`。
- 配对键 `(taskId, revision)`：操作者会话的 `tool/result` revision ↔ Lead 会话 `team/task` 同 revision。
- 状态仅 `pending | in_progress | completed | deleted`（zod strict 枚举），任务卡的状态 pill 只取这四个值。
- **动作标签严格对应 action（统一长标签）**：`create → 创建任务`、`claim → 认领任务`、`complete → 完成任务`、`reopen → 重新打开任务`、`reassign → 改派任务`、`edit → 编辑任务`、`set_dependencies → 依赖变更`、`delete → 取消任务`、`release → 放回任务`。
- `reopen`：completed→pending 且丢弃 ownerId，卡片状态显示 `pending`（若实现保留 owner 则显示 `in_progress`，以真实 task 数据为准）；原因取操作者文本 / 描述变更（若有）。操作者与创建/认领/完成可为不同成员（原型 A=Lead、B=scout、C=backend）。
- `reassign` 仅 Lead，改派后状态 `in_progress`；`delete` 墓碑显示 `已取消`；`release` 显示 `放回`（待认领）。
- **零真实样例的 `改派 / 取消 / 放回 / 编辑 / 依赖变更`** 为按状态机推导的变体示意，原型中已标注「按状态机推导」。

**文案**

| Key | zh-CN | en |
| --- | --- | --- |
| task.created | 创建任务 | Task created |
| task.claimed | 认领任务 | Claimed |
| task.completed | 完成任务 | Completed |
| task.reopened | 重新打开 | Reopened |
| task.reassigned | 改派任务 | Reassigned |
| task.cancelled | 取消任务 | Cancelled |
| task.state.pending | 待认领 | Unclaimed |
| task.state.inProgress | 进行中 | In progress |
| task.state.done | 已完成 | Completed |


| task.state.cancelled | 已取消 | Cancelled |
| task.owner | 负责人 | Owner |
| task.blockedBy | 依赖 | Blocked by |
| task.copyId | 复制任务 ID | Copy task ID |

## 5. 长文本折叠

| 规则 | 值 |
| --- | --- |
| 触发阈值 | 正文 **8 行** 或 **400 字符**，先到者触发（D6） |
| 折叠态 | 固定 8 行高度（8×24＝192px）+ 底部 56px 渐变遮罩（用 16 层 4px 半透明 bg 叠加实现，导出无图片依赖） |
| 折叠链接 | **12px 文本链接** `展开全部（约 N 字）`（N 取整，如 `展开全部（约 681 字）`），`state-business-primary`，无按钮底/无圆角胶囊；展开后固定为 **`收起`**（不带箭头符号，保持一致）。 |
| 展开行为 | 只影响本条消息；保持被展开消息**顶部位置稳定**，不跳动；滚动锚点不变 |
| 永不折叠 | 系统提示条、「已同时发送给…」说明行、交付文件卡片标题、消息头 |
| 代码块/表格 | 折叠时整体截断；展开后完整渲染，代码块内部不折叠，横向滚动 |
| a11y | 按钮 `aria-expanded` 正确反映状态，Enter/Space 可触发，焦点环 2px `--dsw-alias-state-business-primary` |

---

## 6. @ 补全流程

1. 输入框键入 `@` → 立即在其**上沿**弹出成员补全浮层（不要悬在消息区中央），宽 380，圆角 14，`--dsw-specific-menu` 底 + `border-l2`，投影 0 12 28 rgba(0,0,0,.35)。
2. 列表项 46px：头像 24 + 名称 13/500 + 副标题（`主 agent · 运行中` / `Teammate · 已完成` / `ux 的子体 · Subagent`）；键盘高亮行用 `interactive-bg-hover` 底 + 左侧 2px business-primary 竖条。
3. 键盘：`↑ ↓` 移动，`Enter` 或 `Tab` 确认，`Esc` 关闭（关闭后焦点留在输入框）；点击外部关闭。
4. 选中 → 生成**提及 chip**（@ux，不可拆分，整体退格删除），已选 chip 显示在输入框上方的「发送给」行；此时占位恢复「回复群聊…」，只有再次键入 `@` 才重新弹层。
5. 过滤：继续输入的字符作为过滤词；无匹配显示 `无匹配成员` 并允许继续输入普通文本。
6. **可寻址集合（D-A）**：① Lead 恒可寻址；② **全部 teammate 恒可寻址（含 inactive / 已完成，仍可被 @ 与发送）**，副标题标 `Teammate · 已完成（仍可寻址）`；③ **subagent 仅在 `running` / `provisioning` 可寻址**，副标题标 `· Subagent · 运行中`；④ **不出现已完成 one-shot subagent**（不可寻址即不入列表）；⑤ 排序：Lead → 运行中 teammate → inactive teammate → subagent（父成员在后）。
6. IME：中文组合输入期间不拦截按键、不提前提交，`compositionend` 后才触发过滤。
7. 失效提及：成员离开后残留 chip 在发送时自动剔除，并在说明行提示「@pm 已离开，未发送」。

---

## 7. 多目标发送与说明行（D1–D4）

| 决策 | 交互落地 |
| --- | --- |
| D1 发给 Lead | 等价于在 lead 会话发送一条用户消息，**立即触发 lead 新一轮**；lead 正在运行时**排队**，不打断（与现有 composer 行为一致，输入区显示「Lead 运行中，已排队」） |
| D2 投递身份 | 同一份内容以**用户消息身份**投递到各目标会话（非 Team peer mailbox）；正文首行带 `[群聊 · 同发]` 收件人协议前缀（含全部接收方）；接收方各自收到一份，且看到同一份接收方清单 |
| D3 fan-out | 同一份文本投递到 Lead + 被 @ 成员；**UI 只出现一条用户气泡**，不生成多条 |
| D4 回执 | 仅 `发送中 / 已发送 / 失败`；不显示已读、处理中 |

**输入区结构（自上而下）**

1. 目标行：`发送给` + `Lead` chip + 已选 @chips + 提示文案（未 @ 时：`未 @ 时默认发送给 Lead；键入 @ 可同时发送给多人`；有 @ 时：`共 3 位 · 同一份内容同时发送`）。
2. 输入框：占位 `回复群聊…`；最多 336px 高后内部滚动。
3. 发送键：右侧 34px 圆形（`state-business-primary` 底 + `bg-base` 色 ↑），与输入行同一水平线。
4. **v1 不包含**（PI-19）：附件「+」、`完全权限 ▾`、`自动继续` 开关、模型名（如 `deepseek-flash ▾`）。这些是 DSH 原生 composer 的会话级能力，群聊输入器只做「发给谁 + 说什么 + 发送」；如需调整权限/模型，用户回到「对话」视图的原生输入器。
5. 输入卡高度因此收紧：桌面卡高 **96px**（目标行 20 + 输入行 32 + 上下 padding 各 12 + 底部留白），窄屏 **88px**；radius 保持 28。

**发送后**

- **乐观过渡**：点击发送 → 立即插入 `sending` 气泡（不等服务端），随后由回执改为 `sent` / `partial` / `failed`。
- 发送中样式（统一口径）：气泡整体 **60% 不透明**，**气泡外左侧 11px `label-caption`「发送中…」**（不使用 spinner/进度环，避免与气泡内文字混排）。
- 成功：恢复常色 + 下方说明行 `✓ 已同时发送给 Lead、@backend、@ux`。
- 失败：`--dsw-alias-state-error-primary` 1px 描边 + 错误文案（`发送失败：网络中断，已保留原文`）+ 文字链 `重试` / `复制原文`；重试按客户端 messageId 幂等，不新增气泡。
- **部分失败（partial）**：气泡保持常色，气泡下 11px 说明行 `已送达 2/3 · 失败：@pm`（失败成员名逐列，超过 3 个截断为 `失败：@pm 等 3 人`），`重试` 只补失败项，成功项不重发。
- 键盘：`Enter` 发送、`Shift+Enter` 换行；发送中禁用重复提交；草稿在会话/视图切换时保留。

---

## 8. 状态与反馈

| 状态 | 表现 |
| --- | --- |
| 首次加载 | 5 条骨架（头像圆 + 名称块 + 两行文本块），使用 `--dsw-alias-bg-skeleton`，不改变布局（CLS≈0）；>1s 叠加进度提示 |
| 空（团队存在无发言） | 居中：`@` 图标底 + **`团队还没有发言`** + **`成员每轮结束后会在这里发言。`** + 输入区可用（文案与 PRD F12 逐字一致） |
| 空（无团队） | 标题 **`当前为单 Agent 会话（无团队）`**（PRD SC15 逐字）+ 说明 **`仅显示该会话的用户消息与该 agent 的最终输出`** + 11px 文字链「如何组建团队」；不带成员区与筛选；**输入区可用（D-C：无团队时发送 = 该会话普通用户消息）** |
| 只读历史（P11 左） | 顶部横幅 **`当前为只读历史，不能发送`**（12px `label-secondary`，layer-2 底 + 圆角 8，高 32）+ 频道头状态位追加 `· 团队已结束`；输入区禁用（40% 不透明、占位 `团队已结束，群聊为只读历史`）；隐藏「重试」与所有写操作；历史加载/筛选/复制/折叠仍可用 |
| 实时追加 | 贴底时自动滚动；用户上滚后不强制回底，显示浮标 `↓ N 条新消息` |
| 未读表达 | 不依赖 tab 装饰：`channel.newMessages`（频道头，11px caption）+ 消息区底部浮标 `↓ N 条新消息`（圆角 16、layer-2 底 + border-l2 + 投影、6px 蓝点 + business-primary 文字）；点击浮标滚到底并清零；滚到底部也清零 |
| 加载更早 | 顶部骨架 1 行；到顶显示 `已到最早消息` |
| 错误（F12 / SC24，P11 底部条） | ① `加载失败：数据源不可用` + 文字链 `重试`；② `实时更新暂停（连接断开），已加载历史可读` + 文字链 `重连`；③ `无权限查看该成员会话` → 动作禁用并提示（`member.noPermission`）。不白屏、不清空已加载历史与草稿。 |
| 成员状态 | 频道头 `N 个成员运行中` + 6px 绿点；成员行 `运行中 / 已完成 / 失败` |
| 筛选态（P11 右） | 频道头右侧筛选图标 → 菜单选成员 → 顶部提示条 **`正在只看 scout（n 条）`** + 右侧文字链 **`清除`**（12px business-primary）；只显示 sender 或 `@target` 命中该成员的消息，**父成员筛选包含其 subagent 消息**；清除后恢复原滚动位置；隐藏消息仍在后台累计未读 |

---

## 9. 响应式与可访问性

- **1280**：侧栏 220，列 856，tab gap 26，消息字号 13.5/22；其余结构不变。
- **768**：隐藏侧栏；顶部栏 `‹ 群聊 · 团队名 · 8 名成员 ▾`；tab 行横向可滚（显示 4 个 + `···`）；频道头保留群头像 32 + 标题 + 团队名 + 状态行，不显示头像栈；消息列 720，气泡 `max-width 70%`，按钮命中区 ≥44×44。
- **键盘**：tab 行 `role=tablist/tab` + 左右方向键；消息流 `aria-live="polite"` 仅播报新消息摘要（不逐 token）；折叠按钮 `aria-expanded`；补全浮层 combobox 语义（`aria-expanded / aria-activedescendant`）。
- **焦点**：焦点环 2px `--dsw-alias-state-business-primary`，offset 2；模态/浮层关闭后焦点回到触发控件。
- **动效**：仅 150–250ms ease-out 的透明度/位置过渡；`prefers-reduced-motion: reduce` 时全部取消（含骨架 shimmer 与新消息浮标动画）。
- **对比度**：正文 label-primary 对 bg-base ≥ 12:1；说明文字 label-tertiary 对 bg-base ≥ 4.5:1；行内状态小字 ≥ 4.5:1。

---

## 10. 文案清单（zh-CN / en）

| Key | zh-CN | en |
| --- | --- | --- |
| view.tab | 群聊 | Group chat |
| channel.title | 群聊 | Group chat |
| channel.running | {n} 个成员运行中 | {n} members running |
| channel.readonly | 团队已结束，群聊为只读历史 | Team finished — read-only history |
| empty.team | 团队还没有发言 | No messages yet |
| empty.teamDesc | 成员每轮结束后会在这里发言。 | Members will speak here after each turn. |
| empty.noTeam | 当前为单 Agent 会话（无团队） | Single-agent session (no team) |
| empty.noTeamDesc | 仅显示该会话的用户消息与该 agent 的最终输出 | Shows only this session’s user messages and the agent’s final output |
| composer.placeholder | 回复群聊… | Reply to the group… |
| composer.toLeadHint | 未 @ 时默认发送给 Lead；键入 @ 可同时发送给多人 | Without @, sends to Lead. Type @ to send to more members |
| composer.multi | 共 {n} 位 · 同一份内容同时发送 | {n} recipients · one copy sent to all |
| composer.queued | Lead 运行中，已排队 | Lead is running — queued |
| mention.empty | 无匹配成员 | No matching member |
| mention.footer | ↑↓ 选择 · Enter/Tab 确认 · Esc 关闭 | ↑↓ select · Enter/Tab confirm · Esc close |
| msg.sentTo | ✓ 已同时发送给 {list} | ✓ Also sent to {list} |
| channel.members | 8 名成员 · 3 个运行中 | 8 members · 3 running |
| member.welcome | 欢迎 @{name} 加入群聊 | Welcome @{name} to the group |
| member.viewSession | 查看会话 | Open session |
| member.expandTask | 展开 | Expand |
| msg.openSession | 打开所属会话 | Open session |
| msg.sending | 发送中… | Sending… |
| msg.partialWithNames | 已送达 {ok}/{total} · 失败：{names} | Delivered {ok}/{total} · failed: {names} |
| msg.partialWithNamesMore | 已送达 {ok}/{total} · 失败：{names} 等 {n} 人 | Delivered {ok}/{total} · failed: {names} +{n} |
| msg.failed | 发送失败：{reason}，已保留原文 | Failed: {reason}. Text kept |
| msg.retry | 重试 | Retry |
| msg.copy | 复制原文 | Copy text |
| msg.collapse | 展开全部（约 {n} 字） | Show all (~{n} chars) |
| msg.expand | 收起 | Collapse |
| msg.toolFolded | {n} 个工具调用已折叠 · 过程见「轨迹」视图 | {n} tool calls folded · see Trajectory |
| filter.active | 正在只看 {name}（{n} 条） | Filtered to {name} ({n}) |
| filter.clear | 清除 | Clear |
| unread.jump | ↓ {n} 条新消息 | ↓ {n} new messages |
| channel.newMessages | {n} 条新消息 | {n} new messages |
| history.earliest | 已到最早消息 | Beginning of channel |
| error.load | 加载失败，重试 | Failed to load — retry |
| member.removed | {name} 已离开，未发送 | {name} left — not sent |

---

## 11. 设计令牌映射表（Figma ↔ CSS）

Figma 变量集：`DSH Theme`（Dark，单一模式）与 `DSH Theme · Light`（单一模式），变量名与 CSS 变量**完全同名**。

| CSS 变量（Figma 变量名） | Dark | Light | 用途 |
| --- | --- | --- | --- |
| `--dsw-alias-bg-base` | #151517 | #ffffff | 页面/消息流底 |
| `--dsw-alias-bg-layer-1` | #232324 | #ffffff | agent→agent 卡片、说明卡 |
| `--dsw-alias-bg-layer-2` | #2c2c2e | #ffffff | 新会话按钮、次级容器 |
| `--dsw-alias-bg-layer-3` | #353638 | #ffffff | 悬浮层 |
| `--dsw-alias-bg-skeleton` | #ffffff14 | #0000000a | 骨架占位 |
| `--dsw-alias-border-l1` | #ffffff0f | #0000000a | 分隔线、说明行底 |
| `--dsw-alias-border-l2` | #ffffff1f | #0000001a | 卡片/输入描边 |
| `--dsw-alias-border-l3` | #ffffff29 | #0000001f | 会话头 / 频道头下边线、滚动容器分隔 |
| `--dsw-alias-label-primary` | #f9fafb | #0f1115 | 正文、标题 |
| `--dsw-alias-label-secondary` | #cfd3d6 | #61666b | 团队名、次要文字 |
| `--dsw-alias-label-tertiary` | #adb2b8 | #81858c | 未激活 tab、系统提示 |
| `--dsw-alias-label-caption` | #81858c | #adb2b8 | 时间、说明行、chip 前缀 |
| `--dsw-alias-state-business-primary` | #7aaaff | #4176e6 | 激活 tab、下划线、发送键、@ 文字、焦点环 |
| `--dsw-alias-state-business-tertiary` | #34415b | #e4edfd | 频道头群头像拼贴块、消息头像底色 |
| `--dsw-alias-state-success-primary` | #22c55e | #22c55e | 运行中圆点、发送成功勾 |
| `--dsw-alias-state-success-tertiary` | #233c2c | #e6faed | 成功态底 |
| `--dsw-alias-state-error-primary` | #f25a5a | #ec1313 | 失败描边与文案 |
| `--dsw-alias-interactive-bg-hover` | #ffffff14 | #2631480f | hover、系统提示条、按钮底 |
| `--dsw-specific-bubble` | #2c2c2e | #edf3fe | 用户气泡 |
| `--dsw-specific-input-major` | #2c2c2e | #ffffff | 输入卡 |
| `--dsw-specific-menu` | #303136 | #f8f9fa | 补全浮层 |
| `--dsw-specific-sidebar-fill` | #1b1b1c | #f9fafb | 侧栏 |
| `--dsw-specific-sidebar-nav-item-active` | #43454a | #ebeef2 | 侧栏选中行 |
| `--dsw-alias-markdown-code-block` | #1b1b1c | #f9fafb | 代码块底 |
| `--dsw-alias-button-primary-fill` | #f9fafb | #0f1115 | Lead 头像字色、发送键图标 |
| `--ds-font-family-code` | SF Mono / JetBrains Mono | 同 | 代码块 |

**非颜色令牌**（实现时写死常量并集中管理）：`--dsw-radius-xs 4 / sm 8 / md 12 / lg 16 / xl 20 / panel 28`；字号 `14/24`（正文）、`13/20`（次要）、`12/18`（说明）、`11/16`（标签）；间距 `4/8/12/16/24/32`；tab 行 `13/500、underline 2px、gap 32、padding-bottom 9`；会话头 `76px`；频道头 `64px`；输入卡 `radius 28`。

---

## 12. 设计决策与理由

1. **群聊 tab 用现有 tab 的同一套规格**（13/500 + 2px 下划线 + business-primary），而不是新样式——群聊是与其它视图平级的观测视角，视觉上不应抢戏。
2. **agent→agent 的接收者用「正文内联 @」表达**（`@backend 接口清单已确认…`，`state-business-primary` 蓝色），不再单独出「→ 发送给」chip 行——与人聊天一致，扫读不被标签打断。
3. **用户消息的接收方说明行用 11px 灰字**（`已同时发送给 Lead、@ux、@backend`），无绿勾、无底色——与 agent 正文里的蓝色 @ 提及在视觉上天然分开。
4. **工具/过程不进群聊主体**，压成一行折叠条并提供「轨迹」跳转。这是群聊不退化为日志流的关键（PRD §14 反模式）。
5. **subagent 与普通消息同形**，只在名字后加 11px 灰字后缀「· ux 的子体」——既保持单条时间线的连续性，又能一眼看出从属关系，不引入缩进/连接线等额外图形。
6. **折叠遮罩用 bg 色分层而非图片**，保证在 light/dark 与任意主题下都正确，且导出无外部资源依赖。

---

## 13. 开放问题（≤6，需用户/Lead 确认）

| # | 问题 | 现状处理 | 影响 |
| --- | --- | --- | --- |
| Q1 | 「团队名」取 lead 会话标题——长标题如何截断？ | 单行省略，最多 24 字符 + `…` | 频道头宽度 |
| Q2 | 失败重试的最长等待与自动重试次数？ | 原型只做手动重试；不自动 | 发送可靠性体验 |
| Q3 | 折叠态是否显示字符数（`展开全部（约 N 字）`）还是行数？ | 采用字符数 | 文案与后端统计口径 |
| Q4 | 频道头右侧筛选图标点开是筛选菜单还是成员侧栏？ | 原型按「筛选用菜单、成员列表另议」标注（P10 未出） | 成员管理入口 |
| Q5 | 频道头「N 条新消息」何时清零——滚动到底即清零，还是需要用户点击浮标才清零？ | 原型按「滚到底或点浮标均清零」 | D9 边界 / 未读口径 |
| Q6 | @ 点击行为：跳筛选 or 打开该成员会话？ | 原型按「筛选该成员」标注，二次点击/菜单打开会话 | F11 / Q4 |

---

## 14. 交付物索引

| 产物 | 路径 |
| --- | --- |
| 本规格 | `docs/ux/group-chat-ux.md` |
| 原型说明（帧 ID / 点击路径 / 待确认点） | `docs/ux/prototype.md` |
| 原型导出图（10 张） | `docs/ux/prototype/01-tabs.png` … `10-flow.png` |
| 真实界面参考截图与裁剪 | `docs/ux/ref/`（`00-dsh-conversation-real.webp`、`01-view-tabs-zoom.png` 等） |
| Figma 文档 | team-group · Page「群聊 · Group Chat」（connectionId `7c513a16-60a2-408f-8950-9324c7911359`） |
