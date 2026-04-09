# AG-UI `/chat` 接口 TypeScript 类型文档

## 1. 目标

本文档用于定义当前项目在“**直接改造 `/api/ai/ai-chat/chat` 为 AG-UI run endpoint**”场景下，第一阶段推荐采用的 TypeScript 类型。

目标是明确三件事：

- `/chat` 请求体应该长什么样
- `/chat` 返回的 SSE 单条事件应该长什么样
- 当前项目字段如何映射到 AG-UI 字段

本文档聚焦 **第一阶段最小可用实现**：

- 只支持文本消息
- 只支持最基本的运行生命周期事件
- 暂不包含 tool calls、state snapshot、reasoning、多模态等增强能力

---

## 2. 一个重要结论

AG-UI 中：

- **请求体通常没有 `type` 字段**
- **响应事件一定有 `type` 字段**

原因是：

- 请求体表示“发起一次 run 的输入参数”
- 响应流表示“run 执行过程中产生的一系列事件”

所以：

- `POST /chat` 的 JSON body 是 `RunRequest`
- SSE 中 `data: {...}` 的每一条 JSON 才是 `Event`

---

## 3. 当前项目字段映射

建议在当前项目中采用如下映射：

| 当前项目概念 | AG-UI 概念 | 说明 |
|---|---|---|
| `AiChatSessions.id` / `sessionId` | `threadId` | 表示对话线程 / 会话 |
| `runId` | `runId` | 表示本次运行 ID，一次请求对应一次 run |
| `AiChatMessages.server_id` / `serverId` | `messageId` | 表示一条消息的唯一标识 |
| `AiChatMessages.content` | `content` / `delta` | 输入消息内容或输出文本增量 |
| `role` | `role` | 角色，如 `user` / `assistant` / `system` |

可以这样理解：

- `threadId` 更接近“会话 ID”
- `runId` 更接近“本轮请求 ID”
- `messageId` 更接近“消息 ID”

---

## 4. 请求体 TypeScript 类型

## 4.1 输入消息类型

```ts
export type AgUiMessageRole = 'user' | 'assistant' | 'system';

export interface AgUiInputMessage {
  /** 消息唯一标识 */
  id: string;
  /** 消息角色 */
  role: AgUiMessageRole;
  /** 文本内容（第一阶段仅支持纯文本） */
  content: string;
}
```

## 4.2 最小请求体类型

```ts
export interface AgUiRunRequest {
  /** 对话线程 ID；没有时可由服务端创建新会话 */
  threadId?: string;
  /** 本次运行 ID；建议前端生成，也可由服务端兜底生成 */
  runId?: string;
  /** 当前要提交给 Agent 的消息列表 */
  messages: AgUiInputMessage[];
  /** 工具定义；第一阶段可选且通常为空 */
  tools?: unknown[];
  /** 额外上下文；第一阶段可选且通常为空 */
  context?: unknown[];
  /** 状态对象；第一阶段可选 */
  state?: Record<string, unknown>;
  /** 透传属性；如后续需要模型参数，可放这里 */
  forwardedProps?: Record<string, unknown>;
}
```

## 4.3 当前项目第一阶段更推荐的约束写法

如果你想把第一阶段的接口约束得更严格，可以使用下面这组类型：

```ts
export interface MinimalAgUiRunRequest {
  threadId?: string;
  runId?: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  tools?: [];
  context?: [];
  state?: Record<string, unknown>;
}
```

这表示：

- 第一阶段虽然保留 `tools` / `context` / `state` 字段入口
- 但主要真正使用的是 `threadId`、`runId`、`messages`
- 服务端通常只需要取 `messages` 中最后一条 `role = 'user'` 的消息作为本次输入

---

## 5. 请求体示例

```json
{
  "threadId": "123",
  "runId": "run-001",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "你好"
    }
  ],
  "tools": [],
  "context": [],
  "state": {}
}
```

---

## 6. 响应事件 TypeScript 类型

AG-UI 的响应不是一个普通 JSON，而是一串 SSE 事件。

例如：

```text
data: {"type":"RUN_STARTED","threadId":"123","runId":"run-001"}

data: {"type":"TEXT_MESSAGE_START","messageId":"msg-a1","role":"assistant"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"msg-a1","delta":"你好"}

data: {"type":"TEXT_MESSAGE_END","messageId":"msg-a1"}

data: {"type":"RUN_FINISHED","threadId":"123","runId":"run-001"}
```

因此从 TypeScript 角度看，真正需要定义的是：

- **单条事件类型**
- **所有事件组成的联合类型**

---

## 7. 最小事件枚举写法

