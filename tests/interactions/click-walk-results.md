# 控件点击走查执行结果（task-27）

- 执行时间：2026-10-28 18:16–18:30
- 环境：DSH Desktop 0.2.1-rc.3 · profile=desktop · 已装群聊插件 `95ee3b12…`
- 方式：open-computer-use 操作真实窗口；截图见 `tests/artifacts/**`
- 判定：PASS / FAIL / PARTIAL（存在性/部分验证）/ BLOCKED（前置不具备）/ NOT_EXECUTED（未执行，不得视为通过）

## 执行摘要

| 状态 | 数量 |
| --- | --- |
| PASS | 3（CW-01 tab 存在/选中；CW-04 筛选入口存在；CW-41/44 相关「已到最早消息」属 E2E-07） |
| FAIL | 1（CW-12 输入器：团队态无插件 composer） |
| PARTIAL | 6（CW-06/08/09/33/34/37/38/39/40 存在性；CW-44 最早消息标签） |
| BLOCKED | 其余（团队态无 composer → 发送/@/折叠后续无法执行；只读/空态/窄屏前置未构造） |

> 关键阻断：CW-12 的 FAIL 使所有依赖输入器的用例（CW-13…CW-31、CW-43、CW-45）无法执行；CW-01/02 中 tab 可通过 click 切换（已观察 selected），但键盘未执行。

## 逐条结果（45）

| ID | 控件 | 结果 | 观察/原因 |
| --- | --- | --- | --- |
| CW-01 | 群聊 tab | PASS | tab 组存在「群聊」且 `selected`；位于对话后轨迹前（AX） |
| CW-02 | tab 键盘 | NOT_EXECUTED | 未做纯键盘方向键测试 |
| CW-03 | 切走再切回 | NOT_EXECUTED | 未执行 |
| CW-04 | 频道头筛选图标 | PASS（存在）/ 菜单未展开 | AX `pop up button 筛选成员` 存在 |
| CW-05 | 筛选成员项 | NOT_EXECUTED | 菜单未展开 |
| CW-06 | 菜单外点击/Esc | NOT_EXECUTED | 同上 |
| CW-07 | 筛选提示条「清除」 | NOT_EXECUTED | 未筛选 |
| CW-08 | 768「成员 ▾」 | BLOCKED | 未调窄屏 |
| CW-09 | 768 筛选入口 | BLOCKED | 未调窄屏 |
| CW-10 | 未读浮标 | BLOCKED | 当前 feed 未出现未读浮标 |
| CW-11 | 频道头 N 条新消息 | BLOCKED | 未出现 |
| CW-12 | 文本输入框（插件 composer） | **FAIL（F-01）** | 团队群聊视图底部仅宿主 composer；AX 无 `group-chat-composer`/`发送给`/`回复群聊` |
| CW-13 | 发送键（单目标） | BLOCKED | composer 缺失 |
| CW-14 | 发送键（多目标） | BLOCKED | composer 缺失 |
| CW-15 | 空文本禁用 | BLOCKED | composer 缺失 |
| CW-16 | 连点防重 | BLOCKED | composer 缺失 |
| CW-17 | 只读发送键 | BLOCKED | 未构造只读会话 |
| CW-18 | 键入 @ 弹层 | BLOCKED | composer 缺失 |
| CW-19 | 补全行点击 | BLOCKED | 同上 |
| CW-20 | ↑/↓ 高亮 | BLOCKED | 同上 |
| CW-21 | Enter 确认 | BLOCKED | 同上 |
| CW-22 | Tab 确认 | BLOCKED | 同上 |
| CW-23 | Esc 关闭 | BLOCKED | 同上 |
| CW-24 | 外部点击关闭 | BLOCKED | 同上 |
| CW-25 | chip 退格整体删除 | BLOCKED | 同上 |
| CW-26 | 失效 chip 剔除 | BLOCKED | 同上 |
| CW-27 | 折叠「展开全部」 | PARTIAL（存在） | AX 有「展开全部（约 1445 字）」按钮；未点击 |
| CW-28 | 折叠「收起」 | NOT_EXECUTED | 未展开 |
| CW-29 | 折叠键盘 | NOT_EXECUTED | 未执行 |
| CW-30 | 失败「重试」 | BLOCKED | 无失败气泡 |
| CW-31 | 失败「复制原文」 | BLOCKED | 无失败气泡 |
| CW-32 | partial「重试失败项」 | BLOCKED | 无 partial 气泡 |
| CW-33 | hover「复制」 | PARTIAL（存在） | AX「复制原文」按钮存在；未点击 |
| CW-34 | 「打开所属会话」 | PARTIAL（存在） | AX 按钮存在；未点击 |
| CW-35 | 内联 @ 点击 | NOT_EXECUTED | 有 @lead 内联按钮，未点击 |
| CW-36 | subagent 后缀点击 | NOT_EXECUTED | 未见可点击后缀 |
| CW-37 | 成员卡「查看会话」 | PARTIAL（存在） | AX 按钮存在；未点击 |
| CW-38 | 成员卡「查看任务」 | PARTIAL（存在） | AX 按钮存在；未点击 |
| CW-39 | 初始任务「展开」 | PARTIAL（存在） | AX `button 展开` 存在；未点击 |
| CW-40 | 初始任务「收起」 | NOT_EXECUTED | 未展开 |
| CW-41 | 错误卡「重试」 | BLOCKED | 未构造错误 |
| CW-42 | 「重连」 | BLOCKED | 未断线 |
| CW-43 | 「如何组建团队」 | BLOCKED | 新会话未进入群聊视图（context 未就绪） |
| CW-44 | 上滚到顶加载更早 | PARTIAL | feed 顶部已显示「已到最早消息」；未执行滚动加载 |
| CW-45 | 只读负向 | BLOCKED | 未构造只读会话 |

