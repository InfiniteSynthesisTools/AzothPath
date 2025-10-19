import { database } from '../database/connection';

export interface Recipe {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;  // 数据库字段名
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
  // 移除树状统计指标
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

export class RecipeService {
  /**
   * 获取配方列表
   */
  async getRecipes(params: {
    page?: number;
    limit?: number;
    search?: string;
    orderBy?: string;
    userId?: number;
  }) {
    const { page = 1, limit = 20, search, orderBy = 'created_at', userId } = params;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT r.*, u.name as creator_name,
             (SELECT emoji FROM items WHERE name = r.item_a) as item_a_emoji,
             (SELECT emoji FROM items WHERE name = r.item_b) as item_b_emoji,
             (SELECT emoji FROM items WHERE name = r.result) as result_emoji,
             ${userId ? 'EXISTS(SELECT 1 FROM recipe_likes WHERE recipe_id = r.id AND user_id = ?) as is_liked' : '0 as is_liked'}
      FROM recipes r
      LEFT JOIN user u ON r.user_id = u.id
    `;
    const sqlParams: any[] = [];

    // 如果提供了userId，添加到参数列表
    if (userId) {
      sqlParams.push(userId);
    }

    if (search) {
      sql += ` WHERE r.item_a LIKE ? OR r.item_b LIKE ? OR r.result LIKE ?`;
      const searchPattern = `%${search}%`;
      sqlParams.push(searchPattern, searchPattern, searchPattern);
    }

    // 使用白名单验证 orderBy 参数
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

    // 记录贡献分
    let contributionPoints = 0;

    // 插入配方（新配方 +1 分）
    const recipeResult = await database.run(
      'INSERT INTO recipes (item_a, item_b, result, user_id, likes) VALUES (?, ?, ?, ?, ?)',
      [itemA, itemB, result, creatorId, 0]
    );
    contributionPoints += 1; // 新配方 +1 分
    console.log(`✅ New recipe added: ${itemA} + ${itemB} = ${result}, +1 point`);

    // 自动收录新物品（每个新物品 +2 分）
    // 注意: 用户可能乱序导入，所以 item_a、item_b、result 都可能是新物品
    const itemAPoints = await this.ensureItemExists(itemA);
    const itemBPoints = await this.ensureItemExists(itemB);
    const resultPoints = await this.ensureItemExists(result);
    contributionPoints += itemAPoints + itemBPoints + resultPoints;

    // 更新用户贡献分
    if (contributionPoints > 0) {
      await database.run(
        'UPDATE user SET contribute = contribute + ? WHERE id = ?',
        [contributionPoints, creatorId]
      );
      const newItemCount = (itemAPoints + itemBPoints + resultPoints) / 2;
      console.log(`💰 User ${creatorId} earned ${contributionPoints} points (1 recipe + ${newItemCount} new items)`);
    }

    return recipeResult.lastID;
  }

  /**
   * 确保物品存在于 items 表（自动收录）
   * 
   * 说明: 
   * - 用户可能乱序导入配方，导致 item_a、item_b、result 都可能不存在于数据库
   * - 外部 API 有自己的物品库，验证时不依赖我们的数据库
   * - API 只返回 result 的 emoji，item_a 和 item_b 的 emoji 初始为空
   * 
   * @param itemName 物品名称
   * @returns 贡献分（新物品 +2，已存在 0）
   */
  private async ensureItemExists(itemName: string): Promise<number> {
    const existing = await database.get('SELECT * FROM items WHERE name = ?', [itemName]);
    if (!existing) {
    // 基础材料列表（与数据库初始化保持一致）
    const baseItems = ['金', '木', '水', '火', '土'];
    const isBase = baseItems.includes(itemName);
      await database.run(
        'INSERT INTO items (name, is_base) VALUES (?, ?)',
        [itemName, isBase ? 1 : 0]
      );
      console.log(`📝 New item added to dictionary: ${itemName}, +2 points`);
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
      craftable_items: craftableItemsCount?.count || 0,
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

      const [childA, childB] = node.children!;
      const resultA = traverse(childA, depth + 1, false);
      const resultB = traverse(childB, depth + 1, false);

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
   * 检测和分析不可及图
   */
  async analyzeUnreachableGraphs(): Promise<{ unreachableGraphs: UnreachableGraph[]; systemStats: GraphSystemStats }> {
    // 获取所有配方和物品
    const recipes = await database.all<Recipe>('SELECT * FROM recipes');
    const items = await database.all<Item>('SELECT * FROM items');
    const baseItems = await database.all<Item>('SELECT * FROM items WHERE is_base = 1');
    
    const baseItemNames = baseItems.map(item => item.name);
    const allItemNames = items.map(item => item.name);

    // 构建依赖图
    const { itemToRecipes, recipeGraph } = this.buildDependencyGraph(recipes, allItemNames);
    
    // 分析可达性
    const { reachableItems, unreachableItems } = this.analyzeReachability(baseItemNames, itemToRecipes, allItemNames);
    
    // 构建不可及图
    const unreachableGraphs = this.buildUnreachableGraphs(unreachableItems, recipeGraph);
    
    // 计算系统统计
    const systemStats = await this.calculateSystemStats(reachableItems, unreachableGraphs, recipes, itemToRecipes);

    return { unreachableGraphs, systemStats };
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
   * 构建不可及图
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
    itemToRecipes: Record<string, Recipe[]>
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
    const validGraphStats = await this.calculateValidGraphStats(reachableItems, recipes, itemToRecipes);

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
    itemToRecipes: Record<string, Recipe[]>
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
        const result = await this.searchPath(item);
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
}

export const recipeService = new RecipeService();
