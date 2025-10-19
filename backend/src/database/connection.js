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
exports.database = exports.Database = void 0;
exports.getDatabase = getDatabase;
exports.initDatabase = initDatabase;
var sqlite3_1 = require("sqlite3");
var path_1 = require("path");
var fs_1 = require("fs");
var logger_1 = require("../utils/logger");
// 数据库路径配置 - 默认使用 backend 目录下的 database 文件夹
var DB_PATH = process.env.DB_PATH
    ? path_1.default.resolve(path_1.default.join(__dirname, '../../'), process.env.DB_PATH)
    : path_1.default.resolve(path_1.default.join(__dirname, '../../'), 'database/azothpath.db');
var INIT_SQL_PATH = path_1.default.resolve(path_1.default.join(__dirname, '../../'), 'database/init.sql');
// 确保数据库目录存在
var dbDir = path_1.default.dirname(DB_PATH);
if (!fs_1.default.existsSync(dbDir)) {
    logger_1.logger.info('创建数据库目录', { path: dbDir });
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
// 检查数据库文件是否存在
var dbExists = fs_1.default.existsSync(DB_PATH);
if (!dbExists) {
    logger_1.logger.info('数据库文件不存在，将在首次连接时自动初始化');
}
logger_1.logger.database("\u6570\u636E\u5E93\u5DF2\u914D\u7F6E - ".concat(dbExists ? '文件存在' : '文件不存在，将自动创建'));
// 创建数据库连接
var db = null;
/**
 * 初始化数据库
 */
function initDatabase() {
    return __awaiter(this, arguments, void 0, function (force) {
        var filesToDelete, initSQL;
        if (force === void 0) { force = false; }
        return __generator(this, function (_a) {
            logger_1.logger.info('开始初始化数据库...');
            // 如果强制重建，删除旧数据库和相关文件
            if (force && fs_1.default.existsSync(DB_PATH)) {
                logger_1.logger.warn('强制模式: 删除现有数据库...');
                filesToDelete = [
                    DB_PATH,
                    DB_PATH + '-wal',
                    DB_PATH + '-shm'
                ];
                filesToDelete.forEach(function (file) {
                    if (fs_1.default.existsSync(file)) {
                        try {
                            fs_1.default.unlinkSync(file);
                            logger_1.logger.debug("\u5220\u9664\u6587\u4EF6: ".concat(file));
                        }
                        catch (err) {
                            logger_1.logger.warn("\u5220\u9664\u6587\u4EF6\u5931\u8D25: ".concat(file), err);
                        }
                    }
                });
                logger_1.logger.success('旧数据库已删除');
            }
            initSQL = fs_1.default.readFileSync(INIT_SQL_PATH, 'utf8');
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    // 使用更长的超时时间和重试机制
                    var tempDb = new sqlite3_1.default.Database(DB_PATH, sqlite3_1.default.OPEN_READWRITE | sqlite3_1.default.OPEN_CREATE, function (err) {
                        if (err) {
                            logger_1.logger.error('数据库文件打开失败', err);
                            reject(err);
                            return;
                        }
                        logger_1.logger.success('数据库文件已打开');
                        // 设置数据库参数
                        tempDb.run('PRAGMA busy_timeout = 10000', function (err) {
                            if (err) {
                                logger_1.logger.warn('设置busy_timeout失败', err);
                            }
                        });
                        // 执行初始化SQL
                        tempDb.exec(initSQL, function (err) {
                            if (err) {
                                logger_1.logger.error('执行初始化SQL失败', err);
                                tempDb.close();
                                reject(err);
                                return;
                            }
                            logger_1.logger.success('数据库表创建成功');
                            tempDb.close(function (err) {
                                if (err) {
                                    logger_1.logger.error('关闭数据库失败', err);
                                    reject(err);
                                }
                                else {
                                    logger_1.logger.success('数据库初始化完成!');
                                    resolve();
                                }
                            });
                        });
                    });
                })];
        });
    });
}
function getDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!db) return [3 /*break*/, 5];
                    if (!!fs_1.default.existsSync(DB_PATH)) return [3 /*break*/, 4];
                    logger_1.logger.info('数据库文件不存在，开始自动初始化...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, initDatabase()];
                case 2:
                    _a.sent();
                    logger_1.logger.success('数据库初始化完成');
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    logger_1.logger.error('数据库初始化失败', error_1);
                    throw error_1;
                case 4:
                    db = new sqlite3_1.default.Database(DB_PATH, sqlite3_1.default.OPEN_READWRITE | sqlite3_1.default.OPEN_CREATE, function (err) {
                        if (err) {
                            logger_1.logger.error('数据库连接失败', err);
                            throw err;
                        }
                        logger_1.logger.success('数据库连接成功');
                    });
                    // 配置数据库参数
                    db.run('PRAGMA foreign_keys = ON');
                    db.run('PRAGMA journal_mode = WAL');
                    db.run('PRAGMA synchronous = NORMAL');
                    db.run('PRAGMA cache_size = -2000');
                    db.run('PRAGMA busy_timeout = 5000');
                    _a.label = 5;
                case 5: return [2 /*return*/, db];
            }
        });
    });
}
// Promise 化的数据库方法
var Database = /** @class */ (function () {
    function Database() {
        this.db = null;
        this.initialized = false;
    }
    Database.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 3];
                        if (!!db) return [3 /*break*/, 2];
                        return [4 /*yield*/, getDatabase()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.db = db;
                        this.initialized = true;
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Database.prototype.ensureInitialized = function () {
        if (!this.db || !this.initialized) {
            throw new Error('数据库未初始化，请先调用 init() 方法');
        }
        return this.db;
    };
    // 执行查询（返回所有结果）
    Database.prototype.all = function (sql, params) {
        if (params === void 0) { params = []; }
        var db = this.ensureInitialized();
        return new Promise(function (resolve, reject) {
            db.all(sql, params, function (err, rows) {
                if (err) {
                    logger_1.logger.error('SQL查询失败', { sql: sql, params: params, error: err });
                    reject(err);
                }
                else
                    resolve(rows);
            });
        });
    };
    // 执行查询（返回单个结果）
    Database.prototype.get = function (sql, params) {
        if (params === void 0) { params = []; }
        var db = this.ensureInitialized();
        return new Promise(function (resolve, reject) {
            db.get(sql, params, function (err, row) {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    };
    // 执行修改操作（INSERT, UPDATE, DELETE）
    Database.prototype.run = function (sql, params) {
        if (params === void 0) { params = []; }
        var db = this.ensureInitialized();
        return new Promise(function (resolve, reject) {
            db.run(sql, params, function (err) {
                if (err)
                    reject(err);
                else
                    resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    };
    // 执行事务
    Database.prototype.transaction = function (callback) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.run('BEGIN TRANSACTION')];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 7]);
                        return [4 /*yield*/, callback(this)];
                    case 3:
                        result = _a.sent();
                        return [4 /*yield*/, this.run('COMMIT')];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, result];
                    case 5:
                        error_2 = _a.sent();
                        return [4 /*yield*/, this.run('ROLLBACK')];
                    case 6:
                        _a.sent();
                        throw error_2;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // 关闭数据库连接
    Database.prototype.close = function () {
        var _this = this;
        var database = this.ensureInitialized();
        return new Promise(function (resolve, reject) {
            database.close(function (err) {
                if (err)
                    reject(err);
                else {
                    _this.db = null;
                    _this.initialized = false;
                    resolve();
                }
            });
        });
    };
    return Database;
}());
exports.Database = Database;
// 创建单例实例
var database = new Database();
exports.database = database;
// 如果直接运行此脚本
if (require.main === module) {
    // 检查命令行参数
    var forceMode = process.argv.includes('--force') || process.argv.includes('-f');
    if (forceMode) {
        logger_1.logger.warn('强制模式已启用 - 现有数据库将被删除!');
    }
    initDatabase(forceMode)
        .then(function () {
        logger_1.logger.success('所有操作完成!');
        process.exit(0);
    })
        .catch(function (err) {
        logger_1.logger.error('初始化失败', err);
        process.exit(1);
    });
}
