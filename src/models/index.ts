/**
 * 模型索引文件
 * 导出所有模型并定义模型关联关系
 */

export { sequelize } from './db';

// 枚举类型
export * from './enums';

// 模型
export { Category, initCategoryModel } from './category';
export { MediaFile, initMediaFileModel } from './media-file';
export { Article, initArticleModel } from './article';
export { Comment, initCommentModel } from './comment';
export { AIArtwork, initAIArtworkModel } from './ai-artwork';
export { SiteSetting, initSiteSettingModel } from './site-setting';
export { AboutPage, initAboutPageModel } from './about-page';
export { AboutPageMedia, initAboutPageMediaModel } from './about-page-media';
export { SearchLog, initSearchLogModel } from './search-log';
export { ArticleCategory, initArticleCategoryModel } from './article-category';
export { ArticleMedia, initArticleMediaModel } from './article-media';
export { ArtworkMedia, initArtworkMediaModel } from './artwork-media';
export { AdminUser, initAdminUserModel } from './admin-user';
export { TempMedia, initTempMediaModel, TEMP_FILE_EXPIRY } from './temp-media';
export { BigFileRecord, initBigFileRecordModel } from './big-file-record';
export { BigFileChunk, initBigFileChunkModel } from './big-file-chunk';
export { AiChatUsers, initAiChatUsersModel } from './ai-chat-users';

// 类型导出
export type { CategoryAttributes, CategoryCreationAttributes } from './category';
export type { MediaFileAttributes, MediaFileCreationAttributes } from './media-file';
export type { ArticleAttributes, ArticleCreationAttributes } from './article';
export type { CommentAttributes, CommentCreationAttributes } from './comment';
export type { AIArtworkAttributes, AIArtworkCreationAttributes } from './ai-artwork';
export type { SiteSettingAttributes, SiteSettingCreationAttributes } from './site-setting';
export type { AboutPageAttributes, AboutPageCreationAttributes, AboutSkill, AboutSkillItem, AboutTimelineItem } from './about-page';
export type { SearchLogAttributes, SearchLogCreationAttributes } from './search-log';
export type {
  ArticleCategoryAttributes,
  ArticleCategoryCreationAttributes,
} from './article-category';
export type { ArticleMediaAttributes, ArticleMediaCreationAttributes } from './article-media';
export type { ArtworkMediaAttributes, ArtworkMediaCreationAttributes } from './artwork-media';
export type { AdminUserAttributes, AdminUserCreationAttributes } from './admin-user';
export type { TempMediaAttributes, TempMediaCreationAttributes } from './temp-media';
export type { BigFileRecordAttributes, BigFileRecordCreationAttributes } from './big-file-record';
export type { BigFileChunkAttributes, BigFileChunkCreationAttributes } from './big-file-chunk';
export type { AiChatUsersAttributes, AiChatUsersCreationAttributes } from './ai-chat-users';


/**
 * 初始化所有模型
 * @param force - 是否强制重新创建表（会删除现有数据）
 * @param alter - 是否更新表结构（安全模式）
 * @returns 同步结果
 */
