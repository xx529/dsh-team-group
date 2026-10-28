# 内核 B1–B3 只读评审（架构 v1.7 · task-84）

| 项 | 内容 |
| --- | --- |
| 评审对象 | `plugins/dsh-group-chat/` 工作树（HEAD `a73e247` + 未提交改动；frontend 仍在改 UI，本轮只审内核） |
| 依据契约 | 架构 v1.7 §4.8.2（Lead 链）、§5.3.1（防重复时序）、§6.12（Markdown）、§6.15（turns）、§6.17（50 行折叠） |
| 输入文件 | `src/core/markdown.js`、`fold.js`、`folding.js`、`turns.js`、`roster.js`（resolveLeadSession）、`normalize.js`（lookupBatchId/emit）、`fanout.js`、`dedupe.js`、`src/send/send-batch.js`、`src/client/parts/20-store.part.js`、`30-primitives.part.js`、`50-feed.part.js` |
| 方法 | 只读代码走查 + 既有测试核对；执行 `npm run test:core`（**158 pass / 0 fail**）、`npm run test:send`（**69 pass / 0 fail**）；`grep` 确认 `src/` 无 `dangerouslySetInnerHTML`/`innerHTML` 实际使用（仅注释） |
| 结论 | **不能直接全量接线：B3 有 1 个 HIGH；B1 无 HIGH 可接线；B2 无 HIGH 但需按 M2/M3 补强后接线** |

---

## 0. 结论摘要

| 模块 | 结论 | 说明 |
| --- | --- | --- |
| **B1 Markdown + fold** | **可接线（Markdown 安全无 HIGH）** | XSS/HTML/链接白名单实现正确；折叠有 1 个 MEDIUM（长段落折行不计行数，UI 未测量高度） |
| **B2 turns + resolveLeadSession** | **可接线（有条件）** | 无 HIGH；turns 在「窗口缺 turn/start」时整段空、scope 在「父链 summary 未加载」时静默返回非根且 `degraded=false`、lookup 抛错未兜，需补 M2/M3 |
| **B3 防重复（localBatches/rpcId）** | **先修 HIGH 再接线** | `lookupBatchId` 的 `sessionIds` 兜底无时间/文本/rpc 约束，可把无关用户消息归到旧批次 → UI 误删本地 echo / 漏替换 → 重复气泡或丢气泡 |

---

## 1. HIGH

### H1 · `lookupBatchId` 的 `sessionIds` 兜底会把**无关用户消息**归给旧批次（B3）

**证据**：

- `src/core/normalize.js:754-770`（`lookupBatchId`）：
  - `if (rpcId && Object.values(requestIds).includes(rpcId)) return batchId;`
  - `if (!rpcId && ... targets ...)`（无 rpcId 的 targets 兜底）
  - **`if (batch.sessionIds?.includes(sessionId)) return batchId;`**（第 766 行，**无 rpcId 条件、无时间窗、无文本/目标校验**）
- `src/core/normalize.js:835`：所有 `user/message`（含带 rpcId 的普通消息）都会调用 `lookupBatchId`。
- `src/client/parts/20-store.part.js:228-236`：权威消息一旦带 `clientBatchId`，UI 就 `byId.delete(localsByBatch.get(batchId))`（删除本地 echo）。
- UI 的 `localBatches` 只在 **TTL 5 分钟/上限 50** 时清理（`20-store.part.js:27-42`、`gcPruneLocalBatches`），**发送成功后不立即删除**。
- 测试把这一行为**固化**了：`test/core/dedupe-batch.test.js:48-55` 断言 `lookupBatchId(ctx, 'nope', 'S2', []) === 'b1'`（rpcId 不匹配仍按 sessionIds 命中）。

**触发场景（真实可复现）**：

1. 群发批次 `b1` 目标含 lead + S2，用户在 5 分钟内：
   - 在 S2 会话/原生 composer 发了一条普通消息（rpcId=r2，不属于 b1）；或
   - 连续发第二次群聊消息（新批次 b2，rpcId=r3）。
