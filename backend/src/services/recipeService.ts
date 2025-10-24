import { databaseAdapter } from '../database/databaseAdapter';
import { logger } from '../utils/logger';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';

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
  breadth: number;
  materials: Record<string, number>;
}

export interface UnreachableGraph {
  id: string;
  type: 'isolated' | 'boundary' | 'circular' | 'linear';
  nodes: string[];
  edges: Array<{ source: string; target: string }>;
  stats: UnreachableGraphStats;
}

export interface UnreachableGraphStats {
  size: number;
  // 有向图统计指标
  inDegree: number;        // 总入度（被依赖次数）
  outDegree: number;       // 总出度（依赖其他节点次数）
  avgDegree: number;       // 平均度数
  density: number;         // 图密度
  clustering: number;      // 聚类系数
  boundaryNodes: number;   // 边界节点数（可能连接到合法图的节点）
}

export interface GraphSystemStats {
  totalValidItems: number;
  totalUnreachableItems: number;
  unreachableGraphCount: number;
  graphTypes: Record<string, number>;
  validGraphStats: {
    maxDepth: number;
    avgDepth: number;
    maxWidth: number;
    avgWidth: number;
    maxBreadth: number;
    avgBreadth: number;
  };
}

export interface IcicleNode {
  id: string;
  name: string;
  emoji?: string;
  isBase: boolean;
  value: number; // 节点宽度
  children?: IcicleNode[];
  recipe?: {
    item_a: string;
    item_b: string;
  };
  stats?: {
    depth: number;
    width: number;
    breadth: number;
  };
}

export interface IcicleChartData {
  nodes: IcicleNode[];
  totalElements: number;
  maxDepth: number;
}

// 压缩版冰柱图节点（用于大数据量传输）
export interface CompressedIcicleNode {
  i: string; // id
  n: string; // name
  e?: string; // emoji
  b: boolean; // isBase
  v: number; // value
  c?: CompressedIcicleNode[]; // children
  r?: [string, string]; // recipe [item_a, item_b]
}

// 压缩版冰柱图数据
export interface CompressedIcicleChartData {
  n: CompressedIcicleNode[]; // nodes
  t: number; // totalElements
  d: number; // maxDepth
}

// 分页版冰柱图数据
export interface PaginatedIcicleChartData {
  nodes: IcicleNode[];
  totalElements: number;
  maxDepth: number;
  hasMore: boolean;
  nextCursor?: string;
  currentPage: number;
  totalPages: number;
}

export class RecipeService {
  // 图缓存相关属性
  private graphCache: {
    recipes: Recipe[];
    items: Item[];
    baseItems: Item[];
    itemToRecipes: Record<string, Recipe[]>;
    recipeGraph: Record<string, string[]>;
    baseItemNames: string[];
    allItemNames: string[];
    itemEmojiMap: Record<string, string>;
    reachableItems: Set<string>;           // ✅ 新增：可达物品集合
    unreachableItems: Set<string>;         // ✅ 新增：不可达物品集合
    shortestPathTrees: Map<string, IcicleNode>; // 🚀 新增：最短路径树缓存
    lastUpdated: number;
  } | null = null;

  // 并发保护：当缓存正在构建时，保存构建的 Promise，避免重复构建
  private graphCachePromise: Promise<{
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
    shortestPathTrees: Map<string, IcicleNode>;
  }> | null = null;

  // 缓存有效期（默认更长，显著降低重建频率）
  private readonly CACHE_TTL = 60 * 60 * 1000; // 图缓存 60 分钟
  
  // 数据压缩和分页配置
  private readonly COMPRESSION_THRESHOLD = 1000; // 节点数量超过阈值启用压缩
  private readonly PAGE_SIZE = 1000; // 分页大小
  
  // 增量更新相关配置
  private readonly INCREMENTAL_UPDATE_THRESHOLD = 500; // 增量更新阈值
  private dataVersion = 0; // 数据版本号
  private lastUpdateTime = 0; // 最后更新时间
  
  // 性能监控相关
  private performanceStats = {
    totalRequests: 0,
    compressedRequests: 0,
    paginatedRequests: 0,
    incrementalRequests: 0,
    averageResponseTime: 0,
    totalResponseTime: 0
  };

  /**
   * 压缩冰柱图节点数据
   */
  private compressIcicleNode(node: IcicleNode): CompressedIcicleNode {
    const compressed: CompressedIcicleNode = {
      i: node.id,
      n: node.name,
      b: node.isBase,
      v: node.value
    };
    
    if (node.emoji) compressed.e = node.emoji;
    if (node.recipe) compressed.r = [node.recipe.item_a, node.recipe.item_b];
    if (node.children && node.children.length > 0) {
      compressed.c = node.children.map(child => this.compressIcicleNode(child));
    }
    
    return compressed;
  }

  /**
   * 解压缩冰柱图节点数据
   */
  private decompressIcicleNode(compressed: CompressedIcicleNode): IcicleNode {
    const node: IcicleNode = {
      id: compressed.i,
      name: compressed.n,
      isBase: compressed.b,
      value: compressed.v
    };
    
    if (compressed.e) node.emoji = compressed.e;
    if (compressed.r) node.recipe = { item_a: compressed.r[0], item_b: compressed.r[1] };
    if (compressed.c && compressed.c.length > 0) {
      node.children = compressed.c.map(child => this.decompressIcicleNode(child));
    }
    
    return node;
  }

  /**
   * 压缩冰柱图数据
   */
  public compressIcicleChartData(data: IcicleChartData): CompressedIcicleChartData {
    return {
      n: data.nodes.map(node => this.compressIcicleNode(node)),
      t: data.totalElements,
      d: data.maxDepth
    };
  }

  /**
   * 解压缩冰柱图数据
   */
  private decompressIcicleChartData(compressed: CompressedIcicleChartData): IcicleChartData {
    return {
      nodes: compressed.n.map(node => this.decompressIcicleNode(node)),
      totalElements: compressed.t,
      maxDepth: compressed.d
    };
  }

