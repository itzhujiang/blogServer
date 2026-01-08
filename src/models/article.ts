import { Model, DataTypes, Optional, Association, Sequelize } from 'sequelize';
import { ArticleCategory } from './article-category';
import { ArticleMedia } from './article-media';
import { Comment } from './comment';
import { ArticleStatusLiteral } from './enums';

/**
 * 文章属性接口
 */
export interface ArticleAttributes {
  id: number; // 文章ID
  title: string; // 文章标题
  slug: string; // URL友好标识（用于SEO）
  filePath: string; // 服务端文件路径（Markdown文件路径）
  excerpt?: string | null; // 文章摘要
  thumbnailUrl?: string | null; // 缩略图URL（文章列表展示用）
  authorName: string; // 作者名（默认：木心）
  readingTime: number; // 预计阅读时间（分钟）
  viewCount: number; // 浏览次数
  status: ArticleStatusLiteral; // 发布状态（draft=草稿, published=已发布, archived=已归档）
  publishedAt?: number | null; // 发布时间（毫秒级Unix时间戳）
  createdAt?: number | null; // 创建时间（毫秒级Unix时间戳）
  updatedAt?: number | null; // 更新时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type ArticleCreationAttributes = Optional<
  ArticleAttributes,
  | 'id'
  | 'excerpt'
  | 'thumbnailUrl'
  | 'readingTime'
  | 'viewCount'
  | 'status'
  | 'publishedAt'
  | 'createdAt'
  | 'updatedAt'
>;

// 模型类
export class Article
  extends Model<ArticleAttributes, ArticleCreationAttributes>
  implements ArticleAttributes
{
  declare id: number;
  declare title: string;
  declare slug: string;
  declare filePath: string;
  declare excerpt: string | null;
  declare thumbnailUrl: string | null;
  declare authorName: string;
  declare readingTime: number;
  declare viewCount: number;
  declare status: ArticleStatusLiteral;
  declare publishedAt: number | null;
  declare createdAt: number | null;
  declare updatedAt: number | null;

  // 关联
  declare static associations: {
    categories: Association<Article, ArticleCategory>;
    media: Association<Article, ArticleMedia>;
    comments: Association<Article, Comment>;
  };
}

// 初始化函数
export function initArticleModel(sequelize: Sequelize): typeof Article {
  Article.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '文章ID',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '文章标题',
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'URL友好标识',
      },
      filePath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: '服务端文件路径',
      },
      excerpt: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '文章摘要',
      },
      thumbnailUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '列表缩略图URL',
      },
      authorName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: '木心',
        comment: '作者名',
      },
      readingTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '预计阅读时间(分钟)',
      },
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '浏览次数',
      },
      status: {
        type: DataTypes.ENUM('draft', 'published', 'archived'),
        allowNull: false,
        defaultValue: 'published',
        comment: '发布状态 (draft=草稿, published=已发布, archived=已归档)',
      },
      publishedAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '发布时间（毫秒级Unix时间戳）',
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
      tableName: 'articles',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: Article) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
          // 如果状态为 published 且未设置 publishedAt，自动设置
          if (instance.status === 'published' && !instance.publishedAt) {
            instance.publishedAt = now;
          }
        },
        beforeUpdate: (instance: Article) => {
          instance.updatedAt = Date.now();
        },
      },
      indexes: [
        {
          name: 'idx_articles_status_published',
          fields: ['status', 'published_at'],
        },
        {
          unique: true,
          fields: ['slug'],
        },
        {
          fields: ['author_name'],
        },
        {
          fields: ['created_at'],
        },
      ],
      comment: '文章主表',
    }
  );

  return Article;
}
