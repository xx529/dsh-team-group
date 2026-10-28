# 群聊视图插件 · 测试计划（实现前设计稿 v0.2）

| 项 | 内容 |
| --- | --- |
| 文档 | `tests/design/test-plan.md` |
| 版本 | v0.3 · 2026-10-28（v0.2 对齐 PRD v0.6.1/架构 v1.4；v0.3 为 task-36 复审，对齐 PRD v0.6.2/架构 v1.5/UX v3.2） |
| 作者 | tester（Agent Team teammate，task-26） |
| 状态 | **实现前设计**。测试用例已定义、**e2e 尚未执行**（按任务约束，实现后才跑；执行记录将落 `tests/runs/**`，见 task-27） |
| 上游基线 | **PRD v0.6.2**（`docs/specs/group-chat-prd.md`，F1–F20 / SC1–SC34 / §6 契约 / §7.11 / §8 N1–N9 / §17 UNVERIFIED）；**UX v3.2**（`docs/ux/group-chat-ux.md`，M1–M8，文档头已升版）；原型说明（`docs/ux/prototype.md` v3.2 + §7j）；**架构 v1.5**（`docs/architecture/group-chat-architecture.md`，§4/§5/§6/§7/§8）；`docs/research/event-model.md`、`spikes-v1.md`、`member-card-fields.md` |
| 下游 | task-27（实现后验收，依赖本文件 + task-13）；architect/frontend（DOM 契约与可测性补充见 §13） |
| 约束 | 只写 `tests/design/**`；不写生产代码、不安装插件、不改 profile；不执行 e2e |

> 本文件是**可执行计划**，不是评审文章：每条 SC 都落到具体测试层级、用例 ID 与可观测证据；每条证据尽量使用架构 v1.5 §6.5.2 已冻结的 DOM 契约（`data-testid` / `data-kind` / `data-status` / `data-card` / `data-mention` / `aria-expanded`）。

---

## 0. 评审快照、基线哈希与版本状态

### 0.1 本次评审快照与复审（task-36）

- 初评：2026-10-28 15:10–15:20；**复审：15:33–15:40**（ux 完成 8 HIGH + PI-21 修复并重导 PNG 后）。
- 复审依据：`docs/ux/prototype/` 当前 12 张 PNG（15:30–15:38 重导）、`docs/ux/prototype.md` §7j（PI-01…PI-21 处理表、新帧 ID）、UX v3.2、PRD v0.6.2（D-A~D-C 裁决）、架构 v1.5（§6.5.2 DOM 契约冻结）。
- 版本：PRD **v0.6.2** / 架构 **v1.5** / UX **v3.2** / 原型 P1–P11 + F0（P3 `25:1112`、F0 `25:1170`、P11 `25:1221`、P2 浮标节点 `26:1299`）。

### 0.2 视觉基线哈希（**task-48 复核后版本，13/13 全部锁定**）

基线锁定时间：2026-10-28 16:22（CST，任务卡修复后第四次刷新；**13/13 锁定**）。执行视觉回归前重算并写入 `tests/runs/<run-id>/baseline.sha256`；若 ux 再次重导，先更新本表。

| 文件 | SHA-256 前 16 位 | 尺寸（px，2×） | 修改时间 | 基线状态 |
| --- | --- | --- | --- | --- |
| `01-tabs.png` | `fcfcdb5961a1ec3d` | 2880×1800 | 14:40:59 | ✅ VIS-01（未读浮标示例见 P2） |
| `02-main.png` | `c960e1b1c80a2ecd` | 2880×1800 | 16:19:52 | ✅ VIS-02：无 11:08 用户块/卡内分隔；未读浮标在输入区上方；多目标演示保留 P5；主界面无压叠 |
| `03-collapse.png` | `ca090c60ff89b0bd` | 2880×1800 | 15:40:10 | ✅ VIS-03（折叠 196px < 展开 328px；折叠链接「展开全部（约 681 字）」） |
| `04-mention.png` | `9f1de6c93d7920af` | 2880×1800 | 15:47:13 | ✅ VIS-04（D-A 集合；输入卡极简）；⚠️ 新 LOW：输入行文字与提示重叠（PI-30） |
| `05-send.png` | `6952cb1e3c732015` | 2880×1800 | 15:47:13 | ✅ VIS-05（partial 列失败目标；sending 60%+左侧文案；新增 pre-send/sending 两态标注，PI-14 部分） |
| `06-subagent.png` | `acc56743f114eb4d` | 2880×1800 | 14:40:59 | ✅ VIS-06 |
| `07-states.png` | `67d6c7a979555a17` | 2880×1800 | 15:40:10 | ✅ VIS-07（无团队输入可用=D-C；错误态移至 P11 底部条） |
| `08-1280.png` | `b9214155815f16e1` | 2560×1600 | 15:47:13 | ✅ VIS-08（输入卡极简 96px，仅目标行+文本+发送） |
| `09-768.png` | `ee3801d6319cf27d` | 1536×1800 | 15:47:13 | ✅ VIS-09（频道头去重；顶部栏筛选+成员下拉；输入卡极简 88px） |
| `10-flow.png` | `80962075ab3ff1a2` | 2880×1800 | 15:32:38 | ✅ 图例/流程已 v2（PI-01/02 修复）；不作为像素基准，仅作一致性核对 |
| `11-member-join.png` | `7784698d6b943246` | 2880×1800 | 15:40:10 | ✅ VIS-10（模型继承文案；变体 B 面板下新增空值回退标注小样） |
| `12-readonly-filter.png` | `1b6ec1c15ca03c59` | 2880×1800 | 15:40:10 | ✅ VIS-11（左只读）/ VIS-12（右筛选）/ 底部新增错误态条（加载失败/断线/无权限） |
| `13-task-cards.png` | `ea776e4af25be064` | 2880×3040（=1440×1520 @2×） | 16:16:36 | ✅ VIS-15：任务卡 9 变体（A–I），无「返工/失败」字样；Lead/scout/backend 不同人操作；依赖空值隐藏 |

> P11 文件名为 `12-readonly-filter.png`（帧 ID `25:1221`）；P12 为 `13-task-cards.png`（帧 ID `29:1322`，任务卡 A–I 共 9 变体）。**当前 13 张基线全部锁定**（task-48，16:22）；`02-main` / `13-task-cards` 为 16:16–16:19 修复版。VIS-13（未读）以 `02-main.png` 为基准。相对 15:47 刷新未变动：`01 fcfcdb5961a1ec3d`、`03 ca090c60ff89b0bd`、`06 acc56743f114eb4d`、`07 67d6c7a979555a17`、`10 80962075ab3ff1a2`、`11 7784698d6b943246`、`12 1b6ec1c15ca03c59`；`04/05/08/09` 为 15:47 版（本轮未重导）。

### 0.3 基线版本状态（v0.6.2 / v1.5 / v3.2 全部对齐）

| 维度 | 状态 | 说明 |
| --- | --- | --- |
| M8 入群消息 | ✅ | PRD v0.6.2 + 架构 v1.5 + P2/P10 一致：欢迎提示 + creator 带卡消息；模型继承文案 D-D（spawn_teammate→继承 Lead；subagent→继承 creator，如「（继承 ux）」）已落到 P2/P10 |
| 8 个 HIGH（PI-01…08） | ✅ 全部修复 | 证据见 `prototype-review.md` §0.2；F0 v2、P11 只读/筛选、P3 重建、P2 浮标、P7 文案、模型行 |
| PI-21 文档追溯 | ✅ 修复 | UX v3.2（文档头已升版）；`prototype.md` §1 更新为 P1–P11 / 01…12 / P3/F0/P11 新帧 ID |
| 口径裁决（原 R2/R3/R4） | ✅ 关闭 | PRD v0.6.2：D-A @ 可寻址（teammate 恒可寻址/含 inactive；subagent 仅 running/provisioning；one-shot 完成不可）；D-B 筛选（sender∨targets + 子体归父 + 单选）；D-C 无团队允许发送 |
| DOM 契约 | ✅ 冻结 | 架构 v1.5 §6.5.2 全量采纳 `test-plan.md` §13 的 `data-testid`/`data-*`/`role`，实现不得改名 |
| MEDIUM 打磨（task-38） | ✅ 8 项修复 / 1 项部分 | PI-05/09/11/12/13/15/16/17/18 已修；PI-14 仅补过渡态说明，发送前 chips/「共 N 位」画面仍缺（保留 MEDIUM） |
| 输入器极简（task-40） | ✅ PI-19 关闭 | P2/P4/P5/P8/P9 输入卡删除附件/权限/自动继续/模型，仅保留目标行+文本+发送（桌面 96px、768 88px）；P5 补 pre-send/sending 两态标注；新发现 PI-30（P4 文字重叠，LOW） |
| 任务卡打磨（task-47/48） | ✅ HIGH 2 清零 | P2 删除 11:08 用户块（多目标保留 P5）、时间分隔不再卡内、浮标固定输入区上方；P12 无返工/失败字样、Lead/scout/backend 不同人、补 G/H/I（编辑/依赖变更/放回）；**13/13 基线锁定** |
| 数据/发送契约 | ✅ 不变 | §5 前缀/四态/重试/对账不变 |

