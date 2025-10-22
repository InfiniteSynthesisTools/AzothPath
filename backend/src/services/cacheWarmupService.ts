import { logger } from '../utils/logger';
import { recipeService } from './recipeService';

/**
 * 缓存预热服务
 * 在服务器启动时预加载图缓存和冰柱图缓存，避免前端首次访问时等待
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
   * 执行实际的缓存预热
   */
  private async performWarmup(): Promise<void> {
    logger.info('=== 开始缓存预热 ===');
    const startTime = Date.now();

    try {
      // 1. 预热图缓存（包含最短路径树）
      logger.info('正在预热图缓存...');
      await this.warmupGraphCache();
      
      // 2. 预热冰柱图缓存
      logger.info('正在预热冰柱图缓存...');
      await this.warmupIcicleCache();
      
      const duration = Date.now() - startTime;
      logger.success(`=== 缓存预热完成 (耗时: ${duration}ms) ===`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`缓存预热失败 (耗时: ${duration}ms)`, error);
      throw error;
    } finally {
      this.isWarmingUp = false;
      this.warmupPromise = null;
    }
  }

  /**
   * 预热图缓存
   */
  private async warmupGraphCache(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 调用 getGraphCache 方法，如果缓存不存在会自动构建
      const cache = await recipeService['getGraphCache']();
      
      const duration = Date.now() - startTime;
      logger.success(`图缓存预热完成: ${cache.recipes.length} 个配方, ${cache.allItemNames.length} 个物品 (耗时: ${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`图缓存预热失败 (耗时: ${duration}ms)`, error);
      throw error;
    }
  }

  /**
   * 预热冰柱图缓存
   */
  private async warmupIcicleCache(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 调用 generateIcicleChart 方法，如果缓存不存在会自动构建
      const icicleData = await recipeService.generateIcicleChart();
      
      const duration = Date.now() - startTime;
      logger.success(`冰柱图缓存预热完成: ${icicleData.nodes.length} 个节点 (耗时: ${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`冰柱图缓存预热失败 (耗时: ${duration}ms)`, error);
      throw error;
    }
  }

  /**
   * 检查缓存预热状态
   */
  getWarmupStatus(): { isWarmingUp: boolean; isCompleted: boolean } {
    return {
      isWarmingUp: this.isWarmingUp,
      isCompleted: !this.isWarmingUp && this.warmupPromise === null
    };
  }
}

// 导出单例
export const cacheWarmupService = new CacheWarmupService();