export async function initAllModels(force = false, alter = false) {
  // 导入模型（避免循环依赖）
  const { sequelize } = await import('./db');
  const { initCategoryModel } = await import('./category');
  const { initMediaFileModel } = await import('./media-file');
  const { initArticleModel } = await import('./article');
  const { initCommentModel } = await import('./comment');
  const { initAIArtworkModel } = await import('./ai-artwork');
  const { initSiteSettingModel } = await import('./site-setting');
  const { initAboutPageModel } = await import('./about-page');
  const { initAboutPageMediaModel } = await import('./about-page-media');
  const { initSearchLogModel } = await import('./search-log');
  const { initArticleCategoryModel } = await import('./article-category');
  const { initArticleMediaModel } = await import('./article-media');
  const { initArtworkMediaModel } = await import('./artwork-media');
  const { initAdminUserModel } = await import('./admin-user');
  const { initTempMediaModel } = await import('./temp-media');
  const { initBigFileRecordModel } = await import('./big-file-record');
  const { initBigFileChunkModel } = await import('./big-file-chunk');
  const { initAiChatUsersModel } = await import('./ai-chat-users');

  // 初始化所有模型
  const Category = initCategoryModel(sequelize);
  const MediaFile = initMediaFileModel(sequelize);
  const Article = initArticleModel(sequelize);
  const Comment = initCommentModel(sequelize);
  const AIArtwork = initAIArtworkModel(sequelize);
  const SiteSetting = initSiteSettingModel(sequelize);
  const AboutPage = initAboutPageModel(sequelize);
  const AboutPageMedia = initAboutPageMediaModel(sequelize);
  const SearchLog = initSearchLogModel(sequelize);
  const ArticleCategory = initArticleCategoryModel(sequelize);
  const ArticleMedia = initArticleMediaModel(sequelize);
  const ArtworkMedia = initArtworkMediaModel(sequelize);
  const AdminUser = initAdminUserModel(sequelize);
  const TempMedia = initTempMediaModel(sequelize);
  const BigFileRecord = initBigFileRecordModel(sequelize);
  const BigFileChunk = initBigFileChunkModel(sequelize);
  const AiChatUsers = initAiChatUsersModel(sequelize);

  // 定义模型关联关系

  // === 文章系统关联 ===

  // Article <-> Category (多对多，通过 ArticleCategory)
  Article.belongsToMany(Category, {
    through: ArticleCategory,
    foreignKey: 'articleId',
    otherKey: 'categoryId',
    as: 'categories',
  });
  Category.belongsToMany(Article, {
    through: ArticleCategory,
    foreignKey: 'categoryId',
    otherKey: 'articleId',
    as: 'articles',
  });

  // Article <-> ArticleCategory
  Article.hasMany(ArticleCategory, {
    foreignKey: 'articleId',
    as: 'articleCategories',
    onDelete: 'CASCADE',
  });
  ArticleCategory.belongsTo(Article, {
    foreignKey: 'articleId',
    as: 'article',
  });

  // Category <-> ArticleCategory
  Category.hasMany(ArticleCategory, {
    foreignKey: 'categoryId',
    as: 'articleCategories',
    onDelete: 'CASCADE',
  });
  ArticleCategory.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category',
  });

  // Article <-> Comment
  Article.hasMany(Comment, {
    foreignKey: 'articleId',
    as: 'comments',
    onDelete: 'CASCADE',
  });
  Comment.belongsTo(Article, {
    foreignKey: 'articleId',
    as: 'article',
  });

  // Comment 自关联（嵌套回复）
  Comment.hasMany(Comment, {
    foreignKey: 'parentId',
    as: 'replies',
    onDelete: 'CASCADE',
  });
  Comment.belongsTo(Comment, {
    foreignKey: 'parentId',
    as: 'parent',
  });

  // Article <-> MediaFile (多对多，通过 ArticleMedia)
  Article.belongsToMany(MediaFile, {
    through: ArticleMedia,
    foreignKey: 'articleId',
    otherKey: 'mediaId',
    as: 'mediaFiles',
  });
  MediaFile.belongsToMany(Article, {
    through: ArticleMedia,
    foreignKey: 'mediaId',
    otherKey: 'articleId',
    as: 'articles',
  });

  // Article <-> ArticleMedia
  Article.hasMany(ArticleMedia, {
    foreignKey: 'articleId',
    as: 'articleMedias',
    onDelete: 'CASCADE',
  });
  ArticleMedia.belongsTo(Article, {
    foreignKey: 'articleId',
    as: 'article',
  });

  // MediaFile <-> ArticleMedia
  MediaFile.hasMany(ArticleMedia, {
    foreignKey: 'mediaId',
    as: 'articleMedias',
    onDelete: 'RESTRICT', // 防止误删除仍在使用的媒体文件
  });
  ArticleMedia.belongsTo(MediaFile, {
    foreignKey: 'mediaId',
    as: 'media',
  });

  // === AI作品系统关联 ===

  // AIArtwork <-> MediaFile (多对多，通过 ArtworkMedia)
  AIArtwork.belongsToMany(MediaFile, {
    through: ArtworkMedia,
    foreignKey: 'artworkId',
    otherKey: 'mediaId',
    as: 'mediaFiles',
  });
  MediaFile.belongsToMany(AIArtwork, {
    through: ArtworkMedia,
    foreignKey: 'mediaId',
    otherKey: 'artworkId',
    as: 'artworks',
  });

  // AIArtwork <-> ArtworkMedia
  AIArtwork.hasMany(ArtworkMedia, {
    foreignKey: 'artworkId',
    as: 'artworkMedias',
    onDelete: 'CASCADE',
  });
  ArtworkMedia.belongsTo(AIArtwork, {
    foreignKey: 'artworkId',
    as: 'artwork',
  });

  // MediaFile <-> ArtworkMedia
  MediaFile.hasMany(ArtworkMedia, {
    foreignKey: 'mediaId',
    as: 'artworkMedias',
    onDelete: 'RESTRICT', // 防止误删除仍在使用的媒体文件
  });
  ArtworkMedia.belongsTo(MediaFile, {
    foreignKey: 'mediaId',
    as: 'media',
  });

  // === 关于我页面关联 ===

  // AboutPage <-> AboutPageMedia
  AboutPage.hasMany(AboutPageMedia, {
    foreignKey: 'aboutPageId',
    as: 'aboutPageMedias',
    onDelete: 'CASCADE',
  });
  AboutPageMedia.belongsTo(AboutPage, {
    foreignKey: 'aboutPageId',
    as: 'aboutPage',
  });

  // MediaFile <-> AboutPageMedia
  MediaFile.hasMany(AboutPageMedia, {
    foreignKey: 'mediaId',
    as: 'aboutPageMedias',
    onDelete: 'RESTRICT',
  });
  AboutPageMedia.belongsTo(MediaFile, {
    foreignKey: 'mediaId',
    as: 'media',
  });

  // === 大文件系统关联 ===
  // 注意：BigFileRecord.identifier 是 VARCHAR(36)，BigFileChunk.fileIdentifier 也是 VARCHAR(36)
  // 由于不是自增 ID 外键，不创建数据库外键约束，只保留逻辑关联
  // BigFileRecord.hasMany(BigFileChunk, { foreignKey: 'fileIdentifier', as: 'chunks', onDelete: 'CASCADE' });
  // BigFileChunk.belongsTo(BigFileRecord, { foreignKey: 'fileIdentifier', as: 'fileRecord' });

  // === 同步数据库 ===
  const syncOptions: { force: boolean; alter: boolean } = { force, alter };
  await sequelize.sync(syncOptions);

  return {
    Category,
    MediaFile,
    Article,
    Comment,
    AIArtwork,
    SiteSetting,
    AboutPage,
    AboutPageMedia,
    SearchLog,
    ArticleCategory,
    ArticleMedia,
    ArtworkMedia,
    AdminUser,
    TempMedia,
    BigFileRecord,
    BigFileChunk,
    AiChatUsers,
  };
}

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    const { sequelize } = await import('./db');
    await sequelize.authenticate();
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
}
