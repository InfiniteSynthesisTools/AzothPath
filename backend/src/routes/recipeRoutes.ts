import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { recipeService } from '../services/recipeService';
import { importService } from '../services/importService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';
import { userService } from '../services/userService';
import { logger } from '../utils/logger';
import { rateLimits } from '../middlewares/rateLimiter';
import { database } from '../database/connection';

const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_key';

const router = Router();

/**
 * GET /api/recipes
 * 获取配方列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const orderBy = req.query.orderBy as string;
    const result = req.query.result as string;
    const material = req.query.material as string;  // 新增：查询作为材料的配方
    const cursor = req.query.cursor as string; // 新增游标分页支持

    // 尝试从认证信息中获取用户ID
    let userId: number | undefined;
    let includePrivate = false; // 仅管理员可见未公开内容
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
        userId = decoded.userId;
        // 管理员可查看未公开数据（默认开启，可通过 includePrivate=0 显式关闭）
        const user = await userService.getCurrentUser(userId);
        const isAdmin = user && user.auth === 9;
        if (isAdmin) {
          const q = (req.query.includePrivate as string) || '1';
          includePrivate = q === '1' || q === 'true';
        }
      }
    } catch (error) {
      // 如果token验证失败，继续执行但不传递userId
      logger.info('Token验证失败，继续执行（无用户上下文）');
    }

    const includeStats = ((req.query.includeStats as string) || '0');
    const recipes = await recipeService.getRecipes({ page, limit, search, orderBy, userId, result, material, cursor, includePrivate, includeStats: includeStats === '1' || includeStats === 'true' });

    res.json({
      code: 200,
      message: '获取成功',
      data: recipes
    });
  } catch (error: any) {
    logger.error('获取配方列表失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取配方列表失败'
    });
  }
});


/**
 * GET /api/recipes/:identifier
 * 获取配方详情（支持ID和结果物品名搜索）
 */
router.get('/:identifier', async (req: Request, res: Response) => {
  try {
    const idOrName = req.params.identifier;
    
    // 判断是数字ID还是结果物品名
    const id = parseInt(idOrName);
    let recipe;
    
    if (!isNaN(id)) {
      // 数字ID，按ID查找
      recipe = await recipeService.getRecipeById(id);
    } else {
      // 结果物品名，按结果物品名称查找
      recipe = await recipeService.getRecipeByResultName(idOrName);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: recipe
    });
  } catch (error: any) {
    logger.error('获取配方详情失败', error);
    res.status(404).json({
      code: 404,
      message: error.message || '配方不存在'
    });
  }
});

/**
 * POST /api/recipes/submit
 * 提交配方（需要认证）
 */
router.post('/submit', authMiddleware, rateLimits.strict, async (req: AuthRequest, res: Response) => {
  try {
    const { item_a, item_b, result } = req.body;

    // 输入验证
    if (!item_a || !item_b || !result) {
      return res.status(400).json({
        code: 400,
        message: '配方参数不完整'
      });
    }

    // 长度限制验证
    if (item_a.length > 50 || item_b.length > 50 || result.length > 50) {
      return res.status(400).json({
        code: 400,
        message: '物品名称长度不能超过50个字符'
      });
    }

    // 字符白名单验证（只允许中文、英文、数字和常见符号）
    const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]+$/;
    if (!validPattern.test(item_a) || !validPattern.test(item_b) || !validPattern.test(result)) {
      return res.status(400).json({
        code: 400,
        message: '物品名称只能包含中文、英文、数字、空格、连字符和下划线'
      });
    }

    // 创建单个配方导入任务用于跟踪
    const taskId = await importService.createSingleImportTask(req.userId!, item_a, item_b, result);

    const recipeId = await recipeService.submitRecipe(item_a, item_b, result, req.userId!);

    // 更新导入任务状态为成功
    await importService.markSingleTaskAsSuccess(taskId, recipeId);

    // 注意：贡献分增加已经在 recipeService.submitRecipe 中处理了，包括任务自动完成奖励

    res.status(201).json({
      code: 201,
      message: '提交成功',
      data: { id: recipeId }
    });
  } catch (error: any) {
    logger.error('提交配方失败', error);
    res.status(400).json({
      code: 400,
      message: error.message || '提交配方失败'
    });
  }
});

