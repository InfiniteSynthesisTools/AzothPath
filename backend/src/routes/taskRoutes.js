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
var taskService_1 = require("../services/taskService");
var auth_1 = require("../middlewares/auth");
var logger_1 = require("../utils/logger");
var rateLimiter_1 = require("../middlewares/rateLimiter");
var router = (0, express_1.Router)();
/**
 * GET /api/tasks
 * 获取任务列表（支持分页、筛选、排序）
 */
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, page, limit, status_1, sortBy, sortOrder, result, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.query, page = _a.page, limit = _a.limit, status_1 = _a.status, sortBy = _a.sortBy, sortOrder = _a.sortOrder;
                return [4 /*yield*/, taskService_1.taskService.getTasks({
                        page: page ? parseInt(page) : undefined,
                        limit: limit ? parseInt(limit) : undefined,
                        status: status_1,
                        sortBy: sortBy,
                        sortOrder: sortOrder
                    })];
            case 1:
                result = _b.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                logger_1.logger.error('获取任务列表失败', error_1);
                res.status(500).json({
                    code: 500,
                    message: error_1.message || '获取任务列表失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/tasks/stats
 * 获取任务统计
 */
router.get('/stats', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, taskService_1.taskService.getTaskStats()];
            case 1:
                stats = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: stats
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                logger_1.logger.error('获取任务统计失败', error_2);
                res.status(500).json({
                    code: 500,
                    message: error_2.message || '获取统计失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/tasks/:id
 * 获取任务详情
 */
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var taskId, task, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                taskId = parseInt(req.params.id);
                if (isNaN(taskId)) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '无效的任务 ID'
                        })];
                }
                return [4 /*yield*/, taskService_1.taskService.getTaskById(taskId)];
            case 1:
                task = _a.sent();
                if (!task) {
                    return [2 /*return*/, res.status(404).json({
                            code: 404,
                            message: '任务不存在'
                        })];
                }
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: task
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                logger_1.logger.error('获取任务详情失败', error_3);
                res.status(500).json({
                    code: 500,
                    message: error_3.message || '获取任务详情失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/tasks
 * 创建任务（普通用户可创建）
 */
router.post('/', auth_1.authMiddleware, rateLimiter_1.rateLimits.taskCreate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, itemName, prize, taskId, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, itemName = _a.itemName, prize = _a.prize;
                if (!itemName || !prize) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '物品名称和奖励不能为空'
                        })];
                }
                if (typeof prize !== 'number' || prize <= 0) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '奖励必须是正整数'
                        })];
                }
                return [4 /*yield*/, taskService_1.taskService.createTask(itemName, prize, req.userId)];
            case 1:
                taskId = _b.sent();
                res.status(201).json({
                    code: 201,
                    message: '任务创建成功',
                    data: { taskId: taskId }
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _b.sent();
                logger_1.logger.error('创建任务失败', error_4);
                if (error_4.message === '物品不存在' || error_4.message === '该物品已有活跃的任务') {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: error_4.message
                        })];
                }
                res.status(500).json({
                    code: 500,
                    message: error_4.message || '创建任务失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/tasks/:id/complete
 * 完成任务（提交配方）
 */
router.post('/:id/complete', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var taskId, recipeId, result, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                taskId = parseInt(req.params.id);
                recipeId = req.body.recipeId;
                if (isNaN(taskId) || !recipeId) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '无效的任务 ID 或配方 ID'
                        })];
                }
                return [4 /*yield*/, taskService_1.taskService.completeTask(taskId, recipeId, req.userId)];
            case 1:
                result = _a.sent();
                res.json({
                    code: 200,
                    message: "\uD83C\uDF89 \u4EFB\u52A1\u5B8C\u6210\uFF01\u83B7\u5F97 ".concat(result.prize, " \u8D21\u732E\u5206"),
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                logger_1.logger.error('完成任务失败', error_5);
                if (error_5.message === '任务不存在' || error_5.message === '任务已完成' || error_5.message === '配方不符合任务要求') {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: error_5.message
                        })];
                }
                res.status(500).json({
                    code: 500,
                    message: error_5.message || '完成任务失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * DELETE /api/tasks/:id
 * 删除任务（需要管理员权限）
 */
router.delete('/:id', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var taskId, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                taskId = parseInt(req.params.id);
                if (isNaN(taskId)) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '无效的任务 ID'
                        })];
                }
                // 检查管理员权限
                if (req.userRole !== 'admin') {
                    return [2 /*return*/, res.status(403).json({
                            code: 403,
                            message: '需要管理员权限'
                        })];
                }
                return [4 /*yield*/, taskService_1.taskService.deleteTask(taskId)];
            case 1:
                _a.sent();
                res.json({
                    code: 200,
                    message: '任务删除成功'
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                logger_1.logger.error('删除任务失败', error_6);
                if (error_6.message === '任务不存在') {
                    return [2 /*return*/, res.status(404).json({
                            code: 404,
                            message: error_6.message
                        })];
                }
                res.status(500).json({
                    code: 500,
                    message: error_6.message || '删除任务失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
