import express from 'express';
import { aiLoginValidation, handleValidationErrors } from '../../validators';
import { asyncHandler } from '../../utils/getSendResult';
import { aiLogin, AiLoginRequsetType } from '../../services/ai/aiUser';

const router = express.Router();

// 校验手机验证码并登录
router.post(
  '/aiLogin',
  [...aiLoginValidation, handleValidationErrors],
  asyncHandler<Omit<AiLoginRequsetType, 'ip'>, null, 'post'>(async (req, res) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      '';
    const result = await aiLogin(
      {
        ...req.body,
        ip: ip,
      },
      res
    );

    return result;
  })
);

export default router;