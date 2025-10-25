import { Router, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/notifications
 * 获取用户通知列表
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const is_read = req.query.is_read ? parseInt(req.query.is_read as string) : undefined;

    const result = await notificationService.getUserNotifications(req.userId!, {
      page,
      limit,
      is_read
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('获取通知列表失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取通知列表失败'
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * 获取未读通知数量
 */
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const count = await notificationService.getUnreadCount(req.userId!);

    res.json({
      code: 200,
      message: '获取成功',
      data: { count }
    });
  } catch (error: any) {
    logger.error('获取未读通知数量失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取未读通知数量失败'
    });
  }
});

/**
 * GET /api/notifications/:id
 * 获取通知详情
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const notification = await notificationService.getNotificationById(notificationId);

    if (!notification) {
      return res.status(404).json({
        code: 404,
        message: '通知不存在'
      });
    }

    // 检查权限（只能查看自己的通知或全体通知）
    if (notification.target_user_id !== null && notification.target_user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '没有权限查看此通知'
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: notification
    });
  } catch (error: any) {
    logger.error('获取通知详情失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取通知详情失败'
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * 标记通知为已读
 */
router.patch('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    await notificationService.markAsRead(notificationId, req.userId!);

    res.json({
      code: 200,
      message: '标记成功'
    });
  } catch (error: any) {
    logger.error('标记通知为已读失败', error);
    res.status(400).json({
      code: 400,
      message: error.message || '标记失败'
    });
  }
});

/**
 * PATCH /api/notifications/read-all
 * 标记所有通知为已读
 */
router.patch('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await notificationService.markAllAsRead(req.userId!);

    res.json({
      code: 200,
      message: '全部标记成功'
    });
  } catch (error: any) {
    logger.error('标记所有通知为已读失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '标记失败'
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * 删除通知
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    await notificationService.deleteNotification(notificationId, req.userId!);

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error: any) {
    logger.error('删除通知失败', error);
    res.status(400).json({
      code: 400,
      message: error.message || '删除失败'
    });
  }
});

/**
 * POST /api/notifications
 * 创建通知（管理员权限）
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    const { title, content, type, target_user_id } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        code: 400,
        message: '标题和内容不能为空'
      });
    }

    const notificationId = await notificationService.createNotification({
      title,
      content,
      type,
      target_user_id,
      created_by_user_id: req.userId!
    });

    res.status(201).json({
      code: 201,
      message: '通知创建成功',
      data: { id: notificationId }
    });
  } catch (error: any) {
    logger.error('创建通知失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '创建通知失败'
    });
  }
});

/**
 * GET /api/notifications/admin/list
 * 获取所有通知（管理员权限）
 */
router.get('/admin/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const target_user_id = req.query.target_user_id ? parseInt(req.query.target_user_id as string) : undefined;
    const is_read = req.query.is_read ? parseInt(req.query.is_read as string) : undefined;
    const is_active = req.query.is_active ? parseInt(req.query.is_active as string) : 1;

    const result = await notificationService.getNotifications({
      page,
      limit,
      type,
      target_user_id,
      is_read,
      is_active
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('获取通知列表失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取通知列表失败'
    });
  }
});

/**
 * DELETE /api/notifications/admin/:id
 * 管理员删除通知
 */
router.delete('/admin/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    const notificationId = parseInt(req.params.id);
    await notificationService.adminDeleteNotification(notificationId);

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error: any) {
    logger.error('删除通知失败', error);
    res.status(400).json({
      code: 400,
      message: error.message || '删除失败'
    });
  }
});

export default router;
