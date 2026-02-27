import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import { AiChatUserStatusLiteral } from './enums';

/**
 * AI聊天用户属性接口
 */
export interface AiChatUsersAttributes {
  /** ID */
  id: number;
  /** 手机号 */
  phone: string;
  /** 用户状态（active/blocked） */
  status: AiChatUserStatusLiteral;
  /** 上次验证时间（毫秒级Unix时间戳） */
  last_verified_at: number;
  /** 上次登录IP地址（支持IPv4和IPv6） */
  last_login_ip: string;
  /** 创建时间（毫秒级Unix时间戳） */
  createdAt: number;
  /** 更新时间（毫秒级Unix时间戳） */
  updatedAt: number;
}

/** 创建时可选字段 */
export type AiChatUsersCreationAttributes = Optional<
  AiChatUsersAttributes,
  'id' | 'createdAt' | 'updatedAt'
>;

// 模型类
export class AiChatUsers
  extends Model<AiChatUsersAttributes, AiChatUsersCreationAttributes>
  implements AiChatUsersAttributes
{
  declare id: number;
  declare phone: string;
  declare status: AiChatUserStatusLiteral;
  declare last_verified_at: number;
  declare last_login_ip: string;
  declare createdAt: number;
  declare updatedAt: number;
}

// 初始化函数
export function initAiChatUsersModel(sequelize: Sequelize): typeof AiChatUsers {
  AiChatUsers.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: 'ID',
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
        comment: '手机号',
      },
      status: {
        type: DataTypes.ENUM('active', 'blocked'),
        allowNull: true,
        defaultValue: 'active',
        comment: '用户状态（active/blocked）',
      },
      last_verified_at: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '上次验证时间（毫秒级Unix时间戳）',
      },
      last_login_ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: '上次登录IP地址（支持IPv4和IPv6）',
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
    },
    {
      sequelize,
      tableName: 'ai_chat_users',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: AiChatUsers) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
        },
        beforeUpdate: (instance: AiChatUsers) => {
          instance.updatedAt = Date.now();
        }
      },
      indexes: [
        {
          unique: true,
          fields: ['phone'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['last_login_ip'],
        },
      ],
      comment: 'AI聊天用户表',
    }
  )

    return AiChatUsers;
}