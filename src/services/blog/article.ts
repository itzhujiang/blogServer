// 文章
import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import {
  ArticleAttributes,
  CategoryAttributes,
  Article,
  Category,
  ArticleStatusLiteral,
  ArticleMedia,
  ArticleCategory,
  MediaFile,
  sequelize,
} from '../../models/index';
import { ConfirmResultType, confirmTempMedia } from './mediaFile';
import { Op, WhereOptions, Order, Includeable } from 'sequelize';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 文章列表请求类型
 */
type ArticleListRequsetType = {
  /** 文章标题（模糊查询） */
  title?: string;
  /** 文章状态 */
  status?: ArticleStatusLiteral | string;
  /** 发布时间-开始（毫秒时间戳） */
  publishedAtStart?: number | string;
  /** 发布时间-结束（毫秒时间戳） */
  publishedAtEnd?: number | string;
  /** 分类ID */
  categoryId?: number | string;
  /** 浏览量排序 */
  viewCountSort?: 'desc' | 'asc';
};

/**
 * 文章列表项类型
 */
type ArticleItemType = Pick<
  ArticleAttributes,
  | 'id'
  | 'title'
  | 'slug'
  | 'excerpt'
  | 'thumbnailUrl'
  | 'authorName'
  | 'readingTime'
  | 'viewCount'
  | 'status'
  | 'publishedAt'
> & {
  fileUrl: string; // 文章内容文件URL
  attachmentUrlArr: string[]; // 附件url数组
  categories: Pick<CategoryAttributes, 'id' | 'name' | 'slug'>[];
};

/**
 * 文章列表响应类型
 */
type ArticleListResponseType = ArticleItemType;

/**
 * 检查参数是否为有效值（非空字符串、非 undefined、非 null）
 */
const isValidParam = (value: any): boolean => {
  return value !== undefined && value !== null && value !== '';
};

/**
 * 获取文章列表
 * @param param 查询参数
 * @returns 文章列表
 */
