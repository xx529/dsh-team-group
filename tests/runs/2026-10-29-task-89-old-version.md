# task-89 · 旧版 0b68b0eb 预检（不作为验收结论）

- 时间：2026-10-29 01:33–01:35（CST）
- 结论：**旧版，已暂停；未执行真机验收、未下 PASS/FAIL。**

## 版本与门禁（旧版）

| 项 | 结果 |
| --- | --- |
| bundle | `lib/client.js` sha256 `0b68b0ebbf31ed57f9b22a15e4e25e2a2805ab38cf2744c751e47707ae74e0fc`（580,660 B，01:31:52） |
| profile 安装副本 | 同 sha |
| build 指纹 | `0.1.0+a5a0d234d2da` |
| `npm test` | 300 tests / 300 pass / 0 fail |
| `node scripts/verify.mjs` | **❌ 1 FAILED · 34 checks**：`lib/client.js 与源一致（fresh） — STALE: run node scripts/build.mjs`；其余 33 项 ✓ |

> 该 verify STALE 与 Lead/backend 复核的「0b68b0eb 缺 R-WEAK/R-M6 去重修复 + UI 缺 localBatches 透传」一致：旧安装物已 stale，**不采纳**。

## GUI 状态

- 屏幕已解锁（01:34 截图：DSH 团队会话/群聊可见，9 名成员条、任务卡、右侧轨迹面板正常渲染）。
- **未执行任何验收点击/发送/截图取证**（收到暂停指令即停）。

## 待新版本

- 等 Lead 通知新 sha 重装后，从 `tests/design/e2e-v4.1-steps.md` 第 1 组重新开始；
- 旧版结果不采纳，仅保留本预检记录。
