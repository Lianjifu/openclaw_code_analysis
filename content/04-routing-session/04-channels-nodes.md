# 04 · 通道与节点架构

> **学习要点**
> - 通道（Channel）和节点（Node）在架构中的定位有何本质区别？
> - 通道适配器的内部工作流程是怎样的？accountId 和 peerId 如何协作？
> - 节点提供哪些设备能力？连接流程是怎样的？
> - 多账号场景下如何通过 dmScope 和 accountId 实现隔离？

---

## 1. 通道架构

通道是消息的**"入口"与"出口"**，连接用户与 Gateway 的桥梁。

```mermaid
flowchart LR
    subgraph 用户层["用户端"]
        direction LR
        U1["Telegram"]:::chan
        U2["WhatsApp"]:::chan
        U3["Discord"]:::chan
        U4["Slack"]:::chan
        U5["Signal"]:::chan
        U6["WebChat"]:::chan
    end

    subgraph 适配层["通道适配器"]
        direction TB
        CA["Channel Adapter<br/>消息解析 + 格式转换"]:::adapter
    end

    subgraph 网关层["Gateway"]
        direction TB
        GW["Gateway<br/>控制平面"]:::gw
    end

    U1 & U2 & U3 & U4 & U5 & U6 --> CA --> GW

    classDef chan fill:#dbeafe,stroke:#3b82f6,color:#1e40af
    classDef adapter fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef gw fill:#d1fae5,stroke:#10b981,color:#065f46
```

### 通道适配器内部结构

```mermaid
flowchart TB
    subgraph 通道适配器["Channel Adapter 内部"]
        direction TB
        R["消息接收<br/>Inbound"]:::in
        --> P["消息解析<br/>Parse"]:::parse
        --> C["格式转换<br/>→ 内部 InboundMessage"]:::conv
        --> S["消息发送<br/>Outbound"]:::out
    end

    subgraph 账号管理
        A1["accountId 隔离<br/>多账号支持"]:::acct
        A2["故障隔离<br/>一账号宕机不影响其他"]:::acct
    end

    subgraph 会话路由
        S1["peerId 解析<br/>发送者身份"]:::route
        S2["dmScope 策略<br/>会话隔离级别"]:::route
    end

    P --> A1
    A1 --> C
    C --> S1 --> S2

    classDef in fill:#dbeafe,stroke:#3b82f6,color:#1e40af
    classDef parse fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef conv fill:#d1fae5,stroke:#10b981,color:#065f46
    classDef out fill:#d1fae5,stroke:#10b981,color:#065f46
    classDef acct fill:#fce7f3,stroke:#ec4899,color:#9d174d
    classDef route fill:#f1f5f9,stroke:#64748b,color:#1e293b
```

### 通道消息流转

```mermaid
sequenceDiagram
    participant U as User
    participant CA as Channel Adapter
    participant GW as Gateway
    participant RT as Router
    participant AG as Agent
    participant LLM as LLM

    Note over U,LLM: 入站
    U->>CA: [1] 发送消息（Telegram/Discord/...）
    CA->>CA: [2] 消息解析 + 协议转换
    CA->>GW: [3] InboundMessage（统一格式）
    GW->>RT: [4] 路由解析（sessionKey → agent）
    RT-->>GW: 路由结果

    Note over U,LLM: 执行
    GW->>AG: [5] 转发到 Agent
    AG->>LLM: [6] AI 推理
    LLM-->>AG: [7] 回复

    Note over U,LLM: 出站
    AG-->>GW: [8] routeReply
    GW->>CA: [9] 格式化回复
    CA-->>U: [10] 发送给用户
```

---

## 2. 通道类型

| 类型 | 通道 | 接入方式 |
|:----:|------|----------|
| **核心通道** 🏆 | Telegram, WhatsApp, Discord, Slack, Signal, iMessage, Google Chat, WebChat | Gateway 原生支持，统一管理 |
| **插件通道** | Matrix, Mattermost, Teams, LINE, Nostr, Twitch, Zalo, QQ, WeChat | 通过插件能力扩展 |

### 核心概念

| 概念 | 说明 | 作用 |
|------|------|------|
| **accountId** | 通道账号标识，支持多账号 | 同一通道可运行多个独立账号，故障隔离 |
| **peerId** | 用户/群组标识 | 区分不同发送者，路由到对应会话 |
| **dmScope** | 会话隔离策略 | 控制 DM 会话的隔离粒度 |

