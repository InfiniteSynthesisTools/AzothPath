/**
 * 统一时间处理工具 - UTC+8 时区
 * 所有时间相关操作都使用此工具确保一致性
 */

/**
 * 获取当前UTC+8时间
 * @returns 当前UTC+8时间的Date对象
 */
export function getCurrentUTC8Time(): Date {
  const now = new Date();
  // 获取UTC时间并转换为UTC+8
  const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return utc8Time;
}

/**
 * 获取当前UTC+8时间字符串 (ISO格式)
 * @returns 当前UTC+8时间的ISO字符串
 */
export function getCurrentUTC8TimeString(): string {
  return getCurrentUTC8Time().toISOString();
}

/**
 * 获取当前UTC+8时间字符串 (数据库格式: YYYY-MM-DD HH:mm:ss)
 * @returns 当前UTC+8时间的数据库格式字符串
 */
export function getCurrentUTC8TimeForDB(): string {
  const utc8Time = getCurrentUTC8Time();
  return formatDateTimeForDB(utc8Time);
}

/**
 * 将UTC时间转换为UTC+8时间字符串 (用于数据库存储)
 * @param utcDate UTC时间的Date对象
 * @returns UTC+8时间的数据库格式字符串
 */
export function convertUTCToUTC8ForDB(utcDate: Date): string {
  const utc8Time = convertUTCToUTC8(utcDate);
  return formatDateTimeForDB(utc8Time);
}

/**
 * 将Date对象格式化为数据库时间格式 (UTC+8)
 * @param date Date对象
 * @returns 格式化的时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTimeForDB(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 将数据库时间字符串转换为UTC+8的Date对象
 * @param dbTimeString 数据库时间字符串 (YYYY-MM-DD HH:mm:ss)
 * @returns UTC+8的Date对象
 */
export function parseDBTimeToUTC8(dbTimeString: string): Date {
  // 数据库存储的是UTC时间，需要转换为UTC+8
  const utcDate = new Date(dbTimeString + 'Z'); // 添加Z表示UTC时间
  return convertUTCToUTC8(utcDate);
}

/**
 * 将UTC时间转换为UTC+8时间
 * @param utcDate UTC时间的Date对象
 * @returns UTC+8的Date对象
 */
export function convertUTCToUTC8(utcDate: Date): Date {
  return new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
}

/**
 * 将UTC+8时间转换为UTC时间
 * @param utc8Date UTC+8时间的Date对象
 * @returns UTC的Date对象
 */
export function convertUTC8ToUTC(utc8Date: Date): Date {
  return new Date(utc8Date.getTime() - (8 * 60 * 60 * 1000));
}

/**
 * 格式化时间为显示格式 (UTC+8)
 * @param date Date对象或时间字符串
 * @param format 格式类型
 * @returns 格式化后的时间字符串
 */
export function formatTimeForDisplay(
  date: Date | string, 
  format: 'datetime' | 'date' | 'time' | 'relative' = 'datetime'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 确保是UTC+8时间
  const utc8Date = convertUTCToUTC8(dateObj);
  
  switch (format) {
    case 'datetime':
      return utc8Date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
    
    case 'date':
      return utc8Date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
    
    case 'time':
      return utc8Date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
    
    case 'relative':
      return formatRelativeTime(utc8Date);
    
    default:
      return utc8Date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  }
}

/**
 * 格式化相对时间 (UTC+8)
 * @param date Date对象
 * @returns 相对时间字符串
 */
function formatRelativeTime(date: Date): string {
  const now = getCurrentUTC8Time();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周前`;
  } else {
    return formatTimeForDisplay(date, 'date');
  }
}

/**
 * 验证时间字符串是否为有效的UTC+8时间格式
 * @param timeString 时间字符串
 * @returns 是否为有效格式
 */
export function isValidUTC8Time(timeString: string): boolean {
  const date = new Date(timeString);
  return !isNaN(date.getTime());
}

/**
 * 获取时间戳 (UTC+8)
 * @returns UTC+8时间戳
 */
export function getCurrentUTC8Timestamp(): number {
  return getCurrentUTC8Time().getTime();
}
