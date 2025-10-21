import { database } from '../database/connection';
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
}

export interface IcicleChartData {
  nodes: IcicleNode[];
  totalElements: number;
  maxDepth: number;
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
    lastUpdated: number;
  } | null = null;
  
  // 缓存有效期（5分钟）
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟

  /**
   * 获取或更新图缓存
   */
  private async getGraphCache(): Promise<{
    recipes: Recipe[];
    items: Item[];
    baseItems: Item[];
    itemToRecipes: Record<string, Recipe[]>;
    recipeGraph: Record<string, string[]>;
    baseItemNames: string[];
    allItemNames: string[];
  }> {
    const now = Date.now();
    
    // 如果缓存不存在或已过期，重新构建
    if (!this.graphCache || now - this.graphCache.lastUpdated > this.CACHE_TTL) {
      logger.info('图缓存已过期或不存在，重新构建...');
      
      // 获取所有公开配方和物品
      const recipes = await database.all<Recipe>('SELECT id, item_a, item_b, result FROM recipes WHERE is_public = 1');
      const items = await database.all<Item>('SELECT name FROM items');
      const baseItems = await database.all<Item>('SELECT name FROM items WHERE is_base = 1');
      
      const baseItemNames = baseItems.map(item => item.name);
      const allItemNames = items.map(item => item.name);

      // 构建依赖图
      const { itemToRecipes, recipeGraph } = this.buildDependencyGraph(recipes, allItemNames);
      
      // 更新缓存
      this.graphCache = {
        recipes,
        items,
        baseItems,
        itemToRecipes,
        recipeGraph,
        baseItemNames,
        allItemNames,
        lastUpdated: now
      };
      
      logger.info(`图缓存构建完成，包含 ${recipes.length} 个配方和 ${allItemNames.length} 个物品`);
    }
    
    return this.graphCache;
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

    const recipes = await database.all(sql, sqlParams);

    // 默认不计算统计信息（昂贵）。如需统计，通过 includeStats 显式开启
    let recipesWithStats = recipes as any[];
    if (includeStats) {
      recipesWithStats = await Promise.all(
        recipes.map(async (recipe) => {
          try {
            const pathStats = await this.calculateRecipePathStats(recipe);
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
    await database.init();
    const res = await database.run('UPDATE items SET is_public = ? WHERE id = ?', [isPublic, id]);
    if (res.changes === 0) {
      throw new Error('物品不存在');
    }
  }

  /** 更新配方公开状态 */
  async updateRecipePublic(id: number, isPublic: number) {
    await database.init();
    const res = await database.run('UPDATE recipes SET is_public = ? WHERE id = ?', [isPublic, id]);
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
      const totalResult = await database.get<{ count: number }>(countSql, baseParams);
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

    const results = await database.all(resultSql, resultParams);

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
      const recipes = await database.all(recipeSql, recipeParams);

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
      const totalResult = await database.get<{ count: number }>(countSql, baseParams);
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
    const recipe = await database.get(
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
    return await database.transaction(async (tx) => {
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
    const existing = await database.get(
      'SELECT * FROM recipe_likes WHERE recipe_id = ? AND user_id = ?',
      [recipeId, userId]
    );

    if (existing) {
      // 取消点赞
      await database.run('DELETE FROM recipe_likes WHERE recipe_id = ? AND user_id = ?', [recipeId, userId]);
      // 更新 recipes 表的 likes 字段
      await database.run('UPDATE recipes SET likes = likes - 1 WHERE id = ?', [recipeId]);
      
      const recipe = await database.get<{ likes: number }>('SELECT likes FROM recipes WHERE id = ?', [recipeId]);
      return { liked: false, likes: recipe?.likes || 0 };
    } else {
      // 点赞
      await database.run('INSERT INTO recipe_likes (recipe_id, user_id, created_at) VALUES (?, ?, ?)', [recipeId, userId, getCurrentUTC8TimeForDB()]);
      // 更新 recipes 表的 likes 字段
      await database.run('UPDATE recipes SET likes = likes + 1 WHERE id = ?', [recipeId]);
      
      const recipe = await database.get<{ likes: number }>('SELECT likes FROM recipes WHERE id = ?', [recipeId]);
      return { liked: true, likes: recipe?.likes || 0 };
    }
  }

  /**
   * 获取图统计信息
   */
  async getGraphStats() {
    const recipesCount = await database.get<{ count: number }>('SELECT COUNT(*) as count FROM recipes');
    const itemsCount = await database.get<{ count: number }>('SELECT COUNT(*) as count FROM items');
    const baseItemsCount = await database.get<{ count: number }>('SELECT COUNT(*) as count FROM items WHERE is_base = 1');
    const craftableItemsCount = await database.get<{ count: number }>(`
      SELECT COUNT(DISTINCT result) as count 
      FROM recipes 
      WHERE result IN (
        SELECT name FROM items WHERE is_base = 0
      )
    `);
    const usersCount = await database.get<{ count: number }>('SELECT COUNT(*) as count FROM user');
    const tasksCount = await database.get<{ count: number }>('SELECT COUNT(*) as count FROM task WHERE status = ?', ['active']);

    return {
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
    
    const recipes = await database.all(sql, sqlParams);
    
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
        await database.run(indexSql);
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
   * 获取缓存状态信息
   */
  getCacheStatus(): { hasCache: boolean; lastUpdated?: number; age?: number } {
    if (!this.graphCache) {
      return { hasCache: false };
    }
    
    const now = Date.now();
    const age = now - this.graphCache.lastUpdated;
    
    return {
      hasCache: true,
      lastUpdated: this.graphCache.lastUpdated,
      age: age
    };
  }

  /**
   * 构建依赖图
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
   * 分析可达性（BFS算法）
   */
  private analyzeReachability(
    baseItems: string[], 
    itemToRecipes: Record<string, Recipe[]>, 
    allItemNames: string[]
  ): { reachableItems: Set<string>; unreachableItems: Set<string> } {
    const reachableItems = new Set<string>(baseItems);
    const queue = [...baseItems];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // 查找所有使用当前物品作为材料的配方
      for (const recipe of Object.values(itemToRecipes).flat()) {
        if (recipe.item_a === current || recipe.item_b === current) {
          const result = recipe.result;
          if (!reachableItems.has(result)) {
            reachableItems.add(result);
            queue.push(result);
          }
        }
      }
    }

    // 不可及物品 = 所有物品 - 可达物品
    const unreachableItems = new Set<string>(
      allItemNames.filter(item => !reachableItems.has(item))
    );

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
    
    for (const node of nodes) {
      // 计算该节点被依赖的次数（入度）
      let inDegree = 0;
      for (const [item, deps] of Object.entries(recipeGraph)) {
        if (deps.includes(node)) {
          inDegree++;
        }
      }
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

    // 对每个可达物品计算路径统计
    for (const item of reachableItems) {
      try {
        const result = await this.searchPathInternal(item, baseItemNames, itemToRecipes);
        if (result) {
          const { stats } = result;
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
    const item = await database.get<Item & { usage_count: number; recipe_count: number; discoverer_name?: string }>(
      `SELECT 
         i.*,
         (SELECT COUNT(*) FROM recipes WHERE item_a = i.name OR item_b = i.name) as usage_count,
         (SELECT COUNT(*) FROM recipes WHERE result = i.name) as recipe_count,
         u.name as discoverer_name
       FROM items i
       LEFT JOIN user u ON i.user_id = u.id
       WHERE i.id = ? AND i.is_public = 1`,
      [id]
    );

    if (!item) {
      throw new Error('物品不存在');
    }

    return item;
  }

  /**
   * 计算物品的统计信息
   */
  private async calculateItemStats(itemName: string, baseItems: string[], itemToRecipes: Record<string, Recipe[]>): Promise<{ depth: number; width: number; breadth: number }> {
    // 广度计算：能够合成这个物品的配方数的总和
    const breadth = (itemToRecipes[itemName] || []).length;

    // 如果是基础材料，深度为0，宽度为0
    if (baseItems.includes(itemName)) {
      return {
        depth: 0,
        width: 0,
        breadth: breadth
      };
    }

    // 对于合成材料，构建合成树并计算深度和宽度
    const tree = this.buildCraftingTree(itemName, baseItems, itemToRecipes, {});
    if (!tree) {
      return { depth: 0, width: 0, breadth: breadth };
    }

    const stats = this.calculateTreeStats(tree, itemToRecipes);
    return {
      depth: stats.depth,
      width: stats.width,
      breadth: breadth
    };
  }

  /**
   * 计算配方素材的统计信息
   * 深度：配方中两个输入素材的最大深度
   * 宽度：配方中两个输入素材的宽度总和
   * 广度：配方中两个输入素材的广度总和
   */
  private async calculateRecipePathStats(recipe: Recipe): Promise<{ depth: number; width: number; breadth: number }> {
    // 使用缓存获取图数据
    const cache = await this.getGraphCache();

    // 计算 item_a 的统计信息
    const statsA = await this.calculateItemStats(recipe.item_a, cache.baseItemNames, cache.itemToRecipes);
    // 计算 item_b 的统计信息
    const statsB = await this.calculateItemStats(recipe.item_b, cache.baseItemNames, cache.itemToRecipes);

    // 深度：取两个素材的最大深度
    const depth = Math.max(statsA.depth, statsB.depth);
    // 宽度：两个素材的宽度总和
    const width = statsA.width + statsB.width;
    // 广度：两个素材的广度总和
    const breadth = statsA.breadth + statsB.breadth;

    return { depth, width, breadth };
  }

  /**
   * 构建配方路径树
   */
  private buildRecipePathTree(
    recipe: Recipe,
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    memo: Record<string, CraftingTreeNode | null> = {}
  ): CraftingTreeNode | null {
    // 检查缓存
    const cacheKey = `${recipe.item_a}_${recipe.item_b}_${recipe.result}`;
    if (cacheKey in memo) {
      return memo[cacheKey];
    }

    // 递归构建左子树（item_a）
    let leftChild: CraftingTreeNode | null = null;
    if (baseItems.includes(recipe.item_a)) {
      leftChild = { item: recipe.item_a, is_base: true };
    } else {
      const recipesForA = itemToRecipes[recipe.item_a];
      if (recipesForA && recipesForA.length > 0) {
        const childRecipe = recipesForA[0]; // 选择第一个配方
        leftChild = this.buildRecipePathTree(childRecipe, baseItems, itemToRecipes, memo);
      }
    }

    // 递归构建右子树（item_b）
    let rightChild: CraftingTreeNode | null = null;
    if (baseItems.includes(recipe.item_b)) {
      rightChild = { item: recipe.item_b, is_base: true };
    } else {
      const recipesForB = itemToRecipes[recipe.item_b];
      if (recipesForB && recipesForB.length > 0) {
        const childRecipe = recipesForB[0]; // 选择第一个配方
        rightChild = this.buildRecipePathTree(childRecipe, baseItems, itemToRecipes, memo);
      }
    }

    // 如果任一子树构建失败，则整个路径失败
    if (!leftChild || !rightChild) {
      memo[cacheKey] = null;
      return null;
    }

    // 构建根节点
    const root: CraftingTreeNode = {
      item: recipe.result,
      is_base: false,
      recipe: [recipe.item_a, recipe.item_b],
      children: [leftChild, rightChild]
    };

    memo[cacheKey] = root;
    return root;
  }

  /**
   * 计算路径统计信息
   */
  private calculatePathStats(tree: CraftingTreeNode, itemToRecipes: Record<string, Recipe[]>): { depth: number; width: number; breadth: number } {
    let maxDepth = 0;
    let totalSteps = 0;
    let totalBreadth = 0;

    const traverse = (node: CraftingTreeNode, currentDepth: number): void => {
      // 更新最大深度
      maxDepth = Math.max(maxDepth, currentDepth);

      // 计算该节点的广度（能匹配到的配方数量）
      const recipes = itemToRecipes[node.item] || [];
      totalBreadth += recipes.length;

      // 如果是基础材料，没有子节点，步骤数为0
      if (node.is_base) {
        return;
      }

      // 合成材料，步骤数+1
      totalSteps += 1;

      // 递归遍历子节点（确保子节点不为null）
      if (node.children) {
        const [leftChild, rightChild] = node.children;
        if (leftChild) {
          traverse(leftChild, currentDepth + 1);
        }
        if (rightChild) {
          traverse(rightChild, currentDepth + 1);
        }
      }
    };

    traverse(tree, 0);

    return {
      depth: maxDepth,
      width: totalSteps,
      breadth: totalBreadth
    };
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
  }) {
    const { page, limit, search = '', type = '', sortBy = 'name', sortOrder = 'asc', includePrivate = false } = params;
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereConditions = [];
    let queryParams: any[] = [];

    // 搜索条件
    if (search) {
      whereConditions.push('(name LIKE ? OR emoji LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
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

    // 查询物品列表
    const items = await database.all<Item & { usage_count: number; recipe_count: number }>(
      `SELECT 
         i.*,
         (SELECT COUNT(*) FROM recipes WHERE item_a = i.name OR item_b = i.name) as usage_count,
         (SELECT COUNT(*) FROM recipes WHERE result = i.name) as recipe_count
       FROM items i
       ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // 获取总数
    const totalResult = await database.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM items ${whereClause}`,
      queryParams
    );

    return {
      items,
      total: totalResult?.count || 0,
      page,
      limit
    };
  }

  /**
   * 生成冰柱图数据
   */
  async generateIcicleChart(): Promise<IcicleChartData> {
    // 使用缓存获取图数据
    const cache = await this.getGraphCache();
    
    const allItems = cache.allItemNames;
    const baseItems = cache.baseItemNames;
    const itemToRecipes = cache.itemToRecipes;
    
    const nodes: IcicleNode[] = [];
    let maxDepth = 0;
    
    // 为每个元素构建冰柱树
    for (const itemName of allItems) {
      const tree = this.buildIcicleTree(itemName, baseItems, itemToRecipes, new Set());
      if (tree) {
        nodes.push(tree);
        maxDepth = Math.max(maxDepth, this.calculateIcicleTreeDepth(tree));
      }
    }
    
    return {
      nodes,
      totalElements: allItems.length,
      maxDepth
    };
  }

  /**
   * 递归构建冰柱树
   */
  private buildIcicleTree(
    itemName: string,
    baseItems: string[],
    itemToRecipes: Record<string, Recipe[]>,
    visited: Set<string>
  ): IcicleNode | null {
    // 避免循环依赖
    if (visited.has(itemName)) {
      return null;
    }
    visited.add(itemName);
    
    const isBase = baseItems.includes(itemName);
    
    // 基础元素：固定宽度为1
    if (isBase) {
      return {
        id: `base_${itemName}`,
        name: itemName,
        isBase: true,
        value: 1
      };
    }
    
    // 合成元素：获取最简配方
    const recipes = itemToRecipes[itemName];
    if (!recipes || recipes.length === 0) {
      return null;
    }
    
    // 选择第一个配方作为最简配方
    const recipe = recipes[0];
    
    // 递归构建子节点
    const childA = this.buildIcicleTree(recipe.item_a, baseItems, itemToRecipes, new Set(visited));
    const childB = this.buildIcicleTree(recipe.item_b, baseItems, itemToRecipes, new Set(visited));
    
    if (!childA || !childB) {
      return null;
    }
    
    // 合成元素的宽度是子节点宽度之和
    const value = childA.value + childB.value;
    
    return {
      id: `synthetic_${itemName}`,
      name: itemName,
      isBase: false,
      value,
      children: [childA, childB],
      recipe: {
        item_a: recipe.item_a,
        item_b: recipe.item_b
      }
    };
  }

  /**
   * 计算冰柱树的最大深度
   */
  private calculateIcicleTreeDepth(node: IcicleNode): number {
    if (!node.children || node.children.length === 0) {
      return 1;
    }
    
    let maxChildDepth = 0;
    for (const child of node.children) {
      maxChildDepth = Math.max(maxChildDepth, this.calculateIcicleTreeDepth(child));
    }
    
    return maxChildDepth + 1;
  }
}

export const recipeService = new RecipeService();
