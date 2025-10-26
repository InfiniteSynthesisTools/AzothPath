/**
 * Emoji 工具函数
 */

/**
 * 限制emoji显示为单个字符
 * 如果输入多个emoji，只返回第一个
 * @param emoji 原始emoji字符串
 * @returns 单个emoji字符
 */
export function truncateEmoji(emoji: string | undefined | null): string {
  if (!emoji) return '🔘';
  
  // 使用正则表达式匹配第一个完整的emoji
  // 这个正则表达式可以匹配大部分emoji，包括复合emoji（如肤色修饰符）
  const emojiMatch = emoji.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F0FF}]|[\u{1F200}-\u{1F2FF}]/u);
  
  if (emojiMatch) {
    return emojiMatch[0];
  }
  
  // 如果没有匹配到标准emoji，返回第一个字符
  return emoji.charAt(0);
}

/**
 * 检查字符串是否包含emoji
 * @param text 要检查的文本
 * @returns 是否包含emoji
 */
export function hasEmoji(text: string): boolean {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F0FF}]|[\u{1F200}-\u{1F2FF}]/u;
  return emojiRegex.test(text);
}

/**
 * 提取文本中的第一个emoji
 * @param text 包含emoji的文本
 * @returns 第一个emoji或默认emoji
 */
export function extractFirstEmoji(text: string): string {
  if (!text) return '🔘';
  
  const emojiMatch = text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F0FF}]|[\u{1F200}-\u{1F2FF}]/u);
  
  return emojiMatch ? emojiMatch[0] : '🔘';
}
