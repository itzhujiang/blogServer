# AG-UI 后端封装方案

## 1. 目标

本文档说明：在当前项目中，如果要把 `/api/ai/ai-chat/chat` 改造成 AG-UI 兼容接口，后端应该如何封装，才能做到：

- 协议层清晰
- 业务层清晰
- 易于逐步改造
- 不和旧的 `sseManager` 模型混在一起

本文档重点回答的问题是：

- `@ag-ui/core` 应该放在哪一层使用
- `src/utils/agui.ts` 应该如何封装
- 路由层、业务层、协议层应该如何分工
- 第一阶段最小实现应该先做哪些能力

---

## 2. 先说结论

在当前项目里，最合适的封装方式不是把 AG-UI 做成一个“大而全的聊天服务类”，而是拆成三层：

### 第一层：路由层
负责：

- 接收 HTTP 请求
- 调用 service
- 把 service 产出的结果写成 AG-UI 事件流

推荐文件：

- `src/api/ai/aiChat.ts`

### 第二层：业务层
负责：

- 查找或创建会话
- 保存用户消息
- 调用模型/AI能力
- 保存 assistant 消息

推荐文件：

- `src/services/ai/aiChat.ts`

### 第三层：AG-UI 协议适配层
负责：

- 基于 `@ag-ui/core` 组织协议类型
- 设置 SSE 响应头
- 统一输出 AG-UI 事件
- 提供请求输入规范化能力

推荐文件：

- `src/utils/agui.ts`

---

## 3. 为什么要这样拆

如果不拆层，最容易出现两种问题：

### 问题 1：路由里直接拼 SSE 文本

例如在路由里到处写：

```ts
res.write(`data: ${JSON.stringify(event)}\n\n`);
```

这样会导致：

- 协议格式散落在多个地方
- 后续想改事件结构时很难统一调整
- `RUN_STARTED`、`RUN_FINISHED`、`RUN_ERROR` 等事件顺序容易失控

### 问题 2：`agui.ts` 同时做协议 + 数据库 + AI 调用

如果把这些都塞进一个类里：

- 查询/创建会话
- 保存消息
- 调模型
- SSE 输出
- AG-UI 事件转换

那么最终 `agui.ts` 会变成一个过于耦合的“大类”，后续很难维护。

所以更合理的方式是：

- **业务逻辑归业务层**
- **协议输出归 AG-UI 适配层**
- **接口编排归路由层**

---

## 4. 推荐的分层职责

## 4.1 路由层职责

路由层只做编排，不做具体业务，不直接关心数据库细节。

### 应该做的事

- 接收 `POST /chat`
- 读取请求体 `RunAgentInput`
- 调用 `agui` 工具初始化 SSE 响应
- 调用 `aiChat` service 执行一次 run
- 根据返回的 chunk / 文本结果持续输出事件
- 在结束或失败时关闭响应

### 不应该做的事

- 不直接查询 `AiChatSessions`
- 不直接插入 `AiChatMessages`
- 不直接在多个地方手写 AG-UI JSON 结构

---

## 4.2 业务层职责

业务层负责“聊天业务本身”，而不是“AG-UI 协议本身”。

### 应该做的事

- 根据 `threadId` 查找会话
- 没有 `threadId` 时创建新会话
- 提取最后一条用户消息
- 保存用户消息到 `AiChatMessages`
- 调用模型或内部 AI 能力
- 逐步返回文本 chunk，或返回完整文本
- 保存 assistant 消息
- 更新会话最后消息摘要和时间

### 不应该做的事

- 不直接写 `res.write()`
- 不自己拼 `RUN_STARTED` / `TEXT_MESSAGE_CONTENT` 之类的事件
- 不依赖旧的 `sseManager.pushToUser()` 模型

业务层应该只关心：

- 这次 run 属于哪个 thread
- 用户说了什么
- assistant 回了什么

---

## 4.3 AG-UI 协议适配层职责

`src/utils/agui.ts` 应该专门负责协议适配。

### 应该做的事

- 基于 `@ag-ui/core` 使用官方类型
- 统一设置 SSE headers
- 统一写出 AG-UI 事件
- 统一管理事件写入格式
- 统一生成 `runId` / `messageId` 的默认值（如需要）
- 提供输入规范化方法

### 不应该做的事

- 不负责数据库读写
- 不负责 AI 推理逻辑
- 不负责会话业务规则

---

## 5. `src/utils/agui.ts` 应该封装成什么

最推荐的不是“全局 manager”，而是：

- **每个请求创建一个 writer**

原因是新的 AG-UI `/chat` 模型不是旧的“用户级长连接池”，而是：

- 一个请求
- 一个 run
- 一个响应流
- 一个 writer

