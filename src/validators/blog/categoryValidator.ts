import { body, query } from 'express-validator';

/**
 * 获取分类列表验证规则
 */
export const getCategorieListValidation = [
  // 分页参数
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
  // 标题（模糊查询）
  query('name').optional().isString().withMessage('标题必须是字符串').trim(),
];

/**
 * 添加分类验证规则
 */
export const addCategoryValidation = [
  body('name')
    .notEmpty()
    .withMessage('分类名称不能为空')
    .isString()
    .withMessage('分类名称必须是字符串')
    .trim(),
  body('slug')
    .notEmpty()
    .withMessage('分类URL标识不能为空')
    .isString()
    .withMessage('分类URL标识必须是字符串')
    .trim(),
];

/**
 * 修改分类验证规则
 */
export const updateCategoryValidation = [
  body('id')
    .notEmpty()
    .withMessage('分类ID不能为空')
    .isInt({ min: 1 })
    .withMessage('分类ID必须是大于0的整数')
    .toInt(),
  ...addCategoryValidation
]
/**
 * 删除分类验证规则
 */
export const delCategoryValidation = [
  query('id')
    .notEmpty()
    .withMessage('分类ID不能为空')
    .isInt({ min: 1 })
    .withMessage('分类ID必须是大于0的整数')
    .toInt(),
];