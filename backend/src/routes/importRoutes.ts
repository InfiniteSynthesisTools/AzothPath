import { Router, Request, Response } from 'express';
import { importService } from '../services/importService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';
import { rateLimits } from '../middlewares/rateLimiter';
import { validationLimiter } from '../utils/validationLimiter';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';
import { database } from '../database/connection';

const router = Router();

/**
 * POST /api/import-tasks/batch
 * 批量导入配方
 */
router.post('/batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        code: 400,
        message: '请输入配方内容'
      });
    }

    // 解析配方文本
    const recipes = importService.parseRecipeText(text);

    if (recipes.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '未找到有效的配方格式，请确保每行格式为：A+B=C'
      });
    }

    // 检查批量大小限制（仅警告，不阻止上传）
    if (recipes.length > 100) {
      logger.warn(`用户 ${req.userId} 上传了 ${recipes.length} 个配方，数量较多，可能需要较长时间处理`);
    }

    // 创建导入任务（快速返回）
    const taskId = await importService.createImportTask(req.userId!, recipes);

    // 异步开始处理（不等待结果）
    importService.processImportTask(taskId).catch(error => {
      logger.error(`异步处理批量导入失败 (${taskId}):`, error);
    });

    const message = recipes.length > 100 
      ? `批量导入已开始（${recipes.length}个配方），由于数量较多，处理时间可能较长，请查看通知面板了解进度`
      : '批量导入已开始，请查看通知面板了解进度';

    res.status(201).json({
      code: 201,
      message,
      data: {
        taskId,
        totalCount: recipes.length
      }
    });
  } catch (error: any) {
    logger.error('批量导入失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '批量导入失败'
    });
  }
});

/**
 * GET /api/import-tasks
 * 获取用户的导入任务列表
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const showDeleted = req.query.showDeleted === 'true';

    // 检查是否为管理员
    const isAdmin = req.userRole === 'admin';
    
    let result;
    if (isAdmin) {
      // 管理员可以查看所有任务（包括单个配方上传）
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      result = await importService.getAllImportTasksWithSingle({
        page,
        limit,
        status,
        userId
      });
    } else {
      // 普通用户只能查看自己的任务
      result = await importService.getUserImportTasks(req.userId!, {
        page,
        limit,
        status,
        showDeleted
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('获取导入任务失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取导入任务失败'
    });
  }
});

/**
 * GET /api/import-tasks/:id
 * 获取导入任务详情
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = await importService.getImportTask(taskId);

    if (!task) {
      return res.status(404).json({
        code: 404,
        message: '导入任务不存在'
      });
    }

    // 检查权限（只能查看自己的任务）
    if (task.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '没有权限查看此任务'
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: task
    });
  } catch (error: any) {
    logger.error('获取导入任务详情失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取导入任务失败'
    });
  }
});

/**
 * GET /api/import-tasks/:id/contents
 * 获取导入任务明细
 */
router.get('/:id/contents', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;

    // 先检查任务是否存在且属于当前用户
    const task = await importService.getImportTask(taskId);
    if (!task || task.user_id !== req.userId) {
      return res.status(404).json({
        code: 404,
        message: '导入任务不存在'
      });
    }

    const result = await importService.getImportTaskContents(taskId, {
      page,
      limit,
      status
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('获取导入任务内容失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取任务明细失败'
    });
  }
});

/**
 * GET /api/import-tasks/validation-status
 * 获取验证队列状态
 */
router.get('/validation-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const status = validationLimiter.getQueueStatus();
    
    res.json({
      code: 200,
      message: '获取成功',
      data: status
    });
  } catch (error: any) {
    logger.error('获取验证队列状态失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取验证队列状态失败'
    });
  }
});

/**
 * DELETE /api/import-tasks/:id/notification
 * 删除导入任务通知
 */
router.delete('/:id/notification', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    
    await importService.deleteNotification(taskId, req.userId!);

    res.json({
      code: 200,
      message: '通知删除成功'
    });
  } catch (error: any) {
    logger.error('删除导入任务通知失败', error);
    res.status(400).json({
      code: 400,
      message: error.message || '删除通知失败'
    });
  }
});

