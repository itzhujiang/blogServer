import {
  Model,
  DataTypes,
  Optional,
  Association,
  Sequelize,
} from 'sequelize';
import { ArticleCategory } from './article-category';

/**
 * 分类属性接口
 */
export interface CategoryAttributes {
  id: number;                      // 分类ID
  name: string;                    // 分类名称
  slug: string;                    // URL标识（URL友好的英文标识）
  createdAt?: number | null;       // 创建时间（毫秒级Unix时间戳）
  updatedAt?: number | null;       // 更新时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type CategoryCreationAttributes = Optional<
  CategoryAttributes,
  'id' | 'createdAt' | 'updatedAt'
>;

// 模型类
export class Category
  extends Model<CategoryAttributes, CategoryCreationAttributes>
  implements CategoryAttributes
{
  declare id: number;
  declare name: string;
  declare slug: string;
  declare createdAt: number | null;
  declare updatedAt: number | null;

  // 关联
  declare static associations: {
    articleCategories: Association<Category, ArticleCategory>;
  };
}

// 初始化函数
export function initCategoryModel(sequelize: Sequelize): typeof Category {
  Category.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '分类ID',
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '分类名称',
      },
      slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'URL标识',
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
      tableName: 'categories',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: Category) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
        },
        beforeUpdate: (instance: Category) => {
          instance.updatedAt = Date.now();
        },
      },
      indexes: [
        {
          unique: true,
          fields: ['slug'],
        },
      ],
      comment: '文章分类表',
    }
  );

  return Category;
}
