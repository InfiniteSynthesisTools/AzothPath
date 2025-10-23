// 用户头像 Emoji 集合与工具函数
// 挑选通用、跨平台表现良好的表情，避免过于小众或平台依赖的符号

export const USER_EMOJIS: string[] = [
  '😀','😄','😁','😎','🥳','🤖','🧙','🧠','🐼','🐯','🦊','🐶','🐱',
  '🐮','🐨','🦄','🐲','🐳','🐬','🐟','🐝','🦋','🍀','🌈','🌟','⚡',
  '🔥','💎','🎮','🎲','🎯','🏆','🧩','🛡️','⚔️','🗡️','🏹','🚀','🛸','🛰️','🧪','🧬'
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
