import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import type { AboutMeInfoResponseType, UpdateAboutMeInfoParamsType } from '../../services/blog/aboutMe';
import { getAboutMeInfo,updateAboutMeInfo } from '../../services/blog/aboutMe';
import { updateAboutMeValidation, handleValidationErrors } from '../../validators';

const router = express.Router();

// 获取关于我信息
router.get('/info',  asyncHandler<null, AboutMeInfoResponseType, 'get'>(async () => {
    return await getAboutMeInfo();
}))

// 修改关于我信息
router.put('/update', [...updateAboutMeValidation, handleValidationErrors], asyncHandler<UpdateAboutMeInfoParamsType, null, 'put'>(async (req) => {
    return await updateAboutMeInfo({
      ...req.body,
      user: req.user,
    });
}))

export default router;