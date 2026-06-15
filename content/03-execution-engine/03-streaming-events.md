# 03 · 流式输出与事件机制

> **学习要点**
> - 三类事件（lifecycle / assistant / tool）各自由谁产生、流向何处？
> - 流式输出的增量机制如何实现实时推送？
> - 事件桥接如何将 Pi 事件映射为 OpenClaw 的三路流？
> - 回复整形规则如何过滤 NO_REPLY 和重复项？

---

## 1. 事件类型（3 类）

OpenClaw 将 Agent 执行过程中的所有输出抽象为**三类事件流**：

| 流 | 来源 | 说明 | 客户端响应 |
|----|------|------|-----------|
| **lifecycle** | subscribeEmbeddedPiSession | 生命周期信号：start / end / error | 状态更新 |
| **assistant** | pi-agent-core | 助手增量文本流，LLM 回复 Token | 实时渲染 |
| **tool** | pi-agent-core | 工具调用事件：start / update / end | 执行工具 |

```mermaid
flowchart LR
    subgraph 事件源["事件产生源"]
        direction LR
        L1["lifecycle<br/>生命周期<br/>subscribeEmbeddedPiSession"]:::life
        L2["assistant<br/>助手增量<br/>pi-agent-core"]:::asst
        L3["tool<br/>工具事件<br/>pi-agent-core"]:::tool
    end

    subgraph 事件总线["事件桥接"]
        direction TB
        E["subscribeEmbeddedPiSession<br/>三路事件分离器"]:::bridge
    end

    subgraph 订阅层["订阅与稳定化"]
        S1["waitForCompactionRetry<br/>压缩等待"]:::sub
    end

    L1 --> E
    L2 --> E
    L3 --> E
    E --> S1

    classDef life fill:#fce7f3,stroke:#ec4899,color:#9d174d
    classDef asst fill:#dbeafe,stroke:#3b82f6,color:#1e40af
    classDef tool fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef bridge fill:#d1fae5,stroke:#10b981,color:#065f46
    classDef sub fill:#f1f5f9,stroke:#64748b,color:#1e293b
```

---

## 2. 流式输出机制

从 LLM 流式 Token 到客户端实时渲染的完整链路：

```mermaid
flowchart LR
    subgraph LLM 端["LLM 流式输出"]
        direction TB
        L1["LLM Stream"]:::llm
        L2["助手 Token 增量"]:::llm
        L3["工具调用信号"]:::llm
    end

    subgraph 桥接["Pi → OpenClaw 事件转换"]
        direction TB
        B1["assistant 事件<br/>stream: 'assistant'"]:::bridge
        B2["tool 事件<br/>stream: 'tool'"]:::bridge
        B3["lifecycle 事件<br/>stream: 'lifecycle'"]:::bridge
    end

    subgraph 客户端["客户端消费"]
        direction TB
        C1["实时渲染文本"]:::client
        C2["执行工具调用"]:::client
        C3["更新状态指示"]:::client
    end

    L1 --> L2 & L3
    L2 --> B1 --> C1
    L3 --> B2 --> C2
    L1 --> B3 --> C3

    classDef llm fill:#fce7f3,stroke:#ec4899,color:#9d174d
    classDef bridge fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef client fill:#dbeafe,stroke:#3b82f6,color:#1e40af
```

### 输出类型详解

| 输出类型 | 触发时机 | 事件格式 | 客户端行为 |
|----------|----------|----------|-----------|
| **助手增量** | LLM 持续生成 Token 时 | `assistant` 流，每次 delta | 逐步渲染到回复框 |
| **块流式** | `text_end` / `message_end` | 完整的文本块 | 确认段落完成 |
| **推理流式** | LLM 在思考时 | `reasoning` 流 | 显示"思考中..." |
| **工具调用** | LLM 请求执行工具 | `tool` 流：start → update → end | UI 显示工具执行状态 |

---

## 3. 事件桥接（Event Bridge）

Pi Agent Core 产生的事件通过 `subscribeEmbeddedPiSession` 桥接到 OpenClaw 的事件系统：

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as Gateway
    participant PI as Pi Agent Core
    participant SS as Subscribe Bridge
    participant M as AI Model

    Note over C,M: 第 1 步：订阅
    GW->>PI: runEmbeddedPiAgent()
    PI->>SS: subscriber

    Note over C,M: 第 2 步：LLM 流式响应
    PI->>M: model.generate()
    M-->>PI: stream: text delta
    PI-->>SS: tool: start → update → end
    PI-->>SS: assistant: delta
    PI-->>SS: lifecycle: start
    M-->>PI: stream: message_end
    PI-->>SS: lifecycle: end

    Note over C,M: 第 3 步：桥接转发
    SS-->>GW: tool 事件流
    SS-->>GW: assistant 事件流
    SS-->>GW: lifecycle 事件

    Note over C,M: 第 4 步：客户端接收
    GW-->>C: 流式推送