**结论**：**HIGH 0；13 张基线全部锁定**（哈希见 §0.2，16:22 刷新）。task-46 的 2 HIGH（PI-31/PI-32）与 5 MEDIUM（PI-33…37）中 4 项关闭（PI-37 降 LOW），4 LOW（PI-38…41）关闭；新增 PI-42（LOW）。当前剩余 **MEDIUM 3（PI-10/PI-14/PI-20）+ LOW 11（PI-22…28、PI-30、PI-37、PI-42）**，均不阻塞 task-27。

---

## 1. 目标、范围与出口判据

### 1.1 目标

1. 把 PRD v0.6.2 的 **SC1–SC34（34 条）** 全部转为可独立验证的用例与证据；
2. 明确测试分层与工具（内核单测 / 契约 / 组件 / e2e / 视觉 / 性能 / a11y / i18n）；
3. 给出实现后可立即执行的真机 e2e 方案（本机 GUI 需 Desktop 鉴权 token，首选 open-computer-use）；
4. 给出控件点击走查清单（`tests/design/click-walk.md`）与原型可测试性问题清单（`tests/design/prototype-review.md`）。

### 1.2 范围

- 覆盖：F1–F20、M1–M8、N1–N9、SC1–SC34，含发送四态、@ 补全、折叠、筛选、只读、未读、成员卡、subagent 从属、会话切换、窄屏、主题/i18n。
- 不覆盖（v1 非目标，PRD §1.4）：跨团队聚合、语音/视频/reaction/编辑撤回/thread、后端事件总线改造、Team peer mailbox 投递、v2 HTTP 读接口（架构 §4.7 不实现）、CI 化真机 e2e。

### 1.3 出口判据（task-27 验收用）

| # | 判据 |
| --- | --- |
| G1 | SC1–SC34 每条至少 1 个主证据 PASS（SC32–SC34 按 PRD v0.6.2/架构 v1.5） |
| G2 | 内核单测 + 契约测试 100% 绿（分支覆盖：纯函数 ≥90%，去重/排序/协议/上限 100%） |
| G3 | 组件测试覆盖 M1–M8 渲染与四态；无 jsdom 时降级为 reducer 断言并声明缺口 |
| G4 | e2e：优先 open-computer-use 跑核心集（E2E-01/02/07/08/11/19/21/23/26/28/29），其余用组件测试 + 人工点击走查补证，QA 报告必须写明覆盖缺口（架构 §8.3.1 口径） |
| G5 | 视觉：可执行基线（P1/P2/P3/P4/P5/P6/P7/P8/P9/P10）无 HIGH 差异；不可执行基线（只读/筛选/未读）标 BLOCKED 并写明原因 |
| G6 | 性能：7 项阈值（§8）全达标，或明确记录机器差异与复测条件 |
| G7 | 控件点击走查 45 条全部执行并留证（截图 + DOM/AX 断言），无未执行项（BLOCKED 需写原因） |
| G8 | 任何 HIGH/CRITICAL 缺陷即 FAIL；不接受「有条件通过」（task-27 口径） |

---

## 2. 测试分层与工具

| 层 | 目标 | 工具/方式 | 环境 | 可执行性 |
| --- | --- | --- | --- | --- |
| L1 内核单测 | 归一化/去重/排序/分页/协议/筛选/目标解析/成员卡 payload | `node --test`（零依赖），fixture 驱动 | Node（本机） | ✅ 可 CI |
| L2 契约测试 | `ChannelSource` 五方法幂等与游标；两实现一致性 | 同一套测试跑 `MockSource` + `ClientSessionSource(replay)` | Node | ✅ 可 CI |
| L3 组件测试 | M1–M8 渲染、四态、折叠、补全键盘、筛选投影、成员卡 | 轻量 render + DOM 断言（jsdom 或 browser runtime；不可用则纯 reducer 断言，架构 §8.1 L3） | Node/browser | ✅ 可 CI（缺口需声明） |
| L4 e2e | 真实 GUI 走查 | **首选 open-computer-use MCP 操作 DSH Desktop 真实窗口**（`com.deepseek.dsh`）；Playwright 仅用于公开静态页 | DSH Desktop（profile=desktop） | ⚠️ 手动/半自动，不可 CI |
| L5 视觉回归 | 实现截图 vs 原型 PNG | 真机截图 + 区域对齐 + 像素 diff + computed style 结构化断言 | DSH Desktop | ⚠️ 依赖桌面 |
| L6 性能 | 首屏/增量/滚动/内存 | 内核脚本计时 + `performance.mark` + 真机 trace（有 token 时） | Node + Desktop | ⚠️ 部分可 CI |
| L7 手工点击 | 控件逐条真实点击 | `tests/design/click-walk.md` + 截图留证 | DSH Desktop | ⚠️ 手动 |

**为什么 e2e 首选 open-computer-use**（环境事实 + 取证）：
- 本机 Web GUI 是 `dsh web`，直接访问返回 401，需要 DSH Desktop 打印的鉴权 URL（`docs/ux/prototype.md` §8 实测 `:62300`；spikes S6）。因此 Playwright 无法在无 token 时驱动真实 GUI。
- open-computer-use 可操作桌面应用 `DeepSeek Harness — com.deepseek.dsh`（spikes S6 实测运行中），工具：`list_apps` / `get_app_state` / `query` / `click` / `set_value` / `type_text` / `press_key` / `scroll` / `window_placement`。
- Playwright 仍保留两个用途：① 公开静态页（本地 `python3 -m http.server` 的测试 harness / 报告页）检查；② 一旦 Lead 提供已鉴权 URL，按架构 §8.3.1 方式 A 全量自动化并做视觉回归。

---

## 3. 测试数据与 fixtures

### 3.1 fixtures（架构 v1.5 §8.2 共 16 组）

任务书要求「12 组 + member card fixture」；架构（v1.3 起）已把清单扩展为 **16 组**（新增 13–16）。本计划以 16 组为准（前 12 组与任务书一一对应，13–16 为 S1 信封 / canonical 前缀 / partial / 成员卡）：

| # | fixture | 核心断言 | 用例 |
| --- | --- | --- | --- |
| 01 | `user-rpc.jsonl` 真用户消息 + 双写 spliced | 只出 1 条 user；spliced 元数据并入 | UT-01/10 |
| 02 | `peer-agent-message.jsonl` 当前构建 peer + 前缀 | 出 agent_to_agent；前缀剥离；sender 名正确 | UT-02 |
| 03 | `peer-legacy-team-message.jsonl` 旧构建 `team-message` | 走结构化 senderName/messageId，不依赖正则 | UT-03 |
| 04 | `assistant-turns.jsonl` 多 turn + completed/error/aborted/forked | 每 turn 1 条 agent_output；forked 丢弃；中断追加 system | UT-04/05/07 |
| 05 | `subagent-settled.jsonl` 子会话输出 + 父会话副本 | 只保留子会话那条 | UT-06 |
| 06 | `seeded-fork.jsonl` `isSeeded:true` | cutoff 丢弃继承前缀；无重复历史 | UT-11/16 |
| 07 | `fanout-3targets.jsonl` 3 目标副本 | 1 条 user 气泡；3 条 deliveries；顺序正确 | UT-12/13 |
| 08 | `interleaved-timeline.jsonl` lead/teammate/subagent 交错同毫秒 | 排序稳定，两次一致 | UT-14/32 |
| 09 | `same-second.jsonl` 同毫秒 20 条 | 不抖动、不丢 | UT-15/17 |
| 10 | `long-text.jsonl` 1KB/400 字/8 行边界 | 折叠判定与 SC6 一致 | UT-45/46 |
| 11 | `missing-roster.jsonl` 无 `agentTeam` 投影 | 降级 no-roster，成员仍可见 | UT-48 |
| 12 | `tool-heavy.jsonl` 一步 30 次工具调用 | 只出 1 条 toolFold，不进正文 | UT-47 |
| 13 | `entry-envelope.jsonl` event/transient 混合（S1） | 只消费 event；transient（小数 seq）丢弃；不做整数 seq 断言 | UT-09 |
| 14 | `fanout-prefix-canonical.jsonl` canonical 两行前缀 | 逐字节解析/剥离；说明行与 deliveries 正确；rawText 保留 | UT-21/22/23/25 |
| 15 | `partial-failure.jsonl` 3 目标中 1 个失败 | 聚合 partial；「已送达 2/3」；重试只补失败 | UT-26/27 |
| 16 | `member-card.jsonl` teammate(provisioning→active + tool/call+result) + subagent(catalog+descriptor+fork 副本) | 每成员 1 张卡；teammate model 取 result 快照；subagent 取 descriptor.agentModel；provider 内部名不出现；fork 副本去重 | UT-36–43 |

### 3.2 真机测试数据

- **前置团队会话**：1 个 lead + ≥2 teammate + ≥1 活跃 subagent（SC7/SC16/SC31/SC32–34 需要）；由 Lead 在**测试 workspace** 构造，禁止使用生产会话（架构 §8.3.1）。
- **无团队会话**：普通单 agent 会话（SC15）。
- **只读/归档会话**：团队结束或归档（SC20）；触发信号仍 UNVERIFIED（PRD §17 U11、架构 §6.4.4）。
- **失败注入**：父 Agent 离线（`parentAvailable=false`）、断网/超时、目标成员离开（SC11/SC30/SC24）。
- **长文本数据**：>8 行、恰好 400 字符、8 行 380 字符（SC5/SC6）。

---

## 4. 验收追溯表（SC1–SC34）

> 层级缩写：U=单元、C=契约、CP=组件、E=e2e、V=视觉、P=性能、A=a11y、I=i18n、M=手工点击（click-walk）。
> SC32–SC34 按 **PRD v0.6.2 + 架构 v1.5** 执行（不再有 rebaseline 标记，见 §0.3）。

