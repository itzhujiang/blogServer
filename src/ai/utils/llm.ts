import { ChatOpenAI } from '@langchain/openai';

type OpenAiLLMOptions = {
  /** 温度参数 */
  temperature?: number;
};

const envValidate = () => {
  if (!process.env.AI_API_KEY) {
    throw new Error('AI_API_KEY 未设置');
  }
  if (!process.env.AI_BASE_URL) {
    throw new Error('AI_BASE_URL 未设置');
  }
  if (!process.env.AI_Dialogue_MODEL) {
    throw new Error('AI_Dialogue_MODEL 未设置');
  }
};

const defaultOpenAiLLMOptions: OpenAiLLMOptions = {
  temperature: 0.7,
};

const createOpenAiLLM = (options?: OpenAiLLMOptions) => {
  envValidate();
  const { temperature = 0.7 } = options || defaultOpenAiLLMOptions;
  const llm = new ChatOpenAI({
    temperature,
    model: process.env.AI_Dialogue_MODEL,
    streaming: true,
    verbose: true, // 启用详细日志
    configuration: {
      baseURL: process.env.AI_BASE_URL,
    },
    apiKey: process.env.AI_API_KEY,
  });
  return llm;
};

export { createOpenAiLLM };
