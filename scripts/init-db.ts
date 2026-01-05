/**
 * 数据库初始化脚本
 * 用于手动同步模型到数据库
 *
 * 使用方法:
 *   npx ts-node scripts/init-db.ts          # 同步模型（安全模式）
 *   npx ts-node scripts/init-db.ts --force  # 强制重新创建表（会删除数据）
 *   npx ts-node scripts/init-db.ts --alter  # 更新表结构
 */

import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const alter = args.includes('--alter');

  console.log('开始初始化数据库...');
  console.log(`模式: ${force ? '强制重建' : alter ? '更新结构' : '安全同步'}`);

  try {
    // 测试数据库连接
    const { testConnection } = await import('../src/models');
    const connected = await testConnection();
    if (!connected) {
      console.error('数据库连接失败，请检查配置');
      process.exit(1);
    }

    // 初始化所有模型并同步
    const { initAllModels } = await import('../src/models');
    await initAllModels(force, alter);

    console.log('数据库初始化完成！');

    // 插入初始化数据
    await seedInitialData();
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

/**
 * 插入初始化数据
 */
async function seedInitialData() {
  console.log('正在插入初始化数据...');

  try {
    const { Category, SiteSetting, AboutPage } = await import('../src/models');

    // 检查是否已有数据
    const categoryCount = await Category.count();
    if (categoryCount === 0) {
      // 插入初始分类
      const now = Date.now();
      await Category.bulkCreate([
        { name: '技术学习', slug: 'tech', createdAt: now, updatedAt: now },
        { name: '生活故事', slug: 'life', createdAt: now, updatedAt: now },
        { name: 'AI创作', slug: 'ai', createdAt: now, updatedAt: now },
      ]);
      console.log('✓ 分类数据插入完成');
    } else {
      console.log('分类数据已存在，跳过');
    }

    // 检查网站配置
    const settingCount = await SiteSetting.count();
    if (settingCount === 0) {
      const now = Date.now();
      await SiteSetting.bulkCreate([
        {
          settingKey: 'site_title',
          settingValue: '暖木博客',
          settingType: 'string',
          description: '网站标题',
          updatedAt: now,
        },
        {
          settingKey: 'site_description',
          settingValue: '一个探索科技、设计、生活及AI创作潜能的个人博客',
          settingType: 'string',
          description: '网站描述',
          updatedAt: now,
        },
        {
          settingKey: 'site_keywords',
          settingValue: '博客,技术,生活,AI,设计',
          settingType: 'string',
          description: '网站关键词',
          updatedAt: now,
        },
        {
          settingKey: 'posts_per_page',
          settingValue: '12',
          settingType: 'number',
          description: '每页文章数量',
          updatedAt: now,
        },
        {
          settingKey: 'enable_comments',
          settingValue: 'true',
          settingType: 'boolean',
          description: '是否开启评论',
          updatedAt: now,
        },
        {
          settingKey: 'comment_moderation',
          settingValue: 'true',
          settingType: 'boolean',
          description: '评论是否需要审核',
          updatedAt: now,
        },
        {
          settingKey: 'footer_copyright',
          settingValue: '© 2025 暖木博客. 版权所有.',
          settingType: 'string',
          description: '页脚版权信息',
          updatedAt: now,
        },
      ]);
      console.log('✓ 网站配置数据插入完成');
    } else {
      console.log('网站配置已存在，跳过');
    }

    // 检查关于页面
    const aboutCount = await AboutPage.count();
    if (aboutCount === 0) {
      const now = Date.now();
      await AboutPage.create({
        title: '关于我',
        content: '# 欢迎来到我的空间\n\n一个探索科技、设计、生活及AI创作潜能的个人博客。',
        contactInfo: { email: 'example@email.com', location: '中国' },
        socialLinks: {
          github: 'https://github.com/username',
          twitter: 'https://twitter.com/username',
        },
        skills: ['Web开发', '数据库设计', 'AI艺术', '极简主义设计'],
        updatedAt: now,
      });
      console.log('✓ 关于页面数据插入完成');
    } else {
      console.log('关于页面数据已存在，跳过');
    }

    console.log('初始化数据插入完成！');
  } catch (error) {
    console.error('插入初始化数据失败:', error);
    // 不退出，继续运行
  }
}

// 运行主函数
main();