/**
 * PUT /api/recipes/:id/public
 * 更新配方公开状态（需要认证，建议前端限制管理员使用）
 */
router.put('/:id/public', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    const user = await userService.getCurrentUser(req.userId!);
    if (!user || user.auth < 9) {
      return res.status(403).json({ code: 403, message: '权限不足' });
    }
    const recipeId = parseInt(req.params.id);
    const { is_public } = req.body as { is_public: number };
    if (isNaN(recipeId) || (is_public !== 0 && is_public !== 1)) {
      return res.status(400).json({ code: 400, message: '参数错误' });
    }
    await recipeService.updateRecipePublic(recipeId, is_public);
    res.json({ code: 200, message: '更新成功' });
  } catch (error: any) {
    logger.error('更新配方公开状态失败', error);
    res.status(500).json({ code: 500, message: error.message || '更新失败' });
  }
});

/**
 * POST /api/recipes/:id/like
 * 点赞/取消点赞配方（需要认证）
 */
router.post('/:id/like', authMiddleware, rateLimits.general, async (req: AuthRequest, res: Response) => {
  try {
    const recipeId = parseInt(req.params.id);
    const result = await recipeService.toggleLike(recipeId, req.userId!);

    res.json({
      code: 200,
      message: result.liked ? '点赞成功' : '取消点赞成功',
      data: result
    });
  } catch (error: any) {
    logger.error('切换点赞状态失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '操作失败'
    });
  }
});

/**
 * GET /api/recipes/path/:item
 * 搜索合成路径
 */
router.get('/path/:item', async (req: Request, res: Response) => {
  try {
    const item = decodeURIComponent(req.params.item);
    const result = await recipeService.searchPath(item);

    if (!result) {
      return res.status(404).json({
        code: 404,
        message: '未找到合成路径'
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('搜索路径失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '搜索路径失败'
    });
  }
});

/**
 * GET /api/recipes/graph/stats
 * 获取图统计信息
 */
router.get('/graph/stats', async (req: Request, res: Response) => {
  try {
    const stats = await recipeService.getGraphStats();

    res.json({
      code: 200,
      message: '获取成功',
      data: stats
    });
  } catch (error: any) {
    logger.error('获取图表统计失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取统计信息失败'
    });
  }
});


/**
 * GET /api/recipes/reachability/:item
 * 获取元素的可达性统计信息
 */
router.get('/reachability/:item', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const item = decodeURIComponent(req.params.item);
    const stats = await recipeService.getReachabilityStats(item);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      code: 200,
      message: '获取元素可达性统计成功',
      data: stats,
      responseTime
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    logger.error('获取元素可达性统计失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取元素可达性统计失败',
      responseTime
    });
  }
});

/**
 * PUT /api/recipes/:id/creator
 * 修改配方发现者（管理员权限）
 */
router.put('/:id/creator', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const recipeId = parseInt(req.params.id);
    const { creator_id } = req.body;

    if (isNaN(recipeId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的配方 ID'
      });
    }

    if (!creator_id) {
      return res.status(400).json({
        code: 400,
        message: '缺少发现者 ID'
      });
    }

    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    // 检查配方是否存在
    const recipe = await database.get(
      'SELECT * FROM recipes WHERE id = ?',
      [recipeId]
    );

    if (!recipe) {
      return res.status(404).json({
        code: 404,
        message: '配方不存在'
      });
    }

    // 检查用户是否存在
    const user = await database.get(
      'SELECT * FROM user WHERE id = ?',
      [creator_id]
    );

    if (!user) {
      return res.status(400).json({
        code: 400,
        message: '用户不存在'
      });
    }

    // 更新配方的发现者
    await database.run(
      'UPDATE recipes SET user_id = ? WHERE id = ?',
      [creator_id, recipeId]
    );

    logger.info(`管理员 ${req.userId} 修改了配方 ${recipeId} 的发现者为用户 ${creator_id}`);

    res.json({
      code: 200,
      message: '发现者修改成功'
    });
  } catch (error: any) {
    logger.error('修改配方发现者失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '修改失败'
    });
  }
});

export default router;
