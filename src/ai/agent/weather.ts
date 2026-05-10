// 天气agent
import { createOpenAiLLM } from '@/ai/utils/llm';
import { getWeather, getIpPosition } from '../tools';
import { START, StateGraph } from '@langchain/langgraph';
import { AgentStateAnnotation } from '../utils/utils';

/**
 * 天气agent，负责处理与天气相关的查询和任务
 */
export const getWeatherAgentNodes = () => {
  const staticTools = [getWeather, getIpPosition];

  /**
   * 调用LLM模型
   * @param state
   * @returns
   */
  async function callModel(state: typeof AgentStateAnnotation.State) {
    // 合并静态工具和动态工具
    const allTools = [...staticTools, ...state.tools];
    const llm = createOpenAiLLM().bindTools(allTools);

    const response = await llm.invoke([
      {
        role: 'system',
        content: `你是一个天气助手，负责根据用户的问题决定是否调用 getWeather 或 getIpPosition。
请严格遵循以下规则：
1. 如果用户明确提供了地点，例如"北京天气""上海明天温度"，直接调用 getWeather 获取该地点天气，不要调用 getIpPosition。
2. 如果用户没有提供地点，但明确表示要查询当前位置天气，例如"当前位置天气""我这里的天气"，先调用 getIpPosition 获取当前位置，再调用 getWeather 获取该位置天气。
3. 如果用户只是询问"今天天气怎么样""天气如何"等，调用 getIpPosition。
4. 缺少必要位置信息时，优先向用户澄清，不要猜测。
5. 获取到工具结果后，用中文简洁、自然地回答，不要编造工具未返回的信息。
6. 如果工具调用失败，明确告知用户暂时无法获取天气，并请用户稍后重试或提供更具体的位置。
7. 关于 getIpPosition 工具调用需要询问用户权限，不可自行调用，如有权限工具则使用权限工具进行申请权限，如没有权限工具需要询问用户进行权限申请(重要)
8. 关于天气的展示，如有天气展示工具，可以直接使用天气展示工具，如果没有则通过文字告诉用户`,
      },
      ...state.messages,
    ]);
    return {
      messages: [response],
    };
  }

  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode('getWeatherAgent', callModel)
    .addEdge(START, 'getWeatherAgent');

  const getWeatherAgentSubgraph = workflow.compile();

  return {
    getWeatherAgentSubgraph,
  };
};
