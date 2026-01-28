import { Model, DataTypes, Optional, Association, Sequelize } from 'sequelize';
import { AboutPageMedia } from './about-page-media';

/**
 * 技能项接口
 */
export interface AboutSkillItem {
  name: string;   // 技能名称（如：React）
  level: number;  // 熟练度 0-100
}

/**
 * 技能分类接口
 */
export interface AboutSkill {
  category: string;           // 技能分类名称（如：前端开发）
  items: AboutSkillItem[];    // 该分类下的技能列表
}

/**
 * 成长足迹项接口
 */
export interface AboutTimelineItem {
  timestamp: number;   // 时间戳（毫秒级Unix时间戳）
  title: string;       // 标题（如：开启博客之旅）
  description: string; // 描述
}

/**
 * 关于我页面属性接口
 */
export interface AboutPageAttributes {
  id: number; // 页面ID
  title: string; // 页面标题
  nickname?: string | null; // 博主昵称（如：木心）
  jobTitle?: string | null; // 职业标签（如：前端开发者 & UI设计师）
  personalTags?: string[] | null; // 个人标签数组（如：["热爱学习的技术人", "AI创作探索者"]）
  contactInfo?: Record<string, unknown> | null; // 联系方式，JSON格式（如：{email, github, wechat}）
  socialLinks?: Record<string, unknown> | null; // 社交媒体链接，JSON格式（如：{twitter, dribbble, instagram}）
  skills?: AboutSkill[] | null; // 技能专长，结构化JSON格式
  timeline?: AboutTimelineItem[] | null; // 成长足迹，时间线数据
  updatedAt?: number | null; // 更新时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type AboutPageCreationAttributes = Optional<
  AboutPageAttributes,
  | 'id'
  | 'nickname'
  | 'jobTitle'
  | 'personalTags'
  | 'contactInfo'
  | 'socialLinks'
  | 'skills'
  | 'timeline'
  | 'updatedAt'
>;

// 模型类
export class AboutPage
  extends Model<AboutPageAttributes, AboutPageCreationAttributes>
  implements AboutPageAttributes
{
  declare id: number;
  declare title: string;
  declare nickname: string | null;
  declare jobTitle: string | null;
  declare personalTags: string[] | null;
  declare contactInfo: Record<string, unknown> | null;
  declare socialLinks: Record<string, unknown> | null;
  declare skills: AboutSkill[] | null;
  declare timeline: AboutTimelineItem[] | null;
  declare updatedAt: number | null;

  // 关联
  declare static associations: {
    aboutPageMedias: Association<AboutPage, AboutPageMedia>;
  };
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
      nickname: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '博主昵称',
      },
      jobTitle: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '职业标签',
      },
      personalTags: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: '个人标签数组',
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
        comment: '技能专长，结构化JSON格式 [{category, items: [{name, level}]}]',
      },
      timeline: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: '成长足迹，时间线JSON格式 [{timestamp, title, description}]',
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
