# 前端工具执行实现方案 - LangGraph Interrupt

## 概述

本文档说明如何使用 LangGraph 的 interrupt 机制实现前端工具执行：当 AI 需要调用前端传入的工具时，中断执行并保存状态，等待前端执行工具并返回结果后，从中断点恢复执行。

## 问题背景

在当前项目中，前端可以动态传入工具定义，这些工具的实际执行逻辑在前端。我们需要一个机制让 AI 在需要调用这些工具时：

1. 暂停执行并保存当前状态
2. 通知前端执行工具
3. 等待前端返回结果
4. 从暂停点恢复执行并继续

## 方案对比

### 与 Promise 方案的区别

| 特性 | interrupt 方案 | Promise 方案 |
|------|---------------|-------------|
| **HTTP 请求** | 2 次独立请求 | 1 次 SSE + 1 次 POST |
| **连接方式** | 短连接 | 长连接 |
| **状态存储** | checkpointer 持久化 | 内存中的 Promise |
| **服务重启** | ✅ 可恢复 | ❌ 状态丢失 |
| **工具执行时间** | 无限制 | 受连接超时限制 |
| **实现复杂度** | 高 | 中 |
| **可靠性** | 高 | 中 |

### 适用场景

**interrupt 方案适合：**
- 工具执行时间较长（> 1 分钟）
- 需要高可靠性（支持服务重启）
- 生产环境部署
- 用户可能在执行过程中关闭页面后重新打开

**Promise 方案适合：**
- 工具执行时间较短（< 1 分钟）
- 追求用户体验流畅度
- 开发和测试环境

---

## LangGraph Interrupt 机制

### 什么是 interrupt

interrupt 是 LangGraph 提供的"人在回路"（Human-in-the-loop）机制，允许在执行过程中暂停，等待外部输入后继续。

### 核心概念

#### 1. Checkpointer

Checkpointer 负责保存和恢复执行状态：

```typescript
const app = workflow.compile({
  checkpointer: new MemorySaver(),  // 或 PostgresSaver
});
```

**保存的内容：**
- 当前执行到哪个节点
- 消息历史
- 工具调用记录
- 中间变量

#### 2. thread_id

用于标识一个对话会话，同一个 `thread_id` 的多次请求会共享状态：

```typescript
const config = {
  configurable: {
    thread_id: 'user-123-session-456'
  }
};
```

#### 3. interruptBefore / interruptAfter

指定在哪些节点前后触发 interrupt：

```typescript
const app = workflow.compile({
  checkpointer: new PostgresSaver(pool),
  interruptBefore: ['tools'],  // 在工具节点前中断
});
```

---

## 实现原理

### 执行流程图

```
【第一次请求】
用户发送消息
    ↓
AI 决定调用工具
    ↓
检测到 interruptBefore: ['tools']
    ↓
保存状态到 checkpointer
    ↓
返回 interrupt 信息和 toolStart 事件
    ↓
关闭 HTTP 连接
    ↓
前端执行工具
    ↓
【第二次请求】
前端提交工具结果（作为 ToolMessage）
    ↓
从 checkpointer 恢复状态
    ↓
继续执行（跳过 interrupt）
    ↓
AI 生成最终回复
    ↓
返回结果
```

### 关键机制

#### 1. 状态持久化

使用 checkpointer 保存执行状态，支持跨请求恢复：

```typescript
// 第一次请求 - 保存状态
await app.invoke(
  { messages: [...] },
  { configurable: { thread_id: 'abc' } }
);
// checkpointer 自动保存状态

// 第二次请求 - 恢复状态
await app.invoke(
  { messages: [..., toolMessage] },
  { configurable: { thread_id: 'abc' } }  // 相同的 thread_id
);
// checkpointer 自动恢复状态
```

#### 2. interrupt 检测

LangGraph 在执行到指定节点时自动触发 interrupt：

```typescript
// 配置 interrupt
interruptBefore: ['tools']

// 执行流程
agent -> (检测到 interrupt) -> 保存状态 -> 返回
```

#### 3. 消息延续

第二次请求需要包含完整的消息历史 + 工具结果：

```typescript
// 第一次请求的消息
messages: [
  { role: 'user', content: '北京天气' }
]

// 第二次请求的消息（需要包含工具结果）
messages: [
  { role: 'user', content: '北京天气' },
  { role: 'assistant', content: '', tool_calls: [...] },
  { role: 'tool', content: '{"weather":"晴"}', tool_call_id: 'call_123' }
]
```

