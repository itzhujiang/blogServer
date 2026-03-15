import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import { AiChatMessageRoleLiteral, AiChatMessageTypeLiteral } from './enums';

export interface AiChatMessagesAttributes {
  /** ID */
  id: number;
  /** 对外业务ID */
  server_id: string;
  /** 所属会话ID */
  session_id: number;
  /** 消息发送方 */
  role: AiChatMessageRoleLiteral;
  /** 消息业务类型 */
  message_type: AiChatMessageTypeLiteral;
  /** 消息正文内容 */
  content: string;
  /** 创建时间（毫秒级Unix时间戳） */
  createdAt: number;
  /** 更新时间（毫秒级Unix时间戳） */
  updatedAt: number;
}

/** 创建时可选字段 */
export type AiChatMessagesCreationAttributes = Optional<
  AiChatMessagesAttributes,
  'id' | 'message_type' | 'createdAt' | 'updatedAt'
>;

// 模型类
export class AiChatMessages
  extends Model<AiChatMessagesAttributes, AiChatMessagesCreationAttributes>
  implements AiChatMessagesAttributes
{
  declare id: number;
  declare server_id: string;
  declare session_id: number;
  declare role: AiChatMessageRoleLiteral;
  declare message_type: AiChatMessageTypeLiteral;
  declare content: string;
  declare createdAt: number;
  declare updatedAt: number;
}

export function initAiChatMessagesModel(sequelize: Sequelize): typeof AiChatMessages {
  AiChatMessages.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'ID',
      },
      server_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        comment: '消息对外业务ID，使用UUID',
      },
      session_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '所属会话ID',
        references: {
          model: 'ai_chat_sessions',
          key: 'id',
        },
        onDelete: 'RESTRICT',
      },
      role: {
        type: DataTypes.ENUM('user', 'assistant', 'system'),
        allowNull: false,
        comment: '消息发送方：user（用户）/assistant（AI）/system（系统）',
      },
      message_type: {
        type: DataTypes.ENUM('text', 'system'),
        allowNull: false,
        defaultValue: 'text',
        comment: '消息业务类型：text（普通文本）/system（系统消息）',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '消息正文内容',
      },
      createdAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: () => Date.now(),
        comment: '消息创建时间（毫秒级Unix时间戳）',
      },
      updatedAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: () => Date.now(),
        comment: '消息更新时间（毫秒级Unix时间戳）',
      },
    },
    {
      sequelize,
      tableName: 'ai_chat_messages',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: AiChatMessages) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
        },
        beforeUpdate: (instance: AiChatMessages) => {
          instance.updatedAt = Date.now();
        },
      },
      indexes: [
        {
          name: 'idx_ai_chat_messages_server_id',
          unique: true,
          fields: ['server_id'],
        },
        {
          name: 'idx_ai_chat_messages_session_created_at',
          fields: [
            'session_id',
            { name: 'created_at', order: 'ASC' },
          ],
        },
      ],
      comment: 'AI聊天消息表',
    }
  );

  return AiChatMessages;
}
