import { createSession } from "better-sse"

import { ParameBodyType, RequestType, ResponseType } from "../../utils/type"
import sseManager, { ConnectionMessage } from '../../utils/sse';
import { HandlerResult } from '../../utils/getSendResult';
import { v4 as uuidv4 } from 'uuid';
import {
  AiChatSessions,
  sequelize,
  AiChatMessages,
  AiChatMessageRoleLiteral,
  AiChatMessageTypeLiteral,
} from '../../models';

const chat = async (req: RequestType<null, 'get'>, res: ResponseType) => {
  const { id } = req.aiUser!;
  try {
    const session = await createSession(req, res, {
      keepAlive: 30000, // 30 秒心跳
      retry: 3000, // 3 秒重连间隔
    });

    // 连接建立的处理逻辑
    const handleConnected = () => {
      console.log(`用户 ${id} SSE 连接已建立`);
      sseManager.addConnection(String(id), session);
      sseManager.pushToUser<ConnectionMessage>(
        String(id),
        {
          role: 'system',
          msgType: 'overall',
          content: '连接已建立',
        },
        'system'
      );
    };

    // 注册事件监听器
    session.once('connected', handleConnected);

    // 如果连接已经建立（事件已触发），手动调用处理逻辑
    if (session.isConnected) {
      handleConnected();
    }

    session.once('disconnected', () => {
      console.log(`用户 ${id} SSE 连接已断开`);
      sseManager.removeConnection(String(id));
    });
  } catch (err) {
    console.error('创建 SSE 会话失败:', err);
    throw err;
  }
};

type SendMessageRequsetType = {
  /** 用户消息 */
  message: string;
  /** 客户端信息id */
  localId: string;
  /** 会话id */
  sessionId?: number;
};

type SendMessageResponseType = {
  /** 服务端信息id */
  serverId: string;
  /** 客户端信息id */
  clientMessageId: string;
  /** 会话id */
  sessionId: number;
};

/**
 * 发送信息
 * @param params
 * @returns
 */
const sendMessage = async (
  params: ParameBodyType<SendMessageRequsetType>
): Promise<HandlerResult<SendMessageResponseType>> => {
  const transaction = await sequelize.transaction();
  try {
    const { aiUser, message, localId, sessionId } = params;

    if (!sseManager.hasConnection(String(aiUser!.id))) {
      return {
        err: 'SSE 连接未建立，请先建立 SSE 连接',
      };
    }
    const uuid = uuidv4();
    const now = Date.now();
    let aiChatSessions: AiChatSessions;
    if (!sessionId) {
      aiChatSessions = await AiChatSessions.create(
        {
          user_id: aiUser!.id,
          title: message,
          last_message_preview: message,
          last_message_at: now,
        },
        { transaction }
      );
    } else {
      const res = await AiChatSessions.findByPk(sessionId);
      if (!res) {
        return {
          err: '会话不存在',
        };
      }
      aiChatSessions = res;
      res.update(
        {
          last_message_preview: message,
          last_message_at: now,
        },
        { transaction }
      );
    }

    await AiChatMessages.create(
      {
        server_id: uuid,
        session_id: aiChatSessions.id,
        role: 'user',
        message_type: 'text',
        content: message,
      },
      { transaction }
    );

    transaction.commit();
    sseManager.pushToUser(
      String(aiUser!.id),
      {
        serverId: uuid,
        content: '你好',
        role: 'assistant',
        createdAt: now,
        sessionId: aiChatSessions.id,
        msgType: 'overall',
      },
      'message'
    );
    return {
      msg: '发送成功',
      data: {
        data: {
          clientMessageId: localId,
          serverId: uuid,
          sessionId: aiChatSessions.id,
        },
      },
    };
  } catch (err) {
    transaction.rollback();
    throw err;
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
  sort: 'ASC' | 'DESC'
}

/**
 * 获取会话列表
 * @param params 
 */
const getSessionList = async (params: ParameBodyType<SessionListRequsetType>): Promise<HandlerResult<SessionListResponseType>> => {
  const { aiUser, size = 10, page = 1, sort = 'ASC' } = params;
  if (!aiUser) {
    return {
      err: '未找到用户',
    }
  }
  const {rows, count} = await AiChatSessions.findAndCountAll({
    limit: size,
    offset: (page - 1) * size,
    distinct: true, // 防止关联查询导致的重复计数
    order: [['last_message_at', sort]],
    attributes: [
      'id', 'title', 'last_message_preview', 'last_message_at'
    ]
  });

  const results = rows.map(item => ({
    id: item.id,
    title: item.title,
    lastMessagePreview: item.last_message_preview,
    lastMessageAt: item.last_message_at
  }))
  
  return {
    msg: '成功',
    data: {
      data: results,
      pagination: {
        page,
        size,
        total: count
      }
    }
  }
} 

type MessagesRequsetType = {
  /** 会话id */
  id?: number,
  /** 排序 */
  sort?: 'ASC' | 'DESC'
}

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
  messageType: AiChatMessageTypeLiteral
  /** 内容 */
  content: string;
  /** 创建时间 */
  createdAt: number;
}

const getMessages = async (params: ParameBodyType<MessagesRequsetType>): Promise<HandlerResult<MessagesResponseType>> => {
  const {id, page = 1, size = 20, sort = 'ASC'} = params;
  if (id) {
    return {
      msg: '成功',
      data: {
        data: [],
        pagination: {
          page,
          size,
          total: 0
        }
      }
    }
  }
  const {rows, count} = await AiChatMessages.findAndCountAll({
    where: {
      id,
    },
    limit: size,
    offset: (page - 1) * size,
    distinct: true, // 防止关联查询导致的重复计数
    order: [['createdAt', sort]],
    attributes: [
      'id',
      'serverId'
    ]
  })

  const results = rows.map(item => ({
    id: item.id,
    serverId: item.server_id,
    sessionId: item.session_id,
    role: item.role,
    messageType: item.message_type,
    content: item.content,
    createdAt: item.createdAt
  }))

  return {
    msg: '成功',
    data: {
      data: results,
      pagination: {
        page,
        size,
        total: count
      }
    }
  }
}

export { SendMessageRequsetType, SendMessageResponseType,SessionListResponseType, MessagesRequsetType,MessagesResponseType, SessionListRequsetType, chat, sendMessage,getSessionList, getMessages }