所以它更像：

```ts
const writer = agui.createWriter(res);
```

而不是：

```ts
agui.addConnection(userId);
agui.pushToUser(userId, event);
```

也就是说，AG-UI 这里不再是“连接管理器”，而是“响应流写入器”。

---

## 6. 推荐的 `agui.ts` 能力清单

第一阶段建议先封装下面这些能力。

## 6.1 SSE 初始化

例如：

- `initSse(res)`

职责：

- 设置 `Content-Type: text/event-stream`
- 设置 `Cache-Control: no-cache, no-transform`
- 设置 `Connection: keep-alive`
- 立即 `flushHeaders()`（如果可用）

---

## 6.2 基础事件输出

例如：

- `writeEvent(res, event)`

职责：

- 把事件按 SSE 格式写出
- 统一处理：

```text
data: {...}

```

- 可选统一补 `timestamp`

---

## 6.3 事件便捷方法

建议至少包含：

- `writeRunStarted()`
- `writeTextMessageStart()`
- `writeTextMessageContent()`
- `writeTextMessageEnd()`
- `writeRunFinished()`
- `writeRunError()`
- `end()`

这样路由层就不用自己拼事件对象。

---

## 6.4 输入规范化

建议包含：

- `normalizeRunInput(input: RunAgentInput)`
- `getLastUserMessage(messages: Message[])`

职责：

- 补齐默认 `runId`
- 校验 `messages` 是否存在
- 从 `messages` 中提取最后一条用户消息
- 给业务层提供更稳定的输入结构

---

## 7. 推荐的数据流

## 7.1 一次请求的完整流程

推荐流程如下：

1. 路由收到 `POST /chat`
2. `agui.ts` 规范化请求体
3. `agui.ts` 初始化 SSE 响应
4. 业务层查找或创建会话
5. 业务层保存用户消息
6. 路由通过 `writer` 输出 `RUN_STARTED`
7. 路由通过 `writer` 输出 `TEXT_MESSAGE_START`
8. 业务层调用 AI
9. AI 每产生一个 chunk，路由就输出一个 `TEXT_MESSAGE_CONTENT`
10. AI 完成后，业务层保存 assistant 消息
11. 路由输出 `TEXT_MESSAGE_END`
12. 路由输出 `RUN_FINISHED`
13. 关闭响应

如果中途异常：

1. 输出 `RUN_ERROR`
2. 关闭响应

---

## 7.2 为什么路由层负责“写事件”

因为写事件本质上是 HTTP 响应的一部分，而 HTTP 响应对象 `res` 在路由层最自然。

业务层如果直接依赖 `res`，会出现这些问题：

- service 不能复用
- service 无法脱离 Express 测试
- 协议层与业务层耦合

所以更合理的是：

- **业务层产出业务结果或 chunk**
- **路由层调用 writer 写回客户端**

---

## 8. 第一阶段建议的最小实现

为了避免一开始封装过重，第一阶段只做最小能力即可。

### 第一阶段支持

- 文本消息输入
- 基于 `threadId` 的会话延续
- 用户消息入库
- assistant 消息入库
- 基础事件流：
  - `RUN_STARTED`
  - `TEXT_MESSAGE_START`
  - `TEXT_MESSAGE_CONTENT`
  - `TEXT_MESSAGE_END`
  - `RUN_FINISHED`
  - `RUN_ERROR`

### 第一阶段先不做

- tool calls
- state snapshot
- typing/activity 事件
- reasoning 事件
- 多模态消息
- 全量历史消息回放

---

## 9. 推荐的代码结构

建议最终形成如下结构：

```text
src/
  api/
    ai/
      aiChat.ts           # 路由层
  services/
    ai/
      aiChat.ts           # 业务层
  utils/
    agui.ts               # AG-UI 协议适配层
```

如果后续能力增多，也可以进一步拆分为：

```text
src/
  utils/
    agui/
      index.ts
      writer.ts
      input.ts
      events.ts
```

但第一阶段没有必要拆这么细，先集中在 `src/utils/agui.ts` 即可。

---

## 10. 推荐的 `agui.ts` 对外接口设计

本文不要求你一开始就完全写出这些代码，但建议能力设计上接近下面这种形式。

## 10.1 输入侧

```ts
normalizeRunInput(input: RunAgentInput)
getLastUserMessage(messages: Message[])
```

用途：

- 让路由层更容易处理 AG-UI 输入

---

## 10.2 输出侧

```ts
createWriter(res)
```

返回对象建议包含：

```ts
writer.runStarted(...)
writer.textMessageStart(...)
writer.textMessageContent(...)
writer.textMessageEnd(...)
writer.runFinished(...)
writer.runError(...)
writer.close()
```

