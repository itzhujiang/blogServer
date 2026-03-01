import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { initAllModels } from './models';
import { cleanupExpiredTempFiles } from './services/blog/mediaFile';
import apiLog from './utils/apiLoggerMid';
import authMiddleware from './utils/authMiddleware';
import errorMiddleware from './utils/errorMiddleware';
import userRouter from './api/user';
import blogRouter from './api/blog';
import toolsRouter from './api/tools';
import aiRouter from './api/ai';

dotenv.config();

const app = express();
const prot = process.env.prot || 3000;

// 初始化所有模型并启动服务器
async function startServer() {
  try {
    await initAllModels();
    console.log('数据库模型初始化完成');
  } catch (err) {
    console.error('数据库模型初始化失败:', err);
    process.exit(1);
  }
}

startServer().then(() => {
  // 设置定时任务：每天凌晨 3:00 清理过期临时文件
  cron.schedule('0 3 * * *', async () => {
    console.log('[定时任务] 开始清理过期临时文件...');
    try {
      const result = await cleanupExpiredTempFiles();
      console.log(`[定时任务] 清理完成，删除了 ${result.deleted} 个过期临时文件`);
    } catch (error) {
      console.error('[定时任务] 清理过期临时文件失败:', error);
    }
  });

  // 信任代理设置（用于正确获取客户端真实 IP）
  app.set('trust proxy', true);

  // 安全中间件
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 限制每个IP 100次请求
      message: { code: 500, msg: '请求过于频繁，请稍后再试', data: null },
    })
  );

  // 映射pinlic目录中的静态资源
  const staticRoot = path.resolve(__dirname, '../public/client');
  app.use(
    '/',
    express.static(staticRoot, {
      index: 'index.html',
    })
  );

  // 映射 uploads 目录（临时文件和永久文件）
  const uploadsDir = path.resolve(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsDir));

  // 日志
  app.use(apiLog);

  // 解析请求体
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 解析 Cookie
  app.use(cookieParser());

  // 统一权限校验（管理员 token 或 AI token）
  app.use(authMiddleware);

  // 用户接口
  app.use('/api/user', userRouter);

  // 博客接口（包含前后台）
  app.use('/api/blog', blogRouter);

  // AI接口
  app.use('/api/ai', aiRouter);

  // 工具接口
  app.use('/api/tool', toolsRouter);

  // 处理错误
  app.use(errorMiddleware);

  app.listen(prot, () => {
    console.log(`服务已启动，端口：${prot}`);
  });
  // prettier-ignore
});