  /**
   * 获取或更新图缓存（非阻塞版本）
   * 优化：在缓存构建期间返回旧缓存数据，避免阻塞请求
   */
  public async getGraphCache(): Promise<{
    recipes: Recipe[];
    items: Item[];
    baseItems: Item[];
    itemToRecipes: Record<string, Recipe[]>;
    recipeGraph: Record<string, string[]>;
    baseItemNames: string[];
    allItemNames: string[];
    itemEmojiMap: Record<string, string>;
    reachableItems: Set<string>;           // ✅ 新增：可达物品集合
    unreachableItems: Set<string>;         // ✅ 新增：不可达物品集合
    shortestPathTrees: Map<string, IcicleNode>; // 🚀 新增：最短路径树缓存
  }> {
    const now = Date.now();

    // 如果缓存存在且未过期，直接返回
    if (this.graphCache && now - this.graphCache.lastUpdated <= this.CACHE_TTL) {
      return this.graphCache;
    }

    // 如果缓存存在但过期，返回旧缓存，并触发异步更新（非阻塞）
    if (this.graphCache) {
      // 如果未在构建中，启动异步构建
      if (!this.graphCachePromise) {
        this.graphCachePromise = this.buildGraphCacheAsync().finally(() => {
          this.graphCachePromise = null;
        });
      }
      return this.graphCache;
    }

    // 如果无缓存，则等待构建（初始情况）
    if (this.graphCachePromise) {
      return this.graphCachePromise;
    }

    this.graphCachePromise = this.buildGraphCacheAsync().finally(() => {
      this.graphCachePromise = null;
    });

    return this.graphCachePromise;
  }

  /**
   * 异步构建图缓存（内部方法）
   */
  private async buildGraphCacheAsync(): Promise<{
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
    shortestPathTrees: Map<string, IcicleNode>;
  }> {
    try {
      logger.info('图缓存已过期或不存在，重新构建...');

      // 获取所有公开配方和物品
      const recipes = await databaseAdapter.all<Recipe>('SELECT id, item_a, item_b, result FROM recipes WHERE is_public = 1');
      const items = await databaseAdapter.all<Item>('SELECT name, emoji FROM items');
      const baseItems = await databaseAdapter.all<Item>('SELECT name, emoji FROM items WHERE is_base = 1');

      const baseItemNames = baseItems.map(item => item.name);
      const allItemNames = items.map(item => item.name);

      // 构建依赖图
      const { itemToRecipes, recipeGraph } = this.buildDependencyGraph(recipes, allItemNames);

      // 🚀 性能优化：进行可达性分析
      const { reachableItems, unreachableItems } = this.analyzeReachability(baseItemNames, itemToRecipes, allItemNames);

      // 构建emoji映射
      const itemEmojiMap: Record<string, string> = {};
      for (const item of items) {
        if (item.emoji) {
          itemEmojiMap[item.name] = item.emoji;
        }
      }

      // 🚀 性能优化：预计算所有可达物品的最短路径树
      const shortestPathTrees = new Map<string, IcicleNode>();
      logger.info('开始预计算最短路径树...');

      // 使用全局记忆化缓存构建所有可达物品的最短路径树
      const globalTreeMemo = new Map<string, IcicleNode | null>();
      let precomputedCount = 0;
      const totalReachable = reachableItems.size;

      // 将同步循环改为异步分批处理，避免阻塞事件循环
      const reachableItemsArray = Array.from(reachableItems);
      const BATCH_SIZE = 5; // 减小批次大小到5个物品，进一步减少阻塞
      
      for (let i = 0; i < reachableItemsArray.length; i += BATCH_SIZE) {
        const batch = reachableItemsArray.slice(i, i + BATCH_SIZE);
        
        // 同步处理当前批次
        for (const itemName of batch) {
          const tree = this.buildIcicleTreeWithCache(itemName, baseItemNames, itemToRecipes, itemEmojiMap, globalTreeMemo);
          if (tree) {
            shortestPathTrees.set(itemName, tree);
          }
          precomputedCount++;

          // 每处理100个物品输出一次进度，更频繁地更新进度
          if (precomputedCount % 100 === 0) {
            logger.info(`最短路径树预计算进度：${precomputedCount}/${totalReachable} (${Math.round(precomputedCount / totalReachable * 100)}%)`);
            
            // 每100个物品也让出事件循环一次
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        // 每处理完一批后让出事件循环，允许其他请求处理
        if (i + BATCH_SIZE < reachableItemsArray.length) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      logger.info(`最短路径树预计算完成：共 ${shortestPathTrees.size} 个物品的最短路径树已缓存`);

      // 更新缓存
      const newCache = {
        recipes,
        items,
        baseItems,
        itemToRecipes,
        recipeGraph,
        baseItemNames,
        allItemNames,
        itemEmojiMap,
        reachableItems,           // ✅ 新增：可达物品集合
        unreachableItems,         // ✅ 新增：不可达物品集合
        shortestPathTrees,        // 🚀 新增：最短路径树缓存
        lastUpdated: Date.now()
      };

      this.graphCache = newCache;

      logger.info(`图缓存构建完成，包含 ${recipes.length} 个配方和 ${allItemNames.length} 个物品`);

      return newCache;
    } catch (err) {
      logger.error('图缓存构建失败:', err);
      throw err;
    }
  }

  /**
   * 强制刷新图缓存
   */
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
    cursor?: string; // 游标分页
    includePrivate?: boolean; // 管理用途：包含未公开
    includeStats?: boolean;   // 是否计算每条配方的路径统计（默认关闭，较耗时）
  }) {
    const { page = 1, limit = 20, search, orderBy = 'created_at', userId, result, cursor, includePrivate = false, includeStats = false } = params;

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
              width: pathStats.width,
              breadth: pathStats.breadth
            };
          } catch (error) {
            logger.error(`计算配方 ${recipe.id} 的统计信息失败:`, error);
          }

