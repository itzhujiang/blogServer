# LangChain 相关包使用说明

本文档基于项目当前依赖版本整理：

- `@langchain/core`: `^1.1.36`
- `@langchain/langgraph`: `^1.2.6`
- `@langchain/langgraph-checkpoint`: `^1.0.1`
- `@langchain/openai`: `^1.3.1`

适用场景：TypeScript + Node.js 后端项目，尤其适合当前项目这类基于 Express 的 AI 接口开发。

---

## 1. 包职责概览

这 4 个包可以按职责分层理解：

### `@langchain/core`
基础抽象层，提供：

- 消息类型：`HumanMessage` / `AIMessage` / `SystemMessage`
- Prompt 模板：`ChatPromptTemplate`
- 工具定义：`tool(...)`
- Runnable 组合能力：`pipe()`、`RunnableLambda` 等
- 输出解析等通用组件

### `@langchain/openai`
模型接入层，提供：

- `ChatOpenAI`：调用 OpenAI 聊天模型
- `OpenAIEmbeddings`：生成向量嵌入

### `@langchain/langgraph`
工作流/Agent 编排层，提供：

- `StateGraph`：定义状态图
- `Annotation.Root(...)`：定义状态结构
- `START` / `END`：流程起点和终点
- `compile()` / `invoke()` / `stream()`：编译与执行图

### `@langchain/langgraph-checkpoint`
持久化/记忆层，提供：

- `MemorySaver` 等 checkpoint 能力
- 通过 `thread_id` 实现多轮对话会话记忆
- 支持图状态恢复

---

## 2. `@langchain/core` 常见用法

`@langchain/core` 是 LangChain JS 的基础层。即使你主要使用 OpenAI 和 LangGraph，也通常会依赖它的消息、Prompt、工具定义能力。

### 2.1 Prompt 模板

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个有帮助的助手"],
  ["user", "请介绍一下 {topic}"],
]);

const messages = await prompt.invoke({ topic: "LangGraph" });
console.log(messages);
```

适合场景：

- 封装系统提示词
- 动态拼接用户输入
- 构建可复用 Prompt

### 2.2 消息对象

```ts
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

const conversation = [
  new SystemMessage("你是一个翻译助手"),
  new HumanMessage("把 'hello' 翻译成中文"),
  new AIMessage("你好"),
  new HumanMessage("把 'how are you' 也翻译一下"),
];
```

适合场景：

- 手动维护聊天上下文
- 给模型传入结构化历史消息
- 与 LangGraph 的 `messages` 状态配合

### 2.3 工具定义

通常配合 `zod` 一起定义入参结构：

```ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getWeather = tool(
  async ({ city }) => {
    return `${city} 今天天气晴`;
  },
  {
    name: "get_weather",
    description: "获取指定城市天气",
    schema: z.object({
      city: z.string().describe("城市名"),
    }),
  }
);
```

适合场景：

- 给模型暴露可调用工具
- 与 `llm.bindTools([...])` 配合使用
- 构建 Agent 能力

### 2.4 Runnable 组合

LangChain 的核心思想之一是把各个步骤串成链。

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个后端开发助手"],
  ["user", "请解释 {topic}"],
]);

const llm = new ChatOpenAI({
  model: "gpt-4.1",
  temperature: 0,
});

const chain = prompt.pipe(llm);

const result = await chain.invoke({ topic: "LangGraph 的状态图" });
console.log(result.content);
```

---

## 3. `@langchain/openai` 常见用法

这个包负责把 LangChain 与 OpenAI 模型连接起来。

### 3.1 基础聊天

```ts
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: "gpt-4.1",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});

const res = await llm.invoke("你好，介绍一下 LangChain");
console.log(res.content);
```

说明：

- `apiKey` 不传时，通常默认读取 `process.env.OPENAI_API_KEY`
- `invoke()` 可以直接传字符串，也可以传消息数组

### 3.2 配合 Prompt 使用

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: "gpt-4.1",
  temperature: 0,
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个后端开发助手"],
  ["user", "请解释 {topic}"],
]);

const chain = prompt.pipe(llm);

const result = await chain.invoke({ topic: "LangGraph 的状态图" });
console.log(result.content);
```

### 3.3 流式输出

```ts
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: "gpt-4.1",
  temperature: 0,
});

const stream = await llm.stream("请分点介绍 LangGraph");
for await (const chunk of stream) {
  process.stdout.write(chunk.content ?? "");
}
```

适合场景：

- SSE 输出
- 打字机流式响应
- 聊天接口实时返回

### 3.4 绑定工具

```ts
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getWeather = tool(
  async ({ city }) => `${city} 今天多云`,
  {
    name: "get_weather",
    description: "查询天气",
    schema: z.object({
      city: z.string(),
    }),
  }
);

