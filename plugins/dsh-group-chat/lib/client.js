/**
 * @local/dsh-group-chat · client half (GENERATED FILE — do not edit)
 *
 * 由 scripts/build.mjs 从以下源拼接生成：
 *   - src/{core,adapters,send}/*.js（ES module → 每文件独立 factory）
 *   - src/client/parts/NN-*.part.js（按文件名顺序）
 *   - src/client/entry.js（apply / inject）
 *   - locale/{zh,en}.json（内联字典，键集 180）
 *   - src/styles/group-chat.css（内联样式）
 *
 * 重新生成：node scripts/build.mjs   ·   一致性校验：node scripts/build.mjs --check
 */
window.__ModuleLoader__.load({
  id: "@local/dsh-group-chat",
  factory: function (require) {
    'use strict';

    var React = require('react');
    var h = React.createElement;
    var Fragment = React.Fragment;

    var __GC_BUILD = {
  "id": "@local/dsh-group-chat",
  "version": "0.1.0",
  "hash": "ea68937a339f",
  "build": "0.1.0+ea68937a339f",
  "modules": [
    "src/adapters/client-session-source.js",
    "src/adapters/index.js",
    "src/adapters/mock-source.js",
    "src/adapters/replay-host.js",
    "src/core/constants.js",
    "src/core/dedupe.js",
    "src/core/fanout.js",
    "src/core/filter.js",
    "src/core/fold.js",
    "src/core/folding.js",
    "src/core/index.js",
    "src/core/markdown.js",
    "src/core/mentions.js",
    "src/core/model.js",
    "src/core/normalize.js",
    "src/core/paginate.js",
    "src/core/protocol.js",
    "src/core/roster.js",
    "src/core/timeline.js",
    "src/core/turns.js",
    "src/send/delivery.js",
    "src/send/errors.js",
    "src/send/index.js",
    "src/send/mode.js",
    "src/send/rate-limit.js",
    "src/send/retry.js",
    "src/send/send-batch.js",
    "src/send/send-controller.js",
    "src/send/targets.js"
  ],
  "parts": [
    "src/client/parts/00-boot.part.js",
    "src/client/parts/10-locale.part.js",
    "src/client/parts/20-store.part.js",
    "src/client/parts/30-primitives.part.js",
    "src/client/parts/40-cards.part.js",
    "src/client/parts/50-feed.part.js",
    "src/client/parts/60-header.part.js",
    "src/client/parts/65-trajectory.part.js",
    "src/client/parts/70-composer.part.js",
    "src/client/parts/80-states.part.js",
    "src/client/parts/85-preview.part.js",
    "src/client/parts/90-view.part.js"
  ],
  "localeKeys": 180
};

    /* ── 模块注册表（src/core|adapters|send） ─────────────────────────── */
    var __modDefs = Object.create(null);
    var __modCache = Object.create(null);

    function __def(id, factory) {
      __modDefs[id] = factory;
    }

    function __req(id) {
      if (Object.prototype.hasOwnProperty.call(__modCache, id)) return __modCache[id];
      var factory = __modDefs[id];
      if (typeof factory !== 'function') {
        var known = Object.keys(__modDefs);
        throw new Error('[group-chat] module not found: ' + id + (known.length ? ' (available: ' + known.join(', ') + ')' : ''));
      }
      var exports = {};
      __modCache[id] = exports;
      factory(exports, __req);
      return exports;
    }

    function __has(id) {
      return Object.prototype.hasOwnProperty.call(__modDefs, id);
    }

    function __opt(id) {
      return __has(id) ? __req(id) : undefined;
    }

    /* ── 内联字典 / 样式 ──────────────────────────────────────────────── */
    var GC_LOCALE = {"zh":{"meta.title":"群聊","meta.description":"以聊天室视角聚合 lead、teammate 与 subagent 的会话时间线，并支持多目标同发。","view.tab":"群聊","channel.title":"群聊","channel.membersRunning":"{n} 名成员 · {m} 个运行中","channel.newMessages":"{n} 条新消息","channel.filterSuffix":"· 筛选: {name}","channel.readonlySuffix":"· 团队已结束","channel.noMembers":"无团队成员","composer.targetLabel":"发送给","composer.leadChip":"Lead","composer.placeholder":"回复群聊…","composer.toLeadHint":"未 @ 时默认发送给 Lead；键入 @ 可同时发送给多人","composer.multi":"共 {n} 位 · 同一份内容同时发送","composer.queued":"Lead 运行中，已排队","composer.send":"发送","composer.removeMention":"移除 {name}","mention.header":"选择成员","mention.hint":"键入以过滤","mention.empty":"无匹配成员","mention.footer":"↑↓ 选择 · Enter/Tab 确认 · Esc 关闭","mention.sub.lead":"主 agent","mention.sub.teammate":"Teammate","mention.sub.subagent":"Subagent","mention.sub.addressable":"（仍可寻址）","msg.sentTo":"已同时发送给 {list}","msg.deliveredTo":"已同时发送给 {list}","msg.partialDelivered":"已送达 {ok}/{total}","msg.partialWithNames":"已送达 {ok}/{total} · 失败：{names}","msg.partialWithNamesMore":"已送达 {ok}/{total} · 失败：{names} 等 {n} 人","msg.sendToLead":"发送给 Lead","msg.sending":"发送中…","msg.failed":"发送失败：{reason}，已保留原文","msg.retry":"重试","msg.copy":"复制原文","msg.copied":"已复制","msg.expandAll":"展开全部（约 {n} 字）","msg.collapse":"收起","msg.foldMeta":"共 {n} 字 · {state}","msg.foldStateFolded":"显示前 {lines} 行","msg.foldStateExpanded":"完整显示 {lines} 行","msg.toolCalls":"{n} 个工具调用 · 见「轨迹」","msg.openSession":"打开所属会话","msg.reactions":"消息操作","msg.file.open":"打开","time.today":"今天","time.yesterday":"昨天","status.running":"运行中","status.done":"已完成","status.failed":"失败","status.inactive":"已完成","status.provisioning":"创建中","status.unknown":"未知","member.subagentOf":"· {parent} 的子体","member.leftNotSent":"{name} 已离开，未发送","member.welcome":"欢迎 @{name} 加入群聊","member.cardTitle":"「@{name}」加入群聊","member.noDesc":"无描述","member.roleLead":"主 Agent","member.roleTeammate":"Teammate","member.roleSubagent":"Subagent","member.roleFallback":"成员","member.contextFresh":"全新上下文（fresh）","member.contextForkLead":"继承 Lead 已完成回合（fork）","member.contextSubagent":"全新上下文（subagent）","member.contextSubagentFork":"继承父会话（subagent_fork）","member.modeOneShot":"· 一次性（one-shot）","member.modelInheritedLead":"{model}（继承 Lead）","member.modelInheritedFrom":"{model}（继承 {parent}）","member.expandTask":"展开","member.collapseTask":"收起","member.initialTask":"初始任务","member.fieldModel":"模型","member.fieldContext":"上下文","member.fieldCreateTool":"创建方式","member.fieldParent":"父成员","member.fieldDescription":"角色描述","member.fieldTask":"初始任务","member.viewSession":"查看会话","member.viewTask":"查看任务","member.sessionCopied":"无法直接跳转，已复制会话 ID","member.noPermission":"无权限打开该会话","filter.button":"筛选成员","filter.active":"正在只看 {name}（{n} 条）","filter.clear":"清除","filter.empty":"该成员暂无消息","filter.suffix":"· 筛选: {name}","readonly.banner":"当前为只读历史，不能发送","readonly.placeholder":"团队已结束，群聊为只读历史","readonly.suffix":"· 团队已结束","empty.noTeam":"当前为单 Agent 会话（无团队）","empty.noTeamDesc":"仅显示该会话的用户消息与该 agent 的最终输出","empty.team":"团队还没有发言","empty.teamDesc":"成员每轮结束后会在这里发言。","empty.howToTeam":"如何组建团队","history.earliest":"已到最早消息","history.loadingOlder":"加载更早消息…","unread.jump":"↓ {n} 条新消息","error.load":"加载失败：数据源不可用","error.retry":"重试","error.reconnect":"实时更新暂停（连接断开），已加载历史可读","error.reconnectAction":"重连","error.noPermission":"无权限查看该成员会话","error.source":"群聊数据源暂不可用","error.sourceHint":"插件数据适配器尚未就绪（src/adapters）。界面已降级为只读，不会白屏。","toast.copied":"已复制","toast.copyFailed":"复制失败","task.action.create":"创建任务","task.action.claim":"认领任务","task.action.complete":"完成任务","task.action.reopen":"重新打开任务","task.action.reassign":"改派任务","task.action.edit":"编辑任务","task.action.setDependencies":"依赖变更","task.action.delete":"取消任务","task.action.release":"放回任务","task.state.pending":"待认领","task.state.inProgress":"进行中","task.state.completed":"已完成","task.state.cancelled":"已取消","task.owner":"负责人","task.blockedBy":"依赖","task.completionTime":"完成时间","task.unassigned":"未指派","task.noBlockedBy":"无","task.actorSystem":"系统操作者","task.revision":"版本","task.changed":"变更","a11y.feed":"群聊消息流","a11y.message":"{sender} 于 {time} 的 {kind} 消息","a11y.send":"发送消息","a11y.fold":"展开或收起长消息","a11y.mention":"成员提及补全","a11y.filter":"按成员筛选消息","a11y.unread":"查看新消息","msg.failedReasonFallback":"未知错误","channel.omittedSubagents":"已省略 {n} 个深层子会话","a11y.taskCard":"{action} {id}","send.error.generic":"未知错误","send.error.parentUnavailable":"父 Agent 不在线","send.error.forbidden":"无发送权限","send.error.network":"网络中断","send.error.busy":"正在发送中，请稍后","send.error.retryExhausted":"重试次数已用完","send.error.targetsOverflow":"接收方过多","msg.failedDetail":"发送失败：{reason}（{detail}）","send.error.debugSuffix":"（{detail}）","send.error.channelMissing":"当前会话不可用，无法发送","composer.hint":"键入 @ 可同时发送给多人","composer.hostFallback":"兼容模式：宿主输入器未隐藏","channel.membersStatus":"{n} 名成员 · {m} 工作中 · {k} 等待","member.status.working":"工作中","member.status.waiting":"等待","member.stripOverflow":"+{n} 名成员","trajectory.title":"轮次轨迹","trajectory.empty":"无轮次数据","trajectory.noOutput":"无输出摘要","trajectory.toolCount":"{n} 个工具调用","trajectory.status.done":"已完成","trajectory.status.aborted":"已中断","trajectory.status.error":"错误","trajectory.status.truncated":"已截断","trajectory.status.running":"进行中","trajectory.status.unknown":"未知","trajectory.loadOlder":"加载更早轮次","trajectory.close":"关闭","msg.action.copy":"复制原文","msg.action.openSession":"打开所属会话","msg.expandLines":"展开全部（共 {n} 行）","msg.foldMetaLines":"显示前 {n} 行","task.ownerUnassigned":"未认领","task.blockedByList":"被 {list} 阻塞","task.expandAll":"展开全部","task.expand":"展开详情","task.collapse":"收起详情","task.field.description":"描述","task.field.requirements":"要求","task.field.acceptance":"验收标准","member.trajectoryAria":"查看 {name} 的轮次轨迹（{status}）","system.turnInterrupted":"本轮已中断"},"en":{"meta.title":"Group chat","meta.description":"Aggregates the lead, teammate and subagent sessions into one chat-style timeline, with multi-target sending.","view.tab":"Group chat","channel.title":"Group chat","channel.membersRunning":"{n} members · {m} running","channel.newMessages":"{n} new messages","channel.filterSuffix":"· Filter: {name}","channel.readonlySuffix":"· Team finished","channel.noMembers":"No team members","composer.targetLabel":"To","composer.leadChip":"Lead","composer.placeholder":"Reply to the group…","composer.toLeadHint":"Without @, sends to Lead. Type @ to send to more members","composer.multi":"{n} recipients · one copy sent to all","composer.queued":"Lead is running — queued","composer.send":"Send","composer.removeMention":"Remove {name}","mention.header":"Pick a member","mention.hint":"Type to filter","mention.empty":"No matching member","mention.footer":"↑↓ select · Enter/Tab confirm · Esc close","mention.sub.lead":"Main agent","mention.sub.teammate":"Teammate","mention.sub.subagent":"Subagent","mention.sub.addressable":" (still addressable)","msg.sentTo":"Also sent to {list}","msg.deliveredTo":"Also sent to {list}","msg.partialDelivered":"Delivered {ok}/{total}","msg.partialWithNames":"Delivered {ok}/{total} · failed: {names}","msg.partialWithNamesMore":"Delivered {ok}/{total} · failed: {names} +{n}","msg.sendToLead":"Sent to Lead","msg.sending":"Sending…","msg.failed":"Failed: {reason}. Text kept","msg.retry":"Retry","msg.copy":"Copy text","msg.copied":"Copied","msg.expandAll":"Show all (~{n} chars)","msg.collapse":"Collapse","msg.foldMeta":"{n} chars · {state}","msg.foldStateFolded":"first {lines} lines shown","msg.foldStateExpanded":"all {lines} lines shown","msg.toolCalls":"{n} tool calls · see Trajectory","msg.openSession":"Open source session","msg.reactions":"Message actions","msg.file.open":"Open","time.today":"Today","time.yesterday":"Yesterday","status.running":"Running","status.done":"Done","status.failed":"Failed","status.inactive":"Done","status.provisioning":"Starting","status.unknown":"Unknown","member.subagentOf":"· sub-agent of {parent}","member.leftNotSent":"{name} left — not sent","member.welcome":"Welcome @{name} to the group","member.cardTitle":"@{name} joined the group","member.noDesc":"No description","member.roleLead":"Main agent","member.roleTeammate":"Teammate","member.roleSubagent":"Subagent","member.roleFallback":"Member","member.contextFresh":"Fresh context (fresh)","member.contextForkLead":"Continue from Lead's finished turn (fork)","member.contextSubagent":"Fresh context (subagent)","member.contextSubagentFork":"Forked parent context (subagent_fork)","member.modeOneShot":"· One-shot","member.modelInheritedLead":"{model} (inherited from Lead)","member.modelInheritedFrom":"{model} (inherited from {parent})","member.expandTask":"Expand","member.collapseTask":"Collapse","member.initialTask":"Initial task","member.fieldModel":"Model","member.fieldContext":"Context","member.fieldCreateTool":"Created by","member.fieldParent":"Parent","member.fieldDescription":"Description","member.fieldTask":"Initial task","member.viewSession":"Open session","member.viewTask":"Open task","member.sessionCopied":"Cannot open directly — session ID copied","member.noPermission":"No permission to open this session","filter.button":"Filter by member","filter.active":"Filtered to {name} ({n})","filter.clear":"Clear","filter.empty":"No messages from this member","filter.suffix":"· Filter: {name}","readonly.banner":"Read-only history — sending is disabled","readonly.placeholder":"Team finished — read-only history","readonly.suffix":"· Team finished","empty.noTeam":"Single-agent session (no team)","empty.noTeamDesc":"Shows only this session's user messages and the agent's final output","empty.team":"No messages yet","empty.teamDesc":"Members will speak here after each turn.","empty.howToTeam":"How to build a team","history.earliest":"Beginning of channel","history.loadingOlder":"Loading earlier messages…","unread.jump":"↓ {n} new messages","error.load":"Failed to load: data source unavailable","error.retry":"Retry","error.reconnect":"Live updates paused (disconnected) — loaded history stays readable","error.reconnectAction":"Reconnect","error.noPermission":"No permission to read this member session","error.source":"Group chat data source unavailable","error.sourceHint":"The plugin adapter (src/adapters) is not ready yet. The view degrades to read-only instead of a blank screen.","toast.copied":"Copied","toast.copyFailed":"Copy failed","task.action.create":"Task created","task.action.claim":"Task claimed","task.action.complete":"Task completed","task.action.reopen":"Task reopened","task.action.reassign":"Task reassigned","task.action.edit":"Task edited","task.action.setDependencies":"Dependencies changed","task.action.delete":"Task cancelled","task.action.release":"Task released","task.state.pending":"Unclaimed","task.state.inProgress":"In progress","task.state.completed":"Completed","task.state.cancelled":"Cancelled","task.owner":"Owner","task.blockedBy":"Blocked by","task.completionTime":"Completed at","task.unassigned":"Unassigned","task.noBlockedBy":"None","task.actorSystem":"System","task.revision":"Revision","task.changed":"Changed","a11y.feed":"Group chat message feed","a11y.message":"{kind} message from {sender} at {time}","a11y.send":"Send message","a11y.fold":"Expand or collapse a long message","a11y.mention":"Member mention completion","a11y.filter":"Filter messages by member","a11y.unread":"See new messages","msg.failedReasonFallback":"Unknown error","channel.omittedSubagents":"{n} deep sub-sessions omitted","a11y.taskCard":"{action} {id}","send.error.generic":"Unknown error","send.error.parentUnavailable":"Parent agent is offline","send.error.forbidden":"No permission to send","send.error.network":"Network interrupted","send.error.busy":"A send is already in progress","send.error.retryExhausted":"Retry limit reached","send.error.targetsOverflow":"Too many recipients","msg.failedDetail":"Failed: {reason} ({detail})","send.error.debugSuffix":" ({detail})","send.error.channelMissing":"This conversation is unavailable; cannot send.","composer.hint":"Type @ to send to more members","composer.hostFallback":"Compatibility mode: host composer is still visible","channel.membersStatus":"{n} members · {m} working · {k} waiting","member.status.working":"Working","member.status.waiting":"Waiting","member.stripOverflow":"+{n} members","trajectory.title":"Turn trajectory","trajectory.empty":"No turns","trajectory.noOutput":"No output summary","trajectory.toolCount":"{n} tool calls","trajectory.status.done":"Done","trajectory.status.aborted":"Aborted","trajectory.status.error":"Error","trajectory.status.truncated":"Truncated","trajectory.status.running":"Running","trajectory.status.unknown":"Unknown","trajectory.loadOlder":"Load earlier turns","trajectory.close":"Close","msg.action.copy":"Copy text","msg.action.openSession":"Open session","msg.expandLines":"Show all ({n} lines)","msg.foldMetaLines":"first {n} lines shown","task.ownerUnassigned":"Unclaimed","task.blockedByList":"Blocked by {list}","task.expandAll":"Show all","task.expand":"Show details","task.collapse":"Hide details","task.field.description":"Description","task.field.requirements":"Requirements","task.field.acceptance":"Acceptance","member.trajectoryAria":"View {name} trajectory ({status})","system.turnInterrupted":"This turn was interrupted"}};
    var GC_CSS = "/*\n * group-chat.css — 「群聊」视图样式\n *\n * 规则（架构 v1.6 §6.7）：\n *  - 只允许使用 --dsw-alias-* / --dsw-specific-* 主题变量取色（禁止写死品牌色）；\n *  - 尺寸/字号/圆角一律走本文件的 :where(.gc-root) 常量；\n *  - 暗色由宿主 body[data-ds-dark-theme] 切换，本文件不写 dark 分支；\n *  - 响应式用容器查询（视图住在对话内容区，宽度取决于宿主侧栏）。\n */\n\n:where(.gc-root) {\n  /* —— 本地尺寸常量（UX §11 / 架构 §6.7.2 / 6.7.3） —— */\n  --gc-radius-xs: 4px;\n  --gc-radius-sm: 8px;\n  --gc-radius-md: 12px;\n  --gc-radius-lg: 16px;\n  --gc-radius-xl: 20px;\n  --gc-radius-panel: 28px;\n\n  /* 气泡：用户气泡与 agent 气泡按发送者区分（Lead 裁决 2026-10-28） */\n  --gc-user-bubble-radius: 20px;\n  --gc-user-bubble-padding: 10px 16px;\n  --gc-bubble-radius: 12px;\n  --gc-bubble-padding: 10px 14px;\n  --gc-bubble-max: 600px;\n\n  --gc-header-h: 56px;\n  --gc-content-w: 920px;\n  --gc-col-pad: 24px;\n  --gc-avatar: 32px;\n  --gc-avatar-radius: 8px;\n  --gc-row-gap: 16px;      /* 消息间距 */\n  --gc-row-gap-tight: 8px; /* 同一发送者连续消息 */\n  --gc-indent: 40px;       /* 气泡/卡片相对头像行的缩进（32 头像 + 8 gap） */\n  --gc-indent-gap: 8px;\n  --gc-fold-max: 1100px;   /* v1.7：50 行 × 22px */\n  --gc-fold-mask: 56px;\n\n  /* 品牌实底上的文字色（用户要求纯白，避免 button-primary-fill 偏蓝） */\n  --gc-on-brand: #fff;\n  --gc-font: 14px;\n  --gc-line: 22px;\n  --gc-code-font: var(--dsw-font-markdown-code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);\n}\n\n/* ── 宿主挂载适配（F-01）─────────────────────────────────────────────────\n * conversation.view 的宿主容器是 `…viewArea`（flex:1;min-height:0;flex column）。\n * slot 渲染器可能在本视图外再包一层普通 div（无高度规则），会把 height:100% 的\n * 参照系变成「内容高度」，从而把输入区顶出可视区。这里用 :has() 把「包含 .gc-root\n * 的直接 wrapper」补成 flex 填满，宿主版本不支持 :has() 时由 gcFitHostLayout() JS 兜底。\n * ──────────────────────────────────────────────────────────────────────── */\n\n[class*='viewArea'] > :has(> .gc-root),\n[class*='viewArea'] > :has(> .gc-shell) {\n  flex: 1 1 auto;\n  min-height: 0;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  position: relative;\n}\n\n/* ── 根容器 ───────────────────────────────────────────────────────────── */\n\n.gc-root {\n  container-type: inline-size;\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  max-height: 100%;\n  min-height: 0;\n  overflow: hidden; /* header/banners/composer 固定，.gc-scroll 是唯一滚动区 */\n  box-sizing: border-box;\n  background: var(--dsw-alias-bg-base);\n  color: var(--dsw-alias-label-primary);\n  font-family: inherit;\n  -webkit-font-smoothing: antialiased;\n}\n\n.gc-root *,\n.gc-root *::before,\n.gc-root *::after {\n  box-sizing: border-box;\n}\n\n/* 容器查询的落点：@container 不能命中容器自身，故尺寸/响应式变量放在 .gc-shell 上 */\n.gc-shell {\n  display: flex;\n  flex-direction: column;\n  flex: 1 1 auto;\n  min-height: 0;\n  overflow: hidden;\n  position: relative;\n  color: var(--dsw-alias-label-primary);\n  font-size: var(--gc-font);\n  line-height: var(--gc-line);\n}\n\n.gc-sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n\n.gc-col {\n  width: var(--gc-content-w);\n  max-width: calc(100% - (var(--gc-col-pad) * 2));\n  margin: 0 auto;\n  padding: 0;\n}\n\n.gc-link {\n  appearance: none;\n  border: 0;\n  background: none;\n  padding: 0;\n  margin: 0;\n  font: inherit;\n  color: var(--dsw-alias-state-business-primary);\n  cursor: pointer;\n  text-align: left;\n  border-radius: var(--gc-radius-xs);\n}\n\n.gc-link:hover {\n  text-decoration: underline;\n}\n\n.gc-link:disabled,\n.gc-link[aria-disabled='true'] {\n  color: var(--dsw-alias-label-dimmed);\n  cursor: default;\n  text-decoration: none;\n}\n\n.gc-focusable:focus-visible,\n.gc-link:focus-visible,\n.gc-btn:focus-visible,\n.gc-chip:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 2px;\n}\n\n/* ── 频道头 ───────────────────────────────────────────────────────────── */\n\n.gc-header {\n  flex: 0 0 auto;\n  height: auto;\n  min-height: var(--gc-header-h);\n  padding: 6px 28px;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  border-bottom: 1px solid var(--dsw-alias-border-l3);\n  background: var(--dsw-alias-bg-base);\n}\n\n.gc-group-avatar {\n  flex: none;\n  width: var(--gc-avatar);\n  height: var(--gc-avatar);\n  border-radius: var(--gc-avatar-radius);\n  overflow: hidden;\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  grid-template-rows: 1fr 1fr;\n  gap: 1px;\n  background: var(--dsw-alias-border-l2);\n}\n\n.gc-group-avatar > i {\n  display: block;\n  background: var(--dsw-alias-bg-layer-3);\n}\n\n.gc-group-avatar > i[data-slot='0'] {\n  background: var(--dsw-alias-state-business-primary);\n}\n\n.gc-group-avatar > i[data-slot='1'] {\n  background: var(--dsw-alias-state-business-tertiary);\n}\n\n.gc-group-avatar > i[data-slot='2'] {\n  background: var(--dsw-alias-bg-layer-3);\n}\n\n.gc-group-avatar > i[data-slot='3'] {\n  background: var(--dsw-alias-label-dimmed);\n}\n\n.gc-header-main {\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  gap: 2px;\n}\n\n.gc-header-row {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  min-width: 0;\n}\n\n.gc-header-title {\n  flex: none;\n  font-size: 14px;\n  font-weight: 500;\n  line-height: 20px;\n  color: var(--dsw-alias-label-primary);\n  white-space: nowrap;\n}\n\n.gc-header-divider {\n  flex: none;\n  width: 1px;\n  height: 14px;\n  background: var(--dsw-alias-border-l2);\n}\n\n.gc-header-team {\n  min-width: 0;\n  flex: 0 1 auto;\n  font-size: 14px;\n  font-weight: 400;\n  line-height: 20px;\n  color: var(--dsw-alias-label-secondary);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.gc-header-status {\n  min-width: 0;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-tertiary);\n  white-space: nowrap;\n}\n\n.gc-header-status .gc-status-suffix {\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-header-status .gc-dot {\n  flex: none;\n}\n\n.gc-spacer {\n  flex: 1 1 auto;\n}\n\n.gc-newmessages-hint {\n  appearance: none;\n  border: 0;\n  background: none;\n  padding: 0 4px;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  cursor: pointer;\n  white-space: nowrap;\n}\n\n.gc-newmessages-hint:hover {\n  color: var(--dsw-alias-state-business-primary);\n}\n\n.gc-truncation-hint {\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  white-space: nowrap;\n}\n\n.gc-icon-btn {\n  flex: none;\n  width: 32px;\n  height: 32px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  border: 0;\n  border-radius: var(--gc-radius-sm);\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  cursor: pointer;\n  padding: 0;\n}\n\n.gc-icon-btn:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.gc-icon-btn[aria-expanded='true'] {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.gc-dot {\n  display: inline-block;\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: var(--dsw-alias-label-dimmed);\n}\n\n.gc-dot[data-state='running'] {\n  background: var(--dsw-alias-state-success-primary);\n}\n\n.gc-dot[data-state='failed'] {\n  background: var(--dsw-alias-state-error-primary);\n}\n\n/* ── 筛选菜单（频道头右侧） ─────────────────────────────────────────── */\n\n.gc-filter-menu {\n  position: absolute;\n  top: calc(var(--gc-header-h) + 4px);\n  right: 28px;\n  z-index: 20;\n  min-width: 200px;\n  max-height: 320px;\n  overflow-y: auto;\n  padding: 6px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: var(--gc-radius-md);\n  background: var(--dsw-specific-menu, var(--dsw-alias-bg-layer-2));\n  box-shadow: var(--dsw-shadow-lv2, 0 8px 24px rgba(0, 0, 0, 0.32));\n}\n\n.gc-filter-item {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  min-height: 32px;\n  padding: 4px 8px;\n  border: 0;\n  border-radius: var(--gc-radius-sm);\n  background: transparent;\n  color: var(--dsw-alias-label-primary);\n  font-size: 12px;\n  line-height: 18px;\n  cursor: pointer;\n  text-align: left;\n}\n\n.gc-filter-item:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.gc-filter-item[data-active='true'] {\n  color: var(--dsw-alias-state-business-primary);\n}\n\n.gc-filter-item .gc-filter-item-sub {\n  color: var(--dsw-alias-label-caption);\n  font-size: 11px;\n}\n\n/* ── 提示条（只读 / 筛选 / 断线） ───────────────────────────────────── */\n\n.gc-banners {\n  flex: none;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding-top: 8px;\n}\n\n.gc-banner {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 32px;\n  padding: 6px 12px;\n  border-radius: var(--gc-radius-sm);\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 18px;\n}\n\n.gc-banner[data-tone='error'] {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.gc-banner[data-tone='filter'] {\n  background: var(--dsw-alias-bg-layer-1);\n}\n\n.gc-banner .gc-banner-action {\n  margin-left: auto;\n  flex: none;\n  font-size: 12px;\n  color: var(--dsw-alias-state-business-primary);\n}\n\n/* ── 消息流 ───────────────────────────────────────────────────────────── */\n\n.gc-scroll {\n  flex: 1 1 auto;\n  min-height: 0;\n  max-height: 100%;\n  overflow-y: auto;\n  overflow-x: hidden;\n  overscroll-behavior: contain;\n  scrollbar-width: thin;\n  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;\n}\n\n.gc-scroll::-webkit-scrollbar {\n  width: 8px;\n}\n\n.gc-scroll::-webkit-scrollbar-thumb {\n  background: var(--dsw-alias-scrollbar-bg-l1);\n  border-radius: 4px;\n}\n\n.gc-scroll::-webkit-scrollbar-thumb:hover {\n  background: var(--dsw-alias-scrollbar-bg-hover-l1);\n}\n\n.gc-feed {\n  position: relative;\n  min-height: 100%;\n  padding: 12px 0 16px;\n}\n\n.gc-feed[aria-busy='true'] {\n  opacity: 0.85;\n}\n\n.gc-feed-top {\n  display: flex;\n  justify-content: center;\n  padding: 4px 0 8px;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n/* 时间分隔 */\n.gc-time-divider {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 12px 0 8px;\n  font-size: 12px;\n  font-weight: 400;\n  line-height: 18px;\n  color: var(--dsw-alias-label-caption);\n}\n\n/* 行布局 */\n.gc-row {\n  display: flex;\n  align-items: flex-start;\n  gap: var(--gc-indent-gap);\n  padding: 0 0 var(--gc-row-gap);\n}\n\n.gc-row[data-tight='true'] {\n  padding-bottom: var(--gc-row-gap-tight);\n}\n\n.gc-row[data-self='true'] {\n  justify-content: flex-end;\n}\n\n.gc-row-main {\n  min-width: 0;\n  flex: 1 1 auto;\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n}\n\n.gc-row[data-self='true'] .gc-row-main {\n  align-items: flex-end;\n}\n\n/* 头像 */\n.gc-avatar {\n  flex: none;\n  width: var(--gc-avatar);\n  height: var(--gc-avatar);\n  border-radius: var(--gc-avatar-radius);\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 12px;\n  font-weight: 500;\n  line-height: 1;\n  background: var(--dsw-alias-state-business-tertiary);\n  color: var(--dsw-alias-label-primary);\n  user-select: none;\n  overflow: hidden;\n}\n\n.gc-avatar[data-kind='lead'] {\n  background: var(--dsw-alias-state-business-primary);\n  color: var(--dsw-alias-button-primary-fill);\n}\n\n.gc-avatar[data-kind='user'] {\n  background: var(--dsw-alias-label-dimmed);\n  color: var(--dsw-alias-label-primary);\n}\n\n.gc-avatar[data-size='24'] {\n  width: 24px;\n  height: 24px;\n  border-radius: 6px;\n  font-size: 11px;\n}\n\n.gc-avatar[data-size='40'] {\n  width: 40px;\n  height: 40px;\n  border-radius: 10px;\n  font-size: 14px;\n}\n\n/* SenderLine */\n.gc-sender {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 20px;\n  margin-bottom: 4px;\n  max-width: 100%;\n}\n\n.gc-sender-name {\n  font-size: 14px;\n  font-weight: 500;\n  line-height: 20px;\n  color: var(--dsw-alias-label-secondary);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  max-width: 320px;\n}\n\n.gc-sender[data-card='true'] .gc-sender-name {\n  font-weight: 600;\n  color: var(--dsw-alias-label-primary);\n}\n\n.gc-sender-sub {\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.gc-sender-role {\n  flex: none;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  white-space: nowrap;\n}\n\n.gc-sender-status {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  white-space: nowrap;\n}\n\n.gc-sender-time {\n  margin-left: auto;\n  padding-left: 8px;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  white-space: nowrap;\n}\n\n/* 气泡 */\n.gc-bubble-wrap {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  max-width: min(var(--gc-bubble-max), 100%);\n}\n\n.gc-row[data-self='true'] .gc-bubble-wrap {\n  align-items: flex-end;\n}\n\n/* 发送中：说明行在气泡**外左侧**（UX §7 统一口径，无 spinner） */\n.gc-bubble-wrap[data-sending='true'] {\n  flex-direction: row;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 8px;\n}\n\n.gc-bubble-wrap[data-sending='true'] .gc-caption {\n  margin-top: 0;\n  flex: none;\n  white-space: nowrap;\n}\n\n.gc-bubble {\n  max-width: 100%;\n  border-radius: var(--gc-bubble-radius);\n  padding: var(--gc-bubble-padding);\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-primary);\n  font-size: var(--gc-font);\n  line-height: var(--gc-line);\n  overflow-wrap: anywhere;\n  word-break: break-word;\n}\n\n.gc-bubble[data-self='true'] {\n  border-radius: var(--gc-user-bubble-radius);\n  padding: var(--gc-user-bubble-padding);\n  background: var(--dsw-specific-bubble, var(--dsw-alias-bg-layer-3));\n}\n\n.gc-bubble[data-state='sending'] {\n  opacity: 0.6;\n}\n\n.gc-bubble[data-state='failed'] {\n  border: 1px solid var(--dsw-alias-state-error-primary);\n}\n\n.gc-bubble p {\n  margin: 0;\n}\n\n.gc-bubble p + p {\n  margin-top: 8px;\n}\n\n.gc-bubble code {\n  font-family: var(--gc-code-font);\n  font-size: 12.5px;\n  padding: 1px 4px;\n  border-radius: var(--gc-radius-xs);\n  background: var(--dsw-alias-markdown-inline-code);\n}\n\n.gc-bubble pre {\n  margin: 8px 0;\n  padding: 10px 12px;\n  border-radius: var(--gc-radius-sm);\n  background: var(--dsw-alias-markdown-code-block);\n  overflow-x: auto;\n}\n\n.gc-bubble pre code {\n  background: none;\n  padding: 0;\n}\n\n.gc-bubble a {\n  color: var(--dsw-alias-link, var(--dsw-alias-state-business-primary));\n}\n\n.gc-bubble .gc-mention {\n  color: var(--dsw-alias-state-business-primary);\n  white-space: nowrap;\n}\n\n.gc-bubble .gc-mention[role='button'],\n.gc-bubble .gc-mention[data-clickable='true'] {\n  cursor: pointer;\n}\n\n.gc-bubble .gc-mention[data-clickable='true']:hover {\n  text-decoration: underline;\n}\n\n/* 折叠 */\n.gc-foldable {\n  position: relative;\n  max-height: var(--gc-fold-max);\n  overflow: hidden;\n}\n\n.gc-foldable[data-expanded='true'] {\n  max-height: none;\n  overflow: visible;\n}\n\n.gc-foldable[data-expanded='false']::after {\n  content: '';\n  position: absolute;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  height: var(--gc-fold-mask);\n  pointer-events: none;\n  background: linear-gradient(to bottom, transparent, var(--dsw-specific-bubble, var(--dsw-alias-bg-layer-2)));\n}\n\n.gc-bubble[data-self='true'] .gc-foldable[data-expanded='false']::after {\n  background: linear-gradient(to bottom, transparent, var(--dsw-specific-bubble, var(--dsw-alias-bg-layer-3)));\n}\n\n.gc-fold-meta {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-top: 4px;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-fold-toggle {\n  appearance: none;\n  border: 0;\n  background: none;\n  padding: 0;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-state-business-primary);\n  cursor: pointer;\n}\n\n.gc-fold-toggle:hover {\n  text-decoration: underline;\n}\n\n/* 气泡下说明 */\n.gc-caption {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  flex-wrap: wrap;\n  margin-top: 4px;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.gc-row[data-self='true'] .gc-caption {\n  justify-content: flex-end;\n}\n\n.gc-caption[data-tone='error'] {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.gc-caption .gc-caption-action {\n  font-size: 11px;\n  color: var(--dsw-alias-state-business-primary);\n}\n\n.gc-caption-sep {\n  color: var(--dsw-alias-label-caption);\n}\n\n/* 工具调用折叠行 / 文件行 */\n.gc-tool-line {\n  margin-top: 4px;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-file-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-top: 8px;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-secondary);\n  flex-wrap: wrap;\n}\n\n.gc-file-row .gc-file-name {\n  color: var(--dsw-alias-label-primary);\n}\n\n.gc-file-row .gc-file-path {\n  font-size: 11px;\n  color: var(--dsw-alias-label-caption);\n  font-family: var(--gc-code-font);\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n/* 行内操作（hover / focus 才出现） */\n.gc-row-actions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-top: 2px;\n  opacity: 0;\n  transition: opacity 150ms ease-out;\n}\n\n.gc-row:hover .gc-row-actions,\n.gc-row:focus-within .gc-row-actions {\n  opacity: 1;\n}\n\n@media (hover: none) {\n  .gc-row-actions {\n    opacity: 1;\n  }\n}\n\n.gc-row-action {\n  appearance: none;\n  border: 0;\n  background: none;\n  padding: 0;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  cursor: pointer;\n}\n\n.gc-row-action:hover {\n  color: var(--dsw-alias-label-secondary);\n}\n\n/* ── 系统提示 / 欢迎提示 ──────────────────────────────────────────────── */\n\n.gc-system-note {\n  display: flex;\n  justify-content: center;\n  padding: 2px 0 12px;\n  font-size: 11.5px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-tertiary);\n  text-align: center;\n}\n\n.gc-welcome-note {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 2px;\n  padding: 2px 0 12px;\n  font-size: 11.5px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-tertiary);\n  text-align: center;\n}\n\n.gc-welcome-note .gc-welcome-time {\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n/* ── 卡片（M8 入群消息 / M9 任务卡） ─────────────────────────────────── */\n\n.gc-card-row {\n  display: flex;\n  align-items: flex-start;\n  gap: var(--gc-indent-gap);\n  padding: 0 0 var(--gc-row-gap);\n}\n\n.gc-card-row .gc-row-main {\n  min-width: 0;\n  flex: 1 1 auto;\n}\n\n.gc-card {\n  width: 100%;\n  max-width: 520px;\n  padding: 16px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: var(--gc-radius-md);\n  background: var(--dsw-alias-bg-layer-1);\n}\n\n.gc-card[data-compact='true'] {\n  padding: 12px 16px;\n}\n\n.gc-card-title {\n  margin: 0 0 6px;\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 19px;\n  color: var(--dsw-alias-label-primary);\n}\n\n.gc-card-desc {\n  margin: 0 0 8px;\n  font-size: 12px;\n  line-height: 19px;\n  color: var(--dsw-alias-label-secondary);\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n\n.gc-card-desc[data-empty='true'] {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.gc-card-fields {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n  margin: 2px 0 0;\n}\n\n.gc-field-row {\n  display: flex;\n  align-items: flex-start;\n  gap: 0;\n  min-height: 22px;\n  font-size: 12px;\n  line-height: 22px;\n}\n\n.gc-field-label {\n  flex: none;\n  width: 68px;\n  font-size: 11px;\n  line-height: 22px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-field-value {\n  min-width: 0;\n  flex: 1 1 auto;\n  font-size: 12px;\n  line-height: 22px;\n  color: var(--dsw-alias-label-secondary);\n  overflow-wrap: anywhere;\n}\n\n.gc-field-value[data-mono='true'] {\n  font-family: var(--gc-code-font);\n  font-size: 11px;\n}\n\n.gc-card-task-block {\n  margin-top: 10px;\n}\n\n.gc-card-task-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 2px;\n}\n\n.gc-card-task-label {\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-card-task-body {\n  margin: 0;\n  font-size: 11px;\n  line-height: 17px;\n  color: var(--dsw-alias-label-tertiary);\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n}\n\n.gc-card-task-body[data-clamped='true'] {\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n\n.gc-card-actions {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  margin-top: 12px;\n}\n\n.gc-card-action {\n  appearance: none;\n  border: 0;\n  background: none;\n  padding: 0;\n  font-size: 12px;\n  line-height: 18px;\n  font-weight: 500;\n  color: var(--dsw-alias-state-business-primary);\n  cursor: pointer;\n}\n\n.gc-card-action[data-tone='secondary'] {\n  font-weight: 400;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.gc-card-action[data-state='disabled'],\n.gc-card-action:disabled {\n  color: var(--dsw-alias-label-dimmed);\n  cursor: default;\n}\n\n.gc-card-action:hover:not(:disabled) {\n  text-decoration: underline;\n}\n\n/* 任务卡 */\n.gc-task-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 8px;\n}\n\n.gc-task-action {\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  white-space: nowrap;\n}\n\n.gc-task-id {\n  margin-left: auto;\n  font-family: var(--gc-code-font);\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  white-space: nowrap;\n}\n\n.gc-pill {\n  display: inline-flex;\n  align-items: center;\n  height: 20px;\n  padding: 0 8px;\n  border-radius: 999px;\n  font-size: 11px;\n  line-height: 20px;\n  white-space: nowrap;\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-secondary);\n}\n\n.gc-pill[data-status='in_progress'] {\n  background: var(--dsw-alias-state-business-tertiary);\n  color: var(--dsw-alias-state-business-primary);\n}\n\n.gc-pill[data-status='completed'] {\n  background: var(--dsw-alias-state-success-tertiary);\n  color: var(--dsw-alias-state-success-primary);\n}\n\n.gc-pill[data-status='deleted'] {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-task-title {\n  margin: 0 0 4px;\n  font-size: 14px;\n  font-weight: 600;\n  line-height: 20px;\n  color: var(--dsw-alias-label-primary);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.gc-task-desc {\n  margin: 0 0 6px;\n  font-size: 11.5px;\n  line-height: 17px;\n  color: var(--dsw-alias-label-tertiary);\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n}\n\n.gc-task-desc[data-clamped='true'] {\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n\n.gc-task-fields {\n  display: flex;\n  flex-direction: column;\n}\n\n.gc-task-field {\n  display: flex;\n  align-items: flex-start;\n  gap: 0;\n  min-height: 20px;\n  font-size: 11.5px;\n  line-height: 20px;\n}\n\n.gc-task-field-label {\n  flex: none;\n  width: 68px;\n  font-size: 11px;\n  line-height: 20px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-task-field-value {\n  min-width: 0;\n  flex: 1 1 auto;\n  color: var(--dsw-alias-label-secondary);\n  overflow-wrap: anywhere;\n}\n\n.gc-task-actions {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  margin-top: 10px;\n}\n\n/* ── 空态 / 骨架 / 错误态 ─────────────────────────────────────────────── */\n\n.gc-center-state {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  padding: 64px 24px;\n  text-align: center;\n}\n\n.gc-empty-icon {\n  width: 48px;\n  height: 48px;\n  border-radius: 50%;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 20px;\n  line-height: 1;\n  margin-bottom: 4px;\n}\n\n.gc-empty-title {\n  font-size: 14px;\n  font-weight: 600;\n  line-height: 20px;\n  color: var(--dsw-alias-label-primary);\n}\n\n.gc-empty-desc {\n  max-width: 460px;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.gc-empty-action {\n  margin-top: 4px;\n  appearance: none;\n  border: 0;\n  padding: 4px 10px;\n  border-radius: var(--gc-radius-sm);\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-secondary);\n  font-size: 11px;\n  line-height: 16px;\n  cursor: pointer;\n}\n\n.gc-skeleton {\n  display: flex;\n  align-items: flex-start;\n  gap: 8px;\n  padding: 8px 0;\n}\n\n.gc-skeleton-body {\n  flex: 1 1 auto;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding-top: 2px;\n}\n\n.gc-skeleton-avatar {\n  flex: none;\n  width: var(--gc-avatar);\n  height: var(--gc-avatar);\n  border-radius: var(--gc-avatar-radius);\n  background: var(--dsw-alias-bg-skeleton);\n}\n\n.gc-skeleton-bar {\n  height: 10px;\n  border-radius: 4px;\n  background: var(--dsw-alias-bg-skeleton);\n}\n\n@keyframes gc-skeleton-pulse {\n  0% { opacity: 0.65; }\n  50% { opacity: 1; }\n  100% { opacity: 0.65; }\n}\n\n.gc-skeleton-avatar,\n.gc-skeleton-bar {\n  animation: gc-skeleton-pulse 1.4s ease-in-out infinite;\n}\n\n.gc-error-card {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  justify-content: center;\n  flex-wrap: wrap;\n  padding: 10px 12px;\n  margin: 32px 0;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: var(--gc-radius-sm);\n  background: var(--dsw-alias-bg-layer-1);\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 18px;\n}\n\n.gc-error-card[data-tone='error'] {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n/* ── 未读浮标 ─────────────────────────────────────────────────────────── */\n\n.gc-unread-pill {\n  position: absolute;\n  right: 28px;\n  bottom: 116px;\n  z-index: 15;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  height: 28px;\n  padding: 0 12px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 16px;\n  background: var(--dsw-alias-bg-layer-2);\n  box-shadow: var(--dsw-shadow-lv2, 0 8px 24px rgba(0, 0, 0, 0.32));\n  color: var(--dsw-alias-state-business-primary);\n  font-size: 12px;\n  line-height: 18px;\n  cursor: pointer;\n  animation: gc-pill-in 180ms ease-out;\n}\n\n.gc-unread-pill .gc-dot {\n  background: var(--dsw-alias-state-business-primary);\n}\n\n@keyframes gc-pill-in {\n  from { opacity: 0; transform: translateY(4px); }\n  to { opacity: 1; transform: none; }\n}\n\n/* ── 输入区 ───────────────────────────────────────────────────────────── */\n\n.gc-composer-area {\n  flex: 0 0 auto;\n  padding: 8px 0 16px;\n}\n\n.gc-composer {\n  position: relative;\n  min-height: 96px;\n  width: calc(var(--gc-content-w) + 32px);\n  max-width: calc(100% - (var(--gc-col-pad) * 2));\n  margin: 0 auto;\n  padding: 12px 16px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: var(--gc-radius-panel);\n  background: var(--dsw-specific-input-major, var(--dsw-alias-bg-layer-1));\n  transition: border-color 150ms ease-out;\n}\n\n.gc-composer[data-focused='true'] {\n  border-color: var(--dsw-alias-state-business-primary);\n}\n\n.gc-composer[data-readonly='true'] {\n  opacity: 0.4;\n  pointer-events: none;\n}\n\n.gc-target-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 20px;\n  margin-bottom: 6px;\n  flex-wrap: wrap;\n}\n\n.gc-target-label {\n  flex: none;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-chip {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  height: 20px;\n  padding: 0 8px;\n  border: 0;\n  border-radius: 6px;\n  background: var(--dsw-alias-bg-layer-3);\n  color: var(--dsw-alias-label-primary);\n  font-size: 11px;\n  line-height: 20px;\n  white-space: nowrap;\n  cursor: default;\n}\n\n.gc-chip[data-tone='mention'] {\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent);\n  color: var(--dsw-alias-state-business-primary);\n  cursor: pointer;\n}\n\n.gc-chip[data-tone='mention']:hover {\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 26%, transparent);\n}\n\n.gc-target-hint {\n  min-width: 0;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.gc-input-row {\n  display: flex;\n  align-items: flex-end;\n  gap: 12px;\n}\n\n.gc-textarea {\n  flex: 1 1 auto;\n  min-height: 32px;\n  max-height: 336px;\n  padding: 4px 0;\n  border: 0;\n  outline: none;\n  resize: none;\n  background: transparent;\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  font-size: 14px;\n  line-height: 22px;\n  overflow-y: auto;\n}\n\n.gc-textarea::placeholder {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.gc-send-btn {\n  flex: none;\n  width: 34px;\n  height: 34px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  border: 0;\n  border-radius: 50%;\n  padding: 0;\n  background: var(--dsw-alias-state-business-primary);\n  color: var(--dsw-alias-bg-base);\n  cursor: pointer;\n  transition: opacity 150ms ease-out;\n}\n\n.gc-send-btn:disabled {\n  opacity: 0.4;\n  cursor: default;\n}\n\n/* @ 补全浮层 */\n.gc-mention-popup {\n  position: absolute;\n  left: 16px;\n  bottom: calc(100% + 8px);\n  z-index: 30;\n  width: 380px;\n  max-width: calc(100% - 32px);\n  max-height: 340px;\n  display: flex;\n  flex-direction: column;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 14px;\n  background: var(--dsw-specific-menu, var(--dsw-alias-bg-layer-2));\n  box-shadow: var(--dsw-shadow-lv2, 0 12px 28px rgba(0, 0, 0, 0.35));\n  overflow: hidden;\n}\n\n.gc-mention-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 12px 4px;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-mention-head .gc-spacer {\n  flex: 1;\n}\n\n.gc-mention-list {\n  margin: 0;\n  padding: 4px;\n  list-style: none;\n  overflow-y: auto;\n  scrollbar-width: thin;\n}\n\n.gc-mention-option {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 46px;\n  padding: 6px 8px;\n  border-radius: var(--gc-radius-sm);\n  cursor: pointer;\n  position: relative;\n}\n\n.gc-mention-option[aria-selected='true'] {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.gc-mention-option[aria-selected='true']::before {\n  content: '';\n  position: absolute;\n  left: 0;\n  top: 6px;\n  bottom: 6px;\n  width: 2px;\n  border-radius: 1px;\n  background: var(--dsw-alias-state-business-primary);\n}\n\n.gc-mention-option-main {\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n}\n\n.gc-mention-option-name {\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 18px;\n  color: var(--dsw-alias-label-primary);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.gc-mention-option-sub {\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.gc-mention-empty {\n  padding: 12px;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-mention-foot {\n  padding: 6px 12px 8px;\n  border-top: 1px solid var(--dsw-alias-border-l1);\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n/* ── Toast ────────────────────────────────────────────────────────────── */\n\n.gc-toast {\n  position: absolute;\n  left: 50%;\n  bottom: 24px;\n  transform: translateX(-50%);\n  z-index: 40;\n  max-width: 80%;\n  padding: 8px 14px;\n  border-radius: var(--gc-radius-sm);\n  background: var(--dsw-alias-toast-bg);\n  color: var(--dsw-alias-toast-label);\n  font-size: 12px;\n  line-height: 18px;\n  box-shadow: var(--dsw-shadow-lv2, 0 8px 24px rgba(0, 0, 0, 0.32));\n}\n\n/* ── 响应式（容器查询） ───────────────────────────────────────────────── */\n\n@container (max-width: 1079px) {\n  .gc-shell {\n    --gc-content-w: 856px;\n  }\n}\n\n@container (max-width: 899px) {\n  .gc-shell {\n    --gc-content-w: 720px;\n    --gc-col-pad: 24px;\n    --gc-bubble-max: 70%;\n  }\n\n  .gc-header {\n    padding: 0 16px;\n    gap: 8px;\n  }\n\n  .gc-header-team,\n  .gc-header-title {\n    display: none;\n  }\n\n  .gc-header-divider {\n    display: none;\n  }\n\n  .gc-banner {\n    min-height: 32px;\n  }\n\n  .gc-composer {\n    min-height: 88px;\n    width: calc(var(--gc-content-w) + 0px);\n    max-width: calc(100% - 32px);\n    padding: 10px 14px;\n  }\n\n  .gc-unread-pill {\n    right: 16px;\n    bottom: 104px;\n  }\n\n  .gc-filter-menu {\n    right: 16px;\n  }\n\n  .gc-row,\n  .gc-card-row {\n    gap: 8px;\n  }\n\n  .gc-sender-name {\n    max-width: 180px;\n  }\n\n  .gc-mention-popup {\n    left: 8px;\n  }\n}\n\n@container (max-width: 620px) {\n  .gc-shell {\n    --gc-content-w: 100%;\n    --gc-col-pad: 16px;\n  }\n\n  .gc-header {\n    height: 52px;\n    min-height: 52px;\n    padding: 0 12px;\n  }\n\n  .gc-composer {\n    max-width: calc(100% - 24px);\n  }\n\n  .gc-card {\n    padding: 12px;\n  }\n\n  .gc-field-label,\n  .gc-task-field-label {\n    width: 56px;\n  }\n}\n\n/* ── 动效降级 ─────────────────────────────────────────────────────────── */\n\n@media (prefers-reduced-motion: reduce) {\n  .gc-root *,\n  .gc-root *::before,\n  .gc-root *::after {\n    animation: none !important;\n    transition: none !important;\n  }\n}\n\n\n/* ════════════════════════════════════════════════════════════════════════\n * v1.7（Figma v4.1 / 架构 §6.12–§6.18）\n * ════════════════════════════════════════════════════════════════════════ */\n\n/* ── 隐藏宿主 composer（仅群聊视图激活期，body 标记由 entry/view 维护） ── */\nbody.gc-view-group-chat [data-conversation-region='composer'],\nbody.gc-view-group-chat [data-composer-seat] {\n  display: none !important;\n}\n\n/* ── Markdown 受控渲染（§6.12，禁止 innerHTML） ─────────────────────── */\n.gc-md {\n  font-size: var(--gc-font);\n  line-height: var(--gc-line);\n  color: var(--dsw-alias-label-primary);\n  overflow-wrap: anywhere;\n  word-break: break-word;\n}\n\n.gc-md p.gc-md-p {\n  margin: 0;\n}\n\n.gc-md p.gc-md-p + p.gc-md-p {\n  margin-top: 8px;\n}\n\n.gc-md strong.gc-md-strong {\n  font-weight: 600;\n  color: var(--dsw-alias-label-primary);\n}\n\n.gc-md em.gc-md-em {\n  font-style: italic;\n}\n\n.gc-md code.gc-md-code {\n  font-family: var(--gc-code-font);\n  font-size: 13px;\n  color: var(--dsw-alias-state-business-primary);\n  background: none;\n  padding: 0 2px;\n  border-radius: var(--gc-radius-xs);\n}\n\n.gc-md pre.gc-md-pre {\n  position: relative;\n  margin: 8px 0;\n  padding: 10px 12px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: var(--gc-radius-sm);\n  background: var(--dsw-alias-bg-base);\n  overflow-x: auto;\n  scrollbar-width: thin;\n}\n\n.gc-md pre.gc-md-pre code {\n  font-family: var(--gc-code-font);\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-primary);\n  background: none;\n  padding: 0;\n  white-space: pre;\n}\n\n.gc-md pre.gc-md-pre[data-lang]::before {\n  content: attr(data-lang);\n  position: absolute;\n  top: 4px;\n  right: 8px;\n  font-size: 10.5px;\n  line-height: 14px;\n  color: var(--dsw-alias-label-caption);\n  font-family: var(--gc-code-font);\n  pointer-events: none;\n}\n\n.gc-md ul.gc-md-list,\n.gc-md ol.gc-md-list {\n  margin: 6px 0;\n  padding-left: 20px;\n}\n\n.gc-md li.gc-md-li {\n  line-height: 22px;\n}\n\n.gc-md a.gc-md-link {\n  color: var(--dsw-alias-state-business-primary);\n  text-decoration: none;\n}\n\n.gc-md a.gc-md-link:hover {\n  text-decoration: underline;\n}\n\n.gc-md[data-md='plain'] {\n  white-space: pre-wrap;\n}\n\n.gc-md[data-md-truncated='true']::after {\n  content: '…';\n  color: var(--dsw-alias-label-caption);\n}\n\n/* inline @ chip（v1.7：彩底白字） */\n.gc-bubble .gc-mention,\n.gc-md .gc-mention {\n  color: var(--gc-on-brand, #fff);\n  background: var(--dsw-alias-state-business-primary);\n  border-radius: var(--gc-radius-xs);\n  padding: 0 4px;\n}\n\n.gc-bubble .gc-mention[data-clickable='true']:hover {\n  background: var(--dsw-alias-state-business-tertiary);\n}\n\n/* ── 消息操作图标（§6.16：图标 + aria-label，无长文字） ─────────────── */\n.gc-row-actions {\n  gap: 4px;\n}\n\n.gc-icon-action {\n  appearance: none;\n  border: 0;\n  background: none;\n  padding: 0;\n  width: 24px;\n  height: 24px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  border-radius: var(--gc-radius-xs);\n  color: var(--dsw-alias-label-caption);\n  cursor: pointer;\n}\n\n.gc-icon-action:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n/* ── 输入器 v1.7：chips 在输入框下方、hint 唯一提示 ─────────────────── */\n.gc-composer {\n  display: flex;\n  flex-direction: column;\n}\n\n.gc-input-row {\n  order: 1;\n}\n\n.gc-target-row {\n  order: 2;\n  margin: 8px 0 0;\n  gap: 6px;\n}\n\n.gc-composer-hint {\n  order: 3;\n  margin-top: 4px;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-chip[data-tone='target'] {\n  background: var(--dsw-alias-state-business-primary);\n  color: var(--gc-on-brand, #fff);\n}\n\n.gc-chip[data-tone='mention'] {\n  background: var(--dsw-alias-state-business-tertiary);\n  color: var(--gc-on-brand, #fff);\n}\n\n.gc-chip[data-tone='mention']:hover {\n  filter: brightness(1.12);\n}\n\n.gc-chip .gc-chip-x {\n  font-size: 10px;\n  opacity: 0.75;\n  margin-left: 2px;\n}\n\n/* 补全浮层：实底不透明（禁止 alpha / 毛玻璃） */\n.gc-mention-popup {\n  background: var(--dsw-specific-menu, var(--dsw-alias-bg-layer-2));\n  backdrop-filter: none;\n  -webkit-backdrop-filter: none;\n  opacity: 1;\n}\n\n.gc-mention-option-sub {\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n  white-space: normal;\n  overflow: hidden;\n  display: -webkit-box;\n  -webkit-line-clamp: 1;\n  -webkit-box-orient: vertical;\n}\n\n/* ── 频道头成员条（§6.15.1，24px 头像、working/waiting、+N） ────────── */\n.gc-member-strip {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  row-gap: 4px;\n  margin-left: 8px;\n  min-width: 0;\n  flex: 1 1 auto;\n  /* 用户诉求（2026-10-29）：换行优先、全部成员完整显示、不裁切、无遮罩。\n   * 头部 height:auto（min-height 56）随行数增长；不再横向滚动/隐藏首尾姓名。 */\n  flex-wrap: wrap;\n  row-gap: 4px;\n}\n\n.gc-member-strip .gc-avatar {\n  width: 26px;\n  height: 26px;\n  border-radius: 7px;\n  font-size: 11px;\n}\n\n.gc-member-strip::-webkit-scrollbar {\n  display: none;\n}\n\n.gc-member-strip-item {\n  position: relative;\n  flex: none;\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  appearance: none;\n  border: 0;\n  padding: 0 2px;\n  background: none;\n  cursor: pointer;\n  border-radius: 6px;\n  line-height: 16px;\n}\n\n.gc-member-name {\n  font-size: 12px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-secondary);\n  white-space: nowrap;\n}\n\n.gc-member-strip-item:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 2px;\n}\n\n.gc-member-status-dot {\n  flex: none;\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: var(--dsw-alias-label-dimmed);\n}\n\n.gc-member-status-dot[data-state='working'] {\n  background: var(--dsw-alias-state-success-primary);\n}\n\n\n/* ── 轮次轨迹侧栏（§6.15.2，右侧 380px 抽屉） ───────────────────────── */\n.gc-trajectory-overlay {\n  position: absolute;\n  inset: 0;\n  z-index: 50;\n  background: rgba(0, 0, 0, 0.35);\n}\n\n.gc-trajectory-panel {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  z-index: 51;\n  width: 380px;\n  max-width: 100%;\n  display: flex;\n  flex-direction: column;\n  background: var(--dsw-alias-bg-layer-1);\n  border-left: 1px solid var(--dsw-alias-border-l2);\n  box-shadow: var(--dsw-shadow-lv2, 0 12px 28px rgba(0, 0, 0, 0.35));\n}\n\n.gc-trajectory-head {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 12px 14px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n}\n\n.gc-trajectory-title {\n  font-size: 14px;\n  font-weight: 600;\n  line-height: 20px;\n  color: var(--dsw-alias-label-primary);\n}\n\n.gc-trajectory-agent {\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.gc-trajectory-meta {\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-trajectory-list {\n  flex: 1 1 auto;\n  min-height: 0;\n  overflow-y: auto;\n  padding: 8px 12px 16px;\n  scrollbar-width: thin;\n}\n\n.gc-trajectory-turn {\n  padding: 10px 12px;\n  margin-bottom: 8px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: var(--gc-radius-sm);\n  background: var(--dsw-alias-bg-layer-2);\n}\n\n.gc-trajectory-turn-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 10.5px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-trajectory-turn-status {\n  margin-left: auto;\n  font-size: 10.5px;\n}\n\n.gc-trajectory-turn-status[data-status='running'] {\n  color: var(--dsw-alias-state-business-primary);\n}\n\n.gc-trajectory-turn-status[data-status='error'] {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.gc-trajectory-turn-summary {\n  margin-top: 4px;\n  font-size: 11.5px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-secondary);\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n\n.gc-trajectory-turn-tools {\n  margin-top: 4px;\n  font-size: 10.5px;\n  line-height: 14px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-trajectory-foot {\n  flex: none;\n  padding: 8px 12px 12px;\n  border-top: 1px solid var(--dsw-alias-border-l1);\n  text-align: center;\n}\n\n/* M1：成员条头像响应式 26/24/22，768 全显 */\n@container (max-width: 1079px) {\n  .gc-member-strip .gc-avatar {\n    width: 24px;\n    height: 24px;\n    border-radius: 6px;\n  }\n}\n\n@container (max-width: 899px) {\n  .gc-member-strip {\n    margin-left: 4px;\n    gap: 3px;\n  }\n\n  .gc-member-strip .gc-avatar {\n    width: 22px;\n    height: 22px;\n    border-radius: 6px;\n    font-size: 10px;\n  }\n\n  .gc-member-name {\n    font-size: 11px;\n  }\n}\n\n@container (max-width: 767px) {\n  .gc-trajectory-panel {\n    width: 100%;\n    border-left: 0;\n  }\n}\n\n/* ── 任务卡 v5（§6.18：左状态条 + 任务图标 + 负责人头像） ────────────── */\n.gc-card[data-card='task'] {\n  position: relative;\n  padding-left: 19px;\n}\n\n.gc-card[data-card='task']::before {\n  content: '';\n  position: absolute;\n  left: 0;\n  top: 12px;\n  bottom: 12px;\n  width: 3px;\n  border-radius: 2px;\n  background: var(--dsw-alias-label-dimmed);\n}\n\n.gc-card[data-card='task'][data-card-accent='pending']::before {\n  background: var(--dsw-alias-label-dimmed);\n}\n\n.gc-card[data-card='task'][data-card-accent='in_progress']::before {\n  background: var(--dsw-alias-state-business-primary);\n}\n\n.gc-card[data-card='task'][data-card-accent='completed']::before {\n  background: var(--dsw-alias-state-success-primary);\n}\n\n.gc-card[data-card='task'][data-card-accent='deleted']::before {\n  background: var(--dsw-alias-label-caption);\n}\n\n.gc-task-head {\n  gap: 6px;\n}\n\n.gc-task-icon {\n  flex: none;\n  color: var(--dsw-alias-label-secondary);\n  display: inline-flex;\n}\n\n.gc-task-action {\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 18px;\n  color: var(--dsw-alias-label-primary);\n}\n\n/* F34：默认折叠态更紧凑（只显示标题/状态/负责人/依赖/完成时间） */\n.gc-card[data-card='task'][data-task-expanded='false'] {\n  padding-top: 12px;\n  padding-bottom: 12px;\n}\n\n.gc-card[data-card='task'][data-task-expanded='false'] .gc-task-title {\n  margin-bottom: 6px;\n}\n\n.gc-task-details {\n  margin: 8px 0 4px;\n}\n\n.gc-task-detail-block + .gc-task-detail-block {\n  margin-top: 8px;\n}\n\n.gc-task-detail-label {\n  display: block;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-caption);\n}\n\n.gc-task-owner-role {\n  color: var(--dsw-alias-label-caption);\n}\n\n/* F32：GFM 表格（边框 / 表头底色 / 斑马纹 / 横向滚动） */\n.gc-md-table-wrap {\n  margin: 8px 0;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: var(--gc-radius-sm);\n  overflow-x: auto;\n  scrollbar-width: thin;\n}\n\n.gc-md table.gc-md-table {\n  width: 100%;\n  min-width: 320px;\n  border-collapse: collapse;\n  font-size: 12.5px;\n  line-height: 18px;\n}\n\n.gc-md table.gc-md-table th,\n.gc-md table.gc-md-table td {\n  padding: 6px 10px;\n  border-right: 1px solid var(--dsw-alias-border-l1);\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n  vertical-align: top;\n  text-align: left;\n}\n\n.gc-md table.gc-md-table th:last-child,\n.gc-md table.gc-md-table td:last-child {\n  border-right: 0;\n}\n\n.gc-md table.gc-md-table thead th {\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-primary);\n  font-weight: 600;\n  white-space: nowrap;\n}\n\n.gc-md table.gc-md-table tbody td {\n  color: var(--dsw-alias-label-secondary);\n}\n\n.gc-md table.gc-md-table tbody tr:nth-child(even) {\n  background: var(--dsw-alias-bg-layer-1);\n}\n\n.gc-md table.gc-md-table tbody tr:last-child td {\n  border-bottom: 0;\n}\n\n\n/* M9：负责人空回退用中性占位（不显示「?」文本） */\n.gc-avatar-placeholder {\n  background: var(--dsw-alias-interactive-bg-hover);\n  border: 1px dashed var(--dsw-alias-border-l2);\n  color: transparent;\n}\n\n/* M3：不安全链接降级为纯文本 */\n.gc-md-link-plain {\n  color: var(--dsw-alias-label-primary);\n}\n";

/* ── src/adapters/client-session-source.js ─────────────────────────────────────────── */
__def("src/adapters/client-session-source.js", function (__exports, __req) {
// @ts-check
/**
 * 适配器 · ClientSessionSource（v1 生产实现，纯 Client）
 *
 * 契约：架构 §4.6 `ChannelSource` + §4.8.1 客户端 API 映射 + Spike S1（entries 是原始事件信封）。
 *
 * 依赖注入：`deps = {ctx, channelId, sessionId}`（T2 冻结形状），另支持可选：
 *   `deps.members`（useSessions 的 agentTeam 成员目录）、`deps.isRunning(id)`、`deps.getReadAccess(id)`、
 *   `deps.readonly`、`deps.now`、`deps.sourceKey`、`deps.toolFold`、`deps.maxMessages`。
 *
 * 不依赖 React / DOM / useSessions：可从事件与 `ctx.sessions` 自举成员目录（三源并集见 §4.8.2），
 * 有 `deps.members` 时优先使用（投影更准）。
 */

const { LIMITS } = __req("src/core/constants.js");
const { normalizeChannel, normalizeEntries } = __req("src/core/normalize.js");
const { deriveSnapshot } = __req("src/core/roster.js");
const { buildPage, firstScreen, pageOlder: pageOlderCore } = __req("src/core/paginate.js");
const { cloneCursor, compareOrderKey, makeCursor, orderKey } = __req("src/core/timeline.js");

/**
 * @typedef {import('../core/model.js').ChannelPage} ChannelPage
 * @typedef {import('../core/model.js').ChannelCursor} ChannelCursor
 * @typedef {import('../core/model.js').ChannelMessage} ChannelMessage
 */

/**
 * 从 sessionId 推导频道根（lead）会话 id：
 * `binding(id).session.getSnapshot().subagent?.address?.parentSessionId ?? id`（API §B2）
 * @param {{sessions: any}} ctx
 * @param {string} sessionId
 * @param {string} [sourceKey]
 * @returns {string}
 */
function deriveLeadSessionId(ctx, sessionId, sourceKey = 'group-chat') {
  const fallback = String(sessionId ?? '');
  if (!ctx || !ctx.sessions || !fallback) return fallback;
  let ref;
  try {
    ref = retainWithSourceFallback(ctx.sessions, fallback, sourceKey);
    const snapshot = ref?.binding?.session?.getSnapshot?.() ?? {};
    const parent =
      snapshot.subagent?.address?.parentSessionId ??
      snapshot.subagent?.address?.parentId ??
      snapshot.parentSessionId ??
      snapshot.parentSession;
    return parent ? String(parent) : fallback;
  } catch {
    return fallback;
  } finally {
    try {
      ref?.release?.();
    } catch {
      /* ignore */
    }
  }
}

/**
 * `SessionReferenceSource` 的第三方向声明合并是 UNVERIFIED（API H-4）→ 失败时退回既有 key `gateway`。
 * @param {any} sessions
 * @param {string} sessionId
 * @param {string} sourceKey
 * @returns {any}
 */
function retainWithSourceFallback(sessions, sessionId, sourceKey) {
  try {
    return sessions.retain(sessionId, { source: sourceKey });
  } catch {
    return sessions.retain(sessionId, { source: 'gateway' });
  }
}

/**
 * @typedef {Object} ClientSourceDeps
 * @property {any} ctx
 * @property {string} [channelId]
 * @property {string} [sessionId]
 * @property {import('../core/model.js').ChannelMember[]} [members]
 * @property {(sessionId: string) => boolean} [isRunning]
 * @property {(sessionId: string) => boolean} [getReadAccess]
 * @property {boolean} [readonly]
 * @property {() => number} [now]
 * @property {string} [sourceKey]
 * @property {'attach'|'delivery'|'none'} [toolFold]
 * @property {number} [maxMessages]
 * @property {boolean} [noRoster]
 */

class ClientSessionSource {
  /** @param {ClientSourceDeps} deps */
  constructor(deps) {
    if (!deps || !deps.ctx || !deps.ctx.sessions) {
      throw new TypeError('ClientSessionSource: deps.ctx.sessions 必填');
    }
    this.deps = deps;
    this.ctx = deps.ctx;
    this.sourceKey = deps.sourceKey ?? 'group-chat';
    this.sessionId = String(deps.sessionId ?? deps.channelId ?? '');
    this.channelId = String(deps.channelId ?? deps.sessionId ?? '');
    if (!this.channelId) throw new TypeError('ClientSessionSource: 需要 channelId 或 sessionId');
    this.now = deps.now ?? (() => Date.now());
    /** @type {Map<string, any>} */
    this.refs = new Map();
    /** @type {Map<string, {events: any[], revision: number}>} */
    this.store = new Map();
    /** @type {Set<(kind: 'append'|'reset'|'status') => void>} */
    this.listeners = new Set();
    /** @type {Map<string, () => void>} */
    this.unsubscribers = new Map();
    /** @type {ChannelMessage[]} */
    this.messages = [];
    /** @type {import('../core/model.js').ChannelMember[]} */
    this.members = deps.members ?? [];
    this.closed = false;
    this._scheduled = false;
  }

  /**
   * @param {string} channelId
   * @param {{limit?: number}} [opts]
   * @returns {Promise<ChannelPage>}
   */
  async open(channelId, opts = {}) {
    this._assertOpen();
    const resolved = String(channelId ?? this.channelId);
    if (resolved !== this.channelId) {
      this.close();
      this.closed = false;
      this.channelId = resolved;
      this.sessionId = this.sessionId || resolved;
    }
    const computed = this._refresh();
    const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : LIMITS.firstScreen;
    const pageMessages = firstScreen(computed.messages, limit);
    const cursor = makeCursor(this.channelId);
    for (const [sessionId, rec] of this.store) {
      cursor.offsets[sessionId] = rec.events.reduce(
        (max, e) => (typeof e.seq === 'number' && e.seq > max ? e.seq : max),
        -1,
      );
      cursor.revisions[sessionId] = rec.revision;
    }
    if (pageMessages.length > 0) {
      cursor.oldestKey = orderKey(pageMessages[0]);
      cursor.newestKey = orderKey(pageMessages[pageMessages.length - 1]);
    }
    return buildPage({
      channel: computed.channel,
      messages: pageMessages,
      cursor,
      hasMore: computed.messages.length > pageMessages.length || this._anyWindowHasMore(),
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * @param {ChannelCursor} cursor
   * @returns {Promise<ChannelPage>}
   */
  async sync(cursor) {
    this._assertOpen();
    const computed = this._refresh();
    /** @type {ChannelMessage[]} */
    const delta = [];
    for (const m of computed.messages) {
      if (!cursor?.newestKey || compareOrderKey(orderKey(m), cursor.newestKey) > 0) delta.push(m);
    }
    const next = cloneCursor(cursor, this.channelId);
    if (computed.messages.length > 0) {
      next.newestKey = orderKey(computed.messages[computed.messages.length - 1]);
      if (!next.oldestKey) next.oldestKey = orderKey(computed.messages[0]);
    }
    for (const [sessionId, rec] of this.store) {
      next.revisions[sessionId] = rec.revision;
      next.offsets[sessionId] = rec.events.reduce(
        (max, e) => (typeof e.seq === 'number' && e.seq > max ? e.seq : max),
        next.offsets[sessionId] ?? -1,
      );
    }
    return buildPage({
      channel: computed.channel,
      messages: delta,
      cursor: next,
      hasMore: false,
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * @param {ChannelCursor} cursor
   * @param {number} [limit]
   * @returns {Promise<ChannelPage>}
   */
  async pageOlder(cursor, limit = LIMITS.pageSize) {
    this._assertOpen();
    // 优先用会话级窗口扩展原语（§4.5/PRD F10）
    const loads = [];
    for (const [sessionId, ref] of this.refs) {
      const session = ref?.binding?.session;
      if (session && typeof session.loadOlder === 'function') {
        loads.push(
          Promise.resolve()
            .then(() => session.loadOlder())
            .catch(() => false),
        );
      }
    }
    if (loads.length > 0) await Promise.all(loads);
    const computed = this._refresh();
    const next = cloneCursor(cursor, this.channelId);
    const older = pageOlderCore(computed.messages, next.oldestKey, limit);
    if (older.length > 0) next.oldestKey = orderKey(older[0]);
    const remaining = computed.messages.filter(
      (m) => !next.oldestKey || compareOrderKey(orderKey(m), next.oldestKey) < 0,
    );
    return buildPage({
      channel: computed.channel,
      messages: older,
      cursor: next,
      hasMore: remaining.length > 0 || this._anyWindowHasMore(),
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * @param {(kind: 'append'|'reset'|'status') => void} onChange
   * @returns {() => void}
   */
  subscribe(onChange) {
    this.listeners.add(onChange);
    this._ensureRetained(this.channelId);
    for (const [sessionId, ref] of this.refs) this._subscribeWindow(sessionId, ref);
    return () => {
      this.listeners.delete(onChange);
    };
  }

  /** @returns {{canSend: boolean, reason?: string}} */
  capabilities() {
    if (this.closed) return { canSend: false, reason: 'closed' };
    if (this.deps.readonly === true) return { canSend: false, reason: 'readonly' };
    const leadRef = this.refs.get(this.channelId);
    if (!leadRef) return { canSend: false, reason: 'session-missing' };
    if (typeof this.deps.getReadAccess === 'function' && this.deps.getReadAccess(this.channelId) === false) {
      return { canSend: false, reason: 'permission' };
    }
    return { canSend: true };
  }

  close() {
    this.closed = true;
    for (const unsub of this.unsubscribers.values()) {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    }
    this.unsubscribers.clear();
    for (const ref of this.refs.values()) {
      try {
        ref?.release?.();
      } catch {
        /* ignore */
      }
    }
    this.refs.clear();
    this.store.clear();
    this.listeners.clear();
    this.messages = [];
  }

  /** UI 便捷：最近一次计算的全部消息（已排序去重） */
  getMessages() {
    return this.messages;
  }

  /** UI 便捷：最近一次计算的成员目录 */
  getMembers() {
    return this.members;
  }

  /**
   * UI 便捷（只读）：某会话已 retain 的事件窗口内**原始事件**（F3 轨迹真实轮次用）。
   * 与 feed 同一份窗口，不新增 retain；已关闭/未知会话返回 []，不抛错。
   * @param {string} [sessionId] 默认频道根会话
   * @returns {any[]}
   */
  getEvents(sessionId = this.channelId) {
    const sid = String(sessionId ?? this.channelId ?? '');
    if (!sid) return [];
    try {
      const stored = this.store.get(sid);
      if (stored && Array.isArray(stored.events)) return stored.events.slice();
      const win = this._windowOf(sid);
      return normalizeEntries(win.entries).events;
    } catch {
      return [];
    }
  }

  /**
   * getEvents 的别名（frontend 探测 `getEvents/getMemberEvents` 任一即可）
   * @param {string} [sessionId]
   * @returns {any[]}
   */
  getMemberEvents(sessionId = this.channelId) {
    return this.getEvents(sessionId);
  }

  /**
   * UI 便捷（只读）：窗口元信息 + 原始事件（轨迹侧栏可据此缓存/分页）
   * @param {string} [sessionId]
   * @returns {{sessionId: string, events: any[], entryCount: number, revision: number, hasMore: boolean, partial: boolean}}
   */
  getWindow(sessionId = this.channelId) {
    const sid = String(sessionId ?? this.channelId ?? '');
    if (!sid) return { sessionId: '', events: [], entryCount: 0, revision: 0, hasMore: false, partial: true };
    const stored = this.store.get(sid);
    const win = this._windowOf(sid);
    return {
      sessionId: sid,
      events: this.getEvents(sid),
      entryCount: win.entries.length,
      revision: Number(stored?.revision ?? win.revision ?? 0),
      hasMore: win.hasMore === true,
      partial: win.hasMore === true,
    };
  }

  // ── 内部 ─────────────────────────────────────────────────────
  _assertOpen() {
    if (this.closed) throw new Error('ClientSessionSource: closed');
  }

  /**
   * @param {string} sessionId
   * @returns {any}
   */
  _ensureRetained(sessionId) {
    const sid = String(sessionId);
    if (!sid) return undefined;
    const existing = this.refs.get(sid);
    if (existing) return existing;
    const ref = retainWithSourceFallback(this.ctx.sessions, sid, this.sourceKey);
    this.refs.set(sid, ref);
    this._subscribeWindow(sid, ref);
    return ref;
  }

  /**
   * @param {string} sessionId
   * @param {any} ref
   */
  _subscribeWindow(sessionId, ref) {
    if (this.unsubscribers.has(sessionId)) return;
    const es = ref?.binding?.eventSource;
    const subscribe = es?.subscribe ?? es?.subscribeValue;
    if (typeof subscribe !== 'function') return;
    try {
      const unsub = subscribe.call(es, () => this._schedule('append'));
      if (typeof unsub === 'function') this.unsubscribers.set(sessionId, unsub);
    } catch {
      /* 订阅失败不阻塞读取；sync 兜底 */
    }
  }

  _schedule(kind) {
    if (this._scheduled) return;
    this._scheduled = true;
    Promise.resolve().then(() => {
      this._scheduled = false;
      for (const fn of this.listeners) {
        try {
          fn(kind);
        } catch {
          /* ignore */
        }
      }
    });
  }

  /**
   * 读取一个会话窗口
   * @param {string} sessionId
   * @returns {{entries: any[], revision: number, hasMore: boolean}}
   */
  _windowOf(sessionId) {
    const ref = this.refs.get(sessionId);
    const win = ref?.binding?.eventSource?.getSnapshot?.();
    if (win && Array.isArray(win.entries)) {
      return { entries: win.entries, revision: Number(win.revision ?? 0), hasMore: win.hasMore === true };
    }
    if (win && Array.isArray(win.events)) {
      return { entries: win.events.map((event) => ({ type: 'event', event })), revision: Number(win.revision ?? 0), hasMore: false };
    }
    return { entries: [], revision: 0, hasMore: false };
  }

  _anyWindowHasMore() {
    for (const sessionId of this.refs.keys()) {
      const win = this.refs.get(sessionId)?.binding?.eventSource?.getSnapshot?.();
      if (win?.hasMore === true) return true;
    }
    return false;
  }

  /** @returns {{channel: any, messages: ChannelMessage[], diagnostics: any}} */
  _refresh() {
    this._ensureRetained(this.channelId);
    const seen = new Set();
    // BFS：从 lead 事件里的 catalog / team-member 发现后代会话（depth/session 上限内）
    for (let round = 0; round < LIMITS.maxDepth + 2; round += 1) {
      let discovered = 0;
      for (const sessionId of [...this.refs.keys()]) {
        if (seen.has(sessionId)) continue;
        seen.add(sessionId);
        const win = this._windowOf(sessionId);
        const { events } = normalizeEntries(win.entries);
        this.store.set(sessionId, { events, revision: win.revision });
        if (this.refs.size >= LIMITS.maxSessions) continue;
        for (const event of events) {
          const data = event?.data ?? {};
          const childIds = [];
          if (event.type === 'subagent/catalog' && data.childId) childIds.push(String(data.childId));
          if (event.type === 'team/member' && data.member?.id) childIds.push(String(data.member.id));
          for (const childId of childIds) {
            if (childId && !this.refs.has(childId) && this.refs.size < LIMITS.maxSessions) {
              this._ensureRetained(childId);
              discovered += 1;
            }
          }
        }
      }
      if (discovered === 0) break;
    }
    // 已不在成员目录的会话继续保留引用（历史可读），但不进入本次归一化集合之外的场景不适用
    /** @type {import('../core/model.js').SessionInput[]} */
    const sessions = [];
    for (const [sessionId] of this.refs) {
      const rec = this.store.get(sessionId);
      if (!rec) continue;
      let header = {};
      try {
        header = this.refs.get(sessionId)?.binding?.session?.getSnapshot?.() ?? {};
      } catch {
        header = {};
      }
      sessions.push({ sessionId, header, events: rec.events, revision: rec.revision });
    }
    // D-03：从会话快照读取真实 running（active 相位 ≠ running；避免「N members · N running」高估）
    /** @type {Array<{id: string, parentSessionId?: string, running?: boolean, status?: string}>} */
    const sessionSummaries = [];
    for (const [sessionId, ref] of this.refs) {
      let snapshot = /** @type {any} */ ({});
      try {
        snapshot = ref?.binding?.session?.getSnapshot?.() ?? {};
      } catch {
        snapshot = {};
      }
      sessionSummaries.push({
        id: sessionId,
        parentSessionId: snapshot.parentSession ?? snapshot.subagent?.address?.parentSessionId,
        ...(typeof snapshot.running === 'boolean'
          ? { running: snapshot.running, status: snapshot.running ? 'running' : 'inactive' }
          : {}),
      });
    }
    const result = normalizeChannel(sessions, {
      leadSessionId: this.channelId,
      members: this.deps.members,
      sessionSummaries,
      noRoster: this.deps.noRoster === undefined ? !this.deps.members : this.deps.noRoster,
      localBatches: this.deps.localBatches,
      toolFold: this.deps.toolFold,
      canRead: this.deps.getReadAccess,
      maxMessages: this.deps.maxMessages,
    });
    this.messages = result.messages;
    this.members = result.members;
    const lead = this.members.find((m) => m.kind === 'lead') ?? {
      sessionId: this.channelId,
      name: 'lead',
      displayName: 'Lead',
      kind: /** @type {'lead'} */ ('lead'),
      depth: 0,
      status: /** @type {'running'} */ ('running'),
      addressable: true,
    };
    const readonlyFromEvents = false;
    const channel = deriveSnapshot(
      {
        lead,
        members: this.members,
        runningCount: this.members.filter((m) => m.status === 'running').length,
        degraded: this.deps.members ? undefined : result.degraded,
        truncated: result.truncated,
      },
      {
        channelId: this.channelId,
        readonly: this.deps.readonly === true || readonlyFromEvents,
        now: this.now(),
      },
    );
    return { channel, messages: result.messages, diagnostics: result.diagnostics };
  }
}

/**
 * T2 冻结入口：`createClientSessionSource({ctx, channelId, sessionId})` → ChannelSource
 * @param {ClientSourceDeps} deps
 * @returns {ClientSessionSource}
 */
function createClientSessionSource(deps) {
  return new ClientSessionSource(deps);
}

Object.assign(__exports, { "deriveLeadSessionId": deriveLeadSessionId, "ClientSessionSource": ClientSessionSource, "createClientSessionSource": createClientSessionSource });
});
/* ── src/adapters/index.js ─────────────────────────────────────────── */
__def("src/adapters/index.js", function (__exports, __req) {
// @ts-check
/**
 * 适配器层 · ChannelSource 工厂（架构 §4.6 / §9.1 done-when ⑥）
 *
 * `createChannelSource(kind, deps)`：
 *  - `'mock'`             → MockChannelSource（测试/组件预览，内存 fixture）
 *  - `'client'`           → ClientSessionSource（v1 生产实现，纯 Client）
 *  - `'replay'`           → ClientSessionSource（deps.ctx.sessions 换成 replay host，契约测试用）
 *
 * 两个实现共享同一内核，因此同一 fixture 的输出必须一致（CT-05）。
 */

const { MockChannelSource } = __req("src/adapters/mock-source.js");
const { ClientSessionSource, createClientSessionSource, deriveLeadSessionId } = __req("src/adapters/client-session-source.js");
const { createReplaySessionHost } = __req("src/adapters/replay-host.js");

/**
 * @param {'mock'|'client'|'replay'} kind
 * @param {any} deps
 * @returns {MockChannelSource|ClientSessionSource}
 */
function createChannelSource(kind, deps) {
  switch (kind) {
    case 'mock':
      return new MockChannelSource(deps);
    case 'client':
    case 'replay':
      return createClientSessionSource(deps);
    default:
      throw new TypeError(`createChannelSource: 未知 kind "${kind}"（可选 mock/client/replay）`);
  }
}


Object.assign(__exports, { "createChannelSource": createChannelSource, "MockChannelSource": MockChannelSource, "ClientSessionSource": ClientSessionSource, "createClientSessionSource": createClientSessionSource, "deriveLeadSessionId": deriveLeadSessionId, "createReplaySessionHost": createReplaySessionHost });
});
/* ── src/adapters/mock-source.js ─────────────────────────────────────────── */
__def("src/adapters/mock-source.js", function (__exports, __req) {
// @ts-check
/**
 * 适配器 · MockChannelSource（测试/组件预览用，内存实现）
 *
 * 与 `ClientSessionSource` 共享同一套 `ChannelSource` 契约（§4.6）与同一内核，
 * 因此可作为契约测试的「同一套用例跑两个实现」的第一个实现（§8.1 L2）。
 *
 * 依赖：`src/core` 纯函数；不读 DOM / Cordis。
 */

const { LIMITS } = __req("src/core/constants.js");
const { normalizeEntries, normalizeChannel } = __req("src/core/normalize.js");
const { deriveSnapshot } = __req("src/core/roster.js");
const { buildPage, firstScreen, pageOlder: pageOlderCore } = __req("src/core/paginate.js");
const { cloneCursor, compareOrderKey, makeCursor, orderKey } = __req("src/core/timeline.js");

/**
 * @typedef {import('../core/model.js').ChannelMessage} ChannelMessage
 * @typedef {import('../core/model.js').ChannelCursor} ChannelCursor
 * @typedef {import('../core/model.js').ChannelPage} ChannelPage
 * @typedef {import('../core/model.js').ChannelSnapshot} ChannelSnapshot
 */

/**
 * @typedef {Object} MockSourceOptions
 * @property {string} leadSessionId
 * @property {import('../core/model.js').SessionInput[]} sessions
 * @property {import('../core/model.js').ChannelMember[]} [members]        注入名册（缺省从事件推导）
 * @property {boolean} [noRoster]
 * @property {boolean} [historical]
 * @property {boolean} [readonly]
 * @property {'team-ended'|'lead-offline'|'archived'|'permission'} [readonlyReason]
 * @property {Record<string, any>} [localBatches]
 * @property {'attach'|'delivery'|'none'} [toolFold]
 * @property {any} [capabilities]
 * @property {() => number} [now]
 * @property {boolean} [hasMore]
 * @property {number} [maxMessages]
 * @property {Array<{id: string, parentSessionId?: string, running?: boolean, status?: string}>} [sessionSummaries]
 */

/** @implements {import('../core/model.js').ChannelPage|any} */
class MockChannelSource {
  /** @param {MockSourceOptions} opts */
  constructor(opts) {
    if (!opts || !opts.leadSessionId) throw new TypeError('MockChannelSource: 需要 leadSessionId');
    this.leadSessionId = String(opts.leadSessionId);
    this.sessions = (opts.sessions ?? []).map((s) => ({
      sessionId: String(s.sessionId),
      header: s.header ?? { id: s.sessionId },
      events: Array.isArray(s.events) ? s.events : [],
      cutoff: s.cutoff,
      revision: s.revision,
    }));
    this.members = opts.members;
    this.noRoster = opts.noRoster === undefined ? !opts.members : opts.noRoster === true;
    this.historical = opts.historical === true;
    this.readonly = opts.readonly === true;
    this.readonlyReason = opts.readonlyReason;
    this.localBatches = opts.localBatches ?? {};
    this.toolFold = opts.toolFold;
    this.capabilitiesOverride = opts.capabilities;
    this.now = opts.now ?? (() => Date.now());
    this.hasMore = opts.hasMore === true;
    this.maxMessages = opts.maxMessages;
    this.sessionSummaries = opts.sessionSummaries;
    /** @type {Set<(kind: 'append'|'reset'|'status') => void>} */
    this.listeners = new Set();
    this.closed = false;
    this.channelId = this.leadSessionId;
  }

  /**
   * 打开频道（幂等：重复 open 产出同一结果）
   * @param {string} channelId
   * @param {{limit?: number}} [opts]
   * @returns {Promise<ChannelPage>}
   */
  async open(channelId, opts = {}) {
    this._assertOpen();
    this.channelId = channelId || this.leadSessionId;
    const computed = this._compute();
    const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : LIMITS.firstScreen;
    const pageMessages = firstScreen(computed.messages, limit);
    const cursor = makeCursor(this.channelId);
    for (const s of this.sessions) {
      const { events } = normalizeEntries(s.events);
      cursor.offsets[s.sessionId] = events.reduce((max, e) => (typeof e.seq === 'number' && e.seq > max ? e.seq : max), -1);
      cursor.revisions[s.sessionId] = Number(s.revision ?? 0);
    }
    if (pageMessages.length > 0) {
      cursor.oldestKey = orderKey(pageMessages[0]);
      cursor.newestKey = orderKey(pageMessages[pageMessages.length - 1]);
    }
    return buildPage({
      channel: computed.channel,
      messages: pageMessages,
      cursor,
      hasMore: computed.messages.length > pageMessages.length || this.hasMore,
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * 增量同步（幂等：cursor.newestKey 不变时返回空增量）
   * @param {ChannelCursor} cursor
   * @returns {Promise<ChannelPage>}
   */
  async sync(cursor) {
    this._assertOpen();
    const computed = this._compute();
    /** @type {ChannelMessage[]} */
    const delta = [];
    for (const m of computed.messages) {
      if (!cursor?.newestKey || compareOrderKey(orderKey(m), cursor.newestKey) > 0) delta.push(m);
    }
    const next = cloneCursor(cursor, this.channelId);
    if (computed.messages.length > 0) {
      next.newestKey = orderKey(computed.messages[computed.messages.length - 1]);
      if (!next.oldestKey) next.oldestKey = orderKey(computed.messages[0]);
    }
    return buildPage({
      channel: computed.channel,
      messages: delta,
      cursor: next,
      hasMore: false,
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * 向上分页（幂等：同一 oldestKey 重复调用返回空页）
   * @param {ChannelCursor} cursor
   * @param {number} [limit]
   * @returns {Promise<ChannelPage>}
   */
  async pageOlder(cursor, limit = LIMITS.pageSize) {
    this._assertOpen();
    const computed = this._compute();
    const next = cloneCursor(cursor, this.channelId);
    const older = pageOlderCore(computed.messages, next.oldestKey, limit);
    if (older.length > 0) next.oldestKey = orderKey(older[0]);
    const remaining = computed.messages.filter(
      (m) => !next.oldestKey || compareOrderKey(orderKey(m), next.oldestKey) < 0,
    );
    return buildPage({
      channel: computed.channel,
      messages: older,
      cursor: next,
      hasMore: remaining.length > 0,
      truncated: computed.diagnostics.truncated,
      now: this.now(),
    });
  }

  /**
   * 订阅权威变更（mock：appendEvents 触发）
   * @param {(kind: 'append'|'reset'|'status') => void} onChange
   * @returns {() => void}
   */
  subscribe(onChange) {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  /**
   * @returns {{canSend: boolean, reason?: string}}
   */
  capabilities() {
    if (this.capabilitiesOverride) return this.capabilitiesOverride;
    if (this.closed) return { canSend: false, reason: 'closed' };
    if (this.readonly) return { canSend: false, reason: 'readonly' };
    return { canSend: true };
  }

  close() {
    this.closed = true;
    this.listeners.clear();
  }

  // ── 测试辅助 ────────────────────────────────────────────────
  /** 追加事件并通知订阅者 */
  appendEvents(sessionId, events) {
    const s = this.sessions.find((x) => x.sessionId === sessionId);
    if (!s) return;
    s.events = [...s.events, ...(Array.isArray(events) ? events : [])];
    this._emit('append');
  }

  /** 替换事件（窗口 replace）并通知 */
  setEvents(sessionId, events) {
    const s = this.sessions.find((x) => x.sessionId === sessionId);
    if (!s) return;
    s.events = Array.isArray(events) ? events : [];
    this._emit('reset');
  }

  /** 替换名册（成员增删） */
  setMembers(members) {
    this.members = members;
    this._emit('reset');
  }

  /** @param {'append'|'reset'|'status'} kind */
  _emit(kind) {
    for (const fn of this.listeners) {
      try {
        fn(kind);
      } catch {
        /* mock 不吞真实异常，只隔离订阅者 */
      }
    }
  }

  _assertOpen() {
    if (this.closed) throw new Error('MockChannelSource: closed');
  }

  /** @returns {{channel: ChannelSnapshot, messages: ChannelMessage[], diagnostics: any}} */
  _compute() {
    const sessionSummaries =
      Array.isArray(this.sessionSummaries) && this.sessionSummaries.length > 0
        ? this.sessionSummaries
        : this.sessions.map((s) => ({
            id: s.sessionId,
            parentSessionId: s.header?.parentSession,
            ...(typeof s.header?.running === 'boolean'
              ? { running: s.header.running, status: s.header.running ? 'running' : 'inactive' }
              : {}),
          }));
    /** @type {import('../core/model.js').NormalizeContext} */
    const ctx = {
      leadSessionId: this.leadSessionId,
      members: this.members,
      sessionSummaries,
      noRoster: this.noRoster,
      historical: this.historical,
      localBatches: this.localBatches,
      toolFold: this.toolFold,
      maxMessages: this.maxMessages,
    };
    const result = normalizeChannel(this.sessions, ctx);
    const lead = result.members.find((m) => m.kind === 'lead') ?? {
      sessionId: this.leadSessionId,
      name: 'lead',
      displayName: 'Lead',
      kind: /** @type {'lead'} */ ('lead'),
      depth: 0,
      status: /** @type {'running'} */ ('running'),
      addressable: true,
    };
    const channel = deriveSnapshot(
      {
        lead,
        members: result.members,
        runningCount: result.members.filter((m) => m.status === 'running').length,
        degraded: result.degraded,
        truncated: result.truncated,
      },
      {
        channelId: this.channelId,
        readonly: this.readonly,
        readonlyReason: this.readonlyReason,
        now: this.now(),
      },
    );
    return { channel, messages: result.messages, diagnostics: result.diagnostics };
  }
}

Object.assign(__exports, { "MockChannelSource": MockChannelSource });
});
/* ── src/adapters/replay-host.js ─────────────────────────────────────────── */
__def("src/adapters/replay-host.js", function (__exports, __req) {
// @ts-check
/**
 * 适配器测试辅助 · 用 fixtures 复刻 `ctx.sessions` 的最小宿主（replay 模式）
 *
 * 形状对齐架构 §4.6 / API §B1：
 *   `ctx.sessions.retain(id, {source}) → {binding:{session, eventSource}, release()}`
 *   `binding.eventSource.getSnapshot() → {entries, revision, hasMore, change}`
 *   `binding.session.getSnapshot()` / `loadOlder()`
 *
 * 仅测试/集成回放使用；生产 client 走真实 `ctx.sessions`。
 */

/**
 * @param {{sessionId: string, header?: any, events?: any[], revision?: number}[]} sessions
 * @param {{withTransient?: boolean, hasMore?: boolean}} [opts]
 */
function createReplaySessionHost(sessions, opts = {}) {
  /** @type {Map<string, {header: any, events: any[], revision: number, refs: number, listeners: Set<Function>}>} */
  const store = new Map();
  for (const s of Array.isArray(sessions) ? sessions : []) {
    store.set(String(s.sessionId), {
      header: s.header ?? { id: s.sessionId },
      events: Array.isArray(s.events) ? s.events.map((e) => ({ ...e })) : [],
      revision: Number(s.revision ?? 1),
      refs: 0,
      listeners: new Set(),
    });
  }

  const makeWindow = (sid) => {
    const rec = store.get(sid);
    if (!rec) return { entries: [], revision: -1, hasMore: false, change: { kind: 'replace' } };
    const entries = rec.events.map((event) => {
      if (event && (event.type === 'event' || event.type === 'transient') && event.event) return event;
      return { type: 'event', event };
    });
    return { entries, revision: rec.revision, hasMore: opts.hasMore === true, change: { kind: 'replace' } };
  };

  const host = {
    /**
     * @param {string} sessionId
     * @param {{source?: string}} [retainOpts]
     */
    retain(sessionId, retainOpts = {}) {
      const sid = String(sessionId);
      if (!store.has(sid)) {
        store.set(sid, { header: { id: sid }, events: [], revision: 0, refs: 0, listeners: new Set() });
      }
      const rec = store.get(sid);
      rec.refs += 1;
      return {
        sessionId: sid,
        binding: {
          session: {
            getSnapshot: () => ({ ...rec.header, id: sid }),
            loadOlder: async () => false,
          },
          eventSource: {
            getSnapshot: () => makeWindow(sid),
            subscribe: (fn) => {
              rec.listeners.add(fn);
              return () => rec.listeners.delete(fn);
            },
          },
        },
        release: () => {
          rec.refs = Math.max(0, rec.refs - 1);
        },
        _source: retainOpts.source,
      };
    },
    /** @param {string} sessionId */
    binding(sessionId) {
      return host.retain(sessionId).binding;
    },
    /**
     * 列表（`sessions.list.byId` 形状）
     * @returns {any[]}
     */
    list() {
      return [...store.entries()].map(([id, rec]) => ({
        id,
        parentSessionId: rec.header?.parentSession,
        running: false,
        createdAt: rec.header?.createdAt,
      }));
    },
    /** 注入新事件并通知订阅者（模拟实时 append） */
    appendEvents(sessionId, events) {
      const rec = store.get(String(sessionId));
      if (!rec) return;
      rec.events.push(...events);
      rec.revision += 1;
      for (const fn of rec.listeners) fn({ kind: 'append' });
    },
    /** 覆盖事件（模拟窗口 replace） */
    setEvents(sessionId, events) {
      const rec = store.get(String(sessionId));
      if (!rec) return;
      rec.events = events.map((e) => ({ ...e }));
      rec.revision += 1;
      for (const fn of rec.listeners) fn({ kind: 'replace' });
    },
    /** 读取内部事件（测试断言用） */
    eventsOf(sessionId) {
      return [...(store.get(String(sessionId))?.events ?? [])];
    },
    /** 引用计数（测试 close/release 用） */
    refCount(sessionId) {
      return store.get(String(sessionId))?.refs ?? 0;
    },
    /** 当前 revision（测试游标用） */
    revisionOf(sessionId) {
      return store.get(String(sessionId))?.revision ?? -1;
    },
    _store: store,
  };
  return host;
}

Object.assign(__exports, { "createReplaySessionHost": createReplaySessionHost });
});
/* ── src/core/constants.js ─────────────────────────────────────────── */
__def("src/core/constants.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 常量与上限（单点收口）
 *
 * 契约来源：docs/architecture/group-chat-architecture.md
 *  - §4.3.1 排序 / §4.5 游标分页 / §4.8.2 上限 / §5.2 协议 / §6.6 折叠
 *
 * 约束：本文件不引用 DOM / Cordis / Node API；纯数据。
 * 命名约定：所有上限集中在 LIMITS，便于压测调参（架构 §3.1 设计原则 5）。
 */

/** 协议版本（§5.2 PROTOCOL_V1.version） */
const PROTOCOL_VERSION = 1;

/** 全局上限与阈值（架构 §4.8.2 上限常量 + §5.4 限流 + §6.6 折叠） */
const LIMITS = Object.freeze({
  /** 会话数上限（lead 全部后代） */
  maxSessions: 32,
  /** 成员目录上限 */
  maxMembers: 64,
  /** 后代深度上限（lead=0） */
  maxDepth: 3,
  /** 作用域回溯：parentSession 链最大跳数（F27/§4.8.2） */
  maxParentHops: 4,
  /** 每会话预取事件上限（防单个话多成员挤出他人，§4.5） */
  perSessionPrefetch: 400,
  /** 首屏消息条数 */
  firstScreen: 200,
  /** 向上分页条数（§4.5） */
  pageSize: 50,
  /** 内存消息上限（§4.5：超出从中间裁剪，保留首 200 + 最近 1800） */
  maxMessagesInMemory: 2000,
  /** 内存裁剪时保留的头部条数 */
  memoryKeepHead: 200,
  /** 单条消息渲染文本上限（64KB，§6.6） */
  textRender: 64 * 1024,
  /** 单条消息存储文本上限（256KB，§4.8.2 textStore） */
  textStore: 256 * 1024,
  /** 单批事件上限 */
  eventBatch: 500,
  /** 合并节流（ms，仅 UI 侧用，内核不 sleep） */
  mergeDebounceMs: 120,
  /** 发送目标数上限（§5.4） */
  maxTargetsPerBatch: 8,
  /** 每个目标最小发送间隔（ms，§5.4） */
  minIntervalMs: 200,
  /** 手动重试次数上限（§5.4） */
  maxRetry: 2,
  /** 单目标 prompt 超时（ms，§5.4） */
  promptTimeoutMs: 30000,
  /** 只读判定：全员 inactive 持续时长（ms，§6.4.4） */
  readonlyIdleMs: 90000,
  /** 弱键配对时间窗（ms，§4.3.3 ③） */
  weakKeyTimeWindowMs: 5000,
  /** 同发刷新后丢 batchId 时的前缀归并时间窗（ms，§4.4；M6 收紧到 5s） */
  fanoutTimeWindowMs: 5 * 60 * 1000,
  /** 无 batchId 时仅允许「同批副本」归并的时间窗（M6：两次同文群发不应误合并） */
  fanoutSignatureWindowMs: 5000,
  /** localBatches TTL（§5.3.1） */
  localBatchTtlMs: 5 * 60 * 1000,
  /** 无 rpcId 时 localBatches 弱匹配时间窗（H1：±2min） */
  localBatchFallbackWindowMs: 2 * 60 * 1000,
  /** 折叠软换行估算：每行字符数（M1；CJK 近似，窄屏可 UI 传更小值） */
  foldCharsPerLine: 40,
  /** 折叠：行数阈值（§6.6） */
  foldMaxLines: 8,
  /** 折叠：字符阈值（§6.6） */
  foldMaxChars: 400,
  /** 初始任务摘要：最大字符数（§4.2.1） */
  promptExcerptMaxChars: 160,
  /** 初始任务摘要：最大行数（§4.2.1） */
  promptExcerptMaxLines: 2,
  /** 时间近邻配对窗口（ms，任务卡二级回退，TCF §3.3） */
  taskNeighborWindowMs: 1000,
});

/**
 * T2/T3 消费的 `limits` 别名（前端已冻结该导出名；同时保留 LIMITS 供内核使用）。
 * 额外给出折叠阈值的短名 `foldLines` / `foldChars`（架构 §6.6）。
 */
const limits = Object.freeze({
  ...LIMITS,
  foldLines: LIMITS.foldMaxLines,
  foldChars: LIMITS.foldMaxChars,
});

/**
 * 会话排序权重（§4.3.1 sessionRank）
 * @type {Readonly<Record<'lead'|'teammate'|'subagent'|'system', number>>}
 */
const SESSION_RANK = Object.freeze({
  lead: 0,
  teammate: 1,
  subagent: 2,
  system: 3,
});

/**
 * 同毫秒 kind 序（§4.3.1：member_card < task_card < 普通消息）
 * 数值越小越靠前。
 * @type {Readonly<Record<string, number>>}
 */
const KIND_RANK = Object.freeze({
  member_card: 0,
  task_card: 1,
});

/** 普通消息的 kindRank 默认值 */
const KIND_RANK_DEFAULT = 2;

/** 消息 kind 全集（§4.1 MessageKind） */
const MESSAGE_KINDS = Object.freeze([
  'user',
  'agent_to_agent',
  'agent_output',
  'system',
  'delivery',
  'member_card',
  'task_card',
]);

/** 交付状态全集（§4.1 DeliveryState 四态） */
const DELIVERY_STATES = Object.freeze(['sending', 'sent', 'partial', 'failed']);

/** 成员相位 → 成员状态（team/member.phase） */
const MEMBER_PHASE_TO_STATUS = Object.freeze({
  provisioning: 'provisioning',
  active: 'active',
  failed: 'failed',
});

/** 任务动作全集（TCF §2.2，create + 7 个 update action + release） */
const TASK_ACTIONS = Object.freeze([
  'create',
  'claim',
  'complete',
  'reopen',
  'reassign',
  'edit',
  'set_dependencies',
  'delete',
  'release',
]);

/** 任务状态全集（严格四枚举，无 failed，TCF §1.1） */
const TASK_STATUSES = Object.freeze(['pending', 'in_progress', 'completed', 'deleted']);

/**
 * 任务动作 canonical 中文文案（core 兜底；T2 必须优先用 i18n key，见 index.js 约定）
 * i18n key 形如 `task.action.create`。
 */
const TASK_ACTION_LABELS = Object.freeze({
  create: '创建任务',
  claim: '认领任务',
  complete: '完成任务',
  reopen: '重新打开',
  reassign: '改派任务',
  edit: '编辑任务',
  set_dependencies: '依赖变更',
  delete: '取消任务',
  release: '放回',
});

/**
 * 任务状态 canonical 中文文案（core 兜底；T2 优先 i18n `task.state.*`）
 */
const TASK_STATUS_LABELS = Object.freeze({
  pending: '待认领',
  in_progress: '进行中',
  completed: '已完成',
  deleted: '已取消',
});

/** 认可动作的上位标签（canonical，T2 用 i18n key） */
const TASK_ACTION_LABEL_KEYS = Object.freeze({
  create: 'task.action.create',
  claim: 'task.action.claim',
  complete: 'task.action.complete',
  reopen: 'task.action.reopen',
  reassign: 'task.action.reassign',
  edit: 'task.action.edit',
  set_dependencies: 'task.action.set_dependencies',
  delete: 'task.action.delete',
  release: 'task.action.release',
});

/** 认可状态的上位标签 key */
const TASK_STATUS_LABEL_KEYS = Object.freeze({
  pending: 'task.state.pending',
  in_progress: 'task.state.in_progress',
  completed: 'task.state.completed',
  deleted: 'task.state.deleted',
});

/** 无名册时的成员显示名回退（禁止把 sessionId 短截断当名字；T2 可用 i18n 覆盖） */
const MEMBER_FALLBACK_NAME = '成员';

/** 欢迎提示文案模板（canonical zh；T2 用 i18n `member.welcome`） */
const WELCOME_TEXT_TEMPLATE = '欢迎 @{name} 加入群聊';

/** 成员卡片文案（canonical zh 兜底；T2 用 i18n `member.*`） */
const MEMBER_TEXT = Object.freeze({
  noDescription: '暂无角色描述',
  noTask: '（无初始任务）',
  leadBadge: '主 Agent',
  teammateBadge: 'Teammate',
});

/** 工具名 → subagent 上下文策略（MCF §5） */
const SUBAGENT_TOOL_CONTEXT = Object.freeze({
  subagent: 'fresh',
  subagent_fork: 'fork',
});

/**
 * 已知「系统上下文注入」型 source.kind（D-01 修复）：
 * 这些 `user/message` 是宿主注入的 prompt 片段（工作区指令 / 运行时上下文 / skill 目录 / 时间 / 后台任务），
 * **不是群聊发言**，归一化时必须丢弃（架构 §4.9：不展示系统提示词）。
 * 真实日志实测（htdot + team-group 两工作区 41 个会话）：agent-instructions / runtime-context / skill-catalog /
 * time-context / tool-jobs / skill-invocation / user-approval；
 * system-prompt 为 MessageSourceMap 基础类型；goal/schedule 为同类注入（保留扩展位）。
 */
const CONTEXT_SOURCE_KINDS = Object.freeze([
  'agent-instructions',
  'runtime-context',
  'skill-catalog',
  'time-context',
  'tool-jobs',
  'skill-invocation',
  'user-approval',
  'subagent-settled',
  'system-prompt',
  'goal',
  'schedule',
]);

/** @param {string} kind @returns {boolean} */
function isContextSourceKind(kind) {
  return CONTEXT_SOURCE_KINDS.includes(String(kind ?? ''));
}

/** 来源 kind 常量（会话事件 MessageSourceMap，含 experimental 扩展） */
const SOURCE_KIND = Object.freeze({
  user: 'user',
  agentMessage: 'agent-message',
  teamMessage: 'team-message',
  subagentSettled: 'subagent-settled',
});

/** 需要统计/识别的工具名 */
const TOOL_NAMES = Object.freeze({
  spawnTeammate: 'spawn_teammate',
  subagent: 'subagent',
  subagentFork: 'subagent_fork',
  taskCreate: 'team_task_create',
  taskUpdate: 'team_task_update',
  sendMessage: 'send_message',
});

/** 会话事件类型常量（KNOWN_SESSION_EVENT_TYPES 子集） */
const EVENT_TYPES = Object.freeze({
  userMessage: 'user/message',
  assistantMessage: 'assistant/message',
  assistantAttempt: 'assistant/attempt',
  systemMessage: 'system/message',
  turnStart: 'turn/start',
  turnEnd: 'turn/end',
  stepStart: 'step/start',
  stepEnd: 'step/end',
  inboxSpliced: 'agent/inbox/spliced',
  toolCall: 'tool/call',
  toolResult: 'tool/result',
  teamMember: 'team/member',
  teamTask: 'team/task',
  teamMessageQueued: 'team/message/queued',
  teamMessageDelivered: 'team/message/delivered',
  subagentCatalog: 'subagent/catalog',
  subagentDescriptor: 'subagent/descriptor',
  subagentSettled: 'subagent/settled',
  endSeed: 'session/end-seed',
  deliverablesPresented: 'deliverables/presented',
});

/** 独立 M6 摘要消息的 id 前缀（lead 追加约束：有工具无输出时出摘要） */
const TOOL_SUMMARY_ID_PREFIX = 'to:';

/** 调试开关 key（§7 日志与诊断） */
const DEBUG_FLAG_KEY = 'group-chat:debug';

Object.assign(__exports, { "PROTOCOL_VERSION": PROTOCOL_VERSION, "LIMITS": LIMITS, "limits": limits, "SESSION_RANK": SESSION_RANK, "KIND_RANK": KIND_RANK, "KIND_RANK_DEFAULT": KIND_RANK_DEFAULT, "MESSAGE_KINDS": MESSAGE_KINDS, "DELIVERY_STATES": DELIVERY_STATES, "MEMBER_PHASE_TO_STATUS": MEMBER_PHASE_TO_STATUS, "TASK_ACTIONS": TASK_ACTIONS, "TASK_STATUSES": TASK_STATUSES, "TASK_ACTION_LABELS": TASK_ACTION_LABELS, "TASK_STATUS_LABELS": TASK_STATUS_LABELS, "TASK_ACTION_LABEL_KEYS": TASK_ACTION_LABEL_KEYS, "TASK_STATUS_LABEL_KEYS": TASK_STATUS_LABEL_KEYS, "MEMBER_FALLBACK_NAME": MEMBER_FALLBACK_NAME, "WELCOME_TEXT_TEMPLATE": WELCOME_TEXT_TEMPLATE, "MEMBER_TEXT": MEMBER_TEXT, "SUBAGENT_TOOL_CONTEXT": SUBAGENT_TOOL_CONTEXT, "CONTEXT_SOURCE_KINDS": CONTEXT_SOURCE_KINDS, "isContextSourceKind": isContextSourceKind, "SOURCE_KIND": SOURCE_KIND, "TOOL_NAMES": TOOL_NAMES, "EVENT_TYPES": EVENT_TYPES, "TOOL_SUMMARY_ID_PREFIX": TOOL_SUMMARY_ID_PREFIX, "DEBUG_FLAG_KEY": DEBUG_FLAG_KEY });
});
/* ── src/core/dedupe.js ─────────────────────────────────────────── */
__def("src/core/dedupe.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 三层去重（§4.3.3）
 *
 * ① 同会话双写：`agent/inbox/spliced.inserted[i].id` 与 `user/message.data.id` 同 id
 *    → 只保留 user/message，把 spliced 的 target/投递时间并入 meta。
 * ② fork/seed：继承前缀事件在 normalize 入口按 `session/end-seed` cutoff 丢弃；本层再做 id 全局去重兜底。
 * ③ 通知副本：`subagent-settled` 的 closing message == 子会话 agent_output → 保留子会话那条。
 *
 * 弱键（当前构建无 messageId，EVT §7.2 ③）：`(senderSessionId, targetSessionId, hash(text), time±5s)`，
 * 仅用于「发送记录 ↔ 接收副本」配对，**不用于合并两个真实发言**。
 * 注：无 crypto 依赖，用 FNV-1a 双种子代替 sha256（同一会话对 + ±5s 窗口下碰撞可忽略）。
 */

const { LIMITS } = __req("src/core/constants.js");

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 */

/**
 * 首选消息（同 id 冲突时）
 * @param {ChannelMessage} a
 * @param {ChannelMessage} b
 * @returns {ChannelMessage}
 */
function preferMessage(a, b) {
  const aSpliced = a.meta?.fromSpliced === true;
  const bSpliced = b.meta?.fromSpliced === true;
  if (aSpliced !== bSpliced) return aSpliced ? b : a; // 优先 user/message（非 spliced）

  if (a.kind === 'agent_output' && b.kind === 'agent_output') {
    return Number(b.seq ?? 0) > Number(a.seq ?? 0) ? b : a;
  }
  if (a.kind === 'agent_to_agent' && b.kind === 'agent_to_agent') {
    const aHas = typeof a.meta?.messageId === 'string';
    const bHas = typeof b.meta?.messageId === 'string';
    if (aHas !== bHas) return aHas ? a : b;
  }
  return a;
}

/**
 * 把 loser 的 meta 并入 winner（winner 值优先）；不动 deliveries
 * @param {ChannelMessage} winner
 * @param {ChannelMessage} loser
 */
function mergeMeta(winner, loser) {
  if (!loser.meta) return;
  const { fromSpliced, ...rest } = loser.meta;
  winner.meta = { ...rest, ...(winner.meta ?? {}) };
}

/**
 * 去重主入口
 * @param {ChannelMessage[]} messages
 * @param {{leadSessionId?: string, weakWindowMs?: number}} [opts]
 * @returns {{messages: ChannelMessage[], removed: number, settlementsDropped: number, removedIds: string[]}}
 */
function dedupeMessages(messages, opts = {}) {
  const weakWindowMs = opts.weakWindowMs ?? LIMITS.weakKeyTimeWindowMs;
  /** @type {Map<string, ChannelMessage>} */
  const byId = new Map();
  let removed = 0;
  for (const m of Array.isArray(messages) ? messages : []) {
    if (!m || !m.id) continue;
    const prev = byId.get(m.id);
    if (!prev) {
      byId.set(m.id, m);
      continue;
    }
    const winner = preferMessage(prev, m);
    const loser = winner === prev ? m : prev;
    mergeMeta(winner, loser);
    byId.set(m.id, winner);
    removed += 1;
  }

  /** @type {ChannelMessage[]} */
  const list = [...byId.values()];
  /** @type {string[]} */
  const removedIds = [];

  // ③ 通知副本：settlement 与子会话 agent_output 同文 → 去掉 settlement
  const outputs = list.filter((m) => m.kind === 'agent_output');
  let settlementsDropped = 0;
  for (const m of list) {
    if (!m || m.meta?.copy !== 'settlement') continue;
    const closing = normalizeText(String(m.meta?.closingText ?? ''));
    if (!closing) continue;
    const senderSessionId = String(m.meta?.senderSessionId ?? m.sender?.sessionId ?? '');
    const hit = outputs.find(
      (o) =>
        String(o.sender?.sessionId ?? '') === senderSessionId &&
        Math.abs(Number(o.time ?? 0) - Number(m.time ?? 0)) <= weakWindowMs &&
        normalizeText(o.text) === closing,
    );
    if (hit) {
      m.meta = { ...(m.meta ?? {}), droppedReason: 'settlement-copy' };
      removedIds.push(m.id);
      settlementsDropped += 1;
    }
  }
  /** @type {ChannelMessage[]} */
  const out = list.filter((m) => !removedIds.includes(m.id));

  // ② fork/seed id 去重兜底：id 相同已在上面处理；此处统计继承会话重复（不同会话同消息）
  // 说明：fork 复制事件与原事件 id 相同（同一 user/message data.id），故 byId 已收敛。
  return { messages: out, removed, settlementsDropped, removedIds };
}

/**
 * 归一化文本（弱键/去重比较用）
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * FNV-1a 32bit（双种子拼接成 16 hex）
 * @param {string} text
 * @returns {string}
 */
function hashText(text) {
  const s = String(text ?? '');
  const h1 = fnv1a(s, 0x811c9dc5);
  const h2 = fnv1a(s, 0x01000193);
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/**
 * @param {string} text
 * @param {number} seed
 * @returns {number}
 */
function fnv1a(text, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * 弱键（§4.3.3 ③）：发送记录 ↔ 接收副本配对；不用于合并真实发言。
 * @param {{sessionId?: string, sender?: {sessionId?: string}, text?: string, time?: number}} message
 * @param {string} [targetSessionId]
 * @param {number} [windowMs]
 * @returns {string}
 */
function weakKeyOf(message, targetSessionId = '', windowMs = LIMITS.weakKeyTimeWindowMs) {
  const senderSessionId = String(message?.sender?.sessionId ?? message?.sessionId ?? '');
  const time = Number(message?.time ?? 0);
  const bucket = Math.floor(time / windowMs);
  return `${senderSessionId}|${targetSessionId}|${hashText(normalizeText(message?.text ?? ''))}|${bucket}`;
}

/**
 * 弱键配对（返回成对的 index；只配对「有明确 copy 标识」的副本，避免误合并真实发言）
 * @param {ChannelMessage[]} messages
 * @param {{windowMs?: number}} [opts]
 * @returns {Array<{keep: number, drop: number}>}
 */
function pairNotificationCopies(messages, opts = {}) {
  const windowMs = opts.windowMs ?? LIMITS.weakKeyTimeWindowMs;
  const list = Array.isArray(messages) ? messages : [];
  /** @type {Array<{keep: number, drop: number}>} */
  const pairs = [];
  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    if (m.meta?.copy !== 'settlement') continue;
    for (let j = 0; j < list.length; j += 1) {
      if (i === j) continue;
      const o = list[j];
      if (o.kind !== 'agent_output') continue;
      if (o.sender?.sessionId !== m.meta?.senderSessionId) continue;
      if (Math.abs(o.time - m.time) > windowMs) continue;
      if (normalizeText(o.text) !== normalizeText(String(m.meta?.closingText ?? ''))) continue;
      pairs.push({ keep: j, drop: i });
      break;
    }
  }
  return pairs;
}

Object.assign(__exports, { "preferMessage": preferMessage, "dedupeMessages": dedupeMessages, "normalizeText": normalizeText, "hashText": hashText, "weakKeyOf": weakKeyOf, "pairNotificationCopies": pairNotificationCopies });
});
/* ── src/core/fanout.js ─────────────────────────────────────────── */
__def("src/core/fanout.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 同发（fan-out）合并与四态聚合（§4.4 / V1.1-2）
 *
 * 问题：一次同发 = N 次独立 prompt → N 个目标各产生一条 user/message（不同 id、不同 rpcId）。
 * 方案：按 `clientBatchId`（本地发送记录反查）或「前缀签名 + time±5min」归并；
 *       **只有 lead 会话那一份渲染为 M1 气泡**，其余副本进入 `deliveries`。
 * 若 lead 副本未到而其它副本先到：保留一份临时气泡（最早到达），lead 副本到达后按 batch/前缀合并。
 */

const { LIMITS } = __req("src/core/constants.js");
const { normalizeText } = __req("src/core/dedupe.js");

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./model.js').DeliveryState} DeliveryState
 */

/**
 * 四态聚合（V1.1-2）：全 sent → sent；部分失败 → partial；全失败 → failed；仍有在途 → sending。
 * @param {Record<string, DeliveryState>|undefined} deliveries
 * @returns {DeliveryState|undefined}
 */
function aggregateDeliveryState(deliveries) {
  if (!deliveries) return undefined;
  const states = Object.values(deliveries);
  if (states.length === 0) return undefined;
  if (states.some((s) => s === 'sending')) return 'sending';
  const sent = states.filter((s) => s === 'sent').length;
  if (sent === states.length) return 'sent';
  if (sent === 0) return 'failed';
  return 'partial';
}

/**
 * 归并同发副本
 * @param {ChannelMessage[]} messages
 * @param {{leadSessionId?: string, weakWindowMs?: number}} [opts]
 * @returns {{messages: ChannelMessage[], merged: number, removedIds: string[]}}
 */
function mergeFanout(messages, opts = {}) {
  const leadSessionId = String(opts.leadSessionId ?? '');
  // M6：无 clientBatchId 的「前缀签名」只允许同一批次的近似同时副本（默认 5s），避免两次同文群发被合并
  const signatureWindowMs = opts.signatureWindowMs ?? LIMITS.fanoutSignatureWindowMs;
  const list = Array.isArray(messages) ? messages : [];

  /** @type {Array<{kind: 'echo'|'copy', msg: ChannelMessage, index: number, batchId?: string}>} */
  const candidates = [];
  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    if (!m || m.kind !== 'user') continue;
    const isEcho = m.meta?.localEcho === true || String(m.id).startsWith('local:');
    // F30/§5.3.1：权威消息若经 localBatches 拿到 clientBatchId，也要与 echo 归并（替换本地气泡）
    const hasBatchId = typeof m.clientBatchId === 'string' && m.clientBatchId !== '';
    const isCopy = m.meta?.fanout === true || (!isEcho && hasBatchId);
    if (!isEcho && !isCopy) continue;
    const batchId = typeof m.clientBatchId === 'string' ? m.clientBatchId : typeof m.meta?.clientBatchId === 'string' ? m.meta.clientBatchId : undefined;
    candidates.push({ kind: isEcho ? 'echo' : 'copy', msg: m, index: i, batchId });
  }

  /** @type {Map<string, {echoes: ChannelMessage[], copies: ChannelMessage[]}>} */
  const groups = new Map();
  for (const c of candidates) {
    const batchId =
      c.batchId ??
      `sig:${(c.msg.targets ?? []).join(',')}|${normalizeText(c.msg.text)}|${Math.floor(Number(c.msg.time ?? 0) / signatureWindowMs)}`;
    if (!groups.has(batchId)) groups.set(batchId, { echoes: [], copies: [] });
    const g = groups.get(batchId);
    if (c.kind === 'echo') g.echoes.push(c.msg);
    else g.copies.push(c.msg);
  }

  /** @type {Set<string>} */
  const removedIds = new Set();
  let merged = 0;
  /** @type {Map<string, ChannelMessage>} */
  const replacements = new Map();

  for (const [batchId, g] of groups) {
    if (g.copies.length === 0 && g.echoes.length === 0) continue;
    if (batchId.startsWith('sig:')) {
      // M6：签名组必须跨 ≥2 个会话（同一批 fan-out 副本），否则不合并；同时不允许同一会话重复副本。
      // 单副本仍按「临时气泡」规范化（lead 副本未到时不闪断），只是不做跨副本合并。
      const counts = new Map();
      for (const m of g.copies) counts.set(m.sessionId, (counts.get(m.sessionId) ?? 0) + 1);
      const onePerSession = [...counts.values()].every((n) => n === 1);
      const leadCopies = leadSessionId ? g.copies.filter((m) => m.sessionId === leadSessionId).length : 1;
      // R-M6：同一批副本必须「每会话 ≤1 份 + 恰 1 份 lead 副本」才归并；否则保留临时气泡，等 lead 到达后再合并
      if (counts.size < 2 || !onePerSession || leadCopies !== 1) {
        for (const c of g.copies) normalizeSingleCopy(c, leadSessionId, batchId);
        continue;
      }
    }
    if (g.copies.length <= 1 && g.echoes.length === 0) {
      const only = g.copies[0];
      if (only) normalizeSingleCopy(only, leadSessionId, batchId);
      continue;
    }
    const echo = g.echoes[0];
    /** @type {ChannelMessage|undefined} */
    const leadCopy = g.copies.find((m) => m.sessionId === leadSessionId);
    const primary = leadCopy ?? g.copies[0] ?? echo;
    if (!primary) continue;

    // deliveries：先继承本地 echo 的逐目标状态，再把已到达副本标 sent
    /** @type {Record<string, DeliveryState>} */
    const deliveries = { ...(echo?.deliveries ?? {}) };
    for (const copy of g.copies) {
      // 每条副本落在「收到它的那个会话」→ deliveries 以副本所在会话为 key
      const targetId = copy.sessionId;
      if (targetId) deliveries[targetId] = 'sent';
    }
    // 前缀声明的目标顺序（lead 首位）；targets 取并集保序
    /** @type {string[]} */
    const targets = [];
    for (const m of [primary, ...g.copies, ...g.echoes]) {
      for (const t of m.targets ?? []) if (t && !targets.includes(t)) targets.push(t);
    }
    /** @type {string[]} */
    const targetSessionIds = [];
    for (const m of [primary, ...g.copies, ...g.echoes]) {
      for (const id of m.targetSessionIds ?? []) if (id && !targetSessionIds.includes(id)) targetSessionIds.push(id);
    }

    if (!batchId.startsWith('sig:')) primary.clientBatchId = batchId;
    primary.deliveries = deliveries;
    primary.delivery = aggregateDeliveryState(deliveries);
    if (targets.length > 0) primary.targets = targets;
    if (targetSessionIds.length > 0) primary.targetSessionIds = targetSessionIds;
    primary.meta = {
      ...(echo?.meta ?? {}),
      ...(primary.meta ?? {}),
      fanout: true,
      localEcho: false,
      clientBatchId: batchId,
    };
    replacements.set(primary.id, primary);
    for (const m of [...g.copies, ...g.echoes]) {
      if (m === primary) continue;
      removedIds.add(m.id);
      merged += 1;
    }
    if (echo && echo !== primary) removedIds.add(echo.id);
  }

  /** @type {ChannelMessage[]} */
  const out = [];
  for (const m of list) {
    if (removedIds.has(m.id)) continue;
    out.push(replacements.get(m.id) ?? m);
  }
  return { messages: out, merged, removedIds: [...removedIds] };
}

/**
 * 单副本（lead 副本未到 / 或只有自身）：补齐 deliveries 与状态，不隐藏自身（临时气泡）
 * @param {ChannelMessage} m
 * @param {string} leadSessionId
 * @param {string} batchId
 */
function normalizeSingleCopy(m, leadSessionId, batchId) {
  if (m.meta?.fanout !== true) return;
  const targetId = m.sessionId;
  /** @type {Record<string, DeliveryState>} */
  const deliveries = { ...(m.deliveries ?? {}) };
  if (targetId) deliveries[targetId] = 'sent';
  m.deliveries = deliveries;
  m.delivery = aggregateDeliveryState(deliveries);
  m.clientBatchId = m.clientBatchId ?? (batchId.startsWith('sig:') ? undefined : batchId);
  m.meta = { ...(m.meta ?? {}), localEcho: false };
  // 单副本且不是 lead 会话：保留为临时气泡（lead 副本到达后由下一轮 merge 合并）
  if (leadSessionId && m.sessionId !== leadSessionId) {
    m.meta = { ...(m.meta ?? {}), temporary: true };
  }
}

Object.assign(__exports, { "aggregateDeliveryState": aggregateDeliveryState, "mergeFanout": mergeFanout });
});
/* ── src/core/filter.js ─────────────────────────────────────────── */
__def("src/core/filter.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 成员筛选语义（D-B v0.6.2 冻结 / §6.4.4）
 *
 * 命中规则（单选，纯视图层，不改 messages）：
 *   sender.name === selected
 *   || targets.includes(selected)
 *   || selected 是 teammate 且消息 sender 是其 subagent（子体归入父成员）
 * 选 subagent 时只显示其自身消息（不反向包含父成员）。
 * **不做正文文本搜索**、不做多选/时间/类型组合。
 *
 * 冻结导出名：`matchesFilter(message, selectedName, members)`（T2 消费）。
 */

const { memberByName } = __req("src/core/roster.js");

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./model.js').ChannelMember} ChannelMember
 */

/**
 * 单条消息是否命中筛选
 * @param {ChannelMessage} message
 * @param {string|undefined|null} selectedName
 * @param {ChannelMember[]} members
 * @returns {boolean}
 */
function matchesFilter(message, selectedName, members) {
  const selected = String(selectedName ?? '').replace(/^@/, '');
  if (!selected) return true;
  if (!message) return false;
  const senderName = String(message.sender?.name ?? '');
  if (senderName === selected) return true;
  if (selected === 'lead' && (message.sender?.kind === 'lead' || senderName === 'lead')) return true;
  if (Array.isArray(message.targets) && message.targets.some((t) => String(t).replace(/^@/, '') === selected)) return true;

  // 父成员筛选包含其 subagent 消息（子体归入父）
  const selectedMember = memberByName(Array.isArray(members) ? members : [], selected);
  if (!selectedMember || selectedMember.kind !== 'teammate') return false;
  const senderMember = (Array.isArray(members) ? members : []).find(
    (m) => m.sessionId === message.sender?.sessionId || m.name === senderName,
  );
  return Boolean(senderMember && senderMember.kind === 'subagent' && senderMember.parentSessionId === selectedMember.sessionId);
}

/**
 * 筛选消息（只改可见投影，不改未读计数与实时追加）
 * @param {ChannelMessage[]} messages
 * @param {string|undefined|null} selectedName
 * @param {ChannelMember[]} members
 * @returns {ChannelMessage[]}
 */
function filterMessages(messages, selectedName, members) {
  const list = Array.isArray(messages) ? messages : [];
  if (!selectedName) return list.slice();
  return list.filter((m) => matchesFilter(m, selectedName, members));
}

/**
 * 筛选提示条数据（「正在只看 {name}（{n} 条）」）
 * @param {string} selectedName
 * @param {ChannelMessage[]} visible
 * @returns {{name: string, count: number}}
 */
function filterBanner(selectedName, visible) {
  return { name: String(selectedName).replace(/^@/, ''), count: Array.isArray(visible) ? visible.length : 0 };
}

Object.assign(__exports, { "matchesFilter": matchesFilter, "filterMessages": filterMessages, "filterBanner": filterBanner });
});
/* ── src/core/fold.js ─────────────────────────────────────────── */
__def("src/core/fold.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 50 行折叠测量（B1 / F29 / 架构 §6.17）
 *
 * 零依赖、无 DOM：按 **渲染后行数** 近似（段落换行 / 列表项 / 代码块内容行），
 * 供 UI 决定是否挂「展开全部（共 N 行）」。
 * 真实高度由 UI 用 useLayoutEffect 测量；本模块给出与 CSS 行高一致的近似口径：
 *   lineCount = Math.ceil(contentHeight / 22)（含代码块行，近似）。
 *
 * 不折叠（system 提示/欢迎/同发说明/卡片）由**调用方**决定，不在此处判断。
 */

const { LIMITS } = __req("src/core/constants.js");
const { parseMarkdown } = __req("src/core/markdown.js");

/** 默认折叠阈值（渲染行数） */
const FOLD_MAX_LINES = 50;
/** 正文行高（px），与架构 §6.17 的 50×22=1100 一致 */
const FOLD_LINE_HEIGHT = 22;
/**
 * 软换行估算：每行字符数（M1）。内核无 DOM，用字符数近似宽度：
 *  - CJK 与拉丁统一按 1 字符计，默认 40 字符/行；
 *  - UI 已知实际宽度/字号时可传更精确的 `charsPerLine`。
 */
const FOLD_CHARS_PER_LINE = LIMITS.foldCharsPerLine;

/**
 * 行内节点字符长度（strong/em/link 递归取 children；code/text 取 value）
 * @param {any} node
 * @returns {number}
 */
function inlineLength(node) {
  if (!node) return 0;
  if (node.type === 'text' || node.type === 'code') return String(node.value ?? '').length;
  if (node.type === 'strong' || node.type === 'em' || node.type === 'link') {
    return (Array.isArray(node.children) ? node.children : []).reduce((sum, child) => sum + inlineLength(child), 0);
  }
  return 0;
}

/**
 * AST → 渲染行数（近似，M1：长段落按软换行计入）
 * @param {{type: string, [k: string]: any}|null|undefined} ast
 * @param {{charsPerLine?: number}} [options]
 * @returns {number}
 */
function renderedLineCount(ast, options = {}) {
  if (!ast || typeof ast !== 'object') return 0;
  const charsPerLine =
    Number.isFinite(options.charsPerLine) && options.charsPerLine > 0
      ? Math.max(1, Math.floor(options.charsPerLine))
      : FOLD_CHARS_PER_LINE;
  if (ast.type === 'document') {
    return (Array.isArray(ast.children) ? ast.children : []).reduce(
      (sum, child) => sum + renderedLineCount(child, { charsPerLine }),
      0,
    );
  }
  if (ast.type === 'paragraph') {
    // 先按显式 break 分视觉行，再对每行做软换行估算
    /** @type {number[]} */
    const lengths = [0];
    for (const node of Array.isArray(ast.children) ? ast.children : []) {
      if (node && node.type === 'break') lengths.push(0);
      else lengths[lengths.length - 1] += inlineLength(node);
    }
    return lengths.reduce((sum, len) => sum + Math.max(1, Math.ceil(len / charsPerLine)), 0);
  }
  if (ast.type === 'code_block') {
    const value = String(ast.value ?? '');
    return value === '' ? 1 : value.split('\n').length;
  }
  if (ast.type === 'table') {
    // v1.7.2 §6.12：表格按 1（表头）+ 1（分隔行）+ 数据行 计入 50 行阈值
    return 2 + (Array.isArray(ast.rows) ? ast.rows.length : 0);
  }
  if (ast.type === 'list') {
    const items = Array.isArray(ast.items) ? ast.items : [];
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + Math.max(1, renderedLineCount(item, { charsPerLine })), 0);
  }
  if (ast.type === 'list_item') {
    const children = Array.isArray(ast.children) ? ast.children : [];
    const n = children.reduce((sum, child) => sum + renderedLineCount(child, { charsPerLine }), 0);
    return Math.max(1, n);
  }
  // 未知节点按 1 行
  return 1;
}

/**
 * 测量渲染行数（string → 解析 Markdown 再计；AST 直接计）
 * @param {string|{type: string, [k: string]: any}} input
 * @param {{charsPerLine?: number}} [options]
 * @returns {number}
 */
function measureLines(input, options = {}) {
  if (typeof input === 'string') {
    if (input === '') return 0;
    return renderedLineCount(parseMarkdown(input), options);
  }
  return renderedLineCount(input, options);
}

/**
 * 折叠判定（默认 50 行）
 * @param {string|{type: string, [k: string]: any}} input
 * @param {{maxLines?: number, charsPerLine?: number}} [options]
 * @returns {{lineCount: number, folded: boolean, hiddenLines: number, canExpand: boolean, maxLines: number, lineHeight: number, maxHeight: number, charsPerLine: number}}
 */
function foldInfo(input, options = {}) {
  const maxLines = Number.isFinite(options.maxLines) && options.maxLines > 0 ? Math.floor(options.maxLines) : FOLD_MAX_LINES;
  const charsPerLine =
    Number.isFinite(options.charsPerLine) && options.charsPerLine > 0 ? Math.floor(options.charsPerLine) : FOLD_CHARS_PER_LINE;
  const lineCount = measureLines(input, { charsPerLine });
  const folded = lineCount > maxLines;
  return {
    lineCount,
    folded,
    hiddenLines: folded ? lineCount - maxLines : 0,
    canExpand: folded,
    maxLines,
    lineHeight: FOLD_LINE_HEIGHT,
    maxHeight: maxLines * FOLD_LINE_HEIGHT,
    charsPerLine,
  };
}

Object.assign(__exports, { "FOLD_MAX_LINES": FOLD_MAX_LINES, "FOLD_LINE_HEIGHT": FOLD_LINE_HEIGHT, "FOLD_CHARS_PER_LINE": FOLD_CHARS_PER_LINE, "renderedLineCount": renderedLineCount, "measureLines": measureLines, "foldInfo": foldInfo });
});
/* ── src/core/folding.js ─────────────────────────────────────────── */
__def("src/core/folding.js", function (__exports, __req) {
// @ts-check
/**
 * @deprecated v1.7 起 UI 统一使用 50 行口径 `src/core/fold.js`（F29/§6.17）。
 * 本文件（8 行/400 字字符阈值）仅保留给历史内部引用，**不再从 core/index 公开导出**。
 *
 * 群聊数据内核 · 长文本折叠判定（§6.6 / UX D6）
 *
 * 规则：`> 400 字符` 或 `> 8 行`（先到者）→ 默认折叠。
 * 永不折叠：系统条、`已同时发送给…` 说明行、文件卡标题、消息头（由 UI 保证；本模块只给建议）。
 */

const { LIMITS } = __req("src/core/constants.js");

/**
 * 行数（末尾换行不计入空行）
 * @param {string} text
 * @returns {number}
 */
function countLines(text) {
  const s = String(text ?? '');
  if (s === '') return 0;
  const normalized = s.endsWith('\n') ? s.slice(0, -1) : s;
  return normalized.split('\n').length;
}

/**
 * 折叠判定
 * @param {string} text
 * @param {{maxLines?: number, maxChars?: number}} [opts]
 * @returns {{collapsed: boolean, lines: number, chars: number, reason?: 'chars'|'lines'}}
 */
function foldInfo(text, opts = {}) {
  const s = String(text ?? '');
  const maxLines = opts.maxLines ?? LIMITS.foldMaxLines;
  const maxChars = opts.maxChars ?? LIMITS.foldMaxChars;
  const lines = countLines(s);
  const chars = s.length;
  if (chars > maxChars) return { collapsed: true, lines, chars, reason: 'chars' };
  if (lines > maxLines) return { collapsed: true, lines, chars, reason: 'lines' };
  return { collapsed: false, lines, chars };
}

/**
 * @param {string} text
 * @param {{maxLines?: number, maxChars?: number}} [opts]
 * @returns {boolean}
 */
function shouldFold(text, opts = {}) {
  return foldInfo(text, opts).collapsed;
}

/**
 * 折叠按钮文案参数（`查看全部（约 N 字）` 的 N，向上取整到 10）
 * @param {string} text
 * @returns {number}
 */
function approximateChars(text) {
  const n = String(text ?? '').length;
  return Math.max(10, Math.ceil(n / 10) * 10);
}

Object.assign(__exports, { "countLines": countLines, "foldInfo": foldInfo, "shouldFold": shouldFold, "approximateChars": approximateChars });
});
/* ── src/core/index.js ─────────────────────────────────────────── */
__def("src/core/index.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核（T1）· 公共 API
 *
 * ===== 导出契约（T2/T3 消费，冻结）=====
 *
 * 1) 排序/合并：`sortTimeline`（别名 `sortMessages`）、`compareMessages`、`orderKey`、`mergeTimeline`、`insertInOrder`
 * 2) 归一化：`normalizeChannel(sessions, ctx)` → `{messages, diagnostics, members}`；
 *            `normalize(events, ctx)`（单会话便捷）、`normalizeEntries(entries, ctx)`（S1 信封层）、`collectSession`
 * 3) 去重：`dedupeMessages`、`preferMessage`、`weakKeyOf`、`hashText`、`normalizeText`
 * 4) 同发：`mergeFanout`、`aggregateDeliveryState`
 * 5) 分页/上限：`firstScreen`、`pageOlder`、`capInMemory`、`selectPrefetch`、`cursorAfterOpen`、`buildPage`
 * 6) 协议：`buildParts`（发送用 part 数组）、`buildText`、`parseParts`、`parseText`、`stripProtocol`、`protocolSnapshot`、
 *          `buildFanoutPrefix`（T2 冻结名，string）、`buildFanoutPrefixParts`（string[]）、`fanoutSignature`
 * 7) 提及/目标：`computeMentionQuery`、`parseMentions`、`resolveTargets`、`filterMentionCandidates`、
 *               `resolveTargetSessionIds`、`isAddressable`
 * 8) 筛选：`matchesFilter`、`filterMessages`、`filterBanner`；折叠（v1.7 唯一口径）：`foldInfo`、`measureLines`
 * 9) 成员目录：`deriveRoster`、`deriveSnapshot`、`deriveReadonly`、`memberById`、`memberByName`、`displayNameOf`
 * 10) 常量：`LIMITS`、`limits`、`SESSION_RANK`、`KIND_RANK`、`TASK_ACTION_LABELS`、`TASK_STATUS_LABELS`、
 *           `TASK_ACTION_LABEL_KEYS`、`TASK_STATUS_LABEL_KEYS`、`WELCOME_TEXT_TEMPLATE`、`MEMBER_TEXT`、`TOOL_NAMES`、`EVENT_TYPES`
 *
 * ===== 文案约定（Lead 2026-10-28 批准）=====
 * core 会填 canonical zh 的 `actionLabel`/`statusLabel`/`text`（欢迎提示），**T2 必须优先用 i18n key 渲染**
 * （`task.action.*` / `task.state.*` / `member.welcome`），core 的中文只作兜底/降级；meta 里保留了枚举与 memberName。
 *
 * ===== 纯函数约束 =====
 * 无 DOM / Cordis / Node API（无 fs/process/crypto）；可作为 Host/Client 共用内核。
 */

const { CONTEXT_SOURCE_KINDS, DEBUG_FLAG_KEY, DELIVERY_STATES, EVENT_TYPES, KIND_RANK, KIND_RANK_DEFAULT, LIMITS, MEMBER_PHASE_TO_STATUS, MEMBER_TEXT, MESSAGE_KINDS, PROTOCOL_VERSION, SESSION_RANK, SOURCE_KIND, SUBAGENT_TOOL_CONTEXT, TASK_ACTION_LABELS, TASK_ACTION_LABEL_KEYS, TASK_ACTIONS, TASK_STATUS_LABELS, TASK_STATUS_LABEL_KEYS, TASK_STATUSES, TOOL_NAMES, TOOL_SUMMARY_ID_PREFIX, WELCOME_TEXT_TEMPLATE, isContextSourceKind, limits } = __req("src/core/constants.js");
const { PARSE_EXPLAIN, PARSE_HEAD, buildExplain, buildHead, buildParts, buildText, buildFanoutPrefix, buildFanoutPrefixParts, dedupeTargets, fanoutSignature, hasProtocolPrefix, parseParts, parseText, protocolSnapshot, stripProtocol } = __req("src/core/protocol.js");
const { checkTargetCount, computeMentionQuery, filterMentionCandidates, parseMentions, resolveTargetSessionIds, resolveTargets } = __req("src/core/mentions.js");
const { deriveReadonly, deriveRoster, deriveSnapshot, displayNameOf, isAddressable, memberById, memberByName, normalizeMemberStatus, resolveLeadSession, resolveLeadSessionId } = __req("src/core/roster.js");
const { ALLOWED_LINK_SCHEMES, escapeHtml, isSafeUrl, markdownToPlainText, parseInline, parseMarkdown } = __req("src/core/markdown.js");
const { FOLD_LINE_HEIGHT, FOLD_MAX_LINES, foldInfo, measureLines, renderedLineCount } = __req("src/core/fold.js");
const { aggregateTurns, summarizeTurn, turnStatusFromReason } = __req("src/core/turns.js");
const { buildDirectory, collectSession, diffAction, emitSessionMessages, excerptPrompt, extractFiles, normalize, normalizeChannel, normalizeEntries, parseJsonSafe, prefixSenderName, senderOf, settlementClosingText, stripTeamPrefix, textBlocks, unwrapEntry } = __req("src/core/normalize.js");
const { dedupeMessages, hashText, normalizeText, pairNotificationCopies, preferMessage, weakKeyOf } = __req("src/core/dedupe.js");
const { aggregateDeliveryState, mergeFanout } = __req("src/core/fanout.js");
const { compareMessages, compareOrderKey, cloneCursor, encodeSeq, insertInOrder, kindRank, makeCursor, mergeTimeline, orderKey, refreshCursorKeys, sessionRankOf, sliceByOrder, sortMessages, sortTimeline, advanceOffset } = __req("src/core/timeline.js");
const { buildPage, capInMemory, computeHasMore, cursorAfterOpen, firstScreen, pageOlder, selectPrefetch } = __req("src/core/paginate.js");
const { filterBanner, filterMessages, matchesFilter } = __req("src/core/filter.js");


Object.assign(__exports, { "LIMITS": LIMITS, "limits": limits, "SESSION_RANK": SESSION_RANK, "KIND_RANK": KIND_RANK, "KIND_RANK_DEFAULT": KIND_RANK_DEFAULT, "MESSAGE_KINDS": MESSAGE_KINDS, "DELIVERY_STATES": DELIVERY_STATES, "MEMBER_PHASE_TO_STATUS": MEMBER_PHASE_TO_STATUS, "TASK_ACTIONS": TASK_ACTIONS, "TASK_STATUSES": TASK_STATUSES, "TASK_ACTION_LABELS": TASK_ACTION_LABELS, "TASK_STATUS_LABELS": TASK_STATUS_LABELS, "TASK_ACTION_LABEL_KEYS": TASK_ACTION_LABEL_KEYS, "TASK_STATUS_LABEL_KEYS": TASK_STATUS_LABEL_KEYS, "WELCOME_TEXT_TEMPLATE": WELCOME_TEXT_TEMPLATE, "MEMBER_TEXT": MEMBER_TEXT, "SUBAGENT_TOOL_CONTEXT": SUBAGENT_TOOL_CONTEXT, "SOURCE_KIND": SOURCE_KIND, "TOOL_NAMES": TOOL_NAMES, "EVENT_TYPES": EVENT_TYPES, "TOOL_SUMMARY_ID_PREFIX": TOOL_SUMMARY_ID_PREFIX, "DEBUG_FLAG_KEY": DEBUG_FLAG_KEY, "PROTOCOL_VERSION": PROTOCOL_VERSION, "CONTEXT_SOURCE_KINDS": CONTEXT_SOURCE_KINDS, "isContextSourceKind": isContextSourceKind, "PARSE_HEAD": PARSE_HEAD, "PARSE_EXPLAIN": PARSE_EXPLAIN, "buildHead": buildHead, "buildExplain": buildExplain, "buildParts": buildParts, "buildText": buildText, "buildFanoutPrefix": buildFanoutPrefix, "buildFanoutPrefixParts": buildFanoutPrefixParts, "parseParts": parseParts, "parseText": parseText, "stripProtocol": stripProtocol, "hasProtocolPrefix": hasProtocolPrefix, "protocolSnapshot": protocolSnapshot, "dedupeTargets": dedupeTargets, "fanoutSignature": fanoutSignature, "computeMentionQuery": computeMentionQuery, "parseMentions": parseMentions, "resolveTargets": resolveTargets, "resolveTargetSessionIds": resolveTargetSessionIds, "filterMentionCandidates": filterMentionCandidates, "checkTargetCount": checkTargetCount, "deriveRoster": deriveRoster, "deriveSnapshot": deriveSnapshot, "deriveReadonly": deriveReadonly, "displayNameOf": displayNameOf, "memberById": memberById, "memberByName": memberByName, "isAddressable": isAddressable, "normalizeMemberStatus": normalizeMemberStatus, "normalize": normalize, "normalizeChannel": normalizeChannel, "normalizeEntries": normalizeEntries, "collectSession": collectSession, "buildDirectory": buildDirectory, "emitSessionMessages": emitSessionMessages, "senderOf": senderOf, "textBlocks": textBlocks, "parseJsonSafe": parseJsonSafe, "extractFiles": extractFiles, "unwrapEntry": unwrapEntry, "prefixSenderName": prefixSenderName, "stripTeamPrefix": stripTeamPrefix, "settlementClosingText": settlementClosingText, "excerptPrompt": excerptPrompt, "diffAction": diffAction, "dedupeMessages": dedupeMessages, "preferMessage": preferMessage, "normalizeText": normalizeText, "hashText": hashText, "weakKeyOf": weakKeyOf, "pairNotificationCopies": pairNotificationCopies, "mergeFanout": mergeFanout, "aggregateDeliveryState": aggregateDeliveryState, "compareMessages": compareMessages, "sortTimeline": sortTimeline, "sortMessages": sortMessages, "kindRank": kindRank, "sessionRankOf": sessionRankOf, "orderKey": orderKey, "compareOrderKey": compareOrderKey, "cloneCursor": cloneCursor, "encodeSeq": encodeSeq, "makeCursor": makeCursor, "sliceByOrder": sliceByOrder, "mergeTimeline": mergeTimeline, "insertInOrder": insertInOrder, "advanceOffset": advanceOffset, "refreshCursorKeys": refreshCursorKeys, "firstScreen": firstScreen, "pageOlder": pageOlder, "capInMemory": capInMemory, "selectPrefetch": selectPrefetch, "computeHasMore": computeHasMore, "cursorAfterOpen": cursorAfterOpen, "buildPage": buildPage, "matchesFilter": matchesFilter, "filterMessages": filterMessages, "filterBanner": filterBanner, "foldInfo": foldInfo, "measureLines": measureLines, "renderedLineCount": renderedLineCount, "FOLD_MAX_LINES": FOLD_MAX_LINES, "FOLD_LINE_HEIGHT": FOLD_LINE_HEIGHT, "parseMarkdown": parseMarkdown, "parseInline": parseInline, "escapeHtml": escapeHtml, "isSafeUrl": isSafeUrl, "markdownToPlainText": markdownToPlainText, "ALLOWED_LINK_SCHEMES": ALLOWED_LINK_SCHEMES, "aggregateTurns": aggregateTurns, "summarizeTurn": summarizeTurn, "turnStatusFromReason": turnStatusFromReason, "resolveLeadSession": resolveLeadSession, "resolveLeadSessionId": resolveLeadSessionId });
});
/* ── src/core/markdown.js ─────────────────────────────────────────── */
__def("src/core/markdown.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 安全 Markdown 子集解析（B1 / F22 / 架构 §6.12）
 *
 * 纯函数、零依赖、**无 DOM / Node API / innerHTML**。
 * 支持：段落/换行、粗体 `**x**`、斜体 `*x*`、行内代码 `` `x` ``、围栏代码块 ```lang、
 *       无序/有序列表、GFM 表格、链接 `[t](url)`（仅 http/https/mailto）。
 * 不支持：原始 HTML、图片、引用、任务列表、脚注 → **降级为纯文本**（内容不丢、不报错）。
 * 解析异常时整段退回纯文本 `plain:true`。
 *
 * AST：
 *  document { children: MdBlock[] }
 *  inline: text{value} | strong{children} | em{children} | code{value} | link{url,children} | break
 *  block : paragraph{children} | code_block{lang,value} | list{ordered,start?,items} | list_item{children}
 *          | table{header:{cells,align}, rows:[[{children}]]}（GFM；v1.7.2：单元格 = {children:Inline[]}）
 */

const { LIMITS } = __req("src/core/constants.js");

/** 允许的链接 scheme（小写、含冒号） */
const ALLOWED_LINK_SCHEMES = Object.freeze(['http:', 'https:', 'mailto:']);

/** Markdown 渲染文本硬上限（与 textRender 一致；超出截断并标 truncated） */
const MD_MAX_CHARS = LIMITS.textRender;

/**
 * HTML 实体转义（前端渲染 text 节点时用 textContent 即可；此函数用于纯文本降级/安全输出）
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 链接是否安全（仅白名单 scheme；拒绝控制字符/空白）
 * @param {string} url
 * @returns {boolean}
 */
function isSafeUrl(url) {
  const raw = String(url ?? '').trim();
  if (!raw || /[\u0000-\u001f\u007f\s]/.test(raw)) return false;
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*:)/.exec(raw);
  if (!m) return false;
  return ALLOWED_LINK_SCHEMES.includes(m[1].toLowerCase());
}

/**
 * @typedef {{type: string, [k: string]: any}} MdNode
 */

/**
 * 解析 Markdown 文本为 AST
 * @param {string} text
 * @param {{maxChars?: number}} [options]
 * @returns {{type: 'document', children: MdNode[], plain: boolean, truncated: boolean}}
 */
function parseMarkdown(text, options = {}) {
  const maxChars = Number.isFinite(options.maxChars) ? Number(options.maxChars) : MD_MAX_CHARS;
  let source = String(text ?? '').replace(/\r\n?/g, '\n');
  let truncated = false;
  if (source.length > maxChars) {
    source = source.slice(0, maxChars);
    truncated = true;
  }
  try {
    const children = parseBlocks(source.split('\n'));
    return { type: 'document', children, plain: false, truncated };
  } catch {
    // 解析异常：整段纯文本（内容不丢）
    const children = source
      ? [{ type: 'paragraph', children: source.split('\n').flatMap((line, i) => (i === 0 ? [{ type: 'text', value: line }] : [{ type: 'break' }, { type: 'text', value: line }])) }]
      : [];
    return { type: 'document', children, plain: true, truncated };
  }
}

const FENCE_RE = /^```([A-Za-z0-9_+.-]*)\s*$/;
const UL_RE = /^(\s*)([-*+])\s+(.*)$/;
const OL_RE = /^(\s*)(\d+)[.)]\s+(.*)$/;
const BLOCKQUOTE_RE = /^\s*>/;
/** 表格上限（v1.7.2 §6.12）：200 行 × 20 列 */
const TABLE_MAX_ROWS = 200;
const TABLE_MAX_COLS = 20;
const TABLE_SEP_CELL_RE = /^:?-+:?$/;
const TABLE_SEP_ROW_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const HEADING_RE = /^\s{0,3}#{1,6}\s+/;
const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;

/**
 * @param {string[]} lines
 * @returns {MdNode[]}
 */
function parseBlocks(lines) {
  /** @type {MdNode[]} */
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    const fence = FENCE_RE.exec(line);
    if (fence) {
      const lang = fence[1] || '';
      const body = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // 跳过结束围栏（未闭合则吞到结尾）
      blocks.push({ type: 'code_block', lang, value: body.join('\n') });
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // GFM 表格（表头 + 分隔行 + 数据行）；非法表格自然落回段落纯文本
    const table = tryParseTable(lines, i);
    if (table) {
      blocks.push(table.node);
      i = table.next;
      continue;
    }

    // 引用/标题/分隔线：不支持 → 纯文本段落（内容不丢）
    if (BLOCKQUOTE_RE.test(line) || HEADING_RE.test(line) || HR_RE.test(line)) {
      blocks.push(paragraphFromLines([line]));
      i += 1;
      continue;
    }

    // 列表（同类型连续行；任务列表 `- [ ]` 降级为普通文本项）
    const ul = UL_RE.exec(line);
    const ol = OL_RE.exec(line);
    if (ul || ol) {
      const ordered = Boolean(ol);
      const start = ol ? Number(ol[2]) : 1;
      /** @type {MdNode[]} */
      const items = [];
      while (i < lines.length) {
        const cur = lines[i];
        const mu = UL_RE.exec(cur);
        const mo = OL_RE.exec(cur);
        if (ordered ? !mo : !mu) break;
        const content = String((ordered ? mo[3] : mu[3]) ?? '');
        items.push({ type: 'list_item', children: [paragraphFromLines([content])] });
        i += 1;
      }
      blocks.push({ type: 'list', ordered, start, items });
      continue;
    }

    // 段落：连续非空、非块起始行，直到空行/围栏/列表
    /** @type {string[]} */
    const para = [];
    while (i < lines.length) {
      const cur = lines[i];
      if (cur.trim() === '') break;
      if (FENCE_RE.test(cur)) break;
      if (UL_RE.test(cur) || OL_RE.test(cur)) break;
      if (looksLikeTableStart(lines, i)) break;
      para.push(cur);
      i += 1;
    }
    if (para.length > 0) blocks.push(paragraphFromLines(para));
  }
  return blocks;
}

/**
 * 该行能否作为表格起始（表头 + 下一行分隔行）
 * @param {string[]} lines
 * @param {number} i
 * @returns {boolean}
 */
function looksLikeTableStart(lines, i) {
  const header = lines[i];
  const sep = lines[i + 1];
  if (typeof header !== 'string' || typeof sep !== 'string') return false;
  if (!hasUnescapedPipe(header)) return false;
  if (!TABLE_SEP_ROW_RE.test(sep)) return false;
  if (countColumns(header) !== countColumns(sep)) return false;
  return splitTableRow(sep).every((cell) => TABLE_SEP_CELL_RE.test(cell));
}

/**
 * @param {string} line
 * @returns {boolean}
 */
function hasUnescapedPipe(line) {
  const s = String(line);
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '\\') {
      i += 1;
      continue;
    }
    if (s[i] === '|') return true;
  }
  return false;
}

/**
 * 列数（按未转义管道切分；用于表头/分隔行列数对齐校验）
 * @param {string} line
 * @returns {number}
 */
function countColumns(line) {
  const s = String(line).trim();
  let start = s.startsWith('|') ? 1 : 0;
  let end = s.length;
  if (end > start && s.endsWith('|') && s[end - 2] !== '\\') end -= 1;
  let count = 1;
  let inCode = false;
  for (let i = start; i < end; i += 1) {
    const ch = s[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) count += 1;
  }
  return count;
}

/**
 * 切表格行：外层管道可省、`\|` 转义为字面管道、代码 span 内管道不切、单元格 trim
 * @param {string} line
 * @returns {string[]}
 */
function splitTableRow(line) {
  const s = String(line).trim();
  const cells = [];
  let buf = '';
  let i = s.startsWith('|') ? 1 : 0;
  const end = s.endsWith('|') && s[s.length - 2] !== '\\' ? s.length - 1 : s.length;
  let inCode = false;
  for (; i < end; i += 1) {
    const ch = s[i];
    if (ch === '\\' && s[i + 1] === '|') {
      buf += '|';
      i += 1;
      continue;
    }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) {
      cells.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  cells.push(buf.trim());
  return cells;
}

/**
 * 解析对齐行 → ['left'|'center'|'right'|null]
 * @param {string[]} sepCells
 * @returns {Array<'left'|'center'|'right'|null>}
 */
function parseTableAlign(sepCells) {
  return sepCells.map((cell) => {
    const c = cell.trim();
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (left) return 'left';
    if (right) return 'right';
    return null;
  });
}

/**
 * GFM 表格解析（合法才返回；非法 → null，调用方按段落纯文本降级）
 * @param {string[]} lines
 * @param {number} i
 * @returns {{node: MdNode, next: number}|null}
 */
function tryParseTable(lines, i) {
  if (!looksLikeTableStart(lines, i)) return null;
  const rawHeader = splitTableRow(lines[i]);
  const rawSep = splitTableRow(lines[i + 1]);
  if (rawHeader.length === 0 || rawHeader.length !== rawSep.length) return null;
  const cols = Math.min(rawHeader.length, TABLE_MAX_COLS);
  const align = parseTableAlign(rawSep).slice(0, cols);
  let truncated = rawHeader.length > TABLE_MAX_COLS;

  /** @type {Array<{children: MdNode[]}>} */
  const header = rawHeader.slice(0, cols).map((cell) => ({ children: parseInline(cell) }));
  /** @type {Array<Array<{children: MdNode[]}>>} */
  const rows = [];
  let j = i + 2;
  let seenRows = 0;
  while (j < lines.length) {
    const line = lines[j];
    if (line.trim() === '') break;
    if (FENCE_RE.test(line) || UL_RE.test(line) || OL_RE.test(line)) break;
    if (!hasUnescapedPipe(line)) break;
    if (seenRows >= TABLE_MAX_ROWS) {
      truncated = true;
      j += 1;
      continue;
    }
    const cells = splitTableRow(line);
    /** @type {Array<{children: MdNode[]}>} */
    const rowCells = [];
    for (let c = 0; c < cols; c += 1) rowCells.push({ children: parseInline(cells[c] ?? '') });
    rows.push(rowCells);
    seenRows += 1;
    j += 1;
  }
  return { node: { type: 'table', header: { cells: header, align }, rows, ...(truncated ? { truncated: true } : {}) }, next: j };
}

/**
 * @param {string[]} lines
 * @returns {MdNode}
 */
function paragraphFromLines(lines) {
  /** @type {MdNode[]} */
  const children = [];
  lines.forEach((line, idx) => {
    if (idx > 0) children.push({ type: 'break' });
    children.push(...parseInline(line));
  });
  return { type: 'paragraph', children };
}

/**
 * 行内解析：代码 → 粗体 → 斜体 → 链接；未知/不配对保留为 text
 * @param {string} line
 * @returns {MdNode[]}
 */
function parseInline(line) {
  /** @type {MdNode[]} */
  const out = [];
  const s = String(line ?? '');
  let i = 0;
  let buf = '';
  const flush = () => {
    if (buf) {
      out.push({ type: 'text', value: buf });
      buf = '';
    }
  };
  while (i < s.length) {
    const ch = s[i];

    // 行内代码 `...`
    if (ch === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > i) {
        flush();
        out.push({ type: 'code', value: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
      buf += ch;
      i += 1;
      continue;
    }

    // 粗体 **...**
    if (ch === '*' && s[i + 1] === '*') {
      const end = s.indexOf('**', i + 2);
      if (end > i + 1) {
        flush();
        out.push({ type: 'strong', children: parseInline(s.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
      buf += '**';
      i += 2;
      continue;
    }

    // 斜体 *...*
    if (ch === '*') {
      const end = s.indexOf('*', i + 1);
      if (end > i + 1 && !s.slice(i + 1, end).includes('\n')) {
        flush();
        out.push({ type: 'em', children: parseInline(s.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
      buf += ch;
      i += 1;
      continue;
    }

    // 链接 [text](url)
    if (ch === '[') {
      const close = s.indexOf(']', i + 1);
      if (close > i && s[close + 1] === '(') {
        const endParen = s.indexOf(')', close + 2);
        if (endParen > close + 1) {
          const label = s.slice(i + 1, close);
          const url = s.slice(close + 2, endParen).trim();
          if (isSafeUrl(url)) {
            flush();
            out.push({ type: 'link', url, children: parseInline(label) });
            i = endParen + 1;
            continue;
          }
          // 非白名单 scheme：整段按纯文本（内容不丢）
          buf += s.slice(i, endParen + 1);
          i = endParen + 1;
          continue;
        }
      }
      buf += ch;
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

/**
 * AST/字符串 → 纯文本（保留换行；用于降级、摘要、搜索）
 * @param {string|{type: string, [k: string]: any}} input
 * @returns {string}
 */
function markdownToPlainText(input) {
  if (typeof input === 'string') {
    const ast = parseMarkdown(input);
    return astToPlainText(ast).trim();
  }
  return astToPlainText(input).trim();
}

/**
 * @param {any} node
 * @returns {string}
 */
function astToPlainText(node) {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(astToPlainText).join('');
  switch (node.type) {
    case 'document':
      return (node.children ?? []).map(astToPlainText).join('\n\n');
    case 'paragraph':
      return (node.children ?? []).map(astToPlainText).join('');
    case 'text':
    case 'code':
      return String(node.value ?? '');
    case 'strong':
    case 'em':
    case 'link':
      return (node.children ?? []).map(astToPlainText).join('');
    case 'break':
      return '\n';
    case 'code_block':
      return String(node.value ?? '');
    case 'list':
      return (node.items ?? []).map(astToPlainText).join('\n');
    case 'table': {
      const headerCells = node.header?.cells ?? [];
      const lines = [headerCells, ...(node.rows ?? [])].map((cells) =>
        (cells ?? []).map((cell) => astToPlainText(cell?.children ?? cell).trim()).join(' | '),
      );
      return lines.join('\n');
    }
    case 'list_item':
      return (node.children ?? []).map(astToPlainText).join('\n');
    default:
      return node.value !== undefined ? String(node.value) : '';
  }
}

Object.assign(__exports, { "ALLOWED_LINK_SCHEMES": ALLOWED_LINK_SCHEMES, "escapeHtml": escapeHtml, "isSafeUrl": isSafeUrl, "parseMarkdown": parseMarkdown, "TABLE_MAX_ROWS": TABLE_MAX_ROWS, "TABLE_MAX_COLS": TABLE_MAX_COLS, "parseInline": parseInline, "markdownToPlainText": markdownToPlainText });
});
/* ── src/core/mentions.js ─────────────────────────────────────────── */
__def("src/core/mentions.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · @ 提及与发送目标解析（D-A 可寻址集合）
 *
 * 契约来源：docs/architecture/group-chat-architecture.md
 *  - §5.1 目标解析（`targets = dedupe(['lead', ...mentions.filter(isAddressable)])`）
 *  - §5.1 D-A 可寻址：lead 恒可寻址；teammate 恒可寻址（含 inactive）；subagent 仅 running/provisioning
 *  - §5.1 无团队发送（D-C）：targets=['lead']，无多目标说明行
 *  - §5.2 顺序：`@lead` 必含且排第一，其后按成员目录顺序
 *
 * 语义边界（PRD F4）：**@ 只来自 chips**，正文里的字面 `@decorator` 不升级为提及；
 * `parseMentions` 仅用于「从文本恢复 chips / 高亮已有成员」，不作为发送目标来源。
 */

const { LIMITS } = __req("src/core/constants.js");
const { isAddressable, memberByName } = __req("src/core/roster.js");

/**
 * @typedef {import('./model.js').ChannelMember} ChannelMember
 */

/**
 * @typedef {Object} MentionQuery
 * @property {boolean} active        当前光标是否处于一个未完成的 @ 查询中
 * @property {string} query          已输入的名字片段（不含 @）
 * @property {number} start          `@` 在文本中的下标
 * @property {number} end            当前光标
 */

/**
 * 计算光标处的 @ 查询（输入法友好：只认「@ 前是空白/行首/常见分隔符」且中间无空白）。
 * @param {string} text
 * @param {number} caret
 * @returns {MentionQuery}
 */
function computeMentionQuery(text, caret) {
  const s = typeof text === 'string' ? text : '';
  const pos = Math.max(0, Math.min(Number.isInteger(caret) ? caret : s.length, s.length));
  const before = s.slice(0, pos);
  const at = before.lastIndexOf('@');
  if (at < 0) return { active: false, query: '', start: -1, end: pos };
  const prev = at === 0 ? '' : before[at - 1];
  if (prev && !/[\s([{（【「,，、:：>]/.test(prev)) return { active: false, query: '', start: -1, end: pos };
  const query = before.slice(at + 1);
  if (/[\s]/.test(query)) return { active: false, query: '', start: -1, end: pos };
  return { active: true, query, start: at, end: pos };
}

/**
 * 从文本里恢复已存在的成员 @（仅用于 UI 高亮/chips 恢复，不用于发送目标）。
 * 展开规则：先按名字长度倒序匹配，命中后从扫描串中剔除，避免 `@ux` 命中 `@ux-designer`。
 * @param {string} text
 * @param {ChannelMember[]} members
 * @returns {string[]} 成员名（按出现顺序、去重）
 */
function parseMentions(text, members) {
  const s = typeof text === 'string' ? text : '';
  const list = Array.isArray(members) ? members : [];
  const names = [];
  /** @type {Array<{name:string, at:number, len:number}>} */
  const hits = [];
  let haystack = s;
  const sorted = [...list].sort((a, b) => b.name.length - a.name.length);
  for (const m of sorted) {
    if (!m || !m.name) continue;
    const token = `@${m.name}`;
    let from = 0;
    for (;;) {
      const idx = haystack.indexOf(token, from);
      if (idx < 0) break;
      const after = haystack[idx + token.length] ?? '';
      const boundaryOk = after === '' || /[\s,，、。.;；:：!！?？)）\]】」]/.test(after);
      if (boundaryOk) {
        hits.push({ name: m.name, at: idx, len: token.length });
        // 用等长占位替换，保持下标不变（避免短名再命中长名内部）
        haystack = `${haystack.slice(0, idx)}${'\u0000'.repeat(token.length)}${haystack.slice(idx + token.length)}`;
        break; // 每个成员只记录首次出现
      }
      from = idx + 1;
    }
  }
  hits.sort((a, b) => a.at - b.at);
  for (const h of hits) if (!names.includes(h.name)) names.push(h.name);
  return names;
}

/**
 * @typedef {Object} MentionChip
 * @property {string} name
 */

/**
 * 目标解析结果
 * @typedef {Object} ResolveTargetsResult
 * @property {string[]} targets                 最终目标名（去重、lead 首位、成员目录序）
 * @property {string[]} targetSessionIds
 * @property {ChannelMember[]} targetMembers
 * @property {Array<{name: string, reason: 'unaddressable'|'unknown'|'overflow'}>} dropped
 * @property {boolean} noTeam                   D-C：当前为单 agent 会话
 * @property {boolean} hasFanout                targets.length > 1（需要注入同发前缀）
 * @property {string[]} notes                   UI 提示用的稳定 code：'member.leftNotSent' / 'targets.overflow'
 */

/**
 * 解析发送目标（§5.1）。
 *
 * `draft.mentions` 是 Composer 的 chips（**唯一可信提及来源**）；`draft.text` 仅在
 * `mentions` 未提供时用于恢复（UI 兼容用，不改变协议语义）。
 *
 * @param {{text?: string, mentions?: string[]}} draft
 * @param {ChannelMember[]} members
 * @param {{maxTargets?: number}} [opts]
 * @returns {ResolveTargetsResult}
 */
function resolveTargets(draft, members, opts = {}) {
  const list = Array.isArray(members) ? members : [];
  const maxTargets = Math.max(1, opts.maxTargets ?? LIMITS.maxTargetsPerBatch);
  const noTeam = !list.some((m) => m.kind === 'teammate' || m.kind === 'subagent');
  const chipNames = Array.isArray(draft?.mentions)
    ? draft.mentions
    : parseMentions(draft?.text ?? '', list);

  /** @type {Array<{name: string, reason: 'unaddressable'|'unknown'|'overflow'}>} */
  const dropped = [];
  const notes = [];
  /** @type {ChannelMember[]} */
  const picked = [];
  const lead = list.find((m) => m.kind === 'lead');
  if (lead) picked.push(lead);

  /** @type {Set<string>} */
  const seen = new Set();
  for (const raw of chipNames) {
    if (typeof raw !== 'string') continue;
    const name = raw.trim().replace(/^@/, '');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    if (name === 'lead' || name === (lead?.name ?? 'lead')) continue; // lead 已恒含
    const member = memberByName(list, name);
    if (!member) {
      dropped.push({ name, reason: 'unknown' });
      notes.push('member.leftNotSent');
      continue;
    }
    if (!isAddressable(member)) {
      dropped.push({ name, reason: 'unaddressable' });
      notes.push('member.leftNotSent');
      continue;
    }
    picked.push(member);
  }

  // 按成员目录顺序排列（lead 已首位），再追加目录外的兜底目标
  const order = new Map(list.map((m, i) => [m.sessionId, i]));
  const ordered = [...picked].sort((a, b) => {
    if (a.kind === 'lead') return -1;
    if (b.kind === 'lead') return 1;
    return (order.get(a.sessionId) ?? 1e9) - (order.get(b.sessionId) ?? 1e9);
  });

  let finalMembers = ordered;
  if (ordered.length > maxTargets) {
    for (const extra of ordered.slice(maxTargets)) {
      dropped.push({ name: extra.name, reason: 'overflow' });
    }
    notes.push('targets.overflow');
    finalMembers = ordered.slice(0, maxTargets);
  }

  const targets = dedupeNames(finalMembers.map((m) => (m.kind === 'lead' ? 'lead' : m.name)));
  if (targets.length === 0) targets.push('lead');
  return {
    targets,
    targetSessionIds: finalMembers.map((m) => m.sessionId),
    targetMembers: finalMembers,
    dropped,
    noTeam,
    hasFanout: targets.length > 1,
    notes: [...new Set(notes)],
  };
}

/**
 * @ 补全候选（D-A 过滤）：lead + 全部 teammate（含 inactive）+ subagent（仅 running/provisioning）。
 * 排序：lead → teammate（目录序）→ subagent（目录序），同组内前缀命中优先。
 * @param {ChannelMember[]} members
 * @param {string} [query]
 * @returns {ChannelMember[]}
 */
function filterMentionCandidates(members, query = '') {
  const q = String(query ?? '').trim().toLowerCase();
  const list = (Array.isArray(members) ? members : []).filter((m) => m && isAddressable(m));
  const rank = { lead: 0, teammate: 1, subagent: 2 };
  return list
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => {
      if (!q) return true;
      const name = m.name.toLowerCase();
      const display = String(m.displayName ?? '').toLowerCase();
      return name.startsWith(q) || display.includes(q) || name.includes(q);
    })
    .sort((a, b) => {
      const ra = rank[a.m.kind] ?? 9;
      const rb = rank[b.m.kind] ?? 9;
      if (ra !== rb) return ra - rb;
      return a.i - b.i;
    })
    .map(({ m }) => m);
}

/**
 * 目标名 → sessionId（名册反查；lead → channelId）
 * @param {string[]} targets
 * @param {ChannelMember[]} members
 * @param {string} channelId
 * @returns {string[]}
 */
function resolveTargetSessionIds(targets, members, channelId) {
  const out = [];
  for (const raw of Array.isArray(targets) ? targets : []) {
    const name = String(raw).replace(/^@/, '');
    if (name === 'lead') {
      out.push(channelId);
      continue;
    }
    const m = memberByName(members, name);
    if (m) out.push(m.sessionId);
  }
  return out;
}

/**
 * 成员请求发送超限时的文案 code（UI i18n）
 * @param {number} count
 * @param {number} [max]
 * @returns {{ok: boolean, code?: string}}
 */
function checkTargetCount(count, max = LIMITS.maxTargetsPerBatch) {
  if (count > max) return { ok: false, code: 'targets.overflow' };
  return { ok: true };
}

/**
 * @param {string[]} names
 * @returns {string[]}
 */
function dedupeNames(names) {
  const out = [];
  const seen = new Set();
  for (const n of names) {
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

Object.assign(__exports, { "computeMentionQuery": computeMentionQuery, "parseMentions": parseMentions, "resolveTargets": resolveTargets, "filterMentionCandidates": filterMentionCandidates, "resolveTargetSessionIds": resolveTargetSessionIds, "checkTargetCount": checkTargetCount });
});
/* ── src/core/model.js ─────────────────────────────────────────── */
__def("src/core/model.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 领域模型（JSDoc 类型，项目为纯 JS，用 `// @ts-check` 获得编辑器提示）
 *
 * 契约来源：docs/architecture/group-chat-architecture.md §4.1（定稿）
 * 注意：字段名与架构文档逐字对应，新增字段必须先升架构版本。
 */

/**
 * @typedef {'lead'|'teammate'|'subagent'} MemberKind
 */

/**
 * @typedef {'running'|'inactive'|'provisioning'|'failed'|'unknown'} MemberStatus
 */

/**
 * @typedef {'fresh'|'fork'|'unknown'} ContextPolicy
 */

/**
 * @typedef {'one_shot'|'continuable'|'unknown'} LifecycleMode
 */

/**
 * @typedef {'provisioning'|'active'|'running'|'inactive'|'failed'|'unknown'} MemberLifecycle
 */

/**
 * @typedef {'user'|'agent_to_agent'|'agent_output'|'system'|'delivery'|'member_card'|'task_card'} MessageKind
 */

/**
 * @typedef {'sending'|'sent'|'partial'|'failed'} DeliveryState
 */

/**
 * @typedef {'pending'|'in_progress'|'completed'|'deleted'} TaskStatus
 */

/**
 * @typedef {'create'|'claim'|'complete'|'reopen'|'reassign'|'edit'|'set_dependencies'|'delete'|'release'} TaskAction
 */

/**
 * @typedef {'paired'|'time-neighbor'|'owner-inferred'|'system-fallback'} ActorSource
 */

/**
 * @typedef {Object} ChannelMember
 * @property {string} sessionId
 * @property {string} name                       展示/寻址名：lead | teammate.name | subagent.label
 * @property {string} displayName                UI 展示名（lead→Lead；subagent→`${label} · ${parentName} 的子体`）
 * @property {MemberKind} kind
 * @property {string} [parentSessionId]
 * @property {number} depth
 * @property {MemberStatus} status
 * @property {string} [description]
 * @property {string} [model]
 * @property {boolean} addressable               D-A：lead/teammate 恒 true；subagent 仅 running/provisioning
 * @property {boolean} [parentAvailable]
 * @property {'lead'|'teammate'|'subagent'} [badge]
 * @property {boolean} [readable]                读权限预检结果（undefined = 未知，按可读处理）
 */

/**
 * @typedef {Object} ChannelTruncation
 * @property {number} omittedSubagents
 * @property {number} maxDepth
 * @property {number} maxSessions
 * @property {'session-cap'|'depth-cap'} reason
 */

/**
 * @typedef {Object} ChannelSnapshot
 * @property {string} channelId
 * @property {ChannelMember} lead
 * @property {ChannelMember[]} members
 * @property {number} runningCount
 * @property {boolean} readonly
 * @property {'team-ended'|'lead-offline'|'archived'|'permission'} [readonlyReason]
 * @property {'no-roster'|'lead-only'} [degraded]
 * @property {ChannelTruncation} [truncated]
 * @property {number} generatedAt
 */

/**
 * @typedef {Object} MessageSender
 * @property {string} sessionId
 * @property {string} name
 * @property {MemberKind|'user'|'system'} kind
 */

/**
 * @typedef {Object} MemberCardMember
 * @property {string} sessionId
 * @property {string} name
 * @property {'teammate'|'subagent'} kind
 * @property {string} [parentName]
 * @property {string} [description]
 * @property {string} [model]
 * @property {string} [modelInheritedFrom]
 * @property {'descriptor'|'result_snapshot'|'roster_current'|'unknown'} [modelSource]
 * @property {ContextPolicy} contextPolicy
 * @property {LifecycleMode} lifecycleMode
 * @property {'spawn_teammate'|'subagent'|'subagent_fork'|'unknown'} createTool
 * @property {string} [promptExcerpt]
 * @property {string} [promptFull]
 * @property {MemberLifecycle} state
 */

/**
 * @typedef {Object} MemberCardPayload
 * @property {string} id
 * @property {MemberCardMember} member
 * @property {number} time
 * @property {{viewSession: 'enabled'|'disabled', viewTask?: 'enabled'|'disabled', reason?: 'no-permission'|'no-ui-workspace'|'session-missing'}} actions
 * @property {'team-member-active'|'subagent-catalog'|'tool-result'|'historical'} trigger
 */

/**
 * @typedef {Object} TaskCardTask
 * @property {string} id
 * @property {number} revision
 * @property {string} subject
 * @property {string} description
 * @property {TaskStatus} status
 * @property {string} [ownerId]
 * @property {string} [ownerName]
 * @property {string[]} blockedBy
 * @property {string[]} writeScopes
 * @property {boolean} [deleted]
 */

/**
 * @typedef {Object} TaskCardActor
 * @property {string} name
 * @property {string} [sessionId]
 * @property {'lead'|'teammate'|'subagent'|'system'} kind
 * @property {ActorSource} source
 */

/**
 * @typedef {Object} TaskCardPayload
 * @property {string} id
 * @property {TaskAction} action
 * @property {TaskCardTask} task
 * @property {string} actionLabel
 * @property {string} statusLabel
 * @property {TaskCardActor} actor
 * @property {number} time
 * @property {string} dedupeKey
 * @property {boolean} [replay]
 * @property {boolean} [compact]
 */

/**
 * @typedef {Object} ChannelMessage
 * @property {string} id
 * @property {MessageKind} kind
 * @property {string} sessionId
 * @property {MessageSender} sender
 * @property {string[]} targets
 * @property {string[]} targetSessionIds
 * @property {string} text
 * @property {string} [rawText]
 * @property {number} time
 * @property {number} seq
 * @property {number} [turn]
 * @property {boolean} isFinal
 * @property {{name: string, path: string}[]} [files]
 * @property {number} [toolCallCount]
 * @property {'team-created'|'member-welcome'|'member-joined'|'member-left'|'subagent-created'|'subagent-settled'|'send-failed'|'readonly'} [systemReason]
 * @property {DeliveryState} [delivery]
 * @property {Record<string, DeliveryState>} [deliveries]
 * @property {string} [clientBatchId]
 * @property {boolean} [truncated]
 * @property {Record<string, any>} [meta]
 * @property {MemberCardPayload} [memberCard]
 * @property {TaskCardPayload} [taskCard]
 * @property {string} [creationId]
 * @property {number} [pairOrder]
 */

/**
 * @typedef {Object} ChannelCursor
 * @property {1} v
 * @property {string} channelId
 * @property {Record<string, number>} offsets
 * @property {Record<string, number>} revisions
 * @property {string} [oldestKey]
 * @property {string} [newestKey]
 */

/**
 * @typedef {Object} ChannelPage
 * @property {ChannelSnapshot} channel
 * @property {ChannelMessage[]} messages
 * @property {ChannelCursor} cursor
 * @property {boolean} hasMore
 * @property {boolean} truncated
 * @property {number} serverTime
 */

/**
 * 内核诊断（不进入 UI，供调试与测试）
 * @typedef {Object} NormalizeDiagnostics
 * @property {number} sessions
 * @property {number} events
 * @property {number} transientDropped
 * @property {number} inheritedDropped
 * @property {number} forkedTurnsDropped
 * @property {number} unknownEvents
 * @property {number} ignoredSubagentPrompts
 * @property {number} ignoredSystemContext
 * @property {number} ignoredNotices
 * @property {number} emptyAgentOutput
 * @property {number} duplicatesRemoved
 * @property {number} fanoutMerged
 * @property {number} memberCards
 * @property {number} taskCards
 * @property {number} settlementsDropped
 * @property {number} memoryTrimmed
 * @property {boolean} truncated
 * @property {string[]} warnings
 */

/**
 * 归一化输入：一个会话（宿主读到的窗口）
 * @typedef {Object} SessionInput
 * @property {string} sessionId
 * @property {{id?: string, parentSession?: string, isSeeded?: boolean, createdAt?: number, cwd?: string, [k: string]: any}} [header]
 * @property {any[]} events                          原始事件（`{type,seq,time,data}`），或 S1 信封（`{type:'event'|'transient',event}`）——由 `normalizeEntries` 预处理
 * @property {number} [cutoff]                       fork/seed 继承前缀 cutoff（seq <= cutoff 丢弃）
 * @property {number} [revision]                     事件窗口 revision（游标用）
 */

/**
 * 归一化上下文
 * @typedef {Object} NormalizeContext
 * @property {string} leadSessionId
 * @property {ChannelMember[]} [members]             authority roster（T2 的 agentTeam 投影）：按 sessionId 合并覆盖事件名册字段，保留 subagent；缺失时纯事件推导
 * @property {boolean} [noRoster]                    投影缺失降级（§7 R-15）
 * @property {boolean} [historical]                  历史回放（task_card 打 replay）
 * @property {Record<string, {clientBatchId: string, requestIds?: Record<string,string>, targets?: string[]}>} [localBatches]  本地发送记录反查（按目标会话 id 或 requestId）
 * @property {(sessionId: string) => boolean} [canRead]  读权限回调（false → 卡片动作 disable + 成员 readable=false）
 * @property {Array<{id: string, parentSessionId?: string, running?: boolean, status?: string}>} [sessionSummaries]
 *          会话运行态摘要（适配器从 `binding(id).session.getSnapshot()` 的 `running` 读取；D-03 成员/running 口径）
 * @property {boolean} [emitSubagentPrompt]          是否把「父 agent 下发的初始 prompt」出成 system（默认 false）
 * @property {'attach'|'delivery'|'none'} [toolFold] 工具计数表达方式（默认 'attach'；无输出的 turn 恒出独立摘要，见 lead 约束）
 * @property {number} [maxMessages]                  内存上限（默认 LIMITS.maxMessagesInMemory）
 */

/**
 * 会话归一化中间结果（供跨会话配对用）
 * @typedef {Object} SessionBundle
 * @property {string} sessionId
 * @property {ChannelMessage[]} messages
 * @property {CreationRecord[]} creations
 * @property {TaskSnapshotRecord[]} taskSnapshots
 * @property {TaskOpRecord[]} taskOps
 * @property {TeamMemberRecord[]} teamMembers
 * @property {CatalogRecord[]} catalogs
 * @property {DescriptorRecord[]} descriptors
 * @property {Map<string, {target?: string, time?: number}>} spliced
 * @property {Map<string, number>} toolCountsByTurn
 * @property {Set<number>} forkedTurns
 * @property {Map<number, {reason: string, seq: number, time: number}>} turnEnds
 */

/**
 * @typedef {Object} CreationRecord
 * @property {string} callId
 * @property {'spawn_teammate'|'subagent'|'subagent_fork'} tool
 * @property {string} creatorSessionId
 * @property {boolean} failed
 * @property {string} [errorText]
 * @property {any} args                             JSON.parse(tool/call.arguments)
 * @property {any} [resultMember]                   spawn_teammate 的 tool/result.member
 * @property {string} [childSessionId]              subagent 产物 id
 * @property {string} [memberName]                  result.member.target / args.name
 * @property {number} time
 * @property {number} seq
 */

/**
 * @typedef {Object} TeamMemberRecord
 * @property {string} memberId
 * @property {string} name
 * @property {string} [description]
 * @property {string} [provider]
 * @property {'fresh'|'fork'} [context]
 * @property {'provisioning'|'active'|'failed'} phase
 * @property {number} time
 * @property {number} seq
 * @property {string} sessionId
 */

/**
 * @typedef {Object} CatalogRecord
 * @property {string} childId
 * @property {string} [label]
 * @property {'one-shot'|'continuable'|'external'|'unknown'} [mode]
 * @property {number} childCreatedAt
 * @property {number} time
 * @property {number} seq
 * @property {string} sessionId
 */

/**
 * @typedef {Object} DescriptorRecord
 * @property {string} sessionId
 * @property {string} [label]
 * @property {'one-shot'|'continuable'|'external'|'unknown'} [mode]
 * @property {string} [provider]
 * @property {string} [agentModel]
 * @property {string} [agentProvider]
 * @property {number} time
 * @property {number} seq
 */

/**
 * @typedef {Object} TaskSnapshotRecord
 * @property {string} teamId
 * @property {TaskCardTask} task
 * @property {number} time
 * @property {number} seq
 * @property {string} sessionId
 */

/**
 * @typedef {Object} TaskOpRecord
 * @property {string} taskId
 * @property {number} [revision]                     tool/result 里的新 revision（缺失时用 expected_revision+1）
 * @property {TaskAction} action
 * @property {string} actorSessionId
 * @property {string} [actorName]
 * @property {string} [ownerName]
 * @property {boolean} [ready]
 * @property {any} args
 * @property {number} callTime
 * @property {number} seq
 */


});
/* ── src/core/normalize.js ─────────────────────────────────────────── */
__def("src/core/normalize.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 事件 → ChannelMessage 归一化（§4.2 矩阵 / §4.2.1 入群 / §4.2.2 任务卡）
 *
 * 输入分两层：
 *  1) `normalizeEntries(entries, ctx)`：S1 信封层，只保留 `entry.type==='event'`，丢弃 transient（小数 seq）；
 *  2) `normalizeChannel(sessions, ctx)`：多会话 → 成员目录 → 归一化 → 入群/任务卡派生 → 去重 → 同发合并 → 排序 → 内存上限。
 *
 * 纯函数：不读 DOM / Cordis / Node API；不修改入参。
 * 所有「推断字段」缺失时退化为 unknown 并保留 rawText，禁止猜测后丢弃消息（§4.1 字段推导上位规则）。
 */

const { EVENT_TYPES, LIMITS, MEMBER_FALLBACK_NAME, MEMBER_PHASE_TO_STATUS, isContextSourceKind, SOURCE_KIND, SUBAGENT_TOOL_CONTEXT, TASK_ACTION_LABELS, TASK_STATUS_LABELS, TOOL_NAMES, TOOL_SUMMARY_ID_PREFIX, WELCOME_TEXT_TEMPLATE } = __req("src/core/constants.js");
const { parseParts } = __req("src/core/protocol.js");
const { deriveRoster } = __req("src/core/roster.js");
const { normalizeMemberStatus } = __req("src/core/roster.js");
const { capInMemory } = __req("src/core/paginate.js");
const { dedupeMessages, hashText, normalizeText } = __req("src/core/dedupe.js");
const { mergeFanout } = __req("src/core/fanout.js");
const { sortTimeline } = __req("src/core/timeline.js");

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./model.js').ChannelMember} ChannelMember
 * @typedef {import('./model.js').NormalizeContext} NormalizeContext
 * @typedef {import('./model.js').NormalizeDiagnostics} NormalizeDiagnostics
 * @typedef {import('./model.js').SessionInput} SessionInput
 * @typedef {import('./model.js').SessionBundle} SessionBundle
 */

/** 已知但群聊不需要派生消息的事件类型（其余记 unknownEvents） */
const KNOWN_IRRELEVANT_EVENTS = new Set([
  'step/start',
  'step/end',
  'turn/start',
  'system/message',
  'assistant/attempt',
  'goal/change',
  'schedule/change',
  'todo/write',
  'compaction/start',
  'compaction/end',
  'llm/retry',
  'llm/retry-started',
  'model/selection',
  'command/run',
  'command/done',
  'deliverables/presented',
  'team/message/queued',
  'team/message/delivered',
  'subagent/settled',
]);

/** 会话事件信封（S1）→ 原始事件。返回 null 表示 transient/无效。 */
/**
 * @param {any} entry
 * @returns {{event: any, transient: boolean} | null}
 */
function unwrapEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.type === 'event' && entry.event && typeof entry.event === 'object') {
    return { event: entry.event, transient: false };
  }
  if (entry.type === 'transient' && entry.event && typeof entry.event === 'object') {
    return { event: entry.event, transient: true };
  }
  if (typeof entry.type === 'string' && (typeof entry.seq === 'number' || entry.data !== undefined)) {
    return { event: entry, transient: false };
  }
  return null;
}

/**
 * 预处理窗口 entries：只保留持久事件（§4.2 第 3 条、S1）。
 * @param {any[]} entries
 * @returns {{events: any[], transientDropped: number, invalidDropped: number}}
 */
function normalizeEntries(entries) {
  /** @type {any[]} */
  const events = [];
  let transientDropped = 0;
  let invalidDropped = 0;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const unwrapped = unwrapEntry(entry);
    if (!unwrapped) {
      invalidDropped += 1;
      continue;
    }
    if (unwrapped.transient) {
      transientDropped += 1;
      continue;
    }
    events.push(unwrapped.event);
  }
  return { events, transientDropped, invalidDropped };
}

/**
 * 解析 JSON 字符串（失败返回 undefined，不抛错）
 * @param {unknown} input
 * @returns {any}
 */
function parseJsonSafe(input) {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return undefined;
    }
  }
  return input;
}

/**
 * 取 content 中的 text 块（丢弃 reasoning / tool-call）
 * @param {any} content
 * @returns {string[]}
 */
function textBlocks(content) {
  if (!Array.isArray(content)) return [];
  /** @type {string[]} */
  const out = [];
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string') out.push(block.text);
  }
  return out;
}

/**
 * 单个会话的采集结果（中间态）
 * @typedef {Object} SessionScan
 * @property {string} sessionId
 * @property {any} header
 * @property {number} cutoff
 * @property {any[]} events
 * @property {any[]} teamMembers
 * @property {any[]} catalogs
 * @property {any[]} descriptors
 * @property {any[]} taskSnapshots
 * @property {Map<string, any>} calls
 * @property {Map<string, any>} results
 * @property {any[]} userMsgs
 * @property {any[]} splices
 * @property {Map<number, any>} assistantCandidates
 * @property {Map<number, any>} turnEnds
 * @property {Set<number>} forkedTurns
 * @property {Map<number, number>} toolCounts
 * @property {Map<number, number>} toolFirstSeq
 * @property {any[]} deliverables
 * @property {number} firstUserSeq
 * @property {number} inheritedDropped
 * @property {number} unknownEvents
 * @property {number} forkedTurnsDropped
 * @property {number} ignoredSubagentPrompts
 * @property {number} ignoredSystemContext
 * @property {number} ignoredNotices
 * @property {number} emptyAgentOutput
 * @property {number} eventsSeen
 */

/**
 * 采集单个会话（不产出消息；名称解析延后到目录合成后）
 * @param {SessionInput} session
 * @returns {SessionScan}
 */
function collectSession(session) {
  const events = Array.isArray(session.events) ? session.events : [];
  const header = session.header ?? {};
  let cutoff = typeof session.cutoff === 'number' ? session.cutoff : -1;
  // fork/seed：客户端没有 ownEvents() → 用 session/end-seed 的 seq 作继承边界（§4.3.3 ②）
  for (const e of events) {
    if (e && e.type === EVENT_TYPES.endSeed && typeof e.seq === 'number' && e.seq > cutoff) cutoff = e.seq;
  }
  /** @type {SessionScan} */
  const scan = {
    sessionId: session.sessionId,
    header,
    cutoff,
    events: [],
    teamMembers: [],
    catalogs: [],
    descriptors: [],
    taskSnapshots: [],
    calls: new Map(),
    results: new Map(),
    userMsgs: [],
    splices: [],
    assistantCandidates: new Map(),
    turnEnds: new Map(),
    forkedTurns: new Set(),
    toolCounts: new Map(),
    toolFirstSeq: new Map(),
    toolLastTime: new Map(),
    deliverables: [],
    firstUserSeq: -1,
    inheritedDropped: 0,
    unknownEvents: 0,
    forkedTurnsDropped: 0,
    ignoredSubagentPrompts: 0,
    ignoredSystemContext: 0,
    ignoredNotices: 0,
    emptyAgentOutput: 0,
    eventsSeen: 0,
  };

  let currentTurn = -1;
  for (const e of events) {
    if (!e || typeof e.type !== 'string') continue;
    scan.eventsSeen += 1;
    if (cutoff >= 0 && typeof e.seq === 'number' && e.seq <= cutoff) {
      // 例外：subagent/descriptor 是会话自身身份（seeded 会话也保留），不当作继承消息丢弃
      if (e.type !== EVENT_TYPES.subagentDescriptor) {
        scan.inheritedDropped += 1;
        continue;
      }
    }
    if (e.type === EVENT_TYPES.endSeed) continue;
    scan.events.push(e);
    const data = e.data ?? {};
    switch (e.type) {
      case EVENT_TYPES.turnStart:
        currentTurn = Number(data.turn ?? currentTurn);
        break;
      case EVENT_TYPES.turnEnd: {
        const turn = Number(data.turn ?? currentTurn);
        const reason = data.reason?.kind ?? 'unknown';
        scan.turnEnds.set(turn, { reason, seq: Number(e.seq ?? 0), time: Number(e.time ?? 0) });
        if (reason === 'forked') {
          scan.forkedTurns.add(turn);
          scan.forkedTurnsDropped += 1;
        }
        break;
      }
      case EVENT_TYPES.assistantMessage: {
        const turn = Number(data.turn ?? currentTurn);
        const texts = textBlocks(data.message?.content);
        if (texts.length > 0 && texts.join('').trim() !== '') {
          scan.assistantCandidates.set(turn, {
            turn,
            seq: Number(e.seq ?? 0),
            time: Number(e.time ?? 0),
            step: data.step,
            texts,
          });
        }
        break;
      }
      case EVENT_TYPES.toolCall: {
        const turn = Number(data.turn ?? currentTurn);
        const call = {
          callId: String(data.callId ?? ''),
          name: String(data.name ?? ''),
          args: parseJsonSafe(data.arguments) ?? {},
          argsRaw: data.arguments,
          time: Number(e.time ?? 0),
          seq: Number(e.seq ?? 0),
          turn,
          step: data.step,
        };
        if (call.callId) scan.calls.set(call.callId, call);
        scan.toolCounts.set(turn, (scan.toolCounts.get(turn) ?? 0) + 1);
        if (!scan.toolFirstSeq.has(turn)) scan.toolFirstSeq.set(turn, call.seq);
        if (call.time > (scan.toolLastTime.get(turn) ?? 0)) scan.toolLastTime.set(turn, call.time);
        break;
      }
      case EVENT_TYPES.toolResult: {
        const callId = String(data.message?.toolCallId ?? data.callId ?? '');
        if (callId) {
          const texts = textBlocks(data.message?.content);
          const text = texts.join('\n');
          scan.results.set(callId, {
            callId,
            time: Number(e.time ?? 0),
            seq: Number(e.seq ?? 0),
            text,
            isError: data.message?.isError === true,
            parsed: parseJsonSafe(text),
          });
        }
        break;
      }
      case EVENT_TYPES.userMessage: {
        if (scan.firstUserSeq < 0) scan.firstUserSeq = Number(e.seq ?? 0);
        scan.userMsgs.push({ seq: Number(e.seq ?? 0), time: Number(e.time ?? 0), data });
        break;
      }
      case EVENT_TYPES.inboxSpliced: {
        const inserted = Array.isArray(data.inserted) ? data.inserted : [];
        if (inserted.length > 0) {
          scan.splices.push({
            seq: Number(e.seq ?? 0),
            time: Number(e.time ?? 0),
            target: data.target,
            inserted,
          });
        }
        break;
      }
      case EVENT_TYPES.teamMember: {
        const m = data.member ?? {};
        if (m.id) {
          scan.teamMembers.push({
            memberId: String(m.id),
            name: String(m.name ?? ''),
            description: typeof m.description === 'string' ? m.description : undefined,
            provider: typeof m.provider === 'string' ? m.provider : undefined,
            context: m.context === 'fork' ? 'fork' : m.context === 'fresh' ? 'fresh' : undefined,
            phase: m.phase === 'active' ? 'active' : m.phase === 'failed' ? 'failed' : 'provisioning',
            error: typeof m.error === 'string' ? m.error : undefined,
            time: Number(e.time ?? 0),
            seq: Number(e.seq ?? 0),
            sessionId: session.sessionId,
            teamId: data.teamId,
          });
        }
        break;
      }
      case EVENT_TYPES.subagentCatalog: {
        const childId = String(data.childId ?? '');
        if (childId) {
          scan.catalogs.push({
            childId,
            label: typeof data.label === 'string' ? data.label : undefined,
            mode: data.mode,
            childCreatedAt: Number(data.childCreatedAt ?? e.time ?? 0),
            time: Number(e.time ?? 0),
            seq: Number(e.seq ?? 0),
            sessionId: session.sessionId,
          });
        }
        break;
      }
      case EVENT_TYPES.subagentDescriptor: {
        scan.descriptors.push({
          sessionId: session.sessionId,
          label: typeof data.label === 'string' ? data.label : undefined,
          mode: data.mode,
          provider: typeof data.provider === 'string' ? data.provider : undefined,
          agentModel: typeof data.agentModel === 'string' ? data.agentModel : undefined,
          agentProvider: typeof data.agentProvider === 'string' ? data.agentProvider : undefined,
          time: Number(e.time ?? 0),
          seq: Number(e.seq ?? 0),
        });
        break;
      }
      case EVENT_TYPES.teamTask: {
        const task = data.task;
        if (task && task.id) {
          scan.taskSnapshots.push({
            teamId: String(data.teamId ?? ''),
            task: {
              id: String(task.id),
              revision: Number(task.revision ?? 1),
              subject: String(task.subject ?? ''),
              description: String(task.description ?? ''),
              status: task.status,
              ownerId: typeof task.ownerId === 'string' ? task.ownerId : undefined,
              blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy.map(String) : [],
              writeScopes: Array.isArray(task.writeScopes) ? task.writeScopes.map(String) : [],
            },
            time: Number(e.time ?? 0),
            seq: Number(e.seq ?? 0),
            sessionId: session.sessionId,
          });
        }
        break;
      }
      case EVENT_TYPES.deliverablesPresented: {
        scan.deliverables.push({
          seq: Number(e.seq ?? 0),
          time: Number(e.time ?? 0),
          files: extractFiles(data),
        });
        break;
      }
      default:
        if (!KNOWN_IRRELEVANT_EVENTS.has(e.type)) scan.unknownEvents += 1;
        break;
    }
  }
  return scan;
}

/**
 * 从 deliverables/presented 事件里尽力提取文件（形状 UNVERIFIED，按常见键兼容读取）
 * @param {any} data
 * @returns {{name: string, path: string}[]}
 */
function extractFiles(data) {
  if (!data || typeof data !== 'object') return [];
  const arrays = [data.files, data.deliverables, data.items, data.attachments].filter(Array.isArray);
  /** @type {{name: string, path: string}[]} */
  const out = [];
  for (const arr of arrays) {
    for (const item of arr) {
      if (typeof item === 'string') {
        out.push({ name: basename(item), path: item });
        continue;
      }
      if (item && typeof item === 'object') {
        const path = String(item.path ?? item.filePath ?? item.file ?? item.url ?? '');
        const name = String(item.name ?? item.title ?? (path ? basename(path) : ''));
        if (path || name) out.push({ name: name || basename(path), path });
      }
    }
  }
  return out;
}

/** @param {string} p */
function basename(p) {
  const s = String(p);
  const i = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
  return i >= 0 ? s.slice(i + 1) : s;
}

/**
 * @typedef {Object} MemberDirectory
 * @property {ChannelMember[]} members
 * @property {ChannelMember} lead
 * @property {(sessionId: string) => ChannelMember|undefined} resolve
 * @property {(sessionId: string) => string} nameOf
 * @property {(name: string) => ChannelMember|undefined} byName
 * @property {boolean} noRoster
 * @property {any} [truncated]
 */

/**
 * 合成成员目录：优先用 ctx.members（适配器已按 §4.8.2 合成），否则从扫描结果推导。
 * @param {SessionScan[]} scans
 * @param {NormalizeContext} ctx
 * @returns {MemberDirectory}
 */
function buildDirectory(scans, ctx) {
  const leadSessionId = ctx.leadSessionId;
  /** @type {Map<string, any>} */
  const descriptors = new Map();
  for (const scan of scans) for (const d of scan.descriptors) descriptors.set(scan.sessionId, d);

  // ① 事件名册：永远先建（team/member + subagent/catalog + descriptor + sessionSummaries）
  const eventRoster = buildEventRoster(scans, ctx, descriptors, leadSessionId);
  /** @type {ChannelMember[]} */
  let members = eventRoster.members;
  /** @type {any} */
  let derivedDegraded = eventRoster.degraded;
  /** @type {any} */
  let derivedTruncated = eventRoster.truncated;

  // ② authority roster（T2 传入的 agentTeam 投影）：按 sessionId 合并覆盖，保留事件名册里的 subagent
  const authority = Array.isArray(ctx.members)
    ? ctx.members
        .map((m) => {
          if (!m) return null;
          const sessionId = m.sessionId ?? m.id ?? m.target;
          if (!sessionId) return null;
          return { ...m, sessionId: String(sessionId), name: m.name ?? m.target ?? m.label };
        })
        .filter(Boolean)
    : [];
  if (authority.length > 0) {
    members = mergeAuthorityRoster(members, authority, leadSessionId);
    derivedDegraded = undefined; // 名册可用 → 不再标 degraded
  }

  const byId = new Map(members.map((m) => [m.sessionId, m]));
  let lead = members.find((m) => m.kind === 'lead') ?? members.find((m) => m.sessionId === leadSessionId);
  if (!lead) {
    lead = {
      sessionId: leadSessionId,
      name: 'lead',
      displayName: 'Lead',
      kind: /** @type {'lead'} */ ('lead'),
      depth: 0,
      status: /** @type {'running'} */ ('running'),
      addressable: true,
    };
    members.unshift(lead);
    byId.set(lead.sessionId, lead);
  }
  /** @type {Map<string, ChannelMember>} */
  const byName = new Map();
  for (const m of members) if (!byName.has(m.name)) byName.set(m.name, m);
  return {
    members,
    lead,
    noRoster: ctx.noRoster === true,
    degraded: derivedDegraded,
    truncated: derivedTruncated,
    resolve: (sessionId) => {
      if (!sessionId) return undefined;
      return byId.get(sessionId) ?? (sessionId === leadSessionId ? lead : undefined);
    },
    nameOf: (sessionId) => {
      const m = byId.get(sessionId);
      return m ? m.name : sessionId === leadSessionId ? 'lead' : MEMBER_FALLBACK_NAME;
    },
    byName: (name) => byName.get(String(name ?? '').replace(/^@/, '')),
  };
}

/**
 * 从事件流合成名册（不依赖 T2 投影；作为 authority roster 的底）
 * @param {SessionScan[]} scans
 * @param {NormalizeContext} ctx
 * @param {Map<string, any>} descriptors
 * @param {string} leadSessionId
 * @returns {{members: ChannelMember[], degraded: any, truncated: any}}
 */
function buildEventRoster(scans, ctx, descriptors, leadSessionId) {
  // 合成 agentTeam 投影（team/member 最新相位；model 从创建 result 补）
  const teamByName = new Map();
  for (const scan of scans) {
    for (const tm of scan.teamMembers) {
      teamByName.set(tm.name, tm);
      for (const call of scan.calls.values()) {
        if (call.name !== TOOL_NAMES.spawnTeammate || call.args?.name !== tm.name) continue;
        const res = scan.results.get(call.callId);
        const model = res?.parsed?.member?.model;
        if (typeof model === 'string') tm.model = model;
      }
    }
  }
  /** @type {any[]} */
  const sessionSummaries =
    Array.isArray(ctx.sessionSummaries) && ctx.sessionSummaries.length > 0
      ? ctx.sessionSummaries.map((summary) => ({
          id: String(summary.id ?? ''),
          parentSessionId: summary.parentSessionId,
          ...(typeof summary.running === 'boolean' ? { running: summary.running } : {}),
          ...(summary.status ? { status: summary.status } : {}),
        }))
      : scans.map((s) => ({
          id: s.sessionId,
          parentSessionId: s.header?.parentSession,
          status: 'inactive',
        }));
  const summaryById = new Map(sessionSummaries.map((s) => [String(s.id), s]));
  const leadSummary = summaryById.get(String(leadSessionId));
  /** @type {any[]} */
  const rosterMembers = [];
  for (const tm of teamByName.values()) {
    const summary = summaryById.get(String(tm.memberId));
    const phaseStatus = tm.phase === 'active' ? 'running' : tm.phase === 'failed' ? 'failed' : 'provisioning';
    // D-03：active 相位不等于 running；有真实运行态快照时以 running 为准
    const status =
      tm.phase === 'active' && summary && typeof summary.running === 'boolean'
        ? summary.running
          ? 'running'
          : 'inactive'
        : phaseStatus;
    rosterMembers.push({
      id: tm.memberId,
      name: tm.name,
      role: 'teammate',
      status,
      description: tm.description,
      model: tm.model,
    });
  }
  /** @type {any[]} */
  const catalogEntries = [];
  for (const scan of scans) {
    for (const c of scan.catalogs) {
      catalogEntries.push({ ...c, sessionId: scan.sessionId, parentSessionId: scan.sessionId });
    }
  }
  /** @type {Record<string, any>} */
  const descMap = {};
  for (const [sid, d] of descriptors) descMap[sid] = d;
  const roster = deriveRoster({
    leadSessionId,
    lead:
      leadSummary && typeof leadSummary.running === 'boolean'
        ? { status: leadSummary.running ? 'running' : 'inactive' }
        : {},
    agentTeam: { members: rosterMembers },
    catalogEntries,
    sessionSummaries,
    descriptors: descMap,
    noRoster: ctx.noRoster === true || rosterMembers.length === 0,
  });
  return { members: roster.members, degraded: roster.degraded, truncated: roster.truncated };
}

/**
 * authority roster（agentTeam 投影）按 sessionId 合并覆盖事件名册：
 *  - authority 优先 name/displayName/kind/status/description/model/addressable/parentSessionId；
 *  - 事件名册独有的成员（典型是 subagent）保留；
 *  - 排序 lead → teammate（authority 序优先）→ subagent（depth/事件序）。
 * @param {ChannelMember[]} eventMembers
 * @param {any[]} authorityMembers
 * @param {string} leadSessionId
 * @returns {ChannelMember[]}
 */
function mergeAuthorityRoster(eventMembers, authorityMembers, leadSessionId) {
  /** @type {Map<string, ChannelMember>} */
  const byId = new Map();
  /** @type {Map<string, number>} */
  const eventOrder = new Map();
  /** @type {Map<string, number>} */
  const authorityOrder = new Map();
  eventMembers.forEach((m, i) => {
    byId.set(m.sessionId, { ...m });
    eventOrder.set(m.sessionId, i);
  });
  authorityMembers.forEach((m, i) => authorityOrder.set(String(m.sessionId), i));
  const eventByName = new Map(eventMembers.map((m) => [m.name, m]));

  for (const raw of authorityMembers) {
    const sid = String(raw.sessionId);
    const prev = byId.get(sid);
    const kind = authorityKind(raw, prev);
    let name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name || isIdLikeName(name, sid)) {
      name = prev && prev.name && prev.name !== MEMBER_FALLBACK_NAME ? prev.name : '';
    }
    if (!name) {
      const textName = raw.description ? '' : '';
      name = textName || MEMBER_FALLBACK_NAME;
    }
    if (prev) {
      byId.set(sid, {
        ...prev,
        name,
        displayName: name,
        kind,
        status: raw.status ?? prev.status,
        description: typeof raw.description === 'string' ? raw.description : prev.description,
        model: typeof raw.model === 'string' ? raw.model : prev.model,
        addressable: typeof raw.addressable === 'boolean' ? raw.addressable : prev.addressable,
        parentSessionId: raw.parentSessionId ?? prev.parentSessionId,
        parentAvailable: typeof raw.parentAvailable === 'boolean' ? raw.parentAvailable : prev.parentAvailable,
        readable: raw.readable === false ? false : prev.readable,
      });
    } else {
      byId.set(sid, {
        sessionId: sid,
        name,
        displayName: name,
        kind,
        depth: typeof raw.depth === 'number' ? raw.depth : kind === 'lead' ? 0 : kind === 'teammate' ? 1 : 2,
        parentSessionId: raw.parentSessionId ?? (kind === 'teammate' ? leadSessionId : undefined),
        status: raw.status ?? 'unknown',
        description: typeof raw.description === 'string' ? raw.description : undefined,
        model: typeof raw.model === 'string' ? raw.model : undefined,
        addressable:
          typeof raw.addressable === 'boolean' ? raw.addressable : kind === 'lead' || kind === 'teammate',
        parentAvailable: typeof raw.parentAvailable === 'boolean' ? raw.parentAvailable : undefined,
        readable: raw.readable !== false,
      });
    }
  }

  /** @type {ChannelMember[]} */
  const list = [...byId.values()];
  const rank = (m) => (m.kind === 'lead' ? 0 : m.kind === 'teammate' ? 1 : 2);
  const tie = (m) =>
    authorityOrder.has(m.sessionId)
      ? authorityOrder.get(m.sessionId)
      : 1e6 + (eventOrder.get(m.sessionId) ?? 0);
  list.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 2 && (a.depth ?? 9) !== (b.depth ?? 9)) return (a.depth ?? 9) - (b.depth ?? 9);
    return tie(a) - tie(b);
  });

  // 重算 displayName 与派生字段（subagent 后缀要用合并后的父名）
  for (const m of list) {
    if (m.kind === 'lead') {
      m.displayName = 'Lead';
      m.depth = 0;
      if (!m.name) m.name = 'lead';
    } else if (m.kind === 'teammate') {
      m.displayName = m.name;
      if (typeof m.depth !== 'number') m.depth = 1;
    } else {
      const parent = m.parentSessionId ? byId.get(m.parentSessionId) : undefined;
      const parentName = parent ? parent.displayName || parent.name : MEMBER_FALLBACK_NAME;
      m.displayName = `${m.name} · ${parentName} 的子体`;
      if (typeof m.depth !== 'number') m.depth = (parent ? parent.depth : 1) + 1;
    }
    if (typeof m.addressable !== 'boolean') {
      m.addressable = m.kind === 'lead' || m.kind === 'teammate' || m.status === 'running' || m.status === 'provisioning';
    }
  }
  return list;
}

/**
 * @param {any} raw
 * @param {ChannelMember|undefined} prev
 * @returns {import('./model.js').MemberKind}
 */
function authorityKind(raw, prev) {
  const kind = String(raw.kind ?? '');
  if (kind === 'lead' || kind === 'teammate' || kind === 'subagent') return /** @type {any} */ (kind);
  if (raw.role === 'lead') return 'lead';
  if (raw.role === 'teammate') return 'teammate';
  return prev?.kind ?? 'teammate';
}

/**
 * 名字是否只是 sessionId 的截断（禁止把 id 当显示名）
 * @param {string} name
 * @param {string} sessionId
 * @returns {boolean}
 */
function isIdLikeName(name, sessionId) {
  const n = String(name).trim();
  if (!n) return true;
  if (sessionId && n === String(sessionId)) return true;
  if (sessionId && n.length >= 6 && String(sessionId).startsWith(n)) return true;
  return /^[0-9a-f]{8,}$/i.test(n);
}

/**
 * 发送者身份（缺失时退化为 unknown 且保留 rawText，不丢消息）
 * @param {MemberDirectory} dir
 * @param {string} sessionId
 * @param {{name?: string, kind?: string, unknown?: boolean}} [fallback]
 * @returns {import('./model.js').MessageSender}
 */
function senderOf(dir, sessionId, fallback = {}) {
  const m = dir.resolve(sessionId);
  if (m) return { sessionId, name: m.name, kind: m.kind };
  return {
    sessionId: sessionId || '',
    name: fallback.name ?? MEMBER_FALLBACK_NAME,
    kind: /** @type {any} */ (fallback.kind ?? 'teammate'),
  };
}

/**
 * 由 ctx.localBatches 反查 clientBatchId（按 requestId 精确优先，其次目标名）
 * @param {NormalizeContext} ctx
 * @param {string} rpcId
 * @param {string} sessionId
 * @param {string[]} targets
 * @returns {string|undefined}
 */
function getLocalBatches(source) {
  const batches = source && typeof source === 'object' ? source.localBatches : undefined;
  return batches && typeof batches === 'object' && !Array.isArray(batches) ? batches : {};
}

/**
 * 由 ctx.localBatches 反查 clientBatchId（H1 修复）
 *
 * - **有 rpcId**：只认 `requestIds` 精确匹配（禁止 sessionIds 兜底，避免把旧批次 TTL 内的无关消息误归并）；
 * - **无 rpcId**：必须同时满足 ① text hash 匹配 ② targets 集合完全一致 ③ 时间窗（默认 ±2min）；
 * - `closed:true` 的终态批次：仅允许 rpcId 精确匹配（晚到权威消息仍可替换 echo），不允许弱匹配。
 *
 * @param {NormalizeContext} ctx
 * @param {string|undefined} rpcId
 * @param {string} sessionId
 * @param {string[]} targets 目标名（不含 @）
 * @param {{text?: string, time?: number, windowMs?: number}} [extra]
 * @returns {string|undefined}
 */
function lookupBatchId(ctx, rpcId, sessionId, targets, extra = {}) {
  const batches = getLocalBatches(ctx);
  const list = Array.isArray(targets) ? targets.map((t) => String(t).replace(/^@/, '')) : [];
  const windowMs = Number.isFinite(extra.windowMs) ? Number(extra.windowMs) : LIMITS.localBatchFallbackWindowMs;
  const text = typeof extra.text === 'string' ? extra.text : '';
  const time = Number(extra.time);
  const textHash = text ? hashText(normalizeText(text)) : '';
  const extraChannelId = typeof extra.channelId === 'string' ? extra.channelId : '';
  for (const [key, batch] of Object.entries(batches)) {
    if (!batch) continue;
    const batchId = batch.clientBatchId ?? key;
    const requestIds = batch.requestIds ?? {};
    if (rpcId) {
      // H1：有 rpcId 只认精确 requestId（终态批次也允许，保证晚到权威消息替换 echo）
      if (Object.values(requestIds).includes(rpcId)) return batchId;
      continue;
    }
    if (batch.closed === true) continue; // 无 rpcId 的弱匹配不用于终态批次
    if (!textHash || !Number.isFinite(time)) continue;
    if (list.length === 0) continue;
    // R-WEAK：弱匹配必须同频道/同会话域，防止跨频道（历史/回放）误归并
    if (extraChannelId && typeof batch.channelId === 'string' && batch.channelId && batch.channelId !== extraChannelId) continue;
    if (Array.isArray(batch.sessionIds) && batch.sessionIds.length > 0 && sessionId && !batch.sessionIds.includes(sessionId)) continue;
    if (!Array.isArray(batch.targets) || batch.targets.length !== list.length) continue;
    const sameTargets = batch.targets.every((t) => list.includes(String(t).replace(/^@/, '')));
    if (!sameTargets) continue;
    const batchHash =
      typeof batch.textHash === 'string'
        ? batch.textHash
        : typeof batch.text === 'string'
          ? hashText(normalizeText(batch.text))
          : '';
    if (!batchHash || batchHash !== textHash) continue;
    const batchAt = Number(batch.at ?? batch.createdAt ?? batch.sentAt ?? batch.time);
    if (!Number.isFinite(batchAt) || Math.abs(time - batchAt) > windowMs) continue;
    return batchId;
  }
  return undefined;
}

/**
 * 一个会话产出基础消息（不含入群卡/任务卡）
 * @param {SessionScan} scan
 * @param {MemberDirectory} dir
 * @param {NormalizeContext} ctx
 * @returns {SessionBundle}
 */
function emitSessionMessages(scan, dir, ctx) {
  const sid = scan.sessionId;
  const leadSessionId = ctx.leadSessionId;
  /** @type {ChannelMessage[]} */
  const messages = [];
  /** @type {Map<string, ChannelMessage>} */
  const byDataId = new Map();
  const self = dir.resolve(sid);
  const selfName = self ? self.name : sid === leadSessionId ? 'lead' : MEMBER_FALLBACK_NAME;
  const selfKind = self ? self.kind : 'teammate';

  /** @type {import('./model.js').MessageSender} */
  const selfSender = { sessionId: sid, name: selfName, kind: /** @type {any} */ (selfKind) };

  // ── user/message ────────────────────────────────────────────────
  for (const um of scan.userMsgs) {
    const data = um.data ?? {};
    const source = data.source ?? {};
    const parts = textBlocks(data.content);
    const fullText = parts.join('\n');
    const proto = parseParts(parts);
    const kind = String(source.kind ?? '');
    const rpcId = typeof source.rpcId === 'string' ? source.rpcId : undefined;

    // D-01：宿主注入的系统上下文（工作区指令 / 运行时上下文 / skill 目录 / 时间 / 后台任务 / system-prompt）
    // 不是群聊发言，直接丢弃；真正未知的 kind 仍走下方「不崩、原样展示、标记 unknown」兜底（UT-08）。
    if (isContextSourceKind(kind)) {
      scan.ignoredSystemContext += 1;
      continue;
    }

    // 通用兜底：宿主通知类注入（`form:'notice'` 且带 senderSessionId）不是用户发言，直接丢弃；
    // 真正用户消息（kind=user/空、无 notice form）不受影响。
    if (String(source.form ?? '') === 'notice' && String(source.senderSessionId ?? source.senderId ?? '')) {
      scan.ignoredNotices += 1;
      continue;
    }

    if (kind === SOURCE_KIND.user || kind === '') {
      const isChild = sid !== leadSessionId;
      if (!rpcId && isChild) {
        scan.ignoredSubagentPrompts += 1;
        if (ctx.emitSubagentPrompt) {
          messages.push(makeMessage({
            id: `s:${sid}:${um.seq}:prompt`,
            kind: 'system',
            sessionId: sid,
            sender: selfSender,
            time: um.time,
            seq: um.seq,
            text: fullText,
            meta: { event: 'subagent-prompt' },
          }));
        }
        continue;
      }
      const targets = proto.ok ? proto.targets : [];
      const batchId = lookupBatchId(ctx, rpcId, sid, targets, {
      text: proto.ok ? proto.text : fullText,
      time: um.time,
      channelId: leadSessionId,
    });
      const msg = makeMessage({
        id: `u:${sid}:${String(data.id ?? um.seq)}`,
        kind: 'user',
        sessionId: sid,
        sender: { sessionId: sid, name: 'user', kind: /** @type {'user'} */ ('user') },
        time: um.time,
        seq: um.seq,
        text: proto.ok ? proto.text : fullText,
        targets,
        targetSessionIds: proto.ok ? targets.map((t) => targetSessionId(dir, t, leadSessionId)).filter(Boolean) : [],
        meta: {
          ...(rpcId ? { rpcId } : {}),
          ...(proto.ok ? { fanout: true, declaredCount: proto.declaredCount, prefixParseOk: true } : {}),
          sourceKind: kind || 'user',
          ...(batchId ? { clientBatchId: batchId } : {}),
          ...(data.id ? { messageId: String(data.id) } : {}),
        },
      });
      if (proto.ok && fullText !== proto.text) msg.rawText = fullText;
      if (batchId) msg.clientBatchId = batchId;
      messages.push(msg);
      if (data.id) byDataId.set(String(data.id), msg);
      continue;
    }

    if (kind === SOURCE_KIND.agentMessage || kind === SOURCE_KIND.teamMessage) {
      const prefixName = prefixSenderName(parts);
      const senderSessionId = String(source.senderSessionId ?? source.senderId ?? '');
      const sender = senderOf(dir, senderSessionId, {
        name: typeof source.senderName === 'string' ? source.senderName : prefixName,
        kind: 'teammate',
        unknown: true,
      });
      if (typeof source.senderName === 'string' && senderSessionId) sender.name = source.senderName;
      const body = stripTeamPrefix(parts);
      const messageId = typeof source.messageId === 'string' ? source.messageId : undefined;
      const msg = makeMessage({
        id: messageId ? `m:${messageId}` : `u:${sid}:${String(data.id ?? um.seq)}`,
        kind: 'agent_to_agent',
        sessionId: sid,
        sender,
        targets: [selfName],
        targetSessionIds: [sid],
        time: um.time,
        seq: um.seq,
        text: body,
        meta: {
          sourceKind: kind,
          ...(messageId ? { messageId } : {}),
          ...(prefixName && !dir.resolve(senderSessionId) ? { senderNameFromText: prefixName } : {}),
          ...(source.teamId ? { teamId: String(source.teamId) } : {}),
        },
      });
      if (fullText !== body) msg.rawText = fullText;
      messages.push(msg);
      if (data.id) byDataId.set(String(data.id), msg);
      continue;
    }

    // 未知 source.kind：不崩、原样展示、标 unknown（§4.2 细节 2）
    messages.push(makeMessage({
      id: `s:${sid}:${um.seq}`,
      kind: 'system',
      sessionId: sid,
      sender: selfSender,
      time: um.time,
      seq: um.seq,
      text: fullText,
      meta: { unknownSource: true, sourceKind: kind },
    }));
  }

  // ── inbox spliced 元数据 + 仅 spliced 的双写兜底 ─────────────────
  for (const sp of scan.splices) {
    for (const item of sp.inserted) {
      const itemId = String(item?.id ?? '');
      if (!itemId) continue;
      const existing = byDataId.get(itemId);
      if (existing) {
        existing.meta = {
          ...(existing.meta ?? {}),
          ...(sp.target ? { inboxTarget: sp.target } : {}),
          deliveryTime: sp.time,
        };
        continue;
      }
      // 双写缺失（异常构建）时才从 spliced 兜底出一条，标 fromSpliced
      const parts = textBlocks(item.content);
      const source = item.source ?? {};
      if (source.kind === SOURCE_KIND.user) {
        const proto = parseParts(parts);
        const msg = makeMessage({
          id: `u:${sid}:${itemId}`,
          kind: 'user',
          sessionId: sid,
          sender: { sessionId: sid, name: 'user', kind: /** @type {'user'} */ ('user') },
          time: sp.time,
          seq: sp.seq,
          text: proto.ok ? proto.text : parts.join('\n'),
          targets: proto.ok ? proto.targets : [],
          meta: { fromSpliced: true, inboxTarget: sp.target, messageId: itemId, sourceKind: source.kind },
        });
        messages.push(msg);
      }
    }
  }

  // ── assistant 输出（每 turn 末段，口径 A） ──────────────────────
  /** @type {Set<number>} */
  const emittedOutputTurns = new Set();
  for (const [turn, cand] of scan.assistantCandidates) {
    if (scan.forkedTurns.has(turn)) continue;
    // F31：空/纯空白文本的 agent_output 不产出（纯工具轮次走下方 M6 摘要，主 feed 不得出现空气泡）
    const outputText = cand.texts.join('\n');
    if (outputText.trim() === '') continue;
    const id = `a:${sid}:turn:${turn}`;
    const toolCount = scan.toolCounts.get(turn) ?? 0;
    const end = scan.turnEnds.get(turn);
    messages.push(makeMessage({
      id,
      kind: 'agent_output',
      sessionId: sid,
      sender: selfSender,
      time: cand.time,
      seq: cand.seq,
      turn,
      isFinal: end ? end.reason === 'completed' : false,
      text: outputText,
      toolCallCount: ctx.toolFold === 'delivery' || ctx.toolFold === 'none' ? undefined : toolCount || undefined,
      meta: {
        ...(end ? { turnEndReason: end.reason } : { turnOpen: true }),
      },
    }));
    emittedOutputTurns.add(turn);
    // F31/v1.7.2：有文本输出的中断/失败保留「气泡 + 中断提示」；提示文案由 UI i18n 渲染（meta 驱动）
    if (end && end.reason !== 'completed') {
      messages.push(makeMessage({
        id: `s:${sid}:${end.seq}:turn-end`,
        kind: 'system',
        sessionId: sid,
        sender: selfSender,
        time: end.time,
        seq: end.seq,
        text: '',
        meta: { event: 'turn-interrupted', turnEndReason: end.reason, turn },
      }));
    }
  }

  // F31 诊断：无最终文本输出的 turn（纯工具/空完成/空中断）计数，不受过滤影响轨迹聚合
  /** @type {Set<number>} */
  const turnUniverse = new Set([
    ...scan.assistantCandidates.keys(),
    ...scan.turnEnds.keys(),
    ...scan.toolCounts.keys(),
  ]);
  for (const turn of turnUniverse) {
    if (scan.forkedTurns.has(turn)) continue;
    if (!emittedOutputTurns.has(turn)) scan.emptyAgentOutput += 1;
  }

  // ── M6 工具过程：无文本输出的 turn 出独立摘要（Lead 约束 2026-10-28） ──
  for (const [turn, count] of scan.toolCounts) {
    if (count <= 0) continue;
    const cand = scan.assistantCandidates.get(turn);
    const hasText = cand && cand.texts.join('').trim() !== '';
    const firstSeq = scan.toolFirstSeq.get(turn) ?? 0;
    if (hasText && ctx.toolFold !== 'delivery') {
      const out = messages.find((m) => m.id === `a:${sid}:turn:${turn}`);
      if (out) out.toolCallCount = count;
      continue;
    }
    const end = scan.turnEnds.get(turn);
    messages.push(makeMessage({
      id: `${TOOL_SUMMARY_ID_PREFIX}${sid}:${turn}:${firstSeq}`,
      kind: 'delivery',
      sessionId: sid,
      sender: selfSender,
      time: end ? end.time : (cand?.time ?? scan.toolLastTime.get(turn) ?? 0),
      seq: firstSeq,
      toolCallCount: count,
      text: '',
      meta: { toolSummary: true, turn },
    }));
  }

  // ── 文件交付（M5；形状 UNVERIFIED） ────────────────────────────
  for (const d of scan.deliverables) {
    if (!d.files || d.files.length === 0) continue;
    messages.push(makeMessage({
      id: `d:${sid}:${d.seq}`,
      kind: 'delivery',
      sessionId: sid,
      sender: selfSender,
      time: d.time,
      seq: d.seq,
      text: '',
      files: d.files,
      meta: { needsShapeVerification: true },
    }));
  }

  return {
    sessionId: sid,
    messages,
    creations: buildCreations(scan),
    taskSnapshots: scan.taskSnapshots,
    taskOps: buildTaskOps(scan),
    teamMembers: scan.teamMembers,
    catalogs: scan.catalogs,
    descriptors: scan.descriptors,
    spliced: buildSplicedMap(scan),
    toolCountsByTurn: scan.toolCounts,
    forkedTurns: scan.forkedTurns,
    turnEnds: scan.turnEnds,
  };
}

/**
 * @param {any} fields
 * @returns {ChannelMessage}
 */
function makeMessage(fields) {
  let text = typeof fields.text === 'string' ? fields.text : '';
  let truncated = fields.truncated === true;
  let textOriginalLength;
  if (text.length > LIMITS.textRender) {
    textOriginalLength = text.length;
    text = text.slice(0, LIMITS.textRender);
    truncated = true;
  }
  return {
    id: String(fields.id),
    kind: fields.kind,
    sessionId: String(fields.sessionId ?? ''),
    sender: fields.sender ?? { sessionId: '', name: '', kind: 'system' },
    targets: Array.isArray(fields.targets) ? fields.targets : [],
    targetSessionIds: Array.isArray(fields.targetSessionIds) ? fields.targetSessionIds : [],
    text,
    time: Number(fields.time ?? 0),
    seq: Number(fields.seq ?? 0),
    turn: fields.turn,
    isFinal: fields.isFinal === true,
    files: fields.files,
    toolCallCount: fields.toolCallCount,
    systemReason: fields.systemReason,
    delivery: fields.delivery,
    deliveries: fields.deliveries,
    clientBatchId: fields.clientBatchId,
    truncated: truncated || undefined,
    meta: textOriginalLength ? { ...(fields.meta ?? {}), textOriginalLength } : fields.meta,
    memberCard: fields.memberCard,
    taskCard: fields.taskCard,
    creationId: fields.creationId,
    pairOrder: fields.pairOrder,
  };
}

/**
 * 构建创建记录（spawn_teammate / subagent / subagent_fork）
 * @param {SessionScan} scan
 * @returns {import('./model.js').CreationRecord[]}
 */
function buildCreations(scan) {
  /** @type {import('./model.js').CreationRecord[]} */
  const out = [];
  for (const call of scan.calls.values()) {
    if (call.name !== TOOL_NAMES.spawnTeammate && call.name !== TOOL_NAMES.subagent && call.name !== TOOL_NAMES.subagentFork) continue;
    const res = scan.results.get(call.callId);
    const record = {
      callId: call.callId,
      tool: call.name,
      creatorSessionId: scan.sessionId,
      failed: res ? res.isError === true : false,
      errorText: res?.isError ? res.text : undefined,
      args: call.args ?? {},
      time: call.time,
      seq: call.seq,
      memberName: call.args?.name ?? call.args?.description,
    };
    if (res && !res.isError) {
      if (call.name === TOOL_NAMES.spawnTeammate) {
        const member = res.parsed?.member ?? res.parsed;
        if (member && typeof member === 'object') record.resultMember = member;
        record.memberName = record.resultMember?.target ?? call.args?.name;
      } else {
        record.childSessionId = res.parsed?.subagentId ?? parseStartedSubagent(res.text);
      }
    }
    out.push(record);
  }
  return out;
}

/**
 * 构建任务操作记录（team_task_create / team_task_update）
 * @param {SessionScan} scan
 * @returns {import('./model.js').TaskOpRecord[]}
 */
function buildTaskOps(scan) {
  /** @type {import('./model.js').TaskOpRecord[]} */
  const out = [];
  for (const call of scan.calls.values()) {
    if (call.name !== TOOL_NAMES.taskCreate && call.name !== TOOL_NAMES.taskUpdate) continue;
    const res = scan.results.get(call.callId);
    if (res?.isError) continue;
    const view = res?.parsed;
    const args = call.args ?? {};
    const taskId = String(view?.id ?? args.task_id ?? args.taskId ?? '');
    if (!taskId) continue;
    const revision = Number(view?.revision ?? (Number(args.expected_revision) + 1));
    const action = call.name === TOOL_NAMES.taskCreate ? 'create' : String(args.action ?? 'edit');
    out.push({
      taskId,
      revision: Number.isFinite(revision) ? revision : undefined,
      action: /** @type {any} */ (action),
      actorSessionId: scan.sessionId,
      ownerName: typeof view?.ownerName === 'string' ? view.ownerName : undefined,
      ready: typeof view?.ready === 'boolean' ? view.ready : undefined,
      args,
      callTime: call.time,
      seq: call.seq,
    });
  }
  return out;
}

/** @param {SessionScan} scan */
function buildSplicedMap(scan) {
  /** @type {Map<string, {target?: string, time?: number}>} */
  const map = new Map();
  for (const sp of scan.splices) {
    for (const item of sp.inserted) {
      const id = String(item?.id ?? '');
      if (id) map.set(id, { target: sp.target, time: sp.time });
    }
  }
  return map;
}

/**
 * `Team message(?: <messageId>)? from <name>:` 前缀发送者名
 * @param {string[]} parts
 * @returns {string|undefined}
 */
function prefixSenderName(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return undefined;
  const m = /^Team message(?: \S+)? from (.+?):$/.exec(parts[0]);
  return m ? m[1] : undefined;
}

/**
 * 剥离 peer 前缀（`Team message … from X:`），保留其余 text 块
 * @param {string[]} parts
 * @returns {string}
 */
function stripTeamPrefix(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return '';
  if (/^Team message(?: \S+)? from .+?:$/.test(parts[0])) return parts.slice(1).join('\n');
  return parts.join('\n');
}

/**
 * subagent-settled 的 closing message 正文（用于与子会话 agent_output 去重）
 * @param {string[]} parts
 * @returns {string}
 */
function settlementClosingText(parts) {
  const list = Array.isArray(parts) ? parts : [];
  const idx = list.findIndex((p) => p === 'Its closing message:');
  if (idx < 0) return '';
  return list.slice(idx + 1).join('\n');
}

/**
 * @param {string} text
 * @returns {string|undefined}
 */
function parseStartedSubagent(text) {
  const m = /started subagent\s+(\S+)/.exec(String(text ?? ''));
  return m ? m[1] : undefined;
}

/**
 * 目标名 → sessionId（lead 用 channelId）
 * @param {MemberDirectory} dir
 * @param {string} name
 * @param {string} leadSessionId
 * @returns {string}
 */
function targetSessionId(dir, name, leadSessionId) {
  if (name === 'lead') return leadSessionId;
  const m = dir.byName(name);
  return m ? m.sessionId : '';
}

/**
 * 归一化一个频道（多会话）
 * @param {SessionInput[]} sessions
 * @param {NormalizeContext} ctx
 * @returns {{messages: ChannelMessage[], diagnostics: NormalizeDiagnostics, members: ChannelMember[]}}
 */
function normalizeChannel(sessions, ctx) {
  const list = Array.isArray(sessions) ? sessions : [];
  const leadSessionId = ctx.leadSessionId ?? list[0]?.sessionId ?? '';
  const context = { ...ctx, leadSessionId };
  /** @type {NormalizeDiagnostics} */
  const diagnostics = {
    sessions: list.length,
    events: 0,
    transientDropped: 0,
    inheritedDropped: 0,
    forkedTurnsDropped: 0,
    unknownEvents: 0,
    ignoredSubagentPrompts: 0,
    ignoredSystemContext: 0,
    ignoredNotices: 0,
    emptyAgentOutput: 0,
    duplicatesRemoved: 0,
    fanoutMerged: 0,
    memberCards: 0,
    taskCards: 0,
    settlementsDropped: 0,
    memoryTrimmed: 0,
    truncated: false,
    warnings: [],
  };

  /** @type {SessionScan[]} */
  const scans = [];
  for (const s of list) {
    if (!s || !s.sessionId) continue;
    // 兼容两种输入：裸事件数组 / S1 信封数组（只消费 type==='event'，丢弃 transient）
    const pre = normalizeEntries(s.events);
    diagnostics.transientDropped += pre.transientDropped;
    const scan = collectSession({ ...s, events: pre.events });
    diagnostics.events += scan.eventsSeen;
    diagnostics.inheritedDropped += scan.inheritedDropped;
    diagnostics.unknownEvents += scan.unknownEvents;
    diagnostics.forkedTurnsDropped += scan.forkedTurnsDropped;
    scans.push(scan);
  }
  const dir = buildDirectory(scans, context);
  const bundles = scans.map((scan) => emitSessionMessages(scan, dir, context));
  // ignoredSubagentPrompts / ignoredSystemContext 在 emit 阶段累加，故必须在 emit 之后再汇总
  for (const scan of scans) {
    diagnostics.ignoredSubagentPrompts += scan.ignoredSubagentPrompts;
    diagnostics.ignoredSystemContext += scan.ignoredSystemContext;
    diagnostics.ignoredNotices += scan.ignoredNotices;
    diagnostics.emptyAgentOutput += scan.emptyAgentOutput;
  }

  /** @type {ChannelMessage[]} */
  let messages = bundles.flatMap((b) => b.messages);
  const memberCards = buildMemberCards(scans, bundles, dir, context);
  const taskCards = buildTaskCards(scans, bundles, dir, context);
  diagnostics.memberCards = memberCards.length / 2; // 一组 = 欢迎 + 卡片
  diagnostics.taskCards = taskCards.length;
  messages.push(...memberCards, ...taskCards);

  const deduped = dedupeMessages(messages, {
    leadSessionId,
    weakWindowMs: LIMITS.weakKeyTimeWindowMs,
  });
  diagnostics.duplicatesRemoved = deduped.removed;
  diagnostics.settlementsDropped = deduped.settlementsDropped;

  const fanout = mergeFanout(deduped.messages, {
    leadSessionId,
    weakWindowMs: LIMITS.fanoutTimeWindowMs,
  });
  diagnostics.fanoutMerged = fanout.merged;

  let sorted = sortTimeline(fanout.messages);
  const capped = capInMemory(sorted, context.maxMessages ?? LIMITS.maxMessagesInMemory, LIMITS.memoryKeepHead);
  if (capped.trimmed) {
    diagnostics.memoryTrimmed = capped.dropped;
    diagnostics.warnings.push('memory-trimmed');
  }
  diagnostics.truncated = Boolean(capped.trimmed);
  if (dir.degraded) diagnostics.warnings.push(`degraded:${dir.degraded}`);
  return {
    messages: capped.messages,
    diagnostics,
    members: dir.members,
    degraded: dir.degraded,
    truncated: dir.truncated,
  };
}

/**
 * 入群消息（欢迎提示 + creator 带卡消息，§4.2.1 V1.4）与任务卡（§4.2.2 V1.6）
 * @param {SessionScan[]} scans
 * @param {SessionBundle[]} bundles
 * @param {MemberDirectory} dir
 * @param {NormalizeContext} ctx
 */
function buildMemberCards(scans, bundles, dir, ctx) {
  const leadSessionId = ctx.leadSessionId;
  /** @type {Map<string, {memberId: string, teamMembers: any[], catalogs: any[], creations: any[], descriptor?: any}>} */
  const groups = new Map();
  const group = (memberId) => {
    const key = String(memberId);
    if (!groups.has(key)) groups.set(key, { memberId: key, teamMembers: [], catalogs: [], creations: [] });
    return groups.get(key);
  };
  for (const scan of scans) {
    for (const tm of scan.teamMembers) group(tm.memberId).teamMembers.push({ ...tm, creatorSessionId: scan.sessionId });
    for (const cat of scan.catalogs) group(cat.childId).catalogs.push({ ...cat, creatorSessionId: scan.sessionId });
    for (const d of scan.descriptors) {
      const g = group(scan.sessionId);
      g.descriptor = d;
    }
  }
  for (const b of bundles) {
    for (const cr of b.creations) {
      // 关联 memberSessionId：teammate 用 team/member.name；subagent 用 childId
      let memberId = cr.childSessionId ?? '';
      if (!memberId) {
        for (const scan of scans) {
          const tm = scan.teamMembers.find((m) => m.name === cr.memberName);
          if (tm) {
            memberId = tm.memberId;
            break;
          }
        }
      }
      if (!memberId) {
        for (const scan of scans) {
          const cat = scan.catalogs.find((c) => c.label && cr.args?.description && c.label === cr.args.description);
          if (cat) {
            memberId = cat.childId;
            break;
          }
        }
      }
      if (!memberId) continue;
      group(memberId).creations.push(cr);
    }
  }

  /** @type {ChannelMessage[]} */
  const out = [];
  for (const g of groups.values()) {
    const teammate = g.teamMembers.length > 0;
    const active = [...g.teamMembers].reverse().find((m) => m.phase === 'active');
    const failedTeam = g.teamMembers.some((m) => m.phase === 'failed');
    const anyCreation = g.creations[0];
    if (teammate) {
      // UT-39：等 active 再出；创建失败不出卡
      if (!active) continue;
      if (failedTeam) continue;
    } else {
      // subagent：catalog 触发；创建失败不出卡
      if (g.catalogs.length === 0) continue;
      if (anyCreation?.failed) continue;
    }
    const catalog = g.catalogs[0];
    const creation = g.creations[0];
    const descriptor = g.descriptor ?? [];
    const memberSessionId = g.memberId;
    const displayNameRaw = teammate
      ? active.name
      : (catalog?.label ?? descriptorLabel(descriptor) ?? creation?.args?.description ?? MEMBER_FALLBACK_NAME);
    const name = String(displayNameRaw || MEMBER_FALLBACK_NAME);
    const anchorTime = teammate ? Number(active.time) : Number(catalog?.childCreatedAt ?? creation?.time ?? 0);
    const anchorSeq = teammate ? Number(active.seq) : Number(catalog?.seq ?? creation?.seq ?? 0);
    const anchorSessionId = teammate ? active.sessionId : String(catalog?.creatorSessionId ?? creation?.creatorSessionId ?? leadSessionId);

    // creator：spawn_teammate 恒 lead；subagent = 调用方成员
    let creatorSessionId = leadSessionId;
    let creatorName = 'lead';
    let creatorKind = 'lead';
    if (!teammate) {
      creatorSessionId = String(catalog?.creatorSessionId ?? creation?.creatorSessionId ?? leadSessionId);
      const cm = dir.resolve(creatorSessionId);
      creatorName = cm ? cm.name : creatorSessionId === leadSessionId ? 'lead' : MEMBER_FALLBACK_NAME;
      creatorKind = cm ? cm.kind : creatorSessionId === leadSessionId ? 'lead' : 'teammate';
    }
    const memberEntry = dir.resolve(memberSessionId);

    const description = threeWay(creation?.args?.description, active?.description, catalog?.label ?? descriptorLabel(descriptor));
    const modelInfo = resolveModel({ teammate, creation, descriptor, memberEntry, creatorName });
    const contextPolicy = teammate
      ? (creation?.args?.context === 'fork' ? 'fork' : creation?.args?.context === 'fresh' ? 'fresh' : active?.context === 'fork' ? 'fork' : active?.context === 'fresh' ? 'fresh' : 'unknown')
      : (SUBAGENT_TOOL_CONTEXT[creation?.tool] ?? (descriptor?.provider === 'fork' ? 'fork' : descriptor?.provider === 'spawn' ? 'fresh' : 'unknown'));
    const lifecycleMode = teammate ? 'unknown' : mapLifecycleMode(descriptor?.mode);
    const promptFull = typeof creation?.args?.prompt === 'string' ? creation.args.prompt : undefined;
    const promptExcerpt = promptFull ? excerptPrompt(promptFull) : undefined;
    const state = teammate
      ? mapLifecycle(active.phase)
      : memberEntry ? normalizeMemberStatus(memberEntry.status) : 'unknown';
    const canRead = typeof ctx.canRead === 'function' ? ctx.canRead(memberSessionId) !== false : true;
    /** @type {import('./model.js').MemberCardPayload} */
    const payload = {
      id: `mc:${memberSessionId}`,
      member: {
        sessionId: memberSessionId,
        name,
        kind: teammate ? 'teammate' : 'subagent',
        parentName: teammate ? undefined : creatorName,
        description,
        model: modelInfo.model,
        modelInheritedFrom: modelInfo.inheritedFrom,
        modelSource: modelInfo.source,
        contextPolicy: /** @type {any} */ (contextPolicy),
        lifecycleMode: /** @type {any} */ (lifecycleMode),
        createTool: creation?.tool ?? 'unknown',
        promptExcerpt,
        promptFull: promptFull ? truncateText(promptFull, LIMITS.textStore) : undefined,
        state: /** @type {any} */ (state),
      },
      time: anchorTime,
      actions: {
        viewSession: canRead ? 'enabled' : 'disabled',
        ...(teammate ? { viewTask: /** @type {'enabled'|'disabled'} */ (canRead ? 'enabled' : 'disabled') } : {}),
        ...(canRead ? {} : { reason: 'no-permission' }),
      },
      trigger: teammate ? 'team-member-active' : 'subagent-catalog',
    };
    const creationId = `mc:${memberSessionId}`;
    out.push(makeMessage({
      id: `${creationId}:welcome`,
      kind: 'system',
      sessionId: anchorSessionId,
      sender: senderOf(dir, creatorSessionId),
      time: anchorTime,
      seq: anchorSeq,
      text: WELCOME_TEXT_TEMPLATE.replace('{name}', name),
      systemReason: 'member-welcome',
      creationId,
      pairOrder: 0,
      meta: { memberName: name, memberSessionId, memberKind: teammate ? 'teammate' : 'subagent' },
    }));
    out.push(makeMessage({
      id: creationId,
      kind: 'member_card',
      sessionId: anchorSessionId,
      sender: senderOf(dir, creatorSessionId),
      time: anchorTime,
      seq: anchorSeq,
      text: '',
      memberCard: payload,
      creationId,
      pairOrder: 1,
      meta: { memberName: name, memberKind: teammate ? 'teammate' : 'subagent' },
    }));
  }
  return out;
}

/**
 * @param {SessionScan[]} scans
 * @param {SessionBundle[]} bundles
 * @param {MemberDirectory} dir
 * @param {NormalizeContext} ctx
 */
function buildTaskCards(scans, bundles, dir, ctx) {
  const leadSessionId = ctx.leadSessionId;
  /** @type {Map<string, import('./model.js').TaskSnapshotRecord>} */
  const snapshots = new Map();
  for (const b of bundles) {
    for (const task of b.taskSnapshots) {
      snapshots.set(`${task.task.id}:${task.task.revision}`, task);
    }
  }
  /** @type {Map<string, import('./model.js').TaskOpRecord>} */
  const ops = new Map();
  for (const b of bundles) {
    for (const op of b.taskOps) {
      if (typeof op.revision !== 'number') continue;
      ops.set(`${op.taskId}:${op.revision}`, op);
    }
  }
  /** @type {import('./model.js').TaskOpRecord[]} */
  const allOps = bundles.flatMap((b) => b.taskOps);
  const usedOps = new Set();
  /** @type {ChannelMessage[]} */
  const out = [];
  for (const snapshot of snapshots.values()) {
    const task = snapshot.task;
    const key = `${task.id}:${task.revision}`;
    const teamId = snapshot.teamId || leadSessionId;
    let op = ops.get(key);
    let source = /** @type {import('./model.js').ActorSource} */ ('paired');
    if (op) {
      usedOps.add(op);
    } else {
      // 二级回退：同 taskId 且时间近邻（<1s），注意 journal 比 result 早 3–128ms
      op = allOps.find(
        (o) => o.taskId === task.id && !usedOps.has(o) && Math.abs(snapshot.time - o.callTime) < LIMITS.taskNeighborWindowMs,
      );
      if (op) {
        usedOps.add(op);
        source = 'time-neighbor';
      }
    }
    let actor = op ? { sessionId: op.actorSessionId, name: dir.nameOf(op.actorSessionId), kind: /** @type {any} */ (dir.resolve(op.actorSessionId)?.kind ?? 'teammate') } : null;
    if (!actor && task.ownerId) {
      // 三级回退：owner 反推
      const owner = dir.resolve(task.ownerId);
      actor = { sessionId: task.ownerId, name: owner ? owner.name : MEMBER_FALLBACK_NAME, kind: /** @type {any} */ (owner?.kind ?? 'teammate') };
      source = 'owner-inferred';
    }
    if (!actor) {
      actor = { sessionId: '', name: '系统', kind: 'system' };
      source = 'system-fallback';
    }
    const ownerName = op?.ownerName ?? (task.ownerId ? dir.nameOf(task.ownerId) : undefined);
    const prev = snapshots.get(`${task.id}:${task.revision - 1}`);
    const nextForDiff = { ...task, ownerName };
    let action = op?.action ?? diffAction(prev?.task, nextForDiff, actor.name);
    // release vs reassign-清空：无显式 action 时看 actor 是否原 owner（TCF §4.2 歧义消解）
    if (!op && action === 'reassign' && prev?.task?.ownerId && !task.ownerId && task.status === 'pending') {
      const prevOwnerName = dir.nameOf(prev.task.ownerId);
      if (prevOwnerName === actor.name) action = 'release';
    }
    const dedupeKey = `${teamId}:${task.id}:${task.revision}`;
    const status = task.status;
    /** @type {import('./model.js').TaskCardPayload} */
    const payload = {
      id: dedupeKey,
      action,
      task: {
        id: task.id,
        revision: task.revision,
        subject: task.subject,
        description: task.description,
        status,
        ownerId: task.ownerId,
        ownerName,
        blockedBy: task.blockedBy,
        writeScopes: task.writeScopes,
        deleted: status === 'deleted',
      },
      actionLabel: TASK_ACTION_LABELS[action] ?? action,
      statusLabel: TASK_STATUS_LABELS[status] ?? status,
      actor: { name: actor.name, sessionId: actor.sessionId || undefined, kind: actor.kind, source },
      time: snapshot.time,
      dedupeKey,
      replay: ctx.historical === true,
      compact: action !== 'create',
    };
    out.push(makeMessage({
      id: dedupeKey,
      kind: 'task_card',
      sessionId: snapshot.sessionId,
      sender: { sessionId: actor.sessionId, name: actor.name, kind: /** @type {any} */ (actor.kind) },
      time: snapshot.time,
      seq: snapshot.seq,
      text: '',
      taskCard: payload,
      meta: { taskId: task.id, revision: task.revision, action, actorSource: source, teamId },
    }));
  }
  return out;
}

/**
 * revision diff 动作识别（§4.2.2 / TCF §4.2，判定顺序不可乱）
 * @param {import('./model.js').TaskCardTask|undefined} prev
 * @param {import('./model.js').TaskCardTask} next
 * @param {string} [actorName]
 * @returns {import('./model.js').TaskAction}
 */
function diffAction(prev, next, actorName) {
  if (!prev) return 'create';
  if (next.status === 'deleted' && prev.status !== 'deleted') return 'delete';
  if (prev.status === 'completed' && next.status === 'pending') return 'reopen';
  if (prev.status === 'in_progress' && next.status === 'completed') return 'complete';
  if (prev.status === 'pending' && next.status === 'in_progress') {
    if (next.ownerName && actorName && next.ownerName !== actorName) return 'reassign';
    return 'claim';
  }
  if (prev.ownerId !== next.ownerId) {
    if (next.status === 'in_progress' && !next.ownerId) return 'release';
    return 'reassign';
  }
  if (prev.status === 'in_progress' && next.status === 'pending') return 'release';
  if (!sameArray(prev.blockedBy, next.blockedBy)) return 'set_dependencies';
  return 'edit';
}

/** @param {string[]} a @param {string[]} b */
function sameArray(a, b) {
  const x = Array.isArray(a) ? a : [];
  const y = Array.isArray(b) ? b : [];
  if (x.length !== y.length) return false;
  return x.every((v, i) => v === y[i]);
}

/**
 * 模型回退链：descriptor.agentModel → result.member.model → 名册当前 model → 隐藏
 * @param {{teammate: boolean, creation?: any, descriptor?: any, memberEntry?: any}} input
 * @returns {{model?: string, inheritedFrom?: string, source: 'descriptor'|'result_snapshot'|'roster_current'|'unknown'}}
 */
function resolveModel(input) {
  const { teammate, creation, descriptor, memberEntry, creatorName } = input;
  const inheritedFrom = teammate ? 'Lead' : creatorName ?? undefined;
  if (!teammate && descriptor?.agentModel) {
    return { model: descriptor.agentModel, inheritedFrom, source: 'descriptor' };
  }
  if (teammate && creation?.resultMember?.model) {
    return { model: creation.resultMember.model, inheritedFrom: 'Lead', source: 'result_snapshot' };
  }
  if (memberEntry?.model) {
    return { model: memberEntry.model, inheritedFrom, source: 'roster_current' };
  }
  return { source: 'unknown' };
}

/** @param {any} descriptor */
function descriptorLabel(descriptor) {
  return descriptor && typeof descriptor === 'object' && typeof descriptor.label === 'string' ? descriptor.label : undefined;
}

/**
 * 生成初始任务摘要：首个空行前，≤160 字 / 2 行
 * @param {string} prompt
 * @returns {string}
 */
function excerptPrompt(prompt) {
  const text = String(prompt ?? '');
  const firstParagraph = text.split(/\n\s*\n/)[0] ?? '';
  const lines = firstParagraph.split('\n').slice(0, LIMITS.promptExcerptMaxLines);
  let out = lines.join('\n').trim();
  if (out.length > LIMITS.promptExcerptMaxChars) out = `${out.slice(0, LIMITS.promptExcerptMaxChars - 1)}…`;
  return out;
}

/** @param {'one-shot'|'continuable'|'external'|'unknown'|string|undefined} mode */
function mapLifecycleMode(mode) {
  if (mode === 'one-shot') return 'one_shot';
  if (mode === 'continuable') return 'continuable';
  return 'unknown';
}

/** @param {string} phase */
function mapLifecycle(phase) {
  return MEMBER_PHASE_TO_STATUS[phase] ?? 'unknown';
}

/**
 * @param {string} text
 * @param {number} max
 */
function truncateText(text, max) {
  const s = String(text ?? '');
  if (s.length <= max) return s;
  return `${s.slice(0, max - 20)}\n…（内容过长已截断）`;
}

/** @param {any} a @param {any} b @param {any} c */
function threeWay(a, b, c) {
  for (const v of [a, b, c]) if (typeof v === 'string' && v.trim() !== '') return v;
  return undefined;
}

/**
 * 单会话便捷入口（架构 §4.2 的 `normalize(events, memberCtx)`）
 * @param {any[]} events
 * @param {NormalizeContext & {sessionId?: string, header?: any, cutoff?: number}} ctx
 * @returns {ChannelMessage[]}
 */
function normalize(events, ctx) {
  const sessionId = ctx.sessionId ?? ctx.leadSessionId ?? 'session';
  const result = normalizeChannel(
    [{ sessionId, header: ctx.header, events, cutoff: ctx.cutoff }],
    { ...ctx, leadSessionId: ctx.leadSessionId ?? sessionId },
  );
  return result.messages;
}

Object.assign(__exports, { "unwrapEntry": unwrapEntry, "normalizeEntries": normalizeEntries, "parseJsonSafe": parseJsonSafe, "textBlocks": textBlocks, "collectSession": collectSession, "extractFiles": extractFiles, "buildDirectory": buildDirectory, "senderOf": senderOf, "getLocalBatches": getLocalBatches, "lookupBatchId": lookupBatchId, "emitSessionMessages": emitSessionMessages, "prefixSenderName": prefixSenderName, "stripTeamPrefix": stripTeamPrefix, "settlementClosingText": settlementClosingText, "normalizeChannel": normalizeChannel, "diffAction": diffAction, "excerptPrompt": excerptPrompt, "normalize": normalize });
});
/* ── src/core/paginate.js ─────────────────────────────────────────── */
__def("src/core/paginate.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 分页 / 内存上限 / 首屏（§4.5）
 *
 * - 首屏：全局最后 200 条（firstScreen）
 * - 向上分页：before=oldestKey，每页 50（pageSize）
 * - 内存上限 2000：从中间裁剪，保留首 200 + 最近 1800（避免用户正在读的位置被删）
 * - 每会话预取上限 400（防单个话多成员挤出他人）
 */

const { LIMITS } = __req("src/core/constants.js");
const { compareOrderKey, orderKey } = __req("src/core/timeline.js");

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./model.js').ChannelCursor} ChannelCursor
 * @typedef {import('./model.js').ChannelPage} ChannelPage
 * @typedef {import('./model.js').ChannelSnapshot} ChannelSnapshot
 */

/**
 * 首屏：已排序消息的最后 limit 条
 * @param {ChannelMessage[]} messages 已排序
 * @param {number} [limit]
 * @returns {ChannelMessage[]}
 */
function firstScreen(messages, limit = LIMITS.firstScreen) {
  const list = Array.isArray(messages) ? messages : [];
  if (list.length <= limit) return list.slice();
  return list.slice(list.length - limit);
}

/**
 * 向上分页：orderKey < beforeKey 的最后 limit 条（返回仍按时间升序）
 * @param {ChannelMessage[]} messages 已排序
 * @param {string|undefined} beforeKey
 * @param {number} [limit]
 * @returns {ChannelMessage[]}
 */
function pageOlder(messages, beforeKey, limit = LIMITS.pageSize) {
  const list = Array.isArray(messages) ? messages : [];
  const filtered = [];
  for (const m of list) {
    if (!beforeKey) {
      filtered.push(m);
      continue;
    }
    if (compareOrderKey(orderKey(m), beforeKey) < 0) filtered.push(m);
  }
  if (filtered.length <= limit) return filtered;
  return filtered.slice(filtered.length - limit);
}

/**
 * 内存裁剪：超出 max 时保留首 keepHead + 最近 (max-keepHead)，中间丢弃（§4.5）
 * @param {ChannelMessage[]} messages 已排序
 * @param {number} [max]
 * @param {number} [keepHead]
 * @returns {{messages: ChannelMessage[], trimmed: boolean, dropped: number}}
 */
function capInMemory(messages, max = LIMITS.maxMessagesInMemory, keepHead = LIMITS.memoryKeepHead) {
  const list = Array.isArray(messages) ? messages : [];
  if (list.length <= max) return { messages: list, trimmed: false, dropped: 0 };
  const head = Math.min(keepHead, max);
  const tailCount = max - head;
  const out = [...list.slice(0, head), ...list.slice(list.length - tailCount)];
  return { messages: out, trimmed: true, dropped: list.length - max };
}

/**
 * 每会话预取：窗口尾部 limit 个事件（假设 events 已按 seq/time 升序）
 * @param {any[]} events
 * @param {number} [limit]
 * @returns {any[]}
 */
function selectPrefetch(events, limit = LIMITS.perSessionPrefetch) {
  const list = Array.isArray(events) ? events : [];
  if (list.length <= limit) return list;
  return list.slice(list.length - limit);
}

/**
 * 是否还有更早消息（到顶判定）
 * @param {ChannelMessage[]} loaded
 * @param {boolean} [membersHasMore]
 * @returns {boolean}
 */
function computeHasMore(loaded, membersHasMore = false) {
  return membersHasMore || (Array.isArray(loaded) ? loaded.length : 0) > 0;
}

/**
 * 首次打开后的游标：写 offsets/revisions/oldestKey/newestKey
 * @param {ChannelCursor} cursor
 * @param {ChannelMessage[]} pageMessages 已排序
 * @param {Record<string, number>} [revisions]
 * @returns {ChannelCursor}
 */
function cursorAfterOpen(cursor, pageMessages, revisions = {}) {
  const page = Array.isArray(pageMessages) ? pageMessages : [];
  cursor.revisions = { ...revisions };
  if (page.length > 0) {
    cursor.oldestKey = orderKey(page[0]);
    cursor.newestKey = orderKey(page[page.length - 1]);
  }
  return cursor;
}

/**
 * 组装 ChannelPage（适配器统一出口）
 * @param {{channel: ChannelSnapshot, messages: ChannelMessage[], cursor: ChannelCursor, hasMore?: boolean, truncated?: boolean, now?: number}} input
 * @returns {ChannelPage}
 */
function buildPage(input) {
  return {
    channel: input.channel,
    messages: input.messages,
    cursor: input.cursor,
    hasMore: input.hasMore === true,
    truncated: input.truncated === true,
    serverTime: input.now ?? Date.now(),
  };
}

Object.assign(__exports, { "firstScreen": firstScreen, "pageOlder": pageOlder, "capInMemory": capInMemory, "selectPrefetch": selectPrefetch, "computeHasMore": computeHasMore, "cursorAfterOpen": cursorAfterOpen, "buildPage": buildPage });
});
/* ── src/core/protocol.js ─────────────────────────────────────────── */
__def("src/core/protocol.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 同发协议（canonical 单点常量 + 解析/构造/剥离）
 *
 * 契约来源：docs/architecture/group-chat-architecture.md
 *  - §5.2 投递协议（V1.1-1 冻结：全角「：」「、」、@lead 必含且首位、仅 N>=2 注入）
 *  - §4.4 同发合并
 *
 * ⚠ 这是**协议文本**（给 agent 读），不是 UI 文案，不随 locale 变化（D-ARCH-08）。
 *   任何字节调整只改本文件 + 快照测试。
 */

const { PROTOCOL_VERSION } = __req("src/core/constants.js");

/** canonical 首行前缀字面量（唯一来源） */
const HEAD_PREFIX = '[群聊 · 同发] 收件人：';

/** canonical 第二行模板（唯一来源） */
const EXPLAIN_TEMPLATE = (/** @type {number} */ n) =>
  `（本消息由用户在「群聊」视图同时发送给上述 ${n} 位成员，各成员各自收到一份。）`;

/** 首行解析正则（与构造严格互逆） */
const PARSE_HEAD = /^\[群聊 · 同发\] 收件人：(.+)$/;

/** 第二行解析正则（与构造严格互逆，N 为整数） */
const PARSE_EXPLAIN =
  /^（本消息由用户在「群聊」视图同时发送给上述 (\d+) 位成员，各成员各自收到一份。）$/;

/**
 * canonical 常量的只读快照（快照测试用；任何字节变化都必须显式改这里）
 * @returns {{version:number, head:string, explain:string, headPrefix:string}}
 */
function protocolSnapshot() {
  const names = ['lead', 'ux', 'backend'];
  return {
    version: PROTOCOL_VERSION,
    headPrefix: HEAD_PREFIX,
    head: buildHead(names),
    explain: buildExplain(names.length),
  };
}

/**
 * 构造首行：`[群聊 · 同发] 收件人：@lead、@ux、@backend`
 * @param {string[]} names 目标名（不含 @），调用方需保证 lead 在首位
 * @returns {string}
 */
function buildHead(names) {
  if (!Array.isArray(names) || names.length === 0) {
    throw new TypeError('buildHead(names): names 必须是非空数组');
  }
  return `${HEAD_PREFIX}${names.map((n) => `@${n}`).join('、')}`;
}

/**
 * 构造第二行固定说明
 * @param {number} count 实发目标数
 * @returns {string}
 */
function buildExplain(count) {
  if (!Number.isInteger(count) || count < 2) {
    throw new TypeError('buildExplain(count): count 必须是 >=2 的整数');
  }
  return EXPLAIN_TEMPLATE(count);
}

/**
 * 构造发送用 PromptContentPart 文本数组（§5.2 规则 2）
 *  - targets.length > 1 → [head, explain, body]
 *  - targets.length === 1 → [body]
 * @param {string[]} targets 目标名（不含 @；lead 在首位）
 * @param {string} body 用户正文（Markdown 源码，不转义）
 * @returns {string[]}
 */
function buildParts(targets, body) {
  const text = typeof body === 'string' ? body : '';
  const names = dedupeTargets(targets);
  if (names.length <= 1) return [text];
  return [buildHead(names), buildExplain(names.length), text];
}

/**
 * 构造完整协议文本（复制/日志/弱对账用；发送请用 buildParts 保留 part 边界）
 * @param {string[]} targets
 * @param {string} body
 * @returns {string}
 */
function buildText(targets, body) {
  return buildParts(targets, body).join('\n');
}

/**
 * 目标名去重（保序，去 `@` 前缀，去掉空与非法项）
 * @param {string[]} targets
 * @returns {string[]}
 */
function dedupeTargets(targets) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(targets) ? targets : []) {
    if (typeof raw !== 'string') continue;
    const name = raw.trim().replace(/^@/, '');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * 从首行解析目标名数组
 * @param {string} line
 * @returns {{names: string[], raw: string[]} | null}
 */
function parseHeadNames(line) {
  const m = PARSE_HEAD.exec(line);
  if (!m) return null;
  const raw = m[1].split('、');
  const names = [];
  for (const token of raw) {
    const trimmed = token.trim();
    if (!trimmed.startsWith('@')) return null; // canonical 必须以 @ 开头，否则视为非协议
    const name = trimmed.slice(1).trim();
    if (!name) return null;
    names.push(name);
  }
  if (names.length === 0) return null;
  return { names, raw };
}

/**
 * 从 content parts（text 块数组）解析同发前缀。
 *
 * 严格口径（SC27）：只有 `parts[0]` 命中首行且 `parts[1]` 命中第二行才认为带前缀；
 * 解析成功 → text = parts[2..] 拼接（`\n`），targets = 首行解析结果，rawText = 全部原文。
 * 解析失败 → `ok:false`，调用方原样展示并标 `meta.prefixParseFailed`。
 *
 * @param {string[]} parts
 * @returns {{ok: boolean, targets: string[], text: string, rawText: string, declaredCount: number|null, reason?: string}}
 */
function parseParts(parts) {
  const list = Array.isArray(parts) ? parts.filter((p) => typeof p === 'string') : [];
  const rawText = list.join('\n');
  if (list.length < 2) {
    return { ok: false, targets: [], text: rawText, rawText, declaredCount: null, reason: 'too-few-parts' };
  }
  const head = parseHeadNames(list[0]);
  if (!head) {
    return { ok: false, targets: [], text: rawText, rawText, declaredCount: null, reason: 'head-mismatch' };
  }
  const em = PARSE_EXPLAIN.exec(list[1]);
  if (!em) {
    return { ok: false, targets: [], text: rawText, rawText, declaredCount: null, reason: 'explain-mismatch' };
  }
  return {
    ok: true,
    targets: dedupeTargets(head.names),
    text: list.slice(2).join('\n'),
    rawText,
    declaredCount: Number(em[1]),
  };
}

/**
 * 解析单个已拼接字符串（旧构建 / 日志回放 / 弱对账用）。
 * 前两行命中 canonical → 剩余部分为正文；否则原样返回。
 * @param {string} text
 * @returns {{ok: boolean, targets: string[], text: string, rawText: string, declaredCount: number|null, reason?: string}}
 */
function parseText(text) {
  const raw = typeof text === 'string' ? text : '';
  const nl = raw.indexOf('\n');
  if (nl < 0) {
    return { ok: false, targets: [], text: raw, rawText: raw, declaredCount: null, reason: 'single-line' };
  }
  const first = raw.slice(0, nl);
  const rest = raw.slice(nl + 1);
  const nl2 = rest.indexOf('\n');
  const second = nl2 < 0 ? rest : rest.slice(0, nl2);
  const body = nl2 < 0 ? '' : rest.slice(nl2 + 1);
  const head = parseHeadNames(first);
  const em = PARSE_EXPLAIN.exec(second);
  if (!head || !em) {
    return { ok: false, targets: [], text: raw, rawText: raw, declaredCount: null, reason: head ? 'explain-mismatch' : 'head-mismatch' };
  }
  return {
    ok: true,
    targets: dedupeTargets(head.names),
    text: body,
    rawText: raw,
    declaredCount: Number(em[1]),
  };
}

/**
 * 判断字符串/parts 是否带同发前缀
 * @param {string|string[]} input
 * @returns {boolean}
 */
function hasProtocolPrefix(input) {
  if (Array.isArray(input)) return parseParts(input).ok;
  return parseText(/** @type {string} */ (input)).ok;
}

/**
 * 剥离同发前缀（渲染/复制用）。无前缀时原样返回。
 * @param {string|string[]} input
 * @returns {string}
 */
function stripProtocol(input) {
  if (Array.isArray(input)) return parseParts(input).text;
  return parseText(/** @type {string} */ (input)).text;
}

/**
 * 前缀签名（同发归并的弱键之一，§4.4 刷新后丢失 batchId 时）
 * @param {string[]} targets 已去重目标名
 * @param {string} text 已剥前缀正文
 * @returns {string}
 */
function fanoutSignature(targets, text) {
  return `${dedupeTargets(targets).join(',')}|${text}`;
}

/**
 * T2 冻结名：同发前缀（两行，`\n` 连接；targets<=1 返回空串）
 * @param {string[]} targets
 * @returns {string}
 */
function buildFanoutPrefix(targets) {
  const names = dedupeTargets(targets);
  if (names.length <= 1) return '';
  return `${buildHead(names)}\n${buildExplain(names.length)}`;
}

/**
 * T2 冻结名：同发前缀 parts（发送时保留 part 边界）
 * @param {string[]} targets
 * @returns {string[]}
 */
function buildFanoutPrefixParts(targets) {
  const names = dedupeTargets(targets);
  if (names.length <= 1) return [];
  return [buildHead(names), buildExplain(names.length)];
}

Object.assign(__exports, { "PARSE_HEAD": PARSE_HEAD, "PARSE_EXPLAIN": PARSE_EXPLAIN, "protocolSnapshot": protocolSnapshot, "buildHead": buildHead, "buildExplain": buildExplain, "buildParts": buildParts, "buildText": buildText, "dedupeTargets": dedupeTargets, "parseParts": parseParts, "parseText": parseText, "hasProtocolPrefix": hasProtocolPrefix, "stripProtocol": stripProtocol, "fanoutSignature": fanoutSignature, "buildFanoutPrefix": buildFanoutPrefix, "buildFanoutPrefixParts": buildFanoutPrefixParts });
});
/* ── src/core/roster.js ─────────────────────────────────────────── */
__def("src/core/roster.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 成员目录合成与频道快照
 *
 * 契约来源：docs/architecture/group-chat-architecture.md
 *  - §4.1 ChannelMember / ChannelSnapshot
 *  - §4.8.2 成员目录合成算法（roster + sessions.list + subagent/catalog 三源并集）
 *  - §5.1 D-A 可寻址集合
 *  - §4.8.2 截断策略（teammate 永不截断；depth<=3、sessions<=32；必须可见）
 *
 * 纯函数：输入全部来自参数，不读 ctx / DOM。
 */

const { LIMITS, MEMBER_FALLBACK_NAME, SESSION_RANK } = __req("src/core/constants.js");

/**
 * @typedef {import('./model.js').ChannelMember} ChannelMember
 * @typedef {import('./model.js').ChannelSnapshot} ChannelSnapshot
 * @typedef {import('./model.js').MemberStatus} MemberStatus
 * @typedef {import('./model.js').ChannelTruncation} ChannelTruncation
 */

/**
 * @typedef {Object} RosterSources
 * @property {string} leadSessionId
 * @property {{model?: string, status?: string, name?: string}} [lead]
 * @property {any} [agentTeam]                     client 投影 `values.agentTeam`（`{members:[...]}` 或数组）
 * @property {any[]} [sessionSummaries]            `sessions.list.byId` 的值数组
 * @property {any[]} [catalogEntries]              `subagent/catalog` 归一化条目 `{childId,label,mode,childCreatedAt,sessionId,parentSessionId}`
 * @property {Record<string, {label?: string, mode?: string, agentModel?: string, provider?: string}>} [descriptors]
 * @property {boolean} [noRoster]                  投影缺失
 * @property {number} [maxDepth]
 * @property {number} [maxSessions]
 * @property {number} [maxMembers]
 */

/**
 * @typedef {Object} RosterResult
 * @property {ChannelMember} lead
 * @property {ChannelMember[]} members
 * @property {number} runningCount
 * @property {ChannelTruncation} [truncated]
 * @property {'no-roster'|'lead-only'} [degraded]
 * @property {string[]} warnings
 */

/**
 * 成员状态归一化
 * @param {unknown} raw
 * @returns {MemberStatus}
 */
function normalizeMemberStatus(raw) {
  switch (raw) {
    case 'running':
      return 'running';
    case 'inactive':
    case 'idle':
    case 'done':
    case 'completed':
      return 'inactive';
    case 'provisioning':
    case 'starting':
      return 'provisioning';
    case 'failed':
    case 'error':
      return 'failed';
    default:
      return 'unknown';
  }
}

/**
 * D-A 可寻址判定：lead/teammate 恒 true；subagent 仅 running/provisioning。
 * @param {{kind: string, status: MemberStatus}} member
 * @returns {boolean}
 */
function isAddressable(member) {
  if (member.kind === 'lead' || member.kind === 'teammate') return true;
  if (member.kind === 'subagent') {
    return member.status === 'running' || member.status === 'provisioning';
  }
  return false;
}

/**
 * 合成成员目录（三源并集 + 截断 + 显示名）。
 * @param {RosterSources} sources
 * @returns {RosterResult}
 */
function deriveRoster(sources) {
  const maxDepth = sources.maxDepth ?? LIMITS.maxDepth;
  const maxSessions = sources.maxSessions ?? LIMITS.maxSessions;
  const maxMembers = sources.maxMembers ?? LIMITS.maxMembers;
  const warnings = /** @type {string[]} */ ([]);

  /** @type {ChannelMember[]} */
  const members = [];
  /** @type {Map<string, ChannelMember>} */
  const byId = new Map();

  const push = (m) => {
    if (!m || !m.sessionId || byId.has(m.sessionId) || members.length >= maxMembers) return false;
    byId.set(m.sessionId, m);
    members.push(m);
    return true;
  };

  const leadStatus = normalizeMemberStatus(sources.lead?.status ?? 'running');
  /** @type {ChannelMember} */
  const lead = {
    sessionId: sources.leadSessionId,
    name: sources.lead?.name ?? 'lead',
    displayName: 'Lead',
    kind: 'lead',
    depth: 0,
    status: leadStatus === 'unknown' ? 'running' : leadStatus,
    model: sources.lead?.model,
    addressable: true,
    readable: true,
    badge: 'lead',
  };
  push(lead);

  /** @type {any[]} */
  let rosterMembers = [];
  if (Array.isArray(sources.agentTeam?.members)) rosterMembers = sources.agentTeam.members;
  else if (Array.isArray(sources.agentTeam)) rosterMembers = sources.agentTeam;

  const noRoster = sources.noRoster === true || rosterMembers.length === 0;
  if (noRoster) warnings.push('no-roster');

  /** @type {Map<string, {running?: boolean, status?: string}>} */
  const summaryById = new Map(
    (Array.isArray(sources.sessionSummaries) ? sources.sessionSummaries : []).map((summary) => [String(summary?.id ?? ''), summary]),
  );
  /** @type {Map<string, ChannelMember>} */
  const teammateBySession = new Map();
  for (const raw of rosterMembers) {
    if (!raw) continue;
    if (raw.role === 'lead' || raw.target === 'lead' || raw.name === 'lead') continue;
    const sessionId = String(raw.id ?? raw.sessionId ?? raw.target ?? '');
    if (!sessionId) continue;
    const summary = summaryById.get(sessionId);
    const baseStatus = normalizeMemberStatus(raw.status);
    const status =
      summary && typeof summary.running === 'boolean' && baseStatus !== 'failed' && baseStatus !== 'provisioning'
        ? /** @type {MemberStatus} */ (summary.running ? 'running' : 'inactive')
        : baseStatus;
    const member = {
      sessionId,
      name: String(raw.name ?? raw.target ?? MEMBER_FALLBACK_NAME),
      displayName: String(raw.name ?? raw.target ?? MEMBER_FALLBACK_NAME),
      kind: /** @type {'teammate'} */ ('teammate'),
      parentSessionId: sources.leadSessionId,
      depth: 1,
      status,
      description: typeof raw.description === 'string' ? raw.description : undefined,
      model: typeof raw.model === 'string' ? raw.model : undefined,
      addressable: true,
      readable: raw.readable !== false,
      badge: /** @type {'teammate'} */ ('teammate'),
    };
    if (push(member)) teammateBySession.set(sessionId, member);
  }

  // 补 roster 漏掉的 direct children（sessions.list.byId[*].parentSessionId === lead）
  // 注意：带 subagent/catalog 的直接子会话是 subagent，不是 teammate（EVT §5.1 判定规则）
  const catalogued = new Set(
    (Array.isArray(sources.catalogEntries) ? sources.catalogEntries : [])
      .map((c) => String(c?.childId ?? c?.id ?? ''))
      .filter(Boolean),
  );
  for (const s of Array.isArray(sources.sessionSummaries) ? sources.sessionSummaries : []) {
    if (!s) continue;
    const sid = String(s.id ?? s.sessionId ?? '');
    if (!sid || sid === sources.leadSessionId) continue;
    const parentId = String(s.parentSessionId ?? s.parentSession ?? s.subagent?.address?.parentSessionId ?? '');
    if (parentId !== sources.leadSessionId) continue;
    if (teammateBySession.has(sid)) continue;
    if (catalogued.has(sid)) continue;
    const desc = sources.descriptors?.[sid];
    const member = {
      sessionId: sid,
      name: desc?.label ? shortenLabel(desc.label) : MEMBER_FALLBACK_NAME,
      displayName: desc?.label ? shortenLabel(desc.label) : MEMBER_FALLBACK_NAME,
      kind: /** @type {'teammate'} */ ('teammate'),
      parentSessionId: sources.leadSessionId,
      depth: 1,
      status:
        typeof s.running === 'boolean'
          ? /** @type {MemberStatus} */ (s.running ? 'running' : 'inactive')
          : normalizeMemberStatus(s.status ?? 'unknown'),
      description: s.agentName ?? undefined,
      model: desc?.agentModel ?? s.model,
      addressable: true,
      readable: s.readable !== false,
      badge: /** @type {'teammate'} */ ('teammate'),
    };
    if (push(member)) teammateBySession.set(sid, member);
  }

  // subagent：catalog 为主（可自 member 会话递归），sessions.list 的 parentSessionId 补漏
  /** @type {Array<{childId:string,label?:string,mode?:string,createdAt:number,parentSessionId:string}>} */
  const subCandidates = [];
  for (const c of Array.isArray(sources.catalogEntries) ? sources.catalogEntries : []) {
    if (!c) continue;
    const childId = String(c.childId ?? c.id ?? '');
    if (!childId) continue;
    const parentSessionId = String(c.parentSessionId ?? c.sessionId ?? sources.leadSessionId);
    subCandidates.push({
      childId,
      label: c.label,
      mode: c.mode,
      createdAt: Number(c.childCreatedAt ?? c.createdAt ?? 0),
      parentSessionId,
    });
  }
  for (const s of Array.isArray(sources.sessionSummaries) ? sources.sessionSummaries : []) {
    if (!s) continue;
    const sid = String(s.id ?? s.sessionId ?? '');
    if (!sid || sid === sources.leadSessionId || teammateBySession.has(sid) || byId.has(sid)) continue;
    const parentId = String(s.parentSessionId ?? s.parentSession ?? s.subagent?.address?.parentSessionId ?? '');
    if (!parentId || !byId.has(parentId)) continue;
    if (subCandidates.some((c) => c.childId === sid)) continue;
    // 只有「父会话不是 lead」时这里才必然不是 teammate（teammate 已由 roster 覆盖）
    if (parentId === sources.leadSessionId && !noRoster) continue;
    subCandidates.push({
      childId: sid,
      label: s.subagent?.label ?? s.label,
      mode: s.subagent?.mode ?? s.mode,
      createdAt: Number(s.createdAt ?? s.subagent?.createdAt ?? 0),
      parentSessionId: parentId,
    });
  }

  // 截断：先保全部 teammate，再按 (depth 升序, createdAt 倒序) 补 subagent
  /** @type {ChannelTruncation|undefined} */
  let truncated;
  let depthCapHit = false;
  const accepted = [];
  const skipped = [];
  for (const cand of subCandidates) {
    const parent = byId.get(cand.parentSessionId);
    if (!parent) {
      skipped.push(cand);
      continue;
    }
    const depth = parent.depth + 1;
    if (depth > maxDepth) {
      depthCapHit = true;
      skipped.push(cand);
      continue;
    }
    accepted.push({ ...cand, depth, parent });
  }
  accepted.sort((a, b) => a.depth - b.depth || b.createdAt - a.createdAt);
  for (const cand of accepted) {
    if (members.length >= Math.min(maxSessions, maxMembers)) {
      skipped.push(cand);
      continue;
    }
    const desc = sources.descriptors?.[cand.childId];
    const status = deriveSubagentStatus(cand, sources);
    const label = cand.label ?? desc?.label;
    const name = label ? shortenLabel(label) : MEMBER_FALLBACK_NAME;
    const displayName = `${label ? shortenLabel(label) : MEMBER_FALLBACK_NAME} · ${cand.parent.displayName} 的子体`;
    const member = {
      sessionId: cand.childId,
      name,
      displayName,
      kind: /** @type {'subagent'} */ ('subagent'),
      parentSessionId: cand.parentSessionId,
      depth: cand.depth,
      status,
      description: label,
      model: desc?.agentModel,
      addressable: isAddressable({ kind: 'subagent', status }),
      parentAvailable: cand.parent.status === 'running' || cand.parent.status === 'inactive',
      readable: true,
      badge: /** @type {'subagent'} */ ('subagent'),
    };
    push(member);
  }

  if (skipped.length > 0) {
    truncated = {
      omittedSubagents: skipped.length,
      maxDepth,
      maxSessions,
      reason: depthCapHit ? 'depth-cap' : 'session-cap',
    };
    warnings.push(`truncated:${truncated.reason}`);
  }

  // 排序：lead → teammate（roster 序）→ subagent（depth 升序, 创建序）
  members.sort((a, b) => {
    const ra = SESSION_RANK[a.kind] ?? 9;
    const rb = SESSION_RANK[b.kind] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.depth !== b.depth) return a.depth - b.depth;
    return 0;
  });

  const runningCount = members.filter((m) => m.status === 'running').length;
  return {
    lead,
    members,
    runningCount,
    truncated,
    degraded:
      noRoster || rosterMembers.length === 0
        ? members.length > 1
          ? /** @type {'no-roster'} */ ('no-roster')
          : /** @type {'lead-only'} */ ('lead-only')
        : undefined,
    warnings,
  };
}

/**
 * subagent 状态：优先会话运行态，其次 catalog.mode（one-shot 已完成 → inactive）。
 * @param {{mode?: string, createdAt: number}} cand
 * @param {RosterSources} sources
 * @returns {MemberStatus}
 */
function deriveSubagentStatus(cand, sources) {
  const summary = (Array.isArray(sources.sessionSummaries) ? sources.sessionSummaries : []).find(
    (s) => s && String(s.id ?? s.sessionId) === cand.childId,
  );
  if (summary) {
    if (summary.running === true) return 'running';
    if (summary.running === false) return 'inactive';
    if (summary.status) return normalizeMemberStatus(summary.status);
  }
  if (cand.mode === 'one-shot') return 'inactive';
  return 'unknown';
}

/**
 * 取展示名（lead 恒 'Lead'；其余 name）
 * @param {{name: string, kind: string}} m
 * @returns {string}
 */
function displayNameOf(m) {
  return m.kind === 'lead' ? 'Lead' : m.name;
}

/**
 * 由 sessionId 查成员
 * @param {ChannelMember[]} members
 * @param {string} sessionId
 * @returns {ChannelMember|undefined}
 */
function memberById(members, sessionId) {
  return members.find((m) => m.sessionId === sessionId);
}

/**
 * 由名字查成员（含 displayName 后缀匹配）
 * @param {ChannelMember[]} members
 * @param {string} name
 * @returns {ChannelMember|undefined}
 */
function memberByName(members, name) {
  if (!name) return undefined;
  const direct = members.find((m) => m.name === name);
  if (direct) return direct;
  return members.find((m) => m.name.toLowerCase() === String(name).toLowerCase());
}

/**
 * 生成 ChannelSnapshot（§4.1）
 * @param {RosterResult} roster
 * @param {{readonly?: boolean, readonlyReason?: string, now?: number, channelId?: string}} [opts]
 * @returns {ChannelSnapshot}
 */
function deriveSnapshot(roster, opts = {}) {
  return {
    channelId: opts.channelId ?? roster.lead.sessionId,
    lead: roster.lead,
    members: roster.members,
    runningCount: roster.runningCount,
    readonly: opts.readonly === true,
    ...(opts.readonlyReason ? { readonlyReason: /** @type {any} */ (opts.readonlyReason) } : {}),
    ...(roster.degraded ? { degraded: roster.degraded } : {}),
    ...(roster.truncated ? { truncated: roster.truncated } : {}),
    generatedAt: opts.now ?? Date.now(),
  };
}

/**
 * 只读判定（§6.4.4：无权限 / 归档 / 团队结束；判定不确定时偏可写）。
 * @param {{canSend?: boolean, archived?: boolean, leadStatus?: MemberStatus, allInactiveSince?: number, now?: number, idleMs?: number}} input
 * @returns {{readonly: boolean, readonlyReason?: 'team-ended'|'lead-offline'|'archived'|'permission'}}
 */
function deriveReadonly(input) {
  if (input.canSend === false) return { readonly: true, readonlyReason: 'permission' };
  if (input.archived === true) return { readonly: true, readonlyReason: 'archived' };
  const now = input.now ?? Date.now();
  const idleMs = input.idleMs ?? LIMITS.readonlyIdleMs;
  if (input.leadStatus === 'inactive' && typeof input.allInactiveSince === 'number' && now - input.allInactiveSince >= idleMs) {
    return { readonly: true, readonlyReason: 'team-ended' };
  }
  if (input.leadStatus === 'inactive') return { readonly: false, readonlyReason: 'lead-offline' };
  return { readonly: false };
}

/** @param {string} label */
function shortenLabel(label) {
  const s = String(label).replace(/\s+/g, ' ').trim();
  return s.length > 24 ? `${s.slice(0, 24)}…` : s;
}

/**
 * 作用域回溯：任意 member session → lead sessionId（F27 / §4.8.2）
 *
 * - 沿 `parentSession` 链最多 `maxHops`（默认 4）跳；
 * - `seen` 防环；无 parent / parent===自身 / 回溯失败 → 回退 `startId`（不抛错）；
 * - `sessionsOrLookup` 支持：函数 `(id)=>{parentSessionId,parentSession}` / Map / 数组 /
 *   `{[id]: summary}` / `sessions.list.byId` 形状。
 *
 * @param {string} startId
 * @param {any} sessionsOrLookup
 * @param {{maxHops?: number}} [options]
 * @returns {{leadSessionId: string, hops: number, degraded: boolean, cycle: boolean}}
 */
function resolveLeadSession(startId, sessionsOrLookup, options = {}) {
  const start = String(startId ?? '');
  const maxHops = Number.isInteger(options.maxHops) && options.maxHops >= 0 ? options.maxHops : LIMITS.maxParentHops;
  const parentOf = makeParentLookup(sessionsOrLookup);
  const seen = new Set();
  let id = start;
  let hops = 0;
  let degraded = false;
  let cycle = false;
  for (let hop = 0; hop <= maxHops; hop += 1) {
    if (!id) return { leadSessionId: start, hops, degraded: true, cycle };
    if (seen.has(id)) {
      cycle = true;
      degraded = true;
      break;
    }
    seen.add(id);
    const parent = parentOf(id);
    if (!parent || parent === id) break;
    if (hop === maxHops) {
      // 已到最大跳数仍有 parent → 视为无法完整回到根，回退当前 id 并标 degraded
      degraded = true;
      break;
    }
    id = parent;
    hops += 1;
  }
  return { leadSessionId: id || start, hops, degraded, cycle };
}

/**
 * 便捷版：只返回 leadSessionId（F27 接线用）
 * @param {string} startId
 * @param {any} sessionsOrLookup
 * @param {{maxHops?: number}} [options]
 * @returns {string}
 */
function resolveLeadSessionId(startId, sessionsOrLookup, options = {}) {
  return resolveLeadSession(startId, sessionsOrLookup, options).leadSessionId;
}

/**
 * @param {any} input
 * @returns {(id: string) => string|undefined}
 */
function makeParentLookup(input) {
  if (typeof input === 'function') {
    return (id) => parentOfValue(input(id));
  }
  /** @type {Map<string, any>|null} */
  let map = null;
  if (input instanceof Map) map = input;
  else if (Array.isArray(input)) map = new Map(input.map((item) => [String(item?.id ?? item?.sessionId ?? ''), item]));
  else if (input && typeof input === 'object') {
    const source = input.byId && typeof input.byId === 'object' ? input.byId : input;
    map = new Map(Object.entries(source));
  }
  if (!map) return () => undefined;
  return (id) => parentOfValue(map.get(id));
}

/**
 * @param {any} value
 * @returns {string|undefined}
 */
function parentOfValue(value) {
  if (!value) return undefined;
  if (typeof value === 'string') return value || undefined;
  if (typeof value !== 'object') return undefined;
  const parent =
    value.parentSessionId ??
    value.parentSession ??
    value.subagent?.address?.parentSessionId ??
    value.parent ??
    value.parentId;
  return parent ? String(parent) : undefined;
}

Object.assign(__exports, { "normalizeMemberStatus": normalizeMemberStatus, "isAddressable": isAddressable, "deriveRoster": deriveRoster, "displayNameOf": displayNameOf, "memberById": memberById, "memberByName": memberByName, "deriveSnapshot": deriveSnapshot, "deriveReadonly": deriveReadonly, "resolveLeadSession": resolveLeadSession, "resolveLeadSessionId": resolveLeadSessionId });
});
/* ── src/core/timeline.js ─────────────────────────────────────────── */
__def("src/core/timeline.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 排序 / 合并 / 游标
 *
 * 契约来源：docs/architecture/group-chat-architecture.md
 *  - §4.3.1 排序键 `(time ASC, creationId→pairOrder, kindRank, sessionRank, sessionId, seq ASC)`
 *  - §4.3.1 同毫秒 kind 序：member_card < task_card < 普通消息
 *  - §4.5 ChannelCursor（offset/revision/oldestKey/newestKey）
 *
 * ⚠ 禁止用 createdAt 当事件时间；seq 可能是小数（S1），比较一律按浮点。
 */

const { KIND_RANK, KIND_RANK_DEFAULT, SESSION_RANK } = __req("src/core/constants.js");

/**
 * @typedef {import('./model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./model.js').ChannelCursor} ChannelCursor
 */

/**
 * @param {string} kind
 * @returns {number}
 */
function kindRank(kind) {
  return KIND_RANK[kind] ?? KIND_RANK_DEFAULT;
}

/**
 * 会话/发送者 rank（lead=0, teammate=1, subagent=2, system=3；user 与 lead 同档）
 * @param {ChannelMessage} m
 * @returns {number}
 */
function sessionRankOf(m) {
  const kind = m?.sender?.kind;
  if (kind === 'lead' || kind === 'user') return SESSION_RANK.lead;
  if (kind === 'teammate') return SESSION_RANK.teammate;
  if (kind === 'subagent') return SESSION_RANK.subagent;
  return SESSION_RANK.system;
}

/**
 * 稳定比较器（§4.3.1）。完全相等时用 id 兜底，保证确定性排序。
 * @param {ChannelMessage} a
 * @param {ChannelMessage} b
 * @returns {number}
 */
function compareMessages(a, b) {
  const at = Number(a?.time ?? 0);
  const bt = Number(b?.time ?? 0);
  if (at !== bt) return at < bt ? -1 : 1;

  // v1.4：同 creationId 的欢迎提示(0) 必须先于 creator 带卡消息(1)
  const ac = a?.creationId;
  const bc = b?.creationId;
  if (ac && bc && ac === bc) {
    const ap = a?.pairOrder ?? 1;
    const bp = b?.pairOrder ?? 1;
    if (ap !== bp) return ap - bp;
  }

  const ak = kindRank(String(a?.kind ?? ''));
  const bk = kindRank(String(b?.kind ?? ''));
  if (ak !== bk) return ak - bk;

  const ar = sessionRankOf(a);
  const br = sessionRankOf(b);
  if (ar !== br) return ar - br;

  const as = String(a?.sessionId ?? '');
  const bs = String(b?.sessionId ?? '');
  if (as !== bs) return as < bs ? -1 : 1;

  const asq = Number(a?.seq ?? 0);
  const bsq = Number(b?.seq ?? 0);
  if (asq !== bsq) return asq < bsq ? -1 : 1;

  const aid = String(a?.id ?? '');
  const bid = String(b?.id ?? '');
  if (aid === bid) return 0;
  return aid < bid ? -1 : 1;
}

/**
 * 排序（返回新数组，不修改入参；确定性：同输入两次结果完全一致）
 * @param {ChannelMessage[]} messages
 * @returns {ChannelMessage[]}
 */
function sortTimeline(messages) {
  return [...(Array.isArray(messages) ? messages : [])].sort(compareMessages);
}

/** T2 冻结的导出名（等价于 sortTimeline） */
const sortMessages = sortTimeline;

/**
 * 游标 orderKey 编码（字符串可直接字典序比较；仅用于「最早/最新已加载」边界）
 * 注意：不编码 creationId/pairOrder（边界消息属于同一 creationId 的概率可忽略）。
 * @param {ChannelMessage} m
 * @returns {string}
 */
function orderKey(m) {
  const time = String(Math.max(0, Math.floor(Number(m?.time ?? 0)))).padStart(16, '0');
  const kind = String(kindRank(String(m?.kind ?? ''))).padStart(2, '0');
  const rank = String(sessionRankOf(m)).padStart(2, '0');
  const seq = encodeSeq(Number(m?.seq ?? 0));
  return `${time}:${kind}:${rank}:${seq}:${String(m?.sessionId ?? '')}:${String(m?.id ?? '')}`;
}

/**
 * @param {number} seq 允许小数（浮点比较）
 * @returns {string}
 */
function encodeSeq(seq) {
  if (!Number.isFinite(seq)) return '000000000000.000000';
  const neg = seq < 0 ? '-' : '';
  const abs = Math.abs(seq);
  const intPart = Math.floor(abs);
  const frac = abs - intPart;
  const fracStr = frac === 0 ? '' : frac.toFixed(6).slice(2);
  return `${neg}${String(intPart).padStart(12, '0')}.${fracStr.padEnd(6, '0')}`;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareOrderKey(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * 创建空游标（§4.5）
 * @param {string} channelId
 * @returns {ChannelCursor}
 */
function makeCursor(channelId) {
  return { v: 1, channelId, offsets: {}, revisions: {} };
}

/**
 * 按 orderKey 过滤区间：afterKey < orderKey(m) <= beforeKey
 * @param {ChannelMessage[]} sorted
 * @param {{afterKey?: string, beforeKey?: string, limit?: number}} [opts]
 * @returns {ChannelMessage[]}
 */
function sliceByOrder(sorted, opts = {}) {
  const { afterKey, beforeKey } = opts;
  const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : undefined;
  /** @type {ChannelMessage[]} */
  const out = [];
  for (const m of sorted) {
    const key = orderKey(m);
    if (afterKey !== undefined && compareOrderKey(key, afterKey) <= 0) continue;
    if (beforeKey !== undefined && compareOrderKey(key, beforeKey) > 0) continue;
    out.push(m);
    if (limit !== undefined && out.length >= limit) break;
  }
  return out;
}

/**
 * 合并两批已排序消息：按 id 去重（同 id 保留 seq 更大者，即「更新的同一事件」），再整体排序。
 * @param {ChannelMessage[]} existing
 * @param {ChannelMessage[]} incoming
 * @returns {{messages: ChannelMessage[], added: ChannelMessage[], updated: ChannelMessage[]}}
 */
function mergeTimeline(existing, incoming) {
  const base = Array.isArray(existing) ? existing : [];
  const add = Array.isArray(incoming) ? incoming : [];
  /** @type {Map<string, ChannelMessage>} */
  const byId = new Map();
  for (const m of base) byId.set(m.id, m);
  /** @type {ChannelMessage[]} */
  const added = [];
  /** @type {ChannelMessage[]} */
  const updated = [];
  for (const m of add) {
    const prev = byId.get(m.id);
    if (!prev) {
      byId.set(m.id, m);
      added.push(m);
      continue;
    }
    if (Number(m.seq ?? 0) >= Number(prev.seq ?? 0) && m !== prev) {
      byId.set(m.id, m);
      updated.push(m);
    }
  }
  return { messages: sortTimeline([...byId.values()]), added, updated };
}

/**
 * 增量插入（单条 append ≤5ms 的快速路径）：在已排序数组中插到正确位置。
 * @param {ChannelMessage[]} sorted
 * @param {ChannelMessage} message
 * @returns {ChannelMessage[]} 新数组（含插入）
 */
function insertInOrder(sorted, message) {
  const list = Array.isArray(sorted) ? sorted : [];
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compareMessages(list[mid], message) <= 0) lo = mid + 1;
    else hi = mid;
  }
  const next = list.slice();
  next.splice(lo, 0, message);
  return next;
}

/**
 * 更新游标中的会话偏移/revision（浮点 seq 比较，禁止整数断言）
 * @param {ChannelCursor} cursor
 * @param {string} sessionId
 * @param {number} seq
 * @param {number} [revision]
 * @returns {ChannelCursor}
 */
function advanceOffset(cursor, sessionId, seq, revision) {
  const offsets = { ...(cursor.offsets ?? {}) };
  const prev = Number(offsets[sessionId] ?? -1);
  if (Number.isFinite(seq) && seq > prev) offsets[sessionId] = seq;
  cursor.offsets = offsets;
  if (typeof revision === 'number') {
    cursor.revisions = { ...(cursor.revisions ?? {}), [sessionId]: revision };
  }
  return cursor;
}

/**
 * 用一批消息刷新 oldestKey/newestKey
 * @param {ChannelCursor} cursor
 * @param {ChannelMessage[]} messages 已排序
 * @returns {ChannelCursor}
 */
function refreshCursorKeys(cursor, messages) {
  const list = Array.isArray(messages) ? messages : [];
  if (list.length === 0) return cursor;
  const newest = orderKey(list[list.length - 1]);
  const oldest = orderKey(list[0]);
  if (!cursor.newestKey || compareOrderKey(newest, cursor.newestKey) > 0) cursor.newestKey = newest;
  if (!cursor.oldestKey || compareOrderKey(oldest, cursor.oldestKey) < 0) cursor.oldestKey = oldest;
  return cursor;
}

/**
 * 复制游标（适配器不得原地修改调用方游标；§4.5 契约要求 sync/pageOlder 返回新游标）
 * @param {ChannelCursor|undefined} cursor
 * @param {string} channelId
 * @returns {ChannelCursor}
 */
function cloneCursor(cursor, channelId) {
  const base = cursor ?? makeCursor(channelId);
  return {
    v: 1,
    channelId: base.channelId ?? channelId,
    offsets: { ...(base.offsets ?? {}) },
    revisions: { ...(base.revisions ?? {}) },
    ...(base.oldestKey ? { oldestKey: base.oldestKey } : {}),
    ...(base.newestKey ? { newestKey: base.newestKey } : {}),
  };
}

Object.assign(__exports, { "kindRank": kindRank, "sessionRankOf": sessionRankOf, "compareMessages": compareMessages, "sortTimeline": sortTimeline, "sortMessages": sortMessages, "orderKey": orderKey, "encodeSeq": encodeSeq, "compareOrderKey": compareOrderKey, "makeCursor": makeCursor, "sliceByOrder": sliceByOrder, "mergeTimeline": mergeTimeline, "insertInOrder": insertInOrder, "advanceOffset": advanceOffset, "refreshCursorKeys": refreshCursorKeys, "cloneCursor": cloneCursor });
});
/* ── src/core/turns.js ─────────────────────────────────────────── */
__def("src/core/turns.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊数据内核 · 轮次聚合（B2 / F26 / 架构 §6.15.2）
 *
 * 输入：某个成员会话的**原始事件窗口**（与 feed 同一份，不新增 Host / 不额外 retain）。
 * 以 `turn/start` – `turn/end` 为一个 turn；最新的在前。
 *  - turnIndex：数据里的 turn 序号（缺失时按出现顺序自增）
 *  - stepCount：区间内最大 step
 *  - toolCount：区间内全部 `tool/call` 数（含失败/中断调用）
 *  - summary：区间内最后一个非空 assistant/message 的 text 块（≤120 字 / ≤2 行）
 *  - status：`turn/end.reason.kind` 映射（completed→done、aborted/interrupted→aborted、
 *            error→error、max-tokens→truncated、无 end→running、其它→unknown）
 *  - forked turn 丢弃（与 feed 一致）；seeded 继承前缀可按 `cutoffSeq` 跳过。
 *
 * 零依赖、无 DOM / Node。
 */

/**
 * @typedef {Object} Turn
 * @property {number} index
 * @property {number} turnId
 * @property {number} startedAt
 * @property {number|null} endedAt
 * @property {'done'|'aborted'|'error'|'truncated'|'running'|'unknown'} status
 * @property {string} summary
 * @property {number} stepCount
 * @property {number} toolCount
 * @property {boolean} [inferred] 窗口缺少 turn/start 时按 assistant/tool 分段推断（M2）
 */

/**
 * @param {any} entry 原始事件或 S1 信封
 * @returns {any|null} 事件对象；transient/无效返回 null
 */
function unwrapEvent(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.type === 'event' && entry.event && typeof entry.event === 'object') return entry.event;
  if (entry.type === 'transient') return null;
  if (typeof entry.type === 'string' && (typeof entry.seq === 'number' || entry.data !== undefined)) return entry;
  return null;
}

/**
 * @param {any} content
 * @returns {string}
 */
function lastTextOf(content) {
  if (!Array.isArray(content)) return '';
  /** @type {string[]} */
  const texts = [];
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') texts.push(block.text);
  }
  return texts.length > 0 ? texts[texts.length - 1] : '';
}

/**
 * turn/end.reason.kind → 轨迹状态
 * @param {string} reasonKind
 * @returns {'done'|'aborted'|'error'|'truncated'|'unknown'}
 */
function turnStatusFromReason(reasonKind) {
  const kind = String(reasonKind ?? '').toLowerCase();
  if (kind === 'completed') return 'done';
  if (kind === 'aborted' || kind === 'interrupted' || kind === 'cancelled' || kind === 'canceled') return 'aborted';
  if (kind === 'error' || kind === 'failed') return 'error';
  if (kind === 'max-tokens' || kind === 'max_tokens' || kind === 'truncated') return 'truncated';
  return 'unknown';
}

/**
 * 轮次摘要：末段文本 → ≤maxLines 行、≤maxChars 字（超出加 …）
 * @param {string} text
 * @param {{maxChars?: number, maxLines?: number}} [options]
 * @returns {string}
 */
function summarizeTurn(text, options = {}) {
  const maxChars = Number.isFinite(options.maxChars) ? Number(options.maxChars) : 120;
  const maxLines = Number.isFinite(options.maxLines) ? Number(options.maxLines) : 2;
  const raw = String(text ?? '').replace(/\r\n?/g, '\n').trim();
  if (!raw) return '';
  const lines = raw.split('\n').map((line) => line.trim()).filter((line) => line !== '');
  let summary = lines.slice(0, Math.max(1, maxLines)).join('\n');
  if (lines.length > maxLines) summary += '…';
  if (summary.length > maxChars) summary = `${summary.slice(0, maxChars - 1)}…`;
  return summary;
}

/**
 * 聚合轮次（最新在前）
 * @param {any[]} events 原始事件 / S1 信封数组
 * @param {{cutoffSeq?: number, maxChars?: number, maxLines?: number}} [options]
 * @returns {Turn[]}
 */
function aggregateTurns(events, options = {}) {
  const list = Array.isArray(events) ? events : [];
  const raw = [];
  for (const entry of list) {
    const event = unwrapEvent(entry);
    if (!event || typeof event.type !== 'string') continue;
    raw.push(event);
  }
  // seeded/fork cutoff：显式传入优先，否则取 session/end-seed 的最大 seq
  let cutoff = Number.isFinite(options.cutoffSeq) ? Number(options.cutoffSeq) : -1;
  if (!Number.isFinite(options.cutoffSeq)) {
    for (const e of raw) {
      if (e.type === 'session/end-seed' && typeof e.seq === 'number' && e.seq > cutoff) cutoff = e.seq;
    }
  }

  /** @type {Map<number, {turnId:number, startedAt:number, endedAt:number|null, status:string, finalText:string, stepCount:number, toolCount:number, dropped:boolean}>} */
  const records = new Map();
  let order = 0;
  let currentTurn = null;
  let sawAnyTurnish = false;
  /** @type {Set<number>} */
  const explicitTurns = new Set();

  const ensure = (turnId, time) => {
    const id = Number.isFinite(turnId) ? Number(turnId) : order + 1;
    let rec = records.get(id);
    if (!rec) {
      rec = {
        turnId: id,
        startedAt: Number.isFinite(time) ? Number(time) : 0,
        endedAt: null,
        status: 'running',
        finalText: '',
        stepCount: 0,
        toolCount: 0,
        dropped: false,
      };
      records.set(id, rec);
    }
    if (Number.isFinite(time) && (!rec.startedAt || Number(time) < rec.startedAt)) rec.startedAt = Number(time);
    return rec;
  };

  for (const event of raw) {
    if (cutoff >= 0 && typeof event.seq === 'number' && event.seq <= cutoff) continue;
    if (event.type === 'session/end-seed') continue;
    const data = event.data ?? {};
    const time = Number(event.time ?? 0);
    if (event.type === 'turn/start') {
      sawAnyTurnish = true;
      order += 1;
      explicitTurns.add(Number.isFinite(data.turn) ? Number(data.turn) : order);
      currentTurn = Number.isFinite(data.turn) ? Number(data.turn) : order;
      ensure(currentTurn, time);
      continue;
    }
    if (event.type === 'turn/end') {
      const turnId = Number.isFinite(data.turn) ? Number(data.turn) : currentTurn ?? order;
      const rec = ensure(turnId, time);
      const reason = data.reason?.kind ?? 'unknown';
      rec.endedAt = time;
      rec.status = turnStatusFromReason(reason);
      if (String(reason).toLowerCase() === 'forked') rec.dropped = true;
      if (currentTurn === turnId) currentTurn = null;
      continue;
    }
    if (event.type === 'assistant/message') {
      sawAnyTurnish = true;
      const turnId = Number.isFinite(data.turn) ? Number(data.turn) : currentTurn ?? order;
      if (!Number.isFinite(data.turn) && currentTurn === null) order += 1;
      const rec = ensure(turnId, time);
      const text = lastTextOf(data.message?.content);
      if (text.trim() !== '') rec.finalText = text;
      if (Number.isFinite(data.step)) rec.stepCount = Math.max(rec.stepCount, Number(data.step));
      continue;
    }
    if (event.type === 'tool/call') {
      sawAnyTurnish = true;
      const turnId = Number.isFinite(data.turn) ? Number(data.turn) : currentTurn ?? order;
      const rec = ensure(turnId, time);
      rec.toolCount += 1;
      if (Number.isFinite(data.step)) rec.stepCount = Math.max(rec.stepCount, Number(data.step));
      continue;
    }
  }

  if (records.size === 0) {
    /** @type {any} */
    const empty = [];
    empty.emptyReason = sawAnyTurnish ? 'no-usable-turn-events' : 'no-turn-events';
    return empty;
  }

  /** @type {Turn[]} */
  const turns = [];
  let index = 0;
  for (const rec of records.values()) {
    if (rec.dropped) continue;
    index += 1;
    turns.push({
      index,
      turnId: rec.turnId,
      startedAt: rec.startedAt,
      endedAt: rec.endedAt,
      status: /** @type {any} */ (rec.endedAt === null ? 'running' : rec.status === 'running' ? 'unknown' : rec.status),
      summary: summarizeTurn(rec.finalText, { maxChars: options.maxChars ?? 120, maxLines: options.maxLines ?? 2 }),
      stepCount: rec.stepCount,
      toolCount: rec.toolCount,
      inferred: !explicitTurns.has(rec.turnId),
    });
  }
  // 最新在前
  turns.sort((a, b) => b.index - a.index);
  /** @type {any} */
  const result = turns;
  result.inferred = turns.some((t) => t.inferred === true);
  return result;
}

Object.assign(__exports, { "turnStatusFromReason": turnStatusFromReason, "summarizeTurn": summarizeTurn, "aggregateTurns": aggregateTurns });
});
/* ── src/send/delivery.js ─────────────────────────────────────────── */
__def("src/send/delivery.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊发送编排 · 四态状态机与本地 echo（架构 §5.3 / V1.1-2）
 *
 * 四态：sending（仍有在途） / sent（全部成功） / partial（部分失败） / failed（全部失败）。
 * 本地 echo 的 id = `local:<clientBatchId>`，权威事件到达后由内核 `mergeFanout` 按 batchId 合并。
 */

const { aggregateDeliveryState } = __req("src/core/fanout.js");
const { FAILURE_MATRIX } = __req("src/send/errors.js");

/**
 * @typedef {Object} SendDelivery
 * @property {string} target
 * @property {string} sessionId
 * @property {boolean} ok
 * @property {string} [error]
 * @property {string} [reason]
 * @property {boolean} [retryable]
 * @property {string} [messageKey]
 * @property {string} [requestId]
 * @property {number} [attempt]
 */

/**
 * 创建本地乐观用户消息（ChannelMessage 形状，与 T2 的 optimistic 兼容）
 * @param {{
 *   clientBatchId: string,
 *   channelId: string,
 *   text: string,
 *   targets: Array<{name: string, sessionId?: string}>,
 *   requestIds?: Record<string, string>,
 *   prefixParts?: string[],
 *   now?: number,
 *   mentions?: string[],
 * }} input
 * @returns {import('../core/model.js').ChannelMessage}
 */
function createLocalEcho(input) {
  const targetNames = input.targets.map((t) => t.name);
  const targetSessionIds = input.targets.map((t) => t.sessionId ?? '');
  /** @type {Record<string, import('../core/model.js').DeliveryState>} */
  const deliveries = {};
  for (const id of targetSessionIds) if (id) deliveries[id] = 'sending';
  return {
    id: `local:${input.clientBatchId}`,
    kind: 'user',
    sessionId: input.channelId,
    sender: { sessionId: input.channelId, name: 'user', kind: /** @type {'user'} */ ('user') },
    targets: targetNames,
    targetSessionIds,
    text: input.text,
    rawText: input.text,
    time: input.now ?? Date.now(),
    seq: 0,
    isFinal: true,
    delivery: 'sending',
    deliveries,
    clientBatchId: input.clientBatchId,
    meta: {
      localEcho: true,
      clientBatchId: input.clientBatchId,
      ...(input.requestIds ? { requestIds: input.requestIds } : {}),
      ...(input.prefixParts && input.prefixParts.length > 1
        ? { protocolHead: input.prefixParts[0], protocolExplain: input.prefixParts[1] }
        : {}),
      ...(input.mentions && input.mentions.length > 0 ? { draftMentions: input.mentions } : {}),
    },
    isLocal: true,
  };
}

/**
 * deliveries 数组 → 按 sessionId 的状态表（T2 store 形状）
 * @param {SendDelivery[]} deliveries
 * @returns {Record<string, import('../core/model.js').DeliveryState>}
 */
function deliveryStates(deliveries) {
  /** @type {Record<string, import('../core/model.js').DeliveryState>} */
  const states = {};
  for (const d of Array.isArray(deliveries) ? deliveries : []) {
    const key = d.sessionId || d.target;
    if (!key) continue;
    states[key] = d.ok ? 'sent' : 'failed';
  }
  return states;
}

/**
 * 汇总结果（供 result 与 echo 复用）
 * @param {SendDelivery[]} deliveries
 * @returns {{status: import('../core/model.js').DeliveryState|undefined, sent: number, failed: number, total: number, failedTargets: string[], failedSessionIds: string[], retryable: boolean, firstReason?: string}}
 */
function summarizeDeliveries(deliveries) {
  const list = Array.isArray(deliveries) ? deliveries : [];
  const states = deliveryStates(list);
  const status = aggregateDeliveryState(states);
  const failed = list.filter((d) => !d.ok);
  const retryable = failed.some((d) => (d.retryable ?? FAILURE_MATRIX[d.reason ?? 'unknown']?.retryable ?? FAILURE_MATRIX.unknown.retryable) !== false);
  return {
    status,
    sent: list.length - failed.length,
    failed: failed.length,
    total: list.length,
    failedTargets: failed.map((d) => d.target),
    failedSessionIds: failed.map((d) => d.sessionId).filter(Boolean),
    retryable,
    firstReason: failed[0]?.reason,
  };
}

/**
 * 把一次发送结果写回 echo（返回新对象，不修改入参）
 * @param {import('../core/model.js').ChannelMessage} echo
 * @param {SendDelivery[]} deliveries
 * @param {{reason?: string}} [extra]
 * @returns {import('../core/model.js').ChannelMessage}
 */
function applyDeliveriesToEcho(echo, deliveries, extra = {}) {
  const summary = summarizeDeliveries(deliveries);
  return {
    ...echo,
    delivery: summary.status,
    deliveries: deliveryStates(deliveries),
    meta: {
      ...(echo.meta ?? {}),
      ...(summary.status === 'failed' || summary.status === 'partial'
        ? { error: summary.firstReason ?? extra.reason ?? 'unknown' }
        : {}),
    },
  };
}

/**
 * 是否仍有在途目标
 * @param {SendDelivery[]} deliveries
 * @returns {boolean}
 */
function hasPending(deliveries) {
  return (Array.isArray(deliveries) ? deliveries : []).some((d) => d.reason === 'sending');
}

Object.assign(__exports, { "createLocalEcho": createLocalEcho, "deliveryStates": deliveryStates, "summarizeDeliveries": summarizeDeliveries, "applyDeliveriesToEcho": applyDeliveriesToEcho, "hasPending": hasPending });
});
/* ── src/send/errors.js ─────────────────────────────────────────── */
__def("src/send/errors.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊发送编排 · 错误分类与失败矩阵（架构 §5.5 + Spike S3）
 *
 * 约定：`reason` 是内部稳定码（T2 用 i18n key 渲染文案，不要直接展示 reason）；
 * `retryable` 决定「重试」按钮是否可用、以及 planRetry 是否把该目标纳入补发。
 */

/**
 * 失败矩阵（照抄架构 §5.5，并补充实现期发现的内部码）
 * @typedef {Object} FailureEntry
 * @property {boolean} retryable
 * @property {string} messageKey  i18n key（T2 文案）
 * @property {string} zh          canonical 中文兜底（core 不渲染，仅测试/降级）
 */

/** @type {Readonly<Record<string, FailureEntry>>} */
const FAILURE_MATRIX = Object.freeze({
  network: { retryable: true, messageKey: 'send.error.network', zh: '发送失败：网络中断，已保留原文' },
  timeout: { retryable: true, messageKey: 'send.error.timeout', zh: '发送超时，已保留原文' },
  unaddressable: { retryable: false, messageKey: 'send.error.unaddressable', zh: '@{name} 已离开，未发送' },
  'parent-offline': { retryable: false, messageKey: 'send.error.parentOffline', zh: '子会话所属成员已离线，未发送' },
  'parent-unavailable': { retryable: true, messageKey: 'send.error.parentUnavailable', zh: '目标成员尚未唤醒，已跳过' },
  readonly: { retryable: false, messageKey: 'send.error.readonly', zh: '团队已结束，群聊为只读历史' },
  forbidden: { retryable: false, messageKey: 'send.error.forbidden', zh: '无权限向该成员发送' },
  'payload-too-large': { retryable: false, messageKey: 'send.error.payloadTooLarge', zh: '内容过长，请分段发送' },
  'rate-limited': { retryable: true, messageKey: 'send.error.rateLimited', zh: '发送过于频繁，请稍后重试' },
  aborted: { retryable: false, messageKey: 'send.error.aborted', zh: '发送已取消' },
  'session-missing': { retryable: false, messageKey: 'send.error.sessionMissing', zh: '会话不可用，未发送' },
  'empty-text': { retryable: false, messageKey: 'send.error.emptyText', zh: '消息不能为空' },
  'targets-overflow': { retryable: false, messageKey: 'send.error.targetsOverflow', zh: '收件人过多，请分批发送' },
  busy: { retryable: false, messageKey: 'send.busy', zh: '上一条消息还在发送中' },
  'channel-missing': { retryable: false, messageKey: 'send.error.channelMissing', zh: '当前会话不可用，无法发送' },
  'retry-exhausted': { retryable: false, messageKey: 'send.retryExhausted', zh: '重试次数已达上限' },
  unknown: { retryable: true, messageKey: 'send.error.unknown', zh: '发送失败，请重试' },
});

/** reason 全集（测试/断言用） */
const FAILURE_REASONS = Object.freeze(Object.keys(FAILURE_MATRIX));

/**
 * @param {string} reason
 * @returns {FailureEntry}
 */
function failureInfo(reason) {
  return FAILURE_MATRIX[reason] ?? FAILURE_MATRIX.unknown;
}

/**
 * 把任意异常/RemoteError 归类为失败矩阵 reason。
 * 兼容：字符串、Error（带 code/status/statusCode）、`{code}`、AbortError、超时标记。
 * @param {any} error
 * @param {{aborted?: boolean, timedOut?: boolean}} [hints]
 * @returns {string}
 */
function classifyError(error, hints = {}) {
  if (hints.timedOut) return 'timeout';
  if (hints.aborted) return 'aborted';
  if (error === undefined || error === null) return 'unknown';
  if (typeof error === 'string') return classifyCode(error);
  if (typeof error === 'object') {
    // RemoteResult {ok:false,error} / 包装错误：先解包再分类
    if (error.ok === false) {
      return classifyError(error.error ?? error.errorMessage ?? error, hints);
    }
    if (error.name === 'AbortError') return 'aborted';
    if (error.timedOut === true || error.code === 'TIMEOUT' || error.code === 'gc/timeout') return 'timeout';
    const code = String(error.code ?? error.status ?? error.statusCode ?? '');
    const reason = classifyCode(code);
    if (reason !== 'unknown') return reason;
    const message = String(error.message ?? '');
    return classifyCode(message) === 'unknown' ? classifyMessage(message) : classifyCode(message);
  }
  return 'unknown';
}

/**
 * @param {string} value
 * @returns {string}
 */
function classifyCode(value) {
  const v = String(value).toLowerCase();
  if (!v) return 'unknown';
  if (v.includes('subagent/parent-unavailable') || v.includes('parent-unavailable')) return 'parent-unavailable';
  if (v.includes('parent-offline') || v.includes('parent offline')) return 'parent-offline';
  if (v.includes('readonly') || v === 'group-chat/readonly') return 'readonly';
  if (v === '403' || v.includes('forbidden') || v.includes('permission') || v.includes('unauthorized')) return 'forbidden';
  if (v.includes('payload') || v.includes('too-large') || v.includes('too large') || v === '413') return 'payload-too-large';
  if (v.includes('rate-limited') || v.includes('rate limit') || v === '429') return 'rate-limited';
  if (v === 'abort' || v.includes('aborted') || v.includes('abort')) return 'aborted';
  if (v.includes('timeout') || v.includes('timed out')) return 'timeout';
  if (v.includes('session-missing') || v.includes('session unavailable')) return 'session-missing';
  if (v.includes('unaddressable') || v.includes('member-left') || v.includes('member.left')) return 'unaddressable';
  if (v.includes('empty-text') || v.includes('empty message')) return 'empty-text';
  if (v.includes('targets-overflow') || v.includes('too many targets')) return 'targets-overflow';
  if (v.includes('retry-exhausted')) return 'retry-exhausted';
  if (v === 'busy' || v.includes('in-flight')) return 'busy';
  if (v.includes('network') || v.includes('transport') || v.includes('fetch') || v.includes('connection') || v.includes('offline')) return 'network';
  if (v.includes('ecONNREFUSED'.toLowerCase()) || v.includes('enotfound') || v.includes('econn')) return 'network';
  return 'unknown';
}

/**
 * @param {string} message
 * @returns {string}
 */
function classifyMessage(message) {
  const m = message.toLowerCase();
  if (m.includes('parent')) return 'parent-unavailable';
  if (m.includes('network') || m.includes('fetch') || m.includes('connection')) return 'network';
  if (m.includes('permission') || m.includes('forbidden')) return 'forbidden';
  return 'unknown';
}

/**
 * 生成单目标失败交付项（ deliveries 元素，T2 可直接消费）
 * @param {{name: string, sessionId?: string}} target
 * @param {string} reason
 * @param {{requestId?: string, attempt?: number, detail?: string}} [extra]
 * @returns {{target: string, sessionId: string, ok: false, error: string, reason: string, retryable: boolean, messageKey: string, requestId?: string, attempt?: number, detail?: string}}
 */
function failedDelivery(target, reason, extra = {}) {
  const info = failureInfo(reason);
  return {
    target: target.name,
    sessionId: target.sessionId ?? '',
    ok: false,
    error: reason,
    reason,
    retryable: info.retryable,
    messageKey: info.messageKey,
    ...(extra.requestId ? { requestId: extra.requestId } : {}),
    ...(typeof extra.attempt === 'number' ? { attempt: extra.attempt } : {}),
    ...(extra.detail ? { detail: extra.detail } : {}),
    ...(extra.errorName ? { errorName: extra.errorName } : {}),
    ...(extra.errorMessage ? { errorMessage: extra.errorMessage } : {}),
    ...(extra.errorCode !== undefined && extra.errorCode !== null && extra.errorCode !== '' ? { errorCode: extra.errorCode } : {}),
    ...(extra.errorStatus !== undefined && extra.errorStatus !== null && extra.errorStatus !== '' ? { errorStatus: extra.errorStatus } : {}),
    ...(extra.errorStatusCode !== undefined && extra.errorStatusCode !== null && extra.errorStatusCode !== ''
      ? { errorStatusCode: extra.errorStatusCode }
      : {}),
  };
}

/**
 * 生成单目标成功交付项
 * @param {{name: string, sessionId?: string}} target
 * @param {{requestId?: string, attempt?: number}} [extra]
 * @returns {{target: string, sessionId: string, ok: true, error?: undefined, reason?: undefined, retryable?: undefined, requestId?: string, attempt?: number}}
 */
function sentDelivery(target, extra = {}) {
  return {
    target: target.name,
    sessionId: target.sessionId ?? '',
    ok: true,
    ...(extra.requestId ? { requestId: extra.requestId } : {}),
    ...(typeof extra.attempt === 'number' ? { attempt: extra.attempt } : {}),
  };
}

/**
 * 失败原因 → 用户文案 key（T2 渲染）
 * @param {string} reason
 * @returns {string}
 */
function messageKeyOf(reason) {
  return failureInfo(reason).messageKey;
}

/** detail/diagnostics 的安全 JSON 上限（字） */
const DIAGNOSTIC_JSON_LIMIT = 500;

/**
 * 安全 JSON（循环引用/Error/BigInt 不抛错），并截断到 limit 字
 * @param {any} value
 * @param {number} [limit]
 * @returns {string}
 */
function safeJson(value, limit = DIAGNOSTIC_JSON_LIMIT) {
  const seen = new WeakSet();
  /** @param {string} key @param {any} val */
  const replacer = (key, val) => {
    if (typeof val === 'bigint') return `${val}n`;
    if (val instanceof Error) {
      return {
        name: val.name,
        message: val.message,
        ...(val.code !== undefined ? { code: scalar(val.code) } : {}),
        ...(val.status !== undefined ? { status: scalar(val.status) } : {}),
        ...(val.statusCode !== undefined ? { statusCode: scalar(val.statusCode) } : {}),
        ...(val.cause ? { cause: val.cause } : {}),
      };
    }
    if (val && typeof val === 'object') {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
      if (Array.isArray(val)) return val;
      const out = {};
      for (const k of Object.keys(val)) {
        try {
          out[k] = val[k];
        } catch {
          out[k] = '[Unreadable]';
        }
      }
      return out;
    }
    if (typeof val === 'function') return '[Function]';
    return val;
  };
  let json;
  try {
    json = JSON.stringify(value, replacer);
  } catch {
    try {
      json = JSON.stringify({ name: 'UnserializableError', message: String(value) });
    } catch {
      json = '{"name":"UnserializableError","message":"<unknown>"}';
    }
  }
  if (typeof json !== 'string') json = String(json);
  return json.length > limit ? `${json.slice(0, Math.max(0, limit - 1))}…` : json;
}

/**
 * @param {any} value
 * @returns {any}
 */
function scalar(value) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

/**
 * 提取可直接展示/诊断的错误字段（兼容 Error / RemoteError / RemoteResult / 字符串 / 嵌套 error）
 * @param {any} input
 * @returns {{name: string, message: string, code?: any, status?: any, statusCode?: any, reason?: any, cause?: {name?: string, message?: string, code?: any}, [k: string]: any}}
 */
function extractErrorInfo(input) {
  let value = input;
  // RemoteResult {ok:false,error}
  if (value && typeof value === 'object' && value.ok === false) {
    value = value.error ?? value.errorMessage ?? value.message ?? value;
  }
  // 双层包装：{error:{code,message}} / {data:{...}}（不覆盖已有 code/message）
  if (
    value &&
    typeof value === 'object' &&
    value.code === undefined &&
    value.message === undefined &&
    value.error &&
    typeof value.error === 'object'
  ) {
    value = value.error;
  }
  if (value === undefined || value === null) return { name: 'UnknownError', message: '' };
  if (typeof value === 'string') return { name: 'Error', message: cap(value, 300) };
  if (typeof value === 'number' || typeof value === 'boolean') {
    return { name: 'Error', message: String(value) };
  }
  if (typeof value !== 'object') return { name: 'Error', message: cap(String(value), 300) };

  /** @type {any} */
  const info = {
    name: cap(String(value.name ?? value.type ?? value.kind ?? 'RemoteError'), 80),
    message: cap(String(value.message ?? value.errorMessage ?? value.reason ?? value.detail ?? ''), 300),
  };
  for (const key of ['code', 'status', 'statusCode', 'reason', 'kind', 'target', 'sessionId', 'method']) {
    const v = value[key];
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') info[key] = scalar(v);
  }
  if (value.data !== undefined && typeof value.data !== 'object') info.data = scalar(value.data);
  if (value.cause) {
    const cause = value.cause;
    info.cause =
      cause instanceof Error || typeof cause === 'object'
        ? {
            name: String(cause.name ?? 'Error'),
            message: cap(String(cause.message ?? ''), 200),
            ...(cause.code !== undefined ? { code: scalar(cause.code) } : {}),
          }
        : { name: 'Error', message: cap(String(cause), 200) };
  }
  if (!info.code && info.cause?.code) info.code = info.cause.code;
  return info;
}

/**
 * 生成失败诊断：`detail` 为安全 JSON（≤500 字），`info` 为结构化字段
 * @param {any} error
 * @param {number} [limit]
 * @returns {{info: any, detail: string}}
 */
function describeError(error, limit = DIAGNOSTIC_JSON_LIMIT) {
  const info = extractErrorInfo(error);
  return { info, detail: safeJson(info, limit) };
}

/**
 * 失败交付项追加诊断字段（基于 describeError 的结果）
 * @param {{name: string, sessionId?: string}} target
 * @param {string} reason
 * @param {any} error
 * @param {{requestId?: string, attempt?: number}} [extra]
 * @returns {{delivery: any, diagnostic: {target: string, sessionId: string, requestId?: string, attempt?: number, reason: string, errorName: string, code?: any, status?: any, message: string, detail: string}}}
 */
function failedDeliveryWithDiagnostics(target, reason, error, extra = {}) {
  const { info, detail } = describeError(error);
  const delivery = failedDelivery(target, reason, {
    ...extra,
    detail,
    errorName: info.name,
    errorMessage: info.message,
    errorCode: info.code,
    errorStatus: info.status,
    errorStatusCode: info.statusCode,
  });
  return {
    delivery,
    diagnostic: {
      target: target.name,
      sessionId: target.sessionId ?? '',
      ...(extra.requestId ? { requestId: extra.requestId } : {}),
      ...(typeof extra.attempt === 'number' ? { attempt: extra.attempt } : {}),
      reason,
      errorName: info.name,
      ...(info.code !== undefined ? { code: info.code } : {}),
      ...(info.status !== undefined ? { status: info.status } : {}),
      message: info.message,
      detail,
    },
  };
}

/**
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function cap(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

Object.assign(__exports, { "FAILURE_MATRIX": FAILURE_MATRIX, "FAILURE_REASONS": FAILURE_REASONS, "failureInfo": failureInfo, "classifyError": classifyError, "failedDelivery": failedDelivery, "sentDelivery": sentDelivery, "messageKeyOf": messageKeyOf, "DIAGNOSTIC_JSON_LIMIT": DIAGNOSTIC_JSON_LIMIT, "safeJson": safeJson, "extractErrorInfo": extractErrorInfo, "describeError": describeError, "failedDeliveryWithDiagnostics": failedDeliveryWithDiagnostics });
});
/* ── src/send/index.js ─────────────────────────────────────────── */
__def("src/send/index.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊发送编排（T3）· 公共 API
 *
 * 冻结入口（T2 消费）：
 *   `sendChannelBatch(request) → Promise<{status, deliveries, clientBatchId, requestIds, ...}>`
 *   request: `{ text, mentions?, targets?, channelId, clientBatchId?, mode?, deps:{ctx} }`
 *   targets 兼容 `[{name, sessionId}]` 与 `['lead','ux']`；未 @ 时由 mentions+成员目录解析（默认 lead）。
 *
 * 质量属性：串行 lead 先、单飞、200ms 限流、requestId 幂等、四态聚合、手动重试只补失败目标。
 */

const { sendChannelBatch, getBatchRecord, resetSendState, deliveryStatesOf, batchRegistry, safeCtxGet } = __req("src/send/send-batch.js");
const { classifyError, FAILURE_MATRIX, FAILURE_REASONS, failureInfo, messageKeyOf, failedDelivery, sentDelivery, failedDeliveryWithDiagnostics, describeError, extractErrorInfo, safeJson, DIAGNOSTIC_JSON_LIMIT } = __req("src/send/errors.js");
const { applyDeliveriesToEcho, createLocalEcho, deliveryStates, hasPending, summarizeDeliveries } = __req("src/send/delivery.js");
const { normalizeSendTargets, targetNamesOf, sessionIdOf } = __req("src/send/targets.js");
const { checkTargetAvailability, MODE_TABLE, orderByLeadFirst, resolveMode, SEND_MODES } = __req("src/send/mode.js");
const { backoffMs, mergeRetryResult, planRetry, retryChannelBatch } = __req("src/send/retry.js");
const { createSendController } = __req("src/send/send-controller.js");
const { createRateLimiter, createSingleFlight, defaultSingleFlight, withTimeout } = __req("src/send/rate-limit.js");


Object.assign(__exports, { "sendChannelBatch": sendChannelBatch, "createSendController": createSendController, "safeCtxGet": safeCtxGet, "planRetry": planRetry, "retryChannelBatch": retryChannelBatch, "mergeRetryResult": mergeRetryResult, "backoffMs": backoffMs, "createLocalEcho": createLocalEcho, "applyDeliveriesToEcho": applyDeliveriesToEcho, "deliveryStates": deliveryStates, "deliveryStatesOf": deliveryStatesOf, "summarizeDeliveries": summarizeDeliveries, "hasPending": hasPending, "normalizeSendTargets": normalizeSendTargets, "targetNamesOf": targetNamesOf, "sessionIdOf": sessionIdOf, "orderByLeadFirst": orderByLeadFirst, "resolveMode": resolveMode, "checkTargetAvailability": checkTargetAvailability, "MODE_TABLE": MODE_TABLE, "SEND_MODES": SEND_MODES, "createSingleFlight": createSingleFlight, "defaultSingleFlight": defaultSingleFlight, "createRateLimiter": createRateLimiter, "withTimeout": withTimeout, "FAILURE_MATRIX": FAILURE_MATRIX, "FAILURE_REASONS": FAILURE_REASONS, "classifyError": classifyError, "failureInfo": failureInfo, "messageKeyOf": messageKeyOf, "failedDelivery": failedDelivery, "sentDelivery": sentDelivery, "failedDeliveryWithDiagnostics": failedDeliveryWithDiagnostics, "describeError": describeError, "extractErrorInfo": extractErrorInfo, "safeJson": safeJson, "DIAGNOSTIC_JSON_LIMIT": DIAGNOSTIC_JSON_LIMIT, "batchRegistry": batchRegistry, "getBatchRecord": getBatchRecord, "resetSendState": resetSendState });
});
/* ── src/send/mode.js ─────────────────────────────────────────── */
__def("src/send/mode.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊发送编排 · mode 选择与目标可用性预检（架构 §5.3 / Spike S3）
 *
 * **mode 契约（PRD §6.1/§6.3 冻结）**：所有目标统一 `'steer'`——插入最近 step 边界、不打断当前 step；
 * S3 实测 `steer` 也会唤醒 inactive/冷目标（区别只在 inbox 落点）。`queue` 同样会唤醒，但 PRD 已冻结
 * steer，v1 不提供双策略；如未来产品改口径，只需改本文件 `MODE_TABLE` / 调用方传入 `mode`（ADR 记录）。
 *
 * 为什么仍保留「lead vs 子会话」表：两者走同一个 `binding(id).session.prompt`，但**顺序**不同——
 * 必须「先 lead（顺带 resume 父链）→ 再成员」，否则子会话可能报 `subagent/parent-unavailable`（S3 硬约束）。
 */

/**
 * @typedef {import('./targets.js').SendTarget} SendTarget
 */

/** @type {Readonly<Record<string, 'steer'|'queue'>>} */
const MODE_TABLE = Object.freeze({
  lead: 'steer',
  teammate: 'steer',
  subagent: 'steer',
  unknown: 'steer',
  system: 'steer',
});

/** 支持的 mode 值 */
const SEND_MODES = Object.freeze(['steer', 'queue', 'inject']);

/**
 * 目标 mode（显式传入优先；否则按 kind 查表）
 * @param {SendTarget} target
 * @param {{mode?: string, strategy?: string}} [opts]
 * @returns {'steer'|'queue'|'inject'}
 */
function resolveMode(target, opts = {}) {
  if (opts.mode && SEND_MODES.includes(opts.mode)) return /** @type {any} */ (opts.mode);
  if (opts.mode === 'auto') return 'steer';
  const kind = String(target?.kind ?? 'unknown');
  return MODE_TABLE[kind] ?? 'steer';
}

/**
 * 发送顺序：lead 优先，其余保持传入顺序（§5.3 4a/4b；禁止并行乱序）
 * @param {SendTarget[]} targets
 * @returns {SendTarget[]}
 */
function orderByLeadFirst(targets) {
  const list = Array.isArray(targets) ? targets : [];
  const lead = list.find((t) => t.name === 'lead' || t.kind === 'lead');
  const rest = list.filter((t) => t !== lead);
  return lead ? [lead, ...rest] : rest.slice();
}

/**
 * 目标可用性预检（不发起网络；返回不可发送的原因码）
 * @param {SendTarget} target
 * @param {{readonly?: boolean, members?: import('../core/model.js').ChannelMember[], channelId?: string, isRunning?: (sessionId: string) => boolean}} [deps]
 * @returns {{sendable: boolean, reason?: string, detail?: string, warn?: string}}
 */
function checkTargetAvailability(target, deps = {}) {
  if (deps.readonly === true) return { sendable: false, reason: 'readonly' };
  const name = String(target?.name ?? '');
  const sessionId = String(target?.sessionId ?? '');
  const members = Array.isArray(deps.members) ? deps.members : [];
  const member = members.find((m) => m.sessionId === sessionId) ?? members.find((m) => m.name === name);

  if (target?.addressable === false) return { sendable: false, reason: 'unaddressable', detail: name };
  if (target?.parentAvailable === false && (target?.kind === 'subagent' || member?.kind === 'subagent')) {
    return { sendable: false, reason: 'parent-offline', detail: name };
  }
  if (member && member.addressable === false) return { sendable: false, reason: 'unaddressable', detail: name };
  if (member && member.kind === 'subagent' && member.parentAvailable === false) {
    return { sendable: false, reason: 'parent-offline', detail: name };
  }
  if (!sessionId) {
    // lead 可用 channelId 兜底；其它成员没有 sessionId 说明名册映射失败
    if (name === 'lead' && deps.channelId) return { sendable: true };
    return { sendable: false, reason: 'unaddressable', detail: name };
  }
  // 离线不阻断（steer 会唤醒），只作为弱信号留给 UI
  const running = typeof target?.running === 'boolean' ? target.running : member?.status === 'running';
  const warn = running === false ? 'target-offline' : undefined;
  return { sendable: true, ...(warn ? { warn } : {}) };
}

Object.assign(__exports, { "MODE_TABLE": MODE_TABLE, "SEND_MODES": SEND_MODES, "resolveMode": resolveMode, "orderByLeadFirst": orderByLeadFirst, "checkTargetAvailability": checkTargetAvailability });
});
/* ── src/send/rate-limit.js ─────────────────────────────────────────── */
__def("src/send/rate-limit.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊发送编排 · 单飞（single-flight）与频率限制（架构 §5.4 / Spike S3）
 *
 * - 单飞：同一频道同一时刻只允许 1 个发送批次；不同频道互不阻塞。
 * - 频率：同一批次内相邻 prompt 至少间隔 `minIntervalMs`（默认 200ms），且必须先 lead 后成员（串行）。
 * - 锁带陈旧超时（默认 120s），避免异常未释放导致永久卡死；测试可注入 now。
 */

const { LIMITS } = __req("src/core/constants.js");

/**
 * @typedef {Object} SingleFlight
 * @property {(key: string, batchId: string) => {ok: boolean, reason?: 'busy'|'same-batch', holder?: string}} tryAcquire
 * @property {(key: string, batchId: string) => void} release
 * @property {(key: string) => {id: string, startedAt: number}|undefined} get
 * @property {() => void} clear
 */

/**
 * @param {{now?: () => number, staleMs?: number}} [opts]
 * @returns {SingleFlight}
 */
function createSingleFlight(opts = {}) {
  const now = opts.now ?? (() => Date.now());
  const staleMs = opts.staleMs ?? 120_000;
  /** @type {Map<string, {id: string, startedAt: number}>} */
  const locks = new Map();
  return {
    tryAcquire(key, batchId) {
      const current = locks.get(key);
      if (current) {
        const age = now() - current.startedAt;
        if (age < staleMs) {
          if (current.id === batchId) return { ok: false, reason: 'same-batch', holder: current.id };
          return { ok: false, reason: 'busy', holder: current.id };
        }
        locks.delete(key); // 陈旧锁强制释放
      }
      locks.set(key, { id: batchId, startedAt: now() });
      return { ok: true };
    },
    release(key, batchId) {
      const current = locks.get(key);
      if (current && current.id === batchId) locks.delete(key);
    },
    get(key) {
      return locks.get(key);
    },
    clear() {
      locks.clear();
    },
  };
}

/** 模块级默认单飞（生产 client 直接使用；测试可注入自己的实例） */
const defaultSingleFlight = createSingleFlight();

/**
 * @typedef {Object} RateLimiter
 * @property {<T>(fn: () => Promise<T>|T) => Promise<T>} run
 * @property {() => number} lastStartedAt
 * @property {() => number} count
 */

/**
 * 串行节流器：相邻任务开始时间至少间隔 minIntervalMs。
 * @param {{minIntervalMs?: number, now?: () => number, sleep?: (ms: number) => Promise<void>, signal?: AbortSignal}} [opts]
 * @returns {RateLimiter}
 */
function createRateLimiter(opts = {}) {
  const minIntervalMs = opts.minIntervalMs ?? LIMITS.minIntervalMs;
  const now = opts.now ?? (() => Date.now());
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let last = -Infinity;
  let chain = Promise.resolve();
  let count = 0;
  return {
    run(fn) {
      const next = chain.then(async () => {
        const current = now();
        const wait = Number.isFinite(last) ? minIntervalMs - (current - last) : 0;
        if (wait > 0) await sleep(wait);
        last = now();
        count += 1;
        return fn();
      });
      chain = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
    lastStartedAt: () => last,
    count: () => count,
  };
}

/**
 * 30s 超时包装（arch §5.4：单目标 prompt 30s 未 accepted 视为 failed/timeout）
 * @template T
 * @param {Promise<T>|T} value
 * @param {{timeoutMs?: number, signal?: AbortSignal, sleep?: (ms: number) => Promise<void>}} [opts]
 * @returns {Promise<T>}
 */
function withTimeout(value, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? LIMITS.promptTimeoutMs;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.resolve(value);
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const error = new Error('prompt timed out');
      // @ts-ignore
      error.code = 'gc/timeout';
      // @ts-ignore
      error.timedOut = true;
      reject(error);
    }, timeoutMs);
    Promise.resolve(value).then(
      (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

Object.assign(__exports, { "createSingleFlight": createSingleFlight, "defaultSingleFlight": defaultSingleFlight, "createRateLimiter": createRateLimiter, "withTimeout": withTimeout });
});
/* ── src/send/retry.js ─────────────────────────────────────────── */
__def("src/send/retry.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊发送编排 · 重试（架构 §5.3 第 7 步 / §5.4）
 *
 * 规则：
 *  - **只补失败目标**，成功目标永不重发（PRD F9 / SC30）；
 *  - **复用原 `requestId`**：Host 按 rpcId 幂等去重（Spike S2），重发不会双投；
 *  - 同一 `clientBatchId` 继续使用 → 群聊仍只有 1 条气泡；前缀沿用首次的 canonical 两行；
 *  - ≤ `maxRetry`（默认 2）次 + 退避；不自动重试（手动触发，UX Q2）。
 */

const { LIMITS } = __req("src/core/constants.js");
const { failureInfo } = __req("src/send/errors.js");
const { sendChannelBatch } = __req("src/send/send-batch.js");
const { summarizeDeliveries, deliveryStates } = __req("src/send/delivery.js");
const { aggregateDeliveryState } = __req("src/core/fanout.js");

/**
 * @typedef {import('./send-batch.js').SendResult} SendResult
 * @typedef {import('./send-batch.js').SendDeps} SendDeps
 * @typedef {import('../core/model.js').DeliveryState} DeliveryState
 */

/**
 * @typedef {Object} RetryPlan
 * @property {boolean} allowed
 * @property {number} attempt
 * @property {number} nextAttempt
 * @property {Array<{name: string, sessionId: string}>} targets
 * @property {string} clientBatchId
 * @property {Record<string, string>} requestIds
 * @property {string} [reason]
 * @property {string} [messageKey]
 * @property {string[]} skipped 非可重试失败目标名（保留失败态，不再补发）
 */

/**
 * 规划重试（纯函数，不发起请求）
 * @param {SendResult} result
 * @param {{maxRetry?: number}} [opts]
 * @returns {RetryPlan}
 */
function planRetry(result, opts = {}) {
  const maxRetry = Number.isInteger(opts.maxRetry) ? Number(opts.maxRetry) : LIMITS.maxRetry;
  const attempt = Number(result?.attempt ?? 1);
  const deliveries = Array.isArray(result?.deliveries) ? result.deliveries : [];
  const failed = deliveries.filter((d) => !d.ok);
  const retryable = failed.filter((d) => d.retryable !== false);
  const skipped = failed.filter((d) => d.retryable === false).map((d) => d.target);
  /** @type {RetryPlan} */
  const plan = {
    allowed: false,
    attempt,
    nextAttempt: attempt + 1,
    targets: retryable.map((d) => ({ name: d.target, sessionId: d.sessionId })),
    clientBatchId: String(result?.clientBatchId ?? ''),
    requestIds: result?.requestIds ?? {},
    skipped,
  };
  if (attempt > maxRetry) {
    plan.reason = 'retry-exhausted';
    plan.messageKey = failureInfo('retry-exhausted').messageKey;
    return plan;
  }
  // F-06：上一批 deliveries 为空（历史空 targets bug）时，按 channelId 重试 lead；channelId 也空 → channel-missing
  if (deliveries.length === 0) {
    const channelId = String(result?.channelId ?? '');
    if (channelId) {
      plan.allowed = true;
      plan.targets = [{ name: 'lead', sessionId: channelId }];
      return plan;
    }
    plan.reason = 'channel-missing';
    plan.messageKey = failureInfo('channel-missing').messageKey;
    return plan;
  }
  if (retryable.length === 0) {
    plan.reason = 'no-retryable-target';
    plan.messageKey = failureInfo(failed.length > 0 ? failed[0].reason ?? 'unknown' : 'unknown').messageKey;
    return plan;
  }
  plan.allowed = true;
  return plan;
}

/**
 * 退避（ms）：第 1 次重试 300ms，第 2 次 900ms（≤2 次；不再放大）
 * @param {number} attempt 已完成次数（1 = 首次失败后）
 * @returns {number}
 */
function backoffMs(attempt) {
  if (attempt <= 0) return 0;
  return attempt === 1 ? 300 : 900;
}

/**
 * 合并重试结果：失败目标用新结果覆盖，成功目标维持原值；聚合四态
 * @param {SendResult} previous
 * @param {SendResult} next
 * @returns {SendResult}
 */
function mergeRetryResult(previous, next) {
  /** @type {Map<string, import('./send-batch.js').SendDeliveryItem>} */
  const byKey = new Map();
  for (const d of previous.deliveries ?? []) byKey.set(d.sessionId || d.target, d);
  for (const d of next.deliveries ?? []) byKey.set(d.sessionId || d.target, d);
  const deliveries = [...byKey.values()];
  const summary = summarizeDeliveries(deliveries);
  const status = /** @type {DeliveryState} */ (aggregateDeliveryState(deliveryStates(deliveries)) ?? summary.status ?? 'failed');
  return {
    ...next,
    deliveries,
    status,
    attempt: next.attempt,
    ...(status === 'failed' || status === 'partial'
      ? { reason: summary.firstReason, messageKey: summary.firstReason ? failureInfo(summary.firstReason).messageKey : undefined }
      : { reason: undefined, messageKey: undefined }),
    retryable: summary.retryable,
    echo: next.echo ?? previous.echo,
  };
}

/**
 * 执行一次重试（只发失败目标；复用 requestId；退避）
 * @param {SendResult} result
 * @param {SendDeps} [deps]
 * @param {{maxRetry?: number, skipBackoff?: boolean}} [opts]
 * @returns {Promise<SendResult & {retryPlan?: RetryPlan, retrySkipped?: boolean}>}
 */
async function retryChannelBatch(result, deps = {}, opts = {}) {
  const plan = planRetry(result, { maxRetry: opts.maxRetry ?? deps.maxRetry });
  if (!plan.allowed) {
    return { ...result, retryPlan: plan, retrySkipped: true };
  }
  if (!opts.skipBackoff) {
    const wait = backoffMs(plan.attempt);
    if (wait > 0) {
      if (typeof deps.sleep === 'function') await deps.sleep(wait);
      else await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  const next = await sendChannelBatch({
    text: result.text,
    mentions: [],
    targets: plan.targets,
    channelId: result.channelId,
    clientBatchId: plan.clientBatchId,
    deps: { ...deps, maxRetry: opts.maxRetry ?? deps.maxRetry },
  });
  const merged = mergeRetryResult(result, next);
  return { ...merged, retryPlan: plan };
}

Object.assign(__exports, { "planRetry": planRetry, "backoffMs": backoffMs, "mergeRetryResult": mergeRetryResult, "retryChannelBatch": retryChannelBatch });
});
/* ── src/send/send-batch.js ─────────────────────────────────────────── */
__def("src/send/send-batch.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊发送编排 · `sendChannelBatch`（T2 冻结入口）
 *
 * 契约：架构 §5.1–§5.5 + Spike S2/S3。
 *  - 目标解析：未 @ 默认 Lead；targets>1 注入 canonical 两行前缀（core/protocol 单点常量）
 *  - fan-out：逐目标 `sessions.binding(id).session.prompt([parts...], mode, signal, requestId)`，**串行、lead 先**
 *  - 四态：sending/sent/partial/failed；每目标独立结果
 *  - 幂等：`clientBatchId` + 每目标 `requestId`（重试复用同一 requestId，Host 按 rpcId 去重）
 *  - 单飞：同一频道同一时刻仅 1 个批次；限流：相邻 prompt ≥ 200ms
 *
 * T2 调用形状（frontend 实际代码）：
 *   `sendChannelBatch({text, mentions, targets:[{name,sessionId}], channelId, clientBatchId, deps:{ctx}})`
 *   → `{status, deliveries:[{target, sessionId, ok, error?}]}`
 * 额外字段（可选消费）：`clientBatchId, requestIds, targets, targetNames, prefixParts, echo, reason, messageKey, retryable, attempt, dropped`
 */

const { LIMITS } = __req("src/core/constants.js");
const { buildParts } = __req("src/core/protocol.js");
const { hashText, normalizeText } = __req("src/core/dedupe.js");
const { normalizeSendTargets, targetNamesOf } = __req("src/send/targets.js");
const { orderByLeadFirst, resolveMode, checkTargetAvailability } = __req("src/send/mode.js");
const { classifyError, failureInfo, failedDelivery, failedDeliveryWithDiagnostics, describeError, sentDelivery } = __req("src/send/errors.js");
const { applyDeliveriesToEcho, createLocalEcho, deliveryStates, summarizeDeliveries } = __req("src/send/delivery.js");
const { createRateLimiter, defaultSingleFlight, withTimeout } = __req("src/send/rate-limit.js");

/**
 * @typedef {import('../core/model.js').DeliveryState} DeliveryState
 * @typedef {import('../core/model.js').ChannelMessage} ChannelMessage
 * @typedef {import('./targets.js').SendTarget} SendTarget
 */

/**
 * @typedef {Object} SendRequest
 * @property {string} text
 * @property {string[]} [mentions]
 * @property {Array<string|{name?: string, label?: string, sessionId?: string, kind?: string, addressable?: boolean, parentAvailable?: boolean, running?: boolean}>} [targets]
 * @property {string} channelId
 * @property {string} [clientBatchId]
 * @property {'steer'|'queue'|'inject'|'auto'} [mode]
 * @property {SendDeps} [deps]
 */

/**
 * @typedef {Object} SendDeps
 * @property {any} [ctx]                     Cordis client ctx（真实路径）
 * @property {(sessionId: string) => any} [binding]
 * @property {(sessionId: string, parts: any[], mode: string, signal: AbortSignal|undefined, requestId: string) => Promise<any>} [prompt]
 * @property {() => string} [uuid]
 * @property {() => number} [now]
 * @property {(ms: number) => Promise<void>} [sleep]
 * @property {AbortSignal} [signal]
 * @property {import('../core/model.js').ChannelMember[]} [members]
 * @property {boolean} [readonly]
 * @property {number} [timeoutMs]
 * @property {number} [minIntervalMs]
 * @property {number} [maxRetry]
 * @property {number} [maxTargets]
 * @property {any} [singleFlight]
 * @property {Map<string, any>} [batchRegistry]
 * @property {any} [rateLimiter]
 * @property {(event: any) => void} [onDelivery]
 * @property {(echo: ChannelMessage) => void} [onEcho]
 * @property {(batch: {clientBatchId: string, channelId: string, attempt?: number, targets: Array<{name: string, sessionId: string, kind?: string}>, targetNames: string[], requestIds: Record<string, string>, sessionIds: string[]}) => void} [onBatch]  F-07：prompt 前回调，UI 用它维护 localBatches
 * @property {boolean} [suppressEcho]
 * @property {Record<string, any>} [localBatches]  M4：与 adapter ctx.localBatches 同一对象引用（UI 在 onBatch 写入）
 * @property {(error: any) => void} [onBatchError]  M4：onBatch 回调异常可观测钩子
 */

/**
 * @typedef {Object} SendDeliveryItem
 * @property {string} target
 * @property {string} sessionId
 * @property {boolean} ok
 * @property {string} [error]
 * @property {string} [reason]
 * @property {boolean} [retryable]
 * @property {string} [messageKey]
 * @property {string} [requestId]
 * @property {number} [attempt]
 * @property {string} [detail]                 安全 JSON（≤500 字，失败诊断）
 * @property {string} [errorName]
 * @property {string} [errorMessage]
 * @property {string|number} [errorCode]
 * @property {string|number} [errorStatus]
 * @property {string|number} [errorStatusCode]
 */

/**
 * @typedef {Object} SendResult
 * @property {DeliveryState} status
 * @property {SendDeliveryItem[]} deliveries
 * @property {string} clientBatchId
 * @property {string} channelId
 * @property {string} text
 * @property {Array<{name: string, sessionId: string}>} targets
 * @property {string[]} targetNames
 * @property {string[]} prefixParts
 * @property {Record<string, string>} requestIds
 * @property {string} mode
 * @property {number} attempt
 * @property {ChannelMessage} [echo]
 * @property {string} [reason]
 * @property {string} [messageKey]
 * @property {boolean} retryable
 * @property {Array<{name: string, reason: string}>} [dropped]
 * @property {string[]} [warnings]
 * @property {Array<{target: string, sessionId?: string, requestId?: string, attempt?: number, reason: string, errorName: string, code?: string|number, status?: string|number, message: string, detail?: string}>} diagnostics
 */

/** 模块级批次登记表：重试一致性（同一 batchId 复用 targetNames/prefix/requestIds） */
const batchRegistry = new Map();

/** 登记表上限（避免长会话内存增长） */
const REGISTRY_MAX = 200;

/**
 * @param {Map<string, any>} registry
 * @param {string} batchId
 * @param {any} record
 */
function rememberBatch(registry, batchId, record) {
  registry.set(batchId, record);
  if (registry.size > REGISTRY_MAX) {
    const first = registry.keys().next();
    if (!first.done) registry.delete(first.value);
  }
}

/**
 * @param {SendDeps} deps
 * @returns {() => string}
 */
function uuidFactory(deps) {
  if (typeof deps.uuid === 'function') return deps.uuid;
  return () => {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
      }
    } catch {
      /* ignore */
    }
    return `gc-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
  };
}

/**
 * 安全读取 Cordis ctx 服务（未 inject 的服务属性裸访问会抛
 * `cannot get property "xxx" without inject`）：
 *  - 优先 `ctx.get(key)`（Cordis 的显式服务读取，未注入返回 undefined）；
 *  - 再退回 try/catch 的属性读取；
 *  - 任何异常都返回 fallback，绝不向上抛。
 * @param {any} ctx
 * @param {string} key
 * @param {any} [fallback]
 * @returns {any}
 */
function safeCtxGet(ctx, key, fallback = undefined) {
  if (!ctx || !key) return fallback;
  try {
    if (typeof ctx.get === 'function') {
      const value = ctx.get(key);
      if (value !== undefined && value !== null) return value;
    }
  } catch {
    /* ctx.get 本身可能因未注入/已 dispose 抛错，也覆盖「ctx.get 属性访问即抛」的代理 */
  }
  try {
    const value = ctx[key];
    return value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

/**
 * isRunning 解析：deps.isRunning（函数）→ safeCtxGet(ctx,'isRunning') → undefined
 * @param {SendDeps} deps
 * @returns {((sessionId: string) => boolean)|undefined}
 */
function resolveIsRunning(deps) {
  if (typeof deps.isRunning === 'function') return deps.isRunning;
  const fromCtx = safeCtxGet(deps.ctx, 'isRunning');
  return typeof fromCtx === 'function' ? fromCtx : undefined;
}

/**
 * 解析单目标 prompt 函数（真实路径 `binding(id).session.prompt`）
 * @param {SendTarget} target
 * @param {SendDeps} deps
 * @param {string} channelId
 * @returns {((parts: any[], mode: string, signal: AbortSignal|undefined, requestId: string) => Promise<any>) | undefined}
 */
function promptFor(target, deps, channelId) {
  const sessionId = target.sessionId || (target.name === 'lead' ? channelId : '');
  if (!sessionId) return undefined;
  if (typeof deps.prompt === 'function') {
    return (parts, mode, signal, requestId) => deps.prompt(sessionId, parts, mode, signal, requestId);
  }
  let binding;
  try {
    if (typeof deps.binding === 'function') {
      binding = deps.binding(sessionId);
    } else {
      const sessions = safeCtxGet(deps.ctx, 'sessions');
      binding = typeof sessions?.binding === 'function' ? sessions.binding(sessionId) : undefined;
    }
  } catch {
    return undefined;
  }
  const session = binding?.session;
  if (!session || typeof session.prompt !== 'function') return undefined;
  return (parts, mode, signal, requestId) => session.prompt(parts, mode, signal, requestId);
}

/**
 * @param {SendRequest & {request?: any}} request
 * @param {string} reason
 * @param {Array<{name: string, sessionId: string}>} targets
 * @returns {SendResult}
 */
function failureResult(request, reason, targets = []) {
  const info = failureInfo(reason);
  const deliveries = targets.map((t) => failedDelivery(t, reason));
  const summary = summarizeDeliveries(deliveries);
  return {
    status: 'failed',
    deliveries,
    clientBatchId: String(request.clientBatchId ?? ''),
    channelId: String(request.channelId ?? ''),
    text: String(request.text ?? ''),
    targets: targets.map((t) => ({ name: t.name, sessionId: t.sessionId })),
    targetNames: targets.map((t) => t.name),
    prefixParts: [],
    requestIds: {},
    mode: 'steer',
    attempt: 1,
    reason,
    messageKey: info.messageKey,
    retryable: info.retryable,
    dropped: [],
    warnings: [],
    diagnostics: [],
  };
}

/**
 * 群聊发送编排（一次 fan-out；单飞 + 限流 + 四态）
 * @param {SendRequest} request
 * @returns {Promise<SendResult>}
 */
async function sendChannelBatch(request) {
  const deps = /** @type {SendDeps} */ (request?.deps ?? {});
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const uuid = uuidFactory(deps);
  const channelId = String(request?.channelId ?? '');
  const body = String(request?.text ?? '');
  const maxRetry = Number.isInteger(deps.maxRetry) ? Number(deps.maxRetry) : LIMITS.maxRetry;
  const minIntervalMs = Number.isFinite(deps.minIntervalMs) ? Number(deps.minIntervalMs) : LIMITS.minIntervalMs;
  const timeoutMs = Number.isFinite(deps.timeoutMs) ? Number(deps.timeoutMs) : LIMITS.promptTimeoutMs;
  const registry = deps.batchRegistry ?? batchRegistry;
  const singleFlight = deps.singleFlight ?? defaultSingleFlight;
  const batchId = String(request?.clientBatchId ?? `gc-${uuid()}`);

  if (!body.trim()) return { ...failureResult({ ...request, clientBatchId: batchId }, 'empty-text'), attempt: 1 };

  const existing = registry.get(batchId);
  const attempt = Number(existing?.attempts ?? 0) + 1;
  if (attempt > 1 + maxRetry) {
    return { ...failureResult({ ...request, clientBatchId: batchId }, 'retry-exhausted'), attempt };
  }

  // F-06：阶段标记 —— 外层异常时定位「进入 target 循环前」的抛错点
  // stage ∈ init|acquire|normalize|targets|echo|limiter|loop|finally
  let stage = 'init';
  /** @type {SendTarget[]} */
  let knownTargets = [];
  let knownTargetNames = [];
  let knownPrefixParts = [];
  /** @type {Record<string,string>} */
  let knownRequestIds = {};
  let knownMode = 'steer';
  /** @type {ChannelMessage|undefined} */
  let knownEcho;
  const lockKey = channelId || 'channel';

  /**
   * 外层异常兜底：带 stage 的 diagnostics + informative delivery（无 targets 时合成 lead/channelId 占位）
   * @param {any} error
   * @param {string} stageName
   * @param {string} [reasonOverride]
   * @returns {SendResult}
   */
  function failWithStage(error, stageName, reasonOverride) {
    const reason = reasonOverride ?? classifyError(error);
    const { info, detail } = describeError(error);
    const failTargets =
      knownTargets.length > 0
        ? knownTargets
        : [{ name: 'lead', sessionId: channelId || '', kind: 'lead' }];
    /** @type {SendDeliveryItem[]} */
    const deliveries = failTargets.map((t) => {
      const failed = failedDeliveryWithDiagnostics(t, reason, error, { attempt }).delivery;
      return { ...failed, stage: stageName };
    });
    const requestIdOf = (t) => knownRequestIds[t.sessionId || t.name];
    const diagnostics = failTargets.map((t) => ({
      stage: stageName,
      target: t.name,
      sessionId: t.sessionId ?? '',
      ...(requestIdOf(t) ? { requestId: requestIdOf(t) } : {}),
      reason,
      errorName: info.name,
      ...(info.code !== undefined ? { code: info.code } : {}),
      ...(info.status !== undefined ? { status: info.status } : {}),
      message: info.message,
      detail,
    }));
    logSendError(error, failTargets[0], requestIdOf(failTargets[0]) ?? '');
    // M4/H1：外层异常也属于终态（failed），关闭 localBatches 条目（弱匹配不再使用，rpcId 仍可替换 echo）
    markLocalBatchClosed(deps, batchId, 'failed', now);
    return {
      status: 'failed',
      deliveries,
      clientBatchId: batchId,
      channelId,
      text: body,
      targets: failTargets.map((t) => ({ name: t.name, sessionId: t.sessionId ?? '' })),
      targetNames: knownTargetNames.length > 0 ? knownTargetNames : failTargets.map((t) => t.name),
      prefixParts: knownPrefixParts,
      requestIds: knownRequestIds,
      mode: knownMode,
      attempt,
      ...(knownEcho ? { echo: knownEcho } : {}),
      reason,
      messageKey: failureInfo(reason).messageKey,
      retryable: failureInfo(reason).retryable,
      dropped: [],
      warnings: [`stage:${stageName}`],
      diagnostics,
    };
  }

  stage = 'acquire';
  let lock;
  try {
    lock = singleFlight.tryAcquire(lockKey, batchId);
  } catch (error) {
    // 锁获取异常：尝试释放（防半获取），再按 busy 归类
    try {
      singleFlight.release(lockKey, batchId);
    } catch {
      /* ignore */
    }
    return failWithStage(error, 'acquire', 'busy');
  }
  if (!lock.ok) {
    const result = { ...failureResult({ ...request, clientBatchId: batchId }, 'busy'), attempt };
    result.warnings = [lock.reason === 'same-batch' ? 'same-batch-in-flight' : 'channel-busy'];
    result.diagnostics = [
      {
        stage: 'acquire',
        reason: 'busy',
        errorName: 'LockBusy',
        message: lock.reason === 'same-batch' ? 'same batch is already in flight' : 'channel has an in-flight batch',
      },
    ];
    return result;
  }

  stage = 'normalize';
  try {
    const normalized = normalizeSendTargets({
      targets: request?.targets,
      mentions: request?.mentions,
      text: body,
      members: deps.members,
      channelId,
      maxTargets: deps.maxTargets,
    });
    let targets = orderByLeadFirst(normalized.targets);
    knownTargets = targets;
    stage = 'targets';
    if (targets.length === 0) {
      if (channelId) {
        // F-06：单 agent / channel.lead 缺失时 UI 可能解析出空 targets；频道根即 lead → 合成单目标继续发送
        targets = [{ name: 'lead', sessionId: channelId, kind: 'lead' }];
      } else {
        // channelId 也缺失：明确失败（带 reason/messageKey/delivery，不再返回无信息的 failed）
        const failed = failureResult({ ...request, clientBatchId: batchId }, 'channel-missing', [
          { name: 'lead', sessionId: '' },
        ]);
        return { ...failed, attempt };
      }
    }

    knownTargets = targets;
    const targetNames = Array.isArray(existing?.targetNames) && existing.targetNames.length > 0
      ? existing.targetNames
      : targetNamesOf(targets);
    knownTargetNames = targetNames;
    const prefixParts = Array.isArray(existing?.prefixParts) ? existing.prefixParts : buildParts(targetNames, body);
    const baseParts = prefixParts.length > 0 ? prefixParts : [body];
    const promptParts = baseParts.map((text) => ({ type: 'text', text }));

    /** @type {Record<string, string>} */
    const requestIds = { ...(existing?.requestIds ?? {}) };
    for (const target of targets) {
      const key = target.sessionId || target.name;
      if (!requestIds[key]) requestIds[key] = uuid();
    }
    knownRequestIds = requestIds;

    const mode = resolveMode(targets[0], { mode: request?.mode });
    knownMode = mode;

    /** @type {SendDeliveryItem[]} */
    const deliveries = [];
    /** @type {string[]} */
    const warnings = [];

    // F-07：prompt 前把本批 id/requestIds/targets 交给 UI（维护 localBatches，权威消息才能替换本地 echo）。
    // H1/M4：payload 含 text/textHash/at，供无 rpcId 的严格弱匹配；回调异常需可观测（warnings + onBatchError）。
    if (typeof deps.onBatch === 'function') {
      try {
        deps.onBatch({
          clientBatchId: batchId,
          channelId,
          attempt,
          targets: targets.map((t) => ({ name: t.name, sessionId: t.sessionId ?? '', kind: t.kind })),
          targetNames,
          requestIds: { ...requestIds },
          sessionIds: targets.map((t) => t.sessionId || (t.name === 'lead' ? channelId : '')).filter(Boolean),
          text: body,
          textHash: hashText(normalizeText(body)),
          at: now(),
        });
      } catch (error) {
        // 回调失败不得影响发送；但必须可观测
        warnings.push('onBatch-callback-failed');
        try {
          if (typeof deps.onBatchError === 'function') deps.onBatchError(error);
        } catch {
          /* ignore */
        }
        try {
          if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('[group-chat send] onBatch callback failed', error);
          }
        } catch {
          /* ignore */
        }
      }
    }

    stage = 'echo';
    const echoForOnEcho = deps.suppressEcho
      ? undefined
      : createLocalEcho({
          clientBatchId: batchId,
          channelId,
          text: body,
          targets,
          requestIds,
          prefixParts,
          now: now(),
          mentions: request?.mentions,
        });
    if (echoForOnEcho) knownEcho = echoForOnEcho;
    if (echoForOnEcho && typeof deps.onEcho === 'function') deps.onEcho(echoForOnEcho);

    stage = 'limiter';
    const limiter = deps.rateLimiter ?? createRateLimiter({ minIntervalMs, now, sleep: deps.sleep, signal: deps.signal });
    stage = 'loop';
    /** @type {Array<{target: string, sessionId?: string, requestId?: string, attempt?: number, reason: string, errorName: string, code?: string|number, status?: string|number, message: string, detail?: string}>} */
    const diagnostics = [];

    for (const target of targets) {
      const sessionId = target.sessionId || (target.name === 'lead' ? channelId : '');
      const attemptNo = attempt;
      const requestId = requestIds[sessionId || target.name] ?? uuid();

      if (deps.signal && deps.signal.aborted) {
        deliveries.push(failedDelivery(target, 'aborted', { requestId, attempt: attemptNo }));
        emitDelivery(deps, target, 'failed', 'aborted', requestId, attemptNo);
        continue;
      }

      const availability = checkTargetAvailability(target, {
        readonly: deps.readonly === true,
        members: deps.members,
        channelId,
        isRunning: resolveIsRunning(deps),
      });
      if (!availability.sendable) {
        deliveries.push(failedDelivery(target, availability.reason ?? 'unaddressable', { requestId, attempt: attemptNo, detail: availability.detail }));
        emitDelivery(deps, target, 'failed', availability.reason ?? 'unaddressable', requestId, attemptNo);
        continue;
      }
      if (availability.warn && !warnings.includes(availability.warn)) warnings.push(availability.warn);

      const prompt = promptFor(target, deps, channelId);
      if (!prompt) {
        deliveries.push(failedDelivery(target, 'session-missing', { requestId, attempt: attemptNo }));
        emitDelivery(deps, target, 'failed', 'session-missing', requestId, attemptNo);
        continue;
      }

      emitDelivery(deps, target, 'sending', undefined, requestId, attemptNo);
      /** @type {any} */
      let failedError;
      try {
        const outcome = await limiter.run(() =>
          withTimeout(prompt(promptParts, mode, deps.signal, requestId), { timeoutMs }),
        );
        // RemoteResult 兼容：prompt 可能 resolve `{ok:false,error}` 而不是 reject
        if (outcome && typeof outcome === 'object' && outcome.ok === false) {
          failedError = outcome.error ?? outcome;
        }
      } catch (error) {
        failedError = error;
      }
      if (failedError !== undefined) {
        const reason = classifyError(failedError, { aborted: deps.signal?.aborted === true });
        const { delivery, diagnostic } = failedDeliveryWithDiagnostics(target, reason, failedError, {
          requestId,
          attempt: attemptNo,
        });
        deliveries.push(delivery);
        diagnostics.push({ ...diagnostic, stage: 'loop' });
        emitDelivery(deps, target, 'failed', reason, requestId, attemptNo);
        logSendError(failedError, target, requestId);
      } else {
        deliveries.push(sentDelivery(target, { requestId, attempt: attemptNo }));
        emitDelivery(deps, target, 'sent', undefined, requestId, attemptNo);
      }
    }

    const summary = summarizeDeliveries(deliveries);
    const status = /** @type {DeliveryState} */ (summary.status ?? 'failed');
    const echo = echoForOnEcho ? applyDeliveriesToEcho(echoForOnEcho, deliveries) : undefined;
    rememberBatch(registry, batchId, {
      clientBatchId: batchId,
      channelId,
      targetNames,
      prefixParts,
      requestIds,
      attempts: attempt,
      text: body,
      lastStatus: status,
      updatedAt: now(),
    });

    markLocalBatchClosed(deps, batchId, status, now);

    return {
      status,
      deliveries,
      clientBatchId: batchId,
      channelId,
      text: body,
      targets: targets.map((t) => ({ name: t.name, sessionId: t.sessionId })),
      targetNames,
      prefixParts,
      requestIds,
      mode,
      attempt,
      echo,
      ...(status === 'failed' || status === 'partial'
        ? { reason: summary.firstReason, messageKey: summary.firstReason ? failureInfo(summary.firstReason).messageKey : undefined }
        : {}),
      retryable: summary.retryable,
      dropped: normalized.dropped,
      warnings,
      diagnostics,
    };
  } catch (error) {
    return failWithStage(error, stage);
  } finally {
    stage = 'finally';
    try {
      singleFlight.release(lockKey, batchId);
    } catch (releaseError) {
      // 释放失败不得改变发送结果，只记录
      try {
        if (typeof console !== 'undefined' && typeof console.error === 'function') {
          console.error('[group-chat send] release failed', releaseError);
        }
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * M4：批次终态后关闭 localBatches 条目（仍保留到 TTL，rpcId 精确匹配可继续，弱匹配不再使用）
 * @param {SendDeps} deps
 * @param {string} batchId
 * @param {string} status
 * @param {() => number} now
 */
function markLocalBatchClosed(deps, batchId, status, now) {
  const batches = deps?.localBatches;
  if (!batches || typeof batches !== 'object') return;
  const entry = batches[batchId];
  if (!entry || typeof entry !== 'object') return;
  entry.closed = true;
  entry.status = status;
  entry.closedAt = typeof now === 'function' ? now() : Date.now();
}

/**
 * 失败时保留 console.error（诊断用；不改变状态机）
 * @param {any} error
 * @param {SendTarget} target
 * @param {string} requestId
 */
function logSendError(error, target, requestId) {
  try {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[group-chat send]', error, { target: target?.name, requestId });
    }
  } catch {
    /* 日志失败不影响发送结果 */
  }
}

/**
 * 交付状态事件（T2 可用于逐目标状态渲染）
 * @param {SendDeps} deps
 * @param {SendTarget} target
 * @param {'sending'|'sent'|'failed'} state
 * @param {string} [reason]
 * @param {string} [requestId]
 * @param {number} [attempt]
 */
function emitDelivery(deps, target, state, reason, requestId, attempt) {
  if (typeof deps.onDelivery !== 'function') return;
  try {
    deps.onDelivery({
      target: target.name,
      sessionId: target.sessionId,
      state,
      ...(reason ? { reason, error: reason, messageKey: failureInfo(reason).messageKey } : {}),
      requestId,
      attempt,
    });
  } catch {
    /* 订阅者异常不得打断发送 */
  }
}

/**
 * 读取批次登记（调试/对账用）
 * @param {string} clientBatchId
 * @param {Map<string, any>} [registry]
 * @returns {any}
 */
function getBatchRecord(clientBatchId, registry = batchRegistry) {
  return registry.get(String(clientBatchId));
}

/**
 * 清空模块级状态（仅测试/热更新用）
 * @param {{singleFlight?: any, registry?: Map<string, any>}} [opts]
 */
function resetSendState(opts = {}) {
  (opts.registry ?? batchRegistry).clear();
  const sf = opts.singleFlight ?? defaultSingleFlight;
  if (sf && typeof sf.clear === 'function') sf.clear();
}

/**
 * 结果 → echo 状态表（T2 可直接用于本地消息）
 * @param {SendResult} result
 * @returns {Record<string, DeliveryState>}
 */
function deliveryStatesOf(result) {
  return deliveryStates(result?.deliveries ?? []);
}

Object.assign(__exports, { "batchRegistry": batchRegistry, "safeCtxGet": safeCtxGet, "sendChannelBatch": sendChannelBatch, "getBatchRecord": getBatchRecord, "resetSendState": resetSendState, "deliveryStatesOf": deliveryStatesOf });
});
/* ── src/send/send-controller.js ─────────────────────────────────────────── */
__def("src/send/send-controller.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊发送编排 · 可选的进程内控制器（单飞 + 手动重试 + 批次状态）
 *
 * T2 v1 直接调用 `sendChannelBatch` 即可（其内部已有模块级单飞）；控制器用于需要
 * 「同一频道一个发送入口 + 记住上一批结果 + 重试按钮直接调用」的场景，逻辑与 send-batch/retry 一致。
 */

const { failureInfo } = __req("src/send/errors.js");
const { createSingleFlight } = __req("src/send/rate-limit.js");
const { batchRegistry, sendChannelBatch } = __req("src/send/send-batch.js");
const { planRetry, retryChannelBatch } = __req("src/send/retry.js");

/**
 * @param {import('./send-batch.js').SendDeps & {singleFlight?: any, batchRegistry?: Map<string, any>}} [deps]
 */
function createSendController(deps = {}) {
  const singleFlight = deps.singleFlight ?? createSingleFlight();
  const registry = deps.batchRegistry ?? batchRegistry;
  /** @type {Promise<import('./send-batch.js').SendResult>|null} */
  let inFlight = null;
  let inFlightBatchId = '';
  /** @type {import('./send-batch.js').SendResult|null} */
  let lastResult = null;
  let disposed = false;

  /** @param {string} reason @param {string} [batchId] */
  function failed(reason, batchId = '') {
    const info = failureInfo(reason);
    /** @type {any} */
    const result = {
      status: 'failed',
      deliveries: [],
      clientBatchId: batchId,
      channelId: '',
      text: '',
      targets: [],
      targetNames: [],
      prefixParts: [],
      requestIds: {},
      mode: 'steer',
      attempt: 0,
      reason,
      messageKey: info.messageKey,
      retryable: info.retryable,
      dropped: [],
      warnings: [],
    };
    return result;
  }

  return {
    /**
     * 发送（同频道单飞：第二次调用立即返回 busy，不排队）
     * @param {import('./send-batch.js').SendRequest} request
     */
    async send(request) {
      if (disposed) return failed('readonly', String(request?.clientBatchId ?? ''));
      if (inFlight) {
        const busy = failed('busy', String(request?.clientBatchId ?? ''));
        busy.warnings = ['controller-busy', `in-flight:${inFlightBatchId}`];
        return busy;
      }
      const batchId = String(request?.clientBatchId ?? '');
      inFlightBatchId = batchId;
      const promise = sendChannelBatch({
        ...request,
        deps: { ...(request.deps ?? {}), ...deps, singleFlight, batchRegistry: registry },
      });
      inFlight = promise;
      try {
        const result = await promise;
        lastResult = result;
        return result;
      } finally {
        if (inFlight === promise) inFlight = null;
        inFlightBatchId = '';
      }
    },

    /**
     * 手动重试上一批（只补失败目标、复用 requestId、≤2 次）
     * @param {{maxRetry?: number, skipBackoff?: boolean}} [opts]
     */
    async retry(opts = {}) {
      if (disposed) return failed('readonly', lastResult?.clientBatchId ?? '');
      if (inFlight) return failed('busy', lastResult?.clientBatchId ?? '');
      if (!lastResult) return failed('unknown');
      const plan = planRetry(lastResult, { maxRetry: opts.maxRetry ?? deps.maxRetry });
      if (!plan.allowed) return { ...lastResult, retryPlan: plan, retrySkipped: true };
      inFlightBatchId = lastResult.clientBatchId;
      const promise = retryChannelBatch(lastResult, { ...deps, singleFlight, batchRegistry: registry }, opts);
      inFlight = /** @type {any} */ (promise);
      try {
        const merged = await promise;
        lastResult = merged;
        return merged;
      } finally {
        inFlight = null;
        inFlightBatchId = '';
      }
    },

    /** @returns {boolean} */
    isSending() {
      return inFlight !== null;
    },

    /** @returns {string} */
    inFlightId() {
      return inFlightBatchId;
    },

    /** @returns {import('./send-batch.js').SendResult|null} */
    getLastResult() {
      return lastResult;
    },

    /** 清除控制器状态（不清理 registry——重试幂等记录保留） */
    dispose() {
      disposed = true;
      inFlight = null;
      inFlightBatchId = '';
      lastResult = null;
    },
  };
}

Object.assign(__exports, { "createSendController": createSendController });
});
/* ── src/send/targets.js ─────────────────────────────────────────── */
__def("src/send/targets.js", function (__exports, __req) {
// @ts-check
/**
 * 群聊发送编排 · 目标归一化（兼容 T2 传入的两种形状）
 *
 * T2（frontend）实际传入：`targets: Array<{name, sessionId, kind, label}>`
 * 也兼容字符串数组（`['lead','ux','backend']`）与缺省（由 mentions + 成员目录解析）。
 *
 * 语义（架构 §5.1）：
 *  - targets 必须含 lead 且 lead 首位；未 @ 默认 Lead（由调用方 resolveTargets 保证，缺省时这里兜底）；
 *  - teammate 恒可寻址；subagent 仅 running/provisioning（若传入 addressable 字段则以它为准）；
 *  - 单批最多 LIMITS.maxTargetsPerBatch 个目标。
 */

const { LIMITS } = __req("src/core/constants.js");
const { resolveTargets } = __req("src/core/mentions.js");

/**
 * @typedef {Object} SendTarget
 * @property {string} name
 * @property {string} sessionId
 * @property {string} [kind]
 * @property {boolean} [addressable]
 * @property {boolean} [parentAvailable]
 * @property {boolean} [running]
 */

/**
 * @typedef {Object} NormalizeTargetsInput
 * @property {Array<string|{name?: string, label?: string, sessionId?: string, id?: string, kind?: string, addressable?: boolean, parentAvailable?: boolean, running?: boolean}>} [targets]
 * @property {string[]} [mentions]
 * @property {string} [text]
 * @property {import('../core/model.js').ChannelMember[]} [members]
 * @property {string} [channelId]
 * @property {number} [maxTargets]
 */

/**
 * @typedef {Object} NormalizeTargetsResult
 * @property {SendTarget[]} targets
 * @property {Array<{name: string, reason: string}>} dropped
 * @property {boolean} noTeam
 */

/**
 * @param {NormalizeTargetsInput} input
 * @returns {NormalizeTargetsResult}
 */
function normalizeSendTargets(input) {
  const channelId = String(input.channelId ?? '');
  const members = Array.isArray(input.members) ? input.members : [];
  const maxTargets = Math.max(1, input.maxTargets ?? LIMITS.maxTargetsPerBatch);
  const raw = Array.isArray(input.targets) ? input.targets : [];

  /** @type {Array<{name: string, reason: string}>} */
  const dropped = [];
  /** @type {SendTarget[]} */
  let targets = [];
  /** @type {Set<string>} */
  const seen = new Set();

  for (const item of raw) {
    if (item === undefined || item === null) continue;
    /** @type {SendTarget|undefined} */
    let target;
    if (typeof item === 'string') {
      const name = item.trim().replace(/^@/, '');
      if (!name) continue;
      const member = members.find((m) => m.name === name);
      target = {
        name,
        sessionId: name === 'lead' ? channelId : String(member?.sessionId ?? ''),
        kind: member?.kind ?? (name === 'lead' ? 'lead' : 'unknown'),
        addressable: member?.addressable,
        parentAvailable: member?.parentAvailable,
        running: member?.status === 'running',
      };
    } else if (typeof item === 'object') {
      const name = String(item.name ?? item.label ?? item.sessionId ?? item.id ?? '')
        .trim()
        .replace(/^@/, '');
      const member = members.find((m) => m.name === name || (item.sessionId && m.sessionId === item.sessionId));
      const sessionId = String(item.sessionId ?? item.id ?? member?.sessionId ?? (name === 'lead' ? channelId : ''));
      target = {
        name: name || String(item.label ?? sessionId),
        sessionId,
        kind: item.kind ?? member?.kind ?? 'unknown',
        addressable: typeof item.addressable === 'boolean' ? item.addressable : member?.addressable,
        parentAvailable: typeof item.parentAvailable === 'boolean' ? item.parentAvailable : member?.parentAvailable,
        running: typeof item.running === 'boolean' ? item.running : member?.status === 'running',
      };
    }
    if (!target) continue;
    const key = target.sessionId || `name:${target.name}`;
    if (seen.has(key)) {
      dropped.push({ name: target.name, reason: 'duplicate' });
      continue;
    }
    seen.add(key);
    targets.push(target);
  }

  // 缺省：由 mentions + 成员目录解析（未 @ 默认 lead）
  if (targets.length === 0) {
    const resolved = resolveTargets(
      { text: input.text ?? '', mentions: input.mentions ?? [] },
      members,
      { maxTargets },
    );
    targets = resolved.targetMembers.map((m) => ({
      name: m.kind === 'lead' ? 'lead' : m.name,
      sessionId: m.sessionId,
      kind: m.kind,
      addressable: m.addressable,
      parentAvailable: m.parentAvailable,
      running: m.status === 'running',
    }));
    for (const d of resolved.dropped) dropped.push({ name: d.name, reason: d.reason });
    if (targets.length === 0 && channelId) targets = [{ name: 'lead', sessionId: channelId, kind: 'lead' }];
  }

  // lead 首位（只在 lead 存在时调整，避免 retry 子集被补上 lead）
  const leadIndex = targets.findIndex((t) => t.name === 'lead' || t.kind === 'lead');
  if (leadIndex > 0) {
    const [lead] = targets.splice(leadIndex, 1);
    targets.unshift(lead);
  }

  // 目标数上限
  if (targets.length > maxTargets) {
    for (const extra of targets.slice(maxTargets)) dropped.push({ name: extra.name, reason: 'overflow' });
    targets = targets.slice(0, maxTargets);
  }

  const noTeam = !members.some((m) => m.kind === 'teammate' || m.kind === 'subagent');
  return { targets, dropped, noTeam };
}

/**
 * 目标名列表（用于 canonical 前缀；lead 固定写作 `lead`）
 * @param {SendTarget[]} targets
 * @returns {string[]}
 */
function targetNamesOf(targets) {
  return (Array.isArray(targets) ? targets : []).map((t) => t.name);
}

/**
 * 目标 → sessionId（lead 用 channelId 兜底）
 * @param {SendTarget} target
 * @param {string} channelId
 * @returns {string}
 */
function sessionIdOf(target, channelId) {
  if (target.sessionId) return target.sessionId;
  return target.name === 'lead' ? String(channelId ?? '') : '';
}

Object.assign(__exports, { "normalizeSendTargets": normalizeSendTargets, "targetNamesOf": targetNamesOf, "sessionIdOf": sessionIdOf });
});

/* ── src/client/parts/00-boot.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 00-boot.part.js — 常量、宿主模块桥、日志
 *
 * 本文件不是 ES module：它由 scripts/build.mjs 按文件名顺序拼进 lib/client.js
 * 的 factory 作用域，与其它 parts 共享同一作用域（避免重名）。
 * 可用的构建期符号：React / h / Fragment / require / __def / __req / __has / __opt
 * （__def 等由构建 preamble 提供，用于访问 src/core、src/adapters、src/send 的模块）。
 * ────────────────────────────────────────────────────────────────────────── */

const NS = 'group-chat'
const GC_LOG = '[group-chat]'
const GC_BUILD_ID = __GC_BUILD.id
/** 构建指纹（version+hash）：失败诊断展示 `build=…`，用于确认页面实际加载的 bundle 版本。 */
const GC_BUILD_LABEL =
  (__GC_BUILD && (__GC_BUILD.build || __GC_BUILD.hash || __GC_BUILD.version)) || 'dev'
const GC_VIEW_ID = 'group-chat'
const GC_VIEW_ORDER = 5

/** 本地兜底上限（core 的 limits 存在时以其为准）。 */
const GC_LOCAL_LIMITS = {
  firstScreen: 200,
  pageOlder: 50,
  maxMessagesInMemory: 2000,
  textRender: 65536,
  foldLines: 8,
  foldChars: 400,
  maxMembers: 32,
  maxDepth: 3,
  batchMs: 120,
  unreadClearThreshold: 32,
  draftTtlMs: 24 * 60 * 60 * 1000
}

/** 会话在全局时间线中的排序权重（架构 §4.3.1）。 */
const GC_SESSION_RANK = { lead: 0, teammate: 1, subagent: 2, system: 3 }

/** 写入正文时用的角色小标签 key（v1.2 无徽标，仅卡片消息头使用）。 */
const GC_ROLE_LABEL_KEY = {
  lead: 'member.roleLead',
  teammate: 'member.roleTeammate',
  subagent: 'member.roleSubagent',
  system: 'member.roleFallback',
  user: 'member.roleFallback'
}

/** 安全地取构建期注册的可选模块（src/**），不存在返回 undefined。 */
function gcOptionalModule(id) {
  try {
    return typeof __opt === 'function' ? __opt(id) : undefined
  } catch (error) {
    try {
      console.warn(GC_LOG, 'optional module failed:', id, error && error.message)
    } catch {}
    return undefined
  }
}

function gcCore(name) {
  return gcOptionalModule('src/core/' + name + '.js')
}

function gcAdapter(name) {
  return gcOptionalModule('src/adapters/' + name + '.js')
}

function gcSendModule(name) {
  return gcOptionalModule('src/send/' + name + '.js')
}

/** limits：core 优先，缺失用本地兜底。 */
function gcLimits() {
  const mod = gcCore('constants')
  const fromCore = mod && (mod.limits || mod.LIMITS)
  return Object.assign({}, GC_LOCAL_LIMITS, fromCore && typeof fromCore === 'object' ? fromCore : null)
}

/** URL `?gc-debug=1` 也可临时打开诊断（不落盘）。 */
function gcIsDebugRequested() {
  try {
    if (typeof location === 'undefined' || !location) return false
    return /(?:^|[?&])gc-debug=(1|true)(?:&|$)/.test(location.search || '')
  } catch {
    return false
  }
}

let gcDebugVisibleOverride = null

/**
 * 诊断可见性：`localStorage['group-chat:debug']==='1'` 或 URL `?gc-debug=1`。
 * 默认关闭——失败 caption 只显示用户可读文案；`data-send-debug` 属性始终保留。
 * `gcSetDebugVisible(true/false/null)` 供测试与运行时强制覆盖（null = 跟随环境）。
 */
function gcDebugEnabled() {
  if (gcDebugVisibleOverride !== null) return gcDebugVisibleOverride
  try {
    if (typeof localStorage !== 'undefined' && localStorage && localStorage.getItem('group-chat:debug') === '1') {
      return true
    }
  } catch {}
  return gcIsDebugRequested()
}

/** 仅测试/诊断用：强制诊断可见性（null 恢复跟随 localStorage/URL）。 */
function gcSetDebugVisible(value) {
  gcDebugVisibleOverride = value === null || value === undefined ? null : Boolean(value)
}

function gcDebug() {
  if (!gcDebugEnabled()) return
  try {
    // eslint-disable-next-line no-console
    console.debug(GC_LOG, ...Array.prototype.slice.call(arguments))
  } catch {}
}

function gcWarn() {
  try {
    // eslint-disable-next-line no-console
    console.warn(GC_LOG, ...Array.prototype.slice.call(arguments))
  } catch {}
}

let GC_UID = 0

/** 本地 id（仅用于 UI key / clientBatchId，不是权威 id）。 */
function gcUid(prefix) {
  GC_UID += 1
  const rand = Math.random().toString(36).slice(2, 10)
  return (prefix || 'gc') + '-' + Date.now().toString(36) + '-' + GC_UID.toString(36) + rand
}

/** 稳定字符串化（日志/调试用，避免循环）。 */
function gcShortError(error) {
  if (error === null || error === undefined) return 'unknown'
  if (typeof error === 'string') return error
  if (error && typeof error.message === 'string' && error.message !== '') return error.message
  try {
    return String(error)
  } catch {
    return 'unknown'
  }
}

/** 安全执行（点击处理等边界，不把异常抛给宿主渲染器）。 */
function gcSafe(fn, label) {
  return function gcSafeHandler() {
    try {
      return fn.apply(null, arguments)
    } catch (error) {
      gcWarn('handler failed:', label || '', gcShortError(error))
      return undefined
    }
  }
}

/** 让布局稳定后再跑（测试环境无 rAF 时同步执行）。 */
function gcRaf(fn) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(function () {
      try {
        fn()
      } catch (error) {
        gcWarn('raf task failed:', gcShortError(error))
      }
    })
    return
  }
  try {
    fn()
  } catch (error) {
    gcWarn('task failed:', gcShortError(error))
  }
}

/** 取文本前 n 个码位（不切断代理对）。 */
function gcClip(text, n) {
  const s = typeof text === 'string' ? text : text === null || text === undefined ? '' : String(text)
  if (s.length <= n) return s
  return Array.from(s).slice(0, n).join('')
}

/** 复制到剪贴板（渐进降级）。 */
function gcCopyText(text) {
  const value = typeof text === 'string' ? text : String(text === null || text === undefined ? '' : text)
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
    return nav.clipboard.writeText(value).then(
      function () {
        return true
      },
      function () {
        return gcCopyFallback(value)
      }
    )
  }
  return Promise.resolve(gcCopyFallback(value))
}

function gcCopyFallback(value) {
  try {
    if (typeof document === 'undefined' || !document.body) return false
    const area = document.createElement('textarea')
    area.value = value
    area.setAttribute('readonly', 'readonly')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/* ── 单一输入器（F24/§6.13）：body 标记 + 宿主 composer 隐藏 + 2×rAF 自检 ── */

const GC_BODY_CLASS = 'gc-view-group-chat'
const GC_HOST_COMPOSER_SELECTORS = ['[data-conversation-region="composer"]', '[data-composer-seat]']

/** 视图激活期给 body 加标记（幂等；卸载时 remove，防止切走后宿主输入器仍被隐藏）。 */
function gcEnterGroupChatBody() {
  try {
    if (typeof document === 'undefined' || !document.body) return function () {}
    document.body.classList.add(GC_BODY_CLASS)
    return function gcLeaveGroupChatBody() {
      try {
        document.body.classList.remove(GC_BODY_CLASS)
      } catch {}
    }
  } catch {
    return function () {}
  }
}

function gcHostComposerVisible() {
  try {
    if (typeof document === 'undefined') return false
    for (let i = 0; i < GC_HOST_COMPOSER_SELECTORS.length; i += 1) {
      const nodes = document.querySelectorAll(GC_HOST_COMPOSER_SELECTORS[i])
      for (let j = 0; j < nodes.length; j += 1) {
        const node = nodes[j]
        const style = typeof getComputedStyle === 'function' ? getComputedStyle(node) : null
        if ((!style || style.display !== 'none') && (node.offsetHeight || 0) > 0) return true
      }
    }
  } catch {}
  return false
}

/**
 * 2×rAF 自检宿主 composer 是否真的被隐藏：仍可见 → 降级（移除 body 标记，恢复宿主输入器）
 * 并返回 degraded=true；调用方据此显示一次性提示 composer.hostFallback。
 * 绝不因隐藏失败而禁用/清空插件输入器。
 */
function gcVerifyHostComposerHidden() {
  return new Promise(function (resolve) {
    const check = function () {
      const visible = gcHostComposerVisible()
      if (visible) {
        try {
          if (typeof document !== 'undefined' && document.body) document.body.classList.remove(GC_BODY_CLASS)
        } catch {}
        gcWarn('host composer could not be hidden; compatibility mode enabled')
        resolve({ degraded: true, visible: true })
        return
      }
      resolve({ degraded: false, visible: false })
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        requestAnimationFrame(check)
      })
      return
    }
    check()
  })
}

function gcIsPreviewRequested() {
  try {
    if (typeof location === 'undefined') return false
    return /(?:^|[?&])gc-preview=[^&]*/.test(location.search || '')
  } catch {
    return false
  }
}

/* ── src/client/parts/10-locale.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 10-locale.part.js — i18n 与时间格式化
 *
 * 字典来自 locale/{zh,en}.json（构建期内联为 GC_LOCALE，键集由构建校验）。
 * 命名空间：group-chat（架构 §6.9）。协议前缀不进 i18n（§5.2 规则 6）。
 * ────────────────────────────────────────────────────────────────────────── */

const GC_LOCALES = GC_LOCALE || { zh: {}, en: {} }
const GC_FALLBACK_LOCALE = 'zh'

let gcLocaleCode = gcDetectLocale()
/** locale 订阅者（视图用 useSyncExternalStore 订阅；label thunk 直接读 gcGetLocale） */
const gcLocaleListeners = new Set()

function gcDetectLocale() {
  try {
    if (typeof navigator !== 'undefined' && navigator && typeof navigator.language === 'string') {
      return /^zh/i.test(navigator.language) ? 'zh' : 'en'
    }
  } catch {}
  return GC_FALLBACK_LOCALE
}

/** 宿主 locale 变化时由 apply() 的订阅更新（label thunk 与视图共同响应）。 */
function gcSetLocale(code) {
  const next = code && /^zh/i.test(String(code)) ? 'zh' : code ? 'en' : gcLocaleCode
  if (next === gcLocaleCode) return
  gcLocaleCode = next
  gcLocaleListeners.forEach(function (listener) {
    try {
      listener()
    } catch (error) {
      gcWarn('locale listener failed:', gcShortError(error))
    }
  })
}

/** 订阅 locale 变化（useSyncExternalStore 兼容）。 */
function gcSubscribeLocale(listener) {
  gcLocaleListeners.add(listener)
  return function () {
    gcLocaleListeners.delete(listener)
  }
}

function gcGetLocale() {
  return gcLocaleCode
}

function gcLocaleTag() {
  return gcLocaleCode === 'zh' ? 'zh-CN' : 'en-US'
}

function gcDictionary(code) {
  return GC_LOCALES[code] || GC_LOCALES[GC_FALLBACK_LOCALE] || {}
}

/** `{name}` 占位替换；缺失变量保留原样，便于发现漏传。 */
function gcInterpolate(template, vars) {
  if (typeof template !== 'string') return ''
  if (!vars) return template
  return template.replace(/\{([a-zA-Z0-9_.]+)\}/g, function (match, key) {
    const value = vars[key]
    return value === null || value === undefined ? match : String(value)
  })
}

/** 翻译函数（纯函数，locale 由闭包/模块变量决定）。 */
function gcTranslate(key, vars) {
  const dict = gcDictionary(gcLocaleCode)
  const fallback = gcDictionary(GC_FALLBACK_LOCALE)
  const raw = dict[key] !== undefined ? dict[key] : fallback[key]
  if (raw === undefined) return key
  return gcInterpolate(raw, vars)
}

/** 取某个 locale 下的翻译（测试/标签用）。 */
function gcTranslateIn(code, key, vars) {
  const dict = gcDictionary(code)
  const raw = dict[key] !== undefined ? dict[key] : gcDictionary(GC_FALLBACK_LOCALE)[key]
  return raw === undefined ? key : gcInterpolate(raw, vars)
}

/** 列表连接符：中文「、」，其它「, 」（说明行/依赖行共用）。 */
function gcListSeparator() {
  return gcLocaleCode === 'zh' ? '、' : ', '
}

function gcJoinNames(names) {
  return gcAsArray(names).join(gcListSeparator())
}

/* ── 时间 ─────────────────────────────────────────────────────────────── */

function gcStartOfDay(date) {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function gcClockText(ts) {
  const date = new Date(ts)
  try {
    return new Intl.DateTimeFormat(gcLocaleTag(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  } catch {
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return hh + ':' + mm
  }
}

/**
 * 时间分隔文案（架构 §6.5 / UX §4）：`今天 · 11:02`；跨天用日期。
 * 分隔插入规则见 gcShouldInsertDivider（20-store）。
 */
function gcTimeDividerText(ts, nowTs) {
  const now = typeof nowTs === 'number' ? nowTs : Date.now()
  const today = gcStartOfDay(new Date(now))
  const day = gcStartOfDay(new Date(ts))
  const diffDays = Math.round((today - day) / 86400000)
  if (diffDays === 0) return gcTranslate('time.today') + ' · ' + gcClockText(ts)
  if (diffDays === 1) return gcTranslate('time.yesterday') + ' · ' + gcClockText(ts)
  const date = new Date(ts)
  try {
    const dayText = new Intl.DateTimeFormat(gcLocaleTag(), {
      month: '2-digit',
      day: '2-digit'
    }).format(date)
    return dayText + ' · ' + gcClockText(ts)
  } catch {
    return (
      String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') + ' · ' + gcClockText(ts)
    )
  }
}

/** 消息行时间（卡片消息头 11px 用）。 */
function gcMessageTimeText(ts) {
  return gcClockText(ts)
}

/* ── src/client/parts/20-store.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 20-store.part.js — 纯函数层 + 视图 store
 *
 * 这里不碰 DOM/React，全部可单测（架构 §6.4 / §6.11 / §8.1 L1+L3）：
 *  - 排序/去重/内存上限（core.timeline 存在时以 core 为准）
 *  - 成员筛选（D-B）、折叠判定（D6）、时间分隔插入、发送目标解析（D-A/D-C）
 *  - 消息 → 气泡说明行模型（四态）
 *  - snapshot store（useSyncExternalStore 兼容）
 * ────────────────────────────────────────────────────────────────────────── */

function gcAsArray(value) {
  return Array.isArray(value) ? value : []
}

function gcStr(value) {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

/* ── 本地发送批次注册表（F-07：本地 echo 与权威消息去重） ───────────────
 * core 的 normalize 用 `ctx.localBatches[clientBatchId]` 通过 rpcId/targets/sessionIds
 * 反查批次，并给权威 user 消息打上 clientBatchId；这里维护一个**活对象**（引用共享），
 * 由 createClientSessionSource 的 deps.localBatches 传给 normalize。TTL 5 分钟、上限 50。
 * ──────────────────────────────────────────────────────────────────────── */

const GC_LOCAL_BATCH_TTL_MS = 5 * 60 * 1000
const GC_LOCAL_BATCH_MAX = 50

/** 活对象：deps.localBatches 与 normalize ctx.localBatches 共享同一引用。 */
const gcLocalBatches = Object.create(null)

function gcPruneLocalBatches(nowTs) {
  const now = typeof nowTs === 'number' ? nowTs : Date.now()
  const keys = Object.keys(gcLocalBatches)
  for (let i = 0; i < keys.length; i += 1) {
    const record = gcLocalBatches[keys[i]]
    if (!record || typeof record.at !== 'number' || now - record.at > GC_LOCAL_BATCH_TTL_MS) {
      delete gcLocalBatches[keys[i]]
    }
  }
  const remaining = Object.keys(gcLocalBatches).sort(function (a, b) {
    return (gcLocalBatches[a].at || 0) - (gcLocalBatches[b].at || 0)
  })
  let overflow = remaining.length - GC_LOCAL_BATCH_MAX
  for (let i = 0; i < overflow; i += 1) delete gcLocalBatches[remaining[i]]
}

/** 规范化 requestIds：支持 `{target:rpcId}` / `[{target,rpcId}]` / `rpcIds`。 */
function gcNormalizeRequestIds(record, targets) {
  const raw = record.requestIds || record.rpcIds || record.requestIdMap || null
  const out = Object.create(null)
  if (!raw) return out
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length; i += 1) {
      const item = raw[i]
      if (!item) continue
      if (typeof item === 'string') {
        const name = gcAsArray(targets)[i] || String(i)
        out[name] = item
      } else if (item.target && (item.rpcId || item.requestId)) {
        out[gcStr(item.target)] = gcStr(item.rpcId || item.requestId)
      }
    }
    return out
  }
  if (typeof raw === 'object') {
    Object.keys(raw).forEach(function (key) {
      const value = raw[key]
      if (typeof value === 'string') out[key] = value
      else if (value && (value.rpcId || value.requestId)) out[key] = gcStr(value.rpcId || value.requestId)
    })
  }
  return out
}

/** 注册一次本地发送（send-batch 在 prompt 前通过 deps.onBatch 回调；也由 gcPerformSend 兜底注册）。 */
function gcRememberBatch(record) {
  const input = record || {}
  const clientBatchId = gcStr(input.clientBatchId || input.batchId)
  if (!clientBatchId) return
  const targets = gcAsArray(input.targets || input.targetNames).map(function (item) {
    return typeof item === 'string' ? item : gcStr(item && item.name)
  })
  const sessionIds = gcAsArray(input.sessionIds || input.targetSessionIds).map(function (item) {
    return typeof item === 'string' ? item : gcStr(item && item.sessionId)
  })
  const at = typeof input.at === 'number' ? input.at : Date.now()
  gcLocalBatches[clientBatchId] = {
    clientBatchId: clientBatchId,
    channelId: gcStr(input.channelId),
    requestIds: gcNormalizeRequestIds(input, targets),
    targets: targets.filter(Boolean),
    sessionIds: sessionIds.filter(Boolean),
    // H1 弱匹配（无 rpcId）需要 text（或 textHash）+ targets 集合 + 时间窗
    ...(gcStr(input.text) ? { text: gcStr(input.text) } : null),
    ...(gcStr(input.textHash) ? { textHash: gcStr(input.textHash) } : null),
    ...(input.closed === true ? { closed: true } : null),
    at: at
  }
  gcPruneLocalBatches(at)
}

/** 按 rpcId 反查批次（core lookupBatchId 的 UI 兜底，两者读同一份数据）。 */
function gcLookupLocalBatchByRpc(rpcId) {
  if (!rpcId) return ''
  const keys = Object.keys(gcLocalBatches)
  for (let i = 0; i < keys.length; i += 1) {
    const record = gcLocalBatches[keys[i]]
    const ids = (record && record.requestIds) || {}
    const values = Object.keys(ids).map(function (key) {
      return ids[key]
    })
    if (values.indexOf(rpcId) >= 0) return record.clientBatchId || keys[i]
  }
  return ''
}

function gcLocalBatchIds() {
  return Object.keys(gcLocalBatches)
}

/** 批次终态（成功/失败后）：H1 只允许 rpcId 精确匹配，关闭弱匹配窗口。 */
function gcCloseBatch(clientBatchId) {
  const id = gcStr(clientBatchId)
  if (!id) return
  const record = gcLocalBatches[id]
  if (record) record.closed = true
}

/* ── 排序与合并 ───────────────────────────────────────────────────────── */

function gcMemberRankMap(channel) {
  const map = Object.create(null)
  const members = gcAsArray(channel && channel.members)
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i] || {}
    if (!member.sessionId) continue
    map[member.sessionId] = GC_SESSION_RANK[member.kind] !== undefined ? GC_SESSION_RANK[member.kind] : 3
  }
  if (channel && channel.lead && channel.lead.sessionId) map[channel.lead.sessionId] = 0
  return map
}

function gcRankOf(message, rankMap) {
  const sender = (message && message.sender) || {}
  if (rankMap && sender.sessionId && rankMap[sender.sessionId] !== undefined) return rankMap[sender.sessionId]
  if (sender.kind && GC_SESSION_RANK[sender.kind] !== undefined) return GC_SESSION_RANK[sender.kind]
  return 3
}

function gcSeqValue(message) {
  const seq = message && message.seq
  // Spike S1：seq 可能是小数，禁止整数断言/整数运算
  return typeof seq === 'number' && !Number.isNaN(seq) ? seq : 0
}

/** 排序键：time → (creationId, pairOrder) → sessionRank → sessionId → seq。 */
function gcCompareMessages(a, b, rankMap) {
  const at = typeof a.time === 'number' ? a.time : 0
  const bt = typeof b.time === 'number' ? b.time : 0
  if (at !== bt) return at - bt

  if (a.creationId && a.creationId === b.creationId) {
    const ao = typeof a.pairOrder === 'number' ? a.pairOrder : 0
    const bo = typeof b.pairOrder === 'number' ? b.pairOrder : 0
    if (ao !== bo) return ao - bo
  }

  const ar = gcRankOf(a, rankMap)
  const br = gcRankOf(b, rankMap)
  if (ar !== br) return ar - br

  const asid = gcStr(a.sender && a.sender.sessionId)
  const bsid = gcStr(b.sender && b.sender.sessionId)
  if (asid !== bsid) return asid < bsid ? -1 : 1

  const as = gcSeqValue(a)
  const bs = gcSeqValue(b)
  if (as !== bs) return as - bs

  const aid = gcStr(a.id)
  const bid = gcStr(b.id)
  return aid < bid ? -1 : aid > bid ? 1 : 0
}

/** 排序（core.timeline.sortMessages 存在时优先）。 */
function gcSortMessages(list, channel) {
  const items = gcAsArray(list).slice()
  const core = gcCore('timeline')
  if (core && typeof core.sortMessages === 'function') {
    try {
      for (let i = 0; i < items.length; i += 1) {
        if (typeof items[i].time !== 'number') items[i] = Object.assign({}, items[i], { time: 0 })
      }
      return core.sortMessages(items)
    } catch (error) {
      gcWarn('core sortMessages failed, using local order:', gcShortError(error))
    }
  }
  const rankMap = gcMemberRankMap(channel)
  return items.sort(function (a, b) {
    return gcCompareMessages(a, b, rankMap)
  })
}

/** 内存上限：超出时保留首 200 + 最近 N（§4.5，避免删掉正在读的位置）。 */
function gcTrimMessages(list, limits) {
  const max = limits && limits.maxMessagesInMemory ? limits.maxMessagesInMemory : GC_LOCAL_LIMITS.maxMessagesInMemory
  const items = gcAsArray(list)
  if (items.length <= max) return items
  const head = Math.min(200, Math.floor(max / 2))
  const tail = Math.max(0, max - head)
  return items.slice(0, head).concat(items.slice(items.length - tail))
}

/**
 * 合并权威消息与本地乐观消息。
 * - 同 id 覆盖（权威事件优先）
 * - `local:<clientBatchId>` 在权威副本到达后替换（同一气泡不闪断）
 */
function gcMergeMessages(existing, incoming, channel, limits) {
  const prev = gcAsArray(existing)
  const next = gcAsArray(incoming)
  const byId = new Map()
  const localsByBatch = new Map()

  for (let i = 0; i < prev.length; i += 1) {
    const item = prev[i]
    if (!item || !item.id) continue
    byId.set(item.id, item)
    if (typeof item.id === 'string' && item.id.indexOf('local:') === 0) {
      localsByBatch.set(item.clientBatchId || item.id.slice(6), item.id)
    }
  }

  for (let i = 0; i < next.length; i += 1) {
    let item = next[i]
    if (!item || !item.id) continue
    // H1（F30/SC47）：权威消息带 clientBatchId（或 meta.rpcId 经本地批次表反查）时，
    // 必须在这里删除 local:<batchId> —— 这是唯一能看到本地 echo 的层（core 只处理真实事件）。
    const rpcId = gcStr(item.meta && (item.meta.rpcId || item.meta.requestId || item.meta.rpcID))
    const batchId =
      gcStr(item.clientBatchId) || gcStr(item.meta && item.meta.clientBatchId) || gcLookupLocalBatchByRpc(rpcId)
    if (batchId && gcStr(item.kind) === 'user') {
      if (localsByBatch.has(batchId)) {
        byId.delete(localsByBatch.get(batchId))
        localsByBatch.delete(batchId)
      }
      if (!item.clientBatchId) item = Object.assign({}, item, { clientBatchId: batchId })
    }
    const old = byId.get(item.id)
    byId.set(item.id, old ? Object.assign({}, old, item) : item)
  }

  const merged = []
  byId.forEach(function (value) {
    merged.push(value)
  })
  return gcTrimMessages(gcSortMessages(merged, channel), limits)
}

/* ── 时间分隔与紧凑行距（§6.5 / UX §4） ──────────────────────────────── */

const GC_DIVIDER_GAP_MS = 5 * 60 * 1000

function gcShouldInsertDivider(prevTs, nextTs) {
  if (typeof prevTs !== 'number') return true
  if (gcStartOfDay(new Date(prevTs)) !== gcStartOfDay(new Date(nextTs))) return true
  return nextTs - prevTs >= GC_DIVIDER_GAP_MS
}

function gcIsTightRow(prev, next) {
  if (!prev || !next) return false
  if (prev.kind !== next.kind) return false
  if (prev.kind === 'system' || prev.kind === 'member_card' || prev.kind === 'task_card') return false
  const a = prev.sender || {}
  const b = next.sender || {}
  if (!a.sessionId || a.sessionId !== b.sessionId) return false
  return Math.abs((next.time || 0) - (prev.time || 0)) <= 60000
}

/**
 * 消息 → 消息流条目（含居中时间分隔）。
 * `items: [{type:'divider', id, text} | {type:'message', id, message, tight}]`
 */
function gcBuildFeed(messages, nowTs) {
  const list = gcAsArray(messages)
  const items = []
  let prev = null
  for (let i = 0; i < list.length; i += 1) {
    const message = list[i]
    if (!message || !message.id) continue
    if (!prev || gcShouldInsertDivider(prev.time, message.time)) {
      items.push({
        type: 'divider',
        id: 'divider:' + message.id,
        text: gcTimeDividerText(message.time, nowTs)
      })
      prev = null
    }
    items.push({
      type: 'message',
      id: message.id,
      message: message,
      tight: gcIsTightRow(prev, message)
    })
    prev = message
  }
  return items
}

/* ── 成员状态条（F26/§6.15.1：working/waiting、最多 5+N） ─────────────── */

const GC_MEMBER_STRIP_MAX = Infinity // Lead 裁决：成员条全部显示（禁止 +N）

/** running→working（绿），其余→waiting（灰）；未知按 waiting。 */
function gcMemberWorkStatus(member) {
  if (!member) return 'waiting'
  return member.status === 'running' || member.status === 'provisioning' ? 'working' : 'waiting'
}

/** 成员条展示数据：lead → working teammate → waiting teammate → subagent，最多 5 个。 */
function gcMemberStripData(channel) {
  const members = gcAllMembers(channel)
  const rank = function (member) {
    if (member.kind === 'lead') return 0
    if (member.kind === 'teammate') return gcMemberWorkStatus(member) === 'working' ? 1 : 2
    return 3
  }
  const sorted = members.slice().sort(function (a, b) {
    return rank(a) - rank(b)
  })
  const visible = sorted.slice(0, sorted.length)
  return {
    visible: visible,
    overflow: 0
  }
}

/** 频道头状态：{n} 名成员 · {m} 工作中 · {k} 等待 */
function gcMembersStatusModel(channel) {
  const members = gcAllMembers(channel)
  let working = 0
  for (let i = 0; i < members.length; i += 1) {
    if (gcMemberWorkStatus(members[i]) === 'working') working += 1
  }
  return { total: members.length, working: working, waiting: Math.max(0, members.length - working) }
}

/* ── 成员索引与筛选（D-B） ────────────────────────────────────────────── */

function gcAllMembers(channel) {
  const members = gcAsArray(channel && channel.members).slice()
  const lead = channel && channel.lead
  if (lead && !members.some(function (member) { return member && member.sessionId === lead.sessionId })) {
    members.unshift(lead)
  }
  return members
}

function gcMemberIndex(channel) {
  const byName = new Map()
  const bySessionId = new Map()
  const members = gcAsArray(channel && channel.members)
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i] || {}
    if (member.name) byName.set(member.name, member)
    if (member.sessionId) bySessionId.set(member.sessionId, member)
  }
  if (channel && channel.lead) {
    if (channel.lead.name) byName.set(channel.lead.name, channel.lead)
    if (channel.lead.sessionId) bySessionId.set(channel.lead.sessionId, channel.lead)
  }
  return { byName: byName, bySessionId: bySessionId, members: members }
}

function gcParentNameOf(channel, message) {
  const sender = (message && message.sender) || {}
  if (sender.kind !== 'subagent') return ''
  const index = gcMemberIndex(channel)
  const member = index.bySessionId.get(sender.sessionId)
  if (member && member.parentName) return member.parentName
  if (member && member.parentSessionId) {
    const parent = index.bySessionId.get(member.parentSessionId)
    if (parent && parent.name) return parent.name
  }
  return ''
}

/** 本地兜底：与 core.filter.matchesFilter 语义一致（sender / targets / 子体归父）。 */
function gcMatchesFilter(message, selectedName, channel) {
  if (!selectedName) return true
  const core = gcCore('filter')
  if (core && typeof core.matchesFilter === 'function') {
    try {
      return !!core.matchesFilter(message, selectedName, gcAllMembers(channel))
    } catch (error) {
      gcWarn('core matchesFilter failed, using local filter:', gcShortError(error))
    }
  }
  const sender = (message && message.sender) || {}
  const targets = gcAsArray(message && message.targets)
  if (sender.name === selectedName) return true
  if (targets.indexOf(selectedName) >= 0) return true
  // 父成员筛选包含其 subagent 的消息；选 subagent 不反向包含父
  if (sender.kind === 'subagent') {
    const parentName = gcParentNameOf(channel, message)
    if (parentName && parentName === selectedName) return true
  }
  return false
}

function gcFilterMessages(messages, selectedName, channel) {
  const list = gcAsArray(messages)
  if (!selectedName) return list
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    if (gcMatchesFilter(list[i], selectedName, channel)) out.push(list[i])
  }
  return out
}

function gcFilterCount(messages, selectedName, channel) {
  return gcFilterMessages(messages, selectedName, channel).length
}

/* ── 系统上下文噪音兜底（D-01 双保险） ────────────────────────────────── */

const GC_CONTEXT_NOISE_PREFIX = [
  '<system-reminder',
  '<skill_content',
  '<skill-catalog',
  '<runtime-context',
  'current runtime context',
  'time sampled at',
  '<agent-instructions'
]

/**
 * 宿主注入的系统上下文（instructions / runtime-context / skill catalog / time context）
 * 不应进入群聊 feed。T1 已在归一化丢弃；这里只对 **system 类消息** 再做一层兜底，
 * 不误伤正常发言（只在文本以已知注入标记开头时命中）。
 */
function gcIsContextNoise(message) {
  if (!message || message.kind !== 'system') return false
  const text = gcStr(message.text).trim().toLowerCase()
  if (!text) return false
  for (let i = 0; i < GC_CONTEXT_NOISE_PREFIX.length; i += 1) {
    if (text.indexOf(GC_CONTEXT_NOISE_PREFIX[i]) === 0) return true
  }
  return false
}

/** F31：agent 消息正文 trim 为空且无卡片/附件时，不渲染空行（不出现空 bubble + 操作图标）。 */
function gcIsEmptyAgentMessage(message) {
  if (!message) return false
  const kind = message.kind
  if (kind !== 'agent_output' && kind !== 'agent_to_agent' && kind !== 'delivery') return false
  if (message.memberCard || message.taskCard) return false
  if (gcStr(message.text).trim() !== '') return false
  if (gcAsArray(message.files).length > 0) return false
  return true
}

/** subagent-settled 副本（父会话通知）不渲染（F5/§4.3③）。 */
function gcIsSettledNotice(message) {
  if (!message) return false
  const meta = message.meta || {}
  return (
    message.systemReason === 'subagent-settled' ||
    meta.event === 'subagent-settled' ||
    meta.sourceKind === 'subagent-settled'
  )
}

/* ── 折叠判定（v1.7：50 行） ─────────────────────────────────────────── */

/**
 * v1.7（F29/§6.17）：默认展示前 50 行（50×22=1100px），超过才折叠。
 * 优先用 core/fold 的 foldInfo（渲染行数近似；代码块按 value 行数折算），
 * 缺失时本地按换行数近似（口径注明）。
 */
function gcFoldDecision(text, limits) {
  const value = gcStr(text)
  const fold = gcCore('fold')
  if (fold && typeof fold.foldInfo === 'function') {
    try {
      const info = fold.foldInfo(value)
      const lineCount = typeof info.lineCount === 'number' ? info.lineCount : 0
      return {
        foldable: !!info.folded,
        chars: countCodePoints(value),
        lines: lineCount,
        hidden: typeof info.hiddenLines === 'number' ? info.hiddenLines : Math.max(0, lineCount - 50),
        maxLines: typeof info.maxLines === 'number' ? info.maxLines : 50
      }
    } catch (error) {
      gcWarn('core foldInfo failed, using local:', gcShortError(error))
    }
  }
  const maxLines = 50
  const lines = value === '' ? 0 : value.split('\n').length
  return {
    foldable: lines > maxLines,
    chars: countCodePoints(value),
    lines: lines,
    hidden: Math.max(0, lines - maxLines),
    maxLines: maxLines
  }
}

function countCodePoints(value) {
  if (typeof value !== 'string') return 0
  let count = 0
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) i += 1
    count += 1
  }
  return count
}

/* ── 发送目标解析（D-A / D-C） ────────────────────────────────────────── */

function gcIsAddressable(member) {
  if (!member) return false
  const roster = gcCore('roster')
  if (roster && typeof roster.isAddressable === 'function') {
    try {
      return !!roster.isAddressable(member)
    } catch {}
  }
  if (member.kind === 'lead' || member.kind === 'teammate') return true
  if (member.kind === 'subagent') {
    if (member.addressable === false) return false
    const status = member.status || 'unknown'
    if (status === 'running' || status === 'provisioning') return true
    // 没有 status 时按可寻址处理（保守：宁可列出也不隐藏）
    if (status === 'unknown') return true
    return false
  }
  return false
}

function gcMentionCandidates(channel, query) {
  const allMembers = gcAllMembers(channel)
  const core = gcCore('mentions')
  if (core && typeof core.filterMentionCandidates === 'function' && allMembers.length > 0) {
    try {
      return core.filterMentionCandidates(allMembers, query)
    } catch (error) {
      gcWarn('core filterMentionCandidates failed, using local:', gcShortError(error))
    }
  }
  const index = gcMemberIndex(channel)
  const q = gcStr(query).toLowerCase()
  const lead = channel && channel.lead ? channel.lead : null
  const teammates = []
  const subagents = []
  for (let i = 0; i < index.members.length; i += 1) {
    const member = index.members[i]
    if (!member || !member.name || member.kind === 'lead') continue
    if (!gcIsAddressable(member)) continue
    if (member.kind === 'subagent') subagents.push(member)
    else teammates.push(member)
  }
  const byStatus = function (a, b) {
    const rank = { running: 0, provisioning: 0, inactive: 1, failed: 2, unknown: 3 }
    return (rank[a.status] === undefined ? 4 : rank[a.status]) - (rank[b.status] === undefined ? 4 : rank[b.status])
  }
  teammates.sort(byStatus)
  subagents.sort(byStatus)
  const all = (lead ? [lead] : []).concat(teammates, subagents)
  if (!q) return all
  return all.filter(function (member) {
    return (
      gcStr(member.name).toLowerCase().indexOf(q) >= 0 ||
      gcStr(member.displayName).toLowerCase().indexOf(q) >= 0
    )
  })
}

/**
 * 解析一次发送的目标：`{lead} ∪ 已选 chip`，去重保序。
 * 返回 {targets, dropped}；targets 元素 = {name, sessionId, kind, label}
 *
 * F-06：单 agent 会话（channel 为 null / 无 lead / 名册为空）时必须仍有一个 Lead 目标，
 * 否则发送编排会拿到 0 个目标并返回 failed/unknown。`sessionId` 是当前会话 id，
 * 作为 lead 目标 sessionId 的兜底（优先 channel.channelId / channel.lead.sessionId）。
 */
function gcLeadFallbackTarget(channel, sessionId) {
  const channelId = gcStr(channel && (channel.channelId || (channel.lead && channel.lead.sessionId)))
  const resolved = channelId || gcStr(sessionId)
  if (!resolved) return null
  return { name: 'lead', sessionId: resolved, kind: 'lead', label: 'Lead' }
}

function gcResolveTargets(draft, channel, sessionId) {
  const allMembers = gcAllMembers(channel)
  const core = gcCore('mentions')
  if (core && typeof core.resolveTargets === 'function' && allMembers.length > 0) {
    try {
      const resolved = core.resolveTargets(draft || { mentions: [] }, allMembers)
      const members = gcAsArray(resolved && resolved.targetMembers)
      const targets = members.map(function (member) {
        const isLead = member.kind === 'lead'
        return {
          name: isLead ? 'lead' : member.name,
          sessionId: member.sessionId || '',
          kind: member.kind || 'unknown',
          label: isLead ? 'Lead' : member.name
        }
      })
      if (targets.length === 0) {
        const fallback = gcLeadFallbackTarget(channel, sessionId)
        if (fallback) targets.push(fallback)
      }
      return {
        targets: targets,
        dropped: gcAsArray(resolved && resolved.dropped),
        hasFanout: targets.length > 1,
        notes: gcAsArray(resolved && resolved.notes)
      }
    } catch (error) {
      gcWarn('core resolveTargets failed, using local:', gcShortError(error))
    }
  }
  const index = gcMemberIndex(channel)
  const out = []
  const seen = Object.create(null)
  const dropped = []

  function push(member) {
    if (!member || !member.name || seen[member.name]) return
    seen[member.name] = true
    out.push({
      name: member.name,
      sessionId: member.sessionId || '',
      kind: member.kind || 'unknown',
      label: member.kind === 'lead' ? 'Lead' : member.name
    })
  }

  const leadMember = (channel && channel.lead) || index.byName.get('lead')
  if (leadMember) {
    push(leadMember)
  } else {
    const fallback = gcLeadFallbackTarget(channel, sessionId)
    if (fallback) {
      seen[fallback.name] = true
      out.push(fallback)
    }
  }
  const mentions = gcAsArray(draft && draft.mentions)
  for (let i = 0; i < mentions.length; i += 1) {
    const name = gcStr(mentions[i])
    if (!name) continue
    const member = index.byName.get(name)
    if (!member) {
      dropped.push({ name: name, reason: 'missing' })
      continue
    }
    if (!gcIsAddressable(member)) {
      dropped.push({ name: name, reason: 'not-addressable' })
      continue
    }
    push(member)
  }
  if (out.length === 0) {
    dropped.push({ name: 'lead', reason: 'channel-missing' })
  }
  return { targets: out, dropped: dropped, hasFanout: out.length > 1, notes: [] }
}

/** @ 补全触发：返回 {start, query}（无触发返回 null）。 */
function gcMentionQuery(text, caret) {
  const core = gcCore('mentions')
  if (core && typeof core.computeMentionQuery === 'function') {
    try {
      const result = core.computeMentionQuery(text, caret)
      // core 返回 {active,start,end,query}；未触发时 active=false/start=-1
      if (!result || result.active === false || (typeof result.start === 'number' && result.start < 0)) return null
      return { start: result.start, end: result.end, query: gcStr(result.query) }
    } catch (error) {
      gcWarn('core computeMentionQuery failed:', gcShortError(error))
    }
  }
  const value = gcStr(text)
  const at = typeof caret === 'number' ? caret : value.length
  let i = at - 1
  while (i >= 0) {
    const ch = value.charAt(i)
    if (ch === '@') {
      const before = i === 0 ? ' ' : value.charAt(i - 1)
      if (/\s/.test(before) || i === 0) {
        const query = value.slice(i + 1, at)
        if (/\s/.test(query) || query.indexOf('\n') >= 0) return null
        return { start: i, query: query }
      }
      return null
    }
    if (/\s/.test(ch)) return null
    i -= 1
  }
  return null
}

/** 把补全选中的成员写成 chip 文本（插回输入框）。 */
function gcInsertMention(text, mentionQuery, name) {
  const value = gcStr(text)
  if (!mentionQuery) return value + '@' + name + ' '
  const before = value.slice(0, mentionQuery.start)
  const after = value.slice(mentionQuery.start + 1 + gcStr(mentionQuery.query).length)
  return before + '@' + name + ' ' + after
}

/* ── 四态说明行模型（§5.3 / UX §7） ───────────────────────────────────── */

function gcTargetListText(message) {
  const targets = gcAsArray(message && message.targets)
  if (targets.length === 0) return 'Lead'
  return targets
    .map(function (name) {
      return name === 'lead' ? 'Lead' : '@' + name
    })
    .join(gcListSeparator())
}

/**
 * 用户消息气泡下的说明行（无绿勾/无底色）。
 * 返回 {tone, text, actions:[{id:'retry'|'copy', label}]}
 */
function gcCaptionModel(message, t) {
  if (!message || message.kind !== 'user') return null
  const status = message.delivery || (message.deliveries ? gcAggregateDelivery(message.deliveries) : 'sent')
  const targets = gcAsArray(message.targets)
  const list = gcTargetListText(message)

  if (status === 'sending') {
    return { tone: 'muted', text: t('msg.sending'), actions: [] }
  }
  if (status === 'failed') {
    const reason = gcSendReasonText(message, t)
    // 诊断信息默认隐藏（仅 debug 开关打开时追加 code/message/stage/build）
    const detail = gcDebugEnabled() ? gcSendDetailText(message) : ''
    return {
      tone: 'error',
      text: detail ? t('msg.failedDetail', { reason: reason, detail: detail }) : t('msg.failed', { reason: reason }),
      actions: [
        { id: 'retry', label: t('msg.retry') },
        { id: 'copy', label: t('msg.copy') }
      ]
    }
  }
  if (status === 'partial') {
    const deliveries = message.deliveries || {}
    const entries = Object.keys(deliveries)
    let ok = 0
    const failed = []
    for (let i = 0; i < entries.length; i += 1) {
      const targetId = entries[i]
      const state = deliveries[targetId]
      if (state === 'sent') ok += 1
      else failed.push(gcTargetNameFor(message, targetId))
    }
    const total = entries.length || Math.max(targets.length, 1)
    const text =
      failed.length > 3
        ? t('msg.partialWithNamesMore', {
            ok: ok,
            total: total,
            names: failed
              .slice(0, 3)
              .map(function (n) {
                return '@' + n
              })
              .join(gcListSeparator()),
            n: failed.length - 3
          })
        : failed.length > 0
          ? t('msg.partialWithNames', {
              ok: ok,
              total: total,
              names: failed
                .map(function (n) {
                  return '@' + n
                })
                .join(gcListSeparator())
            })
          : t('msg.partialDelivered', { ok: ok, total: total })
    const detail = gcDebugEnabled() ? gcSendDetailText(message) : ''
    return {
      tone: 'normal',
      text: detail ? text + t('send.error.debugSuffix', { detail: detail }) : text,
      actions: [{ id: 'retry', label: t('msg.retry') }]
    }
  }
  return {
    tone: 'normal',
    text: targets.length > 1 ? t('msg.deliveredTo', { list: list }) : t('msg.sendToLead'),
    actions: [{ id: 'copy', label: t('msg.copy') }]
  }
}

function gcAggregateDelivery(deliveries) {
  const states = Object.keys(deliveries || {}).map(function (key) {
    return deliveries[key]
  })
  if (states.length === 0) return 'sent'
  if (states.indexOf('sending') >= 0) return 'sending'
  if (states.indexOf('failed') >= 0) return states.indexOf('sent') >= 0 ? 'partial' : 'failed'
  return 'sent'
}

/** 发送失败原因码 → i18n key（send-batch 的 reason/messageKey 为稳定内部码）。 */
const GC_SEND_REASON_KEY = {
  'parent-unavailable': 'send.error.parentUnavailable',
  'parent-offline': 'send.error.parentUnavailable',
  readonly: 'send.error.forbidden',
  forbidden: 'send.error.forbidden',
  unaddressable: 'send.error.forbidden',
  network: 'send.error.network',
  timeout: 'send.error.network',
  aborted: 'send.error.network',
  'rate-limited': 'send.error.busy',
  busy: 'send.error.busy',
  'retry-exhausted': 'send.error.retryExhausted',
  'targets-overflow': 'send.error.targetsOverflow',
  'payload-too-large': 'send.error.generic',
  'session-missing': 'send.error.generic',
  'channel-missing': 'send.error.channelMissing',
  failed: 'send.error.generic',
  exception: 'send.error.generic',
  'empty-text': 'send.error.generic',
  unknown: 'send.error.generic'
}

/** 诊断用：失败详情（本次临时展示，F-06 根因修复后降级为 tooltip/移除）。 */
function gcSendDebugModel(message) {
  const meta = (message && message.meta) || {}
  const debug = meta.sendDebug
  if (debug && typeof debug === 'object') {
    const model = {
      reason: gcStr(debug.reason),
      code: gcStr(debug.code),
      status: gcStr(debug.status),
      stage: gcStr(debug.stage),
      message: gcClip(gcStr(debug.message), 200),
      build: gcStr(debug.build) || GC_BUILD_LABEL
    }
    if (Array.isArray(debug.failedTargets) && debug.failedTargets.length > 0) {
      model.failedTargets = debug.failedTargets.slice(0, 5).map(function (item) {
        return {
          target: gcStr(item && item.target),
          code: gcStr(item && item.code),
          message: gcClip(gcStr(item && item.message), 120)
        }
      })
    }
    return model
  }
  // 只有显式诊断字段才追加 detail（裸 meta.error 保持旧文案，不重复展示）
  if (meta.sendDetail || meta.sendErrorCode || meta.sendErrorStatus) {
    return {
      reason: gcStr(meta.sendErrorReason || meta.error),
      code: gcStr(meta.sendErrorCode),
      status: gcStr(meta.sendErrorStatus),
      stage: gcStr(meta.sendErrorStage),
      message: gcClip(gcStr(meta.sendDetail || meta.error), 200),
      build: GC_BUILD_LABEL
    }
  }
  return null
}

/**
 * caption 里追加的 detail 文本：`code=… · message=… · stage=… · build=…`。
 * code/message/stage 截断 ≤200 字，build 是短指纹、始终保留（用于确认实际加载版本）。
 */
function gcSendDetailText(message) {
  const debug = gcSendDebugModel(message)
  if (!debug) return ''
  const parts = []
  if (debug.code) parts.push('code=' + debug.code)
  if (debug.message) parts.push('message=' + debug.message)
  if (debug.stage) parts.push('stage=' + debug.stage)
  let text = parts.join(' · ')
  if (text !== '') text = gcClip(text, 200)
  const build = gcStr(debug.build) || GC_BUILD_LABEL
  if (build) text = text === '' ? 'build=' + build : text + ' · build=' + build
  return text
}

/**
 * 由 sendChannelBatch 的 deliveries + diagnostics 汇总诊断对象（失败目标优先）。
 * send/errors.js 的字段：delivery{detail,errorName,errorMessage,errorCode,errorStatus}；
 * result.diagnostics[]{target,reason,errorName,code,status,message,detail}。
 */
function gcSendDebugFromDeliveries(status, deliveries, diagnostics) {
  const list = gcAsArray(deliveries)
  const failed = list.filter(function (item) {
    return item && !item.ok
  })
  const diags = gcAsArray(diagnostics)
  // 诊断优先：即使 deliveries 为空，只要 diagnostics 有内容也必须展示
  if (failed.length === 0 && diags.length === 0) return null
  const first = failed[0] || {}
  const diag = diags[0] || {}
  const stage = gcStr(diag.stage) || gcStr(first.stage) || gcStr(first.errorStage) || gcStr(diag.errorStage)
  const code =
    gcStr(diag.code) || gcStr(first.errorCode) || gcStr(first.code) || gcStr(first.reason) || gcStr(first.error) || 'unknown'
  const message = gcClip(
    gcStr(diag.message) ||
      gcStr(first.errorMessage) ||
      gcStr(first.detail) ||
      gcStr(first.message) ||
      gcStr(first.error),
    200
  )
  const detail = gcClip(gcStr(first.detail) || gcStr(diag.detail), 200)
  return {
    reason: gcStr(diag.reason) || gcStr(first.reason) || gcStr(first.error) || gcStr(status),
    code: code,
    status: gcStr(status) || 'failed',
    stage: stage || (gcStr(status) === 'failed' ? 'unknown' : ''),
    message: message,
    detail: detail || undefined,
    build: GC_BUILD_LABEL,
    failedTargets: failed.map(function (item) {
      return {
        target: gcStr(item.target),
        code: gcStr(item.errorCode || item.code || item.reason || item.error),
        message: gcClip(gcStr(item.errorMessage || item.detail || item.message || item.error), 120)
      }
    })
  }
}

function gcSendReasonText(message, t) {
  const meta = (message && message.meta) || {}
  if (meta.sendErrorMessageKey) {
    const text = t(meta.sendErrorMessageKey)
    if (text !== meta.sendErrorMessageKey) return text
  }
  const reason = gcStr(meta.error) || gcStr(meta.sendErrorReason)
  if (!reason) return t('send.error.generic')
  const key = GC_SEND_REASON_KEY[reason]
  if (key) {
    const text = t(key)
    if (text !== key) return text
  }
  return reason
}

function gcTargetNameFor(message, targetSessionId) {
  const ids = gcAsArray(message && message.targetSessionIds)
  const names = gcAsArray(message && message.targets)
  const index = ids.indexOf(targetSessionId)
  if (index >= 0 && names[index]) return names[index]
  return targetSessionId
}

/* ── store（useSyncExternalStore 兼容） ───────────────────────────────── */

function gcInitialState(overrides) {
  return Object.assign(
    {
      channel: null,
      messages: [],
      cursor: null,
      phase: 'loading',
      error: null,
      loadingOlder: false,
      reachedOldest: false,
      unreadCount: 0,
      filter: null,
      draft: { text: '', mentions: [] },
      send: { inFlight: null },
      folded: {},
      expandedCards: {},
      toast: null,
      filterOpen: false,
      composerFocused: false,
      mention: null,
      mentionIndex: 0,
      droppedMentions: [],
      // v1.7
      trajectory: null,
      trajectoryTurns: [],
      composerFallback: false
    },
    overrides || null
  )
}

function gcCreateStore(overrides) {
  let state = gcInitialState(overrides)
  let listeners = []

  function notify() {
    const snapshot = listeners.slice()
    for (let i = 0; i < snapshot.length; i += 1) {
      try {
        snapshot[i]()
      } catch (error) {
        gcWarn('store listener failed:', gcShortError(error))
      }
    }
  }

  return {
    getSnapshot: function () {
      return state
    },
    subscribe: function (listener) {
      listeners.push(listener)
      return function () {
        listeners = listeners.filter(function (item) {
          return item !== listener
        })
      }
    },
    set: function (patch) {
      const next = typeof patch === 'function' ? patch(state) : patch
      if (!next) return
      state = Object.assign({}, state, next)
      notify()
    },
    dispose: function () {
      listeners = []
    }
  }
}

/* ── 权威名册覆盖（D-03：成员数/running 以 agentTeam 投影为准） ───────── */

function gcNormalizeRosterStatus(raw) {
  switch (raw) {
    case 'running':
      return 'running'
    case 'provisioning':
      return 'provisioning'
    case 'failed':
      return 'failed'
    case 'inactive':
    case 'idle':
    case 'done':
    case 'completed':
      return 'inactive'
    default:
      return ''
  }
}

/** `values.agentTeam` 可能是 `{members:[...]}` 或数组。 */
function gcRosterMembersFrom(agentTeam) {
  if (!agentTeam) return []
  if (Array.isArray(agentTeam)) return agentTeam
  if (Array.isArray(agentTeam.members)) return agentTeam.members
  return []
}

/**
 * 用 `agentTeam` 投影修正频道成员状态与 running 数（事件名册会把 active 的 teammate 高估为 running）。
 * 只改 status/model/description，不删成员（subagent 仍由适配器从事件/目录补充）。
 * @param {object|null} channel
 * @param {any} agentTeam `projectionsBySession[lead].values.agentTeam`
 * @param {string} leadSessionId
 */
function gcMergeRosterChannel(channel, agentTeam, leadSessionId) {
  if (!channel) return channel
  const rawMembers = gcRosterMembersFrom(agentTeam)
  if (rawMembers.length === 0) return channel

  const rawById = new Map()
  for (let i = 0; i < rawMembers.length; i += 1) {
    const raw = rawMembers[i]
    if (!raw) continue
    const id = gcStr(raw.id || raw.sessionId || raw.target)
    if (id) rawById.set(id, raw)
  }
  if (rawById.size === 0) return channel

  const current = gcAsArray(channel.members)
  let changed = false
  const members = []
  const seen = new Set()
  for (let i = 0; i < current.length; i += 1) {
    const member = current[i]
    if (!member || !member.sessionId) continue
    seen.add(member.sessionId)
    const raw = rawById.get(member.sessionId)
    if (!raw) {
      members.push(member)
      continue
    }
    const rawStatus = gcNormalizeRosterStatus(raw.status)
    const next = Object.assign({}, member)
    if (rawStatus && rawStatus !== member.status) {
      next.status = rawStatus
      changed = true
    }
    if (!member.model && gcStr(raw.model)) next.model = gcStr(raw.model)
    if (!member.description && gcStr(raw.description)) next.description = gcStr(raw.description)
    if (member.kind === 'teammate' && gcStr(raw.name) && gcStr(raw.name) !== member.name) {
      next.name = gcStr(raw.name)
      next.displayName = gcStr(raw.name)
      changed = true
    }
    members.push(next)
  }

  // 投影里存在、事件名册里缺的 teammate 补进来（lead 不重复）
  rawById.forEach(function (raw, id) {
    if (seen.has(id) || id === leadSessionId) return
    if (raw.role === 'lead' || raw.name === 'lead') return
    const status = gcNormalizeRosterStatus(raw.status) || 'unknown'
    members.push({
      sessionId: id,
      name: gcStr(raw.name) || id.slice(0, 8),
      displayName: gcStr(raw.name) || id.slice(0, 8),
      kind: 'teammate',
      parentSessionId: leadSessionId,
      depth: 1,
      status: status,
      description: gcStr(raw.description) || undefined,
      model: gcStr(raw.model) || undefined,
      addressable: true,
      badge: 'teammate'
    })
    changed = true
  })

  const rank = function (member) {
    return member.kind === 'lead' ? 0 : member.kind === 'teammate' ? 1 : 2
  }
  members.sort(function (a, b) {
    return rank(a) - rank(b)
  })
  const runningCount = members.filter(function (member) {
    return member.status === 'running'
  }).length

  if (!changed && runningCount === channel.runningCount) return channel
  return Object.assign({}, channel, { members: members, runningCount: runningCount })
}

/* ── 频道级内存（草稿 / 滚动位置，切换会话恢复） ─────────────────────── */

const gcDraftMemory = new Map()
const gcScrollMemory = new Map()

function gcSaveDraft(channelId, draft) {
  if (!channelId) return
  if (!draft || (!gcStr(draft.text) && gcAsArray(draft.mentions).length === 0)) {
    gcDraftMemory.delete(channelId)
    return
  }
  gcDraftMemory.set(channelId, {
    text: gcStr(draft.text),
    mentions: gcAsArray(draft.mentions).slice(),
    updatedAt: Date.now()
  })
}

function gcLoadDraft(channelId, ttlMs) {
  const saved = channelId ? gcDraftMemory.get(channelId) : null
  if (!saved) return { text: '', mentions: [] }
  const ttl = ttlMs || GC_LOCAL_LIMITS.draftTtlMs
  if (Date.now() - saved.updatedAt > ttl) {
    gcDraftMemory.delete(channelId)
    return { text: '', mentions: [] }
  }
  return { text: saved.text, mentions: saved.mentions.slice() }
}

function gcSaveScroll(channelId, top) {
  if (channelId && typeof top === 'number') gcScrollMemory.set(channelId, top)
}

function gcLoadScroll(channelId) {
  const value = channelId ? gcScrollMemory.get(channelId) : undefined
  return typeof value === 'number' ? value : null
}

/* ── 调试快照（§7 诊断，不输出正文全文） ─────────────────────────────── */

function gcDiagnostics(state) {
  const channel = state && state.channel ? state.channel : null
  const messages = gcAsArray(state && state.messages)
  return {
    channelId: channel ? channel.channelId : null,
    members: channel ? gcAsArray(channel.members).length : 0,
    messages: messages.length,
    phase: state ? state.phase : 'idle',
    filter: state ? state.filter : null,
    unread: state ? state.unreadCount : 0,
    lastIds: messages.slice(-5).map(function (m) {
      return { id: m.id, kind: m.kind, time: m.time }
    })
  }
}

/* ── src/client/parts/30-primitives.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 30-primitives.part.js — 基础原子组件（无状态、纯函数，便于组件测试）
 * ────────────────────────────────────────────────────────────────────────── */

/* ── 图标（16×16 stroke，颜色继承 currentColor） ─────────────────────── */

function GcIconFilter(props) {
  const size = (props && props.size) || 14
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('path', {
      d: 'M2 3.5h12M4.5 8h7M6.5 12.5h3',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round'
    })
  )
}

function GcIconSend(props) {
  const size = (props && props.size) || 16
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('path', {
      d: 'M8 13V3.5M8 3.5 4 7.5M8 3.5l4 4',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    })
  )
}

function GcIconChevron(props) {
  const size = (props && props.size) || 12
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('path', {
      d: props && props.direction === 'up' ? 'M3.5 10 8 5.5l4.5 4.5' : 'M3.5 6 8 10.5 12.5 6',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    })
  )
}

function GcIconAt(props) {
  const size = (props && props.size) || 20
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
    h('circle', { cx: 12, cy: 12, r: 4, stroke: 'currentColor', strokeWidth: 1.5 }),
    h('path', {
      d: 'M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8',
      stroke: 'currentColor',
      strokeWidth: 1.5,
      strokeLinecap: 'round'
    })
  )
}

function GcIconCopy(props) {
  const size = (props && props.size) || 14
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('rect', { x: 5.5, y: 2.5, width: 8, height: 9, rx: 1.6, stroke: 'currentColor', strokeWidth: 1.2 }),
    h('path', { d: 'M10.5 13.5v.4a1.1 1.1 0 0 1-1.1 1.1H3.1A1.1 1.1 0 0 1 2 13.9V6.1A1.1 1.1 0 0 1 3.1 5h.4', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' })
  )
}

function GcIconExternal(props) {
  const size = (props && props.size) || 14
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('path', { d: 'M6.5 3.5H3.9A1.4 1.4 0 0 0 2.5 4.9v7.2a1.4 1.4 0 0 0 1.4 1.4h7.2a1.4 1.4 0 0 0 1.4-1.4V9.5', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' }),
    h('path', { d: 'M9.5 2.5h4v4M13.2 2.8 7.6 8.4', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' })
  )
}

function GcIconTasks(props) {
  const size = (props && props.size) || 16
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('rect', { x: 2.5, y: 2.5, width: 11, height: 11, rx: 2, stroke: 'currentColor', strokeWidth: 1.2 }),
    h('path', { d: 'M5 8.2l2 2 4-4', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' })
  )
}

function GcIconClose(props) {
  const size = (props && props.size) || 14
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('path', { d: 'M3.5 3.5l9 9M12.5 3.5l-9 9', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' })
  )
}

/* ── 头像 / 状态点 / pill ─────────────────────────────────────────────── */

function gcAvatarLetter(name) {
  const value = gcStr(name).trim()
  if (!value) return '?'
  const first = Array.from(value)[0]
  return first ? first.toUpperCase() : '?'
}

function GcAvatar(props) {
  const kind = props.kind || 'teammate'
  const size = props.size || 32
  return h(
    'span',
    {
      className: 'gc-avatar',
      'data-kind': kind,
      'data-size': String(size),
      'aria-hidden': 'true',
      title: props.title || undefined
    },
    gcAvatarLetter(props.name)
  )
}

function GcStatusDot(props) {
  const state = props.state || 'unknown'
  return h('span', { className: 'gc-dot', 'data-state': state, 'aria-hidden': 'true' })
}

function GcPill(props) {
  return h(
    'span',
    { className: 'gc-pill', 'data-status': props.status || 'pending' },
    props.label === undefined || props.label === null || props.label === '' ? props.status : props.label
  )
}

/* ── 富文本（Markdown-lite：段落 / 换行 / 行内代码 / 粗体 / @提及） ──── */

const GC_INLINE_TOKEN = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(@[0-9A-Za-z_\u4e00-\u9fa5.\-]+)/g

function gcRenderInline(text, options) {
  const opts = options || {}
  const mentionSet = opts.mentionSet || null
  const onMention = opts.onMention
  const out = []
  const value = gcStr(text)
  let last = 0
  let match = GC_INLINE_TOKEN.exec(value)
  let key = 0
  while (match) {
    if (match.index > last) out.push(value.slice(last, match.index))
    const token = match[0]
    if (token.charAt(0) === '`') {
      out.push(h('code', { key: 'c' + key }, token.slice(1, -1)))
    } else if (token.slice(0, 2) === '**') {
      out.push(h('strong', { key: 'b' + key }, token.slice(2, -2)))
    } else {
      const name = token.slice(1)
      const known = !mentionSet || mentionSet.has(name)
      if (known) {
        out.push(
          h(
            'span',
            {
              key: 'm' + key,
              className: 'gc-mention',
              'data-mention': name,
              'data-clickable': onMention ? 'true' : 'false',
              role: onMention ? 'button' : undefined,
              tabIndex: onMention ? 0 : undefined,
              onClick: onMention
                ? function (event) {
                    event.stopPropagation()
                    onMention(name)
                  }
                : undefined,
              onKeyDown: onMention
                ? function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onMention(name)
                    }
                  }
                : undefined
            },
            token
          )
        )
      } else {
        out.push(token)
      }
    }
    last = match.index + token.length
    key += 1
    match = GC_INLINE_TOKEN.exec(value)
  }
  if (last < value.length) out.push(value.slice(last))
  return out.length > 0 ? out : [value]
}

function GcRichText(props) {
  const text = gcStr(props.text)
  const blocks = text.split(/\n{2,}/)
  const nodes = []
  for (let i = 0; i < blocks.length; i += 1) {
    const lines = blocks[i].split('\n')
    const children = []
    for (let j = 0; j < lines.length; j += 1) {
      if (j > 0) children.push(h('br', { key: 'br' + i + '-' + j }))
      const inline = gcRenderInline(lines[j], {
        mentionSet: props.mentionSet,
        onMention: props.onMention
      })
      for (let k = 0; k < inline.length; k += 1) children.push(inline[k])
    }
    nodes.push(h('p', { key: 'p' + i }, children))
  }
  return h(Fragment, null, nodes)
}

/* ── Markdown 受控渲染（F22 / §6.12；禁止 innerHTML） ─────────────────── */

function gcSplitMentions(value, mentionSet, onMention) {
  const text = gcStr(value)
  if (!text) return []
  const re = /(@[0-9A-Za-z_\u4e00-\u9fa5.\-]+)/g
  const out = []
  let last = 0
  let match = re.exec(text)
  let key = 0
  while (match) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    const name = token.slice(1)
    if (!mentionSet || mentionSet.has(name)) {
      out.push(
        h(
          'span',
          {
            key: 'm' + key,
            className: 'gc-mention',
            'data-mention': name,
            'data-clickable': onMention ? 'true' : 'false',
            role: onMention ? 'button' : undefined,
            tabIndex: onMention ? 0 : undefined,
            onClick: onMention
              ? function (event) {
                  event.stopPropagation()
                  onMention(name)
                }
              : undefined
          },
          token
        )
      )
    } else out.push(token)
    last = match.index + token.length
    key += 1
    match = re.exec(text)
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function gcMarkdownMod() {
  return gcCore('markdown')
}

/** 链接安全（防御纵深）：core 已过滤一次，渲染端再校验 scheme。 */
function gcIsSafeLinkUrl(url) {
  const value = gcStr(url).trim()
  if (!value) return false
  const mod = gcMarkdownMod()
  if (mod && typeof mod.isSafeUrl === 'function') {
    try {
      return !!mod.isSafeUrl(value)
    } catch {}
  }
  return /^(https?:|mailto:)/i.test(value)
}

function gcRenderMdInline(children, options) {
  const list = gcAsArray(children)
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const node = list[i]
    if (!node) continue
    if (node.type === 'text') {
      const parts = gcSplitMentions(node.value, options.mentionSet, options.onMention)
      for (let j = 0; j < parts.length; j += 1) {
        if (typeof parts[j] === 'string') out.push(parts[j])
        else out.push(h(Fragment, { key: 'm' + i + '-' + j }, parts[j]))
      }
    } else if (node.type === 'strong') {
      out.push(h('strong', { key: 's' + i, className: 'gc-md-strong' }, gcRenderMdInline(node.children, options)))
    } else if (node.type === 'em') {
      out.push(h('em', { key: 'e' + i, className: 'gc-md-em' }, gcRenderMdInline(node.children, options)))
    } else if (node.type === 'code') {
      out.push(h('code', { key: 'c' + i, className: 'gc-md-code' }, gcStr(node.value)))
    } else if (node.type === 'link') {
      const url = gcStr(node.url)
      if (!gcIsSafeLinkUrl(url)) {
        // 渲染端二次校验失败 → 纯文本（不产生 <a>）
        out.push(h('span', { key: 'l' + i, className: 'gc-md-link-plain' }, gcRenderMdInline(node.children, options)))
      } else {
        out.push(
          h(
            'a',
            {
              key: 'l' + i,
              className: 'gc-md-link',
              href: url,
              target: '_blank',
              rel: 'noopener noreferrer',
              'data-md-link': 'true'
            },
            gcRenderMdInline(node.children, options)
          )
        )
      }
    } else if (node.type === 'break') {
      out.push(h('br', { key: 'b' + i }))
    } else if (typeof node.value === 'string') {
      out.push(node.value)
    }
  }
  return out
}

/**
 * F32：GFM 表格渲染（backend 冻结 AST：{type:'table', align[], header:Inline[][], rows:Inline[][][]}）。
 * 也兼容按行/单元格对象组织的变体；单元格内联走既有 inline 渲染（链接仍 isSafeUrl）。
 */
function gcRenderMdCellChildren(cell) {
  if (!cell) return []
  if (Array.isArray(cell)) return cell
  if (Array.isArray(cell.children)) return cell.children
  if (Array.isArray(cell.inline)) return cell.inline
  return [cell]
}

/**
 * F32/v1.7.2 表格渲染（AST：`header:{cells,align}` + `rows[][{children}]`）。
 * 兼容旧的 `header:Inline[][]` / `rows:Inline[][][]` 形态；DOM：data-md-table-wrap/table/th[data-align]/td[data-align]。
 */
function gcRenderMdTable(node, options, keyPrefix) {
  let headerCells = []
  let align = []
  let rows = []

  const header = node && node.header
  if (header && !Array.isArray(header) && Array.isArray(header.cells)) {
    headerCells = header.cells
    align = gcAsArray(header.align)
    rows = gcAsArray(node.rows)
  } else if (Array.isArray(header) && Array.isArray(node.rows)) {
    headerCells = header
    align = gcAsArray(node.align)
    rows = node.rows
  } else {
    // 兜底：按行对象（table_row/cells）组织
    const flattenRows = function (nodes) {
      const out = []
      const list = gcAsArray(nodes)
      for (let i = 0; i < list.length; i += 1) {
        const item = list[i]
        if (!item) continue
        if (item.type === 'thead' || item.type === 'tbody') {
          out.push.apply(out, flattenRows(item.children))
          continue
        }
        if (item.type === 'table_row' || Array.isArray(item.cells) || Array.isArray(item.children)) {
          out.push(gcAsArray(item.cells || item.children))
        }
      }
      return out
    }
    const allRows = flattenRows(node && node.children)
    headerCells = allRows[0] || []
    rows = allRows.slice(1)
  }

  const alignValue = function (index) {
    const value = align[index]
    return value === 'left' || value === 'center' || value === 'right' ? value : undefined
  }
  const alignStyle = function (index) {
    const value = alignValue(index)
    return value ? { textAlign: value } : undefined
  }

  const headRow = h(
    'tr',
    null,
    gcAsArray(headerCells).map(function (cell, index) {
      return h(
        'th',
        { key: 'th' + index, 'data-align': alignValue(index), style: alignStyle(index) },
        gcRenderMdInline(gcRenderMdCellChildren(cell), options)
      )
    })
  )
  const bodyRows = gcAsArray(rows).map(function (row, rowIndex) {
    return h(
      'tr',
      { key: 'tr' + rowIndex },
      gcAsArray(row).map(function (cell, cellIndex) {
        return h(
          'td',
          { key: 'td' + cellIndex, 'data-align': alignValue(cellIndex), style: alignStyle(cellIndex) },
          gcRenderMdInline(gcRenderMdCellChildren(cell), options)
        )
      })
    )
  })

  return h(
    'div',
    {
      key: keyPrefix,
      className: 'gc-md-table-wrap',
      'data-md-table-wrap': 'true',
      'data-md-truncated': node && node.truncated ? 'true' : undefined
    },
    h(
      'table',
      { className: 'gc-md-table', 'data-md-table': 'true' },
      h('thead', null, headRow),
      h('tbody', null, bodyRows)
    )
  )
}

function gcRenderMdBlocks(blocks, options) {
  const list = gcAsArray(blocks)
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const node = list[i]
    if (!node) continue
    if (node.type === 'paragraph') {
      out.push(h('p', { key: 'p' + i, className: 'gc-md-p' }, gcRenderMdInline(node.children, options)))
    } else if (node.type === 'code_block') {
      out.push(
        h(
          'pre',
          { key: 'pre' + i, className: 'gc-md-pre', 'data-lang': gcStr(node.lang) || undefined },
          h('code', null, gcStr(node.value))
        )
      )
    } else if (node.type === 'table') {
      out.push(gcRenderMdTable(node, options, 'table' + i))
    } else if (node.type === 'list') {
      const items = gcAsArray(node.items).map(function (item, itemIndex) {
        return h('li', { key: 'li' + i + '-' + itemIndex, className: 'gc-md-li' }, gcRenderMdBlocks(item.children, options))
      })
      out.push(
        h(
          node.ordered ? 'ol' : 'ul',
          { key: 'list' + i, className: 'gc-md-list', start: node.ordered && node.start ? node.start : undefined },
          items
        )
      )
    } else if (typeof node.value === 'string') {
      out.push(h('p', { key: 'raw' + i, className: 'gc-md-p' }, node.value))
    }
  }
  return out
}

/**
 * 气泡正文渲染：core/markdown 的受控 AST → React 节点（无 innerHTML）。
 * 模块缺失/解析异常 → `data-md="plain"` 的纯文本（保留换行）。
 */
function GcMarkdown(props) {
  const text = gcStr(props.text)
  const options = { mentionSet: props.mentionSet, onMention: props.onMention }
  const mod = gcMarkdownMod()
  if (mod && typeof mod.parseMarkdown === 'function') {
    try {
      const ast = mod.parseMarkdown(text)
      if (!ast || ast.plain === true) {
        return h('div', { className: 'gc-md', 'data-md': 'plain' }, gcSplitMentions(text, options.mentionSet, options.onMention))
      }
      return h(
        'div',
        {
          className: 'gc-md',
          'data-md': 'rich',
          'data-md-truncated': ast.truncated ? 'true' : undefined
        },
        gcRenderMdBlocks(ast.children, options)
      )
    } catch (error) {
      gcWarn('markdown render failed, plain fallback:', gcShortError(error))
    }
  }
  return h('div', { className: 'gc-md', 'data-md': 'plain' }, gcSplitMentions(text, options.mentionSet, options.onMention))
}

/* ── SenderLine ───────────────────────────────────────────────────────── */

function gcRoleLabel(kind, t) {
  const key = GC_ROLE_LABEL_KEY[kind] || 'member.roleFallback'
  return t(key)
}

function gcStatusText(status, t) {
  if (!status || status === 'unknown') return ''
  const key = 'status.' + status
  const text = t(key)
  return text === key ? '' : text
}

function GcSenderLine(props) {
  const sender = props.sender || {}
  const t = props.t
  const line = [
    h('span', { key: 'name', className: 'gc-sender-name' }, props.name || sender.name || t('member.roleFallback'))
  ]
  if (props.parentName) {
    line.push(h('span', { key: 'parent', className: 'gc-sender-sub' }, t('member.subagentOf', { parent: props.parentName })))
  }
  if (props.statusText) {
    line.push(
      h(
        'span',
        { key: 'status', className: 'gc-sender-status' },
        h(GcStatusDot, { state: props.statusState || 'unknown' }),
        props.statusText
      )
    )
  }
  if (props.roleLabel) {
    line.push(h('span', { key: 'role', className: 'gc-sender-role' }, props.roleLabel))
  }
  if (props.time) {
    line.push(h('span', { key: 'time', className: 'gc-sender-time' }, props.time))
  }
  return h('div', { className: 'gc-sender', 'data-card': props.card ? 'true' : 'false' }, line)
}

/** SenderLine 与内容同列时的外层（头像 + 右侧内容块）。 */
function GcRowShell(props) {
  return h(
    'div',
    {
      className: 'gc-row',
      'data-self': props.self ? 'true' : 'false',
      'data-tight': props.tight ? 'true' : 'false',
      'data-kind': props.kind,
      'data-message-id': props.messageId,
      'data-status': props.status,
      'data-member-kind': props.memberKind,
      'data-parent': props.parent,
      role: 'article',
      'aria-label': props.ariaLabel
    },
    props.children
  )
}

function GcBubble(props) {
  const failedState = props.state === 'failed' || props.state === 'partial'
  const debug = failedState && props.debug ? props.debug : null
  return h(
    'div',
    {
      className: 'gc-bubble',
      'data-testid': 'group-chat-bubble',
      'data-self': props.self ? 'true' : 'false',
      'data-state': props.state || undefined,
      // 临时诊断（F-06）：失败气泡可被 AX/截图读取的真实 reason/code/status/message
      'data-send-debug': debug
        ? (function () {
            try {
              return JSON.stringify(debug)
            } catch {
              return undefined
            }
          })()
        : undefined
    },
    props.children
  )
}

/* ── 气泡下说明行 / 折叠 / 行操作 ────────────────────────────────────── */

function GcCaption(props) {
  const model = props.model
  if (!model) return null
  const children = [h('span', { key: 'text' }, model.text)]
  const actions = gcAsArray(model.actions)
  for (let i = 0; i < actions.length; i += 1) {
    if (i === 0) children.push(h('span', { key: 'sep', className: 'gc-caption-sep' }, '·'))
    children.push(
      h(
        'button',
        {
          key: actions[i].id,
          type: 'button',
          className: 'gc-link gc-caption-action',
          'data-action': actions[i].id,
          onClick: function (event) {
            event.preventDefault()
            if (props.onAction) props.onAction(actions[i].id)
          }
        },
        actions[i].label
      )
    )
  }
  return h(
    'div',
    {
      className: 'gc-caption',
      'data-testid': 'group-chat-bubble-caption',
      'data-tone': model.tone === 'error' ? 'error' : model.tone === 'muted' ? 'muted' : 'normal'
    },
    children
  )
}

function GcFoldMeta(props) {
  const t = props.t
  const decision = props.decision
  const expanded = !!props.expanded
  const maxLines = decision.maxLines || 50
  const lineCount = decision.lines || 0
  return h(
    'div',
    { className: 'gc-fold-meta' },
    !expanded ? h('span', null, t('msg.foldMetaLines', { n: maxLines })) : null,
    h(
      'button',
      {
        type: 'button',
        className: 'gc-fold-toggle',
        'data-testid': 'group-chat-fold-toggle',
        'data-line-count': String(lineCount),
        'aria-expanded': expanded ? 'true' : 'false',
        onClick: function (event) {
          event.preventDefault()
          if (props.onToggle) props.onToggle()
        }
      },
      expanded ? t('msg.collapse') : t('msg.expandLines', { n: lineCount })
    )
  )
}

function GcRowActions(props) {
  const t = props.t
  const actions = [
    h(
      'button',
      {
        key: 'copy',
        type: 'button',
        className: 'gc-icon-action',
        'data-action': 'copy-message',
        'aria-label': t('msg.action.copy'),
        title: t('msg.action.copy'),
        onClick: function (event) {
          event.preventDefault()
          if (props.onCopy) props.onCopy()
        }
      },
      h(GcIconCopy, { size: 14 })
    )
  ]
  if (props.onOpen) {
    actions.push(
      h(
        'button',
        {
          key: 'open',
          type: 'button',
          className: 'gc-icon-action',
          'data-action': 'open-session',
          'aria-label': t('msg.action.openSession'),
          title: t('msg.action.openSession'),
          onClick: function (event) {
            event.preventDefault()
            props.onOpen()
          }
        },
        h(GcIconExternal, { size: 14 })
      )
    )
  }
  return h('div', { className: 'gc-row-actions', 'aria-label': t('msg.reactions') }, actions)
}

function GcToast(props) {
  if (!props.text) return null
  return h('div', { className: 'gc-toast', role: 'status', 'aria-live': 'polite' }, props.text)
}

/* ── src/client/parts/40-cards.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 40-cards.part.js — 卡片消息（M8 成员加入 / M9 任务卡）
 *
 * 结构约束（架构 §6.2 / §6.5 / §6.5.2）：
 *  - M8 = creator 的 SenderLine + 卡片 body（不是孤立卡片）
 *  - M9 = 操作者(actor) 的 SenderLine + 任务卡 body；紧凑版用于密集流
 *  - 卡片不参与长文折叠；卡片内字段空值隐藏整行（不留「未知」）
 *  - 颜色/尺寸全走 CSS 类（颜色 token 在 group-chat.css）
 * ────────────────────────────────────────────────────────────────────────── */

const GC_TASK_ACTION_KEY = {
  create: 'task.action.create',
  claim: 'task.action.claim',
  complete: 'task.action.complete',
  reopen: 'task.action.reopen',
  reassign: 'task.action.reassign',
  edit: 'task.action.edit',
  set_dependencies: 'task.action.setDependencies',
  delete: 'task.action.delete',
  release: 'task.action.release'
}

const GC_TASK_STATE_KEY = {
  pending: 'task.state.pending',
  in_progress: 'task.state.inProgress',
  completed: 'task.state.completed',
  deleted: 'task.state.cancelled'
}

function gcTaskActionLabel(payload, t) {
  const key = GC_TASK_ACTION_KEY[payload && payload.action]
  if (key) {
    const text = t(key)
    if (text !== key) return text
  }
  return gcStr(payload && payload.actionLabel) || gcStr(payload && payload.action) || ''
}

function gcTaskStatusLabel(payload, t) {
  const status = gcStr(payload && payload.task && payload.task.status)
  const key = GC_TASK_STATE_KEY[status]
  if (key) {
    const text = t(key)
    if (text !== key) return text
  }
  return gcStr(payload && payload.statusLabel) || status
}

/** 成员卡上下文策略文案（V1.4-5 / D-D：按工具名 + mode 推导，provider 名永不直出）。 */
function gcMemberContextText(member, t) {
  if (!member) return ''
  const tool = gcStr(member.createTool)
  const policy = gcStr(member.contextPolicy)
  let key = ''
  if (tool === 'subagent') key = 'member.contextSubagent'
  else if (tool === 'subagent_fork') key = 'member.contextSubagentFork'
  else if (tool === 'spawn_teammate') key = policy === 'fork' ? 'member.contextForkLead' : 'member.contextFresh'
  else if (policy === 'fork') key = 'member.contextForkLead'
  else if (policy === 'fresh') key = 'member.contextFresh'
  if (!key) return ''
  let text = t(key)
  if (text === key) return ''
  if (gcStr(member.lifecycleMode) === 'one_shot') text += t('member.modeOneShot')
  return text
}

/** 成员卡模型文案（继承时 `{model}（继承 X）`；无模型整行隐藏）。 */
function gcMemberModelText(member, creatorName, t) {
  if (!member) return ''
  const model = gcStr(member.model)
  if (!model) return ''
  const inheritedFrom = gcStr(member.modelInheritedFrom)
  if (inheritedFrom) {
    if (inheritedFrom === 'lead') return t('member.modelInheritedLead', { model: model })
    return t('member.modelInheritedFrom', { model: model, parent: inheritedFrom })
  }
  if (gcStr(member.createTool) === 'spawn_teammate') return t('member.modelInheritedLead', { model: model })
  if (creatorName && (gcStr(member.createTool) === 'subagent' || gcStr(member.createTool) === 'subagent_fork')) {
    return t('member.modelInheritedFrom', { model: model, parent: creatorName })
  }
  return model
}

function GcFieldRow(props) {
  return h(
    'div',
    {
      className: 'gc-field-row',
      'data-field': props.field
    },
    h('span', { className: 'gc-field-label' }, props.label),
    h('span', { className: 'gc-field-value', 'data-mono': props.mono ? 'true' : undefined }, props.value)
  )
}

function GcTaskFieldRow(props) {
  return h(
    'div',
    {
      className: 'gc-task-field',
      'data-field': props.field
    },
    h('span', { className: 'gc-task-field-label' }, props.label),
    h('span', { className: 'gc-task-field-value' }, props.value)
  )
}

/* ── M8 成员加入消息 ─────────────────────────────────────────────────── */

function GcMemberJoinMessage(props) {
  const message = props.message
  const t = props.t
  const payload = message.memberCard || {}
  const member = payload.member || {}
  const sender = message.sender || {}
  const memberName = gcStr(member.name) || gcStr(member.sessionId).slice(0, 8)
  const creatorName = gcStr(sender.name) || 'lead'
  const creatorKind = sender.kind === 'lead' ? 'lead' : sender.kind || 'teammate'
  const actions = payload.actions || {}
  const expanded = !!props.expanded
  const promptExcerpt = gcStr(member.promptExcerpt)
  const modelText = gcMemberModelText(member, creatorName, t)
  const contextText = gcMemberContextText(member, t)
  const createTool = gcStr(member.createTool)
  const parentName = gcStr(member.parentName)
  const description = gcStr(member.description)

  const fields = []
  if (modelText) fields.push(h(GcFieldRow, { key: 'model', field: 'model', label: t('member.fieldModel'), value: modelText }))
  if (contextText) {
    fields.push(h(GcFieldRow, { key: 'context', field: 'context', label: t('member.fieldContext'), value: contextText }))
  }
  if (createTool && createTool !== 'unknown') {
    fields.push(
      h(GcFieldRow, {
        key: 'tool',
        field: 'create-tool',
        label: t('member.fieldCreateTool'),
        value: createTool,
        mono: true
      })
    )
  }
  if (parentName) {
    fields.push(h(GcFieldRow, { key: 'parent', field: 'parent', label: t('member.fieldParent'), value: parentName }))
  }

  const bodyChildren = [
    h('div', { key: 'title', className: 'gc-card-title' }, t('member.cardTitle', { name: memberName })),
    h(
      'p',
      {
        key: 'desc',
        className: 'gc-card-desc',
        'data-empty': description ? 'false' : 'true',
        'data-field': 'description'
      },
      description || t('member.noDesc')
    ),
    fields.length > 0 ? h('div', { key: 'fields', className: 'gc-card-fields' }, fields) : null
  ]

  if (promptExcerpt) {
    bodyChildren.push(
      h(
        'div',
        { key: 'task', className: 'gc-card-task-block', 'data-field': 'task' },
        h(
          'div',
          { className: 'gc-card-task-head' },
          h('span', { className: 'gc-card-task-label' }, t('member.initialTask')),
          h(
            'button',
            {
              type: 'button',
              className: 'gc-card-action',
              'data-action': 'expand-task',
              'data-state': 'enabled',
              style: { marginLeft: 'auto', fontSize: '11px', lineHeight: '16px' },
              'aria-expanded': expanded ? 'true' : 'false',
              onClick: function (event) {
                event.preventDefault()
                if (props.onAction) props.onAction('expand-task')
              }
            },
            expanded ? t('member.collapseTask') : t('member.expandTask')
          )
        ),
        h(
          'p',
          {
            className: 'gc-card-task-body',
            'data-clamped': expanded ? 'false' : 'true'
          },
          expanded ? gcStr(member.promptFull) || promptExcerpt : promptExcerpt
        )
      )
    )
  }

  const viewSessionDisabled = actions.viewSession === 'disabled'
  const actionNodes = [
    h(
      'button',
      {
        key: 'view-session',
        type: 'button',
        className: 'gc-card-action',
        'data-action': 'view-session',
        'data-state': viewSessionDisabled ? 'disabled' : 'enabled',
        disabled: viewSessionDisabled,
        title: viewSessionDisabled ? t('member.noPermission') : t('member.viewSession'),
        onClick: function (event) {
          event.preventDefault()
          if (!viewSessionDisabled && props.onAction) props.onAction('view-session')
        }
      },
      t('member.viewSession')
    )
  ]
  if (gcStr(member.kind) === 'teammate' || actions.viewTask) {
    const viewTaskDisabled = actions.viewTask === 'disabled'
    actionNodes.push(
      h(
        'button',
        {
          key: 'view-task',
          type: 'button',
          className: 'gc-card-action',
          'data-tone': 'secondary',
          'data-action': 'view-task',
          'data-state': viewTaskDisabled ? 'disabled' : 'enabled',
          disabled: viewTaskDisabled,
          onClick: function (event) {
            event.preventDefault()
            if (!viewTaskDisabled && props.onAction) props.onAction('view-task')
          }
        },
        t('member.viewTask')
      )
    )
  }
  bodyChildren.push(h('div', { key: 'actions', className: 'gc-card-actions' }, actionNodes))

  return h(
    'div',
    {
      className: 'gc-card-row',
      'data-kind': 'member_card',
      'data-message-id': message.id,
      'data-sender': creatorName,
      'data-member-id': gcStr(member.sessionId),
      'data-member-kind': gcStr(member.kind) || 'teammate',
      'data-member-state': gcStr(member.state) || 'active',
      'data-parent': parentName || undefined,
      'data-creation-id': gcStr(message.creationId),
      'data-pair-order': String(typeof message.pairOrder === 'number' ? message.pairOrder : 1),
      role: 'article',
      'aria-label': t('member.cardTitle', { name: memberName })
    },
    h(GcAvatar, { name: creatorName, kind: creatorKind, size: 32 }),
    h(
      'div',
      { className: 'gc-row-main' },
      h(GcSenderLine, {
        t: t,
        sender: sender,
        name: creatorName,
        kind: creatorKind,
        roleLabel: gcRoleLabel(creatorKind, t),
        time: gcMessageTimeText(payload.time || message.time),
        card: true
      }),
      h(
        'div',
        {
          className: 'gc-card',
          'data-card': 'member-join',
          'data-testid': 'group-chat-member-card'
        },
        bodyChildren
      )
    )
  )
}

/* ── M9 任务卡 ───────────────────────────────────────────────────────── */

function gcTaskOwnerText(task, payload, t) {
  const ownerName = gcStr(task.ownerName) || gcStr(task.ownerId)
  if (ownerName) return ownerName
  const actorKind = gcStr(payload && payload.actor && payload.actor.kind)
  if (actorKind === 'system') return t('task.actorSystem')
  return t('task.unassigned')
}

function gcTaskBlockedByText(task, t) {
  const names = gcAsArray(task && task.blockedBy)
  if (names.length === 0) return ''
  return gcJoinNames(names)
}

function GcTaskCardMessage(props) {
  const message = props.message
  const t = props.t
  const payload = message.taskCard || {}
  const task = payload.task || {}
  const actor = payload.actor || message.sender || {}
  const actorName = gcStr(actor.name) || t('task.actorSystem')
  const actorKind = actor.kind === 'lead' || actor.kind === 'teammate' || actor.kind === 'subagent' ? actor.kind : 'lead'
  const actionLabel = gcTaskActionLabel(payload, t)
  const statusLabel = gcTaskStatusLabel(payload, t)
  const status = gcStr(task.status) || 'pending'
  const expanded = !!props.expanded
  const compact = !!payload.compact
  const description = gcStr(task.description)
  const requirements = gcStr(task.requirements || payload.requirements)
  const acceptance = gcStr(task.acceptance || payload.acceptance)
  const ownerRole = gcStr(task.ownerRole || payload.ownerRole)
  const ownerName = gcStr(task.ownerName) || gcStr(task.ownerId)
  const ownerText = ownerName || t('task.ownerUnassigned')
  const blockedBy = gcAsArray(task.blockedBy)
  const blockedText = blockedBy.length > 0 ? t('task.blockedByList', { list: gcJoinNames(blockedBy) }) : t('task.noBlockedBy')
  const timeText = gcMessageTimeText(payload.time || message.time)
  const taskId = gcStr(task.id) || gcStr(payload.id)

  // 默认折叠时只显示：目标（subject）/任务 ID/状态/负责人/依赖/完成时间
  const fields = [
    h(
      'div',
      { key: 'owner', className: 'gc-task-field', 'data-field': 'owner' },
      h('span', { className: 'gc-task-field-label' }, t('task.owner')),
      h(
        'span',
        { className: 'gc-task-field-value', 'data-owner-role': ownerRole || undefined },
        ownerText,
        ownerRole
          ? h('span', { className: 'gc-task-owner-role' }, ' · ' + ownerRole)
          : null
      )
    ),
    h(
      'div',
      { key: 'blocked', className: 'gc-task-field', 'data-field': 'blocked-by' },
      h('span', { className: 'gc-task-field-label' }, t('task.blockedBy')),
      h('span', { className: 'gc-task-field-value' }, blockedText)
    )
  ]
  if (status === 'completed') {
    fields.push(
      h(
        'div',
        { key: 'completion', className: 'gc-task-field', 'data-field': 'completion-time' },
        h('span', { className: 'gc-task-field-label' }, t('task.completionTime')),
        h('span', { className: 'gc-task-field-value' }, timeText)
      )
    )
  }

  const detailEntries = []
  if (description) detailEntries.push({ field: 'description', text: description })
  if (requirements) detailEntries.push({ field: 'requirements', text: requirements })
  if (acceptance) detailEntries.push({ field: 'acceptance', text: acceptance })
  const hasDetails = detailEntries.length > 0
  const detailNodes =
    expanded && hasDetails
      ? h(
          'div',
          { key: 'details', className: 'gc-task-details' },
          detailEntries.map(function (entry) {
            return h(
              'div',
              { key: entry.field, className: 'gc-task-detail-block', 'data-field': entry.field },
              h('span', { className: 'gc-task-detail-label' }, t('task.field.' + entry.field)),
              h('p', { className: 'gc-task-desc' }, entry.text)
            )
          })
        )
      : null

  const actions = []
  if (hasDetails) {
    actions.push(
      h(
        'button',
        {
          key: 'expand',
        type: 'button',
        className: 'gc-card-action',
        'data-action': 'expand-task',
        'data-state': 'enabled',
        'aria-expanded': expanded ? 'true' : 'false',
        disabled: !hasDetails,
        'aria-expanded': expanded ? 'true' : 'false',
        onClick: function (event) {
          event.preventDefault()
          if (hasDetails && props.onAction) props.onAction('expand-task')
        }
      },
        expanded ? t('task.collapse') : t('task.expand')
      )
    )
  }
  actions.push(
    h(GcRowActions, {
      key: 'icon-actions',
      t: t,
      onCopy: function () {
        if (props.onCopyMessage) props.onCopyMessage(message)
      },
      onOpen: function () {
        if (props.onOpenSession) props.onOpenSession(message)
      }
    })
  )

  const card = h(
    'div',
    {
      className: 'gc-card',
      'data-card': 'task',
      'data-card-accent': status,
      'data-compact': compact ? 'true' : 'false',
      'data-task-expanded': expanded ? 'true' : 'false', 'data-task-collapsed': expanded ? 'false' : 'true'
    },
    h(
      'div',
      { className: 'gc-task-head' },
      h('span', { className: 'gc-task-icon', 'aria-hidden': 'true' }, h(GcIconTasks, { size: 16 })),
      h('span', { className: 'gc-task-action' }, actionLabel),
      h(GcPill, { status: status, label: statusLabel }),
      h('span', { className: 'gc-task-id', title: taskId }, taskId)
    ),
    h('h3', { className: 'gc-task-title', title: gcStr(task.subject) }, gcStr(task.subject)),
    detailNodes,
    h('div', { className: 'gc-task-fields' }, fields),
    h('div', { className: 'gc-task-actions' }, actions)
  )

  const rowAttrs = {
    className: 'gc-card-row',
    'data-kind': 'task_card',
    'data-message-id': message.id,
    'data-card': 'task',
    'data-card-accent': status,
    'data-sender': actorName,
    'data-task-id': taskId,
    'data-task-revision': String(task.revision === undefined ? '' : task.revision),
    'data-task-action': gcStr(payload.action),
    'data-task-status': status,
    'data-task-owner': ownerName,
    'data-task-actor': actorName,
    'data-task-blocked-by': blockedBy.join(','),
    'data-replay': payload.replay ? 'true' : 'false',
    'data-task-expanded': expanded ? 'true' : 'false', 'data-task-collapsed': expanded ? 'false' : 'true',
    role: 'article',
    'aria-label': t('a11y.taskCard', { action: actionLabel, id: taskId })
  }

  // F35：人物一致 —— 外层 sender = 操作者（唯一头像 + 名字），卡内不再重复头像/名字
  return h(
    'div',
    rowAttrs,
    h(
      'span',
      { className: 'gc-card-avatar-wrap', 'data-card-avatar': 'true' },
      h(GcAvatar, { name: actorName, kind: actorKind, size: 32 })
    ),
    h(
      'div',
      { className: 'gc-row-main' },
      h(GcSenderLine, {
        t: t,
        sender: actor,
        name: actorName,
        kind: actorKind,
        roleLabel: gcRoleLabel(actorKind, t),
        time: timeText,
        card: true
      }),
      card
    )
  )
}

/* ── src/client/parts/50-feed.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 50-feed.part.js — 消息流（时间分隔 / 各类消息行 / 折叠 / 系统提示）
 *
 * 渲染映射见架构 §6.5，DOM 契约见 §6.5.2（data-testid / data-kind / data-*）。
 * 全部为纯函数组件（无 hooks），便于在 mini React harness 中直接断言。
 * ────────────────────────────────────────────────────────────────────────── */

function gcMentionSetFor(channel) {
  const set = new Set()
  const members = gcAsArray(channel && channel.members)
  for (let i = 0; i < members.length; i += 1) {
    if (members[i] && members[i].name) set.add(members[i].name)
  }
  if (channel && channel.lead && channel.lead.name) set.add(channel.lead.name)
  return set
}

function gcMessageAriaLabel(message, t, channel) {
  const sender = (message && message.sender) || {}
  const index = gcMemberIndex(channel)
  const member = index.bySessionId.get(sender.sessionId)
  const name = sender.name || (member && member.name) || 'unknown'
  return t('a11y.message', {
    sender: name,
    time: gcMessageTimeText((message && message.time) || Date.now()),
    kind: (message && message.kind) || 'message'
  })
}

/* ── 时间分隔 ─────────────────────────────────────────────────────────── */

function GcTimeDivider(props) {
  return h('div', { className: 'gc-time-divider', 'data-testid': 'group-chat-time-divider' }, props.text)
}

/* ── 系统提示 / 欢迎提示 ──────────────────────────────────────────────── */

function GcSystemNote(props) {
  return h(
    'div',
    {
      className: 'gc-system-note',
      'data-kind': 'system',
      'data-message-id': props.message.id,
      'data-system-variant': 'default',
      role: 'article'
    },
    props.text
  )
}

function GcWelcomeNote(props) {
  return h(
    'div',
    {
      className: 'gc-welcome-note',
      'data-kind': 'system',
      'data-message-id': props.message.id,
      'data-system-variant': 'welcome',
      role: 'article'
    },
    h('span', null, props.text),
    h('span', { className: 'gc-welcome-time' }, gcMessageTimeText(props.message.time))
  )
}

/* ── 气泡内富文本 + 折叠 ─────────────────────────────────────────────── */

function GcFoldableBody(props) {
  const decision = props.decision
  const expanded = !!props.expanded
  const body = h(
    'div',
    {
      className: decision.foldable ? 'gc-foldable' : 'gc-foldable-static',
      'data-expanded': decision.foldable ? (expanded ? 'true' : 'false') : undefined
    },
    props.children
  )
  if (!decision.foldable) return body
  return h(Fragment, null, body, h(GcFoldMeta, { t: props.t, decision: decision, expanded: expanded, onToggle: props.onToggle }))
}

/* ── 普通消息行（M1 / M2 / M3 / M5） ─────────────────────────────────── */

function gcRenderBubbleContent(props) {
  const message = props.message
  const t = props.t
  const children = []

  if (message.kind === 'agent_to_agent') {
    const targets = gcAsArray(message.targets)
    if (targets.length > 0) {
      const prefix = []
      for (let i = 0; i < targets.length; i += 1) {
        prefix.push(
          h(
            'span',
            {
              key: 'target-' + targets[i],
              className: 'gc-mention',
              'data-mention': targets[i],
              'data-clickable': props.onMention ? 'true' : 'false',
              role: props.onMention ? 'button' : undefined,
              tabIndex: props.onMention ? 0 : undefined,
              onClick: props.onMention
                ? function (event) {
                    event.stopPropagation()
                    props.onMention(targets[i])
                  }
                : undefined
            },
            '@' + targets[i]
          ),
          ' '
        )
      }
      children.push(h('p', { key: 'targets' }, prefix))
    }
  }

  children.push(
    h(GcMarkdown, {
      key: 'text',
      text: message.text,
      mentionSet: gcMentionSetFor(props.channel),
      onMention: props.onMention
    })
  )

  if (message.kind === 'delivery' || message.kind === 'agent_output') {
    const files = gcAsArray(message.files)
    for (let i = 0; i < files.length; i += 1) {
      children.push(
        h(
          'div',
          { key: 'file-' + i, className: 'gc-file-row' },
          h('span', { className: 'gc-file-name' }, gcStr(files[i] && files[i].name)),
          h('span', { className: 'gc-file-path' }, gcStr(files[i] && files[i].path)),
          h(
            'button',
            {
              type: 'button',
              className: 'gc-link',
              'data-action': 'open-file',
              onClick: function (event) {
                event.preventDefault()
                if (props.onOpenFile) props.onOpenFile(files[i])
              }
            },
            t('msg.file.open')
          )
        )
      )
    }
  }

  return children
}

function GcMessageRow(props) {
  const message = props.message
  const t = props.t
  const channel = props.channel
  const self = message.kind === 'user'
  const index = gcMemberIndex(channel)
  const sender = message.sender || {}
  const member = index.bySessionId.get(sender.sessionId)
  const senderKind = sender.kind || (member && member.kind) || 'teammate'
  const senderName = sender.name || (member && member.name) || 'unknown'
  const parentName = senderKind === 'subagent' ? gcParentNameOf(channel, message) : ''
  const foldDecision = gcFoldDecision(message.text, gcLimits())
  const foldedMap = (props.state && props.state.folded) || {}
  const expanded = foldedMap[message.id] ? true : !foldDecision.foldable
  const captionModel = gcCaptionModel(message, t)

  const bubble = h(
    GcBubble,
    { self: self, state: message.delivery || undefined, debug: gcSendDebugModel(message) },
    h(
      GcFoldableBody,
      {
        t: t,
        decision: foldDecision,
        expanded: expanded,
        onToggle: function () {
          if (props.onFold) props.onFold(message.id)
        }
      },
      gcRenderBubbleContent({
        message: message,
        t: t,
        channel: channel,
        onMention: props.onMention,
        onOpenFile: props.onOpenFile
      })
    )
  )

  const mainChildren = []

  if (!self) {
    mainChildren.push(
      h(GcSenderLine, {
        key: 'sender',
        t: t,
        sender: sender,
        name: senderName,
        kind: senderKind,
        parentName: parentName,
        statusText: gcStatusText((member && member.status) || 'unknown', t),
        statusState: (member && member.status) || 'unknown'
      })
    )
  }

  const sending = message.delivery === 'sending'
  const captionNode = captionModel
    ? h(GcCaption, {
        model: captionModel,
        onAction: function (action) {
          if (props.onCaptionAction) props.onCaptionAction(message, action)
        }
      })
    : null
  mainChildren.push(
    h(
      'div',
      { key: 'bubblewrap', className: 'gc-bubble-wrap', 'data-sending': sending ? 'true' : 'false' },
      sending ? captionNode : bubble,
      sending ? bubble : captionNode
    )
  )

  mainChildren.push(
    h(GcRowActions, {
      key: 'actions',
      t: t,
      onCopy: function () {
        if (props.onCopyMessage) props.onCopyMessage(message)
      },
      onOpen: props.onOpenSession
        ? function () {
            props.onOpenSession(message)
          }
        : null
    })
  )

  const children = []
  if (!self) {
    children.push(h(GcAvatar, { key: 'avatar', name: senderName, kind: senderKind, size: 32 }))
  }
  children.push(h('div', { key: 'main', className: 'gc-row-main' }, mainChildren))

  return h(
    GcRowShell,
    {
      self: self,
      tight: props.tight,
      kind: message.kind,
      messageId: message.id,
      status: message.delivery || undefined,
      memberKind: senderKind === 'subagent' ? 'subagent' : undefined,
      parent: parentName || undefined,
      ariaLabel: gcMessageAriaLabel(message, t, channel)
    },
    children
  )
}

/* ── 行分发 ───────────────────────────────────────────────────────────── */

function gcWelcomeText(message, t) {
  const payload = (message && message.memberCard && message.memberCard.member) || null
  const name = payload && payload.name ? payload.name : ''
  if (name) return t('member.welcome', { name: name })
  return gcStr(message && message.text)
}

function GcFeedItem(props) {
  const message = props.message
  if (gcIsContextNoise(message) || gcIsSettledNotice(message)) return null
  if (gcIsEmptyAgentMessage(message)) return null
  if (message.kind === 'system') {
    const isWelcome =
      message.systemReason === 'member-welcome' || (message.meta && message.meta.systemVariant === 'welcome')
    if (isWelcome) return h(GcWelcomeNote, { message: message, text: gcWelcomeText(message, props.t) })
    const interrupted = message.meta && message.meta.event === 'turn-interrupted'
    const text = interrupted ? props.t('system.turnInterrupted') : gcStr(message.text)
    if (!interrupted && text.trim() === '') return null
    return h(GcSystemNote, { message: message, text: text })
  }
  if (message.kind === 'member_card') {
    return h(GcMemberJoinMessage, {
      message: message,
      t: props.t,
      expanded: !!(props.state && props.state.expandedCards && props.state.expandedCards[message.id]),
      onAction: function (action) {
        if (props.onCardAction) props.onCardAction(message, action)
      }
    })
  }
  if (message.kind === 'task_card') {
    return h(GcTaskCardMessage, {
      message: message,
      t: props.t,
      expanded: !!(props.state && props.state.expandedCards && props.state.expandedCards[message.id]),
      onAction: function (action) {
        if (props.onCardAction) props.onCardAction(message, action)
      },
      onCopyMessage: props.onCopyMessage,
      onOpenSession: props.onOpenSession
    })
  }
  return h(GcMessageRow, props)
}

/* ── 消息流容器 ───────────────────────────────────────────────────────── */

function GcFeedBody(props) {
  const state = props.state
  const t = props.t
  const channel = state.channel
  const items = props.items
  const nodes = []

  if (state.loadingOlder) {
    nodes.push(h('div', { key: 'loading', className: 'gc-feed-top' }, t('history.loadingOlder')))
  } else if (state.reachedOldest && items.length > 0) {
    nodes.push(h('div', { key: 'earliest', className: 'gc-feed-top' }, t('history.earliest')))
  }

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (item.type === 'divider') {
      nodes.push(h(GcTimeDivider, { key: item.id, text: item.text }))
      continue
    }
    nodes.push(
      h(GcFeedItem, {
        key: item.id,
        message: item.message,
        tight: item.tight,
        t: t,
        channel: channel,
        state: state,
        onFold: props.onFold,
        onMention: props.onMention,
        onCopyMessage: props.onCopyMessage,
        onOpenSession: props.onOpenSession,
        onOpenFile: props.onOpenFile,
        onOpenTrajectory: props.onOpenTrajectory,
        onCaptionAction: props.onCaptionAction,
        onCardAction: props.onCardAction,
        onCopyTaskId: props.onCopyTaskId
      })
    )
  }
  return h(Fragment, null, nodes)
}

function GcFeed(props) {
  const state = props.state
  const t = props.t
  const nodes = []

  if (state.phase === 'loading' && gcAsArray(state.messages).length === 0) {
    nodes.push(h(GcSkeleton, { key: 'skeleton', t: t }))
  } else if (state.phase === 'error' && gcAsArray(state.messages).length === 0) {
    nodes.push(h(GcErrorState, { key: 'error', t: t, error: state.error, onRetry: props.onRetryOpen }))
  } else if (props.emptyKind === 'no-team') {
    nodes.push(h(GcEmptyNoTeam, { key: 'empty-team', t: t, onOpenChat: props.onOpenChat }))
  } else if (props.items.length === 0 && !state.filter) {
    nodes.push(h(GcEmptyTeam, { key: 'empty', t: t }))
  } else {
    nodes.push(h(GcFeedBody, Object.assign({ key: 'body' }, props)))
  }

  const ariaText = gcAsArray(state.messages).length > 0 ? gcSrSummary(state.messages, t) : ''

  return h(
    'div',
    {
      className: 'gc-scroll',
      ref: props.scrollRef,
      onScroll: props.onScroll,
      'data-testid': 'group-chat-feed',
      role: 'log',
      'aria-live': 'polite',
      'aria-relevant': 'additions',
      'aria-label': t('a11y.feed'),
      tabIndex: 0
    },
    h('div', { className: 'gc-feed' }, h('div', { className: 'gc-col' }, nodes)),
    h('div', { className: 'gc-sr-only' }, ariaText)
  )
}

/** 读屏摘要：仅最近一条（不逐 token 播报，§6.10）。 */
function gcSrSummary(messages, t) {
  const list = gcAsArray(messages)
  const last = list[list.length - 1]
  if (!last) return ''
  const sender = gcStr(last.sender && last.sender.name) || 'unknown'
  const text = gcClip(gcStr(last.text), 80)
  if (last.kind === 'system') return text
  return sender + ': ' + text
}

/** 行内 @ 点击 → 筛选成员（UX Q6，二次点击打开会话由菜单承担）。 */
function gcMentionClickTarget(name) {
  return name
}

/* ── src/client/parts/60-header.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 60-header.part.js — 频道头 / 提示条 / 筛选菜单
 *
 * 频道头 56px：群头像（2×2 拼贴）+「群聊」+ 竖线 + 团队名 + 状态行 + 筛选按钮；
 * 无团队（单 agent 会话，D-C）时不显示成员状态行与筛选按钮。
 * ────────────────────────────────────────────────────────────────────────── */

function gcRunningCount(channel) {
  if (!channel) return 0
  if (typeof channel.runningCount === 'number') return channel.runningCount
  const members = gcAsArray(channel.members)
  let count = 0
  for (let i = 0; i < members.length; i += 1) {
    if (members[i] && members[i].status === 'running') count += 1
  }
  return count
}

function gcMemberCount(channel) {
  const members = gcAsArray(channel && channel.members)
  if (members.length > 0) return members.length
  return channel && channel.lead ? 1 : 0
}

function gcIsSingleAgent(channel) {
  if (!channel) return true
  if (channel.singleAgent === true) return true
  if (channel.degraded === 'lead-only') return true
  const members = gcAsArray(channel.members)
  return members.length <= 1
}

function GcGroupAvatar(props) {
  return h(
    'span',
    { className: 'gc-group-avatar', 'aria-hidden': 'true' },
    h('i', { 'data-slot': '0' }),
    h('i', { 'data-slot': '1' }),
    h('i', { 'data-slot': '2' }),
    h('i', { 'data-slot': '3' })
  )
}

function GcChannelHeader(props) {
  const t = props.t
  const channel = props.channel
  const singleAgent = gcIsSingleAgent(channel)
  const teamName = gcStr(channel && (channel.teamName || (channel.lead && (channel.lead.displayName || channel.lead.name))))

  const statusChildren = []
  if (!singleAgent) {
    const statusModel = gcMembersStatusModel(channel)
    statusChildren.push(h(GcStatusDot, { key: 'dot', state: statusModel.working > 0 ? 'running' : 'inactive' }))
    statusChildren.push(
      h(
        'span',
        { key: 'text' },
        t('channel.membersStatus', {
          n: statusModel.total,
          m: statusModel.working,
          k: statusModel.waiting
        })
      )
    )
  }
  if (props.readonly) {
    statusChildren.push(h('span', { key: 'ro', className: 'gc-status-suffix' }, t('readonly.suffix')))
  }
  if (props.filter) {
    statusChildren.push(
      h('span', { key: 'filter', className: 'gc-status-suffix' }, t('filter.suffix', { name: props.filter }))
    )
  }
  if (props.unread > 0) {
    statusChildren.push(
      h(
        'button',
        {
          key: 'newmessages',
          type: 'button',
          className: 'gc-newmessages-hint',
          'data-testid': 'group-chat-newmessages-hint',
          'data-count': String(props.unread),
          onClick: function (event) {
            event.preventDefault()
            if (props.onJumpLatest) props.onJumpLatest()
          }
        },
        t('channel.newMessages', { n: props.unread })
      )
    )
  }

  const titleRow = [h('span', { key: 'title', className: 'gc-header-title' }, t('channel.title'))]
  if (teamName) {
    titleRow.push(h('span', { key: 'divider', className: 'gc-header-divider' }))
    titleRow.push(h('span', { key: 'team', className: 'gc-header-team', title: teamName }, teamName))
  }

  if (!singleAgent && props.onOpenTrajectory) {
    const strip = gcMemberStripData(channel)
    if (strip.visible.length > 0) {
      const stripNodes = strip.visible.map(function (member) {
        const state = gcMemberWorkStatus(member)
        return h(
          'button',
          {
            key: 'member-' + (member.sessionId || member.name),
            type: 'button',
            className: 'gc-member-strip-item',
            'data-testid': 'group-chat-member-strip-item',
            'data-member-id': gcStr(member.sessionId),
            'data-member-state': state,
            'data-action': 'open-trajectory',
            'data-member-name': gcStr(member.name),
            title: member.name + ' · ' + t('member.status.' + state),
            'aria-label': t('member.trajectoryAria', { name: member.name, status: t('member.status.' + state) }),
            onClick: function (event) {
              event.preventDefault()
              props.onOpenTrajectory(member)
            },
            onFocus: function (event) {
              try {
                if (event && event.currentTarget && typeof event.currentTarget.scrollIntoView === 'function') {
                  event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })
                }
              } catch {}
            }
          },
          h(GcAvatar, { name: member.name, kind: member.kind, size: 26 }),
          h('span', { className: 'gc-member-name' }, member.name),
          h('span', { className: 'gc-member-status-dot', 'data-state': state, 'aria-hidden': 'true' })
        )
      })
      titleRow.push(
        h(
          'div',
          {
            key: 'member-strip',
            className: 'gc-member-strip',
            'data-testid': 'group-chat-member-strip'
          },
          stripNodes
        )
      )
    }
  }

  const mainChildren = [h('div', { key: 'row1', className: 'gc-header-row' }, titleRow)]
  if (statusChildren.length > 0) {
    mainChildren.push(h('div', { key: 'row2', className: 'gc-header-status' }, statusChildren))
  }

  const children = [
    h(GcGroupAvatar, { key: 'avatar' }),
    h('div', { key: 'main', className: 'gc-header-main' }, mainChildren)
  ]

  if (channel && channel.truncated && channel.truncated.omittedSubagents > 0) {
    children.push(
      h(
        'span',
        {
          key: 'truncated',
          className: 'gc-truncation-hint',
          'data-testid': 'group-chat-truncation-hint'
        },
        t('channel.omittedSubagents', { n: channel.truncated.omittedSubagents })
      )
    )
  }

  children.push(h('span', { key: 'spacer', className: 'gc-spacer' }))

  if (!singleAgent) {
    children.push(
      h(
        'button',
        {
          key: 'filter',
          type: 'button',
          className: 'gc-icon-btn',
          'data-testid': 'group-chat-filter-button',
          'aria-label': t('filter.button'),
          'aria-haspopup': 'menu',
          'aria-expanded': props.filterOpen ? 'true' : 'false',
          onClick: function (event) {
            event.preventDefault()
            if (props.onToggleFilter) props.onToggleFilter()
          }
        },
        h(GcIconFilter, { size: 14 })
      )
    )
  }

  return h(
    'div',
    {
      className: 'gc-header',
      'data-testid': 'group-chat-header',
      'data-single-agent': singleAgent ? 'true' : 'false'
    },
    children
  )
}

/* ── 筛选菜单（单选成员） ─────────────────────────────────────────────── */

function gcFilterMenuMembers(channel) {
  const index = gcMemberIndex(channel)
  const out = []
  const lead = channel && channel.lead
  if (lead) out.push(lead)
  for (let i = 0; i < index.members.length; i += 1) {
    const member = index.members[i]
    if (member && member.kind !== 'lead' && member.name) out.push(member)
  }
  return out
}

function GcFilterMenu(props) {
  const t = props.t
  const members = gcFilterMenuMembers(props.channel)
  const items = []
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i]
    const sub = member.kind === 'subagent' ? t('mention.sub.subagent') : member.kind === 'lead' ? t('mention.sub.lead') : t('mention.sub.teammate')
    items.push(
      h(
        'button',
        {
          key: 'filter-' + member.name,
          type: 'button',
          className: 'gc-filter-item',
          'data-mention': member.name,
          'data-active': props.filter === member.name ? 'true' : 'false',
          role: 'menuitemradio',
          'aria-checked': props.filter === member.name ? 'true' : 'false',
          onClick: function (event) {
            event.preventDefault()
            if (props.onSelect) props.onSelect(member.name)
          }
        },
        h(GcAvatar, { name: member.name, kind: member.kind, size: 26 }),
        h(
          'span',
          { className: 'gc-filter-item-main' },
          member.name,
          h('span', { className: 'gc-filter-item-sub' }, ' ' + sub)
        )
      )
    )
  }
  if (items.length === 0) {
    items.push(h('div', { key: 'empty', className: 'gc-mention-empty' }, t('filter.empty')))
  }
  return h(
    'div',
    {
      className: 'gc-filter-menu',
      role: 'menu',
      'data-testid': 'group-chat-filter-menu',
      'aria-label': t('filter.button')
    },
    items
  )
}

/* ── 提示条 ───────────────────────────────────────────────────────────── */

function GcBanners(props) {
  const t = props.t
  const state = props.state
  const channel = state.channel
  const nodes = []

  if (channel && channel.readonly) {
    nodes.push(
      h(
        'div',
        {
          key: 'readonly',
          className: 'gc-banner',
          'data-testid': 'group-chat-readonly-banner',
          'data-tone': 'readonly',
          role: 'status'
        },
        t('readonly.banner')
      )
    )
  }

  if (state.filter) {
    nodes.push(
      h(
        'div',
        {
          key: 'filter',
          className: 'gc-banner',
          'data-testid': 'group-chat-filter-banner',
          'data-filter': state.filter,
          'data-tone': 'filter',
          role: 'status'
        },
        h('span', null, t('filter.active', { name: state.filter, n: props.filterCount || 0 })),
        h(
          'button',
          {
            type: 'button',
            className: 'gc-link gc-banner-action',
            'data-action': 'clear-filter',
            onClick: function (event) {
              event.preventDefault()
              if (props.onClearFilter) props.onClearFilter()
            }
          },
          t('filter.clear')
        )
      )
    )
  }

  if (state.connection === 'paused') {
    nodes.push(
      h(
        'div',
        {
          key: 'reconnect',
          className: 'gc-banner',
          'data-testid': 'group-chat-reconnect-banner',
          'data-tone': 'error',
          role: 'alert'
        },
        h('span', null, t('error.reconnect')),
        h(
          'button',
          {
            type: 'button',
            className: 'gc-link gc-banner-action',
            'data-action': 'reconnect',
            onClick: function (event) {
              event.preventDefault()
              if (props.onReconnect) props.onReconnect()
            }
          },
          t('error.reconnectAction')
        )
      )
    )
  }

  if (nodes.length === 0) return null
  return h('div', { className: 'gc-banners' }, h('div', { className: 'gc-col' }, nodes))
}

/* ── src/client/parts/65-trajectory.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 65-trajectory.part.js — 轮次轨迹侧栏（F26 / §6.15.2）
 *
 * 右侧 380px 抽屉（窄屏全屏），只读；数据来自该成员会话事件窗口经 core/turns
 * 聚合（缺失时按该成员 agent_output 降级），不修改消息流、不新增订阅。
 * DOM 契约：agent-trajectory-panel / agent-trajectory-overlay /
 * data-action=close-trajectory / agent-trajectory-turn[data-turn-index][data-turn-status] /
 * agent-trajectory-load-older。
 * ────────────────────────────────────────────────────────────────────────── */

const GC_TRAJECTORY_STATUS_KEY = {
  done: 'trajectory.status.done',
  aborted: 'trajectory.status.aborted',
  error: 'trajectory.status.error',
  truncated: 'trajectory.status.truncated',
  running: 'trajectory.status.running',
  unknown: 'trajectory.status.unknown'
}

function gcTrajectoryStatusText(status, t) {
  const key = GC_TRAJECTORY_STATUS_KEY[status] || 'trajectory.status.unknown'
  return t(key)
}

function gcTrajectoryTime(turn) {
  const ts = typeof turn.startedAt === 'number' ? turn.startedAt : turn.time
  if (typeof ts !== 'number') return ''
  return gcMessageTimeText(ts)
}

function GcTrajectoryTurn(props) {
  const turn = props.turn || {}
  const t = props.t
  const status = gcStr(turn.status) || 'unknown'
  const summary = gcStr(turn.summary)
  const toolCount = typeof turn.toolCount === 'number' ? turn.toolCount : 0
  return h(
    'div',
    {
      className: 'gc-trajectory-turn',
      'data-testid': 'agent-trajectory-turn',
      'data-turn-index': String(turn.index === undefined ? '' : turn.index),
      'data-turn-status': status
    },
    h(
      'div',
      { className: 'gc-trajectory-turn-head' },
      h('span', null, gcTrajectoryTime(turn)),
      h('span', null, '#' + String(turn.index === undefined ? '' : turn.index)),
      h('span', { className: 'gc-trajectory-turn-status', 'data-status': status }, gcTrajectoryStatusText(status, t))
    ),
    h(
      'div',
      { className: 'gc-trajectory-turn-summary' },
      summary || t('trajectory.noOutput')
    ),
    toolCount > 0 ? h('div', { className: 'gc-trajectory-turn-tools' }, t('trajectory.toolCount', { n: toolCount })) : null
  )
}

function GcTrajectoryPanel(props) {
  const t = props.t
  const member = props.member || {}
  const turns = gcAsArray(props.turns)
  const overlay = h('div', {
    key: 'overlay',
    className: 'gc-trajectory-overlay',
    'data-testid': 'agent-trajectory-overlay',
    onClick: function (event) {
      event.preventDefault()
      if (props.onClose) props.onClose()
    }
  })
  const body = h(
    'aside',
    {
      className: 'gc-trajectory-panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': t('trajectory.title'),
      'data-testid': 'agent-trajectory-panel',
      'data-member-id': gcStr(member.sessionId)
    },
    h(
      'div',
      { className: 'gc-trajectory-head' },
      h(GcAvatar, { name: member.name, kind: member.kind, size: 32 }),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
        h('span', { className: 'gc-trajectory-title' }, t('trajectory.title')),
        h('span', { className: 'gc-trajectory-agent' }, gcStr(member.name)),
        h(
          'span',
          { className: 'gc-trajectory-meta' },
          [
            t('member.status.' + gcMemberWorkStatus(member)),
            gcStr(member.model)
          ]
            .filter(Boolean)
            .join(' · ')
        )
      ),
      h('span', { className: 'gc-spacer' }),
      h(
        'button',
        {
          type: 'button',
          className: 'gc-icon-btn',
          'data-action': 'close-trajectory',
          'aria-label': t('trajectory.close'),
          title: t('trajectory.close'),
          onClick: function (event) {
            event.preventDefault()
            if (props.onClose) props.onClose()
          }
        },
        h(GcIconClose, { size: 14 })
      )
    ),
    h(
      'div',
      { className: 'gc-trajectory-list' },
      turns.length === 0
        ? h('div', { className: 'gc-empty-desc', style: { padding: '24px 8px', textAlign: 'center' } }, t('trajectory.empty'))
        : turns.map(function (turn, index) {
            return h(GcTrajectoryTurn, { key: 'turn-' + (turn.index ?? index), turn: turn, t: t })
          })
    ),
    props.hasOlder
      ? h(
          'div',
          { className: 'gc-trajectory-foot' },
          h(
            'button',
            {
              type: 'button',
              className: 'gc-link',
              'data-testid': 'agent-trajectory-load-older',
              onClick: function (event) {
                event.preventDefault()
                if (props.onLoadOlder) props.onLoadOlder()
              }
            },
            t('trajectory.loadOlder')
          )
        )
      : null
  )
  return h(Fragment, null, overlay, body)
}

/* ── src/client/parts/70-composer.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 70-composer.part.js — 输入区（目标行 / 文本输入 / @ 补全 / 发送键）
 *
 * v1 极简（UX PI-19）：只有「发给谁 + 说什么 + 发送」，不含附件/权限/模型控件。
 * 键盘：Enter 发送、Shift+Enter 换行；补全打开时 ↑↓ 移动、Enter/Tab 确认、Esc 关闭；
 * IME 组合输入期间不拦截按键（compositionstart/end）。
 * ────────────────────────────────────────────────────────────────────────── */

function gcTargetChipNames(draft, channel, sessionId) {
  const resolved = gcResolveTargets(draft, channel, sessionId)
  return resolved.targets.map(function (target) {
    return target.name
  })
}

function GcMentionPopup(props) {
  const t = props.t
  const options = gcAsArray(props.candidates)
  const active = typeof props.activeIndex === 'number' ? props.activeIndex : 0
  const nodes = []
  if (options.length === 0) {
    nodes.push(h('div', { key: 'empty', className: 'gc-mention-empty' }, t('mention.empty')))
  } else {
    for (let i = 0; i < options.length; i += 1) {
      const member = options[i]
      const description = gcStr(member.description) || t('member.noDesc')
      nodes.push(
        h(
          'li',
          {
            key: 'option-' + member.name,
            id: 'gc-mention-option-' + i,
            className: 'gc-mention-option',
            role: 'option',
            'data-mention': member.name,
            'data-member-id': gcStr(member.sessionId),
            'aria-selected': i === active ? 'true' : 'false',
            onClick: function (event) {
              event.preventDefault()
              if (props.onSelect) props.onSelect(member.name)
            },
            onMouseEnter: function () {
              if (props.onHover) props.onHover(i)
            }
          },
          h(GcAvatar, { name: member.name, kind: member.kind, size: 24 }),
          h(
            'span',
            { className: 'gc-mention-option-main' },
            h('span', { className: 'gc-mention-option-name' }, member.name),
            h('span', { className: 'gc-mention-option-sub' }, description)
          )
        )
      )
    }
  }
  return h(
    'div',
    {
      className: 'gc-mention-popup',
      'data-testid': 'group-chat-mention-popup',
      role: 'listbox',
      id: 'gc-mention-listbox',
      'aria-label': t('a11y.mention'),
      'aria-activedescendant': options.length > 0 ? 'gc-mention-option-' + active : undefined
    },
    h(
      'div',
      { className: 'gc-mention-head' },
      h('span', null, t('mention.header')),
      h('span', { className: 'gc-spacer' }),
      h('span', null, t('mention.hint'))
    ),
    h('ul', { className: 'gc-mention-list' }, nodes),
    h('div', { className: 'gc-mention-foot' }, t('mention.footer'))
  )
}

function GcTargetRow(props) {
  const t = props.t
  const draft = props.draft
  const channel = props.channel
  const names = gcTargetChipNames(draft, channel, props.sessionId)
  const mentions = gcAsArray(draft.mentions)
  const children = []

  // 默认 @Lead（business 实底白字）
  children.push(
    h(
      'span',
      {
        key: 'lead',
        className: 'gc-chip',
        'data-tone': 'target',
        'data-target': 'lead'
      },
      '@' + t('composer.leadChip')
    )
  )

  for (let i = 0; i < mentions.length; i += 1) {
    const name = mentions[i]
    children.push(
      h(
        'button',
        {
          key: 'mention-' + name,
          type: 'button',
          className: 'gc-chip',
          'data-tone': 'mention',
          'data-target': name,
          'data-mention': name,
          title: t('composer.removeMention', { name: name }),
          'aria-label': t('composer.removeMention', { name: name }),
          onClick: function (event) {
            event.preventDefault()
            if (props.onRemoveMention) props.onRemoveMention(name)
          }
        },
        '@' + name,
        h('span', { className: 'gc-chip-x', 'aria-hidden': 'true' }, '×')
      )
    )
  }

  return h(
    'div',
    {
      className: 'gc-target-row',
      'data-testid': 'group-chat-target-row',
      'data-targets': names.join(',')
    },
    h(
      'div',
      {
        className: 'gc-target-chips',
        'data-testid': 'group-chat-target-chips'
      },
      children
    )
  )
}

function GcComposer(props) {
  const t = props.t
  const state = props.state
  const draft = state.draft || { text: '', mentions: [] }
  const readonly = !!props.readonly
  const mention = state.mention
  const busy = !!(state.send && state.send.inFlight)
  const canSend = !readonly && !busy && gcStr(draft.text).trim() !== ''
  const placeholder = readonly ? t('readonly.placeholder') : t('composer.placeholder')

  const popup = mention
    ? h(GcMentionPopup, {
        t: t,
        candidates: props.candidates,
        activeIndex: state.mentionIndex || 0,
        onSelect: props.onSelectMention,
        onHover: props.onHoverMention
      })
    : null

  function handleKeyDown(event) {
    const composition = props.compositionRef && props.compositionRef.current
    if (composition) return
    if (mention && event.key === 'Escape') {
      event.preventDefault()
      if (props.onCloseMention) props.onCloseMention()
      return
    }
    if (mention && props.candidates && props.candidates.length > 0) {
      const count = props.candidates.length
      const active = state.mentionIndex || 0
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (props.onMoveMention) props.onMoveMention((active + 1) % count)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (props.onMoveMention) props.onMoveMention((active - 1 + count) % count)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        if (props.onSelectMention) props.onSelectMention(props.candidates[active] && props.candidates[active].name)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        if (props.onCloseMention) props.onCloseMention()
        return
      }
    }
    if (event.key === 'Escape' && state.filterOpen && props.onCloseFilter) {
      event.preventDefault()
      props.onCloseFilter()
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend && props.onSend) props.onSend()
    }
  }

  function handleChange(event) {
    const value = event.target.value
    const caret = typeof event.target.selectionStart === 'number' ? event.target.selectionStart : value.length
    if (props.onTextChange) props.onTextChange(value, caret)
  }

  return h(
    'div',
    { className: 'gc-composer-area' },
    h(
      'div',
      {
        className: 'gc-composer',
        'data-testid': 'group-chat-composer',
        'data-focused': state.composerFocused ? 'true' : 'false',
        'data-readonly': readonly ? 'true' : 'false',
        'aria-disabled': readonly ? 'true' : undefined
      },
      popup,
      h(
        'div',
        { className: 'gc-input-row' },
        h('textarea', {
          className: 'gc-textarea',
          value: draft.text,
          placeholder: placeholder,
          rows: 1,
          'aria-label': t('a11y.send'),
          'aria-expanded': mention ? 'true' : 'false',
          'aria-controls': mention ? 'gc-mention-listbox' : undefined,
          role: 'combobox',
          'aria-autocomplete': 'list',
          disabled: readonly,
          onChange: handleChange,
          onKeyDown: handleKeyDown,
          onFocus: function () {
            if (props.onFocusChange) props.onFocusChange(true)
          },
          onBlur: function () {
            if (props.onFocusChange) props.onFocusChange(false)
          },
          onCompositionStart: function () {
            if (props.compositionRef) props.compositionRef.current = true
          },
          onCompositionEnd: function (event) {
            if (props.compositionRef) props.compositionRef.current = false
            if (props.onTextChange) props.onTextChange(event.target.value, event.target.selectionStart)
          },
          onClick: function (event) {
            if (props.onCaretChange) props.onCaretChange(event.target.selectionStart)
          }
        }),
        h(
          'button',
          {
            type: 'button',
            className: 'gc-send-btn',
            'data-testid': 'group-chat-send',
            'aria-label': t('composer.send'),
            disabled: !canSend,
            'aria-busy': busy ? 'true' : 'false',
            onClick: function (event) {
              event.preventDefault()
              if (canSend && props.onSend) props.onSend()
            }
          },
          h(GcIconSend, { size: 16 })
        )
      ),
      h(GcTargetRow, {
        t: t,
        draft: draft,
        channel: props.channel,
        sessionId: props.sessionId,
        onRemoveMention: props.onRemoveMention
      }),
      h('div', { className: 'gc-composer-hint', 'data-testid': 'group-chat-composer-hint' }, t('composer.hint'))
    )
  )
}

/* ── src/client/parts/80-states.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 80-states.part.js — 骨架 / 空态 / 错误态 / 筛选空态 / 未读浮标
 * ────────────────────────────────────────────────────────────────────────── */

function GcSkeleton(props) {
  const t = props && props.t ? props.t : gcTranslate
  const rows = []
  const widths = [
    [122, 92, 176],
    [96, 148, 120],
    [140, 110, 160],
    [88, 132, 148],
    [116, 100, 138]
  ]
  for (let i = 0; i < 5; i += 1) {
    const group = widths[i]
    rows.push(
      h(
        'div',
        { key: 'skeleton-' + i, className: 'gc-row', 'data-testid': 'group-chat-skeleton' },
        h('span', { className: 'gc-skeleton-avatar' }),
        h(
          'div',
          { className: 'gc-skeleton-body' },
          h('div', { className: 'gc-skeleton-bar', style: { width: group[0] + 'px' } }),
          h('div', { className: 'gc-skeleton-bar', style: { width: group[1] + 'px' } }),
          h('div', { className: 'gc-skeleton-bar', style: { width: group[2] + 'px' } })
        )
      )
    )
  }
  return h(
    'div',
    { className: 'gc-skeleton', role: 'status', 'aria-label': t('a11y.feed'), 'aria-busy': 'true' },
    h('div', { className: 'gc-col' }, rows)
  )
}

function GcEmptyNoTeam(props) {
  const t = props.t
  return h(
    'div',
    { className: 'gc-center-state', 'data-testid': 'group-chat-empty-no-team' },
    h('div', { className: 'gc-empty-icon', 'aria-hidden': 'true' }, h(GcIconAt, { size: 20 })),
    h('div', { className: 'gc-empty-title' }, t('empty.noTeam')),
    h('div', { className: 'gc-empty-desc' }, t('empty.noTeamDesc')),
    props.onOpenChat
      ? h(
          'button',
          {
            type: 'button',
            className: 'gc-empty-action',
            'data-action': 'how-to-team',
            onClick: function (event) {
              event.preventDefault()
              props.onOpenChat()
            }
          },
          t('empty.howToTeam')
        )
      : null
  )
}

function GcEmptyTeam(props) {
  const t = props.t
  return h(
    'div',
    { className: 'gc-center-state', 'data-testid': 'group-chat-empty' },
    h('div', { className: 'gc-empty-icon', 'aria-hidden': 'true' }, h(GcIconAt, { size: 20 })),
    h('div', { className: 'gc-empty-title' }, t('empty.team')),
    h('div', { className: 'gc-empty-desc' }, t('empty.teamDesc'))
  )
}

function GcErrorState(props) {
  const t = props.t
  const error = props.error || {}
  const retryable = error.retryable !== false
  const message =
    error.code === 'no-source'
      ? t('error.source')
      : gcStr(error.message)
        ? t('error.load') + '（' + gcStr(error.message) + '）'
        : t('error.load')
  const children = [h('span', { key: 'text' }, message)]
  if (error.code === 'no-source') {
    children.push(h('span', { key: 'hint', className: 'gc-empty-desc' }, t('error.sourceHint')))
  }
  if (retryable && props.onRetry) {
    children.push(
      h(
        'button',
        {
          key: 'retry',
          type: 'button',
          className: 'gc-link',
          'data-action': 'retry-load',
          onClick: function (event) {
            event.preventDefault()
            props.onRetry()
          }
        },
        t('error.retry')
      )
    )
  }
  return h(
    'div',
    { className: 'gc-center-state' },
    h(
      'div',
      {
        className: 'gc-error-card',
        'data-testid': 'group-chat-error',
        'data-retryable': retryable ? 'true' : 'false',
        'data-tone': 'error',
        role: 'alert'
      },
      children
    )
  )
}

function GcFilterEmpty(props) {
  const t = props.t
  return h(
    'div',
    { className: 'gc-center-state', 'data-testid': 'group-chat-filter-empty' },
    h('div', { className: 'gc-empty-desc' }, t('filter.empty'))
  )
}

function GcUnreadPill(props) {
  const t = props.t
  const count = props.count || 0
  if (count <= 0) return null
  return h(
    'button',
    {
      type: 'button',
      className: 'gc-unread-pill',
      'data-testid': 'group-chat-unread-pill',
      'data-count': String(count),
      'aria-label': t('a11y.unread'),
      onClick: function (event) {
        event.preventDefault()
        if (props.onJumpLatest) props.onJumpLatest()
      }
    },
    h('span', { className: 'gc-dot', 'data-state': 'running' }),
    t('unread.jump', { n: count })
  )
}

/* ── src/client/parts/85-preview.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 85-preview.part.js — 预览数据源（`?gc-preview=1`，仅开发/视觉对照）
 *
 * 用内置 fixture 直接渲染 P1–P12 的全部消息形态（含入群卡、任务卡、四态），
 * 不依赖 src/adapters，也不依赖真实会话。生产路径见 gcCreateChannelSource。
 * ────────────────────────────────────────────────────────────────────────── */

const GC_PREVIEW_LEAD_ID = 'preview-lead-session'

function gcPreviewMembers() {
  return [
    {
      sessionId: GC_PREVIEW_LEAD_ID,
      name: 'lead',
      displayName: 'Lead',
      kind: 'lead',
      depth: 0,
      status: 'running',
      addressable: true,
      model: 'deepseek-flash'
    },
    {
      sessionId: 'preview-scout',
      name: 'scout',
      displayName: 'scout',
      kind: 'teammate',
      depth: 1,
      parentSessionId: GC_PREVIEW_LEAD_ID,
      status: 'running',
      addressable: true,
      description: '负责接口取证与技术可行性，产出 docs/research 下的调研结论。'
    },
    {
      sessionId: 'preview-ux',
      name: 'ux',
      displayName: 'ux',
      kind: 'teammate',
      depth: 1,
      parentSessionId: GC_PREVIEW_LEAD_ID,
      status: 'inactive',
      addressable: true,
      description: '交互规格与高保真原型。'
    },
    {
      sessionId: 'preview-backend',
      name: 'backend',
      displayName: 'backend',
      kind: 'teammate',
      depth: 1,
      parentSessionId: GC_PREVIEW_LEAD_ID,
      status: 'running',
      addressable: true
    },
    {
      sessionId: 'preview-pm',
      name: 'pm',
      displayName: 'pm',
      kind: 'teammate',
      depth: 1,
      parentSessionId: GC_PREVIEW_LEAD_ID,
      status: 'inactive',
      addressable: true
    },
    {
      sessionId: 'preview-sub-1',
      name: '产品设计',
      displayName: '产品设计 · ux 的子体',
      kind: 'subagent',
      depth: 2,
      parentSessionId: 'preview-ux',
      parentName: 'ux',
      status: 'running',
      addressable: true
    }
  ]
}

function gcPreviewWelcomeMessage(time) {
  return {
    id: 'preview:welcome:scout',
    kind: 'system',
    sessionId: GC_PREVIEW_LEAD_ID,
    sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'lead', kind: 'system' },
    targets: [],
    targetSessionIds: [],
    text: '欢迎 @scout 加入群聊',
    time: time,
    seq: 1,
    isFinal: true,
    systemReason: 'member-welcome',
    creationId: 'mc:preview-scout',
    pairOrder: 0
  }
}

function gcPreviewMemberCard(time) {
  return {
    id: 'mc:preview-scout',
    kind: 'member_card',
    sessionId: GC_PREVIEW_LEAD_ID,
    sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'lead', kind: 'lead' },
    targets: [],
    targetSessionIds: [],
    text: '',
    time: time,
    seq: 2,
    isFinal: true,
    creationId: 'mc:preview-scout',
    pairOrder: 1,
    memberCard: {
      id: 'mc:preview-scout',
      member: {
        sessionId: 'preview-scout',
        name: 'scout',
        kind: 'teammate',
        description: '负责接口取证与技术可行性，产出 docs/research 下的调研结论。',
        model: 'deepseek-flash',
        modelInheritedFrom: 'lead',
        modelSource: 'result_snapshot',
        contextPolicy: 'fresh',
        lifecycleMode: 'continuable',
        createTool: 'spawn_teammate',
        promptExcerpt: '核对 conversation.view 的注册方式与跨会话读取通路，输出可复用的接口清单。',
        promptFull:
          '核对 conversation.view 的注册方式与跨会话读取通路，输出可复用的接口清单。包含 standardProps/ownerProps 精确签名、retain/eventSource 窗口形状、发送通路分流规则。',
        state: 'running'
      },
      time: time,
      actions: { viewSession: 'enabled', viewTask: 'enabled' },
      trigger: 'team-member-active'
    }
  }
}

function gcPreviewSubagentCard(time) {
  return {
    id: 'mc:preview-sub-1',
    kind: 'member_card',
    sessionId: 'preview-ux',
    sender: { sessionId: 'preview-ux', name: 'ux', kind: 'teammate' },
    targets: [],
    targetSessionIds: [],
    text: '',
    time: time,
    seq: 9,
    isFinal: true,
    creationId: 'mc:preview-sub-1',
    pairOrder: 1,
    memberCard: {
      id: 'mc:preview-sub-1',
      member: {
        sessionId: 'preview-sub-1',
        name: '产品设计',
        kind: 'subagent',
        parentName: 'ux',
        description: '按 Figma 原型生成 768 窄屏布局标注。',
        model: 'deepseek-flash',
        modelInheritedFrom: 'ux',
        contextPolicy: 'fork',
        lifecycleMode: 'one_shot',
        createTool: 'subagent_fork',
        promptExcerpt: '按 P9 帧导出 768 窄屏的间距/字号/命中区标注。',
        promptFull: '按 P9 帧导出 768 窄屏的间距/字号/命中区标注，并核对 tab 行横向滚动与频道头。',
        state: 'running'
      },
      time: time,
      actions: { viewSession: 'enabled' },
      trigger: 'subagent-catalog'
    }
  }
}

function gcPreviewTaskCard(time, variant) {
  const base = {
    id: 'preview:task:1',
    kind: 'task_card',
    sessionId: GC_PREVIEW_LEAD_ID,
    text: '',
    time: time,
    seq: 20,
    isFinal: true
  }
  const table = {
    create: {
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'lead', kind: 'lead' },
      action: 'create',
      ownerName: '',
      status: 'pending',
      revision: 1,
      subject: '重绘任务卡片原型',
      description: '按成员卡语言出任务卡，覆盖创建、认领、完成与重新打开；插入 P2 示例并更新文档。'
    },
    claim: {
      sender: { sessionId: 'preview-scout', name: 'scout', kind: 'teammate' },
      action: 'claim',
      ownerName: 'scout',
      status: 'in_progress',
      revision: 2,
      subject: '重绘任务卡片原型',
      description: '我先出四个变体，再回填文档。',
      compact: true
    },
    complete: {
      sender: { sessionId: 'preview-backend', name: 'backend', kind: 'teammate' },
      action: 'complete',
      ownerName: 'backend',
      status: 'completed',
      revision: 3,
      subject: '补充发送通路错误码',
      description: ''
    },
    reopen: {
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'lead', kind: 'lead' },
      action: 'reopen',
      ownerName: '',
      status: 'pending',
      revision: 4,
      subject: '补充发送通路错误码',
      description: '需要补充部分投递的错误码说明，任务重新打开。'
    }
  }
  const row = table[variant] || table.create
  return Object.assign({}, base, {
    id: 'preview:task:' + variant,
    sender: row.sender,
    taskCard: {
      id: 'preview:task:' + variant,
      action: row.action,
      actionLabel: row.action,
      statusLabel: row.status,
      actor: {
        name: row.sender.name,
        sessionId: row.sender.sessionId,
        kind: row.sender.kind,
        source: 'paired'
      },
      time: time,
      dedupeKey: 'preview-team:task-13:' + row.revision,
      replay: false,
      compact: !!row.compact,
      task: {
        id: 'task-13',
        revision: row.revision,
        subject: row.subject,
        description: row.description,
        status: row.status,
        ownerId: row.ownerName ? (row.ownerName === 'lead' ? GC_PREVIEW_LEAD_ID : 'preview-' + row.ownerName) : '',
        ownerName: row.ownerName,
        blockedBy: variant === 'claim' ? ['task-13'] : [],
        writeScopes: []
      }
    }
  })
}

/** 折叠回归填充（>50 行，用于 P3 与折叠测试；不改变视觉语言） */
const GC_PREVIEW_FOLD_FILLER =
  '\n' +
  Array.from({ length: 46 })
    .map(function (_, i) {
      return '· 折叠回归占位第 ' + (i + 1) + ' 行：验证默认只展示前 50 行 + 56px 渐隐遮罩 + 「展开全部（共 N 行）」。'
    })
    .join('\n')

function gcPreviewAgentMessage(time, options) {
  return Object.assign(
    {
      id: 'preview:agent:' + time + ':' + Math.random().toString(36).slice(2, 7),
      kind: 'agent_output',
      sessionId: 'preview-scout',
      sender: { sessionId: 'preview-scout', name: 'scout', kind: 'teammate' },
      targets: [],
      targetSessionIds: [],
      text: '',
      time: time,
      seq: time,
      isFinal: true
    },
    options
  )
}

const GC_PREVIEW_LONG_TEXT =
  '群聊视图的完整 UX 规格已经定稿，覆盖以下几个部分。一、入口与导航：群聊作为对话页视图 tab，与对话 / 轨迹 / 上下文 / 终端 / 编队 / 能力同级；激活态沿用现有 13px/500 字号、2px 下划线与 business-primary 颜色；未读不在 tab 上画圆点，改为消息区浮标。\n\n二、布局三档：1440 内容列 920，1280 收紧到 856，768 窄屏隐藏侧栏并把频道头压到 56；消息气泡 max-width 600（窄屏 70%），圆角 12，padding 10×14。\n\n三、消息类型：用户消息右对齐并带「已同时发送给…」说明行；agent→agent 的 @ 目标内联在正文首行；agent 最终输出就是普通发言；系统提示居中无底色；成员加入是 creator 发出的一条带卡消息（欢迎提示 + creator 消息头 + 卡片）。\n\n四、发送流程：未 @ 默认发给 Lead，@ 触发补全浮层，多目标只发出一条气泡并标注接收方；失败可重试、部分失败显示已送达 X/Y。\n\n五、折叠规则：正文 8 行或 400 字符先到者触发，渐变遮罩 + 「展开全部」文字链，展开保持顶部锚点。\n\n六、状态：加载骨架、空态、只读历史（横幅 + 禁用输入）、筛选态（顶部提示条 + 清除）、未读浮标（↓ N 条新消息 + 频道头提示）。\n\n七、可访问性：tab role=tablist、消息流 aria-live=polite 仅播报新消息摘要、折叠链接 aria-expanded、焦点环 2px、prefers-reduced-motion 关闭动效。'

function gcPreviewMessages(now, options) {
  const opts = options || {}
  const m = function (minutes) {
    return now - minutes * 60 * 1000
  }
  const messages = [
    gcPreviewWelcomeMessage(m(24)),
    gcPreviewMemberCard(m(24)),
    gcPreviewAgentMessage(m(22), {
      kind: 'agent_to_agent',
      targets: ['backend'],
      targetSessionIds: ['preview-backend'],
      text: '接口清单已确认：conversation.view 的 slot 注册方式可用，跨会话读取走 host Service。请补发送通路签名。'
    }),
    gcPreviewTaskCard(m(20), 'create'),
    gcPreviewAgentMessage(m(18), {
      kind: 'user',
      sessionId: GC_PREVIEW_LEAD_ID,
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'user', kind: 'user' },
      targets: ['lead', 'ux', 'backend'],
      targetSessionIds: [GC_PREVIEW_LEAD_ID, 'preview-ux', 'preview-backend'],
      text: '接口清单我看了，发送通路按 host 路由来，别再走 client 直调。',
      delivery: 'sent',
      deliveries: { [GC_PREVIEW_LEAD_ID]: 'sent', 'preview-ux': 'sent', 'preview-backend': 'sent' },
      clientBatchId: 'preview-batch-1'
    }),
    gcPreviewAgentMessage(m(16), {
      kind: 'agent_output',
      sessionId: 'preview-ux',
      sender: { sessionId: 'preview-ux', name: 'ux', kind: 'teammate' },
      text: 'UX 规格已落盘，原型覆盖 tab、四类消息、@ 补全与发送四态。',
      toolCallCount: 3
    }),
    gcPreviewSubagentCard(m(14)),
    gcPreviewAgentMessage(m(13), {
      kind: 'agent_output',
      sessionId: 'preview-sub-1',
      sender: { sessionId: 'preview-sub-1', name: '产品设计', kind: 'subagent' },
      text: '768 窄屏标注已出：内容列 720（左右 24），气泡 max-width 70%，命中区 ≥44×44。'
    }),
    gcPreviewTaskCard(m(12), 'claim'),
    {
      id: 'preview:user:2',
      kind: 'user',
      sessionId: GC_PREVIEW_LEAD_ID,
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'user', kind: 'user' },
      targets: ['lead'],
      targetSessionIds: [GC_PREVIEW_LEAD_ID],
      text: '收到，我先补一版 host 路由的接口定义，10 分钟同步。',
      time: m(11),
      seq: m(11),
      isFinal: true,
      delivery: 'sending',
      clientBatchId: 'preview-batch-2'
    },
    {
      id: 'preview:user:3',
      kind: 'user',
      sessionId: GC_PREVIEW_LEAD_ID,
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'user', kind: 'user' },
      targets: ['lead', 'pm'],
      targetSessionIds: [GC_PREVIEW_LEAD_ID, 'preview-pm'],
      text: '那我先按这个方案改，回头把签名和错误码一起发上来。',
      time: m(9),
      seq: m(9),
      isFinal: true,
      delivery: 'failed',
      deliveries: { [GC_PREVIEW_LEAD_ID]: 'sent', 'preview-pm': 'failed' },
      clientBatchId: 'preview-batch-3',
      meta: {
        error: 'network-interrupted',
        sendDebug: {
          reason: 'network',
          code: 'send.prompt-failed',
          status: 'failed',
          stage: 'loop',
          message: 'target session not ready (session-unavailable)'
        }
      }
    },
    gcPreviewAgentMessage(m(8), {
      kind: 'delivery',
      sessionId: 'preview-backend',
      sender: { sessionId: 'preview-backend', name: 'backend', kind: 'teammate' },
      text:
        '**发送通路**已完成，关键点：\n\n- `sendChannelBatch` 负责 fan-out 与重试\n- 前缀 canonical：`[群聊 · 同发] 收件人：@lead、@ux`\n- 参考 [ADR](https://example.com/docs/adr/group-chat-send.md)\n\n```js\nconst result = await sendChannelBatch(request)\nconsole.log(result.status)\n```',
      files: [
        { name: 'group-chat-send.md', path: 'docs/adr/group-chat-send.md' },
        { name: 'send-batch.js', path: 'src/send/send-batch.js' }
      ],
      toolCallCount: 12
    }),
    gcPreviewAgentMessage(m(8), {
      kind: 'agent_output',
      sessionId: 'preview-backend',
      sender: { sessionId: 'preview-backend', name: 'backend', kind: 'teammate' },
      text:
        '本轮接口对照：\n\n| 接口 | 状态 | 备注 |\n|:---|:---:|---:|\n| `conversation.view` | 可用 | slot 注册 |\n| `sessions.retain` | 可用 | 引用计数 |\n| `sendChannelBatch` | 可用 | 四态/重试 |',
      toolCallCount: 4
    }),
    gcPreviewTaskCard(m(7), 'complete'),
    gcPreviewTaskCard(m(6), 'reopen'),
    gcPreviewAgentMessage(m(5), {
      kind: 'agent_output',
      sessionId: 'preview-scout',
      sender: { sessionId: 'preview-scout', name: 'scout', kind: 'teammate' },
      text: GC_PREVIEW_LONG_TEXT + GC_PREVIEW_FOLD_FILLER,
      toolCallCount: 27
    }),
    {
      id: 'preview:system:end',
      kind: 'system',
      sessionId: GC_PREVIEW_LEAD_ID,
      sender: { sessionId: GC_PREVIEW_LEAD_ID, name: 'lead', kind: 'system' },
      targets: [],
      targetSessionIds: [],
      text: '接口清单校验 完成 · 用时 1 分 12 秒',
      time: m(3),
      seq: m(3),
      isFinal: true,
      systemReason: 'team-created'
    }
  ]
  if (opts.long === true) {
    // 长 feed（布局回归用）：追加 ~200 条，模拟团队跑很久后的消息流
    const speakers = [
      { sessionId: 'preview-scout', name: 'scout', kind: 'teammate' },
      { sessionId: 'preview-backend', name: 'backend', kind: 'teammate' },
      { sessionId: 'preview-ux', name: 'ux', kind: 'teammate' }
    ]
    for (let i = 0; i < 200; i += 1) {
      const speaker = speakers[i % speakers.length]
      const time = m(2) + i * 1500
      messages.push({
        id: 'preview:long:' + i,
        kind: 'agent_output',
        sessionId: speaker.sessionId,
        sender: { sessionId: speaker.sessionId, name: speaker.name, kind: speaker.kind },
        targets: [],
        targetSessionIds: [],
        text:
          '第 ' +
          (i + 1) +
          ' 条长 feed 消息：布局回归占位，用于验证消息流滚动时输入区始终贴在可视区底部（F-01）。',
        time: time,
        seq: time,
        isFinal: true,
        toolCallCount: i % 7 === 0 ? 3 : 0
      })
    }
  }
  return messages
}

function gcPreviewChannel(options) {
  const opts = options || {}
  const members = gcPreviewMembers()
  const readonly = opts.readonly === true
  return {
    channelId: GC_PREVIEW_LEAD_ID,
    lead: members[0],
    members: members,
    teamName: 'dsh-team-group',
    runningCount: members.filter(function (member) {
      return member.status === 'running'
    }).length,
    readonly: readonly,
    readonlyReason: readonly ? 'team-ended' : undefined,
    truncated: opts.truncated
      ? { omittedSubagents: 2, maxDepth: 3, maxSessions: 32, reason: 'session-cap' }
      : undefined,
    generatedAt: Date.now()
  }
}

function gcPreviewCursor(channelId) {
  return {
    v: 1,
    channelId: channelId,
    offsets: {},
    revisions: {}
  }
}

function gcCreatePreviewSource(options) {
  const opts = options || {}
  const listeners = new Set()
  let channel = gcPreviewChannel(opts)
  if (opts.members) {
    channel = gcMergeRosterChannel(channel, opts.members, channel.lead.sessionId)
  }
  let messages = gcPreviewMessages(Date.now(), { long: opts.long === true })
  let closed = false

  function page(extra) {
    return Object.assign(
      {
        channel: channel,
        messages: messages.slice(),
        cursor: gcPreviewCursor(channel.channelId),
        hasMore: true,
        truncated: false,
        serverTime: Date.now()
      },
      extra || null
    )
  }

  return {
    open: function () {
      return Promise.resolve(page())
    },
    sync: function () {
      return Promise.resolve(page({ messages: [] }))
    },
    pageOlder: function () {
      return Promise.resolve(page({ messages: [] }))
    },
    subscribe: function (onChange) {
      listeners.add(onChange)
      return function () {
        listeners.delete(onChange)
      }
    },
    capabilities: function () {
      return channel.readonly ? { canSend: false, reason: 'readonly' } : { canSend: true }
    },
    close: function () {
      closed = true
      listeners.clear()
    },
    // 预览发送：本地追加一条已发送消息
    prompt: function (request) {
      if (closed) return Promise.resolve({ status: 'failed', deliveries: [] })
      const now = Date.now()
      messages = messages.concat([
        {
          id: 'preview:local:' + now,
          kind: 'user',
          sessionId: channel.channelId,
          sender: { sessionId: channel.channelId, name: 'user', kind: 'user' },
          targets: gcAsArray(request && request.targets ? request.targets.map(function (target) { return target.name }) : ['lead']),
          targetSessionIds: [],
          text: gcStr(request && request.text),
          time: now,
          seq: now,
          isFinal: true,
          delivery: 'sent'
        }
      ])
      listeners.forEach(function (listener) {
        try {
          listener('append')
        } catch {}
      })
      return Promise.resolve({ status: 'sent', deliveries: [] })
    }
  }
}

/* ── src/client/parts/90-view.part.js ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * 90-view.part.js — GroupChatView 容器（唯一使用 hooks 的文件）
 *
 * 数据流（架构 §6.4.2）：
 *   props.sessionId → createChannelSource → store.commit(page)
 *                  → 选择器（filter + feed items）→ 渲染
 *                  → subscribe(append/reset/status) → 增量合并（120ms 批处理）
 * 订阅生命周期：useEffect 内 start()，卸载/切换会话时 stop()；
 * 旧频道的回调按 channelId 校验，避免串数据（PR1 F15）。
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * 把视图根嵌进宿主布局（F-01）：
 * slot 渲染器可能在 `.gc-root` 外包一层无高度规则的 div，导致 height:100% 失效、
 * 长 feed 把 composer 顶出可视区。这里把 root 的祖先链（最多 4 层，遇到宿主的
 * `viewArea` 容器即停）补成 flex 纵向填满链，卸载时恢复原 inline style。
 * CSS `:has()` 已覆盖主路径，本函数是版本兜底。
 */
function gcFitHostLayout(rootEl) {
  if (!rootEl || !rootEl.style) return function () {}
  const restore = []
  try {
    rootEl.style.height = '100%'
    rootEl.style.minHeight = '0'
    rootEl.style.overflow = 'hidden'
  } catch {}
  let node = rootEl.parentElement
  let depth = 0
  while (node && depth < 4) {
    try {
      restore.push([node, node.getAttribute('style')])
      node.style.flex = '1 1 auto'
      node.style.minHeight = '0'
      node.style.display = 'flex'
      node.style.flexDirection = 'column'
      node.style.overflow = 'hidden'
      const className = typeof node.className === 'string' ? node.className : ''
      if (className.indexOf('viewArea') >= 0) break
    } catch {
      break
    }
    node = node.parentElement
    depth += 1
  }
  return function restoreHostLayout() {
    for (let i = 0; i < restore.length; i += 1) {
      const entry = restore[i]
      try {
        const previous = entry[1]
        if (previous === null || previous === undefined) entry[0].removeAttribute('style')
        else entry[0].setAttribute('style', previous)
      } catch {}
    }
  }
}

/**
 * 会话父链查询（lead 回溯用）：优先 `sessions.list.byId`（F27/§4.8.2 口径），
 * 回退 `binding(sessionId).session.getSnapshot()`；读不到返回 undefined，不抛错。
 */
function gcLookupSessionParents(ctx) {
  let listState = null
  try {
    if (ctx && ctx.sessions && ctx.sessions.list && typeof ctx.sessions.list.getSnapshot === 'function') {
      listState = ctx.sessions.list.getSnapshot()
    }
  } catch {
    listState = null
  }
  return function lookup(sessionId) {
    try {
      const byId = (listState && (listState.byId || listState.sessions)) || null
      const entry = byId && sessionId ? byId[sessionId] : null
      if (entry) {
        return {
          id: sessionId,
          parentSessionId:
            entry.parentSessionId ||
            (entry.subagent && entry.subagent.address && entry.subagent.address.parentSessionId) ||
            '',
          parentSession: entry.parentSession
        }
      }
      if (!ctx || !ctx.sessions || typeof ctx.sessions.binding !== 'function') return undefined
      const binding = ctx.sessions.binding(sessionId)
      const snapshot =
        binding && binding.session && typeof binding.session.getSnapshot === 'function'
          ? binding.session.getSnapshot()
          : null
      if (!snapshot) return undefined
      return {
        id: sessionId,
        parentSessionId:
          snapshot.parentSessionId ||
          (snapshot.subagent && snapshot.subagent.address && snapshot.subagent.address.parentSessionId) ||
          '',
        parentSession: snapshot.parentSession
      }
    } catch {
      return undefined
    }
  }
}

/**
 * F27 作用域修正：任意 member session 打开群聊都解析 lead 频道。
 * core/roster.resolveLeadSessionId 优先（≤4 跳、防环），缺失时回退适配器 deriveLeadSessionId，再回退自身。
 */
function gcResolveLeadSessionId(ctx, sessionId) {
  const roster = gcCore('roster')
  if (roster && typeof roster.resolveLeadSessionId === 'function' && sessionId) {
    try {
      const resolved = roster.resolveLeadSessionId(sessionId, gcLookupSessionParents(ctx))
      if (typeof resolved === 'string' && resolved) return resolved
    } catch (error) {
      gcWarn('core resolveLeadSessionId failed:', gcShortError(error))
    }
  }
  try {
    const adapter = gcAdapter('client-session-source')
    if (adapter && typeof adapter.deriveLeadSessionId === 'function') {
      return adapter.deriveLeadSessionId(ctx, sessionId) || sessionId
    }
  } catch {}
  return sessionId
}

/**
 * 轮次轨迹数据（§6.15.2）：优先 core/turns 聚合该成员事件窗口；
 * 适配器未暴露事件窗口时，用 feed 内该成员的 agent_output 降级构造。
 */
function gcLoadTrajectoryTurns(source, store, sessionId) {
  const turnsMod = gcCore('turns')
  let events = null
  try {
    if (source && typeof source.getEvents === 'function') events = source.getEvents(sessionId)
    else if (source && typeof source.getMemberEvents === 'function') events = source.getMemberEvents(sessionId)
  } catch {}
  if (events && turnsMod && typeof turnsMod.aggregateTurns === 'function') {
    try {
      const turns = turnsMod.aggregateTurns(events)
      if (Array.isArray(turns)) return turns
    } catch (error) {
      gcWarn('core aggregateTurns failed, using fallback:', gcShortError(error))
    }
  }
  const state = store.getSnapshot()
  const messages = gcAsArray(state.messages).filter(function (message) {
    return message && message.sessionId === sessionId && message.kind === 'agent_output'
  })
  return messages
    .map(function (message, index) {
      return {
        index: index,
        turnId: index,
        startedAt: message.time,
        endedAt: message.time,
        status: message.isFinal ? 'done' : 'running',
        summary: gcClip(gcStr(message.text), 120),
        stepCount: 0,
        toolCount: typeof message.toolCallCount === 'number' ? message.toolCallCount : 0
      }
    })
    .reverse()
}

/** Cordis client ctx（entry.apply 注入；卡片跳转 / 发送降级用）。 */
let gcCtx = null

function gcSetPluginContext(ctx) {
  gcCtx = ctx
}

/* ── 数据源与控制器 ───────────────────────────────────────────────────── */

/** `?gc-preview=1` 的变体（`readonly` / `truncated`）。 */
function gcPreviewVariant() {
  try {
    if (typeof location === 'undefined') return ''
    const match = /[?&]gc-preview=([^&]+)/.exec(location.search || '')
    return match ? match[1] : ''
  } catch {
    return ''
  }
}

/** `?gc-long=1`：预览用长 feed（布局回归截图）。 */
function gcPreviewLongRequested() {
  try {
    if (typeof location === 'undefined') return false
    return /(?:^|[?&])gc-long=(1|true)/.test(location.search || '')
  } catch {
    return false
  }
}

/** 当前活动数据源（预览发送走 source.prompt；生产走 send-batch/binding）。 */
let gcActiveSource = null

function gcCreateChannelSource(deps) {
  // 预览模式优先（`?gc-preview=1`）：不依赖真实会话/适配器
  const preview = gcPreviewVariant()
  if (gcIsPreviewRequested() || deps.preview) {
    return gcCreatePreviewSource({
      readonly: /readonly/.test(preview),
      truncated: /truncated/.test(preview),
      members: deps.members,
      long: gcPreviewLongRequested()
    })
  }
  const adapter = gcAdapter('client-session-source')
  if (adapter && typeof adapter.createClientSessionSource === 'function') {
    try {
      return adapter.createClientSessionSource(deps)
    } catch (error) {
      gcWarn('createClientSessionSource failed:', gcShortError(error))
    }
  }
  const adaptersIndex = gcAdapter('index')
  if (adaptersIndex && typeof adaptersIndex.createChannelSource === 'function') {
    try {
      return adaptersIndex.createChannelSource('client', deps)
    } catch (error) {
      gcWarn('createChannelSource(client) failed:', gcShortError(error))
    }
  }
  return null
}

function gcCreateController(options) {
  const props = options.props
  const store = options.store
  const channelId = props.sessionId
  const limits = gcLimits()
  let source = null
  let unsubscribe = null
  let disposed = false
  let syncTimer = null
  let pendingSync = false
  let openAttempted = false

  function alive() {
    return !disposed
  }

  function withRoster(channel) {
    if (!options.getRoster) return channel
    return gcMergeRosterChannel(channel, options.getRoster(), options.leadSessionId)
  }

  function commitOpen(page) {
    if (!alive() || !page) return
    const state = store.getSnapshot()
    const channel = withRoster(page.channel || state.channel)
    const messages = gcMergeMessages([], page.messages, channel, limits)
    store.set({
      channel: channel,
      messages: messages,
      cursor: page.cursor || state.cursor,
      phase: 'ready',
      error: null,
      reachedOldest: page.hasMore === false,
      ...(options.restoredDraft ? { draft: options.restoredDraft } : null)
    })
    if (options.onOpen) options.onOpen(page)
  }

  function commitSync(page) {
    if (!alive() || !page) return
    const state = store.getSnapshot()
    const channel = withRoster(page.channel || state.channel)
    const incoming = gcAsArray(page.messages)
    const messages = gcMergeMessages(state.messages, incoming, channel, limits)
    store.set({
      channel: channel,
      messages: messages,
      cursor: page.cursor || state.cursor,
      reachedOldest: page.hasMore === false ? true : state.reachedOldest
    })
    if (incoming.length > 0 && options.onAppend) options.onAppend(incoming, channel)
  }

  function fail(error, code) {
    if (!alive()) return
    const state = store.getSnapshot()
    store.set({
      phase: state.messages.length > 0 ? 'ready' : 'error',
      error: {
        code: code || 'open-failed',
        message: gcShortError(error),
        retryable: true
      },
      connection: 'paused'
    })
  }

  function open() {
    if (!alive()) return Promise.resolve()
    openAttempted = true
    source = gcCreateChannelSource({
      ctx: gcCtx,
      channelId: channelId,
      sessionId: props.sessionId,
      // F-02：agentTeam 投影作为 authority 名册（适配器与事件名册 union；subagent 保留）
      members: options.getMembers ? options.getMembers() : undefined,
      // F5（H1 后）：本地批次活对象交给 core lookupBatchId 反查（UI 不删除 echo）
      localBatches: gcLocalBatches,
      props: props,
      t: gcTranslate
    })
    if (!source) {
      store.set({
        phase: 'error',
        error: { code: 'no-source', message: 'no ChannelSource adapter', retryable: true }
      })
      gcWarn('no ChannelSource adapter available (expected src/adapters/client-session-source.js)')
      return Promise.resolve()
    }
    gcActiveSource = source
    const openPromise = typeof source.open === 'function' ? source.open(channelId, { limit: limits.firstScreen }) : null
    const subscribePromise = Promise.resolve(openPromise)
      .then(function (page) {
        if (!alive()) return
        commitOpen(page)
        if (typeof source.subscribe === 'function') {
          unsubscribe = source.subscribe(function (kind) {
            if (!alive()) return
            if (kind === 'reset') {
              open().catch(function (error) {
                fail(error, 'reset-failed')
              })
              return
            }
            scheduleSync()
          })
        }
      })
      .catch(function (error) {
        fail(error, 'open-failed')
      })
    return subscribePromise
  }

  function scheduleSync() {
    if (!alive() || pendingSync) return
    pendingSync = true
    const wait = limits.batchMs || 120
    if (typeof setTimeout === 'function') {
      syncTimer = setTimeout(function () {
        syncTimer = null
        pendingSync = false
        syncNow()
      }, wait)
      return
    }
    pendingSync = false
    syncNow()
  }

  function syncNow() {
    if (!alive() || !source || typeof source.sync !== 'function') return Promise.resolve()
    const state = store.getSnapshot()
    if (!state.cursor) return Promise.resolve()
    return Promise.resolve(source.sync(state.cursor))
      .then(function (page) {
        commitSync(page)
        store.set({ connection: 'live' })
      })
      .catch(function (error) {
        fail(error, 'sync-failed')
      })
  }

  function loadOlder() {
    if (!alive() || !source || typeof source.pageOlder !== 'function') return Promise.resolve()
    const state = store.getSnapshot()
    if (!state.cursor || state.loadingOlder || state.reachedOldest) return Promise.resolve()
    store.set({ loadingOlder: true })
    return Promise.resolve(source.pageOlder(state.cursor, limits.pageOlder))
      .then(function (page) {
        if (!alive() || !page) return
        const current = store.getSnapshot()
        const channel = withRoster(page.channel || current.channel)
        const merged = gcMergeMessages(current.messages, page.messages, channel, limits)
        store.set({
          messages: merged,
          cursor: page.cursor || current.cursor,
          loadingOlder: false,
          reachedOldest: page.hasMore === false
        })
      })
      .catch(function (error) {
        if (!alive()) return
        store.set({ loadingOlder: false })
        fail(error, 'load-older-failed')
      })
  }

  function start() {
    const state = store.getSnapshot()
    if (state.phase !== 'loading' || state.messages.length > 0) {
      store.set(gcInitialState())
    }
    return open()
  }

  function stop() {
    disposed = true
    if (syncTimer && typeof clearTimeout === 'function') {
      clearTimeout(syncTimer)
      syncTimer = null
    }
    pendingSync = false
    if (typeof unsubscribe === 'function') {
      try {
        unsubscribe()
      } catch (error) {
        gcWarn('unsubscribe failed:', gcShortError(error))
      }
    }
    unsubscribe = null
    if (source && typeof source.close === 'function') {
      try {
        source.close()
      } catch (error) {
        gcWarn('source close failed:', gcShortError(error))
      }
    }
    source = null
    gcActiveSource = null
  }

  return {
    start: start,
    stop: stop,
    reload: function () {
      if (!openAttempted) return start()
      if (source && typeof source.close === 'function') {
        try {
          source.close()
        } catch {}
      }
      source = null
      store.set({ phase: 'loading', error: null })
      return open()
    },
    syncNow: syncNow,
    loadOlder: loadOlder,
    hasSource: function () {
      return !!source
    }
  }
}

/* ── 发送（T3 send-batch 优先，缺失时降级直发） ──────────────────────── */

function gcNewRequestId() {
  try {
    if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {}
  return gcUid('req')
}

function gcBindingFor(sessionId) {
  try {
    if (!gcCtx || !gcCtx.sessions || typeof gcCtx.sessions.binding !== 'function') return null
    return gcCtx.sessions.binding(sessionId)
  } catch {
    return null
  }
}

/** 降级直发（仅开发调试：无 canonical 前缀，T3 落盘后不再使用）。 */
function gcFallbackSend(request) {
  const targets = gcAsArray(request.targets)
  const deliveries = []
  let chain = Promise.resolve()
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i]
    chain = chain.then(function () {
      const binding = gcBindingFor(target.sessionId)
      if (!binding || !binding.session || typeof binding.session.prompt !== 'function') {
        deliveries.push({ target: target.name, sessionId: target.sessionId, ok: false, error: 'session-unavailable' })
        return null
      }
      return Promise.resolve(
        binding.session.prompt([{ type: 'text', text: request.text }], 'steer', undefined, gcNewRequestId())
      ).then(
        function () {
          deliveries.push({ target: target.name, sessionId: target.sessionId, ok: true })
        },
        function (error) {
          deliveries.push({
            target: target.name,
            sessionId: target.sessionId,
            ok: false,
            error: gcShortError(error)
          })
        }
      )
    })
  }
  return chain.then(function () {
    return { status: gcAggregateDeliveries(deliveries), deliveries: deliveries }
  })
}

function gcAggregateDeliveries(deliveries) {
  const list = gcAsArray(deliveries)
  if (list.length === 0) return 'failed'
  const ok = list.filter(function (item) {
    return item.ok
  }).length
  if (ok === list.length) return 'sent'
  return ok === 0 ? 'failed' : 'partial'
}

function gcInvokeSend(request) {
  if (gcActiveSource && typeof gcActiveSource.prompt === 'function') {
    return Promise.resolve(gcActiveSource.prompt(request)).then(function (result) {
      if (result && Array.isArray(result.deliveries)) return result
      return { status: (result && result.status) || 'sent', deliveries: (result && result.deliveries) || [] }
    })
  }
  const mod = gcSendModule('send-batch')
  if (mod && typeof mod.sendChannelBatch === 'function') {
    // 关键：不再静默降级成 fallback（会把「进入循环前抛异常」吞成空 deliveries/unknown），
    // 异常一律交给调用方记录为可诊断失败（含 stage/build）。
    try {
      return Promise.resolve(mod.sendChannelBatch(request)).then(function (result) {
        if (result && Array.isArray(result.deliveries)) return result
        return {
          status: result && result.status ? result.status : 'sent',
          deliveries: result && result.deliveries ? result.deliveries : [],
          diagnostics: result && result.diagnostics ? result.diagnostics : []
        }
      })
    } catch (error) {
      return Promise.reject(error)
    }
  }
  return gcFallbackSend(request)
}

/** 异常 → 可展示诊断（含 stage/build），供失败 caption 与 data-send-debug 使用。 */
function gcDebugFromException(error, stage) {
  const err = error && typeof error === 'object' ? error : {}
  return {
    reason: gcStr(err.reason) || gcStr(err.code) || gcStr(err.name) || 'exception',
    code: gcStr(err.code) || gcStr(err.name) || 'exception',
    status: 'failed',
    stage: gcStr(stage) || gcStr(err.stage) || 'invoke',
    message: gcClip(gcStr(err.message) || gcShortError(error), 200),
    build: GC_BUILD_LABEL
  }
}

function gcPerformSend(store, channelId, t) {
  const state = store.getSnapshot()
  if (state.send && state.send.inFlight) return Promise.resolve()
  const draft = state.draft || { text: '', mentions: [] }
  const text = gcStr(draft.text).trim()
  if (!text) return Promise.resolve()
  const channel = state.channel
  if (channel && channel.readonly) return Promise.resolve()

  const resolved = gcResolveTargets(draft, channel, channelId)
  const targets = resolved.targets
  const clientBatchId = gcUid('gcb')
  const now = Date.now()
  const optimistic = {
    id: 'local:' + clientBatchId,
    kind: 'user',
    sessionId: channelId,
    sender: { sessionId: channelId, name: 'user', kind: 'user' },
    targets: targets.map(function (target) {
      return target.name
    }),
    targetSessionIds: targets.map(function (target) {
      return target.sessionId
    }),
    text: text,
    rawText: text,
    time: now,
    seq: 0,
    isFinal: true,
    delivery: 'sending',
    clientBatchId: clientBatchId,
    meta: { draftMentions: gcAsArray(draft.mentions) }
  }

  gcRememberBatch({
    clientBatchId: clientBatchId,
    channelId: channelId,
    targets: targets,
    sessionIds: targets.map(function (target) {
      return target.sessionId
    }),
    text: text,
    at: now
  })

  const limits = gcLimits()
  store.set({
    messages: gcMergeMessages(state.messages, [optimistic], channel, limits),
    draft: { text: '', mentions: [] },
    mention: null,
    mentionIndex: 0,
    droppedMentions: resolved.dropped,
    send: { inFlight: { clientBatchId: clientBatchId, startedAt: now } }
  })
  gcSaveDraft(channelId, { text: '', mentions: [] })

  return gcInvokeSend({
    text: text,
    mentions: gcAsArray(draft.mentions),
    targets: targets,
    channelId: channelId,
    clientBatchId: clientBatchId,
    deps: {
      ctx: gcCtx,
      // R-M4：与 adapter 共享同一份活对象，send-batch 才能在终态把批次标 closed
      localBatches: gcLocalBatches,
      // H1 后：onBatch 在 requestIds 生成后/prompt 前回调；带上原始正文用于无 rpcId 弱匹配
      onBatch: function (batch) {
        gcRememberBatch(Object.assign({ text: text, channelId: channelId }, batch || {}))
      }
    }
  }).then(
    function (result) {
      const deliveries = {}
      const list = gcAsArray(result && result.deliveries)
      for (let i = 0; i < list.length; i += 1) {
        const item = list[i]
        const key = item.sessionId || item.target
        if (key) deliveries[key] = item.ok ? 'sent' : 'failed'
      }
      gcCloseBatch(clientBatchId)
      const status = result && result.status ? result.status : gcAggregateDeliveries(list)
      const sendDebug = gcSendDebugFromDeliveries(status, list, result && result.diagnostics)
      store.set(function (current) {
        return {
          send: { inFlight: null },
          messages: current.messages.map(function (message) {
            if (message.id !== 'local:' + clientBatchId) return message
            return Object.assign({}, message, {
              delivery: status,
              deliveries: deliveries,
              meta: Object.assign({}, message.meta, {
                sendDebug: sendDebug || undefined,
                sendErrorReason: sendDebug ? sendDebug.reason : undefined,
                sendErrorMessageKey: gcStr((list.filter(function (item) { return item && !item.ok })[0] || {}).messageKey) || undefined
              })
            })
          })
        }
      })
    },
    function (error) {
      gcCloseBatch(clientBatchId)
      store.set(function (current) {
        return {
          send: { inFlight: null },
          messages: current.messages.map(function (message) {
            if (message.id !== 'local:' + clientBatchId) return message
            return Object.assign({}, message, {
              delivery: 'failed',
              meta: Object.assign({}, message.meta, {
                error: gcShortError(error),
                sendDebug: gcDebugFromException(error, 'invoke'),
                sendErrorReason: gcStr(error && error.reason) || 'exception',
                sendErrorCode: gcStr(error && error.code) || gcStr(error && error.name) || 'exception',
                sendErrorStage: 'invoke'
              })
            })
          })
        }
      })
    }
  )
}

function gcSendFailureReason(deliveries) {
  const list = gcAsArray(deliveries)
  for (let i = 0; i < list.length; i += 1) {
    if (!list[i].ok && list[i].error) return gcStr(list[i].error)
  }
  return 'failed'
}

function gcRetrySend(store, channelId, t) {
  const state = store.getSnapshot()
  const target = state.messages.filter(function (message) {
    return (
      message.kind === 'user' &&
      (message.delivery === 'failed' || message.delivery === 'partial') &&
      message.clientBatchId
    )
  })[0]
  if (!target) return Promise.resolve()
  const failedSessionIds = Object.keys(target.deliveries || {}).filter(function (key) {
    return target.deliveries[key] === 'failed'
  })
  const allTargets = gcAsArray(target.targetSessionIds).map(function (sessionId, index) {
    return {
      name: gcAsArray(target.targets)[index] || sessionId,
      sessionId: sessionId
    }
  })
  const retryTargets =
    failedSessionIds.length > 0
      ? allTargets.filter(function (item) {
          return failedSessionIds.indexOf(item.sessionId) >= 0
        })
      : allTargets
  return gcInvokeSend({
    text: target.text,
    mentions: [],
    targets: retryTargets,
    channelId: channelId,
    clientBatchId: target.clientBatchId,
    deps: { ctx: gcCtx }
  }).catch(function (error) {
    return { status: 'failed', deliveries: [], diagnostics: [gcDebugFromException(error, 'retry')] }
  }).then(function (result) {
    store.set(function (current) {
      return {
        messages: current.messages.map(function (message) {
          if (message.id !== target.id) return message
          const deliveries = Object.assign({}, message.deliveries || {})
          const list = gcAsArray(result && result.deliveries)
          for (let i = 0; i < list.length; i += 1) {
            const key = list[i].sessionId || list[i].target
            if (key) deliveries[key] = list[i].ok ? 'sent' : 'failed'
          }
          const status = result && result.status ? result.status : message.delivery
          const retryDebug = gcSendDebugFromDeliveries(
            status,
            gcAsArray(result && result.deliveries),
            gcAsArray(result && result.diagnostics)
          )
          return Object.assign({}, message, {
            delivery: status,
            deliveries: deliveries,
            meta: retryDebug
              ? Object.assign({}, message.meta, { sendDebug: retryDebug, sendErrorReason: retryDebug.reason })
              : message.meta
          })
        })
      }
    })
  })
}

/* ── 卡片动作 / 跳转 / 复制 ──────────────────────────────────────────── */

function gcOpenSession(sessionId, t, store) {
  const workspace = gcCtx && typeof gcCtx.get === 'function' ? gcCtx.get('uiWorkspace') : undefined
  try {
    if (workspace && typeof workspace.openSession === 'function' && sessionId) {
      workspace.openSession(sessionId)
      return Promise.resolve(true)
    }
  } catch (error) {
    gcWarn('uiWorkspace.openSession failed:', gcShortError(error))
  }
  return gcCopyText(sessionId).then(function (ok) {
    gcShowToast(store, ok ? t('member.sessionCopied') : t('toast.copyFailed'))
    return false
  })
}

function gcShowToast(store, text) {
  store.set({ toast: { text: text, at: Date.now() } })
  if (typeof setTimeout === 'function') {
    setTimeout(function () {
      const state = store.getSnapshot()
      if (state.toast && state.toast.text === text) store.set({ toast: null })
    }, 2200)
  }
}

function gcCopyMessage(store, message, t) {
  const text = gcStr(message.rawText || message.text)
  return gcCopyText(text).then(function (ok) {
    gcShowToast(store, ok ? t('toast.copied') : t('toast.copyFailed'))
  })
}

/* ── 折叠锚点稳定（展开后顶部偏移 ≤4px，SC5） ────────────────────────── */

function gcToggleFoldWithAnchor(store, scrollEl, messageId) {
  if (!scrollEl || typeof scrollEl.querySelector !== 'function') {
    const state = store.getSnapshot()
    store.set({
      folded: Object.assign({}, state.folded, { [messageId]: !state.folded[messageId] })
    })
    return
  }
  const selector = '[data-message-id="' + messageId + '"]'
  const before = scrollEl.querySelector(selector)
  const beforeTop = before ? before.getBoundingClientRect().top : null
  const state = store.getSnapshot()
  store.set({
    folded: Object.assign({}, state.folded, { [messageId]: !state.folded[messageId] })
  })
  gcRaf(function () {
    const after = scrollEl.querySelector(selector)
    if (!after || beforeTop === null) return
    const delta = after.getBoundingClientRect().top - beforeTop
    if (Math.abs(delta) > 0.5) scrollEl.scrollTop += delta
  })
}

/* ── 视图组件 ─────────────────────────────────────────────────────────── */

function GroupChatView(props) {
  const t = gcTranslate
  const storeRef = React.useRef(null)
  if (!storeRef.current) storeRef.current = gcCreateStore()
  const store = storeRef.current
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  // locale 变化时强制重渲染（宿主 LocaleFace.subscribe → gcSetLocale → 这里）
  React.useSyncExternalStore(gcSubscribeLocale, gcGetLocale, gcGetLocale)
  const scrollRef = React.useRef(null)
  const rootRef = React.useRef(null)
  const compositionRef = React.useRef(false)
  const atBottomRef = React.useRef(true)
  const prevCountRef = React.useRef(0)
  const controllerRef = React.useRef(null)
  const sessionId = props && props.sessionId ? props.sessionId : 'unknown-session'

  // 频道根（lead）会话 id：优先用适配器的 deriveLeadSessionId（node 端同一实现）
  // M7：冷启动时 sessions.list 可能尚未就绪；订阅 byId 快照变化后就绪重算
  const sessionsById =
    props && typeof props.useSessions === 'function'
      ? props.useSessions(function (sessionsState) {
          return sessionsState && sessionsState.byId ? sessionsState.byId : null
        })
      : null
  const leadScope = React.useMemo(
    function () {
      const resolved = gcResolveLeadSessionId(gcCtx, sessionId)
      return { leadSessionId: resolved, degraded: resolved === sessionId }
    },
    [sessionId, sessionsById]
  )
  const leadSessionId = leadScope.leadSessionId

  // 权威名册：useSessions 的 agentTeam 投影（D-03；缺投影时退回事件名册）
  const agentTeam =
    props && typeof props.useSessions === 'function'
      ? props.useSessions(function (sessionsState) {
          if (!sessionsState || !sessionsState.projectionsBySession) return undefined
          const projection = sessionsState.projectionsBySession[leadSessionId]
          return projection && projection.values ? projection.values.agentTeam : undefined
        })
      : undefined
  const rosterRef = React.useRef(agentTeam)
  rosterRef.current = agentTeam

  const limits = gcLimits()
  const channel = state.channel
  const readonly = !!(channel && channel.readonly)
  const singleAgent = gcIsSingleAgent(channel)
  const visible = gcFilterMessages(state.messages, state.filter, channel)
  const items = gcBuildFeed(visible, Date.now())
  const filterCount = state.filter ? visible.length : 0
  const mentionCandidates = state.mention ? gcMentionCandidates(channel, state.mention.query) : []

  function currentScroll() {
    return scrollRef.current || null
  }

  function isAtBottom() {
    const el = currentScroll()
    if (!el) return true
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    return distance <= (limits.unreadClearThreshold || 32)
  }

  function scrollToBottom(smooth) {
    const el = currentScroll()
    if (!el) return
    try {
      el.scrollTop = el.scrollHeight
    } catch {}
    store.set({ unreadCount: 0 })
  }

  function handleJumpLatest() {
    scrollToBottom()
    store.set({ unreadCount: 0 })
  }

  function handleScroll() {
    const el = currentScroll()
    if (!el) return
    atBottomRef.current = isAtBottom()
    if (atBottomRef.current && state.unreadCount > 0) store.set({ unreadCount: 0 })
    if (el.scrollTop < 48 && controllerRef.current) controllerRef.current.loadOlder()
  }

  /* 生命周期：打开频道 + 订阅（会话切换时重建） */
  React.useEffect(
    function () {
      const restored = gcLoadDraft(sessionId)
      store.set(Object.assign({}, gcInitialState(), { draft: restored }))
      const controller = gcCreateController({
        props: props,
        store: store,
        leadSessionId: leadSessionId,
        getRoster: function () {
          return rosterRef.current
        },
        getMembers: function () {
          return gcRosterMembersFrom(rosterRef.current)
        },
        restoredDraft: restored,
        onAppend: function () {
          const el = currentScroll()
          if (!el) return
          if (isAtBottom()) {
            gcRaf(function () {
              scrollToBottom()
            })
          }
        },
        onOpen: function () {
          const el = currentScroll()
          const saved = gcLoadScroll(sessionId)
          if (el && saved !== null) {
            gcRaf(function () {
              el.scrollTop = saved
            })
          } else if (el) {
            gcRaf(function () {
              scrollToBottom()
            })
          }
        }
      })
      controllerRef.current = controller
      controller.start()
      return function () {
        const snapshot = store.getSnapshot()
        gcSaveDraft(sessionId, snapshot.draft)
        const el = currentScroll()
        if (el) gcSaveScroll(sessionId, el.scrollTop)
        controller.stop()
        controllerRef.current = null
      }
    },
    [sessionId, leadSessionId]
  )

  /* 新消息：未贴底时累计未读，贴底自动滚到底 */
  React.useEffect(
    function () {
      const count = state.messages.length
      const prev = prevCountRef.current
      prevCountRef.current = count
      if (count <= prev) return
      if (isAtBottom()) {
        gcRaf(function () {
          scrollToBottom()
        })
        return
      }
      store.set(function (current) {
        return { unreadCount: current.unreadCount + (count - prev) }
      })
    },
    [state.messages.length]
  )

  /* 单一输入器（F24/§6.13）：body 标记隐藏宿主 composer；2×rAF 自检失败降级 */
  React.useEffect(
    function () {
      const leaveBody = gcEnterGroupChatBody()
      let disposed = false
      if (typeof gcVerifyHostComposerHidden === 'function') {
        gcVerifyHostComposerHidden().then(function (result) {
          if (disposed || !result || !result.degraded) return
          store.set({ composerFallback: true })
        })
      }
      return function () {
        disposed = true
        leaveBody()
      }
    },
    [sessionId]
  )

  /* M4：宿主若保留非激活 view（不卸载），按可见性恢复/隐藏宿主 composer */
  React.useEffect(
    function () {
      const el = rootRef.current
      if (!el || typeof IntersectionObserver === 'undefined') return function () {}
      let observer = null
      try {
        observer = new IntersectionObserver(
          function (entries) {
            const visible = entries.some(function (entry) {
              return entry.isIntersecting && entry.intersectionRatio > 0
            })
            if (visible) {
              gcEnterGroupChatBody()
            } else {
              try {
                if (typeof document !== 'undefined' && document.body) {
                  document.body.classList.remove('gc-view-group-chat')
                }
              } catch {}
            }
          },
          { threshold: 0.01 }
        )
        observer.observe(el)
      } catch {
        observer = null
      }
      return function () {
        if (observer) {
          try {
            observer.disconnect()
          } catch {}
        }
      }
    },
    [sessionId]
  )

  /* 轨迹侧栏：Esc 关闭（§6.15.2，关闭后焦点回输入框） */
  React.useEffect(
    function () {
      if (!state.trajectory) return
      const onKeyDown = function (event) {
        if (event && event.key === 'Escape') {
          event.preventDefault()
          store.set({ trajectory: null, trajectoryTurns: [] })
          try {
            const el = currentScroll()
            if (el && typeof el.focus === 'function') el.focus()
          } catch {}
        }
      }
      try {
        if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('keydown', onKeyDown)
      } catch {}
      return function () {
        try {
          if (typeof document !== 'undefined' && document.removeEventListener) document.removeEventListener('keydown', onKeyDown)
        } catch {}
      }
    },
    [state.trajectory]
  )

  /* 宿主布局约束（F-01）：保证 root 占满 conversation.view 可用高度 */
  React.useEffect(
    function () {
      return gcFitHostLayout(rootRef.current)
    },
    [sessionId]
  )

  /* 调试快照（localStorage['group-chat:debug']==='1'） */
  React.useEffect(function () {
    if (!gcDebugEnabled()) return
    try {
      const target = typeof window !== 'undefined' ? window : undefined
      if (!target) return
      target.__GROUP_CHAT_DEBUG__ = { snapshot: function () { return gcDiagnostics(store.getSnapshot()) } }
    } catch {}
    return function () {
      try {
        if (typeof window !== 'undefined' && window.__GROUP_CHAT_DEBUG__) delete window.__GROUP_CHAT_DEBUG__
      } catch {}
    }
  }, [])

  const actions = {
    onTextChange: function (text, caret) {
      const nextQuery = gcMentionQuery(text, caret)
      store.set(function (current) {
        return {
          draft: { text: text, mentions: gcAsArray(current.draft.mentions) },
          mention: nextQuery,
          mentionIndex: nextQuery ? 0 : current.mentionIndex
        }
      })
      gcSaveDraft(sessionId, { text: text, mentions: gcAsArray(store.getSnapshot().draft.mentions) })
    },
    onCaretChange: function (caret) {
      const current = store.getSnapshot()
      if (!current.mention) return
      const nextQuery = gcMentionQuery(current.draft.text, caret)
      if (!nextQuery) store.set({ mention: null })
    },
    onFocusChange: function (focused) {
      store.set({ composerFocused: !!focused })
    },
    onMoveMention: function (index) {
      store.set({ mentionIndex: index })
    },
    onHoverMention: function (index) {
      store.set({ mentionIndex: index })
    },
    onCloseMention: function () {
      store.set({ mention: null, mentionIndex: 0 })
    },
    onSelectMention: function (name) {
      if (!name) return
      const current = store.getSnapshot()
      const text = gcInsertMention(current.draft.text, current.mention, name)
      const mentions = gcAsArray(current.draft.mentions)
      const nextMentions = mentions.indexOf(name) >= 0 ? mentions : mentions.concat(name)
      store.set({
        draft: { text: text, mentions: nextMentions },
        mention: null,
        mentionIndex: 0
      })
      gcSaveDraft(sessionId, { text: text, mentions: nextMentions })
    },
    onRemoveMention: function (name) {
      const current = store.getSnapshot()
      const mentions = gcAsArray(current.draft.mentions).filter(function (item) {
        return item !== name
      })
      const token = '@' + name
      let text = gcStr(current.draft.text)
      const index = text.indexOf(token)
      if (index >= 0) {
        let end = index + token.length
        if (text.charAt(end) === ' ') end += 1
        text = text.slice(0, index) + text.slice(end)
      }
      store.set({ draft: { text: text, mentions: mentions } })
      gcSaveDraft(sessionId, { text: text, mentions: mentions })
    },
    onSend: function () {
      gcPerformSend(store, sessionId, t).then(function () {
        handleJumpLatest()
      })
    },
    onFold: function (messageId) {
      gcToggleFoldWithAnchor(store, currentScroll(), messageId)
    },
    onCopyMessage: function (message) {
      gcCopyMessage(store, message, t)
    },
    onOpenSession: function (message) {
      const target = gcAsArray(message.targetSessionIds)[0] || (message.sender && message.sender.sessionId)
      if (target) gcOpenSession(target, t, store)
    },
    onOpenFile: function () {
      gcShowToast(store, t('msg.openSession'))
    },
    onOpenTrajectory: function () {
      gcShowToast(store, t('msg.toolCalls', { n: 0 }))
    },
    onCaptionAction: function (message, action) {
      if (action === 'retry') {
        gcRetrySend(store, sessionId, t)
        return
      }
      gcCopyMessage(store, message, t)
    },
    onCardAction: function (message, action) {
      const payload = message.memberCard || {}
      if (action === 'view-session') {
        const target = payload.member && payload.member.sessionId
        if (target) gcOpenSession(target, t, store)
        return
      }
      if (action === 'view-task') {
        const target = payload.member && payload.member.sessionId
        if (target) gcOpenSession(target, t, store)
        return
      }
      if (action === 'expand-task') {
        store.set(function (current) {
          return {
            expandedCards: Object.assign({}, current.expandedCards, {
              [message.id]: !current.expandedCards[message.id]
            })
          }
        })
      }
    },
    onCopyTaskId: function (taskId) {
      gcCopyText(taskId).then(function (ok) {
        gcShowToast(store, ok ? t('toast.copied') : t('toast.copyFailed'))
      })
    },
    onMention: function (name) {
      store.set({ filter: name })
    },
    onToggleFilter: function () {
      store.set({ filterOpen: !store.getSnapshot().filterOpen })
    },
    onSelectFilter: function (name) {
      store.set({ filter: name, filterOpen: false })
    },
    onClearFilter: function () {
      const el = currentScroll()
      const before = el ? el.scrollTop : 0
      store.set({ filter: null, filterOpen: false })
      gcRaf(function () {
        if (el) el.scrollTop = before
      })
    },
    onCloseFilter: function () {
      store.set({ filterOpen: false })
    },
    onRetryOpen: function () {
      if (controllerRef.current) controllerRef.current.reload()
    },
    onReconnect: function () {
      if (controllerRef.current) controllerRef.current.syncNow()
    },
    onOpenTrajectory: function (member) {
      if (!member) return
      const current = store.getSnapshot()
      if (current.trajectory && current.trajectory.sessionId === member.sessionId) {
        store.set({ trajectory: null, trajectoryTurns: [] })
        return
      }
      const source = gcActiveSource
      store.set({
        trajectory: {
          sessionId: member.sessionId,
          name: member.name,
          kind: member.kind,
          status: member.status,
          model: member.model
        },
        trajectoryTurns: gcLoadTrajectoryTurns(source, store, member.sessionId)
      })
    },
    onCloseTrajectory: function () {
      store.set({ trajectory: null, trajectoryTurns: [] })
    },
    onLoadOlderTurns: function () {
      const state2 = store.getSnapshot()
      if (!state2.trajectory) return
      if (controllerRef.current && controllerRef.current.loadOlder) controllerRef.current.loadOlder()
      store.set({ trajectoryTurns: gcLoadTrajectoryTurns(gcActiveSource, store, state2.trajectory.sessionId) })
    },
    onOpenChat: function () {
      if (props && typeof props.openView === 'function') props.openView('chat', '')
      store.set({ toast: { text: t('empty.howToTeam'), at: Date.now() } })
    }
  }

  const emptyKind = singleAgent && state.messages.length === 0 ? 'no-team' : 'normal'

  return h(
    'div',
    {
      className: 'gc-root',
      'data-plugin': 'group-chat',
      'data-testid': 'group-chat-root',
      'data-build': GC_BUILD_LABEL,
      ref: rootRef
    },
    h(
      'div',
      { className: 'gc-shell' },
    h(GcChannelHeader, {
      t: t,
      channel: channel,
      filter: state.filter,
      readonly: readonly,
      unread: state.unreadCount,
      filterOpen: state.filterOpen,
      onToggleFilter: actions.onToggleFilter,
      onJumpLatest: handleJumpLatest,
      onOpenTrajectory: actions.onOpenTrajectory
    }),
    state.filterOpen
      ? h(GcFilterMenu, {
          t: t,
          channel: channel,
          filter: state.filter,
          onSelect: actions.onSelectFilter
        })
      : null,
    h(GcBanners, {
      t: t,
      state: state,
      filterCount: filterCount,
      onClearFilter: actions.onClearFilter,
      onReconnect: actions.onReconnect
    }),
    state.composerFallback
      ? h(
          'div',
          { className: 'gc-banners' },
          h(
            'div',
            { className: 'gc-col' },
            h(
              'div',
              { className: 'gc-banner', 'data-testid': 'group-chat-composer-fallback', role: 'status' },
              t('composer.hostFallback')
            )
          )
        )
      : null,
    state.filter && visible.length === 0
      ? h('div', { className: 'gc-col' }, h(GcFilterEmpty, { t: t }))
      : null,
    h(GcFeed, {
      t: t,
      state: state,
      items: items,
      emptyKind: emptyKind,
      scrollRef: scrollRef,
      onScroll: handleScroll,
      onFold: actions.onFold,
      onMention: actions.onMention,
      onCopyMessage: actions.onCopyMessage,
      onOpenSession: actions.onOpenSession,
      onOpenFile: actions.onOpenFile,
      onOpenTrajectory: actions.onOpenTrajectory,
      onCaptionAction: actions.onCaptionAction,
      onCardAction: actions.onCardAction,
      onCopyTaskId: actions.onCopyTaskId,
      onRetryOpen: actions.onRetryOpen,
      onOpenChat: actions.onOpenChat
    }),
    state.trajectory
      ? h(GcTrajectoryPanel, {
          t: t,
          member: state.trajectory,
          turns: state.trajectoryTurns,
          hasOlder: false,
          onClose: actions.onCloseTrajectory,
          onLoadOlder: actions.onLoadOlderTurns
        })
      : null,
    h(GcUnreadPill, { t: t, count: state.unreadCount, onJumpLatest: handleJumpLatest }),
    h(GcComposer, {
      t: t,
      state: state,
      channel: channel,
      sessionId: sessionId,
      readonly: readonly,
      candidates: mentionCandidates,
      compositionRef: compositionRef,
      onTextChange: actions.onTextChange,
      onCaretChange: actions.onCaretChange,
      onFocusChange: actions.onFocusChange,
      onSend: actions.onSend,
      onSelectMention: actions.onSelectMention,
      onMoveMention: actions.onMoveMention,
      onHoverMention: actions.onHoverMention,
      onCloseMention: actions.onCloseMention,
      onRemoveMention: actions.onRemoveMention,
      onCloseFilter: actions.onCloseFilter
    }),
    h(GcToast, { text: state.toast && state.toast.text })
    )
  )
}

/* ── src/client/entry.js ──────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
 * entry.js — 插件浏览器半入口（唯一有副作用的文件）
 *
 * 由 scripts/build.mjs 拼在全部 parts 之后、factory 返回之前。
 * 唯一的副作用面：样式注入 + locale 注册 + conversation.view 注册（架构 §6.1）。
 * label 保持纯文本（S4：tab 无装饰位，不做未读圆点）。
 * ────────────────────────────────────────────────────────────────────────── */

const INJECT = ['slots', 'locale', 'sessions']

const GC_CSS_MARK = 'group-chat/group-chat.css'

/** 注入插件样式（按 data-plugin-css 判重，卸载时回收）。 */
function gcInsertStyle() {
  if (typeof document === 'undefined' || !document || !document.head) return function () {}
  const selector = 'style[data-plugin-css=' + JSON.stringify(GC_CSS_MARK) + ']'
  try {
    if (document.querySelector(selector)) return function () {}
  } catch {}
  const el = document.createElement('style')
  el.dataset.plugin = 'dsh-group-chat'
  el.dataset.pluginCss = GC_CSS_MARK
  el.textContent = GC_CSS
  document.head.appendChild(el)
  return function () {
    if (el.parentNode) el.parentNode.removeChild(el)
  }
}

/**
 * 从 LocaleFace 快照里取 active 语言码。
 * 真实 API（asar `dsh-client-locale/lib/client.js` 实证）：
 *   getSnapshot() → {active, locales, revision}；subscribe(fn) 伴随变化。
 * 同时兼容旧形状 get()/getLocale()/bind() 返回值。
 */
function gcLocaleCodeFromValue(value) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const raw = value.active || value.locale || value.tag || value.lang || (value.current && value.current.active)
  return typeof raw === 'string' ? raw : ''
}

function gcReadHostLocale(ctx) {
  const face = ctx && ctx.locale
  if (!face) return ''
  const readers = ['getSnapshot', 'getLocale', 'get']
  for (let i = 0; i < readers.length; i += 1) {
    const reader = face[readers[i]]
    if (typeof reader !== 'function') continue
    try {
      const code = gcLocaleCodeFromValue(reader.call(face))
      if (code) return code
    } catch {}
  }
  return ''
}

/**
 * 跟随宿主 locale：
 * - 首选 LocaleFace.getSnapshot().active（宿主中文 → 插件中文）；
 * - 服务不可用才回退 navigator.language（navigator 也没有则默认 zh，见 gcDetectLocale）。
 */
function gcSyncHostLocale(ctx) {
  const code = gcReadHostLocale(ctx)
  if (code) {
    gcSetLocale(code)
    return true
  }
  return false
}

/** 订阅宿主 locale 切换（触发 gcSetLocale → 视图重渲染 + label thunk 重读）。 */
function gcSubscribeHostLocale(ctx) {
  const face = ctx && ctx.locale
  if (!face || typeof face.subscribe !== 'function') return function () {}
  try {
    const unsubscribe = face.subscribe(function () {
      gcSyncHostLocale(ctx)
    })
    return typeof unsubscribe === 'function' ? unsubscribe : function () {}
  } catch {
    return function () {}
  }
}

function gcRegisterLocale(ctx) {
  if (!ctx || !ctx.locale || typeof ctx.locale.register !== 'function') return function () {}
  return ctx.locale.register(NS, { zh: GC_LOCALE.zh, en: GC_LOCALE.en })
}

/**
 * 插件 apply：样式 → 字典 → conversation.view 注册。
 * @param {object} ctx Cordis client context（inject: slots / locale / sessions）
 */
function apply(ctx) {
  gcSetPluginContext(ctx)

  if (ctx && typeof ctx.effect === 'function') {
    ctx.effect(function () {
      return gcInsertStyle()
    }, 'group-chat: styles')
    ctx.effect(function () {
      return gcRegisterLocale(ctx)
    }, 'group-chat: dictionaries')
    ctx.effect(function () {
      return function () {
        try {
          if (typeof document !== 'undefined' && document.body) document.body.classList.remove('gc-view-group-chat')
        } catch {}
      }
    }, 'group-chat: host composer restore')
  } else {
    gcInsertStyle()
    gcRegisterLocale(ctx)
  }

  // 先注册字典再读 active；读不到才回退 navigator（默认 zh）
  gcSyncHostLocale(ctx)
  if (ctx && typeof ctx.effect === 'function') {
    ctx.effect(function () {
      return gcSubscribeHostLocale(ctx)
    }, 'group-chat: locale sync')
  } else {
    gcSubscribeHostLocale(ctx)
  }

  if (!ctx || !ctx.slots || typeof ctx.slots.inject !== 'function' || typeof ctx.slots.register !== 'function') {
    gcWarn('slots service unavailable; conversation.view not registered')
    return
  }

  ctx.slots.inject('conversation.view', function () {
    return ctx.slots.register(
      {
        name: 'conversation.view',
        id: GC_VIEW_ID,
        order: GC_VIEW_ORDER,
        locale: NS,
        // label thunk：locale 切换后宿主重新投影 tab 行时自动重读
        label: function () {
          return gcTranslate('view.tab')
        },
        // 不返回 t / sessionId 等保留名：owner props 由渲染器合并且优先级最高
        inject: function () {
          return {}
        }
      },
      GroupChatView
    )
  })

  gcDebug('registered conversation.view', GC_VIEW_ID, 'order', GC_VIEW_ORDER, 'build', GC_BUILD_ID)
}

/** 纯函数导出（tester / 单测可直接取用，无需 React 环境）。 */
const __internals = {
  // 常量
  NS: NS,
  VIEW_ID: GC_VIEW_ID,
  VIEW_ORDER: GC_VIEW_ORDER,
  LIMITS: GC_LOCAL_LIMITS,
  SESSION_RANK: GC_SESSION_RANK,
  // 视图组件
  GroupChatView: GroupChatView,
  // 子组件（组件测试用）
  GcChannelHeader: GcChannelHeader,
  GcFeed: GcFeed,
  GcComposer: GcComposer,
  GcMemberJoinMessage: GcMemberJoinMessage,
  GcTaskCardMessage: GcTaskCardMessage,
  GcMessageRow: GcMessageRow,
  GcMentionPopup: GcMentionPopup,
  GcBanners: GcBanners,
  GcSkeleton: GcSkeleton,
  GcUnreadPill: GcUnreadPill,
  GcFilterMenu: GcFilterMenu,
  GcEmptyNoTeam: GcEmptyNoTeam,
  GcEmptyTeam: GcEmptyTeam,
  GcErrorState: GcErrorState,
  GcTargetRow: GcTargetRow,
  GcRichText: GcRichText,
  renderMdBlocks: gcRenderMdBlocks,
  renderMdInline: gcRenderMdInline,
  isEmptyAgentMessage: gcIsEmptyAgentMessage,
  GcMarkdown: GcMarkdown,
  GcTrajectoryPanel: GcTrajectoryPanel,
  GcMemberStrip: (typeof GcMemberStrip === 'function' ? GcMemberStrip : undefined),
  // 纯逻辑
  createStore: gcCreateStore,
  initialState: gcInitialState,
  mergeMessages: gcMergeMessages,
  sortMessages: gcSortMessages,
  buildFeed: gcBuildFeed,
  foldDecision: gcFoldDecision,
  filterMessages: gcFilterMessages,
  matchesFilter: gcMatchesFilter,
  resolveTargets: gcResolveTargets,
  mentionCandidates: gcMentionCandidates,
  mentionQuery: gcMentionQuery,
  insertMention: gcInsertMention,
  captionModel: gcCaptionModel,
  taskActionLabel: gcTaskActionLabel,
  taskStatusLabel: gcTaskStatusLabel,
  memberContextText: gcMemberContextText,
  memberModelText: gcMemberModelText,
  isAddressable: gcIsAddressable,
  isSingleAgent: gcIsSingleAgent,
  limits: gcLimits,
  translate: gcTranslate,
  translateIn: gcTranslateIn,
  setLocale: gcSetLocale,
  getLocale: gcGetLocale,
  subscribeLocale: gcSubscribeLocale,
  mergeRosterChannel: gcMergeRosterChannel,
  isContextNoise: gcIsContextNoise,
  sendDebugModel: gcSendDebugModel,
  sendDetailText: gcSendDetailText,
  sendDebugFromDeliveries: gcSendDebugFromDeliveries,
  debugFromException: gcDebugFromException,
  // F-07 本地批次（测试可直接读）
  localBatches: gcLocalBatches,
  rememberBatch: gcRememberBatch,
  pruneLocalBatches: gcPruneLocalBatches,
  lookupLocalBatchByRpc: gcLookupLocalBatchByRpc,
  localBatchIds: gcLocalBatchIds,
  closeBatch: gcCloseBatch,
  buildLabel: GC_BUILD_LABEL,
  // v1.7 helpers
  foldDecisionV17: gcFoldDecision,
  memberStripData: gcMemberStripData,
  memberWorkStatus: gcMemberWorkStatus,
  membersStatusModel: gcMembersStatusModel,
  isSettledNotice: gcIsSettledNotice,
  isSafeLinkUrl: gcIsSafeLinkUrl,
  resolveLeadSessionId: gcResolveLeadSessionId,
  loadTrajectoryTurns: gcLoadTrajectoryTurns,
  setDebugVisible: gcSetDebugVisible,
  debugVisible: gcDebugEnabled,
  normalizeRosterStatus: gcNormalizeRosterStatus,
  timeDividerText: gcTimeDividerText,
  createChannelSource: gcCreateChannelSource,
  createController: gcCreateController,
  performSend: gcPerformSend,
  saveDraft: gcSaveDraft,
  loadDraft: gcLoadDraft,
  diagnostics: gcDiagnostics,
  // 预览 fixture（?gc-preview=1 与截图核对用）
  previewMembers: gcPreviewMembers,
  previewChannel: gcPreviewChannel,
  previewMessages: gcPreviewMessages,
  createPreviewSource: gcCreatePreviewSource,
  createChannelSourceForTest: gcCreateChannelSource,
  createFakeState: gcInitialState
}


    return { inject: INJECT, apply: apply, __internals: __internals };
  },
});
