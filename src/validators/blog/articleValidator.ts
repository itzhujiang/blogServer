import { query, body } from 'express-validator';

/**
 * 获取文章列表验证规则
 */
export const getArticleListValidation = [
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
  query('title').optional().isString().withMessage('标题必须是字符串').trim(),

  // 状态
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('状态必须是 draft/published/archived'),

  // 发布时间范围
  query('publishedAtStart')
    .optional()
    .isInt({ min: 0 })
    .withMessage('开始时间必须是有效的时间戳')
    .toInt(),
  query('publishedAtEnd')
    .optional()
    .isInt({ min: 0 })
    .withMessage('结束时间必须是有效的时间戳')
    .toInt(),

  // 分类ID
  query('categoryId').optional().isInt({ min: 1 }).withMessage('分类ID必须是正整数').toInt(),

  // 浏览量排序
  query('viewCountSort').optional().isIn(['asc', 'desc']).withMessage('排序方式必须是 asc 或 desc'),
];

export const addArticleValidation = [
  body('title').isEmpty().withMessage('请输入标题'),
  body('slug').isEmpty().withMessage('请输入URL友好标识'),
  body('excerpt').isEmpty().withMessage('请输入文章摘要'),
];
