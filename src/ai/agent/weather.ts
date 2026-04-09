// 天气agent
import { createOpenAiLLM } from '@/ai/utils/llm';
import { getWeather, getIpPosition } from '../tools';
import { MessagesAnnotation, StateGraph, START, END, MemorySaver } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { AIMessage } from '@langchain/core/messages';

/**
 * 天气agent，负责处理与天气相关的查询和任务
 */
export const getWeatherAgent = () => {
  const tools = [getWeather, getIpPosition];
  const toolNode = new ToolNode(tools);
  const llm = createOpenAiLLM().bindTools(tools);

  /**
   * 调用LLM模型，根据当前对话状态生成下一步的动作
   * @param state
   * @returns
   */
  async function callModel(state: typeof MessagesAnnotation.State) {
    // 这里可以根据state中的信息调用LLM进行推理，生成下一步的动作
    // 例如，如果用户询问天气，可以调用getWeather工具获取天气信息
    // 伪代码示例：
    // if (state.latestUserMessage.includes('天气')) {
    //   return getWeather({ city: '北京' });
    // }
    const response = await llm.invoke([
      {
        role: 'system',
        content: `你是一个天气助手，负责根据用户的问题决定是否调用 getWeather 或 getIpPosition。

请严格遵循以下规则：
1. 如果用户明确提供了地点，例如“北京天气”“上海明天温度”，直接调用 getWeather 获取该地点天气，不要调用 getIpPosition。
2. 如果用户没有提供地点，但明确表示要查询当前位置天气，例如“当前位置天气”“我这里的天气”，先调用 getIpPosition 获取当前位置，再调用 getWeather 获取该位置天气。
3. 如果用户只是询问“今天天气怎么样”“天气如何”等，但没有提供地点，也没有明确表示要查询当前位置天气，不要擅自调用 getIpPosition，应先询问用户具体城市或地区。
4. 缺少必要位置信息时，优先向用户澄清，不要猜测。
5. 获取到工具结果后，用中文简洁、自然地回答，不要编造工具未返回的信息。
6. 如果工具调用失败，明确告知用户暂时无法获取天气，并请用户稍后重试或提供更具体的位置。`,
      },
      ...state.messages,
    ]);
    return {
      messages: [response],
    };
  }
  /**
   * 根据当前状态判断下一步应该继续调用工具还是结束对话
   */
  function shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    if ((lastMessage.tool_calls?.length ?? 0) > 0) {
      return 'tools';
    }
    return END;
  }
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, ['tools', END])
    .addEdge('tools', 'agent');
  const app = workflow.compile({
    checkpointer: new MemorySaver(), // 使用内存保存对话状态
  });

  async function run(thread_id: string, message: string, ip: string) {
    const config = {
      configurable: {
        thread_id,
        ip,
      },
    };
    const result = await app.invoke(
      {
        messages: [
          {
            type: 'user',
            content: message,
          },
        ],
      },
      config
    );
    const lastMessage = result.messages[result.messages.length - 1];
    console.log(lastMessage.content);
    return lastMessage.content;
  }
  return run;
};
