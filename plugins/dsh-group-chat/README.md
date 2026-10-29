# @local/dsh-group-chat · 群聊视图插件

DSH Web GUI 对话页里的并列视图 **「群聊」**（`conversation.view`，`id=group-chat`，`order=5`）：
把 **lead 主会话 + 全部 teammate 会话 + 全部 subagent 子会话** 聚合成一条聊天气泡流，
并支持 `@` 一个/多个成员的多目标同发（一条气泡 + 「已同时发送给 …」说明行）。

本目录实现了架构文档 `docs/architecture/group-chat-architecture.md` v1.6 的 **T2 部分**
（视图壳、交互、插件脚手架、拼接构建、客户端测试）。数据内核（`src/core`）、
客户端适配器（`src/adapters`）、发送编排（`src/send`）与空壳 Host 半（`lib/index.js`）
由 T1/T3 提供；本包在它们缺席时自动降级（不会白屏）。

---

## 1. 目录

```
plugins/dsh-group-chat/
├── package.json                  # dsh.bundle.patch + dsh.client{platform,inject} + exports ./client
├── cordis.patch.yml              # 插入一行 id=group-chat（Host 半空壳）
├── icon.svg                      # 市场/设置页图标
├── locale/{zh,en}.json           # i18n 源（构建期内联同一份字典，键集由构建校验）
├── lib/client.js                 # ★ 生成物（scripts/build.mjs 产出，勿手改）
├── lib/index.js                  # Host 半空壳（T1/T3 负责；本构建不生成）
├── src/client/
│   ├── entry.js                  # apply(ctx)：样式注入 + locale + conversation.view 注册
│   └── parts/                    # 按文件名顺序拼接进 lib/client.js
│       ├── 00-boot.part.js       # 模块桥（可选依赖）、常量、日志
│       ├── 10-locale.part.js     # t() / 复数 / 时间格式化
│       ├── 20-store.part.js      # 纯函数状态与选择器（排序/筛选/折叠/caption/分栏）
│       ├── 30-primitives.part.js # Avatar / StatusDot / Pill / SenderLine / Bubble / RowActions
│       ├── 40-cards.part.js      # MemberJoinCard(M8) / TaskCard(M9)
│       ├── 50-feed.part.js       # MessageFeed / TimeDivider / 各类消息行 / 折叠
│       ├── 60-header.part.js     # ChannelHeader / Banners / FilterMenu
│       ├── 70-composer.part.js   # Composer / TargetRow / MentionPopup
│       ├── 80-states.part.js     # 骨架 / 空态 / 错误态 / 只读
│       └── 90-view.part.js       # GroupChatView 容器（订阅、滚动、未读、发送）
├── src/styles/group-chat.css     # 只含布局/尺寸；颜色全部 var(--dsw-*)
├── scripts/build.mjs             # 零依赖拼接构建（ESM → 单文件浏览器 bundle）
└── test/client/                  # node --test：构建、渲染契约、纯逻辑、i18n
```

## 2. 构建

```bash
cd plugins/dsh-group-chat
node scripts/build.mjs           # 生成 lib/client.js
node scripts/build.mjs --check   # 校验 lib/client.js 与源文件一致（CI 用）
```

构建规则（零依赖、确定性输出）：

1. 扫描 `src/**/*.js`（`src/client/**` 除外）→ 每个文件被转成**独立作用域 factory**，
   用 `__def(path, factory)` 注册；相对 import 被改写为 `__req('<plugin-relative path>')`。
   → 要求：只用 **named export**；`import` 目标必须是相对路径且带 `.js`；无 `export default` /
   `export * from` / 动态 `import()` / Node API。
2. `src/client/parts/*.part.js` 按文件名**字典序**拼接（共享同一作用域，不要重名），
   再拼 `src/client/entry.js`，整体包进 `window.__ModuleLoader__.load({ id:'@local/dsh-group-chat', factory })`。
