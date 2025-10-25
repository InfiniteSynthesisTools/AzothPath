import { databaseAdapter } from '../database/databaseAdapter';
import { logger } from '../utils/logger';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';
import { truncateEmoji } from '../utils/emoji';
import { icicleChartCache } from '../utils/lruCache';

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
  shortestPathTrees: Map<string, IcicleNode>;
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

export class RecipeService {
  private graphCache: GraphCache | null = null;
  private graphCachePromise: Promise<GraphCache> | null = null;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 60 分钟

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
        shortestPathTrees: new Map<string, IcicleNode>(),
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
   * 获取单个物品的最短路径树 - 已改用全局 icicleChartCache
   * 不再维护内部 LRU 缓存
   */
  async getShortestPathTree(itemName: string): Promise<IcicleNode | null> {
    const cache = await this.getGraphCache();

    // 检查物品是否可达
    if (!cache.reachableItems.has(itemName)) {
      logger.info(`物品 ${itemName} 不可达，无法构建路径树`);
      return null;
    }

    // 按需构建树
    logger.info(`最短路径树：按需构建 ${itemName}`);
    const globalTreeMemo = new Map<string, IcicleNode | null>();
    const newTree = this.buildIcicleTreeWithCache(
      itemName,
      cache.baseItemNames,
      cache.itemToRecipes,
      cache.itemEmojiMap,
      globalTreeMemo
    );

    return newTree;
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

    return this.truncateRecordEmojis(item);
  }

