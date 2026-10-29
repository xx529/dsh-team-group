# Figma 原型：备份、导出与重建说明

> 本文件说明「群聊」视图 Figma 原型（`team-group`）的来源、帧清单、本地备份、PNG 导出与重建方式，供交接、重建和 tester 复核使用。
> 设计规格见 `docs/ux/group-chat-ux.md`（UX v4.2）；帧/需求映射与修订记录见 `docs/ux/prototype.md`。

## 1. 来源与版本

| 项 | 值 |
| --- | --- |
| Figma 文件 | `team-group`（Figma Desktop 本地文件，通过 DSH companion 桥接） |
| 页面 | `群聊 · Group Chat`（Page id `0:1`） |
| 设计版本 | **v4.2**（对应 UX v4.2 / PRD v0.8.1 / 架构 v1.7.3） |
| 对接方式 | DSH ⇄ Figma 本地 companion（`DSH to Figma · Local` 开发插件，端口 3055） |
| 画布内容 | `00` 设计令牌板 + `Components` 组件库 + `P1–P13` 原型帧 + `F0` 流程标注帧（共 17 个顶层节点） |
| 最近一次导出 | PNG 2×，`docs/ux/prototype/*.png`（v4.2，2026-10-29） |

## 2. 帧清单（Node ID 为重建与导出的唯一依据）

| 帧 | Figma 帧名 | Node ID | 画布尺寸 | 画布位置 (x,y) | 导出 PNG |
| --- | --- | --- | --- | --- | --- |
| 00 | 00 · 设计令牌 Design Tokens | `10:78` | 1000×700 | (-1120, 0) | —（仅画布） |
| — | Components · 基础组件 | `10:197` | 900×420 | (-1120, 780) | —（仅画布） |
| P1 | P1 · 视图 tab 行 + 瘦身频道头 | `16:151` | 1440×900 | (0, 0) | `01-tabs.png` |
| P2 | P2 · 群聊主界面（v4） | `49:1765` | 1440×900 | (1520, 0) | `02-main.png` |
| P3 | P3 · 长文本折叠（50 行阈值 · 真实高度 + Markdown 表格） | `51:2325` | **2880×2600** | (3040, 0) | `03-collapse.png` |
| P4 | P4 · @ 提及补全（仅 @ 触发 / 不透明 / 成员描述 / chips 下方） | `50:1934` | 1440×900 | (4560, 0) | `04-mention.png` |
| P5 | P5 · 发送状态（发送中 / 失败 / 部分失败） | `17:436` | 1440×900 | (6080, 0) | `05-send.png` |
| P6 | P6 · subagent 消息形态 | `17:528` | 1440×900 | (7600, 0) | `06-subagent.png` |
| P7 | P7 · 空状态与加载骨架 | `10:1411` | 1440×900 | (9120, 0) | `07-states.png` |
| P8 | P8 · 1280 窄桌面 | `17:703` | 1280×800 | (0, 1000) | `08-1280.png` |
| P9 | P9 · 768 窄屏 | `17:790` | 768×900 | (1360, 1000) | `09-768.png` |
| P10 | P10 · 成员加入消息（欢迎提示 + creator 消息 + 卡片） | `21:954` | 1440×900 | (2200, 1000) | `11-member-join.png` |
| P11 | P11 · 只读历史 / 筛选态 | `25:1221` | 1440×900 | (2200, 2000) | `12-readonly-filter.png` |
| P12 | P12 · 任务卡片（v5.2 折叠/展开两态） | `56:2647` | **2880×1620** | (2200, 3000) | `13-task-cards.png` |
| P13 | P13 · Agent 轮次轨迹侧栏 | `50:1972` | 1440×900 | (2200, 4200) | `14-agent-trajectory.png` |
| F0 | F0 · 交互流程图（v2 图例） | `25:1170` | 1440×900 | (10640, 0) | `10-flow.png` |

> 说明：`docs/ux/prototype.md` §1 的帧表用于「帧 → 需求」映射；**尺寸/坐标以本表与 Figma 实际帧为准**（P3 已因表格示例增高到 2600、P12 为 1620）。P11 左栏=只读历史、右栏=筛选态（任务书中的「P12 筛选态」是它的别名，未单独拆帧）。

