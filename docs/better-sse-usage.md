# Better-SSE 使用文档

## 简介

Better-SSE 是一个轻量级、无依赖、符合规范的服务器推送事件（SSE）实现库，使用 TypeScript 编写。它提供了框架无关且功能丰富的解决方案，用于从服务器向客户端推送数据。

**特点**：
- 原生 TypeScript 支持，类型安全
- 无外部依赖
- 支持 Express、Hono 等框架
- 内置会话管理和心跳机制
- 支持自定义事件类型
- 完善的错误处理

## 安装

```bash
npm install better-sse
```

## 基本使用

### 1. 创建简单的 SSE 端点

```typescript
import express from "express"
import { createSession } from "better-sse"

const app = express()

app.get("/sse", async (req, res) => {
    const session = await createSession(req, res)
    session.push("Hello world!")
})

app.listen(8080)
```

### 2. 客户端连接

```javascript
const eventSource = new EventSource("/sse")

eventSource.addEventListener("message", ({ data }) => {
    const contents = JSON.parse(data)
    console.log(contents) // Hello world!
})
```

## 核心 API

### createSession()

创建一个新的 SSE 会话。

```typescript
const session = await createSession(req, res, options?)
```

**参数**：
- `req`: Express 的 Request 对象
- `res`: Express 的 Response 对象
- `options`: 可选配置对象

**SessionOptions 配置项**：

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `serializer` | function | `JSON.stringify` | 序列化数据为字符串 |
| `sanitizer` | function | 内置函数 | 清理数据中的换行符 |
| `trustClientEventId` | boolean | `true` | 是否信任客户端的 Last-Event-ID |
| `retry` | number \| null | `2000` | 客户端重连间隔（毫秒） |
| `keepAlive` | number \| null | `10000` | 心跳间隔（毫秒），null 禁用 |
| `statusCode` | number | `200` | HTTP 状态码 |
| `headers` | object | `{}` | 额外的 HTTP 响应头 |
| `state` | any | `{}` | 会话的自定义状态 |

### Session 类

Session 类继承自 EventEmitter，代表一个打开的服务器-客户端连接。

**属性**：
- `isConnected: boolean` - 连接是否处于活跃状态

**方法**：
- `push(data, eventName?, eventId?)` - 向客户端推送数据
- `stream(readableStream)` - 从流中推送数据

**事件**：
- `connected` - 连接建立后触发
- `disconnected` - 连接断开后触发
- `push` - 每次推送数据时触发

### session.push()

向客户端推送事件数据。

```typescript
session.push(data: unknown, eventName?: string, eventId?: string)
```

**参数**：
- `data`: 要发送的数据（会被序列化）
- `eventName`: 事件名称，默认为 `"message"`
- `eventId`: 事件 ID，默认为随机 UUID

**示例**：

```typescript
// 推送普通消息
session.push("Hello world!")

// 推送自定义事件
session.push({ message: "New notification" }, "notification")

// 推送带 ID 的事件
session.push({ count: 42 }, "update", "event-123")
```

## 在认证场景下的使用方案

### 场景说明

用户必须认证后才能使用 AI 聊天功能：
1. 用户登录后建立 SSE 长连接
2. 用户通过 POST 接口发送消息
3. 服务器通过 SSE 连接推送 AI 响应

### 实现方案

#### 1. 创建会话管理器

```typescript
// src/services/ai/sseManager.ts
import { Session } from "better-sse"

class SSEConnectionManager {
  private connections: Map<string, Session> = new Map()

  // 添加连接
  addConnection(userId: string, session: Session): void {
    // 如果用户已有连接，先关闭旧连接
    if (this.connections.has(userId)) {
      console.log(`用户 ${userId} 已有连接，关闭旧连接`)
      // 旧连接会自动断开
    }
    this.connections.set(userId, session)
    console.log(`用户 ${userId} 建立 SSE 连接，当前在线: ${this.connections.size}`)
  }

  // 移除连接
  removeConnection(userId: string): void {
    this.connections.delete(userId)
    console.log(`用户 ${userId} 断开连接，当前在线: ${this.connections.size}`)
  }

  // 获取连接
  getConnection(userId: string): Session | undefined {
    return this.connections.get(userId)
  }

  // 检查连接是否存在
  hasConnection(userId: string): boolean {
    const session = this.connections.get(userId)
    return session !== undefined && session.isConnected
  }

  // 向指定用户推送数据
  pushToUser(userId: string, data: any, eventName: string = "message"): boolean {
    const session = this.connections.get(userId)
    if (!session || !session.isConnected) {
      return false
    }
    try {
      session.push(data, eventName)
      return true
    } catch (error) {
      console.error(`向用户 ${userId} 推送数据失败:`, error)
      return false
    }
  }

  // 获取在线用户数
  getOnlineCount(): number {
    return this.connections.size
  }
}

// 导出单例
export const sseManager = new SSEConnectionManager()
```

