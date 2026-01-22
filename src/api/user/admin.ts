import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import { getUserInfo, login } from '../../services/user/admin';
import type {
  LoginRequsetType,
  LoginResponseType,
  UserInfoResponseType,
} from '../../services/user/admin';
import { loginValidation, handleValidationErrors } from '../../validators/index';

const router = express.Router();

// 登录接口 - POST /api/user/admin/login
router.post(
  '/login',
  [...loginValidation, handleValidationErrors],
  asyncHandler<LoginRequsetType, LoginResponseType, 'post'>(async (req, _res) => {
    return await login(req.body);
  })
);

// 获取用户接口
router.get('/getUesrInfo', asyncHandler<null, UserInfoResponseType>(async (req) => {
  return await getUserInfo({
    id: req.user?.id
  })
}))

export default router;
