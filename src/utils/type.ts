import type { Request, Response } from 'express';

export type ReqType = 'post' | 'get' | 'put' | 'del';

export interface UserPayload {
  id: number;
  username: string;
}

export type ResBodyType<T = never> = {
  code: 200 | 401 | 500;
  data: {
    data: Array<T> | T;
    pagination: {
      page: number;
      size: number;
      total: number;
    };
  } | null;
  msg: string;
};

export type ResponseType<T = never> = Response<ResBodyType<T>>;

export type ParameBodyType<T = {}> = {
  page?: number;
  size?: number;
} & T;

// POST/PUT/PATCH 请求，类型在请求体(第三个泛型)
export type RequestBodyType<T = {}> = Request<
  Record<string, unknown>,
  unknown,
  ParameBodyType<T>
> & {
  user?: UserPayload;
};

// GET/DELETE 请求，类型在查询参数(第四个泛型)
export type RequestQueryType<T = {}> = Request<
  Record<string, unknown>,
  unknown,
  unknown,
  ParameBodyType<T>
> & {
  user?: UserPayload;
};

export type RequestType<T, R extends ReqType = 'get'> = R extends 'post' | 'put'
  ? RequestBodyType<T>
  : RequestQueryType<T>;

// 通用的中间件请求类型（不关心具体请求参数）
export type RequestMiddlewareType = Request<
  Record<string, unknown>,
  unknown,
  unknown,
  Record<string, unknown>
> & {
  user?: UserPayload;
};
