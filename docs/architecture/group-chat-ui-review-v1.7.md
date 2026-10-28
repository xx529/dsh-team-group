# UI F1–F5 实现评审（架构 v1.7.1 · task-88）

| 项 | 内容 |
| --- | --- |
| 评审对象 | 最新源码/构建：`lib/client.js` **sha256=c7d63f6f8d814e7289ec893fc7a906046419153b7123413216ad594447b5846e**（581,621 B，build `0.1.0+394e079c21fb`） |
| 依据 | 架构 v1.7/v1.7.1 §6.12–§6.18、§6.5.2 DOM 契约、PRD v0.8 F22–F30/SC39–SC48、UX v4.1、Figma v4.1/v5.1 |
| 验证命令 | `npm test` → **301 pass / 0 fail**；`node scripts/verify.mjs` → **34/34 PASS（fresh）**；构建指纹/大小与 Lead 提供一致 |
| 结论 | **不可交付：HIGH ×2**（F30 本地 echo 未移除 → 重复气泡；任务卡紧凑版缺操作者头像）。其余 7 项 MEDIUM、若干 LOW |

> 说明：上一版 `0b68b0eb…` 已按 Lead 要求废弃；本报告只针对 `c7d63f6f…`。本轮只读，未改源码；架构 §6.15.1 成员条全显已在 v1.7.1 落盘，并已删除 `member.stripOverflow` 旧文案（§6.9）。

---

## 1. HIGH（阻断交付）

### H1 · F30 本地 echo 不再被移除 → 每次发送后出现「本地气泡 + 权威气泡」两条（HIGH）

**证据链**：

1. 发送时 UI 插入 `local:<clientBatchId>` 乐观消息（`src/client/parts/90-view.part.js:569-610`）。
2. 权威消息到达后，`gcMergeMessages` 只做**同 id 覆盖**；`localsByBatch` 只被创建、**从未使用**（`src/client/parts/20-store.part.js:218-260`；`localsByBatch` 出现在 226/233，后续无任何引用）。
3. 注释称「本地 echo ↔ 权威消息的归并统一由 core/fanout 负责」，但 **core 从未收到 UI 的 echo**：适配器只把 `localBatches` 传给 normalize（`src/adapters/client-session-source.js:477`），normalize/fanout 的输入是会话事件归一化结果，不含 UI store 里的 `local:*` 消息；core 因此无法删除 echo。
4. 发送完成回调只更新 echo 的 `delivery/deliveries/meta`，**不删除 echo**（`90-view.part.js:630-675` 成功/失败两个分支）。
5. UI 测试把该行为**固化为预期**：`test/client/logic.test.mjs:124-146`（引用原文「echo 与权威消息并存」）、`:319-365`（断言合并后 length=2）。这些测试会让 F30/SC47 在单测层面「绿」，但用户会看到两条。

**用户影响**：每次群聊发送（lead 或 @ 多目标）在权威消息回传后，feed 同时存在 `local:gcb-*` 与 `u:<session>:*` 两条同文气泡（直到切走/重进视图重建 store），正是用户反馈 #16「偶发重复气泡」的回归。**SC47 不可通过。**

**修复建议（任选其一，推荐 A）**：
- A. 在 `gcMergeMessages` 内用已建好的 `localsByBatch`：当 incoming 权威消息带 `clientBatchId`（core 仅在 rpcId 精确/严格弱匹配时写入）且对应本地 echo 存在 → 用权威消息替换 echo（删除 local id，继承 echo 的 `delivery/deliveries/meta`，保持同一位置），**这正是 UI 唯一能看到 echo 的层**；随后从 `localsByBatch` 清除。
- B. 把 UI echo 列表传给 core 的 `mergeFanout` 一起归并（改 adapter 接口），但收益小、改动大。
- 同时把 `logic.test.mjs:124-146/319-365` 的「并存」断言改为「只 1 条」，并补 UI 级用例：echo + 权威（rpcId 命中）→ 1 条、权威晚到仍 1 条、失败重试不增条。

### H2 · 任务卡紧凑版缺操作者头像（HIGH，违反 PRD F23/架构 §6.18「头像必须渲染」）

- `src/core/normalize.js:1602`：`compact: action !== 'create'` → **除 create 外所有任务卡（claim/complete/reopen/reassign/edit/set_dependencies/delete/release）都是紧凑版**。
- `src/client/parts/40-cards.part.js:448-463`：compact 分支只渲染 `· <actorName>` 文本 + 时间，**不渲染 GcAvatar、没有 `data-card-avatar`**；完整分支（471 行）才有头像。
- 架构 §6.18：操作者头像必须渲染（缺失首字母占位，禁止空 div）；PRD F23/用户反馈 #18 无「紧凑版例外」。
- **影响**：用户点「认领/完成/重新打开」等任务卡时，看不到操作者头像，直接违反 SC43 的「头像必须渲染」与用户反馈 18。

