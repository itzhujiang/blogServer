import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initAllModels } from './models';
import apiLog from './utils/apiLoggerMid';
import tokenMiddleware from './utils/tokenMiddleware';
import errorMiddleware from './utils/errorMiddleware';
import userRouter from './api/user';
import blogRouter from './api/blog'



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
  // 安全中间件
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 100次请求
    message: { code: 500, msg: '请求过于频繁，请稍后再试', data: null }
  }));

  // 映射pinlic目录中的静态资源
  const staticRoot = path.resolve(__dirname, '../public/client');
  app.use('/', express.static(staticRoot, {
    index: "index.html"
  }))

  // 日志
  app.use(apiLog);

  // 解析请求体
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(tokenMiddleware)

  // 用户接口
  app.use('/api/user', userRouter)

  // 博客接口（包含前后台）
  app.use('/api/blog', blogRouter)


  // 处理错误
  app.use(errorMiddleware)

  app.listen(prot, () => {
    console.log(`服务已启动，端口：${prot}`);
  });

})


