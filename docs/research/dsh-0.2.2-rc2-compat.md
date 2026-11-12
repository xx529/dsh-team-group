# DSH 0.2.2-rc.2 适配取证与修复记录

- 任务：DSH 升级到 **0.2.2-rc.2** 后，检查 `@local/dsh-group-chat` 插件的适配情况并修复未适配点。
- 日期：2026-11-13
- 环境：DSH Desktop **0.2.2-rc.2**（app.asar `package.json` `version=0.2.2-rc.2`；CLI `dsh --version` = `0.2.2-rc.2`；profile=desktop）。
- 对照组：npm registry 上 `@deepseek-ai/dsh-{api-session-controller,client-ui-conversation,client-modules,cordis-client-runner,session,api-remotes,client-locale,client-ui-theme}@0.2.2-rc.1`（8 个 tarball，逐包 diff）与 rc2 asar 内同包。
- 结论：插件在 0.2.2-rc.2 上**可加载、tab 可注册、历史/成员条/任务卡/输入器真机正常**；发现 **1 个会退化成员目录的行为变化**（`agentTeam.members` 移除）并修复。其余宿主契约（slot / sessions / 发送 / locale / 主题 / 打包协议）保持不变或仅新增。

## 1. 方法

1. 用自写 asar 解析器（Pickle + JSON header）提取 rc2 的 `dsh/node_modules/@deepseek-ai/**` 关键包（session-controller / ui-conversation / client-modules / client-runner / session / api-remotes / locale / theme / subagent / agent-team）。
2. `npm pack` 同版本子包的 **0.2.2-rc.1** 与 **0.2.2-rc.2**，逐包 `diff -rq` + 关键 `.d.ts` / `.ts` / `lib/index.js` 人工比对。
3. 隔离环境真机验证：`DSH_HOME=/tmp/gcverify-rc2` + profile `gc-verify`（base + web-app + 本插件 link，客户端依赖用 asar 内 rc2 包补齐），复制真实团队会话（Lead `session-fd60565f…` + 8 个子会话）后用 CDP 驱动无头 Chromium 打开 Web GUI，切到「Group chat」核对成员条/消息流/任务卡/输入器并截图。

## 2. 契约对比结果（0.2.2-rc.1 → 0.2.2-rc.2）

