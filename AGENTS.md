# AGENTS.md · DSH 群聊插件（@local/dsh-group-chat）

> 项目级 agent 指南。任何 agent 在本仓库动手前先读本文件；与 `docs/architecture/group-chat-architecture.md`（下称「架构」）冲突时，以架构 v1.6.1 为准，并同步修订本文件。

## 1. 项目一句话

DSH Web GUI 对话页的并列视图 **「群聊」** 插件：把 **Lead 主会话 + 全部 teammate 会话 + 全部 subagent 子会话** 聚合成一条群聊式时间线，支持 `@` 一个/多个成员的**多目标同发**（一条气泡 + 「已同时发送给 …」说明行），以及成员入群消息（M8）与任务卡消息（M9）。

- 包名：`@local/dsh-group-chat`，版本 `0.1.0`
- 视图：`conversation.view`，`id=group-chat`，`order=5`（紧邻「对话」）
- 上游文档：PRD `docs/specs/group-chat-prd.md` v0.7.1；架构 `docs/architecture/group-chat-architecture.md` v1.6.1；UX `docs/ux/group-chat-ux.md` v3.3；原型 `docs/ux/prototype.md`（Figma `team-group` P1–P12）

## 2. 目录结构

```
dsh-team-group/
├── AGENTS.md                    # 本文件
├── .gitignore
├── plugins/dsh-group-chat/      # 插件本体（唯一可发布产物）
│   ├── package.json             # dsh.bundle.patch + dsh.client{platform,inject} + exports ./client
│   ├── cordis.patch.yml         # 插入一行 id=group-chat（Host 半空壳）
│   ├── icon.svg / README.md
│   ├── locale/{zh,en}.json      # i18n 源，键集必须完全一致（构建期校验）
│   ├── lib/client.js            # ★ 生成物（scripts/build.mjs 产出，禁止手改）
│   ├── lib/index.js             # Host 半空壳（v1 有意为空；无路由/无 Service）
│   ├── src/core/                # 纯数据内核：normalize/dedupe/timeline/protocol/fanout/mentions/filter/folding/paginate/roster/constants
│   ├── src/adapters/            # ChannelSource 实现：client-session-source / mock-source / replay-host
│   ├── src/send/                # 发送编排：targets/protocol 前缀/send-batch/delivery 四态/retry/rate-limit/mode/errors
│   ├── src/client/              # entry.js + parts/（00-boot … 90-view 按文件名序拼接）
│   ├── src/styles/group-chat.css# 只含布局/尺寸；颜色全部 var(--dsw-*)
│   ├── scripts/build.mjs        # 零依赖确定性拼接构建（含 build 指纹）
│   ├── scripts/verify.mjs       # 33 项打包/边界/一致性校验（CI 用）
│   └── test/{core,send,client,fixtures}/  # node --test
├── docs/
│   ├── research/                # 只读取证：api-feasibility / event-model / member-card-fields / task-card-fields / spikes-v1
│   ├── specs/                   # PRD（F1–F21 / SC1–SC38）
│   ├── ux/                      # UX 规格 + docs/ux/prototype/（P1–P12 的 2× PNG 视觉基线）+ ref/
│   └── architecture/            # 架构设计 + 决策记录 + DOM 契约
├── tests/
│   ├── design/                  # test-plan.md / click-walk.md / prototype-review.md（验收设计）
│   ├── runs/                    # 每轮测试记录（*.md；perf-01.log 为性能证据，例外保留）
│   ├── interactions/            # 控件点击走查结果
│   └── artifacts/               # 截图等证据
└── .figma/                      # Figma 本地导出缓存，不入库
```

## 3. 常用命令

所有构建/测试命令在 `plugins/dsh-group-chat/` 下执行：

```bash
cd plugins/dsh-group-chat

node scripts/build.mjs           # 生成 lib/client.js（唯一入口：src/client/entry.js + parts + locale + css）
node scripts/build.mjs --check   # 校验 lib/client.js 与源文件逐字节一致（提交前必跑）
node scripts/verify.mjs          # 33 项打包/边界/契约校验；--json 可机读
npm test                         # 全部 258 条（core + send + client；显式 glob，勿用裸 node --test）
npm run test:core / test:send / test:client   # 分层跑
```

> `npm test` 的脚本已显式列出 glob；**不要**改成裸 `node --test`——Node 会把 `test/client/snapshot.mjs` 等 helper 当测试执行。当前基线：258 pass / 0 fail（以实际输出为准）。

安装/升级/回滚（**由 Lead 用 danger-full-access 执行**；agent 不自行动手装）：