3. `locale/zh.json`、`locale/en.json` 内联为 `GC_LOCALE`；键集必须**完全一致**（构建期校验）。
4. `src/styles/group-chat.css` 内联为 `GC_CSS`，由 `apply()` 注入
   `<style data-plugin-css="group-chat">`（`ctx.effect` 卸载时回收）。
5. 产物用 `new vm.Script()` 做语法校验后才写盘。

## 3. 安装（由 Lead 执行，本任务不安装）

```bash
# 本地目录安装（Lead 用 danger-full-access 执行）
plugin_manager install_bundle target=/Users/lzx/Documents/GitHub/dsh-team-group/plugins/dsh-group-chat
# 回滚
plugin_manager set_plugin target=@local/dsh-group-chat enabled=false
```

安装后验证：`cordis_inspect_query platform=client provider=Slots method=listSubTree {root:'conversation.view'}`
的 occupants 含 `group-chat`；对话页 tab 行「对话」右侧出现「群聊」。纯 client 变更可 HMR，无需重启 Host。

## 4. 与数据层（T1/T3）的接口

| 依赖 | 期望导出 | 缺失时 |
| --- | --- | --- |
| `src/adapters/client-session-source.js` | `createClientSessionSource({ctx, channelId, sessionId}) → ChannelSource` | 视图进入「数据源不可用」错误态（可重试），不白屏 |
| `src/adapters/mock-source.js` / `src/adapters/index.js` | `class MockChannelSource`（或 `createChannelSource('mock', deps)`） | 预览开关 `?gc-preview=1` 改用内置 fixture 源（`85-preview.part.js`） |
| `src/send/send-batch.js` | `sendChannelBatch({text, mentions, targets, channelId, clientBatchId, deps}) → {status, deliveries[]}` | 降级为内置 `prompt` 直发（仅供开发调试，无 canonical 前缀） |
| `src/core/{markdown,fold,turns,roster,mentions,filter,timeline,constants,protocol}.js` | `computeMentionQuery` / `parseMentions` / `resolveTargets` / `matchesFilter` / `sortMessages` / `limits` / `buildFanoutPrefix` | 使用 parts 内的等价 fallback（行为与 D-B/§5.2 对齐） |

UI 只消费架构 §4.1 的 `ChannelSnapshot` / `ChannelMessage` 字段，不修改数据契约。

## 5. 已实现的行为（PRD v0.8 F1–F30 / SC1–SC48 · 架构 v1.7.1 · Figma v4.1）

- 频道头（`min-height 56px` 自适应两行：群头像 2×2 + 群聊 + 团队名 + 状态行 `{n} 名成员 · {m} 工作中 · {k} 等待` + **成员条（全部成员、禁止 +N）** + 筛选按钮 + 新消息提示 + 截断提示）
- 消息流：居中时间分隔（日期变化或 ≥5 分钟）、SenderLine、自适应气泡、BubbleCaption；**空文本 agent 消息不渲染**（无空气泡/操作图标，F31）、**纯工具轮次的 delivery 工具摘要也按用户要求有意抑制**（不显示「N 个工具调用」，非缺陷；工具过程仅可在轨迹侧栏查看）、
  居中系统提示、**居中欢迎提示（11.5px label-tertiary）**、M5 文件行、subagent 名字后缀「· 父名 的子体」；
  **M6 工具摘要行已作废**（工具过程只在轨迹侧栏查看）