#### 2. SSE 连接接口（GET /api/ai/chat）

```typescript
// src/api/ai/aiChat.ts
import { Router } from "express"
import { createSession } from "better-sse"
import { sseManager } from "../../services/ai/sseManager"
import { authMiddleware } from "../../utils/authMiddleware"

const router = Router()

router.get("/chat", authMiddleware, async (req, res) => {
  const userId = req.user.id // 从认证中间件获取用户 ID

  try {
    // 创建 SSE 会话，配置心跳和重连
    const session = await createSession(req, res, {
      keepAlive: 30000, // 30 秒心跳
      retry: 3000,      // 3 秒重连间隔
    })

    // 等待连接建立
    session.once("connected", () => {
      // 注册到管理器
      sseManager.addConnection(userId, session)

      // 发送欢迎消息
      session.push({ type: "connected", message: "连接成功" }, "system")
    })

    // 监听断开事件
    session.once("disconnected", () => {
      sseManager.removeConnection(userId)
    })

  } catch (error) {
    console.error("创建 SSE 会话失败:", error)
    res.status(500).json({ error: "无法建立连接" })
  }
})

export default router
```

#### 3. 发送消息接口（POST /api/ai/sendMessage）

```typescript
// src/api/ai/aiChat.ts
router.post("/sendMessage", authMiddleware, async (req, res) => {
  const userId = req.user.id
  const { message } = req.body

  // 验证消息
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "消息不能为空" })
  }

  // 检查 SSE 连接是否存在
  if (!sseManager.hasConnection(userId)) {
    return res.status(400).json({
      error: "请先建立 SSE 连接",
      code: "NO_SSE_CONNECTION"
    })
  }

  // 立即返回，表示消息已接收
  res.json({ success: true, message: "消息已发送" })

  // 异步处理 AI 请求
  processAIMessage(userId, message).catch(error => {
    console.error("处理 AI 消息失败:", error)
    // 通过 SSE 发送错误
    sseManager.pushToUser(userId, {
      type: "error",
      message: "AI 服务暂时不可用"
    }, "error")
  })
})

// 处理 AI 消息的函数
async function processAIMessage(userId: string, message: string) {
  // 发送"正在输入"状态
  sseManager.pushToUser(userId, { type: "typing" }, "status")

  // 调用 AI API（示例）
  const aiResponse = await callAIAPI(message)

  // 如果 AI 返回流式响应
  if (aiResponse.stream) {
    for await (const chunk of aiResponse.stream) {
      // 推送每个数据块
      sseManager.pushToUser(userId, {
        type: "chunk",
        content: chunk
      }, "message")
    }
  }

  // 发送完成标记
  sseManager.pushToUser(userId, {
    type: "done"
  }, "status")
}
```

## 错误处理

### 1. 处理连接断开

```typescript
session.once("disconnected", () => {
  // 清理资源
  sseManager.removeConnection(userId)

  // 取消正在进行的 AI 请求
  cancelAIRequest(userId)
})
```

### 2. 处理推送失败

```typescript
try {
  session.push(data)
} catch (error) {
  if (error.message.includes("non-active session")) {
    // 会话已断开
    sseManager.removeConnection(userId)
  }
}
```

### 3. 等待连接建立

如果在连接建立前推送数据会报错，需要等待 `connected` 事件：

```typescript
// ❌ 错误：可能在连接建立前推送
const session = await createSession(req, res)
session.push("Hello") // Error: Cannot push data to a non-active session

// ✅ 正确：等待连接建立
const session = await createSession(req, res)
session.once("connected", () => {
  session.push("Hello")
})
```

## 客户端实现

### 基本连接

```typescript
// 建立 SSE 连接（会自动携带 cookie）
const eventSource = new Even tSource("/api/ai/chat", {
  withCredentials: true
})

// 监听消息事件
eventSource.addEventListener("message", (event) => {
  const data = JSON.parse(event.data)
  console.log("收到消息:", data)
})

// 监听系统事件
eventSource.addEventListener("system", (event) => {
  const data = JSON.parse(event.data)
  console.log("系统消息:", data)
})

// 监听错误
eventSource.addEventListener("error", (event) => {
  console.error("连接错误:", event)
  // EventSource 会自动重连
})
```

