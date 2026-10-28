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
| `src/core/{mentions,filter,timeline,constants,protocol}.js` | `computeMentionQuery` / `parseMentions` / `resolveTargets` / `matchesFilter` / `sortMessages` / `limits` / `buildFanoutPrefix` | 使用 parts 内的等价 fallback（行为与 D-B/§5.2 对齐） |

UI 只消费架构 §4.1 的 `ChannelSnapshot` / `ChannelMessage` 字段，不修改数据契约。

## 5. 已实现的行为（对照 PRD F1–F21 / SC1–SC38）

- 频道头（56px：群头像 2×2 + 群聊 + 团队名 + 状态行 + 筛选按钮 + 新消息提示 + 截断提示）
- 消息流：居中时间分隔（日期变化或 ≥5 分钟）、SenderLine、自适应气泡、BubbleCaption、
  居中系统提示、右对齐欢迎提示、M5 文件行、M6 工具折叠行、subagent 名字后缀「· 父名 的子体」
- 卡片消息：入群消息（creator SenderLine + 成员卡：标题/描述/模型/上下文/创建方式/父成员/初始任务折叠/查看会话/查看任务）
  与任务卡（动作标签 + 状态 pill + task id + title + 描述折叠 + 负责人/依赖/完成时间 + 复制任务 ID，紧凑版）
- 折叠：>8 行或 >400 字 → 192px + 56px 渐变遮罩 + 「展开全部（约 N 字）」12px 文本链；展开锚点稳定
- `@` 补全：380px 浮层贴输入卡上沿、↑↓/Enter/Tab/Esc、IME 期间不拦截、chip 整体删除、可寻址集合过滤
- 发送：一条乐观气泡 + 四态（sending/sent/partial/failed）+ 「已同时发送给 …」+ 「已送达 X/Y · 失败：…」+ 重试/复制
- 未读：仅视图内表达（频道头「N 条新消息」+ 消息区「↓ N 条新消息」浮标），tab 无装饰
- 状态：首次加载骨架、无团队空态（输入可用）、无消息空态、加载失败/断线横幅、只读历史（输入 40% 禁用）
- 响应式：容器查询（L ≥1280 / M 1024–1279 / 窄屏 <768），窄屏频道头只留群头像 + 成员数文本
- 主题：颜色只用 `--dsw-alias-*` / `--dsw-specific-*`；暗色由宿主 `body[data-ds-dark-theme]` 切换
- a11y：`role="log"`/`aria-live` 摘要播报、`role="article"`、折叠 `aria-expanded`、combobox 补全、2px 焦点环
- i18n：跟随宿主 LocaleFace `getSnapshot().active`（`subscribe()` 随切换重渲染）；locale 服务不可用时才回退 `navigator.language`，最后默认 zh（D-02）
- 名册口径：频道头成员数 / running 数优先用 `useSessions` 的 `values.agentTeam` 投影修正事件名册（D-03）；投影缺失才退回事件名册
- 降噪兜底：system 类消息若以宿主注入标记开头（`<system-reminder>` / `<skill_content>` / `Current runtime context` / `Time sampled at` 等）不渲染（D-01 双保险，主修复在 T1 core）
- 布局约束（F-01）：`.gc-root`/`.gc-shell` 满高 + `overflow:hidden`，`.gc-scroll` 是唯一滚动区，header/banners/composer 固定；宿主 `conversation.view` 的 `…viewArea` 与 slot 中间 wrapper 用 `:has()` 补成 flex 填满链，`gcFitHostLayout()` 作为宿主版本兜底（卸载恢复 inline style）
- 名册注入（F-02）：`agentTeam` 投影经 `deps.members` 传给 `createClientSessionSource`（适配器与事件名册 union，subagent 保留）；UI 侧 merge 保留为兜底
- 本地 echo 去重（F-07）：模块级 `gcLocalBatches`（clientBatchId→requestIds/targets/sessionIds，TTL 5min、上限 50）经 `deps.localBatches` 交给 core 反查；send-batch 的 `deps.onBatch` 在 prompt 前登记，权威 `user/message` 的 `rpcId` 命中后 `gcMergeMessages` 删除 `local:<batchId>` 气泡，只保留 1 条
- 发送失败诊断（**默认隐藏**，debug 开关打开才显示）：默认 caption 只显示用户可读文案「发送失败：{原因}，已保留原文」（partial：已送达 X/Y · 失败：@名字，重试只补失败项）；**仅当** `localStorage['group-chat:debug'] === '1'` 或 URL `?gc-debug=1` 时，才追加 `（code=… · message=… · stage=… · build=…）`（detail ≤200 字 + build 指纹）。诊断数据本身始终保留在不可见属性里：失败气泡 `data-send-debug` JSON（`reason/code/status/stage/build/message/detail?/failedTargets[]`）、视图根 `data-build=<version+hash>`（供 AX/DevTools/测试读取）。`deliveries=[]` 但有 `diagnostics[0]` 时按诊断展示（stage/code/message 优先）。
  - 打开方式：控制台 `localStorage.setItem('group-chat:debug','1')` 后重开窗口（或直接在 GUI URL 加 `?gc-debug=1`）；关闭：`localStorage.removeItem('group-chat:debug')`。
  - build 指纹由 `scripts/build.mjs` 对全部输入源做 sha256 前 12 位（如 `0.1.0+9a199f0bf3c5`），可确认页面实际加载版本。

