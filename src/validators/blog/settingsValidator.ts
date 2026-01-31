import { body, query } from 'express-validator';

/**
 * 获取站点设置验证规则
 */
export const getSiteSettingsValidation = [
    query('page')
    .optional() // 字段可选，如果没有传就不验证
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数')
    .toInt(),
    query('size')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间')
    .toInt(),
]

export const addSiteSettingsValidation = [
  body('settingKey').notEmpty().withMessage('请输入设置键'),
  body('settingValue').notEmpty().withMessage('请输入设置值'),
  body('description').notEmpty().withMessage('请输入设置描述').isIn(['string', 'number', 'json', 'boolean']),
  body('settingType').notEmpty().withMessage('请输入设置类型'),
];

/**
 * 更新站点设置验证规则
 */
export const updateSiteSettingsValidation = [
  body('id').notEmpty().withMessage('请输入站点设置ID'),
  body('description').notEmpty().withMessage('请输入设置描述'),
  body('settingKey').notEmpty().withMessage('请输入设置键'),
  body('settingType').notEmpty().withMessage('请输入设置类型'),
  body('settingValue').notEmpty().withMessage('请输入设置值'),
];