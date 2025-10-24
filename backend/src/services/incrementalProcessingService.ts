import { logger } from '../utils/logger';
import { RecipeService } from './recipeService';

/**
 * 增量处理服务
 * 支持数据变更时的增量更新，避免全量重新计算
 */
export class IncrementalProcessingService {
  private recipeService: RecipeService;
  
  // 增量处理配置
  private readonly INCREMENTAL_BATCH_SIZE = 200; // 增量处理批次大小
  private readonly MAX_INCREMENTAL_ITEMS = 1000; // 单次增量处理最大物品数
  
  constructor(recipeService: RecipeService) {
    this.recipeService = recipeService;
  }
  
  /**
   * 处理配方变更（新增/删除/修改）
   */
  async handleRecipeChanges(
    addedRecipes: any[] = [],
    removedRecipes: any[] = [],
    modifiedRecipes: any[] = []
  ): Promise<{
    affectedItems: string[];
    processingTime: number;
    cacheUpdated: boolean;
  }> {
    const startTime = Date.now();
    logger.info(`处理配方变更：新增 ${addedRecipes.length}，删除 ${removedRecipes.length}，修改 ${modifiedRecipes.length}`);
    
    try {
      // 获取当前缓存
      const cache = await this.recipeService.getGraphCache();
      
      // 分析受影响的物品
      const affectedItems = this.analyzeAffectedItems(
        addedRecipes, 
        removedRecipes, 
        modifiedRecipes, 
        cache
      );
      
      if (affectedItems.length === 0) {
        logger.info('配方变更未影响任何物品，无需增量处理');
        return {
          affectedItems: [],
          processingTime: Date.now() - startTime,
          cacheUpdated: false
        };
      }
      
      logger.info(`配方变更影响 ${affectedItems.length} 个物品，开始增量处理`);
      
      // 增量更新缓存
      const cacheUpdated = await this.incrementalUpdateCache(
        affectedItems, 
        addedRecipes, 
        removedRecipes, 
        modifiedRecipes, 
        cache
      );
      
      const processingTime = Date.now() - startTime;
      logger.success(`增量处理完成：影响 ${affectedItems.length} 个物品，耗时 ${processingTime}ms`);
      
      return {
        affectedItems,
        processingTime,
        cacheUpdated
      };
      
    } catch (error) {
      logger.error('增量处理失败：', error);
      throw error;
    }
  }
  
  /**
   * 分析受影响的物品
   */
  private analyzeAffectedItems(
    addedRecipes: any[],
    removedRecipes: any[],
    modifiedRecipes: any[],
    cache: any
  ): string[] {
    const affectedItems = new Set<string>();
    
    // 分析新增配方的影响
    addedRecipes.forEach(recipe => {
      // 配方产物
      if (recipe.output) {
        affectedItems.add(recipe.output);
      }
      // 配方原料
      if (recipe.inputs) {
        recipe.inputs.forEach((input: any) => {
          if (input.item) {
            affectedItems.add(input.item);
          }
        });
      }
    });
    
    // 分析删除配方的影响
    removedRecipes.forEach(recipe => {
      if (recipe.output) {
        affectedItems.add(recipe.output);
      }
      if (recipe.inputs) {
        recipe.inputs.forEach((input: any) => {
          if (input.item) {
            affectedItems.add(input.item);
          }
        });
      }
    });
    
    // 分析修改配方的影响
    modifiedRecipes.forEach(recipe => {
      if (recipe.output) {
        affectedItems.add(recipe.output);
      }
      if (recipe.inputs) {
        recipe.inputs.forEach((input: any) => {
          if (input.item) {
            affectedItems.add(input.item);
          }
        });
      }
    });
    
    // 扩展影响范围：受影响的物品的上下游物品
    this.expandAffectedItems(affectedItems, cache);
    
    return Array.from(affectedItems).slice(0, this.MAX_INCREMENTAL_ITEMS);
  }
  
  /**
   * 扩展影响范围
   */
  private expandAffectedItems(affectedItems: Set<string>, cache: any): void {
    const visited = new Set<string>();
    const queue = Array.from(affectedItems);
    
    // 广度优先搜索扩展影响范围
    while (queue.length > 0) {
      const currentItem = queue.shift()!;
      if (visited.has(currentItem)) continue;
      
      visited.add(currentItem);
      
      // 上游物品（能合成当前物品的物品）
      const upstreamItems = this.getUpstreamItems(currentItem, cache);
      upstreamItems.forEach(item => {
        if (!visited.has(item)) {
          affectedItems.add(item);
          queue.push(item);
        }
      });
      
      // 下游物品（当前物品能合成的物品）
      const downstreamItems = this.getDownstreamItems(currentItem, cache);
      downstreamItems.forEach(item => {
        if (!visited.has(item)) {
          affectedItems.add(item);
          queue.push(item);
        }
      });
    }
  }
  