| SC | 验收要点 | 层级 | 用例 ID | 期望的可观测证据 |
| --- | --- | --- | --- | --- |
| SC1 | tab 以 `group-chat`/order=5 注册，位于对话后轨迹前，默认视图不变，非 More 菜单 | CP+E | CM-01、E2E-01 | tab `role=tab` accessible name=「群聊」；同 tablist；DOM 顺序 chat < group-chat < trajectory；默认 `aria-selected` 仍为对话；截图 |
| SC2 | 点击进入聊天室：频道头+消息流+输入区；升序；不整页刷新 | CP+E+V | CM-02、CM-29、E2E-02、E2E-33、VIS-01/02 | `data-testid=group-chat-feed` 可见；相邻消息 `time` 非降；`performance.getEntriesByType('navigation').length` 不变；频道头 56px；截图 |
| SC3 | M1/M2/M3 三类同时存在且按真实时间排列 | U+CP+E | UT-01/04/47、CM-03/30、E2E-03 | 三条 `data-kind` = `user`/`agent_to_agent`/`agent_output` 各 ≥1；`data-message-id` 唯一；相邻 time 单调；截图 |
| SC4 | A→B 以正文首行内联 `@B` 展示，前缀不渲染，无 chip 行 | U+CP+E | UT-02/03/23、CM-04、E2E-04 | 名字行含 sender 且无角色徽标元素；正文首行 `[data-mention="backend"]` 文本 `@backend`；不存在 target-chip-row；气泡文本不含 `/^Team message/`；截图 |
| SC5 | 超阈值默认折叠，展开/收起，aria 正确，顶部 Y 偏移 ≤4px | U+CP+E+V | UT-46、CM-05、E2E-05、VIS-03 | 折叠态高度 < 展开态；链接文案在「展开全部（约 N 字）」/「收起」间切换；`aria-expanded` false→true；链接 12px 文本样式（无按钮底/胶囊）；展开前后该消息顶部 Y 偏移 ≤4px；截图 |
| SC6 | 8 行 / 400 字边界；系统提示与说明行永不折叠 | U+CP+E | UT-46、CM-06、E2E-05、VIS-03 | 8 行 380 字无折叠链接；400 字有；`data-kind=system` 与 `group-chat-bubble-caption` 无折叠链接；截图 |
| SC7 | @ 触发补全、过滤、↑↓/Enter/Tab/Esc、chip 整体删除、无匹配 | CP+E+A | CM-07、E2E-06、A11Y-03 | `role=listbox` 选项集合 = lead+teammates+活跃 subagent；过滤后集合变化；高亮 `aria-activedescendant`；chip `data-mention=scout`；退格整体移除；无匹配文案；Esc 后焦点回输入框；截图 |
| SC8 | 无 @ 默认发 lead，触发新一轮；无同发说明行 | U+CP+E | UT-24、CM-08、E2E-07/24 | lead 会话新增 `user/message` 且 content 不含 `[群聊 · 同发]`；lead 出现新 turn 事件；气泡数 +1；caption「发送给 Lead」；截图/事件记录 |
| SC9 | @ 多目标：lead+被 @ 同时收到同文；说明行；N 目标各 1 条带 canonical 前缀 | U+CP+E | UT-21/24/29、CM-09、E2E-08/23 | 同一 `clientBatchId` 下 N 个独立 requestId 各成功 1 次；说明行「已同时发送给 Lead、@x、@y」；每目标 `content[0]` 逐字节匹配首行、`content[1]` 匹配第二行（N 实数）；群聊气泡 +1；截图/事件 |
| SC10 | 同内容多目标只渲染 1 条气泡，状态已发送 | U+CP+E | UT-12/13/28、CM-09、E2E-08 | DOM 中该批次 `data-message-id`/批次 key 命中 1；deliveries=3；`data-status=sent`；截图 |
| SC11 | 失败态可读原因 + 重试/复制；重试不产生重复气泡 | U+CP+E | UT-26/27/31、CM-10、E2E-09 | `data-status` failed→sent；错误文案可见；重试后节点数仍 1；截图 |
| SC12 | 上滚分页 50 条、无抖动、到最早提示 | U+C+CP+E | UT-17/18/19、CT-03、CM-11、E2E-10 | 滚到顶触发 1 次 pageOlder；插入后视口首条 `data-message-id` 不变；顶部骨架/「已到最早消息」可见；截图 |
| SC13 | 实时新增 ≤2s；贴底自动滚，上滚显示浮标；点击清零 | U+C+CP+E | UT-09、CT-04、CM-12/20、E2E-11/31 | 新节点出现时间差 ≤2s；未贴底时浮标文本含条数且 `scrollTop` 未突变；点击后到底且浮标消失；`aria-live` 摘要更新 |
| SC14 | 只看某成员 + 顶部提示条 + 清除恢复 | U+CP+E | UT-32/33、CM-13、E2E-12/31 | 筛选后发送者/目标集合 ⊆ 架构 §6.4.4 定义；提示条「正在只看 scout（n 条）」；清除后消息数恢复且 scrollTop ±4px |
| SC15 | 无团队：tab 仍在；空态；无成员区/筛选；输入可用 | U+CP+E+V | UT-48、CM-14、E2E-13、VIS-07 | 提示文案（**文案待裁决**，见 PI-04）；发送者集合 ⊆ {我, agent}；频道头无成员头像栈/状态行/筛选图标；textarea 可聚焦；截图 |
| SC16 | subagent 启动/运行/完成；后缀「· 父名 的子体」；无缩进/连接线；工具过程不进正文 | U+CP+E+V | UT-04/05/06/07/20、CM-15、E2E-14、VIS-06 | 系统提示含 label；`data-member-kind=subagent` + `data-parent=<父名>`；名字后缀正确；无缩进/连接线样式；同文本 DOM 命中 1；无 tool-call 内容；截图 |
| SC17 | 成员增删：提示 + 补全集合变化 + 历史保留 + 状态行更新 | U+CP+E | UT-13、CM-16、E2E-15 | 补全选项集合前后差集 = 预期；历史节点仍含 scout；频道头「N 名成员 · M 个运行中」变化；截图 |
| SC18 | 会话切换恢复滚动/草稿；旧会话数据不串 | U+CP+E | UT-14、CM-17、E2E-16/34 | scrollTop ±4px；输入 value 保持；新会话 feed 无旧 `data-message-id`；截图 |
| SC19 | 复制为剥前缀纯文本 + 成功反馈；打开所属会话定位 | CP+E | CM-18/25、E2E-17 | 剪贴板 = 消息 text（不含协议前缀）；toast 出现；openView/openSession 调用后视图指向目标会话；截图 |
| SC20 | 只读：输入禁用 + 提示；历史/筛选/复制/折叠仍可用；无写操作 | U+CP+E+V | UT-34、CM-19、E2E-18、VIS-11（BLOCKED） | textarea `disabled=true`；发送键 disabled；只读提示可见；筛选/折叠可点击；重试隐藏；截图 |
| SC21 | 未贴底浮标 + 频道头 N 条新消息，联动清零；无 tab 圆点 | U+CP+E+V | UT-35、CM-20、E2E-11/31、VIS-13（BLOCKED） | 浮标「↓ N 条新消息」；频道头「N 条新消息」；tab 无 badge/圆点；点击/到底后两者清零；截图 |
| SC22 | 键盘切 tab、折叠、aria-live 摘要、焦点可见 | CP+E+A | CM-21、E2E-19、A11Y-01/02/04 | 方向键切换后 `aria-selected`；焦点环可见；Enter 展开后 `aria-expanded=true`；live region 文本含「sender: 前 80 字」；全程无鼠标 |
| SC23 | 连点只产生一条消息；发送中禁用 | U+CP+E | UT-29、CM-22、E2E-09/34 | 消息节点 +1；发送键 loading+disabled；prompt 调用 1 次；截图 |
| SC24 | 数据源失败：错误卡+重试；不白屏；草稿保留 | C+CP+E | CT-06、CM-23、E2E-20 | 错误节点含重试按钮；重试后 feed 渲染；草稿 value 仍在；截图 |
| SC25 | 375/768 窄屏不横向溢出；成员入口可展开；命中区 ≥44 | CP+E+V | CM-24、E2E-21、VIS-09 | `document.scrollWidth ≤ 视口`；成员入口可展开；命中区 ≥44×44；截图 |
| SC26 | en 界面无中文残留；dark 主题 token 生效、对比度可读 | CP+E+I+V | I18N-01/02/03/04、E2E-22、VIS-12 | UI 文案无中文（消息正文/协议除外）；token 生效（computed style 为 `var(--dsw-*)` 解析值）；light/dark 截图 |
| SC27 | 多目标每目标注入 canonical 两行，群聊剥除；手写 @ 不受影响 | U+CP+E | UT-21/22/23、CM-25、E2E-23 | 目标会话 `content[0]/[1]` 与 canonical 精确逐字节匹配；群聊气泡不含 `[群聊 · 同发]`；rawText 保留；手写 @ 原样；截图 |
| SC28 | 单目标不注入前缀；显示「发送给 Lead」 | U+E | UT-25、E2E-24 | lead `content[0].text` = 用户正文本身；无「已同时发送给」caption；截图 |
| SC29 | lead 运行中 steer 排队不打断 | U+E | UT-30、E2E-25 | 发送调用 `mode='steer'`；当前 turn 无 aborted；消息在下一 step 边界被消费；状态文案 sending→sent |
| SC30 | 部分失败：显示「已送达 X/Y」+ 失败目标；重试仅失败项 | U+CP+E | UT-26/27/31、CM-10、E2E-26 | `data-status=partial` + 文案含 `已送达 2/3` + 失败目标名；重试后成功目标会话仍 1 条、失败目标 +1；气泡仍 1 条并转 sent |
| SC31 | 活跃 subagent 可 @；补全与消息行后缀「· 父名 的子体」；无 @all | U+CP+E | UT-20/24、CM-26、E2E-27 | 补全项含 label 与父名后缀；无 @all；子会话收到 user/message；消息行含后缀且无缩进/连接线 |
| SC32 | spawn_teammate → 欢迎提示 + creator 带卡消息；字段/动作正确；一组仅 1 次 | U+CP+E+V | UT-36/38/39/41/42/43、CM-27、E2E-28/32、VIS-10 | 欢迎提示 `data-kind=system`+`data-system-variant=welcome`，文本「欢迎 @scout 加入群聊」右对齐；creator 消息 `data-kind=member_card`+`data-sender=lead`，角色标签「主 Agent」+时间；`data-card=member-join`+`data-member-id`（`data-creation-id`/`data-pair-order`）命中 1 组；卡内字段文本匹配；动作文字链；刷新后「1 欢迎 + 1 卡」；截图 |
| SC33 | subagent 入群：creator=调用方、父成员、上下文策略；无查看任务；fork 去重 | U+CP+E+V | UT-37/38/42、CM-27、E2E-29/32、VIS-10 | 欢迎提示「欢迎 @产品设计 加入群聊」；`data-kind=member_card` 消息 `data-sender=ux` + 角色标签「Teammate」；卡内父成员 ux、上下文「继承父会话（subagent_fork）」、创建方式 subagent_fork；无「查看任务」；同 `data-creation-id` 只 1 组（1 欢迎 + 1 卡） |
| SC34 | 字段缺失回退且不阻塞：暂无角色描述/无模型行/无初始任务；卡仍可用；组数 1 | U+CP+E+V | UT-40/41、CM-28、E2E-30、VIS-10 | 卡内文本含「暂无角色描述」；不存在模型 value 节点、不存在初始任务区块；欢迎提示 + 带卡消息各 1；卡后仍有后续消息节点；`data-member-id` 唯一；截图 |

