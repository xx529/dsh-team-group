# DSH 0.2.2-rc.1 适配取证与修复记录

> **rc.2 续篇**：DSH 0.2.2-rc.2 的契约变化（`agentTeam.members` 移除、`subagentCatalog` 承接成员目录、`catalog v3 name`）与修复见 `docs/research/dsh-0.2.2-rc2-compat.md`；本文的 end-seed/窗口延迟修复在 rc2 继续有效。

- 任务：DSH 升级到 **0.2.2-rc.1** 后，检查 `@local/dsh-group-chat` 插件的适配情况并修复未适配点。
- 日期：2026-11-08
- 环境：DSH Desktop **0.2.2-rc.1**（`Contents/Info.plist` `CFBundleShortVersionString=0.2.2-rc.1`；`dsh/package.json` `version=0.2.2-rc.1`，`dsh-cordis-client-runner` 等同版本）；macOS · profile=desktop。
- 对照组：DSH Desktop **0.2.1-rc.3**（更新器缓存 `~/Library/Caches/@deepseek-aidsh-desktop-updater/pending/deepseek-harness-0.2.1-rc.3-mac-arm64.zip` 内的 `app.asar`）。
- 结论：**插件在 0.2.2-rc.1 上可加载、视图可注册、真机可渲染历史**；发现并修复 **2 个导致群聊空 feed 的问题**，新增 3 条回归测试。其余宿主契约（slot / sessions / 发送 / locale / 主题 / DOM 标记）在 0.2.2 中保持不变或仅新增。

## 1. 方法

1. 解析两版 `app.asar` 头部（Pickle + JSON header），文件级 diff `dsh/node_modules/@deepseek-ai/**`（0.2.1-rc.3: 6955 files / 0.2.2-rc.1: 10730 files，新增 Forge / Liveshare / action-cards / message-quotes 等 24 个包，无删除）。
2. 逐项对比插件依赖的**契约面**（client runner 的 slot catalog、`dsh-api-session-controller` 的 client 接口、`dsh-api-remotes` 的 wire schema、theme token、client-modules 加载协议）。
3. 隔离环境真机验证：`DSH_HOME=/tmp/gcverify` + 独立 profile（base + web-app + agent-team + 本插件 link），复制一份真实团队会话（Lead `session-fd60565f…` + 8 个子会话）后，用 Playwright 打开 Web GUI，核对 tab 注册、成员条、消息流、任务卡、轨迹面板与 console。
4. 修复后回归：`node scripts/build.mjs` / `build --check` / `verify.mjs` / `npm test`。

## 2. 契约对比结果（0.2.1-rc.3 → 0.2.2-rc.1）

