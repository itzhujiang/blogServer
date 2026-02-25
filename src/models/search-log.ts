import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

/**
 * 搜索日志属性接口
 */
export interface SearchLogAttributes {
  id: number; // 日志ID
  query: string; // 搜索关键词
  resultsCount: number; // 搜索结果数量
  ipAddress: string | null; // 搜索用户IP地址（支持IPv4/IPv6）
  userAgent: string | null; // 用户代理（浏览器信息）
  createdAt: number; // 搜索时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type SearchLogCreationAttributes = Optional<
  SearchLogAttributes,
  'id' | 'resultsCount' | 'ipAddress' | 'userAgent' | 'createdAt'
>;

// 模型类
export class SearchLog
  extends Model<SearchLogAttributes, SearchLogCreationAttributes>
  implements SearchLogAttributes
{
  declare id: number;
  declare query: string;
  declare resultsCount: number;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare createdAt: number;
}

// 初始化函数
export function initSearchLogModel(sequelize: Sequelize): typeof SearchLog {
  SearchLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '日志ID',
      },
      query: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '搜索关键词',
      },
      resultsCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '搜索结果数',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP地址',
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '用户代理',
      },
      createdAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '创建时间（毫秒级Unix时间戳）',
      },
    },
    {
      sequelize,
      tableName: 'search_logs',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: SearchLog) => {
          instance.createdAt = Date.now();
        },
      },
      indexes: [
        {
          fields: ['query'],
        },
        {
          fields: ['created_at'],
        },
        {
          fields: ['ip_address'],
        },
      ],
      comment: '搜索日志表',
    }
  );

  return SearchLog;
}
