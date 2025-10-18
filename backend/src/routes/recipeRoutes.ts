import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { recipeService } from '../services/recipeService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';
import { userService } from '../services/userService';

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
      console.log('Token verification failed, proceeding without user context');
    }

    const result = await recipeService.getRecipes({ page, limit, search, orderBy, userId });

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    console.error('Get recipes error:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取配方列表失败'
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
    console.error('Get recipe error:', error);
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
router.post('/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    // 增加用户贡献度
    await userService.incrementContribution(req.userId!, 1);

    res.status(201).json({
      code: 201,
      message: '提交成功',
      data: { id: recipeId }
    });
  } catch (error: any) {
    console.error('Submit recipe error:', error);
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
router.post('/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const recipeId = parseInt(req.params.id);
    const result = await recipeService.toggleLike(recipeId, req.userId!);

    res.json({
      code: 200,
      message: result.liked ? '点赞成功' : '取消点赞成功',
      data: result
    });
  } catch (error: any) {
    console.error('Toggle like error:', error);
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
    console.error('Search path error:', error);
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
    console.error('Get graph stats error:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取统计信息失败'
    });
  }
});

export default router;
