// 用户头像 Emoji 集合与工具函数

// Intl.Segmenter 类型声明（Node.js 16+ 支持）
declare namespace Intl {
  interface Segmenter {
    segment(input: string): Segments;
  }

  interface Segments {
    [Symbol.iterator](): Iterator<SegmentData>;
  }

  interface SegmentData {
    segment: string;
    index: number;
    input: string;
  }

  const Segmenter: {
    prototype: Segmenter;
    new(locales?: string | string[], options?: { granularity?: 'grapheme' | 'word' | 'sentence' }): Segmenter;
  };
}

// 挑选通用、跨平台表现良好的表情，避免过于小众或平台依赖的符号
export const USER_EMOJIS: string[] = [
  '😀', '😄', '😁', '😎', '🥳', '🤖', '🧙', '🧠', '🐼', '🐯', '🦊', '🐶', '🐱',
  '🐮', '🐨', '🦄', '🐲', '🐳', '🐬', '🐟', '🐝', '🦋', '🍀', '🌈', '🌟', '⚡',
  '🔥', '💎', '🎮', '🎲', '🎯', '🏆', '🧩', '🛡️', '⚔️', '🗡️', '🏹', '🚀', '🛸', '🛰️', '🧪', '🧬'
];

export function randomUserEmoji(seed?: number): string {
  // 简单的伪随机：可选 seed 便于可重复结果（测试用）
  const arr = USER_EMOJIS;
  if (!arr.length) return '🙂';
  let index: number;
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    // 线性同余生成器的简单一步
    const x = (seed * 9301 + 49297) % 233280;
    index = x % arr.length;
  } else {
    index = Math.floor(Math.random() * arr.length);
  }
  return arr[index];
}

const truncatedEmojiCache = new Map<string, string>();

/**
 * 截取 emoji 字符串的第一个字符（正确处理复合 emoji）
 * 支持 Node.js 环境，使用 Intl.Segmenter API
 */
export function truncateEmoji(emoji: string): string {
  if (!emoji) return emoji;

  // Check cache first
  if (truncatedEmojiCache.has(emoji)) {
    return truncatedEmojiCache.get(emoji)!;
  }

  let result = emoji;

  // Node.js 14+ 和现代浏览器都支持 Intl.Segmenter
  if ('Segmenter' in Intl) {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      const segments = segmenter.segment(emoji);
      const firstSegment = segments[Symbol.iterator]().next();

      if (!firstSegment.done) {
        result = firstSegment.value.segment;
      }
    } catch (e) {
      console.warn('Intl.Segmenter segmentation failed:', e);
      // Fallback: 简单截取前 2 个字符（大部分 emoji 在 1-2 个 UTF-16 码元）
      result = emoji.slice(0, 2);
    }
  } else {
    // Fallback for older Node.js versions
    // 简单正则匹配第一个 emoji（基础支持，不完美但可用）
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;
    const match = emoji.match(emojiRegex);
    if (match) {
      result = match[0];
    } else {
      // 最后的 fallback: 截取前 2 个字符
      result = emoji.slice(0, 2);
    }
  }

  // Cache the result
  truncatedEmojiCache.set(emoji, result);

  return result;
}

/**
 * Clear the emoji truncation cache.
 * Useful for testing or if memory becomes a concern.
 */
export function clearEmojiCache(): void {
  truncatedEmojiCache.clear();
}