```

### 映射关系

| Pi 事件 | OpenClaw 流 | 桥接行为 |
|---------|-------------|----------|
| **工具事件** | `stream: "tool"` | 按 start → update → end 序列透传，合并连续 update |
| **助手增量** | `stream: "assistant"` | 每个文本 delta 转为独立事件，保持顺序 |
| **生命周期** | `stream: "lifecycle"` | phase 字段区分 start/end/error |

---

## 4. 回复整形规则

在最终回复发出之前，OpenClaw 应用以下整形规则：

```mermaid
flowchart TB
    RAW["原始回复负载"]:::start
    --> A1["组装载荷<br/>助手文本 + 推理 + 工具摘要 + 错误"]:::assemble
    --> F1{"NO_REPLY 标记?"}:::filter
    F1 -->|"是"| DROP["❌ 丢弃<br/>静默 Token"]:::drop
    F1 -->|"否"| F2{"消息工具<br/>重复项?"}:::filter
    F2 -->|"是"| RM["移除重复"]:::drop
    F2 -->|"否"| F3{"无可渲染负载<br/>+ 工具错误?"}:::filter
    F3 -->|"是"| FALLBACK["备用错误回复"]:::fallback
    F3 -->|"否"| OUT["✅ 最终负载"]:::done

    classDef start fill:#f1f5f9,stroke:#64748b,color:#1e293b
    classDef assemble fill:#dbeafe,stroke:#3b82f6,color:#1e40af
    classDef filter fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef drop fill:#fee2e2,stroke:#ef4444,color:#991b1b
    classDef fallback fill:#fce7f3,stroke:#ec4899,color:#9d174d
    classDef done fill:#d1fae5,stroke:#10b981,color:#065f46
```

| 规则 | 行为 | 触发条件 |
|------|------|----------|
| **NO_REPLY 过滤** | 视为静默 Token，从出站负载中完全移除 | Agent 返回 NO_REPLY 标记 |
| **消息工具重复** | 从最终负载列表中移除重复的助手确认消息 | 模型多次返回相同工具确认 |
| **无可渲染负载 + 错误** | 返回备用错误回复，而不是空回复 | 无有效文本 + 存在工具错误 |

---

## 5. 聊天通道处理

| 阶段 | 说明 |
|------|------|
| **增量缓冲** | 助手增量被缓冲为聊天 delta 消息 |
| **Final 发出** | 在 `lifecycle end/error` 时发出完整的聊天 final |

### 压缩（Compaction）事件流

压缩过程中的事件处理：

```mermaid
flowchart LR
    C1["触发压缩<br/>上下文窗口接近上限"]:::trigger
    --> C2["发出 compaction 流事件"]:::event
    --> C3["重试原始请求<br/>用压缩后的上下文"]:::retry
    --> C4["内存缓冲区重置"]:::reset
    --> C5["工具摘要重置"]:::reset
    --> C6["避免重复输出<br/>按幂等键去重"]:::done

    classDef trigger fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef event fill:#fce7f3,stroke:#ec4899,color:#9d174d
    classDef retry fill:#dbeafe,stroke:#3b82f6,color:#1e40af
    classDef reset fill:#fee2e2,stroke:#ef4444,color:#991b1b
    classDef done fill:#d1fae5,stroke:#10b981,color:#065f46
```

---

## 6. 工具执行事件

工具事件流包含三个阶段：

| 阶段 | 事件 | 说明 | 示例 |
|:----:|------|------|------|
| **① start** | `tool: start` | 工具开始执行 | `read("file.txt")` 开始 |
| **② update** | `tool: update` | 进度更新（可选） | 已读取 50% |
| **③ end** | `tool: end` | 执行完成，携带结果 | `file.txt` 内容返回 |

### 工具结果清理

| 清理项 | 说明 |
|--------|------|
| **大小限制** | 大型工具结果自动截断 |
| **图像负载** | 图像类型结果按 token 限制清理 |
| **消息工具追踪** | 抑制重复的助手确认，避免冗余输出 |

---

> **相关模块**：[01 - Agent Loop 工作流](01-agent-loop-workflow.md) · [02 - 队列与并发控制](02-concurrency-control.md) · [04 - 超时与生命周期](04-timeout-lifecycle.md) · [01 - 上下文工程](../05-context-engineering/01-context-window.md)
