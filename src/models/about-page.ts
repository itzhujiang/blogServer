import {
  Model,
  DataTypes,
  Optional,
  Sequelize,
} from 'sequelize';

/**
 * 关于我页面属性接口
 */
export interface AboutPageAttributes {
  id: number;                              // 页面ID
  title: string;                           // 页面标题
  content: string;                         // 页面内容（Markdown格式）
  avatarUrl?: string | null;               // 头像URL
  contactInfo?: Record<string, unknown> | null;   // 联系方式，JSON格式（如：{email, location}）
  socialLinks?: Record<string, unknown> | null;   // 社交媒体链接，JSON格式（如：{github, twitter}）
  skills?: string[] | null;                // 技能标签，字符串数组（如：["Web开发", "AI艺术"]）
  updatedAt?: number | null;               // 更新时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type AboutPageCreationAttributes = Optional<
  AboutPageAttributes,
  'id' | 'avatarUrl' | 'contactInfo' | 'socialLinks' | 'skills' | 'updatedAt'
>;

// 模型类
export class AboutPage
  extends Model<AboutPageAttributes, AboutPageCreationAttributes>
  implements AboutPageAttributes
{
  declare id: number;
  declare title: string;
  declare content: string;
  declare avatarUrl: string | null;
  declare contactInfo: Record<string, unknown> | null;
  declare socialLinks: Record<string, unknown> | null;
  declare skills: string[] | null;
  declare updatedAt: number | null;
}

// 初始化函数
export function initAboutPageModel(sequelize: Sequelize): typeof AboutPage {
  AboutPage.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '页面ID',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: '关于我',
        comment: '页面标题',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '页面内容',
      },
      avatarUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '头像URL',
      },
      contactInfo: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: '联系方式，JSON格式',
      },
      socialLinks: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: '社交媒体链接，JSON格式',
      },
      skills: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: '技能标签，JSON格式',
      },
      updatedAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '更新时间（毫秒级Unix时间戳）',
      },
    },
    {
      sequelize,
      tableName: 'about_page',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: AboutPage) => {
          instance.updatedAt = Date.now();
        },
        beforeUpdate: (instance: AboutPage) => {
          instance.updatedAt = Date.now();
        },
      },
      comment: '关于我页面表',
    }
  );

  return AboutPage;
}
