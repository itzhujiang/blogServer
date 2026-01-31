import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import type { AddSettingParamType, SiteSettingResponseType, UpdateSiteSettingParamType } from '../../services/blog/siteSetting';
import { addSiteSettings, getSiteSettings, updateSiteSettings } from '../../services/blog/siteSetting';
import { updateSiteSettingsValidation, handleValidationErrors, getSiteSettingsValidation, addSiteSettingsValidation } from '../../validators';

const router = express.Router();

// 获取站点设置
router.get(
  '/getSettings',
  [...getSiteSettingsValidation, handleValidationErrors],
  asyncHandler<null, SiteSettingResponseType, 'get'>(async req => {
    return await getSiteSettings(req.query);
  })
);

// 添加站点设置
router.post('/addSettings', [...addSiteSettingsValidation, handleValidationErrors], asyncHandler<AddSettingParamType, null, 'post'>(async (req) => {
    return await addSiteSettings(req.body);
}));


// 修改站点设置
router.put('/updateSettings', [...updateSiteSettingsValidation, handleValidationErrors], asyncHandler<UpdateSiteSettingParamType, null, 'put'>(async (req) => {
    return await updateSiteSettings(req.body);
}));

export default router;