import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { recipeService } from '../services/recipeService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';
import { userService } from '../services/userService';
import { logger } from '../utils/logger';
import { rateLimits } from '../middlewares/rateLimiter';

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
    const cursor = req.query.cursor as string; // 新增游标分页支持

    // 尝试从认证信息中获取用户ID
    let userId: number | undefined;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
        userId = decoded.userId;
      }
    } catch (error) {
      // 如果token验证失败，继续执行但不传递userId
      logger.debug('Token验证失败，继续执行（无用户上下文）');
    }

    const recipes = await recipeService.getRecipes({ page, limit, search, orderBy, userId, result, cursor });

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
 * GET /api/recipes/grouped
 * 获取按结果分组的配方列表
 */
router.get('/grouped', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const result = req.query.result as string;

    // 尝试从认证信息中获取用户ID
    let userId: number | undefined;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
        userId = decoded.userId;
      }
    } catch (error) {
      logger.debug('Token验证失败，继续执行（无用户上下文）');
    }

    const groupedRecipes = await recipeService.getGroupedRecipes({ 
      page, 
      limit, 
      search, 
      result, 
      userId 
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: groupedRecipes
    });
  } catch (error: any) {
    logger.error('获取分组配方列表失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取分组配方列表失败'
    });
  }
});

/**
 * GET /api/recipes/:id
 * 获取配方详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const recipe = await recipeService.getRecipeById(id);

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

    const recipeId = await recipeService.submitRecipe(item_a, item_b, result, req.userId!);

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
 * GET /api/recipes/batch
 * 批量获取配方（用于大数据量场景）
 */
router.get('/batch', async (req: Request, res: Response) => {
  try {
    const batchSize = parseInt(req.query.batchSize as string) || 1000;
    const lastId = parseInt(req.query.lastId as string) || 0;
    const search = req.query.search as string;

    // 尝试从认证信息中获取用户ID
    let userId: number | undefined;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
        userId = decoded.userId;
      }
    } catch (error) {
      logger.debug('Token验证失败，继续执行（无用户上下文）');
    }

    const result = await recipeService.getRecipesBatch({ batchSize, lastId, search, userId });

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('批量获取配方失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '批量获取配方失败'
    });
  }
});

/**
 * POST /api/recipes/optimize
 * 创建优化索引（管理员功能）
 */
router.post('/optimize', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    const user = await userService.getCurrentUser(req.userId!);
    if (!user || user.auth < 9) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }

    await recipeService.createOptimizedIndexes();

    res.json({
      code: 200,
      message: '索引优化完成'
    });
  } catch (error: any) {
    logger.error('创建优化索引失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '创建优化索引失败'
    });
  }
});


export default router;