```bash
# 安装（本地已构建目录）
plugin_manager install_bundle target=/Users/lzx/Documents/GitHub/dsh-team-group/plugins/dsh-group-chat
# 回滚（移除插件；或临时禁用：plugin_manager set_plugin target=@local/dsh-group-chat enabled=false）
plugin_manager remove_bundle target=@local/dsh-group-chat
```

安装后验证：

1. 对话页 tab 行「对话」右侧出现「群聊」；
2. `cordis_inspect_query platform=client provider=Slots method=listSubTree {root:'conversation.view'}` 的 occupants 含 `group-chat`（需页面已鉴权）；
3. DevTools console 无 `__ModuleLoader__` / `data-plugin-css` 报错；
4. 切走再切回群聊，滚动位置保持。

> 加载新 bundle：**关闭并重开 DSH 窗口**。DSH 里 `Cmd+R` 是「重命名会话」，不是刷新页面；HMR 异常时以重开窗口为准。

## 4. 架构硬约束（摘自架构 v1.6.1，违反即返工）

1. **纯 Client 插件**：Host 半（`lib/index.js`）只为满足 bundle 入口约定而存在，v1 不注册路由、不读写会话日志、不新增 Service（v2 启用条件见架构 §3.3 / §4.7，当前不排期）。
2. **视图注册**：`conversation.view` 注册 `{id:'group-chat', order:5, label:localized thunk}`；不覆盖既有 view id（chat/trajectory/context/terminal-panel/fleet/capability）。
3. **数据通路**：客户端 `ctx.sessions.retain(sessionId,{source})` → `binding.eventSource`（`SessionEventWindow`）+ `projectionsBySession[lead].values.agentTeam`；跨会话合并排序键 `(time, sessionIdRank, seq)`；范围=Lead 全部后代，深度 ≤3、会话 ≤32（A10）。
4. **发送通路**：`sessions.binding(target).session.prompt([{type:'text',text}], mode, signal, requestId)`；默认 Lead，`@` 时 Lead + 被 @ 成员；**先 Lead 后成员串行**；`targets>1` 注入 canonical 前缀 `[群聊 · 同发] 收件人：@lead、@ux、@backend` + 固定说明行；四态 `sending/sent/partial/failed`，部分失败只重试失败目标。
5. **颜色**：只用 `--dsw-alias-*` / `--dsw-specific-*` 主题 token（`src/styles` 中允许的 `rgba(0,0,0,…)` 阴影回退除外）；禁止臆造品牌色、硬编码主题色。
6. **DOM 契约冻结**（架构 §6.5.2，不得改名）：`group-chat-feed`、`group-chat-time-divider`、`group-chat-bubble`、`group-chat-bubble-caption`、`group-chat-fold-toggle`、`group-chat-unread-pill[data-count]`、`group-chat-newmessages-hint[data-count]`、`group-chat-filter-banner[data-filter]`+`[data-action=clear-filter]`、`group-chat-readonly-banner`、`group-chat-reconnect-banner`、`group-chat-mention-popup[role=listbox]`+`[role=option][data-mention]`、`group-chat-composer`、`group-chat-send`、`group-chat-target-row[data-targets]`、`group-chat-error[data-retryable]`；消息行 `data-kind`/`data-message-id`/`data-status`；成员 `data-member-kind`/`data-parent`；入群 `data-card=member-join`+`data-creation-id`/`data-pair-order`；任务卡 `data-card=task`+`data-task-*`。
7. **i18n**：文案全部走 `locale/{zh,en}.json`，键集必须完全一致；新增文案同时改 zh/en。
8. **构建约束**：`src/**/*.js`（`src/client/**` 除外）必须是 named export、相对 import 带 `.js`、无 `export default`/`export *`/动态 `import()`/Node API；`src/client/parts/*.part.js` 按文件名序拼接、共享作用域、不得重名。
9. **不改宿主**：不修改 DSH 安装包（asar）、不改 profile 配置；不写用户会话日志。

## 5. 开发/变更流程

1. **先文档后代码**：需求 → `docs/specs/group-chat-prd.md`（F/SC 编号只增不改）；架构/UX 变更 → `docs/architecture`、`docs/ux`；调研结论进 `docs/research`。
2. **契约先行**：改数据/发送/UI 契约时，先更新架构决策记录与 DOM 契约表；测试计划（`tests/design`）同步。
3. **实现**：改 `src/**`，**不要手改 `lib/client.js`**（生成物）；改完必须：
   ```bash
   node scripts/build.mjs && node scripts/verify.mjs && npm test
   ```
4. **locale**：zh/en 同步改，构建会校验键集一致性。
5. **提交前**：`node scripts/build.mjs --check` 必须 fresh；verify 33/33；npm test 全绿；有视觉变更时按 §6 更新证据。
6. **原型门禁**：用户确认 Figma 原型（P1–P12）后才进入实现；原型未确认不得改 UI 源码。

