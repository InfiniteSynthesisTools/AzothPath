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
exports.importTaskQueue = void 0;
var connection_1 = require("../database/connection");
var logger_1 = require("../utils/logger");
var api_1 = require("../config/api");
var axios_1 = require("axios");
var timezone_1 = require("../utils/timezone");
var validationLimiter_1 = require("../utils/validationLimiter");
var userService_1 = require("./userService");
// 任务队列配置
var MAX_RETRY_COUNT = api_1.apiConfig.retryCount;
var QUEUE_INTERVAL = 100; // 5秒检查一次
var CONCURRENT_LIMIT = 10; // 每次处理10个任务，避免触发限流
var ImportTaskQueue = /** @class */ (function () {
    function ImportTaskQueue() {
        this.isRunning = false;
        this.processingIds = new Set();
    }
    /**
     * 启动任务队列处理器
     */
    ImportTaskQueue.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isRunning) {
                            logger_1.logger.warn('导入任务队列已在运行');
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, connection_1.database.init()];
                    case 2:
                        _a.sent();
                        logger_1.logger.debug('数据库连接已确认，启动任务队列');
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        logger_1.logger.error('数据库初始化失败，任务队列启动失败', error_1);
                        return [2 /*return*/];
                    case 4:
                        this.isRunning = true;
                        logger_1.logger.success('导入任务队列已启动');
                        this.processLoop();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 停止任务队列处理器
     */
    ImportTaskQueue.prototype.stop = function () {
        this.isRunning = false;
        logger_1.logger.info('导入任务队列已停止');
    };
    /**
     * 主循环：定时检查待处理任务
     */
    ImportTaskQueue.prototype.processLoop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var consecutiveEmptyRounds, MAX_EMPTY_ROUNDS, LONG_INTERVAL, LOG_INTERVAL, AUTO_RETRY_INTERVAL, lastAutoRetryTime, _loop_1, this_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        consecutiveEmptyRounds = 0;
                        MAX_EMPTY_ROUNDS = 6;
                        LONG_INTERVAL = 30000;
                        LOG_INTERVAL = 12;
                        AUTO_RETRY_INTERVAL = 60;
                        lastAutoRetryTime = 0;
                        _loop_1 = function () {
                            var hasTasks, currentTime, hasProcessingTasks, retryCount, interval_1, error_2;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 10, , 12]);
                                        return [4 /*yield*/, this_1.processPendingTasks()];
                                    case 1:
                                        hasTasks = _b.sent();
                                        if (!hasTasks) return [3 /*break*/, 3];
                                        consecutiveEmptyRounds = 0;
                                        // 有任务时使用正常间隔
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, QUEUE_INTERVAL); })];
                                    case 2:
                                        // 有任务时使用正常间隔
                                        _b.sent();
                                        return [3 /*break*/, 9];
                                    case 3:
                                        consecutiveEmptyRounds++;
                                        // 只在特定间隔记录日志，避免日志过多
                                        if (consecutiveEmptyRounds % LOG_INTERVAL === 0) {
                                            logger_1.logger.info("\u4EFB\u52A1\u961F\u5217\u7A7A\u95F2\u4E2D\uFF0C\u5DF2\u8FDE\u7EED".concat(consecutiveEmptyRounds, "\u6B21\u65E0\u4EFB\u52A1"));
                                        }
                                        currentTime = Date.now();
                                        if (!(currentTime - lastAutoRetryTime >= AUTO_RETRY_INTERVAL * 1000)) return [3 /*break*/, 7];
                                        return [4 /*yield*/, this_1.hasProcessingTasks()];
                                    case 4:
                                        hasProcessingTasks = _b.sent();
                                        if (!!hasProcessingTasks) return [3 /*break*/, 6];
                                        return [4 /*yield*/, this_1.autoRetryRateLimitTasks()];
                                    case 5:
                                        retryCount = _b.sent();
                                        if (retryCount > 0) {
                                            logger_1.logger.success("\u81EA\u52A8\u91CD\u8BD5\u4E86".concat(retryCount, "\u4E2A429\u9650\u6D41\u9519\u8BEF\u4EFB\u52A1"));
                                        }
                                        _b.label = 6;
                                    case 6:
                                        lastAutoRetryTime = currentTime;
                                        _b.label = 7;
                                    case 7:
                                        interval_1 = consecutiveEmptyRounds >= MAX_EMPTY_ROUNDS ? LONG_INTERVAL : QUEUE_INTERVAL;
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, interval_1); })];
                                    case 8:
                                        _b.sent();
                                        _b.label = 9;
                                    case 9: return [3 /*break*/, 12];
                                    case 10:
                                        error_2 = _b.sent();
                                        logger_1.logger.error('任务队列循环错误', error_2);
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, QUEUE_INTERVAL); })];
                                    case 11:
                                        _b.sent();
                                        return [3 /*break*/, 12];
                                    case 12: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 1;
                    case 1:
                        if (!this.isRunning) return [3 /*break*/, 3];
                        return [5 /*yield**/, _loop_1()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 处理待处理的任务
     * @returns 是否有任务被处理
     */
    ImportTaskQueue.prototype.processPendingTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var queryStartTime, pendingTasks, queryDuration, queueStatus, processingStartTime, processingDuration, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        queryStartTime = Date.now();
                        return [4 /*yield*/, connection_1.database.all("SELECT * FROM import_tasks_content \n         WHERE status = 'pending' AND retry_count < ? \n         ORDER BY created_at ASC \n         LIMIT ?", [MAX_RETRY_COUNT, CONCURRENT_LIMIT])];
                    case 1:
                        pendingTasks = _a.sent();
                        queryDuration = Date.now() - queryStartTime;
                        logger_1.logger.info("\u6570\u636E\u5E93\u67E5\u8BE2\u8017\u65F6: ".concat(queryDuration, "ms, \u67E5\u8BE2\u5230").concat(pendingTasks.length, "\u4E2A\u5F85\u5904\u7406\u4EFB\u52A1"));
                        if (pendingTasks.length === 0) {
                            return [2 /*return*/, false]; // 没有待处理任务
                        }
                        logger_1.logger.info("\u53D1\u73B0".concat(pendingTasks.length, "\u4E2A\u5F85\u5904\u7406\u4EFB\u52A1"));
                        queueStatus = validationLimiter_1.validationLimiter.getQueueStatus();
                        logger_1.logger.debug("\u5F53\u524D\u9A8C\u8BC1\u961F\u5217: ".concat(queueStatus.queueLength, "\u4E2A\u5F85\u9A8C\u8BC1, \u5904\u7406\u4E2D: ").concat(queueStatus.isProcessing));
                        processingStartTime = Date.now();
                        return [4 /*yield*/, Promise.all(pendingTasks.map(function (task) { return _this.processTask(task); }))];
                    case 2:
                        _a.sent();
                        processingDuration = Date.now() - processingStartTime;
                        logger_1.logger.info("\u6279\u6B21\u5904\u7406\u5B8C\u6210\uFF0C\u8017\u65F6: ".concat(processingDuration, "ms (\u5E73\u5747: ").concat(Math.round(processingDuration / pendingTasks.length), "ms/\u4EFB\u52A1)"));
                        return [2 /*return*/, true]; // 有任务被处理
                    case 3:
                        error_3 = _a.sent();
                        logger_1.logger.error('查询待处理任务失败', error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 处理单个任务
     */
    ImportTaskQueue.prototype.processTask = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var taskStartTime, checkDuplicateTime, validateTime, dbWriteTime, checkStart, existingRecipe, validateStart, validationResult, dbStart, recipeId, totalTime, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // 防止重复处理
                        if (this.processingIds.has(task.id)) {
                            return [2 /*return*/];
                        }
                        this.processingIds.add(task.id);
                        taskStartTime = Date.now();
                        checkDuplicateTime = 0;
                        validateTime = 0;
                        dbWriteTime = 0;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 12, 14, 15]);
                        logger_1.logger.debug("\u5904\u7406\u4EFB\u52A1".concat(task.id, ": ").concat(task.item_a, " + ").concat(task.item_b, " = ").concat(task.result));
                        checkStart = Date.now();
                        return [4 /*yield*/, this.checkDuplicateRecipe(task)];
                    case 2:
                        existingRecipe = _a.sent();
                        checkDuplicateTime = Date.now() - checkStart;
                        if (!existingRecipe) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.markAsDuplicate(task, existingRecipe.id)];
                    case 3:
                        _a.sent();
                        logger_1.logger.debug("\u4EFB\u52A1".concat(task.id, "\u8017\u65F6: \u603B").concat(Date.now() - taskStartTime, "ms (\u53BB\u91CD\u68C0\u67E5: ").concat(checkDuplicateTime, "ms)"));
                        return [2 /*return*/];
                    case 4:
                        validateStart = Date.now();
                        return [4 /*yield*/, this.validateRecipe(task)];
                    case 5:
                        validationResult = _a.sent();
                        validateTime = Date.now() - validateStart;
                        if (!!validationResult.success) return [3 /*break*/, 7];
                        // 验证失败，增加重试次数
                        return [4 /*yield*/, this.incrementRetry(task, validationResult.error || 'Unknown error', validationResult.isRateLimit)];
                    case 6:
                        // 验证失败，增加重试次数
                        _a.sent();
                        logger_1.logger.debug("\u4EFB\u52A1".concat(task.id, "\u9A8C\u8BC1\u5931\u8D25\uFF0C\u8017\u65F6: ").concat(validateTime, "ms"));
                        return [2 /*return*/];
                    case 7:
                        dbStart = Date.now();
                        return [4 /*yield*/, this.insertRecipe(task)];
                    case 8:
                        recipeId = _a.sent();
                        // 4. 更新物品字典（包括保存 emoji）
                        return [4 /*yield*/, this.updateItemsDictionary([task.item_a, task.item_b, task.result], validationResult.emoji)];
                    case 9:
                        // 4. 更新物品字典（包括保存 emoji）
                        _a.sent();
                        // 5. 标记为成功
                        return [4 /*yield*/, this.markAsSuccess(task, recipeId)];
                    case 10:
                        // 5. 标记为成功
                        _a.sent();
                        // 6. 更新任务统计
                        return [4 /*yield*/, this.updateTaskStats(task.task_id)];
                    case 11:
                        // 6. 更新任务统计
                        _a.sent();
                        dbWriteTime = Date.now() - dbStart;
                        totalTime = Date.now() - taskStartTime;
                        logger_1.logger.success("\u4EFB\u52A1".concat(task.id, "\u5904\u7406\u6210\u529F\uFF0C\u8017\u65F6: \u603B").concat(totalTime, "ms (\u53BB\u91CD: ").concat(checkDuplicateTime, "ms, API\u9A8C\u8BC1: ").concat(validateTime, "ms, \u6570\u636E\u5E93\u5199\u5165: ").concat(dbWriteTime, "ms)"));
                        return [3 /*break*/, 15];
                    case 12:
                        error_4 = _a.sent();
                        logger_1.logger.error("\u5904\u7406\u4EFB\u52A1".concat(task.id, "\u5931\u8D25:"), error_4);
                        return [4 /*yield*/, this.incrementRetry(task, error_4.message)];
                    case 13:
                        _a.sent();
                        return [3 /*break*/, 15];
                    case 14:
                        this.processingIds.delete(task.id);
                        return [7 /*endfinally*/];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 检查重复配方
     */
    ImportTaskQueue.prototype.checkDuplicateRecipe = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, itemA, itemB, existing;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = [task.item_a, task.item_b], itemA = _a[0], itemB = _a[1];
                        if (itemA > itemB) {
                            _b = [itemB, itemA], itemA = _b[0], itemB = _b[1];
                        }
                        return [4 /*yield*/, connection_1.database.get('SELECT id FROM recipes WHERE item_a = ? AND item_b = ? LIMIT 1', [itemA, itemB])];
                    case 1:
                        existing = _c.sent();
                        return [2 /*return*/, existing || null];
                }
            });
        });
    };
    /**
     * 调用外部 API 验证配方（通过全局限速器）
     */
    ImportTaskQueue.prototype.validateRecipe = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                // 使用全局限速器包装 HTTP 请求
                return [2 /*return*/, validationLimiter_1.validationLimiter.limitValidation(function () { return __awaiter(_this, void 0, void 0, function () {
                        var response, data, error_5, status_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    logger_1.logger.debug("\u9A8C\u8BC1\u914D\u65B9: ".concat(task.item_a, " + ").concat(task.item_b));
                                    return [4 /*yield*/, axios_1.default.get(api_1.apiConfig.validationApiUrl, {
                                            params: {
                                                itemA: task.item_a,
                                                itemB: task.item_b
                                            },
                                            timeout: api_1.apiConfig.timeout,
                                            headers: api_1.apiConfig.headers
                                        })];
                                case 1:
                                    response = _a.sent();
                                    logger_1.logger.debug("API\u54CD\u5E94: ".concat(response.status), response.data);
                                    if (response.status === 200) {
                                        data = response.data;
                                        if (data.item && data.item !== '') {
                                            // 验证返回的结果是否匹配
                                            if (data.item !== task.result) {
                                                return [2 /*return*/, {
                                                        success: false,
                                                        error: "\u7ED3\u679C\u4E0D\u5339\u914D: \u9884\u671F \"".concat(task.result, "\", \u5B9E\u9645 \"").concat(data.item, "\"")
                                                    }];
                                            }
                                            logger_1.logger.debug("\u9A8C\u8BC1\u6210\u529F: ".concat(task.item_a, " + ").concat(task.item_b, " = ").concat(data.item));
                                            return [2 /*return*/, { success: true, emoji: data.emoji }];
                                        }
                                        else {
                                            logger_1.logger.debug("\u9A8C\u8BC1\u5931\u8D25: \u65E0\u6CD5\u5408\u6210 ".concat(task.item_a, " + ").concat(task.item_b));
                                            return [2 /*return*/, { success: false, error: '无法合成' }];
                                        }
                                    }
                                    else {
                                        logger_1.logger.warn("API\u9519\u8BEF\u72B6\u6001: ".concat(response.status));
                                        return [2 /*return*/, { success: false, error: "API\u8FD4\u56DE\u72B6\u6001: ".concat(response.status) }];
                                    }
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_5 = _a.sent();
                                    logger_1.logger.error("\u9A8C\u8BC1\u5F02\u5E38: ".concat(error_5.message));
                                    if (error_5.response) {
                                        status_1 = error_5.response.status;
                                        logger_1.logger.warn("\u9519\u8BEF\u54CD\u5E94: ".concat(status_1), error_5.response.data);
                                        if (status_1 === 400) {
                                            return [2 /*return*/, { success: false, error: '这两个物件不能合成' }];
                                        }
                                        else if (status_1 === 403) {
                                            return [2 /*return*/, { success: false, error: '包含非法物件（还没出现过的物件）' }];
                                        }
                                        else if (status_1 === 429) {
                                            // 429限流错误，特殊处理，不增加重试次数
                                            return [2 /*return*/, {
                                                    success: false,
                                                    error: "\u9A8C\u8BC1\u5931\u8D25\uFF0C\u72B6\u6001\u7801: ".concat(status_1),
                                                    isRateLimit: true
                                                }];
                                        }
                                        else {
                                            return [2 /*return*/, { success: false, error: "\u9A8C\u8BC1\u5931\u8D25\uFF0C\u72B6\u6001\u7801: ".concat(status_1) }];
                                        }
                                    }
                                    else if (error_5.code === 'ECONNABORTED') {
                                        return [2 /*return*/, { success: false, error: '验证超时，请稍后重试' }];
                                    }
                                    else {
                                        // 网络错误，可以重试
                                        return [2 /*return*/, {
                                                success: false,
                                                error: "\u7F51\u7EDC\u9519\u8BEF: ".concat(error_5.message)
                                            }];
                                    }
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    /**
     * 插入配方到 recipes 表
     */
    ImportTaskQueue.prototype.insertRecipe = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, itemA, itemB, taskInfo, userId, result;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = [task.item_a, task.item_b], itemA = _a[0], itemB = _a[1];
                        if (itemA > itemB) {
                            _b = [itemB, itemA], itemA = _b[0], itemB = _b[1];
                        }
                        return [4 /*yield*/, connection_1.database.get('SELECT user_id FROM import_tasks WHERE id = ?', [task.task_id])];
                    case 1:
                        taskInfo = _c.sent();
                        userId = (taskInfo === null || taskInfo === void 0 ? void 0 : taskInfo.user_id) || 1;
                        return [4 /*yield*/, connection_1.database.run("INSERT INTO recipes (item_a, item_b, result, user_id, likes) \n       VALUES (?, ?, ?, ?, 0)", [itemA, itemB, task.result, userId])];
                    case 2:
                        result = _c.sent();
                        // 计算并更新用户贡献度
                        return [4 /*yield*/, this.updateUserContribution(userId, task)];
                    case 3:
                        // 计算并更新用户贡献度
                        _c.sent();
                        return [2 /*return*/, result.lastID];
                }
            });
        });
    };
    /**
     * 更新用户贡献度
     */
    ImportTaskQueue.prototype.updateUserContribution = function (userId, task) {
        return __awaiter(this, void 0, void 0, function () {
            var totalContribution, items, _i, items_1, item, existingItem, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        totalContribution = 0;
                        // 1. 新配方贡献度：+1分
                        totalContribution += 1;
                        items = [task.item_a, task.item_b, task.result];
                        _i = 0, items_1 = items;
                        _a.label = 1;
                    case 1:
                        if (!(_i < items_1.length)) return [3 /*break*/, 4];
                        item = items_1[_i];
                        return [4 /*yield*/, connection_1.database.get('SELECT id FROM items WHERE name = ?', [item])];
                    case 2:
                        existingItem = _a.sent();
                        // 如果物品不存在，说明是新物品
                        if (!existingItem) {
                            totalContribution += 2;
                            logger_1.logger.debug("\u53D1\u73B0\u65B0\u7269\u54C1 \"".concat(item, "\"\uFF0C\u8D21\u732E\u5EA6+2"));
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        if (!(totalContribution > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, userService_1.userService.incrementContribution(userId, totalContribution)];
                    case 5:
                        _a.sent();
                        logger_1.logger.success("\u7528\u6237 ".concat(userId, " \u8D21\u732E\u5EA6\u589E\u52A0 ").concat(totalContribution, " \u5206 (\u65B0\u914D\u65B9: +1, \u65B0\u7269\u54C1: +").concat(totalContribution - 1, ")"));
                        return [3 /*break*/, 7];
                    case 6:
                        logger_1.logger.debug("\u7528\u6237 ".concat(userId, " \u8D21\u732E\u5EA6\u65E0\u53D8\u5316 (\u6240\u6709\u7269\u54C1\u5DF2\u5B58\u5728)"));
                        _a.label = 7;
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_6 = _a.sent();
                        logger_1.logger.error("\u66F4\u65B0\u7528\u6237 ".concat(userId, " \u8D21\u732E\u5EA6\u5931\u8D25:"), error_6);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 更新物品字典
     */
    ImportTaskQueue.prototype.updateItemsDictionary = function (items, resultEmoji) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, items_2, item;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _i = 0, items_2 = items;
                        _a.label = 1;
                    case 1:
                        if (!(_i < items_2.length)) return [3 /*break*/, 4];
                        item = items_2[_i];
                        return [4 /*yield*/, connection_1.database.run('INSERT OR IGNORE INTO items (name, is_base) VALUES (?, 0)', [item])];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        if (!(resultEmoji && items[2])) return [3 /*break*/, 6];
                        return [4 /*yield*/, connection_1.database.run('UPDATE items SET emoji = ? WHERE name = ?', [resultEmoji, items[2]])];
                    case 5:
                        _a.sent();
                        logger_1.logger.debug("\u4FDD\u5B58emoji: ".concat(items[2], " = ").concat(resultEmoji));
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 标记为成功
     */
    ImportTaskQueue.prototype.markAsSuccess = function (task, recipeId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.run("UPDATE import_tasks_content \n       SET status = ?, recipe_id = ?, updated_at = ? \n       WHERE id = ?", ['success', recipeId, (0, timezone_1.getCurrentUTC8TimeForDB)(), task.id])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 标记为重复
     */
    ImportTaskQueue.prototype.markAsDuplicate = function (task, existingRecipeId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.run("UPDATE import_tasks_content \n       SET status = ?, recipe_id = ?, error_message = ?, updated_at = ? \n       WHERE id = ?", ['duplicate', existingRecipeId, 'Duplicate recipe', (0, timezone_1.getCurrentUTC8TimeForDB)(), task.id])];
                    case 1:
                        _a.sent();
                        // 更新任务统计（duplicate_count）
                        return [4 /*yield*/, connection_1.database.run("UPDATE import_tasks \n       SET duplicate_count = duplicate_count + 1, updated_at = ? \n       WHERE id = ?", [(0, timezone_1.getCurrentUTC8TimeForDB)(), task.task_id])];
                    case 2:
                        // 更新任务统计（duplicate_count）
                        _a.sent();
                        logger_1.logger.info("\u4EFB\u52A1".concat(task.id, "\u6807\u8BB0\u4E3A\u91CD\u590D (recipe_id: ").concat(existingRecipeId, ")"));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 增加重试次数
     */
    ImportTaskQueue.prototype.incrementRetry = function (task, errorMessage, isRateLimit) {
        return __awaiter(this, void 0, void 0, function () {
            var newRetryCount, newStatus;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!isRateLimit) return [3 /*break*/, 2];
                        logger_1.logger.info("\u4EFB\u52A1".concat(task.id, "\u9047\u5230429\u9650\u6D41\u9519\u8BEF\uFF0C\u7B49\u5F85\u81EA\u52A8\u91CD\u8BD5"));
                        return [4 /*yield*/, connection_1.database.run("UPDATE import_tasks_content \n         SET error_message = ?, updated_at = ? \n         WHERE id = ?", [errorMessage, (0, timezone_1.getCurrentUTC8TimeForDB)(), task.id])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        newRetryCount = task.retry_count + 1;
                        newStatus = newRetryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending';
                        return [4 /*yield*/, connection_1.database.run("UPDATE import_tasks_content \n       SET retry_count = ?, status = ?, error_message = ?, updated_at = ? \n       WHERE id = ?", [newRetryCount, newStatus, errorMessage, (0, timezone_1.getCurrentUTC8TimeForDB)(), task.id])];
                    case 3:
                        _a.sent();
                        if (!(newStatus === 'failed')) return [3 /*break*/, 5];
                        logger_1.logger.warn("\u4EFB\u52A1".concat(task.id, "\u5728").concat(MAX_RETRY_COUNT, "\u6B21\u91CD\u8BD5\u540E\u5931\u8D25"));
                        return [4 /*yield*/, this.updateTaskStats(task.task_id)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        logger_1.logger.info("\u4EFB\u52A1".concat(task.id, "\u91CD\u8BD5 ").concat(newRetryCount, "/").concat(MAX_RETRY_COUNT));
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 更新任务统计信息
     */
    ImportTaskQueue.prototype.updateTaskStats = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var stats, pending, taskStatus;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get("SELECT \n        COUNT(*) as total,\n        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,\n        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,\n        SUM(CASE WHEN status = 'duplicate' THEN 1 ELSE 0 END) as duplicate\n       FROM import_tasks_content \n       WHERE task_id = ?", [taskId])];
                    case 1:
                        stats = _a.sent();
                        if (!stats)
                            return [2 /*return*/];
                        pending = stats.total - stats.success - stats.failed - stats.duplicate;
                        taskStatus = pending > 0 ? 'processing' : 'completed';
                        return [4 /*yield*/, connection_1.database.run("UPDATE import_tasks \n       SET success_count = ?, failed_count = ?, duplicate_count = ?, \n           status = ?, updated_at = ? \n       WHERE id = ?", [stats.success, stats.failed, stats.duplicate, taskStatus, (0, timezone_1.getCurrentUTC8TimeForDB)(), taskId])];
                    case 2:
                        _a.sent();
                        logger_1.logger.info("\u4EFB\u52A1".concat(taskId, "\u7EDF\u8BA1\u66F4\u65B0: ").concat(stats.success, "\u6210\u529F, ").concat(stats.failed, "\u5931\u8D25, ").concat(stats.duplicate, "\u91CD\u590D, ").concat(pending, "\u5F85\u5904\u7406"));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 检查是否有正在进行的任务
     */
    ImportTaskQueue.prototype.hasProcessingTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get("SELECT COUNT(*) as count FROM import_tasks_content \n       WHERE status IN ('pending', 'processing')")];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, ((result === null || result === void 0 ? void 0 : result.count) || 0) > 0];
                }
            });
        });
    };
    /**
     * 自动重试429限流错误的失败任务
     */
    ImportTaskQueue.prototype.autoRetryRateLimitTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var rateLimitTasks, retryCount, _i, rateLimitTasks_1, task, error_7, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        return [4 /*yield*/, connection_1.database.all("SELECT * FROM import_tasks_content \n         WHERE status = 'failed' \n         AND error_message LIKE '%\u9A8C\u8BC1\u5931\u8D25\uFF0C\u72B6\u6001\u7801: 429%' \n         ORDER BY updated_at ASC \n         LIMIT ?", [CONCURRENT_LIMIT])];
                    case 1:
                        rateLimitTasks = _a.sent();
                        if (rateLimitTasks.length === 0) {
                            return [2 /*return*/, 0];
                        }
                        logger_1.logger.info("\u53D1\u73B0".concat(rateLimitTasks.length, "\u4E2A429\u9650\u6D41\u9519\u8BEF\u4EFB\u52A1\uFF0C\u5F00\u59CB\u81EA\u52A8\u91CD\u8BD5"));
                        retryCount = 0;
                        _i = 0, rateLimitTasks_1 = rateLimitTasks;
                        _a.label = 2;
                    case 2:
                        if (!(_i < rateLimitTasks_1.length)) return [3 /*break*/, 7];
                        task = rateLimitTasks_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        // 重置任务状态为pending，清空错误信息，重置重试次数
                        return [4 /*yield*/, connection_1.database.run("UPDATE import_tasks_content \n             SET status = 'pending', retry_count = 0, error_message = NULL, updated_at = ? \n             WHERE id = ?", [(0, timezone_1.getCurrentUTC8TimeForDB)(), task.id])];
                    case 4:
                        // 重置任务状态为pending，清空错误信息，重置重试次数
                        _a.sent();
                        retryCount++;
                        logger_1.logger.info("\u81EA\u52A8\u91CD\u8BD5\u4EFB\u52A1".concat(task.id, ": ").concat(task.item_a, " + ").concat(task.item_b, " = ").concat(task.result));
                        return [3 /*break*/, 6];
                    case 5:
                        error_7 = _a.sent();
                        logger_1.logger.error("\u81EA\u52A8\u91CD\u8BD5\u4EFB\u52A1".concat(task.id, "\u5931\u8D25:"), error_7);
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7:
                        logger_1.logger.success("\u81EA\u52A8\u91CD\u8BD5\u5B8C\u6210: ".concat(retryCount, "/").concat(rateLimitTasks.length, "\u4E2A\u4EFB\u52A1\u5DF2\u91CD\u7F6E"));
                        return [2 /*return*/, retryCount];
                    case 8:
                        error_8 = _a.sent();
                        logger_1.logger.error('自动重试429限流任务失败:', error_8);
                        return [2 /*return*/, 0];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 重置失败任务（允许重新处理）
     */
    ImportTaskQueue.prototype.resetFailedTasks = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, params, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = taskId
                            ? 'UPDATE import_tasks_content SET status = ?, retry_count = 0, error_message = NULL WHERE task_id = ? AND status = ?'
                            : 'UPDATE import_tasks_content SET status = ?, retry_count = 0, error_message = NULL WHERE status = ?';
                        params = taskId ? ['pending', taskId, 'failed'] : ['pending', 'failed'];
                        return [4 /*yield*/, connection_1.database.run(sql, params)];
                    case 1:
                        result = _a.sent();
                        logger_1.logger.info("\u91CD\u7F6E".concat(result.changes, "\u4E2A\u5931\u8D25\u4EFB\u52A1"));
                        return [2 /*return*/, result.changes || 0];
                }
            });
        });
    };
    return ImportTaskQueue;
}());
// 单例模式
exports.importTaskQueue = new ImportTaskQueue();
