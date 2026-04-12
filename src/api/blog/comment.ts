import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import type {
  CommentsRequestType,
  CommentsListResponseType,
  ReviewCommentParamType,
  DelCommentParamType,
  PublishAuthorCommentParamType,
  ReplyCommentParamType,
} from '../../services/blog/comment';
import {
  delComment,
  getCommentsList,
  publishAuthorComment,
  replyComment,
  reviewComment,
} from '../../services/blog/comment';
import {
  getCommentValidation,
  reviewCommentValidation,
  handleValidationErrors,
  delCommentValidation,
  publishAuthorCommentValidation,
  replyCommentValidation,
} from '../../validators';

const router = express.Router();

// 获取评论
router.get(
  '/getCommentsList',
  [...getCommentValidation, handleValidationErrors],
  asyncHandler<CommentsRequestType, CommentsListResponseType, 'get'>(async req => {
    return await getCommentsList(req.query);
  })
);

// 审核评论
router.put(
  '/reviewComment',
  [...reviewCommentValidation, handleValidationErrors],
  asyncHandler<ReviewCommentParamType, null, 'put'>(async req => {
    return await reviewComment(req.body);
  })
);

// 评论删除
router.delete(
  '/delComment',
  [...delCommentValidation, handleValidationErrors],
  asyncHandler<DelCommentParamType, null, 'del'>(async req => {
    return await delComment(req.query);
  })
);

// 发布作者评论
router.post(
  '/publishAuthorComment',
  [...publishAuthorCommentValidation, handleValidationErrors],
  asyncHandler<PublishAuthorCommentParamType, null, 'post'>(async req => {
    return await publishAuthorComment({
      articleId: req.body.articleId,
      content: req.body.content,
      userId: req.user!.id,
      name: req.user!.name,
    });
  })
);

// 回复评论
router.post(
  '/replyComment',
  [...replyCommentValidation, handleValidationErrors],
  asyncHandler<ReplyCommentParamType, null, 'post'>(async req => {
    return await replyComment({
      id: req.body.id,
      content: req.body.content,
      userId: req.user!.id,
      name: req.user!.name,
    });
  })
);

export default router;