| 契约面 | 结论 | 证据 |
| --- | --- | --- |
| `conversation.view` slot | 兼容 | `slots.d.ts` 的 registerOptions 仍为 `id/order/label`；仅新增 `conversation.hero.frame`（hoc）与 `ContextMenuTargetMap.sessionHeader`，插件不依赖 |
| `ISessions` / `binding` / `retain` / `SessionReference.ready` | 不变 | `contract/sessions.d.ts` 仅注释与 `fork` 的 `allowMigration` 变化；`retain(target, {source})` 与 fallback `gateway` 仍有效 |
| `SessionEventSource` / `SessionEventWindow`（entries/hasMore/revision/change） | 不变 | `cordis-client-runner` 的 TYPE_API 逐字相同 |
| `ISession.prompt(content, mode, signal, requestId)` | 不变 | `contract/session.d.ts:93` |
| `SessionSnapshot.parentAvailable` | **移除** | 插件不读 snapshot.parentAvailable（成员对象上的 `parentAvailable` 由事件名册/roster 计算），无影响 |
| `loadOlder()` | **新增可选参数** `{deferConsumption?}` + `consumeOlder()` | 插件无参调用 `session.loadOlder()` 仍兼容；rc2 语义为「一次只加载一页」 |
| `pendingSubmissions` / `beginSubmission` | 未变 | rc1 已记录 accept-gated echo；插件仍用本地 echo + `clientBatchId/requestId` 去重 |
| **`agentTeam` 投影** | **破坏性变化**：`TeamProjection` 从 `{members,tasks,failure}` 变为 `{enabled,tasks,failure}`（**members 移除**） | `dsh-agent-team/src/types.ts` 的 `TeamProjection`；`projection.ts:205` 注释「成员由既有 `subagentCatalog` 投影单独提供」；rc2 rc1 wire schema diff |
| **`subagentCatalog` 投影** | **新增成员目录来源**：`SubagentCatalogEntry[]`（direct children，含 `id/createdAt/mode/label/name`） | `dsh-subagent/src/projection-types.ts`；`ui-agent-team` TeamBoard 用 `values.subagentCatalog` 判断成员 |
| `subagent/catalog` 事件 | **v3 新增 `name`**（父会话内唯一 agent 名）；`label` 仍为创建描述 | `dsh-subagent/src/catalog.ts`（`SUBAGENT_CATALOG_VERSION = 3`）；插件此前只解析 label |
| `subagent/descriptor` 事件 | v3 不变（mode/provider/label/agentModel…，无 name） | `dsh-subagent/src/descriptor.ts` |
| `team/member` 事件 | 类型保留（历史日志可读）；rc2 的 `dsh-agent-team` 不再写该事件（teammate 改为 subagent 承载） | `dsh-session/known-event-types.ts` 仍含 `team/member`；`dsh-agent-team/lib/index.js` 无该事件写入 |
| `session/end-seed` 语义 | 不变 | `dsh-session/src/fork.ts` 仍写 `data:{inherited:true}`；`index.ts:731` 续写边界仍写 `data:{}`；rc1 修复继续有效 |
| `locale.register(ns, dicts)` | 不变 | rc1/rc2 的 `lib/client.js` 实现均为 `register(ns, localeOrDicts, dict)`（2/3 参兼容） |
| 客户端 bundle 协议 | 不变 | rc2 `client-modules/lib/client.js` 仍消费 `window.__ModuleLoader__.load({id,factory})`；新增 entry-lifecycle/assets 为增量 |
| 主题 token | 兼容 | rc2 的 215 个 CSS 共 450 个 `--dsw-*` 定义；插件使用 32 个 token，仅 `--dsw-alias-scrollbar-bg-hover-l1` 未定义（rc1 同样未定义，属既有 fallback，非回归） |
| 项目渲染 hook / `useSessions` / `sessionId` | 不变 | `conversation.view` owner 标准 props 未变；`projectionsBySession[lead].values` 仍可读 |

## 3. 发现并修复的问题

### 3.1 成员目录退化：`agentTeam.members` 移除后权威名册为空

- **现象（静态 + 单测复现）**：rc2 的 `values.agentTeam` 只有 `{enabled,tasks,failure}`；插件 `gcRosterMembersFrom(agentTeam)` 返回 `[]`，D-03 的 authority 覆盖与「成员数/running 以投影为准」全部失效，只能依赖事件名册。
- **证据**：
  - rc2 `dsh-agent-team/src/types.ts`：`TeamProjection = {enabled, tasks, failure?}`；
  - rc2 `dsh-agent-team/src/projection.ts:205-207`：成员「supplied separately by the existing `subagentCatalog` projection」；
  - rc2 `dsh-client-ui-agent-team/src/client/TeamBoard.tsx:84`：`state.projectionsBySession[sessionId]?.values.subagentCatalog?.length` 判断成员；
  - dpkg diff：rc1 `agentTeam` wire schema 的 `members` 数组在 rc2 消失。
- **修复**：
  1. `src/client/parts/90-view.part.js`：`useSessions` selector 同时返回 `{agentTeam, subagentCatalog}`，`getMembers()` 与 `withRoster()` 把 catalog 传入合并；新增 `getSummaries()`（`sessions.list.byId`）用于补 catalog 成员的 running 态。
  2. `src/client/parts/20-store.part.js`：`gcRosterMembersFrom(agentTeam, subagentCatalog, leadSessionId)` 将 catalog 条目以 `kind:'subagent'` 补入 authority 名册；`gcMergeRosterChannel` 支持 subagent 补员（depth 2 / badge subagent / 可寻址按状态）、按 `byId.running` 补状态、保留「· 父名 的子体」后缀。
  3. `src/core/normalize.js`：`subagent/catalog` 解析保留 v3 `name`。
  4. `src/core/roster.js`：subagent 成员短名优先 `catalog.name`，`label` 仅作 `description`；无 name 的历史记录退回 label。
- **回归**：`test/core/rc2-subagent-catalog.test.js`（2 条：v3 name 作短名 / 历史无 name 退回 label 且不把 id 当名字）；`test/client/locale.test.mjs` 新增「D-03 rc2: subagentCatalog 作为成员目录（agentTeam 无 members）」。

