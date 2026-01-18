import { query } from 'express-validator';

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
  query('id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('评论ID必须是大于0的整数')
    .toInt(),
  query('parentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('父评论ID必须是大于等于0的整数')
    .toInt(),
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'spam', 'trash'])
    .withMessage('状态必须是 pending, approved, spam 或 trash'),
 query('authorName')
    .optional()
    .isString()
    .withMessage('评论者名称必须是字符串'),
 query('articleId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('文章ID必须是大于0的整数')
    .toInt(),
  query('likeCountSort')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('点赞数排序必须是 asc 或 desc'),
    query('createDateTimeStart')
    .optional()
    .isInt({ min: 1 })
    .withMessage('创建时间开始必须是有效的日期时间格式')
    .isInt(),
    query('createDateTimeEnd')
    .optional()
    .isInt({ min: 1 })
    .withMessage('创建时间结束必须是有效的日期时间格式')
    .isInt(),
]

export const reviewCommentValidation = [
    query('id')
    .notEmpty()
    .withMessage('评论ID不能为空')
    .isInt({ min: 1 })
    .withMessage('评论ID必须是大于0的整数')
    .toInt(),
    query('status')
    .notEmpty()
    .withMessage('状态不能为空')
    .isIn(['pending', 'approved', 'spam', 'trash'])
    .withMessage('状态必须是 pending, approved, spam 或 trash'),
]