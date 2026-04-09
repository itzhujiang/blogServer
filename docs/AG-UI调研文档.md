# AG-UI 调研文档

## 概述

AG-UI 是一个面向 AI Agent 与前端应用之间通信的轻量级事件协议。它的目标是统一 Agent 后端与用户界面之间的交互方式，让前端能够以流式、事件驱动的方式接收消息、状态变更、工具调用结果等内容。

本次通过 Context7 查询到的官方相关库入口为：

- Context7 库 ID：`/ag-ui-protocol/ag-ui`

## 当前确认到的主要 `@ag-ui` 生态包

### 1. `@ag-ui/core`

用途：
- 提供 AG-UI 协议的核心类型、事件模型、消息结构和基础接口。
- 适合作为 TypeScript 项目的协议层依赖。

安装：

```bash
npm install @ag-ui/core
```

适用场景：
- 需要直接使用协议类型定义。
- 需要实现自定义客户端、服务端或中间层。

---

### 2. `@ag-ui/client`

用途：
- 官方 JS / TS 客户端 SDK。
- 用于在前端或客户端应用中连接 AG-UI Agent 服务。
- 用于处理事件流、运行状态和协议通信。

安装：

```bash
npm install @ag-ui/client
```

常见组合安装：

```bash
npm install @ag-ui/core @ag-ui/client
```

适用场景：
- 浏览器端或前端应用接入 AG-UI 后端。
- 需要消费 Agent 的流式事件。

---

### 3. `@ag-ui/mastra`

用途：
- 用于 Mastra 生态与 AG-UI 协议的集成。
- 让 Mastra Agent 更方便地接入 AG-UI。

文档里出现的安装方式：

```bash
pnpm add @ag-ui/client @ag-ui/core @ag-ui/mastra
pnpm add @mastra/core @mastra/client-js @mastra/memory @mastra/libsql
pnpm add zod
```

适用场景：
- 项目本身使用 Mastra。
- 希望将 Mastra Agent 输出为 AG-UI 兼容事件流。

---

### 4. `@ag-ui/ag2`

用途：
- 用于 AG2 集成的适配包。
- 文档中明确存在安装方式，说明其为可安装 npm 包。

安装：

```bash
npm install @ag-ui/ag2
```

适用场景：
- 项目使用 AG2，并希望接入 AG-UI 协议。

---

### 5. `@ag-ui/llamaindex`

用途：
- 用于 LlamaIndex 集成的适配包。
- 文档中明确存在安装方式，说明其为可安装 npm 包。

安装：

```bash
npm install @ag-ui/llamaindex
```

适用场景：
- 项目使用 LlamaIndex，并希望对接 AG-UI。

---

### 6. `@ag-ui/mcp-apps-middleware`

用途：
- 一个 AG-UI 中间件包。
- 查询结果中出现了从该包导入工具常量和辅助函数的示例，例如 `MCPAppsActivityType`、`getServerHash`。

示例导入：

```typescript
import {
  MCPAppsActivityType,
  getServerHash
} from "@ag-ui/mcp-apps-middleware"
```

适用场景：
- 需要在 AG-UI 事件链路中增加面向 MCP Apps 的中间件能力。

## React / 前端 UI 集成结论

目前通过 Context7 查询结果，**没有明确查到官方 `@ag-ui/react` 这类 React 专用包**。

现阶段更明确的信息是：

- AG-UI 官方提供了 `@ag-ui/client` 作为前端/客户端接入层。
- React UI 层集成在文档中更多是通过 **CopilotKit** 这类已兼容 AG-UI 的前端工具实现。
- 文档中明确提到：可以将前端工具直接指向 AG-UI Agent endpoint，以获得现成的聊天 UI 能力。

这意味着当前前端接入思路更像是：

1. 后端实现 AG-UI 兼容 Agent 接口。
2. 前端使用 `@ag-ui/client` 或兼容 AG-UI 的前端工具。
3. 如需 React 聊天界面，可优先关注 CopilotKit 等兼容方案。

