"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimits = void 0;
var RateLimiter = /** @class */ (function () {
    function RateLimiter() {
        var _this = this;
        this.requests = new Map();
        // 每5分钟清理一次过期的记录
        this.cleanupInterval = setInterval(function () {
            _this.cleanup();
        }, 5 * 60 * 1000);
    }
    RateLimiter.prototype.cleanup = function () {
        var now = Date.now();
        for (var _i = 0, _a = this.requests.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], record = _b[1];
            if (now > record.resetTime) {
                this.requests.delete(key);
            }
        }
    };
    RateLimiter.prototype.getClientKey = function (req) {
        // 使用用户ID（如果已认证）或IP地址作为限制键
        var userId = req.userId;
        if (userId) {
            return "user:".concat(userId);
        }
        return "ip:".concat(req.ip || req.connection.remoteAddress);
    };
    RateLimiter.prototype.middleware = function (config) {
        var _this = this;
        return function (req, res, next) {
            var key = _this.getClientKey(req);
            var now = Date.now();
            var record = _this.requests.get(key);
            if (!record || now > record.resetTime) {
                // 创建新记录或重置过期记录
                record = {
                    count: 0,
                    resetTime: now + config.windowMs
                };
                _this.requests.set(key, record);
            }
            record.count++;
            if (record.count > config.maxRequests) {
                var retryAfter = Math.ceil((record.resetTime - now) / 1000);
                return res.status(429).json({
                    code: 429,
                    message: config.message || "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7B49".concat(retryAfter, "\u79D2\u540E\u518D\u8BD5"),
                    retryAfter: retryAfter
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
    };
    RateLimiter.prototype.destroy = function () {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    };
    return RateLimiter;
}());
// 创建全局速率限制器实例
var rateLimiter = new RateLimiter();
// 预设的速率限制配置
exports.rateLimits = {
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
exports.default = rateLimiter;
