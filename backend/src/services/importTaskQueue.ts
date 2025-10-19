import { database } from '../database/connection';
import { logger } from '../utils/logger';
import { apiConfig } from '../config/api';
import axios from 'axios';
import { recipeService } from './recipeService';

// 外部验证 API 配置
const VALIDATION_API_URL = process.env.VALIDATION_API_URL || 'https://hc.tsdo.in/api';
const MAX_RETRY_COUNT = 3;
const QUEUE_INTERVAL = 2000; // 2秒检查一次，提高响应速度
const CONCURRENT_LIMIT = 10; // 提高并发处理数量

interface ImportTaskContent {
  id: number;
  task_id: number;
  item_a: string;
  item_b: string;
  result: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'duplicate';
  retry_count: number;
  error_message: string | null;
  recipe_id: number | null;
  created_at: string;
  updated_at: string;
}

interface ValidationResponse {
  result: string;
  emoji?: string;
  isNew?: boolean;
}

class ImportTaskQueue {
  private isRunning: boolean = false;
  private processingIds: Set<number> = new Set();

  /**
   * 启动任务队列处理器
   */
  async start() {
    if (this.isRunning) {
      logger.warn('导入任务队列已在运行');
      return;
    }

    // 等待数据库初始化完成
    try {
      await database.init();
      logger.debug('数据库连接已确认，启动任务队列');
    } catch (error) {
      logger.error('数据库初始化失败，任务队列启动失败', error);
      return;
    }

    this.isRunning = true;
    logger.success('导入任务队列已启动');
    this.processLoop();
  }

  /**
   * 停止任务队列处理器
   */
  stop() {
    this.isRunning = false;
    logger.info('导入任务队列已停止');
  }

  /**
   * 主循环：定时检查待处理任务
   */
  private async processLoop() {
    while (this.isRunning) {
      try {
        logger.info('任务队列循环开始');
        await this.processPendingTasks();
      } catch (error) {
        logger.error('任务队列循环错误', error);
      }

      // 等待下一轮
      await new Promise(resolve => setTimeout(resolve, QUEUE_INTERVAL));
    }
  }

  /**
   * 处理待处理的任务
   */
  private async processPendingTasks() {
    // 查询待处理的任务（status='pending' 且重试次数<3）
    logger.info('查询待处理任务');
    try {
      const pendingTasks = await database.all<ImportTaskContent>(
        `SELECT * FROM import_tasks_content 
         WHERE status = 'pending' AND retry_count < ? 
         ORDER BY created_at ASC 
         LIMIT ?`,
        [MAX_RETRY_COUNT, CONCURRENT_LIMIT]
      );
      logger.info(`查询到${pendingTasks.length}个待处理任务`);

      if (pendingTasks.length === 0) {
        return; // 没有待处理任务
      }

      logger.info(`发现${pendingTasks.length}个待处理任务`);

      // 并发处理任务
      const promises = pendingTasks.map((task: ImportTaskContent) => this.processTask(task));
      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('查询待处理任务失败', error);
      throw error;
    }
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: ImportTaskContent) {
    // 防止重复处理
    if (this.processingIds.has(task.id)) {
      return;
    }

    this.processingIds.add(task.id);

    try {
      logger.debug(`处理任务${task.id}: ${task.item_a} + ${task.item_b} = ${task.result}`);

      // 1. 检查是否已存在相同配方（去重）
      const existingRecipe = await this.checkDuplicateRecipe(task);
      if (existingRecipe) {
        await this.markAsDuplicate(task, existingRecipe.id);
        return;
      }

      // 2. 调用外部 API 验证
      const validationResult = await this.validateRecipe(task);

      if (!validationResult.success) {
        // 验证失败，增加重试次数
        await this.incrementRetry(task, validationResult.error || 'Unknown error');
        return;
      }

      // 3. 验证成功，插入到 recipes 表
      const recipeId = await this.insertRecipe(task);

      // 4. 更新物品字典（包括保存 emoji）
      await this.updateItemsDictionary([task.item_a, task.item_b, task.result], validationResult.emoji);

      // 5. 标记为成功
      await this.markAsSuccess(task, recipeId);

      // 6. 更新任务统计
      await this.updateTaskStats(task.task_id);

      console.log(`✅ Task ${task.id} completed successfully`);
    } catch (error: any) {
      console.error(`❌ Error processing task ${task.id}:`, error);
      await this.incrementRetry(task, error.message);
    } finally {
      this.processingIds.delete(task.id);
    }
  }

