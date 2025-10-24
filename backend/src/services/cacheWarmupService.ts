import { logger } from '../utils/logger';
import { recipeService } from './recipeService';

/**
 * 缓存预热服务
 * 在服务器启动时预加载图缓存，避免首次请求时构建延迟
 */
export class CacheWarmupService {
  private isWarmingUp = false;
  private warmupPromise: Promise<void> | null = null;

  /**
   * 启动缓存预热
   */
  async warmup(): Promise<void> {
    if (this.isWarmingUp) {
      logger.info('缓存预热正在进行中，等待完成...');
      return this.warmupPromise!;
    }

    this.isWarmingUp = true;
    this.warmupPromise = this.performWarmup();

    return this.warmupPromise;
  }

  /**
   * 执行图缓存预热
   */
  private async performWarmup(): Promise<void> {
    logger.info('=== 开始缓存预热 ===');
    const startTime = Date.now();

    try {
      const cache = await recipeService['getGraphCache']();

      const duration = Date.now() - startTime;
      logger.success(
        `=== 缓存预热完成 (耗时: ${duration}ms) ===\n` +
        `图缓存: ${cache.recipes.length} 个配方, ${cache.allItemNames.length} 个物品`
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`缓存预热失败 (耗时: ${duration}ms)`, error);
      throw error;
    } finally {
      this.isWarmingUp = false;
      this.warmupPromise = null;
    }
  }
}

// 导出单例
export const cacheWarmupService = new CacheWarmupService();