import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import { Comment, CommentAttributes } from '../../models/index';
import { Op, WhereOptions, Order } from 'sequelize';

/**
 * 评论列表请求类型
 */
type CommentsRequestType = {
  /** 评论ID */
  id?: number | string;
  /** 父评论ID */
  parentId?: number | string | null;
  /** 审核状态 */
  status?: CommentAttributes['status'] | string;
  /** 作者名 */
  authorName?: string;
  /** 文章ID */
  articleId?: number | string;
  /** 点赞数排序 */
  likeCountSort?: 'asc' | 'desc';
  /** 创建时间-开始（毫秒时间戳） */
  createDateTimeStart?: number | string;
  /** 创建时间-结束（毫秒时间戳） */
  createDateTimeEnd?: number | string;
};

/**
 * 评论列表项类型
 */
type CommentItemType = Pick<
  CommentAttributes,
  | 'id'
  | 'articleId'
  | 'parentId'
  | 'authorName'
  | 'authorEmail'
  | 'authorUrl'
  | 'content'
  | 'status'
  | 'likeCount'
  | 'createdAt'
>;

/**
 * 评论列表响应类型
 */
type CommentsListResponseType = CommentItemType;

/**
 * 检查参数是否为有效值（非空字符串、非 undefined、非 null）
 */
const isValidParam = (value: any): boolean => {
  return value !== undefined && value !== null && value !== '';
};

/**
 * 获取评论列表
 * @param param 查询参数
 * @returns 评论列表
 */
const getCommentsList = async (
  param: ParameBodyType<CommentsRequestType>
): Promise<HandlerResult<CommentsListResponseType>> => {
  try {
    const {
      page = 1,
      size = 10,
      id,
      parentId,
      status,
      authorName,
      articleId,
      likeCountSort,
      createDateTimeStart,
      createDateTimeEnd,
    } = param;

    // 1. 构建查询条件
    const whereConditions: WhereOptions<CommentAttributes> = {};

    // ID 精确匹配（过滤空字符串）
    if (isValidParam(id)) {
      whereConditions.id = Number(id);
    }

    // 父评论ID（用于查询顶级评论或回复）
    // 注意：parentId 可以是 null，所以需要特殊处理
    if (isValidParam(parentId)) {
      whereConditions.parentId = Number(parentId);
    }

    // 状态精确匹配
    if (isValidParam(status)) {
      whereConditions.status = status as CommentAttributes['status'];
    }

    // 作者名模糊查询
    if (isValidParam(authorName)) {
      whereConditions.authorName = { [Op.like]: `%${authorName}%` };
    }

    // 文章ID精确匹配（过滤空字符串）
    if (isValidParam(articleId)) {
      whereConditions.articleId = Number(articleId);
    }

    // 创建时间范围查询（过滤空字符串）
    if (isValidParam(createDateTimeStart) || isValidParam(createDateTimeEnd)) {
      const createdAtCondition: { [Op.gte]?: number; [Op.lte]?: number } = {};
      if (isValidParam(createDateTimeStart)) {
        createdAtCondition[Op.gte] = Number(createDateTimeStart);
      }
      if (isValidParam(createDateTimeEnd)) {
        createdAtCondition[Op.lte] = Number(createDateTimeEnd);
      }
      whereConditions.createdAt = createdAtCondition;
    }

    // 2. 构建排序规则
    const orderRules: Order = [];
    if (likeCountSort) {
      orderRules.push(['likeCount', likeCountSort.toUpperCase() as 'ASC' | 'DESC']);
    }
    orderRules.push(['createdAt', 'DESC']); // 默认按创建时间倒序

    // 3. 执行查询
    const { rows, count } = await Comment.findAndCountAll({
      where: whereConditions,
      order: orderRules,
      limit: size,
      offset: (page - 1) * size,
      attributes: [
        'id',
        'articleId',
        'parentId',
        'authorName',
        'authorEmail',
        'authorUrl',
        'content',
        'status',
        'likeCount',
        'createdAt',
      ],
    });

    // 4. 数据转换
    const commentList: CommentItemType[] = rows.map(comment => ({
      id: comment.id,
      articleId: comment.articleId,
      parentId: comment.parentId,
      authorName: comment.authorName,
      authorEmail: comment.authorEmail,
      authorUrl: comment.authorUrl,
      content: comment.content,
      status: comment.status,
      likeCount: comment.likeCount,
      createdAt: comment.createdAt,
    }));

    return {
      data: {
        data: commentList,
        pagination: {
          page,
          size,
          total: count,
        },
      },
    };
  } catch (error) {
    throw new Error('获取评论列表失败' + error);
  }
};

type ReviewCommentParamType = {
  id: number;
  status: 'approved' | 'spam';
};
/**
 * 更新评论审核状态
 * @param param
 * @returns
 */
const reviewComment = async (param: ReviewCommentParamType): Promise<HandlerResult<null>> => {
  try {
    const { id, status } = param;
    const comment = await Comment.findByPk(id);
    if (!comment) {
      return {
        err: '评论不存在',
      };
    }
    await comment.update({ status });
    return {
      data: null,
      msg: '评论审核状态更新成功',
    };
  } catch (error) {
    throw new Error('审核评论失败' + error);
  }
};

type DelCommentParamType = {
  /** id */
  id: number;
};

const delComment = async (param: DelCommentParamType): Promise<HandlerResult<null>> => {
  const { id } = param;
  const comment = await Comment.findByPk(id);
  if (!comment) {
    return {
      err: '评论不存在',
    };
  }
  await comment.update({ status: 'trash' });
  return {
    data: null,
    msg: '评论删除成功',
  };
};

export {
  CommentsRequestType,
  CommentItemType,
  CommentsListResponseType,
  ReviewCommentParamType,
  DelCommentParamType,
  getCommentsList,
  delComment,
  reviewComment,
};
