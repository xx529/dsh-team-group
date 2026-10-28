# e2e v4.1 验收步骤（tester 执行脚本）

> 仅使用 `e2e-*` 会话；不向用户真实会话发送。每条用例记录截图/AX 到 `tests/artifacts/`。

## 0. 环境

- DSH Desktop（加载最终 bundle；`data-build` 断言 build 指纹）
- 窗口 1440×900 / 2× 基线；截图按 1280×720 记录像素 diff 仍 NOT_APPLICABLE
- 测试会话：`e2e-v41-<date>`（单 agent）+ 团队会话只读

## 1. 视图/输入器

1. 打开 e2e 会话 → 群聊 tab；断言：tab「群聊」、插件 composer 唯一、宿主 composer 不存在（AX 中只有 1 个 `group-chat-composer`）。
2. 输入文本 + Enter → 发送；再 Shift+Enter → 换行不发送。
3. 切回对话 tab → 宿主 composer 恢复。

## 2. Markdown / 折叠

1. 发送含 `**粗体**`、`- 列表`、`` `code` ``、代码块、链接的文本；断言：渲染节点正确、链接可点、代码块滚动、复制原文保留源。
2. 发送 62 行文本；断言：50 行 + 56px 渐隐 + 「共 62 行 · 显示前 50 行 / 展开全部」；点展开→62 行；点收起→50 行，锚点稳定。

## 3. @ / chips

1. 输入普通文本（不含 @）→ 无弹层；删除后输入「@」→ 弹层（不透明、9 成员、描述小字）。
2. ↑↓/Enter 选人 → chip 显示在输入框下方；目标行显示「发送给 Lead、@x」。
3. 点 chip × → 目标行移除；发送 → 群聊仅 1 条气泡；对话 tab 1 条；lead 回复。

## 4. 成员条 / 轨迹

1. 成员条：全成员 + 绿/灰状态点；无截断。
2. 点成员头像 → 380px 轨迹侧栏（agent/模型/轮次/工具数/状态）；点关闭/Esc → 恢复；feed 滚动位置保持。

## 5. 任务卡 v5

1. 找任务卡：左 3px 状态条、任务图标、状态 pill、owner 头像/名字/时间、打开会话 icon；无气泡尾。
2. 断言无「复制任务 ID」；点动作按 state-machine（认领/完成/重新打开）；点打开会话跳转对应 session。

## 6. subagent / 过滤 / 欢迎

1. P6 fixture：subagent 消息同形 + 「· ux 的子体」；settled 系统提示不出现。
2. 欢迎提示居中（非左右气泡）；`data-kind=system` + `data-system-variant=welcome`。
3. 点成员条开轨迹时，subagent 归父成员；筛选 banner 清除后恢复全量。

## 7. 回归

- 发送主路径（无 @ 默认 Lead）：sent + 1 条气泡（F-06/F-07 回归）。
- 失败态（如需）：caption 默认仅用户可读；`?gc-debug=1` 才显示 code/message/stage/build；`data-send-debug` 始终存在。