  /**
   * 检查重复配方
   */
  private async checkDuplicateRecipe(task: ImportTaskContent): Promise<{ id: number } | null> {
    // 确保 item_a <= item_b（字典序）
    let [itemA, itemB] = [task.item_a, task.item_b];
    if (itemA > itemB) {
      [itemA, itemB] = [itemB, itemA];
    }

    const existing = await database.get<{ id: number }>(
      'SELECT id FROM recipes WHERE item_a = ? AND item_b = ? LIMIT 1',
      [itemA, itemB]
    );

    return existing || null;
  }

  /**
   * 调用外部 API 验证配方
   */
  private async validateRecipe(task: ImportTaskContent): Promise<{ success: boolean; error?: string; emoji?: string }> {
    try {
      logger.debug(`验证配方: ${task.item_a} + ${task.item_b}`);
      const response = await axios.get(apiConfig.validationApiUrl, {
        params: {
          itemA: task.item_a,
          itemB: task.item_b
        },
        timeout: apiConfig.timeout,
        headers: apiConfig.headers
      });

      logger.debug(`API响应: ${response.status}`, response.data);

      if (response.status === 200) {
        const data = response.data;
        if (data.item && data.item !== '') {
          // 验证返回的结果是否匹配
          if (data.item !== task.result) {
            return {
              success: false,
              error: `结果不匹配: 预期 "${task.result}", 实际 "${data.item}"`
            };
          }
          logger.debug(`验证成功: ${task.item_a} + ${task.item_b} = ${data.item}`);
          return { success: true, emoji: data.emoji };
        } else {
          logger.debug(`验证失败: 无法合成 ${task.item_a} + ${task.item_b}`);
          return { success: false, error: '无法合成' };
        }
      } else {
        logger.warn(`API错误状态: ${response.status}`);
        return { success: false, error: `API返回状态: ${response.status}` };
      }
    } catch (error: any) {
      logger.error(`验证异常: ${error.message}`);
      
      if (error.response) {
        const status = error.response.status;
        logger.warn(`错误响应: ${status}`, error.response.data);
        
        if (status === 400) {
          return { success: false, error: '这两个物件不能合成' };
        } else if (status === 403) {
          return { success: false, error: '包含非法物件（还没出现过的物件）' };
        } else {
          return { success: false, error: `验证失败，状态码: ${status}` };
        }
      } else if (error.code === 'ECONNABORTED') {
        return { success: false, error: '验证超时，请稍后重试' };
      } else {
        // 网络错误，可以重试
        return {
          success: false,
          error: `网络错误: ${error.message}`
        };
      }
    }
  }

  /**
   * 插入配方到 recipes 表
   */
  private async insertRecipe(task: ImportTaskContent): Promise<number> {
    // 确保 item_a <= item_b（字典序）
    let [itemA, itemB] = [task.item_a, task.item_b];
    if (itemA > itemB) {
      [itemA, itemB] = [itemB, itemA];
    }

    // 获取任务的创建者 ID
    const taskInfo = await database.get<{ user_id: number }>(
      'SELECT user_id FROM import_tasks WHERE id = ?',
      [task.task_id]
    );

    const userId = taskInfo?.user_id || 1; // 默认使用管理员 ID

    const result = await database.run(
      `INSERT INTO recipes (item_a, item_b, result, user_id, likes) 
       VALUES (?, ?, ?, ?, 0)`,
      [itemA, itemB, task.result, userId]
    );

    return result.lastID!;
  }

