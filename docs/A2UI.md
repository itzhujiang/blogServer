# A2UI（Agent-to-User Interface）文档

## 概述

A2UI 是一种由 Agent 驱动的 UI 生成协议，允许 AI Agent 动态创建和更新用户界面。Agent 生成描述组件结构和属性的 JSON 消息，通过流式传输（SSE、WebSocket 或 A2A 协议）发送到客户端，由客户端渲染器将抽象组件描述映射到具体的框架实现。

### 核心特性

- **动态 UI 生成**：Agent 根据上下文实时生成 UI 组件
- **组件解耦**：UI 定义与渲染实现分离，支持多框架适配
- **双向通信**：支持用户交互事件回传给 Agent
- **渐进式渲染**：支持增量更新，无需重建整个界面
- **流式传输**：基于 JSONL 格式，适配 SSE / WebSocket 等传输层

---

## 消息格式（v0.9）

所有消息均为 JSON 格式，包含 `version` 字段标识版本号。

### 1. 创建 Surface（界面容器）

```json
{
  "version": "v0.9",
  "createSurface": {
    "surfaceId": "main",
    "catalogId": "https://a2ui.org/specification/v0_9/basic_catalog.json"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `surfaceId` | string | Surface 唯一标识符 |
| `catalogId` | string | 使用的组件目录 URL |

---

### 2. 更新组件（updateComponents）

定义 Surface 中的 UI 组件树：

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "main",
    "components": [
      {
        "id": "root",
        "component": "Column",
        "children": ["header", "content", "footer"]
      },
      {
        "id": "header",
        "component": "Text",
        "text": "# 欢迎使用 AI 助手",
        "variant": "h1"
      },
      {
        "id": "content",
        "component": "TextField",
        "label": "请输入您的问题",
        "value": { "path": "/form/query" },
        "textFieldType": "shortText"
      },
      {
        "id": "submit-text",
        "component": "Text",
        "text": "发送"
      },
      {
        "id": "submit-btn",
        "component": "Button",
        "child": "submit-text",
        "variant": "primary",
        "action": {
          "event": {
            "name": "submit_query",
            "context": {
              "query": { "path": "/form/query" }
            }
          }
        }
      }
    ]
  }
}
```

---

### 3. 更新数据模型（updateDataModel）

向 Surface 注入数据，供组件通过 `path` 绑定：

```json
{
  "version": "v0.9",
  "updateDataModel": {
    "surfaceId": "main",
    "path": "/",
    "value": {
      "form": {
        "query": ""
      },
      "results": []
    }
  }
}
```

---

### 4. 用户交互事件（Action）

客户端将用户操作回传给 Agent：

```json
{
  "version": "v0.9",
  "action": {
    "name": "submit_query",
    "surfaceId": "main",
    "sourceComponentId": "submit-btn",
    "timestamp": "2026-05-04T10:00:00Z",
    "context": {
      "query": "今天天气怎么样？"
    }
  }
}
```

---

## 支持的组件类型

| 组件名 | 说明 | 主要属性 |
|--------|------|----------|
| `Column` | 垂直布局容器 | `children: string[]` |
| `Row` | 水平布局容器 | `children: string[]` |
| `Card` | 卡片容器 | `child: string` |
| `Text` | 文本显示 | `text`, `variant: h1/h2/h3/body` |
| `Button` | 按钮 | `child`, `variant: primary/secondary`, `action` |
| `TextField` | 文本输入框 | `label`, `value`, `textFieldType: shortText/longText` |
| `List` | 列表渲染 | `children`, `direction: vertical/horizontal` |
| `DateTimeInput` | 日期时间选择 | `value`, `enableDate`, `enableTime` |
| `Image` | 图片 | `src`, `alt` |

---

## 完整示例：AI 对话界面

以下是一个完整的 AI 对话界面生成流程（JSONL 格式）：