## 已确认的典型安装方式

### 最小 TypeScript 接入

```bash
npm install @ag-ui/core @ag-ui/client
```

### Mastra 集成

```bash
pnpm add @ag-ui/client @ag-ui/core @ag-ui/mastra
pnpm add @mastra/core @mastra/client-js @mastra/memory @mastra/libsql
pnpm add zod
```

### AG2 集成

```bash
npm install @ag-ui/ag2
```

### LlamaIndex 集成

```bash
npm install @ag-ui/llamaindex
```

## `@ag-ui/client` 核心 API

`@ag-ui/client` 是 AG-UI 在 JavaScript / TypeScript 侧最核心的客户端 SDK。根据 Context7 当前能查到的文档，它的能力可以概括为：

- 通过 `HttpAgent` 连接远程 AG-UI Agent
- 通过 `runAgent()` 发起一次运行
- 通过事件流接收增量消息与运行状态
- 维护会话中的 `messages` 与 `state`
- 通过 middleware 机制扩展客户端行为

### 1. `HttpAgent`

这是 `@ag-ui/client` 最重要的入口类。

典型初始化方式：

```typescript
import { HttpAgent } from "@ag-ui/client"

const agent = new HttpAgent({
  url: "https://your-agent-endpoint.com/agent",
  headers: {
    Authorization: "Bearer token",
  },
  threadId: "conversation-123",
  initialMessages: [],
  initialState: {},
  debug: false,
})
```

常见配置项：
- `url`：AG-UI 服务端地址
- `headers`：请求头，例如鉴权信息
- `threadId`：会话线程 ID
- `initialMessages`：初始消息列表
- `initialState`：初始状态
- `debug`：调试开关
- 部分文档片段中还出现了 `agentId`

### 2. 消息与状态管理

`HttpAgent` 实例会维护当前消息和状态。

常见成员：
- `agent.messages`：当前消息列表
- `agent.state`：当前状态
- `agent.addMessage(message)`：追加消息
- `agent.abortRun()`：中止当前运行

示例：

```typescript
import type { Message } from "@ag-ui/core"

const userMessage: Message = {
  id: "msg-1",
  role: "user",
  content: "你好",
}

agent.addMessage(userMessage)

console.log(agent.messages)
console.log(agent.state)
```

### 3. `runAgent()`

`runAgent()` 是发起一次 Agent 运行的核心方法。

查询结果中常见输入字段包括：
- `runId`
- `tools`
- `context`
- `messages`
- `state`
- `forwardedProps`

示例：

```typescript
const result = await agent.runAgent({
  tools: [
    {
      name: "search",
      description: "Search docs",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  ],
  context: [
    { description: "Current date", value: new Date().toISOString() },
  ],
  forwardedProps: {
    temperature: 0.7,
  },
})
```

### 4. 事件流处理

Context7 返回的文档里，`runAgent()` 出现了两种使用形式：

#### 形式 A：返回结果对象

```typescript
const { result, newMessages } = await agent.runAgent({
  tools,
  context,
})
```

#### 形式 B：返回可订阅事件流

```typescript
agent.runAgent({
  runId: "run_123",
  tools: [],
  context: [],
}).subscribe({
  next: (event) => {
    console.log(event.type)
  },
  error: (error) => console.error(error),
  complete: () => console.log("done"),
})
```

基于当前查到的资料，更稳妥的理解是：`@ag-ui/client` 的核心模型是围绕事件流展开的，前端通常需要基于事件逐步渲染 UI。

### 5. 事件类型

文档示例中，通常配合 `EventType` 处理不同阶段的事件。

示例：

```typescript
import { EventType } from "@ag-ui/core"

agent.runAgent({
  tools: [],
  context: [],
}).subscribe({
  next: (event) => {
    switch (event.type) {
      case EventType.TEXT_MESSAGE_CONTENT:
        console.log("增量文本:", event.delta)
        break
      case EventType.RUN_ERROR:
        console.error("运行失败")
        break
    }
  }
})
```

