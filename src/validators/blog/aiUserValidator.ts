import { body } from 'express-validator';


export const aiLoginValidation = [
  body('phone')
      .trim()
      .notEmpty()
      .withMessage('手机号不能为空')
      .isMobilePhone('zh-CN')
      .withMessage('手机号格式不正确'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('验证码不能为空')
    .isLength({ min: 4, max: 6 })
    .withMessage('验证码长度应为4-6位'),
];