const llm = new ChatOpenAI({
  model: "gpt-4.1",
  temperature: 0,
});

const llmWithTools = llm.bindTools([getWeather]);

const result = await llmWithTools.invoke(
  "帮我查一下北京天气，记得调用工具"
);

console.log(result);
console.log(result.tool_calls);
```

适合场景：

- Tool Calling
- 数据库查询、检索、业务工具接入
- Agent 工作流

### 3.5 Embeddings

```ts
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
  apiKey: process.env.OPENAI_API_KEY,
});

const vector = await embeddings.embedQuery("LangGraph 是什么");
console.log(vector.length);
```

适合场景：

- 向量检索
- RAG
- 相似度搜索

---

## 4. `@langchain/langgraph` 常见用法

`@langchain/langgraph` 用于构建有状态的工作流和 Agent。

### 4.1 核心概念

- `StateGraph`：图结构本身
- `Annotation.Root(...)`：定义图状态
- `addNode(name, fn)`：添加处理节点
- `addEdge(from, to)`：连接节点
- `START` / `END`：开始与结束
- `compile()`：编译图
- `invoke()`：执行一次
- `stream()`：流式执行

### 4.2 最小可运行示例

```ts
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

const GraphState = Annotation.Root({
  question: Annotation<string>,
  answer: Annotation<string>,
});

const answerNode = async (state: typeof GraphState.State) => {
  return {
    answer: `你问的是: ${state.question}`,
  };
};

const graph = new StateGraph(GraphState)
  .addNode("answerNode", answerNode)
  .addEdge(START, "answerNode")
  .addEdge("answerNode", END)
  .compile();

const result = await graph.invoke({
  question: "LangGraph 是什么？",
});

console.log(result);
```

### 4.3 带消息状态的图

这是聊天 Agent 中最常见的状态形式：

```ts
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";

const State = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

const node = async (state: typeof State.State) => {
  return {
    messages: [new HumanMessage("这是节点返回的新消息")],
  };
};

const app = new StateGraph(State)
  .addNode("node", node)
  .addEdge(START, "node")
  .addEdge("node", END)
  .compile();

const res = await app.invoke({ messages: [] });
console.log(res.messages);
```

这里的关键点是：

- `messages` 是一个数组状态通道
- `reducer` 负责把历史消息和新消息拼接起来
- 每个节点只返回增量消息即可

### 4.4 `stream()` 执行

```ts
const stream = await graph.stream(
  { question: "介绍一下 LangGraph" },
  { streamMode: "values" }
);

for await (const chunk of stream) {
  console.log(chunk);
}
```

适合场景：

- 节点执行过程可视化
- 流式响应给前端
- 观察 graph 中间状态

---

## 5. `@langchain/langgraph-checkpoint` 常见用法

这个包负责给 LangGraph 增加持久化与记忆能力。

### 5.1 典型用途

- 多轮会话记忆
- 保留图执行状态
- 根据 `thread_id` 恢复某个用户会话

### 5.2 最小示例：给 graph 增加记忆

```ts
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

const State = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

const replyNode = async (state: typeof State.State) => {
  const last = state.messages[state.messages.length - 1];
  return {
    messages: [
      new AIMessage(
        `收到消息: ${typeof last?.content === "string" ? last.content : ""}`
      ),
    ],
  };
};

const checkpointer = new MemorySaver();

const app = new StateGraph(State)
  .addNode("reply", replyNode)
  .addEdge(START, "reply")
  .addEdge("reply", END)
  .compile({
    checkpointer,
  });

const config = {
  configurable: {
    thread_id: "chat-1",
  },
};

await app.invoke(
  { messages: [new HumanMessage("你好")] },
  config
);

const res2 = await app.invoke(
  { messages: [new HumanMessage("你还记得上一句吗？")] },
  config
);

console.log(res2.messages);
```

### 5.3 关键点

#### 编译时传入 checkpointer

```ts
const app = workflow.compile({
  checkpointer: new MemorySaver(),
});
```

#### 调用时传入 `thread_id`

```ts
const config = {
  configurable: {
    thread_id: "user-1",
  },
};
```

#### 同一个 `thread_id` 共享会话状态

只要：

- graph 使用了同一个 checkpointer
- 调用时使用同一个 `thread_id`

那么 LangGraph 就会把它们视作同一条会话。

---

## 6. 四个包之间如何组合

在实际项目中，最常见的组合方式如下：

- `@langchain/core`：负责消息、Prompt、工具定义
- `@langchain/openai`：负责调用模型
- `@langchain/langgraph`：负责组织流程和状态
- `@langchain/langgraph-checkpoint`：负责会话记忆和状态持久化

可以理解成：

1. 用 `core` 定义输入输出格式
2. 用 `openai` 调模型
3. 用 `langgraph` 编排流程
4. 用 `checkpoint` 保存上下文

---

## 7. 一个最常见的组合示例

下面是一个最小可用的“带记忆聊天图”示例：

```ts
import { ChatOpenAI } from "@langchain/openai";
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