```jsonl
{"version":"v0.9","createSurface":{"surfaceId":"chat","catalogId":"https://a2ui.org/specification/v0_9/basic_catalog.json"}}
{"version":"v0.9","updateComponents":{"surfaceId":"chat","components":[{"id":"root","component":"Column","children":["title","message-list","input-row"]},{"id":"title","component":"Text","text":"# AI 助手","variant":"h1"},{"id":"message-list","component":"List","children":{"componentId":"message-card","path":"/messages"},"direction":"vertical"},{"id":"message-card","component":"Card","child":"message-content"},{"id":"message-content","component":"Text","text":{"path":"/content"}},{"id":"input-row","component":"Row","children":["input-field","send-btn"]},{"id":"input-field","component":"TextField","label":"输入消息...","value":{"path":"/input/text"},"textFieldType":"shortText"},{"id":"send-text","component":"Text","text":"发送"},{"id":"send-btn","component":"Button","child":"send-text","variant":"primary","action":{"event":{"name":"send_message","context":{"text":{"path":"/input/text"}}}}}]}}
{"version":"v0.9","updateDataModel":{"surfaceId":"chat","path":"/","value":{"messages":[{"content":"你好！我是 AI 助手，有什么可以帮助你的？"}],"input":{"text":""}}}}
```

---

## 与本项目的集成方式

本项目（blog-backend）的 AI Agent 可通过 SSE 流式输出 A2UI 消息，在前端动态渲染 UI。

### 后端集成示例

在 `src/routes/ai.ts` 的 `/chat` 接口中，通过 `onData` 回调发送 A2UI 消息：

```typescript
const response = await runAgent(
  userId,
  convId,
  message,
  (data: string) => {
    // 发送 SSE 事件（可以是 A2UI 消息）
    res.write(`data: ${data}\n\n`);
  }
);
```

Agent 可在工具调用结果中生成 A2UI JSON，通过 `onData` 回调推送给前端：

```typescript
// 在 agent.ts 中，工具执行后推送 UI 更新
if (onData) {
  onData(JSON.stringify({
    type: "a2ui",
    payload: {
      version: "v0.9",
      updateDataModel: {
        surfaceId: "result",
        path: "/results",
        value: toolResult
      }
    }
  }));
}
```

### 前端消费示例

```javascript
const eventSource = new EventSource('/api/ai/chat');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'a2ui') {
    // 交给 A2UI 渲染器处理
    a2uiRenderer.handleMessage(data.payload);
  } else if (data.type === 'final') {
    // 最终文本响应
    console.log('AI 回复:', data.content);
    eventSource.close();
  }
};
```

---

## 消息流时序图

```
用户          前端客户端          后端 Agent           工具层
 |                |                   |                   |
 |--- 发送消息 -->|                   |                   |
 |                |--- POST /chat --->|                   |
 |                |                   |--- 调用工具 ----->|
 |                |                   |<-- 工具结果 ------|
 |                |<-- SSE: A2UI -----|                   |
 |<-- 渲染 UI ----|                   |                   |
 |                |<-- SSE: final ----|                   |
 |                |--- 关闭连接 ----->|                   |
```

---

## 使用 CUSTOM 事件传输图片（推荐方案）

### 为什么用 CUSTOM 事件

AG-UI 协议内置了 `EventType.CUSTOM` 扩展机制，专门用于传输协议标准事件之外的自定义数据。相比把图片 URL 塞进文本消息再由前端解析，CUSTOM 事件：

- 语义清晰，前端不需要猜测消息内容是文本还是图片
- 前端通过 `onCustomEvent` 单独订阅，不影响普通文本消息的处理逻辑
- 数据结构自由，直接传 JSON 对象，不需要 JSONL 序列化

---

### 后端实现

**1. 在 `agui.ts` 中添加 `customEvent` 方法：**

```typescript
// src/ai/agreement/agui.ts
customEvent(res: ResponseType, name: string, value: unknown) {
  this.writeEvent(res, {
    type: EventType.CUSTOM,
    name,
    value,
  } as AGUIEventOf<EventType.CUSTOM>);
}
```

**2. 在 `aiChat.ts` 的 `toolEnd` 中发送图片事件：**

