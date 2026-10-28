/**
 * dsh-group-chat · Host 半（v1 空壳）
 *
 * v1 决策（架构 §3.3 / D-ARCH-10 + docs/adr/group-chat-send.md）：
 *   群聊的数据聚合与发送编排**全部在 client half**（`lib/client.js`），Host 侧不注册路由、
 *   不读写会话日志、不新增 Service —— 仅保留本文件以满足 bundle 入口约定（`main`）。
 *
 * v2 启用条件（当前不排期）：仅当出现「S1 类失败」证据（客户端拿不到 `type+seq+data` 原始事件）
 * 时，才在此注册 `POST /api/group-chat/channel` 读接口（架构 §4.7 设计已冻结，共用同一内核）。
 */

/** Host plugin body：v1 有意为空（无副作用、≈0 运行成本）。 */
function apply() {}

export { apply };
