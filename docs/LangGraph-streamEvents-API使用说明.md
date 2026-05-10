# LangGraph `streamEvents` API 使用说明

本文档说明 `@langchain/langgraph` 中 `streamEvents()` API 的作用、基本用法、事件结构、常见事件类型，以及如何将事件转发给前端。

适用场景：

- 使用 LangGraph / LangGraph Agent
- 需要监听 Agent 执行过程中的详细事件
- 需要把模型输出、工具调用、节点执行状态实时传给前端
- 需要做运行日志、调试面板、SSE 推送

---

## 1. `streamEvents()` 是什么

`streamEvents()` 用来获取 **LangGraph 执行过程中的完整事件流**。

它和 `stream()` 的区别是：

- `stream()` 更偏向“执行结果的流式输出”
- `streamEvents()` 更偏向“执行过程中的生命周期事件”

也就是说，`streamEvents()` 不只是告诉你结果，还会告诉你：

- 哪个节点开始执行了
- 哪个模型开始生成了
- 模型正在输出哪些 token
- 哪个工具开始执行了
- 哪个工具执行结束了
- 哪个链路或节点结束了
- 是否派发了自定义事件

因此，如果你想知道 **Agent 当前执行到了哪一步**，或者想做更细粒度的前端日志与调试面板，`streamEvents()` 会比 `stream({ streamMode: "updates" })` 更灵活。

---

## 2. 基本用法

### 2.1 在 graph 上使用

```ts
const eventStream = await graph.streamEvents(
  {
    messages: [{ role: "user", content: "上海天气怎么样？" }],
  },
  {
    version: "v2",
  }
);

for await (const evt of eventStream) {
  console.log(evt.event, evt.name, evt.data);
}
```

### 2.2 在 agent 上使用

如果你使用的是 `createReactAgent(...)` 创建出来的 agent，写法也是一样的：

```ts
const eventStream = await agent.streamEvents(
  {
    messages: [{ role: "user", content: "帮我查一下北京天气" }],
  },
  {
    version: "v2",
  }
);

for await (const evt of eventStream) {
  console.log(evt);
}
```

说明：

- 第一个参数是图或 Agent 的输入
- 第二个参数是配置项
- 当前文档示例通常使用 `version: "v2"`

---

## 3. 方法签名可以怎么理解

可以把它理解成下面这种形式：

```ts
streamEvents(input, config)
```

### 3.1 `input`

和 `invoke()`、`stream()` 基本一致，传入图运行所需的输入。

例如：

```ts
{
  messages: [{ role: "user", content: "你好" }]
}
```

如果你的图状态里除了 `messages` 还有其他字段，也一起传入。

### 3.2 `config`

最常见的是：

```ts
{ version: "v2" }
```

这里的 `version` 可以理解为事件流协议版本。实际开发中，优先使用文档示例中的 `v2`。

---

## 4. 返回值是什么

`streamEvents()` 返回的是一个 **异步可迭代对象**。

所以通常搭配：

```ts
for await (const evt of eventStream) {
  // 处理每一个事件
}
```

这意味着：

- 事件会随着执行过程持续到达
- 你可以边接收边处理
- 非常适合转发到 SSE / WebSocket

---

## 5. 事件对象结构

每次迭代拿到的通常是一个事件对象，常见结构如下：

```ts
{
  event: "on_chat_model_stream",
  name: "agent",
  data: { ... },
  tags: ["..."],
  metadata: { ... },
  run_id: "...",
}
```

常用字段说明：

| 字段 | 说明 |
|------|------|
| `event` | 事件类型 |
| `name` | 当前 runnable / 节点 / 工具名称 |
| `data` | 事件携带的数据 |
| `tags` | 标签，可用于进一步筛选 |
| `metadata` | 额外元数据 |
| `run_id` | 本次运行的唯一标识 |

最常用的是：

- `event`
- `name`
- `data`

---

