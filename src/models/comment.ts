import { Model, DataTypes, Optional, Association, Sequelize } from 'sequelize';
import { Article } from './article';
import { CommentStatusLiteral } from './enums';

/**
 * 评论属性接口
 */
export interface CommentAttributes {
  id: number; // 评论ID
  articleId: number; // 关联文章ID
  parentId?: number | null; // 父评论ID（用于嵌套回复，null表示顶级评论）
  authorName: string; // 访客姓名
  authorEmail?: string | null; // 访客邮箱
  authorUrl?: string | null; // 访客网站
  authorIp?: string | null; // IP地址（用于防垃圾评论）
  content: string; // 评论内容
  status: CommentStatusLiteral; // 审核状态（pending=待审核, approved=已通过, spam=垃圾评论, trash=已删除）
  likeCount: number; // 点赞数
  createdAt?: number | null; // 评论时间（毫秒级Unix时间戳）
  updatedAt?: number | null; // 更新时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type CommentCreationAttributes = Optional<
  CommentAttributes,
  | 'id'
  | 'parentId'
  | 'authorEmail'
  | 'authorUrl'
  | 'authorIp'
  | 'status'
  | 'likeCount'
  | 'createdAt'
  | 'updatedAt'
>;

// 模型类
export class Comment
  extends Model<CommentAttributes, CommentCreationAttributes>
  implements CommentAttributes
{
  declare id: number;
  declare articleId: number;
  declare parentId: number | null;
  declare authorName: string;
  declare authorEmail: string | null;
  declare authorUrl: string | null;
  declare authorIp: string | null;
  declare content: string;
  declare status: CommentStatusLiteral;
  declare likeCount: number;
  declare createdAt: number | null;
  declare updatedAt: number | null;

  // 关联
  declare static associations: {
    article: Association<Comment, Article>;
    parent: Association<Comment, Comment>;
    replies: Association<Comment, Comment>;
  };
}

// 初始化函数
export function initCommentModel(sequelize: Sequelize): typeof Comment {
  Comment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '评论ID',
      },
      articleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '关联文章ID',
      },
      parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '父评论ID，支持嵌套回复',
      },
      authorName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '访客姓名',
      },
      authorEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '访客邮箱',
      },
      authorUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '访客网站',
      },
      authorIp: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP地址，用于防垃圾评论',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '评论内容',
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'spam', 'trash'),
        allowNull: false,
        defaultValue: 'pending',
        comment: '审核状态 (pending=待审核, approved=已通过, spam=垃圾评论, trash=已删除)',
      },
      likeCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '点赞数',
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
      tableName: 'comments',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: Comment) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
        },
        beforeUpdate: (instance: Comment) => {
          instance.updatedAt = Date.now();
        },
      },
      indexes: [
        {
          fields: ['article_id', 'status'],
        },
        {
          fields: ['parent_id'],
        },
        {
          fields: ['created_at'],
        },
        {
          fields: ['author_ip'],
        },
      ],
      comment: '文章评论表',
    }
  );

  return Comment;
}