- **Markdown 安全子集渲染**：气泡正文走 `core/markdown` 受控 AST（粗体/斜体/行内码/围栏代码块[语言标签]/有序无序列表/**GFM 表格**/安全链接/段落换行），`data-md="rich|plain"`、`.gc-md-*`；表格 `table[data-md-table]`（thead/tbody/th/td、align、边框/表头底色/斑马纹/横向滚动，非法表格降级段落）；**禁止 innerHTML**；链接仅 `http/https/mailto`（渲染端二次 `isSafeUrl` 防御），其它 scheme 降级纯文本；解析异常整段纯文本，内容不丢
- 卡片消息：入群消息（creator SenderLine + 成员卡：标题/描述/模型/上下文/创建方式/父成员/初始任务折叠/查看会话/查看任务）
  与**任务卡 v5**（独立卡片：左侧 3px 状态色条 + 任务图标 + 动作标签 + 状态 pill + task id + subject + 描述折叠 + 负责人头像/依赖/完成时间；**无「复制任务 ID」**；正常与紧凑版**都渲染操作者头像**）
- 折叠：默认展示**前 50 行**（1100px）+ 56px 渐隐遮罩 + 12px 文本链「显示前 50 行 · 展开全部（共 N 行）/收起」；系统/欢迎/同发说明/卡片不折叠；展开锚点稳定
- **单一输入器**：视图激活期隐藏宿主 composer（`body.gc-view-group-chat` + `[data-conversation-region="composer"]`/`[data-composer-seat]`）；2×rAF 自检失败自动降级为「兼容模式」提示并恢复宿主输入器（不丢消息）；Enter 发送 / Shift+Enter 换行 / IME 组合期不发送；发送后清空不回填
- `@` 交互：**仅键入 `@` 触发**；380px 实底浮层贴输入卡上沿（↑↓/Enter/Tab/Esc、IME 不拦截）；条目 = 头像 + 名字 + **角色描述**（不显示运行状态）；**chips 在输入框下方**（默认 `@Lead` business 实底白字、mention chip business-tertiary 底、整块删除）
- 成员条 + 轨迹侧栏：频道头 **全部成员**（禁止 +N；每项 = 26px 头像（CSS/JS 统一，窄屏 24/22）+ **完整名字 12px** + 状态点；**换行优先**（可两行，row-gap 4，头部 `height:auto; min-height:56` 随行数增长），**无 overflow-x 横向滚动、无 mask 渐隐、不裁切首尾**；绿=工作中/灰=等待；768 也全显）；点头像开右侧 380px `agent-trajectory-panel`（窄屏全屏，`role=dialog aria-modal`），轮次来自 `core/turns.aggregateTurns(source.getEvents(sessionId))`（最新在前、状态/摘要/工具数），Esc/遮罩/× 关闭并还原焦点
- 发送：一条乐观气泡 + 四态（sending/sent/partial/failed）+ 「已同时发送给 …」+ 「已送达 X/Y · 失败：…」+ 重试/复制；**本地 echo 在权威消息到达时由 UI 替换（clientBatchId / meta.rpcId → 删除 `local:<batchId>`），同一次发送始终 1 条气泡**
- 未读：仅视图内表达（频道头「N 条新消息」+ 消息区「↓ N 条新消息」浮标），tab 无装饰
- 状态：首次加载骨架、无团队空态（输入可用）、无消息空态、加载失败/断线横幅、只读历史（输入 40% 禁用）
- 响应式：容器查询（L ≥1280 / M 1024–1279 / 窄屏 <768），窄屏频道头只留群头像 + 成员状态文本
- 主题：颜色只用 `--dsw-alias-*` / `--dsw-specific-*`；暗色由宿主 `body[data-ds-dark-theme]` 切换
- a11y：`role="log"`/`aria-live` 摘要播报、`role="article"`、折叠 `aria-expanded`、combobox 补全、消息操作图标 `aria-label`、2px 焦点环
- i18n：跟随宿主 LocaleFace `getSnapshot().active`（`subscribe()` 随切换重渲染）；locale 服务不可用时才回退 `navigator.language`，最后默认 zh（D-02）
- 名册口径：频道头成员数 / 状态优先用 `useSessions` 的 `values.agentTeam` 投影修正事件名册（D-03）；投影缺失才退回事件名册
- 名册注入（F-02）：`agentTeam` 投影经 `deps.members` 传给 `createClientSessionSource`（适配器与事件名册 union，subagent 保留）；UI 侧 merge 保留为兜底
- 降噪兜底：system 类消息若以宿主注入标记开头（`<system-reminder>` / `<skill_content>` / `Current runtime context` / `Time sampled at` 等）不渲染（D-01 双保险，主修复在 T1 core）；`subagent-settled` 父会话通知副本不渲染（core 为主 + UI 兜底）
- 布局约束（F-01）：`.gc-root`/`.gc-shell` 满高 + `overflow:hidden`，`.gc-scroll` 是唯一滚动区，header/banners/composer 固定；宿主 `conversation.view` 的 `…viewArea` 与 slot 中间 wrapper 用 `:has()` 补成 flex 填满链，`gcFitHostLayout()` 作为宿主版本兜底（卸载恢复 inline style）
- 去重接线（F-07/F30）：模块级 `gcLocalBatches`（clientBatchId→requestIds/targets/text，TTL 5min、上限 50）经 `deps.localBatches` 交给 core 反查；send-batch 的 `deps.onBatch` 在 prompt 前登记、终态 `closed`；**权威消息到达后 UI 删除 `local:<batchId>`**（唯一能看到 echo 的层），只保留 1 条气泡
- 发送失败诊断（**默认隐藏**，debug 开关打开才显示）：默认 caption 只显示用户可读文案「发送失败：{原因}，已保留原文」（partial：已送达 X/Y · 失败：@名字，重试只补失败项）；**仅当** `localStorage['group-chat:debug'] === '1'` 或 URL `?gc-debug=1` 时，才追加 `（code=… · message=… · stage=… · build=…）`（detail ≤200 字 + build 指纹）。诊断数据本身始终保留在不可见属性里：失败气泡 `data-send-debug` JSON（`reason/code/status/stage/build/message/detail?/failedTargets[]`）、视图根 `data-build=<version+hash>`（供 AX/DevTools/测试读取）。`deliveries=[]` 但有 `diagnostics[0]` 时按诊断展示（stage/code/message 优先）。
  - 打开方式：控制台 `localStorage.setItem('group-chat:debug','1')` 后重开窗口（或直接在 GUI URL 加 `?gc-debug=1`）；关闭：`localStorage.removeItem('group-chat:debug')`。
  - build 指纹由 `scripts/build.mjs` 对全部输入源做 sha256 前 12 位（如 `0.1.0+39821306f18c`），可确认页面实际加载版本。

