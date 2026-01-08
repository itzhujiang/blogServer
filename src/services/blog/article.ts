// 文章
import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import {
  ArticleAttributes,
  CategoryAttributes,
  Article,
  Category,
  ArticleStatusLiteral,
} from '../../models/index';
import { Op, WhereOptions, Order, Includeable } from 'sequelize';

/**
 * 文章列表请求类型
 */
type ArticleListRequsetType = {
  /** 文章标题（模糊查询） */
  title?: string;
  /** 文章状态 */
  status?: ArticleStatusLiteral;
  /** 发布时间-开始（毫秒时间戳） */
  publishedAtStart?: number;
  /** 发布时间-结束（毫秒时间戳） */
  publishedAtEnd?: number;
  /** 分类ID */
  categoryId?: number;
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
  categories: Pick<CategoryAttributes, 'id' | 'name' | 'slug'>[];
};

/**
 * 文章列表响应类型
 */
type ArticleListResponseType = ArticleItemType[];

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
  if (title) {
    whereConditions.title = { [Op.like]: `%${title}%` };
  }

  // 状态精确匹配
  if (status) {
    whereConditions.status = status;
  }

  // 发布时间范围查询
  if (publishedAtStart || publishedAtEnd) {
    const publishedAtCondition: { [Op.gte]?: number; [Op.lte]?: number } = {};
    if (publishedAtStart) {
      publishedAtCondition[Op.gte] = publishedAtStart;
    }
    if (publishedAtEnd) {
      publishedAtCondition[Op.lte] = publishedAtEnd;
    }
    whereConditions.publishedAt = publishedAtCondition;
  }

  // 2. 构建排序规则
  const orderRules: Order = [];
  if (viewCountSort) {
    orderRules.push(['viewCount', viewCountSort.toUpperCase() as 'ASC' | 'DESC']);
  }
  orderRules.push(['publishedAt', 'DESC']); // 默认按发布时间倒序

  // 3. 构建 include 关联查询（用于分类过滤）
  const includeOptions: Includeable[] = [
    {
      model: Category,
      as: 'categories',
      through: { attributes: [] }, // 不返回中间表数据
      attributes: ['id', 'name', 'slug'], // 只返回需要的字段
      ...(categoryId && {
        where: { id: categoryId },
        required: true, // INNER JOIN（必须有该分类）
      }),
    },
  ];

  // 4. 执行查询
  const { rows } = await Article.findAndCountAll({
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

    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      thumbnailUrl: article.thumbnailUrl,
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
    data: articleList,
  };
};

export { ArticleListRequsetType, ArticleListResponseType, getArticleList };
