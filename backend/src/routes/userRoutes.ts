import { Router, Request, Response } from 'express';
import { userService } from '../services/userService';
import { authMiddleware, AuthRequest } from '../middlewares/auth';

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
    console.error('Register error:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '注册失败'
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
    console.error('Login error:', error);
    res.status(401).json({
      code: 401,
      message: error.message || '登录失败'
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
    console.error('Get user error:', error);
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
    console.error('Get contribution rank error:', error);
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
    console.error('Get user stats error:', error);
    
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

export default router;
