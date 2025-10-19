import { Router, Request, Response } from 'express';
import { importService } from '../services/importService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';
import { rateLimits } from '../middlewares/rateLimiter';
import { validationLimiter } from '../utils/validationLimiter';

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

    const result = await importService.getUserImportTasks(req.userId!, {
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

export default router;