## 6. DOM 契约（架构 §6.5.2 冻结，不得改名）

`group-chat-feed`、`group-chat-time-divider`、`group-chat-bubble`、`group-chat-bubble-caption`、
`group-chat-fold-toggle`、`group-chat-unread-pill[data-count]`、`group-chat-newmessages-hint[data-count]`、
`group-chat-filter-banner[data-filter]` + `[data-action=clear-filter]`、`group-chat-readonly-banner`、
`group-chat-reconnect-banner`、`group-chat-mention-popup[role=listbox]` + `[role=option][data-mention][aria-selected]`、
`group-chat-composer`、`group-chat-send`、`group-chat-target-row[data-targets]`、
`group-chat-error[data-retryable]`；消息行 `data-kind`/`data-message-id`/`data-status`；
subagent `data-member-kind=subagent` + `data-parent`；内联 `data-mention`；
欢迎 `data-kind=system` + `data-system-variant=welcome`；
入群消息 `data-card=member-join` + `data-member-id` + `data-member-kind` + `data-member-state` + `data-creation-id` + `data-pair-order`，
动作 `data-action=view-session|view-task|expand-task` + `data-state=enabled|disabled`，字段 `data-field=model|context|create-tool|parent|description|task`；
任务卡 `data-card=task` + `data-task-id`/`-revision`/`-action`/`-status`/`-owner`/`-actor`/`-blocked-by` + `data-replay`，
字段 `data-field=owner|blocked-by|completion-time|description|revision`，动作 `data-action=copy-task-id`。

## 7. 测试

```bash
cd plugins/dsh-group-chat
npm test                        # 全部：core + send + client（显式 glob，排除 helper 模块）
npm run test:client             # 仅客户端（43）
npm run test:core / test:send   # 仅内核 / 仅发送
```

> 注：`node --test` 不带参数时 Node 会把 `test/**` 下的 helper 模块也当成测试文件执行
> （会把 `snapshot.mjs` 的 CLI 顺带跑起来），因此 `test` 脚本使用显式 glob：194 条真实用例。

测试不依赖 DSH 宿主：`test/client/harness.mjs` 提供 mini React（createElement + hooks +
useSyncExternalStore）与假宿主（`window.__ModuleLoader__`、假 `ctx`），加载**真实构建产物**
后用 Mock `ChannelSource` 渲染并断言 DOM 契约。

## 8. 与文档的已知偏差（已由 Lead 裁决）

