import { Router, Request, Response } from 'express';
import { recipeService } from '../services/recipeService';
import { logger } from '../utils/logger';

const router = Router();

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

    const result = await recipeService.getItemsList({
      page,
      limit,
      search,
      type,
      sortBy,
      sortOrder
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
