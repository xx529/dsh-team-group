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

---

# 复审（task-102 · F31–F35 UI 实现）

| 项 | 内容 |
| --- | --- |
| 复审对象 | `lib/client.js` **sha256=79aa992564248ef6f8bce6005e659462f70f81dbbd568cc28280a9ff87546862**（593,645 B，build `0.1.0+6690acda158d`） |
| 验证 | `npm test` → **322 pass / 0 fail**；`node scripts/verify.mjs` → **34/34 PASS（fresh）** |
| 结论 | **不可交付：HIGH ×1（F32 真实表格 AST 渲染不出来）**；F31/F33/F34/F35 主路径通过，另有 3 项 MEDIUM、若干 LOW |

## 1. HIGH

### H1 · F32：渲染端与内核表格 AST **形状不一致**，真实 GFM 表格渲染为空表

**证据**：

- 内核 `src/core/markdown.js:323` 产出：`{ type:'table', header:{ cells, align }, rows }`（header 是对象；align 在 header 内）。
- 渲染端 `src/client/parts/30-primitives.part.js:337-411`（`gcRenderMdTable`）：
  - 先判断 `Array.isArray(node.header) && Array.isArray(node.rows)`；真实 AST 的 `header` 是对象 → 条件不成立；
  - 再走 `node.children` 兼容分支，真实 AST 没有 `children` → `allRows = []`；
  - 结果：`<thead><tr></tr></thead><tbody></tbody>`，**表头/单元格全部为空**（不会抛错，所以视觉上只看到空的表格框）。
  - `align` 读取的是 `node.align`，真实 AST 在 `node.header.align`，即使 header 判断修好，对齐也丢失。
- 现有测试 `test/client/render.test.mjs:1233-1268` 用的是**合成 AST**：`header: [[...]]`（数组）+ `align` 顶层，恰好符合渲染端错误假设，因此 322 tests 全绿但覆盖不到真实 parser 输出。
- DOM 契约（架构 v1.7.2 §6.5.2）要求 `th/td[data-align]`，实现只用内联 `style.textAlign`，**没有 `data-align` 属性**。

**影响**：用户实际发送的 GFM 表格（来自 parser）显示为空表，F32/SC50 直接失败。

**修复**：
1. `gcRenderMdTable` 支持真实 AST：`const header = node.header && Array.isArray(node.header.cells) ? node.header.cells : (Array.isArray(node.header) ? node.header : [])`；`align = node.header?.align ?? node.align ?? []`；同时保留旧合成形状兼容。
2. `th/td` 增加 `data-align={align[i]}`（无对齐可省略），保留 `style.textAlign`。
3. 测试改为调用 `core/markdown.parseMarkdown` 的真实输出再渲染（可附合成变体），断言表头/单元格文本、`data-align`、`<thead>/<tbody>` 与宽表 wrap；补「畸形表格降级 plain」。

## 2. MEDIUM

| ID | 问题 | 证据 | 建议 |
| --- | --- | --- | --- |
| **M1** | F34 缺少 `data-task-collapsed` 属性（task-102 明确要求；实现只有 `data-task-expanded`），且 CSS 测试仍断言旧 `data-task-collapsed` 选择器（未被任何元素命中，属死断言） | `40-cards.part.js:424` 只有 `data-task-expanded`；`render.test.mjs:839` 断言 CSS `data-task-collapsed='true'` | 二选一：按 task-102 增加 `data-task-collapsed`（与 expanded 互斥）或更新任务书/测试统一为 `data-task-expanded`；不要保留死 CSS 断言 |
| **M2（已关闭，非 bug）** | F31/工具摘要：UI `gcIsEmptyAgentMessage` 隐藏空 text 的 `delivery`（内核 `meta.toolSummary`）——**用户第 11 条明确不要工具摘要，此行为正确**；架构 §6.16 已改为「M6 工具摘要行不渲染（用户裁决）」 | `20-store.part.js:456-467`；`50-feed.part.js:284`；架构 §6.16/§4.2.3 | 无代码改动；tester 断言「纯工具轮次无摘要行」即可 |
| **M3** | F34 的 requirements/acceptance 只从 `task.requirements` 或 `payload.requirements` 读取，但当前 team/task 快照没有这两个字段（PRD v0.8.1 未落盘）；若后续 payload 不带这两个键，展开区只显示 description，可能不符合「要求/验收标准」预期 | `40-cards.part.js:315-318`；架构 §4.1 标 optional/UNVERIFIED | 等 PRD v0.8.1 落盘确认字段来源；无字段时不要伪造，展开区只渲染存在项，补 fixture 测试 |
| **M4** | F33 头像尺寸：JS 传 `size:24`，CSS `.gc-member-strip .gc-avatar { width:26px; height:26px }` 覆盖/冲突；架构 v1.7.2 要求 26/24/22 响应式，测试只断言名字/无 mask/无 +N | `60-header.part.js:122`；`group-chat.css:1874-1879`；`render.test.mjs:1273-1298` | 统一尺寸来源（去掉 JS size 或去掉 CSS 覆盖），补 1440/1280/768 计算尺寸断言 |

## 3. LOW

