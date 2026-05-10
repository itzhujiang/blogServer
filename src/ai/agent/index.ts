import { END, START, StateGraph } from '@langchain/langgraph';
import { getWeatherAgentNodes } from './weather';
import { getGeneralAgentNodes } from './general';
import { imageAgentNodes } from './image';
import { langChainStreamEventsOutputToUnifyOutput } from '../utils/adapters';
import { AgentStateAnnotation } from '../utils/utils';
import { getWeather, getIpPosition, textToImage } from '../tools';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage } from '@langchain/core/messages';
import { routerNode, routeTo } from './router';
// import { DynamicStructuredTool } from '@langchain/core/tools';

/**
 * 工具执行节点
 * 需要动态创建，因为要包含前端传入的工具
 */
async function toolExecutor(state: typeof AgentStateAnnotation.State) {
  const staticTools = [getWeather, getIpPosition, textToImage];
  // 合并静态工具和动态工具
  const allTools = [...staticTools, ...state.tools];
  const toolNode = new ToolNode(allTools);
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolId = lastMessage.tool_calls?.[0].id;
  const toolName = lastMessage.tool_calls?.[0].name;
  const toolType = state.tools.some(item => item.getName() === toolName)
    ? 'clientTool'
    : 'serverTool';
  // 执行工具
  return await toolNode.invoke(state, {
    metadata: {
      tool_id: toolId,
      tool_type: toolType,
    },
  });
}

/**
 * 根据当前状态判断下一步应该继续调用工具还是结束对话
 */
function shouldContinue(state: typeof AgentStateAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  if ((lastMessage.tool_calls?.length ?? 0) > 0) {
    return 'tool_executor';
  }
  return END;
}

/**
 * 工具执行完后，根据 state.next 回到对应的 agent
 */
function routeAfterTool(state: typeof AgentStateAnnotation.State) {
  console.log('进入了111', state.next);

  return state.next;
}

/**
 * 创建主agent，负责协调不同的子agent来处理用户的任务
 * @param dynamicTools 动态工具数组（前端传入的工具）
 */
export const createMainAgent = () => {
  const { getWeatherAgentSubgraph } = getWeatherAgentNodes();
  const { generalAgentSubgraph } = getGeneralAgentNodes();
  const { imageAgentSubgraph } = imageAgentNodes();
  const builder = new StateGraph(AgentStateAnnotation)
    .addNode('router', routerNode)
    .addNode('tool_executor', toolExecutor)
    .addNode('weatherAgent', getWeatherAgentSubgraph)
    .addNode('generalAgent', generalAgentSubgraph)
    .addNode('imageAgent', imageAgentSubgraph)
    .addConditionalEdges('weatherAgent', shouldContinue, ['tool_executor', END])
    .addConditionalEdges('imageAgent', shouldContinue, ['tool_executor', END])
    .addConditionalEdges('router', routeTo, ['weatherAgent', 'generalAgent', 'imageAgent', END])
    .addConditionalEdges('tool_executor', routeAfterTool, ['weatherAgent', 'imageAgent'])
    .addEdge(START, 'router')
    .addEdge('generalAgent', END);
  const app = builder.compile();
  async function run({
    thread_id,
    message,
    ip,
    run_id,
  }: {
    thread_id: string;
    message: typeof AgentStateAnnotation.State;
    ip: string;
    run_id: string;
  }) {
    const config = {
      configurable: {
        thread_id,
        ip,
        run_id,
        metadata: {
          tools: message,
        },
      },
    };
    const result = await app.streamEvents(message, {
      version: 'v2',
      configurable: config.configurable,
    });
    return langChainStreamEventsOutputToUnifyOutput(result);
  }

  return run;
};
