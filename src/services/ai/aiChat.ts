import { ParameBodyType, RequestType, ResponseType } from '../../utils/type';
import { agui } from '../../ai/agreement';
// import { a2ui } from '../../ai/agreement/a2ui';
import { HandlerResult } from '../../utils/getSendResult';
import {
  AiChatSessions,
  AiChatMessages,
  AiChatMessageRoleLiteral,
  AiChatMessageTypeLiteral,
  sequelize,
} from '../../models';
import { RunAgentInput } from '@ag-ui/core';
import { agUiInputToUnifyInput, unifyInputToLangChainInput } from '@/ai/utils/adapters';
import { createMainAgent } from '@/ai/agent';
import { v4 as uuidv4 } from 'uuid';
import { toolExecutionManager } from '@/ai/utils/toolExecutionManager';
import { GlobalMsgList, getGlobalMemoryAgent } from '@/ai/agent/memory';

type ChatRequestType = RunAgentInput;

const chat = async (req: RequestType<ChatRequestType, 'post'>, res: ResponseType) => {
  // const { id } = req.aiUser!;
  // const uuid = uuidv4();
  const transaction = await sequelize.transaction();
  const globalMsgList: GlobalMsgList[] = req.body.messages.map(item => {
    return {
      messageId: item.id,
      content: item.content as string,
      role: item.role,
    };
  });
  try {
    const reasoningId = uuidv4();
    const activityId = uuidv4();
    const threadId = req.body.threadId;
    const session = await AiChatSessions.findOne({
      where: {
        session_id: threadId,
      },
    });
    let sessionId = session?.id;
    const msg = req.body?.messages
      ? (req.body.messages[req.body.messages.length - 1]?.content as string)
      : '新的会话';
    if (!sessionId) {
      const res = await AiChatSessions.create(
        {
          session_id: threadId,
          user_id: req.aiUser?.id ?? 0,
          title: '新的会话',
          last_message_preview: msg,
        },
        {
          transaction,
        }
      );
      sessionId = res.id;
    } else {
      await AiChatSessions.update(
        {
          last_message_preview: msg,
        },
        {
          where: {
            session_id: sessionId,
          },
          transaction,
        }
      );
    }
    //插入用户消息
    await AiChatMessages.create(
      {
        message_id: reasoningId,
        session_id: sessionId!,
        role: 'user',
        message_type: 'text',
        content: JSON.stringify(req.body.messages[req.body.messages.length - 1]?.content ?? ''),
      },
      {
        transaction,
      }
    );
    const langChainInput = unifyInputToLangChainInput(agUiInputToUnifyInput(req.body));
    // langChainInput.tools
    const run = createMainAgent();
    const runResult = await run({
      thread_id: threadId,
      message: {
        ...langChainInput,
        userId: req.aiUser?.id ?? 0,
      },
      ip: req.aiUser?.id?.toString() ?? '',
      run_id: req.body.runId,
    });

    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
    for await (const evt of runResult) {
      switch (evt.event) {
        case 'modelStart':
          agui.initSSE(res);
          agui.runStarted(res, {
            runId: evt.runId,
            threadId: evt.threadId,
          });
          agui.reasoningStart(res, {
            messageId: reasoningId,
          });
          agui.activitySnapshot(res, {
            messageId: activityId,
            activityType: 'THINKING',
            content: {
              status: 'pending',
              content: 'AI 正在思考中',
            },
          });
          keepaliveTimer = setInterval(() => agui.keepalive(res), 15000);
          break;
        case 'modelEnd':
          {
            if (keepaliveTimer) {
              clearInterval(keepaliveTimer);
              keepaliveTimer = null;
            }
            agui.runFinished(res, {
              runId: evt.runId,
              threadId: evt.threadId,
            });
            agui.end(res);
            getGlobalMemoryAgent(globalMsgList, evt.threadId, req.aiUser!.id);
          }
          break;
        case 'messageStart':
          // agui.activityDelta(res, 'THINKING', activityId, [
          //   { op: 'replace', path: '/status', value: 'success' },
          //   { op: 'replace', path: '/content', value: 'AI 思考完成' },
          // ]);
          agui.activityDelta(res, {
            messageId: activityId,
            activityType: 'THINKING',
            patch: [
              { op: 'replace', path: '/status', value: 'pending' },
              { op: 'replace', path: '/content', value: 'AI开始输出' },
            ],
          });
          agui.reasoningEnd(res, {
            messageId: reasoningId,
          });
          agui.textMessageStart(res, {
            messageId: evt.messageId,
          });
          break;
        case 'messageChunk':
          agui.textMessageContent(res, {
            messageId: evt.messageId,
            delta: evt.message,
          });
          break;
        case 'messageEnd': {
          const content = evt.content;
          agui.textMessageEnd(res, {
            messageId: evt.messageId,
          });
          agui.activityDelta(res, {
            messageId: activityId,
            activityType: 'THINKING',
            patch: [
              { op: 'replace', path: '/status', value: 'success' },
              { op: 'replace', path: '/content', value: 'AI输出完成' },
            ],
          });
          globalMsgList.push({
            messageId: evt.messageId,
            content,
            role: 'assistant',
          });
          await AiChatMessages.create(
            {
              message_id: evt.messageId,
              session_id: sessionId!,
              role: 'assistant',
              message_type: 'text',
              content: content,
            },
            {
              transaction,
            }
          );
          await AiChatSessions.update(
            {
              last_message_preview: content,
            },
            {
              where: {
                session_id: sessionId,
              },
              transaction,
            }
          );
          break;
        }
        case 'a2uiMessage': {
          const id = 'custom' + uuidv4();
          const value = JSON.stringify(evt.value);
          // 插入a2ui消息
          await AiChatMessages.create({
            message_id: id,
            session_id: sessionId!,
            role: 'assistant',
            message_type: 'A2UI',
            content: value,
          });
          globalMsgList.push({
            messageId: id,
            content: value,
            role: 'assistant',
          });
          agui.custom(res, {
            name: 'a2ui',
            value: evt.value,
            customId: id,
          });
          break;
        }
        case 'toolStart':
          agui.toolCallStart(res, {
            toolCallId: evt.toolCallId,
            toolCallArgs: evt.toolCallArgs,
            toolCallName: evt.toolCallName,
            toolType: evt.toolType,
          });
          agui.activityDelta(res, {
            messageId: activityId,
            activityType: 'THINKING',
            patch: [
              { op: 'replace', path: '/status', value: 'pending' },
              { op: 'replace', path: '/content', value: `调用${evt.toolCallName}工具中` },
            ],
          });
          break;
        case 'toolEnd':
          agui.toolCallEnd(res, {
            toolCallId: evt.toolCallId,
          });
          agui.activityDelta(res, {
            messageId: activityId,
            activityType: 'THINKING',
            patch: [
              { op: 'replace', path: '/status', value: 'success' },
              { op: 'replace', path: '/content', value: `调用工具完成` },
            ],
          });
          break;
      }
    }
    transaction.commit();
    return null;
  } catch (error) {
    transaction.rollback();
    console.log(error);
    return null;
  }
};