## 6. DOM 契约（架构 §6.5.2 冻结，不得改名）

`group-chat-feed`、`group-chat-time-divider`、`group-chat-bubble`、`group-chat-bubble-caption`、
`group-chat-fold-toggle`、`group-chat-unread-pill[data-count]`、`group-chat-newmessages-hint[data-count]`、
`group-chat-filter-banner[data-filter]` + `[data-action=clear-filter]`、`group-chat-readonly-banner`、
`group-chat-reconnect-banner`、`group-chat-mention-popup[role=listbox]` + `[role=option][data-mention][aria-selected]`、
`group-chat-composer`、`group-chat-send`、`group-chat-target-row[data-targets]`、
`group-chat-error[data-retryable]`、`group-chat-composer-hint`、`group-chat-target-chips`；消息行 `data-kind`/`data-message-id`/`data-status`；
subagent `data-member-kind=subagent` + `data-parent`；内联 `data-mention`；
欢迎 `data-kind=system` + `data-system-variant=welcome`；
入群消息 `data-card=member-join` + `data-member-id` + `data-member-kind` + `data-member-state` + `data-creation-id` + `data-pair-order`，
动作 `data-action=view-session|view-task|expand-task` + `data-state=enabled|disabled`，字段 `data-field=model|context|create-tool|parent|description|task`；
任务卡 `data-card=task` + `data-task-id`/`-revision`/`-action`/`-status`/`-owner`/`-actor`/`-blocked-by` + `data-replay`，
`data-card-accent` ∈ {pending, in_progress, completed, deleted}、`data-card-avatar`（操作者头像，全部任务卡必有）、`data-task-owner-avatar`，
字段 `data-field=owner|blocked-by|completion-time|description|revision`；消息操作图标 `data-action=copy-message|open-session`（**不存在 copy-task-id**）；
Markdown 容器 `data-md="rich|plain"` + `.gc-md-strong/.gc-md-em/.gc-md-code/.gc-md-pre/.gc-md-ul/.gc-md-ol/.gc-md-li/.gc-md-link` + `[data-md-link]`/`pre[data-lang]`；
折叠链接 `group-chat-fold-toggle[data-line-count]`；
成员条 `group-chat-member-strip` + 成员 `data-member-id`/`data-member-state=working|waiting` + `data-action=open-trajectory`；
轨迹侧栏 `agent-trajectory-panel[data-member-id]` + `agent-trajectory-overlay` + `data-action=close-trajectory` + `agent-trajectory-turn[data-turn-index][data-turn-status]` + `agent-trajectory-load-older`；
宿主 composer 隐藏标记 `body.gc-view-group-chat`。