2. `lookupBatchId` 遍历到旧 `b1`，requestIds 不含 r2/r3，但 `sessionIds` 含 S2/lead → 返回 `b1`。
3. 该无关消息被打上 `clientBatchId=b1`：
   - UI 若 `b1` 的本地 echo 还在 → **误删用户的待发送/失败气泡**（`byId.delete`）；
   - 第二批次 b2 的权威消息被打成 b1 → b2 的 echo 永远不会被替换 → **echo+权威两条重复气泡**（SC47/F30 回归）；
   - `mergeFanout` 还可能把该消息当作 b1 的 copy 参与合并，造成 deliveries/targets 串批。

**修复建议（必须）**：

1. **rpcId 是权威键**：`if (rpcId) { 精确匹配所有 batch.requestIds 失败 → return undefined; }`，禁止带 rpcId 时继续走 targets/sessionIds 兜底。
2. 无 rpcId 时：`sessionIds` 兜底必须同时满足「`batch.targets` 与消息 targets 一致（或消息无 targets）」+「文本 hash 等于 batch 文本」+「`abs(msg.time - batch.at) <= 5min`」，且只在**所有 batch 的 requestIds 都不匹配**时使用。
3. UI 在批次**所有目标终态（sent/failed）且已对账**后立即 `delete gcLocalBatches[batchId]`（不必等 TTL）；TTL 仅兜底。
4. 加测试：旧 batch 存在时，同 session 的无关 rpcId 消息必须 `undefined`；第二批次不得继承旧 batchId；带 rpcId 不匹配不得删除 echo（UI 层）。

> 影响：F30/SC47 的「偶发重复气泡」正是该问题；属**发送链路正确性** HIGH，建议 B3 修复后再接 UI。

---

## 2. MEDIUM

### M1 · 50 行折叠「渲染行数」实际是**逻辑行数**，长段落折行不计；UI 也没有高度测量

- `src/core/fold.js:37-49`：`paragraph` 仅按 `break` 节点 +1 计行；**不计算软换行（max-width 600 自动折行）**。
- `src/core/fold.js:71-84`：`folded = lineCount > maxLines`，`maxHeight = 50*22`（数值对，但判定未用高度）。
- UI：`src/client/parts/20-store.part.js:460-470` 直接使用 `fold.foldInfo(value).lineCount`；`src/client/parts/50-feed.part.js:69-82` 只按 `decision.foldable` 加 `.gc-foldable`；CSS `.gc-foldable` 才 `max-height:1100px`（`src/styles/group-chat.css:702-710`），`.gc-foldable-static` 无上限。
- 后果：**一条 1 万字符、无换行的段落**（逻辑 1 行）→ `foldable=false` → 全量展开，F29「默认前 50 行」失效；验收 SC46 用显式 51 行可通过，但用户反馈场景（长段落）不满足。
- 建议：UI 在 Markdown 渲染后用 `useLayoutEffect`/`ResizeObserver` 量内容高度（>1100+1px 才折；`data-line-count = ceil(height/22)`），并把这个测量 helper 放进 B1（如 `foldByMeasuredHeight(height)`）；kernel 保留逻辑行估算作为 SSR/首帧 fallback。补测试：长段落无换行、含代码块混合、列表换行。

### M2 · `aggregateTurns` 在窗口缺 `turn/start` 时返回空数组，可能误报「无轮次数据」

- `src/core/turns.js:176`：`if (!sawTurnStart) return [];` —— 即使窗口里有 `assistant/message`/`tool/call`（带 `data.turn`）也不建轮次。
- 窗口分页/内存裁剪/首屏只加载最近事件时，较早的 `turn/start` 可能不在窗口；侧栏本可显示部分轮次，却显示空态。
- 建议：无 `turn/start` 时按 `assistant/message`/`tool/call` 的 `data.turn` 合成轮次并标 `partial:true`（或返回 `{turns, partial}` 让 UI 提示「加载更早轮次以补全」）；补测试：窗口以 turn/end 开头、只有 assistant/tool、`data.turn` 缺失。

### M3 · `resolveLeadSession`：父链未知时静默返回非根且 `degraded=false`；lookup 抛错未兜

