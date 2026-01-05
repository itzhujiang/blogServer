/**
 * Blog 模块路由聚合器
 * 统一管理 blog 相关的所有子路由
 */
import express from 'express';
import articleRouter from './article';
import mediaFileRouter from './mediaFile';
// import categoryRouter from './category';
// 未来可以继续导入其他 blog 相关路由...

const router = express.Router();

// 文章相关路由 - /api/blog/article/*
router.use('/article', articleRouter);

// 媒体文件路由 - /api/blog/media/*
router.use('/media', mediaFileRouter);

// 分类路由 - /api/blog/category/*
// router.use('/category', categoryRouter);

export default router;
