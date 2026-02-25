/**
 * tool 相关的路由模块
 * 统一管理 tool 相关的所有子路由
 */
import express from 'express';
import codeRouter from './code';

const router = express.Router();

// 验证码相关路由 - /api/tool/phone/*
router.use('/code', codeRouter);

export default router;