import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import type { CategoryListRequestType, CategoryListResponseType,AddCategoryRequestType,UpdateCategoryRequestType,DelCategoryRequestType } from '../../services/blog/category';
import { getCategoryList,addCategory, updateCategory,delCategory } from '../../services/blog/category';
import { getCategorieListValidation, addCategoryValidation, updateCategoryValidation, delCategoryValidation,handleValidationErrors } from '../../validators/index';

const router = express.Router();

// 获取分类列表
router.get('/getCategoryList', [...getCategorieListValidation, handleValidationErrors], asyncHandler<CategoryListRequestType, CategoryListResponseType, 'get'>(async req => {
    return await getCategoryList(req.query);
}))

// 添加分类
router.post('/addCategory', [...addCategoryValidation, handleValidationErrors], asyncHandler<AddCategoryRequestType, null, 'post'>(async req => {
    return await addCategory(req.body);
}));

// 修改分类
router.put('/updateCategory', [...updateCategoryValidation, handleValidationErrors], asyncHandler<UpdateCategoryRequestType, null, 'put'>(async req => {
    return await updateCategory(req.body);
}));

// 删除分类
router.delete('/delCategory', [...delCategoryValidation, handleValidationErrors], asyncHandler<DelCategoryRequestType, null, 'del'>(async req => {
    return await delCategory(req.query);
}));

export default router;