- `src/core/roster.js:427-462`：当 `parentOf(id)` 返回 `undefined` 时直接 `break`，返回当前 id，`degraded` 仍 false。若中间会话 summary 尚未加载（`sessions.list.byId` 不完整），会把 teammate/subagent 当作 Lead 频道，**静默错误作用域**（F27）。
- `src/core/roster.js:472-478`：`lookupFn` 直接调用，未 try/catch；调用方传入可能抛错的 snapshot getter 时，违反「不抛错」。
- 另：超限（>4 跳）返回的是第 4 跳祖先（`scope.test.js` 断言 `b`），测试注释却写「回退当前 id」，契约与测试注释不一致。
- 建议：返回值增加 `unknownParent`（lookup 源中不存在该 id 时）；UI 在 summary 未就绪时重试/降级 lead-only；wrap lookup 异常返回 `degraded:true`；澄清超限契约（返回祖先还是 start）并统一测试注释。

### M4 · localBatches 的**职责边界**跨 UI/Core 两处，注册失败会静默削弱 F30

- 所有权：UI `20-store.part.js:21-100` 维护 `gcLocalBatches`，通过 `deps.localBatches` 共享给 core；同时 `gcLookupLocalBatchByRpc` 在 UI 里又实现了一份反查（与 `lookupBatchId` 双实现，易漂移）。
- `src/send/send-batch.js:426-441`：`onBatch` 回调异常被 `try/catch` 吞掉（只 console.warn），发送继续；此时 UI 未注册批次 → core 无法替换 echo → **F30 静默失效**（用户看到两条）。
- 建议：B3 拥有唯一注册表（`createLocalBatchRegistry()`，core 与 send 共用，UI 只读）；`onBatch` 失败记入 send 诊断/`data-send-debug` 并在 UI 提示；删除 UI 侧重复反查，统一走 core 接口。

### M5 · 旧 8 行/400 字折叠规则**未彻底隔离**

- `src/core/folding.js` 仍导出 `foldInfo`（8 行/400 字），`src/core/constants.js:58-76` 仍保留 `foldMaxLines:8`、`foldMaxChars:400`、`foldLines/foldChars`。
- `src/core/index.js:178-180` 以 `foldInfoChars` 继续导出旧模块，`index.js:17` 文档注释仍描述旧 API；`test/core/envelope-limits.test.js:59-60` 继续断言旧规则。
- 风险：后续 UI/适配器一旦 import `folding.js` 或 `foldInfoChars` 就回到旧口径，与 F29 冲突。
- 建议：删除 `folding.js` 或移入 `legacy/` 并从 `core/index.js` 公共面移除；常量改名 `legacy.foldMaxLines`；verify 脚本加「禁止 import folding.js」断言；旧测试保留在 legacy 目录并标注 deprecated。

### M6 · `mergeFanout` 的签名兜底可能把**两次真实同文同发**合并成一条（丢一条气泡）

- `src/core/fanout.js:57-68`：无 clientBatchId 时按 `targets + normalizeText(text) + floor(time/5min)` 归组；`78-105` 把组内除 primary 外全部 `removedIds`。
- 刷新后 `localBatches` 为空时，两次目标与文字完全相同的群发（间隔 <5min）会落到同一 `sig:` 组：第一条 lead 副本保留，第二条被当 copy 删除 → **用户少一条气泡**；且分组未检查「同一会话是否出现多份副本」（真正的两次发送会在 lead 会话各留一条）。
- 建议：签名兜底仅在「组内每个 targetSessionId 恰好 1 条副本 + 恰好 1 条 lead 副本」时合并；同一会话出现 ≥2 条则拆分（按 id 分组）；补测试「同文同目标两次发送（刷新后）→ 仍 2 条」。

### M7 · Markdown 渲染端未二次校验链接 scheme（防御纵深）

- 解析器 `isSafeUrl` 已过滤（`markdown.js:51-63`），测试覆盖 `javascript:/data:/file:`；但渲染器 `30-primitives.part.js:294-306` 直接使用 `node.url` 作为 `href`，未再调用 `isSafeUrl`。
- 当前链路 AST 只来自本 parser，**不构成可利用 XSS**；但历史回放/fixture 注入/未来换 parser 会绕过。建议渲染器再校验一次（不合法则渲染为文本），并加一条 React 树级测试（恶意 fixture → 无 `<a href=javascript:>`）。

### M8 · Markdown 截断可能切断代理对/围栏