**追溯自检**：34 条 SC 全部有 ≥1 主证据；F1–F20 全部落到用例（F20→SC32–34，按 PRD v0.6.2/架构 v1.5）；DOM 契约现状见 §13。

---

## 5. 用例清单

### 5.1 统计（计划总数 150；手工点击另计 45）

| 层 | 数量 | ID 区间 |
| --- | --- | --- |
| 单元（UT） | 48 | UT-01…UT-48 |
| 契约（CT） | 6 | CT-01…CT-06 |
| 组件（CM） | 30 | CM-01…CM-30 |
| e2e（E2E） | 34 | E2E-01…E2E-34 |
| 视觉（VIS） | 15 | VIS-01…VIS-15 |
| 性能（PERF） | 7 | PERF-01…PERF-07 |
| 可访问性（A11Y） | 6 | A11Y-01…A11Y-06 |
| i18n/主题（I18N） | 4 | I18N-01…I18N-04 |
| **合计** | **150** | — |
| 手工点击走查（CW） | 45 | CW-01…CW-45（见 `click-walk.md`） |

### 5.2 单元测试（48）

| ID | 用例 | SC | fixture |
| --- | --- | --- | --- |
| UT-01 | `user/message` 有 rpcId → user；无 rpcId 子会话首条 → system/忽略 | SC3 | 01 |
| UT-02 | 当前构建 agent-message → agent_to_agent；sender 名解析；`Team message from X:` 剥除 | SC4 | 02 |
| UT-03 | 旧构建 team-message 结构化字段优先于文本正则 | SC4 | 03 |
| UT-04 | 每 turn 最后一条非空 text 块 → agent_output；reasoning/tool-call 忽略 | SC3 | 04 |
| UT-05 | `turn/end(forked)`、`session/end-seed` 丢弃 | SC4/16 | 06 |
| UT-06 | subagent-settled 与子会话输出同文只留 1 条 | SC16 | 05 |
| UT-07 | 非 completed 轮次追加失败/中断 system 提示 | SC16 | 04 |
| UT-08 | 未知 `source.kind` 不崩、原样展示、标 unknown | SC3 | 自造 |
| UT-09 | 只消费 `entry.type==='event'`；transient 丢弃；**禁止整数 seq 断言** | SC13 | 13 |
| UT-10 | 双写 spliced/user 同 id 只 1 条；spliced 目标/投递时间并入 meta | SC3/10 | 01 |
| UT-11 | `session/end-seed` seq 作 cutoff，继承前缀丢弃 | SC16 | 06 |
| UT-12 | 通知副本弱键 `(sender, target, sha256(text), time±5s)` 配对保留接收侧 | SC10 | 01/07 |
| UT-13 | 弱键不误合并「同一发送者两次真实发言」 | SC10 | 07 |
| UT-14 | `(time, sessionRank, seq)` 排序；同毫秒稳定；两次结果一致 | SC2 | 08 |
| UT-15 | 同毫秒 20 条不抖动、不丢 | SC2 | 09 |
| UT-16 | 排序禁用 createdAt（fork 会话 createdAt 晚于内含事件 time） | SC2 | 06 |
| UT-17 | 首屏 200、每页 50、oldestKey/newestKey 游标推进 | SC12 | 08/09 |
| UT-18 | 内存 2000 上限：从中间裁剪，保留首 200 + 最近 1800 | SC12 | 合成 |
| UT-19 | 每会话预取 400，防单成员挤出他人 | SC12 | 合成 |
| UT-20 | 深度 ≤3、会话 ≤32 截断 + truncated 信息 + teammate 不截断 | SC16 | 合成 |
| UT-21 | canonical 首行/第二行逐字节快照（全角「：」「、」，@lead 首位，N 实数） | SC9/27 | 14 |
| UT-22 | 解析剥除：content[0]/[1] 命中 → text=content[2..]；rawText 全量 | SC27 | 14 |
| UT-23 | 无前缀/旧前缀原样展示；正文手写 @ 不升级不误剥 | SC4/27 | 14/02 |
| UT-24 | 目标解析：无 @ → [lead]；@ 去重；@all 不支持；不可寻址剔除 | SC8/31 | 合成 |
| UT-25 | 前缀仅 targets>1 注入；N=1 不注入 | SC28 | 14 |
| UT-26 | 四态聚合：全 sent / partial / failed；sending 仅在途 | SC11/30 | 15 |
| UT-27 | 重试仅失败目标、复用 requestId、成功目标不重发 | SC30 | 15 |
| UT-28 | rpcId 精确对账认领 echo，不新增气泡 | SC10/11 | S2 快照 |
| UT-29 | 并发单飞：同 clientBatchId 只 1 次 fan-out | SC23 | 合成 |
| UT-30 | 发送顺序 lead 先 → 成员后（规避 parent-unavailable） | SC29 | 合成 |
| UT-31 | 失败码 → 文案映射（network/timeout/parent-offline/readonly/forbidden/payload-too-large） | SC11 | 合成 |
| UT-32 | 筛选语义：sender/targets/结构化 @ 命中；父成员含其 subagent | SC14 | 08 |
| UT-33 | 筛选不改 messages、不影响未读累计；清除恢复 | SC14 | 合成 |
| UT-34 | 只读判定（无权限/归档/idle≥90s 且全 inactive），不确定时偏可写 | SC20 | 合成 |
| UT-35 | 未读计数与清零（滚到底/点浮标/切回视图汇总） | SC21 | 合成 |
| UT-36 | 成员卡 payload：teammate 取 `tool/result.member.model` 快照 + context；creator=lead | SC32 | 16 |
| UT-37 | subagent payload：descriptor.agentModel/mode + catalog.childId；creator=调用方 | SC33 | 16 |
| UT-38 | 去重键：欢迎 `mc:<memberSessionId>:welcome` + 卡片 `mc:<memberSessionId>`；同一创建出「1 欢迎 + 1 卡」；fork/seeded 副本不重复 | SC32/33 | 16/06 |
| UT-39 | 触发时机：teammate 等 `phase=active`；provisioning/创建失败不出卡 | SC32 | 16 |
| UT-40 | 空值回退：无描述→「暂无角色描述」；无 model→隐藏行；无 prompt→隐藏区块；名字缺失→短 id | SC34 | 16 |
| UT-41 | 模型回退链 descriptor → result.member.model → list_agents.model → 隐藏；provider 内部名不直出 | SC32/34 | 16 |
| UT-42 | 上下文策略映射（fresh/fork/subagent/subagent_fork + one-shot 后缀） | SC33 | 16 |
| UT-43 | 初始任务摘要（首空行、≤160 字/2 行）+ 展开全文 | SC32 | 16 |
| UT-44 | 消息 id 构造表（u:/m:/a:/s:/d:/mc:/local:）幂等 | SC10 | 全 |
| UT-45 | textRender 64KB 截断；超长单行不撑破 | SC5 | 10 |
| UT-46 | 折叠阈值 8 行/400 字先到者；系统提示/说明行永不折叠 | SC5/06 | 10 |
| UT-47 | M6 工具计数只计数；M5 文件数据（name/path） | SC3/19 | 04/12 |
| UT-48 | 确定性：同输入两次 normalize 完全一致；空输入/空团队不抛错 | SC2/15 | 08/11 |

