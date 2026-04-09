import { ParameBodyType, RequestType, ResponseType } from '../../utils/type';
import { agui } from '../../ai/agreement';
import { HandlerResult } from '../../utils/getSendResult';
import {
  AiChatSessions,
  AiChatMessages,
  AiChatMessageRoleLiteral,
  AiChatMessageTypeLiteral,
} from '../../models';
import { RunAgentInput } from '@ag-ui/core';
import { v4 as uuidv4 } from 'uuid';
import { agUiInputToUnifyInput, unifyInputToLangChainInput } from '@/ai/utils/adapters';
import { getWeatherAgent } from '@/ai/agent';

type ChatRequestType = RunAgentInput;

const chat = async (req: RequestType<ChatRequestType, 'post'>, res: ResponseType) => {
  console.log(req.ip);
  // const { id } = req.aiUser!;
  const uuid = uuidv4();
  try {
    const reasoningId = uuidv4();
    const activityId = uuidv4();
    agui.initSSE(res);
    agui.runStarted(res, req.body.threadId, req.body.runId);
    const langChainInput = unifyInputToLangChainInput(agUiInputToUnifyInput(req.body));
    console.log('langChainInput', langChainInput);

    agui.reasoningStart(res, reasoningId);
    agui.activitySnapshot(
      res,
      'THINKING',
      {
        status: 'pending',
        content: 'AI 正在思考中',
      },
      activityId
    );
    const run = getWeatherAgent();
    const lastMessage = langChainInput.messages[langChainInput.messages.length - 1];
    const runResult = await run(
      req.body.threadId,
      lastMessage.content as string,
      req.aiUser?.id?.toString() ?? ''
    );
    agui.activityDelta(res, 'THINKING', activityId, [
      { op: 'replace', path: '/status', value: 'success' },
      { op: 'replace', path: '/content', value: 'AI 思考完成' },
    ]);
    console.log('runResult', runResult);
    agui.reasoningEnd(res, reasoningId);
    agui.textMessageStart(res, uuid);
    agui.textMessageContent(res, uuid, runResult as string);
    agui.textMessageEnd(res, uuid);
    agui.end(res);

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

// 会话列表
type SessionListResponseType = {
  /** id */
  id: number;
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
    attributes: ['id', 'title', 'last_message_preview', 'last_message_at'],
  });

  const results = rows.map(item => ({
    id: item.id,
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
  /** 消息id */
  id: number;
  /** 服务id */
  serverId: string;
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
  if (id) {
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
      id,
    },
    limit: size,
    offset: (page - 1) * size,
    distinct: true, // 防止关联查询导致的重复计数
    order: [['createdAt', sort]],
    attributes: ['id', 'serverId'],
  });

  const results = rows.map(item => ({
    id: item.id,
    serverId: item.server_id,
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
  chat,
  getSessionList,
  getMessages,
};
