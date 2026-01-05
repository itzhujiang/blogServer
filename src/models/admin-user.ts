import {
  Model,
  DataTypes,
  Optional,
  Sequelize,
} from 'sequelize';
import { AdminStatusLiteral } from './enums';

/**
 * 管理员用户属性接口
 */
export interface AdminUserAttributes {
  id: number;                          // 管理员ID
  username: string;                    // 登录用户名（唯一标识）
  email: string;                       // 邮箱地址（用于密码重置和通知）
  displayName?: string | null;         // 显示名称（后台展示用）
  avatarUrl?: string | null;           // 头像URL
  passwordHash: string;                // 密码哈希值（MD5算法）
  passwordSalt: string;                // 密码盐值（增强安全性）
  status: AdminStatusLiteral;          // 账户状态（active=活跃, inactive=停用, locked=锁定）
  lastLoginAt?: number | null;         // 最后登录时间（毫秒级Unix时间戳）
  lastLoginIp?: string | null;         // 最后登录IP地址（支持IPv4和IPv6）
  loginAttempts: number;               // 连续登录失败次数（5次后锁定）
  lockedUntil?: number | null;         // 账户锁定到期时间（毫秒级Unix时间戳）
  createdAt?: number | null;           // 创建时间（毫秒级Unix时间戳）
  updatedAt?: number | null;           // 更新时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type AdminUserCreationAttributes = Optional<
  AdminUserAttributes,
  | 'id'
  | 'displayName'
  | 'avatarUrl'
  | 'status'
  | 'lastLoginAt'
  | 'lastLoginIp'
  | 'loginAttempts'
  | 'lockedUntil'
  | 'createdAt'
  | 'updatedAt'
>;

// 模型类
export class AdminUser
  extends Model<AdminUserAttributes, AdminUserCreationAttributes>
  implements AdminUserAttributes
{
  declare id: number;
  declare username: string;
  declare email: string;
  declare displayName: string | null;
  declare avatarUrl: string | null;
  declare passwordHash: string;
  declare passwordSalt: string;
  declare status: AdminStatusLiteral;
  declare lastLoginAt: number | null;
  declare lastLoginIp: string | null;
  declare loginAttempts: number;
  declare lockedUntil: number | null;
  declare createdAt: number | null;
  declare updatedAt: number | null;
}

// 初始化函数
export function initAdminUserModel(sequelize: Sequelize): typeof AdminUser {
  AdminUser.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '管理员ID',
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: '登录用户名',
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: '邮箱地址',
      },
      displayName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '显示名称',
      },
      avatarUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '头像URL',
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '密码哈希值（MD5）',
      },
      passwordSalt: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '密码盐值',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'locked'),
        allowNull: false,
        defaultValue: 'active',
        comment: '账户状态 (active=活跃, inactive=停用, locked=锁定)',
      },
      lastLoginAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '最后登录时间（毫秒级Unix时间戳）',
      },
      lastLoginIp: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: '最后登录IP地址（支持IPv4和IPv6）',
      },
      loginAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '连续登录失败次数',
      },
      lockedUntil: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '账户锁定到期时间（毫秒级Unix时间戳）',
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
      tableName: 'admin_users',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: AdminUser) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
          if (!instance.status) {
            instance.status = 'active';
          }
          if (!instance.loginAttempts) {
            instance.loginAttempts = 0;
          }
        },
        beforeUpdate: (instance: AdminUser) => {
          instance.updatedAt = Date.now();
        },
      },
      indexes: [
        {
          unique: true,
          fields: ['username'],
        },
        {
          unique: true,
          fields: ['email'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['last_login_ip'],
        },
      ],
      comment: '后台管理员用户表',
    }
  );

  return AdminUser;
}
