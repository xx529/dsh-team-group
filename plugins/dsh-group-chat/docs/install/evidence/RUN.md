# task-13 · 群聊插件安装 + 冒烟执行记录

- 最终结论：**PASS（安装冒烟门通过）**
  - 安装：`application=applied`、`enabled=true`、`warnings=[]`
  - tab 中文「群聊」、可进入；团队 feed 无系统上下文注入文本；单 agent 空态中文；成员/running 口径合理
  - 首轮发现的 3 个缺陷（D-01 HIGH / D-02 MEDIUM / D-03 LOW）均已修复并复验（见 §4）
- 执行人：backend（集成/安装准备 owner；安装动作由 Lead 执行）
- 环境：DSH Desktop **0.2.1-rc.3**（app=`dsh-app://app/`，pid 2309）· macOS 26.7.1 · profile=desktop · 本会话 Web GUI `http://127.0.0.1:50595`
- 包：`@local/dsh-group-chat@0.1.0`（`/Users/lzx/Documents/GitHub/dsh-team-group/plugins/dsh-group-chat`）
- 最终产物：`lib/client.js` **462,162 B** · 26 modules · 11 parts · sha256 `95ee3b12cbb54b1d9dbc88aa870784d556ad80b3e8f906db0855cb37135a7e14`

## 1. 安装记录（Lead 执行；backend 无 danger-full-access）

| 轮次 | 时间 | 操作 | 结果 |
| --- | --- | --- | --- |
| 首装 | 17:52 | `install_bundle` | applied / enabled / warnings=[] / bundle 0.1.0（sha `4abf82ae…`） |
| 重装（修复后） | ~18:10 | `remove_bundle` → `install_bundle` | applied / enabled / warnings=[] / 新 sha `95ee3b12…` |

> 观察：重装后 GUI **无需手动刷新**即显示新 bundle（tab 由 `Group chat` 变为「群聊」，文案跟随宿主中文）；未重启 Desktop。详见 `01-install.txt`。

## 2. 构建 / 打包 / 测试（最终轮，backend）

```bash
node scripts/build.mjs          # 462,162 B · 26 modules · 11 parts
node scripts/build.mjs --check  # up to date
node scripts/verify.mjs         # ✅ ALL PASS · 33 checks
npm test                        # 209 pass / 0 fail（core 121 / client 49 / send 39）
node --check lib/client.js      # OK
```

- `lib/client.js` sha256 = `95ee3b12cbb54b1d9dbc88aa870784d556ad80b3e8f906db0855cb37135a7e14`
- `lib/index.js` = 空壳 `apply()`（未变：`8d7362e0…`）
- 证据：`11-verify-after-fix.txt`

## 3. 冒烟结果（复跑，open-computer-use 操作 DSH Desktop）

| # | 检查 | 期望 | 实际 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | client slot `conversation.view` | 有 group-chat occupant | ⚠ client inspect 仍 10s 超时（环境限制）；AX 树显示 tab group 中有 **群聊**（order 5，位于对话后、轨迹前） | `02-slot-inspect.txt` |
| 2 | tab 文案 | 中文「群聊」且处于激活态（下划线在群聊） | ✅「对话 → **群聊**（selected）→ 轨迹 → 上下文 → 终端 → 编队 → 能力」 | `09-team-after-fix.webp` |
| 3 | 团队会话进入 | 频道头 + feed + 输入区 | ✅「群聊 / Lead / **9 名成员 · 3 个运行中**」+ 中文时间分隔 + 任务卡（认领任务/进行中/已完成）+ 成员卡 + agent_output + 工具折叠行 + 中文输入器；另见第二团队会话 feed（9 名成员 · 0 个运行中，含 @ 气泡/任务卡/成员结算摘要） | `09-team-after-fix.webp`、`09b-group-chat-feed-after-fix.webp` |
| 4 | 系统上下文泄漏 | 不得出现注入文本 | ✅ 群聊 feed AX 采样 `system-reminder / skill_content / Current runtime context / Time sampled` 命中 **0**；离线全量回归（两团队会话）按**事件来源**判定 context 泄漏 **0** | `09-team-after-fix.webp`、`09b-group-chat-feed-after-fix.webp`、`11-verify-after-fix.txt` |
| 5 | 单 agent 空态 | 中文空态 + 输入可用 | ✅「当前为单 Agent 会话（无团队）」「仅显示该会话的用户消息与该 agent 的最终输出」「如何组建团队」；输入器「发送给 Lead / 未 @ 时默认发送给 Lead；键入 @ 可同时发送给多人」「回复群聊…」 | `10-no-team-after-fix.webp` |
| 6 | 成员数 / running | 不高估 | ✅ 9 名成员 · 3 个运行中（首轮为 9/9） | `09-team-after-fix.webp` |
| 7 | 其它视图 | 不受影响 | ✅ 对话/轨迹/上下文/终端/编队/能力 tab 均存在，切回对话正常 | `09/09b/10` |
| 8 | console error | 无 error | ⚠ 未取证（见 §6 限制），无错误 UI/白屏 | `06-console.txt` |

