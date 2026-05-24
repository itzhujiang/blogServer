# AI 记忆系统设计文档

## 1. 系统概述

### 目标

为博客 AI 聊天系统引入跨会话长期记忆能力，使 AI 能够：

- 记住用户的偏好、习惯和背景信息
- 积累用户反馈，持续改进回答质量
- 保存有价值的参考信息，避免重复询问

### 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   用户对话层                          │
│              (aiChat.ts / SSE 流式响应)               │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼                         ▼
┌──────────────────┐     ┌──────────────────────┐
│   记忆加载模块    │     │    记忆提取模块       │
│ (对话开始时注入)  │     │ (对话结束后异步执行)  │
└────────┬─────────┘     └──────────────┬───────────┘
         │                          │
         ▼                          ▼
┌─────────────────────────────────────────────────────┐
│              ai_chat_memories 表                      │
│           (Sequelize Model / MySQL)                   │
└─────────────────────────────────────────────────────┘
```

### 设计原则

- **异步提取**：记忆提取在对话完成后异步执行，不阻塞主对话流程
- **按需加载**：新对话开始时按用户维度加载相关记忆，注入 system prompt
- **自动管理**：系统自动判断新增、更新或忽略，无需用户手动维护
- **容量可控**：设置数量上限和截断机制，防止 prompt 膨胀

---

## 2. 数据模型设计

### 表结构：`ai_chat_memories`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT (PK) | 自增主键 |
| user_id | BIGINT | 关联 ai_chat_users.id |
| category | VARCHAR(32) | 记忆分类：preference / feedback / reference |
| content | TEXT | 记忆内容（纯文本，一条记忆一个要点） |
| source_session_id | BIGINT | 产生该记忆的会话 ID |
| access_count | INT | 被加载使用的次数，用于衰减淘汰 |
| last_accessed_at | BIGINT | 最近一次被加载的时间戳（ms） |
| skipIndex | BOOLEAN | 是否为索引记忆，主要存储其他记忆的索引 |
| createdAt | BIGINT | 创建时间（ms） |
| updatedAt | BIGINT | 更新时间（ms） |
| deletedAt | BIGINT | 软删除时间（ms） |

### 索引设计

| 索引名 | 字段 | 类型 | 用途 |
|--------|------|------|------|
| idx_user_category | (user_id, category) | 复合索引 | 按用户和分类查询记忆 |
| idx_user_relevance | (user_id, relevance_score) | 复合索引 | 按相关性排序加载 |
| idx_user_updated | (user_id, updatedAt) | 复合索引 | 按时间排序，淘汰旧记忆 |

### Sequelize Model 定义示例

```typescript
export interface AiChatMemoriesAttributes {
  id: number;
  user_id: number;
  category: AiChatMemoryCategoryLiteral;
  content: string;
  source_session_id: number;
  relevance_score: number;
  access_count: number;
  last_accessed_at: number;
  skipIndex: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}

export type AiChatMemoryCategoryLiteral = 'preference' | 'feedback' | 'reference';
```

---
## 3. 记忆分类

参照 Claude Code 的四类记忆分类，结合博客 AI 聊天场景的特点，精简为三类：

### preference（用户偏好）

| 维度 | 说明 |
|------|------|
| 记什么 | 用户的角色背景、兴趣领域、交流风格偏好 |
| 示例 | "用户是前端开发者，熟悉 React 和 TypeScript，偏好简洁的代码示例" |
| 触发时机 | 当对话中识别到用户身份、技术栈、偏好等信息时 |

### feedback（行为反馈）

| 维度 | 说明 |
|------|------|
| 记什么 | 用户对 AI 回答方式的纠正和指导 |
| 示例 | "用户不喜欢过长的解释，要求回答控制在 3 段以内" |
| 触发时机 | 当用户明确纠正 AI 的回答方式、格式或内容倾向时 |

### reference（参考信息）

| 维度 | 说明 |
|------|------|
| 记什么 | 用户提到的外部资源、项目信息、常用链接等 |
| 示例 | "用户的博客项目使用 Next.js 14，部署在 Vercel 上" |
| 触发时机 | 当用户提供项目背景、技术选型、外部资源等可复用信息时 |

### 为什么不保留 project 类型

Claude Code 的 project 类型用于记录"谁在做什么、截止日期"等项目管理信息。博客 AI 聊天场景中用户通常是单人使用，不涉及团队协作和项目排期，因此将项目相关信息合并到 reference 类型中。

---

## 4. 记忆提取流程

### 触发时机

记忆提取在以下条件满足时触发（对话结束后异步执行）：

1. 当前会话消息数 >= 4 条（至少 2 轮对话）
2. 会话中包含实质性内容（非纯寒暄）

### 提取 Agent 设计

记忆提取使用独立的 LLM 调用（forked agent 模式），与主对话流程解耦。

#### 提取流程

```
对话结束
  │
  ▼
