# DynamicStructuredTool 使用说明

## 概述

`DynamicStructuredTool` 是 LangChain 提供的一个工具类，用于动态创建结构化工具。与 `tool` 函数不同，它可以直接接受 **JSON Schema** 格式的参数定义，而不需要 Zod schema。

## 为什么需要 DynamicStructuredTool

### 问题背景

在我们的项目中，前端可以动态传入工具定义，这些工具定义使用 JSON Schema 格式描述参数：

```typescript
// 前端传入的工具定义（来自 adapters.ts）
{
  type: 'function',
  function: {
    name: 'getWeather',
    description: '获取天气信息',
    parameters: {  // JSON Schema 格式
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市名称' }
      },
      required: ['city']
    }
  }
}
```

而 LangChain 的 `tool` 函数要求使用 Zod schema：

```typescript
// tool 函数需要 Zod schema
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const myTool = tool(
  async ({ city }) => { /* 实现 */ },
  {
    name: 'getWeather',
    schema: z.object({ city: z.string() })  // 必须是 Zod
  }
);
```

这就产生了 **JSON Schema → Zod** 的转换需求。

### 解决方案

`DynamicStructuredTool` 可以直接接受 JSON Schema，无需转换。

## 使用方法

### 基本用法

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';

const weatherTool = new DynamicStructuredTool({
  name: 'getWeather',
  description: '获取指定城市的天气信息',
  schema: {  // 直接使用 JSON Schema
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: '要查询天气的城市名称，例如北京、上海'
      }
    },
    required: ['city']
  },
  func: async ({ city }) => {
    // 工具的实际实现逻辑
    const result = await fetchWeather(city);
    return JSON.stringify(result);
  }
});
```

### 在项目中的应用

根据前端传入的工具定义动态创建工具：

```typescript
// 示例：在 adapters.ts 中处理前端传入的工具
import { DynamicStructuredTool } from '@langchain/core/tools';

export function createDynamicTools(frontendTools: UnifyInputType['tools']) {
  return frontendTools.map(toolDef => {
    return new DynamicStructuredTool({
      name: toolDef.toolName,
      description: toolDef.toolDescription,
      schema: toolDef.toolParams,  // 直接使用前端传入的 JSON Schema
      func: async (input) => {
        // 根据工具名称路由到对应的实现
        return await executeToolByName(toolDef.toolName, input);
      }
    });
  });
}
```

## 与 tool 函数的对比

| 特性 | `tool` 函数 | `DynamicStructuredTool` |
|------|------------|------------------------|
| Schema 格式 | Zod schema | JSON Schema |
| 类型安全 | 强（TypeScript 类型推断） | 弱（需手动处理类型） |
| 运行时验证 | Zod 验证 | JSON Schema 验证 |
| 使用场景 | 静态工具定义 | 动态工具创建 |
| 代码风格 | 函数式 | 面向对象 |

## 使用建议

### 静态工具（推荐使用 tool 函数）

对于项目中预定义的工具（如 `getWeather`、`getIpPosition`），建议继续使用 `tool` 函数 + Zod：

```typescript
// src/ai/tools/weather.ts
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const getWeather = tool(
  async ({ city }) => { /* 实现 */ },
  {
    name: 'getWeather',
    description: '获取指定城市的天气信息',
    schema: z.object({
      city: z.string().describe('城市名称')
    })
  }
);
```

**优势：**
- 类型安全，编译时检查
- 代码简洁，易于维护
- 更好的 IDE 支持

### 动态工具（推荐使用 DynamicStructuredTool）

对于前端动态传入的工具定义，使用 `DynamicStructuredTool`：

```typescript
// 处理前端传入的工具
import { DynamicStructuredTool } from '@langchain/core/tools';

function createToolFromFrontend(toolDef: {
  toolName: string;
  toolDescription: string;
  toolParams: Record<string, unknown>;  // JSON Schema
}) {
  return new DynamicStructuredTool({
    name: toolDef.toolName,
    description: toolDef.toolDescription,
    schema: toolDef.toolParams,
    func: async (input) => {
      // 实现工具逻辑
      return await handleToolExecution(toolDef.toolName, input);
    }
  });
}
```

**优势：**
- 无需 JSON Schema → Zod 转换
- 支持运行时动态创建工具
- 灵活性高，适合插件化架构

## 完整示例

### 混合使用两种方式

```typescript
// src/ai/agent/index.ts
import { getWeather, getIpPosition } from '../tools';  // 静态工具
import { createDynamicTools } from '../utils/toolFactory';  // 动态工具

export function createAgent(frontendTools?: ToolDefinition[]) {
  // 静态工具：使用 tool 函数定义
  const staticTools = [getWeather, getIpPosition];

  // 动态工具：使用 DynamicStructuredTool 创建
  const dynamicTools = frontendTools
    ? createDynamicTools(frontendTools)
    : [];

  // 合并所有工具
  const allTools = [...staticTools, ...dynamicTools];

  const toolNode = new ToolNode(allTools);
  const llm = createOpenAiLLM().bindTools(allTools);

  // ... 其他逻辑
}
```

## 注意事项

### 1. 返回值格式

工具的 `func` 函数必须返回字符串：

```typescript
// ✅ 正确
func: async (input) => {
  const result = await fetchData(input);
  return JSON.stringify(result);  // 返回字符串
}

// ❌ 错误
func: async (input) => {
  return await fetchData(input);  // 返回对象
}
```

### 2. 错误处理

建议在 `func` 中添加错误处理：

```typescript
func: async (input) => {
  try {
    const result = await fetchData(input);
    return JSON.stringify({ success: true, data: result });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
}
```

### 3. JSON Schema 验证

`DynamicStructuredTool` 会自动根据 JSON Schema 验证输入参数，无效参数会抛出错误。

### 4. 类型安全

由于使用 JSON Schema，TypeScript 无法推断 `input` 的类型，需要手动处理：

```typescript
interface WeatherInput {
  city: string;
}

func: async (input) => {
  const { city } = input as WeatherInput;
  // ... 使用 city
}
```

## 相关文档

- [LangChain 官方文档 - DynamicStructuredTool](https://js.langchain.com/docs/modules/agents/tools/dynamic)
- [AG-UI与LangChain消息转换设计说明.md](./AG-UI与LangChain消息转换设计说明.md)
- [LangChain相关包使用说明.md](./LangChain相关包使用说明.md)

## 总结

- **静态工具**：使用 `tool` + Zod（类型安全、易维护）
- **动态工具**：使用 `DynamicStructuredTool` + JSON Schema（灵活、支持前端传入）
- **混合使用**：根据场景选择合适的方式，发挥各自优势
