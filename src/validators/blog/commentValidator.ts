import { query, body } from 'express-validator';

// 获取评论验证规则
export const getCommentValidation = [
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

  // ID 参数 - 添加验证，过滤空字符串
  query('id')
    .optional({ values: 'falsy' }) // 空字符串会被视为未提供
    .isInt({ min: 1 })
    .withMessage('评论ID必须是大于0的整数')
    .toInt(),

  query('parentId')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('父评论ID必须是大于等于0的整数')
    .toInt(),

  // 状态验证 - 使用 isIn() 限制为指定值
  query('status')
    .optional({ values: 'falsy' })
    .isIn(['pending', 'approved', 'spam', 'trash'])
    .withMessage('状态必须是 pending, approved, spam 或 trash'),

  query('authorName')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('评论者名称必须是字符串'),

  query('articleId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('文章ID必须是大于0的整数')
    .toInt(),

  // 排序参数 - 使用 isIn() 限制为指定值
  query('likeCountSort')
    .optional({ values: 'falsy' })
    .isIn(['asc', 'desc'])
    .withMessage('点赞数排序必须是 asc 或 desc'),

  // 时间戳参数
  query('createDateTimeStart')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('开始时间必须是有效的时间戳')
    .toInt(),

  query('createDateTimeEnd')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('结束时间必须是有效的时间戳')
    .toInt(),
];

export const reviewCommentValidation = [
  body('id')
    .notEmpty()
    .withMessage('评论ID不能为空')
    .isInt({ min: 1 })
    .withMessage('评论ID必须是大于0的整数')
    .toInt(),
  body('status')
    .notEmpty()
    .withMessage('状态不能为空')
    .isIn(['approved', 'spam'])
    .withMessage('状态必须是 approved 或 spam'),
];

export const delCommentValidation = [
  query('id')
    .notEmpty()
    .withMessage('评论ID不能为空')
    .isInt({ min: 1 })
    .withMessage('评论ID必须是大于0的整数')
    .toInt(),
];

export const publishAuthorCommentValidation = [
  body('content')
    .notEmpty()
    .withMessage('评论内容不能为空')
    .isString()
    .withMessage('评论内容必须是字符串'),
  body('articleId')
    .notEmpty()
    .withMessage('文章ID不能为空')
    .isInt({ min: 1 })
    .withMessage('文章ID必须是大于0的整数')
    .toInt(),
];

export const replyCommentValidation = [
  body('id')
    .notEmpty()
    .withMessage('评论ID不能为空')
    .isInt({ min: 1 })
    .withMessage('评论ID必须是大于0的整数')
    .toInt(),
  body('content')
    .notEmpty()
    .withMessage('回复内容不能为空')
    .isString()
    .withMessage('回复内容必须是字符串'),
];
