# Function Calling 使用说明

## 什么是 Function Calling

Function Calling（函数调用）是 OpenAI 提供的一种机制，让 LLM 不直接输出文本，而是输出一个结构化的"工具调用"指令，由开发者决定如何执行。

### 普通对话 vs Function Calling

**普通对话**：LLM 直接返回文本
```
用户输入 → LLM → 纯文本回复
```

**Function Calling**：LLM 返回结构化调用指令
```
用户输入 + 工具描述 → LLM → { name: "工具名", arguments: { ... } }
```

---

## 底层 API 差异

### 普通请求
```json
{
  "model": "gpt-4",
  "messages": [{ "role": "user", "content": "今天天气怎么样？" }]
}
```

### 开启 Function Calling 的请求
```json
{
  "model": "gpt-4",
  "messages": [{ "role": "user", "content": "今天天气怎么样？" }],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "获取指定城市的天气",
        "parameters": {
          "type": "object",
          "properties": {
            "city": { "type": "string", "description": "城市名称" }
          },
          "required": ["city"]
        }
      }
    }
  ]
}
```

### LLM 的返回
```json
{
  "role": "assistant",
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"city\": \"北京\"}"
      }
    }
  ]
}
```

---

## 两种结构化输出模式对比

LangChain 的 `withStructuredOutput` 支持两种底层模式：

| 模式 | 底层 API 参数 | 要求 | 适用场景 |
|------|-------------|------|---------|
| `json_object`（默认）| `response_format: { type: "json_object" }` | prompt 中必须包含 "json" 字样 | 模型不支持工具调用时 |
| `functionCalling` | `tools: [...]` | 模型需支持工具调用 | 推荐，无额外 prompt 限制 |

---

## 在项目中的使用

### 场景：路由节点确定跳转目标

```typescript
import { z } from 'zod';
import { createOpenAiLLM } from '@/ai/utils/llm';

// 1. 定义输出结构
const routerSchema = z.object({
  next: z
    .enum(['weatherAgent', '__end__'])
    .describe('根据用户问题决定调用哪个agent'),
});

// 2. 绑定结构化输出，指定 functionCalling 模式
const llm = createOpenAiLLM({ temperature: 0 }).withStructuredOutput(routerSchema, {
  method: 'functionCalling',
});

// 3. 调用，直接拿到符合 schema 的对象，无需手动解析
const result = await llm.invoke(messages);
console.log(result.next); // 'weatherAgent' | '__end__'
```

LangChain 在内部自动完成：
1. 将 Zod schema 转换为 OpenAI tools 格式发送给 API
2. 接收 LLM 返回的 `tool_calls`
3. 解析 `arguments` 还原为 TypeScript 对象

### 场景：工具节点执行实际工具

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const getWeatherTool = new DynamicStructuredTool({
  name: 'getWeather',
  description: '获取指定城市的实时天气',
  schema: z.object({
    city: z.string().describe('城市名称'),
  }),
  func: async ({ city }) => {
    // 实际调用天气 API
    return `${city}今天晴，气温 25°C`;
  },
});

// LLM 绑定工具后，会在需要时自动触发 Function Calling
const llm = createOpenAiLLM().bindTools([getWeatherTool]);
```

---

## 完整执行流程

以天气查询为例：

```
1. 用户：北京今天天气怎么样？

2. LLM（bindTools）收到请求
   → 判断需要调用 getWeather
   → 返回 tool_calls: [{ name: "getWeather", arguments: { city: "北京" } }]

3. ToolNode 执行工具
   → 调用 getWeather({ city: "北京" })
   → 返回 ToolMessage: "北京今天晴，气温 25°C"

4. LLM 再次收到消息（包含工具结果）
   → 生成最终文本回复："北京今天天气晴朗，气温25度，适合出行。"
```

在 LangGraph 中对应的图结构：

```
callModel（LLM）→ shouldContinue → tool_executor（ToolNode）→ callModel
                             ↘ END
```

---

## 注意事项

1. **`json_object` 模式的限制**：使用默认模式时，system prompt 中必须包含 "json" 字样，否则 API 会返回 400 错误。推荐改用 `functionCalling` 模式避免此限制。

2. **模型支持**：`functionCalling` 模式要求模型支持工具调用（tool use），部分旧版或轻量模型可能不支持，需确认 API 提供商的文档。

3. **temperature 建议**：路由类场景（需要确定性输出）建议设置 `temperature: 0`，避免 LLM 随机选择不同的路由目标。
