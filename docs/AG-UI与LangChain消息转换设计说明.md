# AG-UI 与 LangChain 消息转换设计说明

本文档说明在当前项目中，为什么建议定义一层统一消息格式，以及如何在 AG-UI、业务层、LangChain / LangGraph 之间设计转换器。

适用背景：

- 当前项目已经引入 AG-UI 事件流
- 后端正在接入 LangChain / LangGraph
- 存在流式输出、工具调用、threadId / runId 等上下文
- 后续很可能需要保存会话消息、恢复历史消息、支持多轮对话

---

## 1. 先说结论

在当前项目里，**不建议直接把 AG-UI 事件格式当成 LangChain 输入格式来使用**。

更合理的方式是拆成三层：

1. **外部协议层**：AG-UI / HTTP 请求 / SSE 事件
2. **内部业务层**：统一消息格式 `ChatMessage`
3. **模型适配层**：LangChain / LangGraph 的 `BaseMessage`

也就是说：

- AG-UI 负责展示和流式协议
- LangChain 负责模型语义和消息推理
- 项目内部需要一层稳定的消息模型负责解耦

---

## 2. 为什么不能直接用 AG-UI 格式

因为 AG-UI 和 LangChain 处理的不是同一种数据。

### 2.1 AG-UI 是“展示事件格式”

例如：

- `runStarted`
- `reasoningStart`
- `activitySnapshot`
- `activityDelta`
- `textMessageStart`
- `textMessageContent`
- `textMessageEnd`
- `end`

这些事件主要用于：

- 前端实时展示
- 打字机效果
- 展示推理状态
- 展示工具执行状态
- 标识一次 run 的生命周期

它描述的是：**界面应该怎么更新**。

### 2.2 LangChain 是“语义消息格式”

LangChain 更关心：

- `SystemMessage`
- `HumanMessage`
- `AIMessage`
- `ToolMessage`

它描述的是：**模型当前看到了什么消息、做了什么工具调用、最终回复了什么内容**。

所以这两者不是一一对应关系。

例如：

- AG-UI 的三条 `textMessageContent` 增量
- 对 LangChain 来说通常只对应一条最终 `AIMessage`

---

## 3. 为什么要定义统一消息格式

统一消息格式本质上是一个**中间层模型**。

它的作用不是为了增加抽象，而是为了把不同协议隔离开。

### 3.1 如果不定义统一格式，容易出现的问题

如果直接让 AG-UI 和 LangChain 在业务代码里互相转换，通常会出现下面这些问题：

- 路由层里同时判断 AG-UI 事件和 LangChain 消息类型
- 业务层里一会儿处理 `text_message_content`，一会儿 `new HumanMessage(...)`
- 数据库存储又是第三套结构
- 前端协议一改，后端多个地方都要跟着改

最终会形成这样的耦合：

- AG-UI 直接影响 LangChain 输入
- LangChain 输出直接影响数据库结构
- 数据库恢复逻辑又要反推 AG-UI 事件

这种网状依赖后面会越来越难维护。

### 3.2 定义统一格式后的好处

有了统一格式之后，结构会变成：

- AG-UI <-> `ChatMessage`
- LangChain <-> `ChatMessage`
- 数据库 <-> `ChatMessage`

这样带来的直接好处是：

#### 只改一处就能适配协议变化

如果 AG-UI 前端协议变化，只改：

- `aguiEventsToChatMessages()`
- 或 `ChatMessage -> AG-UI` 的写入器

不会污染 LangChain 相关代码。

#### 只改一处就能适配模型层变化

如果以后从 LangChain 切到别的模型 SDK，只改：

- `toLangChainMessages()`

不会影响外部协议和数据库。

#### 数据库存储更稳定

内部统一消息格式适合做会话消息存储模型，不会被 UI 事件细节绑死。

---

## 4. 统一格式到底统一什么

建议统一的是“对话语义消息”，而不是“运行事件”。

也就是说，统一格式应该只描述：

- system 说了什么
- user 说了什么
- assistant 回了什么
- tool 返回了什么

而不是描述：

- run 是否开始
- 推理是否开始
- 某个 activity 是否从 pending 变成 success

因为后面这些属于运行时 UI 事件，不适合做长期业务消息模型。

---

## 5. 推荐的统一消息格式

建议在项目里定义一个内部消息类型，例如：

```ts
export type ChatMessage =
  | {
      role: 'system';
      content: string;
    }
  | {
      role: 'user';
      content: string;
    }
  | {
      role: 'assistant';
      content: string;
    }
  | {
      role: 'tool';
      content: string;
      toolCallId: string;
      name: string;
    };
```

这个类型的特点是：

- 结构简单
- 足够表达聊天语义
- 能映射到 LangChain
- 能用于数据库存储
- 不依赖前端 AG-UI 的具体事件细节

---

## 6. 哪些信息应该进入统一消息格式

### 应该进入的

这些信息属于“模型真正关心的语义内容”：

- 用户输入
- 系统提示词
- AI 最终回复
- 工具返回结果

例如：