### 5.3 契约测试（6）

| ID | 用例 | SC |
| --- | --- | --- |
| CT-01 | `open` 幂等：重复 open 不重复消息，快照一致 | SC2 |
| CT-02 | `sync` 幂等：游标单调；浮点 seq 正确；revision 变化触发该会话重算 | SC13 |
| CT-03 | `pageOlder` 幂等；hasMore 收敛；到顶不重复 | SC12 |
| CT-04 | `subscribe` 回调 append/reset/status；`close` 后不再回调；dispose 生效 | SC13 |
| CT-05 | `MockSource` 与 `ClientSessionSource(replay)` 同 fixture 输出一致（契约漂移报警） | SC3/13 |
| CT-06 | `capabilities/close`：canSend/reason；关闭后可重开且状态可恢复 | SC24 |

### 5.4 组件测试（30）

| ID | 用例 | SC |
| --- | --- | --- |
| CM-01 | slot 注册：id/order=5/label「群聊」纯文本（无 badge/icon） | SC1 |
| CM-02 | 布局壳：频道头 56 / feed 容器 / 输入区；`data-testid=group-chat-feed` | SC2 |
| CM-03 | M1–M8 → 组件映射与 `data-kind` 属性 | SC3 |
| CM-04 | M2 正文首行 `data-mention`；无 target-chip-row；正文无 `Team message` | SC4 |
| CM-05 | 折叠/展开：文案切换、`aria-expanded`、Y 偏移 ≤4px、链接 12px 文本 | SC5 |
| CM-06 | 折叠边界：8 行 380 字不折、400 字折、系统/说明行不折 | SC6 |
| CM-07 | @ 补全：listbox/过滤/↑↓/Enter/Tab/Esc/IME/无匹配/chip 整体删除 | SC7 |
| CM-08 | 目标行：Lead chip + 未 @ 提示 / 多 chips +「共 N 位 · 同一份内容同时发送」 | SC8/09 |
| CM-09 | 多目标只 1 气泡 + caption「已同时发送给…」；DOM 命中 1 | SC9/10 |
| CM-10 | 四态 UI：sending(55%+spinner+右侧 caption)/sent/partial(已送达 X/Y+失败清单)/failed(红边+重试/复制) | SC11/30 |
| CM-11 | 分页：顶部骨架、锚点不跳、到顶「已到最早消息」 | SC12 |
| CM-12 | 实时 append：新消息渲染、贴底自动滚、上滚不强制、aria-live 摘要 | SC13 |
| CM-13 | 筛选：菜单、顶部提示条「正在只看 X（n 条）」、清除恢复 | SC14 |
| CM-14 | 无团队：空态文案、无成员区/筛选、输入可用 | SC15 |
| CM-15 | subagent 行：后缀「· 父名 的子体」、无缩进/连接线、`data-member-kind/data-parent` | SC16/31 |
| CM-16 | 成员增删：系统提示、补全集合变化、历史保留、状态行更新 | SC17 |
| CM-17 | 会话切换：滚动/筛选/草稿恢复；旧数据不串 | SC18 |
| CM-18 | 复制/打开会话：剪贴板、toast、openView/openSession 调用 | SC19 |
| CM-19 | 只读：textarea/发送键 disabled、横幅、筛选/折叠可用、重试隐藏 | SC20 |
| CM-20 | 未读：浮标 + 频道头提示，点击/到底清零；tab 无装饰 | SC21 |
| CM-21 | a11y：role=log/aria-live、article label、combobox 语义、焦点归还、focus ring | SC22 |
| CM-22 | 单飞：in-flight 发送键 loading+disabled；重复提交忽略 | SC23 |
| CM-23 | 错误态：错误卡+重试+草稿保留+不白屏 | SC24 |
| CM-24 | 响应式：1280/768 容器断点、无水平溢出、命中区 ≥44 | SC25 |
| CM-25 | 协议剥除渲染：气泡无前缀、rawText 保留、复制保真 | SC27 |
| CM-26 | subagent 补全/chip 显示（label + 父名后缀）；无 @all | SC31 |
| CM-27 | 入群消息：`data-kind=system`+`data-system-variant=welcome` 欢迎提示；`data-kind=member_card`+`data-sender` creator SenderLine；卡 `data-card=member-join`+`data-member-id`+`data-creation-id`/`data-pair-order`；字段/动作 | SC32/33 |
| CM-28 | 成员卡空值回退：暂无角色描述、无模型行、无初始任务、卡仍可用 | SC34 |
| CM-29 | 时间分隔：日期变化或 ≥5 分钟插入；居中 12/400 | SC2 |
| CM-30 | M5 文件行 + M6 工具摘要行（无背景条、单行、不展示工具内容） | SC3/19 |

### 5.5 e2e（34；E2E-01…30 对齐架构 §8.3.2 E1–E30）

| ID | 用例 | SC | 执行方式 |
| --- | --- | --- | --- |
| E2E-01 | tab 入口与默认视图 | SC1 | CU（computer-use） |
| E2E-02 | 进入群聊、升序、无刷新 | SC2 | CU |
| E2E-03 | 三类消息并存 | SC3 | CU/人工 |
| E2E-04 | @ 内联展示 | SC4 | CU/人工 |
| E2E-05 | 折叠/展开与边界 | SC5/06 | CU |
| E2E-06 | @ 补全键盘 | SC7 | CU |
| E2E-07 | 默认 Lead 发送 | SC8 | CU |
| E2E-08 | 多目标同发 1 气泡 | SC9/10 | CU |
| E2E-09 | 失败重试/连点防重 | SC11/23 | CU/人工 |
| E2E-10 | 分页 | SC12 | CU |
| E2E-11 | 实时追加 + 浮标 | SC13/21 | CU |
| E2E-12 | 筛选 | SC14 | CU/人工 |
| E2E-13 | 无团队 | SC15 | CU |
| E2E-14 | subagent 生命周期 | SC16 | CU/人工 |
| E2E-15 | 成员增删 | SC17 | 人工 |
| E2E-16 | 会话切换保持 | SC18 | CU |
| E2E-17 | 复制/跳转 | SC19 | CU/人工 |
| E2E-18 | 只读 | SC20 | 人工（需只读会话） |
| E2E-19 | 键盘/aria | SC22 | CU |
| E2E-20 | 错误态恢复 | SC24 | 人工（注入失败） |
| E2E-21 | 窄屏 | SC25 | CU |
| E2E-22 | i18n/主题 | SC26 | 人工（切 en/dark） |
| E2E-23 | canonical 前缀 | SC27 | CU + 事件核对 |
| E2E-24 | 单发无前缀 | SC28 | CU + 事件核对 |
| E2E-25 | steer 排队 | SC29 | 人工（事件核对） |
| E2E-26 | 部分失败重试 | SC30 | 人工（离线注入） |
| E2E-27 | subagent 可寻址/从属 | SC31 | CU |
| E2E-28 | teammate 入群消息 | SC32 | CU |
| E2E-29 | subagent 入群消息 | SC33 | CU |
| E2E-30 | 卡片动作与空值回退 | SC34 | CU/人工 |
| E2E-31 | 未读浮标/频道头联动清零 | SC21 | CU |
| E2E-32 | 入群消息历史回放/刷新仍「1 欢迎 + 1 卡」 | SC32/33 | CU |
| E2E-33 | 时间分隔插入规则 | SC2 | CU |
| E2E-34 | 发送中切会话 abort、不串数据 | SC18/23 | CU |

### 5.6 视觉（14；task-36 复审后全部可执行）

| ID | 基准 | 内容 | 状态 |
| --- | --- | --- | --- |
| VIS-01 | `01-tabs.png` | tab 行 + 频道头 chrome | ✅ |
| VIS-02 | `02-main.png` | 主界面（含 1 欢迎 + 1 带卡消息；消息正文 mask） | ✅ |
| VIS-03 | `03-collapse.png` | 折叠/展开（196px vs 328px、681 字/14 行） | ✅（PI-07 已修） |
| VIS-04 | `04-mention.png` | 补全浮层（输入卡极简；D-A 集合） | ✅；LOW 缺陷 PI-30（输入行文字重叠） |
| VIS-05 | `05-send.png` | 发送四态 + pre-send/sending 标注 | ✅（PI-12/13 已修；PI-14 仅标注，画面仍缺） |
| VIS-06 | `06-subagent.png` | subagent 行（无缩进/连接线） | ✅ |
| VIS-07 | `07-states.png` | 空态/骨架（文案对齐 SC15；无团队输入可用=D-C） | ✅；错误态已在 P11 底部条呈现 |
| VIS-08 | `08-1280.png` | 1280 档（输入卡极简 96px） | ✅ |
| VIS-09 | `09-768.png` | 768 档 | ✅（PI-17 已修：频道头去重、顶部栏筛选、溢出标注） |
| VIS-10 | `11-member-join.png` | 入群消息（欢迎 + creator 带卡；模型继承文案） | ✅（空值回退以标注小样补足，PI-16 关闭） |
| VIS-11 | `12-readonly-filter.png` 左 | 只读历史（SC20） | ✅ 恢复可执行 |
| VIS-12 | `12-readonly-filter.png` 右 | 筛选态（SC14） | ✅ 恢复可执行 |
| VIS-13 | `02-main.png`（浮标） | 未读浮标 + 频道头提示 | ✅ 恢复可执行 |
| VIS-14 | 规格表 | computed style 结构化断言（不看像素） | ✅ |
| VIS-15 | `13-task-cards.png` | 任务卡 A–I 9 变体（动作/状态/字段/空值回退） | ✅（task-48 新基线） |