当前查询结果中常见的事件语义包括：
- `RUN_STARTED`
- `TEXT_MESSAGE_START`
- `TEXT_MESSAGE_CONTENT`
- `TEXT_MESSAGE_END`
- `RUN_FINISHED`
- `RUN_ERROR`

### 6. `RunAgentInput`

`@ag-ui/client` 会直接消费协议层的 `RunAgentInput`。

常见字段可理解为：

```typescript
type RunAgentInput = {
  threadId?: string
  runId?: string
  messages?: Message[]
  tools?: Tool[]
  context?: Context[]
  state?: unknown
  forwardedProps?: Record<string, unknown>
}
```

常见用途：
- `messages`：当前对话消息
- `tools`：可调用工具定义
- `context`：额外上下文
- `state`：共享状态
- `forwardedProps`：透传给后端的额外参数

### 7. Middleware 机制

`@ag-ui/client` 明确支持中间件扩展。

当前查询结果中出现的核心成员包括：
- `Middleware`
- `MiddlewareFunction`
- `AbstractAgent`
- `FilterToolCallsMiddleware`
- `BaseEvent`

`Middleware` 抽象结构如下：

```typescript
interface EventWithState {
  event: BaseEvent
  messages: Message[]
  state: unknown
}

abstract class Middleware {
  abstract run(
    input: RunAgentInput,
    next: AbstractAgent
  ): Observable<BaseEvent>

  protected runNext(
    input: RunAgentInput,
    next: AbstractAgent
  ): Observable<BaseEvent>

  protected runNextWithState(
    input: RunAgentInput,
    next: AbstractAgent
  ): Observable<EventWithState>
}
```

### 8. 中间件使用方式

函数式中间件示例：

```typescript
const loggingMiddleware = (input, next) => {
  return next.run(input)
}
```

类式中间件示例：

```typescript
import { Middleware } from "@ag-ui/client"
import { tap, finalize } from "rxjs/operators"

class MetricsMiddleware extends Middleware {
  private totalEvents = 0

  run(input, next) {
    let runEvents = 0

    return this.runNext(input, next).pipe(
      tap(() => {
        runEvents++
        this.totalEvents++
      }),
      finalize(() => {
        console.log(`Run events: ${runEvents}, total: ${this.totalEvents}`)
      })
    )
  }
}
```

挂载方式：

```typescript
import { HttpAgent, FilterToolCallsMiddleware } from "@ag-ui/client"

const agent = new HttpAgent({ url: "https://api.example.com/agent" })

agent.use(
  loggingMiddleware,
  new MetricsMiddleware(),
  new FilterToolCallsMiddleware({
    allowedToolCalls: ["search", "calculate"],
  })
)
```

### 9. API 结构总结

基于当前 Context7 可查文档，`@ag-ui/client` 的核心 API 可以总结为：

- `HttpAgent`：连接远程 AG-UI Agent
- `runAgent()`：发起运行
- `messages` / `state` / `addMessage()`：维护会话上下文
- `abortRun()`：中止当前运行
- `Middleware` / `MiddlewareFunction`：扩展运行链路
- `FilterToolCallsMiddleware`：限制工具调用
- `BaseEvent` / 事件流：接收实时输出

如果后续继续深挖，建议单独再查：
- `HttpAgent.runAgent()` 的完整签名
- 事件类型枚举完整表
- 浏览器端最小可运行示例

## Node / Express 服务端实现 AG-UI endpoint

根据当前 Context7 可查到的资料，AG-UI 服务端的核心思路很明确：

1. 提供一个 HTTP POST endpoint。
2. 接收 `RunAgentInput` 风格的请求体。
3. 在服务端内部调用实际的大模型或 Agent 框架。
4. 将运行过程转换为 AG-UI 事件。
5. 以 **Server-Sent Events（SSE）** 的形式持续返回给客户端。