## 3. 本地备份：`backup/team-group.fig`

| 项 | 值 |
| --- | --- |
| 绝对路径 | `/Users/lzx/Documents/GitHub/dsh-team-group/docs/ux/prototype/backup/team-group.fig`（仓库内，随 Git 入库） |
| 当前状态 | ✅ **已生成**（2026-10-29 备份，对应 Figma v4.2 / 17 顶层帧） |
| 大小 | **501,209 B**（约 490 KiB） |
| SHA-256 | `b4a23d844770e3c00ee11875af03da0462657b9a225635621974b5a6a20b7f2e`（校验命令：`shasum -a 256 docs/ux/prototype/backup/team-group.fig`） |
| 容器结构 | `.fig` 为 zip 容器：`canvas.fig`（492,212 B，画布数据）/ `meta.json` / `thumbnail.png`（400×155）/ `images/` |
| meta.json | `file_name="team-group"`、`exported_at="2026-10-29T03:13:44.973Z"`、`client_meta.render_coordinates={x:-1120,y:0,width:13200,height:5100}`（覆盖全部 17 帧所在画布范围） |
| 保存人 | tester（Figma Desktop 中手动保存） |
| 保存方式（复现） | `mkdir -p docs/ux/prototype/backup`；Figma Desktop 打开 `team-group` → `File → Save local copy…`（或 `File → Export → .fig`）→ 保存为该路径 |
| 重新导入 | Figma Desktop → **`File → Open local file…`** → 选择该 `.fig`。⚠️ 该路径**未经 UI 自动化验证打开**（当前仅完成文件结构与 meta 校验），首次打开请人工确认：页面名「群聊 · Group Chat」、17 个顶层节点、P2=`49:1765` 等在位。**Home → Import 不支持 `.fig`**，请用 Open local file。 |
| 校验建议 | 导入后运行一次 `figma_status`，确认 `documents` 含 `team-group`；再打开 P2（`49:1765`）与 P12（`56:2647`）抽检 |
| 版本约定 | 备份文件名固定；每次设计版本变更（v4.2 → v4.3…）**重新保存并覆盖**，并在本文件 §8 记录版本与日期 |

> 备份文件已生成并校验为有效 `.fig` zip 容器；**不要用导出的 PNG 重建 Figma 文件**（PNG 只是视觉基线，不可编辑）。

## 4. PNG 导出清单（2×，入库）

| 文件名 | 帧 / Node ID | 2× 像素尺寸 | 字节（v4.2） |
| --- | --- | --- | --- |
| `01-tabs.png` | P1 `16:151` | 2880×1800 | 200,455 |
| `02-main.png` | P2 `49:1765` | 2880×1800 | 229,660 |
| `03-collapse.png` | P3 `51:2325` | 5760×5200 | 1,343,576 |
| `04-mention.png` | P4 `50:1934` | 2880×1800 | 171,522 |
| `05-send.png` | P5 `17:436` | 2880×1800 | 221,049 |
| `06-subagent.png` | P6 `17:528` | 2880×1800 | 214,836 |
| `07-states.png` | P7 `10:1411` | 2880×1800 | 136,732 |
| `08-1280.png` | P8 `17:703` | 2560×1600 | 166,926 |
| `09-768.png` | P9 `17:790` | 1536×1800 | 85,957 |
| `10-flow.png` | F0 `25:1170` | 2880×1800 | 190,213 |
| `11-member-join.png` | P10 `21:954` | 2880×1800 | 252,440 |
| `12-readonly-filter.png` | P11 `25:1221` | 2880×1800 | 212,003 |
| `13-task-cards.png` | P12 `56:2647` | 5760×3240 | 349,686 |
| `14-agent-trajectory.png` | P13 `50:1972` | 2880×1800 | 168,346 |

### 用 DSH 工具重建（推荐，确定性）

