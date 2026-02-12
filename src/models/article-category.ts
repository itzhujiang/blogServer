import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

/**
 * 文章分类关联表属性接口
 */
export interface ArticleCategoryAttributes {
  articleId: number; // 文章ID
  categoryId: number; // 分类ID
  createdAt?: number | null; // 创建时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type ArticleCategoryCreationAttributes = Optional<ArticleCategoryAttributes, 'createdAt'>;

// 模型类
export class ArticleCategory
  extends Model<ArticleCategoryAttributes, ArticleCategoryCreationAttributes>
  implements ArticleCategoryAttributes
{
  declare articleId: number;
  declare categoryId: number;
  declare createdAt: number | null;
}

// 初始化函数
export function initArticleCategoryModel(sequelize: Sequelize): typeof ArticleCategory {
  ArticleCategory.init(
    {
      articleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '文章ID',
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '分类ID',
      },
      createdAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '创建时间（毫秒级Unix时间戳）',
      },
    },
    {
      sequelize,
      tableName: 'article_categories',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeValidate: (instance: ArticleCategory) => {
          if (!instance.createdAt) {
            instance.createdAt = Date.now();
          }
        },
      },
      indexes: [
        {
          fields: ['article_id'],
        },
        {
          fields: ['category_id'],
        },
      ],
      comment: '文章分类关联表',
    }
  );

  return ArticleCategory;
}
