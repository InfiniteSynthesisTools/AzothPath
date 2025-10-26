import { database } from '../database/connection';
import { logger } from '../utils/logger';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';
import { apiConfig } from '../config/api';
import axios from 'axios';
import { validationLimiter } from '../utils/validationLimiter';
import { CacheService } from './cacheService';

export interface ImportTask {
  id: number;
  user_id: number;
  total_count: number;
  success_count: number;
  failed_count: number;
  duplicate_count: number;
  status: 'processing' | 'completed' | 'failed';
  error_details?: string;
  notification_deleted: number;  // 0=未删除, 1=已删除
  created_at: string;
  updated_at: string;
}

export interface ImportTaskContent {
  id: number;
  task_id: number;
  item_a: string;
  item_b: string;
  result: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'duplicate';
  retry_count: number;  // 重试次数
  error_message?: string;
  recipe_id?: number;
  created_at: string;
  updated_at: string;
}

export class ImportService {
  /**
   * 解析配方文本
   */
  parseRecipeText(text: string): Array<{ item_a: string; item_b: string; result: string }> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const recipes: Array<{ item_a: string; item_b: string; result: string }> = [];

    for (const line of lines) {
      // 匹配格式：A+B=C
      const match = line.match(/^(.+?)\+(.+?)=(.+)$/);
      if (match) {
        let [, itemA, itemB, result] = match;
        itemA = itemA.trim();
        itemB = itemB.trim();
        result = result.trim();

        // 确保 item_a < item_b (字典序)
        if (itemA > itemB) {
          [itemA, itemB] = [itemB, itemA];
        }

        recipes.push({
          item_a: itemA,
          item_b: itemB,
          result: result
        });
      }
    }