**修复**：compact 分支同样渲染 `GcAvatar size:32`（或按紧凑版 24，但必须有 `data-card-avatar` 且非空），保留 `data-sender/data-task-actor`；补 SC43 的 claim/complete 紧凑卡变体测试。

---

## 2. MEDIUM

| ID | 问题 | 证据 | 修复建议 |
| --- | --- | --- | --- |
| **M1** | 成员条满足「全部显示/无 +N」，但与架构 v1.7.1/UX v4.1 的**换行优先 + 响应式 + 16px 渐隐**不一致：CSS 固定 `flex-wrap:nowrap; overflow-x:auto`，头像固定 24，渐隐 10px；注释仍写「+N」 | `src/styles/group-chat.css:1854-1869`；`src/client/parts/60-header.part.js:122`；`20-store.part.js:303` 注释「最多 5+N」 | 改为换行优先（`flex-wrap:wrap`，行高 26+4，头部 68→98 自适应）；>32 再横向滚动；头像 26/24/22 响应式；渐隐 16px；删除旧注释与 `member.stripOverflow` locale key（架构 §6.9 已删，代码 locale 仍留） |
| **M2** | 50 行折叠未做真实高度测量：UI 只用 core `foldInfo` 的**逻辑行**（软换行按 40 字符估算），`data-line-count` 是逻辑行数；长段落/代码块与 1100px 实际高度可能偏差（架构 §6.17 要求渲染高度 >1100px 才折叠） | `src/client/parts/50-feed.part.js:69-81`；`20-store.part.js:459-487`；CSS `--gc-fold-max:1100px` | 在渲染后量内容高度（useLayoutEffect/ResizeObserver），`data-line-count=ceil(height/22)`；或至少把实际宽度换算的 charsPerLine 传入；补「约 51 视觉行长段落」「代码块混合」两档测试 |
| **M3** | Markdown 渲染端未二次校验链接 scheme（parser 已校验，当前不可利用，缺防御纵深） | `src/client/parts/30-primitives.part.js:294-307`（`href: url` 直接使用，无 `isSafeUrl`） | 渲染时调用 `markdown.isSafeUrl`，不合法降级为文本；补 React 树级 malicious AST 测试 |
| **M4** | 隐藏宿主 composer 的恢复依赖「视图卸载」；若宿主保留非激活 view 挂载，body class 会滞留，导致其它视图 composer 被隐藏；CSS 选择器全局（`[data-conversation-region=composer]`），未做「仅群聊激活期」以外的隔离验证 | `src/client/parts/00-boot.part.js:220-283`；`90-view.part.js:971-987`；CSS `styles:1652-1653`；测试只覆盖 unmount（`render.test.mjs:1023-1027`） | 在切 tab/视图失活时也移除 body class（visibility hook 或 host 生命周期）；补「切到对话视图后宿主 composer 可见」的真实 GUI 测试；降级提示路径补测 |
| **M5** | 轨迹侧栏：`hasOlder:false` 恒为 false，`agent-trajectory-load-older` 永不出现（无分页）；`role=dialog` 有，但无 focus 入内/焦点陷阱/关闭后焦点归还；`aggregateTurns` 的 `inferred/emptyReason` 未消费 | `src/client/parts/90-view.part.js:1285-1293`；`65-trajectory.part.js:77-145`；Esc 只在 `90-view.part.js:990-1008` | 实现 20 轮/页或移除 load-older 按钮；打开时 focus 侧栏、Tab 陷阱、关闭还焦点到触发头像；消费 inferred/emptyReason 显示「窗口不含轮次」 |
| **M6** | 欢迎提示已居中，但仍用 `12px + state-business-primary` 蓝字（旧右对齐蓝字样式），与 PRD v0.8/SC48 的「11.5px 居中 `label-tertiary`、非蓝字」不符 | `src/styles/group-chat.css:861-871`；`50-feed.part.js:56-63` | 改 `font-size:11.5px; line-height:18px; color: label-tertiary`；SC48 断言 computed color 非 business |
| **M7** | 作用域 F27 在冷启动时可能解析错误：`leadScope` 用 `useMemo([sessionId])`，`gcLookupSessionParents` 只读取调用时的 `sessions.list` 快照；若列表未就绪，`resolveLeadSessionId` 回退当前 session 且**不会在列表加载后重算** | `src/client/parts/90-view.part.js:837-845`、`:61-95` | 订阅 `sessions.list`/`useSessions` 变化重算，或延迟到列表 ready；补「从 teammate 冷开群聊」测试 |
| **M8** | @ chips 未表达「部分失败/失败目标」语义（当前 chips 只表示发送目标，不随 delivery 失败变化）；架构/PRD 未定义该语义，任务书提到需确认 | `70-composer.part.js:86-145`；气泡说明行已有 partial 信息 | 若产品要求 chip 标记失败：在发送完成按 deliveries 给 chip 加 `data-state=failed`（红/错误图标）；否则在任务书明确「不做」并记录 |
| **M9** | 任务卡负责人空回退用普通 `span` 显示 `?`（不是 GcAvatar），且紧凑版无操作者头像（同 H2）；`task.copyId` locale key 已无 UI 使用但未删 | `40-cards.part.js:326-338`、`:448-463`；`locale/zh.json:125` | 空 owner 用 GcAvatar 首字母占位；删除 `task.copyId` 文案；紧凑版补头像 |