### 5.7 性能（7）

| ID | 指标 | 阈值 | 采集 |
| --- | --- | --- | --- |
| PERF-01 | 1000 事件 sync（内核） | ≤50ms | Node 计时，取 P95（M1 本机） |
| PERF-02 | 首屏 200 条可交互（冷缓存） | ≤1.5s | `performance.mark('gc:feed-ready')` − navigationStart |
| PERF-03 | 首屏归一化 | ≤250ms | 内核计时 |
| PERF-04 | 单条增量 append → 渲染 | ≤16ms（合并 ≤5ms） | MutationObserver/marks |
| PERF-05 | 滚动帧率 | ≥55fps | rAF 采样 / trace |
| PERF-06 | 内存增量（2000 条） | ≤120MB | `performance.memory`（Chromium） |
| PERF-07 | 面板打开 CPU 空闲（30s） | ≤5% | 采样 |

### 5.8 可访问性与 i18n（10）

| ID | 用例 | SC |
| --- | --- | --- |
| A11Y-01 | tab 行 `role=tablist/tab` + 左右方向键 + 焦点可见 | SC22 |
| A11Y-02 | 折叠链接 Enter/Space + `aria-expanded` + `aria-controls` | SC22 |
| A11Y-03 | 补全 combobox：`aria-expanded`/`aria-controls`/`aria-activedescendant`；Esc 焦点归还 | SC7/22 |
| A11Y-04 | feed `role=log` `aria-live=polite` 只播报摘要 | SC22 |
| A11Y-05 | 对比度：正文 ≥12:1、说明/状态 ≥4.5:1 | SC26 |
| A11Y-06 | `prefers-reduced-motion: reduce` 取消耗电/位移动效 | SC26 |
| I18N-01 | zh/en key 集一致；无硬编码文案（渲染扫描） | SC26 |
| I18N-02 | 协议前缀固定中文，不随 locale 变化 | SC26/27 |
| I18N-03 | 日期/时间本地化（「今天 · 11:02」按 locale） | SC26 |
| I18N-04 | 颜色只用 `var(--dsw-*)`，无硬编码色值（静态扫描 + computed style） | SC26 |

---

## 6. e2e 执行方案（open-computer-use 优先）

### 6.1 前置条件（缺一不可）

1. DSH Desktop 运行中（bundle `com.deepseek.dsh`），且已安装/启用群聊插件（task-13 完成后）。
2. 打开**测试 workspace** 的测试会话（lead + ≥2 teammate + ≥1 subagent）；禁止在生产会话发送任何消息（真实副作用，架构 §8.3.1）。
3. 已知测试目标成员名（如 scout/backend），发送前二次核对「发送给」行与 @chips。
4. 允许遮挡用户桌面时使用 `window_placement:'agent_display'`，结束时 `restore`。

### 6.2 单用例 runbook

```
1. list_apps → 确认 com.deepseek.dsh running
2. get_app_state(app="DeepSeek Harness")           # 每步前必须重新取态
3. query(text="群聊", role="AXButton")            # 优先 AX 精确定位
4. click(app, element_index)／坐标兜底 click(x,y)  # 记录用的是哪种
5. 断言：截图 + get_app_state 文本（DOM/AX 可见文本、aria 属性）
6. 真实发送前：get_app_state 复核目标名 → 再点击发送
7. 副作用后：在目标会话/事件核对（rpcId、content）→ 截图
8. 结果写 tests/runs/<run-id>/e2e-<case>.md（PASS/FAIL/BLOCKED + 证据路径）
```

### 6.3 已知风险与降级（来自 spikes S6，未实测 get_app_state）

- AX 稀疏 → 允许坐标点击兜底；每个坐标点击必须配截图，不允许凭记忆连点。
- 焦点/窗口抢占 → `agent_display`；结束 `restore`；若窗口消失影响用户，记录并暂停。
- 不可 CI；OpenAI computer-use 执行结果不能替代自动化回归，QA 报告必须列「未自动化覆盖」清单。
- 若 AX 完全不可用 → 核心集降级为人工点击走查（`click-walk.md`），并标 BLOCKED + 缺口说明。

### 6.4 Playwright 的边界

- 允许：公开静态页（本地静态 harness / 报告页）加载与截图；一旦 Lead 提供已鉴权 GUI URL，按架构 §8.3.1 A 方案全量跑。
- 禁止：无 token 直接导航 Web GUI（401）；不得用 Playwright 绕过鉴权。

---

## 7. 视觉回归方案

### 7.1 方法

1. 真机截图：viewport 1440×900、1280×800、768×900，`deviceScaleFactor=2`（与原型 2× 导出一致）。
2. 区域对齐：把截图与原型统一到同一坐标系（左栏/内容列/输入卡）；原型含标注框的说明型帧（P3/P7/F0）只对**组件区域**比对，不对整帧。
3. 对比范围：**只比 chrome/布局区**（tab 行、频道头、输入区、消息骨架、卡片外框）；消息正文区用 mask 屏蔽（内容由数据驱动，架构 §8.4）。
4. 容差：`maxDiffPixelRatio: 0.01`；字体导致整体偏移时改用「区域对齐 + 结构化断言」兜底。
5. 结构化断言（必须单独跑，防「像素过了但规格错了」）：tab 13/500/下划线 2px/gap 32；会话头 76；频道头 56；内容列 920/856/720；气泡 max-width 600/radius 12/padding 10×14/正文 14/22；他人 `bg-layer-2`、自己 `bg-layer-3`；TimeDivider 居中 12/400；BubbleCaption 11；无角色徽标/无 chip 行/无行内时间；subagent 无缩进/连接线 + 名字后缀；折叠遮罩 56px + 链接 12px 文本；成员卡 max 520/padding 16/radius 12/信息行 label 68 + value x=84/行高 22（架构 §8.4 全表）。

### 7.2 基线锁定与已知差异（task-36 后）

1. 8 个 HIGH 已修复（PI-01…08），基线哈希已更新（§0.2），**可锁定并开始 VIS 执行**。
2. 基线锁定后仍存在的 **MEDIUM/LOW 级差异**（不阻塞基线，实现按 PRD/UX 口径修正）：
   - P5：`发送前 chips / 「共 N 位」` 仅有文字标注，无实际渲染画面（PI-14 部分，MEDIUM）；
   - P4：subagent 选项副标题格式仍为「ux 的子体 · Subagent」，与 SC7 括号式/SC31 后缀式未完全统一（PI-10，MEDIUM）；
   - M5/M6/hover 操作无画面（PI-20，MEDIUM）；
   - P4 输入行文字与提示重叠（PI-30，LOW）；工具行问题（PI-19）已随输入器极简关闭。
3. 执行顺序：全部 VIS 可执行；VIS-05 的发送前态按 PI-14 记录缺口，VIS-04 的命名格式按 PI-10 记录，不用单帧像素裁定。
4. VIS-11/12/13 不再 BLOCKED（P11/P2 已补帧）；VIS-13 用 `02-main.png`。

### 7.3 判定

- 可执行基线：`diffRatio ≤ 0.01` 且结构化断言全过 = PASS；仅一项超差 → 记录差异图 + 人工裁定（不得直接放过）。
- 不可执行基线：BLOCKED，写原因与替代证据（computed style/规格断言）。

---

## 8. 性能基准方案

- 数据构造：fixture 08/09 合成 1000/2000 条；首屏 200 条；长文本 64KB。
- 采集：内核用 `process.hrtime.bigint()`；UI 用 `performance.mark` + MutationObserver；滚动用 rAF 采样；内存用 `performance.memory`（Chromium）。
- 复测要求：记录机器（本机 M1）、DSH 版本、插件 commit、数据量；阈值仅在本机纵向比较，跨机需重测并注明（PRD §17 风格）。
- 失败处理：任何一项超阈值 → PERF FAIL，附 profile 摘要；若属环境限制（如无 Chromium `performance.memory`），标 BLOCKED 而非 PASS。
- 已知口径冲突：PRD §7.11 写「建议 5000 条/频道」，架构 §4.5 冻结 `maxMessagesInMemory=2000`；本计划按**架构 2000**执行，并要求回写 PRD（见 §11 R6）。

---

## 9. 点击走查

- 清单与逐条步骤：`tests/design/click-walk.md`（45 条控件，含前置/操作/期望/负向）。
- 执行规则：实现后**真实逐个点击**，不接受静态代码阅读替代（task-27 硬性要求）；每条留截图 + DOM/AX 断言；结果写 `tests/interactions/click-walk-results.md`。
- 顺序建议：1440 主路径 → 负向（禁用/失败/只读）→ 768 窄屏。

---

## 10. 原型评审摘要

- 详见 `tests/design/prototype-review.md`。
- 计数：**41 条问题记录（含历史）**；task-36 清 8 HIGH + PI-21；task-39 清 9 MEDIUM；task-41 关 PI-19；**task-48 清 PI-31/32 + PI-33…36 + PI-38…41**，当前剩余 **HIGH 0、MEDIUM 3（PI-10/PI-14 部分/PI-20）、LOW 11（PI-22…28、PI-30、PI-37、PI-42）**。
- **无 HIGH**：PI-01…08、PI-21 已清；task-39/41 清 MEDIUM；task-46 新增的 PI-31/32 及 PI-33…36、PI-38…41 已在 task-48 清零；`02-main`/`13-task-cards` 已锁，**13/13 基线可锁定**（§0.2）。