| 契约面 | 结论 | 证据 |
| --- | --- | --- |
| `conversation.view` slot | 兼容 | `registerOptions`（`id/order/label`）与 `ConvViewOwnerProps` 逐字相同；`standardProps` 仅**新增** `useContextMenu`（插件不依赖）；`declaredBy/source` 行号变化 |
| `ISessions` / `SessionBinding` / `SessionEventSource` / `SessionEventWindow` | 不变 | runner catalog declaration 逐字相同 |
| `SessionListState` / `SessionSnapshot` / `PendingSubmission` | 不变（类型名 `SessionProjectionMap`→`SessionProjectionViewValues`，运行形状相同） | runner catalog |
| `ISession.prompt(content, mode, signal, requestId)` | 签名不变 | runner catalog |
| 发送回显语义 | **行为变化**（见 §3.2 未覆盖项） | `dsh-api-session-controller/lib/types/client/sessions/session.js`：0.2.2 的 `beginSubmission` 新增 `onAccept`，`pendingSubmissions` 只含 Host 已接受的 echo |
| `agentTeam` wire projection | 不变 | `dsh-api-remotes/lib/client.js` 的 zod schema 两版逐字节相同（`stateVersion` 仍由 host 注册，wire 视图不变） |
| locale | 不变 | `register(ns, dicts)` / `getSnapshot().active` / `subscribe` 不变 |
| 客户端 bundle 协议 | 不变 | `window.__ModuleLoader__.load({id, factory})`、`dsh.client.{platform,inject,immediately}` 解析逻辑不变（client-modules 仅新增 `external`/assets 能力） |
| 主题 token | 兼容 | 两版均 403→414 个 `--dsw-*`；**无删除**涉及插件（插件使用的 34 个 token 全部保留；`--dsw-alias-scrollbar-bg-hover-l1` 两版都未定义，属既有 fallback） |
| 宿主 DOM 标记 | 不变 | `[data-conversation-region="composer"]`、`[data-composer-seat]`、`viewArea` 类名（哈希前缀+`viewArea`）均保留；新增 `data-composer-seat` 于 session-inspector |
| Session 事件类型集 | 不变 | `dsh-session` 的 `KNOWN_SESSION_EVENT_TYPES` 两版相同 |
| Session 日志格式 | 不变 | `SESSION_FORMAT_VERSION = 4`；无新迁移包 |
| `engines.dsh` 判定 | 通过 | 0.2.2 用 `semver.satisfies(runtime, range, {includePrerelease:true})`；`>=0.2.0-rc.2 || >=0.2.1-rc.2` 对 `0.2.2-rc.1` 为 **true**；`dsh.compatibility.dshReleases` 在 0.2.2 app-boot 中已**不再读取**（仅保留声明） |

## 3. 发现并修复的问题

### 3.1 `session/end-seed` 语义混淆 → 历史整段被丢弃（空 feed）

- **现象**：0.2.2 真机上打开一个已有团队历史的会话，群聊显示「团队还没有发言」；同一会话「对话」视图消息正常。
- **取证**：`navigator` 侧窗口有 **394 条**事件信封，`normalizeEntries` 全部解析成功，但 `normalizeChannel` 的 `diagnostics.inheritedDropped = 394`；该会话日志尾部是 `{"type":"session/end-seed", "seq":7542, "data":{}}`。
- **根因**：旧逻辑把所有 `session/end-seed` 的最大 seq 当继承 cutoff。0.2.x 在**同一会话被 resume/续写**时，会向日志追加普通 `session/end-seed`（`data: {}`）标记续写边界；它**不是**父会话继承前缀。0.2.2 的 `follow` 新增 `activate: true`（`transport.js`），普通会话打开即可能被 promote/resume，使该标记在冷会话上更常见。
- **权威语义**（0.2.2 `dsh-session/lib/index.js`）：
  - `buildForkSeed()` 生成 fork 种子：`{ type: 'session/end-seed', data: { inherited: true } }`（唯一继承标记）；
  - Session 构造器在 seed 续写（非 seeded snapshot）时追加：`{ type: 'session/end-seed', data: {} }`（续写边界）。
- **修复**：`src/core/normalize.js`（`collectSession`）与 `src/core/turns.js`（`aggregateTurns`）只把 **`data.inherited === true`** 的 end-seed 计入 cutoff；普通 `{}` end-seed 仍跳过自身、但不再隐藏历史。
- **回归**：`test/core/end-seed.test.js`（2 条：resume 标记不丢历史 / fork 标记仍丢弃）；既有 `06-seeded-fork` fixture（`inherited:true`）用例继续通过。

### 3.2 激活后的窗口延迟 → 首次订阅丢更新（空 feed）

- **现象**：冷会话首次进入群聊时 `retain().ready` 已 resolve，但 `binding.eventSource.getSnapshot().entries` 仍为空（`hasMore:true`）；完整窗口随后以第二个 `replace` 帧到达。
- **根因**：0.2.2 `follow` 先回空 snapshot 再因 `activate:true` promote 会话后回完整窗口；该 `replace` 通知可能落在 `source.open()` resolve 与 UI `source.subscribe()` 之间的窗口外，插件只在通知时推送增量 → feed 停在空态（日志中可见 `window notified … entries 394` 之后无 `sync`）。
- **修复**：`src/adapters/client-session-source.js` 的 `subscribe()` 注册监听后主动 `_schedule('append')`；UI 随即按当前窗口 `sync()`（返回全量，按 id 合并）。
- **回归**：`test/core/client-session-source.test.js` 新增「open 时窗口为空 → 晚到 replace → subscribe 后自动补通知并 sync 出历史」。

