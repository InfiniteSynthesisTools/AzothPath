import { Router, Request, Response } from 'express';
import { userService } from '../services/userService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/users/register
 * 用户注册
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名和密码不能为空'
      });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        code: 400,
        message: '用户名长度必须在 3-20 个字符之间'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        code: 400,
        message: '密码长度至少为 6 个字符'
      });
    }

    const result = await userService.register(username, password);

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: result
    });
  } catch (error: any) {
    logger.error('用户注册失败', error);
    res.status(400).json({
      code: 400,
      message: '注册失败'
    });
  }
});

/**
 * POST /api/users/login
 * 用户登录
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名和密码不能为空'
      });
    }

    const result = await userService.login(username, password);

    res.json({
      code: 200,
      message: '登录成功',
      data: result
    });
  } catch (error: any) {
    logger.error('用户登录失败', error);
    res.status(401).json({
      code: 401,
      message: '用户名或密码错误'
    });
  }
});

/**
 * GET /api/users/me
 * 获取当前用户信息（需要认证）
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await userService.getCurrentUser(req.userId!);

    res.json({
      code: 200,
      message: '获取成功',
      data: user
    });
  } catch (error: any) {
    logger.error('获取用户信息失败', error);
    res.status(404).json({
      code: 404,
      message: error.message || '用户不存在'
    });
  }
});

/**
 * GET /api/users/contribution-rank
 * 获取贡献榜（实时计算）
 */
router.get('/contribution-rank', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await userService.getContributionRank(page, limit);

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('获取贡献排行榜失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取贡献榜失败'
    });
  }
});

/**
 * GET /api/users/:id/stats
 * 获取用户详细贡献统计
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的用户 ID'
      });
    }

    const result = await userService.getUserContributionStats(userId);

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('获取用户统计失败', error);
    
    if (error.message === '用户不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '获取用户统计失败'
    });
  }
});

/**
 * GET /api/users/:id
 * 获取特定用户信息（公开信息）
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的用户 ID'
      });
    }

    const user = await userService.getUserById(userId);

    res.json({
      code: 200,
      message: '获取成功',
      data: user
    });
  } catch (error: any) {
    logger.error('获取用户信息失败', error);
    
    if (error.message === '用户不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '获取用户信息失败'
    });
  }
});

/**
 * GET /api/users/:id/liked-recipes
 * 获取用户点赞的配方列表
 */
router.get('/:id/liked-recipes', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(userId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的用户 ID'
      });
    }

    const result = await userService.getUserLikedRecipes(userId, page, limit);

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('获取用户喜欢的配方失败', error);
    
    if (error.message === '用户不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '获取点赞配方失败'
    });
  }
});

// ==================== 管理员功能 ====================

/**
 * GET /api/users/admin/list
 * 获取所有用户列表（管理员功能）
 */
router.get('/admin/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    const currentUser = await userService.getCurrentUser(req.userId!);
    if (currentUser.auth !== 9) {
      return res.status(403).json({
        code: 403,
        message: '权限不足，需要管理员权限'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const roleFilter = req.query.role as string;

    const result = await userService.getAllUsers(page, limit, search, roleFilter);

    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error: any) {
    logger.error('获取用户列表失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取用户列表失败'
    });
  }
});

/**
 * PUT /api/users/admin/:id/role
 * 更新用户权限（管理员功能）
 */
router.put('/admin/:id/role', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    const currentUser = await userService.getCurrentUser(req.userId!);
    if (currentUser.auth !== 9) {
      return res.status(403).json({
        code: 403,
        message: '权限不足，需要管理员权限'
      });
    }

    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的用户 ID'
      });
    }

    if (!role || (role !== 1 && role !== 9)) {
      return res.status(400).json({
        code: 400,
        message: '无效的角色值，必须是 1（普通用户）或 9（管理员）'
      });
    }

    // 不能修改自己的权限
    if (userId === req.userId) {
      return res.status(400).json({
        code: 400,
        message: '不能修改自己的权限'
      });
    }

    await userService.updateUserRole(userId, role);

    res.json({
      code: 200,
      message: '权限更新成功',
      data: { userId, newRole: role }
    });
  } catch (error: any) {
    logger.error('更新用户权限失败', error);
    
    if (error.message === '用户不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    res.status(400).json({
      code: 400,
      message: error.message || '更新用户权限失败'
    });
  }
});

/**
 * PUT /api/users/admin/:id
 * 更新用户信息（管理员功能）
 */
router.put('/admin/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    const currentUser = await userService.getCurrentUser(req.userId!);
    if (currentUser.auth !== 9) {
      return res.status(403).json({
        code: 403,
        message: '权限不足，需要管理员权限'
      });
    }

    const userId = parseInt(req.params.id);
    const { name, contribute, level, auth, created_at } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的用户 ID'
      });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (contribute !== undefined) updates.contribute = contribute;
    if (level !== undefined) updates.level = level;
    if (auth !== undefined) updates.auth = auth;
    if (created_at !== undefined) updates.created_at = created_at;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有提供要更新的字段'
      });
    }

    await userService.updateUserInfo(userId, updates);

    res.json({
      code: 200,
      message: '用户信息更新成功',
      data: { userId, updates }
    });
  } catch (error: any) {
    logger.error('更新用户信息失败', error);
    
    if (error.message === '用户不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    if (error.message === '用户名已存在') {
      return res.status(409).json({
        code: 409,
        message: error.message
      });
    }

    res.status(400).json({
      code: 400,
      message: error.message || '更新用户信息失败'
    });
  }
});

/**
 * DELETE /api/users/admin/:id
 * 删除用户（管理员功能）
 */
router.delete('/admin/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    const currentUser = await userService.getCurrentUser(req.userId!);
    if (currentUser.auth !== 9) {
      return res.status(403).json({
        code: 403,
        message: '权限不足，需要管理员权限'
      });
    }

    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的用户 ID'
      });
    }

    // 不能删除自己
    if (userId === req.userId) {
      return res.status(400).json({
        code: 400,
        message: '不能删除自己的账户'
      });
    }

    await userService.deleteUser(userId);

    res.json({
      code: 200,
      message: '用户删除成功',
      data: { userId }
    });
  } catch (error: any) {
    logger.error('删除用户失败', error);
    
    if (error.message === '用户不存在') {
      return res.status(404).json({
        code: 404,
        message: error.message
      });
    }

    res.status(500).json({
      code: 500,
      message: error.message || '删除用户失败'
    });
  }
});

/**
 * GET /api/users/admin/count
 * 获取用户总数（管理员功能）
 */
router.get('/admin/count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查管理员权限
    const currentUser = await userService.getCurrentUser(req.userId!);
    if (currentUser.auth !== 9) {
      return res.status(403).json({
        code: 403,
        message: '权限不足，需要管理员权限'
      });
    }

    const count = await userService.getUserCount();

    res.json({
      code: 200,
      message: '获取成功',
      data: { total_users: count }
    });
  } catch (error: any) {
    logger.error('获取用户总数失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取用户总数失败'
    });
  }
});

export default router;
