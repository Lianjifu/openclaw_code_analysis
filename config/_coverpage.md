# OpenClaw Agent 源码学习

> Observable Agent · 基于 OpenClaw 源码深度分析的 AI Agent 原理学习文档

---

## 项目目标

通过深度分析 **OpenClaw** 企业级 AI Agent 平台的源码，系统学习 AI Agent 的核心原理与实现技术：

| 学习维度 | 目标 |
|------|------|
| **系统架构** | 理解分层架构、控制平面设计 |
| **执行引擎** | 掌握 Agent Loop、队列并发、流式机制 |
| **路由会话** | 学习会话管理、消息路由设计 |
| **上下文记忆** | 上下文窗口管理、三层记忆体系 |
| **工具安全** | 理解工具系统、权限审批设计 |
| **扩展机制** | 学习插件系统、钩子、多智能体 |

---

## 快速导航

| 章节 | 内容 |
|------|------|
| [系统架构基础](./01-architecture/01-layered-architecture) | 分层架构、核心概念、源码索引 |
| [网关与控制平面](./02-gateway-control/01-gateway-positioning) | Gateway、配置系统、WebSocket、CLI |
| [智能体执行引擎](./03-execution-engine/01-agent-loop-workflow) | Agent Loop、并发控制、流式事件 |
| [路由与会话管理](./04-routing-session/01-routing-engine) | 路由层、Session Key、会话工具 |
| [上下文工程](./05-context-engineering/01-context-window) | 上下文窗口、引擎、压缩修剪 |
| [记忆系统](./06-memory-systems/01-memory-storage-layer) | 三层体系：存储层→检索层→整理层 |
| [工具与安全系统](./07-tools-safety/01-tool-system) | 工具架构、权限审批、安全配置 |
| [Provider 与模型管理](./08-provider-models/01-provider-adapters) | Provider 层、模型故障转移 |
| [扩展机制](./09-extensions/01-plugin-system) | 插件系统、钩子、多智能体、工作区 |

---

*Powered by OpenClaw 源码分析 · 2026-06*