## 结论

- 走查覆盖率不足：45 条中 **PASS 1 / FAIL 1 / PARTIAL 7 / BLOCKED/未执行 36**；根因是 **团队态插件输入器缺失（F-01）**，导致发送、@、折叠后交互等主路径整体不可执行。
- 该覆盖缺口本身不构成 PASS；结合 F-01/F-02 两个 HIGH，task-27 判 **FAIL**（详见 `tests/runs/2026-10-28-task-27.md`）。
- 后续修复 F-01 后需重跑本清单全部 45 条；F-02 修复后补身份显示断言。

---

## task-54 复跑增量（F-01/F-02 修复后，2026-10-28 18:40–18:50）

| ID | 控件 | 结果 | 观察 |
| --- | --- | --- | --- |
| CW-01 | 群聊 tab | PASS | tab 组存在「群聊」且 selected；对话→群聊→轨迹顺序（AX） |
| CW-02 | tab 键盘 | NOT_EXECUTED | 未做纯键盘切换 |
| CW-04 | 频道头筛选图标 | PARTIAL | AX `pop up button 筛选成员` 存在；菜单未展开 |
| CW-05/06 | 筛选菜单/关闭 | NOT_EXECUTED | 菜单未展开 |
| CW-07 | 筛选提示条清除 | BLOCKED | 未筛选 |
| CW-08/09 | 768 筛选/成员入口 | BLOCKED | 未调窄屏（computer-use 无 resize） |
| CW-10/11 | 未读浮标/频道头提示 | BLOCKED | 当前视图无未读 |
| CW-12 | 插件 composer | **PASS** | 团队长 feed 底部可见「发送给 Lead / 回复群聊… / 发送键」；AX 目标行文本存在；与宿主 composer 上下分离（截图 e2e-04） |
| CW-13/14 | 发送键（单/多目标） | BLOCKED | 临时单 agent 会话无法在安全前提下建立/发送；多目标不真机直发 |
| CW-15/16 | 空文本禁用/连点 | BLOCKED | 同上 |
| CW-17 | 只读发送键 | BLOCKED | 无可只读会话 |
| CW-18…26 | @ 补全键盘/chip | NOT_EXECUTED | composer 已存在，但为保证「不写用户真实会话」未在该团队会话输入；临时会话未建立 |
| CW-27/28 | 折叠展开/收起 | PARTIAL | AX 可见「展开全部（约 1171/754/… 字）」按钮；未点击 |
| CW-29 | 折叠键盘 | NOT_EXECUTED | — |
| CW-30/31 | 失败重试/复制原文 | BLOCKED | 无失败气泡 |
| CW-32 | partial 重试失败项 | BLOCKED | 无 partial 气泡 |
| CW-33/34 | 复制/打开所属会话 | PARTIAL | AX 按钮存在；未点击 |
| CW-35/36 | 内联 @ / subagent 后缀 | NOT_EXECUTED | 无可视样例 |
| CW-37/38 | 成员卡查看会话/任务 | PARTIAL | AX 按钮存在；未点击 |
| CW-39/40 | 初始任务展开/收起 | PARTIAL | AX「展开」按钮存在；未点击 |
| CW-41/42 | 错误重试/重连 | BLOCKED | 未构造故障 |
| CW-43 | 无团队空态 | BLOCKED | 新会话在首 prompt 前无群聊视图 |
| CW-44 | 分页/最早消息 | PARTIAL | feed 顶部显示「已到最早消息」；未滚动加载 |
| CW-45 | 只读负向 | BLOCKED | 无只读会话 |