判断是否满足提取条件
  │
  ▼ (满足)
加载该用户现有记忆列表（仅 category + content 摘要）
  │
  ▼
构建提取提示词 + 本次对话内容
  │
  ▼
调用 LLM 执行记忆提取
  │
  ▼
解析 LLM 输出，执行数据库操作（新增/更新/删除）
```

#### 提取提示词设计

```text
你是一个记忆提取助手。请阅读以下对话内容，提取值得长期记住的信息。

## 现有记忆
{{existingMemories}}

## 本次对话
{{conversationMessages}}

## 任务
分析对话内容，输出需要执行的记忆操作。每条操作为以下格式的 JSON：

- 新增：{"action": "create", "category": "preference|feedback|reference", "content": "记忆内容"}
- 更新：{"action": "update", "id": 记忆ID, "content": "更新后的内容"}
- 删除：{"action": "delete", "id": 记忆ID}

## 规则
1. 只提取对未来对话有帮助的信息
2. 如果新信息与已有记忆重复或矛盾，使用 update 操作
3. 如果用户明确要求忘记某事，使用 delete 操作
4. 不要记录一次性的问答内容（如"今天天气怎么样"）
5. 每条记忆应该是一个独立的、自包含的信息点
6. 内容要简洁，每条不超过 200 字

输出格式为 JSON 数组，如果没有需要记录的内容则输出空数组 []。
```

#### LLM 调用方式

```typescript
// 伪代码示意
async function extractMemories(userId: number, sessionId: number, messages: Message[]) {
  const existingMemories = await AiChatMemories.findAll({
    where: { user_id: userId },
    order: [['updatedAt', 'DESC']],
    limit: 50,
  });

  const prompt = buildExtractionPrompt(existingMemories, messages);
  const llm = createOpenAiLLM();
  const result = await llm.invoke([
    { role: 'system', content: prompt },
  ]);

  const operations = parseMemoryOperations(result.content);
  await executeMemoryOperations(userId, sessionId, operations);
}
```
---

## 5. 记忆加载流程

### 加载时机

每次新对话开始时（即 `createMainAgent` 被调用、首条消息进入时），根据 user_id 加载该用户的记忆。

### 加载策略

1. 查询该用户所有未删除的记忆
2. 按 `relevance_score` 降序 + `updatedAt` 降序排序
3. 取前 N 条（默认上限 20 条）
4. 拼接为文本块，注入到 system prompt 中
5. 更新被加载记忆的 `access_count` 和 `last_accessed_at`

### 注入格式

```text
## 用户记忆

以下是关于当前用户的已知信息，请在回答时参考：

### 用户偏好
- 用户是前端开发者，熟悉 React 和 TypeScript
- 偏好简洁的代码示例，不需要过多解释

### 行为反馈
- 回答控制在 3 段以内
- 代码示例优先使用 TypeScript

