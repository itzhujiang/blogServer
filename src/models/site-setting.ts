import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import { SettingTypeLiteral } from './enums';

/**
 * 网站配置属性接口
 */
export interface SiteSettingAttributes {
  id: number; // 配置ID
  settingKey: string; // 配置键名（唯一标识，如：site_title）
  settingValue: string | null; // 配置值
  settingType: SettingTypeLiteral; // 值类型（string=字符串, number=数字, boolean=布尔, json=JSON）
  description: string | null; // 配置说明
  updatedAt: number; // 更新时间（毫秒级Unix时间戳）
  createdAt: number; // 创建时间（毫秒级Unix时间戳）
}

/** 创建时可选字段 */
export type SiteSettingCreationAttributes = Optional<
  SiteSettingAttributes,
  'id' | 'settingValue' | 'description' | 'updatedAt' | 'createdAt'
>;

// 模型类
export class SiteSetting
  extends Model<SiteSettingAttributes, SiteSettingCreationAttributes>
  implements SiteSettingAttributes
{
  declare id: number;
  declare settingKey: string;
  declare settingValue: string | null;
  declare settingType: SettingTypeLiteral;
  declare description: string | null;
  declare updatedAt: number;
  declare createdAt: number;
}

// 初始化函数
export function initSiteSettingModel(sequelize: Sequelize): typeof SiteSetting {
  SiteSetting.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '配置ID',
      },
      settingKey: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: '配置键名',
      },
      settingValue: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '配置值',
      },
      settingType: {
        type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
        allowNull: false,
        defaultValue: 'string',
        comment: '值类型 (string=字符串, number=数字, boolean=布尔, json=JSON)',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '配置说明',
      },
      updatedAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '更新时间（毫秒级Unix时间戳）',
      },
      createdAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '创建时间（毫秒级Unix时间戳）',
      },
    },
    {
      sequelize,
      tableName: 'site_settings',
      underscored: true,
      timestamps: false,
      hooks: {
        beforeCreate: (instance: SiteSetting) => {
          const now = Date.now();
          instance.createdAt = now;
          instance.updatedAt = now;
        },
        beforeUpdate: (instance: SiteSetting) => {
          instance.updatedAt = Date.now();
        },
      },
      indexes: [
        {
          unique: true,
          fields: ['setting_key'],
        },
      ],
      comment: '网站配置表',
    }
  );

  return SiteSetting;
}
