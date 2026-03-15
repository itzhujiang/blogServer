// ai对话

import express from 'express';
import {
  chat,
  getSessionList,
  MessagesRequsetType,
  sendMessage,
  SendMessageRequsetType,
  SendMessageResponseType,
  SessionListResponseType,
  MessagesResponseType,
  getMessages,
  SessionListRequsetType,
} from '../../services/ai/aiChat';
import {
  handleValidationErrors,
  messagesValidation,
  sendMessageValidation,
  sessionListValidation,
} from '../../validators';
import { asyncHandler } from '../../utils/getSendResult';

const router = express.Router();

router.get(
  '/chat',
  asyncHandler<null, null, 'get'>(async (req, res) => {
    await chat(req, res);
  })
);

router.post(
  '/sendMessage',
  [...sendMessageValidation, handleValidationErrors],
  asyncHandler<SendMessageRequsetType, SendMessageResponseType, 'post'>(async req => {
    return await sendMessage({
      ...req.body,
      aiUser: req.aiUser,
    });
  })
);
// 获取会话列表
router.get(
  '/getSessionList',
  [...sessionListValidation, handleValidationErrors],
  asyncHandler<SessionListRequsetType, SessionListResponseType>(async req => {
    return await getSessionList({
      ...req.query,
      aiUser: req.aiUser,
    });
  })
);

router.get(
  '/getMessages',
  [...messagesValidation, handleValidationErrors],
  asyncHandler<MessagesRequsetType, MessagesResponseType, 'get'>(async req => {
    return await getMessages(req.query);
  })
);



export default router;
