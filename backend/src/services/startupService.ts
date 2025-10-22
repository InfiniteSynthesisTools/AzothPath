import { database } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * 启动时初始化服务
 * 重新计算任务完成情况和玩家贡献值
 */
export class StartupService {
  /**
   * 执行所有启动初始化任务
   */
  async initialize(): Promise<void> {
    logger.info('=== 开始执行启动初始化 ===');
    
    try {
      // 确保数据库已初始化
      await database.init();
      
      // 1. 重新计算任务完成情况
      await this.recalculateTaskCompletion();
      
      // 2. 重新计算玩家贡献值
      await this.recalculateUserContributions();
      
      logger.success('=== 启动初始化完成 ===');
    } catch (error) {
      logger.error('启动初始化失败', error);
      throw error;
    }
  }

  /**
   * 重新计算任务完成情况
   * 检查所有active任务，如果对应的配方已存在则标记为completed
   */
  private async recalculateTaskCompletion(): Promise<void> {
    logger.info('开始重新计算任务完成情况...');
    
    try {
      // 获取所有活跃任务
      const activeTasks = await database.all<{
        id: number;
        item_name: string;
        prize: number;
        created_by_user_id: number;
      }>(
        'SELECT id, item_name, prize, created_by_user_id FROM task WHERE status = ?',
        ['active']
      );

      if (activeTasks.length === 0) {
        logger.info('没有活跃任务需要检查');
        return;
      }

      logger.info(`找到 ${activeTasks.length} 个活跃任务，开始检查...`);

      let completedCount = 0;
      let totalPrizeAwarded = 0;

      for (const task of activeTasks) {
        // 检查是否存在合成此物品的配方
        const recipe = await database.get<{ id: number; user_id: number }>(
          'SELECT id, user_id FROM recipes WHERE result = ? ORDER BY created_at ASC LIMIT 1',
          [task.item_name]
        );

        if (recipe) {
          // 找到配方，完成任务
          await database.transaction(async (tx) => {
            // 更新任务状态
            await tx.run(
              `UPDATE task 
               SET status = ?, 
                   completed_by_recipe_id = ?, 
                   completed_at = datetime('now', 'localtime')
               WHERE id = ?`,
              ['completed', recipe.id, task.id]
            );

            // 发放奖励给配方创建者
            // 下面重算贡献值时会更新用户的总贡献分，这里就不更新用户贡献分字段了
            // await tx.run(
            //   'UPDATE user SET contribute = contribute + ? WHERE id = ?',
            //   [task.prize, recipe.user_id]
            // );

            completedCount++;
            totalPrizeAwarded += task.prize;

            logger.info(`任务完成: "${task.item_name}" -> 配方ID: ${recipe.id}, 奖励: ${task.prize}分`);
          });
        }
      }

      logger.success(
        `任务完成情况重新计算完毕: 完成 ${completedCount} 个任务，发放奖励 ${totalPrizeAwarded} 分`
      );
    } catch (error) {
      logger.error('重新计算任务完成情况失败', error);
      throw error;
    }
  }

  /**
   * 重新计算所有玩家的贡献值
   * 基于配方数量、新物品数量和已完成任务奖励
   * 
   * 性能优化版本：使用批量查询替代逐用户查询
   */
  private async recalculateUserContributions(): Promise<void> {
    logger.info('开始重新计算玩家贡献值...');
    const startTime = Date.now();

    try {
      await database.transaction(async (tx) => {
        // 1. 批量计算每个用户的配方数量 (+1分/配方)
        const recipeStats = await tx.all<{ user_id: number; recipe_count: number }>(
          `SELECT user_id, COUNT(*) as recipe_count
           FROM recipes
           GROUP BY user_id`
        );

        // 2. 批量计算每个用户首次提交的新物品数量 (+2分/物品)
        // 优化策略：先找出每个物品首次出现的配方，再按用户统计
        const itemStats = await tx.all<{ user_id: number; new_item_count: number }>(
          `SELECT user_id, COUNT(DISTINCT item_name) as new_item_count
           FROM (
             -- 找出每个物品首次出现的配方及其创建者
             SELECT 
               r.user_id,
               i.name as item_name
             FROM items i
             INNER JOIN (
               -- 找出每个物品最早的配方
               SELECT 
                 item_name,
                 MIN(created_at) as first_created_at,
                 user_id
               FROM (
                 SELECT item_a as item_name, created_at, user_id FROM recipes
                 UNION ALL
                 SELECT item_b as item_name, created_at, user_id FROM recipes
                 UNION ALL
                 SELECT result as item_name, created_at, user_id FROM recipes
               )
               GROUP BY item_name
             ) first_recipe ON i.name = first_recipe.item_name
             INNER JOIN recipes r ON r.user_id = first_recipe.user_id
               AND (r.item_a = i.name OR r.item_b = i.name OR r.result = i.name)
               AND r.created_at = first_recipe.first_created_at
           )
           GROUP BY user_id`
        );

        // 3. 批量计算每个用户完成的任务奖励
        const taskStats = await tx.all<{ user_id: number; total_prize: number }>(
          `SELECT r.user_id, COALESCE(SUM(t.prize), 0) as total_prize
           FROM task t
           INNER JOIN recipes r ON t.completed_by_recipe_id = r.id
           WHERE t.status = 'completed'
           GROUP BY r.user_id`
        );

        // 将统计结果转换为 Map 以便快速查找
        const recipeMap = new Map(recipeStats.map(s => [s.user_id, s.recipe_count]));
        const itemMap = new Map(itemStats.map(s => [s.user_id, s.new_item_count]));
        const taskMap = new Map(taskStats.map(s => [s.user_id, s.total_prize]));

        // 4. 获取所有用户并批量更新
        const users = await tx.all<{ id: number; name: string }>(
          'SELECT id, name FROM user'
        );

        logger.info(`找到 ${users.length} 个用户，开始批量更新...`);

        // 批量更新所有用户的贡献值
        for (const user of users) {
          const recipePoints = (recipeMap.get(user.id) || 0) * 1;
          const itemPoints = (itemMap.get(user.id) || 0) * 2;
          const taskPoints = taskMap.get(user.id) || 0;
          const totalContribution = recipePoints + itemPoints + taskPoints;

          await tx.run(
            'UPDATE user SET contribute = ? WHERE id = ?',
            [totalContribution, user.id]
          );

          logger.info(
            `用户 "${user.name}" 贡献值: ${totalContribution}分 (配方:${recipePoints} + 物品:${itemPoints} + 任务:${taskPoints})`
          );
        }

        const duration = Date.now() - startTime;
        logger.success(
          `玩家贡献值重新计算完毕: 更新了 ${users.length} 个用户 (耗时: ${duration}ms)`
        );
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`重新计算玩家贡献值失败 (耗时: ${duration}ms)`, error);
      throw error;
    }
  }
}

// 导出单例
export const startupService = new StartupService();
