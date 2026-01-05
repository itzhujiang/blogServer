import {
  Model,
  DataTypes,
  Optional,
  Sequelize,
} from 'sequelize';
import { ArtworkMediaUsageLiteral } from './enums';

/**
 * AI作品媒体关联属性接口
 */
export interface ArtworkMediaAttributes {
  id?: number;                           // 关联ID（可选，创建时自动生成）
  artworkId: number;                     // AI作品ID
  mediaId: number;                       // 媒体文件ID
  usageType: ArtworkMediaUsageLiteral;   // 使用类型（main=主展示图, thumbnail=缩略图, process=创作过程图, variant=变体图）
  sortOrder: number;                     // 排序权重（数字越小越靠前）
  createdAt?: number | null;             // 创建时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type ArtworkMediaCreationAttributes = Optional<
  ArtworkMediaAttributes,
  'id' | 'usageType' | 'sortOrder' | 'createdAt'
>;

// 模型类
export class ArtworkMedia
  extends Model<ArtworkMediaAttributes, ArtworkMediaCreationAttributes>
  implements ArtworkMediaAttributes
{
  declare id: number | undefined;
  declare artworkId: number;
  declare mediaId: number;
  declare usageType: ArtworkMediaUsageLiteral;
  declare sortOrder: number;
  declare createdAt: number | null;
}

// 初始化函数
export function initArtworkMediaModel(
  sequelize: Sequelize
): typeof ArtworkMedia {
  ArtworkMedia.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '关联ID',
      },
      artworkId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'AI作品ID',
      },
      mediaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '媒体文件ID',
      },
      usageType: {
        type: DataTypes.ENUM('main', 'thumbnail', 'process', 'variant'),
        allowNull: false,
        defaultValue: 'main',
        comment: '使用类型 (main=主展示图, thumbnail=缩略图, process=创作过程图, variant=变体图)',
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '排序权重',
      },
      createdAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '创建时间（毫秒级Unix时间戳）',
      },
    },
    {
      sequelize,
      tableName: 'artwork_media',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: ArtworkMedia) => {
          instance.createdAt = Date.now();
        },
      },
      indexes: [
        {
          fields: ['artwork_id'],
        },
        {
          fields: ['media_id'],
        },
        {
          fields: ['usage_type'],
        },
      ],
      comment: 'AI作品媒体关联表',
    }
  );

  return ArtworkMedia;
}
