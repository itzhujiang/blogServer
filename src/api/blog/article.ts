// 文章接口
import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import { getArticleListValidation, handleValidationErrors } from '../../validators/index';
import { ArticleListRequsetType, ArticleListResponseType } from '../../services/blog/article';
import { getArticleList } from '../../services/blog/article';

const router = express.Router();

router.get('/getArticleList', [...getArticleListValidation, handleValidationErrors], asyncHandler<ArticleListRequsetType, ArticleListResponseType>(async (req) => {
    return await getArticleList(req.query)
}))

export default router