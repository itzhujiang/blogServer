import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import { AiGlobalChatMemoryCategoryLiteral } from './enums';

export interface AiGlobalChatMemoriesAttributes {
  /** id */
  id: number;
  /** 用户id */
  user_id: number;
  /** 记忆主题 */
  category: AiGlobalChatMemoryCategoryLiteral;
  /** 内容 */
  content: string | null;
  /** 访问次数 */
  access_count: number;
  /** 最后访问时间 */
  last_accessed_at: number;
  /** 是否为索引信息 */
  skip_index: boolean;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 删除时间 */
  deletedAt: number;
}

/** 创建时可选字段 */
export type AiGlobalChatMemoriesCreationAttributes = Optional<
  AiGlobalChatMemoriesAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'content' | 'category' | 'deletedAt'
>;

export class AiGlobalChatMemories
  extends Model<AiGlobalChatMemoriesAttributes, AiGlobalChatMemoriesCreationAttributes>
  implements AiGlobalChatMemoriesAttributes
{
  declare id: number;
  declare user_id: number;
  declare category: AiGlobalChatMemoryCategoryLiteral;
  declare content: string | null;
  declare access_count: number;
  declare last_accessed_at: number;
  declare skip_index: boolean;
  declare createdAt: number;
  declare updatedAt: number;
  declare deletedAt: number;
}

// 初始化函数
export function initAiGlobalChatMemoriesModel(sequelize: Sequelize): typeof AiGlobalChatMemories {
  AiGlobalChatMemories.init(
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
      category: {
        type: DataTypes.ENUM('user', 'feedback', 'reference'),
        allowNull: true,
        comment: '记忆主题',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '内容',
      },
      access_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '访问次数',
      },
      last_accessed_at: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '最后访问时间（毫秒级Unix时间戳）',
      },
      skip_index: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否为索引信息',
      },
      createdAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '创建时间（毫秒级Unix时间戳）',
      },
      updatedAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '更新时间（毫秒级Unix时间戳）',
      },
      deletedAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '删除时间（毫秒级Unix时间戳）',
      },
    },
    {
      sequelize,
      tableName: 'ai_global_chat_memories',
      underscored: true,
      timestamps: false,
      deletedAt: 'deletedAt',
      paranoid: true,
      hooks: {
        beforeCreate: (instance: AiGlobalChatMemories) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
        },
        beforeUpdate: (instance: AiGlobalChatMemories) => {
          instance.updatedAt = Date.now();
          // paranoid destroy 内部走 update，会把 deletedAt 设为 new Date()
          // 这里统一修正为毫秒时间戳
          const deletedAt = instance.deletedAt as any;
          if (deletedAt instanceof Date) {
            instance.deletedAt = deletedAt.getTime();
          }
        },
      },
      indexes: [
        {
          name: 'idx_user_category',
          fields: ['user_id', 'category'],
        },
        {
          name: 'idx_user_last_accessed',
          fields: ['user_id', 'last_accessed_at'],
        },
      ],
      comment: '全局聊天记忆表',
    }
  );

  return AiGlobalChatMemories;
}
