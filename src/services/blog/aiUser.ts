import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType, AiUserPayload, ResponseType } from '../../utils/type';
import { phoneCode as phoneCodeService } from '../../utils/utils';
import { AiChatUsers } from '../../models/index';
import { issueJwt } from '../../utils/jwt';

type AiLoginRequsetType = {
  /** 手机号 */
  phone: string;
  /** 验证码 */
  code: string;
  /** 登录IP地址 */
  ip: string;
};

const aiLogin = async (
  params: ParameBodyType<AiLoginRequsetType>,
  response: ResponseType<null>
): Promise<HandlerResult<null>> => {
  try {
    const { phone, code, ip } = params;
    const res = await phoneCodeService.verifyPhoneCode(phone, code);
    if (res && res.statusCode === 200 && res.body?.model?.verifyResult === 'PASS') {
      let user = await AiChatUsers.findOne({
        where: { phone },
      });
      // 如果用户不存在，创建新用户
      if (!user) {
        user = await AiChatUsers.create({
          phone,
          status: 'active',
          last_verified_at: Date.now(),
          last_login_ip: ip,
        });
      } else {
        // 如果用户已存在，更新登录信息
        await user.update({
          last_verified_at: Date.now(),
          last_login_ip: ip,
          status: 'active',
        });
      }

      // 生成 JWT Token
      const tokenPayload: AiUserPayload = {
        id: user.id!,
        phone: user.phone,
        type: 'ai-user',
      };
      const token = issueJwt(3600 * 24 * 7, tokenPayload, 2); // 7天有效期
      response.cookie('aiToken', token, {
        httpOnly: true, // 防止 XSS 攻击
        secure: process.env.NODE_ENV === 'production', // 生产环境使用 HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7天（毫秒）
        sameSite: 'strict', // 防止 CSRF 攻击
      });
      return {
        msg: '登录成功',
        data: null,
      };
    }

    return {
      msg: '验证码有误，请重新输入',
      data: null,
    };
  } catch (error) {
    throw error;
  }
};

export { aiLogin, AiLoginRequsetType };
