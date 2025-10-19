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
var jwt = require("jsonwebtoken");
var recipeService_1 = require("../services/recipeService");
var auth_1 = require("../middlewares/auth");
var userService_1 = require("../services/userService");
var logger_1 = require("../utils/logger");
var rateLimiter_1 = require("../middlewares/rateLimiter");
var JWT_SECRET = process.env.JWT_SECRET || 'development_secret_key';
var router = (0, express_1.Router)();
/**
 * GET /api/recipes
 * 获取配方列表
 */
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var page, limit, search, orderBy, result, cursor, userId, authHeader, token, decoded, recipes, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 20;
                search = req.query.search;
                orderBy = req.query.orderBy;
                result = req.query.result;
                cursor = req.query.cursor;
                userId = void 0;
                try {
                    authHeader = req.headers.authorization;
                    if (authHeader && authHeader.startsWith('Bearer ')) {
                        token = authHeader.substring(7);
                        decoded = jwt.verify(token, JWT_SECRET);
                        userId = decoded.userId;
                    }
                }
                catch (error) {
                    // 如果token验证失败，继续执行但不传递userId
                    logger_1.logger.debug('Token验证失败，继续执行（无用户上下文）');
                }
                return [4 /*yield*/, recipeService_1.recipeService.getRecipes({ page: page, limit: limit, search: search, orderBy: orderBy, userId: userId, result: result, cursor: cursor })];
            case 1:
                recipes = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: recipes
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                logger_1.logger.error('获取配方列表失败', error_1);
                res.status(500).json({
                    code: 500,
                    message: error_1.message || '获取配方列表失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/recipes/grouped
 * 获取按结果分组的配方列表
 */
router.get('/grouped', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var page, limit, search, result, userId, authHeader, token, decoded, groupedRecipes, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 20;
                search = req.query.search;
                result = req.query.result;
                userId = void 0;
                try {
                    authHeader = req.headers.authorization;
                    if (authHeader && authHeader.startsWith('Bearer ')) {
                        token = authHeader.substring(7);
                        decoded = jwt.verify(token, JWT_SECRET);
                        userId = decoded.userId;
                    }
                }
                catch (error) {
                    logger_1.logger.debug('Token验证失败，继续执行（无用户上下文）');
                }
                return [4 /*yield*/, recipeService_1.recipeService.getGroupedRecipes({
                        page: page,
                        limit: limit,
                        search: search,
                        result: result,
                        userId: userId
                    })];
            case 1:
                groupedRecipes = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: groupedRecipes
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                logger_1.logger.error('获取分组配方列表失败', error_2);
                res.status(500).json({
                    code: 500,
                    message: error_2.message || '获取分组配方列表失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/recipes/:id
 * 获取配方详情
 */
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, recipe, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = parseInt(req.params.id);
                return [4 /*yield*/, recipeService_1.recipeService.getRecipeById(id)];
            case 1:
                recipe = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: recipe
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                logger_1.logger.error('获取配方详情失败', error_3);
                res.status(404).json({
                    code: 404,
                    message: error_3.message || '配方不存在'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/recipes/submit
 * 提交配方（需要认证）
 */
router.post('/submit', auth_1.authMiddleware, rateLimiter_1.rateLimits.strict, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, item_a, item_b, result, validPattern, recipeId, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, item_a = _a.item_a, item_b = _a.item_b, result = _a.result;
                // 输入验证
                if (!item_a || !item_b || !result) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '配方参数不完整'
                        })];
                }
                // 长度限制验证
                if (item_a.length > 50 || item_b.length > 50 || result.length > 50) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '物品名称长度不能超过50个字符'
                        })];
                }
                validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]+$/;
                if (!validPattern.test(item_a) || !validPattern.test(item_b) || !validPattern.test(result)) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '物品名称只能包含中文、英文、数字、空格、连字符和下划线'
                        })];
                }
                return [4 /*yield*/, recipeService_1.recipeService.submitRecipe(item_a, item_b, result, req.userId)];
            case 1:
                recipeId = _b.sent();
                // 注意：贡献分增加已经在 recipeService.submitRecipe 中处理了，包括任务自动完成奖励
                res.status(201).json({
                    code: 201,
                    message: '提交成功',
                    data: { id: recipeId }
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _b.sent();
                logger_1.logger.error('提交配方失败', error_4);
                res.status(400).json({
                    code: 400,
                    message: error_4.message || '提交配方失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/recipes/:id/like
 * 点赞/取消点赞配方（需要认证）
 */
router.post('/:id/like', auth_1.authMiddleware, rateLimiter_1.rateLimits.general, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var recipeId, result, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                recipeId = parseInt(req.params.id);
                return [4 /*yield*/, recipeService_1.recipeService.toggleLike(recipeId, req.userId)];
            case 1:
                result = _a.sent();
                res.json({
                    code: 200,
                    message: result.liked ? '点赞成功' : '取消点赞成功',
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                logger_1.logger.error('切换点赞状态失败', error_5);
                res.status(500).json({
                    code: 500,
                    message: error_5.message || '操作失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/recipes/path/:item
 * 搜索合成路径
 */
router.get('/path/:item', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var item, result, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                item = decodeURIComponent(req.params.item);
                return [4 /*yield*/, recipeService_1.recipeService.searchPath(item)];
            case 1:
                result = _a.sent();
                if (!result) {
                    return [2 /*return*/, res.status(404).json({
                            code: 404,
                            message: '未找到合成路径'
                        })];
                }
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                logger_1.logger.error('搜索路径失败', error_6);
                res.status(500).json({
                    code: 500,
                    message: error_6.message || '搜索路径失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/recipes/graph/stats
 * 获取图统计信息
 */
router.get('/graph/stats', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, recipeService_1.recipeService.getGraphStats()];
            case 1:
                stats = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: stats
                });
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                logger_1.logger.error('获取图表统计失败', error_7);
                res.status(500).json({
                    code: 500,
                    message: error_7.message || '获取统计信息失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/recipes/batch
 * 批量获取配方（用于大数据量场景）
 */
router.get('/batch', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var batchSize, lastId, search, userId, authHeader, token, decoded, result, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                batchSize = parseInt(req.query.batchSize) || 1000;
                lastId = parseInt(req.query.lastId) || 0;
                search = req.query.search;
                userId = void 0;
                try {
                    authHeader = req.headers.authorization;
                    if (authHeader && authHeader.startsWith('Bearer ')) {
                        token = authHeader.substring(7);
                        decoded = jwt.verify(token, JWT_SECRET);
                        userId = decoded.userId;
                    }
                }
                catch (error) {
                    logger_1.logger.debug('Token验证失败，继续执行（无用户上下文）');
                }
                return [4 /*yield*/, recipeService_1.recipeService.getRecipesBatch({ batchSize: batchSize, lastId: lastId, search: search, userId: userId })];
            case 1:
                result = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                logger_1.logger.error('批量获取配方失败', error_8);
                res.status(500).json({
                    code: 500,
                    message: error_8.message || '批量获取配方失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/recipes/optimize
 * 创建优化索引（管理员功能）
 */
router.post('/optimize', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, userService_1.userService.getCurrentUser(req.userId)];
            case 1:
                user = _a.sent();
                if (!user || user.auth < 9) {
                    return [2 /*return*/, res.status(403).json({
                            code: 403,
                            message: '权限不足'
                        })];
                }
                return [4 /*yield*/, recipeService_1.recipeService.createOptimizedIndexes()];
            case 2:
                _a.sent();
                res.json({
                    code: 200,
                    message: '索引优化完成'
                });
                return [3 /*break*/, 4];
            case 3:
                error_9 = _a.sent();
                logger_1.logger.error('创建优化索引失败', error_9);
                res.status(500).json({
                    code: 500,
                    message: error_9.message || '创建优化索引失败'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
