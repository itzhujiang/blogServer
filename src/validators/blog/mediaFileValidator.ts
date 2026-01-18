import { body } from 'express-validator';

/**
 * 单文件上传校验
 * 注意：文件大小限制在 multer 中间件配置
 */
export const uploadValidation = [];

export const bigFileChunkValidation = [
  body('fileHash').notEmpty().withMessage('请传入文件hash值'),
  body('chunkIndex')
    .notEmpty()
    .withMessage('请传入分片索引')
    .isInt({ min: 0 })
    .withMessage('分片索引必须是大于等于0的整数'),
  body('identifier').notEmpty().withMessage('请传入文件唯一标识符'),
];