  /**
   * 获取上游物品（能合成当前物品的物品）
   */
  private getUpstreamItems(itemName: string, cache: any): string[] {
    const recipes = cache.itemToRecipes[itemName] || [];
    const upstreamItems = new Set<string>();
    
    (recipes as any[]).forEach((recipe: any) => {
      if (recipe.inputs) {
        recipe.inputs.forEach((input: any) => {
          if (input.item) {
            upstreamItems.add(input.item);
          }
        });
      }
    });
    
    return Array.from(upstreamItems);
  }
  
  /**
   * 获取下游物品（当前物品能合成的物品）
   */
  private getDownstreamItems(itemName: string, cache: any): string[] {
    const downstreamItems = new Set<string>();
    
    // 查找使用当前物品作为原料的配方
    Object.entries(cache.itemToRecipes).forEach(([outputItem, recipes]) => {
      (recipes as any[]).forEach((recipe: any) => {
        if (recipe.inputs && recipe.inputs.some((input: any) => input.item === itemName)) {
          downstreamItems.add(outputItem);
        }
      });
    });
    
    return Array.from(downstreamItems);
  }
  
  /**
   * 增量更新缓存
   */
  private async incrementalUpdateCache(
    affectedItems: string[],
    addedRecipes: any[],
    removedRecipes: any[],
    modifiedRecipes: any[],
    cache: any
  ): Promise<boolean> {
    // 分批处理受影响的物品
    const batches: string[][] = [];
    for (let i = 0; i < affectedItems.length; i += this.INCREMENTAL_BATCH_SIZE) {
      batches.push(affectedItems.slice(i, i + this.INCREMENTAL_BATCH_SIZE));
    }
    
    logger.info(`增量更新缓存：${affectedItems.length} 个物品，分为 ${batches.length} 个批次`);
    
    // 处理每个批次
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`处理批次 ${i + 1}/${batches.length} (${batch.length} 个物品)`);
      
      await this.processBatch(batch, cache);
    }
    
    // 更新配方缓存
    this.updateRecipeCache(addedRecipes, removedRecipes, modifiedRecipes, cache);
    
    // 标记缓存已更新
    cache.lastUpdated = Date.now();
    cache.version = (cache.version || 0) + 1;
    
    return true;
  }
  
  /**
   * 处理单个批次
   */
  private async processBatch(batch: string[], cache: any): Promise<void> {
    const promises = batch.map(async itemName => {
      try {
        // 重新计算受影响物品的最短路径树
        const newTree = await this.recipeService.getShortestPathTree(itemName);
        
        // 更新缓存
        if (newTree) {
          cache.shortestPathTrees.set(itemName, newTree);
          
          // 🆕 新架构：最短路径树已缓存，无需额外预计算
          logger.debug(`物品 ${itemName} 的最短路径树已更新到缓存`);
        }
      } catch (error) {
        logger.warn(`物品 ${itemName} 增量处理失败：`, error);
      }
    });
    
    await Promise.all(promises);
  }
  
  /**
   * 更新配方缓存
   */
  private updateRecipeCache(
    addedRecipes: any[],
    removedRecipes: any[],
    modifiedRecipes: any[],
    cache: any
  ): void {
    // 移除删除的配方
    removedRecipes.forEach(recipe => {
      const index = cache.recipes.findIndex((r: any) => r.id === recipe.id);
      if (index !== -1) {
        cache.recipes.splice(index, 1);
      }
    });
    
    // 更新修改的配方
    modifiedRecipes.forEach(recipe => {
      const index = cache.recipes.findIndex((r: any) => r.id === recipe.id);
      if (index !== -1) {
        cache.recipes[index] = { ...cache.recipes[index], ...recipe };
      }
    });
    
    // 添加新增的配方
    cache.recipes.push(...addedRecipes);
    
    // 重新构建 itemToRecipes 映射
    this.rebuildItemToRecipes(cache);
  }
  
  /**
   * 重新构建 itemToRecipes 映射
   */
  private rebuildItemToRecipes(cache: any): void {
    cache.itemToRecipes = {};
    
    cache.recipes.forEach((recipe: any) => {
      if (recipe.output) {
        if (!cache.itemToRecipes[recipe.output]) {
          cache.itemToRecipes[recipe.output] = [];
        }
        cache.itemToRecipes[recipe.output].push(recipe);
      }
    });
  }
  
  /**
   * 获取增量处理统计信息
   */
  getIncrementalStats() {
    return {
      batchSize: this.INCREMENTAL_BATCH_SIZE,
      maxItems: this.MAX_INCREMENTAL_ITEMS
    };
  }
}

export default IncrementalProcessingService;