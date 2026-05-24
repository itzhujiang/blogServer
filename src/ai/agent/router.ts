import { z } from 'zod';
import { createOpenAiLLM } from '@/ai/utils/llm';
import { AgentStateAnnotation } from '@/ai/utils/utils';

const routerSchema = z.object({
  next: z
    .enum(['weatherAgent', 'generalAgent', 'imageAgent'])
    .describe('根据用户问题决定调用哪个agent，无法判断则返回generalAgent'),
});

export async function routerNode(state: typeof AgentStateAnnotation.State) {
  const llm = createOpenAiLLM({ temperature: 0, enableThinking: false }).withStructuredOutput(
    routerSchema,
    { method: 'functionCalling' }
  );
  let msg = [...state.messages];
  if (msg.length > 10) {
    msg = msg.slice(-10); // 如果消息列表过长，只保留最后10条消息，避免超过模型输入限制
  }
  const result = await llm.invoke([
    {
      role: 'system',
      content: `你是一个路由助手，根据用户的最新问题决定调用哪个agent：
                - weatherAgent：天气查询、温度、降雨等气象问题
                - imageAgent：图片生成及其图片提示词完善问题
                - generalAgent：问候、闲聊、通用问题及其他所有情况`,
    },
    ...msg,
  ]);
  return { next: result.next || 'generalAgent' };
}

export function routeTo(state: typeof AgentStateAnnotation.State): string {
  return state.next;
}