也就是说，AG-UI 的服务端本质上是一个“把 Agent 运行过程编码为事件流并通过 HTTP 输出”的接口。

### 1. endpoint 形态

当前查询结果中，AG-UI endpoint 的典型调用形式是：

```http
POST /agent/:name
Content-Type: application/json

{
  "threadId": "optional-thread-id",
  "runId": "optional-run-id",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}
```

返回值不是普通 JSON，而是 SSE 事件流，例如：

```text
data: {"type":"RUN_STARTED","threadId":"...","runId":"...","timestamp":...}

data: {"type":"TEXT_MESSAGE_START","messageId":"...","role":"assistant","timestamp":...}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"...","delta":"Hello","timestamp":...}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"...","delta":"!","timestamp":...}

data: {"type":"TEXT_MESSAGE_END","messageId":"...","timestamp":...}

data: {"type":"RUN_FINISHED","threadId":"...","runId":"...","timestamp":...}
```

这说明前端客户端并不是等待一次性响应，而是消费一连串运行事件。

### 2. 服务端职责拆解

一个 JavaScript / TypeScript 服务端如果要实现 AG-UI endpoint，通常需要完成这些职责：

- 解析客户端传入的 `threadId`、`runId`、`messages`、`tools`、`context`、`state`
- 调用实际模型或 Agent 执行器
- 把文本输出拆成 AG-UI 文本事件
- 把工具调用拆成 AG-UI 工具事件
- 在开始、结束、失败时发送生命周期事件
- 用 SSE 将事件按顺序推送给前端

### 3. 关键事件序列

服务端常见的最小事件链路通常包括：

- `RUN_STARTED`
- `TEXT_MESSAGE_START`
- `TEXT_MESSAGE_CONTENT`
- `TEXT_MESSAGE_END`
- `RUN_FINISHED`

如果有异常，则补充：

- `RUN_ERROR`

如果存在工具调用，还会看到类似事件：

- `TOOL_CALL_START`
- `TOOL_CALL_ARGS`
- `TOOL_CALL_END`

如果服务端要主动同步状态，还可能出现：

- `STATE_SNAPSHOT`

### 4. 服务端实现模式

当前文档里虽然没有直接给出 Express 专用官方完整示例，但已经能看出推荐模式：

#### 模式 A：直接实现一个 HTTP + SSE endpoint

这种模式最直观：
- Express 路由接收 POST 请求
- 设置 SSE 响应头
- 一边执行 Agent，一边 `res.write()` 输出事件
- 最后结束连接

这类 endpoint 的协议重点不在框架本身，而在于：
- 输入符合 `RunAgentInput`
- 输出符合 AG-UI 事件流

#### 模式 B：先实现一个 `AbstractAgent`，再暴露成 HTTP endpoint

Context7 查询结果中出现了这种模式：

```typescript
import {
  AbstractAgent,
  RunAgentInput,
  EventType,
  BaseEvent,
} from "@ag-ui/client"
import { Observable } from "rxjs"

class SimpleAgent extends AbstractAgent {
  run(input: RunAgentInput) {
    return () =>
      new Observable<BaseEvent>((observer) => {
        observer.next({
          type: EventType.RUN_STARTED,
          threadId: input.threadId,
          runId: input.runId,
        } as any)

        const messageId = Date.now().toString()

        observer.next({
          type: EventType.TEXT_MESSAGE_START,
          messageId,
          role: "assistant",
        } as any)

        observer.next({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId,
          delta: "Hello, world!",
        } as any)

        observer.next({
          type: EventType.TEXT_MESSAGE_END,
          messageId,
        } as any)

        observer.next({
          type: EventType.RUN_FINISHED,
          threadId: input.threadId,
          runId: input.runId,
        } as any)

        observer.complete()
      })
  }
}
```

这个示例表明：服务端实现可以先聚焦“如何产出标准事件流”，再由 HTTP 层把事件流发送给客户端。

### 5. 对接真实模型的实现思路

