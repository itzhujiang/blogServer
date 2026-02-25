import { Optional } from 'sequelize';

/**
 * 基础模型接口
 * 所有模型继承此类以获得通用字段类型定义
 */
export interface BaseAttributes {
  createdAt: number; // 毫秒级 Unix 时间戳
  updatedAt: number; // 毫秒级 Unix 时间戳
}

/**
 * 基础模型创建接口
 * 用于模型创建时的可选字段
 */
export interface BaseCreationAttributes extends Optional<BaseAttributes, 'updatedAt'> {}
