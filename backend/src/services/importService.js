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
exports.importService = exports.ImportService = void 0;
var connection_1 = require("../database/connection");
var logger_1 = require("../utils/logger");
var timezone_1 = require("../utils/timezone");
var ImportService = /** @class */ (function () {
    function ImportService() {
    }
    /**
     * 解析配方文本
     */
    ImportService.prototype.parseRecipeText = function (text) {
        var _a;
        var lines = text.split('\n').map(function (line) { return line.trim(); }).filter(function (line) { return line; });
        var recipes = [];
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            // 匹配格式：A+B=C
            var match = line.match(/^(.+?)\+(.+?)=(.+)$/);
            if (match) {
                var itemA = match[1], itemB = match[2], result = match[3];
                itemA = itemA.trim();
                itemB = itemB.trim();
                result = result.trim();
                // 确保 item_a < item_b (字典序)
                if (itemA > itemB) {
                    _a = [itemB, itemA], itemA = _a[0], itemB = _a[1];
                }
                recipes.push({
                    item_a: itemA,
                    item_b: itemB,
                    result: result
                });
            }
        }
        return recipes;
    };
    /**
     * 创建导入任务
     */
    ImportService.prototype.createImportTask = function (userId, recipes) {
        return __awaiter(this, void 0, void 0, function () {
            var totalCount, taskResult, taskId, _i, recipes_1, recipe;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        totalCount = recipes.length;
                        return [4 /*yield*/, connection_1.database.run('INSERT INTO import_tasks (user_id, total_count, success_count, failed_count, duplicate_count, status, notification_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [userId, totalCount, 0, 0, 0, 'processing', 0, (0, timezone_1.getCurrentUTC8TimeForDB)(), (0, timezone_1.getCurrentUTC8TimeForDB)()])];
                    case 1:
                        taskResult = _a.sent();
                        taskId = taskResult.lastID;
                        _i = 0, recipes_1 = recipes;
                        _a.label = 2;
                    case 2:
                        if (!(_i < recipes_1.length)) return [3 /*break*/, 5];
                        recipe = recipes_1[_i];
                        return [4 /*yield*/, connection_1.database.run('INSERT INTO import_tasks_content (task_id, item_a, item_b, result, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [taskId, recipe.item_a, recipe.item_b, recipe.result, 'pending', (0, timezone_1.getCurrentUTC8TimeForDB)(), (0, timezone_1.getCurrentUTC8TimeForDB)()])];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, taskId];
                }
            });
        });
    };
    /**
     * 处理导入任务 - 优化版本，使用队列处理大量数据
     */
    ImportService.prototype.processImportTask = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        logger_1.logger.info("\u5F00\u59CB\u5904\u7406\u5BFC\u5165\u4EFB\u52A1".concat(taskId, "\uFF0C\u4F7F\u7528\u961F\u5217\u7CFB\u7EDF"));
                        // 立即将任务状态设置为处理中
                        return [4 /*yield*/, connection_1.database.run('UPDATE import_tasks SET status = ? WHERE id = ?', ['processing', taskId])];
                    case 1:
                        // 立即将任务状态设置为处理中
                        _a.sent();
                        // 对于大量数据，我们依赖队列系统处理，这里只返回初始状态
                        return [2 /*return*/, { successCount: 0, failedCount: 0, duplicateCount: 0 }];
                    case 2:
                        error_1 = _a.sent();
                        // 更新任务状态为失败
                        return [4 /*yield*/, connection_1.database.run('UPDATE import_tasks SET status = ?, error_details = ?, updated_at = ? WHERE id = ?', ['failed', JSON.stringify({ error: error_1.message }), (0, timezone_1.getCurrentUTC8TimeForDB)(), taskId])];
                    case 3:
                        // 更新任务状态为失败
                        _a.sent();
                        logger_1.logger.error('处理导入任务错误', error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 获取导入任务详情
     */
    ImportService.prototype.getImportTask = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT * FROM import_tasks WHERE id = ?', [taskId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result || null];
                }
            });
        });
    };
    /**
     * 获取导入任务明细（按任务ID）
     */
    ImportService.prototype.getImportTaskContents = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, params) {
            var _a, page, _b, limit, status, offset, sql, sqlParams, contents, countSql, countParams, totalResult;
            if (params === void 0) { params = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = params.page, page = _a === void 0 ? 1 : _a, _b = params.limit, limit = _b === void 0 ? 20 : _b, status = params.status;
                        offset = (page - 1) * limit;
                        sql = 'SELECT * FROM import_tasks_content WHERE task_id = ?';
                        sqlParams = [taskId];
                        if (status !== undefined) {
                            sql += ' AND status = ?';
                            sqlParams.push(status);
                        }
                        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
                        sqlParams.push(limit, offset);
                        return [4 /*yield*/, connection_1.database.all(sql, sqlParams)];
                    case 1:
                        contents = _c.sent();
                        countSql = 'SELECT COUNT(*) as count FROM import_tasks_content WHERE task_id = ?';
                        countParams = [taskId];
                        if (status !== undefined) {
                            countSql += ' AND status = ?';
                            countParams.push(status);
                        }
                        return [4 /*yield*/, connection_1.database.get(countSql, countParams)];
                    case 2:
                        totalResult = _c.sent();
                        return [2 /*return*/, {
                                contents: contents,
                                total: (totalResult === null || totalResult === void 0 ? void 0 : totalResult.count) || 0
                            }];
                }
            });
        });
    };
    /**
     * 获取用户的导入任务批次列表
     */
    ImportService.prototype.getUserImportTasks = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, params) {
            var _a, page, _b, limit, status, offset, sql, sqlParams, tasks, countSql, countParams, totalResult;
            if (params === void 0) { params = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = params.page, page = _a === void 0 ? 1 : _a, _b = params.limit, limit = _b === void 0 ? 20 : _b, status = params.status;
                        offset = (page - 1) * limit;
                        sql = 'SELECT * FROM import_tasks WHERE user_id = ? AND notification_deleted = 0';
                        sqlParams = [userId];
                        if (status !== undefined) {
                            sql += ' AND status = ?';
                            sqlParams.push(status);
                        }
                        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
                        sqlParams.push(limit, offset);
                        return [4 /*yield*/, connection_1.database.all(sql, sqlParams)];
                    case 1:
                        tasks = _c.sent();
                        countSql = 'SELECT COUNT(*) as count FROM import_tasks WHERE user_id = ? AND notification_deleted = 0';
                        countParams = [userId];
                        if (status !== undefined) {
                            countSql += ' AND status = ?';
                            countParams.push(status);
                        }
                        return [4 /*yield*/, connection_1.database.get(countSql, countParams)];
                    case 2:
                        totalResult = _c.sent();
                        return [2 /*return*/, {
                                tasks: tasks,
                                total: (totalResult === null || totalResult === void 0 ? void 0 : totalResult.count) || 0
                            }];
                }
            });
        });
    };
    /**
     * 删除导入任务通知
     * @param taskId 任务ID
     * @param userId 用户ID（用于权限验证）
     */
    ImportService.prototype.deleteNotification = function (taskId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var task;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getImportTask(taskId)];
                    case 1:
                        task = _a.sent();
                        if (!task) {
                            throw new Error('导入任务不存在');
                        }
                        if (task.user_id !== userId) {
                            throw new Error('没有权限删除此任务的通知');
                        }
                        // 只有已完成的任务才能删除通知
                        if (task.status !== 'completed') {
                            throw new Error('只有已完成的任务才能删除通知');
                        }
                        // 更新通知删除状态
                        return [4 /*yield*/, connection_1.database.run('UPDATE import_tasks SET notification_deleted = 1, updated_at = ? WHERE id = ?', [(0, timezone_1.getCurrentUTC8TimeForDB)(), taskId])];
                    case 2:
                        // 更新通知删除状态
                        _a.sent();
                        logger_1.logger.info("\u7528\u6237 ".concat(userId, " \u5220\u9664\u4E86\u4EFB\u52A1 ").concat(taskId, " \u7684\u901A\u77E5"));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 获取用户未删除通知的已完成任务
     */
    ImportService.prototype.getUnreadCompletedTasks = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var tasks;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.all('SELECT * FROM import_tasks WHERE user_id = ? AND status = ? AND notification_deleted = 0 ORDER BY created_at DESC', [userId, 'completed'])];
                    case 1:
                        tasks = _a.sent();
                        return [2 /*return*/, tasks];
                }
            });
        });
    };
    return ImportService;
}());
exports.ImportService = ImportService;
exports.importService = new ImportService();
