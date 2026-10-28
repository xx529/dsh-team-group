# 群聊插件（dsh-group-chat）· 安装 / 升级 / 回滚指南

> 任务：task-13（GC-INTEGRATION）· 集成 owner：backend
> 被测包：`/Users/lzx/Documents/GitHub/dsh-team-group/plugins/dsh-group-chat`
> 目标 profile：DSH Desktop（profile=desktop）
> 安装执行人：**Lead**（本仓库内只有 Lead 执行 `plugin_manager`；backend 不安装、不改 profile）
> 状态：**构建与打包校验已通过，等待 Lead 安装**；安装后由 backend 做冒烟并回填 `docs/install/evidence/`

---

## 0. TL;DR

```text
1) 校验（backend 已跑，结果见 §2）：
   node scripts/verify.mjs            # 33 项全过
   node scripts/build.mjs --check     # up to date: 26 modules · 11 parts
   npm test                           # 194 pass / 0 fail
   node --check lib/client.js         # OK

2) 安装（Lead 执行，绝对路径）：
   plugin_manager({
     action: "install_bundle",
     target: "/Users/lzx/Documents/GitHub/dsh-team-group/plugins/dsh-group-chat"
   })

3) 安装后（backend 冒烟）：
   - plugin_manager({action:"list_plugins"}) 确认 application=applied / 无 warnings
   - cordis_inspect_query({platform:"client",provider:"Slots",method:"listSubTree",
                           input:{root:"conversation.view"}}) 确认 group-chat occupant
   - 刷新页面（必要时重启 DSH Desktop）→ 对话页视图 tab 行出现「群聊」→ 点入截图留证
```

---

## 1. 包信息与产物清单（安装前快照）

| 项 | 值 |
| --- | --- |
| 包名 / 版本 | `@local/dsh-group-chat` · `0.1.0`（`private: true`，本地 bundle） |
| 插件/补丁 id | `group-chat`（`cordis.patch.yml` 的 `insert[].id`） |
| Host 入口 | `lib/index.js`（**空壳** `apply()`，v1 无 Host 业务） |
| Client 入口 | `lib/client.js`（`window.__ModuleLoader__.load({id:"@local/dsh-group-chat", factory})`，lazy） |
| 构建 | `node scripts/build.mjs`（零依赖拼接；`--check` 校验产物与源一致） |
| 集成校验 | `node scripts/verify.mjs`（33 checks，退出码 0=全过） |
| 测试 | `npm test` → **194 pass / 0 fail**（core 112 + send 39 + client 43） |
| 运行时依赖 | 仅 `react`（由宿主 module table 提供）；无第三方 npm 依赖 |
| 主题/i18n | 颜色只用 `--dsw-*` token；locale `zh/en` 各 146 key，键集一致 |
| 包大小 | 产物 `lib/client.js` 413,239 字符 / 448,528 B（约 438 KiB）；`icon.svg` 616 B |

**基准哈希（2026-10-28，安装前）**

| 文件 | SHA-256 |
| --- | --- |
| `lib/client.js` | `4abf82aedc83d2c20cce6f4827bad4ba86e045a454c15a4467051184d8d047ec` |
| `lib/index.js` | `8d7362e0cdca98090cdb1a86634bed06b7728083ef35487fd1a80bc38d7dfc41` |
| `package.json` | `a3dc0b061bb073577a7642a111a0178ab20f4e2dd815aaa46f0acd2848182998` |
| `cordis.patch.yml` | `0f8b01d21db57ab6cb7c24d93fcb165304f00a10f54924a34b480058e257f0c3` |
| `icon.svg` | `624d1d5bbe7f511d3fbc6dc8fc73408e1c7483068d89c3046d05684af9d535a4` |
| `locale/zh.json` | `24e52382949ea4900cfa9c78ebd2df8970826a03eb9a61ac71036088767150c5` |
| `locale/en.json` | `65302c4f7357b50a98002dc4db783afe3cf18f2110d4ce40c031d8ae72aa712b` |
| `lib/client.js` 结构 | 26 modules（core/adapters/send）+ 11 parts（client ui）+ inline locale/CSS |

> 升级/回滚时以这张表 + `scripts/verify.mjs` 输出为准；任何哈希变化都必须先重跑 §2 校验。

---

## 2. 安装前校验（backend 已执行，可复现）

在 `/Users/lzx/Documents/GitHub/dsh-team-group/plugins/dsh-group-chat` 下：

```bash
node scripts/verify.mjs            # 期望：✅ ALL PASS · 33 checks
node scripts/build.mjs --check     # 期望：[build] up to date: lib/client.js (26 modules, 11 parts)
npm test                           # 期望：# pass 194 / # fail 0
node --check lib/client.js         # 期望：无输出（退出码 0）
```

