import log4js from 'log4js';
import path from 'node:path';
import fs from 'node:fs';

type PathSeg = 'sql' | 'api' | 'default' | 'redis';

const getCommonAppenders = (pathSeg: PathSeg) => {
  return {
    type: 'dateFile',
    filename: path.resolve(__dirname, '../../', 'logs', pathSeg, 'logging.log'),
    maxLogSize: 1024 * 1024, // 配置文件的最大字节数
    keepFileExt: true, // 保证.log后缀名
    daysToKeep: 3,
    layout: {
      type: 'pattern',
      pattern: '%c [%d{yyyy-MM-dd hh:mm:ss}] [%p] : %m%n',
    },
  };
};

// 确保日志目录存在
const logDirs = ['sql', 'api', 'default', 'redis'].map(dir =>
  path.resolve(__dirname, '../../', 'logs', dir)
);
logDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

log4js.configure({
  appenders: {
    sql: getCommonAppenders('sql'),
    default: getCommonAppenders('default'),
    api: getCommonAppenders('api'),
    redis: getCommonAppenders('redis'),
  },
  categories: {
    sql: {
      appenders: ['sql'],
      level: 'all',
    },
    default: {
      appenders: ['default'],
      level: 'all',
    },
    api: {
      appenders: ['api'],
      level: 'all',
    },
    redis: {
      appenders: ['redis'],
      level: 'all',
    },
  },
});

process.on('exit', () => {
  log4js.shutdown();
});

export const sqlLogger = log4js.getLogger('sql');
export const defaultLogger = log4js.getLogger();
export const apiLogger = log4js.getLogger('api');
export const redisLogger = log4js.getLogger('redis');
