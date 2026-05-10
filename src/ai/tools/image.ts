// 图片工具
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createImageLLM } from '../utils/llm';
import { defaultLogger } from '../../utils/logger';
import { saveBase64Images } from '../utils/utils';

type ImageLLMResponse = {
  data: {
    /**图片base64 */
    b64_json: string;
  }[];
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
  };
};

// 文生图
export const textToImage = tool(
  async ({ prompt, n = 1, size = 'auto' }) => {
    const imageLLMRequest = createImageLLM({
      type: 'textToImage',
    });
    try {
      const res = await imageLLMRequest.post<ImageLLMResponse>('', {
        prompt,
        n,
        size,
      });
      const base64List = res.data.map(item => item.b64_json);
      const img = saveBase64Images(base64List);
      return img;
    } catch (error) {
      defaultLogger.info(JSON.stringify(error));
      return error;
    }
  },
  {
    name: 'textToImage',
    description: '用于根据用户的提示词生成图片',
    schema: z.object({
      prompt: z.string().nonempty().describe('用户期望生成图像的文本描述'),
      n: z.number().int().min(1).max(10).default(1).describe('单次请求生成图像的张数'),
      size: z
        .enum([
          'auto',
          '1024x1024',
          '1536x1024',
          '1024x1536',
          '2048x2048',
          '2048x1152',
          '3840x2160',
          '2160x3840',
        ])
        .default('auto')
        .describe('生成图像的分辨率'),
    }),
  }
);
