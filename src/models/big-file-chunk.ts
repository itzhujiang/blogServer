import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

/**
 * 分片记录属性接口
 */
export interface BigFileChunkAttributes {
  id: number;
  fileIdentifier: string;   // 关联 big_file_records.identifier
  chunkNumber: number;      // 分片序号 (从 1 开始)
  chunkSize: number;        // 分片大小
  chunkHash?: string | null; // 分片 MD5
  chunkPath: string;        // 分片存储路径
  status: 'pending' | 'uploaded';
  uploadedAt?: number | null;
}

/** 创建时可选字段 */
export type BigFileChunkCreationAttributes = Optional<
  BigFileChunkAttributes,
  | 'id'
  | 'chunkHash'
  | 'uploadedAt'
>;

// 模型类
export class BigFileChunk
  extends Model<BigFileChunkAttributes, BigFileChunkCreationAttributes>
  implements BigFileChunkAttributes
{
  declare id: number;
  declare fileIdentifier: string;
  declare chunkNumber: number;
  declare chunkSize: number;
  declare chunkHash: string | null;
  declare chunkPath: string;
  declare status: 'pending' | 'uploaded';
  declare uploadedAt: number | null;
}

// 初始化函数
export function initBigFileChunkModel(sequelize: Sequelize): typeof BigFileChunk {
  BigFileChunk.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '分片记录ID',
      },
      fileIdentifier: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: '关联大文件标识',
      },
      chunkNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '分片序号',
      },
      chunkSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '分片大小(bytes)',
      },
      chunkHash: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '分片MD5',
      },
      chunkPath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: '分片存储路径',
      },
      status: {
        type: DataTypes.ENUM('pending', 'uploaded'),
        allowNull: false,
        defaultValue: 'pending',
        comment: '上传状态',
      },
      uploadedAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '上传时间',
      },
    },
    {
      sequelize,
      tableName: 'big_file_chunks',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: BigFileChunk) => {
          instance.uploadedAt = Date.now();
          instance.status = 'pending';
        },
      },
      indexes: [
        {
          fields: ['file_identifier', 'chunk_number'],
          unique: true,
        },
        {
          fields: ['file_identifier'],
        },
      ],
      comment: '大文件分片记录表',
    }
  );

  return BigFileChunk;
}
