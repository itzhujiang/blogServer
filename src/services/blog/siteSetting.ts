import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import { SiteSetting, SiteSettingAttributes } from '../../models/index';

type SiteSettingResponseType = SiteSettingAttributes[];

/**
 * 获取站点设置
 */
const getSiteSettings = async (): Promise<HandlerResult<SiteSettingResponseType>> => {
    const settings = await SiteSetting.findAll();
    return {
        data: settings,
    };
}

type UpdateSiteSettingParamType = Pick<SiteSettingAttributes, 'id' | 'description' | 'settingKey' | 'settingType' | 'settingValue'>

const updateSiteSettings = async (parma: ParameBodyType<UpdateSiteSettingParamType>): Promise<HandlerResult<null>> => {
    const { id, description, settingKey, settingType, settingValue } = parma;
    const setting = await SiteSetting.findByPk(id);
    if (!setting) {
        return {
            err: '不存在该站点设置',
        }
    }
    await setting.update({
        description,
        settingKey,
        settingType,
        settingValue
    });
    return {
        msg: '站点设置更新成功',
        data: null
    };
}


export {
    UpdateSiteSettingParamType,
    SiteSettingResponseType,
    getSiteSettings,
    updateSiteSettings
}