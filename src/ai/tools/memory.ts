// 记忆工具
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { AiGlobalChatMemories, AiGlobalChatMemoryCategory, sequelize } from '@/models';

// 获取指定用户全局记忆索引工具
export const getGlobalMemoryIndex = tool(
  async ({ userId }) => {
    const res = await AiGlobalChatMemories.findOne({
      where: {
        user_id: userId,
        skip_index: true,
      },
      attributes: ['content'],
    });
    return res?.content || '';
  },
  {
    name: 'getGlobalMemoryIndex',
    description: '获取指定用户全局记忆索引工具',
    schema: z.object({
      userId: z.number().describe('用户ID'),
    }),
  }
);
// 保存指定用户全局记忆索引工具
export const saveGlobalMemoryIndex = tool(
  async ({ userId, content }) => {
    console.log('saveGlobalMemoryIndex', userId, content);
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
