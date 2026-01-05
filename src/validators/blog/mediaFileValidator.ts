import { body } from 'express-validator';


/**
 * 单文件上传
 */
export const loginValidation = [
  body('file')
    .notEmpty().withMessage('请传入file文件')

];