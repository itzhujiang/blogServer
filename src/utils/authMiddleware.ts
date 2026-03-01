import { sendErr } from './getSendResult';
import { pathToRegexp } from 'path-to-regexp';
import { NextFunction } from 'express';
import { verifyJwt } from './jwt';
import type { RequestMiddlewareType, ResponseType, UserPayload, AiUserPayload } from './type';

const handlerNonToken = (res: ResponseType) => {
  res.status(401).send(sendErr('你没有任何用于访问 API 的令牌', 401));
};

// 不需要任何权限验证的接口白名单
const noAuthRequiredApi = [
  {
    path: '/api/user/admin/login',
  },
  {
    path: '/uploads/temp/:name',
  },
  {
    path: '/api/tool/:path*',
  },
  {
    path: '/api/blog/ai-user/aiLogin',
  },
];

// AI用户权限的接口白名单
const aiAuthOnlyApi = [
  {
    path: '/api/blog/ai-user/chat',
  },
  {
    path: '/api/blog/ai-user/profile',
  },
];

/**
 * 统一权限校验中间件
 */
export default (req: RequestMiddlewareType, res: ResponseType, next: NextFunction) => {
  // 检查是否在无需权限的白名单中
  const noAuthApis = noAuthRequiredApi.filter(api => {
    const reg = pathToRegexp(api.path);
    return reg.regexp.test(req.path);
  });

  if (noAuthApis.length !== 0) {
    next();
    return;
  }

  // 验证管理员 token（管理员可以访问所有接口）
  const adminResult = verifyJwt(req);
  if (adminResult) {
    req.user = adminResult as UserPayload;
    next();
    return;
  }

  // 管理员验证失败，检查是否在 AI 接口白名单中
  const aiOnlyApis = aiAuthOnlyApi.filter(api => {
    const reg = pathToRegexp(api.path);
    return reg.regexp.test(req.path);
  });

  // 如果在 AI 白名单中，才尝试验证 AI token
  if (aiOnlyApis.length !== 0) {
    const aiResult = verifyJwt(req, 2) as AiUserPayload;
    if (aiResult && aiResult.type === 'ai-user') {
      req.aiUser = aiResult;
      next();
      return;
    }
  }

  // 不在 AI 白名单中，或者 AI token 验证失败，返回 401
  handlerNonToken(res);
};