type ToolResultResponseType = {
  /** 工具id */
  toolId: string;
  /** 工具返回结果 */
  toolResult: string;
};

const toolResult = async (
  req: RequestType<ToolResultResponseType, 'post'>
): Promise<HandlerResult<null>> => {
  const toolId = req.body.toolId;
  const toolRes = req.body.toolResult;
  if (toolExecutionManager.hasPending(toolId)) {
    toolExecutionManager.submitResult(toolId, toolRes);
    return {
      msg: '成功',
      data: null,
    };
  } else {
    return {
      err: '失败，未找到对应的工具id',
    };
  }
};

// 会话列表
type SessionListResponseType = {
  /** id */
  id: number;
  /** 会话id */
  sessionId: string;
  /** 标题 */
  title: string;
  /** 最后一条实际消息的摘要，用于会话列表展示 */
  lastMessagePreview: string;
  /** 最后一条实际消息的时间，用于会话排序（毫秒级Unix时间戳） */
  lastMessageAt: number;
};

type SessionListRequsetType = {
  /** 排序 */
  sort: 'ASC' | 'DESC';
};

/**
 * 获取会话列表
 * @param params
 */
const getSessionList = async (
  params: ParameBodyType<SessionListRequsetType>
): Promise<HandlerResult<SessionListResponseType>> => {
  const { aiUser, size = 10, page = 1, sort = 'ASC' } = params;
  if (!aiUser) {
    return {
      err: '未找到用户',
    };
  }
  const { rows, count } = await AiChatSessions.findAndCountAll({
    limit: size,
    offset: (page - 1) * size,
    distinct: true, // 防止关联查询导致的重复计数
    order: [['last_message_at', sort]],
    attributes: ['id', 'title', 'last_message_preview', 'last_message_at', 'session_id'],
    where: {
      user_id: aiUser.id,
    },
  });

  const results = rows.map(item => ({
    id: item.id,
    sessionId: item.session_id,
    title: item.title,
    lastMessagePreview: item.last_message_preview,
    lastMessageAt: item.last_message_at,
  }));
  return {
    msg: '成功',
    data: {
      data: results,
      pagination: {
        page,
        size,
        total: count,
      },
    },
  };
};

type MessagesRequsetType = {
  /** 会话id */
  id?: number;
  /** 排序 */
  sort?: 'ASC' | 'DESC';
};

type MessagesResponseType = {
  /** id */
  id: number;
  /** 消息id */
  messageId: string;
  /** 会话id */
  sessionId: number;
  /** 角色 */
  role: AiChatMessageRoleLiteral;
  /** 消息类型 */
  messageType: AiChatMessageTypeLiteral;
  /** 内容 */
  content: string;
  /** 创建时间 */
  createdAt: number;
};

const getMessages = async (
  params: ParameBodyType<MessagesRequsetType>
): Promise<HandlerResult<MessagesResponseType>> => {
  const { id, page = 1, size = 20, sort = 'ASC' } = params;
  if (!id) {
    return {
      msg: '成功',
      data: {
        data: [],
        pagination: {
          page,
          size,
          total: 0,
        },
      },
    };
  }
  const { rows, count } = await AiChatMessages.findAndCountAll({
    where: {
      session_id: id,
    },
    limit: size,
    offset: (page - 1) * size,
    distinct: true, // 防止关联查询导致的重复计数
    order: [['createdAt', sort]],
  });

  const results = rows.map(item => ({
    id: item.id,
    messageId: item.message_id,
    sessionId: item.session_id,
    role: item.role,
    messageType: item.message_type,
    content: item.content,
    createdAt: item.createdAt,
  }));

  return {
    msg: '成功',
    data: {
      data: results,
      pagination: {
        page,
        size,
        total: count,
      },
    },
  };
};

export {
  ChatRequestType,
  SessionListResponseType,
  MessagesRequsetType,
  MessagesResponseType,
  SessionListRequsetType,
  ToolResultResponseType,
  chat,
  getSessionList,
  getMessages,
  toolResult,
};
