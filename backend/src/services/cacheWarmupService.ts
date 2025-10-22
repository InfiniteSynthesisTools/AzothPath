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
      
      // 2. 智能预热常用物品数据
      logger.info('正在智能预热常用物品数据...');
      await this.smartWarmupPopularItems();
      
      // 3. 预热冰柱图缓存
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
   * 智能预热常用物品数据
   */
  private async smartWarmupPopularItems(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const cache = await recipeService.getGraphCache();
      const reachableItems = Array.from(cache.reachableItems);
      
      // 获取常用物品列表（按广度排序）
      const popularItems = this.getPopularItems(reachableItems, cache.itemToRecipes);
      
      if (popularItems.length === 0) {
        logger.info('没有找到常用物品，跳过智能预热');
        return;
      }
      
      logger.info(`智能预热 ${popularItems.length} 个常用物品`);
      
      // 分批预热，避免内存压力
      await this.warmupItemsInBatches(popularItems);
      
      const duration = Date.now() - startTime;
      logger.success(`常用物品智能预热完成：${popularItems.length} 个物品 (耗时: ${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`常用物品智能预热失败 (耗时: ${duration}ms)`, error);
      throw error;
    }
  }
  
  /**
   * 获取常用物品列表（按广度排序）
   */
  private getPopularItems(
    items: string[], 
    itemToRecipes: Record<string, any[]>
  ): string[] {
    // 计算每个物品的广度（能合成该物品的配方数量）
    const itemsWithBreadth = items.map(itemName => ({
      name: itemName,
      breadth: (itemToRecipes[itemName] || []).length
    }));
    
    // 按广度降序排序
    itemsWithBreadth.sort((a, b) => b.breadth - a.breadth);
    
    // 取前N个常用物品
    return itemsWithBreadth
      .slice(0, this.TOP_ITEMS_TO_WARMUP)
      .map(item => item.name);
  }
  
  /**
   * 分批预热物品数据
   */
  private async warmupItemsInBatches(items: string[]): Promise<void> {
    const batches: string[][] = [];
    
    // 创建批次
    for (let i = 0; i < items.length; i += this.WARMUP_BATCH_SIZE) {
      batches.push(items.slice(i, i + this.WARMUP_BATCH_SIZE));
    }
    
    logger.info(`物品预热：共 ${items.length} 个物品，分为 ${batches.length} 个批次`);
    
    // 依次处理每个批次
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`预热批次 ${i + 1}/${batches.length} (${batch.length} 个物品)`);
      
      await this.warmupSingleBatch(batch);
      
      // 批次间延迟，避免资源竞争
      if (i < batches.length - 1) {
        await this.delay(this.WARMUP_DELAY_MS);
      }
    }
  }
  
  /**
   * 预热单个批次
   */
  private async warmupSingleBatch(batch: string[]): Promise<void> {
    const cache = await recipeService.getGraphCache();
    
    // 检查冰柱图缓存是否已存在，如果存在则跳过预热
    if (recipeService['icicleCache'] && recipeService['icicleCache'].data) {
      logger.debug(`冰柱图缓存已存在，跳过批次预热`);
      return;
    }
    
    // 并行预热批次中的物品
    const promises = batch.map(async itemName => {
      try {
        const tree = cache.shortestPathTrees.get(itemName);
        if (tree) {
          // 只预热单个物品的最短路径树，不重复生成整个冰柱图
          // 这里只需要确保最短路径树已计算，不需要重复生成冰柱图
          logger.debug(`物品 ${itemName} 最短路径树已预热`);
        }
      } catch (error) {
        // 单个物品预热失败不影响整体
        logger.debug(`物品 ${itemName} 预热失败：`, error);
      }
    });
    
    await Promise.all(promises);
  }
  
  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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