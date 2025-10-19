/**
 * 时间工具函数 - 统一处理UTC+8时间显示
 */

/**
 * 格式化日期为本地时间字符串 (UTC+8)
 * @param dateString 日期字符串
 * @param options 格式化选项
 * @returns 格式化后的日期字符串
 */
export const formatDate = (dateString: string, options?: {
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
}) => {
  const date = new Date(dateString);
  
  // 转换为UTC+8时间
  const utc8Date = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  
  const defaultOptions = {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    ...options
  };
  
  return utc8Date.toLocaleDateString('zh-CN', defaultOptions);
};

/**
 * 格式化日期时间为本地时间字符串 (UTC+8)
 * @param dateString 日期字符串
 * @returns 格式化后的日期时间字符串
 */
export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  
  // 转换为UTC+8时间
  const utc8Date = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  
  return utc8Date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * 格式化相对时间 (UTC+8)
 * @param dateString 日期字符串
 * @returns 相对时间字符串
 */
export const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  
  // 转换为UTC+8时间
  const utc8Date = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  const now = new Date();
  
  // 当前时间也转换为UTC+8
  const utc8Now = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  
  const diffMs = utc8Now.getTime() - utc8Date.getTime();
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
    return formatDate(dateString);
  }
};

/**
 * 格式化时间为简洁格式 (UTC+8)
 * @param dateString 日期字符串
 * @returns 简洁格式时间字符串
 */
export const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  
  // 转换为UTC+8时间
  const utc8Date = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  const now = new Date();
  
  // 当前时间也转换为UTC+8
  const utc8Now = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  
  const diff = utc8Now.getTime() - utc8Date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return utc8Date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * 获取当前UTC+8时间
 * @returns 当前UTC+8时间的Date对象
 */
export const getCurrentUTC8Time = () => {
  const now = new Date();
  return new Date(now.getTime() + (8 * 60 * 60 * 1000));
};

/**
 * 获取当前UTC+8时间字符串
 * @returns 当前UTC+8时间的ISO字符串
 */
export const getCurrentUTC8TimeString = () => {
  return getCurrentUTC8Time().toISOString();
};