```text
1) figma_status → 确认 documents 含 team-group（否则先走 §5 恢复）
2) download_assets(format=PNG, scale=2, nodeIds=[
     "16:151","49:1765","51:2325","50:1934","17:436","17:528","10:1411",
     "17:703","17:790","21:954","25:1221","56:2647","50:1972","25:1170"
   ])
3) 将返回的 .figma/assets/<run>/*.png 按上表顺序复制为 docs/ux/prototype/01…14*.png
4) 记录导出时间与字节数（更新本表 §4 与 docs/ux/prototype.md §7 最新修订记录）
```

### 在 Figma 内手动导出

选中帧 → 右侧 `Export` → `PNG` / `2x` → `Export <帧名>`；或全选 17 个节点导出后按上表改名。手动导出不保证与 `download_assets` 字节一致（编码器可能不同），视觉一致即可。

> 导出注意：P3/P12 是 2880 宽的大帧（2× 后 5760），导出文件较大（1.3 MB / 0.35 MB）属正常；`03-collapse.png` 含表格示例面板（帧已增高到 2600）。

## 5. companion 断开后的恢复（高频问题）

症状：`figma_status` 返回 `documents: []`（或 `available:false`），`download_assets` 报 `Figma disconnected` / `The previously selected Figma document disconnected`；随后写操作可能报 `Previous operation outcome is uncertain`。

恢复步骤：

1. 在 Figma Desktop 中确认 `team-group` 文件处于打开状态（不是 Figma 首页）；
2. 打开菜单 `Plugins → Development → DSH to Figma · Local` 重新运行插件（若已在运行，先关闭再运行）；
3. **保持该 Figma 窗口打开且不最小化**；companion 通过端口 3055 连接，关闭窗口即断；
4. 回到 DSH 执行 `figma_status`，确认 `documents` 含 `{"name":"team-group"}`；若仍为空，重复 2–3；
5. 仍失败时：`figma_reconnect` → 再 `figma_status`；必要时关闭 Figma 重新打开文件后再运行插件；
6. 恢复后**先只读**：`get_metadata`（Page id `0:1`）确认 17 个节点与帧 ID 未变，再执行导出/写入；
7. 若此前写入结果不确定（`Previous operation outcome is uncertain`）：先 `get_metadata` 读取现状，再决定是否重试；**不要盲目重放创建脚本**。

预防：
- 长时间会话中每批写操作前 `figma_status` 探活；
- 单次 `use_figma` 脚本尽量小（一次一类改动），失败时便于定位；
- 导出前先把 6–14 个 nodeIds 记在本文件 §4，断开恢复后可一次性补齐。

## 6. `.figma/` 不入库

- `.figma/` 是 DSH 本地导出缓存（`download_assets` 的落盘目录与运行态），**已在 `.gitignore` 中忽略，不入库**；
- 入库的只有：`docs/ux/prototype/*.png`（视觉基线）、`backup/team-group.fig`（可编辑源文件备份）、`docs/ux/prototype.md`、`docs/ux/group-chat-ux.md`；
- 不要把 `.figma/` 下的临时帧/中间导出提交；需要长期保留的进度用 `backup/*.fig` 与 PNG 表达。

## 7. 变更后必须同步

设计改动（新增/重命名帧、改尺寸、改关键样式）后按顺序更新：

1. Figma 实际帧（本文件 §2 的 Node ID 若变化需同步）；
2. `docs/ux/prototype.md`（帧清单/映射、§7 最新修订记录）；
3. `docs/ux/group-chat-ux.md`（规格与版本号）；
4. 重新导出受影响 PNG（§4）并更新字节数；
5. 重新保存 `backup/team-group.fig`；
6. 本文件 §1 版本与 §8 变更记录。

## 8. 变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-29 | v4.0 | UX/原型升 v4（成员卡、任务卡 M9、P13 轨迹侧栏、Markdown、50 行折叠、单输入器 + chips 下方） |
| 2026-10-29 | v4.1 | 成员条全显（禁 `+N`）+ 正文内 @ inline chip（彩底白字） |
| 2026-10-29 | v4.2 | 成员条「24px 头像 + 完整名字 + 状态点」去遮罩；任务卡 v5.2 默认折叠/展开两态 + 人物一致（外层 actor，卡内不重复头像）；P3 新增 Markdown 表格示例（帧 2880×2600）；P12 重建 2880×1620 |
| — | v4.3（待） | 下次设计变更时在此追加 |