1. `40-cards.part.js:386-392` 按钮对象里 **重复 `'aria-expanded'` 键**（后写覆盖前写，值相同但属冗余），建议去重。
2. `render.test.mjs` 中 F34 用例标题重复出现两次（`:1224` 附近与 `:1295` 附近），建议合并/改名。
3. `render.test.mjs:839` 对 `data-task-collapsed='true']` 的 CSS 断言是死断言（元素不输出该属性），M1 修复时一并处理。
4. 架构 §6.16 的「M6 作废」与实现保留 `delivery + meta.toolSummary` 的现状存在文档/实现口径差（M2 修复时同步）。
5. F32 的 `data-align` 缺属性（与 H1 一并修）；表格折叠计数 `2 + rows` 已正确（`fold.js:73`）。

## 4. 已通过项

- **F31**：空 `agent_output` 不再出空气泡（内核 `emptyAgentOutput` + UI `gcIsEmptyAgentMessage` 双保险）；空文本的中断提示不产；有文本的 error/aborted 保留气泡+提示；turn/工具数不受影响（`empty-output.test.js` + render 测试）。
- **F33**：成员条每项头像+全名+状态点；无 `+N`；无 `mask-image`/渐隐；单行横向滚动、滚动条隐藏；`data-member-name` 存在；6 名成员全显测试通过。
- **F34**：默认只渲染目标/ID/状态/负责人/依赖/完成时间；description 默认不渲染；`data-action=expand-task` + `aria-expanded`；按 `messageId` 记忆、其它卡保持折叠；无详情不渲染按钮；测试通过（除 M1/M3/M4 细节）。
- **F35**：外层 `data-card-avatar` 唯一 actor 头像；卡内无第二头像；`data-task-owner-avatar` 源码中已无；负责人 `data-field=owner` 文字（空→未认领）+ 可选角色；测试断言通过。
- **回归**：SC47 单气泡/发送四态/任务卡状态动作/成员状态点/@ chips/轨迹侧栏/Markdown 既有语法/50 行折叠相关用例 322 pass、verify 34/34 保持。

## 5. 结论

**不可交付（HIGH=1）**：F32 真实 GFM 表格当前渲染为空表，且现有测试用错误 AST 形状掩盖了该问题；修复 H1（并补 `data-align`/真实 parser 输出测试）后即可进入复验。M1–M4 建议同轮处理，LOW 可顺手清理。

---

# 最终复审（task-102 收尾 · bundle 2e0c72b4）

| 项 | 内容 |
| --- | --- |
| 对象 | `lib/client.js` **sha256=2e0c72b4b0559421135e568d8b59349f07efe80192424b3a59c179de3908ca19**（599,529 B，build `0.1.0+691ac300fef5`） |
| 验证 | `npm test` → **325 pass / 0 fail**；`node scripts/verify.mjs` → **34/34 PASS（fresh）** |
| 结论 | **HIGH 清零，可交付**（残余 LOW，不阻塞安装与 tester 验收） |

## 1. HIGH 复核

| 项 | 结果 | 证据 |
| --- | --- | --- |
| **H1 F32 真实 AST 表格** | ✅ 已修复 | `30-primitives.part.js:350-433` 优先读取 `header:{cells,align}`；`th/td` 输出 `data-align` + `style.textAlign`；`parseMarkdown` 真实文本用例 `render.test.mjs:1404-1429` 渲染出 table/thead/tbody、断言单元格文本、非法表格降级段落；原有合成 AST 兼容保留 |

## 2. MEDIUM 复核

| ID | 结果 | 说明 |
| --- | --- | --- |
| M1 `data-task-collapsed` | ✅ 已修 | `40-cards.part.js:424,455` 同时输出 `data-task-expanded` / `data-task-collapsed`；测试断言展开后 collapsed=false、收起后 true（`render.test.mjs:1366-1368`） |
| M2 M6 工具摘要 | ✅ 已按用户裁决关闭（非 bug） | 架构 §6.16 已标「M6 工具摘要行不渲染（用户裁决）」；UI 隐藏空 text delivery 正确；§4.2.3/E47/SC49/§13 同步 |
| M3 requirements/acceptance | ✅ 已明确 | 快照无字段时不渲染、不占位、不推断；§6.18.2 写明「禁止伪造」，代码仅 `if (requirements/acceptance)` 才入详情 |
| M4 成员条头像尺寸 | ✅ 已统一 | JS `size:26` + CSS `.gc-member-strip .gc-avatar` 26，容器查询 1079→24、899→22；测试断言 `data-size=26`；768 全显/全名/无 +N 保持 |

## 3. 残余 LOW

1. F32 真实 AST 用例已断言表格结构与单元格文本，但**未断言 `th/td[data-align]`/`textAlign`**（合成 AST 用例只断言 style）；建议补一行 `data-align` 断言即可。
2. F32/F33 的 `data-align`/尺寸断言分散在合成 AST 与 CSS 检查中，后续改动需两处同步（维护性）。
3. 架构 §6.16 的「M6 不渲染」与 §6.5 映射/§6.7 令牌表中残留的历史「ToolCollapseLine 作废」描述属历史记录，不影响实现；README 前文仍有旧 M6 描述（文档清理项，非阻塞）。
4. PRD v0.8.1/UX v4.2/Figma v4.2 仍未落盘，SC49–SC53 编号为建议值；PM/UX 落盘后仅同步编号/文案。

## 4. 最终结论

**HIGH 清零，可交付。** H1 已用真实 `parseMarkdown` AST 验证；M1/M2/M3/M4 均已落实或按用户裁决关闭；325 tests / verify 34/34 / build fresh（`2e0c72b4…` / `0.1.0+691ac300fef5`）。建议安装后由 tester 做 F31–F35 真机验收（空气泡、GFM 表格、成员条全名、任务卡折叠、单头像）。