> **证据更正（2026-10-28 18:20，Lead 复核发现）**：初版 `09-team-after-fix.webp` 误截为「对话」tab（下划线在对话、内容是普通聊天视图），已用**真实群聊视图**覆盖：`群聊` tab 为 selected、频道头「群聊 / Lead / 9 名成员 · 3 个运行中」、中文任务卡/气泡/输入器；并新增 `09b-group-chat-feed-after-fix.webp`（另一团队会话的群聊 feed，滚动到有消息处，用于证明中文下无系统上下文文本）。`10-no-team-after-fix.webp` 经复核无误（群聊 active + 中文空态）。

> 判定说明：D-01 的验收以**消息事件来源**为准（context kind 被 core 丢弃），不以「正文出现 `<system-reminder>` 字样」为准——团队会话中确实有真实消息在讨论这些字样（例如 D-01 修复汇报、subagent 结算摘要），属于正常对话内容。

## 4. 缺陷修复记录（首轮 FAIL → 本轮 PASS）

| ID | 首轮级别 | 根因 | 修复（owner） | 复验 |
| --- | --- | --- | --- | --- |
| D-01 | **HIGH** | `user/message` 的宿主注入类 `source.kind` 落入「未知 source → system 原样展示」兜底，系统上下文被当群聊消息 | backend（task-50）：`src/core/constants.js` 新增 `CONTEXT_SOURCE_KINDS`（真实日志取证：`agent-instructions / runtime-context / skill-catalog / time-context / tool-jobs / skill-invocation / user-approval / system-prompt / goal / schedule`）；`normalize.js` 提前丢弃并计 `diagnostics.ignoredSystemContext`；真未知 kind 仍保留 UT-08 兜底；fixture 18 + 单测 | ✅ 0 泄漏（真实会话离线回归）；GUI 无注入文本 |
| D-02 | **MEDIUM** | `entry.js` 读不存在的 `ctx.locale.get()` → 回退 `navigator.language=en-US`，中文宿主下全英文 | frontend（task-51）：改用 `locale.getSnapshot().active` + `ctx.locale.subscribe(...)`，navigator 仅服务不可用时兜底、默认 zh；视图 `useSyncExternalStore` 跟随 | ✅ tab/频道头/空态/输入器全中文 |
| D-03 | LOW | 成员 running 由事件相位推断（active→running），高估 | backend（task-50 数据侧）：适配器从 `binding(id).session.getSnapshot().running` 注入 `sessionSummaries`，`buildDirectory/deriveRoster` 以真实 running 为准；frontend（task-51 UI 侧）：用 `agentTeam` 投影做状态覆盖合并（保 subagent） | ✅ 9 名成员 · 3 个运行中（非 9/9） |

## 5. 证据清单

| 文件 | 内容 |
| --- | --- |
| `01-install.txt` | 首装 + 修复后重装结果（Lead 返回） |
| `02-slot-inspect.txt` | client inspect 超时记录 + AX 树 occupant（群聊）证据 |
| `03-tab-before-refresh.webp` | **首轮** tab 行（Group chat，缺陷证据，保留） |
| `04-enter-team.webp` / `04-enter-team-htdot.webp` | **首轮** 团队群聊（含 D-01 泄漏文本，缺陷证据，保留） |
| `05-no-team.webp` | **首轮** 单 agent 空态（英文，缺陷证据，保留） |
| `09-team-after-fix.webp` | **已更正**：修复后团队群聊（群聊 tab selected；中文频道头「群聊 / Lead / 9 名成员 · 3 个运行中」、任务卡、agent_output、中文输入器） |
| `09b-group-chat-feed-after-fix.webp` | 修复后群聊 feed（另一团队会话，滚动到有消息处；中文 @ 气泡/任务卡/成员结算；用于证明无系统上下文文本） |
| `10-no-team-after-fix.webp` | 修复后单 agent 空态（中文） |
| `11-verify-after-fix.txt` | 构建/校验/测试 + 离线真实日志回归 + GUI 复核摘要 |
| `06-console.txt` | console 未取证说明与替代证据 |
| `RUN.md` | 本记录 |

## 6. 已知限制（不影响本轮 PASS）