1. 气泡圆角按发送者区分：**用户气泡 r20 / padding 10×16**（`--gc-user-bubble-radius`），
   **agent/系统气泡 r12 / padding 10×14**（`--gc-bubble-radius`）。架构 §6.7.2 的单一 12 值已被裁决拆分。
2. 发送键：`business-primary` 底 + `bg-base` 箭头（UX §7 / 原型），架构 §6.7.1 的
   `button-primary-fill` + `label-primary-inverted` 描述作废。
3. 系统/欢迎提示横幅位置：按架构 §6.2 放在频道头之下（原型 P11 把只读横幅画在频道头之上，属于说明性帧）。
4. `lib/client.js` 是构建产物，不参与逐行 review；以 `node scripts/build.mjs --check` + 测试为准。

## 9. Figma 对照记录（P1–P12，1440×900，2026-10-28）

对照方法：用 `test/client/snapshot.mjs` 把**真实构建产物**渲染成静态 HTML（暗色 token 取自
`docs/ux/group-chat-ux.md` §11 实测值），Playwright 在 1440×900 / 768×900 / 390×844 下截图，
并用 `getComputedStyle` 读回关键尺寸。预览数据来自 `?gc-preview=1` 内置 fixture（与 P2/P5/P10/P11/P12 的
消息形态一致；成员数/时间等数值随 fixture，属于内容差异而非样式差异）。

