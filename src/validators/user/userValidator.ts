import { body } from 'express-validator';



/**
 * 用户登录验证规则
 */
export const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('账号不能为空')
    .isLength({ min: 3, max: 50 }).withMessage('账号长度必须在3-50个字符之间'),
  body('password')
    .notEmpty().withMessage('密码不能为空')
    .isLength({ min: 6 }).withMessage('密码长度至少6个字符'),
];