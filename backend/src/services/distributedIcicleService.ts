import { logger } from '../utils/logger';
import { RecipeService } from './recipeService';
import { IcicleNode, IcicleChartData, Recipe } from './recipeService';

/**
 * 分布式冰柱图服务
 * 为大数据量场景设计的可扩展架构
 */
export class DistributedIcicleService {
  private recipeService: RecipeService;
  
  // 分布式配置
  private readonly SHARD_SIZE = 1000; // 每个分片处理1000个物品
  private readonly MAX_CONCURRENT_WORKERS = 4; // 最大并发worker数
  
  // 多级缓存配置
  private readonly MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5分钟
  private readonly REDIS_CACHE_TTL = 60 * 60 * 1000; // 1小时
  
  constructor(recipeService: RecipeService) {
    this.recipeService = recipeService;
  }
  
  /**
   * 分布式生成冰柱图数据
   */
  async generateDistributedIcicleChart(limit?: number): Promise<IcicleChartData> {
    const startTime = Date.now();
    
    try {
      // 1. 检查多级缓存
      const cachedResult = await this.getFromMultiLevelCache();
      if (cachedResult) {
        logger.info('分布式冰柱图：多级缓存命中');
        return cachedResult;
      }
      
      // 2. 获取基础数据
      const cache = await this.recipeService.getGraphCache();
      const reachableItems = Array.from(cache.reachableItems);
      
      logger.info(`分布式冰柱图生成开始：共 ${reachableItems.length} 个物品，分片处理`);
      
      // 3. 数据分片
      const shards = this.shardItems(reachableItems, this.SHARD_SIZE);
      logger.info(`创建了 ${shards.length} 个数据分片`);
      
      // 4. 并行处理分片
      const shardResults = await this.processShardsConcurrently(shards, cache.itemToRecipes);
      
      // 5. 合并结果
      const mergedResult = this.mergeShardResults(shardResults, limit);
      
      // 6. 缓存结果
      await this.cacheToMultiLevel(mergedResult);
      
      const duration = Date.now() - startTime;
      logger.info(`分布式冰柱图生成完成：耗时 ${duration}ms`);
      
      return mergedResult;
      
    } catch (error) {
      logger.error('分布式冰柱图生成失败：', error);
      // 降级到单机处理
      return await this.recipeService.generateIcicleChart(limit);
    }
  }
  
  /**
   * 数据分片算法
   */
  private shardItems(items: string[], shardSize: number): string[][] {
    const shards: string[][] = [];
    
    for (let i = 0; i < items.length; i += shardSize) {
      shards.push(items.slice(i, i + shardSize));
    }
    
    return shards;
  }
  
  /**
   * 并发处理分片（限制并发数）
   */
  private async processShardsConcurrently(
    shards: string[][], 
    itemToRecipes: Record<string, Recipe[]>
  ): Promise<Array<{ nodes: IcicleNode[]; maxDepth: number }>> {
    const results: Array<{ nodes: IcicleNode[]; maxDepth: number }> = [];
    
    // 使用Semaphore模式控制并发
    const semaphore = new Semaphore(this.MAX_CONCURRENT_WORKERS);
    
    const promises = shards.map(async (shard, index) => {
      await semaphore.acquire();
      
      try {
        logger.info(`处理分片 ${index + 1}/${shards.length}`);
        const result = await this.processSingleShard(shard, itemToRecipes);
        results.push(result);
        return result;
      } finally {
        semaphore.release();
      }
    });
    
    await Promise.all(promises);
    return results;
  }
  
  /**
   * 处理单个分片
   */
  private async processSingleShard(
    shardItems: string[], 
    itemToRecipes: Record<string, Recipe[]>
  ): Promise<{ nodes: IcicleNode[]; maxDepth: number }> {
    const nodes: IcicleNode[] = [];
    let maxDepth = 0;
    
    const cache = await this.recipeService.getGraphCache();
    
    for (const itemName of shardItems) {
      const tree = cache.shortestPathTrees.get(itemName);
      if (tree) {
        // 通过公共方法获取统计信息
        // 这里简化处理，实际应该通过公共接口获取
        const stats = {
          depth: this.calculateTreeDepth(tree),
          width: this.calculateTreeWidth(tree),
          breadth: this.calculateTreeBreadth(tree, itemToRecipes)
        };
        
        nodes.push({ ...tree, stats });
        maxDepth = Math.max(maxDepth, stats.depth);
      }
    }
    
    return { nodes, maxDepth };
  }
  
