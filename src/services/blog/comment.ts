import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import { Comment, CommentAttributes } from '../../models/index';
import { Op, WhereOptions, Order } from 'sequelize';

/**
 * 评论列表请求类型
 */
type CommentsRequestType = Pick<CommentAttributes, 'id' | 'parentId' | 'status' | 'authorName' | 'articleId'> & {
  /** 点赞数排序 */
  likeCountSort?: 'asc' | 'desc';
  /** 创建时间-开始（毫秒时间戳） */
  createDateTimeStart?: number;
  /** 创建时间-结束（毫秒时间戳） */
  createDateTimeEnd?: number;
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
type CommentsListResponseType = {
  /** 评论列表 */
  data: CommentItemType[];
  /** 分页信息 */
  pagination: {
    /** 当前页码 */
    page: number;
    /** 每页数量 */
    size: number;
    /** 总数 */
    total: number;
  };
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

  // ID 精确匹配
  if (id) {
    whereConditions.id = id;
  }

  // 父评论ID（用于查询顶级评论或回复）
  if (parentId !== undefined) {
    whereConditions.parentId = parentId;
  }

  // 状态精确匹配
  if (status) {
    whereConditions.status = status;
  }

  // 作者名模糊查询
  if (authorName) {
    whereConditions.authorName = { [Op.like]: `%${authorName}%` };
  }

  // 文章ID精确匹配
  if (articleId) {
    whereConditions.articleId = articleId;
  }

  // 创建时间范围查询
  if (createDateTimeStart || createDateTimeEnd) {
    const createdAtCondition: { [Op.gte]?: number; [Op.lte]?: number } = {};
    if (createDateTimeStart) {
      createdAtCondition[Op.gte] = createDateTimeStart;
    }
    if (createDateTimeEnd) {
      createdAtCondition[Op.lte] = createDateTimeEnd;
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
  status: 'pending' | 'approved' | 'spam' | 'trash';
}
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
      }
    }
  await comment.update({ status });
  return {
      data: null,
      msg: '评论审核状态更新成功',
  }
  } catch (error) {
    throw new Error('审核评论失败' + error);
  }
}

export {
  CommentsRequestType,
  CommentItemType,
  CommentsListResponseType,
  ReviewCommentParamType,
  getCommentsList,
  reviewComment
};