import { ClientTool } from '@langchain/core/tools';
import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const AgentStateAnnotation = Annotation.Root({
  threadId: Annotation<string>,
  tools: Annotation<ClientTool[]>,
  next: Annotation<string>,
  ...MessagesAnnotation.spec,
});

export const timers = (time = 5000) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
};

/**
 * 将 base64 图片数组写入 uploads/ai 目录
 * @param base64List base64 字符串数组，可带或不带 data:image/xxx;base64, 前缀
 * @returns 写入成功的文件 URL 数组（如 /uploads/ai/xxx.png）
 */
export function saveBase64Images(base64List: string[]): string[] {
  const aiDir = path.join(process.cwd(), 'uploads', 'ai');
  if (!fs.existsSync(aiDir)) {
    fs.mkdirSync(aiDir, { recursive: true });
  }

  return base64List.map(item => {
    const match = item.match(/^data:image\/(\w+);base64,/);
    const ext = match ? match[1] : 'png';
    const base64Data = match ? item.replace(/^data:image\/\w+;base64,/, '') : item;

    const fileName = `${uuidv4()}.${ext}`;
    const filePath = path.join(aiDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const baseUrl = (process.env.SERVER_URL ?? '').replace(/\/$/, '');
    return `${baseUrl}/uploads/ai/${fileName}`;
  });
}
