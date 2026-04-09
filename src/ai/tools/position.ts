// 位置的llm工具

import { RunnableConfig } from '@langchain/core/runnables';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { uapiClient } from '../../utils/uapis';

// 获取ip地址位置信息-llm工具
export const getIpPosition = tool(
  async (_input: Record<string, never>, config?: RunnableConfig) => {
    const ip = (config?.configurable?.ip as string | undefined) ?? '';
    const payload = {
      ip,
    };
    const response = await uapiClient.network.getNetworkIpinfo(payload);
    if ('code' in response) {
      throw new Error(`获取位置信息失败，错误码：${response.code}，错误信息：${response.message}`);
    }
    const arr = response.region.split(' ');
    return {
      ip: response.ip, // ip地址
      country: arr[0], // 国家
      province: arr[1], // 省份
      city: arr[2], // 城市
    };
  },
  {
    name: 'getIpPosition',
    description: '获取当前用户位置信息',
    schema: z.object({}),
  }
);