## 7. 测试

```bash
cd plugins/dsh-group-chat
npm test                        # 全部：core + send + client（显式 glob，排除 helper 模块）
npm run test:client             # 仅客户端（63）
npm run test:core / test:send   # 仅内核 / 仅发送
```

> 注：`node --test` 不带参数时 Node 会把 `test/**` 下的 helper 模块也当成测试文件执行
> （会把 `snapshot.mjs` 的 CLI 顺带跑起来），因此 `test` 脚本使用显式 glob：当前基线 **303 pass / 0 fail**（core 169 / send 71 / client 63；验收用例 181 条，tester 最终 PASS）。

测试不依赖 DSH 宿主：`test/client/harness.mjs` 提供 mini React（createElement + hooks +
useSyncExternalStore）与假宿主（`window.__ModuleLoader__`、假 `ctx`），加载**真实构建产物**
后用 Mock `ChannelSource` 渲染并断言 DOM 契约。

## 7.5 冷启动与加载态（task-110）

- `createClientSessionSource` 的 `open()` 会等待根会话 `retain.ready`（默认 1.5s 超时）；本插件传 **`readyTimeoutMs: 3000`**，大 session 更稳。
- open resolve 前 show **骨架**；若 ready 超时返回空页但后续 ready 仍会补数据，UI 保持 **`awaitingFirstBatch` 骨架**（宽限 10s），**不闪「团队还没有发言」空态**；首批数据到达即清空骨架。
- `sync()` 返回**全量消息**，按 id 合并 → 冷启动补齐历史**不重复**；首屏/增量到达后自动贴底或保持锚点。

## 8. 已知限制（architect UI 复审遗留，本轮明确降级）

| 项 | 现状 | 原因/计划 |
| --- | --- | --- |
| M2 真实高度测量 | 折叠用 `core/fold` 行数近似（段落/列表/代码块按 `value` 换行折算），未做渲染后 DOM 高度二次校正 | 虚拟化未启用、行高近似已满足 50 行口径；后续性能专项再做 ResizeObserver 校正 |
| M5 轨迹侧栏分页/focus trap | 已具备 `role=dialog`/`aria-modal`、Esc 关闭并还原焦点、遮罩/× 关闭；分页「加载更早轮次」按钮仅在 `hasOlder` 时出现，当前轮次全量渲染（≤20 轮一次），未做真正 focus trap | 侧栏数据来自已 retain 窗口，轮次量小；focus trap 待后续 a11y 专项 |
| M8 chips failed 语义 | 发送失败后 chips 不回填（按 F24「发送后清空不回填」），失败气泡保留原文与重试；未把 chip 恢复到输入区 | 恢复 chips 涉及草稿一致性，已列入后续迭代 |
| 欢迎提示真机样例 | 仅有组件测试与静态预览截图；tester 走查记录中未单独覆盖「欢迎提示」真机帧 | 功能已实现并居中（11.5px tertiary）；补拍成本低，列入下一轮视觉走查 |