## 6. 常见事件类型

`StreamEvent` 的标准事件名可以理解为：

```ts
on_[runnable_type]_[phase]
```

其中：

- `runnable_type` 表示当前执行的对象类型
- `phase` 表示当前生命周期阶段

常见组合包括：

- `llm`
- `chat_model`
- `prompt`
- `tool`
- `chain`
- `retriever`

生命周期阶段通常包括：

- `start`：开始执行
- `stream`：正在流式输出
- `end`：执行结束

另外还存在一类特殊事件：

- `on_custom_event`：业务侧主动派发的自定义事件

### 6.0 事件一览表

| 事件名 | 含义 | 常见用途 | 是否常见于当前 Agent 场景 |
|------|------|------|------|
| `on_llm_start` | 原始 LLM 开始执行 | 记录模型调用开始 | 较少，更多场景会看到 `chat_model` |
| `on_llm_stream` | 原始 LLM 正在流式输出 | 接收 token / chunk | 较少 |
| `on_llm_end` | 原始 LLM 执行结束 | 记录模型调用结束 | 较少 |
| `on_chat_model_start` | 聊天模型开始执行 | 标记模型开始回答或开始思考 | 很常见 |
| `on_chat_model_stream` | 聊天模型正在流式输出 | 前端打字机效果、增量展示回答 | 很常见 |
| `on_chat_model_end` | 聊天模型输出结束 | 标记本轮模型生成结束 | 很常见 |
| `on_prompt_start` | Prompt 模板开始格式化 / 执行 | 调试 Prompt 拼装过程 | 偶尔 |
| `on_prompt_end` | Prompt 模板处理结束 | 查看最终 Prompt 是否构造完成 | 偶尔 |
| `on_tool_start` | 工具开始调用 | 前端显示“正在调用工具” | 很常见 |
| `on_tool_end` | 工具调用结束 | 前端显示“工具执行完成”并展示结果 | 很常见 |
| `on_chain_start` | 某个 chain / runnable / 节点开始执行 | 标记节点开始、显示执行步骤 | 很常见 |
| `on_chain_stream` | 某个 chain 正在流式输出中间结果 | 展示中间步骤或中间状态 | 视实现而定 |
| `on_chain_end` | 某个 chain / runnable / 节点执行结束 | 标记步骤完成 | 很常见 |
| `on_retriever_start` | 检索器开始检索 | 显示“开始知识库检索” | RAG 场景常见 |
| `on_retriever_end` | 检索器结束检索 | 展示检索结果或命中文档数量 | RAG 场景常见 |
| `on_custom_event` | 自定义业务事件 | 推送“正在检索”“正在总结”等业务文案 | 非常推荐 |

### 6.1 模型相关事件

- `on_chat_model_start`
- `on_chat_model_stream`
- `on_chat_model_end`

这些事件通常表示：

- 模型开始执行
- 模型正在逐步输出内容
- 模型输出结束

处理建议：

- `on_chat_model_start`
  - 可以通知前端“模型开始生成”
  - 通常可作为一次回答生命周期的开始标记
- `on_chat_model_stream`
  - 一般从 `data.chunk` 中提取增量内容
  - 适合直接转发到 SSE / WebSocket
  - 前端通常只渲染有实际文本内容的 chunk
- `on_chat_model_end`
  - 可作为本轮回答结束信号
  - 适合做收尾，例如关闭 loading、补齐状态

如果你当前项目做统一事件适配，可以把它们映射为：

- `on_chat_model_start` -> `modelStart`
- `on_chat_model_stream` -> `messageChunk`
- `on_chat_model_end` -> `modelEnd`

### 6.2 工具相关事件

- `on_tool_start`
- `on_tool_end`

这些事件通常表示：

- 某个工具开始被调用
- 某个工具调用结束，并返回结果

处理建议：

- `on_tool_start`
  - 可以从 `metadata.tool_call_id` 中拿到工具调用 ID
  - 适合在前端展示“调用天气工具中”“调用搜索工具中”
