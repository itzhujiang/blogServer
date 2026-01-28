import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import type { CommentsRequestType, CommentsListResponseType, ReviewCommentParamType, DelCommentParamType } from '../../services/blog/comment';
import { delComment, getCommentsList, reviewComment } from '../../services/blog/comment';
import { getCommentValidation, reviewCommentValidation, handleValidationErrors, delCommentValidation } from '../../validators';

const router = express.Router();

// 获取评论
router.get('/getCommentsList', [...getCommentValidation, handleValidationErrors], asyncHandler<CommentsRequestType, CommentsListResponseType, 'get'>(async req => {
    return await getCommentsList(req.query);
}));

// 审核评论
router.put('/reviewComment', [...reviewCommentValidation, handleValidationErrors], asyncHandler<ReviewCommentParamType, null, 'put'>(async req => {
    return await reviewComment(req.body);
}));

// 评论删除
router.delete('/delComment', [...delCommentValidation, handleValidationErrors], asyncHandler<DelCommentParamType, null, 'del'>(async req => {
    return await delComment(req.query);
}));

export default router;