```ts
export type AgUiEventType =
  | 'RUN_STARTED'
  | 'TEXT_MESSAGE_START'
  | 'TEXT_MESSAGE_CONTENT'
  | 'TEXT_MESSAGE_END'
  | 'RUN_FINISHED'
  | 'RUN_ERROR';
```

---

## 8. 基础事件类型

```ts
export interface AgUiBaseEvent {
  type: AgUiEventType;
  timestamp?: number;
}
```

如果你希望和很多 AG-UI 示例保持一致，可以给每条事件补充 `timestamp`。第一阶段不是必须，但建议预留。

---

## 9. 生命周期事件类型

## 9.1 `RUN_STARTED`

```ts
export interface RunStartedEvent extends AgUiBaseEvent {
  type: 'RUN_STARTED';
  threadId: string;
  runId: string;
}
```

含义：

- 一次 run 正式开始
- 用于告诉前端当前响应流属于哪个 `threadId` 和 `runId`

## 9.2 `RUN_FINISHED`

```ts
export interface RunFinishedEvent extends AgUiBaseEvent {
  type: 'RUN_FINISHED';
  threadId: string;
  runId: string;
}
```

含义：

- 本次 run 正常结束
- 前端可据此结束 loading / streaming 状态

## 9.3 `RUN_ERROR`

```ts
export interface RunErrorEvent extends AgUiBaseEvent {
  type: 'RUN_ERROR';
  threadId: string;
  runId: string;
  message: string;
}
```

含义：

- 本次 run 失败
- `message` 用于描述错误信息

---

## 10. 文本消息事件类型

## 10.1 `TEXT_MESSAGE_START`

```ts
export interface TextMessageStartEvent extends AgUiBaseEvent {
  type: 'TEXT_MESSAGE_START';
  messageId: string;
  role: 'assistant';
}
```

含义：

- assistant 开始输出一条新的文本消息
- `messageId` 用于把后续所有文本 chunk 串起来

## 10.2 `TEXT_MESSAGE_CONTENT`

```ts
export interface TextMessageContentEvent extends AgUiBaseEvent {
  type: 'TEXT_MESSAGE_CONTENT';
  messageId: string;
  delta: string;
}
```

含义：

- 一段文本增量
- 如果底层模型是流式输出，可以多次发送
- 如果底层模型不是流式输出，也可以只发送一次完整文本

## 10.3 `TEXT_MESSAGE_END`

```ts
export interface TextMessageEndEvent extends AgUiBaseEvent {
  type: 'TEXT_MESSAGE_END';
  messageId: string;
}
```

含义：

- 当前 assistant 文本消息输出结束

---

## 11. 最终联合类型

```ts
export type AgUiChatEvent =
  | RunStartedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | RunFinishedEvent
  | RunErrorEvent;
```

这个联合类型就是第一阶段 `/chat` 最核心的“单条 SSE 事件”类型定义。

---

## 12. 服务端推荐直接使用的完整类型代码

如果你想直接复制到项目里，第一阶段推荐使用下面这一版：

```ts
export type AgUiMessageRole = 'user' | 'assistant' | 'system';

export interface AgUiInputMessage {
  id: string;
  role: AgUiMessageRole;
  content: string;
}

export interface AgUiRunRequest {
  threadId?: string;
  runId?: string;
  messages: AgUiInputMessage[];
  tools?: unknown[];
  context?: unknown[];
  state?: Record<string, unknown>;
  forwardedProps?: Record<string, unknown>;
}

export type AgUiEventType =
  | 'RUN_STARTED'
  | 'TEXT_MESSAGE_START'
  | 'TEXT_MESSAGE_CONTENT'
  | 'TEXT_MESSAGE_END'
  | 'RUN_FINISHED'
  | 'RUN_ERROR';

export interface AgUiBaseEvent {
  type: AgUiEventType;
  timestamp?: number;
}

export interface RunStartedEvent extends AgUiBaseEvent {
  type: 'RUN_STARTED';
  threadId: string;
  runId: string;
}

export interface TextMessageStartEvent extends AgUiBaseEvent {
  type: 'TEXT_MESSAGE_START';
  messageId: string;
  role: 'assistant';
}

export interface TextMessageContentEvent extends AgUiBaseEvent {
  type: 'TEXT_MESSAGE_CONTENT';
  messageId: string;
  delta: string;
}

export interface TextMessageEndEvent extends AgUiBaseEvent {
  type: 'TEXT_MESSAGE_END';
  messageId: string;
}

export interface RunFinishedEvent extends AgUiBaseEvent {
  type: 'RUN_FINISHED';
  threadId: string;
  runId: string;
}

export interface RunErrorEvent extends AgUiBaseEvent {
  type: 'RUN_ERROR';
  threadId: string;
  runId: string;
  message: string;
}

export type AgUiChatEvent =
  | RunStartedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | RunFinishedEvent
  | RunErrorEvent;
```