- `on_tool_end`
  - 可以作为工具调用完成标记
  - 适合把工具结果、执行状态同步给前端

如果你当前项目做统一事件适配，可以把它们映射为：

- `on_tool_start` -> `toolStart`
- `on_tool_end` -> `toolEnd`

### 6.3 链路 / 节点相关事件

- `on_chain_start`
- `on_chain_stream`
- `on_chain_end`

这些事件通常表示：

- 某个 runnable / node / chain 开始执行
- 某个 runnable / node / chain 正在输出中间结果
- 某个 runnable / node / chain 执行结束

处理建议：

- 如果你的 LangGraph 中包含多个节点，这类事件很适合驱动“执行步骤面板”
- 可以结合 `name` 字段判断当前是哪个节点
- 可以结合 `run_id` 区分不同执行实例

常见前端文案示例：

- `on_chain_start` -> “开始执行节点：agent”
- `on_chain_end` -> “节点执行完成：agent”

### 6.4 检索相关事件

- `on_retriever_start`
- `on_retriever_end`

这些事件通常出现在 RAG、知识库问答、向量检索等场景中。

处理建议：

- `on_retriever_start`
  - 通知前端“开始检索相关资料”
- `on_retriever_end`
  - 通知前端“检索完成”
  - 如果业务上允许，可以补充检索命中文档数量、文档标题等摘要信息

### 6.5 Prompt 相关事件

- `on_prompt_start`
- `on_prompt_end`

这些事件更偏调试用途，通常用于观察 Prompt 模板何时开始和结束处理。

处理建议：

- 生产环境一般不一定要直接暴露给前端
- 在调试面板中很有价值，可帮助判断 Prompt 是否按预期拼装

### 6.6 自定义事件

- `on_custom_event`

这是业务开发里非常有用的一类事件，可以让你自己发“开始检索”“检索完成”“正在总结”等前端友好文案。

处理建议：

- 当标准事件不足以表达业务阶段时，优先使用自定义事件补足
- 自定义事件非常适合做用户可读的进度提示，而不是只暴露底层技术事件

示例业务文案：

- `正在分析用户问题`
- `正在查询天气`
- `正在整理最终答案`

### 6.7 当前项目中的实际处理情况

当前项目在 `src/ai/utils/adapters.ts:146` 开始对 LangChain `StreamEvent` 做统一适配，目前已处理：

- `on_chat_model_start` -> `modelStart`
- `on_chat_model_end` -> `modelEnd`
- `on_tool_start` -> `toolStart`

对应位置：

- `src/ai/utils/adapters.ts:151`
- `src/ai/utils/adapters.ts:158`
- `src/ai/utils/adapters.ts:165`

这意味着当前适配层还没有把以下常见事件继续向外透出：

- `on_chat_model_stream`
- `on_tool_end`
- `on_chain_start`
- `on_chain_end`
- `on_retriever_start`
- `on_retriever_end`
- `on_custom_event`

如果后续要完善前端执行步骤展示，通常会优先补充这些事件。

### 6.8 如何理解这些事件的处理优先级

如果是做聊天 Agent 的前端实时展示，通常优先级可以这样排：

1. `on_chat_model_stream`
   - 直接决定是否能实时看到模型输出
2. `on_tool_start` / `on_tool_end`
   - 直接决定是否能看到工具调用过程
3. `on_chain_start` / `on_chain_end`
   - 决定是否能看到节点级步骤状态
4. `on_custom_event`
   - 决定业务提示是否足够友好
5. `on_prompt_*` / `on_llm_*`
   - 更偏底层调试与诊断

---

## 7. 监听模型流式输出

如果你想拿到模型的流式 token，可以监听 `on_chat_model_stream`。

