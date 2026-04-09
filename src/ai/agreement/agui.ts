import type { Message, BaseEvent, RunAgentInput } from '@ag-ui/core';
import { EventType } from '@ag-ui/core';
import { v4 as uuidv4 } from 'uuid';
import { ResponseType } from '../../utils/type';

class AgUi {
  /**
   * 写入级别信息
   * @param res
   * @param event
   */
  private writeEvent(res: ResponseType, event: BaseEvent) {
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
   * @param res
   * @param threadId 线程id(通过sessionId)
   * @param runId 流程的id
   */
  runStarted(res: ResponseType, threadId: string, runId: string) {
    this.writeEvent(res, {
      type: EventType.RUN_STARTED,
      threadId,
      runId,
    } as BaseEvent);
  }

  /**
   * 文本消息开始
   * @param res
   * @param messageId 消息id
   */
  textMessageStart(res: ResponseType, messageId: string) {
    this.writeEvent(res, {
      type: EventType.TEXT_MESSAGE_START,
      messageId,
      role: 'assistant',
    } as BaseEvent);
  }

  /**
   * 文本消息内容
   * @param res
   * @param messageId 消息id
   * @param delta 文本增量
   */
  textMessageContent(res: ResponseType, messageId: string, delta: string) {
    this.writeEvent(res, {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId,
      delta,
    } as BaseEvent);
  }

  /**
   * 文本消息结束
   * @param res
   * @param messageId 消息id
   */
  textMessageEnd(res: ResponseType, messageId: string) {
    this.writeEvent(res, {
      type: EventType.TEXT_MESSAGE_END,
      messageId,
    } as BaseEvent);
  }

  /**
   * 思考开始
   * @param res
   * @param messageId
   */
  reasoningStart(res: ResponseType, messageId: string) {
    this.writeEvent(res, {
      role: 'assistant',
      type: EventType.REASONING_START,
      messageId,
    });
  }

  reasoningEnd(res: ResponseType, messageId: string) {
    this.writeEvent(res, {
      role: 'assistant',
      type: EventType.REASONING_END,
      messageId,
    });
  }

  /**
   * 通知前端ui显示活动的
   * @param res
   * @param activityType 活动类型
   * @param content 内容对象
   * @param messageId 信息id
   * @param replace 是否替换同 ID 的已有 activity
   */
  activitySnapshot(
    res: ResponseType,
    activityType: string,
    content: Record<string, unknown>,
    messageId: string,
    replace: boolean = false
  ) {
    this.writeEvent(res, {
      type: EventType.ACTIVITY_SNAPSHOT,
      role: 'activity',
      activityType,
      content,
      messageId,
      replace,
    });
  }

  /**
   * 通知前端更新指定活动
   * @param res
   * @param activityType
   * @param messageId
   * @param patch
   */
  activityDelta(res: ResponseType, activityType: string, messageId: string, patch: any[]) {
    this.writeEvent(res, {
      type: EventType.ACTIVITY_DELTA,
      messageId,
      activityType,
      patch, // RFC 6902 JSON Patch operations
    });
  }

  /**
   * 运行完成
   * @param res
   * @param threadId 线程id
   * @param runId 流程id
   */
  runFinished(res: ResponseType, threadId: string, runId: string) {
    this.writeEvent(res, {
      type: EventType.RUN_FINISHED,
      threadId,
      runId,
    } as BaseEvent);
  }

  /**
   * 运行失败
   * @param res
   * @param message 错误信息
   * @param threadId 线程id
   * @param runId 流程id
   */
  runError(res: ResponseType, message: string, threadId?: string, runId?: string) {
    this.writeEvent(res, {
      type: EventType.RUN_ERROR,
      message,
      threadId,
      runId,
    } as BaseEvent);
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