/**
 * GET /api/import-tasks/unread-completed
 * 获取用户未读的已完成任务（用于通知）
 */
router.get('/unread-completed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await importService.getUnreadCompletedTasks(req.userId!);

    res.json({
      code: 200,
      message: '获取成功',
      data: tasks
    });
  } catch (error: any) {
    logger.error('获取未读已完成任务失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取未读任务失败'
    });
  }
});

/**
 * DELETE /api/import-tasks/:id
 * 删除导入任务（管理员权限）
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的任务 ID'
      });
    }

    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    // 删除任务及其相关内容
    await database.run('DELETE FROM import_tasks_content WHERE task_id = ?', [taskId]);
    await database.run('DELETE FROM import_tasks WHERE id = ?', [taskId]);

    res.json({
      code: 200,
      message: '任务删除成功'
    });
  } catch (error: any) {
    logger.error('删除导入任务失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '删除任务失败'
    });
  }
});

/**
 * POST /api/import-tasks/:id/retry
 * 重试导入任务（管理员权限）
 */
router.post('/:id/retry', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的任务 ID'
      });
    }

    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    // 检查任务是否存在
    const task = await importService.getImportTask(taskId);
    if (!task) {
      return res.status(404).json({
        code: 404,
        message: '任务不存在'
      });
    }

    // 重置任务状态
    await database.run(
      'UPDATE import_tasks SET status = ?, success_count = 0, failed_count = 0, duplicate_count = 0, error_details = NULL, updated_at = ? WHERE id = ?',
      ['processing', getCurrentUTC8TimeForDB(), taskId]
    );

    // 重置所有失败的任务内容为待处理
    await database.run(
      'UPDATE import_tasks_content SET status = ?, retry_count = 0, error_message = NULL, updated_at = ? WHERE task_id = ? AND status = ?',
      ['pending', getCurrentUTC8TimeForDB(), taskId, 'failed']
    );

    // 异步重新开始处理
    importService.processImportTask(taskId).catch(error => {
      logger.error(`重试任务失败 (${taskId}):`, error);
    });

    res.json({
      code: 200,
      message: '任务重试已开始'
    });
  } catch (error: any) {
    logger.error('重试导入任务失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '重试任务失败'
    });
  }
});

/**
 * POST /api/import-tasks/:id/fix-status
 * 修复任务状态（管理员权限）
 */
router.post('/:id/fix-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的任务 ID'
      });
    }

    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    // 检查任务是否存在
    const task = await importService.getImportTask(taskId);
    if (!task) {
      return res.status(404).json({
        code: 404,
        message: '任务不存在'
      });
    }

    // 重新计算任务状态
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

    if (!stats) {
      return res.status(404).json({
        code: 404,
        message: '无法获取任务统计信息'
      });
    }

    const pending = stats.total - stats.success - stats.failed - stats.duplicate;
    const taskStatus = pending > 0 ? 'processing' : 'completed';

    // 更新任务状态
    await database.run(
      `UPDATE import_tasks 
       SET success_count = ?, failed_count = ?, duplicate_count = ?, 
           status = ?, updated_at = ? 
       WHERE id = ?`,
      [stats.success, stats.failed, stats.duplicate, taskStatus, getCurrentUTC8TimeForDB(), taskId]
    );

    logger.info(`任务${taskId}状态已修复: ${stats.success}成功, ${stats.failed}失败, ${stats.duplicate}重复, ${pending}待处理, 状态: ${taskStatus}`);

    res.json({
      code: 200,
      message: '任务状态已修复',
      data: {
        taskId,
        status: taskStatus,
        stats: {
          total: stats.total,
          success: stats.success,
          failed: stats.failed,
          duplicate: stats.duplicate,
          pending
        }
      }
    });
  } catch (error: any) {
    logger.error('修复任务状态失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '修复任务状态失败'
    });
  }
});

export default router;
