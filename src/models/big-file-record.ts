import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

/**
 * 大文件记录属性接口
 */
export interface BigFileRecordAttributes {
  id: number;
  identifier: string;       // 文件唯一标识 (MD5)
  originalName: string;     // 原始文件名
  totalSize: number;        // 文件总大小 (bytes)
  chunkSize: number;        // 分片大小 (默认 2MB)
  totalChunks: number;      // 总分片数
  mimeType: string;         // MIME 类型
  status: 'uploading' | 'completed' | 'failed';
  fileHash?: string | null; // 文件 MD5（用于秒传）
  storedName?: string | null; // 合并后的存储文件名
  filePath?: string | null; // 合并后文件路径
  fileUrl?: string | null;  // 合并后文件 URL
  createdAt: number;
  completedAt?: number | null;
}

/** 创建时可选字段 */
export type BigFileRecordCreationAttributes = Optional<
  BigFileRecordAttributes,
  | 'id'
  | 'status'
  | 'fileHash'
  | 'storedName'
  | 'filePath'
  | 'fileUrl'
  | 'completedAt'
>;

// 模型类
export class BigFileRecord
  extends Model<BigFileRecordAttributes, BigFileRecordCreationAttributes>
  implements BigFileRecordAttributes
{
  declare id: number;
  declare identifier: string;
  declare originalName: string;
  declare totalSize: number;
  declare chunkSize: number;
  declare totalChunks: number;
  declare mimeType: string;
  declare status: 'uploading' | 'completed' | 'failed';
  declare fileHash: string | null;
  declare storedName: string | null;
  declare filePath: string | null;
  declare fileUrl: string | null;
  declare createdAt: number;
  declare completedAt: number | null;
}

// 初始化函数
export function initBigFileRecordModel(sequelize: Sequelize): typeof BigFileRecord {
  BigFileRecord.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '大文件记录ID',
      },
      identifier: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
        comment: '文件唯一标识',
      },
      originalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '原始文件名',
      },
      totalSize: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '文件总大小(bytes)',
      },
      chunkSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '分片大小(bytes)',
      },
      totalChunks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '总分片数',
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'MIME类型',
      },
      status: {
        type: DataTypes.ENUM('uploading', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'uploading',
        comment: '上传状态',
      },
      fileHash: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '文件MD5，用于秒传',
      },
      storedName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '合并后存储文件名',
      },
      filePath: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '合并后文件路径',
      },
      fileUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '合并后文件URL',
      },
      createdAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '创建时间',
      },
      completedAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '完成时间',
      },
    },
    {
      sequelize,
      tableName: 'big_file_records',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: BigFileRecord) => {
          instance.createdAt = Date.now();
          instance.status = 'uploading';
        },
      },
      indexes: [
        {
          fields: ['identifier'],
          unique: true,
        },
        {
          fields: ['status'],
        },
        {
          fields: ['created_at'],
        },
      ],
      comment: '大文件记录表',
    }
  );

  return BigFileRecord;
}
