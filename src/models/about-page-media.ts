import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

/**
 * 关于我页面媒体关联属性接口
 */
export interface AboutPageMediaAttributes {
  id?: number; // 关联ID（可选，创建时自动生成）
  aboutPageId: number; // 关于我页面ID
  mediaId: number; // 媒体文件ID
  usageType: 'avatar' | 'content'; // 使用类型（avatar=头像, content=内容文件）
  createdAt?: number | null; // 创建时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type AboutPageMediaCreationAttributes = Optional<
  AboutPageMediaAttributes,
  'id' | 'usageType' | 'createdAt'
>;

// 模型类
export class AboutPageMedia
  extends Model<AboutPageMediaAttributes, AboutPageMediaCreationAttributes>
  implements AboutPageMediaAttributes
{
  declare id: number | undefined;
  declare aboutPageId: number;
  declare mediaId: number;
  declare usageType: 'avatar' | 'content';
  declare createdAt: number | null;
}

// 初始化函数
export function initAboutPageMediaModel(sequelize: Sequelize): typeof AboutPageMedia {
  AboutPageMedia.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '关联ID',
      },
      aboutPageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '关于我页面ID',
      },
      mediaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '媒体文件ID',
      },
      usageType: {
        type: DataTypes.ENUM('avatar', 'content'),
        allowNull: false,
        defaultValue: 'avatar',
        comment: '使用类型 (avatar=头像, content=内容文件)',
      },
      createdAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '创建时间（毫秒级Unix时间戳）',
      },
    },
    {
      sequelize,
      tableName: 'about_page_media',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: AboutPageMedia) => {
          instance.createdAt = Date.now();
          if (!instance.usageType) {
            instance.usageType = 'avatar';
          }
        },
      },
      indexes: [
        {
          fields: ['about_page_id'],
        },
        {
          fields: ['media_id'],
        },
        {
          fields: ['usage_type'],
        },
      ],
      comment: '关于我页面媒体关联表',
    }
  );

  return AboutPageMedia;
}