const getArticleList = async (
  param: ParameBodyType<ArticleListRequsetType>
): Promise<HandlerResult<ArticleListResponseType>> => {
  const {
    page = 1,
    size = 10,
    title,
    status,
    publishedAtStart,
    publishedAtEnd,
    categoryId,
    viewCountSort,
  } = param;

  // 1. 构建查询条件
  const whereConditions: WhereOptions<ArticleAttributes> = {};

  // 标题模糊查询
  if (isValidParam(title)) {
    whereConditions.title = { [Op.like]: `%${title}%` };
  }

  // 状态精确匹配
  if (isValidParam(status)) {
    whereConditions.status = status as ArticleStatusLiteral;
  }

  // 发布时间范围查询
  if (isValidParam(publishedAtStart) || isValidParam(publishedAtEnd)) {
    const publishedAtCondition: { [Op.gte]?: number; [Op.lte]?: number } = {};
    if (isValidParam(publishedAtStart)) {
      publishedAtCondition[Op.gte] = Number(publishedAtStart);
    }
    if (isValidParam(publishedAtEnd)) {
      publishedAtCondition[Op.lte] = Number(publishedAtEnd);
    }
    whereConditions.publishedAt = publishedAtCondition;
  }

  // 2. 构建排序规则
  const orderRules: Order = [];
  if (viewCountSort) {
    orderRules.push(['viewCount', viewCountSort.toUpperCase() as 'ASC' | 'DESC']);
  }
  orderRules.push(['publishedAt', 'DESC']); // 默认按发布时间倒序

  // 3. 构建 include 关联查询（用于分类过滤和媒体文件）
  const includeOptions: Includeable[] = [
    {
      model: Category,
      as: 'categories',
      through: { attributes: [] }, // 不返回中间表数据
      attributes: ['id', 'name', 'slug'], // 只返回需要的字段
      ...(isValidParam(categoryId) && {
        where: { id: Number(categoryId) },
        required: true, // INNER JOIN（必须有该分类）
      }),
    },
    {
      model: ArticleMedia,
      as: 'articleMedias',
      required: false, // LEFT JOIN（允许文章没有媒体文件）
      attributes: ['mediaId', 'usageType'], // 需要 usageType 来区分不同类型的媒体
      include: [
        {
          model: MediaFile,
          as: 'media',
          required: false,
          attributes: ['fileUrl'],
        },
      ],
    },
  ];

  // 4. 执行查询
  const { rows, count } = await Article.findAndCountAll({
    where: whereConditions,
    include: includeOptions,
    order: orderRules,
    limit: size,
    offset: (page - 1) * size,
    distinct: true, // 防止关联查询导致的重复计数
    attributes: [
      'id',
      'title',
      'slug',
      'excerpt',
      'thumbnailUrl',
      'authorName',
      'readingTime',
      'viewCount',
      'status',
      'publishedAt',
    ],
  });

  // 5. 数据转换和返回
  const articleList: ArticleItemType[] = rows.map(article => {
    // 获取关联的分类数据（Sequelize 返回的关联数据）
    const categoriesData = article.get('categories') as Category[] | undefined;

    // 获取关联的媒体文件数据
    const articleMedias = article.get('articleMedias') as ArticleMedia[] | undefined;

    // 提取文章内容文件 URL（usageType = 'content'）
    const contentMedia = articleMedias?.find(media => media.usageType === 'content');
    const contentMediaFile = contentMedia?.get('media') as MediaFile | undefined;
    const fileUrl = contentMediaFile?.fileUrl || ''; // 如果没有关联媒体文件，返回空字符串

    // 提取附件文件 URL 数组（usageType = 'attachment'）
    const attachmentMedias = articleMedias?.filter(media => media.usageType === 'attachment') || [];
    const attachmentUrlArr = attachmentMedias
      .map(media => {
        const mediaFile = media.get('media') as MediaFile | undefined;
        return mediaFile?.fileUrl;
      })
      .filter((url): url is string => !!url); // 过滤掉 undefined 值

    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      thumbnailUrl: article.thumbnailUrl,
      fileUrl: fileUrl,
      attachmentUrlArr: attachmentUrlArr,
      authorName: article.authorName,
      readingTime: article.readingTime,
      viewCount: article.viewCount,
      status: article.status,
      publishedAt: article.publishedAt,
      categories:
        categoriesData?.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        })) || [],
    };
  });

  return {
    data: {
      data: articleList,
      pagination: {
        page,
        size,
        total: count,
      },
    },
  };
};

/** 添加文章请求类型 */
type AddArticleRequsetType = {
  /** 标题 */
  title: string;
  /** URL友好标识 */
  slug: string;
  /** 列表缩略图文件Code */
  thumbnailCode?: string;
  /** 文章摘要 */
  excerpt: string;
  /** 文章内容文件Code */
  articleCode: string;
  /** 附件列表 */
  attachmentList?: {
    code: string;
    source: string;
  }[];
  /** 分类ID列表 */
  categories?: number[];
};
/**
 * 添加文章
 * @param param
 * @returns
 */
