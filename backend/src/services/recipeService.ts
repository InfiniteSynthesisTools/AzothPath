import { database } from '../database/connection';

export interface Recipe {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;  // 数据库字段名
  is_verified: number;  // 0=false, 1=true
  likes: number;  // 点赞数（冗余字段）
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
  children?: [CraftingTreeNode, CraftingTreeNode];
}

export interface PathStats {
  depth: number;
  steps: number;
  total_materials: number;
  material_types: number;
  materials: Record<string, number>;
}

export class RecipeService {
  /**
   * 获取配方列表
   */
  async getRecipes(params: {
    page?: number;
    limit?: number;
    search?: string;
    orderBy?: string;
  }) {
    const { page = 1, limit = 20, search, orderBy = 'created_at' } = params;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT r.*, u.name as creator_name
      FROM recipes r
      LEFT JOIN user u ON r.user_id = u.id
    `;
    const sqlParams: any[] = [];

    if (search) {
      sql += ` WHERE r.item_a LIKE ? OR r.item_b LIKE ? OR r.result LIKE ?`;
      const searchPattern = `%${search}%`;
      sqlParams.push(searchPattern, searchPattern, searchPattern);
    }

    const validOrderBy = ['created_at', 'likes'].includes(orderBy) ? orderBy : 'created_at';
    sql += ` ORDER BY r.${validOrderBy} DESC LIMIT ? OFFSET ?`;
    sqlParams.push(limit, offset);

    const recipes = await database.all(sql, sqlParams);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as count FROM recipes';
    const countParams: any[] = [];
    if (search) {
      countSql += ` WHERE item_a LIKE ? OR item_b LIKE ? OR result LIKE ?`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }
    const totalResult = await database.get<{ count: number }>(countSql, countParams);

    return {
      recipes,
      total: totalResult?.count || 0,
      page,
      limit
    };
  }

  /**
   * 获取配方详情
   */
  async getRecipeById(id: number) {
    const recipe = await database.get(
      `SELECT r.*, u.name as creator_name
       FROM recipes r
       LEFT JOIN user u ON r.user_id = u.id
       WHERE r.id = ?`,
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
    // 规范化：确保 itemA < itemB
    if (itemA > itemB) {
      [itemA, itemB] = [itemB, itemA];
    }

    // 检查是否已存在
    const existing = await database.get(
      'SELECT * FROM recipes WHERE item_a = ? AND item_b = ? AND result = ?',
      [itemA, itemB, result]
    );

    if (existing) {
      throw new Error('配方已存在');
    }

    // TODO: 调用外部 API 验证配方有效性
    // const isValid = await this.validateRecipeWithAPI(itemA, itemB, result);
    // if (!isValid) throw new Error('配方验证失败');

    // 插入配方
    const recipeResult = await database.run(
      'INSERT INTO recipes (item_a, item_b, result, user_id, is_verified, likes) VALUES (?, ?, ?, ?, ?, ?)',
      [itemA, itemB, result, creatorId, 0, 0]
    );

    // 自动收录新物品
    await this.ensureItemExists(itemA);
    await this.ensureItemExists(itemB);
    await this.ensureItemExists(result);

    return recipeResult.lastID;
  }

  /**
   * 确保物品存在（自动收录）
   */
  private async ensureItemExists(itemName: string) {
    const existing = await database.get('SELECT * FROM items WHERE name = ?', [itemName]);
    if (!existing) {
      // 基础材料列表
      const baseItems = ['金', '木', '水', '火', '土', '宝石'];
      const isBase = baseItems.includes(itemName);
      await database.run(
        'INSERT INTO items (name, is_base) VALUES (?, ?)',
        [itemName, isBase ? 1 : 0]
      );
    }
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
      await database.run('INSERT INTO recipe_likes (recipe_id, user_id) VALUES (?, ?)', [recipeId, userId]);
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
    const usersCount = await database.get<{ count: number }>('SELECT COUNT(*) as count FROM user');
    const tasksCount = await database.get<{ count: number }>('SELECT COUNT(*) as count FROM task WHERE status = ?', ['active']);

    return {
      total_recipes: recipesCount?.count || 0,
      total_items: itemsCount?.count || 0,
      total_users: usersCount?.count || 0,
      active_tasks: tasksCount?.count || 0
    };
  }

  /**
   * 搜索合成路径（BFS 算法）
   */
  async searchPath(targetItem: string): Promise<{ tree: CraftingTreeNode; stats: PathStats } | null> {
    // 获取所有配方
    const recipes = await database.all<Recipe>('SELECT * FROM recipes');
    const items = await database.all<Item>('SELECT * FROM items WHERE is_base = 1');
    
    const baseItemNames = items.map(item => item.name);
    
    // 构建物品到配方的映射
    const itemToRecipes: Record<string, Recipe[]> = {};
    for (const recipe of recipes) {
      if (!itemToRecipes[recipe.result]) {
        itemToRecipes[recipe.result] = [];
      }
      itemToRecipes[recipe.result].push(recipe);
    }

    // 构建合成树
    const memo: Record<string, CraftingTreeNode | null> = {};
    const tree = this.buildCraftingTree(targetItem, baseItemNames, itemToRecipes, memo);
    
    if (!tree) {
      return null;
    }

    // 计算统计信息
    const stats = this.calculateTreeStats(tree);

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
  private calculateTreeStats(tree: CraftingTreeNode): PathStats {
    const materials: Record<string, number> = {};
    
    const traverse = (node: CraftingTreeNode, depth: number): { maxDepth: number; steps: number } => {
      if (node.is_base) {
        materials[node.item] = (materials[node.item] || 0) + 1;
        return { maxDepth: depth, steps: 0 };
      }

      const [childA, childB] = node.children!;
      const resultA = traverse(childA, depth + 1);
      const resultB = traverse(childB, depth + 1);

      return {
        maxDepth: Math.max(resultA.maxDepth, resultB.maxDepth),
        steps: 1 + resultA.steps + resultB.steps
      };
    };

    const { maxDepth, steps } = traverse(tree, 0);
    const totalMaterials = Object.values(materials).reduce((sum, count) => sum + count, 0);

    return {
      depth: maxDepth,
      steps,
      total_materials: totalMaterials,
      material_types: Object.keys(materials).length,
      materials
    };
  }
}

export const recipeService = new RecipeService();
