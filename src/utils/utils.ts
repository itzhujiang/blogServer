import Credential, { Config } from '@alicloud/credentials';
import * as $OpenApi from '@alicloud/openapi-client';
import Dypnsapi20170525, * as $Dypnsapi20170525 from '@alicloud/dypnsapi20170525';
import * as $Util from '@alicloud/tea-util';
import { defaultLogger } from './logger';

// 阿里云短信服务的SDK
class PhoneCode {
  private client: Dypnsapi20170525 | null = null;
  private schemeName = '默认方案';
  private countryCode = '86';
  constructor() {
    const credentialsConfig = new Config({
      // 凭证类型。
      type: 'access_key',
      // 设置accessKeyId值。
      accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
      // 设置accessKeySecret值。
      accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    });
    const credentialClient = new Credential(credentialsConfig);
    const ecsConfig = new $OpenApi.Config({
      credential: credentialClient,
      endpoint: 'dypnsapi.aliyuncs.com',
    });
    this.client = new Dypnsapi20170525(ecsConfig);
  }
  /**
   * 发送验证码
   * @param phoneNumber
   * @returns
   */
  async sendPhoneCode(phoneNumber: string) {
    try {
      const sendSmsVerifyCodeRequest = new $Dypnsapi20170525.SendSmsVerifyCodeRequest({
        signName: '速通互联验证码',
        schemeName: this.schemeName,
        countryCode: this.countryCode,
        phoneNumber,
        templateCode: '100001',
        templateParam: JSON.stringify({
          code: '##code##',
          min: 5,
        }),
      });
      const runtime = new $Util.RuntimeOptions({});
      if (!this.client) {
        throw new Error('阿里云短信服务客户端未初始化');
      }
      const resp = await this.client!.sendSmsVerifyCodeWithOptions(
        sendSmsVerifyCodeRequest,
        runtime
      );
      return resp;
    } catch (error) {
      console.error('发送短信验证码失败:', error);
      throw error;
    }
  }
  /**
   * 校验验证码
   * @param phoneNumber
   * @param code
   */
  async verifyPhoneCode(phoneNumber: string, code: string) {
    try {
      const runtime = new $Util.RuntimeOptions({});
      const checkSmsVerifyCodeRequest = new $Dypnsapi20170525.CheckSmsVerifyCodeRequest({
        schemeName: this.schemeName,
        countryCode: this.countryCode,
        phoneNumber,
        verifyCode: code,
        caseAuthPolicy: 2,
      });
      if (!this.client) {
        throw new Error('阿里云短信服务客户端未初始化');
      }
      let resp = await this.client.checkSmsVerifyCodeWithOptions(
        checkSmsVerifyCodeRequest,
        runtime
      );
      return resp;
    } catch (error) {
      console.error('验证码校验失败:', error);
      if (error instanceof Error) {
        defaultLogger.error({
          message: error.message,
          stack: error.stack,
          url: (error as any).url,
          method: (error as any).method,
          statusCode: (error as any).statusCode || 500,
        });
      }
      return false;
    }
  }
}

export const phoneCode = new PhoneCode();

/**
 * 获取当前时间戳
 */
export const getTimestamp = () => {
  const timestamp = Date.now();
  return timestamp;
};

/**
 * 加密手机号
 * @param phone 手机号
 */
export const encryptionPhone = (phone: string) => {
  if (!phone || phone.length !== 11) {
    return phone;
  }
  return phone.slice(0, 3) + '****' + phone.slice(7);
};