          // 如果计算失败，返回默认值
          return {
            ...recipe,
            depth: 0,
            width: 0,
            breadth: 0
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

    // cursor参数
    if (cursor) {
      countParams.push(sqlParams[paramIndex++]);
    }

    const totalPromise = this.getCountAsync(countParams, conditions);

    return {
      recipes: recipesWithStats,
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
    let countSql = 'SELECT COUNT(*) as count FROM recipes r';
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }

    try {
      const totalResult = await databaseAdapter.get<{ count: number }>(countSql, baseParams);
      return totalResult?.count || 0;
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
        result_emoji: resultItem.result_emoji,
        recipe_count: resultItem.recipe_count,
        recipes: recipes
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
      `SELECT r.*, u.name as creator_name,
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

    return recipe;
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
   * 搜索合成路径（BFS 算法）- 使用缓存优化
   */
  async searchPath(targetItem: string): Promise<{ tree: CraftingTreeNode; stats: PathStats } | null> {
    // 使用缓存获取图数据
    const cache = await this.getGraphCache();

    // 构建合成树
    const memo: Record<string, CraftingTreeNode | null> = {};
    const tree = this.buildCraftingTree(targetItem, cache.baseItemNames, cache.itemToRecipes, memo);

    if (!tree) {
      return null;
    }

    // 计算统计信息
    const stats = this.calculateTreeStats(tree, cache.itemToRecipes);

    return { tree, stats };
  }

  /**
   * 内部搜索方法（不使用缓存，避免递归调用）
   */
  private async searchPathInternal(
    targetItem: string,
    baseItemNames: string[],
    itemToRecipes: Record<string, Recipe[]>
  ): Promise<{ tree: CraftingTreeNode; stats: PathStats } | null> {
    // 构建合成树
    const memo: Record<string, CraftingTreeNode | null> = {};
    const tree = this.buildCraftingTree(targetItem, baseItemNames, itemToRecipes, memo);

    if (!tree) {
      return null;
    }

    // 计算统计信息
    const stats = this.calculateTreeStats(tree, itemToRecipes);

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
    let breadthSum = 0;

    const traverse = (node: CraftingTreeNode, depth: number, isRoot: boolean = true): { maxDepth: number; steps: number } => {
      // 计算该节点的广度（能匹配到的配方数量）
      // 对于基础材料，广度是使用该材料作为输入材料的配方数量
      // 对于合成材料，广度是能合成该材料的配方数量
      const recipes = itemToRecipes[node.item] || [];

      // 如果是基础材料，广度是使用该材料作为输入材料的配方数量
      if (node.is_base) {
        // 查找所有使用该基础材料作为输入材料的配方
        const inputRecipes = Object.values(itemToRecipes).flat().filter(recipe =>
          recipe.item_a === node.item || recipe.item_b === node.item
        );
        breadthSum += inputRecipes.length;
        materials[node.item] = (materials[node.item] || 0) + 1;
        return { maxDepth: depth, steps: 0 };
      }

      // 对于合成材料，广度是能合成该材料的配方数量
      if (!isRoot) {
        breadthSum += recipes.length;
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
      breadth: breadthSum,
      materials
    };
  }

  /**
   * 批量获取配方（用于大数据量场景）
   */
  async getRecipesBatch(params: {
    batchSize?: number;
    lastId?: number;
    search?: string;
    userId?: number;
  }) {
    const { batchSize = 1000, lastId = 0, search, userId } = params;

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
      WHERE r.id > ?
    `;

    const sqlParams: any[] = [];
    if (userId) {
      sqlParams.push(userId);
    }
    sqlParams.push(lastId);

    if (search) {
      sql += ` AND (r.item_a LIKE ? OR r.item_b LIKE ? OR r.result LIKE ?)`;
      sqlParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY r.id ASC LIMIT ?`;
    sqlParams.push(batchSize);

    const recipes = await databaseAdapter.all(sql, sqlParams);

    return {
      recipes,
      hasMore: recipes.length === batchSize,
      lastId: recipes.length > 0 ? recipes[recipes.length - 1].id : lastId
    };
  }

  /**
   * 创建优化索引
   */
  async createOptimizedIndexes() {
    const indexes = [
      // 复合索引优化搜索
      'CREATE INDEX IF NOT EXISTS idx_recipes_search ON recipes(item_a, item_b, result)',
      'CREATE INDEX IF NOT EXISTS idx_recipes_result_created ON recipes(result, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_recipes_result_likes ON recipes(result, likes DESC)',
      // 公开过滤相关索引
      'CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public)',
      'CREATE INDEX IF NOT EXISTS idx_recipes_result_public ON recipes(result, is_public)',
      'CREATE INDEX IF NOT EXISTS idx_recipes_public_created ON recipes(is_public, created_at DESC, id DESC)',
      'CREATE INDEX IF NOT EXISTS idx_recipes_public_likes ON recipes(is_public, likes DESC, id DESC)',

      // 覆盖索引优化
      'CREATE INDEX IF NOT EXISTS idx_recipes_cover ON recipes(id, created_at, likes, user_id)',
    ];

    for (const indexSql of indexes) {
      try {
        await databaseAdapter.run(indexSql);
        logger.info('索引创建成功:', indexSql);
      } catch (error) {
        logger.error('索引创建失败:', error);
      }
    }
  }

  /**
   * 检测和分析不可及图 - 使用缓存优化
   */
  async analyzeUnreachableGraphs(): Promise<{ unreachableGraphs: UnreachableGraph[]; systemStats: GraphSystemStats }> {
    // 使用缓存获取图数据
    const cache = await this.getGraphCache();

    // 分析可达性
    const { reachableItems, unreachableItems } = this.analyzeReachability(cache.baseItemNames, cache.itemToRecipes, cache.allItemNames);

    // 构建不可达图
    const unreachableGraphs = this.buildUnreachableGraphs(unreachableItems, cache.recipeGraph);

    // 计算系统统计
    const systemStats = await this.calculateSystemStats(reachableItems, unreachableGraphs, cache.recipes, cache.itemToRecipes, cache.baseItemNames);

    return { unreachableGraphs, systemStats };
  }

  /**
   * 获取单个物品的最短路径树（使用缓存优化）
   * 
   * 🚀 性能优化：直接从缓存获取，避免重复计算
   */
  async getShortestPathTree(itemName: string): Promise<IcicleNode | null> {
    const cache = await this.getGraphCache();

    // 🚀 直接从缓存获取最短路径树
    const tree = cache.shortestPathTrees.get(itemName);

    if (tree) {
      logger.debug(`最短路径树缓存命中：${itemName}`);
      return tree;
    }

    // 如果缓存中没有，检查是否可达
    if (!cache.reachableItems.has(itemName)) {
      logger.debug(`物品 ${itemName} 不可达，无法构建路径树`);
      return null;
    }

    // 缓存中没有但物品可达，重新构建（这种情况应该很少发生）
    logger.info(`最短路径树缓存未命中，重新构建：${itemName}`);
    const globalTreeMemo = new Map<string, IcicleNode | null>();
    const newTree = this.buildIcicleTreeWithCache(
      itemName,
      cache.baseItemNames,
      cache.itemToRecipes,
      cache.itemEmojiMap,
      globalTreeMemo
    );

    // 更新缓存
    if (newTree) {
      cache.shortestPathTrees.set(itemName, newTree);
    }

    return newTree;
  }

  /**
   * 获取缓存状态信息
   */
  getCacheStatus(): {
    hasGraphCache: boolean;
    graphCacheAge?: number;
    shortestPathTreeCount?: number; // 🚀 最短路径树数量
  } {
    const now = Date.now();

    return this.graphCache ? {
      hasGraphCache: true,
      graphCacheAge: now - this.graphCache.lastUpdated,
      shortestPathTreeCount: this.graphCache.shortestPathTrees.size
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

    // 🚀 性能优化：对每个物品的所有配方进行最简路径排序
    // 排序规则：深度最小 → 宽度最小 → 广度最大 → 字典序
    for (const itemName of allItemNames) {
      const recipesForItem = itemToRecipes[itemName];
      if (recipesForItem && recipesForItem.length > 1) {
        // 创建基础材料集合（用于统计计算）
        const baseItems = ['金', '木', '水', '火', '土'];

        // 计算每个配方的统计信息并排序
        const memo: Record<string, { depth: number; width: number; breadth: number }> = {};

        recipesForItem.sort((a, b) => {
          // 自合成配方检测：a+a=a 或 a+b=a
          const isSelfCraftA = this.isSelfCraftRecipe(a);
          const isSelfCraftB = this.isSelfCraftRecipe(b);
          
          // 自合成配方永远排在最后
          if (isSelfCraftA && !isSelfCraftB) return 1;
          if (!isSelfCraftA && isSelfCraftB) return -1;
          if (isSelfCraftA && isSelfCraftB) {
            // 如果都是自合成配方，按ID排序
            return a.id - b.id;
          }
          
          // 非自合成配方按原排序规则
          const statsA = this.calculateRecipeStats(a, baseItems, itemToRecipes, memo);
          const statsB = this.calculateRecipeStats(b, baseItems, itemToRecipes, memo);

          // 深度最小优先
          if (statsA.depth !== statsB.depth) return statsA.depth - statsB.depth;
          // 宽度最小优先
          if (statsA.width !== statsB.width) return statsA.width - statsB.width;
          // 广度最大优先
          if (statsA.breadth !== statsB.breadth) return statsB.breadth - statsA.breadth;
          // 字典序
          return a.item_a.localeCompare(b.item_a) || a.item_b.localeCompare(b.item_b);
        });

        logger.debug(`物品 ${itemName} 的 ${recipesForItem.length} 个配方已按最简路径排序`);
      }
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
      // logger.debug(`循环依赖物品列表: ${Array.from(detectedCycles).join(', ')}`);
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
   * 构建不可达图
   */
  private buildUnreachableGraphs(unreachableItems: Set<string>, recipeGraph: Record<string, string[]>): UnreachableGraph[] {
    const visited = new Set<string>();
    const graphs: UnreachableGraph[] = [];

    for (const item of unreachableItems) {
      if (visited.has(item)) continue;

      // 找到连通分量
      const component = this.findConnectedComponent(item, recipeGraph, unreachableItems, visited);

      // 构建图
      const graph = this.buildGraphFromComponent(component, recipeGraph);
      graphs.push(graph);
    }

    return graphs;
  }

  /**
   * 找到连通分量（DFS算法）
   */
  private findConnectedComponent(
    startItem: string,
    recipeGraph: Record<string, string[]>,
    unreachableItems: Set<string>,
    visited: Set<string>
  ): Set<string> {
    const stack = [startItem];
    const component = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;

      visited.add(current);
      component.add(current);

      // 查找依赖关系
      const dependencies = recipeGraph[current] || [];
      for (const dep of dependencies) {
        if (unreachableItems.has(dep) && !visited.has(dep)) {
          stack.push(dep);
        }
      }

      // 查找依赖此物品的其他物品
      for (const [item, deps] of Object.entries(recipeGraph)) {
        if (unreachableItems.has(item) && deps.includes(current) && !visited.has(item)) {
          stack.push(item);
        }
      }
    }

    return component;
  }

  /**
   * 从连通分量构建图
   */
  private buildGraphFromComponent(component: Set<string>, recipeGraph: Record<string, string[]>): UnreachableGraph {
    const nodes = Array.from(component);
    const edges: Array<{ source: string; target: string }> = [];

    // 构建边
    for (const node of nodes) {
      const dependencies = recipeGraph[node] || [];
      for (const dep of dependencies) {
        if (component.has(dep)) {
          edges.push({ source: node, target: dep });
        }
      }
    }

    // 分类图类型
    const type = this.classifyGraphType(nodes, edges);

    // 计算统计信息
    const stats = this.calculateUnreachableGraphStats(nodes, edges, recipeGraph);

    return {
      id: `graph_${nodes.join('_').slice(0, 20)}`,
      type,
      nodes,
      edges,
      stats
    };
  }

  /**
   * 分类图类型
   */
  private classifyGraphType(nodes: string[], edges: Array<{ source: string; target: string }>): UnreachableGraph['type'] {
    if (nodes.length === 1) return 'isolated';

    // 检查循环依赖
    if (this.hasCycle(nodes, edges)) return 'circular';

    // 检查线性结构
    if (this.isLinear(nodes, edges)) return 'linear';

    return 'boundary';
  }

  /**
   * 检查图中是否有循环
   */
  private hasCycle(nodes: string[], edges: Array<{ source: string; target: string }>): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string): boolean => {
      if (recursionStack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const neighbors = edges.filter(e => e.source === node).map(e => e.target);
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) return true;
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node)) {
        if (dfs(node)) return true;
      }
    }

    return false;
  }

  /**
   * 检查是否是线性结构
   */
  private isLinear(nodes: string[], edges: Array<{ source: string; target: string }>): boolean {
    // 线性图应该有 n-1 条边，且每个节点最多有两个邻居
    if (edges.length !== nodes.length - 1) return false;

    const degree: Record<string, number> = {};
    for (const node of nodes) {
      degree[node] = 0;
    }

    for (const edge of edges) {
      degree[edge.source]++;
      degree[edge.target]++;
    }

    // 线性图应该有两个端节点（度数为1）和其他节点（度数为2）
    const degreeCounts = Object.values(degree);
    const ones = degreeCounts.filter(d => d === 1).length;
    const twos = degreeCounts.filter(d => d === 2).length;

    return ones === 2 && twos === nodes.length - 2;
  }

  /**
   * 计算不可及图统计信息
   */
  private calculateUnreachableGraphStats(
    nodes: string[],
    edges: Array<{ source: string; target: string }>,
    recipeGraph: Record<string, string[]>
  ): UnreachableGraphStats {
    // 计算有向图统计指标

    // 计算入度和出度
    let totalInDegree = 0;
    let totalOutDegree = 0;

    for (const node of nodes) {
      // 出度：该节点依赖的其他节点数量
      const outDegree = edges.filter(e => e.source === node).length;
      totalOutDegree += outDegree;

      // 入度：依赖该节点的其他节点数量
      const inDegree = edges.filter(e => e.target === node).length;
      totalInDegree += inDegree;
    }

    // 平均度数
    const avgDegree = nodes.length > 0 ? (totalInDegree + totalOutDegree) / nodes.length : 0;

    // 图密度（有向图密度 = 边数 / (节点数 * (节点数 - 1))）
    const density = nodes.length > 1 ? edges.length / (nodes.length * (nodes.length - 1)) : 0;

    // 聚类系数（简化计算：平均邻居连接数）
    let clusteringSum = 0;
    for (const node of nodes) {
      const neighbors = new Set();
      // 添加出边邻居
      edges.filter(e => e.source === node).forEach(e => neighbors.add(e.target));
      // 添加入边邻居
      edges.filter(e => e.target === node).forEach(e => neighbors.add(e.source));

      const neighborCount = neighbors.size;
      if (neighborCount > 1) {
        // 计算邻居之间的实际连接数
        let actualConnections = 0;
        const neighborArray = Array.from(neighbors);
        for (let i = 0; i < neighborArray.length; i++) {
          for (let j = i + 1; j < neighborArray.length; j++) {
            const hasEdge1 = edges.some(e =>
              (e.source === neighborArray[i] && e.target === neighborArray[j]) ||
              (e.source === neighborArray[j] && e.target === neighborArray[i])
            );
            const hasEdge2 = edges.some(e =>
              (e.source === neighborArray[j] && e.target === neighborArray[i]) ||
              (e.source === neighborArray[i] && e.target === neighborArray[j])
            );
            if (hasEdge1 || hasEdge2) {
              actualConnections++;
            }
          }
        }
        const possibleConnections = neighborCount * (neighborCount - 1) / 2;
        clusteringSum += actualConnections / possibleConnections;
      }
    }
    const clustering = nodes.length > 0 ? clusteringSum / nodes.length : 0;

    // 边界节点数（连接到合法图的节点）
    let boundaryNodes = 0;
    for (const node of nodes) {
      // 检查该节点是否连接到合法图（有出边指向合法图）
      const hasBoundaryConnection = edges.some(e =>
        e.source === node && !nodes.includes(e.target)
      );
      if (hasBoundaryConnection) {
        boundaryNodes++;
      }
    }

    return {
      size: nodes.length,
      inDegree: totalInDegree,
      outDegree: totalOutDegree,
      avgDegree,
      density,
      clustering,
      boundaryNodes
    };
  }

  /**
   * 计算图深度（最长路径）
   */
  private calculateGraphDepth(nodes: string[], edges: Array<{ source: string; target: string }>): number {
    if (nodes.length === 0) return 0;
    if (nodes.length === 1) return 1;

    let maxDepth = 1;

    // 对每个节点作为起点进行BFS
    for (const startNode of nodes) {
      const visited = new Set<string>();
      const queue: Array<[string, number]> = [[startNode, 1]];

      while (queue.length > 0) {
        const [current, depth] = queue.shift()!;
        if (visited.has(current)) continue;

        visited.add(current);
        maxDepth = Math.max(maxDepth, depth);

        // 添加邻居
        const neighbors = edges.filter(e => e.source === current).map(e => e.target);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push([neighbor, depth + 1]);
          }
        }
      }
    }

    return maxDepth;
  }

  /**
   * 计算图广度（所有节点的入度之和）
   */
  private calculateGraphBreadth(nodes: string[], recipeGraph: Record<string, string[]>): number {
    let breadth = 0;

    // 🚀 性能优化：预计算所有节点的入度，避免重复遍历
    const inDegreeCache = new Map<string, number>();

    // 首先构建所有节点的入度缓存
    for (const [item, deps] of Object.entries(recipeGraph)) {
      for (const dep of deps) {
        inDegreeCache.set(dep, (inDegreeCache.get(dep) || 0) + 1);
      }
    }

    for (const node of nodes) {
      // 🚀 直接从缓存获取入度
      const inDegree = inDegreeCache.get(node) || 0;
      breadth += inDegree;
    }

    return breadth;
  }

  /**
   * 计算系统统计信息
   */
  private async calculateSystemStats(
    reachableItems: Set<string>,
    unreachableGraphs: UnreachableGraph[],
    recipes: Recipe[],
    itemToRecipes: Record<string, Recipe[]>,
    baseItemNames: string[]
  ): Promise<GraphSystemStats> {
    const totalValidItems = reachableItems.size;
    const totalUnreachableItems = unreachableGraphs.reduce((sum, graph) => sum + graph.nodes.length, 0);
    const unreachableGraphCount = unreachableGraphs.length;

    // 统计图类型
    const graphTypes: Record<string, number> = {};
    for (const graph of unreachableGraphs) {
      graphTypes[graph.type] = (graphTypes[graph.type] || 0) + 1;
    }

    // 计算合法图的统计信息
    const validGraphStats = await this.calculateValidGraphStats(reachableItems, recipes, itemToRecipes, baseItemNames);

    return {
      totalValidItems,
      totalUnreachableItems,
      unreachableGraphCount,
      graphTypes,
      validGraphStats
    };
  }

  /**
   * 计算合法图统计信息
   */
  private async calculateValidGraphStats(
    reachableItems: Set<string>,
    recipes: Recipe[],
    itemToRecipes: Record<string, Recipe[]>,
    baseItemNames: string[]
  ): Promise<GraphSystemStats['validGraphStats']> {
    let maxDepth = 0;
    let totalDepth = 0;
    let maxWidth = 0;
    let totalWidth = 0;
    let maxBreadth = 0;
    let totalBreadth = 0;
    let count = 0;

    // 🚀 性能优化：使用缓存避免重复搜索相同物品的路径
    const pathStatsCache = new Map<string, PathStats>();

    // 对每个可达物品计算路径统计
    for (const item of reachableItems) {
      try {
        // 🚀 性能优化：检查缓存
        let stats = pathStatsCache.get(item);

        if (!stats) {
          const result = await this.searchPathInternal(item, baseItemNames, itemToRecipes);
          if (result) {
            stats = result.stats;
            pathStatsCache.set(item, stats);
          }
        }

        if (stats) {
          maxDepth = Math.max(maxDepth, stats.depth);
          totalDepth += stats.depth;
          maxWidth = Math.max(maxWidth, stats.width);
          totalWidth += stats.width;
          maxBreadth = Math.max(maxBreadth, stats.breadth);
          totalBreadth += stats.breadth;
          count++;
        }
      } catch (error) {
        // 忽略计算错误
      }
    }

    const avgDepth = count > 0 ? totalDepth / count : 0;
    const avgWidth = count > 0 ? totalWidth / count : 0;
    const avgBreadth = count > 0 ? totalBreadth / count : 0;

    return {
      maxDepth,
      avgDepth,
      maxWidth,
      avgWidth,
      maxBreadth,
      avgBreadth
    };
  }

  /**
   * 获取单个物品详情
   */
  async getItemById(id: number) {
    const item = await databaseAdapter.get<Item & { usage_count: number; recipe_count: number; discoverer_name?: string }>(
      `SELECT 
         i.*,
         COALESCE(usage_stats.usage_count, 0) as usage_count,
         COALESCE(result_stats.recipe_count, 0) as recipe_count,
         u.name as discoverer_name
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

    return item;
  }

  /**
   * 递归构建冰柱树（内部方法，使用全局缓存）
   * 
   * 🚀 关键优化：
   * 1. 不使用visited Set，而是依赖globalMemo来防止重复计算
   * 2. 如果物品已经在缓存中（包括循环依赖的null结果），直接返回
   * 3. 无深度限制，确保所有可达元素都能构建冰柱图
   * 4. 循环依赖已在可达性分析阶段处理，此处无需额外检测
   * 5. 修复：尝试所有可达配方，确保所有可达元素都能构建冰柱图
   */
  private buildIcicleTreeWithCache(
    itemName: string,
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    itemEmojiMap: Record<string, string>,
    globalMemo: Map<string, IcicleNode | null>
  ): IcicleNode | null {
    // 🚀 缓存命中（包括循环依赖返回的null）
    if (globalMemo.has(itemName)) {
      return globalMemo.get(itemName)!;
    }

    // 🚀 标记为正在处理（防止循环依赖）
    globalMemo.set(itemName, null);

    const isBase = baseItems.includes(itemName);

    // 基础元素：固定宽度为1
    if (isBase) {
      const node: IcicleNode = {
        id: `base_${itemName}`,
        name: itemName,
        emoji: itemEmojiMap[itemName],
        isBase: true,
        value: 1
      };
      globalMemo.set(itemName, node);
      return node;
    }

    // 合成元素：获取所有配方
    const recipes = itemToRecipes[itemName];
    if (!recipes || recipes.length === 0) {
      // 保持null，表示无法构建
      return null;
    }

    // 🚀 修复：尝试所有可达配方，确保所有可达元素都能构建冰柱图
    // 按最短路径排序后的配方列表，优先尝试最短路径
    for (const recipe of recipes) {
      // 🚀 递归构建子节点（使用缓存，不克隆Set）
      const childA = this.buildIcicleTreeWithCache(recipe.item_a, baseItems, itemToRecipes, itemEmojiMap, globalMemo);
      const childB = this.buildIcicleTreeWithCache(recipe.item_b, baseItems, itemToRecipes, itemEmojiMap, globalMemo);

      // 如果两个子节点都成功构建，则使用这个配方
      if (childA && childB) {
        // 合成元素的宽度是子节点宽度之和
        const value = childA.value + childB.value;

        const node: IcicleNode = {
          id: `synthetic_${itemName}`,
          name: itemName,
          emoji: itemEmojiMap[itemName],
          isBase: false,
          value,
          children: [childA, childB],
          recipe: {
            item_a: recipe.item_a,
            item_b: recipe.item_b
          }
        };

        globalMemo.set(itemName, node);
        return node;
      }
    }

    // 🚀 如果所有配方都无法构建，返回null
    // 这种情况应该很少见，因为可达性分析已经确保物品可达
    logger.warn(`物品 "${itemName}" 无法构建冰柱图`);
    return null;
  }

  /**
   * 计算冰柱树的最大深度
   */
  private calculateIcicleTreeDepth(node: IcicleNode): number {
    // 🚀 性能优化：使用迭代替代递归，避免栈溢出和递归开销
    const stack: { node: IcicleNode; depth: number }[] = [{ node, depth: 1 }];
    let maxDepth = 0;
    let iterations = 0;
    const MAX_ITERATIONS = 10000; // 最多迭代1万次

    while (stack.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      const { node: currentNode, depth } = stack.pop()!;
      maxDepth = Math.max(maxDepth, depth);

      if (currentNode.children && currentNode.children.length > 0) {
        // 将子节点加入栈中，深度+1
        for (const child of currentNode.children) {
          if (child) {
            stack.push({ node: child, depth: depth + 1 });
          }
        }
      }
    }

    if (iterations >= MAX_ITERATIONS) {
      logger.warn(`calculateIcicleTreeDepth: 物品 "${node.name}" 迭代次数超限 (${iterations}次)，可能存在复杂树结构`);
    }

    return maxDepth;
  }

  /**
   * 计算冰柱树的统计信息
   */
  private calculateIcicleTreeStats(node: IcicleNode, itemToRecipes: Record<string, Recipe[]>, reachableItems: Set<string>): PathStats {
    const materials: Record<string, number> = {};

    // 🚀 性能优化：使用迭代替代递归，避免栈溢出和递归开销
    const stack: { node: IcicleNode; depth: number; isRoot: boolean }[] = [{ node, depth: 0, isRoot: true }];
    let maxDepth = 0;
    let totalSteps = 0;
    let iterations = 0;
    const MAX_ITERATIONS = 10000; // 最多迭代1万次

    while (stack.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      const { node: currentNode, depth, isRoot } = stack.pop()!;
      
      // 更新最大深度
      maxDepth = Math.max(maxDepth, depth);

      // 基础材料：记录材料使用情况
      if (currentNode.isBase) {
        materials[currentNode.name] = (materials[currentNode.name] || 0) + 1;
        totalSteps += 0; // 基础材料不计步数
        continue;
      }

      // 合成材料计步数
      totalSteps += 1;

      // 将子节点加入栈中（注意顺序，先处理右子节点再处理左子节点）
      if (currentNode.children) {
        const [childA, childB] = currentNode.children;
        if (childB) {
          stack.push({ node: childB, depth: depth + 1, isRoot: false });
        }
        if (childA) {
          stack.push({ node: childA, depth: depth + 1, isRoot: false });
        }
      }
    }

    if (iterations >= MAX_ITERATIONS) {
      logger.warn(`calculateIcicleTreeStats: 物品 "${node.name}" 迭代次数超限 (${iterations}次)，可能存在复杂树结构`);
    }

    const totalMaterials = Object.values(materials).reduce((sum, count) => sum + count, 0);
    
    // 广度定义为：能合成当前元素的可达配方数量（不包括不可达配方）
    // 只计算那些两个材料都可达的配方
    const allRecipes = itemToRecipes[node.name] || [];
    const reachableRecipes = allRecipes.filter(recipe => {
      // 检查配方是否可达：两个材料都必须可达
      return reachableItems.has(recipe.item_a) && reachableItems.has(recipe.item_b);
    });
    const breadth = reachableRecipes.length;

    return {
      depth: maxDepth,
      width: totalSteps,
      total_materials: totalMaterials,
      breadth: breadth,
      materials
    };
  }

  /**
   * 计算配方的路径统计信息（用于排序）
   */
  private calculateRecipeStats(
    recipe: Recipe,
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    memo: Record<string, { depth: number; width: number; breadth: number }> = {},
    visited: Set<string> = new Set()
  ): { depth: number; width: number; breadth: number } {
    const cacheKey = `${recipe.item_a}_${recipe.item_b}_${recipe.result}`;
    if (memo[cacheKey]) {
      return memo[cacheKey];
    }

    // 计算 item_a 的统计信息
    const statsA = this.calculateItemStatsForSorting(recipe.item_a, baseItems, itemToRecipes, memo, visited);
    // 计算 item_b 的统计信息
    const statsB = this.calculateItemStatsForSorting(recipe.item_b, baseItems, itemToRecipes, memo, visited);

    // 深度：取两个素材的最大深度
    const depth = Math.max(statsA.depth, statsB.depth);
    // 宽度：两个素材的宽度总和
    const width = statsA.width + statsB.width;
    // 广度：两个素材的广度总和
    const breadth = statsA.breadth + statsB.breadth;

    const result = { depth, width, breadth };
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
   * 计算物品的统计信息（用于排序）
   */
  private calculateItemStatsForSorting(
    itemName: string,
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    memo: Record<string, { depth: number; width: number; breadth: number }> = {},
    visited: Set<string> = new Set()
  ): { depth: number; width: number; breadth: number } {
    // 防止循环依赖
    if (visited.has(itemName)) {
      return { depth: 0, width: 0, breadth: 0 };
    }

    if (memo[itemName]) {
      return memo[itemName];
    }

    // 广度计算：能够合成这个物品的配方数的总和
    const breadth = (itemToRecipes[itemName] || []).length;

    // 如果是基础材料，深度为0，宽度为0
    if (baseItems.includes(itemName)) {
      const result = { depth: 0, width: 0, breadth };
      memo[itemName] = result;
      return result;
    }

    // 对于合成材料，获取最简配方并计算深度和宽度
    const recipes = itemToRecipes[itemName];
    if (!recipes || recipes.length === 0) {
      const result = { depth: 0, width: 0, breadth };
      memo[itemName] = result;
      return result;
    }

    // 选择第一个配方（这里会在排序后选择最简的）
    const recipe = recipes[0];

    // 添加当前物品到已访问集合
    visited.add(itemName);
    const stats = this.calculateRecipeStats(recipe, baseItems, itemToRecipes, memo, visited);
    // 移除当前物品，允许其他路径访问
    visited.delete(itemName);

    // 深度需要+1（当前合成步骤）
    const result = {
      depth: stats.depth + 1,
      width: stats.width + 1,
      breadth
    };

    memo[itemName] = result;
    return result;
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

    return item || null;
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
      items,
      total: totalResult?.count || 0,
      page,limit
    };
  }

  /**
   * 获取元素的可达性统计信息
   */
  async getReachabilityStats(itemName: string): Promise<{
    reachable: boolean;
    depth?: number;
    width?: number;
    breadth?: number;
  }> {
    try {
      const cache = await this.getGraphCache();
      
      // 检查可达性
      const reachable = cache.reachableItems.has(itemName);
      
      if (!reachable) {
        return { reachable: false };
      }

      // 获取最短路径树
      const tree = await this.getShortestPathTree(itemName);
      if (!tree) {
        return { reachable: true };
      }

      // 计算统计信息
      const stats = this.calculateIcicleTreeStats(tree, cache.itemToRecipes, cache.reachableItems);
      
      return {
        reachable: true,
        depth: stats.depth,
        width: stats.width,
        breadth: stats.breadth
      };
    } catch (error) {
      logger.error(`获取元素 ${itemName} 的可达性统计失败:`, error);
      throw error;
    }
  }

  /**
   * 🚀 按需生成冰柱图（从图结构动态提取子图）
   * 相比预生成全量数据，这种方式：
   * - 内存占用低（只生成请求的子图）
   * - 响应更快（避免序列化巨型对象）
   * - 支持深度限制（控制数据量）
   * 
   * @param itemName 目标物品名称
   * @param maxDepth 最大展开深度（可选，默认不限制）
   * @param includeStats 是否包含统计信息
   */
  async generateIcicleChartOnDemand(
    itemName: string,
    maxDepth?: number,
    includeStats: boolean = false
  ): Promise<IcicleChartData | null> {
    try {
      const cache = await this.getGraphCache();
      
      // 检查物品是否存在
      if (!cache.allItemNames.includes(itemName)) {
        return null;
      }

      // 检查可达性
      const isReachable = cache.reachableItems.has(itemName);
      
      // 从图结构中提取子图并构建树
      const tree = this.extractSubgraphAsTree(
        itemName,
        cache.itemToRecipes,
        cache.baseItemNames,
        cache.itemEmojiMap,
        cache.reachableItems,
        maxDepth
      );

      if (!tree) {
        return null;
      }

      // 计算深度和统计信息
      const depth = this.calculateIcicleTreeDepth(tree);
      
      // 可选：计算详细统计
      if (includeStats && tree.stats) {
        const stats = this.calculateIcicleTreeStats(tree, cache.itemToRecipes, cache.reachableItems);
        tree.stats = {
          depth: stats.depth,
          width: stats.width,
          breadth: stats.breadth
        };
      }

      return {
        nodes: [tree],
        totalElements: 1,
        maxDepth: depth
      };
    } catch (error) {
      logger.error(`按需生成物品 "${itemName}" 的冰柱图失败:`, error);
      throw error;
    }
  }

  /**
   * 🔍 从图结构中提取子图并构建为树（核心方法）
   * 这是按需生成的核心逻辑，直接从图的邻接表构建树
   * 
   * @param itemName 目标物品
   * @param itemToRecipes 图的邻接表（物品 → 配方列表）
   * @param baseItemNames 基础材料集合
   * @param itemEmojiMap 物品emoji映射
   * @param reachableItems 可达物品集合
   * @param maxDepth 最大深度限制
   * @param currentDepth 当前深度（递归用）
   * @param visited 已访问节点（防止循环）
   */
  private extractSubgraphAsTree(
    itemName: string,
    itemToRecipes: Record<string, Recipe[]>,
    baseItemNames: string[],
    itemEmojiMap: Record<string, string>,
    reachableItems: Set<string>,
    maxDepth?: number,
    currentDepth: number = 0,
    visited: Set<string> = new Set()
  ): IcicleNode | null {
    // 深度限制检查
    if (maxDepth !== undefined && currentDepth >= maxDepth) {
      return null;
    }

    // 循环检测（防止无限递归）
    if (visited.has(itemName)) {
      return null;
    }

    // 标记为已访问
    visited.add(itemName);

    const isBase = baseItemNames.includes(itemName);
    const emoji = itemEmojiMap[itemName];

    // 基础材料节点（叶子节点）
    if (isBase) {
      return {
        id: itemName,
        name: itemName,
        emoji,
        isBase: true,
        value: 1
      };
    }

    // 获取该物品的所有配方
    const recipes = itemToRecipes[itemName];
    
    // 如果没有配方，作为叶子节点返回
    if (!recipes || recipes.length === 0) {
      return {
        id: itemName,
        name: itemName,
        emoji,
        isBase: false,
        value: 1
      };
    }

    // 🚀 优化：选择最短路径的配方（如果有缓存的话）
    // 这里可以从 shortestPathTrees 中获取，但为了通用性，使用第一个配方
    const recipe = recipes[0];
    const { item_a, item_b } = recipe;

    // 递归构建子树
    const childA = this.extractSubgraphAsTree(
      item_a,
      itemToRecipes,
      baseItemNames,
      itemEmojiMap,
      reachableItems,
      maxDepth,
      currentDepth + 1,
      new Set(visited) // 每个分支独立的 visited 集合
    );

    const childB = this.extractSubgraphAsTree(
      item_b,
      itemToRecipes,
      baseItemNames,
      itemEmojiMap,
      reachableItems,
      maxDepth,
      currentDepth + 1,
      new Set(visited)
    );

    // 如果子节点无法构建，返回 null
    if (!childA || !childB) {
      return null;
    }

    // 计算权重（子节点权重之和）
    const value = childA.value + childB.value;

    return {
      id: itemName,
      name: itemName,
      emoji,
      isBase: false,
      value,
      children: [childA, childB],
      recipe: {
        item_a,
        item_b
      }
    };
  }
}

export const recipeService = new RecipeService();