这样的好处是：

- 一次请求一个 writer
- 写法清晰
- 协议输出集中管理
- 后续扩展工具调用事件也更自然

---

## 11. 与当前旧 SSE 方案的关系

你当前项目原本是：

- `GET /chat` 建立连接
- `POST /sendMessage` 发消息
- `sseManager.pushToUser()` 异步回推

而新的 AG-UI 模型是：

- `POST /chat`
- 请求体里直接带本次 run 输入
- 当前响应直接返回该次 run 的事件流

因此：

- 新的 `/chat` **不应该依赖 `sseManager`**
- `src/utils/agui.ts` **也不应该复用旧的按 userId 存连接的设计**

这是两种不同的通信模型：

### 旧模型
- 用户级连接池
- 连接和消息发送分离
- 服务端主动回推

### AG-UI 模型
- 单请求单事件流
- 请求和响应天然绑定
- 当前响应中直接流式返回

所以这次封装的核心思想是：

- **不要把 AG-UI 封装成旧版 `sseManager` 的变体**

---

## 12. 推荐的业务层输出形式

为了让路由层更容易配合 writer，业务层建议输出以下两种形式之一。

## 12.1 形式 A：返回完整文本

适用场景：

- 当前底层模型还不是流式输出
- 先做最小可用版本

业务层返回：

- `threadId`
- `runId`
- `assistantMessageId`
- `content`

路由层负责：

- 输出一次 `TEXT_MESSAGE_CONTENT`
- 再输出结束事件

---

## 12.2 形式 B：返回 chunk 流

适用场景：

- 底层模型支持流式输出
- 需要真正的逐字/逐段响应

业务层返回：

- `threadId`
- `runId`
- `assistantMessageId`
- `stream: AsyncIterable<string>`

路由层负责：

- 遍历 stream
- 每个 chunk 输出一个 `TEXT_MESSAGE_CONTENT`

这是更符合 AG-UI 精神的做法。

---

## 13. 为什么优先用 `@ag-ui/core`

AG-UI 的协议类型建议优先直接使用 `@ag-ui/core`，而不是自己重复定义一套官方协议类型。

推荐原则：

### 直接用官方类型的部分

- `Message`
- `BaseEvent`
- `RunAgentInput`
- `EventType`
- 其他已存在的协议层事件类型

### 项目本地再封装的部分

- 第一阶段只支持文本消息的约束
- 当前项目的 `threadId` / `sessionId` 映射规则
- 当前项目对 `tools`、`context`、`state` 的收窄使用
- 业务层返回结构

也就是说：

- **协议共性 -> `@ag-ui/core`**
- **项目约束 -> 本地类型**

---

## 14. 推荐实施步骤

## 步骤 1：先完成 `src/utils/agui.ts`

先把它封装成 AG-UI writer 工具，至少具备：

- 初始化 SSE
- 输出基础事件
- 关闭响应
- 输入规范化

这是整个改造的基础设施。

## 步骤 2：改造 `src/api/ai/aiChat.ts`

把当前：

- `GET /chat`

改为：

- `POST /chat`

并让其接收 `RunAgentInput` 风格的请求体。

## 步骤 3：重构 `src/services/ai/aiChat.ts`

把当前 `sendMessage()` 中这些逻辑迁移进新 run 流程：

- 创建/更新会话
- 保存用户消息
- 生成 assistant 回复
- 保存 assistant 消息

## 步骤 4：移除新 `/chat` 对旧 `sseManager` 的依赖

新的 `/chat` 不再需要：

- `hasConnection()`
- `pushToUser()`
- 用户级连接缓存

## 步骤 5：保留旧 `/sendMessage` 作为过渡层（可选）

等前端完全切到 AG-UI 后再删除。

---

## 15. 一句话总结

在当前项目里，AG-UI 后端最合理的封装方式是：

- **`src/utils/agui.ts` 负责协议和 SSE 输出**
- **`src/services/ai/aiChat.ts` 负责聊天业务和数据库**
- **`src/api/ai/aiChat.ts` 负责把一次 run 编排成完整 AG-UI 响应流**

并且新的 `agui.ts` 应该被设计成：

- **每个请求创建一个 writer 的协议适配器**

而不是：

- **像旧 `sseManager` 那样的全局连接池管理器**

---

## 16. 当前阶段最值得先做的事

如果按实施顺序看，下一步最值得优先落地的是：

1. 先完成 `src/utils/agui.ts` 的 writer 封装
2. 再让 `/chat` 改为 `POST` 并接入这个 writer
3. 最后把 `sendMessage()` 的核心逻辑迁移进新的 run 流程

这样改造路径最稳定，也最不容易返工。
