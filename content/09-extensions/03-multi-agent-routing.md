# 03 · 多智能体路由

> **学习要点**
> - 什么是"一个 Agent"？它在系统中拥有哪些独立的资源？
> - 路由规则如何按"最具体优先"原则决定消息去哪个 Agent？
> - 如何配置多 Agent 场景？binding 的匹配维度有哪些？
> - 每 Agent 如何独立配置沙箱和工具策略？

---

## 1. 什么是"一个 Agent"

一个 Agent 是完全作用域化的大脑，拥有自己独立的资源：

```mermaid
flowchart TB
    subgraph AgentA["🤖 Agent: alex"]
        direction TB
        A1["工作区<br/>AGENTS.md / SOUL.md<br/>本地笔记"]:::res
        A2["认证配置<br/>auth-profiles.json<br/>私有 API Key"]:::res
        A3["会话存储<br/>聊天历史<br/>路由状态"]:::res
    end

    subgraph AgentB["🤖 Agent: mia"]
        direction TB
        B1["工作区<br/>AGENTS.md / SOUL.md<br/>本地笔记"]:::res
        B2["认证配置<br/>auth-profiles.json<br/>私有 API Key"]:::res
        B3["会话存储<br/>聊天历史<br/>路由状态"]:::res
    end

    classDef res fill:#dbeafe,stroke:#3b82f6,color:#1e40af
```

### 单智能体模式（默认）

```
agentId: main
会话键: agent:main:
工作区: ~/.openclaw/workspace
```

### 多智能体 = 多人格、多身份

```
agent:alex  → 工作区 + 认证 + 会话 完全隔离
agent:mia   → 工作区 + 认证 + 会话 完全隔离
```

---

## 2. 路由规则

绑定是**确定性的**且**最具体的优先**，逐级降级到兜底 Agent：

```mermaid
flowchart TB
    TITLE["路由匹配优先级（从高到低）"]:::title

    P1["① peer 精确匹配<br/>私聊对象 ID"]:::p1
    P2["② parentPeer 继承<br/>回复链继承"]:::p2
    P3["③ guildId + roles<br/>Discord 角色路由"]:::p3
    P4["④ guildId<br/>整个 Discord 服务器"]:::p4
    P5["⑤ teamId<br/>Slack 团队"]:::p5
    P6["⑥ accountId<br/>通道账号"]:::p6
    P7["⑦ channel<br/>整个通道"]:::p7
    P8["⑧ 回退到默认 Agent"]:::p8

    TITLE --> P1
    P1 -->|"未命中"| P2 -->|"未命中"| P3
    P3 -->|"未命中"| P4 -->|"未命中"| P5
    P5 -->|"未命中"| P6 -->|"未命中"| P7
    P7 -->|"未命中"| P8

    classDef title fill:#f1f5f9,stroke:#64748b,color:#1e293b
    classDef p1 fill:#fee2e2,stroke:#ef4444,color:#991b1b
    classDef p2 fill:#fee2e2,stroke:#ef4444,color:#991b1b
    classDef p3 fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef p4 fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef p5 fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef p6 fill:#dbeafe,stroke:#3b82f6,color:#1e40af
    classDef p7 fill:#dbeafe,stroke:#3b82f6,color:#1e40af
    classDef p8 fill:#d1fae5,stroke:#10b981,color:#065f46
```

---

## 3. 配置示例

### 两个 WhatsApp → 两个 Agent

```json5
{
  agents: {
    list: [
      { id: "home", default: true, name: "Home", workspace: "~/.openclaw/workspace-home" },
      { id: "work", name: "Work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

### WhatsApp 日常聊天 + Telegram 深度工作

```json5
{
  agents: {
    list: [
      { id: "chat", name: "Everyday", workspace: "~/.openclaw/workspace-chat" },
      { id: "opus", name: "Deep Work", workspace: "~/.openclaw/workspace-opus" },
    ],
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } },
  ],
}
```

### 同一通道，一个 DM 到 Opus

```json5
{
  bindings: [
    // peer 精确匹配优先于通道匹配
    { agentId: "opus", match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551234567" } } },
    { agentId: "chat", match: { channel: "whatsapp" } },
  ],
}
```

### 家庭群组 Bot

```json5
{
  agents: {
    list: [{
      id: "family",
      identity: { name: "Family Bot" },
      groupChat: { mentionPatterns: ["@family", "@familybot"] },
      sandbox: { mode: "all", scope: "agent" },
      tools: {
        allow: ["read", "sessions_list", "sessions_history", "sessions_send", "session_status"],
        deny: ["exec", "write", "edit", "browser", "nodes", "cron"],
      },
    }],
  },
  bindings: [
    { agentId: "family", match: { channel: "whatsapp", peer: { kind: "group", id: "1203639999@g.us" } } },
  ],
}
```

---

## 4. 每 Agent 沙箱和工具配置

可以为每个 Agent 独立配置沙箱模式和工具策略：

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        sandbox: { mode: "off" },                // 个人 Agent 不使用沙箱
      },
      {
        id: "family",
        sandbox: { mode: "all", scope: "agent" }, // 家庭 Bot 全部沙箱化
        tools: {
          allow: ["read"],
          deny: ["exec", "write", "edit", "apply_patch", "browser"],
        },
      },
    ],
  },
}
```

---

> **相关模块**：[04 - 并行专家通道](04-parallel-lanes.md) · [05 - Agent Workspace 配置](05-workspace-config.md) · [04 - 路由层与 Session Key](../04-routing-session/01-routing-engine.md) · [02 - 配置系统与热重载](../02-gateway-control/02-config-system.md)
