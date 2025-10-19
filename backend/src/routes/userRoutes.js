"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var userService_1 = require("../services/userService");
var auth_1 = require("../middlewares/auth");
var logger_1 = require("../utils/logger");
var router = (0, express_1.Router)();
/**
 * POST /api/users/register
 * 用户注册
 */
router.post('/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, username, password, result, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, username = _a.username, password = _a.password;
                if (!username || !password) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '用户名和密码不能为空'
                        })];
                }
                if (username.length < 3 || username.length > 20) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '用户名长度必须在 3-20 个字符之间'
                        })];
                }
                if (password.length < 6) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '密码长度至少为 6 个字符'
                        })];
                }
                return [4 /*yield*/, userService_1.userService.register(username, password)];
            case 1:
                result = _b.sent();
                res.status(201).json({
                    code: 201,
                    message: '注册成功',
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                logger_1.logger.error('用户注册失败', error_1);
                res.status(400).json({
                    code: 400,
                    message: '注册失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/users/login
 * 用户登录
 */
router.post('/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, username, password, result, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, username = _a.username, password = _a.password;
                if (!username || !password) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '用户名和密码不能为空'
                        })];
                }
                return [4 /*yield*/, userService_1.userService.login(username, password)];
            case 1:
                result = _b.sent();
                res.json({
                    code: 200,
                    message: '登录成功',
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                logger_1.logger.error('用户登录失败', error_2);
                res.status(401).json({
                    code: 401,
                    message: '用户名或密码错误'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/users/me
 * 获取当前用户信息（需要认证）
 */
router.get('/me', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, userService_1.userService.getCurrentUser(req.userId)];
            case 1:
                user = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: user
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                logger_1.logger.error('获取用户信息失败', error_3);
                res.status(404).json({
                    code: 404,
                    message: error_3.message || '用户不存在'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/users/contribution-rank
 * 获取贡献榜（实时计算）
 */
router.get('/contribution-rank', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var page, limit, result, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 10;
                return [4 /*yield*/, userService_1.userService.getContributionRank(page, limit)];
            case 1:
                result = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                logger_1.logger.error('获取贡献排行榜失败', error_4);
                res.status(500).json({
                    code: 500,
                    message: error_4.message || '获取贡献榜失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/users/:id/stats
 * 获取用户详细贡献统计
 */
router.get('/:id/stats', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, result, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userId = parseInt(req.params.id);
                if (isNaN(userId)) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '无效的用户 ID'
                        })];
                }
                return [4 /*yield*/, userService_1.userService.getUserContributionStats(userId)];
            case 1:
                result = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                logger_1.logger.error('获取用户统计失败', error_5);
                if (error_5.message === '用户不存在') {
                    return [2 /*return*/, res.status(404).json({
                            code: 404,
                            message: error_5.message
                        })];
                }
                res.status(500).json({
                    code: 500,
                    message: error_5.message || '获取用户统计失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/users/:id
 * 获取特定用户信息（公开信息）
 */
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, user, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userId = parseInt(req.params.id);
                if (isNaN(userId)) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '无效的用户 ID'
                        })];
                }
                return [4 /*yield*/, userService_1.userService.getUserById(userId)];
            case 1:
                user = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: user
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                logger_1.logger.error('获取用户信息失败', error_6);
                if (error_6.message === '用户不存在') {
                    return [2 /*return*/, res.status(404).json({
                            code: 404,
                            message: error_6.message
                        })];
                }
                res.status(500).json({
                    code: 500,
                    message: error_6.message || '获取用户信息失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/users/:id/liked-recipes
 * 获取用户点赞的配方列表
 */
router.get('/:id/liked-recipes', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, page, limit, result, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userId = parseInt(req.params.id);
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 20;
                if (isNaN(userId)) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '无效的用户 ID'
                        })];
                }
                return [4 /*yield*/, userService_1.userService.getUserLikedRecipes(userId, page, limit)];
            case 1:
                result = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                logger_1.logger.error('获取用户喜欢的配方失败', error_7);
                if (error_7.message === '用户不存在') {
                    return [2 /*return*/, res.status(404).json({
                            code: 404,
                            message: error_7.message
                        })];
                }
                res.status(500).json({
                    code: 500,
                    message: error_7.message || '获取点赞配方失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
