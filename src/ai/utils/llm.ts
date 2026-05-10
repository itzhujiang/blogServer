import { ChatOpenAI } from '@langchain/openai';
import axios, { AxiosRequestConfig } from 'axios';

type UnwrappedAxiosInstance = Omit<
  ReturnType<typeof axios.create>,
  'get' | 'post' | 'put' | 'delete' | 'patch'
> & {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
};

type OpenAiLLMOptions = {
  /** 温度参数 */
  temperature?: number;
  /** 思考模式 */
  enableThinking?: boolean;
};

const envOpenAiLLMValidate = () => {
  if (!process.env.AI_API_KEY) {
    throw new Error('AI_API_KEY 未设置');
  }
  if (!process.env.AI_BASE_URL) {
    throw new Error('AI_BASE_URL 未设置');
  }
  if (!process.env.AI_DIALOGUE_MODEL) {
    throw new Error('AI_DIALOGUE_MODEL 未设置');
  }
};

const defaultOpenAiLLMOptions: OpenAiLLMOptions = {
  temperature: 0.7,
  enableThinking: true,
};
/**
 * 创建一个openAI格式的LLM
 * @param options
 * @returns
 */
const createOpenAiLLM = (options?: OpenAiLLMOptions) => {
  envOpenAiLLMValidate();
  const { temperature = 0.7, enableThinking = true } = options || defaultOpenAiLLMOptions;
  const llm = new ChatOpenAI({
    temperature,
    model: process.env.AI_DIALOGUE_MODEL,
    streaming: true,
    // verbose: true, // 启用详细日志
    configuration: {
      baseURL: process.env.AI_BASE_URL,
    },
    apiKey: process.env.AI_API_KEY,
    modelKwargs: {
      enable_thinking: enableThinking,
    },
  });
  return llm;
};

const envVideoLLMValidate = () => {
  if (!process.env.AI_BASE_URL) {
    throw new Error('AI_BASE_URL 未设置');
  }
  if (!process.env.AI_API_KEY) {
    throw new Error('AI_API_KEY 未设置');
  }
  if (!process.env.AI_GENERATE_VIDEO_MODEL) {
    throw new Error('AI_GENERATE_VIDEO_MODEL 未设置');
  }
  if (!process.env.AI_GET_VIDEO_MODEL) {
    throw new Error('AI_GET_VIDEO_MODEL 未设置');
  }
};

type VideoLLMOptions = {
  type: 'generate' | 'get';
};

/**
 * 创建视频生成模型的请求
 * @param options
 * @returns
 */
const createVideoLLM = (options: VideoLLMOptions) => {
  envVideoLLMValidate();
  const { type } = options;
  const request = axios.create({
    baseURL: process.env.AI_BASE_URL + '/v1/responses',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.AI_API_KEY,
    },
    data: {
      model:
        type === 'generate' ? process.env.AI_GENERATE_VIDEO_MODEL : process.env.AI_GET_VIDEO_MODEL,
      seed: -1,
    },
  });
  // 响应拦截器
  request.interceptors.response.use(
    response => response.data,
    error => {
      return Promise.reject(error);
    }
  );
  return request as unknown as UnwrappedAxiosInstance;
};

const envImageLLMValidate = () => {
  if (!process.env.AI_BASE_URL) {
    throw new Error('AI_BASE_URL 未设置');
  }
  if (!process.env.AI_API_KEY) {
    throw new Error('AI_API_KEY 未设置');
  }
  if (!process.env.AI_IMAGE_MODEL) {
    throw new Error('AI_IMAGE_MODEL 未设置');
  }
};

interface ImageLLMOptions {
  type: 'textToImage' | 'imageEditing';
}

const createImageLLM = (options: ImageLLMOptions) => {
  envImageLLMValidate();
  console.log('process.env.AI_IMAGE_MODEL', process.env.AI_IMAGE_MODEL);

  const { type } = options;
  const url: Record<ImageLLMOptions['type'], string> = {
    textToImage: '/images/generations',
    imageEditing: '/images/edits',
  };
  const request = axios.create({
    baseURL: process.env.AI_BASE_URL + url[type],
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
  });
  request.interceptors.request.use(config => {
    config.data = { model: process.env.AI_IMAGE_MODEL, ...config.data };
    return config;
  });
  // 响应拦截器
  request.interceptors.response.use(
    response => response.data,
    error => {
      return Promise.reject(error);
    }
  );
  return request as unknown as UnwrappedAxiosInstance;
};

export { createOpenAiLLM, createVideoLLM, createImageLLM };