---

## 11. 实现前必须确认的问题（交 Lead）

| ID | 问题 | 阻塞什么 | 建议 |
| --- | --- | --- | --- |
| R1 | ✅ 已关闭：PRD v0.6.2 / 架构 v1.5 / UX v3.2 全部落盘，`prototype.md` §1 更新；P2/P10 模型继承文案已按 D-D 修正 | — | 无需动作 |
| R2 | ✅ 已关闭（PRD v0.6.2 D-A）：Lead 恒可寻址；teammate 恒可寻址（inactive 可冷唤醒）；subagent 仅 running/provisioning；one-shot 完成不可寻址 | SC7/SC31、UT-24/CM-07/26 | 按 D-A 断言；P4 的「已完成 teammate」保留在补全属正确 |
| R3 | ✅ 已关闭（PRD v0.6.2 D-B）：命中 = sender 或 targets；父成员筛选含其 subagent，选 subagent 不反向含父；单选；不做正文 @ 文本搜索 | SC14、UT-32、CM-13/E2E-12 | 按 D-B 断言；「@文本搜索」不是命中条件 |
| R4 | ✅ 已关闭（PRD v0.6.2 D-C）：无团队允许发送，按该会话普通用户消息发给 Lead；空态输入区可用 | SC15、CM-14、E2E-13 | 按 D-C 断言；P7 仍写「待 O6 裁决」为残留文案（LOW，见 prototype-review PI-05 备注） |
| R5 | **只读触发信号**：架构 §6.4.4 用「无发送权限 / 归档 / idle≥90s 且全 inactive」，但 PRD SC20 写「团队任务已完成」；`SessionSummary` 归档字段名 UNVERIFIED | SC20、UT-34、E2E-18 | 明确可观测信号（宿主字段），否则 SC20 只能人工构造 |
| R6 | **内存上限口径**：PRD §7.11「建议 5000 条/频道」 vs 架构 §4.5 `maxMessagesInMemory=2000` | PERF-06、UT-18 | 以架构 2000 为准并回写 PRD |
| R7 | **M5 文件打开方式 / M6 跳转「轨迹」** 未决（PRD O4） | SC19、CM-18/30、VIS-14 | 实现前定 API；测试先按「调用存在 + 不报错」弱断言 |
| R8 | **重试幂等窗口**（S2 证 Host 按 rpcId 幂等，但会话驱逐+日志裁剪后不保证） | SC11/SC30 的「不双投」断言 | 测试目标 = 不双投 + ≤2 次重试；边界场景单列为已知限制 |
| R9 | **e2e 可行性与覆盖缺口**：S6 未实测 get_app_state；AX 可能稀疏；不可 CI | G4/G7 | 实现后首日先做 AX 可行性冒烟；不可用则改坐标点击 + 人工走查并声明缺口 |
| R10 | ✅ 已关闭：8 个 HIGH 已修，12 张基线哈希已锁（§0.2）；剩余 MEDIUM/LOW 见 §7.2 | VIS-03/05/09/10/11/12/13 | 执行 VIS；P5/P9/P10 已知差异按 PRD 口径记录 |
| R11 | ✅ 已关闭：架构 v1.5 §6.5.2 全量采纳 test-plan §13 的 DOM 契约并冻结（V1.5-5），实现不得改名 | 组件测试/e2e | 按 §6.5.2 选择器写测试 |

---

## 12. 已知覆盖缺口与不测项

- 真机 e2e 无法进入 CI；核心集之外的 SC 用组件测试 + 人工点击补证，QA 报告必须列缺口（架构 §8.3.1）。
- 只读/筛选/未读三态当前无视觉基准 → VIS-11/12/13 BLOCKED；不伪造基准。
- 多用户/多客户端权限、跨工作区团队、长时稳定性（>30min）不在 v1 范围。
- 性能数据仅本机 M1；跨机型不保证。
- `events` 的 transient 小数 seq 只做「不崩/不误判」断言，不做整数运算断言（S1）。

---

## 13. DOM 契约（已由架构 v1.5 §6.5.2 冻结）

本 tester 在 v0.1 提出的选择器建议已被架构 v1.5 **全量采纳并冻结**（V1.5-5：实现不得改名/删除；新增需升版本并同步本文件）。测试实现时按 `docs/architecture/group-chat-architecture.md` §6.5.2 使用：

| 元素 | 契约 |
| --- | --- |
| feed / 时间分隔 / 气泡 / 说明 | `data-testid="group-chat-feed"` / `group-chat-time-divider` / `group-chat-bubble` / `group-chat-bubble-caption` |
| 消息行 | `data-kind` / `data-message-id` / `data-status`（sending/sent/partial/failed） |
| subagent | `data-member-kind="subagent"` + `data-parent` |
| 内联提及 | `data-mention="<name>"`（正文首行） |
| 欢迎提示 | `data-kind="system"` + `data-system-variant="welcome"` |
| 入群消息 | `data-kind="member_card"` + `data-sender="<creator>"` + `data-card="member-join"` + `data-member-id` + `data-member-kind` + `data-member-state` + `data-creation-id` + `data-pair-order` |
| 折叠链接 | `data-testid="group-chat-fold-toggle"` + `aria-expanded` |
| 未读浮标 / 频道头提示 | `group-chat-unread-pill` + `data-count` / `group-chat-newmessages-hint` + `data-count` |
| 筛选提示条 | `group-chat-filter-banner` + `data-filter` + `data-action="clear-filter"` |
| 只读横幅 / 断线横幅 | `group-chat-readonly-banner` / `group-chat-reconnect-banner` |
| @ 补全 | `group-chat-mention-popup` + `role=listbox`；选项 `role=option` + `data-mention` + `aria-selected` |
| 输入器 / 发送键 / 目标行 | `group-chat-composer` / `group-chat-send`（`disabled`+`aria-busy`）/ `group-chat-target-row` + `data-targets` |
| 错误卡 | `group-chat-error` + `data-retryable` |
| 成员卡动作 / 字段 | `data-action="view-session|view-task|expand-task"`；`data-field="model|context|create-tool|parent|description|task"` |

> 使用规则（架构 §6.5.2）：① 测试只用本表选择器，禁止按文案定位（文案走 i18n）；② `data-count`/`data-targets` 可解析；③ 与 §8.3.2/§8.6 断言一一对应。

## 14. 变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v0.1 | 2026-10-28 | 初版：SC1–SC34 追溯、7 层测试、150 条用例（UT48/CT6/CM30/E2E34/VIS15/PERF7/A11Y6/I18N4）、45 条点击走查、29 条原型问题 |
| v0.2 | 2026-10-28 | 对齐 PRD v0.6.2 / 架构 v1.5（15:20–15:22 落盘）：M8 改为「欢迎提示 + creator 带卡消息」，SC32–SC34/CM-27/28/UT-38/E2E-28–32/VIS-10 证据与 DOM 契约更新，移除 rebaseline 标记；新增 R1/R11 文档与契约缺口说明 |
| v0.3 | 2026-10-28 | task-36 复审：8 HIGH + PI-21 修复确认；§0.1/0.2/0.3 更新为 PRD v0.6.2/架构 v1.5/UX v3.2 与 **12 张**新版基线哈希；VIS-11/12/13 解除 BLOCKED；§13 改为架构冻结契约；R1/R2/R3/R4/R10/R11 关闭；VIS/§7.2/§10 同步 |
| v0.4 | 2026-10-28 | task-39：MEDIUM 打磨后第二次基线刷新（03/04/05/07/09/11/12 共 7 张哈希更新）；PI-05/09/11/12/13/15/16/17/18 关闭、PI-14 部分；无新增 HIGH；§0.2/0.3/7.2/10 同步 |
| v0.5 | 2026-10-28 | task-41：输入器极简（PI-19 关闭）+ P5 两态标注（PI-14 仍部分）；新 LOW PI-30（P4 输入行文字重叠）；5 张重导 PNG 哈希第三次刷新（02/04/05/08/09，15:47）；无新增 HIGH |
| v0.6 | 2026-10-28 | task-46：新增 `13-task-cards.png` 基线行（P12 6 变体）、更新 `02-main.png` 哈希（16:04，c953578e…）；任务卡专项复审发现 HIGH 2（返工文案/P2 时间分隔压叠），两张暂不可锁定；其余 11 张基线不变 |
| v0.7 | 2026-10-28 | task-48：任务卡修复复核通过；02-main（c960e1b1…，262,743 B）与 13-task-cards（ea776e4a…，340,149 B）哈希更新并转 ✅；新增 VIS-15；**13/13 基线全部锁定**；HIGH 0、MEDIUM 3、LOW 11（新增 PI-42） |
| v0.8 | 2026-10-29 | task-83：Figma v4.1 定稿，新增 F22–F30/SC39–SC48 用例 31 条（UT55/CT9/CM36/E2E43/VIS18/PERF8/A11Y8/I18N4，共 181）；新增 §15 追溯矩阵/层级用例/统计；基线引用 prototype-review §8；e2e 步骤见 `e2e-v4.1-steps.md` |

---

## 15. v4.1 增量用例（F22–F30 / SC39–SC48）

