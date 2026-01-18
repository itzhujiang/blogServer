import { body } from 'express-validator';

/**
 * 更新站点设置验证规则
 */
export const updateSiteSettingsValidation = [
    body('id').notEmpty().withMessage('请输入站点设置ID'),
    body('description').notEmpty().withMessage('请输入设置描述'),
    body('settingKey').notEmpty().withMessage('请输入设置键'),
    body('settingType').notEmpty().withMessage('请输入设置类型'),
    body('settingValue').notEmpty().withMessage('请输入设置值'),
]