本次实测（2026-10-28）：

- `verify.mjs` → **33/33 PASS**；`lib/client.js sha256=4abf82aedc83d2c2…`
- `build.mjs --check` → up to date（26 modules · 11 parts）
- `npm test` → **194 pass / 0 fail**
- `node --check lib/client.js` / `lib/index.js` → 均通过

校验覆盖（`scripts/verify.mjs`）：

1. `package.json`：`main/exports/files/dsh.bundle.patch/dsh.client.platform+inject/engines` 完整，`files` 覆盖 `lib/*`、`locale/*.json`、`icon.svg`、`cordis.patch.yml`、`README.md`；
2. locale `zh/en` 键集一致（146 keys）且无空值；
3. `icon.svg` 为有效 SVG 且 < 256 KiB；
4. `lib/index.js` 无 import/require、仅导出 `apply`（Host 空壳）；
5. `lib/client.js`：`ModuleLoader.load({id:<包名>, factory})` 包装正确、只 `require('react')`、不含 Host 业务标记（`sessionQuery/connection.fetch/agentTeams/webServer.register/api/group-chat`）、无绝对路径 / Node 内建 / `src/host` 模块；含 `sendChannelBatch`、`createClientSessionSource`、`conversation.view`；
6. 构建一致性：重新计算产物并与 `lib/client.js` 逐字节比对（等价 `build.mjs --check`）；
7. 源码边界：core/adapters/send 无 `window/document`、相对 import 带 `.js`、无 default/动态 import/require、无跨目录越界。

> 说明：`node --test`（无参数）会额外把 `test/**` 下 5 个 helper/loader 文件当空测试文件计数（显示 199），
> **不是** 5 个真实用例；`npm test` 使用显式 glob（`test/core/*.test.js test/send/*.test.js test/client/*.test.mjs`），
> 194 = 112 core + 39 send + 43 client，是准数。

---

## 3. 安装（Lead 执行）

**工具参数（绝对路径，勿用 npm registry）：**

```json
{
  "action": "install_bundle",
  "target": "/Users/lzx/Documents/GitHub/dsh-team-group/plugins/dsh-group-chat"
}
```

- 本包**没有** `install`/`postinstall` 脚本 → 不需要 `approvedBuilds`；也不需要 `registry` 参数。
- `plugin_manager` 需要 danger-full-access / 用户批准（Lead 会话执行；backend 会话无批准权限）。
- 若 loader 要求「安装 spec」而非裸路径，备选（按优先级尝试，均指同一本地目录）：
  1. `target: "file:/Users/lzx/Documents/GitHub/dsh-team-group/plugins/dsh-group-chat"`
  2. 先 `plugin_manager({action:"list_plugins"})` 看已安装包的 `installationSpec` 形态，再按同形态传。
- **不要**把本包 `pnpm add`/`npm install` 到 profile；走 bundle patch 安装（`dsh.bundle.patch` + `dsh.client`）。

**预期结果**

- `application: "applied"`（或等价成功态）；`warnings` 为空或仅记录性提示；
- 已安装条目名 = `@local/dsh-group-chat`，启用（enabled）；
- bundle patch 插入一行 `id: group-chat`，加载 `main`（空壳）并让 Web 端加载 `./client`；
- 首次安装会改动 profile 的插件清单（**影响该 profile 下所有会话**，Lead 负责确认时机）。

---

## 4. 安装后检查（Lead 安装完 → backend 冒烟）

### 4.1 安装状态

```text
plugin_manager({action:"list_plugins"})
```

检查：

- 存在 `@local/dsh-group-chat`，`enabled=true`；
- 条目/安装结果里 `application` = `applied`（若有 `warnings` 原样记录到证据）；
- 记录安装返回的 `installationSpec` / 版本号，写入 `docs/install/evidence/01-install.txt`。

### 4.2 Client slot 注册（核心证据）

```text
cordis_inspect_query({
  platform: "client",
  provider: "Slots",
  method: "listSubTree",
  input: { root: "conversation.view" }
})
```

期望：`conversation.view` 子树里出现 **id=`group-chat`** 的 occupant（order=5，label 为本地化「群聊」）。
若 provider/method 名与预期不符：先 `cordis_inspect_list` 找 client Slots provider 的只读方法，再用等价查询（不要猜）。

### 4.3 GUI 冒烟（open-computer-use 操作 DSH Desktop）

前置：DSH Desktop 正在运行打开任一会话（团队会话最好）；先用 `get_app_state` 截图。