1. **client inspect 通道 10s 超时**（3 次）：Desktop `dsh-app://` 客户端未回应该查询 → 用 AX 树等价取证；若后续拿到已鉴权 Web GUI URL，可补 `Slots.listSubTree` 原始输出。
2. **渲染进程 console 未取证**：open-computer-use 不暴露 DevTools；以「无错误 UI/白屏 + 正常渲染」为替代证据。
3. 截图为 open-computer-use 归一化 WebP（1280×720），非 2× PNG；视觉回归由 tester 用 Playwright/已鉴权 URL 另行执行。
4. 重装后**未手动刷新**即生效（观察）；若后续环境需刷新/重启的边界不同，以 `group-chat-install.md` §5 为准。
5. 真机仅验证 DSH Desktop 0.2.1-rc.3；其它 DSH 版本按 `package.json engines` 与兼容矩阵另行验证。
6. 发送链路（多目标 fan-out/四态/部分失败）本轮未在 GUI 真实点击发送（避免向用户真实会话写入测试消息）；由 tester 在测试 workspace 执行 SC8–SC11/SC23/SC27–SC30。
7. LOW 观察（不影响通过）：`subagent-settled` 无 closing message 时显示的系统条正文来自**宿主事件文本**（英文，如 “Background subagent … failed before it finished. It left no closing message.”），不是插件 i18n key；如需全中文可后续把该文本映射为中文系统条（T2/core 均可低成本处理，tester 可记为 LOW）。

## 7. 交接给 tester（task-27）

- 环境入口：DSH Desktop 当前 profile 已装 `@local/dsh-group-chat@0.1.0`（sha `95ee3b12…`）；`conversation.view` 已出现「群聊」。
- 建议先在**测试 workspace** 构造团队会话再执行 e2e/点击走查；`tests/design/test-plan.md` + `click-walk.md` 为口径；视觉基线 `docs/ux/prototype/*.png`。
- 本轮证据可作冒烟基线；tester 的 PASS/FAIL 以其独立证据为准（UI 全维度、点击、视觉、可访问性、性能）。

---

## 8. 修复后复验：F-01 + F-02（2026-10-28 18:36–18:45）

安装：Lead `remove_bundle` → `install_bundle`：`application=applied / enabled=true / warnings=[]`
Bundle：`@local/dsh-group-chat@0.1.0` · 473,781 B · sha256 `e6f949a576d38e0d6ba3aff2baa0eda009a10254702223b8e4fa7dc6079e0cab`（26 modules · 11 parts）

### F-01（HIGH）团队态输入区被推出可视区 —— ✅ 已修复
- 团队会话（长 feed）在**历史位置**与**底部位置**均可见插件输入区：「发送给 Lead · 未 @ 时默认发送给 Lead；键入 @ 可同时发送给多人」+「回复群聊…」+ 发送键；
- 插件输入区与宿主 composer（「发消息或创建任务 / 调用指令 / @ 文件或对话」）上下分离、不重叠；
- feed 独立滚动（右侧滚动条），header / banners / composer 固定不滚；
- 证据：`11-after-fix2-f01-composer.webp`、`11b-after-fix2-composer-scrolled.webp`；单 agent 空态沿用 `10-no-team-after-fix.webp`（F-01 为视图根高度约束，空态短内容不受影响；tester 可复截）。

### F-02（HIGH）历史消息/任务卡显示 session 短 id —— ✅ 已修复
- 历史任务卡 actor/负责人显示真实成员名（AX 摘录见 `12-after-fix2-ax-identity.txt`）：
  `task-11 frontend` / `task-10 backend` / `task-49 architect` / `task-12 backend` / `task-54 tester`；
- 历史 agent→agent sender：`backend`(17:12/17:32/17:42)、`frontend`(17:14/17:48)、`architect`(17:16)；无 `8c86b049`/`e51e798b` 作为显示名；
- 唯一出现的 `8c86b049-…` 是宿主 `Background subagent …` 结算句中的**完整 UUID**（系统提示正文，不是 sender/actor/owner 显示名）；
- subagent 仍按「label · 父名 的子体」展示（无缩进/连接线）；
- 证据：`12-after-fix2-f02-identity.webp`、`12b-after-fix2-f02-tester-backend.webp`、`12-after-fix2-ax-identity.txt`。

### 回归
- tab 行：「对话 → **群聊**（selected，中文）→ 轨迹 → 上下文 → 终端 → 编队 → 能力」；
- 频道头「群聊 / Lead / **9 名成员 · 2 个运行中**」；
- feed 未见 `system-reminder / skill_content / runtime-context / time-context` 注入块；无白屏/错误 UI。

### 结论
- **F-01 / F-02 复验 PASS**，无新增缺陷；RUN 总判定维持 **PASS**。汇总证据：`13-after-fix2-summary.txt`。
- 剩余非阻塞项：client inspect 10s 超时（环境）、console 未取证（环境）、subagent 结算提示英文（LOW，等 tester 判级）。
- 后续：Lead 唤醒 tester 做 SC3/SC4/SC16/SC35–SC38 与全量点击走查。
