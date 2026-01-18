import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import type { CommentsRequestType, CommentsListResponseType, ReviewCommentParamType } from '../../services/blog/comment';
import { getCommentsList, reviewComment } from '../../services/blog/comment';
import { getCommentValidation, reviewCommentValidation, handleValidationErrors } from '../../validators';

const router = express.Router();

// 获取评论
router.get('/getCommentsList', [...getCommentValidation, handleValidationErrors], asyncHandler<CommentsRequestType, CommentsListResponseType, 'get'>(async req => {
    return await getCommentsList(req.query);
}));

// 审核评论
router.put('/reviewComment', [...reviewCommentValidation, handleValidationErrors], asyncHandler<ReviewCommentParamType, null, 'put'>(async req => {
    return await reviewComment(req.body);
}));

export default router;