import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { sendErr } from '../utils/getSendResult';

export { loginValidation } from './user/userValidator';
export { getArticleListValidation } from './blog/articleValidator';
export { uploadValidation } from './blog/mediaFileValidator';

// 验证错误处理中间件
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    res.status(500).send(sendErr(firstError.msg, 500));
    return;
  }
  next();
};