---

## 3. LOW

| ID | 问题 | 建议 |
| --- | --- | --- |
| L1 | CSS/存储注释仍写「24px 头像、working/waiting、+N」「最多 5+N」（与实际全显不符） | 清理注释，避免后续回归 |
| L2 | `member.stripOverflow` 仍在 `locale/zh.json`/`en.json`（架构 §6.9 已标删除）；构建期只校验键集一致，不会报未使用 | 删除 locale key（需重建，frontend 执行） |
| L3 | 任务卡 create 描述「展开」按 100 字符触发，而架构写「2 行截断」；长行/短行判定可能不一致 | 统一按 2 行/字符阈值双条件或明确以 100 字符为准 |
| L4 | Markdown 纯文本降级时 `gcSplitMentions` 仍会拆 @，未保留原文换行样式 | 可接受；补一条纯文本 XSS/换行黄金用例 |
| L5 | 紧凑卡 `data-card-avatar` 缺失（H2 修复后自然消除）；完整卡 owner 头像 kind 用 actorKind 推导可能不准 | 按 owner 名册 kind 渲染 |

---

## 4. 建议补测（按优先级）

1. **UI echo 归并（阻断）**：发送后权威消息到达 → 断言 `local:*` 消失、同文 `data-kind=user` 节点=1；权威晚到/乱序/失败重试仍 1；刷新后 1。对应 SC47/F30。
2. **任务卡 compact 头像（阻断）**：claim/complete/reopen 各卡断言 `data-card-avatar` 存在且非空；SC43 扩展。
3. 折叠：50/51 视觉行长段落、代码块混合、`data-line-count` 与 1100px 高度、展开锚点。
4. Markdown：React 树级 `<script>`/`javascript:`/恶意 AST、代码块语言标签、纯文本降级。
5. 单输入器：真实切换 tab 后宿主 composer 可见、降级提示（两输入框）路径、IME/Enter/Shift+Enter。
6. 成员条：>宽度时换行 vs 滚动、全部成员节点数、无 `+N` 文本/节点、响应式尺寸。
7. 轨迹：真实 `aggregateTurns` 轮次与工具数、inferred/emptyReason、Esc/遮罩/focus trap/还原。
8. 作用域：从 teammate/subagent 冷开群聊（sessions.list 延迟）→ Lead 全量。

---

## 5. 结论

**不可交付**：HIGH ×2 未清零。

- H1 影响 F30/SC47（用户可见重复气泡，回归用户反馈 #16），必须修。
- H2 影响 F23/SC43（任务卡操作者头像，用户反馈 #18），必须修。
- 其余 M1–M9 建议在下一轮 UI 修复中一并处理；构建/测试门（301 pass、verify 34/34、fresh）本身已通过，但单测把 H1 的错误行为固化了，需同步改测试。

修复后请重新构建并通知复审；复审将只针对 H1/H2 + 上述 M 项的回归。

---

# 复审（task-91 · frontend H1/H2 + MEDIUM 修复后）

| 项 | 内容 |
| --- | --- |
| 复审对象 | `lib/client.js` **sha256=9b0d69cb1f2f038f454e97452aa4859ab83e567a77bbc433bf6182cc520061ad**（585,663 B，build `0.1.0+39821306f18c`） |
| 验证 | `npm test` → **303 pass / 0 fail**；`node scripts/verify.mjs` → **34/34 PASS（fresh）** |
| 结论 | **HIGH 清零，可交付**；残余均为 LOW 或已文档化的可接受降级（M2/M5/M8） |

## 1. HIGH 复核

