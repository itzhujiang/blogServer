import express from 'express';
import { sendPhoneCodeValidation, handleValidationErrors } from '../../validators';
import { asyncHandler } from '../../utils/getSendResult';
import { sendPhoneCode } from '../../services/tools/code';
import type { SendPhoneCodeParamsType } from '../../services/tools/code';

const router = express.Router();

// 获取手机验证码
router.post(
  '/sendPhoneCode',
  [...sendPhoneCodeValidation, handleValidationErrors],
  asyncHandler<SendPhoneCodeParamsType, null, 'post'>(async req => {
    // 这里可以调用服务层的函数来处理获取验证码的逻辑
    // 例如：await getPhoneCode(req.body.phone);
    return await sendPhoneCode(req.body);
  })
);


export default router;