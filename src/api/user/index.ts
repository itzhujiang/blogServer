/**
 * User 模块路由聚合器
 * 统一管理用户相关的所有子路由
 */
import express from 'express';
import adminRouter from './admin';
// 未来可以继续导入其他用户相关路由...
// import profileRouter from './profile';
// import authRouter from './auth';

const router = express.Router();

// 管理员相关路由 - /api/user/admin/*
router.use('/admin', adminRouter);

// 用户资料路由 - /api/user/profile/*
// router.use('/profile', profileRouter);

// 认证路由 - /api/user/auth/*
// router.use('/auth', authRouter);

export default router;
