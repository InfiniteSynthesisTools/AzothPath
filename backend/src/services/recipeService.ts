import { databaseAdapter } from '../database/databaseAdapter';
import { logger } from '../utils/logger';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';
import { truncateEmoji } from '../utils/emoji';
import { CacheService } from './cacheService';

export interface Recipe {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;
  likes: number;
  created_at: string;
}

export interface Item {
  id: number;
  name: string;
  emoji?: string;
  is_base: boolean;
  created_at: string;
}

export interface CraftingTreeNode {
  item: string;
  is_base: boolean;
  recipe?: [string, string];
  children?: [CraftingTreeNode | null, CraftingTreeNode | null];
}

export interface PathStats {
  depth: number;
  width: number;
  total_materials: number;
  materials: Record<string, number>;
}


/**
 * 图缓存数据结构
 */
interface GraphCache {
  recipes: Recipe[];
  items: Item[];
  baseItems: Item[];
  itemToRecipes: Record<string, Recipe[]>;
  recipeGraph: Record<string, string[]>;
  baseItemNames: string[];
  allItemNames: string[];
  itemEmojiMap: Record<string, string>;
  reachableItems: Set<string>;
  unreachableItems: Set<string>;
  lastUpdated: number;
}

// ============ Emoji 处理器 ============

class EmojiProcessor {
  /**
   * 处理单个记录的 emoji 字段
   */
  static truncateRecord<T extends Record<string, any>>(record: T): T {
    const result: any = { ...record };
    const emojiFields = ['emoji', 'item_a_emoji', 'item_b_emoji', 'result_emoji'];
    
    for (const field of emojiFields) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = truncateEmoji(result[field]);
      }
    }
    
    return result as T;
  }

  /**
   * 批量处理记录的 emoji 字段
   */
  static truncateRecords<T extends Record<string, any>>(records: T[]): T[] {
    return records.map(r => this.truncateRecord(r));
  }
}

// ============ 数据库查询辅助函数 ============

class DatabaseQueryHelper {
  /**
   * 获取图缓存所需的所有数据
   */
  static async fetchGraphData() {
    const [recipes, items, baseItems] = await Promise.all([
      databaseAdapter.all<Recipe>('SELECT id, item_a, item_b, result FROM recipes WHERE is_public = 1'),
      databaseAdapter.all<Item>('SELECT name, emoji FROM items'),
      databaseAdapter.all<Item>('SELECT name, emoji FROM items WHERE is_base = 1')
    ]);
    
    return { recipes, items, baseItems };
  }

  /**
   * 构建 emoji 映射表
   */
  static buildEmojiMap(items: Item[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const item of items) {
      if (item.emoji) {
        map[item.name] = item.emoji;
      }
    }
    return map;
  }
}

// ============ RecipeService 主类 ============

// ============ 最小堆实现（用于优先级队列） ============

class MinHeap<T> {
  private heap: T[];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.heap = [];
    this.compare = compare;
  }

  push(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return min;
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    const item = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (this.compare(item, parent) >= 0) break;
      this.heap[parentIndex] = item;
      this.heap[index] = parent;
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    const item = this.heap[index];
    
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let swap: number | null = null;
      let leftChild: T, rightChild: T;

      if (leftChildIndex < length) {
        leftChild = this.heap[leftChildIndex];
        if (this.compare(leftChild, item) < 0) {
          swap = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        rightChild = this.heap[rightChildIndex];
        if (this.compare(rightChild, (swap === null ? item : this.heap[leftChildIndex])) < 0) {
          swap = rightChildIndex;
        }
      }

      if (swap === null) break;
      this.heap[index] = this.heap[swap];
      this.heap[swap] = item;
      index = swap;
    }
  }
}

// ============ 改进的合成图算法（基于 algo.md） ============

interface ItemInfo {
  depth: number;
  width: number;
  recipe: Recipe | null;
}

class SynthesisGraph {
  private items: Map<string, ItemInfo>;
  private recipes: Recipe[];
  private baseItems: Set<string>;
  private itemToRecipes: Record<string, Recipe[]>;

  constructor(recipes: Recipe[], baseItemNames: string[], itemToRecipes: Record<string, Recipe[]>) {
    this.recipes = recipes;
    this.baseItems = new Set(baseItemNames);
    this.itemToRecipes = itemToRecipes;
    this.items = new Map();
    
    // 初始化基础物品
    for (const item of this.baseItems) {
      this.items.set(item, { depth: 0, width: 1, recipe: null });
    }
  }

  /**
   * 查找最优合成路径（改进的 Dijkstra 算法）
   */
  findOptimalPath(target: string): ItemInfo | null {
    if (this.items.has(target)) {
      return this.items.get(target)!;
    }

    // 优先级队列：按 (depth, width, item_name) 排序
    const heap = new MinHeap<[number, number, string, Recipe | null]>(
      (a, b) => {
        // 深度优先
        if (a[0] !== b[0]) return a[0] - b[0];
        // 宽度次之
        if (a[1] !== b[1]) return a[1] - b[1];
        // 字典序最后
        return a[2].localeCompare(b[2]);
      }
    );

    const visited = new Set<string>();

    // 初始化基础物品
    for (const item of this.baseItems) {
      heap.push([0, 1, item, null]);
    }

    while (!heap.isEmpty()) {
      const [currentDepth, currentWidth, currentItem, recipe] = heap.pop()!;

      if (visited.has(currentItem)) continue;
      visited.add(currentItem);

      // 更新当前物品的最优值
      this.items.set(currentItem, { depth: currentDepth, width: currentWidth, recipe });

      if (currentItem === target) {
        return this.items.get(currentItem)!;
      }

      // 查找所有以当前物品为素材的配方
      const recipesUsingCurrent = this.getRecipesUsing(currentItem);
      for (const recipe of recipesUsingCurrent) {
        const otherItem = this.getOtherItem(recipe, currentItem);
        const resultItem = recipe.result;

        // 只有当另一个素材也有有效路径时才考虑
        if (!this.items.has(otherItem)) continue;

        const otherInfo = this.items.get(otherItem)!;
        const newDepth = Math.max(currentDepth, otherInfo.depth) + 1;
        const newWidth = currentWidth + otherInfo.width;

        // 检查是否找到更优路径
        if (this.isBetter(newDepth, newWidth, resultItem)) {
          heap.push([newDepth, newWidth, resultItem, recipe]);
        }
      }
    }

    return null;
  }

  /**
   * 获取使用指定物品作为材料的配方
   */
  private getRecipesUsing(item: string): Recipe[] {
    const recipes: Recipe[] = [];
    for (const recipe of this.recipes) {
      if (recipe.item_a === item || recipe.item_b === item) {
        recipes.push(recipe);
      }
    }
    return recipes;
  }

  /**
   * 获取配方中的另一个物品
   */
  private getOtherItem(recipe: Recipe, currentItem: string): string {
    return recipe.item_a === currentItem ? recipe.item_b : recipe.item_a;
  }

  /**
   * 比较路径是否更优
   */
  private isBetter(newDepth: number, newWidth: number, targetItem: string): boolean {
    if (!this.items.has(targetItem)) return true;
    
    const current = this.items.get(targetItem)!;
    
    // 深度优先
    if (newDepth < current.depth) return true;
    if (newDepth > current.depth) return false;
    
    // 宽度次之
    if (newWidth < current.width) return true;
    if (newWidth > current.width) return false;
    
    // 字典序最后（这里简化处理，总是认为新路径更好）
    return true;
  }

