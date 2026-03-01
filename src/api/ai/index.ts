
import express from 'express';

import aiUserRouter from './aiUser';

const router = express.Router();
// AI用户路由 - /api/blog/ai-user/*
router.use('/ai-user', aiUserRouter);

export default router;