# LangGraph Agent 执行步骤监听与前端推送说明

本文档说明在 `@langchain/langgraph` 中如何监听 Agent 执行到了什么步骤，并将这些步骤、事件或流式内容转发给前端。

适用场景：

- 后端基于 Node.js / TypeScript
- 使用 `@langchain/langgraph` 编排 Agent
- 需要把 Agent 的执行过程实时展示给前端
- 前端通过 SSE / WebSocket 显示步骤进度、工具调用状态、模型输出内容

---

## 1. 目标

通常“把 Agent 执行步骤传给前端”包含以下几类信息：

1. **当前执行到哪个节点**
   - 例如：`agent`、`tools`、`planner`
2. **工具什么时候开始/结束**
   - 例如：开始查询天气、查询结束
3. **模型是否正在输出内容**
   - 例如：逐 token 输出回复内容
4. **是否执行完成或出错**
   - 例如：Agent 完成、工具异常、模型调用失败

在 LangGraph 中，常用的监听方式有 3 种：

- `graph.stream(..., { streamMode: "updates" })`
- `graph.stream(..., { streamMode: "messages" })`
- `graph.streamEvents(..., { version: "v2" })`

如果还需要自定义业务进度文案，可以结合：

- `streamMode: "custom"`
- 在节点或工具内部通过 `config.writer?.(...)` 发送自定义事件

---

## 2. 三种常用监听方式

### 2.1 `streamMode: "updates"`

这是**最适合做步骤进度展示**的方式。

作用：

- 在每个图节点执行后返回一次更新
- 能看到当前是哪个节点产生了什么输出
- 适合前端展示“当前步骤”或“执行日志”

示例：

```ts
const stream = await graph.stream(input, {
  streamMode: "updates",
});

for await (const chunk of stream) {
  for (const [node, values] of Object.entries(chunk)) {
    console.log("当前节点:", node);
    console.log("节点输出:", values);
  }
}
```

常见输出节奏：

1. `agent` 节点输出 AIMessage，里面可能包含 tool call
2. `tools` 节点输出 ToolMessage，表示工具执行结果
3. `agent` 节点再次输出最终回复

适合传给前端的事件示例：

```json
{ "type": "step", "node": "agent", "status": "running", "message": "模型正在分析问题" }
{ "type": "step", "node": "tools", "status": "running", "message": "正在调用工具" }
{ "type": "step", "node": "agent", "status": "done", "message": "正在整理最终答案" }
```

### 2.2 `streamMode: "messages"`

这是**最适合做模型流式输出**的方式。

作用：

- 获取模型生成中的 token 或消息片段
- 适合前端聊天窗口做打字机效果

示例：

```ts
const stream = await graph.stream(input, {
  streamMode: "messages",
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

适合场景：

- 实时展示模型回答内容
- 让用户看到回复逐步生成

### 2.3 `streamEvents(..., { version: "v2" })`

这是**最细粒度的监听方式**。

作用：

- 监听模型开始、模型流式输出、工具开始、工具结束、链路开始、链路结束等完整生命周期事件
- 适合做调试面板、运行监控、详细日志

示例：

```ts
const eventStream = await graph.streamEvents(input, {
  version: "v2",
});

for await (const evt of eventStream) {
  const { event, name, data } = evt;
  console.log(event, name, data);
}
```

常见事件：

- `on_chat_model_start`
- `on_chat_model_stream`
- `on_chat_model_end`
- `on_tool_start`
- `on_tool_end`
- `on_chain_start`
- `on_chain_end`
- `on_custom_event`

---

## 3. 不同模式的区别

| 模式 | 作用 | 适合场景 |
|------|------|----------|
| `updates` | 每个步骤/节点执行后的状态更新 | 展示 Agent 当前执行到了哪里 |
| `values` | 每一步的完整图状态 | 需要完整状态快照 |
| `messages` | 模型 token / 消息流 | 聊天窗口流式输出 |
| `custom` | 自定义业务事件 | 输出友好的进度文案 |
| `debug` | 更详细的内部调试信息 | 开发调试 |
| `streamEvents()` | 最完整事件流 | 运行监控、精细埋点 |

一般建议：

- **只看步骤**：用 `updates`
- **只看回答流式输出**：用 `messages`
- **既要步骤又要友好文案**：用 `updates + custom`
- **要最完整生命周期事件**：用 `streamEvents()`

---

## 4. 推荐方案：`updates + custom`

实际业务里，最推荐的方案通常不是只用默认节点事件，而是：

- 用 `updates` 监听图的自然执行步骤
- 用 `custom` 主动发送更友好的业务文案

原因：

1. 默认节点名通常偏技术化，比如 `agent`、`tools`
2. 前端往往需要更人类可读的文本，比如“正在检索知识库”“正在查询天气”
3. 一个节点内部可能还会有多个细步骤，适合通过 `custom` 继续拆分

---

## 5. 在工具内部发送自定义进度

LangGraph 支持在工具或节点中使用 `config.writer?.(...)` 发送自定义流数据。

示例：

```ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