### 3.2 真机验证中的作用域回归（修复过程中发现）

- `withRoster()` 位于模块级 `gcCreateController`，最初误引用组件内 `sessionsByIdRef` → 首屏 `sessionsByIdRef is not defined`，群聊渲染失败（页面显示「加载失败」）。
- **修复**：通过 controller options 注入 `getSummaries()`（组件内定义、闭包读取 ref），`withRoster` 只调用 `options.getSummaries()`；回归由 `npm test`（336 条）与真机复验覆盖。

## 4. 真机验证（0.2.2-rc.2 + 隔离 profile）

- profile：`DSH_HOME=/tmp/gcverify-rc2`，`profile=gc-verify`，bundles=`@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`、`@local/dsh-group-chat`（rc2 base/web-app 已内置 agent-team / tool-agent-team / ui-agent-team）。
- 会话：复制真实团队会话 `session-fd60565f…`（9 名成员/8 子会话）到隔离 home，只读打开。
- 结果（CDP + 无头 Chromium，1440×900@2×）：
  - tab 行 **Chat / Group chat / Trajectory**，`Group chat` 可选中；
  - 成员条 **9 名成员全显**（无 `+N`），完整名字 + 状态点，头部 `9 members · 0 working · 9 waiting`；
  - 消息流：时间分隔、用户消息、任务卡（Created/Claimed/Completed）、agent 输出、成员名徽标均正常；
  - 插件 composer + target row（`@Lead`）+ 提示「Type @ to send to more members」正常；
  - 宿主 composer 被隐藏（`group-chat-composer` 存在）。
- 截图：`tests/artifacts/dsh022rc2-groupchat.png`（800×600 视口）、`tests/artifacts/dsh022rc2-groupchat-1440.png`（1440×900@2×）。
- 说明：历史会话是 rc1 事件格式（catalog 无 name），成员名按既有规则回退为 label（描述），与 rc1 行为一致；rc2 新格式（catalog v3 name）的短名由单测覆盖。

## 5. 未覆盖 / 残留风险

1. **真机端到端发送未验证**：隔离环境无模型 API Key；`prompt()` 签名不变，插件发送走本地 echo + requestId 去重，由 `test/send/*` 覆盖。
2. **rc2 新格式团队会话的真机成员条**：无法在无 API Key 环境产生新的 `subagent/catalog v3` 事件；已由 `test/core/rc2-subagent-catalog.test.js` 与 client 纯函数测试覆盖，建议有 Key 时补一次真机（新会话创建 teammate 后看短名）。
3. **`activate:true` 副作用**：与 rc1 相同（retain Lead 会 promote 普通会话）；成员为 subagent，Host 不 promote。
4. **隔离验证依赖 asar 内 rc2 包**：`/tmp/gcverify-rc2/profiles/gc-verify/node_modules` 来自 app.asar 提取；仅验证用，不入库。

## 6. 变更清单

- `plugins/dsh-group-chat/src/core/normalize.js`：解析 `subagent/catalog` v3 的 `name`。
- `plugins/dsh-group-chat/src/core/roster.js`：subagent 短名优先 catalog.name；label 作 description。
- `plugins/dsh-group-chat/src/client/parts/90-view.part.js`：订阅 `subagentCatalog` + `getSummaries`，传给 `withRoster`/`getMembers`。
- `plugins/dsh-group-chat/src/client/parts/20-store.part.js`：`gcRosterMembersFrom`/`gcMergeRosterChannel` 支持 catalog 成员与 byId running。
- `plugins/dsh-group-chat/test/core/rc2-subagent-catalog.test.js`（新增 2 条）。
- `plugins/dsh-group-chat/test/client/locale.test.mjs`（新增 D-03 rc2 1 条）。
- `plugins/dsh-group-chat/package.json`：`dsh.compatibility.dshReleases` 补 `0.2.2-rc.2: compatible`。
- `docs/research/dsh-0.2.2-rc2-compat.md`（本文）、`tests/runs/2026-11-13-dsh-022rc2-compat.md`、`tests/artifacts/dsh022rc2-groupchat*.png`。
