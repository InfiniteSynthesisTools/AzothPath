"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
exports.generateToken = generateToken;
var jwt = require("jsonwebtoken");
var JWT_SECRET = process.env.JWT_SECRET || 'development_secret_key';
/**
 * 验证 JWT token
 */
function authMiddleware(req, res, next) {
    try {
        // 从请求头获取 token
        var authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                code: 401,
                message: '未提供认证令牌'
            });
        }
        var token = authHeader.substring(7); // 移除 "Bearer " 前缀
        // 验证 token
        var decoded = jwt.verify(token, JWT_SECRET);
        // 将用户信息附加到请求对象
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    }
    catch (error) {
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
function adminMiddleware(req, res, next) {
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
function generateToken(userId, role) {
    var payload = { userId: userId, role: role };
    // @ts-ignore - jsonwebtoken 类型定义问题
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