const llm = new ChatOpenAI({
  model: "gpt-4.1",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});

const State = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

const chatNode = async (state: typeof State.State) => {
  const response = await llm.invoke(state.messages);
  return {
    messages: [response as AIMessage],
  };
};

const app = new StateGraph(State)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile({
    checkpointer: new MemorySaver(),
  });

const config = {
  configurable: {
    thread_id: "user-1",
  },
};

const result = await app.invoke(
  {
    messages: [new HumanMessage("请介绍一下你自己")],
  },
  config
);

console.log(result.messages[result.messages.length - 1].content);
```

---

## 8. 在当前项目中的建议用法

结合当前博客后端项目，这几个包比较适合以下场景：

### 8.1 AI 聊天接口

适合组合：

- `@langchain/openai`：调用模型
- `@langchain/core`：组织 Prompt 与消息
- `@langchain/langgraph`：组织多步骤聊天流程
- `@langchain/langgraph-checkpoint`：实现多轮记忆

### 8.2 内容生成工作流

例如：

1. 节点 1：解析用户需求
2. 节点 2：生成文章草稿
3. 节点 3：润色内容
4. 节点 4：输出结构化结果

这种场景用 `langgraph` 比单纯链式调用更适合，因为它更适合表达状态流转。

### 8.3 工具调用型 Agent

例如：

- 查询文章详情
- 查询标签或分类
- 调用数据库检索历史记录
- 再把结果交给模型生成最终回答

这类场景适合：

- `@langchain/core/tools`
- `ChatOpenAI.bindTools(...)`
- `@langchain/langgraph` 做控制流编排

---

## 9. 版本使用建议

当前项目安装的是：

- `@langchain/core` `^1.1.36`
- `@langchain/langgraph` `^1.2.6`
- `@langchain/langgraph-checkpoint` `^1.0.1`
- `@langchain/openai` `^1.3.1`

根据当前文档检索结果，有些示例中会出现两种写法：

- 从 `@langchain/langgraph` 导入 `MemorySaver`
- 从 `@langchain/langgraph-checkpoint` 导入 `MemorySaver`

对于当前项目，既然已经单独安装了 `@langchain/langgraph-checkpoint`，建议优先使用：

```ts
import { MemorySaver } from "@langchain/langgraph-checkpoint";
```

这样和项目依赖声明更一致。

---

## 11. 使用 LangChain / LangGraph 实现天气 Agent 示例

下面给出一个典型的天气 Agent 示例。它的目标是：

1. 用户输入天气问题
2. 模型判断是否需要调用天气工具
3. 工具返回天气数据
4. 模型基于工具结果生成最终回复

这个流程非常适合用 LangGraph 实现，因为它天然适合表达：

- 模型思考
- 工具调用
- 再次思考
- 最终输出

### 11.1 适用场景

适合以下需求：

- 查询天气
- 查询汇率
- 查询库存
- 查询数据库记录
- 所有“模型决定是否调用工具”的场景

### 11.2 执行流程

天气 Agent 的典型流程如下：

```text
用户消息 -> agent 节点 -> tools 节点 -> agent 节点 -> 输出结果
```

说明：

- 第一次进入 `agent` 节点时，模型判断要不要调用工具
- 如果模型返回了 `tool_calls`，则进入 `tools` 节点
- `tools` 节点执行天气工具后，再回到 `agent` 节点
- 第二次进入 `agent` 节点时，模型根据工具结果生成最终自然语言回复

### 11.3 最小可运行示例

```ts
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import {
  MessagesAnnotation,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import type { AIMessage } from "@langchain/core/messages";
import { z } from "zod";

const getWeather = tool(
  async ({ city }: { city: string }) => {
    const mockWeatherMap: Record<string, string> = {
      北京: "晴，18~26℃，东北风 2 级",
      上海: "多云，20~28℃，东南风 3 级",
      广州: "小雨，24~30℃，南风 2 级",
      深圳: "阴，25~31℃，南风 2 级",
    };

    return mockWeatherMap[city] ?? `${city}：暂无天气数据`;
  },
  {
    name: "get_weather",
    description: "查询指定城市的天气信息",
    schema: z.object({
      city: z.string().describe("要查询天气的城市名称，例如北京、上海"),
    }),
  }
);

const tools = [getWeather];
const toolNode = new ToolNode(tools);

const model = new ChatOpenAI({
  model: "gpt-4.1",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
}).bindTools(tools);

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke([
    {
      role: "system",
      content:
        "你是一个天气助手。当用户询问天气时，优先调用 get_weather 工具获取结果后再回答。回答要简洁、自然，并使用中文。",
    },
    ...state.messages,
  ]);

  return {
    messages: [response],
  };
}

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if ((lastMessage.tool_calls?.length ?? 0) > 0) {
    return "tools";
  }

  return END;
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent");