- 用户问：北京今天天气怎么样
- 工具返回：北京，晴，18~26℃
- AI 回复：北京今天天气晴，气温 18~26℃

这些都适合变成统一消息格式。

### 不应该进入的

这些信息更适合作为运行态事件，而不是消息本身：

- `runStarted`
- `reasoningStart`
- `activitySnapshot`
- `activityDelta`
- `textMessageStart`
- `textMessageEnd`
- `end`

这些可以用于：

- 前端展示
- 请求生命周期管理
- 调试跟踪
- SSE 输出

但一般不建议直接写入 `ChatMessage`。

---

## 7. 一张映射表

| 数据/事件 | 是否进入统一消息格式 | 说明 |
|---|---:|---|
| 用户输入 | 是 | 作为 `role: 'user'` |
| 系统提示 | 是 | 作为 `role: 'system'` |
| AI 最终回复 | 是 | 作为 `role: 'assistant'` |
| 工具返回结果 | 是 | 作为 `role: 'tool'` |
| `runStarted` | 否 | 属于 run 生命周期 |
| `reasoningStart` / `reasoningEnd` | 否 | 属于 UI 推理态展示 |
| `activitySnapshot` / `activityDelta` | 否 | 属于运行中状态展示 |
| `textMessageStart` / `textMessageEnd` | 否 | 属于流式输出边界 |
| `textMessageContent` | 先聚合再进入 | 增量文本本身不直接存为最终消息 |

---

## 8. 为什么 `textMessageContent` 不能直接当消息

因为 AG-UI 的 `textMessageContent` 是“增量事件”，而不是“最终消息”。

例如一段输出：

- `textMessageStart(id)`
- `textMessageContent(id, '北京今天晴')`
- `textMessageContent(id, '，气温 18~26℃')`
- `textMessageEnd(id)`

对 UI 来说，这是合理的打字机流。

但对业务层和 LangChain 来说，更合理的最终语义是：

```ts
{
  role: 'assistant',
  content: '北京今天晴，气温 18~26℃'
}
```

所以这里一定会发生一次**归一化**：

- 先把增量事件聚合
- 再还原成最终的消息对象

这也是为什么 AG-UI 事件格式不适合作为项目内部主消息格式。

---

## 9. 推荐的转换器设计

建议拆成三类转换能力。

### 9.1 输入归一化转换器

职责：把外部输入规范化成内部统一格式。

例如：

- HTTP 请求体 -> `ChatMessage[]`
- AG-UI 历史事件 -> `ChatMessage[]`
- 数据库消息记录 -> `ChatMessage[]`

典型函数：

```ts
aguiEventsToChatMessages(events): ChatMessage[]
```

### 9.2 模型适配转换器

职责：把内部统一格式转成 LangChain / LangGraph 可识别的消息格式。

典型函数：

```ts
toLangChainMessages(messages): BaseMessage[]
```

### 9.3 输出写入器

职责：把模型执行过程输出成 AG-UI SSE 事件。

典型函数：

```ts
createAguiWriter(res)
streamLangChainToAgui(res, stream)
```

---

## 10. 推荐的数据流

### 10.1 入站流程

```text
前端请求 / AG-UI 历史消息
    -> 归一化
ChatMessage[]
    -> 转换
LangChain BaseMessage[]
    -> 调用模型 / LangGraph
```

### 10.2 出站流程

```text
LangChain / LangGraph 输出
    -> AG-UI writer
AG-UI SSE 事件流
    -> 前端展示
```

注意：

- **LangChain 是语义源**
- **AG-UI 是展示出口**

不要反过来让 AG-UI 事件主导业务消息模型。

---

## 11. 输入转换器示例

### 11.1 统一消息类型

```ts
export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'tool'; content: string; toolCallId: string; name: string };
```

### 11.2 转换成 LangChain messages

```ts
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';

export function toLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
  return messages.map((message) => {
    switch (message.role) {
      case 'system':
        return new SystemMessage(message.content);
      case 'user':
        return new HumanMessage(message.content);
      case 'assistant':
        return new AIMessage(message.content);
      case 'tool':
        return new ToolMessage({
          content: message.content,
          tool_call_id: message.toolCallId,
        });
    }
  });
}
```

---

## 12. AG-UI 事件到统一消息的转换思路

如果当前系统里已经存在 AG-UI 风格历史事件，那么需要先把事件恢复成消息。

### 12.1 一个典型原则

- `user_message` -> `role: 'user'`
- `text_message_start` -> 初始化缓冲区
- `text_message_content` -> 追加到缓冲区
- `text_message_end` -> 产出一条 `role: 'assistant'`

### 12.2 示例

```ts
export type AguiInputEvent =
  | { type: 'user_message'; content: string }
  | { type: 'text_message_start'; id: string }
  | { type: 'text_message_content'; id: string; content: string }
  | { type: 'text_message_end'; id: string };

export function aguiEventsToChatMessages(events: AguiInputEvent[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  const aiBuffers = new Map<string, string>();

  for (const event of events) {
    switch (event.type) {
      case 'user_message':
        result.push({
          role: 'user',
          content: event.content,
        });
        break;

      case 'text_message_start':
        aiBuffers.set(event.id, '');
        break;

      case 'text_message_content': {
        const current = aiBuffers.get(event.id) ?? '';
        aiBuffers.set(event.id, current + event.content);
        break;
      }

      case 'text_message_end': {
        const content = aiBuffers.get(event.id) ?? '';
        result.push({
          role: 'assistant',
          content,
        });
        aiBuffers.delete(event.id);
        break;
      }
    }
  }

  return result;
}
```