- `markdown.js:81-86`：`source.slice(0, maxChars)` 可能切在 UTF-16 代理对中间（出现替换符），或切在未闭合代码围栏内（余下内容被吞为一个 code_block）。
- 安全无问题（仍文本、仍 64KB），但属内容完整性问题。建议按 code point 截断并在截断处标 `truncated`；补 64KB 边界测试（中文/emoji/未闭合围栏）。

---

## 3. LOW

| ID | 问题 | 证据 | 建议 |
| --- | --- | --- | --- |
| L1 | 超限/未知父链的返回语义与注释不一致（返回祖先 vs start） | `roster.js:427-462`；`scope.test.js:27-33` | 明确约定并改注释/测试；UI 不要把 `degraded` 节点当 lead |
| L2 | turns 顺序按「插入顺序 index」而非时间排序；乱序窗口时「最新在前」可能失真 | `turns.js:150-190` | 按 `(startedAt, turnId)` 倒序 tie-break |
| L3 | settle 去重里 `removedIds.includes` 与 `outputs.find` 的 O(n²) 组合 | `dedupe.js:92-118` | 用 Set/Map；当前规模可接受 |
| L4 | fold `renderedLineCount` 对嵌套列表/多段 list_item 近似为 1 行/项 | `fold.js:53-66` | 在注释与 UI 文案注明近似；M1 的高度测量可根治 |
| L5 | Markdown 的 `***bold italic***`、`**` 不配对等存在渲染歧义（无安全影响） | `markdown.js:200-260` | 补黄金用例，明确「不配对按文本」 |

---

## 4. 建议补测清单（按模块）

**Markdown（B1）**
1. React 树级 XSS：`<script>`、`<img src=x onerror=...>`、`[x](javascript:alert(1))`、`[x](data:text/html,...)` → 断言无 `dangerouslySetInnerHTML`、无不安全 `href`。
2. 链接二次校验：伪造 AST 直接渲染（绕过 parser）应被拒绝。
3. 截断边界：64KB 整、64KB+1、中文/emoji 代理对、未闭合围栏。
4. 恶意性能输入：64KB 单行 `*`/`[`/`**` 混合，解析 <50ms 且不抛栈溢出（fallback plain 也算 pass）。
5. 降级：表格/引用/标题/分隔线 → 文本可见、`data-md` 行为符合契约。

**Fold（B1/UI）**
6. 长段落无换行（约 51 视觉行）→ 应折叠（当前会 FAIL，M1）。
7. 代码块 50/51 行、列表 50/51 项、混合块边界。
8. UI 层：`.gc-foldable[data-expanded=false]` 高度=1100、遮罩 56、点击锚点 ±4px；`data-line-count` 与高度一致。

**Turns（B2）**
9. 窗口从 turn/end 开始（缺 turn/start）→ 至少可显示合成轮次/明确 partial（当前 []，M2）。
10. 只有 assistant/tool、无 turn/start；`data.turn` 缺失；turn 编号乱序。
11. 大窗口 10k 事件：`aggregateTurns` 单次 ≤20ms（当前 O(n)，需实测）；缓存键 `(sessionId, revision)` 的命中/失效。
12. forked/seeded cutoff 已有，补「cutoff 后仍有继承 assistant」用例。

**Scope（B2）**
13. 中间 summary 缺失（lookup 返回 undefined）→ 必须 `degraded/unknown`（当前 false，M3）。
14. lookup 抛错 → 不抛、返回 `degraded`。
15. 环（a→b→a）、超 4 跳、start 为空串、非字符串 id。

**Dedupe/Fanout（B3）**
16. **H1 回归**：旧 batch 在 TTL 内 + 同 session 无关 rpcId 消息 → `undefined`；第二次群发不被旧 batch 抢归属；UI 不得删除无关 echo。
17. 快路径（权威先于 echo）、慢路径、晚到 >TTL、刷新后只剩权威。
18. 重试复用 requestId：不新增权威、不新增气泡。
19. **M6 回归**：同文同目标两次群发（刷新后 localBatches 空）→ 仍 2 条气泡。
20. onBatch 回调抛错 → 发送继续但诊断/UI 可见降级（M4）。

---

## 5. 结论与建议顺序

