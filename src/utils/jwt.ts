import jwt from 'jsonwebtoken';
import type { RequestType, UserPayload} from './type'
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.secret;

if (!secret) {
    console.error('错误: 请在 .env 文件中配置 secret 密钥');
    process.exit(1); // 终止程序运行
}

/**
 * 颁发token
 * @param maxAge 最大有效时间（秒）
 * @param info 加密内容
 * @returns JWT token 字符串
 */
const issueJwt = (maxAge: number = 3600 * 24 * 7, info: UserPayload): string => {
    const token = jwt.sign(info, secret, {
        expiresIn: maxAge
    });
    return token;
}

/**
 * 验证token
 * @param req 请求体 
 * @returns 返回解密出来的字符串
 */
const verifyJwt = (req: RequestType<unknown>) => {
    let authorization = req.headers.authorization
    
    if (!authorization) {
        return null;
    }
    const tokenArr = authorization.split(' ');
    const token = tokenArr.length === 1 ? tokenArr[0] : tokenArr[1];
    try {
        const res = jwt.verify(token, secret) as UserPayload;
        return res;
    } catch {
        return null
    }

}

export {
    issueJwt,
    verifyJwt
}