查询结果中还出现了一个 TypeScript 示例：通过 OpenAI 的流式返回，把输出转换成 AG-UI 事件。

其核心思路是：

- 收到 `RunAgentInput`
- 调用 OpenAI `chat.completions.create({ stream: true })`
- 文本 chunk 到来时发出 `TEXT_MESSAGE_*` 事件
- tool call chunk 到来时发出 `TOOL_CALL_*` 事件
- 完成时发出 `RUN_FINISHED`
- 失败时发出 `RUN_ERROR`

这说明 AG-UI 服务端并不强依赖某个特定框架，关键是把底层模型输出映射为 AG-UI 事件。

### 6. Express 中可参考的最小实现思路

虽然当前 Context7 没直接给到完整 Express 官方代码，但可以明确整理出 Express 侧的最小实现结构：

```typescript
app.post("/agent", async (req, res) => {
  // 1. 读取 RunAgentInput
  // 2. 设置 SSE headers
  // 3. 发送 RUN_STARTED
  // 4. 调用实际模型 / Agent
  // 5. 按 chunk 输出 TEXT_MESSAGE_CONTENT / TOOL_CALL_ARGS 等事件
  // 6. 发送 RUN_FINISHED 或 RUN_ERROR
  // 7. res.end()
})
```

在 Express 中，重点通常包括：

- 响应头设置为 SSE
- 按 AG-UI 事件格式逐条输出
- 保证事件顺序正确
- 客户端断开时停止底层任务

### 7. 服务端设计建议

如果在 Node / Express 中落地 AG-UI，建议按下面的层次拆分：

- **Route 层**：接收 HTTP 请求，建立 SSE 响应
- **Agent 层**：把模型推理过程转换成 AG-UI 事件
- **Adapter 层**：适配 OpenAI、Mastra、LlamaIndex 等后端执行器
- **Encoder / Stream 层**：把事件序列写回客户端

这种拆法更容易维护，也更便于后续替换底层模型提供方。

### 8. 当前结论

对于 Node / Express 服务端，AG-UI 的关键不是某个特定 server SDK，而是遵循以下约定：

- 请求：接收 `RunAgentInput` 风格的 JSON
- 响应：返回 `text/event-stream`
- 过程：持续输出 AG-UI 协议事件
- 生命周期：明确发送 `RUN_STARTED`、`RUN_FINISHED`、`RUN_ERROR`
- 内容流：按需发送文本事件、工具事件、状态事件

因此，如果你后续要在本项目里接入，最现实的路线通常是：

1. 用 Express 增加一个 AG-UI POST endpoint
2. 在内部调用你的 AI/Agent 服务
3. 把返回内容编码成 AG-UI SSE 事件流
4. 前端通过 `@ag-ui/client` 的 `HttpAgent` 连接这个 endpoint

## 当前调研结论

优先级最高、最基础的两个包是：

- `@ag-ui/core`：协议类型层
- `@ag-ui/client`：客户端接入层

如果你使用特定 Agent 框架，可以继续看对应适配包：

- `@ag-ui/mastra`
- `@ag-ui/ag2`
- `@ag-ui/llamaindex`

如果你关注前端 React UI，当前更明确的方向不是 `@ag-ui/react`，而是：

- `@ag-ui/client`
- 兼容 AG-UI 的前端框架/工具，例如 CopilotKit

## 后续建议查询方向

如果后续继续用 Context7 深挖，建议优先查这几个主题：

1. `@ag-ui/client` 的核心 API 和最小示例。
2. Node / Express 如何实现 AG-UI 服务端端点。
3. CopilotKit 如何对接 AG-UI。
4. `@ag-ui/mastra`、`@ag-ui/ag2`、`@ag-ui/llamaindex` 各自的最小接入示例。

## 信息来源说明

以上内容基于 Context7 中 AG-UI 文档与代码说明整理，属于当前可查到的包级别概览。对某些包的内部 API 细节，仍建议后续单独逐包查询。