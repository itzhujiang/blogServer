import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { sendErr } from '../utils/getSendResult';

export { loginValidation } from './user/userValidator';
export {
  getArticleListValidation,
  addArticleValidation,
  updateArticleValidation,
  delArticleValidation,
} from './blog/articleValidator';
export {
  getCategorieListValidation,
  addCategoryValidation,
  updateCategoryValidation,
  delCategoryValidation,
} from './blog/categoryValidator';
export { uploadValidation } from './blog/mediaFileValidator';
export { updateAboutMeValidation } from './blog/aboutMeValidator';
export {
  updateSiteSettingsValidation,
  getSiteSettingsValidation,
  addSiteSettingsValidation,
} from './blog/settingsValidator';
export {
  getCommentValidation,
  reviewCommentValidation,
  delCommentValidation,
} from './blog/commentValidator';

// 验证错误处理中间件
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    res.status(200).send(sendErr(firstError.msg, 500));
    return;
  }
  next();
};