---

## 实现步骤

### 步骤 1：配置 checkpointer

**推荐使用 PostgresSaver（生产环境）**

**文件位置：** `src/ai/agent/index.ts`

**安装依赖：**

```bash
npm install @langchain/langgraph-checkpoint-postgres
```

**配置代码：**

```typescript
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Pool } from 'pg';

// 创建数据库连接池
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// 创建 checkpointer
const checkpointer = new PostgresSaver(pool);

// 首次使用需要初始化表结构
await checkpointer.setup();

// 编译 workflow
const app = workflow.compile({
  checkpointer,
  interruptBefore: ['tools'],  // 在工具节点前中断
});
```

### 步骤 2：检测前端工具并触发 interrupt

**方案 A：使用 interruptBefore（推荐）**

配置在工具节点前自动 interrupt：

```typescript
const app = workflow.compile({
  checkpointer,
  interruptBefore: ['tools'],
});
```

这样所有工具调用都会触发 interrupt。

**方案 B：在工具节点中动态判断**

如果只想对前端工具 interrupt，可以在工具节点中判断：

```typescript
// 创建自定义工具节点
async function customToolNode(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = lastMessage.tool_calls;

  for (const toolCall of toolCalls) {
    // 检查是否是前端工具
    if (isFrontendTool(toolCall.name)) {
      // 触发 interrupt
      return {
        ...state,
        __interrupt__: {
          type: 'frontend_tool',
          toolCall
        }
      };
    }
  }

  // 后端工具正常执行
  return await executeBackendTools(state);
}
```

### 步骤 3：处理 interrupt 响应

**文件位置：** `src/services/ai/aiChat.ts`

当 LangGraph 返回 interrupt 时，需要特殊处理：

```typescript
export async function runAgent(input) {
  const { threadId, message } = input;

  const config = {
    configurable: { thread_id: threadId }
  };

  try {
    const result = await app.invoke(
      { messages: [{ type: 'user', content: message }] },
      config
    );

    // 检查是否 interrupt
    if (result.__interrupt__) {
      // 返回 interrupt 信息
      return {
        type: 'interrupt',
        threadId,
        toolCalls: extractToolCalls(result),
      };
    }

    // 正常完成
    return {
      type: 'complete',
      threadId,
      response: result.messages[result.messages.length - 1].content
    };
  } catch (error) {
    // 错误处理
    return {
      type: 'error',
      error: error.message
    };
  }
}
```

### 步骤 4：新增 continue API

**文件位置：** `src/api/ai/aiChat.ts`

**新增路由：** `POST /api/ai/ai-chat/continue`

用于接收前端提交的工具结果并继续执行：

```typescript
/**
 * 继续执行被 interrupt 的对话
 */
router.post('/continue', async (req, res) => {
  try {
    const { threadId, toolResults } = req.body;

    // 验证参数
    if (!threadId || !toolResults) {
      return res.status(400).json({
        success: false,
        message: 'Missing threadId or toolResults'
      });
    }

    // 构造 ToolMessage
    const toolMessages = toolResults.map(result => ({
      role: 'tool',
      content: result.content,
      tool_call_id: result.toolCallId
    }));

    // 继续执行
    const config = {
      configurable: { thread_id: threadId }
    };

    // 使用 streamEvents 返回流式结果
    const stream = await app.streamEvents(
      { messages: toolMessages },
      { version: 'v2', ...config }
    );

    // 设置 SSE 响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 流式输出
    for await (const event of stream) {
      const output = langChainStreamEventsOutputToUnifyOutput(event);
      res.write(`data: ${JSON.stringify(output)}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Continue execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
