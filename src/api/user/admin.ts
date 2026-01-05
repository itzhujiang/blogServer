import express from 'express';
import { asyncHandler } from '../../utils/getSendResult';
import { login } from '../../services/user/admin';
import type { LoginRequsetType, LoginResponseType } from '../../services/user/admin';
import { loginValidation, handleValidationErrors } from '../../validators/index';

const router = express.Router();

// 登录接口 - POST /api/user/admin/login
router.post("/login", [...loginValidation, handleValidationErrors], asyncHandler<LoginRequsetType, LoginResponseType, 'post'>(async (req, _res) => {
    return await login(req.body)
}))


export default router