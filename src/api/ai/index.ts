/**
 * ai模块路由聚合器
 * 统一管理 ai 相关的所有子路由
 */
import express from 'express';
import aiChat from './aiChat';

const router = express.Router();

// ai对话相关 - /api/ai/aiChat/*
router.use('/aiChat', aiChat);

export default router;
