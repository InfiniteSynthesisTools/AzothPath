import { database } from '../database/connection';
import { logger } from '../utils/logger';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';

export interface Task {
  id: number;
  item_name: string;
  prize: number;
  status: 'active' | 'completed';
  task_type: 'find_recipe' | 'find_more_recipes';
  created_at: string;
  created_by_user_id: number;
  completed_by_recipe_id?: number;
  completed_at?: string;
}

export interface TaskWithDetails extends Task {
  recipe?: {
    id: number;
    item_a: string;
    item_b: string;
    result: string;
    creator_name: string;
  };
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'completed';
  sortBy?: 'created_at' | 'prize';
  sortOrder?: 'asc' | 'desc';
}

export class TaskService {
  /**
   * 获取任务列表（分页、筛选、排序）
   */
  async getTasks(params: TaskListParams = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = params;

    const offset = (page - 1) * limit;

    // 构建 WHERE 条件
    const conditions: string[] = [];
    const values: any[] = [];

    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 构建 ORDER BY
    const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // 查询总数
    const countResult = await database.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM task ${whereClause}`,
      values
    );

    // 查询任务列表
    const tasks = await database.all<Task[]>(
      `SELECT * FROM task ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return {
      tasks,
      total: countResult?.total || 0,
      page,
      limit
    };
  }

  /**
   * 获取任务详情
   */
  async getTaskById(taskId: number): Promise<TaskWithDetails | null> {
    // 获取任务信息和发布者信息
    const task = await database.get<any>(
      `SELECT t.*, u.name as creator_name
       FROM task t
       LEFT JOIN user u ON t.created_by_user_id = u.id
       WHERE t.id = ?`,
      [taskId]
    );

    if (!task) return null;

    // 如果任务已完成，获取完成配方的详情
    if (task.completed_by_recipe_id) {
      const recipe = await database.get<any>(
        `SELECT r.id, r.item_a, r.item_b, r.result, u.name as creator_name
         FROM recipes r
         LEFT JOIN user u ON r.user_id = u.id
         WHERE r.id = ?`,
        [task.completed_by_recipe_id]
      );

      return {
        ...task,
        recipe
      };
    }

    return task;
  }

  /**
   * 创建任务（手动）
   * @param itemName 物品名称
   * @param prize 奖励分数（普通用户为0，管理员可设置0-200）
   * @param userId 创建者ID
   */
  async createTask(itemName: string, prize: number, userId: number): Promise<number> {
    // 基础材料不能创建任务
    const baseMaterials = ['金', '木', '水', '火', '土'];
    if (baseMaterials.includes(itemName)) {
      throw new Error('基础材料无需创建任务');
    }

    // 检查是否已有该物品的活跃任务
    const existingTask = await database.get(
      'SELECT * FROM task WHERE item_name = ? AND status = ?',
      [itemName, 'active']
    );

    if (existingTask) {
      throw new Error('该物品已有活跃的任务');
    }

    // 检查该物品是否已有合成配方
    const existingRecipe = await database.get(
      'SELECT * FROM recipes WHERE result = ?',
      [itemName]
    );

    // 根据是否已有配方确定任务类型
    const taskType = existingRecipe ? 'find_more_recipes' : 'find_recipe';

    // 创建任务（不需要预先添加物品，等配方验证成功后自然会添加）
    const result = await database.run(
      'INSERT INTO task (item_name, prize, status, task_type, created_by_user_id) VALUES (?, ?, ?, ?, ?)',
      [itemName, prize, 'active', taskType, userId]
    );

    logger.info(`任务创建成功: ${itemName}, 奖励: ${prize}分`);

    return result.lastID!;
  }

  /**
   * 自动创建任务（当配方添加后，检查是否需要为材料创建任务）
   */
  async autoCreateTasksForRecipe(recipeId: number) {
    // 获取配方信息
    const recipe = await database.get<any>(
      'SELECT item_a, item_b, result FROM recipes WHERE id = ?',
      [recipeId]
    );

    if (!recipe) return;

    const baseMaterials = ['金', '木', '水', '火', '土'];
    const materialsToCheck = [recipe.item_a, recipe.item_b];

    for (const material of materialsToCheck) {
      // 跳过基础材料
      if (baseMaterials.includes(material)) continue;

      // 检查该材料是否已有配方（是否能被合成）
      const existingRecipe = await database.get(
        'SELECT id FROM recipes WHERE result = ?',
        [material]
      );

      if (existingRecipe) {
        // 材料已有配方，跳过
        continue;
      }

      // 检查是否已有该物品的活跃任务
      const existingTask = await database.get(
        'SELECT id FROM task WHERE item_name = ? AND status = ?',
        [material, 'active']
      );

      if (existingTask) {
        // 已有活跃任务，跳过
        continue;
      }

      // 自动创建任务（奖励根据深度计算，这里简化为固定值）
      await database.run(
        'INSERT INTO task (item_name, prize, status) VALUES (?, ?, ?)',
        [material, 10, 'active']
      );

      logger.info(`自动创建任务: ${material}`);
    }
  }

