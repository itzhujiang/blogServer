import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import { AiChatMessageRoleLiteral, AiChatMessageTypeLiteral } from './enums';

export interface AiChatMessagesAttributes {
  /** ID */
  id: number;
  /** 消息ID */
  message_id: string;
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
  declare message_id: string;
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
      message_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '消息对外业务ID',
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
      // 消息发送方：user=用户, assistant=AI, system=系统
      role: {
        type: DataTypes.ENUM('user', 'assistant', 'system'),
        allowNull: false,
      },
      // 消息业务类型：text=普通文本, A2UI=A2UI消息
      message_type: {
        type: DataTypes.ENUM('text', 'A2UI'),
        allowNull: false,
        defaultValue: 'text',
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
          name: 'idx_ai_chat_messages_message_id',
          unique: true,
          fields: ['message_id'],
        },
        {
          name: 'idx_ai_chat_messages_session_created_at',
          fields: ['session_id', { name: 'created_at', order: 'ASC' }],
        },
      ],
      comment: 'AI聊天消息表',
    }
  );

  return AiChatMessages;
}
