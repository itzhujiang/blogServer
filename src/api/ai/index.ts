import express from 'express';

import aiUserRouter from './aiUser';
import aiChat from './aiChat';

const router = express.Router();
// AI用户路由 - /api/blog/ai-user/*
router.use('/ai-user', aiUserRouter);

// ai对话相关 - /api/ai/aiChat/*
router.use('/aiChat', aiChat);

export default router;
