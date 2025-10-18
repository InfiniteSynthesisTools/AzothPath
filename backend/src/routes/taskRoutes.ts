import { Router, Response } from 'express';
import { taskService } from '../services/taskService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';

const router = Router();

/**
 * GET /api/tasks
 * 获取任务列表（支持分页、筛选、排序）
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, status, sortBy, sortOrder } = req.query;

    const result = await taskService.getTasks({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as 'active' | 'completed' | undefined,
      sortBy: sortBy as 'created_at' | 'prize' | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取任务列表失败'
    });
  }
});

/**
 * GET /api/tasks/stats
 * 获取任务统计
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await taskService.getTaskStats();

    res.json({
      code: 200,
      message: '获取成功',
      data: stats
    });
  } catch (error: any) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取统计失败'
    });
  }
});

/**
 * GET /api/tasks/:id
 * 获取任务详情
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的任务 ID'
      });
    }

    const task = await taskService.getTaskById(taskId);

    if (!task) {
      return res.status(404).json({
        code: 404,
        message: '任务不存在'
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: task
    });
  } catch (error: any) {
    console.error('Get task detail error:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取任务详情失败'
    });
  }
});

/**
 * POST /api/tasks
 * 创建任务（需要管理员权限）
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { itemName, prize } = req.body;

    if (!itemName || !prize) {
      return res.status(400).json({
        code: 400,
        message: '物品名称和奖励不能为空'
      });
    }

    if (typeof prize !== 'number' || prize <= 0) {
      return res.status(400).json({
        code: 400,
        message: '奖励必须是正整数'
      });
    }

    // 检查管理员权限（可选：根据需求决定是否需要）
    // if (req.userAuth !== 9) {
    //   return res.status(403).json({
    //     code: 403,
    //     message: '需要管理员权限'
    //   });
    // }

    const taskId = await taskService.createTask(itemName, prize);

    res.status(201).json({
      code: 201,
      message: '任务创建成功',
      data: { taskId }
    });
  } catch (error: any) {
    console.error('Create task error:', error);
    
    if (error.message === '物品不存在' || error.message === '该物品已有活跃的任务') {
      return res.status(400).json({
        code: 400,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '创建任务失败'
    });
  }
});

/**
 * POST /api/tasks/:id/complete
 * 完成任务（提交配方）
 */
router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const { recipeId } = req.body;

    if (isNaN(taskId) || !recipeId) {
      return res.status(400).json({
        code: 400,
        message: '无效的任务 ID 或配方 ID'
      });
    }

    const result = await taskService.completeTask(taskId, recipeId, req.userId!);

    res.json({
      code: 200,
      message: `🎉 任务完成！获得 ${result.prize} 贡献分`,
      data: result
    });
  } catch (error: any) {
    console.error('Complete task error:', error);

    if (error.message === '任务不存在' || error.message === '任务已完成' || error.message === '配方不符合任务要求') {
      return res.status(400).json({
        code: 400,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '完成任务失败'
    });
  }
});

/**
 * DELETE /api/tasks/:id
 * 删除任务（需要管理员权限）
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

    await taskService.deleteTask(taskId);

    res.json({
      code: 200,
      message: '任务删除成功'
    });
  } catch (error: any) {
    console.error('Delete task error:', error);

    if (error.message === '任务不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '删除任务失败'
    });
  }
});

export default router;
