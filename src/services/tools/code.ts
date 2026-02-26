import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import { phoneCode as phoneCodeService } from '../../utils/utils';

type SendPhoneCodeParamsType = {
  phone: string;
};

const sendPhoneCode = async (
  params: ParameBodyType<SendPhoneCodeParamsType>
): Promise<HandlerResult<null>> => {
  try {
    const { phone } = params;
    const res = await phoneCodeService.sendPhoneCode(phone);
    if (res.statusCode === 200 && res.body?.success) {
      return {
        msg: '验证码发送成功',
        data: null,
      };
    }
    return {
      msg: '验证码发送失败',
      data: null,
    };
  } catch (error) {
    throw error;
  }
};

export { sendPhoneCode, SendPhoneCodeParamsType };
