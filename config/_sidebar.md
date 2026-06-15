# OpenClaw Agent 源码学习

> 基于 OpenClaw 源码深度分析的 AI Agent 原理学习文档

---

* **01. 系统架构基础**
* [01 · 分层架构全景](/01-architecture/01-layered-architecture)
* [02 · 核心概念模型](/01-architecture/02-core-concepts)
* [03 · 核心源码索引](/01-architecture/03-core-source-index)
* **02. 网关与控制平面**
* [01 · Gateway 定位与职责](/02-gateway-control/01-gateway-positioning)
* [02 · 配置系统与热重载](/02-gateway-control/02-config-system)
* [03 · WebSocket 协议层](/02-gateway-control/03-websocket-protocol)
* [04 · CLI 层与命令系统](/02-gateway-control/04-cli-command-system)
* **03. 智能体执行引擎**
* [01 · Agent Loop 工作流](/03-execution-engine/01-agent-loop-workflow)
* [02 · 队列与并发控制](/03-execution-engine/02-concurrency-control)
* [03 · 流式输出与事件机制](/03-execution-engine/03-streaming-events)
* [04 · 超时与生命周期](/03-execution-engine/04-timeout-lifecycle)
* **04. 路由与会话管理**
* [01 · 路由层与 Session Key](/04-routing-session/01-routing-engine)
* [02 · 会话生命周期与重置](/04-routing-session/02-session-lifecycle)
* [03 · 会话工具与子智能体](/04-routing-session/03-session-tools)
* [04 · 通道与节点架构](/04-routing-session/04-channels-nodes)
* **05. 上下文工程**
* [01 · 上下文窗口管理](/05-context-engineering/01-context-window)
* [02 · 上下文引擎](/05-context-engineering/02-context-engine)
* [03 · 压缩与修剪](/05-context-engineering/03-compaction-pruning)
* **06. 记忆系统**
* [01 · 记忆存储层](/06-memory-systems/01-memory-storage-layer)
* [02 · 主动检索层](/06-memory-systems/02-active-retrieval)
* [03 · 后台整理层](/06-memory-systems/03-consolidation-backends)
* **07. 工具与安全系统**
* [01 · 工具系统架构](/07-tools-safety/01-tool-system)
* [02 · 权限模式与审批](/07-tools-safety/02-permission-approval)
* [03 · 安全策略配置](/07-tools-safety/03-safety-strategy)
* **08. Provider 与模型管理**
* [01 · Provider 适配层](/08-provider-models/01-provider-adapters)
* [02 · 模型故障转移](/08-provider-models/02-model-failover)
* [03 · 认证管理](/08-provider-models/03-auth-cooldown)
* **09. 扩展机制**
* [01 · 插件系统](/09-extensions/01-plugin-system)
* [02 · 钩子系统](/09-extensions/02-hooks-system)
* [03 · 多智能体路由](/09-extensions/03-multi-agent-routing)
* [04 · 并行专家通道](/09-extensions/04-parallel-lanes)
* [05 · 工作区配置](/09-extensions/05-workspace-config)