  /**
   * 获取所有物品信息
   */
  getAllItems(): Map<string, ItemInfo> {
    return this.items;
  }

  /**
   * 增量更新：当添加新配方时
   */
  incrementalUpdate(newRecipe: Recipe): void {
    const { item_a, item_b, result } = newRecipe;
    
    // 只有当两个素材都有有效路径时才考虑
    if (!this.items.has(item_a) || !this.items.has(item_b)) return;
    
    const infoA = this.items.get(item_a)!;
    const infoB = this.items.get(item_b)!;
    const newDepth = Math.max(infoA.depth, infoB.depth) + 1;
    const newWidth = infoA.width + infoB.width;
    
    // 检查是否更优
    if (this.isBetter(newDepth, newWidth, result)) {
      this.items.set(result, { depth: newDepth, width: newWidth, recipe: newRecipe });
      // 传播更新到所有依赖此结果的配方
      this.propagateUpdate(result);
    }
  }

  /**
   * 传播更新到依赖项
   */
  private propagateUpdate(item: string): void {
    const recipesUsingResult = this.getRecipesUsing(item);
    for (const recipe of recipesUsingResult) {
      const otherItem = this.getOtherItem(recipe, item);
      const resultItem = recipe.result;
      
      if (this.items.has(otherItem)) {
        const otherInfo = this.items.get(otherItem)!;
        const currentInfo = this.items.get(item)!;
        const newDepth = Math.max(currentInfo.depth, otherInfo.depth) + 1;
        const newWidth = currentInfo.width + otherInfo.width;
        
        if (this.isBetter(newDepth, newWidth, resultItem)) {
          this.items.set(resultItem, { depth: newDepth, width: newWidth, recipe });
          this.propagateUpdate(resultItem);
        }
      }
    }
  }
}

export class RecipeService {
  private graphCache: GraphCache | null = null;
  private graphCachePromise: Promise<GraphCache> | null = null;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 60 分钟
  private synthesisGraph: SynthesisGraph | null = null;
  // 主动刷新控制
  private autoRefreshTimer: NodeJS.Timeout | null = null;
  private autoRefreshStarted = false;
  

  /**
   * 处理记录中的 emoji 字段
   */
  private truncateRecordEmojis<T extends Record<string, any>>(record: T): T {
    return EmojiProcessor.truncateRecord(record);
  }

  /**
   * 批量处理记录中的 emoji 字段
   */
  private truncateRecordsEmojis<T extends Record<string, any>>(records: T[]): T[] {
    return EmojiProcessor.truncateRecords(records);
  }

  /**
   * 获取或更新图缓存（非阻塞版本）
   */
  public async getGraphCache(): Promise<GraphCache> {
    const now = Date.now();

    // 缓存存在且未过期，直接返回
    if (this.graphCache && now - this.graphCache.lastUpdated <= this.CACHE_TTL) {
      return this.graphCache;
    }

    // 缓存存在但过期，返回旧缓存并异步更新
    if (this.graphCache) {
      if (!this.graphCachePromise) {
        this.graphCachePromise = this.buildGraphCacheAsync().finally(() => {
          this.graphCachePromise = null;
        });
      }
      return this.graphCache;
    }

    // 无缓存，等待构建（首次调用）
    if (this.graphCachePromise) {
      return this.graphCachePromise;
    }

    this.graphCachePromise = this.buildGraphCacheAsync().finally(() => {
      this.graphCachePromise = null;
    });

    return this.graphCachePromise;
  }

  /**
   * 启动图缓存的后台主动刷新
   * - 周期性检测缓存是否缺失或过期
   * - 如需要则在后台异步重建，不阻塞请求
   * - 具备幂等性，多次调用仅启动一次
   */
  public startAutoRefresh(intervalMs: number = 5 * 60 * 1000): void { // 默认每5分钟巡检一次
    if (this.autoRefreshStarted) return;
    this.autoRefreshStarted = true;

    const tick = () => {
      try {
        const now = Date.now();
        const hasCache = !!this.graphCache;
        const isExpired = !this.graphCache || (now - (this.graphCache.lastUpdated || 0) > this.CACHE_TTL);

        // 若无缓存或已过期，则在后台触发异步重建
        if (isExpired && !this.graphCachePromise) {
          logger.info('[GraphCache] 后台主动刷新触发（缺失或过期）');
          this.graphCachePromise = this.buildGraphCacheAsync().finally(() => {
            this.graphCachePromise = null;
          });
        }

        // 可选：提前预刷新（例如超过TTL的90%）；降低到达请求时的过期概率
        if (hasCache && !isExpired) {
          const age = now - this.graphCache!.lastUpdated;
          if (age > this.CACHE_TTL * 0.9 && !this.graphCachePromise) {
            logger.info('[GraphCache] 提前预刷新（>90% TTL）');
            this.graphCachePromise = this.buildGraphCacheAsync().finally(() => {
              this.graphCachePromise = null;
            });
          }
        }
      } catch (err) {
        logger.warn('[GraphCache] 后台刷新巡检失败', err);
      }
    };

    // 立即执行一次检查，以便尽快进入健康状态
    setTimeout(tick, 0);
    this.autoRefreshTimer = setInterval(tick, intervalMs);
    logger.info(`[GraphCache] 主动刷新已启动（间隔 ${Math.round(intervalMs / 1000)}s）`);
  }

  /**
   * 异步构建图缓存（内部方法）
   */
  private async buildGraphCacheAsync(): Promise<GraphCache> {
    try {
      logger.info('图缓存已过期或不存在，重新构建...');

      // 1. 获取数据
      const { recipes, items, baseItems } = await DatabaseQueryHelper.fetchGraphData();
      const baseItemNames = baseItems.map(item => item.name);
      const allItemNames = items.map(item => item.name);
      const itemEmojiMap = DatabaseQueryHelper.buildEmojiMap(items);

      // 2. 构建依赖图
      const { itemToRecipes, recipeGraph } = this.buildDependencyGraph(recipes, allItemNames);

      // 3. 可达性分析
      const { reachableItems, unreachableItems } = this.analyzeReachability(baseItemNames, itemToRecipes, allItemNames);

      // 4. 构建并存储缓存
      const newCache = {
        recipes,
        items,
        baseItems,
        itemToRecipes,
        recipeGraph,
        baseItemNames,
        allItemNames,
        itemEmojiMap,
        reachableItems,
        unreachableItems,
        lastUpdated: Date.now()
      };

      this.graphCache = newCache;
      
      // 5. 初始化 SynthesisGraph 以支持新的改进 Dijkstra 算法
      this.synthesisGraph = new SynthesisGraph(
        recipes,
        baseItemNames,
        itemToRecipes
      );
      
      logger.info(`图缓存构建完成，包含 ${recipes.length} 个配方和 ${allItemNames.length} 个物品，已初始化 SynthesisGraph`);

      return newCache;
    } catch (err) {
      logger.error('图缓存构建失败:', err);
      throw err;
    }
  }

  async refreshGraphCache(): Promise<void> {
    this.graphCache = null;
    await this.getGraphCache();
    logger.info('图缓存已强制刷新');
  }

