import { ResponseType } from './type';

/**
 * 设置sse响应头
 * @param res
 */
export const setupSSE = (res: ResponseType) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
};
