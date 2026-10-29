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

export {};
