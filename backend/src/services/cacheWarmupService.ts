import { logger } from '../utils/logger';
import { recipeService } from './recipeService';
import { IncrementalProcessingService } from './incrementalProcessingService';

/**
 * 缓存预热服务
 * 在服务器启动时预加载图缓存和冰柱图缓存，避免前端首次访问时等待
 * 支持增量预热和智能预热策略
 */
export class CacheWarmupService {
  private isWarmingUp = false;
  private warmupPromise: Promise<void> | null = null;
  private incrementalService: IncrementalProcessingService;
  
  // 预热配置
  private readonly WARMUP_BATCH_SIZE = 500; // 每批预热500个物品
  private readonly TOP_ITEMS_TO_WARMUP = 2000; // 预热前2000个常用物品
  private readonly WARMUP_DELAY_MS = 1000; // 批次间延迟1秒

  constructor() {
    this.incrementalService = new IncrementalProcessingService(recipeService);
  }

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
      
      // 🆕 按需生成架构：不再预热冰柱图缓存
      logger.info('新架构：冰柱图采用按需生成模式，跳过预热');
      
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
   * 检查缓存预热状态
   */
  getWarmupStatus(): { isWarmingUp: boolean; isCompleted: boolean } {
    return {
      isWarmingUp: this.isWarmingUp,
      isCompleted: !this.isWarmingUp && this.warmupPromise === null
    };
  }
  
  /**
   * 获取预热统计信息
   */
  getWarmupStats() {
    return {
      batchSize: this.WARMUP_BATCH_SIZE,
      topItems: this.TOP_ITEMS_TO_WARMUP,
      warmupDelay: this.WARMUP_DELAY_MS
    };
  }
}

// 导出单例
export const cacheWarmupService = new CacheWarmupService();