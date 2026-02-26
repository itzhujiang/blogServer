import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import { phoneCode as phoneCodeService } from '../../utils/utils';
// import { AiChatUsersAttributes, AiChatUsers } from '../../models/index';

type AiLoginResponseType = {
  /** 手机号 */
  phone: string;
  /** 验证码 */
  code: string;
};

const aiLogin = async (
  params: ParameBodyType<AiLoginResponseType>
): Promise<HandlerResult<null>> => {
  try {
    const { phone, code } = params;
    const res = await phoneCodeService.verifyPhoneCode(phone, code);
    if (res && res.statusCode === 200 && res.body?.model?.verifyResult === 'PASS') {
      return {
        msg: '验证码校验成功',
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

export { aiLogin, AiLoginResponseType };
