/**
 * 通用 LRU (Least Recently Used) 缓存类
 * 支持 TTL (Time To Live) 和最大容量限制
 * 
 * 特点：
 * - O(1) 时间复杂度的 get/set 操作
 * - 自动删除最久未使用的项
 * - 支持过期时间设置
 * - 线程安全的缓存清理
 */
export class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private maxSize: number;
  private ttl?: number; // 毫秒单位，undefined 表示无过期时间
  private hits: number = 0;
  private misses: number = 0;

  /**
   * @param maxSize 最大缓存项数，超过此数会删除最久未使用的项
   * @param ttl 可选，项的生存时间（毫秒）
   */
  constructor(maxSize: number = 100, ttl?: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 获取缓存值
   * @returns 如果键存在且未过期返回值，否则返回 undefined
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      return undefined;
    }

    // 检查 TTL
    if (this.ttl && Date.now() - item.timestamp > this.ttl) {
      // 已过期，删除并返回 undefined
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // 更新访问时间（通过重新插入 Map 使其移到末尾）
    this.cache.delete(key);
    this.cache.set(key, item);
    this.hits++;

    return item.value;
  }

  /**
   * 设置缓存值
   */
  set(key: K, value: V): void {
    // 如果键已存在，先删除它（这样它会在最后）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 添加新项
    this.cache.set(key, { value, timestamp: Date.now() });

    // 如果超过最大容量，删除最久未使用的项（Map 的第一项）
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value as K;
      this.cache.delete(firstKey);
    }
  }

  /**
   * 检查键是否存在且未过期
   */
  has(key: K): boolean {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // 检查 TTL
    if (this.ttl && Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除指定键
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取当前缓存项数
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number | undefined;
    keys: K[];
    hits: number;
    misses: number;
    hitRate: number;
    missRate: number;
  } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    const missRate = total > 0 ? this.misses / total : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      keys: Array.from(this.cache.keys()),
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate,
      missRate: missRate
    };
  }

  /**
   * 清理过期项
   * @returns 清理的项数
   */
  cleanExpired(): number {
    if (!this.ttl) {
      return 0; // 没有设置 TTL，无需清理
    }

    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