```typescript
// src/services/ai/aiChat.ts
case 'toolEnd':
  agui.toolCallEnd(res, { toolCallId: evt.toolCallId });

  // 图片生成工具完成后，通过 CUSTOM 事件把图片 URL 推给前端
  if (evt.toolCallName === 'textToImage' && Array.isArray(evt.toolResult)) {
    agui.customEvent(res, 'imageGenerated', {
      images: evt.toolResult.map((url: string, index: number) => ({
        url,
        alt: `生成图片 ${index + 1}`,
      })),
    });
  }
  break;
```

> 注意：需要在 `UnifyOutputType` 的 `toolEnd` 事件里补充 `toolResult` 字段，并在 `adapters.ts` 的 `on_tool_end` 处理中把 `event.data.output` 传出来。

**3. 对应的 SSE 数据格式（实际发出的内容）：**

```
data: {"type":"CUSTOM","name":"imageGenerated","value":{"images":[{"url":"/uploads/ai/a1b2.png","alt":"生成图片 1"},{"url":"/uploads/ai/c3d4.png","alt":"生成图片 2"}]},"timestamp":1746700800000}
```

---

### 前端实现

前端通过 `onCustomEvent` 订阅，按 `name` 区分不同的自定义事件：

```typescript
agent.subscribe({
  onCustomEvent: ({ name, value }) => {
    switch (name) {
      case 'imageGenerated':
        // value.images 是图片数组，直接渲染
        renderImageGrid(value.images);
        break;

      // 未来可以继续扩展其他自定义事件
      case 'videoGenerated':
        renderVideoPlayer(value.url);
        break;
    }
  },
});
```

---

### 与普通文本消息的对比

| | 文本消息（`textMessageContent`） | CUSTOM 事件 |
|---|---|---|
| 适用场景 | LLM 流式输出的文字回复 | 工具执行结果、图片、结构化数据 |
| 前端处理 | `onTextMessageContent` | `onCustomEvent` |
| 数据格式 | 字符串 delta，需拼接 | 直接 JSON 对象，无需拼接 |
| 是否流式 | 是（逐 token） | 否（一次性发送） |

---

### 时序图

```
用户请求生成图片
      │
      ▼
imageAgent 调用 textToImage 工具
      │
      ├─ toolStart → 前端显示"生成中..."
      │
      │  （图片生成，耗时较长，心跳维持连接）
      │
      ├─ toolEnd
      │     └─ CUSTOM imageGenerated → 前端渲染图片网格
      │
      ├─ textMessageStart
      ├─ textMessageContent  → "已为你生成 2 张图片"
      ├─ textMessageEnd
      │
      └─ modelEnd → 连接关闭
```

---



### 背景

AG-UI 协议本身只负责传输文本消息（`textMessageContent`），没有专门的图片事件。A2UI 的做法是：**把 A2UI JSON 作为普通文本消息的内容发出去**，前端收到后判断内容是否为合法的 A2UI JSON，再决定是当文本渲染还是交给 A2UI 渲染器处理。

### 传输流程

```
后端 imageAgent
  └─ textToImage 工具执行完毕，拿到图片 URL 数组
  └─ 构造 A2UI JSON（createSurface + updateComponents）
  └─ 通过 textMessageStart / textMessageContent / textMessageEnd 发出去

前端
  └─ 收到 textMessageContent，拼接 delta
  └─ messageEnd 后解析完整内容
  └─ 判断是否为 A2UI JSON → 交给 A2UI 渲染器渲染图片网格
```

### 后端示例

`textToImage` 工具返回图片 URL 数组后，`imageAgent` 的 LLM 会把这些 URL 组织成回复文本。如果想让前端渲染为图片组件而不是纯文字，需要在 `imageAgent` 里拦截工具结果，手动构造 A2UI JSON 并通过 AG-UI 事件发出。

**构造 A2UI JSON 的工具函数：**

