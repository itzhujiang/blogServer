// 适配器，负责将各种协议/三方库的输出输出进行转换

import { RunAgentInput } from '@ag-ui/core';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';

type UnifyInputType = {
  /** 工具数组，主要用于前端工具的存储 */
  tools: {
    /** 工具名称 */
    toolName: string;
    /** 工具描述 */
    toolDescription: string;
    /** 工具需求参数 */
    toolParams: Record<string, unknown>;
  }[];
  /** 信息格式 */
  message: (
    | {
        /** 角色 */
        role: 'user' | 'assistant' | 'system';
        /** 信息内容 */
        content: string;
      }
    | {
        /** 角色 */
        role: 'tool';
        /** 信息内容 */
        content: string;
        /** 工具调用ID */
        toolCallId: string;
      }
  )[];
  /** 线程ID */
  threadId: string;
};

/**
 * 将AG-UI的输入转换为统一的输入格式
 * @returns 统一的输入格式
 */
export const agUiInputToUnifyInput = (agUiInput: RunAgentInput) => {
  const { tools, messages, threadId } = agUiInput;
  const unifyInput: UnifyInputType = {
    tools: tools.map(item => {
      return {
        toolName: item.name,
        toolDescription: item.description,
        toolParams: item.parameters,
      };
    }),
    message: messages
      .map(item => {
        if (item.role === 'user' || item.role === 'assistant' || item.role === 'system') {
          return {
            role: item.role,
            content: item.content as string,
          };
        } else if (item.role === 'tool') {
          return {
            role: item.role,
            content: item.content as string,
            toolCallId: item.toolCallId,
          };
        } else {
          return undefined;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== undefined),
    threadId,
  };
  return unifyInput;
};

/**
 * 将统一输入格式转换为LangChain输入格式
 * @param unifyInput
 */
export const unifyInputToLangChainInput = (unifyInput: UnifyInputType) => {
  const { tools, message, threadId } = unifyInput;
  const langChainMessages: BaseMessage[] = message
    .map(item => {
      if (item.role === 'user') {
        return new HumanMessage(item.content);
      } else if (item.role === 'assistant') {
        return new AIMessage(item.content);
      } else if (item.role === 'system') {
        return new SystemMessage(item.content);
      } else if (item.role === 'tool') {
        return new ToolMessage({
          tool_call_id: item.toolCallId,
          content: item.content,
        });
      } else {
        return undefined;
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined);
  return {
    threadId,
    messages: langChainMessages,
    tools: tools.map(item => {
      return {
        type: 'function' as const,
        function: {
          name: item.toolName,
          description: item.toolDescription,
          parameters: item.toolParams,
        },
      };
    }),
  };
};
