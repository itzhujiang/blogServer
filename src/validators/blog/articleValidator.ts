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
  query('title')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('标题必须是字符串')
    .trim(),

  // 状态 - 使用 isIn() 限制为指定值
  query('status')
    .optional({ values: 'falsy' })
    .isIn(['draft', 'published', 'archived'])
    .withMessage('状态必须是 draft/published/archived'),

  // 发布时间范围
  query('publishedAtStart')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('开始时间必须是有效的时间戳')
    .toInt(),
  query('publishedAtEnd')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('结束时间必须是有效的时间戳')
    .toInt(),

  // 分类ID
  query('categoryId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('分类ID必须是正整数')
    .toInt(),

  // 浏览量排序 - 使用 isIn() 限制为指定值
  query('viewCountSort')
    .optional({ values: 'falsy' })
    .isIn(['asc', 'desc'])
    .withMessage('排序方式必须是 asc 或 desc'),
];

/**
 * 添加文章验证规则
 */
export const addArticleValidation = [
  body('title').notEmpty().withMessage('请输入标题'),
  body('slug').notEmpty().withMessage('请输入URL友好标识'),
  body('thumbnailCode').optional().isString().withMessage('封面图片代码必须是字符串'),
  body('excerpt').notEmpty().withMessage('请输入文章摘要'),
  body('articleCode').notEmpty().withMessage('请上传文章内容'),
  body('attachmentList').optional().isArray().withMessage('文章附件必须是数组'),
  body('categories').optional().isArray().withMessage('文章分类必须是数组'),
];

/**
 * 修改文章验证规则
 */
export const updateArticleValidation = [
  body('id').notEmpty().isInt({ min: 1 }).withMessage('文章ID必须是正整数').toInt(),
  body('title').optional().notEmpty().withMessage('请输入标题'),
  body('slug').optional().notEmpty().withMessage('请输入URL友好标识'),
  body('thumbnailCode').optional().isString().withMessage('封面图片代码必须是字符串'),
  body('excerpt').optional().notEmpty().withMessage('请输入文章摘要'),
  body('articleCode').optional().notEmpty().withMessage('请上传文章内容'),
  body('attachmentList').optional().isArray().withMessage('文章附件必须是数组'),
  body('categories').optional().isArray().withMessage('文章分类必须是数组'),
  body('isUpdateArticle').optional().isBoolean().withMessage('是否更新文章必须是布尔值'),
  body('isUpdateThumbnail').optional().isBoolean().withMessage('是否更新缩略图必须是布尔值'),
];

export const delArticleValidation = [
  query('id').notEmpty().isInt({ min: 1 }).withMessage('文章ID必须是正整数').toInt(),
]