1. **B3 先修 H1**（`lookupBatchId` 收紧 + UI 批次及时清理 + 回归测试），修完再接线 F30/SC47；否则用户反馈的「偶发重复气泡」仍可能存在。
2. **B1 可接线**（Markdown 安全实现正确；折叠 M1 由 UI 高度测量补齐，建议 B1 提供 helper）。
3. **B2 可接线但带条件**：补 M2（缺 turn/start 部分轮次）与 M3（scope unknown/degraded/try-catch）测试后再接轨迹侧栏/作用域；否则可能出现「侧栏空但 feed 有消息」「从 teammate 打开显示 teammate 频道」的验收失败。
4. **M4（职责边界）建议在接线前定案**：localBatches 唯一所有权放 core/send，UI 只读，避免「回调失败 → 防重复静默失效」。
5. 修复后重跑：`npm run test:core` + `npm run test:send` + 新增 UI 渲染测试；HIGH 清零后再给「内核可接线」的最终结论。

> 本轮未修改任何源码；本文件仅评审记录。`AGENTS.md` 的版本注记仍为架构 v1.6.1，待 Lead 在 v1.7 落盘后同步（不属本任务写作用域）。

---

# 复审（task-86 · task-85 修复后）

| 项 | 内容 |
| --- | --- |
| 复审对象 | backend task-85 修复后的工作树（H1 重写 + M1/M2/M4/M5/M6） |
| 执行 | `npm run test:core` → **166 pass / 0 fail**；`npm run test:send` → **71 pass / 0 fail**；`npm run test:client` → **58 pass / 1 fail**（`mentionQuery: 触发条件与过滤词`，frontend 正在改的 mention 逻辑，与 B1–B3 无关）；全量 `npm test` 295/296 |
| 结论 | **H1 已清零（HIGH=0）**；B1/B2/B3 **可以接线**；下列残留均为 MEDIUM/LOW 级快速跟进，不阻塞 F5/F30 接线 |

## 1. H1 复核（通过）

| 检查点 | 结果 | 证据 |
| --- | --- | --- |
| 有 rpcId 只认 requestIds，禁止 sessionIds/targets 兜底 | ✅ | `normalize.js:773-795`：`if (rpcId) { if (requestIds 包含) return; continue; }`；`dedupe-batch.test.js:48-60` 断言 `'nope'` 返回 undefined |
| 无 rpcId 必须 textHash + targets 集合完全一致 + ±2min | ✅ | `normalize.js:782-793`：`textHash`、长度相等 + 每项包含、`abs(time-batch.at) <= localBatchFallbackWindowMs(2min)`；测试覆盖错文本/超窗/目标不一致/缺参数均 undefined |
| 终态批次 `closed` 弱匹配禁用、rpcId 精确仍可命中（晚到替换 echo） | ✅ | `normalize.js:778`（closed continue）、`:781`（rpcId 先于 closed 判断）；`dedupe-batch.test.js:63-68` |
| send 终态关闭（sent/partial/failed/外层异常） | ✅（主路径由 UI 关闭，见 M4 残余） | `send-batch.js:329`（外层异常）、`:562`（正常终态）调用 `markLocalBatchClosed`；`gcPerformSend` 在 then/catch 均 `gcCloseBatch`（`90-view.part.js:636,658`） |
| 回归用例覆盖「同 session 无关消息不归并/不误删 echo / 第二批次正常替换 / 晚到/重试仍 1 条 / closed」 | ✅ | `dedupe-batch.test.js` 新增 H1 回归两条 + 既有 echo 替换/晚到/刷新/重试用例；`on-batch.test.js:127-171` 覆盖 closed 两路径 |

**H1 结论**：原「同 session 无关消息被归旧批次 → UI 误删 echo / 漏替换」路径已被消除，且三条约束足以覆盖当前真实发送（真实发送恒有 rpcId；弱匹配仅历史/回放与无 rpcId 遗留消息）。**HIGH 清零。**

## 2. 残留问题（MEDIUM/LOW，均不阻塞接线）