### 参考信息
- 用户的博客项目使用 Next.js 14，部署在 Vercel 上
```

### 加载代码集成点

在 `src/ai/agent/general.ts` 的 `callModel` 函数中，将记忆内容拼接到 system prompt：

```typescript
async function callModel(state: typeof AgentStateAnnotation.State) {
  const llm = createOpenAiLLM();
  const userId = state.userId; // 从 state 中获取用户 ID
  const memoryBlock = await loadUserMemories(userId);

  const response = await llm.invoke([
    {
      role: 'system',
      content: `你是一个友好的AI助手，负责处理日常对话、问候和通用问题。
请用自然、简洁的语言回复用户。

`,
    },
    ...state.messages,
  ]);
  return { messages: [response] };
}
```
---

## 6. 记忆管理策略

### 去重机制

在提取阶段通过提示词引导 LLM 判断：
- 将现有记忆列表提供给提取 Agent
- 如果新信息与已有记忆语义重复，输出 update 操作而非 create
- 如果新信息与已有记忆矛盾，以新信息为准进行 update

### 数量上限

| 参数 | 值 | 说明 |
|------|------|------|
| 每用户记忆总上限 | 100 条 | 超出时淘汰最旧且访问最少的记忆 |
| 单次加载上限 | 20 条 | 防止 system prompt 过长 |
| 单次提取上限 | 5 条 | 单次对话最多提取 5 条新记忆 |

### 淘汰策略

当用户记忆总数达到上限时，按以下优先级淘汰：

1. `access_count = 0` 且创建超过 30 天的记忆优先淘汰
2. 按 `last_accessed_at` 升序排列，淘汰最久未被使用的记忆
3. 淘汰操作为软删除（设置 deletedAt）

### 截断机制

加载记忆时的总 token 预算为 2000 tokens：
- 如果 20 条记忆的总长度超过预算，从末尾开始逐条移除
- 确保注入的记忆块不会过度占用上下文窗口
---

## 7. 集成点说明

### 与 aiChat.ts 的集成

**提取触发点**：在 `chat` 函数的 `messageEnd` 事件处理完成、事务提交后，异步触发记忆提取：

```typescript
// src/services/ai/aiChat.ts - messageEnd 处理之后
case 'modelEnd':
  // ... 现有逻辑 ...
  await transaction.commit();

  // 异步触发记忆提取（不阻塞响应）
  extractMemoriesAsync(userId, sessionId, conversationMessages).catch(err => {
    console.error('Memory extraction failed:', err);
  });
  break;
```

### 与 Agent 系统的集成

**记忆加载点**：在 `src/ai/agent/index.ts` 的 `run` 函数中，调用 agent 前加载记忆并注入 state：

```typescript
async function run({ thread_id, message, ip, run_id }) {
  const userId = parseInt(ip); // 当前 ip 字段实际存储的是 userId
  const memories = await loadUserMemories(userId);

  // 将记忆注入到 message state 中
  const stateWithMemory = injectMemoryToState(message, memories);

  const result = await app.streamEvents(stateWithMemory, {
    version: 'v2',
    configurable: config.configurable,
  });
  return langChainStreamEventsOutputToUnifyOutput(result);
}
```

### 新增文件清单

| 文件路径 | 职责 |
|----------|------|
| `src/models/ai-chat-memories.ts` | Sequelize 模型定义 |
| `src/services/ai/memoryExtractor.ts` | 记忆提取逻辑（提示词构建、LLM 调用、结果解析） |
| `src/services/ai/memoryLoader.ts` | 记忆加载逻辑（查询、排序、格式化、注入） |
| `src/ai/agent/memoryAgent.ts` | 记忆提取 Agent 节点（可选，如需独立为 LangGraph 节点） |

### 与现有模型的关系

```
ai_chat_users (1) ──── (N) ai_chat_memories
ai_chat_sessions (1) ──── (N) ai_chat_memories (source_session_id)
```
---

## 附录：与 Claude Code 记忆系统的对比

| 维度 | Claude Code | 本项目设计 |
|------|-------------|-----------|
| 存储方式 | 文件系统（Markdown 文件） | 数据库（MySQL + Sequelize） |
| 记忆分类 | 4 类（user/feedback/project/reference） | 3 类（preference/feedback/reference） |
| 提取方式 | forked agent + 工具调用 | 独立 LLM 调用 + JSON 输出解析 |
| 加载方式 | 读取文件拼接到 system prompt | 数据库查询后拼接到 system prompt |
| 截断机制 | 200 行 / 字节上限 | 20 条 / 2000 tokens 上限 |
| 团队共享 | 支持（远端同步） | 暂不支持（单用户场景） |
| 会话记忆 | 独立的 session memory 文件 | 暂不实现，后续可扩展 |