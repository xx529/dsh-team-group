# src/host（v1 不实现）

本目录在 v1 **不创建任何业务代码**（架构 §9.3：`src/host/` 与 §4.7 的 v2 读路由在 v1 不创建，仅保留文档设计）。

- v1 的 Host 半只有 `lib/index.js` 的**空壳 `apply()`**（满足 bundle `main` 入口约定，无副作用）。
- 群聊数据聚合与发送编排全在 client half：`src/core`（纯内核）+ `src/adapters`（事件窗口）+ `src/send`（发送编排）。
- v2 启用条件与接口设计见 `docs/adr/group-chat-send.md` §5 与架构文档 §4.7；**只有出现「S1 类失败」证据才重新评估**（例如客户端拿不到 `{type,seq,time,data}` 原始事件）。