### 发送消息

```typescript
async function sendMessage(message: string) {
  try {
    const response = await fetch("/api/ai/sendMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include", // 携带 cookie
      body: JSON.stringify({ message })
    })

    const result = await response.json()

    if (!response.ok) {
      if (result.code === "NO_SSE_CONNECTION") {
        // 需要重新建立 SSE 连接
        console.error("SSE 连接已断开，请刷新页面")
      }
      throw new Error(result.error)
    }

    return result
  } catch (error) {
    console.error("发送消息失败:", error)
    throw error
  }
}
```

### 完整的客户端示例

```typescript
class AIChat {
  private eventSource: EventSource | null = null
  private isConnected: boolean = false

  // 建立连接
  connect() {
    this.eventSource = new EventSource("/api/ai/chat", {
      withCredentials: true
    })

    this.eventSource.addEventListener("system", (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "connected") {
        this.isConnected = true
        console.log("SSE 连接成功")
      }
    })

    this.eventSource.addEventListener("message", (event) => {
      const data = JSON.parse(event.data)
      this.handleMessage(data)
    })

    this.eventSource.addEventListener("error", () => {
      this.isConnected = false
      console.error("SSE 连接错误")
    })
  }

  // 处理消息
  handleMessage(data: any) {
    switch (data.type) {
      case "typing":
        console.log("AI 正在输入...")
        break
      case "chunk":
        console.log("收到内容:", data.content)
        break
      case "done":
        console.log("消息接收完成")
        break
    }
  }

  // 发送消息
  async sendMessage(message: string) {
    if (!this.isConnected) {
      throw new Error("SSE 连接未建立")
    }

    const response = await fetch("/api/ai/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }

    return response.json()
  }

  // 断开连接
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      this.isConnected = false
    }
  }
}

// 使用
const chat = new AIChat()
chat.connect()

// 发送消息
chat.sendMessage("你好").catch(console.error)
```

## 最佳实践

### 1. 心跳配置

```typescript
const session = await createSession(req, res, {
  keepAlive: 30000 // 30 秒发送一次心跳，防止代理超时
})
```

### 2. 并发控制

为每个用户维护处理状态，防止并发请求：

```typescript
const processingUsers = new Set<string>()

router.post("/sendMessage", authMiddleware, async (req, res) => {
  const userId = req.user.id

  if (processingUsers.has(userId)) {
    return res.status(429).json({
      error: "请等待当前消息处理完成"
    })
  }

  processingUsers.add(userId)

  try {
    // 处理消息...
  } finally {
    processingUsers.delete(userId)
  }
})
```

### 3. 超时处理

```typescript
const TIMEOUT = 60000 // 60 秒超时

async function processAIMessage(userId: string, message: string) {
  const timeoutId = setTimeout(() => {
    sseManager.pushToUser(userId, {
      type: "error",
      message: "请求超时"
    }, "error")
  }, TIMEOUT)

  try {
    // 处理 AI 请求...
  } finally {
    clearTimeout(timeoutId)
  }
}
```

### 4. 清理断开的流

如果使用流式推送，记得在断开时清理：

```typescript
const stream = getAIResponseStream()

session.stream(stream)

session.once("disconnected", () => {
  stream.destroy() // 清理流
})
```

## 常见问题

### Q: 如何支持多机部署？

A: 单机使用内存 Map 即可。多机部署需要：
- 使用 Redis 存储会话映射
- 使用 Redis Pub/Sub 或消息队列
- 确保用户的 SSE 连接和 POST 请求路由到同一台服务器（使用 sticky session）

### Q: 用户刷新页面会怎样？

A: EventSource 会自动重连，服务器会创建新的 Session 并覆盖旧的。

### Q: 如何限制连接数？

A: 在 `addConnection` 中检查用户连接数，超过限制则拒绝。

### Q: SSE 和 WebSocket 的区别？

A:
- SSE 是单向通信（服务器→客户端），WebSocket 是双向
- SSE 基于 HTTP，更简单，自动重连
- SSE 只支持文本，WebSocket 支持二进制
- 对于服务器推送场景，SSE 更轻量

## 总结

Better-SSE 提供了简洁的 API 和完善的功能，非常适合实现服务器推送场景。在用户认证的 AI 聊天场景中：

1. 用户登录后建立 SSE 长连接
2. 使用全局管理器维护用户会话映射
3. POST 接口通过用户 ID 找到会话并推送数据
4. 正确处理连接断开和错误情况

这种方案简单可靠，充分利用了 Better-SSE 的会话管理能力。