```

### 步骤 5：修改原有 chat API

**文件位置：** `src/api/ai/aiChat.ts`

需要处理 interrupt 情况：

```typescript
router.post('/chat', async (req, res) => {
  try {
    const input = agUiInputToUnifyInput(req.body);

    // 设置 SSE 响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await runAgent(input);

    if (result.type === 'interrupt') {
      // 发送 toolStart 事件
      for (const toolCall of result.toolCalls) {
        res.write(`data: ${JSON.stringify({
          event: 'toolStart',
          toolCallId: toolCall.id,
          toolCallName: toolCall.name,
          toolCallArgs: toolCall.args
        })}\n\n`);
      }

      // 发送 interrupt 事件
      res.write(`data: ${JSON.stringify({
        event: 'interrupt',
        threadId: result.threadId,
        reason: 'frontend_tool_execution'
      })}\n\n`);

      res.end();
    } else if (result.type === 'complete') {
      // 正常完成，返回结果
      // ... 流式输出逻辑
    }
  } catch (error) {
    // 错误处理
  }
});
```

### 步骤 6：前端实现

**监听 interrupt 事件：**

```typescript
let currentThreadId = null;
let pendingToolCalls = [];

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.event === 'toolStart') {
    // 收集工具调用信息
    pendingToolCalls.push({
      toolCallId: data.toolCallId,
      toolCallName: data.toolCallName,
      toolCallArgs: data.toolCallArgs
    });
  }

  if (data.event === 'interrupt') {
    currentThreadId = data.threadId;
    // 执行所有待处理的工具
    executeToolsAndContinue();
  }
});

async function executeToolsAndContinue() {
  const toolResults = [];

  // 执行所有工具
  for (const toolCall of pendingToolCalls) {
    try {
      const result = await executeTool(
        toolCall.toolCallName,
        toolCall.toolCallArgs
      );

      toolResults.push({
        toolCallId: toolCall.toolCallId,
        content: JSON.stringify(result)
      });
    } catch (error) {
      toolResults.push({
        toolCallId: toolCall.toolCallId,
        content: JSON.stringify({ error: error.message })
      });
    }
  }

  // 调用 continue API
  const response = await fetch('/api/ai/ai-chat/continue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      threadId: currentThreadId,
      toolResults
    })
  });

  // 处理新的 SSE 流
  const newEventSource = new EventSource(response.url);
  // ... 处理后续事件
}
```

---

## 完整流程示例

### 场景：用户询问天气

**1. 第一次请求（用户提问）**

```
POST /api/ai/ai-chat/chat
{
  "messages": [
    { "role": "user", "content": "北京今天天气怎么样" }
  ],
  "tools": [
    {
      "name": "getWeather",
      "description": "获取天气信息",
      "parameters": { /* JSON Schema */ }
    }
  ],
  "threadId": "thread-123"
}
```

**2. 后端处理（触发 interrupt）**

- LangGraph 执行，AI 决定调用 `getWeather` 工具
- 检测到 `interruptBefore: ['tools']`
- 保存状态到 PostgreSQL
- 返回 interrupt 响应：

```json
// SSE 事件流
data: {"event":"toolStart","toolCallId":"call_abc123","toolCallName":"getWeather","toolCallArgs":{"city":"北京"}}

data: {"event":"interrupt","threadId":"thread-123","reason":"frontend_tool_execution"}
```

- 关闭 SSE 连接

**3. 前端执行工具**

```typescript
// 前端收到 interrupt 事件
const result = await fetch('https://weather-api.com/beijing');
// { city: "北京", weather: "晴", temperature: "18-26℃" }
```

**4. 第二次请求（提交工具结果）**

```
POST /api/ai/ai-chat/continue
{
  "threadId": "thread-123",
  "toolResults": [
    {
      "toolCallId": "call_abc123",
      "content": "{\"city\":\"北京\",\"weather\":\"晴\",\"temperature\":\"18-26℃\"}"
    }
  ]
}
```

**5. 后端继续执行**

- 从 PostgreSQL 恢复状态（thread-123）
- 加载之前的消息历史和工具调用记录
- 添加 ToolMessage
- 继续执行 LangGraph
- AI 基于工具结果生成回复
- 流式返回结果：

```json
data: {"event":"messageChunk","message":"北京今天天气晴朗","messageId":"msg_xyz"}

data: {"event":"messageChunk","message":"，气温 18-26℃","messageId":"msg_xyz"}

