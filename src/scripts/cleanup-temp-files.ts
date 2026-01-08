import { initAllModels } from '../models';
import { cleanupExpiredTempFiles } from '../services/blog/mediaFile';

/**
 * 清理过期的临时媒体文件
 * 建议通过定时任务（如 cron）每天凌晨执行
 *
 * 使用方式:
 * npx ts-node src/scripts/cleanup-temp-files.ts
 */
async function main() {
  try {
    console.log('开始清理过期临时文件...');

    // 初始化数据库连接
    await initAllModels();

    // 执行清理
    const result = await cleanupExpiredTempFiles();

    console.log(`清理完成，删除了 ${result.deleted} 个过期临时文件`);
    process.exit(0);
  } catch (error) {
    console.error('清理过期临时文件失败:', error);
    process.exit(1);
  }
}

main();
