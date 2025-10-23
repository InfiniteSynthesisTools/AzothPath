import { Router, Request, Response } from 'express';
import { recipeService } from '../services/recipeService';
import { logger } from '../utils/logger';
import { authMiddleware, AuthRequest } from '../middlewares/auth';
import { userService } from '../services/userService';

const router = Router();

/**
 * GET /api/items/random
 * 获取随机物品（默认为合成元素）
 * 注意：必须放在 /:id 之前，否则 'random' 会被当作 id 处理
 */
router.get('/random', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string || 'synthetic';  // 默认合成元素
    
    const randomItem = await recipeService.getRandomItem(type);

    if (!randomItem) {
      return res.status(404).json({
        code: 404,
        message: '未找到符合条件的物品'
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: randomItem
    });
  } catch (error: any) {
    logger.error('获取随机物品失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取随机物品失败'
    });
  }
});

/**
 * GET /api/items/:id
 * 获取单个物品详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        code: 400,
        message: '无效的物品ID'
      });
    }

    const item = await recipeService.getItemById(id);

    res.json({
      code: 200,
      message: '获取成功',
      data: item
    });
  } catch (error: any) {
    if (error.message === '物品不存在') {
      res.status(404).json({
        code: 404,
        message: '物品不存在'
      });
    } else {
      logger.error('获取物品详情失败', error);
      res.status(500).json({
        code: 500,
        message: error.message || '获取物品详情失败'
      });
    }
  }
});

/**
 * GET /api/items
 * 获取物品列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.length as string) || 20;
    const search = req.query.search as string || '';
    const type = req.query.type as string || '';
    const sortBy = req.query.sortBy as string || 'name';
    const sortOrder = req.query.sortOrder as string || 'asc';
    const exact = (req.query.exact as string) === 'true';  // 精确匹配参数
    let includePrivate = false;

    // 管理员可查看未公开数据（带token且权限为admin时）
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // 只需拿到用户并判断权限
        const decoded: any = require('jsonwebtoken').verify(
          token,
          process.env.JWT_SECRET || 'development_secret_key'
        );
        if (decoded?.userId) {
          const user = await userService.getCurrentUser(decoded.userId);
          if (user && user.auth === 9) {
            const q = (req.query.includePrivate as string) || '1';
            includePrivate = q === '1' || q === 'true';
          }
        }
      }
    } catch (e) {
      // 忽略token错误，按公开内容返回
    }

    const result = await recipeService.getItemsList({
      page,
      limit,
      search,
      type,
      sortBy,
      sortOrder,
      includePrivate,
      exact  // 传递精确匹配参数
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('获取物品列表失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取物品列表失败'
    });
  }
});

export default router;

/**
 * 管理接口：更新物品公开状态
 * PUT /api/items/:id/public
 */
router.put('/:id/public', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    const user = await userService.getCurrentUser(req.userId!);
    if (!user || user.auth < 9) {
      return res.status(403).json({ code: 403, message: '权限不足' });
    }
    const id = parseInt(req.params.id);
    const { is_public } = req.body as { is_public: number };
    if (isNaN(id) || (is_public !== 0 && is_public !== 1)) {
      return res.status(400).json({ code: 400, message: '参数错误' });
    }
    await recipeService.updateItemPublic(id, is_public);
    res.json({ code: 200, message: '更新成功' });
  } catch (error: any) {
    logger.error('更新物品公开状态失败', error);
    res.status(500).json({ code: 500, message: error.message || '更新失败' });
  }
});
