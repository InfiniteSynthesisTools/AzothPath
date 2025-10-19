import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
  message?: string; // 限制消息
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 每5分钟清理一次过期的记录
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  private getClientKey(req: Request): string {
    // 使用用户ID（如果已认证）或IP地址作为限制键
    const userId = (req as any).userId;
    if (userId) {
      return `user:${userId}`;
    }
    return `ip:${req.ip || req.connection.remoteAddress}`;
  }

  middleware(config: RateLimitConfig) {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getClientKey(req);
      const now = Date.now();
      
      let record = this.requests.get(key);
      
      if (!record || now > record.resetTime) {
        // 创建新记录或重置过期记录
        record = {
          count: 0,
          resetTime: now + config.windowMs
        };
        this.requests.set(key, record);
      }

      record.count++;

      if (record.count > config.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        return res.status(429).json({
          code: 429,
          message: config.message || `请求过于频繁，请等${retryAfter}秒后再试`,
          retryAfter
        });
      }

      // 设置响应头
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, config.maxRequests - record.count).toString(),
        'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
      });

      next();
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// 创建全局速率限制器实例
const rateLimiter = new RateLimiter();

// 预设的速率限制配置
export const rateLimits = {
  // 一般API请求：每分钟60次
  general: rateLimiter.middleware({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 60,
    message: '请求过于频繁，请等1分钟后再试'
  }),

  // 严格限制：每分钟10次（用于敏感操作）
  strict: rateLimiter.middleware({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 10,
    message: '请求过于频繁，请等1分钟后再试'
  }),

  // 批量上传：每分钟5次
  batchUpload: rateLimiter.middleware({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 5,
    message: '批量上传请求过于频繁，请等1分钟后再试'
  }),

  // 配方提交：每10秒1次
  recipeSubmit: rateLimiter.middleware({
    windowMs: 10 * 1000, // 10秒
    maxRequests: 1,
    message: '配方提交过于频繁，请等10秒后再试'
  }),

  // 任务创建：每30秒1次
  taskCreate: rateLimiter.middleware({
    windowMs: 30 * 1000, // 30秒
    maxRequests: 1,
    message: '任务创建过于频繁，请等30秒后再试'
  })
};

export default rateLimiter;
