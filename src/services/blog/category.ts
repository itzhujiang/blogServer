import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import { Category, CategoryAttributes, ArticleCategory } from '../../models/index';
import { Op, WhereOptions } from 'sequelize';

type CategoryListRequestType = {
  /** 分类名称（模糊查询） */
  name?: string;
};

type CategoryListResponseType = Pick<
  CategoryAttributes,
  'id' | 'name' | 'slug' | 'createdAt' | 'updatedAt'
>;

/**
 * 获取分类列表
 * @param param 请求参数
 * @returns 分类列表
 */
const getCategoryList = async (
  param: ParameBodyType<CategoryListRequestType>
): Promise<HandlerResult<CategoryListResponseType>> => {
  const { page = 1, size = 10, name } = param;
  const offset = (page - 1) * size;
  const limit = size;

  const where: WhereOptions<CategoryAttributes> = {};
  if (name && name !== '') {
    where.name = { [Op.like]: `%${name}%` };
  }

  const categories = await Category.findAndCountAll({
    attributes: ['id', 'name', 'slug', 'createdAt', 'updatedAt'],
    where,
    limit,
    offset,
    order: [['id', 'ASC']],
  });

  return {
    msg: '获取分类列表成功',
    data: {
      data: categories.rows,
      pagination: {
        page,
        size,
        total: categories.count,
      },
    },
  };
};

type AddCategoryRequestType = {
  /** 分类名称 */
  name: string;
  /** URL标识 */
  slug: string;
};

/**
 * 添加分类
 */
const addCategory = async (
  param: ParameBodyType<AddCategoryRequestType>
): Promise<HandlerResult<null>> => {
  const { name, slug } = param;
  const existingCategory = await Category.findOne({ where: { slug } });
  if (existingCategory) {
    return {
      err: '分类URL标识已存在',
    };
  }
  await Category.create({
    name,
    slug,
  });
  return {
    msg: '添加分类成功',
    data: null,
  };
};

type UpdateCategoryRequestType = {
  /** 分类ID */
  id: number;
} & AddCategoryRequestType;

/**
 * 修改分类
 * @param param
 * @returns
 */
const updateCategory = async (
  param: ParameBodyType<UpdateCategoryRequestType>
): Promise<HandlerResult<null>> => {
  const { id, name, slug } = param;
  const category = await Category.findByPk(id);
  if (!category) {
    return {
      err: '分类ID不存在',
    };
  }
  const existingCategory = await Category.findOne({ where: { slug } });
  if (existingCategory && existingCategory.id !== id) {
    return {
      err: '分类URL标识已存在',
    };
  }

  await category.update({
    name,
    slug,
  });
  return {
    msg: '修改分类成功',
    data: null,
  };
};

type DelCategoryRequestType = {
  /** 分类ID */
  id: number;
};

/**
 * 删除分类（软删除）
 * 同时删除 article_category 表中的关联记录
 */
const delCategory = async (
  param: ParameBodyType<DelCategoryRequestType>
): Promise<HandlerResult<null>> => {
  try {
    const { id } = param;

    // 1. 查找分类
    const category = await Category.findByPk(id);
    if (!category) {
      return {
        err: '分类不存在，无法删除',
      };
    }

    // 2. 软删除分类（设置 deletedAt）
    // paranoid 模式下，destroy() 会设置 deletedAt 而不是真正删除
    await category.destroy();

    // 3. 删除 article_category 表中的关联记录（物理删除）
    // 关联记录不需要保留，直接删除
    await ArticleCategory.destroy({
      where: { categoryId: id },
    });

    return {
      msg: '删除分类成功',
      data: null,
    };
  } catch (error) {
    throw new Error('删除分类失败:' + error);
  }
};

export {
  CategoryListRequestType,
  CategoryListResponseType,
  AddCategoryRequestType,
  UpdateCategoryRequestType,
  DelCategoryRequestType,
  getCategoryList,
  addCategory,
  updateCategory,
  delCategory,
};