| ID | 严重度 | 问题 | 证据 | 建议 |
| --- | --- | --- | --- | --- |
| R-M4 | MEDIUM | **send 的 closed 关闭路径在生产未接线**：`gcPerformSend` 的 `deps` 只传 `ctx/onBatch`，未传 `localBatches`，因此 `send-batch.markLocalBatchClosed` 取不到对象（dead path）；实际靠 UI 在 promise 结束后 `gcCloseBatch`，两者之间仍有极短弱匹配窗口，且 backend 声称的「同一引用」未生效 | `90-view.part.js` `gcPerformSend` deps；`send-batch.js:611-618` | 在 deps 加 `localBatches: gcLocalBatches` 一行；补一条集成测试断言 send 返回时条目已 closed（不依赖 UI `.then`） |
| R-M6 | MEDIUM | **两次同文同发在 5s 内仍会被签名合并成 1 条**：`sessions.size>=2` 只排除同会话重复，两次完整 fanout（lead/ux/backend 各 2 条）仍满足 ≥2 会话 → 第二条 lead 副本被删，丢失 1 条气泡（刷新后无 batchId 时触发） | `fanout.js:57-77`（签名窗口 5s；只校验会话数） | 签名组要求「每个 sessionId 至多 1 条副本 + 恰 1 条 lead 副本」，出现同会话多副本即拆组；补测试「同文同目标两次群发（刷新后）→ 2 条」 |
| R-WEAK | LOW | 无 rpcId 弱匹配**未校验 sessionId/channelId**（`sessionId` 参数未使用；batch 有 `sessionIds/channelId` 却未用）——理论上跨频道/跨会话相同文本+目标+2min 可命中；真实发送恒有 rpcId，影响仅历史/回放 | `normalize.js:773-793` | 弱匹配增加 `batch.channelId === ctx.leadSessionId`（或 sessionId ∈ batch.sessionIds）条件 |
| R-M2 | LOW | 缺 `turn/end` 的 inferred 轮次一律 `status='running'`；窗口截断时历史已完成轮次可能显示进行中；`emptyReason/inferred` 挂在数组属性上，UI 若浅拷贝/序列化会丢 | `turns.js:184-211` | UI 对 `inferred`/无 end 显示「进行中/可能截断」；或返回 `{turns, inferred, emptyReason}` 结构 |
| R-M1 | LOW | 软换行按固定 40 字符估算（CJK≈42、拉丁≈85），拉丁长文会偏早折叠、CJK 略偏晚；UI 尚未传屏宽值、也未做真实高度测量 | `fold.js:21-89`；`20-store.part.js:468` | frontend 按实际宽度传 `charsPerLine`，或保留高度测量作为最终判据；补 40/60 字符/行两档测试 |
| R-M6b | LOW | 同批副本到达间隔 >5s 且无 batchId 时会拆成多气泡（backend 已声明为已知残余）；正常发送有 batchId 不受影响 | `fanout.js:63-67` | 有 batchId 时不受窗口限制；无 batchId 建议由 UI 保留临时气泡并对账 |
| R-CLIENT | 信息 | 全量测试唯一失败为 frontend WIP 的 `mentionQuery`（`mail@example.com` 期望 null，现返回 inactive 对象），与内核无关 | `test/client/logic.test.mjs:254` | frontend 修复后全量应回到 296/296 |

## 3. 最终结论（逐项）

| 模块 | 结论 | 说明 |
| --- | --- | --- |
| **B1 Markdown + fold** | **可接线** | XSS/HTML/链接白名单/降级无 HIGH；M1 软换行为近似值，建议 UI 传实际宽度或高度测量（非阻塞） |
| **B2 turns + resolveLeadSession** | **可接线** | 缺 turn/start 已改为 inferred + emptyReason；scope 行为符合契约（未知父链仍建议补 unknown/degraded 语义，R-M3 未在本轮变更，仍为 MEDIUM，见主评审） |
| **B3 防重复** | **可接线** | H1 清零；R-M4/R-M6 为边界加固，不改变「一次发送 1 条气泡」主路径；建议接线时一并补 deps.localBatches 一行与 M6 回归测试 |

**HIGH 清零，内核可接线。** 建议 backend 顺手完成 R-M4（一行）与 R-WEAK（弱匹配加 channel/session 条件），frontend 接线 F5/F30 时补 UI 级 echo 替换/误删断言；之后进入 UI 评审（架构 §6.12–§6.18 vs 实现）。

> 本轮为只读复审，未改源码；仅更新本评审记录与架构 v1.7.1 成员条口径（另一任务）。