## 6. 质量门与证据

| 门 | 要求 | 证据位置 |
| --- | --- | --- |
| 构建 | `build --check` fresh；`lib/client.js` 由源码确定性生成 | 命令输出 |
| 打包校验 | `node scripts/verify.mjs` **33/33 PASS**（含 locale 键集 149、边界、无 Host 业务、无绝对路径、无 Node 内建） | 命令输出 |
| 单测 | `npm test` **258+ pass / 0 fail** | 命令输出 |
| 性能 | 1000 事件归一化 ≤50ms（本机 M1 中位数 ~1.5ms）；首屏 200 条 ≤250ms | `tests/runs/perf-01.log` |
| 真机走查 | tester 按 `tests/design/click-walk.md` 在 DSH Desktop 真实点击；不得以静态代码阅读代替 | `tests/runs/*.md`、`tests/interactions/click-walk-results.md` |
| 视觉/原型 | 对比 `docs/ux/prototype/*.png`（2× 基线，1440×900）；结构/尺寸/令牌核对 | `tests/artifacts/`、`tests/runs/*.md` |
| 裁定 | tester 给二值 PASS/FAIL，不接受「有条件通过」；HIGH/CRITICAL 即 FAIL | `tests/runs/` 最新记录 |

已知覆盖缺口（task-68 记录，勿当作已覆盖）：折叠展开、任务卡「复制任务 ID」、成员卡动作仅存在性验证；未读浮标/只读历史/768 窄屏为 NA；多目标同发未真机直发（单测覆盖）；视觉像素 diff NOT_APPLICABLE（分辨率基线不同）；纯键盘全流程未执行；虚拟化未启用（首屏 200 + 内存 2000 + 120ms 批量）。

## 7. 交付状态与版本（以 verify 输出为准）

| 项 | 当前值 |
| --- | --- |
| 插件版本 | `0.1.0` |
| 最近验证 bundle | `sha256=2a5eb22cbd4976176d06ec7291e14fab85a73cea8d1e299f1f2ba3765a9f91f7`（504,997 B，task-68 记录；改动源码后会变，以 `node scripts/verify.mjs` 输出为准） |
| build 指纹 | `0.1.0+9a199f0bf3c5`（task-68 记录；失败 caption 与 `data-build` 会显示实际加载版本；重跑构建后以 `lib/client.js` 内 `data-build` 为准） |
| PRD | v0.7.1（F1–F21 / SC1–SC38） |
| 架构 | v1.6.1（含 DOM 契约、决策记录 v1.1–v1.6.1） |
| UX | v3.3；原型 Figma `team-group` P1–P12（导出图 `docs/ux/prototype/01–12*.png`） |
| 已安装验证 | 桌面 profile 已安装并可加载（task-68 PASS，无 HIGH/CRITICAL） |

## 8. 安全与边界

- **不入库**：`.figma/`（本地导出缓存）、`node_modules/`、`.DS_Store`、日志（`tests/runs/perf-*.log` 作为证据例外保留）。
- **不写密钥**：不把 token、API key、cookie、profile 凭据写入仓库或文档；截图与日志提交前脱敏。
- **不碰用户会话**：不修改用户其它会话数据；真机测试只用 `e2e-*` 专用会话或只读查看；不得代用户发消息到其真实会话。
- **安装权限**：`plugin_manager install_bundle/remove_bundle` 需 danger-full-access，由 Lead 执行；agent 不自行安装/卸载/改 profile 配置。
- **不改宿主**：不修改 `/Applications/DeepSeek Harness.app`（asar）与 DSH 内置包。
- **写作用域**：涉及文档/代码/测试的 agent 只写各自任务 writeScopes；跨域改动先找 Lead 协调。

## 9. 文档地图（改前先查）

| 需求 | 文档 |
| --- | --- |
| 产品需求与验收（F/SC） | `docs/specs/group-chat-prd.md` |
| 技术架构、数据/发送/UI 契约、DOM 契约 | `docs/architecture/group-chat-architecture.md` |
| 视觉/交互/文案/令牌 | `docs/ux/group-chat-ux.md` + `docs/ux/prototype.md` + `docs/ux/prototype/*.png` |
| 事件/接口/字段取证 | `docs/research/*.md`（api-feasibility、event-model、member-card-fields、task-card-fields、spikes-v1） |
| 测试设计与走查 | `tests/design/test-plan.md`、`click-walk.md`、`prototype-review.md` |
| 测试记录 | `tests/runs/*.md`、`tests/interactions/*.md`、`tests/artifacts/` |
