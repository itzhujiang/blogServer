import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

export interface AiSessionMemoriesAttributes {
  /** id */
  id: number;
  /** 用户id */
  user_id: number;
  /** 线程id(会话id) */
  thread_id: string;
  /** 记忆内容 */
  content: string;
  /** 已处理到的最后一条消息 ID */
  last_message_id: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/** 创建时可选字段 */
export type AiSessionMemoriesCreationAttributes = Optional<
  AiSessionMemoriesAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'content'
>;

export class AiSessionMemories
  extends Model<AiSessionMemoriesAttributes, AiSessionMemoriesCreationAttributes>
  implements AiSessionMemoriesAttributes
{
  declare id: number;
  declare user_id: number;
  declare thread_id: string;
  declare last_message_id: string;
  declare content: string;
  declare createdAt: number;
  declare updatedAt: number;
}

export function initAiSessionMemoriesModel(sequelize: Sequelize): typeof AiSessionMemories {
  AiSessionMemories.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: 'ID',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '用户ID',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '记忆',
      },
      thread_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '线程id(会话id)',
      },
      last_message_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '已处理到的最后一条消息ID',
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
    },
    {
      sequelize,
      tableName: 'ai_session_memories',
      timestamps: false,
      hooks: {
        beforeCreate: (instance: AiSessionMemories) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
        },
        beforeUpdate: (instance: AiSessionMemories) => {
          instance.updatedAt = Date.now();
        },
      },
      indexes: [
        {
          unique: true,
          name: 'idx_thread_id',
          fields: ['thread_id'],
        },
        {
          name: 'idx_user_id',
          fields: ['user_id'],
        },
      ],
      comment: '会话记忆表',
    }
  );
  return AiSessionMemories;
}
