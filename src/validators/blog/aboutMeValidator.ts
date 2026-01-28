import { body } from 'express-validator';

/**
 * 更新关于我信息验证规则
 */
export const updateAboutMeValidation = [
  body('id').notEmpty().withMessage('请输入关于我ID'),
  body('jobTitle').notEmpty().withMessage('请输入职业标签'),
  body('contentCode').optional().isString().withMessage('内容文件Code格式错误'),
  body('avatarCode').optional().isString().withMessage('头像Code格式错误'),
  body('personalTags').isArray().withMessage('个人标签格式错误'),
  body('contactInfo').notEmpty().withMessage('请输入联系方式').isObject().withMessage('联系方式格式错误'),
  body('socialLinks').notEmpty().withMessage('请输入社交媒体链接').isObject().withMessage('社交媒体链接格式错误'),
  body('skills').notEmpty().withMessage('请输入技能专长').isArray().withMessage('技能专长格式错误'),
  body('isUpdateAvatar').notEmpty().withMessage('请确认是否更新头像').isBoolean().withMessage('是否更新头像格式错误'),
  body('isUpdateContent').notEmpty().withMessage('请确认是否更新内容').isBoolean().withMessage('是否更新内容格式错误'),
  body('timeline').notEmpty().withMessage('请输入成长足迹').isArray().withMessage('成长足迹格式错误'),
];