  /**
   * 完成任务
   */
  async completeTask(taskId: number, recipeId: number, userId: number) {
    try {
      logger.info(`开始完成任务${taskId}，配方${recipeId}，用户${userId}`);
      
      const task = await this.getTaskById(taskId);

      if (!task) {
        throw new Error('任务不存在');
      }

      if (task.status === 'completed') {
        throw new Error('任务已完成');
      }

      // 验证配方是否符合任务要求
      const recipe = await database.get<any>(
        'SELECT * FROM recipes WHERE id = ? AND result = ?',
        [recipeId, task.item_name]
      );

      if (!recipe) {
        throw new Error('配方不符合任务要求');
      }

      logger.info(`验证通过: 配方${recipeId}的结果物品${recipe.result}匹配任务${taskId}的物品${task.item_name}`);

      // 更新任务状态
      await database.run(
        `UPDATE task 
         SET status = ?, completed_by_recipe_id = ?, completed_at = ?
         WHERE id = ?`,
        ['completed', recipeId, getCurrentUTC8TimeForDB(), taskId]
      );

      // 发放奖励（增加用户贡献分）
      await database.run(
        'UPDATE user SET contribute = contribute + ? WHERE id = ?',
        [task.prize, userId]
      );

      logger.success(`任务完成: 用户${userId}完成任务${taskId}, 获得${task.prize}分奖励`);

      return {
        taskId,
        prize: task.prize,
        newContribution: await this.getUserContribution(userId)
      };
    } catch (error: any) {
      logger.error(`完成任务${taskId}失败:`, error);
      throw error;
    }
  }

  /**
   * 获取用户当前贡献分
   */
  private async getUserContribution(userId: number): Promise<number> {
    const user = await database.get<{ contribute: number }>(
      'SELECT contribute FROM user WHERE id = ?',
      [userId]
    );
    return user?.contribute || 0;
  }

  /**
   * 检查配方是否完成了某个任务
   */
  async checkAndCompleteTaskForRecipe(recipeId: number, userId: number) {
    try {
      logger.info(`检查配方${recipeId}是否完成相关任务，用户${userId}`);
      
      // 获取配方的结果物品
      const recipe = await database.get<any>(
        'SELECT result FROM recipes WHERE id = ?',
        [recipeId]
      );

      if (!recipe) {
        logger.warn(`配方${recipeId}不存在`);
        return null;
      }

      logger.info(`配方${recipeId}的结果物品: ${recipe.result}`);

      // 查找该物品的活跃任务
      const task = await database.get<Task>(
        'SELECT * FROM task WHERE item_name = ? AND status = ?',
        [recipe.result, 'active']
      );

      if (!task) {
        logger.info(`物品${recipe.result}没有活跃任务`);
        return null;
      }

      logger.info(`找到活跃任务${task.id}，物品: ${task.item_name}`);

      // 自动完成任务
      const result = await this.completeTask(task.id, recipeId, userId);
      logger.success(`自动完成任务${task.id}，用户${userId}获得${result.prize}分奖励`);
      return result;
    } catch (error: any) {
      logger.error('自动完成任务检测失败:', error);
      return null;
    }
  }

  /**
   * 获取任务统计
   */
  async getTaskStats() {
    const stats = await database.get<any>(
      `SELECT 
         COUNT(*) as total,
         COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as active,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
         COALESCE(SUM(CASE WHEN status = 'active' THEN prize ELSE 0 END), 0) as total_prize
       FROM task`
    );

    return stats || { total: 0, active: 0, completed: 0, total_prize: 0 };
  }

  /**
   * 删除任务（仅管理员）
   */
  async deleteTask(taskId: number) {
    const result = await database.run(
      'DELETE FROM task WHERE id = ?',
      [taskId]
    );

    if (result.changes === 0) {
      throw new Error('任务不存在');
    }

    return true;
  }
}

export const taskService = new TaskService();
