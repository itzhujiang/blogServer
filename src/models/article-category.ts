import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

/**
 * 文章分类关联表属性接口
 */
export interface ArticleCategoryAttributes {
  articleId: number; // 文章ID
  categoryId: number; // 分类ID
  isPrimary: boolean; // 是否主分类（true=主分类，false=次分类）
  sortOrder: number; // 排序权重（数字越小越靠前）
  createdAt?: number | null; // 创建时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type ArticleCategoryCreationAttributes = Optional<
  ArticleCategoryAttributes,
  'isPrimary' | 'sortOrder' | 'createdAt'
>;

// 模型类
export class ArticleCategory
  extends Model<ArticleCategoryAttributes, ArticleCategoryCreationAttributes>
  implements ArticleCategoryAttributes
{
  declare articleId: number;
  declare categoryId: number;
  declare isPrimary: boolean;
  declare sortOrder: number;
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
      isPrimary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否主分类',
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
      tableName: 'article_categories',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: ArticleCategory) => {
          instance.createdAt = Date.now();
        },
      },
      indexes: [
        {
          fields: ['article_id'],
        },
        {
          fields: ['category_id'],
        },
        {
          fields: ['is_primary'],
        },
      ],
      comment: '文章分类关联表',
    }
  );

  return ArticleCategory;
}
