// 记忆工具
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import {
  AiGlobalChatMemories,
  AiGlobalChatMemoryCategory,
  sequelize,
  AiSessionMemories,
} from '@/models';

// 获取指定用户全局记忆索引的底层函数，不触发 LangChain callback
export async function fetchGlobalMemoryIndex(userId: number): Promise<string> {
  const res = await AiGlobalChatMemories.findOne({
    where: {
      user_id: userId,
      skip_index: true,
    },
    attributes: ['content'],
  });
  return res?.content || '';
}

// 获取指定用户指定会话的记忆的底层函数，不触发 LangChain callback
export async function fetchSessionMemories(
  userId: number,
  threadId: string
): Promise<{
  lastMessageId: string;
  content: string;
}> {
  const res = await AiSessionMemories.findOne({
    where: {
      user_id: userId,
      thread_id: threadId,
    },
    attributes: ['content', 'last_message_id'],
  });
  return {
    lastMessageId: res?.last_message_id || '',
    content: res?.content || '',
  };
}

// 获取指定用户全局记忆索引工具
export const getGlobalMemoryIndex = tool(async ({ userId }) => fetchGlobalMemoryIndex(userId), {
  name: 'getGlobalMemoryIndex',
  description: '获取指定用户全局记忆索引工具',
  schema: z.object({
    userId: z.number().describe('用户ID'),
  }),
});
// 保存指定用户全局记忆索引工具
export const saveGlobalMemoryIndex = tool(
  async ({ userId, content }) => {
    const transaction = await sequelize.transaction();
    try {
      const existing = await AiGlobalChatMemories.findOne({
        where: {
          user_id: userId,
          skip_index: true,
        },
        transaction,
      });
      if (existing) {
        await existing.update({ content }, { transaction });
      } else {
        await AiGlobalChatMemories.create(
          {
            user_id: userId,
            skip_index: true,
            content,
            access_count: 0,
            last_accessed_at: Date.now(),
          },
          { transaction }
        );
      }
      await transaction.commit();
    } catch (error) {
      console.log('err', error);

      await transaction.rollback();
    }
  },
  {
    name: 'saveGlobalMemoryIndex',
    description: '保存指定用户全局记忆索引工具',
    schema: z.object({
      userId: z.number().describe('用户ID'),
      content: z.string().describe('要保存的全局记忆索引内容'),
    }),
  }
);
// 获取指定用户指定记忆工具
export const getUserGlobalMemories = tool(
  async ({ userId, id }) => {
    const res = await AiGlobalChatMemories.findOne({
      where: {
        user_id: userId,
        id,
      },
      attributes: ['content'],
    });
    return res?.content || '';
  },
  {
    name: 'getUserGlobalMemories',
    description: '获取指定用户指定记忆工具',
    schema: z.object({
      userId: z.number().describe('用户ID'),
      id: z.number().describe('记忆ID'),
    }),
  }
);
// 保存指定用户全局记忆工具
export const saveUserGlobalMemories = tool(
  async ({ userId, content, category }) => {
    console.log('saveUserGlobalMemories', userId, content, category);
    try {
      const res = await AiGlobalChatMemories.create({
        user_id: userId,
        content,
        access_count: 0,
        category: category,
        skip_index: false,
        last_accessed_at: Date.now(),
      });
      return res.id.toString();
    } catch (error) {
      console.log('saveUserGlobalMemories error', error);
      return error instanceof Error ? error.message : 'Unknown error';
    }
  },
  {
    name: 'saveUserGlobalMemories',
    description: '保存指定用户全局记忆工具',
    schema: z.object({
      userId: z.number().describe('用户ID'),
      content: z.string().describe('要保存的全局记忆内容'),
      category: z.enum(Object.values(AiGlobalChatMemoryCategory)).describe('记忆主题'),
    }),
  }
);
// 保存指定用户指定会话的记忆工具
export const saveSessionMemories = tool(
  async ({ userId, content, threadId, lastMessageId }) => {
    const transaction = await sequelize.transaction();
    try {
      const sessionMemories = await AiSessionMemories.findOne({
        where: {
          user_id: userId,
          thread_id: threadId,
        },
        transaction,
      });
      if (sessionMemories) {
        await sessionMemories.update(
          {
            content,
            last_message_id: lastMessageId,
          },
          { transaction }
        );
      } else {
        await AiSessionMemories.create(
          {
            user_id: userId,
            content,
            last_message_id: lastMessageId,
            thread_id: threadId,
          },
          {
            transaction,
          }
        );
      }
      transaction.commit();
    } catch (error) {
      console.log('err', error);
      transaction.rollback();
    }
  },
  {
    name: 'saveSessionMemories',
    description: '保存指定用户指定会话的记忆工具',
    schema: z.object({
      userId: z.number().describe('用户ID'),
      content: z.string().describe('要保存的会话记忆'),
      threadId: z.string().describe('线程id(会话id)'),
      lastMessageId: z.string().describe('已处理到的最后一条消息ID'),
    }),
  }
);

// 获取指定用户指定会话的记忆工具
export const getSessionMemories = tool(
  async ({ userId, threadId }) => {
    return await fetchSessionMemories(userId, threadId);
  },
  {
    name: 'getSessionMemories',
    description: '获取指定用户指定会话的记忆工具',
    schema: z.object({
      userId: z.number().describe('用户ID'),
      threadId: z.string().describe('线程id(会话id)'),
    }),
  }
);
