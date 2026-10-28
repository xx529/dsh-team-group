# 群聊插件 · 安装冒烟证据（task-13）

本目录由 backend 在 Lead 完成 `plugin_manager install_bundle` 后回填；**只读证据，不含凭据/正文**（脱敏：会话 ID 可截断、不贴消息正文）。

## 目录约定

```
01-install.txt          plugin_manager 安装返回：application / warnings / entry / installationSpec
02-slot-inspect.txt     cordis_inspect_query client Slots listSubTree{root:"conversation.view"} 原始输出（脱敏）
03-tab.png              对话页视图 tab 行截图（可见「群聊」，无未读圆点）
04-enter.png            点击「群聊」后的主界面（频道头 + feed + 输入区）
05-no-team.png          单 agent（无团队）会话的空态 + 输入可用
06-console.txt          浏览器 console / DSH 日志中的 [group-chat] 记录（无 error）
07-other-views.png      对话/轨迹等其它视图未受影响
RUN.md                  执行记录：时间、DSH/Desktop 版本、端口、操作者、逐步结果、结论 PASS/FAIL、失败项
```

## 判定口径

- 二值：**PASS / FAIL**；任何「tab 不可见」「slot 无 occupant」「白屏」「console error」= FAIL。
- 每张截图需包含时间与关键区域（tab 行/频道头），必要时 zoom 后再截。
- 失败项写清：复现步骤、期望、实际、截图路径，并 `send_message lead`（回派 owner）。