```typescript
// src/ai/utils/utils.ts

/**
 * 将图片 URL 数组构造为 A2UI JSONL 字符串
 * 包含 createSurface 和 updateComponents 两条消息
 */
export function buildImageA2UI(imageUrls: string[], surfaceId = 'image-result'): string {
  const componentIds = imageUrls.map((_, i) => `img-${i}`);

  const createSurface = {
    version: 'v0.9',
    createSurface: {
      surfaceId,
      catalogId: 'https://a2ui.org/specification/v0_9/basic_catalog.json',
    },
  };

  const updateComponents = {
    version: 'v0.9',
    updateComponents: {
      surfaceId,
      components: [
        {
          id: 'root',
          component: 'Column',
          children: ['title', 'image-list'],
        },
        {
          id: 'title',
          component: 'Text',
          text: `为你生成了 ${imageUrls.length} 张图片`,
          variant: 'h3',
        },
        {
          id: 'image-list',
          component: 'Row',
          children: componentIds,
        },
        // 每张图片单独一个 Image 组件
        ...imageUrls.map((url, i) => ({
          id: `img-${i}`,
          component: 'Image',
          src: url,
          alt: `生成图片 ${i + 1}`,
        })),
      ],
    },
  };

  // A2UI 使用 JSONL 格式，每条消息一行
  return JSON.stringify(createSurface) + '\n' + JSON.stringify(updateComponents);
}
```

**在 `aiChat.ts` 的 `toolEnd` 中发送：**

```typescript
case 'toolEnd': {
  agui.toolCallEnd(res, { toolCallId: evt.toolCallId });

  // 如果是图片生成工具，直接发 A2UI 消息，不等 LLM 二次回复
  if (evt.toolCallName === 'textToImage' && Array.isArray(evt.toolResult)) {
    const messageId = uuidv4();
    const a2uiContent = buildImageA2UI(evt.toolResult);
    agui.textMessageStart(res, { messageId });
    agui.textMessageContent(res, { messageId, delta: a2uiContent });
    agui.textMessageEnd(res, { messageId });
  }
  break;
}
```

> 注意：要让 `toolEnd` 能拿到工具返回值，需要在 `UnifyOutputType` 的 `toolEnd` 事件里加 `toolResult` 字段，并在 `adapters.ts` 的 `on_tool_end` 处理中把 `event.data.output` 传出来。

### 前端识别 A2UI 内容

前端在收到 `TEXT_MESSAGE_END` 后，检查拼接好的消息内容：

```typescript
onMessageEnd((messageId, content) => {
  try {
    // A2UI JSONL：每行都是合法 JSON，且第一行有 version 字段
    const firstLine = content.split('\n')[0];
    const parsed = JSON.parse(firstLine);
    if (parsed.version?.startsWith('v0.')) {
      // 交给 A2UI 渲染器
      a2uiRenderer.handleMessages(content);
      return;
    }
  } catch {
    // 不是 JSON，当普通文本处理
  }
  renderTextMessage(messageId, content);
});
```

### 完整 A2UI JSONL 示例（3 张图片）

```jsonl
{"version":"v0.9","createSurface":{"surfaceId":"image-result","catalogId":"https://a2ui.org/specification/v0_9/basic_catalog.json"}}
{"version":"v0.9","updateComponents":{"surfaceId":"image-result","components":[{"id":"root","component":"Column","children":["title","image-list"]},{"id":"title","component":"Text","text":"为你生成了 3 张图片","variant":"h3"},{"id":"image-list","component":"Row","children":["img-0","img-1","img-2"]},{"id":"img-0","component":"Image","src":"/uploads/ai/a1b2c3.png","alt":"生成图片 1"},{"id":"img-1","component":"Image","src":"/uploads/ai/d4e5f6.png","alt":"生成图片 2"},{"id":"img-2","component":"Image","src":"/uploads/ai/g7h8i9.png","alt":"生成图片 3"}]}}
```

---

## 版本历史

| 版本 | 主要变化 |
|------|----------|
| v0.9 | 引入 `version` 字段；扁平化组件结构；`updateComponents` 替代嵌套 `surfaceUpdate`；`updateDataModel` 支持 `path` 精确更新 |
| v0.8 | 早期版本，使用 `surfaceUpdate` + `dataModelUpdate` + `beginRendering` 三段式格式 |

---

## 参考资源

- [A2UI GitHub 仓库](https://github.com/google/a2ui)
- [A2UI 规范文档](https://github.com/google/a2ui/blob/main/docs/concepts/data-flow.md)
- [基础组件目录](https://a2ui.org/specification/v0_9/basic_catalog.json)
- [A2A 协议（Agent-to-Agent）](https://github.com/google/A2A)
