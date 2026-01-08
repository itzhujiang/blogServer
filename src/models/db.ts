import cls from 'cls-hooked';
import { Sequelize, type Dialect } from 'sequelize';
import { sqlLogger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const namespace = cls.createNamespace('my-blog-ai');
Sequelize.useCLS(namespace);
export const sequelize = new Sequelize(
  process.env.sqlName!,
  process.env.sqlUserName!,
  process.env.sqlPwd!,
  {
    host: process.env.sqlHost!,
    dialect: process.env.sqlType! as Dialect,
    logging: msg => {
      sqlLogger.debug(msg);
    },
  }
);
