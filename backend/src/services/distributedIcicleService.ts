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
  
  // 内存优化配置
  private readonly MAX_MEMORY_CACHE_SIZE = 100; // 最大内存缓存项数
  private readonly NODE_POOL_SIZE = 1000; // 节点对象池大小
  
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
      // 🚫 新架构：不再使用全量生成，返回空数据
      return { nodes: [], totalElements: 0, maxDepth: 0 };
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
    
    // 预分配数组空间，避免动态扩容
    nodes.length = shardItems.length;
    
    for (let i = 0; i < shardItems.length; i++) {
      const itemName = shardItems[i];
      const tree = cache.shortestPathTrees.get(itemName);
      if (tree) {
        // 通过公共方法获取统计信息
        // 这里简化处理，实际应该通过公共接口获取
        const stats = {
          depth: this.calculateTreeDepth(tree),
          width: this.calculateTreeWidth(tree),
          breadth: this.calculateTreeBreadth(tree, itemToRecipes)
        };
        
        // 直接赋值而不是push，避免动态扩容开销
        nodes[i] = { ...tree, stats };
        maxDepth = Math.max(maxDepth, stats.depth);
      } else {
        // 对于没有tree的情况，设置为null占位
        nodes[i] = null as any;
      }
    }
    
    // 过滤掉null值
    const filteredNodes = nodes.filter(node => node !== null);
    
    return { nodes: filteredNodes, maxDepth };
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
    // 内存缓存 - 使用LRU策略限制缓存大小
    const currentCache = (global as any).icicleMemoryCache;
    if (currentCache && Object.keys(currentCache).length >= this.MAX_MEMORY_CACHE_SIZE) {
      // 简单的LRU淘汰：清除最旧的缓存
      let oldestKey: string | null = null;
      let oldestTime = Date.now();
      
      for (const [key, cacheItem] of Object.entries(currentCache)) {
        if ((cacheItem as any).timestamp < oldestTime) {
          oldestTime = (cacheItem as any).timestamp;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        delete currentCache[oldestKey];
      }
    }
    
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
 * 对象池管理，减少内存分配和GC压力
 */
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  
  constructor(createFn: () => T, resetFn: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
  }
  
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }
  
  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }
  
  getPoolSize(): number {
    return this.pool.length;
  }
}

/**
 * 高效的队列实现，支持O(1)入队和出队操作
 */
class Queue<T> {
  private head: QueueNode<T> | null = null;
  private tail: QueueNode<T> | null = null;
  private size: number = 0;
  
  // 使用对象池管理节点
  private static nodePool = new ObjectPool<QueueNode<any>>(
    () => new QueueNode(null!),
    (node) => {
      node.value = null!;
      node.next = null;
    }
  );
  
  enqueue(item: T): void {
    const newNode = Queue.nodePool.acquire() as QueueNode<T>;
    newNode.value = item;
    
    if (this.tail) {
      this.tail.next = newNode;
    } else {
      this.head = newNode;
    }
    
    this.tail = newNode;
    this.size++;
  }
  
  dequeue(): T | null {
    if (!this.head) {
      return null;
    }
    
    const item = this.head.value;
    const oldHead = this.head;
    this.head = this.head.next;
    
    if (!this.head) {
      this.tail = null;
    }
    
    this.size--;
    
    // 回收节点
    Queue.nodePool.release(oldHead);
    
    return item;
  }
  
  isEmpty(): boolean {
    return this.size === 0;
  }
  
  getSize(): number {
    return this.size;
  }
}

/**
 * 队列节点
 */
class QueueNode<T> {
  value: T;
  next: QueueNode<T> | null = null;
  
  constructor(value: T) {
    this.value = value;
  }
}

/**
 * 优化的Semaphore实现，使用高效队列
 */
class Semaphore {
  private permits: number;
  private queue: Queue<() => void> = new Queue();
  
  constructor(permits: number) {
    this.permits = permits;
  }
  
  acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.queue.enqueue(resolve);
      }
    });
  }
  
  release(): void {
    this.permits++;
    if (!this.queue.isEmpty()) {
      const next = this.queue.dequeue();
      if (next) {
        this.permits--;
        next();
      }
    }
  }
}

export default DistributedIcicleService;