const addArticle = async (
  param: ParameBodyType<AddArticleRequsetType>
): Promise<HandlerResult<null>> => {
  try {
    const isSlugExist = await Article.findOne({
      where: {
        slug: param.slug,
      },
    });

    if (isSlugExist) {
      return {
        err: '文章URL友好标识已存在，请更换后重新提交',
      };
    }
    console.log('param.categories', param.categories);

    const isCategoryExist = await Category.count({
      where: {
        id: {
          [Op.in]: param.categories || [],
        },
      },
    });
    console.log(isCategoryExist);

    if (!isCategoryExist) {
      return {
        err: '所选分类不存在，请更换后重新提交',
      };
    }
    const codeArr = [];
    if (param.thumbnailCode) {
      codeArr.push(param.thumbnailCode);
    }
    codeArr.push(param.articleCode);
    if (param.attachmentList && param.attachmentList.length > 0) {
      codeArr.push(...param.attachmentList.map(item => item.code));
    }
    // 使用事务确保数据一致性
    const transaction = await sequelize.transaction();
    const confirmResult = await confirmTempMedia(codeArr, transaction);

    // 检查是否是错误结果
    if (!confirmResult) {
      return {
        err: '确认临时媒体失败',
      };
    }

    if ('err' in confirmResult) {
      return {
        err: confirmResult.err,
      };
    }
    if (!confirmResult.data || !Array.isArray(confirmResult.data.data)) {
      return {
        err: '确认临时媒体失败',
      };
    }
    // 获取 主文件 url
    const articleFileUrl = confirmResult.data.data.find(
      item => item.fileCode === param.articleCode
    )?.fileUrl;
    if (!articleFileUrl) {
      return {
        err: '文章内容文件确认失败',
      };
    }

    let article: Article;
    try {
      // 1. 创建文章
      article = await Article.create(
        {
          title: param.title,
          slug: param.slug,
          filePath: articleFileUrl,
          excerpt: param.excerpt,
          thumbnailUrl: confirmResult.data.data.find(item => item.fileCode === param.thumbnailCode)
            ?.fileUrl,
          authorName: param.user?.name || '翎羽',
          status: 'published',
        },
        { transaction }
      );

      // 2. 创建媒体关联
      const articleMediaCreates = confirmResult.data.data.map(item =>
        ArticleMedia.create(
          {
            articleId: article.id,
            mediaId: item.mediaId,
            usageType:
              item.fileCode === param.articleCode
                ? 'content'
                : item.fileCode === param.thumbnailCode
                  ? 'thumbnail'
                  : 'attachment',
            sortOrder: 0,
          },
          { transaction }
        )
      );

      // 3. 创建分类关联
      const articleCategoryCreates = (param.categories || []).map(catId =>
        ArticleCategory.create(
          {
            articleId: article.id,
            categoryId: catId,
          },
          { transaction }
        )
      );

      // 等待所有操作完成
      await Promise.all([...articleMediaCreates, ...articleCategoryCreates]);

      // 提交事务
      await transaction.commit();
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }

    // 事务提交后，移动文件并处理文章内容（独立于事务）
    try {
      console.log('confirmResult.data', confirmResult.data, articleFileUrl);
      if (confirmResult.data && Array.isArray(confirmResult.data.data)) {
        await Promise.all(confirmResult.data.data.map(item => item.moveFiles()));

        // 处理文章内容，替换临时 src 为永久路径
        if (articleFileUrl) {
          const articleMDFile = path.join(process.cwd(), articleFileUrl);
          const articleMDContent = fs.readFileSync(articleMDFile, 'utf-8');
          const data = confirmResult.data!.data;
          const tempToPermanentMapping = new Map<string, string>();
          if (param.attachmentList) {
            param.attachmentList.forEach(it => {
              const fileInfo = data.find(item => item.fileCode === it.code);
              if (fileInfo) {
                tempToPermanentMapping.set(it.source, fileInfo.fileUrl);
              }
            });
          }
          const processedContent = processArticleContent(articleMDContent, tempToPermanentMapping);
          fs.writeFileSync(articleMDFile, processedContent, 'utf-8');

          // 计算阅读时间并更新文章
          const readingTime = Math.ceil(processedContent.length / 500);
          await article.update({ readingTime });
        }
      }
    } catch (postCommitError) {
      // 事务已提交，这里只记录错误，不影响返回结果
      console.error('文件处理失败:', postCommitError);
    }

    return {
      msg: '添加文章成功',
      data: null,
    };
  } catch (error) {
    throw new Error('添加文章失败:' + error);
  }
};

type UpdateArticleRequsetType = AddArticleRequsetType & {
  /** 文章ID */
  id: number;
  /** 是否更新文章 */
  isUpdateArticle?: boolean;
  /** 是否更新缩略图 */
  isUpdateThumbnail?: boolean;
};

/**
 * 修改文章
 */
