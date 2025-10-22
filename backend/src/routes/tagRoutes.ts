import { Router, Response } from 'express';
import { tagService } from '../services/tagService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/tags
 * 获取所有标签
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const tags = await tagService.getAllTags();

    res.json({
      code: 200,
      message: '获取成功',
      data: { tags }
    });
  } catch (error: any) {
    logger.error('获取标签列表失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取标签列表失败'
    });
  }
});

/**
 * GET /api/tags/:id
 * 获取标签详情
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tagId = parseInt(req.params.id);

    if (isNaN(tagId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的标签 ID'
      });
    }

    const tag = await tagService.getTagById(tagId);

    if (!tag) {
      return res.status(404).json({
        code: 404,
        message: '标签不存在'
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: tag
    });
  } catch (error: any) {
    logger.error('获取标签详情失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取标签详情失败'
    });
  }
});

/**
 * POST /api/tags
 * 创建标签（需要管理员权限）
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color } = req.body;

    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    if (!name) {
      return res.status(400).json({
        code: 400,
        message: '标签名称不能为空'
      });
    }

    const tagId = await tagService.createTag(name, description, color);

    res.status(201).json({
      code: 201,
      message: '标签创建成功',
      data: { tagId }
    });
  } catch (error: any) {
    logger.error('创建标签失败', error);

    if (error.message === '标签名已存在') {
      return res.status(400).json({
        code: 400,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '创建标签失败'
    });
  }
});

/**
 * PATCH /api/tags/:id
 * 更新标签（需要管理员权限）
 */
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tagId = parseInt(req.params.id);
    const { name, description, color } = req.body;

    if (isNaN(tagId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的标签 ID'
      });
    }

    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    await tagService.updateTag(tagId, { name, description, color });

    res.json({
      code: 200,
      message: '标签更新成功'
    });
  } catch (error: any) {
    logger.error('更新标签失败', error);

    if (error.message === '标签不存在' || error.message === '标签名已存在') {
      return res.status(400).json({
        code: 400,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '更新标签失败'
    });
  }
});

/**
 * DELETE /api/tags/:id
 * 删除标签（需要管理员权限）
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tagId = parseInt(req.params.id);

    if (isNaN(tagId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的标签 ID'
      });
    }

    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    await tagService.deleteTag(tagId);

    res.json({
      code: 200,
      message: '标签删除成功'
    });
  } catch (error: any) {
    logger.error('删除标签失败', error);

    if (error.message === '标签不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '删除标签失败'
    });
  }
});

/**
 * GET /api/tags/:id/items
 * 获取拥有指定标签的所有物品
 */
router.get('/:id/items', async (req: AuthRequest, res: Response) => {
  try {
    const tagId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(tagId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的标签 ID'
      });
    }

    const result = await tagService.getItemsByTag(tagId, { page, limit });

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('获取标签物品列表失败', error);

    if (error.message === '标签不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '获取标签物品列表失败'
    });
  }
});

/**
 * POST /api/items/:id/tags
 * 为物品添加标签（需要管理员权限）
 */
router.post('/items/:id/tags', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);
    const { tagId } = req.body;

    if (isNaN(itemId) || !tagId) {
      return res.status(400).json({
        code: 400,
        message: '无效的物品 ID 或标签 ID'
      });
    }

    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    await tagService.addTagToItem(itemId, tagId);

    res.json({
      code: 200,
      message: '标签添加成功'
    });
  } catch (error: any) {
    logger.error('添加物品标签失败', error);

    if (error.message === '物品不存在' || error.message === '标签不存在' || error.message === '标签已关联') {
      return res.status(400).json({
        code: 400,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '添加物品标签失败'
    });
  }
});

/**
 * DELETE /api/items/:id/tags/:tagId
 * 从物品移除标签（需要管理员权限）
 */
router.delete('/items/:id/tags/:tagId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);
    const tagId = parseInt(req.params.tagId);

    if (isNaN(itemId) || isNaN(tagId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的物品 ID 或标签 ID'
      });
    }

    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    await tagService.removeTagFromItem(itemId, tagId);

    res.json({
      code: 200,
      message: '标签移除成功'
    });
  } catch (error: any) {
    logger.error('移除物品标签失败', error);

    if (error.message === '标签关联不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '移除物品标签失败'
    });
  }
});

/**
 * PUT /api/items/:id/tags
 * 批量设置物品标签（需要管理员权限）
 */
router.put('/items/:id/tags', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);
    const { tagIds } = req.body;

    if (isNaN(itemId) || !Array.isArray(tagIds)) {
      return res.status(400).json({
        code: 400,
        message: '无效的物品 ID 或标签 ID 列表'
      });
    }

    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    await tagService.setItemTags(itemId, tagIds);

    res.json({
      code: 200,
      message: '物品标签更新成功'
    });
  } catch (error: any) {
    logger.error('更新物品标签失败', error);

    if (error.message === '物品不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '更新物品标签失败'
    });
  }
});

/**
 * GET /api/items/:id/tags
 * 获取物品的所有标签
 */
router.get('/items/:id/tags', async (req: AuthRequest, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);

    if (isNaN(itemId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的物品 ID'
      });
    }

    const tags = await tagService.getItemTags(itemId);

    res.json({
      code: 200,
      message: '获取成功',
      data: { tags }
    });
  } catch (error: any) {
    logger.error('获取物品标签失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取物品标签失败'
    });
  }
});

export default router;