**增量结论**：F-01 直接证据成立（CW-12 PASS）；F-02 由 sender/owner 文本验证（见 `tests/runs/2026-10-28-task-54.md`）。发送主路径与 @/折叠/卡片动作等仍为 BLOCKED/NOT_EXECUTED；全量 click-walk 仍不完整。

---

## task-55 增量（专用测试会话 e2e send test，2026-10-28 18:47–18:50）

| ID | 控件 | 结果 | 观察 |
| --- | --- | --- | --- |
| CW-12 | 插件 composer（测试会话） | **PASS** | 单 agent 群聊底部 composer 可见：发送给 Lead + 回复群聊 + 发送键（AX 565/566） |
| CW-18 | 键入 @ 补全 | **PASS** | 输入含 `@` 文本后弹出「选择成员 / Lead · 主 agent · 已完成 / ↑↓ 选择 · Enter/Tab 确认 · Esc 关闭」 |
| CW-13 | 发送键（单目标，未 @） | **FAIL（F-06）** | 点击发送后气泡显示「发送失败：未知错误，已保留原文」；输入清空 |
| CW-30 | 失败「重试」 | **FAIL（F-06）** | 重试后仍失败（未知错误） |
| CW-31 | 失败「复制原文」 | PARTIAL | 按钮存在；未点击 |
| CW-04/05/06/07 | 筛选菜单/选中/清除 | NOT_EXECUTED | 本轮优先发送主路径，未执行 |
| CW-27/28/29 | 折叠展开/收起/键盘 | NOT_EXECUTED | 同上 |
| CW-33/34/37/38/39 | 复制/打开会话/成员卡动作/任务卡复制 | PARTIAL | 存在性已在 AX 确认；未点击 |
| CW-08/09/17/41/42/43/45 | 窄屏/只读/错误/空态负向 | BLOCKED/NA | 无只读/窄屏构造；测试会话空态已由 task-27 冒烟覆盖 |

**结论**：F-01/F-02 已关闭；发送主路径 **FAIL（HIGH F-06）**，因此 CW-13/30 失败，全量 click-walk 仍不完整。

---

## task-61 增量（2026-10-28 19:16–19:23）— BLOCKED