| 帧 | 覆盖内容 | 实测/断言 | 结论 |
| --- | --- | --- | --- |
| P1 tab 行 + 频道头 | tab 由宿主渲染（13/500 + 2px 下划线 + gap 32，归属 `conversation.view` 注册）；频道头 | 频道头 `height:56px`、`padding:0 28px`、`border-bottom:1px --dsw-alias-border-l3`；群头像 32/radius 8（2×2 拼贴）；标题 14/500；团队名 14/400 secondary；状态行 11/400 + 6px 状态点；右侧单个 32×32 筛选按钮 | ✅ 一致（tab 样式由宿主提供，本插件只注册 label） |
| P2 主界面 | 时间分隔 / 欢迎提示 / member_card / 气泡 / 紧凑任务卡 / 未读浮标 / 输入区 | 内容列 920（x=391，1440 内容区 1180 居中）；时间分隔 12/400 caption 居中；气泡 `max-width 600`、agent `radius 12 / padding 10×14`、user `radius 20 / padding 10×16`、`bg-layer-2`/`specific-bubble`；卡片 520 / radius 12 / padding 16 / `bg-layer-1` + `border-l2`；输入卡 952×96 / radius 28 | ✅ 一致 |
| P3 折叠/展开 | 8 行 192px + 56px 渐变遮罩 + 12px 文本链 | `.gc-foldable{max-height:192px}`；遮罩 `--gc-fold-mask:56px` 渐变（背景色变量，非图片）；`aria-expanded` 双向切换；折叠后 meta「共 N 字 · 显示前 8 行」 | ✅ 一致（增加「共 N 字」元行，原型未画但 UX §5 允许） |
| P4 @ 补全 | 380 宽浮层贴输入卡上沿、键盘高亮、chip | 浮层 380 / radius 14 / `--dsw-specific-menu` 底 + `border-l2` + `--dsw-shadow-lv2`；列表项 46px；高亮行 `interactive-bg-hover` + 左 2px business-primary 竖条；↑↓/Enter/Tab/Esc；IME 期间不拦截 | ✅ 一致 |
| P5 发送四态 | 发送中 / 已发送 / 部分失败 / 失败 | `data-status` ∈ sending/sent/partial/failed；发送中气泡 60% 透明 + **气泡外左侧** 11px「发送中…」；成功「已同时发送给 Lead、@ux、@backend」；partial「已送达 2/3 · 失败：@pm」+ 重试；失败红边 + 「发送失败：{reason}，已保留原文」+ 重试/复制 | ✅ 一致（失败原因走 send 的 `messageKey` i18n） |
| P6 subagent | 同形 + 名字后缀、无缩进/连接线 | `data-member-kind=subagent` + `data-parent`；名字后缀「· {parent} 的子体」11px caption；无缩进、无连接线 | ✅ 一致 |
| P7 空态/骨架 | 无团队 / 无消息 / 骨架 | 空态居中 @ 图标 48 圆底 + 标题 14/600 + 说明 12 caption；骨架 5 行（avatar 32 + 3 条 bar，`bg-skeleton`，`prefers-reduced-motion` 关闭动画）；无团队空态输入区**可用**（D-C） | ✅ 一致 |
| P8 1280 窄桌面 | 内容列 856 | 容器 ≤1079 → `--gc-content-w:856px` | ✅ 一致 |
| P9 768 窄屏 | 720 流式 / 气泡 70% / 频道头只剩头像+状态 | 实测 768：列 720（x=24）、气泡 wrap max 70%、输入卡 720×88、频道头 56（标题/团队名隐藏）、`scrollWidth===viewport`（无横向滚动） | ✅ 一致 |
| P10 成员加入 | 欢迎提示 + creator 消息头 + 卡片 | 右对齐 12/400 business-primary + 11px 时间；creator：头像 32 + 名字 14/600 + 角色小标签 11 + 时间 11 贴右；卡片字段 label 68px（x=16）/ value x=84；空值隐藏行；`data-card=member-join` 等契约齐全 | ✅ 一致（卡片左缘与名字左对齐；原型卡片比名字再左 20px，偏差 8px 内） |
| P11 只读/筛选 | 横幅 / 频道头后缀 / 输入 40% / 筛选条 | 只读：`group-chat-readonly-banner` 32 高/radius 8/`bg-layer-2` + 频道头「· 团队已结束」+ 输入 40% 禁用 + 占位「团队已结束，群聊为只读历史」；筛选：`group-chat-filter-banner[data-filter]`「正在只看 scout（n 条）· 清除」+ 频道头「· 筛选: scout」 | ✅ 一致（**横幅位置按架构 §6.2 放在频道头之下**；原型 P11 把它画在频道头之上，属说明性帧） |
| P12 任务卡 | 6 变体 + 紧凑版 | 头部=actor SenderLine（头像 32 + 14/600 + 角色 11 + 时间 11）；动作标签 11 + 状态 pill 20/999 + task id mono；subject 14/600；描述 11.5/17（create 2 行 clamp，>100 字才显示展开）；信息行 label 68 / value 11.5 / 行高 20；依赖为空整行隐藏；「复制任务 ID」11.5 文字链；紧凑版仅「· name 时间 + 动作行 + 标题 + 负责人 + 复制」 | ✅ 一致（动作/状态严格四枚举，无「返工/失败」） |
| token / 主题 | 只用 `--dsw-alias-*` / `--dsw-specific-*` | CSS 中除两处 `rgba(0,0,0,…)` 阴影回退外无裸色值；暗色由宿主切换 | ✅ |

**已知偏差（均已在完成报告记录）**

1. 气泡圆角按发送者区分（user 20 / agent 12），依据 Lead 裁决与原型 §5（架构 v1.6 §6.7.2 的单一 12 已作废）。
2. 发送键为 `state-business-primary` 底 + `bg-base` 箭头（UX §7/原型），架构 §6.7.1 的 `button-primary-fill` 描述作废。
3. 只读/筛选横幅放在频道头之下（架构 §6.2 组件树顺序；原型为说明性排版）。
4. P2 紧凑任务卡用 P12 G/H/I 的「· name 时间」小标头（非头像行）；两种紧凑形态在原型中并存。
5. 频道头采用「标题行 + 状态行」两行结构以对齐原型（架构只写 56px 高度）；高度/内边距与架构一致。
6. 虚拟化：v1 以「首屏 200 + 内存 2000 + 120ms 批量」控制渲染量，未启用 `@tanstack/react-virtual`（后续性能专项）。
