import { body, query } from 'express-validator';

export const agUiChatValidation = [
  body('threadId').optional().isString().withMessage('threadId 必须是字符串'),
  body('runId').optional().isString().withMessage('runId 必须是字符串'),
  body('parentRunId').optional().isString().withMessage('parentRunId 必须是字符串'),
  body('state').exists().withMessage('state 为必填'),
  body('messages').isArray({ min: 1 }).withMessage('messages 必须是非空数组'),
  body('messages.*.id')
    .notEmpty()
    .withMessage('messages[].id 为必填')
    .isString()
    .withMessage('messages[].id 必须是字符串'),
  body('messages.*.role')
    .notEmpty()
    .withMessage('messages[].role 为必填')
    .isIn(['developer', 'system', 'assistant', 'user', 'tool', 'activity', 'reasoning'])
    .withMessage(
      'messages[].role 必须是 developer/system/assistant/user/tool/activity/reasoning 之一'
    ),
  body('messages.*').custom(message => {
    if (!message || typeof message !== 'object') {
      throw new Error('messages[] 必须是对象');
    }

    const { role } = message;

    if (!role || typeof role !== 'string') {
      throw new Error('messages[].role 为必填');
    }

    if (role === 'developer' || role === 'system') {
      if (typeof message.content !== 'string' || !message.content.trim()) {
        throw new Error(`${role} 消息的 content 必须是非空字符串`);
      }
    }

    if (role === 'assistant') {
      const hasStringContent = message.content === undefined || typeof message.content === 'string';

      const hasValidToolCalls =
        message.toolCalls === undefined ||
        (Array.isArray(message.toolCalls) &&
          message.toolCalls.every((toolCall: any) => {
            return (
              toolCall &&
              typeof toolCall === 'object' &&
              typeof toolCall.id === 'string' &&
              toolCall.type === 'function' &&
              toolCall.function &&
              typeof toolCall.function.name === 'string' &&
              typeof toolCall.function.arguments === 'string'
            );
          }));

      if (!hasStringContent) {
        throw new Error('assistant 消息的 content 必须是字符串或不传');
      }

      if (!hasValidToolCalls) {
        throw new Error('assistant 消息的 toolCalls 格式不正确');
      }
    }

    if (role === 'user') {
      const content = message.content;

      const isStringContent = typeof content === 'string' && content.trim().length > 0;

      const isArrayContent =
        Array.isArray(content) &&
        content.length > 0 &&
        content.every((item: any) => {
          if (!item || typeof item !== 'object' || typeof item.type !== 'string') {
            return false;
          }

          if (item.type === 'text') {
            return typeof item.text === 'string' && item.text.trim().length > 0;
          }

          if (item.type === 'binary') {
            return typeof item.mimeType === 'string';
          }

          return false;
        });

      if (!isStringContent && !isArrayContent) {
        throw new Error('user 消息的 content 必须是非空字符串，或 text/binary 内容数组');
      }
    }

    if (role === 'tool') {
      if (typeof message.toolCallId !== 'string' || !message.toolCallId.trim()) {
        throw new Error('tool 消息必须包含 toolCallId');
      }

      if (typeof message.content !== 'string') {
        throw new Error('tool 消息的 content 必须是字符串');
      }

      if (message.error !== undefined && typeof message.error !== 'string') {
        throw new Error('tool 消息的 error 必须是字符串');
      }
    }

    if (role === 'activity') {
      if (typeof message.activityType !== 'string' || !message.activityType.trim()) {
        throw new Error('activity 消息必须包含 activityType');
      }

      if (
        !message.content ||
        typeof message.content !== 'object' ||
        Array.isArray(message.content)
      ) {
        throw new Error('activity 消息的 content 必须是对象');
      }
    }

    if (role === 'reasoning') {
      if (message.content !== undefined && typeof message.content !== 'string') {
        throw new Error('reasoning 消息的 content 必须是字符串或不传');
      }
    }

    return true;
  }),
];

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