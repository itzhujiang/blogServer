import jwt from 'jsonwebtoken';
import type { AiUserPayload, RequestType, UserPayload } from './type';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.secret;
const aiUserSecret = process.env.aiUserSecret;

if (!secret) {
  console.error('错误: 请在 .env 文件中配置 secret 密钥');
  process.exit(1); // 终止程序运行
}

if (!aiUserSecret) {
  console.error('错误: 请在 .env 文件中配置 aiUserSecret 密钥');
  process.exit(1); // 终止程序运行
}

type JwtSecretKey = 1 | 2; // 1 代表后台管理员，2 代表 AI 用户

/**
 * 颁发token
 * @param maxAge 最大有效时间（秒）
 * @param info 加密内容
 * @returns JWT token 字符串
 */
const issueJwt = (
  maxAge: number = 3600 * 24 * 7,
  info: UserPayload | AiUserPayload,
  secretKey: JwtSecretKey = 1
): string => {
  const token = jwt.sign(info, secretKey === 1 ? secret : aiUserSecret, {
    expiresIn: maxAge,
  });
  return token;
};

/**
 * 验证token
 * @param req 请求体
 * @returns 返回解密出来的字符串
 */
const verifyJwt = (req: RequestType<unknown>, secretKey: JwtSecretKey = 1) => {
  let authorization = secretKey === 1 ? req.headers.authorization : req.cookies?.aiToken;
  if (!authorization) {
    return null;
  }
  const tokenArr = authorization.split(' ');
  const token = tokenArr.length === 1 ? tokenArr[0] : tokenArr[1];
  try {
    const res = jwt.verify(token, secretKey === 1 ? secret : aiUserSecret) as
      | UserPayload
      | AiUserPayload;
    return res;
  } catch (error) {
    return null;
  }
};

export { issueJwt, verifyJwt };