## 8.1 与文档的已知偏差（已由 Lead 裁决）

1. 气泡圆角按发送者区分：**用户气泡 r20 / padding 10×16**（`--gc-user-bubble-radius`），
   **agent/系统气泡 r12 / padding 10×14**（`--gc-bubble-radius`）。架构 §6.7.2 的单一 12 值已被裁决拆分。
2. 发送键：`business-primary` 底 + `bg-base` 箭头（UX §7 / 原型），架构 §6.7.1 的
   `button-primary-fill` + `label-primary-inverted` 描述作废。
3. 系统/欢迎提示横幅位置：按架构 §6.2 放在频道头之下（原型 P11 把只读横幅画在频道头之上，属于说明性帧）。
4. `lib/client.js` 是构建产物，不参与逐行 review；以 `node scripts/build.mjs --check` + 测试为准。

## 8.5 v1.7 / Figma v4.1 实现要点（F22–F29）

- **Markdown（F22）**：`core/markdown.js` 受控 AST → React 节点（`strong/em/code/pre/list/link`，`.gc-md-*`；`data-md="rich|plain"`；链接仅 http/https/mailto，`target=_blank rel=noopener`）；**禁止 innerHTML**；模块缺失/解析异常自动降级纯文本。
- **折叠（F29）**：默认前 **50 行**（1100px）+ 56px 渐隐 + `group-chat-fold-toggle[data-line-count]`「展开全部（共 N 行）/收起」；系统/欢迎/同发说明/卡片不折叠。
- **单一输入器（F24）**：视图激活期 `body.gc-view-group-chat` + CSS 隐藏宿主 `[data-conversation-region="composer"]`/`[data-composer-seat]`；2×rAF 自检失败 → 降级（移除标记、显示 `composer.hostFallback` 提示，不丢消息）；Enter 发送 / Shift+Enter 换行 / IME 安全。
- **@ 交互（F25）**：仅键入 `@` 触发；chips 在输入框**下方**（默认 `@Lead` business 实底白字，mention chip 为 business-tertiary 底）；补全条目 = 头像 + 名字 + **角色描述**（不显示运行状态）；浮层实底不透明；提示仅 `composer.hint`。
- **成员条 + 轨迹侧栏（F26）**：频道头成员条（**全部成员、禁止 +N**；换行优先，超宽横向滚动 + 两端 16px 渐隐；头像 26/24/22 响应式；working=绿/waiting=灰；768 也全显）；点头像开右侧 380px `agent-trajectory-panel`（窄屏全屏），轮次来自 `core/turns.aggregateTurns(source.getEvents(sessionId))`（窗口无事件/未知会话时才按该成员 agent_output 降级），Esc/遮罩/× 关闭。
- **作用域（F27）**：任意 member session 打开群聊 → `resolveLeadSessionId`（parentSession 链 ≤4 跳、防环）展示 lead 频道全量。
- **降噪（F28）**：M6 工具摘要行作废；消息操作为图标 `copy-message`/`open-session` + `aria-label`；任务卡 v5（左侧 3px 状态条 + 任务图标 + 状态 pill + 负责人头像；移除「复制任务 ID」；操作者头像必渲染）；欢迎提示居中。
- **F5 去重（H1 已修）**：权威消息带 `clientBatchId` 或 `meta.rpcId`（经 `gcLocalBatches` 反查）时，`gcMergeMessages` 删除 `local:<batchId>` 并补 clientBatchId——UI 负责替换、始终 1 条气泡；core/fanout 负责多副本合并与 deliveries。

## 9. Figma 对照记录（v4.1 基线；P1–P13，1440×900）