const updateArticle = async (
  param: ParameBodyType<UpdateArticleRequsetType>
): Promise<HandlerResult<null>> => {
  try {
    // 1. 检查 slug 是否已存在
    const isSlugExist = await Article.findOne({
      where: {
        slug: param.slug,
        id: { [Op.ne]: param.id },
      },
    });
    if (isSlugExist) {
      return {
        err: '文章URL友好标识已存在，请更换后重新提交',
      };
    }

    // 2. 检查分类是否存在
    if (param.categories && param.categories.length > 0) {
      const isCategoryExist = await Category.count({
        where: {
          id: param.categories,
        },
      });
      if (!isCategoryExist) {
        return {
          err: '所选分类不存在，请更换后重新提交',
        };
      }
    }

    // 3. 构建需要确认的文件 code 数组
    const codeArr: string[] = [];
    if (param.isUpdateThumbnail && param.thumbnailCode) {
      codeArr.push(param.thumbnailCode);
    }
    if (param.isUpdateArticle) {
      codeArr.push(param.articleCode);
      if (param.attachmentList && param.attachmentList.length > 0) {
        codeArr.push(...param.attachmentList.map(item => item.code));
      }
    }

    // 4. 如果没有文件更新，直接更新文章基础信息
    if (codeArr.length === 0) {
      const article = await Article.findByPk(param.id);
      if (!article) {
        return {
          err: '文章不存在，无法更新',
        };
      }
      await article.update({
        title: param.title,
        slug: param.slug,
        excerpt: param.excerpt,
        authorName: param.user?.name || '翎羽',
      });
      return {
        msg: '修改文章成功',
        data: null,
      };
    }

    // 5. 有文件更新，使用事务处理
    const transaction = await sequelize.transaction();
    const confirmResult = await confirmTempMedia(codeArr, transaction);

    // 检查是否是错误结果
    if (!confirmResult) {
      await transaction.rollback();
      return {
        err: '确认临时媒体失败',
      };
    }
    if ('err' in confirmResult) {
      await transaction.rollback();
      return {
        err: confirmResult.err,
      };
    }
    if (!confirmResult.data || !Array.isArray(confirmResult.data.data)) {
      await transaction.rollback();
      return {
        err: '确认临时媒体失败',
      };
    }

    const data = confirmResult.data.data;

    try {
      // 5.1 获取文章文件 URL
      let articleFileUrl: string | undefined;
      if (param.isUpdateArticle) {
        const articleFile = data.find(
          (item: ConfirmResultType) => item.fileCode === param.articleCode
        );
        if (!articleFile) {
          await transaction.rollback();
          return {
            err: '文章内容文件确认失败',
          };
        }
        articleFileUrl = articleFile.fileUrl;
      }

      // 5.2 更新文章
      const article = await Article.findByPk(param.id, { transaction });
      if (!article) {
        await transaction.rollback();
        return {
          err: '文章不存在，无法更新',
        };
      }

      const thumbnailUrl = param.isUpdateThumbnail
        ? data.find((item: ConfirmResultType) => item.fileCode === param.thumbnailCode)?.fileUrl
        : article.thumbnailUrl;

      await article.update(
        {
          title: param.title,
          slug: param.slug,
          filePath: param.isUpdateArticle ? articleFileUrl : article.filePath,
          excerpt: param.excerpt,
          thumbnailUrl,
          authorName: param.user?.name || '翎羽',
        },
        { transaction }
      );

      // 5.3 更新媒体关联（如果更新了文章内容）
      let articleMediaCreates: Promise<ArticleMedia>[] = [];
      if (param.isUpdateArticle) {
        await ArticleMedia.destroy({
          where: { articleId: param.id },
          transaction,
        });
        articleMediaCreates = data.map((item: ConfirmResultType) =>
          ArticleMedia.create(
            {
              articleId: param.id,
              mediaId: item.mediaId,
              usageType:
                item.fileCode === param.articleCode
                  ? 'content'
                  : item.fileCode === param.thumbnailCode
                    ? 'thumbnail'
                    : 'attachment',
              sortOrder: 0,
            },
            { transaction }
          )
        );
      }

      // 5.4 更新分类关联
      await ArticleCategory.destroy({
        where: { articleId: param.id },
        transaction,
      });
      const articleCategoryCreates = (param.categories || []).map(catId =>
        ArticleCategory.create(
          {
            articleId: param.id,
            categoryId: catId,
          },
          { transaction }
        )
      );

      await Promise.all([...articleMediaCreates, ...articleCategoryCreates]);

      // 5.5 提交事务
      await transaction.commit();

      // 5.6 事务提交后，移动文件并处理文章内容
      if (data && data.length > 0) {
        await Promise.all(data.map((item: ConfirmResultType) => item.moveFiles()));

        // 处理文章内容，替换临时 src 为永久路径
        if (param.isUpdateArticle && articleFileUrl) {
          const articleMDFile = path.join(process.cwd(), articleFileUrl);
          const articleMDContent = fs.readFileSync(articleMDFile, 'utf-8');
          const tempToPermanentMapping = new Map<string, string>();

          if (param.attachmentList) {
            param.attachmentList.forEach(it => {
              const fileInfo = data.find((item: ConfirmResultType) => item.fileCode === it.code);
              if (fileInfo) {
                tempToPermanentMapping.set(it.source, fileInfo.fileUrl);
              }
            });
          }

          const processedContent = processArticleContent(articleMDContent, tempToPermanentMapping);
          fs.writeFileSync(articleMDFile, processedContent, 'utf-8');

          // 计算阅读时间并更新文章
          const readingTime = Math.ceil(processedContent.length / 500);
          await article.update({ readingTime });
        }
      }

      return {
        msg: '修改文章成功',
        data: null,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    throw new Error('修改文章失败:' + error);
  }
};

type DelArticleRequestType = {
  /** 文章ID */
  id: number;
};

/**
 * 删除文章（软删除）
 */
const delArticle = async (
  param: ParameBodyType<DelArticleRequestType>
): Promise<HandlerResult<null>> => {
  try {
    // 1. 查找文章
    const article = await Article.findByPk(param.id);
    if (!article) {
      return {
        err: '文章不存在，无法删除',
      };
    }

    // 2. 软删除文章（设置 deletedAt）
    // paranoid 模式下，destroy() 会设置 deletedAt 而不是真正删除
    await article.destroy();

    return {
      msg: '删除文章成功',
      data: null,
    };
  } catch (error) {
    throw new Error('删除文章失败:' + error);
  }
};

/**
 * 处理 Markdown 内容中的 img 和 video 标签
 * 1. 将 <img> 标签转换为 Markdown 语法：![alt](url)
 * 2. 将 <video> 标签的 src 路径替换为永久路径
 * @param content md 内容
 * @param mapping 路径映射表
 */
const processArticleContent = (content: string, mapping: Map<string, string>) => {
  // 处理 <img> 标签：<img src="..." alt="..."> -> ![alt](newSrc)
  content = content.replace(/<img\s+([^>]*?)>/gi, (_match, attributes) => {
    const srcMatch = attributes.match(/src=["']([^"']+)["']/i);
    const altMatch = attributes.match(/alt=["']([^"']+)["']/i);
    const src = srcMatch?.[1] || '';
    const alt = altMatch?.[1] || 'image';

    // 路径替换
    let newSrc = src;
    mapping.forEach((newPath, oldPath) => {
      newSrc = newSrc.replace(oldPath, newPath);
    });

    return `![${alt}](${newSrc})`;
  });
  // 处理 <video> 标签：保留 HTML 标签，只替换 src 路径
  content = content.replace(/<video\s+([^>]*?)>/gi, (_match, attributes) => {
    const srcMatch = attributes.match(/src=["']([^"']+)["']/i);
    let src = srcMatch?.[1] || '';

    // 路径替换
    let newSrc = src;
    mapping.forEach((newPath, oldPath) => {
      newSrc = newSrc.replace(oldPath, newPath);
    });

    // 保持原标签结构，只替换 src
    const newAttributes = attributes.replace(/src=["'][^"']+["']/i, `src="${newSrc}"`);

    return `<video ${newAttributes}>`;
  });

  // 处理标准 Markdown 图片语法：![alt](url) 的路径替换
  content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/gi, (_match, alt, url) => {
    let newUrl = url;
    mapping.forEach((newPath, oldPath) => {
      newUrl = newUrl.replace(oldPath, newPath);
    });
    return `![${alt}](${newUrl})`;
  });

  return content;
};

export {
  ArticleListRequsetType,
  ArticleListResponseType,
  AddArticleRequsetType,
  UpdateArticleRequsetType,
  DelArticleRequestType,
  getArticleList,
  addArticle,
  updateArticle,
  delArticle,
};
