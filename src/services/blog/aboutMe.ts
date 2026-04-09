import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import {
  AboutPageAttributes,
  AboutPage,
  AboutPageMedia,
  MediaFile,
  sequelize,
} from '../../models/index';
import { ConfirmResultType, confirmTempMedia } from './mediaFile';

/**
 * 扩展的关于我信息类型，包含头像URL和内容URL
 */
type AboutMeInfoResponseType = Omit<AboutPageAttributes, 'content'> & {
  avatarUrl?: string | null;
  contentUrl?: string | null;
};

/**
 * 获取关于我信息
 * @returns
 */
const getAboutMeInfo = async (): Promise<HandlerResult<AboutMeInfoResponseType>> => {
  const aboutMeInfo = await AboutPage.findAll();
  if (aboutMeInfo.length === 0) {
    return { err: '关于我信息不存在' };
  }

  const aboutPage = aboutMeInfo[0].toJSON();
  const id = aboutPage.id;

  // 查询所有关联的媒体文件（avatar 和 content）
  const aboutPageMedias = await AboutPageMedia.findAll({
    where: { aboutPageId: id },
    include: [
      {
        model: MediaFile,
        as: 'media',
        attributes: ['fileUrl'],
      },
    ],
  });

  // 提取 avatar 和 content URL
  let avatarUrl: string | null = null;
  let contentUrl: string | null = null;

  aboutPageMedias.forEach(media => {
    const mediaData = media.get('media') as { fileUrl: string } | undefined;
    if (mediaData) {
      if (media.usageType === 'avatar') {
        avatarUrl = mediaData.fileUrl;
      } else if (media.usageType === 'content') {
        contentUrl = mediaData.fileUrl;
      }
    }
  });

  // 移除 content 字段（如果存在）
  const aboutPageWithoutContent = aboutPage;

  return {
    data: {
      data: [{ ...aboutPageWithoutContent, avatarUrl, contentUrl }],
      pagination: { page: 1, size: 1, total: 1 },
    },
    msg: '成功',
  };
};

type UpdateAboutMeInfoParamsType = Omit<
  AboutPageAttributes,
  'updatedAt' | 'nickname' | 'content'
> & {
  avatarCode?: string; // 头像Code，用于生成头像URL
  contentCode?: string; // 内容文件Code
  isUpdateAvatar: boolean; // 是否更新头像
  isUpdateContent: boolean; // 是否更新内容
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

    // 构建更新数据（不包含 content 字段）
    const updateData: Partial<Omit<AboutPageAttributes, 'content'>> = {
      nickname: param.user?.name || null,
      jobTitle: param.jobTitle,
      personalTags: param.personalTags,
      contactInfo: param.contactInfo,
      socialLinks: param.socialLinks,
      skills: param.skills,
      timeline: param.timeline,
    };
    const fileCodesToConfirm: string[] = [];
    const mediaUpdates: Array<{ code: string; type: 'avatar' | 'content' }> = [];

    // 收集需要确认的文件
    if (param.isUpdateAvatar && param.avatarCode) {
      fileCodesToConfirm.push(param.avatarCode);
      mediaUpdates.push({ code: param.avatarCode, type: 'avatar' });
    }
    if (param.isUpdateContent && param.contentCode) {
      fileCodesToConfirm.push(param.contentCode);
      mediaUpdates.push({ code: param.contentCode, type: 'content' });
    }

    // 如果有媒体文件需要更新
    if (fileCodesToConfirm.length > 0) {
      const confirmResult = await confirmTempMedia(fileCodesToConfirm, transaction);
      if (
        !confirmResult ||
        'err' in confirmResult ||
        !confirmResult.data ||
        !Array.isArray(confirmResult.data.data)
      ) {
        console.log('confirmResult.data', JSON.stringify(confirmResult));

        await transaction.rollback();
        return { err: (confirmResult as { err?: string })?.err || '确认临时媒体失败' };
      }

      // 处理每个媒体更新
      for (const update of mediaUpdates) {
        const mediaItem = confirmResult.data.data.find(
          (item: ConfirmResultType) => item.fileCode === update.code
        );

        if (!mediaItem) {
          await transaction.rollback();
          return { err: `未找到${update.type === 'avatar' ? '头像' : '内容'}文件` };
        }

        // 删除该类型的旧关联
        await AboutPageMedia.destroy({
          where: {
            aboutPageId: param.id,
            usageType: update.type,
          },
          transaction,
        });

        // 创建新关联
        await AboutPageMedia.create(
          {
            aboutPageId: param.id,
            mediaId: mediaItem.mediaId,
            usageType: update.type,
          },
          { transaction }
        );
      }

      await aboutPage.update(updateData, { transaction });
      await transaction.commit();
      // 事务提交后，移动文件
      await Promise.all(confirmResult.data.data.map((item: ConfirmResultType) => item.moveFiles()));
    } else {
      await aboutPage.update(updateData, { transaction });
      await transaction.commit();
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
  const aboutPageMedia = await AboutPageMedia.findOne({
    where: { aboutPageId, usageType: 'avatar' },
    include: [
      {
        model: AboutPage,
        as: 'aboutPage',
      },
    ],
  });

  if (!aboutPageMedia) {
    return null;
  }

  // 通过关联获取 media
  const media = (await aboutPageMedia.get('media')) as { fileUrl: string } | undefined;
  return media?.fileUrl || null;
};

export {
  AboutMeInfoResponseType,
  UpdateAboutMeInfoParamsType,
  getAboutMeInfo,
  updateAboutMeInfo,
  getAboutMeAvatar,
};
