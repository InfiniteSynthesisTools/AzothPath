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
exports.recipeService = exports.RecipeService = void 0;
var connection_1 = require("../database/connection");
var logger_1 = require("../utils/logger");
var timezone_1 = require("../utils/timezone");
var RecipeService = /** @class */ (function () {
    function RecipeService() {
    }
    /**
     * 获取配方列表（优化版本）
     * 性能优化：
     * 1. 使用JOIN替代子查询
     * 2. 优化索引策略
     * 3. 支持游标分页
     */
    RecipeService.prototype.getRecipes = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, page, _b, limit, search, _c, orderBy, userId, result, cursor, sql, sqlParams, conditions, validOrderBy, recipes, countParams, paramIndex, totalPromise;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _a = params.page, page = _a === void 0 ? 1 : _a, _b = params.limit, limit = _b === void 0 ? 20 : _b, search = params.search, _c = params.orderBy, orderBy = _c === void 0 ? 'created_at' : _c, userId = params.userId, result = params.result, cursor = params.cursor;
                        sql = "\n      SELECT r.*, \n             u.name as creator_name,\n             ia.emoji as item_a_emoji,\n             ib.emoji as item_b_emoji,\n             ir.emoji as result_emoji,\n             ".concat(userId ? 'CASE WHEN rl.id IS NOT NULL THEN 1 ELSE 0 END as is_liked' : '0 as is_liked', "\n      FROM recipes r\n      LEFT JOIN user u ON r.user_id = u.id\n      LEFT JOIN items ia ON ia.name = r.item_a\n      LEFT JOIN items ib ON ib.name = r.item_b  \n      LEFT JOIN items ir ON ir.name = r.result\n      ").concat(userId ? 'LEFT JOIN recipe_likes rl ON rl.recipe_id = r.id AND rl.user_id = ?' : '', "\n    ");
                        sqlParams = [];
                        if (userId) {
                            sqlParams.push(userId);
                        }
                        conditions = [];
                        if (search) {
                            // 优先精确匹配，然后模糊匹配
                            conditions.push("(r.item_a = ? OR r.item_b = ? OR r.result = ? OR \n                       r.item_a LIKE ? OR r.item_b LIKE ? OR r.result LIKE ?)");
                            sqlParams.push(search, search, search, "%".concat(search, "%"), "%".concat(search, "%"), "%".concat(search, "%"));
                        }
                        if (result) {
                            conditions.push('r.result = ?');
                            sqlParams.push(result);
                        }
                        // 游标分页优化（推荐）或传统分页
                        if (cursor) {
                            // 游标分页 - 性能最佳
                            conditions.push("r.id < ?");
                            sqlParams.push(cursor);
                        }
                        if (conditions.length > 0) {
                            sql += " WHERE ".concat(conditions.join(' AND '));
                        }
                        validOrderBy = ['created_at', 'likes', 'id'].includes(orderBy) ? orderBy : 'created_at';
                        sql += " ORDER BY r.".concat(validOrderBy, " DESC, r.id DESC");
                        if (cursor) {
                            sql += " LIMIT ?";
                            sqlParams.push(limit);
                        }
                        else {
                            // 传统分页
                            sql += " LIMIT ? OFFSET ?";
                            sqlParams.push(limit, (page - 1) * limit);
                        }
                        return [4 /*yield*/, connection_1.database.all(sql, sqlParams)];
                    case 1:
                        recipes = _e.sent();
                        countParams = [];
                        paramIndex = 0;
                        // 跳过userId参数（计数查询不需要）
                        if (userId) {
                            paramIndex++;
                        }
                        // search参数（6个）
                        if (search) {
                            countParams.push.apply(countParams, sqlParams.slice(paramIndex, paramIndex + 6));
                            paramIndex += 6;
                        }
                        // result参数
                        if (result) {
                            countParams.push(sqlParams[paramIndex++]);
                        }
                        // cursor参数
                        if (cursor) {
                            countParams.push(sqlParams[paramIndex++]);
                        }
                        totalPromise = this.getCountAsync(countParams, conditions);
                        _d = {
                            recipes: recipes
                        };
                        return [4 /*yield*/, totalPromise];
                    case 2: return [2 /*return*/, (_d.total = _e.sent(),
                            _d.page = page,
                            _d.limit = limit,
                            _d.hasMore = recipes.length === limit,
                            _d.nextCursor = recipes.length > 0 ? recipes[recipes.length - 1].id : null,
                            _d)];
                }
            });
        });
    };
    /**
     * 异步获取总数（避免阻塞主查询）
     */
    RecipeService.prototype.getCountAsync = function (baseParams, conditions) {
        return __awaiter(this, void 0, void 0, function () {
            var countSql, totalResult, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        countSql = 'SELECT COUNT(*) as count FROM recipes r';
                        if (conditions.length > 0) {
                            countSql += " WHERE ".concat(conditions.join(' AND '));
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, connection_1.database.get(countSql, baseParams)];
                    case 2:
                        totalResult = _a.sent();
                        return [2 /*return*/, (totalResult === null || totalResult === void 0 ? void 0 : totalResult.count) || 0];
                    case 3:
                        error_1 = _a.sent();
                        logger_1.logger.error('获取总数失败:', error_1);
                        logger_1.logger.error('SQL:', countSql);
                        logger_1.logger.error('参数:', baseParams);
                        return [2 /*return*/, 0];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 获取按结果分组的配方列表（优化版本）
     */
    RecipeService.prototype.getGroupedRecipes = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, page, _b, limit, search, result, userId, offset, resultSql, resultParams, conditions, results, groupedRecipes, _i, results_1, resultItem, recipeSql, recipeParams, recipes, countParams, paramIndex, totalPromise;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = params.page, page = _a === void 0 ? 1 : _a, _b = params.limit, limit = _b === void 0 ? 20 : _b, search = params.search, result = params.result, userId = params.userId;
                        offset = (page - 1) * limit;
                        resultSql = "\n      SELECT DISTINCT r.result,\n             ir.emoji as result_emoji,\n             COUNT(r.id) as recipe_count\n      FROM recipes r\n      LEFT JOIN items ir ON ir.name = r.result\n    ";
                        resultParams = [];
                        conditions = [];
                        if (search) {
                            conditions.push("(r.item_a = ? OR r.item_b = ? OR r.result = ? OR \n                       r.item_a LIKE ? OR r.item_b LIKE ? OR r.result LIKE ?)");
                            resultParams.push(search, search, search, "%".concat(search, "%"), "%".concat(search, "%"), "%".concat(search, "%"));
                        }
                        if (result) {
                            conditions.push('r.result = ?');
                            resultParams.push(result);
                        }
                        if (conditions.length > 0) {
                            resultSql += " WHERE ".concat(conditions.join(' AND '));
                        }
                        resultSql += " GROUP BY r.result ORDER BY recipe_count DESC, r.result LIMIT ? OFFSET ?";
                        resultParams.push(limit, offset);
                        return [4 /*yield*/, connection_1.database.all(resultSql, resultParams)];
                    case 1:
                        results = _d.sent();
                        groupedRecipes = [];
                        _i = 0, results_1 = results;
                        _d.label = 2;
                    case 2:
                        if (!(_i < results_1.length)) return [3 /*break*/, 5];
                        resultItem = results_1[_i];
                        recipeSql = "\n        SELECT r.*, u.name as creator_name,\n               ia.emoji as item_a_emoji,\n               ib.emoji as item_b_emoji,\n               ir.emoji as result_emoji,\n               ".concat(userId ? 'CASE WHEN rl.id IS NOT NULL THEN 1 ELSE 0 END as is_liked' : '0 as is_liked', "\n        FROM recipes r\n        LEFT JOIN user u ON r.user_id = u.id\n        LEFT JOIN items ia ON ia.name = r.item_a\n        LEFT JOIN items ib ON ib.name = r.item_b  \n        LEFT JOIN items ir ON ir.name = r.result\n        ").concat(userId ? 'LEFT JOIN recipe_likes rl ON rl.recipe_id = r.id AND rl.user_id = ?' : '', "\n        WHERE r.result = ?\n        ORDER BY r.likes DESC, r.created_at DESC\n      ");
                        recipeParams = userId ? [userId, resultItem.result] : [resultItem.result];
                        return [4 /*yield*/, connection_1.database.all(recipeSql, recipeParams)];
                    case 3:
                        recipes = _d.sent();
                        groupedRecipes.push({
                            result: resultItem.result,
                            result_emoji: resultItem.result_emoji,
                            recipe_count: resultItem.recipe_count,
                            recipes: recipes
                        });
                        _d.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        countParams = [];
                        paramIndex = 0;
                        // search参数（6个）
                        if (search) {
                            countParams.push.apply(countParams, resultParams.slice(paramIndex, paramIndex + 6));
                            paramIndex += 6;
                        }
                        // result参数
                        if (result) {
                            countParams.push(resultParams[paramIndex++]);
                        }
                        totalPromise = this.getGroupedCountAsync(countParams, conditions);
                        _c = {
                            grouped_recipes: groupedRecipes
                        };
                        return [4 /*yield*/, totalPromise];
                    case 6: return [2 /*return*/, (_c.total = _d.sent(),
                            _c.page = page,
                            _c.limit = limit,
                            _c)];
                }
            });
        });
    };
    /**
     * 异步获取分组查询的总数
     */
    RecipeService.prototype.getGroupedCountAsync = function (baseParams, conditions) {
        return __awaiter(this, void 0, void 0, function () {
            var countSql, totalResult, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        countSql = 'SELECT COUNT(DISTINCT result) as count FROM recipes r';
                        if (conditions.length > 0) {
                            countSql += " WHERE ".concat(conditions.join(' AND '));
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, connection_1.database.get(countSql, baseParams)];
                    case 2:
                        totalResult = _a.sent();
                        return [2 /*return*/, (totalResult === null || totalResult === void 0 ? void 0 : totalResult.count) || 0];
                    case 3:
                        error_2 = _a.sent();
                        logger_1.logger.error('获取分组总数失败:', error_2);
                        logger_1.logger.error('SQL:', countSql);
                        logger_1.logger.error('参数:', baseParams);
                        return [2 /*return*/, 0];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 获取配方详情（优化版本）
     */
    RecipeService.prototype.getRecipeById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var recipe;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get("SELECT r.*, u.name as creator_name,\n              ia.emoji as item_a_emoji,\n              ib.emoji as item_b_emoji,\n              ir.emoji as result_emoji\n       FROM recipes r\n       LEFT JOIN user u ON r.user_id = u.id\n       LEFT JOIN items ia ON ia.name = r.item_a\n       LEFT JOIN items ib ON ib.name = r.item_b  \n       LEFT JOIN items ir ON ir.name = r.result\n       WHERE r.id = ?", [id])];
                    case 1:
                        recipe = _a.sent();
                        if (!recipe) {
                            throw new Error('配方不存在');
                        }
                        return [2 /*return*/, recipe];
                }
            });
        });
    };
    /**
     * 提交配方（含验证和去重）
     */
    RecipeService.prototype.submitRecipe = function (itemA, itemB, result, creatorId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var existing, contributionPoints, itemAPoints, itemBPoints, resultPoints, recipeResult, newItemCount;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        // 规范化：确保 itemA < itemB
                                        if (itemA > itemB) {
                                            _a = [itemB, itemA], itemA = _a[0], itemB = _a[1];
                                        }
                                        return [4 /*yield*/, tx.get('SELECT * FROM recipes WHERE item_a = ? AND item_b = ? AND result = ?', [itemA, itemB, result])];
                                    case 1:
                                        existing = _b.sent();
                                        if (existing) {
                                            throw new Error('配方已存在');
                                        }
                                        contributionPoints = 0;
                                        return [4 /*yield*/, this.ensureItemExistsWithTx(itemA, tx)];
                                    case 2:
                                        itemAPoints = _b.sent();
                                        return [4 /*yield*/, this.ensureItemExistsWithTx(itemB, tx)];
                                    case 3:
                                        itemBPoints = _b.sent();
                                        return [4 /*yield*/, this.ensureItemExistsWithTx(result, tx)];
                                    case 4:
                                        resultPoints = _b.sent();
                                        contributionPoints += itemAPoints + itemBPoints + resultPoints;
                                        return [4 /*yield*/, tx.run('INSERT INTO recipes (item_a, item_b, result, user_id, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)', [itemA, itemB, result, creatorId, 0, (0, timezone_1.getCurrentUTC8TimeForDB)()])];
                                    case 5:
                                        recipeResult = _b.sent();
                                        contributionPoints += 1; // 新配方 +1 分
                                        logger_1.logger.success("\u65B0\u914D\u65B9\u6DFB\u52A0: ".concat(itemA, " + ").concat(itemB, " = ").concat(result, ", +1\u5206"));
                                        if (!(contributionPoints > 0)) return [3 /*break*/, 7];
                                        return [4 /*yield*/, tx.run('UPDATE user SET contribute = contribute + ? WHERE id = ?', [contributionPoints, creatorId])];
                                    case 6:
                                        _b.sent();
                                        newItemCount = (itemAPoints + itemBPoints + resultPoints) / 2;
                                        logger_1.logger.info("\u7528\u6237".concat(creatorId, "\u83B7\u5F97").concat(contributionPoints, "\u5206 (1\u4E2A\u914D\u65B9 + ").concat(newItemCount, "\u4E2A\u65B0\u7269\u54C1)"));
                                        _b.label = 7;
                                    case 7: return [2 /*return*/, recipeResult.lastID];
                                }
                            });
                        }); })];
                    case 1: 
                    // 使用事务确保数据一致性
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * 确保物品存在于 items 表（自动收录）- 事务版本
     *
     * @param itemName 物品名称
     * @param tx 事务数据库实例
     * @returns 贡献分（新物品 +2，已存在 0）
     */
    RecipeService.prototype.ensureItemExistsWithTx = function (itemName, tx) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, baseItems, isBase;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, tx.get('SELECT * FROM items WHERE name = ?', [itemName])];
                    case 1:
                        existing = _a.sent();
                        if (!!existing) return [3 /*break*/, 3];
                        baseItems = ['金', '木', '水', '火', '土'];
                        isBase = baseItems.includes(itemName);
                        return [4 /*yield*/, tx.run('INSERT INTO items (name, is_base, created_at) VALUES (?, ?, ?)', [itemName, isBase ? 1 : 0, (0, timezone_1.getCurrentUTC8TimeForDB)()])];
                    case 2:
                        _a.sent();
                        logger_1.logger.info("\u65B0\u7269\u54C1\u6DFB\u52A0\u5230\u8BCD\u5178: ".concat(itemName, ", +2\u5206"));
                        return [2 /*return*/, 2]; // 新物品 +2 分
                    case 3: return [2 /*return*/, 0]; // 已存在物品不加分
                }
            });
        });
    };
    /**
     * 确保物品存在于 items 表（自动收录）
     *
     * 说明:
     * - 用户可能乱序导入配方，导致 item_a、item_b、result 都可能不存在于数据库
     * - 外部 API 有自己的物品库，验证时不依赖我们的数据库
     * - API 只返回 result 的 emoji，item_a 和 item_b 的 emoji 初始为空
     *
     * @param itemName 物品名称
     * @returns 贡献分（新物品 +2，已存在 0）
     */
    RecipeService.prototype.ensureItemExists = function (itemName) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, baseItems, isBase;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT * FROM items WHERE name = ?', [itemName])];
                    case 1:
                        existing = _a.sent();
                        if (!!existing) return [3 /*break*/, 3];
                        baseItems = ['金', '木', '水', '火', '土'];
                        isBase = baseItems.includes(itemName);
                        return [4 /*yield*/, connection_1.database.run('INSERT INTO items (name, is_base, created_at) VALUES (?, ?, ?)', [itemName, isBase ? 1 : 0, (0, timezone_1.getCurrentUTC8TimeForDB)()])];
                    case 2:
                        _a.sent();
                        logger_1.logger.info("\u65B0\u7269\u54C1\u6DFB\u52A0\u5230\u8BCD\u5178: ".concat(itemName, ", +2\u5206"));
                        return [2 /*return*/, 2]; // 新物品 +2 分
                    case 3: return [2 /*return*/, 0]; // 已存在物品不加分
                }
            });
        });
    };
    /**
     * 点赞/取消点赞配方
     */
    RecipeService.prototype.toggleLike = function (recipeId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, recipe, recipe;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT * FROM recipe_likes WHERE recipe_id = ? AND user_id = ?', [recipeId, userId])];
                    case 1:
                        existing = _a.sent();
                        if (!existing) return [3 /*break*/, 5];
                        // 取消点赞
                        return [4 /*yield*/, connection_1.database.run('DELETE FROM recipe_likes WHERE recipe_id = ? AND user_id = ?', [recipeId, userId])];
                    case 2:
                        // 取消点赞
                        _a.sent();
                        // 更新 recipes 表的 likes 字段
                        return [4 /*yield*/, connection_1.database.run('UPDATE recipes SET likes = likes - 1 WHERE id = ?', [recipeId])];
                    case 3:
                        // 更新 recipes 表的 likes 字段
                        _a.sent();
                        return [4 /*yield*/, connection_1.database.get('SELECT likes FROM recipes WHERE id = ?', [recipeId])];
                    case 4:
                        recipe = _a.sent();
                        return [2 /*return*/, { liked: false, likes: (recipe === null || recipe === void 0 ? void 0 : recipe.likes) || 0 }];
                    case 5: 
                    // 点赞
                    return [4 /*yield*/, connection_1.database.run('INSERT INTO recipe_likes (recipe_id, user_id, created_at) VALUES (?, ?, ?)', [recipeId, userId, (0, timezone_1.getCurrentUTC8TimeForDB)()])];
                    case 6:
                        // 点赞
                        _a.sent();
                        // 更新 recipes 表的 likes 字段
                        return [4 /*yield*/, connection_1.database.run('UPDATE recipes SET likes = likes + 1 WHERE id = ?', [recipeId])];
                    case 7:
                        // 更新 recipes 表的 likes 字段
                        _a.sent();
                        return [4 /*yield*/, connection_1.database.get('SELECT likes FROM recipes WHERE id = ?', [recipeId])];
                    case 8:
                        recipe = _a.sent();
                        return [2 /*return*/, { liked: true, likes: (recipe === null || recipe === void 0 ? void 0 : recipe.likes) || 0 }];
                }
            });
        });
    };
    /**
     * 获取图统计信息
     */
    RecipeService.prototype.getGraphStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var recipesCount, itemsCount, baseItemsCount, craftableItemsCount, usersCount, tasksCount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT COUNT(*) as count FROM recipes')];
                    case 1:
                        recipesCount = _a.sent();
                        return [4 /*yield*/, connection_1.database.get('SELECT COUNT(*) as count FROM items')];
                    case 2:
                        itemsCount = _a.sent();
                        return [4 /*yield*/, connection_1.database.get('SELECT COUNT(*) as count FROM items WHERE is_base = 1')];
                    case 3:
                        baseItemsCount = _a.sent();
                        return [4 /*yield*/, connection_1.database.get("\n      SELECT COUNT(DISTINCT result) as count \n      FROM recipes \n      WHERE result IN (\n        SELECT name FROM items WHERE is_base = 0\n      )\n    ")];
                    case 4:
                        craftableItemsCount = _a.sent();
                        return [4 /*yield*/, connection_1.database.get('SELECT COUNT(*) as count FROM user')];
                    case 5:
                        usersCount = _a.sent();
                        return [4 /*yield*/, connection_1.database.get('SELECT COUNT(*) as count FROM task WHERE status = ?', ['active'])];
                    case 6:
                        tasksCount = _a.sent();
                        return [2 /*return*/, {
                                total_recipes: (recipesCount === null || recipesCount === void 0 ? void 0 : recipesCount.count) || 0,
                                total_items: (itemsCount === null || itemsCount === void 0 ? void 0 : itemsCount.count) || 0,
                                base_items: (baseItemsCount === null || baseItemsCount === void 0 ? void 0 : baseItemsCount.count) || 0,
                                reachable_items: (craftableItemsCount === null || craftableItemsCount === void 0 ? void 0 : craftableItemsCount.count) || 0,
                                unreachable_items: ((itemsCount === null || itemsCount === void 0 ? void 0 : itemsCount.count) || 0) - ((craftableItemsCount === null || craftableItemsCount === void 0 ? void 0 : craftableItemsCount.count) || 0) - ((baseItemsCount === null || baseItemsCount === void 0 ? void 0 : baseItemsCount.count) || 0),
                                valid_recipes: (recipesCount === null || recipesCount === void 0 ? void 0 : recipesCount.count) || 0,
                                invalid_recipes: 0,
                                circular_recipes: 0,
                                circular_items: 0,
                                total_users: (usersCount === null || usersCount === void 0 ? void 0 : usersCount.count) || 0,
                                active_tasks: (tasksCount === null || tasksCount === void 0 ? void 0 : tasksCount.count) || 0
                            }];
                }
            });
        });
    };
    /**
     * 搜索合成路径（BFS 算法）
     */
    RecipeService.prototype.searchPath = function (targetItem) {
        return __awaiter(this, void 0, void 0, function () {
            var recipes, items, baseItemNames, itemToRecipes, _i, recipes_1, recipe, memo, tree, stats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.all('SELECT * FROM recipes')];
                    case 1:
                        recipes = _a.sent();
                        return [4 /*yield*/, connection_1.database.all('SELECT * FROM items WHERE is_base = 1')];
                    case 2:
                        items = _a.sent();
                        baseItemNames = items.map(function (item) { return item.name; });
                        itemToRecipes = {};
                        for (_i = 0, recipes_1 = recipes; _i < recipes_1.length; _i++) {
                            recipe = recipes_1[_i];
                            if (!itemToRecipes[recipe.result]) {
                                itemToRecipes[recipe.result] = [];
                            }
                            itemToRecipes[recipe.result].push(recipe);
                        }
                        memo = {};
                        tree = this.buildCraftingTree(targetItem, baseItemNames, itemToRecipes, memo);
                        if (!tree) {
                            return [2 /*return*/, null];
                        }
                        stats = this.calculateTreeStats(tree, itemToRecipes);
                        return [2 /*return*/, { tree: tree, stats: stats }];
                }
            });
        });
    };
    /**
     * 递归构建合成树
     */
    RecipeService.prototype.buildCraftingTree = function (item, baseItems, itemToRecipes, memo) {
        // 基础材料
        if (baseItems.includes(item)) {
            return { item: item, is_base: true };
        }
        // 缓存检查
        if (item in memo) {
            return memo[item];
        }
        // 获取配方
        var recipes = itemToRecipes[item];
        if (!recipes || recipes.length === 0) {
            memo[item] = null;
            return null;
        }
        // 选择第一个配方（可扩展为多路径）
        var recipe = recipes[0];
        var childA = this.buildCraftingTree(recipe.item_a, baseItems, itemToRecipes, memo);
        var childB = this.buildCraftingTree(recipe.item_b, baseItems, itemToRecipes, memo);
        if (!childA || !childB) {
            memo[item] = null;
            return null;
        }
        var tree = {
            item: item,
            is_base: false,
            recipe: [recipe.item_a, recipe.item_b],
            children: [childA, childB]
        };
        memo[item] = tree;
        return tree;
    };
    /**
     * 计算树的统计信息
     */
    RecipeService.prototype.calculateTreeStats = function (tree, itemToRecipes) {
        var materials = {};
        var breadthSum = 0;
        var traverse = function (node, depth, isRoot) {
            if (isRoot === void 0) { isRoot = true; }
            // 计算该节点的广度（能匹配到的配方数量）
            // 对于基础材料，广度是使用该材料作为输入材料的配方数量
            // 对于合成材料，广度是能合成该材料的配方数量
            var recipes = itemToRecipes[node.item] || [];
            // 如果是基础材料，广度是使用该材料作为输入材料的配方数量
            if (node.is_base) {
                // 查找所有使用该基础材料作为输入材料的配方
                var inputRecipes = Object.values(itemToRecipes).flat().filter(function (recipe) {
                    return recipe.item_a === node.item || recipe.item_b === node.item;
                });
                breadthSum += inputRecipes.length;
                materials[node.item] = (materials[node.item] || 0) + 1;
                return { maxDepth: depth, steps: 0 };
            }
            // 对于合成材料，广度是能合成该材料的配方数量
            if (!isRoot) {
                breadthSum += recipes.length;
            }
            var _a = node.children, childA = _a[0], childB = _a[1];
            var resultA = traverse(childA, depth + 1, false);
            var resultB = traverse(childB, depth + 1, false);
            return {
                maxDepth: Math.max(resultA.maxDepth, resultB.maxDepth),
                steps: 1 + resultA.steps + resultB.steps
            };
        };
        var _a = traverse(tree, 0, true), maxDepth = _a.maxDepth, steps = _a.steps;
        var totalMaterials = Object.values(materials).reduce(function (sum, count) { return sum + count; }, 0);
        return {
            depth: maxDepth,
            width: steps,
            total_materials: totalMaterials,
            breadth: breadthSum,
            materials: materials
        };
    };
    /**
     * 批量获取配方（用于大数据量场景）
     */
    RecipeService.prototype.getRecipesBatch = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, batchSize, _b, lastId, search, userId, sql, sqlParams, recipes;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = params.batchSize, batchSize = _a === void 0 ? 1000 : _a, _b = params.lastId, lastId = _b === void 0 ? 0 : _b, search = params.search, userId = params.userId;
                        sql = "\n      SELECT r.*, \n             u.name as creator_name,\n             ia.emoji as item_a_emoji,\n             ib.emoji as item_b_emoji,\n             ir.emoji as result_emoji,\n             ".concat(userId ? 'CASE WHEN rl.id IS NOT NULL THEN 1 ELSE 0 END as is_liked' : '0 as is_liked', "\n      FROM recipes r\n      LEFT JOIN user u ON r.user_id = u.id\n      LEFT JOIN items ia ON ia.name = r.item_a\n      LEFT JOIN items ib ON ib.name = r.item_b  \n      LEFT JOIN items ir ON ir.name = r.result\n      ").concat(userId ? 'LEFT JOIN recipe_likes rl ON rl.recipe_id = r.id AND rl.user_id = ?' : '', "\n      WHERE r.id > ?\n    ");
                        sqlParams = [];
                        if (userId) {
                            sqlParams.push(userId);
                        }
                        sqlParams.push(lastId);
                        if (search) {
                            sql += " AND (r.item_a LIKE ? OR r.item_b LIKE ? OR r.result LIKE ?)";
                            sqlParams.push("%".concat(search, "%"), "%".concat(search, "%"), "%".concat(search, "%"));
                        }
                        sql += " ORDER BY r.id ASC LIMIT ?";
                        sqlParams.push(batchSize);
                        return [4 /*yield*/, connection_1.database.all(sql, sqlParams)];
                    case 1:
                        recipes = _c.sent();
                        return [2 /*return*/, {
                                recipes: recipes,
                                hasMore: recipes.length === batchSize,
                                lastId: recipes.length > 0 ? recipes[recipes.length - 1].id : lastId
                            }];
                }
            });
        });
    };
    /**
     * 创建优化索引
     */
    RecipeService.prototype.createOptimizedIndexes = function () {
        return __awaiter(this, void 0, void 0, function () {
            var indexes, _i, indexes_1, indexSql, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        indexes = [
                            // 复合索引优化搜索
                            'CREATE INDEX IF NOT EXISTS idx_recipes_search ON recipes(item_a, item_b, result)',
                            'CREATE INDEX IF NOT EXISTS idx_recipes_result_created ON recipes(result, created_at DESC)',
                            'CREATE INDEX IF NOT EXISTS idx_recipes_result_likes ON recipes(result, likes DESC)',
                            // 覆盖索引优化
                            'CREATE INDEX IF NOT EXISTS idx_recipes_cover ON recipes(id, created_at, likes, user_id)',
                        ];
                        _i = 0, indexes_1 = indexes;
                        _a.label = 1;
                    case 1:
                        if (!(_i < indexes_1.length)) return [3 /*break*/, 6];
                        indexSql = indexes_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, connection_1.database.run(indexSql)];
                    case 3:
                        _a.sent();
                        logger_1.logger.info('索引创建成功:', indexSql);
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        logger_1.logger.error('索引创建失败:', error_3);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 检测和分析不可及图
     */
    RecipeService.prototype.analyzeUnreachableGraphs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var recipes, items, baseItems, baseItemNames, allItemNames, _a, itemToRecipes, recipeGraph, _b, reachableItems, unreachableItems, unreachableGraphs, systemStats;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, connection_1.database.all('SELECT * FROM recipes')];
                    case 1:
                        recipes = _c.sent();
                        return [4 /*yield*/, connection_1.database.all('SELECT * FROM items')];
                    case 2:
                        items = _c.sent();
                        return [4 /*yield*/, connection_1.database.all('SELECT * FROM items WHERE is_base = 1')];
                    case 3:
                        baseItems = _c.sent();
                        baseItemNames = baseItems.map(function (item) { return item.name; });
                        allItemNames = items.map(function (item) { return item.name; });
                        _a = this.buildDependencyGraph(recipes, allItemNames), itemToRecipes = _a.itemToRecipes, recipeGraph = _a.recipeGraph;
                        _b = this.analyzeReachability(baseItemNames, itemToRecipes, allItemNames), reachableItems = _b.reachableItems, unreachableItems = _b.unreachableItems;
                        unreachableGraphs = this.buildUnreachableGraphs(unreachableItems, recipeGraph);
                        return [4 /*yield*/, this.calculateSystemStats(reachableItems, unreachableGraphs, recipes, itemToRecipes)];
                    case 4:
                        systemStats = _c.sent();
                        return [2 /*return*/, { unreachableGraphs: unreachableGraphs, systemStats: systemStats }];
                }
            });
        });
    };
    /**
     * 构建依赖图
     */
    RecipeService.prototype.buildDependencyGraph = function (recipes, allItemNames) {
        var itemToRecipes = {};
        var recipeGraph = {};
        // 初始化所有物品
        for (var _i = 0, allItemNames_1 = allItemNames; _i < allItemNames_1.length; _i++) {
            var itemName = allItemNames_1[_i];
            itemToRecipes[itemName] = [];
            recipeGraph[itemName] = [];
        }
        // 构建物品到配方的映射
        for (var _a = 0, recipes_2 = recipes; _a < recipes_2.length; _a++) {
            var recipe = recipes_2[_a];
            if (!itemToRecipes[recipe.result]) {
                itemToRecipes[recipe.result] = [];
            }
            itemToRecipes[recipe.result].push(recipe);
            // 构建依赖关系：result 依赖于 item_a 和 item_b
            if (!recipeGraph[recipe.result]) {
                recipeGraph[recipe.result] = [];
            }
            recipeGraph[recipe.result].push(recipe.item_a);
            recipeGraph[recipe.result].push(recipe.item_b);
        }
        return { itemToRecipes: itemToRecipes, recipeGraph: recipeGraph };
    };
    /**
     * 分析可达性（BFS算法）
     */
    RecipeService.prototype.analyzeReachability = function (baseItems, itemToRecipes, allItemNames) {
        var reachableItems = new Set(baseItems);
        var queue = __spreadArray([], baseItems, true);
        while (queue.length > 0) {
            var current = queue.shift();
            // 查找所有使用当前物品作为材料的配方
            for (var _i = 0, _a = Object.values(itemToRecipes).flat(); _i < _a.length; _i++) {
                var recipe = _a[_i];
                if (recipe.item_a === current || recipe.item_b === current) {
                    var result = recipe.result;
                    if (!reachableItems.has(result)) {
                        reachableItems.add(result);
                        queue.push(result);
                    }
                }
            }
        }
        // 不可及物品 = 所有物品 - 可达物品
        var unreachableItems = new Set(allItemNames.filter(function (item) { return !reachableItems.has(item); }));
        return { reachableItems: reachableItems, unreachableItems: unreachableItems };
    };
    /**
     * 构建不可达图
     */
    RecipeService.prototype.buildUnreachableGraphs = function (unreachableItems, recipeGraph) {
        var visited = new Set();
        var graphs = [];
        for (var _i = 0, unreachableItems_1 = unreachableItems; _i < unreachableItems_1.length; _i++) {
            var item = unreachableItems_1[_i];
            if (visited.has(item))
                continue;
            // 找到连通分量
            var component = this.findConnectedComponent(item, recipeGraph, unreachableItems, visited);
            // 构建图
            var graph = this.buildGraphFromComponent(component, recipeGraph);
            graphs.push(graph);
        }
        return graphs;
    };
    /**
     * 找到连通分量（DFS算法）
     */
    RecipeService.prototype.findConnectedComponent = function (startItem, recipeGraph, unreachableItems, visited) {
        var stack = [startItem];
        var component = new Set();
        while (stack.length > 0) {
            var current = stack.pop();
            if (visited.has(current))
                continue;
            visited.add(current);
            component.add(current);
            // 查找依赖关系
            var dependencies = recipeGraph[current] || [];
            for (var _i = 0, dependencies_1 = dependencies; _i < dependencies_1.length; _i++) {
                var dep = dependencies_1[_i];
                if (unreachableItems.has(dep) && !visited.has(dep)) {
                    stack.push(dep);
                }
            }
            // 查找依赖此物品的其他物品
            for (var _a = 0, _b = Object.entries(recipeGraph); _a < _b.length; _a++) {
                var _c = _b[_a], item = _c[0], deps = _c[1];
                if (unreachableItems.has(item) && deps.includes(current) && !visited.has(item)) {
                    stack.push(item);
                }
            }
        }
        return component;
    };
    /**
     * 从连通分量构建图
     */
    RecipeService.prototype.buildGraphFromComponent = function (component, recipeGraph) {
        var nodes = Array.from(component);
        var edges = [];
        // 构建边
        for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
            var node = nodes_1[_i];
            var dependencies = recipeGraph[node] || [];
            for (var _a = 0, dependencies_2 = dependencies; _a < dependencies_2.length; _a++) {
                var dep = dependencies_2[_a];
                if (component.has(dep)) {
                    edges.push({ source: node, target: dep });
                }
            }
        }
        // 分类图类型
        var type = this.classifyGraphType(nodes, edges);
        // 计算统计信息
        var stats = this.calculateUnreachableGraphStats(nodes, edges, recipeGraph);
        return {
            id: "graph_".concat(nodes.join('_').slice(0, 20)),
            type: type,
            nodes: nodes,
            edges: edges,
            stats: stats
        };
    };
    /**
     * 分类图类型
     */
    RecipeService.prototype.classifyGraphType = function (nodes, edges) {
        if (nodes.length === 1)
            return 'isolated';
        // 检查循环依赖
        if (this.hasCycle(nodes, edges))
            return 'circular';
        // 检查线性结构
        if (this.isLinear(nodes, edges))
            return 'linear';
        return 'boundary';
    };
    /**
     * 检查图中是否有循环
     */
    RecipeService.prototype.hasCycle = function (nodes, edges) {
        var visited = new Set();
        var recursionStack = new Set();
        var dfs = function (node) {
            if (recursionStack.has(node))
                return true;
            if (visited.has(node))
                return false;
            visited.add(node);
            recursionStack.add(node);
            var neighbors = edges.filter(function (e) { return e.source === node; }).map(function (e) { return e.target; });
            for (var _i = 0, neighbors_1 = neighbors; _i < neighbors_1.length; _i++) {
                var neighbor = neighbors_1[_i];
                if (dfs(neighbor))
                    return true;
            }
            recursionStack.delete(node);
            return false;
        };
        for (var _i = 0, nodes_2 = nodes; _i < nodes_2.length; _i++) {
            var node = nodes_2[_i];
            if (!visited.has(node)) {
                if (dfs(node))
                    return true;
            }
        }
        return false;
    };
    /**
     * 检查是否是线性结构
     */
    RecipeService.prototype.isLinear = function (nodes, edges) {
        // 线性图应该有 n-1 条边，且每个节点最多有两个邻居
        if (edges.length !== nodes.length - 1)
            return false;
        var degree = {};
        for (var _i = 0, nodes_3 = nodes; _i < nodes_3.length; _i++) {
            var node = nodes_3[_i];
            degree[node] = 0;
        }
        for (var _a = 0, edges_1 = edges; _a < edges_1.length; _a++) {
            var edge = edges_1[_a];
            degree[edge.source]++;
            degree[edge.target]++;
        }
        // 线性图应该有两个端节点（度数为1）和其他节点（度数为2）
        var degreeCounts = Object.values(degree);
        var ones = degreeCounts.filter(function (d) { return d === 1; }).length;
        var twos = degreeCounts.filter(function (d) { return d === 2; }).length;
        return ones === 2 && twos === nodes.length - 2;
    };
    /**
     * 计算不可及图统计信息
     */
    RecipeService.prototype.calculateUnreachableGraphStats = function (nodes, edges, recipeGraph) {
        // 计算有向图统计指标
        // 计算入度和出度
        var totalInDegree = 0;
        var totalOutDegree = 0;
        var _loop_1 = function (node) {
            // 出度：该节点依赖的其他节点数量
            var outDegree = edges.filter(function (e) { return e.source === node; }).length;
            totalOutDegree += outDegree;
            // 入度：依赖该节点的其他节点数量
            var inDegree = edges.filter(function (e) { return e.target === node; }).length;
            totalInDegree += inDegree;
        };
        for (var _i = 0, nodes_4 = nodes; _i < nodes_4.length; _i++) {
            var node = nodes_4[_i];
            _loop_1(node);
        }
        // 平均度数
        var avgDegree = nodes.length > 0 ? (totalInDegree + totalOutDegree) / nodes.length : 0;
        // 图密度（有向图密度 = 边数 / (节点数 * (节点数 - 1))）
        var density = nodes.length > 1 ? edges.length / (nodes.length * (nodes.length - 1)) : 0;
        // 聚类系数（简化计算：平均邻居连接数）
        var clusteringSum = 0;
        var _loop_2 = function (node) {
            var neighbors = new Set();
            // 添加出边邻居
            edges.filter(function (e) { return e.source === node; }).forEach(function (e) { return neighbors.add(e.target); });
            // 添加入边邻居
            edges.filter(function (e) { return e.target === node; }).forEach(function (e) { return neighbors.add(e.source); });
            var neighborCount = neighbors.size;
            if (neighborCount > 1) {
                // 计算邻居之间的实际连接数
                var actualConnections = 0;
                var neighborArray_1 = Array.from(neighbors);
                var _loop_4 = function (i) {
                    var _loop_5 = function (j) {
                        var hasEdge1 = edges.some(function (e) {
                            return (e.source === neighborArray_1[i] && e.target === neighborArray_1[j]) ||
                                (e.source === neighborArray_1[j] && e.target === neighborArray_1[i]);
                        });
                        var hasEdge2 = edges.some(function (e) {
                            return (e.source === neighborArray_1[j] && e.target === neighborArray_1[i]) ||
                                (e.source === neighborArray_1[i] && e.target === neighborArray_1[j]);
                        });
                        if (hasEdge1 || hasEdge2) {
                            actualConnections++;
                        }
                    };
                    for (var j = i + 1; j < neighborArray_1.length; j++) {
                        _loop_5(j);
                    }
                };
                for (var i = 0; i < neighborArray_1.length; i++) {
                    _loop_4(i);
                }
                var possibleConnections = neighborCount * (neighborCount - 1) / 2;
                clusteringSum += actualConnections / possibleConnections;
            }
        };
        for (var _a = 0, nodes_5 = nodes; _a < nodes_5.length; _a++) {
            var node = nodes_5[_a];
            _loop_2(node);
        }
        var clustering = nodes.length > 0 ? clusteringSum / nodes.length : 0;
        // 边界节点数（连接到合法图的节点）
        var boundaryNodes = 0;
        var _loop_3 = function (node) {
            // 检查该节点是否连接到合法图（有出边指向合法图）
            var hasBoundaryConnection = edges.some(function (e) {
                return e.source === node && !nodes.includes(e.target);
            });
            if (hasBoundaryConnection) {
                boundaryNodes++;
            }
        };
        for (var _b = 0, nodes_6 = nodes; _b < nodes_6.length; _b++) {
            var node = nodes_6[_b];
            _loop_3(node);
        }
        return {
            size: nodes.length,
            inDegree: totalInDegree,
            outDegree: totalOutDegree,
            avgDegree: avgDegree,
            density: density,
            clustering: clustering,
            boundaryNodes: boundaryNodes
        };
    };
    /**
     * 计算图深度（最长路径）
     */
    RecipeService.prototype.calculateGraphDepth = function (nodes, edges) {
        if (nodes.length === 0)
            return 0;
        if (nodes.length === 1)
            return 1;
        var maxDepth = 1;
        // 对每个节点作为起点进行BFS
        for (var _i = 0, nodes_7 = nodes; _i < nodes_7.length; _i++) {
            var startNode = nodes_7[_i];
            var visited = new Set();
            var queue = [[startNode, 1]];
            var _loop_6 = function () {
                var _a = queue.shift(), current = _a[0], depth = _a[1];
                if (visited.has(current))
                    return "continue";
                visited.add(current);
                maxDepth = Math.max(maxDepth, depth);
                // 添加邻居
                var neighbors = edges.filter(function (e) { return e.source === current; }).map(function (e) { return e.target; });
                for (var _b = 0, neighbors_2 = neighbors; _b < neighbors_2.length; _b++) {
                    var neighbor = neighbors_2[_b];
                    if (!visited.has(neighbor)) {
                        queue.push([neighbor, depth + 1]);
                    }
                }
            };
            while (queue.length > 0) {
                _loop_6();
            }
        }
        return maxDepth;
    };
    /**
     * 计算图广度（所有节点的入度之和）
     */
    RecipeService.prototype.calculateGraphBreadth = function (nodes, recipeGraph) {
        var breadth = 0;
        for (var _i = 0, nodes_8 = nodes; _i < nodes_8.length; _i++) {
            var node = nodes_8[_i];
            // 计算该节点被依赖的次数（入度）
            var inDegree = 0;
            for (var _a = 0, _b = Object.entries(recipeGraph); _a < _b.length; _a++) {
                var _c = _b[_a], item = _c[0], deps = _c[1];
                if (deps.includes(node)) {
                    inDegree++;
                }
            }
            breadth += inDegree;
        }
        return breadth;
    };
    /**
     * 计算系统统计信息
     */
    RecipeService.prototype.calculateSystemStats = function (reachableItems, unreachableGraphs, recipes, itemToRecipes) {
        return __awaiter(this, void 0, void 0, function () {
            var totalValidItems, totalUnreachableItems, unreachableGraphCount, graphTypes, _i, unreachableGraphs_1, graph, validGraphStats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        totalValidItems = reachableItems.size;
                        totalUnreachableItems = unreachableGraphs.reduce(function (sum, graph) { return sum + graph.nodes.length; }, 0);
                        unreachableGraphCount = unreachableGraphs.length;
                        graphTypes = {};
                        for (_i = 0, unreachableGraphs_1 = unreachableGraphs; _i < unreachableGraphs_1.length; _i++) {
                            graph = unreachableGraphs_1[_i];
                            graphTypes[graph.type] = (graphTypes[graph.type] || 0) + 1;
                        }
                        return [4 /*yield*/, this.calculateValidGraphStats(reachableItems, recipes, itemToRecipes)];
                    case 1:
                        validGraphStats = _a.sent();
                        return [2 /*return*/, {
                                totalValidItems: totalValidItems,
                                totalUnreachableItems: totalUnreachableItems,
                                unreachableGraphCount: unreachableGraphCount,
                                graphTypes: graphTypes,
                                validGraphStats: validGraphStats
                            }];
                }
            });
        });
    };
    /**
     * 计算合法图统计信息
     */
    RecipeService.prototype.calculateValidGraphStats = function (reachableItems, recipes, itemToRecipes) {
        return __awaiter(this, void 0, void 0, function () {
            var maxDepth, totalDepth, maxWidth, totalWidth, maxBreadth, totalBreadth, count, _i, reachableItems_1, item, result, stats, error_4, avgDepth, avgWidth, avgBreadth;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        maxDepth = 0;
                        totalDepth = 0;
                        maxWidth = 0;
                        totalWidth = 0;
                        maxBreadth = 0;
                        totalBreadth = 0;
                        count = 0;
                        _i = 0, reachableItems_1 = reachableItems;
                        _a.label = 1;
                    case 1:
                        if (!(_i < reachableItems_1.length)) return [3 /*break*/, 6];
                        item = reachableItems_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.searchPath(item)];
                    case 3:
                        result = _a.sent();
                        if (result) {
                            stats = result.stats;
                            maxDepth = Math.max(maxDepth, stats.depth);
                            totalDepth += stats.depth;
                            maxWidth = Math.max(maxWidth, stats.width);
                            totalWidth += stats.width;
                            maxBreadth = Math.max(maxBreadth, stats.breadth);
                            totalBreadth += stats.breadth;
                            count++;
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_4 = _a.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        avgDepth = count > 0 ? totalDepth / count : 0;
                        avgWidth = count > 0 ? totalWidth / count : 0;
                        avgBreadth = count > 0 ? totalBreadth / count : 0;
                        return [2 /*return*/, {
                                maxDepth: maxDepth,
                                avgDepth: avgDepth,
                                maxWidth: maxWidth,
                                avgWidth: avgWidth,
                                maxBreadth: maxBreadth,
                                avgBreadth: avgBreadth
                            }];
                }
            });
        });
    };
    /**
     * 获取物品列表
     */
    RecipeService.prototype.getItemsList = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var page, limit, _a, search, _b, type, _c, sortBy, _d, sortOrder, offset, whereConditions, queryParams, whereClause, orderClause, items, totalResult;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        page = params.page, limit = params.limit, _a = params.search, search = _a === void 0 ? '' : _a, _b = params.type, type = _b === void 0 ? '' : _b, _c = params.sortBy, sortBy = _c === void 0 ? 'name' : _c, _d = params.sortOrder, sortOrder = _d === void 0 ? 'asc' : _d;
                        offset = (page - 1) * limit;
                        whereConditions = [];
                        queryParams = [];
                        // 搜索条件
                        if (search) {
                            whereConditions.push('(name LIKE ? OR emoji LIKE ?)');
                            queryParams.push("%".concat(search, "%"), "%".concat(search, "%"));
                        }
                        // 类型条件
                        if (type === 'base') {
                            whereConditions.push('is_base = 1');
                        }
                        else if (type === 'synthetic') {
                            whereConditions.push('is_base = 0');
                        }
                        whereClause = whereConditions.length > 0 ? "WHERE ".concat(whereConditions.join(' AND ')) : '';
                        orderClause = '';
                        switch (sortBy) {
                            case 'name':
                                // 强制逻辑：没有emoji的元素排在最后
                                orderClause = "ORDER BY CASE WHEN emoji IS NULL OR emoji = '' THEN 1 ELSE 0 END, name ".concat(sortOrder.toUpperCase());
                                break;
                            case 'id':
                                // 强制逻辑：没有emoji的元素排在最后
                                orderClause = "ORDER BY CASE WHEN emoji IS NULL OR emoji = '' THEN 1 ELSE 0 END, id ".concat(sortOrder.toUpperCase());
                                break;
                            case 'usage_count':
                                // 强制逻辑：没有emoji的元素排在最后
                                orderClause = "ORDER BY CASE WHEN emoji IS NULL OR emoji = '' THEN 1 ELSE 0 END, usage_count ".concat(sortOrder.toUpperCase());
                                break;
                            default:
                                // 强制逻辑：没有emoji的元素排在最后
                                orderClause = "ORDER BY CASE WHEN emoji IS NULL OR emoji = '' THEN 1 ELSE 0 END, id ASC";
                        }
                        return [4 /*yield*/, connection_1.database.all("SELECT \n         i.*,\n         (SELECT COUNT(*) FROM recipes WHERE item_a = i.name OR item_b = i.name) as usage_count,\n         (SELECT COUNT(*) FROM recipes WHERE result = i.name) as recipe_count\n       FROM items i\n       ".concat(whereClause, "\n       ").concat(orderClause, "\n       LIMIT ? OFFSET ?"), __spreadArray(__spreadArray([], queryParams, true), [limit, offset], false))];
                    case 1:
                        items = _e.sent();
                        return [4 /*yield*/, connection_1.database.get("SELECT COUNT(*) as count FROM items ".concat(whereClause), queryParams)];
                    case 2:
                        totalResult = _e.sent();
                        return [2 /*return*/, {
                                items: items,
                                total: (totalResult === null || totalResult === void 0 ? void 0 : totalResult.count) || 0,
                                page: page,
                                limit: limit
                            }];
                }
            });
        });
    };
    return RecipeService;
}());
exports.RecipeService = RecipeService;
exports.recipeService = new RecipeService();
