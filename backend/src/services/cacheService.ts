import { LRUCache } from '../utils/lruCache';
import { logger } from '../utils/logger';

/**
 * 缓存服务 - 用于优化COUNT查询和统计数据的缓存
 */
export class CacheService {
  private static instance: CacheService;
  private cache: LRUCache<string, any>;
  
  // 缓存键前缀
  private readonly PREFIX = {
    USER_STATS: 'user_stats:',
    RECIPE_COUNT: 'recipe_count:',
    ITEM_COUNT: 'item_count:',
    TASK_COUNT: 'task_count:',
    IMPORT_COUNT: 'import_count:',
    USER_LIST_COUNT: 'user_list_count:',
    RECIPE_LIST_COUNT: 'recipe_list_count:',
    ITEM_LIST_COUNT: 'item_list_count:'
  };

  private constructor() {
    // 设置缓存大小为1000个条目，TTL为5分钟
    this.cache = new LRUCache<string, any>(1000, 5 * 60 * 1000);
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * 获取用户统计缓存
   */
  getUserStats(userId: number): any | null {
    const key = `${this.PREFIX.USER_STATS}${userId}`;
    return this.cache.get(key);
  }

  /**
   * 设置用户统计缓存
   */
  setUserStats(userId: number, stats: any): void {
    const key = `${this.PREFIX.USER_STATS}${userId}`;
    this.cache.set(key, stats);
    logger.debug(`[缓存设置] 用户 ${userId} 统计信息已缓存`);
  }

  /**
   * 获取用户配方数量缓存
   */
  getUserRecipeCount(userId: number): number | null {
    const key = `${this.PREFIX.RECIPE_COUNT}${userId}`;
    return this.cache.get(key);
  }

  /**
   * 设置用户配方数量缓存
   */
  setUserRecipeCount(userId: number, count: number): void {
    const key = `${this.PREFIX.RECIPE_COUNT}${userId}`;
    this.cache.set(key, count);
  }

  /**
   * 获取用户物品数量缓存
   */
  getUserItemCount(userId: number): number | null {
    const key = `${this.PREFIX.ITEM_COUNT}${userId}`;
    return this.cache.get(key);
  }

  /**
   * 设置用户物品数量缓存
   */
  setUserItemCount(userId: number, count: number): void {
    const key = `${this.PREFIX.ITEM_COUNT}${userId}`;
    this.cache.set(key, count);
  }

  /**
   * 获取任务数量缓存
   */
  getTaskCount(status?: string): number | null {
    const key = `${this.PREFIX.TASK_COUNT}${status || 'all'}`;
    return this.cache.get(key);
  }

  /**
   * 设置任务数量缓存
   */
  setTaskCount(count: number, status?: string): void {
    const key = `${this.PREFIX.TASK_COUNT}${status || 'all'}`;
    this.cache.set(key, count);
  }

  /**
   * 获取导入任务数量缓存
   */
  getImportTaskCount(userId?: number): number | null {
    const key = `${this.PREFIX.IMPORT_COUNT}${userId || 'all'}`;
    return this.cache.get(key);
  }

  /**
   * 设置导入任务数量缓存
   */
  setImportTaskCount(count: number, userId?: number): void {
    const key = `${this.PREFIX.IMPORT_COUNT}${userId || 'all'}`;
    this.cache.set(key, count);
  }

  /**
   * 获取用户列表总数缓存
   */
  getUserListCount(conditions: string): number | null {
    const key = `${this.PREFIX.USER_LIST_COUNT}${this.hashString(conditions)}`;
    return this.cache.get(key);
  }

  /**
   * 设置用户列表总数缓存
   */
  setUserListCount(conditions: string, count: number): void {
    const key = `${this.PREFIX.USER_LIST_COUNT}${this.hashString(conditions)}`;
    this.cache.set(key, count);
  }

  /**
   * 获取配方列表总数缓存
   */
  getRecipeListCount(conditions: string): number | null {
    const key = `${this.PREFIX.RECIPE_LIST_COUNT}${this.hashString(conditions)}`;
    return this.cache.get(key);
  }

  /**
   * 设置配方列表总数缓存
   */
  setRecipeListCount(conditions: string, count: number): void {
    const key = `${this.PREFIX.RECIPE_LIST_COUNT}${this.hashString(conditions)}`;
    this.cache.set(key, count);
  }

  /**
   * 获取物品列表总数缓存
   */
  getItemListCount(conditions: string): number | null {
    const key = `${this.PREFIX.ITEM_LIST_COUNT}${this.hashString(conditions)}`;
    return this.cache.get(key);
  }

  /**
   * 设置物品列表总数缓存
   */
  setItemListCount(conditions: string, count: number): void {
    const key = `${this.PREFIX.ITEM_LIST_COUNT}${this.hashString(conditions)}`;
    this.cache.set(key, count);
  }

  /**
   * 清除用户相关缓存
   */
  invalidateUserCache(userId: number): void {
    const keys = [
      `${this.PREFIX.USER_STATS}${userId}`,
      `${this.PREFIX.RECIPE_COUNT}${userId}`,
      `${this.PREFIX.ITEM_COUNT}${userId}`,
      `${this.PREFIX.IMPORT_COUNT}${userId}`
    ];
    
    keys.forEach(key => this.cache.delete(key));
    logger.debug(`[缓存清除] 用户 ${userId} 相关缓存已清除`);
  }

  /**
   * 清除配方相关缓存
   */
  invalidateRecipeCache(): void {
    const keys = Object.keys(this.cache['cache']).filter(key => 
      key.startsWith(this.PREFIX.RECIPE_COUNT) || 
      key.startsWith(this.PREFIX.RECIPE_LIST_COUNT)
    );
    
    keys.forEach(key => this.cache.delete(key));
    logger.debug('[缓存清除] 配方相关缓存已清除');
  }

  /**
   * 清除任务相关缓存
   */
  invalidateTaskCache(): void {
    const keys = Object.keys(this.cache['cache']).filter(key => 
      key.startsWith(this.PREFIX.TASK_COUNT)
    );
    
    keys.forEach(key => this.cache.delete(key));
    logger.debug('[缓存清除] 任务相关缓存已清除');
  }

  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.cache.clear();
    logger.debug('[缓存清除] 所有缓存已清除');
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { 
    size: number; 
    maxSize: number; 
    ttl: number | undefined; 
    keys: string[]; 
    hits: number; 
    misses: number; 
    hitRate: number; 
    missRate: number 
  } {
    return this.cache.getStats();
  }

  /**
   * 简单的字符串哈希函数
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}