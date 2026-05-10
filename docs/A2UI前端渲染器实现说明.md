# A2UI 前端渲染器实现说明

## 概述

前端渲染器负责接收后端通过 AG-UI `CUSTOM` 事件推送的 A2UI 数据，将其解析为组件树并渲染为实际 UI。渲染器与具体 UI 框架无关，组件的样式和交互完全由前端自定义。

---

## 接收数据

后端通过 AG-UI 的 `CUSTOM` 事件推送，`name` 固定为 `a2ui`，`value` 是一个 A2UI 消息数组：

```typescript
agent.subscribe({
  onCustomEvent: ({ name, value }) => {
    if (name === 'a2ui') {
      // value 是 A2UI 消息数组，交给渲染器处理
    }
  },
});
```

`value` 的结构示例（以图片列表为例）：

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "images-abc123",
      "catalogId": "https://a2ui.org/specification/v0_9/basic_catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "images-abc123",
      "components": [
        { "id": "root", "component": "Column", "children": ["title", "image-list"] },
        { "id": "title", "component": "Text", "text": "为你生成了 2 张图片", "variant": "h3" },
        { "id": "image-list", "component": "Row", "children": ["img-0", "img-1"] },
        { "id": "img-0", "component": "Image", "src": "/uploads/ai/a1b2.png", "alt": "生成图片 1" },
        { "id": "img-1", "component": "Image", "src": "/uploads/ai/c3d4.png", "alt": "生成图片 2" }
      ]
    }
  }
]
```

---

## 解析流程

收到 `value` 数组后，按消息类型依次处理：

```
value 数组
  ├── createSurface   → 初始化一个 surfaceId 对应的渲染容器
  ├── updateComponents → 解析组件列表，建立 id -> component 的索引 map
  └── updateDataModel  → 更新数据模型，供组件通过 path 绑定
```

**建立组件索引：**

```typescript
// 把扁平的 components 数组转成 map，方便通过 id 查找
function buildComponentMap(components) {
  return components.reduce((map, comp) => {
    map[comp.id] = comp;
    return map;
  }, {});
}
```

---

## 递归渲染

从 `root` 节点开始，递归查找 `children` 中的子节点并渲染：

```typescript
function renderNode(id, componentMap) {
  const node = componentMap[id];
  if (!node) return null;

  switch (node.component) {
    case 'Column':
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {node.children?.map(childId => renderNode(childId, componentMap))}
        </div>
      );

    case 'Row':
      return (
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {node.children?.map(childId => renderNode(childId, componentMap))}
        </div>
      );

    case 'Text':
      return <span data-variant={node.variant}>{node.text}</span>;

    case 'Image':
      return <img src={node.src} alt={node.alt} />;

    case 'Button':
      return (
        <button onClick={() => handleAction(node.action)}>
          {renderNode(node.child, componentMap)}
        </button>
      );

    default:
      return null;
  }
}
```

---

## 完整渲染器组件（React）

```tsx
type A2UIComponent =
  | { id: string; component: 'Image'; src: string; alt?: string }
  | { id: string; component: 'Text'; text: string; variant?: string }
  | { id: string; component: 'Column'; children: string[] }
  | { id: string; component: 'Row'; children: string[] };

type A2UIMessage =
  | { version: string; createSurface: { surfaceId: string; catalogId: string } }
  | { version: string; updateComponents: { surfaceId: string; components: A2UIComponent[] } }
  | { version: string; updateDataModel: { surfaceId: string; path: string; value: unknown } };

function A2UIRenderer({ value }: { value: A2UIMessage[] }) {
  // 找到 updateComponents 消息，取出组件列表
  const updateMsg = value.find(msg => 'updateComponents' in msg) as
    | { updateComponents: { components: A2UIComponent[] } }
    | undefined;

  if (!updateMsg) return null;

  const componentMap = buildComponentMap(updateMsg.updateComponents.components);

  return <div className="a2ui-surface">{renderNode('root', componentMap)}</div>;
}
```

**使用：**

```tsx
const [a2uiData, setA2UIData] = useState(null);

agent.subscribe({
  onCustomEvent: ({ name, value }) => {
    if (name === 'a2ui') {
      setA2UIData(value);
    }
  },
});

// 渲染
{a2uiData && <A2UIRenderer value={a2uiData} />}
```

---

## 支持的组件类型

| component | 说明 | 关键属性 |
|-----------|------|----------|
| `Column` | 垂直布局 | `children: string[]` |
| `Row` | 水平布局 | `children: string[]` |
| `Text` | 文本 | `text: string`, `variant: 'h1'\|'h2'\|'h3'\|'body'` |
| `Image` | 图片 | `src: string`, `alt: string` |
| `Button` | 按钮 | `child: string`, `variant: 'primary'\|'secondary'`, `action` |
| `Card` | 卡片容器 | `child: string` |
| `List` | 列表 | `children: string[]`, `direction: 'vertical'\|'horizontal'` |
| `TextField` | 文本输入框 | `label: string`, `value`, `textFieldType: 'shortText'\|'longText'` |

---

## 扩展新组件

在 `renderNode` 的 switch 里新增一个 case 即可：

```typescript
case 'VideoPlayer':
  return <video src={node.src} controls />;
```

后端 `a2ui.createComponents()` 传入对应的组件定义，前端渲染器就能识别并渲染。

---

## 数据绑定（updateDataModel）

组件属性支持通过 `path` 绑定数据模型中的值：

```json
{ "id": "name-text", "component": "Text", "text": { "path": "/user/name" } }
```

渲染时需要解析 `path`，从数据模型中取值：

```typescript
function resolveValue(value, dataModel) {
  if (typeof value === 'object' && value?.path) {
    // 按 path 从 dataModel 中取值，如 "/user/name" → dataModel.user.name
    return value.path.split('/').filter(Boolean).reduce((obj, key) => obj?.[key], dataModel);
  }
  return value;
}
```

收到 `updateDataModel` 消息时更新本地数据模型，触发重新渲染。

---

## 与后端的完整交互时序

```
用户发送消息
      │
      ▼
后端 imageAgent 调用 textToImage 工具
      │
      ├─ AG-UI toolStart  → 前端显示"生成中..."
      │
      │  （图片生成中，心跳维持 SSE 连接）
      │
      ├─ AG-UI toolEnd
      ├─ AG-UI CUSTOM(a2ui)  → 前端 A2UIRenderer 渲染图片列表
      │
      ├─ AG-UI textMessageStart/Content/End  → 前端显示文字回复
      │
      └─ AG-UI modelEnd  → SSE 连接关闭
```
