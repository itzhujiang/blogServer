import { Model, DataTypes, Optional, Sequelize } from 'sequelize';


export interface AiChatSessionsAttributes {
  /** ID */
  id: number;
  /** 用户id */
  user_id: number;
  /** 标题 */
  title: string;
  /** 最后一条实际消息的摘要，用于会话列表展示 */
  last_message_preview: string;
  /** 最后一条实际消息的时间，用于会话排序（毫秒级Unix时间戳） */
  last_message_at: number;
  /** 创建时间（毫秒级Unix时间戳） */
  createdAt: number;
  /** 更新时间（毫秒级Unix时间戳） */
  updatedAt: number;
  /** 删除时间（毫秒级Unix时间戳） */
  deletedAt: number;
}

/** 创建时可选字段 */
export type AiChatSessionsCreationAttributes = Optional<
  AiChatSessionsAttributes,
   'id' | 'last_message_preview' | 'last_message_at' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

// 模型类
export class AiChatSessions extends Model<AiChatSessionsAttributes, AiChatSessionsCreationAttributes> implements AiChatSessionsAttributes {
    declare id: number;
    declare user_id: number;
    declare title: string;
    declare last_message_preview: string;
    declare last_message_at: number;
    declare createdAt: number;
    declare updatedAt: number;
    declare deletedAt: number;
}

export function initAiChatSessionsModel(sequelize: Sequelize): typeof AiChatSessions {
  AiChatSessions.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'ID',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '所属AI聊天用户ID',
        references: {
          model: 'ai_chat_users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '会话标题，默认取第一条用户消息摘要，支持后续编辑',
      },
      last_message_preview: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '最后一条实际消息的摘要，用于会话列表展示',
      },
      last_message_at: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '最后一条实际消息的时间，用于会话排序（毫秒级Unix时间戳）',
      },
      createdAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: () => Date.now(),
        comment: '创建时间（毫秒级Unix时间戳）',
      },
      updatedAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: () => Date.now(),
        comment: '更新时间（毫秒级Unix时间戳）',
      },
      deletedAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '会话删除时间（软删除，毫秒级Unix时间戳）',
      }
    },
    {
      sequelize,
      tableName: 'ai_chat_sessions',
      underscored: true,
      timestamps: false,
      paranoid: true, // 启用软删除
      deletedAt: 'deleted_at', // 软删除字段名
      hooks: {
        beforeCreate: (instance: AiChatSessions) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;

        },
        beforeUpdate: (instance: AiChatSessions) => {
          instance.updatedAt = Date.now();
        },
        beforeRestore: (instance: AiChatSessions) => {
          // 恢复时清除 deletedAt
          instance.deletedAt = null as unknown as number;
        },
      },
      indexes: [
        {
          name: 'idx_ai_chat_sessions_user_deleted_last_message',
          fields: [
            'user_id',
            'deleted_at',
            { name: 'last_message_at', order: 'DESC' },
          ],
        },
        {
          name: 'idx_ai_chat_sessions_user_created_at',
          fields: [
            'user_id',
            { name: 'created_at', order: 'DESC' },
          ],
        },
      ]
    }
  )
  return AiChatSessions
}
