import Credential, { Config } from '@alicloud/credentials';


const credentialsConfig  = new Config({
    // 凭证类型。
    type: 'access_key',
    // 设置accessKeyId值，此处已从环境变量中获取accessKeyId为例。
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    // 设置accessKeySecret值，此处已从环境变量中获取accessKeySecret为例。
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
});

export const credentialClient = new Credential(credentialsConfig);