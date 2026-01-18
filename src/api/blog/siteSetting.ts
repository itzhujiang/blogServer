import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import type { SiteSettingResponseType, UpdateSiteSettingParamType } from '../../services/blog/siteSetting';
import { getSiteSettings, updateSiteSettings } from '../../services/blog/siteSetting';
import { updateSiteSettingsValidation, handleValidationErrors } from '../../validators';

const router = express.Router();

// 获取站点设置
router.get('/getSettings', asyncHandler<null, SiteSettingResponseType, 'get'>(async () => {
    return await getSiteSettings();
}));

// 修改站点设置
router.post('/updateSettings', [...updateSiteSettingsValidation, handleValidationErrors], asyncHandler<UpdateSiteSettingParamType, null, 'put'>(async (req) => {
    return await updateSiteSettings(req.body);
}));

export default router;