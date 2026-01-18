// 文章接口
import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import {
  getArticleListValidation,
  handleValidationErrors,
  addArticleValidation,
  updateArticleValidation,
  delArticleValidation,
} from '../../validators/index';
import {
  ArticleListRequsetType,
  ArticleListResponseType,
  AddArticleRequsetType,
  UpdateArticleRequsetType,
  DelArticleRequestType,
} from '../../services/blog/article';
import { getArticleList, addArticle, updateArticle, delArticle } from '../../services/blog/article';

const router = express.Router();

/**
 * 获取文章列表
 */
router.get(
  '/getArticleList',
  [...getArticleListValidation, handleValidationErrors],
  asyncHandler<ArticleListRequsetType, ArticleListResponseType>(async req => {
    return await getArticleList(req.query);
  })
);

/**
 * 添加文章
 */
router.post(
  '/addArticle',
  [...addArticleValidation, handleValidationErrors],
  asyncHandler<AddArticleRequsetType, null, 'post'>(async req => {
    return await addArticle(req.body);
  })
);

/**
 * 修改文章
 */
router.put(
  '/updateArticle',
  [...updateArticleValidation, handleValidationErrors],
  asyncHandler<UpdateArticleRequsetType, null, 'put'>(async req => {
    return await updateArticle(req.body);
  })
);

/**
 * 删除文章
 */
router.delete(
  '/delArticle',
  [...delArticleValidation, handleValidationErrors],
  asyncHandler<DelArticleRequestType, null, 'del'>(async req => {
    return await delArticle(req.query);
  })
);

export default router;
