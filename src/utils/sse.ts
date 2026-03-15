import { Session } from "better-sse"

type EventName = 'message' | 'system'

export type MessageType = 'chunk' | 'done' | 'typing' | 'connected'

export type MessageRole = 'assistant' | 'system'

export interface ChatMessage {
  /** 服务端id */
  serverId: string;
  /** 消息内容 */
  content?: string;
  /** 发送者角色 */
  role: MessageRole;
  /** 创建时间 */
  createdAt: number;
  /** 会话id */
  sessionId: number;
}



class SSEConnectionManager {
  private connections: Map<string, Session> = new Map()

  /**
   * 添加链接
   * @param userId 用户id
   * @param session 会话 
   */
  addConnection(userId: string, session: Session) {
    this.connections.set(userId, session);
  }

  /**
   * 移除链接
   * @param userId 用户id 
   */
  removeConnection(userId: string) {
    this.connections.delete(userId)
  };
  /**
   * 获取链接
   * @param userId 用户id 
   */
  getConnection(userId: string): Session | undefined {
    return this.connections.get(userId)
  }

  /**
   * 检查链接是否存在
   * @param userId 用户id
   * @returns 
   */
  hasConnection(userId: string): boolean {
    const session = this.connections.get(userId)
    return session !== undefined && session.isConnected
  }
  /**
   * 向指定用户推送信息
   * @param userId 用户id
   * @param data 消息
   * @param eventName 事件名称 
   */
  pushToUser(userId: string, data: ChatMessage, eventName: EventName = "message") {
    const session = this.connections.get(userId)
    if (!session || !session.isConnected) {
      return false
    }
     try {
      session.push(data, eventName)
      return true
    } catch (error) {
      throw error
    }
  }
  /**
   * 获取在线用户数
   * @returns 
   */
  getOnlineCount(): number {
    return this.connections.size
  }
}

export default new SSEConnectionManager();