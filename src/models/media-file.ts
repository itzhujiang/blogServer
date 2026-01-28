import { Model, DataTypes, Optional, Association, Sequelize } from 'sequelize';
import { ArticleMedia } from './article-media';
import { ArtworkMedia } from './artwork-media';

/**
 * 媒体文件属性接口
 */
export interface MediaFileAttributes {
  id: number; // 媒体文件ID
  originalName: string; // 原始文件名
  storedName: string; // 存储文件名（UUID格式）
  filePath: string; // 服务端存储路径
  fileUrl: string; // 访问URL
  fileSize?: number | null; // 文件大小（字节）
  mimeType?: string | null; // MIME类型（如：image/jpeg）
  width?: number | null; // 图片宽度（像素）
  height?: number | null; // 图片高度（像素）
  altText?: string | null; // 图片描述（用于无障碍访问）
  uploaderName?: string | null; // 上传者
  fileHash: string; // 文件MD5
  createdAt?: number | null; // 上传时间（毫秒级Unix时间戳）
  updatedAt?: number | null; // 更新时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type MediaFileCreationAttributes = Optional<
  MediaFileAttributes,
  | 'id'
  | 'fileSize'
  | 'mimeType'
  | 'width'
  | 'height'
  | 'altText'
  | 'uploaderName'
  | 'fileHash'
  | 'createdAt'
  | 'updatedAt'
>;

// 模型类
export class MediaFile
  extends Model<MediaFileAttributes, MediaFileCreationAttributes>
  implements MediaFileAttributes
{
  declare id: number;
  declare originalName: string;
  declare storedName: string;
  declare filePath: string;
  declare fileUrl: string;
  declare fileSize: number | null;
  declare mimeType: string | null;
  declare width: number | null;
  declare height: number | null;
  declare altText: string | null;
  declare uploaderName: string | null;
  declare fileHash: string;
  declare createdAt: number | null;
  declare updatedAt: number | null;

  // 关联
  declare static associations: {
    articleMedias: Association<MediaFile, ArticleMedia>;
    artworkMedias: Association<MediaFile, ArtworkMedia>;
  };
}

// 初始化函数
export function initMediaFileModel(sequelize: Sequelize): typeof MediaFile {
  MediaFile.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '媒体文件ID',
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
        comment: '服务端存储路径',
      },
      fileUrl: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: '访问URL',
      },
      fileSize: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '文件大小(bytes)',
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'MIME类型',
      },
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '图片宽度',
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '图片高度',
      },
      altText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '图片描述，用于无障碍访问',
      },
      uploaderName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '上传者',
      },
      fileHash: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: '文件MD5，用于大文件秒传和去重',
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
      tableName: 'media_files',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: MediaFile) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
        },
        beforeUpdate: (instance: MediaFile) => {
          instance.updatedAt = Date.now();
        },
      },
      indexes: [
        {
          fields: ['mime_type'],
        },
        {
          fields: ['created_at'],
        },
        {
          fields: ['uploader_name'],
        },
        {
          fields: ['file_hash'],
        },
      ],
      comment: '媒体文件管理表',
    }
  );

  return MediaFile;
}
