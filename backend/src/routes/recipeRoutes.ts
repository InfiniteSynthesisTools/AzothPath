import { Router, Request, Response } from 'express';
import { recipeService } from '../services/recipeService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';
import { userService } from '../services/userService';

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

    const result = await recipeService.getRecipes({ page, limit, search, orderBy });

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

    if (!item_a || !item_b || !result) {
      return res.status(400).json({
        code: 400,
        message: '配方参数不完整'
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
