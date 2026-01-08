import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

/**
 * 临时媒体文件属性接口
 */
export interface TempMediaAttributes {
  code: string; // 临时凭证（UUID）
  originalName: string; // 原始文件名
  storedName: string; // 存储文件名
  filePath: string; // 文件路径
  fileSize: number; // 文件大小（字节）
  mimeType: string; // MIME类型
  expiresAt: number; // 过期时间（毫秒级Unix时间戳）
  isUsed: boolean; // 是否已被使用
  createdAt?: number | null; // 创建时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type TempMediaCreationAttributes = Optional<
  TempMediaAttributes,
  'createdAt' | 'isUsed'
>;

// 模型类
export class TempMedia
  extends Model<TempMediaAttributes, TempMediaCreationAttributes>
  implements TempMediaAttributes
{
  declare code: string;
  declare originalName: string;
  declare storedName: string;
  declare filePath: string;
  declare fileSize: number;
  declare mimeType: string;
  declare expiresAt: number;
  declare isUsed: boolean;
  declare createdAt: number | null;
}

// 临时文件有效期（1天）
export const TEMP_FILE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时（毫秒）

// 初始化函数
export function initTempMediaModel(sequelize: Sequelize): typeof TempMedia {
  TempMedia.init(
    {
      code: {
        type: DataTypes.STRING(50),
        primaryKey: true,
        comment: '临时凭证（UUID）',
      },
      originalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '原始文件名',
      },
      storedName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '存储文件名',
      },
      filePath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: '文件路径',
      },
      fileSize: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '文件大小(bytes)',
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'MIME类型',
      },
      expiresAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '过期时间（毫秒级Unix时间戳）',
      },
      isUsed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已被使用',
      },
      createdAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '创建时间（毫秒级Unix时间戳）',
      },
    },
    {
      sequelize,
      tableName: 'temp_media',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: TempMedia) => {
          const now = Date.now();
          instance.createdAt = now;
          if (!instance.expiresAt) {
            instance.expiresAt = now + TEMP_FILE_EXPIRY;
          }
          if (instance.isUsed === undefined) {
            instance.isUsed = false;
          }
        },
      },
      indexes: [
        {
          fields: ['expires_at'],
        },
        {
          fields: ['is_used'],
        },
      ],
      comment: '临时媒体文件表',
    }
  );

  return TempMedia;
}
