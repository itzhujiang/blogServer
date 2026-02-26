import { body } from 'express-validator';

/**
 * 用户登录验证规则
 */
export const sendPhoneCodeValidation = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('手机号不能为空')
    .isMobilePhone('zh-CN')
    .withMessage('手机号格式不正确'),
];