这个函数的本质就是：

- 把事件流恢复成真正的对话消息
- 把展示层格式转换成业务层格式

---

## 13. 输出转换器示例

输出侧建议不要直接在业务代码到处写 `res.write(...)`，而是做一个 writer。

### 13.1 writer 的职责

- 初始化 SSE
- 发出 `runStarted`
- 发出 `reasoningStart`
- 发出 `textMessageStart`
- 按 chunk 持续发 `textMessageContent`
- 结束时发出 `textMessageEnd`
- 最后 `end`

### 13.2 示例结构

```ts
const writer = createAguiWriter(res, threadId, runId);

writer.start();
writer.reasoningStart();
writer.textStart();

for await (const chunk of stream) {
  writer.textDelta(chunk);
}

writer.textEnd();
writer.reasoningEnd();
writer.finish();
```

这样业务层只关心“流式产出了什么”，不关心 AG-UI 事件细节。

---

## 14. 为什么运行态事件不建议进入 LangChain

像下面这些信息：

- reasoning start / end
- 某个 activity 从 pending 变成 success
- run 是否开始或结束

这些更像：

- UI 状态
- 调试轨迹
- 执行生命周期

而不是模型真正需要消费的自然语言语义。

如果把这些强行塞进 LangChain message，通常会带来两个问题：

1. 污染上下文
2. 模型看到很多无关信息，影响输出质量

只有在你明确想让模型知道某些执行结果时，才考虑把一部分内容提炼成语义消息，例如：

```ts
new SystemMessage('上一步天气查询工具已执行成功')
```

但这应该是业务层主动设计的行为，而不是默认把所有 UI 事件都塞进去。

---

## 15. 工具调用场景下的建议

以天气 Agent 为例，一次完整流程可能是：

1. 用户提问：北京今天天气怎么样
2. 模型决定调用 `get_weather`
3. 工具返回天气结果
4. 模型生成最终回答

这个过程中：

### 语义层

适合表示为：

- `HumanMessage`
- `AIMessage(tool_calls=...)`
- `ToolMessage`
- `AIMessage(final answer)`

### 展示层

适合表示为：

- `reasoningStart`
- `activitySnapshot(TOOL_CALL)`
- `activityDelta(TOOL_CALL success)`
- `textMessageContent`
- `textMessageEnd`

所以要区分：

- **工具调用的语义记录属于 LangChain**
- **工具调用的状态展示属于 AG-UI**

---

## 16. 什么时候可以不抽统一格式

如果系统满足以下条件，可以临时不单独抽内部消息格式：

- 只有一个很小的接口
- 不需要多轮对话
- 不需要保存历史消息
- 不需要工具调用
- 不需要事件流恢复
- 只是单次“用户一句话 -> 模型一句话”

这种情况下，直接：

```ts
[new HumanMessage(req.body.message)]
```

也可以。

但是当前项目已经具备：

- AG-UI 事件流
- SSE 输出
- `threadId` / `runId`
- LangChain / LangGraph
- 工具调用场景
- 后续会话持久化需求

所以更适合提前建立统一消息模型。

---

## 17. 当前项目的推荐落地方式

建议在项目里按下面的角色分工来做。

### 路由层

负责：

- 接收请求
- 初始化 SSE
- 调用 service
- 把 service 输出写成 AG-UI 事件

### 业务层

负责：

- 会话查找/创建
- 历史消息组装
- 用户消息保存
- 调用 LangChain / LangGraph
- 保存 assistant 消息

### 适配层

负责：

- `ChatMessage` 定义
- AG-UI -> `ChatMessage[]`
- `ChatMessage[]` -> LangChain messages
- LangChain stream -> AG-UI writer

---

## 18. 推荐文件组织

可以考虑放在以下位置：

```ts
src/ai/types/message.ts
src/ai/utils/adapters.ts
src/ai/utils/aguiWriter.ts
```

如果当前阶段希望先简单一些，也可以先集中在一个文件里：

```ts
src/ai/utils/adapters.ts
```

建议至少包含：

- `ChatMessage` 类型
- `toLangChainMessages()`
- `aguiEventsToChatMessages()`
- `chunkToText()`
- `createAguiWriter()`

---

## 19. 一句话总结

定义统一消息格式，不是为了抽象而抽象，而是因为：

- **AG-UI 是展示事件格式**
- **LangChain 是模型语义格式**
- **数据库和业务层需要一个稳定、可控的内部消息格式**

所以项目内部应该以统一消息格式作为中间层，分别去适配：

- AG-UI
- LangChain / LangGraph
- 数据库存储

这样后续前端协议变化、模型 SDK 变化、存储结构调整时，影响范围都会更可控。
