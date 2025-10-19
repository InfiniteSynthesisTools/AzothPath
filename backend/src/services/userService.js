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
exports.userService = exports.UserService = void 0;
var connection_1 = require("../database/connection");
var bcryptjs_1 = require("bcryptjs");
var auth_1 = require("../middlewares/auth");
var timezone_1 = require("../utils/timezone");
/**
 * 将数据库 User 转换为公开的 UserPublic（去除密码）
 */
function toUserPublic(user) {
    return {
        id: user.id,
        name: user.name,
        auth: user.auth,
        contribute: user.contribute,
        level: user.level,
        created_at: (0, timezone_1.convertUTCToUTC8ForDB)(new Date(user.created_at))
    };
}
/**
 * 转换数据库时间字段为UTC+8格式
 */
function convertDBTimeToUTC8(dbTime) {
    return (0, timezone_1.convertUTCToUTC8ForDB)(new Date(dbTime));
}
var UserService = /** @class */ (function () {
    function UserService() {
    }
    /**
     * 用户注册
     */
    UserService.prototype.register = function (username, password) {
        return __awaiter(this, void 0, void 0, function () {
            var existingUser, hashedPassword, result, token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT * FROM user WHERE name = ?', [username])];
                    case 1:
                        existingUser = _a.sent();
                        if (existingUser) {
                            throw new Error('用户名已存在');
                        }
                        return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
                    case 2:
                        hashedPassword = _a.sent();
                        return [4 /*yield*/, connection_1.database.run('INSERT INTO user (name, psw, auth, contribute) VALUES (?, ?, ?, ?)', [username, hashedPassword, 1, 0] // auth=1 表示普通用户
                            )];
                    case 3:
                        result = _a.sent();
                        token = (0, auth_1.generateToken)(result.lastID, 'user');
                        return [2 /*return*/, {
                                token: token,
                                user: {
                                    id: result.lastID,
                                    name: username,
                                    auth: 1, // 普通用户
                                    contribute: 0,
                                    level: 1,
                                    created_at: (0, timezone_1.getCurrentUTC8TimeForDB)()
                                }
                            }];
                }
            });
        });
    };
    /**
     * 用户登录
     */
    UserService.prototype.login = function (username, password) {
        return __awaiter(this, void 0, void 0, function () {
            var user, isValid, role, token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT * FROM user WHERE name = ?', [username])];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('用户名或密码错误');
                        }
                        return [4 /*yield*/, bcryptjs_1.default.compare(password, user.psw)];
                    case 2:
                        isValid = _a.sent();
                        if (!isValid) {
                            throw new Error('用户名或密码错误');
                        }
                        role = user.auth === 9 ? 'admin' : 'user';
                        token = (0, auth_1.generateToken)(user.id, role);
                        return [2 /*return*/, {
                                token: token,
                                user: toUserPublic(user)
                            }];
                }
            });
        });
    };
    /**
     * 获取当前用户信息
     */
    UserService.prototype.getCurrentUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT * FROM user WHERE id = ?', [userId])];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('用户不存在');
                        }
                        return [2 /*return*/, toUserPublic(user)];
                }
            });
        });
    };
    /**
     * 获取特定用户信息（公开信息）
     */
    UserService.prototype.getUserById = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT * FROM user WHERE id = ?', [userId])];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('用户不存在');
                        }
                        return [2 /*return*/, toUserPublic(user)];
                }
            });
        });
    };
    /**
     * 获取贡献榜（实时计算）
     */
    UserService.prototype.getContributionRank = function () {
        return __awaiter(this, arguments, void 0, function (page, limit) {
            var offset, users, totalResult;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, connection_1.database.all("SELECT \n         u.id, \n         u.name, \n         u.auth, \n         u.contribute, \n         u.level,\n         u.created_at,\n         (SELECT COUNT(*) FROM recipes WHERE user_id = u.id) as recipe_count,\n         (SELECT COUNT(DISTINCT i.id) \n          FROM items i \n          INNER JOIN recipes r ON (r.item_a = i.name OR r.item_b = i.name OR r.result = i.name)\n          WHERE r.user_id = u.id) as item_count\n       FROM user u\n       WHERE 1=1\n       ORDER BY u.contribute DESC, u.created_at ASC\n       LIMIT ? OFFSET ?", [limit, offset])];
                    case 1:
                        users = _a.sent();
                        return [4 /*yield*/, connection_1.database.get('SELECT COUNT(*) as count FROM user')];
                    case 2:
                        totalResult = _a.sent();
                        return [2 /*return*/, {
                                users: users,
                                total: (totalResult === null || totalResult === void 0 ? void 0 : totalResult.count) || 0,
                                page: page,
                                limit: limit
                            }];
                }
            });
        });
    };
    /**
     * 获取用户详细贡献统计
     */
    UserService.prototype.getUserContributionStats = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, recipeCount, itemCount, taskCount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.get('SELECT id, name, auth, contribute, level, created_at FROM user WHERE id = ?', [userId])];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('用户不存在');
                        }
                        // 转换时间为UTC+8
                        user.created_at = convertDBTimeToUTC8(user.created_at);
                        return [4 /*yield*/, connection_1.database.get('SELECT COUNT(*) as count FROM recipes WHERE user_id = ?', [userId])];
                    case 2:
                        recipeCount = _a.sent();
                        return [4 /*yield*/, connection_1.database.get("SELECT COUNT(DISTINCT i.id) as count\n       FROM items i \n       INNER JOIN recipes r ON (r.item_a = i.name OR r.item_b = i.name OR r.result = i.name)\n       WHERE r.user_id = ?", [userId])];
                    case 3:
                        itemCount = _a.sent();
                        return [4 /*yield*/, connection_1.database.get("SELECT COUNT(*) as count \n       FROM task \n       WHERE completed_by_recipe_id IN (SELECT id FROM recipes WHERE user_id = ?)", [userId])];
                    case 4:
                        taskCount = _a.sent();
                        return [2 /*return*/, {
                                user: user,
                                stats: {
                                    total_contribution: user.contribute,
                                    recipe_count: (recipeCount === null || recipeCount === void 0 ? void 0 : recipeCount.count) || 0,
                                    item_count: (itemCount === null || itemCount === void 0 ? void 0 : itemCount.count) || 0,
                                    task_completed: (taskCount === null || taskCount === void 0 ? void 0 : taskCount.count) || 0
                                }
                            }];
                }
            });
        });
    };
    /**
     * 获取用户点赞的配方列表
     */
    UserService.prototype.getUserLikedRecipes = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, page, limit) {
            var offset, user, recipes, totalResult;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 20; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, connection_1.database.get('SELECT id FROM user WHERE id = ?', [userId])];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('用户不存在');
                        }
                        return [4 /*yield*/, connection_1.database.all("\n      SELECT \n        r.id,\n        r.item_a,\n        r.item_b,\n        r.result,\n        r.user_id,\n        r.likes,\n        r.created_at,\n        u.name as creator_name,\n        rl.created_at as liked_at\n      FROM recipe_likes rl\n      INNER JOIN recipes r ON rl.recipe_id = r.id\n      INNER JOIN user u ON r.user_id = u.id\n      WHERE rl.user_id = ?\n      ORDER BY rl.created_at DESC\n      LIMIT ? OFFSET ?\n    ", [userId, limit, offset])];
                    case 2:
                        recipes = _a.sent();
                        return [4 /*yield*/, connection_1.database.get("\n      SELECT COUNT(*) as count \n      FROM recipe_likes \n      WHERE user_id = ?\n    ", [userId])];
                    case 3:
                        totalResult = _a.sent();
                        return [2 /*return*/, {
                                recipes: recipes,
                                total: (totalResult === null || totalResult === void 0 ? void 0 : totalResult.count) || 0,
                                page: page,
                                limit: limit
                            }];
                }
            });
        });
    };
    /**
     * 增加用户贡献度
     */
    UserService.prototype.incrementContribution = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, amount) {
            if (amount === void 0) { amount = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.database.run('UPDATE user SET contribute = contribute + ? WHERE id = ?', [amount, userId])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return UserService;
}());
exports.UserService = UserService;
exports.userService = new UserService();
