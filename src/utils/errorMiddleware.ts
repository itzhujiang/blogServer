import { NextFunction, Request } from 'express';
import { ResponseType } from './type';
import { sendErr } from './getSendResult';
import { defaultLogger } from './logger';

// 扩展 Error 类型，包含状态码
interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// 错误分类处理
const handleError = (err: AppError, req: Request, res: ResponseType) => {
  // 记录错误日志
  defaultLogger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    statusCode: err.statusCode || 500,
  });
  res.status(500).send(sendErr('服务器发生错误', 500));
};

export default (err: AppError, _req: Request, res: ResponseType, next: NextFunction) => {
  if (err) {
    handleError(err, _req, res);
  } else {
    next();
  }
};
