/**
 * 博客项目枚举类型定义
 * 对应数据库中的 ENUM 类型
 */

/**
 * 文章状态枚举
 * - draft: 草稿（草稿状态，不公开展示）
 * - published: 已发布（公开展示）
 * - archived: 已归档（归档处理，不再公开展示）
 */
export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * 评论状态枚举
 * - pending: 待审核（等待管理员审核）
 * - approved: 已通过（审核通过，正常显示）
 * - spam: 垃圾评论（标记为垃圾，不显示）
 * - trash: 已删除（放入回收站）
 */
export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SPAM = 'spam',
  TRASH = 'trash',
}

/**
 * 媒体用途类型枚举
 * - article: 文章配图（用于文章内容）
 * - avatar: 头像（用于用户/管理员头像）
 * - artwork: AI作品图片（用于AI作品展示）
 * - general: 通用用途（其他用途）
 */
export enum MediaUsageType {
  ARTICLE = 'article',
  AVATAR = 'avatar',
  ARTWORK = 'artwork',
  GENERAL = 'general',
}

/**
 * 文章媒体使用类型枚举
 * - thumbnail: 缩略图（文章列表展示用）
 * - attachment: 附件图（文章正文中的图片）
 */
export enum ArticleMediaUsage {
  THUMBNAIL = 'thumbnail',
  ATTACHMENT = 'attachment',
}

/**
 * AI作品媒体使用类型枚举
 * - main: 主展示图（画廊主图）
 * - thumbnail: 缩略图（列表展示用）
 * - process: 创作过程图（AI生成中间过程）
 * - variant: 变体图（同提示词不同生成结果）
 */
export enum ArtworkMediaUsage {
  MAIN = 'main',
  THUMBNAIL = 'thumbnail',
  PROCESS = 'process',
  VARIANT = 'variant',
}

/**
 * 关于我页面媒体使用类型枚举
 * - avatar: 头像
 * - content: 内容文件（Markdown格式）
 */
export enum AboutPageMediaUsage {
  AVATAR = 'avatar',
  CONTENT = 'content',
}

export type AboutPageMediaUsageLiteral = 'avatar' | 'content';

/**
 * AI作品状态枚举
 * - draft: 草稿（草稿状态，不公开展示）
 * - published: 已发布（公开展示）
 */
export enum ArtworkStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

/**
 * 配置值类型枚举
 * - string: 字符串类型
 * - number: 数字类型
 * - boolean: 布尔类型
 * - json: JSON 对象类型
 */
export enum SettingType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

// 字符串字面量类型映射
export type ArticleStatusLiteral = 'draft' | 'published' | 'archived';
export type CommentStatusLiteral = 'pending' | 'approved' | 'spam' | 'trash';
export type ArticleMediaUsageLiteral = 'thumbnail' | 'attachment' | 'content';
export type ArtworkMediaUsageLiteral = 'main' | 'thumbnail' | 'process' | 'variant';
export type ArtworkStatusLiteral = 'draft' | 'published';
export type SettingTypeLiteral = 'string' | 'number' | 'boolean' | 'json';

/**
 * 管理员状态枚举
 * - active: 活跃（正常状态，可登录）
 * - inactive: 停用（账户停用，无法登录）
 * - locked: 锁定（登录失败过多被锁定）
 */
export enum AdminStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked',
}
export type AdminStatusLiteral = 'active' | 'inactive' | 'locked';

/**
 * AI聊天用户状态枚举
 * - active: 活跃（正常状态，可使用AI聊天功能）
 * - blocked: 被封禁（账户被封禁，无法使用AI聊天功能）
 */
export enum AiChatUserStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

export type AiChatUserStatusLiteral = 'active' | 'blocked';

/**
 * ai聊天消息角色
 */
export enum AiChatMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export type AiChatMessageRoleLiteral = 'user' | 'assistant' | 'system'

export enum AiChatMessageType {
  TEXT = 'text',
  SYSTEM = 'system',
}

export type AiChatMessageTypeLiteral = 'text' | 'system'
