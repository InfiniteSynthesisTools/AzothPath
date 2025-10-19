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
var importService_1 = require("../services/importService");
var auth_1 = require("../middlewares/auth");
var logger_1 = require("../utils/logger");
var validationLimiter_1 = require("../utils/validationLimiter");
var router = (0, express_1.Router)();
/**
 * POST /api/import-tasks/batch
 * 批量导入配方
 */
router.post('/batch', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var text, recipes, taskId_1, message, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                text = req.body.text;
                if (!text || !text.trim()) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '请输入配方内容'
                        })];
                }
                recipes = importService_1.importService.parseRecipeText(text);
                if (recipes.length === 0) {
                    return [2 /*return*/, res.status(400).json({
                            code: 400,
                            message: '未找到有效的配方格式，请确保每行格式为：A+B=C'
                        })];
                }
                // 检查批量大小限制（仅警告，不阻止上传）
                if (recipes.length > 100) {
                    logger_1.logger.warn("\u7528\u6237 ".concat(req.userId, " \u4E0A\u4F20\u4E86 ").concat(recipes.length, " \u4E2A\u914D\u65B9\uFF0C\u6570\u91CF\u8F83\u591A\uFF0C\u53EF\u80FD\u9700\u8981\u8F83\u957F\u65F6\u95F4\u5904\u7406"));
                }
                return [4 /*yield*/, importService_1.importService.createImportTask(req.userId, recipes)];
            case 1:
                taskId_1 = _a.sent();
                // 异步开始处理（不等待结果）
                importService_1.importService.processImportTask(taskId_1).catch(function (error) {
                    logger_1.logger.error("\u5F02\u6B65\u5904\u7406\u6279\u91CF\u5BFC\u5165\u5931\u8D25 (".concat(taskId_1, "):"), error);
                });
                message = recipes.length > 100
                    ? "\u6279\u91CF\u5BFC\u5165\u5DF2\u5F00\u59CB\uFF08".concat(recipes.length, "\u4E2A\u914D\u65B9\uFF09\uFF0C\u7531\u4E8E\u6570\u91CF\u8F83\u591A\uFF0C\u5904\u7406\u65F6\u95F4\u53EF\u80FD\u8F83\u957F\uFF0C\u8BF7\u67E5\u770B\u901A\u77E5\u9762\u677F\u4E86\u89E3\u8FDB\u5EA6")
                    : '批量导入已开始，请查看通知面板了解进度';
                res.status(201).json({
                    code: 201,
                    message: message,
                    data: {
                        taskId: taskId_1,
                        totalCount: recipes.length
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                logger_1.logger.error('批量导入失败', error_1);
                res.status(500).json({
                    code: 500,
                    message: error_1.message || '批量导入失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/import-tasks
 * 获取用户的导入任务列表
 */
router.get('/', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var page, limit, status_1, result, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 20;
                status_1 = req.query.status;
                return [4 /*yield*/, importService_1.importService.getUserImportTasks(req.userId, {
                        page: page,
                        limit: limit,
                        status: status_1
                    })];
            case 1:
                result = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: result
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                logger_1.logger.error('获取导入任务失败', error_2);
                res.status(500).json({
                    code: 500,
                    message: error_2.message || '获取导入任务失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/import-tasks/:id
 * 获取导入任务详情
 */
router.get('/:id', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var taskId, task, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                taskId = parseInt(req.params.id);
                return [4 /*yield*/, importService_1.importService.getImportTask(taskId)];
            case 1:
                task = _a.sent();
                if (!task) {
                    return [2 /*return*/, res.status(404).json({
                            code: 404,
                            message: '导入任务不存在'
                        })];
                }
                // 检查权限（只能查看自己的任务）
                if (task.user_id !== req.userId) {
                    return [2 /*return*/, res.status(403).json({
                            code: 403,
                            message: '没有权限查看此任务'
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
                logger_1.logger.error('获取导入任务详情失败', error_3);
                res.status(500).json({
                    code: 500,
                    message: error_3.message || '获取导入任务失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/import-tasks/:id/contents
 * 获取导入任务明细
 */
router.get('/:id/contents', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var taskId, page, limit, status_2, task, result, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                taskId = parseInt(req.params.id);
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 20;
                status_2 = req.query.status;
                return [4 /*yield*/, importService_1.importService.getImportTask(taskId)];
            case 1:
                task = _a.sent();
                if (!task || task.user_id !== req.userId) {
                    return [2 /*return*/, res.status(404).json({
                            code: 404,
                            message: '导入任务不存在'
                        })];
                }
                return [4 /*yield*/, importService_1.importService.getImportTaskContents(taskId, {
                        page: page,
                        limit: limit,
                        status: status_2
                    })];
            case 2:
                result = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: result
                });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                logger_1.logger.error('获取导入任务内容失败', error_4);
                res.status(500).json({
                    code: 500,
                    message: error_4.message || '获取任务明细失败'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/import-tasks/validation-status
 * 获取验证队列状态
 */
router.get('/validation-status', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status_3;
    return __generator(this, function (_a) {
        try {
            status_3 = validationLimiter_1.validationLimiter.getQueueStatus();
            res.json({
                code: 200,
                message: '获取成功',
                data: status_3
            });
        }
        catch (error) {
            logger_1.logger.error('获取验证队列状态失败', error);
            res.status(500).json({
                code: 500,
                message: error.message || '获取验证队列状态失败'
            });
        }
        return [2 /*return*/];
    });
}); });
/**
 * DELETE /api/import-tasks/:id/notification
 * 删除导入任务通知
 */
router.delete('/:id/notification', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var taskId, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                taskId = parseInt(req.params.id);
                return [4 /*yield*/, importService_1.importService.deleteNotification(taskId, req.userId)];
            case 1:
                _a.sent();
                res.json({
                    code: 200,
                    message: '通知删除成功'
                });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                logger_1.logger.error('删除导入任务通知失败', error_5);
                res.status(400).json({
                    code: 400,
                    message: error_5.message || '删除通知失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/import-tasks/unread-completed
 * 获取用户未读的已完成任务（用于通知）
 */
router.get('/unread-completed', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tasks, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, importService_1.importService.getUnreadCompletedTasks(req.userId)];
            case 1:
                tasks = _a.sent();
                res.json({
                    code: 200,
                    message: '获取成功',
                    data: tasks
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                logger_1.logger.error('获取未读已完成任务失败', error_6);
                res.status(500).json({
                    code: 500,
                    message: error_6.message || '获取未读任务失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