> **账号是一级实体**：同一 Channel 可运行多个 `accountId`，单个账号故障不影响其他账号。

### 配置参考

详见 [02 - 配置系统与热重载](../02-gateway-control/02-config-system.md) 中的通道管理配置：

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",     // pairing | allowlist | open | disabled
      allowFrom: ["tg:123"],
    },
  },
}
```

---

## 3. 节点系统

节点是连到 Gateway 的**设备**，不是另一个 Gateway。节点通过提供设备能力扩展 Gateway 的边界。

```mermaid
flowchart LR
    subgraph 节点类型["Node Types"]
        direction LR
        N1["📱 iOS 节点"]:::node
        N2["📱 Android 节点"]:::node
        N3["💻 macOS 节点"]:::node
        N4["⚙️ Headless 节点"]:::node
    end

    subgraph 连接流程["Connection"]
        direction TB
        P["🔗 设备配对<br/>role: node"]:::pair
        A["🔑 权限调用<br/>按 caps 授权"]:::auth
    end

    subgraph Gateway
        GW["Gateway<br/>控制平面"]:::gw
    end

    N1 & N2 & N3 & N4 --> P --> A --> GW

    classDef node fill:#dbeafe,stroke:#3b82f6,color:#1e40af
    classDef pair fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef auth fill:#fce7f3,stroke:#ec4899,color:#9d174d
    classDef gw fill:#d1fae5,stroke:#10b981,color:#065f46
```

### 节点类型与能力

| 节点类型 | 提供能力 | 典型场景 |
|----------|----------|----------|
| **iOS 节点** | Canvas 可视化、相机、语音、位置 | 手机端交互、拍照上传 |
| **Android 节点** | 聊天、语音、Canvas、相机 | 移动端自动化 |
| **macOS 节点** | 菜单栏应用、Canvas、桌面能力 | 桌面端操作、截图 |
| **Headless 节点** | 远程命令执行、自动化宿主 | CI/CD、远程服务器管理 |

### 连接流程

```
节点连接 → 声明 role: "node" → 上报 commands/caps
    → Gateway 配对批准 → 按权限调用能力
```

| 步骤 | 说明 | 验证 |
|:----:|------|------|
| ① 节点连接 | 通过 WebSocket 连接到 Gateway | 连接层握手 |
| ② 声明 role | 节点标识自身身份为 `role: "node"` | role 检查 |
| ③ 上报 caps | 上报支持的命令列表和能力集 | 能力注册 |
| ④ 配对批准 | Gateway 端审核并批准连接 | 管理员审批 |
| ⑤ 权限调用 | 按权限调用节点能力 | `authorizeGatewayMethod` |

### 核心概念

| 概念 | 说明 |
|------|------|
| **role: "node"** | 节点连接时声明的身份标识 |
| **commands** | 节点支持的命令列表 |
| **caps** | 节点提供的能力（capabilities） |
| **配对批准** | Gateway 端审核并批准设备连接 |
| **权限调用** | 按授权粒度调用节点能力 |

---

## 4. 通道 vs 节点

| 维度 | 通道（Channel） | 节点（Node） |
|:----:|-----------------|--------------|
| **定位** | 消息的入口/出口 | 设备能力的提供者 |
| **连接方向** | 用户 → 通道 → Gateway | 节点 → Gateway |
| **数据流向** | 用户 ↔ Gateway（双向通信） | 节点 → Gateway（能力注册 + 调用）|
| **角色** | 消息路由、协议适配 | 能力扩展、外设管理 |
| **代表** | Telegram、Discord、WhatsApp | iOS 手机、Android 平板、macOS 电脑 |
| **故障影响** | 单通道故障仅影响该入口 | 单节点故障不影响其他节点 |

---

> **相关模块**：[01 - 路由层与 Session Key](01-routing-engine.md) · [02 - 会话生命周期与重置](02-session-lifecycle.md) · [03 - 会话工具与子智能体](03-session-tools.md) · [02 - 配置系统与热重载](../02-gateway-control/02-config-system.md) · [09 - 并行专家通道](../09-extensions/04-parallel-lanes.md)
