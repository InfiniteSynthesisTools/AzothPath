import { database } from '../database/connection';
import { logger } from '../utils/logger';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';
import { apiConfig } from '../config/api';
import axios from 'axios';
import { validationLimiter } from '../utils/validationLimiter';

export interface ImportTask {
  id: number;
  user_id: number;
  total_count: number;
  success_count: number;
  failed_count: number;
  duplicate_count: number;
  status: 'processing' | 'completed' | 'failed';
  error_details?: string;
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
      'INSERT INTO import_tasks (user_id, total_count, success_count, failed_count, duplicate_count, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, totalCount, 0, 0, 0, 'processing', getCurrentUTC8TimeForDB(), getCurrentUTC8TimeForDB()]
    );

    const taskId = taskResult.lastID!;

    // 创建任务明细记录
    for (const recipe of recipes) {
      await database.run(
        'INSERT INTO import_tasks_content (task_id, item_a, item_b, result, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [taskId, recipe.item_a, recipe.item_b, recipe.result, 'pending', getCurrentUTC8TimeForDB(), getCurrentUTC8TimeForDB()]
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

    // 获取总数
    let countSql = 'SELECT COUNT(*) as count FROM import_tasks_content WHERE task_id = ?';
    const countParams: any[] = [taskId];
    if (status !== undefined) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const totalResult = await database.get<{ count: number }>(countSql, countParams);

    return {
      contents,
      total: totalResult?.count || 0
    };
  }

  /**
   * 获取用户的导入任务批次列表
   */
  async getUserImportTasks(userId: number, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{ tasks: ImportTask[]; total: number }> {
    const { page = 1, limit = 20, status } = params;
    const offset = (page - 1) * limit;

    // 查询任务汇总表
    let sql = 'SELECT * FROM import_tasks WHERE user_id = ?';
    const sqlParams: any[] = [userId];

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
}

export const importService = new ImportService();
