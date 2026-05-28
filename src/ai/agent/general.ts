// 兜底的agent

import { createOpenAiLLM } from '@/ai/utils/llm';
import { AgentStateAnnotation } from '../utils/utils';
import { START, StateGraph } from '@langchain/langgraph';
import { generalTools } from '@/ai/tools';

export const getGeneralAgentNodes = () => {
  async function callModel(state: typeof AgentStateAnnotation.State) {
    const llm = createOpenAiLLM().bindTools([...generalTools]);
    const response = await llm.invoke([
      {
        role: 'system',
        content: `你是一个友好的AI助手，负责处理日常对话、问候和通用问题。
  请用自然、简洁的语言回复用户。\n\n${state.memoryPrompt ?? ''}`,
      },
      ...state.messages,
    ]);
    return { messages: [response] };
  }

  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode('generalAgent', callModel)
    .addEdge(START, 'generalAgent');
  const generalAgentSubgraph = workflow.compile();
  return { generalAgentSubgraph };
};
