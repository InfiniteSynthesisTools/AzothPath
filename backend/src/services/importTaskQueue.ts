import { database } from '../database/connection';
import { logger } from '../utils/logger';
import { apiConfig } from '../config/api';
import axios from 'axios';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';
import { validationLimiter } from '../utils/validationLimiter';
import { userService } from './userService';

// 任务队列配置
const MAX_RETRY_COUNT = apiConfig.retryCount;
const QUEUE_INTERVAL = 100; // 5秒检查一次
const CONCURRENT_LIMIT = 10; // 每次处理10个任务，避免触发限流

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
    let consecutiveEmptyRounds = 0;
    const MAX_EMPTY_ROUNDS = 6; // 连续6次无任务后增加间隔
    const LONG_INTERVAL = 30000; // 30秒间隔
    const LOG_INTERVAL = 12; // 每12次无任务才记录一次日志
    const AUTO_RETRY_INTERVAL = 60; // 自动重试检查间隔（秒）
    let lastAutoRetryTime = 0;
    
    while (this.isRunning) {
      try {
        const hasTasks = await this.processPendingTasks();
        
        if (hasTasks) {
          consecutiveEmptyRounds = 0;
          // 有任务时使用正常间隔
          await new Promise(resolve => setTimeout(resolve, QUEUE_INTERVAL));
        } else {
          consecutiveEmptyRounds++;
          
          // 只在特定间隔记录日志，避免日志过多
          if (consecutiveEmptyRounds % LOG_INTERVAL === 0) {
            logger.info(`任务队列空闲中，已连续${consecutiveEmptyRounds}次无任务`);
          }
          
          // 检查是否需要自动重试429限流错误任务
          const currentTime = Date.now();
          if (currentTime - lastAutoRetryTime >= AUTO_RETRY_INTERVAL * 1000) {
            const hasProcessingTasks = await this.hasProcessingTasks();
            if (!hasProcessingTasks) {
              const retryCount = await this.autoRetryRateLimitTasks();
              if (retryCount > 0) {
                logger.success(`自动重试了${retryCount}个429限流错误任务`);
              }
            }
            lastAutoRetryTime = currentTime;
          }
          
          // 连续无任务时增加间隔
          const interval = consecutiveEmptyRounds >= MAX_EMPTY_ROUNDS ? LONG_INTERVAL : QUEUE_INTERVAL;
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        logger.error('任务队列循环错误', error);
        await new Promise(resolve => setTimeout(resolve, QUEUE_INTERVAL));
      }
    }
  }

  /**
   * 处理待处理的任务
   * @returns 是否有任务被处理
   */
  private async processPendingTasks(): Promise<boolean> {
    // 查询待处理的任务（status='pending' 且重试次数<3）
    try {
      const queryStartTime = Date.now();
      
      const pendingTasks = await database.all<ImportTaskContent>(
        `SELECT * FROM import_tasks_content 
         WHERE status = 'pending' AND retry_count < ? 
         ORDER BY created_at ASC 
         LIMIT ?`,
        [MAX_RETRY_COUNT, CONCURRENT_LIMIT]
      );

      const queryDuration = Date.now() - queryStartTime;
      logger.info(`数据库查询耗时: ${queryDuration}ms, 查询到${pendingTasks.length}个待处理任务`);

      if (pendingTasks.length === 0) {
        return false; // 没有待处理任务
      }

      logger.info(`发现${pendingTasks.length}个待处理任务`);

      // 并行处理所有任务，但HTTP请求会通过ValidationLimiter串行化
      const queueStatus = validationLimiter.getQueueStatus();
      logger.debug(`当前验证队列: ${queueStatus.queueLength}个待验证, 处理中: ${queueStatus.isProcessing}`);
      
      const processingStartTime = Date.now();
      
      await Promise.all(
        pendingTasks.map(task => this.processTask(task))
      );
      
      const processingDuration = Date.now() - processingStartTime;
      logger.info(`批次处理完成，耗时: ${processingDuration}ms (平均: ${Math.round(processingDuration / pendingTasks.length)}ms/任务)`);
      
      return true; // 有任务被处理
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
    const taskStartTime = Date.now();
    let checkDuplicateTime = 0;
    let validateTime = 0;
    let dbWriteTime = 0;

    try {
      logger.debug(`处理任务${task.id}: ${task.item_a} + ${task.item_b} = ${task.result}`);

      // 1. 检查是否已存在相同配方（去重）
      const checkStart = Date.now();
      const existingRecipe = await this.checkDuplicateRecipe(task);
      checkDuplicateTime = Date.now() - checkStart;
      
      if (existingRecipe) {
        await this.markAsDuplicate(task, existingRecipe.id);
        logger.debug(`任务${task.id}耗时: 总${Date.now() - taskStartTime}ms (去重检查: ${checkDuplicateTime}ms)`);
        return;
      }

      // 2. 调用外部 API 验证
      const validateStart = Date.now();
      const validationResult = await this.validateRecipe(task);
      validateTime = Date.now() - validateStart;

      if (!validationResult.success) {
        // 验证失败，增加重试次数
        await this.incrementRetry(task, validationResult.error || 'Unknown error');
        logger.debug(`任务${task.id}验证失败，耗时: ${validateTime}ms`);
        return;
      }

      // 3. 验证成功，插入到 recipes 表
      const dbStart = Date.now();
      const recipeId = await this.insertRecipe(task);

      // 4. 更新物品字典（包括保存 emoji）
      await this.updateItemsDictionary([task.item_a, task.item_b, task.result], validationResult.emoji);

      // 5. 标记为成功
      await this.markAsSuccess(task, recipeId);

      // 6. 更新任务统计
      await this.updateTaskStats(task.task_id);
      dbWriteTime = Date.now() - dbStart;

      const totalTime = Date.now() - taskStartTime;
      logger.success(`任务${task.id}处理成功，耗时: 总${totalTime}ms (去重: ${checkDuplicateTime}ms, API验证: ${validateTime}ms, 数据库写入: ${dbWriteTime}ms)`);
    } catch (error: any) {
      logger.error(`处理任务${task.id}失败:`, error);
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
   * 调用外部 API 验证配方（通过全局限速器）
   */
  private async validateRecipe(task: ImportTaskContent): Promise<{ success: boolean; error?: string; emoji?: string }> {
    // 使用全局限速器包装 HTTP 请求
    return validationLimiter.limitValidation(async () => {
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
    });
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

    // 计算并更新用户贡献度
    await this.updateUserContribution(userId, task);

    return result.lastID!;
  }

  /**
   * 更新用户贡献度
   */
  private async updateUserContribution(userId: number, task: ImportTaskContent): Promise<void> {
    try {
      let totalContribution = 0;
      
      // 1. 新配方贡献度：+1分
      totalContribution += 1;
      
      // 2. 检查新物品贡献度：每个新物品+2分
      const items = [task.item_a, task.item_b, task.result];
      for (const item of items) {
        // 检查该物品是否已经存在
        const existingItem = await database.get<{ id: number }>(
          'SELECT id FROM items WHERE name = ?',
          [item]
        );
        
        // 如果物品不存在，说明是新物品
        if (!existingItem) {
          totalContribution += 2;
          logger.debug(`发现新物品 "${item}"，贡献度+2`);
        }
      }
      
      // 3. 更新用户贡献度
      if (totalContribution > 0) {
        await userService.incrementContribution(userId, totalContribution);
        logger.success(`用户 ${userId} 贡献度增加 ${totalContribution} 分 (新配方: +1, 新物品: +${totalContribution - 1})`);
      } else {
        logger.debug(`用户 ${userId} 贡献度无变化 (所有物品已存在)`);
      }
    } catch (error) {
      logger.error(`更新用户 ${userId} 贡献度失败:`, error);
      // 不抛出错误，避免影响配方插入
    }
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
       SET status = ?, recipe_id = ?, updated_at = ? 
       WHERE id = ?`,
      ['success', recipeId, getCurrentUTC8TimeForDB(), task.id]
    );
  }

  /**
   * 标记为重复
   */
  private async markAsDuplicate(task: ImportTaskContent, existingRecipeId: number) {
    await database.run(
      `UPDATE import_tasks_content 
       SET status = ?, recipe_id = ?, error_message = ?, updated_at = ? 
       WHERE id = ?`,
      ['duplicate', existingRecipeId, 'Duplicate recipe', getCurrentUTC8TimeForDB(), task.id]
    );

    // 更新任务统计（duplicate_count）
    await database.run(
      `UPDATE import_tasks 
       SET duplicate_count = duplicate_count + 1, updated_at = ? 
       WHERE id = ?`,
      [getCurrentUTC8TimeForDB(), task.task_id]
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
       SET retry_count = ?, status = ?, error_message = ?, updated_at = ? 
       WHERE id = ?`,
      [newRetryCount, newStatus, errorMessage, getCurrentUTC8TimeForDB(), task.id]
    );

    if (newStatus === 'failed') {
      logger.warn(`任务${task.id}在${MAX_RETRY_COUNT}次重试后失败`);
      await this.updateTaskStats(task.task_id);
    } else {
      logger.info(`任务${task.id}重试 ${newRetryCount}/${MAX_RETRY_COUNT}`);
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
           status = ?, updated_at = ? 
       WHERE id = ?`,
      [stats.success, stats.failed, stats.duplicate, taskStatus, getCurrentUTC8TimeForDB(), taskId]
    );

    logger.info(`任务${taskId}统计更新: ${stats.success}成功, ${stats.failed}失败, ${stats.duplicate}重复, ${pending}待处理`);
  }

  /**
   * 检查是否有正在进行的任务
   */
  private async hasProcessingTasks(): Promise<boolean> {
    const result = await database.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM import_tasks_content 
       WHERE status IN ('pending', 'processing')`
    );
    return (result?.count || 0) > 0;
  }

  /**
   * 自动重试429限流错误的失败任务
   */
  private async autoRetryRateLimitTasks(): Promise<number> {
    try {
      // 查找error_message包含"验证失败，状态码: 429"的failed状态任务
      const rateLimitTasks = await database.all<ImportTaskContent>(
        `SELECT * FROM import_tasks_content 
         WHERE status = 'failed' 
         AND error_message LIKE '%验证失败，状态码: 429%' 
         ORDER BY updated_at ASC 
         LIMIT ?`,
        [CONCURRENT_LIMIT]
      );

      if (rateLimitTasks.length === 0) {
        return 0;
      }

      logger.info(`发现${rateLimitTasks.length}个429限流错误任务，开始自动重试`);

      let retryCount = 0;
      for (const task of rateLimitTasks) {
        try {
          // 重置任务状态为pending，清空错误信息，重置重试次数
          await database.run(
            `UPDATE import_tasks_content 
             SET status = 'pending', retry_count = 0, error_message = NULL, updated_at = ? 
             WHERE id = ?`,
            [getCurrentUTC8TimeForDB(), task.id]
          );
          retryCount++;
          logger.info(`自动重试任务${task.id}: ${task.item_a} + ${task.item_b} = ${task.result}`);
        } catch (error) {
          logger.error(`自动重试任务${task.id}失败:`, error);
        }
      }

      logger.success(`自动重试完成: ${retryCount}/${rateLimitTasks.length}个任务已重置`);
      return retryCount;
    } catch (error) {
      logger.error('自动重试429限流任务失败:', error);
      return 0;
    }
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
