"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = exports.TaskService = void 0;
var connection_1 = require("../database/connection");
var logger_1 = require("../utils/logger");
var timezone_1 = require("../utils/timezone");
var TaskService = /** @class */ (function () {
    function TaskService() {
    }
    /**
     * 获取任务列表（分页、筛选、排序）
     */
    TaskService.prototype.getTasks = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            var _a, page, _b, limit, status, _c, sortBy, _d, sortOrder, offset, conditions, values, whereClause, orderClause, countResult, tasks;
            if (params === void 0) { params = {}; }
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _a = params.page, page = _a === void 0 ? 1 : _a, _b = params.limit, limit = _b === void 0 ? 20 : _b, status = params.status, _c = params.sortBy, sortBy = _c === void 0 ? 'created_at' : _c, _d = params.sortOrder, sortOrder = _d === void 0 ? 'desc' : _d;
                        offset = (page - 1) * limit;
                        conditions = [];
                        values = [];
                        if (status) {
                            conditions.push('status = ?');
                            values.push(status);
                        }
                        whereClause = conditions.length > 0 ? "WHERE ".concat(conditions.join(' AND ')) : '';
                        orderClause = "ORDER BY ".concat(sortBy, " ").concat(sortOrder.toUpperCase());
                        return [4 /*yield*/, connection_1.database.get("SELECT COUNT(*) as total FROM task ".concat(whereClause), values)];
                    case 1:
                        countResult = _e.sent();
                        return [4 /*yield*/, connection_1.database.all("SELECT * FROM task ".concat(whereClause, " ").concat(orderClause, " LIMIT ? OFFSET ?"), __spreadArray(__spreadArray([], values, true), [limit, offset], false))];
                    case 2:
                        tasks = _e.sent();
                        return [2 /*return*/, {
                                tasks: tasks,
                                total: (countResult === null || countResult === void 0 ? void 0 : countResult.total) || 0,
                                page: page,
                                limit: limit
                            }];
                }
            });
        });
    };
    /**
     * 获取任务详情
     */
    TaskService.prototype.getTaskById = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var task, recipe;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get("SELECT t.*, u.name as creator_name\n       FROM task t\n       LEFT JOIN user u ON t.created_by_user_id = u.id\n       WHERE t.id = ?", [taskId])];
                    case 1:
                        task = _a.sent();
                        if (!task)
                            return [2 /*return*/, null];
                        if (!task.completed_by_recipe_id) return [3 /*break*/, 3];
                        return [4 /*yield*/, connection_1.database.get("SELECT r.id, r.item_a, r.item_b, r.result, u.name as creator_name\n         FROM recipes r\n         LEFT JOIN user u ON r.user_id = u.id\n         WHERE r.id = ?", [task.completed_by_recipe_id])];
                    case 2:
                        recipe = _a.sent();
                        return [2 /*return*/, __assign(__assign({}, task), { recipe: recipe })];
                    case 3: return [2 /*return*/, task];
                }
            });
        });
    };
    /**
     * 创建任务（手动）
     */
    TaskService.prototype.createTask = function (itemName, prize, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var baseMaterials, existingTask, existingRecipe, taskType, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        baseMaterials = ['金', '木', '水', '火', '土'];
                        if (baseMaterials.includes(itemName)) {
                            throw new Error('基础材料无需创建任务');
                        }
                        return [4 /*yield*/, connection_1.database.get('SELECT * FROM task WHERE item_name = ? AND status = ?', [itemName, 'active'])];
                    case 1:
                        existingTask = _a.sent();
                        if (existingTask) {
                            throw new Error('该物品已有活跃的任务');
                        }
                        return [4 /*yield*/, connection_1.database.get('SELECT * FROM recipes WHERE result = ?', [itemName])];
                    case 2:
                        existingRecipe = _a.sent();
                        taskType = existingRecipe ? 'find_more_recipes' : 'find_recipe';
                        return [4 /*yield*/, connection_1.database.run('INSERT INTO task (item_name, prize, status, task_type, created_by_user_id) VALUES (?, ?, ?, ?, ?)', [itemName, prize, 'active', taskType, userId])];
                    case 3:
                        result = _a.sent();
                        logger_1.logger.info("\u4EFB\u52A1\u521B\u5EFA\u6210\u529F: ".concat(itemName, ", \u5956\u52B1: ").concat(prize, "\u5206"));
                        return [2 /*return*/, result.lastID];
                }
            });
        });
    };
    /**
     * 自动创建任务（当配方添加后，检查是否需要为材料创建任务）
     */
    TaskService.prototype.autoCreateTasksForRecipe = function (recipeId) {
        return __awaiter(this, void 0, void 0, function () {
            var recipe, baseMaterials, materialsToCheck, _i, materialsToCheck_1, material, existingRecipe, existingTask;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT item_a, item_b, result FROM recipes WHERE id = ?', [recipeId])];
                    case 1:
                        recipe = _a.sent();
                        if (!recipe)
                            return [2 /*return*/];
                        baseMaterials = ['金', '木', '水', '火', '土'];
                        materialsToCheck = [recipe.item_a, recipe.item_b];
                        _i = 0, materialsToCheck_1 = materialsToCheck;
                        _a.label = 2;
                    case 2:
                        if (!(_i < materialsToCheck_1.length)) return [3 /*break*/, 7];
                        material = materialsToCheck_1[_i];
                        // 跳过基础材料
                        if (baseMaterials.includes(material))
                            return [3 /*break*/, 6];
                        return [4 /*yield*/, connection_1.database.get('SELECT id FROM recipes WHERE result = ?', [material])];
                    case 3:
                        existingRecipe = _a.sent();
                        if (existingRecipe) {
                            // 材料已有配方，跳过
                            return [3 /*break*/, 6];
                        }
                        return [4 /*yield*/, connection_1.database.get('SELECT id FROM task WHERE item_name = ? AND status = ?', [material, 'active'])];
                    case 4:
                        existingTask = _a.sent();
                        if (existingTask) {
                            // 已有活跃任务，跳过
                            return [3 /*break*/, 6];
                        }
                        // 自动创建任务（奖励根据深度计算，这里简化为固定值）
                        return [4 /*yield*/, connection_1.database.run('INSERT INTO task (item_name, prize, status) VALUES (?, ?, ?)', [material, 10, 'active'])];
                    case 5:
                        // 自动创建任务（奖励根据深度计算，这里简化为固定值）
                        _a.sent();
                        logger_1.logger.info("\u81EA\u52A8\u521B\u5EFA\u4EFB\u52A1: ".concat(material));
                        _a.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 完成任务
     */
    TaskService.prototype.completeTask = function (taskId, recipeId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var task, recipe, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 6, , 7]);
                        logger_1.logger.info("\u5F00\u59CB\u5B8C\u6210\u4EFB\u52A1".concat(taskId, "\uFF0C\u914D\u65B9").concat(recipeId, "\uFF0C\u7528\u6237").concat(userId));
                        return [4 /*yield*/, this.getTaskById(taskId)];
                    case 1:
                        task = _b.sent();
                        if (!task) {
                            throw new Error('任务不存在');
                        }
                        if (task.status === 'completed') {
                            throw new Error('任务已完成');
                        }
                        return [4 /*yield*/, connection_1.database.get('SELECT * FROM recipes WHERE id = ? AND result = ?', [recipeId, task.item_name])];
                    case 2:
                        recipe = _b.sent();
                        if (!recipe) {
                            throw new Error('配方不符合任务要求');
                        }
                        logger_1.logger.info("\u9A8C\u8BC1\u901A\u8FC7: \u914D\u65B9".concat(recipeId, "\u7684\u7ED3\u679C\u7269\u54C1").concat(recipe.result, "\u5339\u914D\u4EFB\u52A1").concat(taskId, "\u7684\u7269\u54C1").concat(task.item_name));
                        // 更新任务状态
                        return [4 /*yield*/, connection_1.database.run("UPDATE task \n         SET status = ?, completed_by_recipe_id = ?, completed_at = ?\n         WHERE id = ?", ['completed', recipeId, (0, timezone_1.getCurrentUTC8TimeForDB)(), taskId])];
                    case 3:
                        // 更新任务状态
                        _b.sent();
                        // 发放奖励（增加用户贡献分）
                        return [4 /*yield*/, connection_1.database.run('UPDATE user SET contribute = contribute + ? WHERE id = ?', [task.prize, userId])];
                    case 4:
                        // 发放奖励（增加用户贡献分）
                        _b.sent();
                        logger_1.logger.success("\u4EFB\u52A1\u5B8C\u6210: \u7528\u6237".concat(userId, "\u5B8C\u6210\u4EFB\u52A1").concat(taskId, ", \u83B7\u5F97").concat(task.prize, "\u5206\u5956\u52B1"));
                        _a = {
                            taskId: taskId,
                            prize: task.prize
                        };
                        return [4 /*yield*/, this.getUserContribution(userId)];
                    case 5: return [2 /*return*/, (_a.newContribution = _b.sent(),
                            _a)];
                    case 6:
                        error_1 = _b.sent();
                        logger_1.logger.error("\u5B8C\u6210\u4EFB\u52A1".concat(taskId, "\u5931\u8D25:"), error_1);
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 获取用户当前贡献分
     */
    TaskService.prototype.getUserContribution = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT contribute FROM user WHERE id = ?', [userId])];
                    case 1:
                        user = _a.sent();
                        return [2 /*return*/, (user === null || user === void 0 ? void 0 : user.contribute) || 0];
                }
            });
        });
    };
    /**
     * 检查配方是否完成了某个任务
     */
    TaskService.prototype.checkAndCompleteTaskForRecipe = function (recipeId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var recipe, task, result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        logger_1.logger.info("\u68C0\u67E5\u914D\u65B9".concat(recipeId, "\u662F\u5426\u5B8C\u6210\u76F8\u5173\u4EFB\u52A1\uFF0C\u7528\u6237").concat(userId));
                        return [4 /*yield*/, connection_1.database.get('SELECT result FROM recipes WHERE id = ?', [recipeId])];
                    case 1:
                        recipe = _a.sent();
                        if (!recipe) {
                            logger_1.logger.warn("\u914D\u65B9".concat(recipeId, "\u4E0D\u5B58\u5728"));
                            return [2 /*return*/, null];
                        }
                        logger_1.logger.info("\u914D\u65B9".concat(recipeId, "\u7684\u7ED3\u679C\u7269\u54C1: ").concat(recipe.result));
                        return [4 /*yield*/, connection_1.database.get('SELECT * FROM task WHERE item_name = ? AND status = ?', [recipe.result, 'active'])];
                    case 2:
                        task = _a.sent();
                        if (!task) {
                            logger_1.logger.info("\u7269\u54C1".concat(recipe.result, "\u6CA1\u6709\u6D3B\u8DC3\u4EFB\u52A1"));
                            return [2 /*return*/, null];
                        }
                        logger_1.logger.info("\u627E\u5230\u6D3B\u8DC3\u4EFB\u52A1".concat(task.id, "\uFF0C\u7269\u54C1: ").concat(task.item_name));
                        return [4 /*yield*/, this.completeTask(task.id, recipeId, userId)];
                    case 3:
                        result = _a.sent();
                        logger_1.logger.success("\u81EA\u52A8\u5B8C\u6210\u4EFB\u52A1".concat(task.id, "\uFF0C\u7528\u6237").concat(userId, "\u83B7\u5F97").concat(result.prize, "\u5206\u5956\u52B1"));
                        return [2 /*return*/, result];
                    case 4:
                        error_2 = _a.sent();
                        logger_1.logger.error('自动完成任务检测失败:', error_2);
                        return [2 /*return*/, null];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 获取任务统计
     */
    TaskService.prototype.getTaskStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get("SELECT \n         COUNT(*) as total,\n         COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as active,\n         COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,\n         COALESCE(SUM(CASE WHEN status = 'active' THEN prize ELSE 0 END), 0) as total_prize\n       FROM task")];
                    case 1:
                        stats = _a.sent();
                        return [2 /*return*/, stats || { total: 0, active: 0, completed: 0, total_prize: 0 }];
                }
            });
        });
    };
    /**
     * 删除任务（仅管理员）
     */
    TaskService.prototype.deleteTask = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.run('DELETE FROM task WHERE id = ?', [taskId])];
                    case 1:
                        result = _a.sent();
                        if (result.changes === 0) {
                            throw new Error('任务不存在');
                        }
                        return [2 /*return*/, true];
                }
            });
        });
    };
    return TaskService;
}());
exports.TaskService = TaskService;
exports.taskService = new TaskService();
