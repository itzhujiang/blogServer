import express from 'express';
import { phoneCodeValidation, handleValidationErrors } from '../../validators';
import { asyncHandler } from '../../utils/getSendResult';
import { phoneCode } from '../../services/tools/code';
import type {PhoneCodeParamsType} from '../../services/tools/code';

const router = express.Router();

// 获取手机验证码
router.post('/phoneCode', [...phoneCodeValidation, handleValidationErrors], asyncHandler<PhoneCodeParamsType, null, 'post'>(async (req) => {
    // 这里可以调用服务层的函数来处理获取验证码的逻辑
    // 例如：await getPhoneCode(req.body.phone);
    await phoneCode(req.body);
    return ;
}));

export default router;