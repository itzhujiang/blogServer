import express from 'express';
import { aiLoginValidation, handleValidationErrors } from '../../validators';
import { asyncHandler } from '../../utils/getSendResult';
import { aiLogin, AiLoginResponseType } from '../../services/blog/aiUser';

const router = express.Router();

// 校验手机验证码
router.post(
  '/aiLogin',
  [...aiLoginValidation, handleValidationErrors],
  asyncHandler<AiLoginResponseType, null, 'post'>(async req => {
    return await aiLogin(req.body);
  })
);


export default router;