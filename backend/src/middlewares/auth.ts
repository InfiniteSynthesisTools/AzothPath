import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// 扩展 Express Request 接口
export interface AuthRequest extends Request {
  userId?: number;
  userRole?: 'admin' | 'user';
}

// JWT 载荷接口
interface JWTPayload {
  userId: number;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

/**
 * 验证 JWT token
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌'
      });
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // 将用户信息附加到请求对象
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '认证令牌已过期'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: '无效的认证令牌'
      });
    }
    return res.status(500).json({
      code: 500,
      message: '认证失败'
    });
  }
}

/**
 * 验证管理员权限
 */
export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      code: 403,
      message: '需要管理员权限'
    });
  }
  next();
}

/**
 * 生成 JWT token
 */
export function generateToken(userId: number, role: 'admin' | 'user'): string {
  const payload = { userId, role };
  // @ts-ignore - jsonwebtoken 类型定义问题
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
