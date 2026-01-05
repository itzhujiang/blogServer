import { ResBodyType,RequestType, ResponseType, ReqType } from './type';
import {  NextFunction } from 'express';

/**
 * 错误结果类型
 */
type ErrorResult = {
    err: string;
    code?: ResBodyType<unknown>['code']
};

/**
 * 成功结果类型
 */
type SuccessResult<T = unknown> = {
    /** 消息 */
    msg?: string;
    /** 数据 */
    data: T;
};

/**
 * Handler 返回类型
 */
type HandlerResult<T = unknown> = ErrorResult | SuccessResult<T> | void;

/**
 * 异步处理器类型
 */
type AsyncHandlerFunction<R, T, E extends ReqType = 'get'> = (
    req: RequestType<R, E>,
    res: ResponseType<T>,
    next: NextFunction
) => Promise<HandlerResult<T>>;

/**
 * 发送失败信息
 * @param err 错误提示
 * @param errCode 错误码
 * @returns 
 */
const sendErr = <T = never>(
    err: string = '服务器发送错误',
    errCode: ResBodyType<T>['code'] = 500
): ResBodyType<T> => {
    return {
        code: errCode,
        msg: err,
        data: null
    } as ResBodyType<T>
}

/**
 * 发送成功信息
 * @param data 服务数据
 * @param msg 消息提示
 * @returns 
 */
const sendResult = <T = unknown>(
    data: T = null as T,
    msg: string = '成功',
): ResBodyType<T> => {
    return {
        code: 200,
        msg,
        data
    } as ResBodyType<T>
}

/**
 * 异步处理器包装函数
 * @param handler 异步路由处理函数
 * @returns Express 中间件函数
 */
const asyncHandler = <R, T, E extends ReqType = 'get'>(handler: AsyncHandlerFunction<R,T, E>) => {
    return async (req: RequestType<R, E>, res: ResponseType<T>, next: NextFunction): Promise<void> => {
        try {
            const result = await handler(req, res, next);
            
            // 检查是否为错误结果
            if (result && 'err' in result) {
                res.send(sendErr(result.err, result.code));
                return;
            }
            if (result) {
                // 检查是否为成功结果
                res.send(sendResult(result.data, result.msg));
            }
        } catch (error) {
            // 捕获异常并传递给错误处理中间件
            next(error);
        }
    }
}

export { sendErr, sendResult, asyncHandler }
export type { ErrorResult, SuccessResult, HandlerResult, AsyncHandlerFunction }
