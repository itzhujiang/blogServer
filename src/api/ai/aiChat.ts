// ai对话

import express from 'express';
import {
  chat,
  getSessionList,
  MessagesRequsetType,
  SessionListResponseType,
  MessagesResponseType,
  getMessages,
  SessionListRequsetType,
  ChatRequestType,
  ToolResultResponseType,
  toolResult,
} from '../../services/ai/aiChat';
import {
  agUiChatValidation,
  handleValidationErrors,
  messagesValidation,
  sessionListValidation,
  toolResultValidation,
} from '../../validators';
import { asyncHandler } from '../../utils/getSendResult';

const router = express.Router();

router.post(
  '/chat',
  [...agUiChatValidation, handleValidationErrors],
  asyncHandler<ChatRequestType, null, 'post'>(async (req, res) => {
    await chat(req, res);
  })
);

router.post(
  '/toolResult',
  [...toolResultValidation, handleValidationErrors],
  asyncHandler<ToolResultResponseType, null, 'post'>(async req => {
    return await toolResult(req);
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
