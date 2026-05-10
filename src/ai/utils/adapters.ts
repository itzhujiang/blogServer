// 适配器，负责将各种协议/三方库的输出输出进行转换

import { RunAgentInput } from '@ag-ui/core';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { ClientTool, DynamicStructuredTool } from '@langchain/core/tools';
import { toolExecutionManager } from './toolExecutionManager';
import { defaultLogger } from '@/utils/logger';
import { A2UI_MARK, CALL_MODEL_WITH_RESULT } from './constant';

// langChain输入类型
export type LangChainInputType = {
  threadId: string;
  messages: BaseMessage[];
  tools: ClientTool[];
  next: string;
};

type UnifyInputType = {
  /** 工具数组，主要用于前端工具的存储 */
  tools: {
    /** 工具名称 */
    toolName: string;
    /** 工具描述 */
    toolDescription: string;
    /** 工具需求参数 */
    toolParams: Record<string, unknown>; // JSON Schema
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

/** 通用输出类型,  modelStart: 模型开始 modelEnd: 模型结束 toolStart: 工具开始 toolEnd: 工具结束 messageStart: 消息开始 messageEnd: 消息结束 messageChunk: 消息块 a2uiMessage: A2UI消息*/
type UnifyOutputType =
  | {
      event: 'modelStart' | 'modelEnd';
      runId: string;
      threadId: string;
    }
  | {
      event: 'toolStart';
      toolCallId: string;
      toolCallName: string;
      /** 工具参数 */
      toolCallArgs: string;
      /** 工具类型 */
      toolType: 'clientTool' | 'serverTool';
    }
  | {
      event: 'toolEnd';
      toolCallId: string;
    }
  | {
      event: 'messageChunk';
      message: string;
      messageId: string;
    }
  | {
      event: 'messageStart' | 'messageEnd';
      messageId: string;
    }
  | {
      event: 'a2uiMessage';
      /** A2UI 消息数组 */
      value: unknown[];
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
            content: (item.content as string) ?? '',
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
export const unifyInputToLangChainInput = (unifyInput: UnifyInputType): LangChainInputType => {
  const { tools, message, threadId } = unifyInput;
  const langChainMessages: BaseMessage[] = message
    .map(item => {
      if (item.role === 'user') {
        return new HumanMessage(item.content);
      } else if (item.role === 'assistant') {
        return new AIMessage(item.content ?? '');
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
    next: '',
    tools: tools.map(item => {
      return new DynamicStructuredTool({
        name: item.toolName,
        description: item.toolDescription,
        schema: item.toolParams,
        func: async (_input, config) => {
          const toolId = config?.getChild().metadata.tool_id as string;
          if (toolId) {
            return await toolExecutionManager.waitForResult(toolId);
          }
          return;
        },
      });
    }),
  };
};

const messageIdSet = new Set<string>();
const chatModelRunMessageIdMap = new Map<string, string>();

/**
 * 将LangChain stream events 输出转换为统一输出格式
 * @param langChainOutput，LangChain的stream事件输出
 * @param threadId 线程id
 */
export async function* langChainStreamEventsOutputToUnifyOutput(
  langChainOutput: IterableReadableStream<StreamEvent>
): AsyncGenerator<UnifyOutputType, void, unknown> {
  for await (const event of langChainOutput) {
    defaultLogger.info(event);
    const eventName = event.event;
    const eventInitiator = event.name;
    const metadata = event?.metadata || {};
    if (
      eventName === 'on_chain_start' &&
      eventInitiator === 'LangGraph' &&
      !metadata.langgraph_node
    ) {
      yield {
        event: 'modelStart',
        runId: event.metadata.run_id,
        threadId: event.metadata.thread_id,
      };
    } else if (
      eventName === 'on_chain_end' &&
      eventInitiator === 'LangGraph' &&
      !metadata.langgraph_node
    ) {
      yield {
        event: 'modelEnd',
        runId: event.metadata.run_id,
        threadId: event.metadata.thread_id,
      };
    } else if (eventName === 'on_chain_end' && metadata.langgraph_node === CALL_MODEL_WITH_RESULT) {
      const msg = event.data.output['messages'];
      if (msg && Array.isArray(msg) && msg[msg.length - 1] instanceof AIMessage) {
        const message = msg[msg.length - 1] as AIMessage;
        const content = typeof message.content === 'string' ? message.content : '';
        if (content.startsWith(A2UI_MARK)) {
          console.log('message', message);
          const jsonString = content.split(A2UI_MARK)[1]?.trim() ?? '';
          try {
            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed)) {
              yield { event: 'a2uiMessage', value: parsed };
            }
          } catch {
            // JSON 解析失败，忽略
          }
        }
      }
    } else if (eventName === 'on_tool_start') {
      yield {
        event: 'toolStart',
        toolCallId: event.metadata.tool_call_id || event.metadata.tool_id,
        toolCallName: event.name,
        toolCallArgs: event.data.input,
        toolType: event.metadata.tool_type,
      };
    } else if (eventName === 'on_tool_end') {
      yield {
        event: 'toolEnd',
        toolCallId: event.metadata.tool_call_id || event.metadata.tool_id,
      };
    } else if (eventName === 'on_chat_model_stream') {
      const { chunk } = event.data;
      if (!chunk.content) {
        continue;
      }
      let messageId = chatModelRunMessageIdMap.get(event.run_id);
      //  && !chunk.id.startsWith('run-')
      if (!messageId && chunk.id) {
        messageId = chunk.id;
        chatModelRunMessageIdMap.set(event.run_id, messageId!);
      }

      if (!messageId) {
        continue;
      }

      if (!messageIdSet.has(messageId)) {
        messageIdSet.add(messageId);
        yield {
          event: 'messageStart',
          messageId,
        };
      }

      if (chunk.content) {
        yield {
          event: 'messageChunk',
          message: chunk.content,
          messageId,
        };
      }
    } else if (eventName === 'on_chat_model_end') {
      const msg = event.data.output;
      const messageId =
        chatModelRunMessageIdMap.get(event.run_id) ??
        (msg?.id && !msg.id.startsWith('run-') ? msg.id : undefined);
      if (messageId && messageIdSet.has(messageId)) {
        messageIdSet.delete(messageId);
        chatModelRunMessageIdMap.delete(event.run_id);

        // 检查完整消息内容是否包含 A2UI 分隔符
        const fullContent = typeof msg?.content === 'string' ? msg.content : '';
        const A2UI_DELIMITER = '---a2ui_JSON---';
        if (fullContent.includes(A2UI_DELIMITER)) {
          const jsonString = fullContent.split(A2UI_DELIMITER)[1]?.trim() ?? '';
          try {
            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed)) {
              yield { event: 'a2uiMessage', value: parsed };
            }
          } catch {
            // JSON 解析失败，忽略，正常走 messageEnd
          }
        }

        yield {
          event: 'messageEnd',
          messageId,
        };
      }
    }
  }
}
