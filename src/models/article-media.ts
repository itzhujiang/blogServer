import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import { ArticleMediaUsageLiteral } from './enums';

/**
 * 文章媒体关联属性接口
 */
export interface ArticleMediaAttributes {
  id?: number; // 关联ID（可选，创建时自动生成）
  articleId: number; // 文章ID
  mediaId: number; // 媒体文件ID
  usageType: ArticleMediaUsageLiteral; // 使用类型（thumbnail=缩略图, attachment=附件图, content=文章内容）
  sortOrder: number; // 排序权重
  createdAt?: number | null; // 创建时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type ArticleMediaCreationAttributes = Optional<
  ArticleMediaAttributes,
  'id' | 'usageType' | 'createdAt'
>;

// 模型类
export class ArticleMedia
  extends Model<ArticleMediaAttributes, ArticleMediaCreationAttributes>
  implements ArticleMediaAttributes
{
  declare id: number | undefined;
  declare articleId: number;
  declare mediaId: number;
  declare usageType: ArticleMediaUsageLiteral;
  declare sortOrder: number;
  declare createdAt: number | null;
}

// 初始化函数
export function initArticleMediaModel(sequelize: Sequelize): typeof ArticleMedia {
  ArticleMedia.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '关联ID',
      },
      articleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '文章ID',
      },
      mediaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '媒体文件ID',
      },
      usageType: {
        type: DataTypes.ENUM('thumbnail', 'attachment', 'content'),
        allowNull: false,
        defaultValue: 'attachment',
        comment: '使用类型 (thumbnail=缩略图, attachment=附件图, content=文章内容)',
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
      tableName: 'article_media',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeValidate: (instance: ArticleMedia) => {
          if (!instance.createdAt) {
            instance.createdAt = Date.now();
          }
          if (!instance.sortOrder) {
            instance.sortOrder = 0;
          }
        },
      },
      indexes: [
        {
          fields: ['article_id'],
        },
        {
          fields: ['media_id'],
        },
        {
          fields: ['usage_type'],
        },
      ],
      comment: '文章媒体关联表',
    }
  );

  return ArticleMedia;
}