  /**
   * 更新物品字典
   */
  private async updateItemsDictionary(items: string[], resultEmoji?: string) {
    for (const item of items) {
      await database.run(
        'INSERT OR IGNORE INTO items (name, is_base) VALUES (?, 0)',
        [item]
      );
    }
    
    // 如果有 emoji，更新结果物品的 emoji
    if (resultEmoji && items[2]) {
      await database.run(
        'UPDATE items SET emoji = ? WHERE name = ?',
        [resultEmoji, items[2]]
      );
      logger.debug(`保存emoji: ${items[2]} = ${resultEmoji}`);
    }
  }

  /**
   * 标记为成功
   */
  private async markAsSuccess(task: ImportTaskContent, recipeId: number) {
    await database.run(
      `UPDATE import_tasks_content 
       SET status = ?, recipe_id = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      ['success', recipeId, task.id]
    );
  }

  /**
   * 标记为重复
   */
  private async markAsDuplicate(task: ImportTaskContent, existingRecipeId: number) {
    await database.run(
      `UPDATE import_tasks_content 
       SET status = ?, recipe_id = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      ['duplicate', existingRecipeId, 'Duplicate recipe', task.id]
    );

    // 更新任务统计（duplicate_count）
    await database.run(
      `UPDATE import_tasks 
       SET duplicate_count = duplicate_count + 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [task.task_id]
    );

    logger.info(`任务${task.id}标记为重复 (recipe_id: ${existingRecipeId})`);
  }

  /**
   * 增加重试次数
   */
  private async incrementRetry(task: ImportTaskContent, errorMessage: string) {
    const newRetryCount = task.retry_count + 1;
    const newStatus = newRetryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending';

    await database.run(
      `UPDATE import_tasks_content 
       SET retry_count = ?, status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newRetryCount, newStatus, errorMessage, task.id]
    );

    if (newStatus === 'failed') {
      console.log(`⚠️  Task ${task.id} failed after ${MAX_RETRY_COUNT} retries`);
      await this.updateTaskStats(task.task_id);
    } else {
      console.log(`🔄 Task ${task.id} retry ${newRetryCount}/${MAX_RETRY_COUNT}`);
    }
  }

  /**
   * 更新任务统计信息
   */
  private async updateTaskStats(taskId: number) {
    // 统计各状态的数量
    const stats = await database.get<{
      total: number;
      success: number;
      failed: number;
      duplicate: number;
    }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'duplicate' THEN 1 ELSE 0 END) as duplicate
       FROM import_tasks_content 
       WHERE task_id = ?`,
      [taskId]
    );

    if (!stats) return;

    const pending = stats.total - stats.success - stats.failed - stats.duplicate;
    const taskStatus = pending > 0 ? 'processing' : 'completed';

    await database.run(
      `UPDATE import_tasks 
       SET success_count = ?, failed_count = ?, duplicate_count = ?, 
           status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [stats.success, stats.failed, stats.duplicate, taskStatus, taskId]
    );

    console.log(`📊 Task ${taskId} stats updated: ${stats.success} success, ${stats.failed} failed, ${stats.duplicate} duplicate, ${pending} pending`);
  }

  /**
   * 手动触发处理特定任务
   */
  async processTaskById(taskId: number) {
    const task = await database.get<ImportTaskContent>(
      'SELECT * FROM import_tasks_content WHERE id = ?',
      [taskId]
    );

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    await this.processTask(task);
  }

  /**
   * 重置失败任务（允许重新处理）
   */
  async resetFailedTasks(taskId?: number) {
    const sql = taskId
      ? 'UPDATE import_tasks_content SET status = ?, retry_count = 0, error_message = NULL WHERE task_id = ? AND status = ?'
      : 'UPDATE import_tasks_content SET status = ?, retry_count = 0, error_message = NULL WHERE status = ?';

    const params = taskId ? ['pending', taskId, 'failed'] : ['pending', 'failed'];
    const result = await database.run(sql, params);

    logger.info(`重置${result.changes}个失败任务`);
    return result.changes || 0;
  }
}

// 单例模式
export const importTaskQueue = new ImportTaskQueue();
