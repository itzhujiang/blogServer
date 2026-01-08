import { sendErr } from './getSendResult';
import { pathToRegexp } from 'path-to-regexp';
import { NextFunction } from 'express';
import { verifyJwt } from './jwt';
import type { RequestMiddlewareType, ResponseType } from './type';

const handlerNonToken = (res: ResponseType) => {
  res.status(401).send(sendErr('你没有任何用于访问 API 的令牌', 401));
};

const needToKenApi = [
  {
    path: '/api/user/admin/login',
  },
  {
    path: '/uploads/temp/:name',
  },
];

export default (req: RequestMiddlewareType, res: ResponseType, next: NextFunction) => {
  const apis = needToKenApi.filter(api => {
    const reg = pathToRegexp(api.path);
    return reg.regexp.test(req.path);
  });
  if (apis.length !== 0) {
    next();
    return;
  }
  const result = verifyJwt(req);
  if (result) {
    req.user = result;
    next();
  } else {
    handlerNonToken(res);
  }
};
