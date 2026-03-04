import { createClient, SocketTimeoutError } from 'redis';
import { redisLogger } from './logger';

const redisClient = createClient({
  url: 'redis://127.0.0.1:6379',
  password: process.env.redisPwd,
  socket: {
    reconnectStrategy: (retries, cause) => {
     // 默认情况下，socket 超时不重连
     if (cause instanceof SocketTimeoutError) {
       return false;
     }
     // 生成 0-200ms 的随机抖动
     const jitter = Math.floor(Math.random() * 200);
     // 指数退避延迟，最大 2000ms
     const delay = Math.min(Math.pow(2, retries) * 50, 2000);
     return delay + jitter;
  }
  }
});

// 错误处理
redisClient.on('error', (err) => {
  redisLogger.error(`Redis 错误: ${err}`)
});

// 连接到 Redis
redisClient.connect().catch((err) => {
  redisLogger.error(`Redis 链接失败：${err}` )
});

export default redisClient;