data: {"event":"messageEnd","messageId":"msg_xyz"}
```

**6. 完成**

- 关闭 SSE 连接
- 状态保存在 PostgreSQL 中，支持后续多轮对话

---

## 注意事项

### 1. Checkpointer 选择

**开发环境：**
```typescript
import { MemorySaver } from '@langchain/langgraph';
const checkpointer = new MemorySaver();
```

**生产环境：**
```typescript
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
const checkpointer = new PostgresSaver(pool);
await checkpointer.setup();  // 初始化表结构
```

### 2. 消息历史管理

第二次请求必须包含完整的消息历史，包括：
- 用户消息
- AI 的工具调用消息
- 工具结果消息

**错误示例：**
```typescript
// ❌ 只发送工具结果
{ messages: [{ role: 'tool', content: '...' }] }
```

**正确示例：**
```typescript
// ✅ 包含完整历史
{
  messages: [
    { role: 'user', content: '北京天气' },
    { role: 'assistant', content: '', tool_calls: [...] },
    { role: 'tool', content: '...', tool_call_id: '...' }
  ]
}
```

### 3. thread_id 管理

- 每个对话会话使用唯一的 `thread_id`
- 第一次和第二次请求必须使用相同的 `thread_id`
- 建议格式：`user-${userId}-${sessionId}`

### 4. 并发工具调用

如果 AI 同时调用多个工具：

```typescript
toolResults: [
  { toolCallId: 'call_1', content: '...' },
  { toolCallId: 'call_2', content: '...' },
  { toolCallId: 'call_3', content: '...' }
]
```

所有工具结果必须一起提交。

### 5. 错误处理

**工具执行失败：**

```typescript
{
  toolCallId: 'call_abc123',
  content: JSON.stringify({
    error: true,
    message: 'Failed to fetch weather data'
  })
}
```

AI 会收到错误信息并决定如何处理（重试、使用备用方案、告知用户）。

### 6. 状态清理

定期清理旧的 checkpoint 数据：

```sql
-- 删除 7 天前的 checkpoint
DELETE FROM checkpoints
WHERE created_at < NOW() - INTERVAL '7 days';
```

### 7. 服务重启支持

使用 PostgresSaver 后，即使服务重启也能恢复：

```
1. 用户请求 -> interrupt -> 保存到 PostgreSQL
2. 前端执行工具
3. 【服务重启】
4. 前端提交结果 -> 从 PostgreSQL 恢复 -> 继续执行 ✅
```

---

## 与 Promise 方案的详细对比

### 用户体验

| 方面 | interrupt 方案 | Promise 方案 |
|------|---------------|-------------|
| 响应延迟 | 略高（两次请求） | 低（单次连接） |
| 工具执行时间限制 | 无限制 | 受连接超时限制 |
| 页面刷新 | ✅ 支持恢复 | ❌ 状态丢失 |

### 技术实现

| 方面 | interrupt 方案 | Promise 方案 |
|------|---------------|-------------|
| 实现复杂度 | 高 | 中 |
| 状态管理 | checkpointer | 内存 Map |
| 数据库依赖 | 需要（生产环境） | 不需要 |
| 代码量 | 较多 | 较少 |

### 可靠性

| 方面 | interrupt 方案 | Promise 方案 |
|------|---------------|-------------|
| 服务重启 | ✅ 可恢复 | ❌ 状态丢失 |
| 网络断开 | ✅ 可恢复 | ❌ 失败 |
| 长时间执行 | ✅ 支持 | ⚠️ 可能超时 |

---

## 相关文档

- [前端工具执行实现方案.md](./前端工具执行实现方案.md) - Promise 方案
- [DynamicStructuredTool使用说明.md](./DynamicStructuredTool使用说明.md)
- [AG-UI与LangChain消息转换设计说明.md](./AG-UI与LangChain消息转换设计说明.md)

---

## 总结

使用 LangGraph interrupt 机制实现前端工具执行：

**核心机制：**
- ✅ 配置 `interruptBefore: ['tools']`
- ✅ 使用 checkpointer 持久化状态
- ✅ 第一次请求触发 interrupt 并保存状态
- ✅ 前端执行工具
- ✅ 第二次请求提交结果并恢复执行

**优势：**
- 高可靠性，支持服务重启
- 无工具执行时间限制
- 状态持久化，支持跨会话恢复

**劣势：**
- 实现复杂度较高
- 需要两次 HTTP 请求
- 需要数据库支持（生产环境）

**适用场景：**
- 生产环境部署
- 工具执行时间较长
- 需要高可靠性保证
- 用户可能在执行过程中离开页面

**实现步骤：**
1. 配置 PostgresSaver 作为 checkpointer
2. 设置 `interruptBefore: ['tools']`
3. 处理 interrupt 响应，发送 toolStart 事件
4. 新增 `/continue` API 接收工具结果
5. 前端监听 interrupt 事件并执行工具
6. 前端调用 continue API 提交结果
