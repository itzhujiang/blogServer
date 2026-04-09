# 直接改造 `/chat` 接口为 AG-UI 的方案

## 1. 目标

本方案的目标不是新增一个独立的 AG-UI 接口，而是：

- **直接改造当前的 `/api/ai/ai-chat/chat` 接口**
- 让它从“仅建立 SSE 长连接的接口”变成“**AG-UI 协议兼容的 run 接口**”
- 最终让前端可以直接通过 `@ag-ui/client` 调用这个 `/chat` 接口

也就是说，改造完成后，`/chat` 不再只是负责连线，而是负责：

1. 接收一次 AI 运行请求
2. 执行本次对话 run
3. 直接返回 AG-UI 事件流

---

## 2. 当前 `/chat` 接口现状

当前项目中的 AI 聊天相关接口为：

- `GET /api/ai/ai-chat/chat`
- `POST /api/ai/ai-chat/sendMessage`

当前职责拆分是：

### `GET /chat`
只负责：
- 建立 SSE 长连接
- 把连接保存到 `sseManager`
- 推送一个 `system` 事件表示“连接已建立”

### `POST /sendMessage`
负责：
- 接收用户消息
- 创建/更新会话
- 保存用户消息
- 通过 `sseManager.pushToUser()` 向已有 SSE 连接推送 assistant 消息

因此，当前系统是：

- **双接口模型**
  - 一个接口建连接
  - 一个接口发消息
- **自定义事件模型**
  - `system`
  - `message`
  - `msgType: overall | chunk | done | typing`

这和 AG-UI 的标准交互模型并不一致。

---

## 3. 改造后的目标形态

改造后，`/chat` 接口应变为：

```http
POST /api/ai/ai-chat/chat
Content-Type: application/json
Accept: text/event-stream
```

它不再是“建连接接口”，而是“**发起一次 AG-UI run 的接口**”。

### 改造后的职责

新的 `/chat` 负责：

1. 接收 AG-UI 风格请求体
2. 查找或创建会话
3. 保存用户消息
4. 调用 AI 生成回复
5. 在当前响应中持续输出 AG-UI 事件流
6. 保存 assistant 消息
7. 结束本次响应

也就是说：

- **一个请求 = 一次 run**
- **一个响应 = 该次 run 的完整事件流**

---

## 4. 为什么必须这样改

如果你希望 `/chat` 最终能被这些客户端直接调用：

- `@ag-ui/client`
- CopilotKit 等兼容 AG-UI 的前端层

那么 `/chat` 就不能继续维持“GET 建连接”的职责，因为 AG-UI 客户端期望的是：

- 对一个 endpoint 发起 run 请求
- 然后直接收到该次 run 的事件流响应

换句话说，**AG-UI 依赖的是“单请求单事件流”模型，而不是“先建连接再回推”的双接口模型。**

所以如果要“改造 `/chat` 接口本身”，最合理的方式就是：

- 把 `/chat` 直接重构为 AG-UI run endpoint

---

## 5. 推荐改造结论

## 最终推荐方案

### 直接重构 `/chat`

将当前：

- `GET /api/ai/ai-chat/chat`

改造成：

- `POST /api/ai/ai-chat/chat`

并让其接收 AG-UI 风格请求，返回 AG-UI 事件流。

### 同时处理 `/sendMessage`

`/sendMessage` 在改造后将不再作为前端主入口。

更合理的处理方式是：

- 前端不再直接调用 `/sendMessage`
- `/sendMessage` 的数据库写入逻辑、会话创建逻辑迁移到新的 `/chat` 中
- `/sendMessage` 可以在过渡期保留，后续废弃

---

## 6. 改造后的接口设计

### 请求方法

```http
POST /api/ai/ai-chat/chat
```

### 请求头

```http
Content-Type: application/json
Accept: text/event-stream
```

### 请求体

第一阶段建议支持最小 AG-UI 输入模型：

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

### 响应类型

```http
Content-Type: text/event-stream
```

### 响应事件流示例

```text
data: {"type":"RUN_STARTED","threadId":"123","runId":"run-001"}

data: {"type":"TEXT_MESSAGE_START","messageId":"msg-a1","role":"assistant"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"msg-a1","delta":"你好"}

data: {"type":"TEXT_MESSAGE_END","messageId":"msg-a1"}

data: {"type":"RUN_FINISHED","threadId":"123","runId":"run-001"}
```

如果出现异常：