> 依据：PRD v0.7.1 增补 F22–F30/SC39–SC48；Figma v4.1（P2 49:1765、P3 51:2325、P4 50:1934、P6 17:528、P8 17:703、P9 17:790、P10 21:954、P11 25:1221、P12 51:2099、P13 50:1972）。原型基线锁版见 `prototype-review.md` §8。
> 执行前提：仅使用 `e2e-*` 专用会话；不得向用户真实会话发消息。

### 15.1 追溯矩阵

| SC | 需求（F） | 覆盖用例 |
| --- | --- | --- |
| SC39 | Markdown 富文本气泡（粗体/列表/行内代码/代码块/链接）安全渲染 | UT-49、CM-35、E2E-35、VIS-16 |
| SC40 | 长文本 50 行折叠（真实高度 22px/行、56px 渐隐、展开全文） | UT-50、E2E-36、VIS-17 |
| SC41 | 单一输入器；Enter 发送（Shift+Enter 换行），无重复宿主输入区 | CT-7、E2E-37、A11Y-7 |
| SC42 | @ 仅输入「@」触发补全；选中生成 chip（输入框下方、可删除）；不裸写 @ 文本 | UT-51、CT-8、E2E-38、A11Y-8 |
| SC43 | 成员条全显 + 工作中/等待状态点；头像可点开轨迹 | CM-36、CM-37、E2E-39、VIS-18 |
| SC44 | 轨迹侧栏（380px，agent/模型/轮次/工具数/状态/关闭，只读） | CM-38、E2E-39、VIS-18 |
| SC45 | member session 消息 → lead 会话可见；同一发送不重复（echo/权威去重） | UT-52、CM-39、E2E-40 |
| SC46 | 图标操作（复制/打开会话）；任务卡 v5（无「复制任务 ID」，动作按 state-machine） | UT-53、UT-54、E2E-41、VIS-16 |
| SC47 | 宿主 composer 在群聊视图隐藏，仅插件 composer 可发送 | CT-9、E2E-42 |
| SC48 | subagent-settled 系统提示过滤；欢迎提示居中（非左/右气泡） | UT-55、CM-40、E2E-43、VIS-17 |

### 15.2 单元/组件用例

| ID | 层级 | 用例 | 期望/断言 | 优先级 |
| --- | --- | --- | --- | --- |
| UT-49 | UT | Markdown 渲染器：粗体/无序列表/行内代码/围栏代码/链接；HTML/脚本转义 | 仅白名单标签；无 `dangerouslySetInnerHTML` 注入；链接 `rel=noopener`；纯文本可复制 | P0 |
| UT-50 | UT | 折叠阈值：49/50/51/62 行 | ≤50 不折叠；>50 折叠到 50 行 + `共 N 行 · 显示前 50 行 / 展开全部`；展开后无高度截断 | P0 |
| UT-51 | UT | @ 解析：裸 @、@name、@name 后空格、删除 chip | 仅「@」键触发唯一补全；chip 模型 = {name,sessionId}；删除 chip 后 targets 同步；不生成裸 @ 文本 | P0 |
| UT-52 | UT | 去重：本地 echo + 权威 user 消息 (clientBatchId/requestId) | 同批次只保留 1 条；F-07 回归；重试幂等 | P0 |
| UT-53 | UT | 任务卡 v5 模型：9 变体/标签/状态/owner/时间/打开会话；无复制 ID | 动作映射四态；无 `copy-task-id` action；标题“复制任务 ID”不存在 | P0 |
| UT-54 | UT | 图标动作：复制（clipboard 原文）/打开所属会话 | 复制内容 = 消息原文；打开 = 跳转对应 session；失败 toast | P1 |
| UT-55 | UT | subagent-settled 过滤 + 欢迎提示 variant | settled 系统事件不进 feed；welcome `data-system-variant=welcome` 居中，不按 sender 对齐 | P1 |

### 15.3 组件/契约用例

| ID | 层级 | 用例 | 期望 |
| --- | --- | --- | --- |
| CT-7 | CT | 单输入器 + Enter/Shift+Enter | 群聊视图仅 1 个 `group-chat-composer`；Enter 发送、Shift+Enter 换行；发送中 `aria-busy`/disabled |
| CT-8 | CT | @ 触发与 chips | 「@」弹 `group-chat-mention-popup[role=listbox]`；option `role=option[data-mention]`；选中生成 chip；chip 删除按钮可访问 |
| CT-9 | CT | 隐藏宿主 composer | 群聊 tab 下宿主输入区不可见/不可聚焦；切回对话 tab 恢复 |

### 15.4 组件/视觉/交互用例

| ID | 层级 | 用例 | 期望 |
| --- | --- | --- | --- |
| CM-35 | CM | Markdown 气泡结构 | 代码块横向滚动、链接可点、行内代码样式；复制原文保留 Markdown 源 |
| CM-36 | CM | 成员条全显 | 全部成员（含 subagent 归父）头像 + 状态点；工作=绿、等待=灰；无头像截断 |
| CM-37 | CM | 头像 → 轨迹侧栏 | 点击头像/消息打开右侧 380px 侧栏；再点关闭；只读 |
| CM-38 | CM | 轨迹内容 | agent 名/模型/轮次列表（时间/摘要/工具数/状态）；空态；Esc/关闭按钮 |
| CM-39 | CM | member→lead + 去重 | member 会话用户消息出现在 lead feed；同一发送仅 1 条（含 22:29/22:49 回归样本） |
| CM-40 | CM | subagent-settled 过滤 / 欢迎居中 | 无 settled 噪音；欢迎提示居中、非气泡左右对齐 |

### 15.5 E2E / 视觉 / 性能 / 可访问性

| ID | 层级 | 用例 | 期望 |
| --- | --- | --- | --- |
| E2E-35 | E2E | 发送含 Markdown 文本 | 气泡富文本渲染；无 XSS；链接新窗口 |
| E2E-36 | E2E | 62 行长文本 | 折叠 50 行 + 渐隐；展开/收起锚点稳定；滚动不跳顶 |
| E2E-37 | E2E | 单输入器 + Enter 发送 | 群聊仅 1 输入器；Enter 发送成功；Shift+Enter 换行不发送 |
| E2E-38 | E2E | 输入「@」→ 选人 → chip → 发送 | 弹层不透明；chip 显示；发送目标行同步「发送给 Lead、@x」；删除 chip 后目标回退 |
| E2E-39 | E2E | 点成员头像 → 轨迹侧栏；关闭 | 380px 侧栏、轮次数据、只读、关闭恢复 |
| E2E-40 | E2E | member 会话发消息 | lead 会话可见，仅 1 条；无重复 echo |
| E2E-41 | E2E | 任务卡 v5 动作 | 无「复制任务 ID」；打开会话/认领等动作按状态机；图标可点 |
| E2E-42 | E2E | 群聊视图检查宿主 composer | 宿主 composer 隐藏；仅插件 composer；切回对话恢复 |
| E2E-43 | E2E | subagent settled / 欢迎态 | settled 不出现；欢迎居中；P6/P11 状态一致 |
| VIS-16 | VIS | P2/P12 结构对照（Markdown/图标/任务卡 v5/单输入器/chips） | 结构/尺寸/令牌一致；P2 49:1765、P12 51:2099 |
| VIS-17 | VIS | P3 折叠态/展开态 + 欢迎居中（P2） | 50 行真实高度、56px 渐隐、展开 62 行；欢迎居中 |
| VIS-18 | VIS | P2 成员条、P13 轨迹侧栏、P4 弹层、P8/P9 窄屏 | 状态点、380px 侧栏、不透明弹层、1280/768 布局 |
| PERF-8 | PERF | 200 条含 Markdown 消息首屏 | ≤250ms；折叠计算 ≤50ms；1000 条归一化 ≤50ms |
| A11Y-7 | A11Y | 键盘：Enter/Shift+Enter、Tab 到发送 | 焦点顺序可预测；发送键可键盘触发；无焦点陷阱 |
| A11Y-8 | A11Y | chips/弹层键盘 | ↑↓/Enter/Tab/Esc；chip 删除按钮 aria-label；弹层 role=listbox/option |

### 15.6 用例统计（v0.8）

| 层级 | 原 | 新增 | 合计 |
| --- | --- | --- | --- |
| UT | 48 | 7（UT-49…55） | 55 |
| CT | 6 | 3（CT-7…9） | 9 |
| CM | 30 | 6（CM-35…40） | 36 |
| E2E | 34 | 9（E2E-35…43） | 43 |
| VIS | 15 | 3（VIS-16…18） | 18 |
| PERF | 7 | 1（PERF-8） | 8 |
| A11Y | 6 | 2（A11Y-7/8） | 8 |
| I18N | 4 | 0 | 4 |
| **合计** | **150** | **31** | **181** |

> 统计口径调整：原表 150 = UT48+CT6+CM30+E2E34+VIS15+PERF7+A11Y6+I18N4；本轮新增 31 条（UI 冒烟并入 E2E-42），总数 **181**。若实现层将 Markdown/折叠合并为同一组件用例，执行时以 ID 为准，不重复计数。

### 15.7 基线引用

v4.1 九张重导 PNG（02/03/04/06/08/09/11/13/14）的哈希/尺寸/帧 ID 已锁在 `prototype-review.md` §8；§0.2 旧 v3.3/v4 基线表对 9 张文件**已过期**，执行时以 §8 为准，其余 5 张（01/05/07/10/12）仍按 §0.2。