  /**
   * 计算树深度（简化实现）
   */
  private calculateTreeDepth(node: IcicleNode): number {
    if (!node.children || node.children.length === 0) {
      return 1;
    }
    
    let maxChildDepth = 0;
    for (const child of node.children) {
      maxChildDepth = Math.max(maxChildDepth, this.calculateTreeDepth(child));
    }
    
    return maxChildDepth + 1;
  }
  
  /**
   * 计算树宽度（简化实现）
   */
  private calculateTreeWidth(node: IcicleNode): number {
    if (!node.children || node.children.length === 0) {
      return 1;
    }
    
    let width = 0;
    for (const child of node.children) {
      width += this.calculateTreeWidth(child);
    }
    
    return width;
  }
  
  /**
   * 计算树广度（简化实现）
   */
  private calculateTreeBreadth(node: IcicleNode, itemToRecipes: Record<string, Recipe[]>): number {
    // 广度定义为能合成该物品的配方数量
    return (itemToRecipes[node.name] || []).length;
  }
  
  /**
   * 合并分片结果
   */
  private mergeShardResults(
    shardResults: Array<{ nodes: IcicleNode[]; maxDepth: number }>,
    limit?: number
  ): IcicleChartData {
    const allNodes: IcicleNode[] = [];
    let globalMaxDepth = 0;
    
    // 合并节点和统计最大深度
    for (const result of shardResults) {
      allNodes.push(...result.nodes);
      globalMaxDepth = Math.max(globalMaxDepth, result.maxDepth);
    }
    
    // 全局排序（深度最小 → 宽度最小 → 广度最大 → 字典序）
    allNodes.sort((a, b) => {
      const aDepth = a.stats?.depth || 0;
      const bDepth = b.stats?.depth || 0;
      const aWidth = a.stats?.width || 0;
      const bWidth = b.stats?.width || 0;
      const aBreadth = a.stats?.breadth || 0;
      const bBreadth = b.stats?.breadth || 0;
      
      if (aDepth !== bDepth) return aDepth - bDepth;
      if (aWidth !== bWidth) return aWidth - bWidth;
      if (aBreadth !== bBreadth) return bBreadth - aBreadth;
      return a.name.localeCompare(b.name);
    });
    
    // 应用限制
    const limitedNodes = limit && limit > 0 ? allNodes.slice(0, limit) : allNodes;
    
    return {
      nodes: limitedNodes,
      totalElements: allNodes.length,
      maxDepth: globalMaxDepth
    };
  }
  
  /**
   * 多级缓存：内存缓存
   */
  private async getFromMultiLevelCache(): Promise<IcicleChartData | null> {
    // TODO: 实现Redis缓存
    // 目前先使用内存缓存
    const memoryCache = (global as any).icicleMemoryCache;
    if (memoryCache && Date.now() - memoryCache.timestamp < this.MEMORY_CACHE_TTL) {
      return memoryCache.data;
    }
    
    return null;
  }
  
  /**
   * 多级缓存：存储结果
   */
  private async cacheToMultiLevel(data: IcicleChartData): Promise<void> {
    // 内存缓存
    (global as any).icicleMemoryCache = {
      data,
      timestamp: Date.now()
    };
    
    // TODO: 实现Redis缓存持久化
  }
  
  /**
   * 增量更新：只处理变化的物品
   */
  async incrementalUpdate(updatedItems: string[]): Promise<void> {
    logger.info(`增量更新冰柱图：${updatedItems.length} 个变化物品`);
    
    // 清除相关缓存
    await this.clearCacheForItems(updatedItems);
    
    // 触发重新生成（下次请求时自动处理）
    (global as any).icicleMemoryCache = null;
  }
  
  /**
   * 清除特定物品的缓存
   */
  private async clearCacheForItems(items: string[]): Promise<void> {
    // TODO: 实现细粒度缓存清除
    // 目前简单清除整个缓存
    (global as any).icicleMemoryCache = null;
  }
  
  /**
   * 性能监控：获取处理统计
   */
  getPerformanceStats() {
    return {
      shardSize: this.SHARD_SIZE,
      maxWorkers: this.MAX_CONCURRENT_WORKERS,
      memoryCacheTTL: this.MEMORY_CACHE_TTL,
      redisCacheTTL: this.REDIS_CACHE_TTL
    };
  }
}

/**
 * 简单的Semaphore实现，用于控制并发
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];
  
  constructor(permits: number) {
    this.permits = permits;
  }
  
  acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }
  
  release(): void {
    this.permits++;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.permits--;
        next();
      }
    }
  }
}

export default DistributedIcicleService;