1. **刷新页面**（首次安装 client bundle 不保证 HMR；见 §5）→ 回到对话页；
2. 视图 tab 行应出现「群聊」（位于「对话」之后、「轨迹」之前；`role=tab`、无未读圆点）；
3. 点击「群聊」→ 出现频道头（群头像 + 团队名/成员数）、消息流（`data-testid="group-chat-feed"`）、输入区；
4. 无团队的单 agent 会话：显示空态「当前为单 Agent 会话（无团队）」且输入区可用（D-C）；
5. 截图 + 必要 DOM/AX 证据写入 `docs/install/evidence/`（命名见 §10）；
6. 打开浏览器 console/DSH 日志，确认无 `[group-chat]` 报错；把错误（若有）原样记录。

### 4.4 回填

冒烟完成后把「安装结果 + slot 输出 + 截图 + 错误日志」填进 `docs/install/evidence/`，并 `send_message lead` 结论（PASS/FAIL + 证据路径 + 偏差）。

---

## 5. HMR / 重启边界（重要）

| 变更 | 生效方式 |
| --- | --- |
| `lib/client.js`（client half） | **页面刷新**。已安装插件不依赖 `pnpm run dev:web`；ModuleLoader 的 HMR 只覆盖开发期 client 插件构建，不能假设自动热更。 |
| `lib/index.js` / `cordis.patch.yml` / `package.json`（Host 半/清单） | 需要重新加载 Host 插件清单：先尝试页面刷新；无效则**重启 DSH Desktop** 一次（profile 启动时读取 patch/bundle）。 |
| 仅 `src/**`/测试 | 不影响已安装产物；需重新 `node scripts/build.mjs` 后再刷新/重装。 |
| backend 的本地校验 | 不触碰 profile，无重启需求（`build --check` / `verify` / `npm test` 只读或只写本仓库）。 |

首次安装的实际生效边界（是否需要重启）以冒烟为准，记录到证据；**不要**为了让插件出现而修改 DSH 本体或 profile 配置文件。

---

## 6. 升级

```bash
# 仓库内（backend）
node scripts/build.mjs          # 重新生成 lib/client.js
node scripts/verify.mjs         # 33 checks 必须全过
npm test                        # 194 pass
node scripts/build.mjs --check  # up to date
```

然后（Lead）：

1. `plugin_manager({action:"remove_bundle", target:"@local/dsh-group-chat"})`（若同包重复安装会撞 patch id `group-chat`，先移除最稳）；
2. 再按 §3 安装同一路径；
3. 刷新页面/必要时重启 Desktop；
4. 按 §4.2 复核 slot，记录新哈希到证据。

> 同版本覆盖安装若被 loader 拒绝，可把 `package.json` 的 `version` 升一档（如 `0.1.1`）——这是构建/发布字段，属本任务允许改动范围，但需 Lead 确认后再改并重跑全量校验。

---

## 7. 卸载与回滚

### 7.1 卸载

```text
plugin_manager({action:"remove_bundle", target:"@local/dsh-group-chat"})
```

卸载后：刷新页面（必要时重启 Desktop）→ `list_plugins` 无该条目 → §4.2 slot 子树中不再有 `group-chat` → tab 消失。
回滚产物来源：本仓库 `plugins/dsh-group-chat`（不依赖网络），卸载失败可手工移除 profile 中该 bundle 目录（仅 Lead 操作，禁止 backend 改 profile）。

### 7.2 回滚到上一版本产物

1. 安装前已记录哈希（§1）。回滚时用对应版本仓库/备份恢复 `lib/client.js` 等文件；
2. `node scripts/build.mjs --check` 确认产物与源一致（若恢复的是旧产物，源也应是旧版本，否则会 stale）；
3. 按 §7.1 卸载 → §3 安装 → §4 复核；证据中注明回滚目标哈希。

### 7.3 回滚验证清单

- `plugin_manager list_plugins` 无条目 / 旧条目状态正确；
- `cordis_inspect_query … conversation.view`：无 `group-chat` occupant；
- GUI tab 行不再出现「群聊」，其它视图（对话/轨迹/上下文/终端/fleet/能力）不受影响；
- 浏览器 console 无残留加载错误。

---

## 8. 验收清单（安装 + 冒烟）

