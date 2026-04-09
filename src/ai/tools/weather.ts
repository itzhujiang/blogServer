// 天气llm工具
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { uapiClient } from '../../utils/uapis';

/**
 * 获取指定城市的天气信息-llm工具
 */
export const getWeather = tool(
  /**
   * 获取指定城市的天气信息
   * @param param
   * @returns
   */
  async ({ city }: { city: string }) => {
    const payload = {
      city,
      adcode: '',
      extended: false,
      forecast: false,
      hourly: false,
      minutely: false,
      indices: false,
      lang: 'zh',
    } as const;
    const response = await uapiClient.misc.getMiscWeather(payload);
    if ('code' in response) {
      throw new Error(`获取天气信息失败，错误码：${response.code}，错误信息：${response.message}`);
    }
    return {
      city: response.city, // 城市
      weather: response.weather, // 天气现象
      temperature: response.temperature, // 温度，单位：摄氏度
    };
  },
  {
    name: 'getWeather',
    description: '获取指定城市的天气信息',
    schema: z.object({
      city: z.string().describe('要查询天气的城市名称，例如北京、上海'),
    }),
  }
);
