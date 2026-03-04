import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';
import { phoneCode as phoneCodeService, getTimestamp } from '../../utils/utils';
import redisClient from '../../utils/redis';

type SendPhoneCodeParamsType = {
  phone: string;
};

const sendPhoneCode = async (
  params: ParameBodyType<SendPhoneCodeParamsType>
): Promise<HandlerResult<null>> => {
  try {
    const { phone } = params;
    const key = `sms:last_send:${phone}`;
    const timestamp = getTimestamp();
    const value = await redisClient.get(key);
    if (value && timestamp - Number(value) < 60000) {
      return {
        err: '验证码发送频繁，稍后重试',
      };
    }
    const res = await phoneCodeService.sendPhoneCode(phone);
    if (res.statusCode === 200 && res.body?.success) {
      const timestamp = getTimestamp();
      redisClient.set(key, timestamp, {
        PX: 60000, // 60秒后过期
      });
      return {
        msg: '验证码发送成功',
        data: null,
      };
    }
    return {
      err: '验证码发送失败',
    };
  } catch (error) {
    throw error;
  }
};

export { sendPhoneCode, SendPhoneCodeParamsType };