| # | 检查 | 期望 | 证据 |
| --- | --- | --- | --- |
| 1 | 安装结果 | `application=applied`、无关键 warning | `evidence/01-install.txt` |
| 2 | 已安装条目 | `@local/dsh-group-chat` enabled | 同上 |
| 3 | Client slot | `conversation.view` 含 `group-chat` occupant | `evidence/02-slot-inspect.txt` |
| 4 | Tab 可见 | 对话页出现「群聊」tab（无圆点） | `evidence/03-tab.png` |
| 5 | 可进入 | 频道头 + feed + 输入区渲染，无白屏 | `evidence/04-enter.png` |
| 6 | 无团队降级 | 单 agent 会话空态 + 输入可用 | `evidence/05-no-team.png` |
| 7 | 控制台/日志 | 无 `[group-chat]` error | `evidence/06-console.txt` |
| 8 | 副作用边界 | 其它 tab / 原生对话页不受影响 | `evidence/07-other-views.png` |

---

## 9. 故障排查

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| 安装返回 failed / 无条目 | 路径不是 bundle 根（缺 `package.json`/`cordis.patch.yml`）、spec 形态不对 | 用 §3 绝对路径；核对 `main`/`exports`/`dsh.bundle.patch`；必要时用 `file:` 形式 |
| 已安装但 tab 不出现 | 页面未刷新 / Host 未重启 / bundle 加载报错 | 先刷新，再重启 Desktop；查 console 与 `list_plugins` 的 warnings |
| `conversation.view` 无 occupant | `dsh.client.inject` 缺依赖或 slot 注册抛错 | 检查 inject 两项；看 console 是否 `conversation.view is not available` |
| tab 出现但点击白屏 | client bundle 运行时异常（ID/locale/token） | console 抓错；`node scripts/verify.mjs` 复核 bundle；前端修复后 rebuild+refresh |
| 与已有 view id 冲突 | `group-chat`/order 与其它插件重复 | `list_plugins` 排查；本插件固定 `id=group-chat, order=5`（不覆盖 chat/trajectory/context/terminal/fleet/capability） |
| 样式错乱 / 颜色缺失 | 主题 token 不存在或暗色切换 | 检查 `--dsw-alias-*`；本插件不硬编码品牌色 |
| 升级后仍是旧界面 | `lib/client.js` stale / 浏览器缓存 / 未重装 | `build --check`；刷新；按 §6 重装 |
| GUI 访问 401 | 直接访问 `127.0.0.1:<port>` 需 Desktop 鉴权 | 用 Desktop 内置窗口（open-computer-use）或 Lead 提供的已鉴权 URL |
| 插件影响其它会话 | 安装是 profile 级 | Lead 在低风险时机安装；回滚见 §7 |

---

## 10. 证据目录约定

`docs/install/evidence/`（backend 冒烟时写入；文本优先，截图 PNG）：

```
01-install.txt            # plugin_manager 安装返回（application/warnings/entry/spec）
02-slot-inspect.txt       # cordis_inspect_query listSubTree 原始输出（脱敏）
03-tab.png                # 对话页 tab 行（含「群聊」）
04-enter.png              # 进入群聊后的主界面
05-no-team.png            # 单 agent 会话空态
06-console.txt            # 浏览器 console / DSH 日志中的 [group-chat] 记录
07-other-views.png        # 对话/轨迹等其它视图未受影响
RUN.md                    # 执行时间/环境（DSH 版本、Desktop 端口、操作者、结论 PASS/FAIL）
```

---

## 11. 已知限制（v1，安装后仍需真机复核）

1. **v1 纯 Client**：Host 半是空壳；不注册 Host 路由/Service；数据聚合/发送全在浏览器侧（见 `docs/adr/group-chat-send.md`、架构 §3.3/§4.7）。
2. **安装为本地 bundle**：不发布 npm；升级/回滚依赖本仓库产物与哈希记录。
3. **首次加载边界**：client bundle 变更需页面刷新；Host 清单变更可能需要一次 Desktop 重启（以冒烟实际结果为准）。
4. **运行期 UNVERIFIED**：`ctx.sessions.binding/eventSource` 的真实形状、`deliverables/presented` 文件消息形状、只读判定信号（团队结束/归档）、`rpcId` 对账在真实宿主下的表现——由冒烟与 QA 复核。
5. **重试前缀**：`batchRegistry` 为内存态；页面刷新后若只重试失败目标子集，前缀 N 可能按子集计算（ADR §2.6）。
6. **能力边界**：无 tab 未读圆点（改为消息浮标）、无 `@all`、无附件/语音、无消息编辑/撤回、无多选筛选（v1 非目标）。
7. **profile 影响面**：安装对 `desktop` profile 全局生效；不修改 DSH 本体与 profile 配置文件（安装由 Lead 执行）。
8. 本指南先于真机安装编写；**§4 冒烟结果回填后**，以证据与 `RUN.md` 的结论为准（若涉及行为变更，回写本节）。