  /**
   * 获取配方列表（优化版本）
   * 性能优化：
   * 1. 使用JOIN替代子查询
   * 2. 优化索引策略
   * 3. 支持游标分页
   * 4. 包含深度、宽度、广度统计信息
   */
  async getRecipes(params: {
    page?: number;
    limit?: number;
    search?: string;
    orderBy?: string;
    userId?: number;
    result?: string;
    material?: string;    // 新增：查询作为材料（item_a 或 item_b）的配方
    cursor?: string; // 游标分页
    includePrivate?: boolean; // 管理用途：包含未公开
    includeStats?: boolean;   // 是否计算每条配方的路径统计（默认关闭，较耗时）
  }) {
    const { page = 1, limit = 20, search, orderBy = 'created_at', userId, result, material, cursor, includePrivate = false, includeStats = false } = params;

    // 使用JOIN替代子查询，大幅提升性能
    let sql = `
      SELECT r.*, 
             u.name as creator_name,
             ia.emoji as item_a_emoji,
             ib.emoji as item_b_emoji,
             ir.emoji as result_emoji,
             ${userId ? 'CASE WHEN rl.id IS NOT NULL THEN 1 ELSE 0 END as is_liked' : '0 as is_liked'}
      FROM recipes r
      LEFT JOIN user u ON r.user_id = u.id
      LEFT JOIN items ia ON ia.name = r.item_a
      LEFT JOIN items ib ON ib.name = r.item_b  
      LEFT JOIN items ir ON ir.name = r.result
      ${userId ? 'LEFT JOIN recipe_likes rl ON rl.recipe_id = r.id AND rl.user_id = ?' : ''}
    `;

    const sqlParams: any[] = [];
    if (userId) {
      sqlParams.push(userId);
    }

    // 优化搜索条件
    const conditions = [];
    if (search) {
      // 优先精确匹配，然后模糊匹配
      conditions.push(`(r.item_a = ? OR r.item_b = ? OR r.result = ? OR 
                       r.item_a LIKE ? OR r.item_b LIKE ? OR r.result LIKE ?)`);
      sqlParams.push(search, search, search, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (result) {
      conditions.push('r.result = ?');
      sqlParams.push(result);
    }

    // 新增：material 参数支持（查询作为材料的配方）
    if (material) {
      conditions.push('(r.item_a = ? OR r.item_b = ?)');
      sqlParams.push(material, material);
    }

    // 游标分页优化（推荐）或传统分页
    if (cursor) {
      // 游标分页 - 性能最佳
      conditions.push(`r.id < ?`);
      sqlParams.push(cursor);
    }

    // 公开过滤（除非显式包含非公开）
    if (!includePrivate) {
      conditions.push('r.is_public = 1');
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // 优化排序
    const validOrderBy = ['created_at', 'likes', 'id'].includes(orderBy) ? orderBy : 'created_at';
    sql += ` ORDER BY r.${validOrderBy} DESC, r.id DESC`;

    if (cursor) {
      sql += ` LIMIT ?`;
      sqlParams.push(limit);
    } else {
      // 传统分页
      sql += ` LIMIT ? OFFSET ?`;
      sqlParams.push(limit, (page - 1) * limit);
    }

    const recipes = await databaseAdapter.all(sql, sqlParams);

    // 默认不计算统计信息（昂贵）。如需统计，通过 includeStats 显式开启
    let recipesWithStats = recipes as any[];
    if (includeStats) {
      recipesWithStats = await Promise.all(
        recipes.map(async (recipe) => {
          try {
            // 使用缓存获取图数据来计算统计信息
            const cache = await this.getGraphCache();
            const pathStats = this.calculateRecipeStats(recipe, cache.baseItemNames, cache.itemToRecipes);
            return {
              ...recipe,
              depth: pathStats.depth,
              width: pathStats.width
            };
          } catch (error) {
            logger.error(`计算配方 ${recipe.id} 的统计信息失败:`, error);
          }

          // 如果计算失败，返回默认值
          return {
            ...recipe,
            depth: 0,
            width: 1
          };
        })
      );
    }

    // 异步获取总数（避免阻塞主查询）
    // 构建计数查询的参数（排除分页参数）
    const countParams = [];
    let paramIndex = 0;

    // 跳过userId参数（计数查询不需要）
    if (userId) {
      paramIndex++;
    }

    // search参数（6个）
    if (search) {
      countParams.push(...sqlParams.slice(paramIndex, paramIndex + 6));
      paramIndex += 6;
    }

    // result参数
    if (result) {
      countParams.push(sqlParams[paramIndex++]);
    }

    // material参数（2个，因为是 item_a = ? OR item_b = ?）
    if (material) {
      countParams.push(sqlParams[paramIndex], sqlParams[paramIndex + 1]);
      paramIndex += 2;
    }

    // cursor参数
    if (cursor) {
      countParams.push(sqlParams[paramIndex++]);
    }

    const totalPromise = this.getCountAsync(countParams, conditions);

    return {
      recipes: this.truncateRecordsEmojis(recipesWithStats),
      total: await totalPromise,
      page,
      limit,
      hasMore: recipes.length === limit,
      nextCursor: recipes.length > 0 ? recipes[recipes.length - 1].id : null
    };
  }

  /** 更新物品公开状态 */
  async updateItemPublic(id: number, isPublic: number) {
    await databaseAdapter.init();
    const res = await databaseAdapter.run('UPDATE items SET is_public = ? WHERE id = ?', [isPublic, id]);
    if (res.changes === 0) {
      throw new Error('物品不存在');
    }
  }

  /** 更新配方公开状态 */
  async updateRecipePublic(id: number, isPublic: number) {
    await databaseAdapter.init();
    const res = await databaseAdapter.run('UPDATE recipes SET is_public = ? WHERE id = ?', [isPublic, id]);
    if (res.changes === 0) {
      throw new Error('配方不存在');
    }
  }

  /**
   * 异步获取总数（避免阻塞主查询）
   */
  private async getCountAsync(baseParams: any[], conditions: string[]): Promise<number> {
    const cacheService = CacheService.getInstance();
    const cacheKey = conditions.join(' AND ');
    
    // 尝试从缓存获取
    const cachedCount = cacheService.getRecipeListCount(cacheKey);
    if (cachedCount !== null) {
      logger.debug(`[缓存命中] 配方列表总数: ${cachedCount}, 条件: ${cacheKey}`);
      return cachedCount;
    }

    let countSql = 'SELECT COUNT(*) as count FROM recipes r';
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }

    try {
      const totalResult = await databaseAdapter.get<{ count: number }>(countSql, baseParams);
      const count = totalResult?.count || 0;
      
      // 缓存结果
      cacheService.setRecipeListCount(cacheKey, count);
      logger.debug(`[缓存设置] 配方列表总数: ${count}, 条件: ${cacheKey}`);
      
      return count;
    } catch (error) {
      logger.error('获取总数失败:', error);
      logger.error('SQL:', countSql);
      logger.error('参数:', baseParams);
      return 0;
    }
  }

  /**
   * 获取按结果分组的配方列表（优化版本）
   */
  async getGroupedRecipes(params: {
    page?: number;
    limit?: number;
    search?: string;
    result?: string;
    userId?: number;
    includePrivate?: boolean;
  }) {
    const { page = 1, limit = 20, search, result, userId, includePrivate = false } = params;
    const offset = (page - 1) * limit;

    // 优化：使用JOIN获取结果物品和emoji
    let resultSql = `
      SELECT DISTINCT r.result,
             ir.emoji as result_emoji,
             COUNT(r.id) as recipe_count
      FROM recipes r
      LEFT JOIN items ir ON ir.name = r.result
    `;
    const resultParams: any[] = [];

    const conditions = [];
    if (search) {
      conditions.push(`(r.item_a = ? OR r.item_b = ? OR r.result = ? OR 
                       r.item_a LIKE ? OR r.item_b LIKE ? OR r.result LIKE ?)`);
      resultParams.push(search, search, search, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (result) {
      conditions.push('r.result = ?');
      resultParams.push(result);
    }

    if (!includePrivate) {
      conditions.push('r.is_public = 1');
    }
    if (conditions.length > 0) {
      resultSql += ` WHERE ${conditions.join(' AND ')}`;
    }

    resultSql += ` GROUP BY r.result ORDER BY recipe_count DESC, r.result LIMIT ? OFFSET ?`;
    resultParams.push(limit, offset);

    const results = await databaseAdapter.all(resultSql, resultParams);

    // 为每个结果物品获取所有配方（优化：使用JOIN替代子查询）
    const groupedRecipes = [];
    for (const resultItem of results) {
      let recipeSql = `
        SELECT r.*, u.name as creator_name,
               ia.emoji as item_a_emoji,
               ib.emoji as item_b_emoji,
               ir.emoji as result_emoji,
               ${userId ? 'CASE WHEN rl.id IS NOT NULL THEN 1 ELSE 0 END as is_liked' : '0 as is_liked'}
        FROM recipes r
        LEFT JOIN user u ON r.user_id = u.id
        LEFT JOIN items ia ON ia.name = r.item_a
        LEFT JOIN items ib ON ib.name = r.item_b  
        LEFT JOIN items ir ON ir.name = r.result
        ${userId ? 'LEFT JOIN recipe_likes rl ON rl.recipe_id = r.id AND rl.user_id = ?' : ''}
        WHERE r.result = ? AND ${includePrivate ? '1=1' : 'r.is_public = 1'}
        ORDER BY r.likes DESC, r.created_at DESC
      `;

      const recipeParams = userId ? [userId, resultItem.result] : [resultItem.result];
      const recipes = await databaseAdapter.all(recipeSql, recipeParams);

      groupedRecipes.push({
        result: resultItem.result,
        result_emoji: resultItem.result_emoji ? truncateEmoji(resultItem.result_emoji) : undefined,
        recipe_count: resultItem.recipe_count,
        recipes: this.truncateRecordsEmojis(recipes)
      });
    }

    // 异步获取总数
    // 构建计数查询的参数（排除分页参数）
    const countParams = [];
    let paramIndex = 0;

    // search参数（6个）
    if (search) {
      countParams.push(...resultParams.slice(paramIndex, paramIndex + 6));
      paramIndex += 6;
    }

    // result参数
    if (result) {
      countParams.push(resultParams[paramIndex++]);
    }

    const totalPromise = this.getGroupedCountAsync(countParams, conditions);

    return {
      grouped_recipes: groupedRecipes,
      total: await totalPromise,
      page,
      limit
    };
  }

  /**
   * 异步获取分组查询的总数
   */
  private async getGroupedCountAsync(baseParams: any[], conditions: string[]): Promise<number> {
    let countSql = 'SELECT COUNT(DISTINCT result) as count FROM recipes r';
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }

    try {
      const totalResult = await databaseAdapter.get<{ count: number }>(countSql, baseParams);
      return totalResult?.count || 0;
    } catch (error) {
      logger.error('获取分组总数失败:', error);
      logger.error('SQL:', countSql);
      logger.error('参数:', baseParams);
      return 0;
    }
  }

  /**
   * 获取配方详情（优化版本）
   */
  async getRecipeById(id: number) {
    const recipe = await databaseAdapter.get(
      `SELECT r.*, u.name as creator_name, u.emoji as creator_emoji,
              ia.emoji as item_a_emoji,
              ib.emoji as item_b_emoji,
              ir.emoji as result_emoji
       FROM recipes r
       LEFT JOIN user u ON r.user_id = u.id
       LEFT JOIN items ia ON ia.name = r.item_a
       LEFT JOIN items ib ON ib.name = r.item_b  
       LEFT JOIN items ir ON ir.name = r.result
       WHERE r.id = ? AND r.is_public = 1`,
      [id]
    );

    if (!recipe) {
      throw new Error('配方不存在');
    }

    return this.truncateRecordEmojis(recipe);
  }

  /**
   * 根据配方结果物品名称获取配方详情
   */
  async getRecipeByResultName(resultName: string) {
    const recipe = await databaseAdapter.get(
      `SELECT r.*, u.name as creator_name, u.emoji as creator_emoji,
              ia.emoji as item_a_emoji,
              ib.emoji as item_b_emoji,
              ir.emoji as result_emoji
       FROM recipes r
       LEFT JOIN user u ON r.user_id = u.id
       LEFT JOIN items ia ON ia.name = r.item_a
       LEFT JOIN items ib ON ib.name = r.item_b  
       LEFT JOIN items ir ON ir.name = r.result
       WHERE r.result = ? AND r.is_public = 1
       ORDER BY r.likes DESC, r.created_at DESC
       LIMIT 1`,
      [resultName]
    );

    if (!recipe) {
      throw new Error('配方不存在');
    }

    return this.truncateRecordEmojis(recipe);
  }

  /**
   * 提交配方（含验证和去重）
   */
  async submitRecipe(itemA: string, itemB: string, result: string, creatorId: number) {
    // 使用事务确保数据一致性
    return await databaseAdapter.transaction(async (tx) => {
      // 规范化：确保 itemA < itemB
      if (itemA > itemB) {
        [itemA, itemB] = [itemB, itemA];
      }

      // 检查是否已存在
      const existing = await tx.get(
        'SELECT * FROM recipes WHERE item_a = ? AND item_b = ? AND result = ?',
        [itemA, itemB, result]
      );

      if (existing) {
        throw new Error('配方已存在');
      }

      // 记录贡献分
      let contributionPoints = 0;

      // 自动收录新物品（每个新物品 +2 分）
      // 注意: 用户可能乱序导入，所以 item_a、item_b、result 都可能是新物品
      const itemAPoints = await this.ensureItemExistsWithTx(itemA, tx);
      const itemBPoints = await this.ensureItemExistsWithTx(itemB, tx);
      const resultPoints = await this.ensureItemExistsWithTx(result, tx);
      contributionPoints += itemAPoints + itemBPoints + resultPoints;

      // 插入配方（新配方 +1 分）
      const recipeResult = await tx.run(
        'INSERT INTO recipes (item_a, item_b, result, user_id, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [itemA, itemB, result, creatorId, 0, getCurrentUTC8TimeForDB()]
      );
      contributionPoints += 1; // 新配方 +1 分
      logger.success(`新配方添加: ${itemA} + ${itemB} = ${result}, +1分`);

      // 更新用户贡献分
      if (contributionPoints > 0) {
        await tx.run(
          'UPDATE user SET contribute = contribute + ? WHERE id = ?',
          [contributionPoints, creatorId]
        );
        const newItemCount = (itemAPoints + itemBPoints + resultPoints) / 2;
        logger.info(`用户${creatorId}获得${contributionPoints}分 (1个配方 + ${newItemCount}个新物品)`);
      }

      // 添加配方后清除相关缓存
      const cacheService = CacheService.getInstance();
      cacheService.invalidateRecipeCache();
      cacheService.invalidateUserCache(creatorId);
      
      // 后台异步刷新图缓存（不阻塞提交接口）
      setTimeout(() => {
        // 如果没有正在构建，则触发一次主动重建
        if (!this.graphCachePromise) {
          logger.info('[GraphCache] 新配方提交后触发后台刷新');
          this.graphCachePromise = this.buildGraphCacheAsync().finally(() => {
            this.graphCachePromise = null;
          });
        }
      }, 0);
      
      return recipeResult.lastID!;
    });
  }

  /**
   * 确保物品存在于 items 表（自动收录）- 事务版本
   * 
   * @param itemName 物品名称
   * @param tx 事务数据库实例
   * @returns 贡献分（新物品 +2，已存在 0）
   */
  private async ensureItemExistsWithTx(itemName: string, tx: any): Promise<number> {
    const existing = await tx.get('SELECT * FROM items WHERE name = ?', [itemName]);
    if (!existing) {
      // 基础材料列表（与数据库初始化保持一致）
      const baseItems = ['金', '木', '水', '火', '土'];
      const isBase = baseItems.includes(itemName);
      await tx.run(
        'INSERT INTO items (name, is_base, created_at) VALUES (?, ?, ?)',
        [itemName, isBase ? 1 : 0, getCurrentUTC8TimeForDB()]
      );
      logger.info(`新物品添加到词典: ${itemName}, +2分`);
      return 2; // 新物品 +2 分
    }
    return 0; // 已存在物品不加分
  }

  /**
   * 点赞/取消点赞配方
   */
  async toggleLike(recipeId: number, userId: number): Promise<{ liked: boolean; likes: number }> {
    // 检查是否已点赞
    const existing = await databaseAdapter.get(
      'SELECT * FROM recipe_likes WHERE recipe_id = ? AND user_id = ?',
      [recipeId, userId]
    );

    if (existing) {
      // 取消点赞
      await databaseAdapter.run('DELETE FROM recipe_likes WHERE recipe_id = ? AND user_id = ?', [recipeId, userId]);
      // 更新 recipes 表的 likes 字段
      await databaseAdapter.run('UPDATE recipes SET likes = likes - 1 WHERE id = ?', [recipeId]);

      const recipe = await databaseAdapter.get<{ likes: number }>('SELECT likes FROM recipes WHERE id = ?', [recipeId]);
      return { liked: false, likes: recipe?.likes || 0 };
    } else {
      // 点赞
      await databaseAdapter.run('INSERT INTO recipe_likes (recipe_id, user_id, created_at) VALUES (?, ?, ?)', [recipeId, userId, getCurrentUTC8TimeForDB()]);
      // 更新 recipes 表的 likes 字段
      await databaseAdapter.run('UPDATE recipes SET likes = likes + 1 WHERE id = ?', [recipeId]);

      const recipe = await databaseAdapter.get<{ likes: number }>('SELECT likes FROM recipes WHERE id = ?', [recipeId]);
      return { liked: true, likes: recipe?.likes || 0 };
    }
  }

  // 统计信息缓存
  private statsCache: { data: any; timestamp: number } | null = null;
  private readonly STATS_CACHE_TTL = 30000; // 30秒缓存

  /**
   * 获取图统计信息 - 带缓存优化
   */
  async getGraphStats() {
    // 检查缓存是否有效
    if (this.statsCache && Date.now() - this.statsCache.timestamp < this.STATS_CACHE_TTL) {
      return this.statsCache.data;
    }

    // 优化查询：使用单个事务执行所有统计查询
    const stats = await databaseAdapter.transaction(async (tx) => {
      const [
        recipesCount,
        itemsCount,
        baseItemsCount,
        craftableItemsCount,
        usersCount,
        tasksCount
      ] = await Promise.all([
        tx.get<{ count: number }>('SELECT COUNT(*) as count FROM recipes'),
        tx.get<{ count: number }>('SELECT COUNT(*) as count FROM items'),
        tx.get<{ count: number }>('SELECT COUNT(*) as count FROM items WHERE is_base = 1'),
        tx.get<{ count: number }>(`
          SELECT COUNT(DISTINCT result) as count 
          FROM recipes 
          WHERE result IN (
            SELECT name FROM items WHERE is_base = 0
          )
        `),
        tx.get<{ count: number }>('SELECT COUNT(*) as count FROM user'),
        tx.get<{ count: number }>('SELECT COUNT(*) as count FROM task WHERE status = ?', ['active'])
      ]);

      const result = {
        total_recipes: recipesCount?.count || 0,
        total_items: itemsCount?.count || 0,
        base_items: baseItemsCount?.count || 0,
        reachable_items: craftableItemsCount?.count || 0,
        unreachable_items: (itemsCount?.count || 0) - (craftableItemsCount?.count || 0) - (baseItemsCount?.count || 0),
        valid_recipes: recipesCount?.count || 0,
        invalid_recipes: 0,
        circular_recipes: 0,
        circular_items: 0,
        total_users: usersCount?.count || 0,
        active_tasks: tasksCount?.count || 0
      };

      // 更新缓存
      this.statsCache = {
        data: result,
        timestamp: Date.now()
      };

      return result;
    });

    return stats;
  }

  /**
   * 搜索合成路径（改进的 Dijkstra 算法）- 使用 SynthesisGraph
   */
  async searchPath(targetItem: string): Promise<{ tree: CraftingTreeNode; stats: PathStats } | null> {
    // 使用缓存获取图数据
    const cache = await this.getGraphCache();

    // 初始化 SynthesisGraph 如果不存在
    if (!this.synthesisGraph) {
      this.synthesisGraph = new SynthesisGraph(
        cache.recipes,
        cache.baseItemNames,
        cache.itemToRecipes
      );
    }

    // 使用改进的 Dijkstra 算法查找最优路径
    const optimalPath = this.synthesisGraph.findOptimalPath(targetItem);

    if (!optimalPath) {
      return null;
    }

    // 构建合成树
    const tree = this.buildCraftingTreeFromOptimalPath(targetItem, optimalPath, cache.itemToRecipes, cache.baseItemNames);

    if (!tree) {
      return null;
    }

    // 计算统计信息
    const stats = this.calculateTreeStats(tree, cache.itemToRecipes);

    return { tree, stats };
  }

  /**
   * 递归构建合成树
   */
  private buildCraftingTree(
    item: string,
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    memo: Record<string, CraftingTreeNode | null>
  ): CraftingTreeNode | null {
    // 基础材料
    if (baseItems.includes(item)) {
      return { item, is_base: true };
    }

    // 缓存检查
    if (item in memo) {
      return memo[item];
    }

    // 获取配方
    const recipes = itemToRecipes[item];
    if (!recipes || recipes.length === 0) {
      memo[item] = null;
      return null;
    }

    // 选择第一个配方（可扩展为多路径）
    const recipe = recipes[0];
    const childA = this.buildCraftingTree(recipe.item_a, baseItems, itemToRecipes, memo);
    const childB = this.buildCraftingTree(recipe.item_b, baseItems, itemToRecipes, memo);

    if (!childA || !childB) {
      memo[item] = null;
      return null;
    }

    const tree: CraftingTreeNode = {
      item,
      is_base: false,
      recipe: [recipe.item_a, recipe.item_b],
      children: [childA, childB]
    };

    memo[item] = tree;
    return tree;
  }

  /**
   * 计算树的统计信息
   */
  private calculateTreeStats(tree: CraftingTreeNode, itemToRecipes: Record<string, Recipe[]>): PathStats {
    const materials: Record<string, number> = {};

    const traverse = (node: CraftingTreeNode, depth: number, isRoot: boolean = true): { maxDepth: number; steps: number } => {
      const recipes = itemToRecipes[node.item] || [];

      if (node.is_base) {
        // 对于基础材料，可达物品集合就是基础材料本身
        const baseItems = ['金', '木', '水', '火', '土'];
        materials[node.item] = (materials[node.item] || 0) + 1;
        return { maxDepth: depth, steps: 0 };
      }

      if (!isRoot) {
        // 构建可达物品集合
        const baseItems = ['金', '木', '水', '火', '土'];
        const reachableItems = this.buildReachableItemsSet(baseItems, itemToRecipes);
      }

      // 确保子节点不为null才进行递归遍历
      let resultA = { maxDepth: depth, steps: 0 };
      let resultB = { maxDepth: depth, steps: 0 };

      if (node.children) {
        const [childA, childB] = node.children;
        if (childA) {
          resultA = traverse(childA, depth + 1, false);
        }
        if (childB) {
          resultB = traverse(childB, depth + 1, false);
        }
      }

      return {
        maxDepth: Math.max(resultA.maxDepth, resultB.maxDepth),
        steps: 1 + resultA.steps + resultB.steps
      };
    };

    const { maxDepth, steps } = traverse(tree, 0, true);
    const totalMaterials = Object.values(materials).reduce((sum, count) => sum + count, 0);

    return {
      depth: maxDepth,
      width: steps,
      total_materials: totalMaterials,
      materials
    };
  }


  /**
   * 获取缓存状态信息
   */
  getCacheStatus(): {
    hasGraphCache: boolean;
    graphCacheAge?: number;
  } {
    const now = Date.now();

    return this.graphCache ? {
      hasGraphCache: true,
      graphCacheAge: now - this.graphCache.lastUpdated
    } : {
      hasGraphCache: false
    };
  }

  /**
   * 构建依赖图（包含最简路径排序）
   */
  private buildDependencyGraph(recipes: Recipe[], allItemNames: string[]): {
    itemToRecipes: Record<string, Recipe[]>;
    recipeGraph: Record<string, string[]>;
  } {
    const itemToRecipes: Record<string, Recipe[]> = {};
    const recipeGraph: Record<string, string[]> = {};

    // 初始化所有物品
    for (const itemName of allItemNames) {
      itemToRecipes[itemName] = [];
      recipeGraph[itemName] = [];
    }

    // 构建物品到配方的映射
    for (const recipe of recipes) {
      if (!itemToRecipes[recipe.result]) {
        itemToRecipes[recipe.result] = [];
      }
      itemToRecipes[recipe.result].push(recipe);

      // 构建依赖关系：result 依赖于 item_a 和 item_b
      if (!recipeGraph[recipe.result]) {
        recipeGraph[recipe.result] = [];
      }
      recipeGraph[recipe.result].push(recipe.item_a);
      recipeGraph[recipe.result].push(recipe.item_b);
    }


    return { itemToRecipes, recipeGraph };
  }

  /**
   * 分析可达性（BFS算法）- 优化版，包含循环依赖检测
   * 
   * 性能优化：预先构建反向索引（材料 → 配方），避免每次都遍历所有配方
   * 循环依赖处理：在可达性分析阶段检测循环依赖，确保冰柱图构建阶段不会遇到循环
   * 原算法复杂度：O(n + e) - n个物品 + e条边（配方数量）
   */
  private analyzeReachability(
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    allItemNames: string[]
  ): { reachableItems: Set<string>; unreachableItems: Set<string> } {
    const reachableItems = new Set<string>(baseItems);
    const queue = [...baseItems];
    const visitedInCurrentPath = new Set<string>(); // 用于检测循环依赖
    const detectedCycles = new Set<string>(); // 记录已检测到的循环依赖

    // 🚀 性能优化：预先构建反向索引 - 材料 → 使用该材料的所有配方
    // 这样就不需要每次都遍历所有配方了
    const materialToRecipes = new Map<string, Recipe[]>();
    for (const recipes of Object.values(itemToRecipes)) {
      for (const recipe of recipes) {
        // item_a 作为材料
        if (!materialToRecipes.has(recipe.item_a)) {
          materialToRecipes.set(recipe.item_a, []);
        }
        materialToRecipes.get(recipe.item_a)!.push(recipe);

        // item_b 作为材料
        if (!materialToRecipes.has(recipe.item_b)) {
          materialToRecipes.set(recipe.item_b, []);
        }
        materialToRecipes.get(recipe.item_b)!.push(recipe);
      }
    }

    logger.info(`可达性分析：构建了反向索引，材料种类: ${materialToRecipes.size}`);

    while (queue.length > 0) {
      const current = queue.shift()!;

      // 🚀 只查找使用当前物品作为材料的配方（不是遍历所有配方）
      const recipesUsingCurrent = materialToRecipes.get(current) || [];

      for (const recipe of recipesUsingCurrent) {
        // 只有当两个材料都可达时，结果才可达
        if (reachableItems.has(recipe.item_a) && reachableItems.has(recipe.item_b)) {
          const result = recipe.result;

          // 🚀 循环依赖检测：如果结果已经在当前路径中，说明存在循环依赖
          if (visitedInCurrentPath.has(result)) {
            // 静默记录循环依赖，不输出单个警告
            detectedCycles.add(result);
            continue; // 跳过循环依赖的配方
          }

          if (!reachableItems.has(result)) {
            reachableItems.add(result);
            queue.push(result);

            // 临时标记当前路径中的物品，用于循环依赖检测
            visitedInCurrentPath.add(result);
          }
        }
      }

      // 处理完当前物品后，从路径中移除
      visitedInCurrentPath.delete(current);
    }

    // 汇总循环依赖检测结果（只在有循环依赖时显示）
    if (detectedCycles.size > 0) {
      logger.warn(`可达性分析：检测到 ${detectedCycles.size} 个循环依赖，已跳过相关配方`);
      // 如果需要调试，可以取消下面的注释
      // logger.info(`循环依赖物品列表: ${Array.from(detectedCycles).join(', ')}`);
    }

    logger.info(`可达性分析完成：可达物品 ${reachableItems.size} 个`);

    // 不可及物品 = 所有物品 - 可达物品
    const unreachableItems = new Set<string>(
      allItemNames.filter(item => !reachableItems.has(item))
    );

    logger.info(`不可达物品: ${unreachableItems.size} 个`);

    return { reachableItems, unreachableItems };
  }

  /**
   * 根据最优路径构建合成树
   */
  private buildCraftingTreeFromOptimalPath(
    targetItem: string,
    optimalPath: ItemInfo,
    itemToRecipes: Record<string, Recipe[]>,
    baseItemNames: string[],
    visited: Set<string> = new Set()
  ): CraftingTreeNode | null {
    // 检测循环依赖
    if (visited.has(targetItem)) {
      logger.warn(`检测到循环依赖，跳过物品: ${targetItem}`);
      return null;
    }
    
    // 如果目标物品是基础材料，直接返回基础节点
    if (baseItemNames.includes(targetItem)) {
      return { item: targetItem, is_base: true };
    }

    // 获取用于合成目标物品的配方
    const recipes = itemToRecipes[targetItem] || [];
    if (recipes.length === 0 || !optimalPath.recipe) {
      return null;
    }

    // 构建合成树 - 每个配方有两个输入，所以 children 是元组
    const tree: CraftingTreeNode = {
      item: targetItem,
      is_base: false
    };

    // 使用最优配方构建子节点
    const recipe = optimalPath.recipe;
    
    // 为子节点创建新的访问集合
    const newVisited = new Set(visited);
    newVisited.add(targetItem);
    
    // 递归构建子节点，但限制深度以防止无限递归
    if (newVisited.size < 50) { // 设置最大递归深度限制
      // 为子项查找各自的最优路径
      if (!this.synthesisGraph) {
        logger.warn(`SynthesisGraph 未初始化，无法为子项查找最优路径: ${recipe.item_a}, ${recipe.item_b}`);
        return tree;
      }
      const optimalPathA = this.synthesisGraph.findOptimalPath(recipe.item_a);
      const optimalPathB = this.synthesisGraph.findOptimalPath(recipe.item_b);
      
      if (optimalPathA && optimalPathB) {
        const childA = this.buildCraftingTreeFromOptimalPath(recipe.item_a, optimalPathA, itemToRecipes, baseItemNames, newVisited);
        const childB = this.buildCraftingTreeFromOptimalPath(recipe.item_b, optimalPathB, itemToRecipes, baseItemNames, newVisited);
        
        if (childA && childB) {
          tree.children = [childA, childB];
          tree.recipe = [recipe.item_a, recipe.item_b];
        }
      } else {
        logger.warn(`无法为子项找到最优路径: ${recipe.item_a} 或 ${recipe.item_b}`);
      }
    } else {
      logger.warn(`达到最大递归深度限制，跳过物品: ${targetItem}`);
    }

    return tree;
  }


  /**
   * 获取单个物品详情
   */
  async getItemById(id: number) {
    const item = await databaseAdapter.get<Item & { usage_count: number; recipe_count: number; discoverer_name?: string; discoverer_emoji?: string }>(
      `SELECT 
         i.*,
         COALESCE(usage_stats.usage_count, 0) as usage_count,
         COALESCE(result_stats.recipe_count, 0) as recipe_count,
         u.name as discoverer_name,
         u.emoji as discoverer_emoji
       FROM items i
       LEFT JOIN user u ON i.user_id = u.id
       LEFT JOIN (
         -- 计算作为材料被使用的次数
         SELECT item_name, SUM(cnt) as usage_count
         FROM (
           SELECT item_a as item_name, COUNT(*) as cnt FROM recipes GROUP BY item_a
           UNION ALL
           SELECT item_b as item_name, COUNT(*) as cnt FROM recipes GROUP BY item_b
         )
         GROUP BY item_name
       ) as usage_stats ON usage_stats.item_name = i.name
       LEFT JOIN (
         -- 计算作为结果出现的次数
         SELECT result as item_name, COUNT(*) as recipe_count
         FROM recipes
         GROUP BY result
       ) as result_stats ON result_stats.item_name = i.name
       WHERE i.id = ? AND i.is_public = 1`,
      [id]
    );

    if (!item) {
      throw new Error('物品不存在');
    }

    return this.truncateRecordEmojis(item);
  }

  /**
   * 根据物品名称获取物品详情
   */
  async getItemByName(name: string) {
    const item = await databaseAdapter.get<Item & { usage_count: number; recipe_count: number; discoverer_name?: string; discoverer_emoji?: string }>(
      `SELECT 
         i.*,
         COALESCE(usage_stats.usage_count, 0) as usage_count,
         COALESCE(result_stats.recipe_count, 0) as recipe_count,
         u.name as discoverer_name,
         u.emoji as discoverer_emoji
       FROM items i
       LEFT JOIN user u ON i.user_id = u.id
       LEFT JOIN (
         -- 计算作为材料被使用的次数
         SELECT item_name, SUM(cnt) as usage_count
         FROM (
           SELECT item_a as item_name, COUNT(*) as cnt FROM recipes GROUP BY item_a
           UNION ALL
           SELECT item_b as item_name, COUNT(*) as cnt FROM recipes GROUP BY item_b
         )
         GROUP BY item_name
       ) as usage_stats ON usage_stats.item_name = i.name
       LEFT JOIN (
         -- 计算作为结果出现的次数
         SELECT result as item_name, COUNT(*) as recipe_count
         FROM recipes
         GROUP BY result
       ) as result_stats ON result_stats.item_name = i.name
       WHERE i.name = ? AND i.is_public = 1`,
      [name]
    );

    if (!item) {
      throw new Error('物品不存在');
    }

    return this.truncateRecordEmojis(item);
  }


  /**
   * 计算配方的路径统计信息（用于排序）
   */
  private calculateRecipeStats(
    recipe: Recipe,
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    memo: Record<string, { depth: number; width: number }> = {}
  ): { depth: number; width: number } {
    const cacheKey = `${recipe.item_a}_${recipe.item_b}_${recipe.result}`;
    if (memo[cacheKey]) {
      return memo[cacheKey];
    }

    // 计算 item_a 的统计信息
    const statsA = this.calculateItemStatsForSorting(recipe.item_a, baseItems, itemToRecipes, memo);
    // 计算 item_b 的统计信息
    const statsB = this.calculateItemStatsForSorting(recipe.item_b, baseItems, itemToRecipes, memo);

    // 深度：取两个素材的最大深度
    const depth = Math.max(statsA.depth, statsB.depth);
    // 宽度：两个素材的宽度总和
    const width = statsA.width + statsB.width;

    const result = { depth, width };
    memo[cacheKey] = result;
    return result;
  }

  /**
   * 检测是否为自合成配方
   * 自合成配方定义：a+a=a 或 a+b=a
   */
  private isSelfCraftRecipe(recipe: Recipe): boolean {
    // a+a=a 类型：两个材料相同且等于结果
    if (recipe.item_a === recipe.result && recipe.item_b === recipe.result) {
      return true;
    }
    // a+b=a 类型：其中一个材料等于结果
    if (recipe.item_a === recipe.result || recipe.item_b === recipe.result) {
      return true;
    }
    return false;
  }

  /**
   * 计算物品的统计信息（用于排序） - 迭代式DFS，避免深层递归
   * 使用显式栈来处理依赖链，更高效且不易栈溢出
   */
  private calculateItemStatsForSorting(
    startItem: string,
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    memo: Record<string, { depth: number; width: number }> = {}
  ): { depth: number; width: number } {
    if (memo[startItem]) {
      return memo[startItem];
    }

    // 快速检查基础材料
    if (baseItems.includes(startItem)) {
      const result = { depth: 0, width: 0 };
      memo[startItem] = result;
      return result;
    }

    // 快速检查是否有配方
    const recipes = itemToRecipes[startItem];
    if (!recipes || recipes.length === 0) {
      const result = { depth: 0, width: 0 };
      memo[startItem] = result;
      return result;
    }

    // 迭代式DFS栈：{ itemName, stage: 'process' | 'combine' }
    // stage='process': 需要处理依赖
    // stage='combine': 依赖已处理，合并结果
    interface StackFrame {
      itemName: string;
      stage: 'process' | 'combine';
      recipe?: Recipe;
      statsA?: { depth: number; width: number };
      statsB?: { depth: number; width: number };
    }

    const stack: StackFrame[] = [{ itemName: startItem, stage: 'process' }];
    const processing = new Set<string>();

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;

      if (frame.stage === 'process') {
        // 快速路径：已在缓存中
        if (memo[frame.itemName]) {
          stack.pop();
          continue;
        }

        // 检测循环依赖
        if (processing.has(frame.itemName)) {
          // 循环依赖的物品不可及
          memo[frame.itemName] = { depth: 0, width: 0};
          stack.pop();
          continue;
        }

        // 基础材料
        if (baseItems.includes(frame.itemName)) {
          memo[frame.itemName] = { depth: 0, width: 0 };
          stack.pop();
          continue;
        }

        // 没有配方
        const itemRecipes = itemToRecipes[frame.itemName];
        if (!itemRecipes || itemRecipes.length === 0) {
          memo[frame.itemName] = { depth: 0, width: 0 };
          stack.pop();
          continue;
        }

        // 标记处理中，获取第一个配方
        processing.add(frame.itemName);
        frame.recipe = itemRecipes[0];
        frame.stage = 'combine';

        // 推入依赖项（反序，因为栈是后进先出）
        const itemB = frame.recipe.item_b;
        const itemA = frame.recipe.item_a;

        // 只有未在缓存中的才推入
        if (!memo[itemB]) {
          stack.push({ itemName: itemB, stage: 'process' });
        }
        if (!memo[itemA]) {
          stack.push({ itemName: itemA, stage: 'process' });
        }
      } else if (frame.stage === 'combine') {
        // 依赖已处理，合并结果
        const recipe = frame.recipe!;
        const statsA = memo[recipe.item_a] || { depth: 0, width: 0 };
        const statsB = memo[recipe.item_b] || { depth: 0, width: 0 };

        const depth = Math.max(statsA.depth, statsB.depth) + 1;
        const width = statsA.width + statsB.width + 1;

        memo[frame.itemName] = { depth, width };
        processing.delete(frame.itemName);
        stack.pop();
      }
    }

    return memo[startItem] || { depth: 0, width: 0 };
  }

  /**
   * 构建可达物品集合（基于基础材料和配方图）
   */
  private buildReachableItemsSet(
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>
  ): Set<string> {
    const reachableItems = new Set<string>(baseItems);
    const queue = [...baseItems];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const recipes = itemToRecipes[current] || [];
      
      for (const recipe of recipes) {
        // 只有当两个材料都可达时，结果才可达
        if (reachableItems.has(recipe.item_a) && reachableItems.has(recipe.item_b)) {
          const result = recipe.result;
          if (!reachableItems.has(result)) {
            reachableItems.add(result);
            queue.push(result);
          }
        }
      }
    }
    
    return reachableItems;
  }



  /**
   * 获取随机物品
   */
  async getRandomItem(type: string = 'synthetic') {
    // 构建查询条件
    let whereConditions = ['is_public = 1'];

    // 类型条件
    if (type === 'base') {
      whereConditions.push('is_base = 1');
    } else if (type === 'synthetic') {
      whereConditions.push('is_base = 0');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // SQLite 使用 RANDOM() 函数获取随机记录
    const item = await databaseAdapter.get<Item & { usage_count: number; recipe_count: number }>(
      `SELECT 
         i.*,
         COALESCE(usage_stats.usage_count, 0) as usage_count,
         COALESCE(result_stats.recipe_count, 0) as recipe_count
       FROM items i
       LEFT JOIN (
         SELECT item_name, SUM(cnt) as usage_count
         FROM (
           SELECT item_a as item_name, COUNT(*) as cnt FROM recipes GROUP BY item_a
           UNION ALL
           SELECT item_b as item_name, COUNT(*) as cnt FROM recipes GROUP BY item_b
         )
         GROUP BY item_name
       ) as usage_stats ON usage_stats.item_name = i.name
       LEFT JOIN (
         SELECT result as item_name, COUNT(*) as recipe_count
         FROM recipes
         GROUP BY result
       ) as result_stats ON result_stats.item_name = i.name
       ${whereClause}
       ORDER BY RANDOM()
       LIMIT 1`
    );

    return item ? this.truncateRecordEmojis(item) : null;
  }

  /**
   * 获取物品列表
   */
  async getItemsList(params: {
    page: number;
    limit: number;
    search?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
    includePrivate?: boolean;
    exact?: boolean;  // 精确匹配物品名称
  }) {
    const { page, limit, search = '', type = '', sortBy = 'name', sortOrder = 'asc', includePrivate = false, exact = false } = params;
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereConditions = [];
    let queryParams: any[] = [];

    // 搜索条件
    if (search) {
      if (exact) {
        // 精确匹配物品名称
        whereConditions.push('name = ?');
        queryParams.push(search);
      } else {
        // 模糊匹配
        whereConditions.push('(name LIKE ? OR emoji LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`);
      }
    }

    // 类型条件
    if (type === 'base') {
      whereConditions.push('is_base = 1');
    } else if (type === 'synthetic') {
      whereConditions.push('is_base = 0');
    }

    if (!includePrivate) {
      whereConditions.push('is_public = 1');
    }
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 排序条件
    let orderClause = '';
    switch (sortBy) {
      case 'name':
        // 强制逻辑：没有emoji的元素排在最后
        orderClause = `ORDER BY CASE WHEN emoji IS NULL OR emoji = '' THEN 1 ELSE 0 END, name ${sortOrder.toUpperCase()}`;
        break;
      case 'id':
        // 强制逻辑：没有emoji的元素排在最后
        orderClause = `ORDER BY CASE WHEN emoji IS NULL OR emoji = '' THEN 1 ELSE 0 END, id ${sortOrder.toUpperCase()}`;
        break;
      case 'usage_count':
        // 强制逻辑：没有emoji的元素排在最后
        orderClause = `ORDER BY CASE WHEN emoji IS NULL OR emoji = '' THEN 1 ELSE 0 END, usage_count ${sortOrder.toUpperCase()}`;
        break;
      default:
        // 强制逻辑：没有emoji的元素排在最后
        orderClause = `ORDER BY CASE WHEN emoji IS NULL OR emoji = '' THEN 1 ELSE 0 END, id ASC`;
    }

    // 查询物品列表（优化：使用 LEFT JOIN 预聚合替代每行子查询）
    const items = await databaseAdapter.all<Item & { usage_count: number; recipe_count: number }>(
      `SELECT 
         i.*,
         COALESCE(usage_stats.usage_count, 0) as usage_count,
         COALESCE(result_stats.recipe_count, 0) as recipe_count
       FROM items i
       LEFT JOIN (
         -- 计算每个物品作为材料被使用的次数（item_a 和 item_b 合并统计）
         SELECT item_name, SUM(cnt) as usage_count
         FROM (
           SELECT item_a as item_name, COUNT(*) as cnt FROM recipes GROUP BY item_a
           UNION ALL
           SELECT item_b as item_name, COUNT(*) as cnt FROM recipes GROUP BY item_b
         )
         GROUP BY item_name
       ) as usage_stats ON usage_stats.item_name = i.name
       LEFT JOIN (
         -- 计算每个物品作为结果出现的次数
         SELECT result as item_name, COUNT(*) as recipe_count
         FROM recipes
         GROUP BY result
       ) as result_stats ON result_stats.item_name = i.name
       ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // 获取总数
    const totalResult = await databaseAdapter.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM items ${whereClause}`,
      queryParams
    );

    return {
      items: this.truncateRecordsEmojis(items),
      total: totalResult?.count || 0,
      page, limit
    };
  }

  /**
   * 获取元素的可达性统计信息
   */
  async getReachabilityStats(itemName: string): Promise<{
    reachable: boolean;
  }> {
    try {
      const cache = await this.getGraphCache();

      // 检查可达性
      const reachable = cache.reachableItems.has(itemName);

      return { reachable };
    } catch (error) {
      logger.error(`获取元素 ${itemName} 的可达性统计失败:`, { 
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}

export const recipeService = new RecipeService();