import { database } from '../database/connection';
import { recipeService } from './recipeService';
import axios from 'axios';

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
  status: number;  // 0=待处理, 1=成功, -1=失败
  retry_count: number;  // 重试次数
  error_message?: string;
  recipe_id?: number;
  created_at: string;
  updated_at: string;
}

export class ImportService {
  /**
   * 验证配方是否有效
   */
  async validateRecipe(itemA: string, itemB: string): Promise<{ valid: boolean; result?: string; error?: string; emoji?: string }> {
    try {
      console.log(`🔍 验证配方: ${itemA} + ${itemB}`);
      const response = await axios.get('https://hc.tsdo.in/api', {
        params: {
          itemA: itemA,
          itemB: itemB
        },
        timeout: 5000, // 5秒超时
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AzothPath/1.0'
        }
      });

      console.log(`📡 API响应: ${response.status}`, response.data);

      if (response.status === 200) {
        const data = response.data;
        if (data.item && data.item !== '') {
          console.log(`✅ 验证成功: ${itemA} + ${itemB} = ${data.item}`);
          return { valid: true, result: data.item, emoji: data.emoji };
        } else {
          console.log(`❌ 验证失败: 无法合成 ${itemA} + ${itemB}`);
          return { valid: false, error: '无法合成' };
        }
      } else {
        console.log(`❌ API错误状态: ${response.status}`);
        return { valid: false, error: `API返回状态: ${response.status}` };
      }
    } catch (error: any) {
      console.log(`❌ 验证异常: ${error.message}`);
      if (error.response) {
        const status = error.response.status;
        console.log(`📡 错误响应: ${status}`, error.response.data);
        if (status === 400) {
          return { valid: false, error: '这两个物件不能合成' };
        } else if (status === 403) {
          return { valid: false, error: '包含非法物件（还没出现过的物件）' };
        } else {
          return { valid: false, error: `验证失败，状态码: ${status}` };
        }
      } else if (error.code === 'ECONNABORTED') {
        return { valid: false, error: '验证超时，请稍后重试' };
      } else {
        // 网络错误或其他问题，暂时跳过验证，允许配方通过
        console.warn(`验证API不可用，跳过验证: ${error.message}`);
        return { valid: true, result: undefined };
      }
    }
  }

  /**
   * 保存emoji信息到items表
   */
  async saveEmojiToItems(itemA: string, itemB: string, result: string, resultEmoji?: string) {
    try {
      if (resultEmoji) {
        await database.run('UPDATE items SET emoji = ? WHERE name = ?', [resultEmoji, result]);
        console.log(`💾 保存emoji: ${result} = ${resultEmoji}`);
      }
    } catch (error) {
      console.warn('保存emoji失败:', error);
    }
  }

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
    const taskResult = await database.run(
      'INSERT INTO import_tasks (user_id, total_count, status) VALUES (?, ?, ?)',
      [userId, recipes.length, 'processing']
    );

    const taskId = taskResult.lastID;

    // 创建任务明细
    for (const recipe of recipes) {
      await database.run(
        'INSERT INTO import_tasks_content (task_id, item_a, item_b, result, status) VALUES (?, ?, ?, ?, ?)',
        [taskId, recipe.item_a, recipe.item_b, recipe.result, 'pending']
      );
    }

    return taskId;
  }

  /**
   * 处理导入任务 - 优化版本，使用队列处理大量数据
   */
  async processImportTask(taskId: number): Promise<{ successCount: number; failedCount: number; duplicateCount: number }> {
    try {
      console.log(`🚀 Starting to process import task ${taskId} with queue system`);
      
      // 立即将任务状态设置为处理中
      await database.run(
        'UPDATE import_tasks SET status = ? WHERE id = ?',
        ['processing', taskId]
      );

      // 对于大量数据，我们依赖队列系统处理，这里只返回初始状态
      return { successCount: 0, failedCount: 0, duplicateCount: 0 };

    } catch (error) {
      console.error('Process import task error:', error);
      await database.run(
        'UPDATE import_tasks SET status = ?, error_details = ? WHERE id = ?',
        ['failed', error instanceof Error ? error.message : 'Unknown error', taskId]
      );
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
   * 获取导入任务明细
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

    if (status) {
      sql += ' AND status = ?';
      sqlParams.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const contents = await database.all<ImportTaskContent>(sql, sqlParams);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as count FROM import_tasks_content WHERE task_id = ?';
    const countParams: any[] = [taskId];
    if (status) {
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
   * 获取用户的导入任务列表
   */
  async getUserImportTasks(userId: number, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{ tasks: ImportTask[]; total: number }> {
    const { page = 1, limit = 20, status } = params;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM import_tasks WHERE user_id = ?';
    const sqlParams: any[] = [userId];

    if (status) {
      sql += ' AND status = ?';
      sqlParams.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const tasks = await database.all<ImportTask>(sql, sqlParams);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as count FROM import_tasks WHERE user_id = ?';
    const countParams: any[] = [userId];
    if (status) {
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
