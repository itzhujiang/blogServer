import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import { AboutPageAttributes, AboutPage, AboutPageMedia, MediaFile, sequelize } from '../../models/index';
import { ConfirmResultType, confirmTempMedia } from './mediaFile';


/**
 * 扩展的关于我信息类型，包含头像URL
 */
type AboutMeInfoResponseType = AboutPageAttributes & { avatarUrl?: string | null };

/**
 * 获取关于我信息
 * @returns
 */
const getAboutMeInfo = async (): Promise<HandlerResult<AboutMeInfoResponseType>> => {
  try {
    const aboutMeInfo = await AboutPage.findAll();
    if (aboutMeInfo.length === 0) {
      return {
        err: '关于我信息不存在',
      };
    }

    const aboutPage = aboutMeInfo[0].toJSON();
    const id = aboutPage.id;

    // 查询头像URL
    const aboutPageMedia = await AboutPageMedia.findOne({
      where: { aboutPageId: id },
      include: [
        {
          model: MediaFile,
          as: 'media',
          attributes: ['fileUrl'],
        },
      ],
    });

    const avatarUrl = aboutPageMedia
      ? (aboutPageMedia.get('media') as { fileUrl: string } | undefined)?.fileUrl || null
      : null;

    return {
      data: {
        data: { ...aboutPage, avatarUrl },
      },
      msg: '成功',
    };
  } catch (error) {
    throw error;
  }
};

type UpdateAboutMeInfoParamsType = Exclude<AboutPageAttributes, 'updatedAt' | 'nickname'> & {
  avatarCode?: string; // 头像Code，用于生成头像URL
  isUpdateAvatar: boolean; // 是否更新头像
};

/**
 * 修改关于我信息
 */
const updateAboutMeInfo = async (
  param: ParameBodyType<UpdateAboutMeInfoParamsType>
): Promise<HandlerResult<null>> => {
  const transaction = await sequelize.transaction();

  try {
    const aboutPage = await AboutPage.findByPk(param.id, { transaction });
    if (!aboutPage) {
      await transaction.rollback();
      return { err: '关于我信息不存在' };
    }

    // 构建更新数据
    const updateData: Partial<AboutPageAttributes> = {
      nickname: param.user?.username || null,
      jobTitle: param.jobTitle,
      content: param.content,
      personalTags: param.personalTags,
      contactInfo: param.contactInfo,
      socialLinks: param.socialLinks,
      skills: param.skills,
      timeline: param.timeline,
    };

    // 如果需要更新头像
    if (param.isUpdateAvatar && param.avatarCode) {
      const confirmResult = await confirmTempMedia([param.avatarCode], transaction);

      // 统一错误处理
      if (!confirmResult || 'err' in confirmResult || !Array.isArray(confirmResult.data)) {
        await transaction.rollback();
        return { err: (confirmResult as { err?: string })?.err || '确认临时媒体失败' };
      }

      const avatarItem = confirmResult.data.find(
        (item: ConfirmResultType) => item.fileCode === param.avatarCode
      );
      if (!avatarItem) {
        await transaction.rollback();
        return { err: '未找到头像文件' };
      }

      // 删除旧的关联
      await AboutPageMedia.destroy({
        where: { aboutPageId: param.id },
        transaction,
      });

      // 创建新的关联
      await AboutPageMedia.create(
        {
          aboutPageId: param.id,
          mediaId: avatarItem.mediaId,
          usageType: 'avatar',
        },
        { transaction }
      );

      await aboutPage.update(updateData, { transaction });
      await transaction.commit();

      // 移动文件（事务外执行）
      await Promise.all(confirmResult.data.map((item: ConfirmResultType) => item.moveFiles()));
    } else {
      await aboutPage.update(updateData);
    }

    return { msg: '关于我信息更新成功', data: null };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};


/**
 * 获取关于我页面的头像URL
 */
const getAboutMeAvatar = async (aboutPageId: number): Promise<string | null> => {
    try {
        const aboutPageMedia = await AboutPageMedia.findOne({
            where: { aboutPageId, usageType: 'avatar' },
            include: [{
                model: AboutPage,
                as: 'aboutPage'
            }]
        });

        if (!aboutPageMedia) {
            return null;
        }

        // 通过关联获取 media
        const media = await aboutPageMedia.get('media') as { fileUrl: string } | undefined;
        return media?.fileUrl || null;
    } catch (error) {
        throw error;
    }
}


export {
    AboutMeInfoResponseType,
    UpdateAboutMeInfoParamsType,
    getAboutMeInfo,
    updateAboutMeInfo,
    getAboutMeAvatar
};