    return recipes;
  }

  /**
   * 创建导入任务
   */
  async createImportTask(userId: number, recipes: Array<{ item_a: string; item_b: string; result: string }>): Promise<number> {
    const totalCount = recipes.length;

    // 创建任务汇总记录
    const taskResult = await database.run(
      'INSERT INTO import_tasks (user_id, total_count, success_count, failed_count, duplicate_count, status, notification_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, totalCount, 0, 0, 0, 'processing', 0, getCurrentUTC8TimeForDB(), getCurrentUTC8TimeForDB()]
    );

    const taskId = taskResult.lastID!;

    // 创建任务明细记录
    for (const recipe of recipes) {
      await database.run(
        'INSERT INTO import_tasks_content (task_id, item_a, item_b, result, status, retry_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [taskId, recipe.item_a, recipe.item_b, recipe.result, 'pending', 0, getCurrentUTC8TimeForDB(), getCurrentUTC8TimeForDB()]
      );
    }

    return taskId;
  }

  /**
   * 处理导入任务 - 优化版本，使用队列处理大量数据
   */
  async processImportTask(taskId: number): Promise<{ successCount: number; failedCount: number; duplicateCount: number }> {
    try {
      logger.info(`开始处理导入任务${taskId}，使用队列系统`);

      // 立即将任务状态设置为处理中
      await database.run(
        'UPDATE import_tasks SET status = ? WHERE id = ?',
        ['processing', taskId]
      );

      // 对于大量数据，我们依赖队列系统处理，这里只返回初始状态
      return { successCount: 0, failedCount: 0, duplicateCount: 0 };

    } catch (error: any) {
      // 更新任务状态为失败
      await database.run(
        'UPDATE import_tasks SET status = ?, error_details = ?, updated_at = ? WHERE id = ?',
        ['failed', JSON.stringify({ error: error.message }), getCurrentUTC8TimeForDB(), taskId]
      );


      logger.error('处理导入任务错误', error);
      throw error;
    }
  }

  /**
   * 获取导入任务详情
   */
  async getImportTask(taskId: number): Promise<ImportTask | null> {
    const result = await database.get<ImportTask>(
      'SELECT * FROM import_tasks WHERE id = ?',
      [taskId]
    );
    return result || null;
  }

  /**
   * 获取导入任务明细（按任务ID）
   */
  async getImportTaskContents(taskId: number, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{ contents: ImportTaskContent[]; total: number }> {
    const { page = 1, limit = 20, status } = params;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM import_tasks_content WHERE task_id = ?';
    const sqlParams: any[] = [taskId];

    if (status !== undefined) {
      sql += ' AND status = ?';
      sqlParams.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const contents = await database.all<ImportTaskContent>(sql, sqlParams);

    // 获取总数 - 使用缓存优化
    const cacheService = CacheService.getInstance();
    const cacheKey = `task_${taskId}_${status || 'all'}`;
    let total = cacheService.getImportTaskCount(parseInt(cacheKey));
    
    if (total === null) {
      // 缓存未命中，执行COUNT查询
      let countSql = 'SELECT COUNT(*) as count FROM import_tasks_content WHERE task_id = ?';
      const countParams: any[] = [taskId];
      if (status !== undefined) {
        countSql += ' AND status = ?';
        countParams.push(status);
      }

      const totalResult = await database.get<{ count: number }>(countSql, countParams);
      total = totalResult?.count || 0;
      
      // 缓存结果
      cacheService.setImportTaskCount(total, parseInt(cacheKey));
      logger.debug(`[缓存设置] 导入任务内容总数: ${total}, 任务ID: ${taskId}, 状态: ${status || 'all'}`);
    } else {
      logger.debug(`[缓存命中] 导入任务内容总数: ${total}, 任务ID: ${taskId}, 状态: ${status || 'all'}`);
    }

    return {
      contents,
      total
    };
  }

  /**
   * 获取用户的导入任务批次列表
   */
  async getUserImportTasks(userId: number, params: {
    page?: number;
    limit?: number;
    status?: string;
    showDeleted?: boolean; // 是否显示已删除通知的任务
  } = {}): Promise<{ tasks: ImportTask[]; total: number }> {
    const { page = 1, limit = 20, status, showDeleted = false } = params;
    const offset = (page - 1) * limit;

    // 查询任务汇总表
    let sql = 'SELECT * FROM import_tasks WHERE user_id = ?';
    const sqlParams: any[] = [userId];

    // 如果不显示已删除的任务，则过滤掉已删除通知的任务
    if (!showDeleted) {
      sql += ' AND notification_deleted = 0';
    }

    if (status !== undefined) {
      sql += ' AND status = ?';
      sqlParams.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const tasks = await database.all<ImportTask>(sql, sqlParams);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as count FROM import_tasks WHERE user_id = ?';
    const countParams: any[] = [userId];
    
    if (!showDeleted) {
      countSql += ' AND notification_deleted = 0';
    }
    
    if (status !== undefined) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const totalResult = await database.get<{ count: number }>(countSql, countParams);

    return {
      tasks,
      total: totalResult?.count || 0
    };
  }

  /**
   * 获取所有导入任务（管理员用）
   */
  async getAllImportTasks(params: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: number;
  } = {}): Promise<{ tasks: ImportTask[]; total: number }> {
    const { page = 1, limit = 20, status, userId } = params;
    const offset = (page - 1) * limit;

    // 查询所有任务汇总表
    let sql = 'SELECT * FROM import_tasks WHERE 1=1';
    const sqlParams: any[] = [];

    if (userId !== undefined) {
      sql += ' AND user_id = ?';
      sqlParams.push(userId);
    }

    if (status !== undefined) {
      sql += ' AND status = ?';
      sqlParams.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const tasks = await database.all<ImportTask>(sql, sqlParams);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as count FROM import_tasks WHERE 1=1';
    const countParams: any[] = [];
    
    if (userId !== undefined) {
      countSql += ' AND user_id = ?';
      countParams.push(userId);
    }
    
    if (status !== undefined) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const totalResult = await database.get<{ count: number }>(countSql, countParams);

    return {
      tasks,
      total: totalResult?.count || 0
    };
  }

  /**
   * 创建单个配方导入任务（用于跟踪非批量上传）
   */
  async createSingleImportTask(userId: number, itemA: string, itemB: string, result: string): Promise<number> {
    // 创建任务汇总记录
    const taskResult = await database.run(
      'INSERT INTO import_tasks (user_id, total_count, success_count, failed_count, duplicate_count, status, notification_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, 1, 0, 0, 0, 'processing', 0, getCurrentUTC8TimeForDB(), getCurrentUTC8TimeForDB()]
    );

    const taskId = taskResult.lastID!;

    // 创建任务明细记录
    await database.run(
      'INSERT INTO import_tasks_content (task_id, item_a, item_b, result, status, retry_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, itemA, itemB, result, 'pending', 0, getCurrentUTC8TimeForDB(), getCurrentUTC8TimeForDB()]
    );

    return taskId;
  }

  /**
   * 获取所有导入任务（包括单个配方上传）
   */
  async getAllImportTasksWithSingle(params: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: number;
  } = {}): Promise<{ tasks: ImportTask[]; total: number }> {
    const { page = 1, limit = 20, status, userId } = params;
    const offset = (page - 1) * limit;

    // 查询所有任务汇总表
    let sql = 'SELECT * FROM import_tasks WHERE 1=1';
    const sqlParams: any[] = [];

    if (userId !== undefined) {
      sql += ' AND user_id = ?';
      sqlParams.push(userId);
    }

    if (status !== undefined) {
      sql += ' AND status = ?';
      sqlParams.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const tasks = await database.all<ImportTask>(sql, sqlParams);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as count FROM import_tasks WHERE 1=1';
    const countParams: any[] = [];
    
    if (userId !== undefined) {
      countSql += ' AND user_id = ?';
      countParams.push(userId);
    }
    
    if (status !== undefined) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const totalResult = await database.get<{ count: number }>(countSql, countParams);

    return {
      tasks,
      total: totalResult?.count || 0
    };
  }

  /**
   * 标记单个任务为成功
   */
  async markSingleTaskAsSuccess(taskId: number, recipeId: number): Promise<void> {
    // 更新任务汇总表
    await database.run(
      'UPDATE import_tasks SET status = ?, success_count = 1, updated_at = ? WHERE id = ?',
      ['completed', getCurrentUTC8TimeForDB(), taskId]
    );

    // 更新任务明细表
    await database.run(
      'UPDATE import_tasks_content SET status = ?, recipe_id = ?, updated_at = ? WHERE task_id = ?',
      ['success', recipeId, getCurrentUTC8TimeForDB(), taskId]
    );
  }

  /**
   * 删除导入任务通知
   * @param taskId 任务ID
   * @param userId 用户ID（用于权限验证）
   */
  async deleteNotification(taskId: number, userId: number): Promise<void> {
    // 验证任务是否存在且属于该用户
    const task = await this.getImportTask(taskId);
    if (!task) {
      throw new Error('导入任务不存在');
    }

    if (task.user_id !== userId) {
      throw new Error('没有权限删除此任务的通知');
    }

    // 只有已完成的任务才能删除通知
    if (task.status !== 'completed') {
      throw new Error('只有已完成的任务才能删除通知');
    }

    // 更新通知删除状态
    await database.run(
      'UPDATE import_tasks SET notification_deleted = 1, updated_at = ? WHERE id = ?',
      [getCurrentUTC8TimeForDB(), taskId]
    );

    logger.info(`用户 ${userId} 删除了任务 ${taskId} 的通知`);
  }

  /**
   * 获取用户未删除通知的已完成任务
   */
  async getUnreadCompletedTasks(userId: number): Promise<ImportTask[]> {
    const tasks = await database.all<ImportTask>(
      'SELECT * FROM import_tasks WHERE user_id = ? AND status = ? AND notification_deleted = 0 ORDER BY created_at DESC',
      [userId, 'completed']
    );
    return tasks;
  }
}

export const importService = new ImportService();
