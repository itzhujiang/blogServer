/**
 * Blog 模块路由聚合器
 * 统一管理 blog 相关的所有子路由
 */
import express from 'express';
import articleRouter from './article';
import mediaFileRouter from './mediaFile';
import categoryRouter from './category';
import aboutMeRouter from './aboutMe';
import siteSettingRouter from './siteSetting';
import commentRouter from './comment';

const router = express.Router();

// 文章相关路由 - /api/blog/article/*
router.use('/article', articleRouter);

// 媒体文件路由 - /api/blog/media/*
router.use('/media', mediaFileRouter);

// 分类路由 - /api/blog/category/*
router.use('/category', categoryRouter);

// 关于我页面路由 - /api/blog/about-me/*
router.use('/about-me', aboutMeRouter);

// 站点设置路由 - /api/blog/site-setting/*
router.use('/site-setting', siteSettingRouter);

// 评论路由 - /api/blog/comment/*
router.use('/comment', commentRouter);

export default router;
