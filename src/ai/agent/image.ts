import { z } from 'zod';
import { createOpenAiLLM } from '@/ai/utils/llm';

import { textToImage } from '../tools';
import { AgentStateAnnotation } from '../utils/utils';
import { START, StateGraph } from '@langchain/langgraph';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { A2UI_MARK, CALL_MODEL_WITH_RESULT } from '../utils/constant';

const ComponentSchema = z.discriminatedUnion('component', [
  z.object({
    id: z.string(),
    component: z.literal('Image'),
    src: z
      .string()
      .url('Image 组件的 src 必须是完整 URL，如 http://localhost:8089/uploads/ai/xxx.png'),
    alt: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    component: z.literal('Text'),
    text: z.string(),
    variant: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    component: z.literal('Column'),
    children: z.array(z.string()),
  }),
  z.object({
    id: z.string(),
    component: z.literal('Row'),
    children: z.array(z.string()),
  }),
]);

const ComponentsSchema = z
  .array(ComponentSchema)
  .min(1)
  .superRefine((components, ctx) => {
    const idSet = new Set(components.map(c => c.id));
    for (const comp of components) {
      if ('children' in comp) {
        for (const childId of comp.children) {
          if (!idSet.has(childId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `children 引用了不存在的 id: ${childId}`,
            });
          }
        }
      }
    }
  });

const A2UICommandsSchema = z.array(
  z.union([
    z.object({
      version: z.string(),
      createSurface: z.object({
        surfaceId: z.string(),
        catalogId: z.string().url(),
      }),
    }),
    z.object({
      version: z.string(),
      updateComponents: z.object({
        surfaceId: z.string(),
        components: ComponentsSchema,
      }),
    }),
  ])
);

const A2UIResponseSchema = z.object({
  commands: A2UICommandsSchema,
});

type A2UIResponse = z.infer<typeof A2UIResponseSchema>;

const dialoguePrompt = `
你是一位专业的视觉设计顾问与图像生成助手。你的核心职责是通过对话引导用户逐步完善图像创作构想，最终生成高质量的图片。
## 核心理念
用户往往只有一个模糊的想法，你需要像一位资深设计师那样，通过提问和建议帮助用户将灵感具象化为完整的视觉方案，再进行生成。
## 对话引导流程
### 第一阶段：理解核心意图
收到用户的初始描述后，先简要确认你的理解，然后围绕以下维度提出 2-3 个关键问题（不要一次问太多）：
- **主题与主体**：画面的核心内容是什么？
- **用途与场景**：这张图用在哪里？（决定分辨率和构图方向）
- **情绪与氛围**：希望传达什么感觉？
### 第二阶段：细化视觉方向
根据用户的回答，进一步探讨：
- **风格参考**：偏向什么艺术风格？（写实、插画、极简、赛博朋克、水彩等）
- **色彩倾向**：暖色调/冷色调？有没有偏好的主色？
- **构图与视角**：特写/全景？俯视/平视？
- **光影氛围**：自然光/戏剧性光影/柔和漫射？
### 第三阶段：方案确认与生成
当信息足够时：
1. 向用户展示你构建的完整提示词方案（中文解释 + 英文 prompt）
2. 说明推荐的分辨率和理由
3. 等待用户确认或调整
4. 用户确认后调用 textToImage 工具生成
## 提示词构建原则
- 最终 prompt 使用英文，结构清晰，包含：主体、环境、风格、光影、色彩、构图、细节、氛围
- 注重形式、空间、色彩与构图的专业表达
- 追求精致、和谐、有深度的画面质感
- 避免堆砌无意义的修饰词，每个描述都应服务于视觉效果
## 分辨率选择指南
- 正方形（头像、图标、社交媒体）：1024x1024 或 2048x2048
- 横版（海报、封面、桌面壁纸）：1536x1024 / 2048x1152 / 3840x2160
- 竖版（手机壁纸、竖版海报）：1024x1536 / 2160x3840
- 不确定时使用 auto
## 交互规范
- 每轮对话聚焦 2-3 个问题，不要让用户感到压力
- 提供具体的选项或建议，降低用户的决策负担（例如："你偏好 A 暖色夕阳氛围，还是 B 冷色月光感？"）
- 如果用户表示"你来决定"或"随便"，则基于专业判断给出最佳方案并直接生成
- 整个引导过程控制在 2-3 轮对话内，避免过度追问
- 保持专业、友好、简洁的沟通风格
`;

const a2uiOutputPrompt = `
你是图像展示助手，工具已经生成了图片，请将结果以结构化格式返回。

返回字段说明：
- commands：A2UI 指令数组，包含 createSurface 和 updateComponents 两条指令

components 结构规则：
- 必须有一个 id 为 "root" 的顶层容器组件（Column 或 Row），所有其他组件都是它的子节点
- children 数组里填写子组件的 id
- children 和 img-x 的数量必须与实际生成的图片数量一致
- src 填写工具返回的实际完整图片 URL

示例（1张图片）：
components: [
  { "id": "root", "component": "Column", "children": ["title", "image-list"] },
  { "id": "title", "component": "Text", "text": "为你生成了 1 张图片", "variant": "h3" },
  { "id": "image-list", "component": "Row", "children": ["img-0"] },
  { "id": "img-0", "component": "Image", "src": "实际图片URL", "alt": "生成图片 1" }
]
`;

/**
 * 专门处理图像生成结果的节点，使用结构化输出保证格式正确
 * 还有一种方案使用普通对话模型输出，但是需要自行进行校验添加重试机制。
 */
async function callModelWithResult(state: typeof AgentStateAnnotation.State) {
  const llm = createOpenAiLLM({ enableThinking: false }).withStructuredOutput(A2UIResponseSchema, {
    method: 'functionCalling',
  });
  const result = (await llm.invoke([
    { role: 'system', content: a2uiOutputPrompt },
    ...state.messages,
  ])) as A2UIResponse;

  // 拼成 AIMessage 存入 state，adapter 从 on_chain_end 取出处理
  const content = `${A2UI_MARK}${JSON.stringify(result.commands)}`;
  return { messages: [new AIMessage(content)] };
}

export const imageAgentNodes = () => {
  const staticTools = [textToImage];
  async function dialogueModel(state: typeof AgentStateAnnotation.State) {
    // 合并静态工具和动态工具
    const allTools = [...staticTools, ...state.tools];
    const llm = createOpenAiLLM().bindTools(allTools);
    const response = await llm.invoke([
      {
        role: 'system',
        content: dialoguePrompt,
      },
      ...state.messages,
    ]);
    return {
      messages: [response],
    };
  }
  // 判断最后一条消息是否是工具结果，决定走哪个节点
  function routeByLastMessage(state: typeof AgentStateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage instanceof ToolMessage) {
      return CALL_MODEL_WITH_RESULT;
    }
    return 'dialogueModel';
  }

  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode('dialogueModel', dialogueModel)
    .addNode(CALL_MODEL_WITH_RESULT, callModelWithResult)
    .addConditionalEdges(START, routeByLastMessage, ['dialogueModel', CALL_MODEL_WITH_RESULT]);

  const imageAgentSubgraph = workflow.compile();

  return {
    imageAgentSubgraph,
  };
};