```text
data: {"type":"RUN_ERROR","threadId":"123","runId":"run-001","message":"xxx"}
```

---

## 7. 从当前实现到 AG-UI 的职责重构

### 当前职责分布

#### 当前 `/chat`
只做：
- 建 SSE 连接
- 注册到 `sseManager`
- 推一个 `system` 事件

#### 当前 `/sendMessage`
做：
- 检查 SSE 连接是否存在
- 创建/更新会话
- 保存用户消息
- 推送 assistant 消息

### 改造后的职责分布

#### 新 `/chat`
统一承担：
- 接收 run 请求
- 创建/更新会话
- 保存用户消息
- 调用 AI
- 输出 AG-UI 事件流
- 保存 assistant 消息
- 返回 run 完整结果流

#### `/sendMessage`
改造后：
- 不再是主流程接口
- 可短期保留作兼容
- 长期建议废弃

---

## 8. 数据模型映射方案

虽然协议要改，但你当前数据库模型其实可以继续复用。

### `AiChatSessions.id`
映射为：
- `threadId`

建议：
- 如果请求里已有 `threadId`，就按该会话继续运行
- 如果没有 `threadId`，则创建新会话，并把新建会话 ID 作为 `threadId`

### `AiChatMessages.server_id`
映射为：
- `messageId`

### `AiChatMessages.content`
映射为：
- `TEXT_MESSAGE_CONTENT.delta`
- 最终也作为 assistant message 内容持久化

### 当前 `msgType`
建议：
- **不再作为对外协议字段**
- 内部如仍有历史用途可暂时保留
- 前端协议层统一改为 AG-UI 标准事件

---

## 9. 代码层面的具体改造方向

## 第一阶段：最小可用改造

目标：
- 让 `/chat` 能直接被 `@ag-ui/client` 调用
- 先只支持文本消息
- 暂时不做工具调用
- 暂时不做复杂状态同步

### 需要修改的核心文件

#### 1. `src/api/ai/aiChat.ts`
需要改：
- 将 `router.get('/chat', ...)` 改为 `router.post('/chat', ...)`
- `/chat` 路由接收 JSON 请求体
- 交给新的 `chat()` 逻辑处理一次 run

#### 2. `src/services/ai/aiChat.ts`
需要重构：
- `chat()` 不再调用 `createSession(req, res)` 去做用户级长连接注册
- `chat()` 改为直接处理 AG-UI run
- 当前 `sendMessage()` 中的会话/消息入库逻辑迁移到 `chat()` 中

#### 3. `src/utils/sse.ts`
需要重新定位用途：
- 现有 `sseManager` 主要是为“用户级长连接回推”设计的
- 新 `/chat` 如果采用单请求单流式响应，那么它不应再依赖 `sseManager`
- 因此这个文件在新协议下会弱化，甚至后续可能只服务旧接口

---

## 10. 新 `/chat` 的处理流程

推荐的新 `/chat` 执行流程如下：

### 第一步：解析请求体
从请求中读取：
- `threadId`
- `runId`
- `messages`
- `tools`
- `context`
- `state`

第一阶段可以只使用：
- `threadId`
- `runId`
- `messages`

### 第二步：提取当前用户输入
建议：
- 从 `messages` 中找到最后一条 `role = user` 的消息
- 作为本次运行的输入内容

### 第三步：查找或创建会话
逻辑建议：
- 如果 `threadId` 存在，则查找对应 `AiChatSessions`
- 如果不存在，则创建新会话
- 如果新建会话，则把新的 session id 作为当前 `threadId`

### 第四步：保存用户消息
将最后一条用户消息写入 `AiChatMessages`

### 第五步：建立当前响应的 SSE 输出
在当前 `/chat` 请求响应上直接输出 AG-UI 事件，而不是缓存连接后异步回推。

### 第六步：输出生命周期事件
按顺序至少输出：
- `RUN_STARTED`
- `TEXT_MESSAGE_START`
- `TEXT_MESSAGE_CONTENT`
- `TEXT_MESSAGE_END`
- `RUN_FINISHED`

异常时输出：
- `RUN_ERROR`

### 第七步：调用 AI 并推送文本 chunk
如果底层 AI 是流式输出：
- 每个 chunk 输出一个 `TEXT_MESSAGE_CONTENT`

如果底层 AI 当前只支持整段返回：
- 可以一次性输出一个 `TEXT_MESSAGE_CONTENT`
- 然后立即发送 `TEXT_MESSAGE_END`

