/**
 * 日期时间戳工具函数
 * 统一管理毫秒级时间戳的创建和转换
 */

/**
 * 获取当前毫秒级 Unix 时间戳
 * @returns 当前时间的毫秒级时间戳
 * @example getCurrentTimestamp() // 1704067200000
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * 将毫秒级时间戳转换为 ISO 8601 字符串
 * @param timestamp - 毫秒级 Unix 时间戳
 * @returns ISO 8601 格式的日期字符串，如 "2026-01-01T12:00:00.000Z"
 * @example timestampToISO(1704067200000) // "2024-01-01T00:00:00.000Z"
 */
export function timestampToISO(timestamp: number | null | undefined): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toISOString();
}

/**
 * 将 Date 对象转换为毫秒级时间戳
 * @param date - JavaScript Date 对象
 * @returns 毫秒级时间戳
 * @example dateToTimestamp(new Date('2024-01-01')) // 1704067200000
 */
export function dateToTimestamp(date: Date | null | undefined): number | null {
  if (!date) return null;
  return date.getTime();
}

/**
 * 将 ISO 字符串转换为毫秒级时间戳
 * @param isoString - ISO 8601 格式的日期字符串
 * @returns 毫秒级时间戳
 * @example isoToTimestamp("2024-01-01T00:00:00.000Z") // 1704067200000
 */
export function isoToTimestamp(isoString: string | null | undefined): number | null {
  if (!isoString) return null;
  return new Date(isoString).getTime();
}
