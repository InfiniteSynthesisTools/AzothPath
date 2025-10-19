import { database } from '../database/connection';
import { logger } from '../utils/logger';
import { apiConfig } from '../config/api';
import axios from 'axios';
import { recipeService } from './recipeService';

// 任务队列配置
const MAX_RETRY_COUNT = apiConfig.retryCount;
const QUEUE_INTERVAL = 5000; // 5秒检查一次
const CONCURRENT_LIMIT = 5; // 并发处理数量

interface ImportTaskContent {
  id: number;
  task_id: number;
  item_a: string;
  item_b: string;
  result: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'duplicate';
  error_message: string | null;
  recipe_id: number | null;
  created_at: string;
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
    // 查询待处理的任务（status='pending'）
    const pendingTasks = await database.all<ImportTaskContent>(
      `SELECT * FROM import_tasks_content 
       WHERE status = 'pending'
       ORDER BY created_at ASC 
       LIMIT ?`,
      [CONCURRENT_LIMIT]
    );

    if (pendingTasks.length === 0) {
      return; // 没有待处理任务
    }

    logger.debug(`发现${pendingTasks.length}个待处理任务`);

    // 并发处理任务
    const promises = pendingTasks.map((task: ImportTaskContent) => this.processTask(task));
    await Promise.allSettled(promises);
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

      // 更新进度通知
      await this.updateTaskProgress(task);

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
        await this.markAsFailed(task, validationResult.error || 'Unknown error');
        return;
      }

      // 3. 验证成功，插入到 recipes 表
      const recipeId = await this.insertRecipe(task);

      // 4. 更新物品字典（包括保存 emoji）
      await this.updateItemsDictionary([task.item_a, task.item_b, task.result], validationResult.emoji);

      // 5. 标记为成功
      await this.markAsSuccess(task, recipeId);

      // 注意：新的表结构中不再需要更新统计

      logger.success(`任务${task.id}处理成功`);
    } catch (error: any) {
      logger.error(`任务${task.id}处理失败`, error);
      await this.markAsFailed(task, error.message);
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
   * 插入配方到 recipes 表（使用 recipeService 以支持自动完成任务）
   */
  private async insertRecipe(task: ImportTaskContent): Promise<number> {
    // 获取任务的创建者 ID
    const taskInfo = await database.get<{ user_id: number }>(
      'SELECT user_id FROM import_tasks WHERE id = ?',
      [task.task_id]
    );
    const userId = taskInfo?.user_id;
    if (!userId) {
      throw new Error('无法找到任务对应的用户');
    }

    // 使用 recipeService.submitRecipe 来支持自动完成任务功能
    logger.info(`通过任务队列提交配方: ${task.item_a} + ${task.item_b} = ${task.result}, 用户${userId}`);
    const recipeId = await recipeService.submitRecipe(
      task.item_a,
      task.item_b,
      task.result,
      userId
    );

    return recipeId;
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
       SET status = ?, recipe_id = ? 
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
       SET status = ?, recipe_id = ?, error_message = ? 
       WHERE id = ?`,
      ['duplicate', existingRecipeId, 'Duplicate recipe', task.id]
    );

    logger.info(`任务${task.id}标记为重复 (recipe_id: ${existingRecipeId})`);
  }

  /**
   * 标记任务为失败
   */
  private async markAsFailed(task: ImportTaskContent, errorMessage: string) {
    await database.run(
      `UPDATE import_tasks_content 
       SET status = ?, error_message = ? 
       WHERE id = ?`,
      ['failed', errorMessage, task.id]
    );

    logger.warn(`任务${task.id}处理失败: ${errorMessage}`);
  }

  /**
   * 更新任务进度
   */
  private async updateTaskProgress(task: ImportTaskContent) {
    try {
      // 获取任务汇总信息
      const taskInfo = await database.get<{ user_id: number; total_count: number }>(
        'SELECT user_id, total_count FROM import_tasks WHERE id = ?',
        [task.task_id]
      );

      if (!taskInfo) return;

      // 获取已处理的数量
      const processedResult = await database.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM import_tasks_content WHERE task_id = ? AND status != ?',
        [task.task_id, 'pending']
      );

      const processedCount = processedResult?.count || 0;

    } catch (error) {
      logger.error('更新任务进度失败:', error);
    }
  }

  /**
   * 更新任务统计信息
   */
  // 注意：新的表结构中不再需要统计更新方法，统计信息通过查询计算得出

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
      ? 'UPDATE import_tasks_content SET status = ?, error_message = NULL WHERE task_id = ? AND status = ?'
      : 'UPDATE import_tasks_content SET status = ?, error_message = NULL WHERE status = ?';

    const params = taskId ? ['pending', taskId, 'failed'] : ['pending', 'failed'];
    const result = await database.run(sql, params);

    logger.info(`重置${result.changes}个失败任务`);
    return result.changes || 0;
  }
}

// 单例模式
export const importTaskQueue = new ImportTaskQueue();