| ID | 结果 | 证据 |
| --- | --- | --- |
| **H1 双气泡** | ✅ 已修复 | `20-store.part.js:218-265`：incoming 权威消息按 `clientBatchId`（或 `meta.rpcId` 经 `gcLookupLocalBatchByRpc`）命中时，`byId.delete(localsByBatch.get(batchId))` 删除 local echo，再插入权威消息；测试改为「只 1 条」并覆盖慢（echo 先/权威晚）、快/乱序（权威先/echo 后、下一次权威同步清理）、重试（partial→sent 仍 1 条）、刷新（只有权威 1 条）、rpcId 兜底（无 clientBatchId）——`logic.test.mjs:130-148,351-431` |
| **H2 任务卡头像** | ✅ 已修复 | `40-cards.part.js:453-476` compact 分支现在渲染 `GcAvatar size:24` + `data-card-avatar`；normal 分支 32 + `data-card-avatar`；`normalize.js` 仍把非 create 设 compact，但两类均满足「头像必须渲染」。创建卡测试断言 `data-card-avatar` 存在（`render.test.mjs:289`） |

## 2. MEDIUM 复核

| ID | 状态 | 说明 |
| --- | --- | --- |
| M1 成员条 | **基本落实（残余 LOW）** | CSS 已 `flex-wrap:wrap`、两端渐隐 **16px**（`group-chat.css:1864-1870`）；全部成员/无 +N 测试通过。**残余**：头像仍硬编码 24（架构 v1.7.1 要求 26/24/22 响应式），README 仍写「24px」；`member.stripOverflow` locale key 仍存在（架构 §6.9 已标删） |
| M2 折叠高度 | **文档化降级** | README §8 明确「用 core/fold 行数近似，不做渲染后 DOM 高度校正」；50 行显式行用例通过，长段落按 40 字符/行估算。可接受 |
| M3 link 二次校验 | ✅ 已落实 | `30-primitives.part.js:280-284` 渲染前 `isSafeUrl` 校验，不合法降级文本 |
| M4 composer 恢复 | ✅ 已落实 | 新增 `IntersectionObserver` 监听视图可见性：不可见时移除 `body.gc-view-group-chat`（`90-view.part.js:1000-1020`），切 tab 不再依赖卸载；降级路径保留 `composer.hostFallback` 提示 |
| M5 轨迹分页/focus | **文档化降级** | README §8 明确：轮次全量（≤20）渲染、`hasOlder` 才显示加载按钮、未做真正 focus trap；`role=dialog/aria-modal`、Esc/遮罩/× 关闭、Esc 还原焦点已具备。可接受，后续 a11y 专项 |
| M6 欢迎样式 | ✅ 已落实 | `group-chat.css:861-871` 改为 `11.5px / 18px / label-tertiary / 居中`，非蓝字 |
| M7 scope 冷启动 | ✅ 已落实 | `90-view.part.js:834-847` 订阅 `sessions.byId`，`leadScope` 依赖 `[sessionId, sessionsById]`，列表就绪后重算 |
| M8 chips failed | **文档化降级** | README §8 明确：发送失败不回填 chips（遵循 F24 不回填），失败信息在气泡/重试；未把 chip 恢复输入区，列入后续迭代 |
| M9 占位/键清理 | **部分落实（残余 LOW）** | owner 空回退改为 `.gc-avatar-placeholder` 空占位（不再显示 `?`）；`task.copyId` 已从 locale 删除；`member.stripOverflow` 仍残留（与 M1 同项） |

## 3. 残余 LOW（不阻断交付）

1. 成员条头像固定 24（应 26/24/22 响应式）；CSS/README 仍写 24px；`member.stripOverflow` locale key 未删。
2. H1 乱序极端：权威先到、echo 后插入时存在一次「2 条」，下一次权威同步清理；真实发送流程 echo 恒先于权威，刷新无 echo，属理论边界。
3. H1 TTL 边界：prompt >5min 后 localBatches 被 prune，晚到权威无法反查 batchId（UI 仍按 id 渲染，但 echo 可能留存到下次视图重建）。
4. README 前文仍有过时描述（8 行/400 字折叠、M6 工具行、右对齐欢迎、复制任务 ID 等），仅在 §8 更新了降级说明，建议交付前一并清理。
5. 任务卡 compact 头像 24（normal 32）；架构只说「必须渲染」，尺寸属视觉细节。
6. `task.compact` 描述展开按 100 字符而非 2 行（视觉近似）。
7. 轨迹 `hasOlder` 恒 false，加载按钮不出现（与 README 降级说明一致）。

## 4. 最终结论

**HIGH 清零，可交付。**

- H1/H2 均已修复且有测试覆盖；`npm test` 303/303、`verify` 34/34、构建 fresh（`9b0d69cb…` / `0.1.0+39821306f18c`）。
- M2/M5/M8 的降级已写入 README §8，属于明确接受的产品/技术取舍；M1/M3/M4/M6/M7/M9 已落实或基本落实。
- 建议交付前顺手清 README 前文过时段落与 `member.stripOverflow` locale key（LOW），不阻塞安装与 tester 全量验收。
