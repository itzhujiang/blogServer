import { body } from 'express-validator';

/**
 * 单文件上传校验
 * 注意：文件大小限制在 multer 中间件配置
 */
export const uploadValidation = [
  body('file')
    .notEmpty()
    .withMessage('请传入file文件'),
];

/**
 * 最大文件大小 5MB
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