  /**
   * 根据物品名称获取物品详情
   */
  async getItemByName(name: string) {
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
       WHERE i.name = ? AND i.is_public = 1`,
      [name]
    );

    if (!item) {
      throw new Error('物品不存在');
    }

    return this.truncateRecordEmojis(item);
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
    startItem: string,
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    itemEmojiMap: Record<string, string>,
    globalMemo: Map<string, IcicleNode | null>
  ): IcicleNode | null {
    // 快速路径：缓存命中
    if (globalMemo.has(startItem)) {
      return globalMemo.get(startItem)!;
    }

    // 递归构建冰柱树（带记忆化）
    // 使用递归而非复杂的状态机，因为：
    // 1. 大多数物品链条不会超过 100 层深度
    // 2. 记忆化防止重复计算
    // 3. 垃圾回收更高效（函数栈帧自动释放）
    const build = (itemName: string, depth: number = 0): IcicleNode | null => {
      // 深度限制防止无限递归（超过 500 层则中止）
      if (depth > 500) {
        logger.warn(`树构建深度超过 500，可能存在循环依赖: ${itemName}`);
        return null;
      }

      // 记忆化检查
      if (globalMemo.has(itemName)) {
        return globalMemo.get(itemName)!;
      }

      // 标记为处理中（防止循环引用）
      globalMemo.set(itemName, null);

      // 基础材料
      if (baseItems.includes(itemName)) {
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

      // 获取配方
      const recipes = itemToRecipes[itemName];
      if (!recipes || recipes.length === 0) {
        return null;
      }

      // 尝试第一个配方（优先使用排序后的最优配方）
      const recipe = recipes[0];
      const childA = build(recipe.item_a, depth + 1);
      const childB = build(recipe.item_b, depth + 1);

      if (!childA || !childB) {
        // 第一个配方失败，尝试其他配方
        for (let i = 1; i < recipes.length; i++) {
          const nextRecipe = recipes[i];
          const nextChildA = build(nextRecipe.item_a, depth + 1);
          const nextChildB = build(nextRecipe.item_b, depth + 1);

          if (nextChildA && nextChildB) {
            // 找到可行的配方
            const value = nextChildA.value + nextChildB.value;
            const emoji = itemEmojiMap[itemName];

            const node: IcicleNode = {
              id: `synthetic_${itemName}_${i}`,
              name: itemName,
              emoji: emoji ? truncateEmoji(emoji) : undefined,
              isBase: false,
              value,
              children: [nextChildA, nextChildB],
              recipe: {
                item_a: nextRecipe.item_a,
                item_b: nextRecipe.item_b
              }
            };

            globalMemo.set(itemName, node);
            return node;
          }
        }

        // 所有配方都失败
        return null;
      }

      // 构建节点
      const value = childA.value + childB.value;
      const emoji = itemEmojiMap[itemName];

      const node: IcicleNode = {
        id: `synthetic_${itemName}`,
        name: itemName,
        emoji: emoji ? truncateEmoji(emoji) : undefined,
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
    };

    return build(startItem);
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
    memo: Record<string, { depth: number; width: number; breadth: number }> = {}
  ): { depth: number; width: number; breadth: number } {
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
   * 计算物品的统计信息（用于排序） - 迭代式DFS，避免深层递归
   * 使用显式栈来处理依赖链，更高效且不易栈溢出
   */
  private calculateItemStatsForSorting(
    startItem: string,
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    memo: Record<string, { depth: number; width: number; breadth: number }> = {}
  ): { depth: number; width: number; breadth: number } {
    if (memo[startItem]) {
      return memo[startItem];
    }

    // 快速检查基础材料
    if (baseItems.includes(startItem)) {
      const breadth = (itemToRecipes[startItem] || []).length;
      const result = { depth: 0, width: 0, breadth };
      memo[startItem] = result;
      return result;
    }

    // 快速检查是否有配方
    const recipes = itemToRecipes[startItem];
    if (!recipes || recipes.length === 0) {
      const breadth = (itemToRecipes[startItem] || []).length;
      const result = { depth: 0, width: 0, breadth };
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
      statsA?: { depth: number; width: number; breadth: number };
      statsB?: { depth: number; width: number; breadth: number };
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
          const breadth = (itemToRecipes[frame.itemName] || []).length;
          memo[frame.itemName] = { depth: 0, width: 0, breadth };
          stack.pop();
          continue;
        }

        // 基础材料
        if (baseItems.includes(frame.itemName)) {
          const breadth = (itemToRecipes[frame.itemName] || []).length;
          memo[frame.itemName] = { depth: 0, width: 0, breadth };
          stack.pop();
          continue;
        }

        // 没有配方
        const itemRecipes = itemToRecipes[frame.itemName];
        if (!itemRecipes || itemRecipes.length === 0) {
          const breadth = (itemToRecipes[frame.itemName] || []).length;
          memo[frame.itemName] = { depth: 0, width: 0, breadth };
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
        const statsA = memo[recipe.item_a] || { depth: 0, width: 0, breadth: 0 };
        const statsB = memo[recipe.item_b] || { depth: 0, width: 0, breadth: 0 };

        const breadth = (itemToRecipes[frame.itemName] || []).length;
        const depth = Math.max(statsA.depth, statsB.depth) + 1;
        const width = statsA.width + statsB.width + 1;

        memo[frame.itemName] = { depth, width, breadth };
        processing.delete(frame.itemName);
        stack.pop();
      }
    }

    return memo[startItem] || { depth: 0, width: 0, breadth: 0 };
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
      // 🔥 首先检查 LRU 缓存
      const cacheKey = itemName; // 注：这里忽略 maxDepth 和 includeStats，使用默认设置
      const cachedResult = icicleChartCache.get(cacheKey);
      
      if (cachedResult) {
        logger.info(`[缓存命中] 物品 "${itemName}" 的冰柱图`, {
          cacheSize: icicleChartCache.size,
          fromCache: true
        });
        return cachedResult;
      }

      const cache = await this.getGraphCache();

      // 检查物品是否存在
      if (!cache.allItemNames.includes(itemName)) {
        logger.warn(`物品 "${itemName}" 不存在于物品库中`, {
          totalItems: cache.allItemNames.length,
          itemExists: false
        });
        return null;
      }

      // 检查可达性
      const isReachable = cache.reachableItems.has(itemName);
      if (!isReachable) {
        logger.warn(`物品 "${itemName}" 不可达（无法从基础材料合成）`, {
          reachable: false,
          totalReachable: cache.reachableItems.size
        });
      }
      logger.info(`按需生成物品 "${itemName}" 的冰柱图，最大深度: ${maxDepth ?? '无限制'}, 包含统计: ${includeStats}, 可达性: ${isReachable}`);

      // 异步调用，避免阻塞事件循环
      const tree = await this.extractSubgraphAsTreeAsync(
        itemName,
        cache.itemToRecipes,
        cache.baseItemNames,
        cache.itemEmojiMap,
        cache.reachableItems,
        maxDepth
      );

      logger.info(`提取物品 "${itemName}" 的冰柱图树成功`, {
        maxDepth,
        includeStats,
        isReachable
      });

      if (!tree) {
        logger.warn(`无法为物品 "${itemName}" 生成冰柱图树`, {
          reason: '提取子图失败，可能是无法找到有效配方',
          isReachable,
          hasRecipes: (cache.itemToRecipes[itemName] || []).length > 0
        });
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

      const result = {
        nodes: [tree],
        totalElements: 1,
        maxDepth: depth
      };

      // 🔥 保存到 LRU 缓存
      icicleChartCache.set(itemName, result);
      logger.info(`[缓存保存] 物品 "${itemName}" 的冰柱图已缓存`, {
        cacheSize: icicleChartCache.size
      });

      return result;
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
  private async extractSubgraphAsTreeAsync(
    itemName: string,
    itemToRecipes: Record<string, Recipe[]>,
    baseItemNames: string[],
    itemEmojiMap: Record<string, string>,
    reachableItems: Set<string>,
    maxDepth?: number
  ): Promise<IcicleNode | null> {
    // 异步迭代方式构建树，使用 setImmediate 分片让出事件循环
    
    interface WorkItem {
      itemName: string;
      depth: number;
      visited: Set<string>;
      state: 'initial' | 'fetching_children' | 'combining';
      tryRecipeIndex: number;
      childA?: IcicleNode | null;
      childB?: IcicleNode | null;
    }

    const resultCache = new Map<string, IcicleNode | null>();
    const stack: WorkItem[] = [];
    let operationCount = 0; // 计数器，每 100 次操作让出一次事件循环

    const yieldToEventLoop = (): Promise<void> => {
      return new Promise(resolve => setImmediate(resolve));
    };

    stack.push({
      itemName,
      depth: 0,
      visited: new Set(),
      state: 'initial',
      tryRecipeIndex: 0
    });

    while (stack.length > 0) {
      // 每 100 次操作让出一次事件循环
      operationCount++;
      if (operationCount % 100 === 0) {
        await yieldToEventLoop();
      }

      const work = stack[stack.length - 1];
      const cacheKey = work.itemName;

      // 状态1：初始处理
      if (work.state === 'initial') {
        // 深度限制检查
        if (maxDepth !== undefined && work.depth >= maxDepth) {
          stack.pop();
          resultCache.set(cacheKey, null);
          continue;
        }

        // 循环检测
        if (work.visited.has(work.itemName)) {
          stack.pop();
          resultCache.set(cacheKey, null);
          continue;
        }

        const isBase = baseItemNames.includes(work.itemName);
        const emoji = itemEmojiMap[work.itemName];

        // 基础材料节点
        if (isBase) {
          stack.pop();
          resultCache.set(cacheKey, {
            id: work.itemName,
            name: work.itemName,
            emoji,
            isBase: true,
            value: 1
          });
          continue;
        }

        // 获取配方
        const recipes = itemToRecipes[work.itemName];

        // 没有配方的节点
        if (!recipes || recipes.length === 0) {
          stack.pop();
          resultCache.set(cacheKey, {
            id: work.itemName,
            name: work.itemName,
            emoji: emoji ? truncateEmoji(emoji) : undefined,
            isBase: false,
            value: 1
          });
          continue;
        }

        // 转换到 fetching_children 状态
        work.state = 'fetching_children';
      }

      // 状态2：获取子节点
      if (work.state === 'fetching_children') {
        const recipes = itemToRecipes[work.itemName];

        if (!recipes || work.tryRecipeIndex >= recipes.length) {
          // 所有配方都尝试过了，返回 null
          stack.pop();
          resultCache.set(cacheKey, null);
          continue;
        }

        const recipe = recipes[work.tryRecipeIndex];
        const { item_a, item_b } = recipe;

        const newVisited = new Set(work.visited);
        newVisited.add(work.itemName);

        // 检查子节点是否已在缓存中
        const childACached = resultCache.has(item_a);
        const childBCached = resultCache.has(item_b);

        if (childACached && childBCached) {
          // 两个子节点都已缓存，合并它们
          const childA = resultCache.get(item_a)!;
          const childB = resultCache.get(item_b)!;

          if (childA && childB) {
            // 两个子节点都成功，使用此配方
            const value = childA.value + childB.value;
            stack.pop();
            resultCache.set(cacheKey, {
              id: work.itemName,
              name: work.itemName,
              emoji: itemEmojiMap[work.itemName] ? truncateEmoji(itemEmojiMap[work.itemName]) : undefined,
              isBase: false,
              value,
              children: [childA, childB],
              recipe: { item_a, item_b }
            });
          } else {
            // 此配方失败，尝试下一个
            work.tryRecipeIndex++;
          }
        } else {
          // 需要构建子节点，优先构建 childA
          if (!childACached) {
            // 先添加 childB 到栈（这样 childA 会先处理，栈是 LIFO）
            stack.push({
              itemName: item_b,
              depth: work.depth + 1,
              visited: new Set(newVisited),
              state: 'initial',
              tryRecipeIndex: 0
            });

            // 再添加 childA
            stack.push({
              itemName: item_a,
              depth: work.depth + 1,
              visited: new Set(newVisited),
              state: 'initial',
              tryRecipeIndex: 0
            });

            // 标记当前工作项为等待状态
            work.state = 'combining';
            work.childA = undefined;
            work.childB = undefined;
          } else if (!childBCached) {
            // childA 已缓存，只需要 childB
            work.childA = resultCache.get(item_a)!;

            stack.push({
              itemName: item_b,
              depth: work.depth + 1,
              visited: new Set(newVisited),
              state: 'initial',
              tryRecipeIndex: 0
            });

            work.state = 'combining';
            work.childB = undefined;
          }
        }
      }

      // 状态3：合并子节点
      if (work.state === 'combining') {
        const recipes = itemToRecipes[work.itemName];
        const recipe = recipes![work.tryRecipeIndex];
        const { item_a, item_b } = recipe;

        // 获取缓存中的子节点
        const childA = work.childA ?? resultCache.get(item_a) ?? undefined;
        const childB = work.childB ?? resultCache.get(item_b) ?? undefined;

        if (childA !== undefined && childB !== undefined) {
          if (childA && childB) {
            // 两个子节点都成功，使用此配方
            const value = childA.value + childB.value;
            stack.pop();
            resultCache.set(cacheKey, {
              id: work.itemName,
              name: work.itemName,
              emoji: itemEmojiMap[work.itemName] ? truncateEmoji(itemEmojiMap[work.itemName]) : undefined,
              isBase: false,
              value,
              children: [childA, childB],
              recipe: { item_a, item_b }
            });
          } else {
            // 此配方失败，尝试下一个
            work.state = 'fetching_children';
            work.tryRecipeIndex++;
            work.childA = undefined;
            work.childB = undefined;
          }
        }
      }
    }

    return resultCache.get(itemName) ?? null;
  }

  /**
   * 🔍 从图结构中提取子图并构建为树（同步版本，用于其他场景）
   * 这是按需生成的核心逻辑，直接从图的邻接表构建树
   * 
   * @param itemName 目标物品
   * @param itemToRecipes 物品到配方的映射
   * @param baseItemNames 基础材料名称列表
   * @param itemEmojiMap 物品到 emoji 的映射
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
    maxDepth?: number
  ): IcicleNode | null {
    // 迭代方式构建树，避免递归栈溢出
    
    interface WorkItem {
      itemName: string;
      depth: number;
      visited: Set<string>;
      state: 'initial' | 'fetching_children' | 'combining';
      tryRecipeIndex: number;
      childA?: IcicleNode | null;
      childB?: IcicleNode | null;
    }

    const resultCache = new Map<string, IcicleNode | null>();
    const stack: WorkItem[] = [];

    // 初始工作项
    stack.push({
      itemName,
      depth: 0,
      visited: new Set(),
      state: 'initial',
      tryRecipeIndex: 0
    });

    while (stack.length > 0) {
      const work = stack[stack.length - 1];

      // 生成缓存键（包含深度和visited状态，但为了简化，只用itemName作为键）
      const cacheKey = work.itemName;

      // 状态1：初始处理
      if (work.state === 'initial') {
        // 深度限制检查
        if (maxDepth !== undefined && work.depth >= maxDepth) {
          stack.pop();
          resultCache.set(cacheKey, null);
          continue;
        }

        // 循环检测
        if (work.visited.has(work.itemName)) {
          stack.pop();
          resultCache.set(cacheKey, null);
          continue;
        }

        const isBase = baseItemNames.includes(work.itemName);
        const emoji = itemEmojiMap[work.itemName];

        // 基础材料节点
        if (isBase) {
          stack.pop();
          resultCache.set(cacheKey, {
            id: work.itemName,
            name: work.itemName,
            emoji,
            isBase: true,
            value: 1
          });
          continue;
        }

        // 获取配方
        const recipes = itemToRecipes[work.itemName];

        // 没有配方的节点
        if (!recipes || recipes.length === 0) {
          stack.pop();
          resultCache.set(cacheKey, {
            id: work.itemName,
            name: work.itemName,
            emoji: emoji ? truncateEmoji(emoji) : undefined,
            isBase: false,
            value: 1
          });
          continue;
        }

        // 转换到 fetching_children 状态
        work.state = 'fetching_children';
        // 不 pop，继续处理
      }

      // 状态2：获取子节点
      if (work.state === 'fetching_children') {
        const recipes = itemToRecipes[work.itemName];

        if (!recipes || work.tryRecipeIndex >= recipes.length) {
          // 所有配方都尝试过了，返回 null
          stack.pop();
          resultCache.set(cacheKey, null);
          continue;
        }

        const recipe = recipes[work.tryRecipeIndex];
        const { item_a, item_b } = recipe;

        const newVisited = new Set(work.visited);
        newVisited.add(work.itemName);

        // 检查子节点是否已在缓存中
        const childACached = resultCache.has(item_a);
        const childBCached = resultCache.has(item_b);

        if (childACached && childBCached) {
          // 两个子节点都已缓存，合并它们
          const childA = resultCache.get(item_a)!;
          const childB = resultCache.get(item_b)!;

          if (childA && childB) {
            // 两个子节点都成功，使用此配方
            const value = childA.value + childB.value;
            stack.pop();
            resultCache.set(cacheKey, {
              id: work.itemName,
              name: work.itemName,
              emoji: itemEmojiMap[work.itemName] ? truncateEmoji(itemEmojiMap[work.itemName]) : undefined,
              isBase: false,
              value,
              children: [childA, childB],
              recipe: { item_a, item_b }
            });
          } else {
            // 此配方失败，尝试下一个
            work.tryRecipeIndex++;
          }
        } else {
          // 需要构建子节点，优先构建 childA
          if (!childACached) {
            // 先添加 childB 到栈（这样 childA 会先处理，栈是 LIFO）
            stack.push({
              itemName: item_b,
              depth: work.depth + 1,
              visited: new Set(newVisited),
              state: 'initial',
              tryRecipeIndex: 0
            });

            // 再添加 childA
            stack.push({
              itemName: item_a,
              depth: work.depth + 1,
              visited: new Set(newVisited),
              state: 'initial',
              tryRecipeIndex: 0
            });

            // 标记当前工作项为等待状态
            work.state = 'combining';
            work.childA = undefined; // 还未获取
            work.childB = undefined;
          } else if (!childBCached) {
            // childA 已缓存，只需要 childB
            work.childA = resultCache.get(item_a)!;

            stack.push({
              itemName: item_b,
              depth: work.depth + 1,
              visited: new Set(newVisited),
              state: 'initial',
              tryRecipeIndex: 0
            });

            work.state = 'combining';
            work.childB = undefined;
          }
        }
      }

      // 状态3：合并子节点
      if (work.state === 'combining') {
        const recipes = itemToRecipes[work.itemName];
        const recipe = recipes![work.tryRecipeIndex];
        const { item_a, item_b } = recipe;

        // 获取缓存中的子节点
        const childA = work.childA ?? resultCache.get(item_a) ?? undefined;
        const childB = work.childB ?? resultCache.get(item_b) ?? undefined;

        if (childA !== undefined && childB !== undefined) {
          if (childA && childB) {
            // 两个子节点都成功，使用此配方
            const value = childA.value + childB.value;
            stack.pop();
            resultCache.set(cacheKey, {
              id: work.itemName,
              name: work.itemName,
              emoji: itemEmojiMap[work.itemName] ? truncateEmoji(itemEmojiMap[work.itemName]) : undefined,
              isBase: false,
              value,
              children: [childA, childB],
              recipe: { item_a, item_b }
            });
          } else {
            // 此配方失败，尝试下一个
            work.state = 'fetching_children';
            work.tryRecipeIndex++;
            work.childA = undefined;
            work.childB = undefined;
          }
        }
      }
    }

    return resultCache.get(itemName) ?? null;
  }
}

export const recipeService = new RecipeService();