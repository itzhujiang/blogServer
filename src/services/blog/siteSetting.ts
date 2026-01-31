import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import { SiteSetting, SiteSettingAttributes } from '../../models/index';

type SiteSettingResponseType = SiteSettingAttributes;

/**
 * 获取站点设置
 */
const getSiteSettings = async (param: ParameBodyType<null>): Promise<HandlerResult<SiteSettingResponseType>> => {
  const { page = 1, size = 10, } = param;
  const offset = (page - 1) * size;
  const limit = size;
  const settings = await SiteSetting.findAndCountAll({
    limit,
    offset,
    order: [['id', 'ASC']],
  });
  return {
    data: {
      data: settings.rows,
      pagination: {
        page,
        size,
        total: settings.count,
      }
    },
  };
};

type AddSettingParamType = Pick<
  SiteSettingAttributes,
  'description' | 'settingKey' | 'settingType' | 'settingValue'
>;

const addSiteSettings = async (param: ParameBodyType<AddSettingParamType>): Promise<HandlerResult<null>> => { 
  const { description, settingKey, settingType, settingValue } = param;
  try {
    const existingSetting = await SiteSetting.findOne({ where: { settingKey } });
    if (existingSetting) {
      return {
        err: '已存在该站点设置',
      };
    }
    await SiteSetting.create({
      description,
      settingKey,
      settingType,
      settingValue,
    });
    return {
      msg: '站点设置添加成功',
      data: null,
    }; 
  } catch (error) {
    throw new Error('添加站点设置失败:' + error);
  }
}


type UpdateSiteSettingParamType = Pick<SiteSettingAttributes, 'id'> & AddSettingParamType;
/**
 * 修改站点设置
 * @param parma 
 * @returns 
 */
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
  AddSettingParamType,
  getSiteSettings,
  updateSiteSettings,
  addSiteSettings,
};