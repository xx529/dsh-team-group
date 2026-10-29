# task-112 · Figma 本地 .fig 备份 + 可导入性校验

- 时间：2026-10-29 11:12–11:20（CST）
- Figma Desktop：已激活，文档 `team-group`（页面 `群聊 · Group Chat`），标题无未保存标记；DSH to Figma · Local 面板显示 **已连接 · team-group · figma**。
- 操作：File → **Save local copy…**（保存为 `team-group.fig`）。

## 备份产物

- 路径：`/Users/lzx/Documents/GitHub/dsh-team-group/docs/ux/prototype/backup/team-group.fig`
- 大小：**489 KB（500,508 bytes 归档）**
- sha256：`b4a23d844770e3c00ee11875af03da0462657b9a225635621974b5a6a20b7f2e`
- 文件类型：`Zip archive`（Figma `.fig` 容器，PK 头）
- 内容：`canvas.fig`（492,212 B）+ `thumbnail.png`（7,974 B）+ `meta.json`（322 B）+ `images/`
- meta：`file_name=team-group`，`exported_at=2026-10-29T03:13:44.973Z`，render 区域 13200×5100

## 重新导入验证

- 尝试 Figma Home → More → Import：该入口仅支持 images/Sketch/PPT/PDF，**不支持 .fig**；
- 尝试 `open -a Figma team-group.fig` 与编辑器 File 菜单自动化，原生 **Open local file** 菜单未暴露给 AX，未能完成 UI 级重新打开；
- 因此「Figma 内 Open local file 打开验证 17 个顶层帧」**未完成**，需 Lead/用户手动 File → Open local file 选择该 .fig 二次确认。

## 云同步

- 文档标题无未保存标记；插件面板 已连接；本地副本导出成功（2026-10-29 11:13Z）。未见未同步改动提示。