const getWeather = tool(
  async (input: { city: string }, config: LangGraphRunnableConfig) => {
    config.writer?.({
      type: "progress",
      step: "tool_start",
      message: `开始查询 ${input.city} 天气`,
    });

    const result = `${input.city} 晴天 26°C`;

    config.writer?.({
      type: "progress",
      step: "tool_end",
      message: `天气查询完成`,
      result,
    });

    return result;
  },
  {
    name: "get_weather",
    description: "查询指定城市天气",
    schema: z.object({
      city: z.string().describe("城市名"),
    }),
  }
);
```

然后在执行时监听：

```ts
const stream = await graph.stream(input, {
  streamMode: ["updates", "custom"],
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

这种方式很适合直接推给前端，因为可以输出稳定的业务结构，例如：

```json
{
  "type": "progress",
  "step": "tool_start",
  "message": "开始查询上海天气"
}
```

---

## 6. 适合前端的统一事件结构

不建议把 LangGraph 原始事件结构原样暴露给前端。

建议后端统一转换成项目自己的协议，例如：

```ts
export type FrontendAgentEvent =
  | {
      type: "step";
      node: string;
      message: string;
      status: "running" | "done";
      payload?: unknown;
    }
  | {
      type: "token";
      content: string;
    }
  | {
      type: "tool";
      name: string;
      status: "start" | "end";
      input?: unknown;
      output?: unknown;
    }
  | {
      type: "progress";
      step: string;
      message: string;
      payload?: unknown;
    }
  | {
      type: "done";
      output?: unknown;
    }
  | {
      type: "error";
      message: string;
    };
```

这样做的好处：

- 前后端协议稳定
- 将来替换 LangGraph 内部实现时，前端不用改动
- 可以按业务需要精简字段

---

## 7. 后端通过 SSE 推送给前端

如果前端只需要接收服务端单向推送，推荐使用 **SSE**。

优点：

- 实现简单
- 浏览器原生支持 `EventSource`
- 适合聊天流式输出、步骤日志、工具状态推送

### 7.1 Express SSE 示例

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
      messages: [{ role: "user", content: "上海天气怎么样" }],
    };

    const stream = await graph.stream(input, {
      streamMode: ["updates", "custom"],
    });

    for await (const chunk of stream) {
      send(chunk);
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

### 7.2 前端接收 SSE

```ts
const es = new EventSource("/agent/stream");

es.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log("agent event:", data);
};

es.onerror = () => {
  es.close();
};
```

---

## 8. 使用 `updates` 时的后端映射示例

如果只使用 `streamMode: "updates"`，建议在后端把节点名映射成更友好的前端文案。

```ts
const stepTextMap: Record<string, string> = {
  agent: "模型正在分析问题",
  tools: "正在调用工具",
  planner: "正在规划执行步骤",
};

const stream = await graph.stream(input, {
  streamMode: "updates",
});

for await (const chunk of stream) {
  for (const [node, values] of Object.entries(chunk)) {
    send({
      type: "step",
      node,
      status: "running",
      message: stepTextMap[node] ?? node,
      payload: values,
    });
  }
}
```

适合用于：

- 前端步骤条
- “当前正在做什么”提示
- 调试日志列表

---

## 9. 使用 `streamEvents()` 的后端映射示例

如果你需要监听更细粒度事件，可以使用 `streamEvents()` 并自己做事件归一化。

```ts
const stream = await graph.streamEvents(input, {
  version: "v2",
});

for await (const evt of stream) {
  switch (evt.event) {
    case "on_chat_model_start":
      send({
        type: "step",
        node: evt.name ?? "llm",
        status: "running",
        message: "模型开始思考",
      });
      break;

    case "on_chat_model_stream": {
      const chunk = evt.data?.chunk;
      const text = chunk?.content;
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
        name: evt.name ?? "unknown_tool",
        status: "start",
        input: evt.data?.input,
      });
      break;

    case "on_tool_end":
      send({
        type: "tool",
        name: evt.name ?? "unknown_tool",
        status: "end",
        output: evt.data?.output,
      });
      break;

    case "on_chain_end":
      send({
        type: "step",
        node: evt.name ?? "chain",
        status: "done",
        message: "步骤完成",
      });
      break;
  }
}
```

这个方案更适合：

- 开发环境调试
- 运行链路追踪
- 需要区分模型阶段和工具阶段的场景

---

## 10. 实际开发建议

### 10.1 最常见方案

对于普通聊天 Agent，建议优先使用：

- `streamMode: ["updates", "custom"]`

因为它同时满足：

- 能知道当前到了哪个节点
- 能输出更友好的业务文案
- 实现复杂度适中

### 10.2 如果前端需要打字机效果

在上面的基础上增加：

- `messages`

例如：

```ts
const stream = await graph.stream(input, {
  streamMode: ["updates", "messages", "custom"],
});
```

然后后端按 `mode` 分发：

- `updates` -> 转成 `step`
- `messages` -> 转成 `token`
- `custom` -> 转成 `progress`

### 10.3 如果需要完整监控

改用：

- `streamEvents(..., { version: "v2" })`

适合做：

- 详细日志
- 开发者调试页
- Agent 执行审计

---

## 11. 前后端协作建议

建议前端不要直接依赖 LangGraph 的底层结构，而是约定统一事件类型，例如：

- `step`
- `progress`
- `token`
- `tool`
- `done`
- `error`

推荐展示方式：

1. **顶部状态文案**
   - 当前正在执行：检索资料 / 调用工具 / 组织回答
2. **中间聊天区域**
   - 显示 `token` 流式输出
3. **侧边调试面板**
   - 显示 `tool start/end`、节点更新、自定义进度

这样用户既能看到“结果”，也能看到“过程”。

---

## 12. 总结

如果你的目标是把 LangGraph Agent 执行步骤实时传给前端，可以按下面的选择：

- **看执行到哪个步骤**：`stream(..., { streamMode: "updates" })`
- **看模型流式输出**：`stream(..., { streamMode: "messages" })`
- **看完整生命周期事件**：`streamEvents(..., { version: "v2" })`
- **输出友好的业务进度文案**：`config.writer?.(...)` + `streamMode: "custom"`

推荐优先级：

1. `updates`
2. `updates + custom`
3. `updates + messages + custom`
4. `streamEvents()`

其中，**`updates + custom` 是大多数业务场景下最平衡的方案**。
