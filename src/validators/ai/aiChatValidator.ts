import { body, query } from 'express-validator';

export const sendMessageValidation = [
  body('message').notEmpty().withMessage('请输入消息').isString().withMessage('消息必须是字符串'),
  body('localId').notEmpty().withMessage('localId为必填').isString().withMessage('消息必须是字符串'),
  body('sessionId'),
]

export const messagesValidation = [
  query('id').optional(),
  query('sort').optional().isIn(['ASC','DESC']).withMessage('排序方法为: ASC/DESC')
]

export const sessionListValidation = [
  query('sort').optional().isIn(['ASC','DESC']).withMessage('排序方法为: ASC/DESC')
]