### 第八步：保存 assistant 消息
将最终拼接的 assistant 完整消息写入数据库。

### 第九步：结束响应
输出 `RUN_FINISHED` 后结束 SSE 响应。

---

## 11. 当前字段到 AG-UI 的映射

### 当前 `sessionId`
映射到：
- `threadId`

### 当前 `serverId`
映射到：
- `messageId`

### 当前 `content`
映射到：
- `TEXT_MESSAGE_CONTENT.delta`

### 当前 `role`
映射到：
- message role
- `TEXT_MESSAGE_START.role`

### 当前 `msgType`
映射策略：

| 当前字段 | AG-UI 处理方式 |
|---|---|
| `overall` | 视为一条完整文本消息，拆成 start/content/end |
| `chunk` | 视为文本增量，映射为 `TEXT_MESSAGE_CONTENT` |
| `done` | 映射为 `TEXT_MESSAGE_END` |
| `typing` | 第一阶段不映射，后续再考虑 activity 事件 |

不过需要明确：
- 改造完成后，新的 `/chat` 最好直接输出 AG-UI 事件
- 而不是先生成旧格式再做转换

---

## 12. 第一阶段允许的简化

为了尽快让 `/chat` 先具备 AG-UI 能力，第一阶段可以只做这些能力：

### 支持
- 单轮文本对话
- 基于 `threadId` 的会话延续
- 用户消息入库
- assistant 消息入库
- AG-UI 基本事件流

### 暂不支持
- tool calls
- state snapshot
- activity 事件
- reasoning 消息
- 多模态消息
- 复杂上下文透传

先把 `/chat` 变成一个最小可用 AG-UI endpoint，再逐步增强。

---

## 13. 第二阶段增强项

在第一阶段完成后，再逐步增加：

### 1. 工具调用事件
增加支持：
- `TOOL_CALL_START`
- `TOOL_CALL_ARGS`
- `TOOL_CALL_END`

### 2. 状态同步
增加：
- `STATE_SNAPSHOT`

### 3. 更完整的消息输入
支持：
- 多条历史 `messages`
- 更完整的上下文拼接

### 4. activity / typing
把当前旧协议里的 `typing` 概念迁移到 AG-UI 的 activity 体系。

---

## 14. 旧接口的处理建议

既然你明确要“直接改造 `/chat`”，那旧接口需要这样处理：

### `GET /chat`
建议：
- 废弃
- 改为 `POST /chat`
- 不再保留“仅建立连接”的职责

### `/sendMessage`
建议：
- 过渡期保留
- 内部可以标记为旧接口
- 前端切到 AG-UI 后逐步下线

如果想更彻底，也可以在改造完成后直接删除 `/sendMessage`，但这要看当前前端是否已经迁移完成。

---

## 15. 推荐实施步骤

### 步骤 1：修改路由
将：
- `GET /api/ai/ai-chat/chat`

改为：
- `POST /api/ai/ai-chat/chat`

### 步骤 2：重构 `chat()`
让它承担：
- 接收 run 请求
- 数据入库
- 调用 AI
- 输出 AG-UI 事件流

### 步骤 3：迁移 `sendMessage()` 的核心逻辑
把这些逻辑移入 `/chat`：
- 创建/更新会话
- 保存用户消息
- 保存 assistant 消息

### 步骤 4：移除 `/chat` 对 `sseManager` 的依赖
新 `/chat` 不再需要全局连接池。

### 步骤 5：前端切换为 `@ag-ui/client`
前端改为直接请求：
- `POST /api/ai/ai-chat/chat`

### 步骤 6：保留 `/sendMessage` 作为兼容层（可选）
确认前端全部迁移后再删除。

---

## 16. 最终结论

如果目标是“**直接改造现有 `/chat` 接口**”，那么正确的方向不是保留它作为 SSE 建连接口，而是：

- **把 `/chat` 直接重构成 AG-UI 的 run endpoint**
- **把原本 `/sendMessage` 的主业务逻辑迁移到 `/chat`**
- **让 `/chat` 在一次请求中完成输入、执行和事件流输出**

这是当前项目接入 AG-UI 最直接、最一致的做法。

---

## 17. 下一步建议

如果继续推进，下一步最有价值的是两项：

1. 列一份 **精确到文件的代码改造清单**
2. 给出一份 **当前 `/chat` -> AG-UI `/chat` 的请求/响应结构对照表**

如果需要，我可以继续直接写这两份文档。