const app = workflow.compile({
  checkpointer: new MemorySaver(),
});

async function run() {
  const config = {
    configurable: {
      thread_id: "weather-user-1",
    },
  };

  const result = await app.invoke(
    {
      messages: [
        {
          role: "user",
          content: "帮我查一下北京今天天气",
        },
      ],
    },
    config
  );

  const lastMessage = result.messages[result.messages.length - 1];
  console.log(lastMessage.content);
}

run();
```

### 11.4 关键点说明

#### 1）工具定义

```ts
const getWeather = tool(...)
```

这里定义了一个名为 `get_weather` 的工具。模型会根据工具的：

- 名称
- 描述
- 参数 schema

来判断什么时候调用它。

#### 2）`bindTools()`

```ts
const model = new ChatOpenAI(...).bindTools(tools);
```

这一步把工具能力绑定给模型。绑定后，模型不只是生成文本，还可以返回工具调用请求。

#### 3）`ToolNode`

```ts
const toolNode = new ToolNode(tools);
```

`ToolNode` 负责真正执行工具调用。通常可以把它理解为“工具执行器”。

#### 4）条件路由

```ts
function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.tool_calls?.length) return "tools";
  return END;
}
```

这里决定流程下一步怎么走：

- 如果模型发起工具调用，就去 `tools`
- 如果模型已经给出最终答案，就结束

#### 5）节点只返回增量消息

在 `MessagesAnnotation` 模式下，每个节点只需要返回本次新增消息，例如：

```ts
return {
  messages: [response],
};
```

不需要手动把完整历史消息重新拼回去，因为 LangGraph 会通过 reducer 自动把历史状态和新消息合并。

### 11.5 如果接真实天气接口，怎么改

示例里的天气工具使用的是 mock 数据：

```ts
const mockWeatherMap: Record<string, string> = {
  北京: "晴，18~26℃，东北风 2 级",
  ...
};
```

如果要接真实接口，可以把工具实现改成请求外部天气 API：

```ts
const getWeather = tool(
  async ({ city }: { city: string }) => {
    const res = await fetch(
      `https://your-weather-api.example.com/weather?city=${encodeURIComponent(city)}`
    );
    const data = await res.json();

    return `${city}：${data.weather}，${data.temp}℃，${data.wind}`;
  },
  {
    name: "get_weather",
    description: "查询指定城市的天气信息",
    schema: z.object({
      city: z.string(),
    }),
  }
);
```

实践建议：

- 工具层尽量只负责取数
- 最终面向用户的话术交给模型组织
- 参数设计尽量简单，优先只保留 `city`

### 11.6 适合当前项目的落地方向

在当前博客后端项目中，这种模式不仅可以用于天气查询，也可以扩展到：

- 查询文章信息
- 查询标签/分类
- 查询评论统计
- 查询知识库
- 多工具 Agent

一个常见的目录拆分方式如下：

```text
src/
  ai/
    tools/
      weather.ts
    graph/
      weatherAgent.ts
    services/
      weatherAgentService.ts
    api/
      weatherAgent.ts
```

推荐职责：

- `tools/weather.ts`：定义天气工具
- `graph/weatherAgent.ts`：定义 LangGraph 图
- `services/weatherAgentService.ts`：封装对外调用
- `api/weatherAgent.ts`：提供 Express 路由接口

### 11.7 总结

如果你的目标是做一个“会自己决定是否调用天气工具”的 AI agent，那么推荐组合是：

- `@langchain/core`：定义工具与消息
- `@langchain/openai`：调用大模型
- `@langchain/langgraph`：管理 agent 流程
- `@langchain/langgraph-checkpoint`：实现多轮会话记忆

这也是当前项目后续扩展 AI 工具调用能力时最自然的一条路线。
