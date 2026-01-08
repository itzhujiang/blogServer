import { Model, DataTypes, Optional, Association, Sequelize } from 'sequelize';
import { ArtworkMedia } from './artwork-media';
import { ArtworkStatusLiteral } from './enums';

/**
 * AI作品属性接口
 */
export interface AIArtworkAttributes {
  id: number; // 作品ID
  title: string; // 作品标题
  slug: string; // URL标识（用于SEO）
  description?: string | null; // 作品描述
  category?: string | null; // 作品分类（如：风景、人物、抽象等）
  creationPrompt?: string | null; // AI生成提示词
  aiModel?: string | null; // 使用的AI模型（如：Midjourney, DALL-E）
  viewCount: number; // 浏览次数
  likeCount: number; // 点赞数
  isFeatured: boolean; // 是否推荐（推荐作品显示在首页）
  sortOrder: number; // 排序权重（数字越小越靠前）
  status: ArtworkStatusLiteral; // 发布状态（draft=草稿, published=已发布）
  createdAt?: number | null; // 创建时间（毫秒级Unix时间戳）
  updatedAt?: number | null; // 更新时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type AIArtworkCreationAttributes = Optional<
  AIArtworkAttributes,
  | 'id'
  | 'description'
  | 'category'
  | 'creationPrompt'
  | 'aiModel'
  | 'viewCount'
  | 'likeCount'
  | 'isFeatured'
  | 'sortOrder'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
>;

// 模型类
export class AIArtwork
  extends Model<AIArtworkAttributes, AIArtworkCreationAttributes>
  implements AIArtworkAttributes
{
  declare id: number;
  declare title: string;
  declare slug: string;
  declare description: string | null;
  declare category: string | null;
  declare creationPrompt: string | null;
  declare aiModel: string | null;
  declare viewCount: number;
  declare likeCount: number;
  declare isFeatured: boolean;
  declare sortOrder: number;
  declare status: ArtworkStatusLiteral;
  declare createdAt: number | null;
  declare updatedAt: number | null;

  // 关联
  declare static associations: {
    media: Association<AIArtwork, ArtworkMedia>;
  };
}

// 初始化函数
export function initAIArtworkModel(sequelize: Sequelize): typeof AIArtwork {
  AIArtwork.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '作品ID',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '作品标题',
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'URL标识',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '作品描述',
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '作品分类',
      },
      creationPrompt: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'AI生成提示词',
      },
      aiModel: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '使用的AI模型',
      },
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '浏览次数',
      },
      likeCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '点赞数',
      },
      isFeatured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否推荐',
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '排序权重',
      },
      status: {
        type: DataTypes.ENUM('draft', 'published'),
        allowNull: false,
        defaultValue: 'published',
        comment: '发布状态 (draft=草稿, published=已发布)',
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
      tableName: 'ai_artworks',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: AIArtwork) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
        },
        beforeUpdate: (instance: AIArtwork) => {
          instance.updatedAt = Date.now();
        },
      },
      indexes: [
        {
          fields: ['status', 'is_featured', 'sort_order'],
        },
        {
          fields: ['category'],
        },
        {
          fields: ['created_at'],
        },
        {
          unique: true,
          fields: ['slug'],
        },
      ],
      comment: 'AI作品展示表',
    }
  );

  return AIArtwork;
}