```ts
const eventStream = await graph.streamEvents(
  {
    messages: [{ role: "user", content: "介绍一下 LangGraph" }],
  },
  {
    version: "v2",
  }
);

for await (const { event, data } of eventStream) {
  if (event === "on_chat_model_stream") {
    const chunk = data?.chunk;
    if (chunk?.content) {
      console.log(chunk.content);
    }
  }
}
```

适合场景：

- 聊天窗口打字机效果
- 实时显示模型回答过程

注意：

- 某些模型在请求工具调用时，可能会产生空内容 chunk
- 因此前端展示时，通常只处理有实际文本内容的 chunk

---

## 8. 监听工具调用

如果你想知道工具什么时候开始和结束，可以监听：

- `on_tool_start`
- `on_tool_end`

示例：

```ts
const eventStream = await graph.streamEvents(input, {
  version: "v2",
});

for await (const evt of eventStream) {
  if (evt.event === "on_tool_start") {
    console.log("工具开始:", evt.name, evt.data?.input);
  }

  if (evt.event === "on_tool_end") {
    console.log("工具结束:", evt.name, evt.data?.output);
  }
}
```

适合场景：

- 告诉前端当前正在调用什么工具
- 展示工具的输入参数和返回结果
- 记录工具耗时与执行状态

---

## 9. 监听完整执行过程

下面是一个更完整的事件处理示例：

```ts
const eventStream = await graph.streamEvents(input, {
  version: "v2",
});

for await (const evt of eventStream) {
  switch (evt.event) {
    case "on_chain_start":
      console.log("节点开始:", evt.name);
      break;

    case "on_chat_model_start":
      console.log("模型开始:", evt.name);
      break;

    case "on_chat_model_stream":
      console.log("模型流式输出:", evt.data?.chunk?.content);
      break;

    case "on_tool_start":
      console.log("工具开始:", evt.name, evt.data?.input);
      break;

    case "on_tool_end":
      console.log("工具结束:", evt.name, evt.data?.output);
      break;

    case "on_chain_end":
      console.log("节点结束:", evt.name);
      break;
  }
}
```

这个方式适合用来：

- 输出服务端调试日志
- 生成运行面板
- 对接前端可视化步骤展示

---

## 10. 自定义事件的使用方式

如果默认事件不足以表达业务语义，可以在图节点内部派发自定义事件。

### 10.1 在节点中派发自定义事件

```ts
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";

async function myNode(state: any) {
  await dispatchCustomEvent("progress_event", {
    message: "开始检索知识库",
  });

  // 执行业务逻辑

  await dispatchCustomEvent("progress_event", {
    message: "知识库检索完成",
  });

  return state;
}
```

### 10.2 在外部监听自定义事件

```ts
const eventStream = await graph.streamEvents(input, {
  version: "v2",
});

for await (const evt of eventStream) {
  if (evt.event === "on_custom_event") {
    console.log("自定义事件:", evt.name, evt.data);
  }
}
```

这时你可以通过：

- `evt.event === "on_custom_event"`
- `evt.name === "progress_event"`

来筛选指定的业务事件。

---

## 11. 转发给前端的推荐方式

实际业务里，一般不会把 LangGraph 原始事件直接返回给前端，而是建议做一层归一化。

例如定义统一的前端事件结构：

```ts
export type FrontendAgentEvent =
  | {
      type: "step";
      step: string;
      node?: string;
      message: string;
    }
  | {
      type: "token";
      content: string;
    }
  | {
      type: "tool";
      status: "start" | "end";
      name: string;
      input?: unknown;
      output?: unknown;
    }
  | {
      type: "custom";
      name: string;
      payload: unknown;
    }
  | {
      type: "done";
    }
  | {
      type: "error";
      message: string;
    };
```

这样前端只依赖你的业务协议，而不是直接依赖 LangGraph 底层结构。

---

## 12. 配合 SSE 的示例

下面是一个简化的 Express SSE 示例：