## 4. 真机验证（0.2.2-rc.1 + 隔离 profile）

- profile：`DSH_HOME=/tmp/gcverify`，`profile=gc-verify`，bundles=`@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`、`@deepseek-ai/dsh-experimental-agent-team-profile`、`@local/dsh-group-chat`（link 本仓库）。
- 会话：复制真实团队会话 `session-fd60565f…`（cwd=`/Users/lzx/Documents/GitHub/dsh-team-group`）及其 8 个子会话日志到测试 home。
- 结果（修复后）：
  - tab 行出现 **对话 / 群聊 / 轨迹**，`群聊` 可选中；
  - 成员条：9 名成员（lead + 8），完整名字 + 状态点，`0 工作中 · 9 等待`；
  - 消息流：时间分隔、用户消息、任务卡（创建/认领/完成 task-112…116）、`agent_to_agent`、`agent_output`、发送说明等均正常渲染，底部「已到最早消息」；
  - 宿主 composer 被隐藏，仅插件 composer；成员头像可打开自研「轮次轨迹」抽屉；
  - console 无群聊插件报错（仅有测试 profile 特有的 `/api/changes.summary` 404 与加载期连接重试噪声 —— 与 `dsh-workspace-changes`/复制会话相关，非插件）。
- 截图：`tests/artifacts/dsh022-groupchat-history.png`。

## 5. 未覆盖 / 残留风险

1. **真机端到端发送未验证**：测试环境无模型 API Key。`prompt()` 签名不变，插件发送走「本地 echo + `clientBatchId`/`requestId` 去重」，**不依赖** 0.2.2 的 accept-gated `pendingSubmissions`；多目标同发仍由单测覆盖。建议在真机（desktop profile）点一次单目标发送确认。
2. **`activate: true` 的副作用**：0.2.2 中 `retain → follow(activate:true)` 会 promote 非 subagent 的普通会话（即打开即恢复 Agent）。群聊会 retain Lead 与成员会话；Lead 的恢复与「对话」视图行为一致，但值得在真实使用中观察是否有额外资源/状态影响（成员为 `origin:'subagent'`，Host 明确不 promote）。
3. **兼容矩阵字段**：`dsh.compatibility.dshReleases` 已补 `0.2.2-rc.1`，但 0.2.2 的 `evaluatePluginCompatibility` 只读 `engines.dsh`（已满足）；该字段仅对仍读取它的插件市场/工具链有意义。

## 6. 变更清单

- `plugins/dsh-group-chat/src/core/normalize.js`：end-seed cutoff 只认 `inherited:true`（含注释与证据）。
- `plugins/dsh-group-chat/src/core/turns.js`：同上（轮次聚合）。
- `plugins/dsh-group-chat/src/adapters/client-session-source.js`：`subscribe()` 后补一次 append 通知。
- `plugins/dsh-group-chat/test/core/end-seed.test.js`：新增 2 条回归。
- `plugins/dsh-group-chat/test/core/client-session-source.test.js`：新增 0.2.2 延迟窗口回归。
- `plugins/dsh-group-chat/package.json`：`dsh.compatibility.dshReleases` 补 `0.2.2-rc.1: compatible`。
- `docs/architecture/group-chat-architecture.md`：决策记录 v1.7.4 + §4.3.3 ② 语义修订 + 依赖声明片段。
- `docs/research/dsh-0.2.2-compat.md`（本文）、`tests/runs/2026-11-08-dsh-022-compat.md`、`tests/artifacts/dsh022-groupchat-history.png`。
