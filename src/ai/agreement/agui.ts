import type {
  ActivityDeltaEvent,
  ActivitySnapshotEvent,
  Message,
  ReasoningEndEvent,
  ReasoningStartEvent,
  RunAgentInput,
  RunErrorEvent,
  RunFinishedEvent,
  RunStartedEvent,
  TextMessageChunkEvent,
  TextMessageEndEvent,
  TextMessageStartEvent,
  ToolCallEndEvent,
  ToolCallStartEvent,
  CustomEvent,
} from '@ag-ui/core';
import { EventType, AGUIEventOf } from '@ag-ui/core';
import { v4 as uuidv4 } from 'uuid';
import { ResponseType } from '../../utils/type';

class AgUi {
  /**
   * 写入级别信息
   * @param res
   * @param event
   */
  private writeEvent<T extends EventType>(res: ResponseType, event: AGUIEventOf<T>) {
    const payload = {
      ...event,
      timestamp: event.timestamp ?? Date.now(),
    };

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  /**
   * 设置sse响应头
   * @param res
   */
  initSSE(res: ResponseType) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
  }
  /**
   * 运行开始
   */
  runStarted(res: ResponseType, data: Omit<RunStartedEvent, 'type'>) {
    this.writeEvent<EventType.RUN_STARTED>(res, {
      ...data,
      type: EventType.RUN_STARTED,
      threadId: data.threadId as string,
      runId: data.runId as string,
    });
  }

  /**
   * 文本消息开始
   */
  textMessageStart(res: ResponseType, data: Omit<TextMessageStartEvent, 'type' | 'role'>) {
    this.writeEvent<EventType.TEXT_MESSAGE_START>(res, {
      ...data,
      type: EventType.TEXT_MESSAGE_START,
      messageId: data.messageId as string,
      role: 'assistant',
    });
  }

  /**
   * 文本消息内容
   */
  textMessageContent(res: ResponseType, data: Omit<TextMessageChunkEvent, 'type'>) {
    this.writeEvent<EventType.TEXT_MESSAGE_CONTENT>(res, {
      ...data,
      messageId: data.messageId as string,
      delta: data.delta as string,
      type: EventType.TEXT_MESSAGE_CONTENT,
    });
  }

  /**
   * 文本消息结束
   */
  textMessageEnd(res: ResponseType, data: Omit<TextMessageEndEvent, 'type'>) {
    this.writeEvent<EventType.TEXT_MESSAGE_END>(res, {
      ...data,
      type: EventType.TEXT_MESSAGE_END,
      messageId: data.messageId as string,
    });
  }
  /**
   *工具调用开始
   */
  toolCallStart(
    res: ResponseType,
    data: Omit<ToolCallStartEvent, 'type'> & { toolCallArgs?: string }
  ) {
    this.writeEvent<EventType.TOOL_CALL_START>(res, {
      ...data,
      type: EventType.TOOL_CALL_START,
      toolCallId: data.toolCallId as string,
      toolCallName: data.toolCallName as string,
      toolCallArgs: data.toolCallArgs || '',
    });
  }

  /**
   * 工具调用结束
   */
  toolCallEnd(res: ResponseType, data: Omit<ToolCallEndEvent, 'type'>) {
    this.writeEvent<EventType.TOOL_CALL_END>(res, {
      ...data,
      type: EventType.TOOL_CALL_END,
      toolCallId: data.toolCallId as string,
    });
  }

  /**
   * 思考开始
   */
  reasoningStart(res: ResponseType, data: Omit<ReasoningStartEvent, 'type' | 'role'>) {
    this.writeEvent<EventType.REASONING_START>(res, {
      role: 'assistant',
      type: EventType.REASONING_START,
      messageId: data.messageId as string,
    });
  }

  reasoningEnd(res: ResponseType, data: Omit<ReasoningEndEvent, 'type' | 'role'>) {
    this.writeEvent<EventType.REASONING_END>(res, {
      role: 'assistant',
      type: EventType.REASONING_END,
      messageId: data.messageId as string,
    });
  }

  /**
   * 通知前端ui显示活动的
   */
  activitySnapshot(res: ResponseType, data: Omit<ActivitySnapshotEvent, 'type' | 'role'>) {
    this.writeEvent(res, {
      ...data,
      type: EventType.ACTIVITY_SNAPSHOT,
      role: 'activity',
      messageId: data.messageId as string,
      activityType: data.activityType as string,
      content: data.content as Record<string, unknown>,
      replace: (data.replace as boolean) ?? false,
    });
  }

  /**
   * 通知前端更新指定活动
   */
  activityDelta(res: ResponseType, data: Omit<ActivityDeltaEvent, 'type' | 'role'>) {
    this.writeEvent(res, {
      ...data,
      type: EventType.ACTIVITY_DELTA,
      role: 'activity',
      messageId: data.messageId as string,
      activityType: data.activityType as string,
      patch: data.patch as Array<{ op: string; path: string; value: unknown }>,
    });
  }

  custom(
    res: ResponseType,
    data: Omit<CustomEvent, 'type' | 'name'> & {
      name: 'a2ui';
    }
  ) {
    this.writeEvent(res, {
      type: EventType.CUSTOM,
      ...data,
    });
  }

  /**
   * 运行完成
   */
  runFinished(res: ResponseType, data: Omit<RunFinishedEvent, 'type'>) {
    this.writeEvent(res, {
      ...data,
      type: EventType.RUN_FINISHED,
      threadId: data.threadId as string,
      runId: data.runId as string,
    });
  }

  /**
   * 运行失败
   * @param res
   * @param message 错误信息
   * @param threadId 线程id
   * @param runId 流程id
   */
  runError(res: ResponseType, data: Omit<RunErrorEvent, 'type'>) {
    this.writeEvent(res, {
      ...data,
      type: EventType.RUN_ERROR,
      message: data.message as string,
    });
  }

  /**
   * 发送心跳包，防止长时间无数据导致 SSE 连接超时
   * @param res
   */
  keepalive(res: ResponseType) {
    res.write(': keepalive\n\n');
  }

  /**
   * 结束 SSE 响应
   * @param res
   */
  end(res: ResponseType) {
    res.end();
  }

  /**
   * 获取最后一条用户消息
   * @param messages 消息列表
   */
  getLastUserMessage(messages: Message[]) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'user') {
        return message;
      }
    }
    return null;
  }

  /**
   * 规范化 run 输入
   * @param input run 输入
   */
  normalizeRunInput(input: RunAgentInput) {
    const runId = input.runId ?? uuidv4();
    const messages = input.messages ?? [];
    const lastUserMessage = this.getLastUserMessage(messages);

    return {
      ...input,
      runId,
      messages,
      lastUserMessage,
    };
  }
}

const agui = new AgUi();

export { agui };