```ts
import express from "express";

const app = express();

app.get("/agent/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const input = {
      messages: [{ role: "user", content: "帮我总结一下这篇文章" }],
    };

    const eventStream = await graph.streamEvents(input, {
      version: "v2",
    });

    for await (const evt of eventStream) {
      switch (evt.event) {
        case "on_chat_model_start":
          send({
            type: "step",
            step: "llm_start",
            node: evt.name,
            message: "模型开始思考",
          });
          break;

        case "on_chat_model_stream": {
          const text = evt.data?.chunk?.content;
          if (typeof text === "string" && text) {
            send({
              type: "token",
              content: text,
            });
          }
          break;
        }

        case "on_tool_start":
          send({
            type: "tool",
            status: "start",
            name: evt.name ?? "unknown_tool",
            input: evt.data?.input,
          });
          break;

        case "on_tool_end":
          send({
            type: "tool",
            status: "end",
            name: evt.name ?? "unknown_tool",
            output: evt.data?.output,
          });
          break;

        case "on_custom_event":
          send({
            type: "custom",
            name: evt.name ?? "custom_event",
            payload: evt.data,
          });
          break;
      }
    }

    send({ type: "done" });
    res.end();
  } catch (error) {
    send({
      type: "error",
      message: error instanceof Error ? error.message : "unknown error",
    });
    res.end();
  }
});
```

前端可以通过 `EventSource` 接收：

```ts
const es = new EventSource("/agent/stream");

es.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log(data);
};
```

---

## 13. `streamEvents()` 与 `stream()` 的区别

### `stream()`

更适合：

- 关注状态更新结果
- 关注节点输出
- 用 `updates` 看执行步骤
- 用 `messages` 看模型 token

例如：

```ts
graph.stream(input, { streamMode: "updates" })
```

### `streamEvents()`

更适合：

- 关注底层生命周期事件
- 关注 tool start / end
- 关注 chat model start / stream / end
- 关注 chain start / end
- 做调试、监控、前端事件总线

可以简单理解为：

- `stream()` = 更偏“结果流”
- `streamEvents()` = 更偏“事件流”

---

## 14. 什么时候优先用 `streamEvents()`

建议在以下场景优先使用：

1. 你需要精确知道工具何时开始和结束
2. 你需要区分模型开始、模型流式输出、模型结束
3. 你需要完整运行轨迹
4. 你需要派发和监听自定义业务事件
5. 你要给前端构建“执行过程面板”而不是只显示最终结果

如果你只是想知道“图执行到哪个节点了”，有时 `stream({ streamMode: "updates" })` 会更直接。

---

## 15. 开发建议

### 15.1 生产环境建议做事件归一化

不要把 LangGraph 原始事件结构直接给前端，建议统一成自己的业务协议。

### 15.2 前端只展示必要字段

大部分用户界面只需要：

- 当前步骤
- 正在调用的工具
- 流式回答内容
- 最终完成或错误

### 15.3 自定义事件比默认节点名更友好

例如：

- 默认节点名：`agent`
- 更友好的业务文案：`正在分析问题`

因此建议把默认事件和自定义事件组合使用。

---

## 16. 总结

`streamEvents()` 是 LangGraph 中用于监听 **完整执行事件流** 的 API。

最核心的使用方式是：

```ts
const eventStream = await graph.streamEvents(input, {
  version: "v2",
});

for await (const evt of eventStream) {
  console.log(evt.event, evt.name, evt.data);
}
```

你最常关注的事件通常包括：

- `on_chat_model_start`
- `on_chat_model_stream`
- `on_chat_model_end`
- `on_tool_start`
- `on_tool_end`
- `on_chain_start`
- `on_chain_end`
- `on_custom_event`

适用结论：

- 想看节点步骤：优先考虑 `stream({ streamMode: "updates" })`
- 想看完整生命周期事件：使用 `streamEvents()`
- 想传给前端：建议在后端归一化后通过 SSE / WebSocket 推送