---

## 13. “完整响应类型”到底应该怎么理解

很多人会直觉想写一个：

```ts
type ChatResponse = {
  type: 'RUN_STARTED' | 'TEXT_MESSAGE_CONTENT' | ...
}
```

但这其实不够准确，因为 `/chat` 的响应不是“一个对象”，而是“一个事件流”。

所以更准确的理解应该是：

### 方式一：单条事件类型

```ts
type ChatEvent = AgUiChatEvent;
```

表示：

- 每次 `res.write()` 发出去的一条 `data: {...}`，都符合 `ChatEvent`

### 方式二：事件流概念类型

如果只是文档表达，可以写成：

```ts
type ChatResponseStream = AsyncIterable<AgUiChatEvent>;
```

或者：

```ts
type ChatResponseStream = AgUiChatEvent[];
```

但要注意：

- `AgUiChatEvent[]` 只是文档层面的“顺序序列”表达
- 真实 HTTP 响应并不是一次性返回数组
- 真实响应是 SSE 按条持续输出

因此，**真正有价值的类型是单条事件联合类型 `AgUiChatEvent`**。

---

## 14. 与当前项目现有结构的对应关系

如果你要把当前项目已有结构平滑迁移到 AG-UI，可以这样理解：

### 当前 `/sendMessage` 入参

当前你已有：

```ts
type SendMessageRequsetType = {
  message: string;
  localId: string;
  sessionId?: number;
};
```

迁移到 AG-UI 以后，对应关系大致是：

```ts
const agUiRequest: AgUiRunRequest = {
  threadId: sessionId ? String(sessionId) : undefined,
  runId: localId,
  messages: [
    {
      id: localId,
      role: 'user',
      content: message,
    },
  ],
};
```

但要注意：

- `runId` 和 `message.id` 不一定必须等于 `localId`
- 这里只是为了和你当前前端模型更容易衔接

### 当前服务端返回的 `serverId`

当前你已有：

- `serverId`
- `sessionId`

迁移到 AG-UI 以后，建议映射为：

- `sessionId -> threadId`
- `serverId -> messageId`

---

## 15. 第一阶段推荐的最小事件顺序

一次正常请求，推荐按以下顺序输出：

```ts
const events: AgUiChatEvent[] = [
  {
    type: 'RUN_STARTED',
    threadId: '123',
    runId: 'run-001',
  },
  {
    type: 'TEXT_MESSAGE_START',
    messageId: 'msg-a1',
    role: 'assistant',
  },
  {
    type: 'TEXT_MESSAGE_CONTENT',
    messageId: 'msg-a1',
    delta: '你好',
  },
  {
    type: 'TEXT_MESSAGE_END',
    messageId: 'msg-a1',
  },
  {
    type: 'RUN_FINISHED',
    threadId: '123',
    runId: 'run-001',
  },
];
```

如果失败，则通常是：

```ts
const errorEvent: RunErrorEvent = {
  type: 'RUN_ERROR',
  threadId: '123',
  runId: 'run-001',
  message: '模型调用失败',
};
```

---

## 16. 第二阶段可扩展方向

后续如果要增强协议能力，可以在当前联合类型基础上继续扩展：

- `TOOL_CALL_START`
- `TOOL_CALL_ARGS`
- `TOOL_CALL_END`
- `STATE_SNAPSHOT`
- `ACTIVITY_START`
- `ACTIVITY_UPDATE`
- `ACTIVITY_END`
- reasoning 相关事件
- 多模态消息事件

也就是说，第一阶段这份类型定义不是最终完整版，而是“**当前项目改造 `/chat` 所需的最小可用子集**”。

---

## 17. 最终结论

如果你当前要把 `/api/ai/ai-chat/chat` 直接改造成 AG-UI endpoint，那么第一阶段最关键的类型认知是：

- **请求体类型：`AgUiRunRequest`**
- **响应单条事件类型：`AgUiChatEvent`**
- **请求体没有 `type`**
- **响应事件必须有 `type`**
- **`threadId` 基本可以视为当前项目的 `sessionId`**
- **`messageId` 基本可以视为当前项目的 `serverId`**

因此，严格来说，你问的“完整的一个响应的 TS 类型是什么”，在当前改造目标下，最合适的答案就是：

```ts
export type AgUiChatEvent =
  | RunStartedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | RunFinishedEvent
  | RunErrorEvent;
```

因为 `/chat` 返回的本质不是一个普通对象，而是一串符合这个联合类型的 SSE 事件。