> 本表为 v4.1 复审后的实现对照（旧 v3.3 的 8 行折叠 / 右对齐欢迎 / 复制任务 ID / 成员条 5+N 均已作废）。
> P2 `49:1765` / P3 `51:2325` / P4 `50:1934` / P10 `21:954` / P12 `51:2099` / P13 `50:1972`。

对照方法：用 `test/client/snapshot.mjs` 把**真实构建产物**渲染成静态 HTML（暗色 token 取自
`docs/ux/group-chat-ux.md` §11 实测值），Playwright 在 1440×900 / 768×900 / 390×844 下截图，
并用 `getComputedStyle` 读回关键尺寸。预览数据来自 `?gc-preview=1` 内置 fixture（与 P2/P5/P10/P11/P12 的
消息形态一致；成员数/时间等数值随 fixture，属于内容差异而非样式差异）。

| 帧 | 覆盖内容 | 实测/断言 | 结论 |
| --- | --- | --- | --- |
| P1 tab 行 + 频道头 | tab 由宿主渲染（13/500 + 2px 下划线 + gap 32，归属 `conversation.view` 注册）；频道头 | 频道头 `height:56px`、`padding:0 28px`、`border-bottom:1px --dsw-alias-border-l3`；群头像 32/radius 8（2×2 拼贴）；标题 14/500；团队名 14/400 secondary；状态行 11/400 + 6px 状态点；右侧单个 32×32 筛选按钮 | ✅ 一致（tab 样式由宿主提供，本插件只注册 label） |
| P2 主界面 | 时间分隔 / 欢迎提示 / member_card / 气泡 / 紧凑任务卡 / 未读浮标 / 输入区 | 内容列 920（x=391，1440 内容区 1180 居中）；时间分隔 12/400 caption 居中；气泡 `max-width 600`、agent `radius 12 / padding 10×14`、user `radius 20 / padding 10×16`、`bg-layer-2`/`specific-bubble`；卡片 520 / radius 12 / padding 16 / `bg-layer-1` + `border-l2`；输入卡 952×96 / radius 28 | ✅ 一致 |
| P3 折叠/展开 | **前 50 行（1100px）+ 56px 渐隐 + 12px 文本链** | `.gc-foldable{max-height:1100px}`（`--gc-fold-max`）；遮罩 `--gc-fold-mask:56px` 渐变（背景色变量，非图片）；`aria-expanded` 双向切换；`data-line-count`；折叠态 meta「显示前 50 行」+ 链接「展开全部（共 N 行）」 | ✅ 一致（v1.7 50 行口径） |
| P4 @ 补全 | 380 宽浮层贴输入卡上沿、键盘高亮、chip | 浮层 380 / radius 14 / `--dsw-specific-menu` 底 + `border-l2` + `--dsw-shadow-lv2`；列表项 46px；高亮行 `interactive-bg-hover` + 左 2px business-primary 竖条；↑↓/Enter/Tab/Esc；IME 期间不拦截 | ✅ 一致 |
| P5 发送四态 | 发送中 / 已发送 / 部分失败 / 失败 | `data-status` ∈ sending/sent/partial/failed；发送中气泡 60% 透明 + **气泡外左侧** 11px「发送中…」；成功「已同时发送给 Lead、@ux、@backend」；partial「已送达 2/3 · 失败：@pm」+ 重试；失败红边 + 「发送失败：{reason}，已保留原文」+ 重试/复制 | ✅ 一致（失败原因走 send 的 `messageKey` i18n） |
| P6 subagent | 同形 + 名字后缀、无缩进/连接线 | `data-member-kind=subagent` + `data-parent`；名字后缀「· {parent} 的子体」11px caption；无缩进、无连接线 | ✅ 一致 |
| P7 空态/骨架 | 无团队 / 无消息 / 骨架 | 空态居中 @ 图标 48 圆底 + 标题 14/600 + 说明 12 caption；骨架 5 行（avatar 32 + 3 条 bar，`bg-skeleton`，`prefers-reduced-motion` 关闭动画）；无团队空态输入区**可用**（D-C） | ✅ 一致 |
| P8 1280 窄桌面 | 内容列 856 | 容器 ≤1079 → `--gc-content-w:856px` | ✅ 一致 |
| P9 768 窄屏 | 720 流式 / 气泡 70% / 频道头只剩头像+状态 | 实测 768：列 720（x=24）、气泡 wrap max 70%、输入卡 720×88、频道头 56（标题/团队名隐藏）、`scrollWidth===viewport`（无横向滚动） | ✅ 一致 |
| P10 成员加入 | **居中欢迎提示** + creator 消息头 + 卡片 | 欢迎提示**居中 11.5px label-tertiary**；creator：头像 32 + 名字 14/600 + 角色小标签 11 + 时间 11 贴右；卡片字段 label 68px（x=16）/ value x=84；空值隐藏行；`data-card=member-join` 等契约齐全 | ✅ 一致（v1.7 改为居中/11.5 tertiary） |
| P11 只读/筛选 | 横幅 / 频道头后缀 / 输入 40% / 筛选条 | 只读：`group-chat-readonly-banner` 32 高/radius 8/`bg-layer-2` + 频道头「· 团队已结束」+ 输入 40% 禁用 + 占位「团队已结束，群聊为只读历史」；筛选：`group-chat-filter-banner[data-filter]`「正在只看 scout（n 条）· 清除」+ 频道头「· 筛选: scout」 | ✅ 一致（**横幅位置按架构 §6.2 放在频道头之下**；原型 P11 把它画在频道头之上，属说明性帧） |
| P12 任务卡 v5 | 6 变体 + 紧凑版 | 独立卡片 + **左侧 3px 状态色条**（`data-card-accent`）+ 任务图标 + 动作标签 13/500 + 状态 pill 20/999 + task id mono + subject 14/600 + 描述 11.5/17 + 负责人头像 20/名字（空→「未认领」）+ 依赖「被 … 阻塞/无」+ 完成时间（仅 completed）；**无「复制任务 ID」**；**正常/紧凑都渲染操作者头像**（`data-card-avatar`） | ✅ 一致（v1.7 重设计） |
| P13 轮次轨迹 | 右侧 380px 抽屉、轮次列表、Esc/遮罩关闭 | `agent-trajectory-panel` 380px（窄屏全屏）+ 遮罩 + 头部（头像/名字/状态/模型）+ 轮次行（时间/`#index`/状态/2 行摘要/工具数）+ Esc/×/遮罩关闭并还原焦点 | ✅ 一致（无分页/focus trap，见 §8 限制） |
| token / 主题 | 只用 `--dsw-alias-*` / `--dsw-specific-*` | CSS 中除阴影/遮罩/渐隐用的 `rgba(0,0,0,…)` 外无裸色值；暗色由宿主切换 | ✅ |

**已知偏差（均已在完成报告记录）**

1. 气泡圆角按发送者区分（user 20 / agent 12），依据 Lead 裁决与原型 §5（架构 v1.6 §6.7.2 的单一 12 已作废）。
2. 发送键为 `state-business-primary` 底 + `bg-base` 箭头（UX §7/原型），架构 §6.7.1 的 `button-primary-fill` 描述作废。
3. 只读/筛选横幅放在频道头之下（架构 §6.2 组件树顺序；原型为说明性排版）。
4. P2 紧凑任务卡用 P12 G/H/I 的「· name 时间」小标头（非头像行）；两种紧凑形态在原型中并存。
5. 频道头采用「标题行 + 状态行」两行结构以对齐原型（架构只写 56px 高度）；高度/内边距与架构一致。
6. 虚拟化：v1 以「首屏 200 + 内存 2000 + 120ms 批量」控制渲染量，未启用 `@tanstack/react-virtual`（后续性能专项）。