- 已在测试会话群聊输入无 @ 文本「e2e-fix-verify no-at sent」（AX value 确认、发送键 enabled），**点击发送前 macOS 锁屏**；open-computer-use 全部调用报 `NSPOSIXErrorDomain Code=2`，无法继续。
- 本轮未新增 PASS/FAIL；发送主路径与 click-walk 仍 UNVERIFIED/BLOCKED（环境原因，非产品结论）。
- 证据：`tests/artifacts/macos-locked-screen-1921.png`、`tests/runs/2026-10-28-task-61.md`

---

## task-61 增量（19:16–19:23 锁屏 BLOCKED；21:51–21:53 解锁后重跑）

| 项 | 结果 | 观察 |
| --- | --- | --- |
| 插件 composer（测试会话） | PASS | 群聊/Lead 单 agent；composer 可见、可输入、发送键 enabled |
| 无 @ 发送 | **FAIL（F-06，HIGH）** | 点击发送后 `发送失败：failed（code=unknown）`；输入清空、气泡红框 |
| 重试/复制原文 | PARTIAL | 按钮存在；未再点重试（已 FAIL，优先回报） |
| 其余 click-walk | BLOCKED/NOT_EXECUTED | 发送主路径已 HIGH FAIL；筛选/@键盘/折叠/任务卡/成员卡/未读/只读/768 未继续 |

**结论**：F-06 仍未修复，最终裁定 FAIL。

---

## task-61 最终轮（build 0.1.0+47b87ceb6389，22:27–22:35）

| ID | 控件 | 结果 | 观察 |
| --- | --- | --- | --- |
| CW-12 | 插件 composer（单 agent 测试会话） | PASS | 输入无 @ 文本 → 发送 → 气泡出现；对话 tab 仅 1 条 + lead 回复 OK；无失败态 |
| CW-13 | 发送键（单目标） | PASS | sent（F-06 修复） |
| CW-04 | 频道头筛选图标 | PASS | 打开 9 名成员菜单 |
| CW-05 | 筛选菜单项（backend） | PASS | 顶部「正在只看 backend（54 条）」+ 频道头「筛选: backend」 |
| CW-07 | 筛选「清除」 | PASS | 恢复全量 feed |
| CW-18 | @ 补全弹层 | PASS | Lead 选项 + 键盘提示 |
| CW-10/11 | 未读浮标/频道头 | NA | 当前无未读样例 |
| CW-27/28 | 折叠展开/收起 | PARTIAL | 仅按钮存在，未点击 |
| CW-33/34/37/38/39 | 复制/打开会话/成员卡/任务卡动作 | PARTIAL | AX 存在性确认；未逐一点击 |
| CW-17/45 | 只读 | NA | 无可构造只读会话 |
| CW-44 | 分页/最早消息 | PARTIAL | 顶部显示「已到最早消息」 |
| 768 窄屏 | CW-08/09 | NA | computer-use 无窗口 resize |
| F-07 | 群聊重复气泡 | MEDIUM | 同一次发送在群聊显示 2 条相同气泡；对话 tab 仅 1 条（显示层去重缺陷） |

---

## task-89（最终候选 9b0d69cb，02:00–02:05）

| ID | 控件 | 结果 | 观察 |
| --- | --- | --- | --- |
| CW-12/13 | 插件 composer 发送（e2e 会话） | PASS | 无 @ 文本发送成功 |
| CW-50 | Enter/发送 | PARTIAL | 通过发送按钮发送；Enter 未单独验证 |
| SC47 | 单次发送 1 条气泡 | **PASS** | 群聊 1 条 + 对话 1 条，无重复 |
| CW-55 | 隐藏宿主 composer | PASS（结构） | 群聊 AX 仅 1 个 composer |
| CW-56 | 成员条全显+状态 | PASS（只读观察） | 9 名成员、绿/灰状态、无 +N |
| CW-54 | 任务卡 v5 | PARTIAL | 卡片可见；compact 头像未取样（SC43 未取证） |
| 其余 CW-46…58 | Markdown/折叠/@/轨迹/图标 | NOT_EXECUTED | 时间限制 |
