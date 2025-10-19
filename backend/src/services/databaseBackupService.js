"use strict";
/**
 * 数据库自动备份服务
 *
 * 功能：
 * 1. 每2小时执行一次备份
 * 2. 执行 WAL checkpoint（将WAL日志合并到主数据库）
 * 3. 复制数据库文件到备份目录
 * 4. 保留最近N个备份文件
 * 5. 清理过期备份
 */
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
exports.databaseBackupService = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var connection_1 = require("../database/connection");
var logger_1 = require("../utils/logger");
var DatabaseBackupService = /** @class */ (function () {
    function DatabaseBackupService() {
        this.timer = null;
        this.isRunning = false;
        // 从环境变量读取配置
        var dbPath = process.env.DB_PATH
            ? path_1.default.resolve(path_1.default.join(__dirname, '../../'), process.env.DB_PATH)
            : path_1.default.resolve(path_1.default.join(__dirname, '../../'), 'database/azothpath.db');
        this.config = {
            enabled: process.env.DB_BACKUP_ENABLED !== 'false', // 默认启用
            intervalHours: parseInt(process.env.DB_BACKUP_INTERVAL_HOURS || '2'), // 默认2小时
            backupDir: process.env.DB_BACKUP_DIR
                ? path_1.default.resolve(path_1.default.join(__dirname, '../../'), process.env.DB_BACKUP_DIR)
                : path_1.default.resolve(path_1.default.join(__dirname, '../../'), 'database/backups'),
            maxBackups: parseInt(process.env.DB_BACKUP_MAX_COUNT || '24'), // 默认保留24个备份（2天）
            dbPath: dbPath
        };
        logger_1.logger.info('数据库备份服务配置', {
            enabled: this.config.enabled,
            intervalHours: this.config.intervalHours,
            backupDir: this.config.backupDir,
            maxBackups: this.config.maxBackups,
            dbPath: this.config.dbPath
        });
    }
    /**
     * 启动自动备份服务
     */
    DatabaseBackupService.prototype.start = function () {
        var _this = this;
        if (!this.config.enabled) {
            logger_1.logger.info('数据库自动备份已禁用');
            return;
        }
        if (this.isRunning) {
            logger_1.logger.warn('数据库备份服务已在运行');
            return;
        }
        // 确保备份目录存在
        this.ensureBackupDirExists();
        // 立即执行一次备份
        this.performBackup().catch(function (err) {
            logger_1.logger.error('首次备份失败', err);
        });
        // 设置定时任务
        var intervalMs = this.config.intervalHours * 60 * 60 * 1000;
        this.timer = setInterval(function () {
            _this.performBackup().catch(function (err) {
                logger_1.logger.error('定时备份失败', err);
            });
        }, intervalMs);
        this.isRunning = true;
        logger_1.logger.success("\u6570\u636E\u5E93\u81EA\u52A8\u5907\u4EFD\u670D\u52A1\u5DF2\u542F\u52A8 (\u95F4\u9694: ".concat(this.config.intervalHours, "\u5C0F\u65F6)"));
    };
    /**
     * 停止自动备份服务
     */
    DatabaseBackupService.prototype.stop = function () {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        logger_1.logger.info('数据库自动备份服务已停止');
    };
    /**
     * 执行备份
     */
    DatabaseBackupService.prototype.performBackup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, timestamp, backupFileName, backupFilePath, duration, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.logger.info('开始数据库备份...');
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        // 1. 执行 WAL checkpoint
                        return [4 /*yield*/, this.walCheckpoint()];
                    case 2:
                        // 1. 执行 WAL checkpoint
                        _a.sent();
                        timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                        backupFileName = "azothpath_backup_".concat(timestamp, ".db");
                        backupFilePath = path_1.default.join(this.config.backupDir, backupFileName);
                        // 3. 复制数据库文件
                        return [4 /*yield*/, this.copyDatabase(backupFilePath)];
                    case 3:
                        // 3. 复制数据库文件
                        _a.sent();
                        // 4. 清理旧备份
                        return [4 /*yield*/, this.cleanupOldBackups()];
                    case 4:
                        // 4. 清理旧备份
                        _a.sent();
                        duration = Date.now() - startTime;
                        logger_1.logger.success("\u6570\u636E\u5E93\u5907\u4EFD\u5B8C\u6210: ".concat(backupFileName, " (\u8017\u65F6: ").concat(duration, "ms)"));
                        return [2 /*return*/, backupFilePath];
                    case 5:
                        error_1 = _a.sent();
                        logger_1.logger.error('数据库备份失败', error_1);
                        throw error_1;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 执行 WAL checkpoint（将WAL日志合并到主数据库）
     */
    DatabaseBackupService.prototype.walCheckpoint = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                logger_1.logger.debug('执行 WAL checkpoint...');
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var db, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, (0, connection_1.getDatabase)()];
                                case 1:
                                    db = _a.sent();
                                    // PRAGMA wal_checkpoint(FULL) - 合并WAL
                                    db.run('PRAGMA wal_checkpoint(FULL)', function (err) {
                                        if (err) {
                                            logger_1.logger.error('WAL checkpoint 失败', err);
                                            reject(err);
                                        }
                                        else {
                                            logger_1.logger.debug('WAL checkpoint 完成');
                                            resolve();
                                        }
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_2 = _a.sent();
                                    reject(error_2);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    /**
     * 复制数据库文件
     */
    DatabaseBackupService.prototype.copyDatabase = function (destPath) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                logger_1.logger.debug("\u590D\u5236\u6570\u636E\u5E93\u6587\u4EF6: ".concat(this.config.dbPath, " -> ").concat(destPath));
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        // 检查源文件是否存在
                        if (!fs_1.default.existsSync(_this.config.dbPath)) {
                            reject(new Error("\u6570\u636E\u5E93\u6587\u4EF6\u4E0D\u5B58\u5728: ".concat(_this.config.dbPath)));
                            return;
                        }
                        // 使用流复制文件（适合大文件）
                        var readStream = fs_1.default.createReadStream(_this.config.dbPath);
                        var writeStream = fs_1.default.createWriteStream(destPath);
                        readStream.on('error', function (err) {
                            logger_1.logger.error('读取数据库文件失败', err);
                            reject(err);
                        });
                        writeStream.on('error', function (err) {
                            logger_1.logger.error('写入备份文件失败', err);
                            reject(err);
                        });
                        writeStream.on('finish', function () {
                            logger_1.logger.debug('数据库文件复制完成');
                            resolve();
                        });
                        readStream.pipe(writeStream);
                    })];
            });
        });
    };
    /**
     * 清理旧备份（保留最近N个）
     */
    DatabaseBackupService.prototype.cleanupOldBackups = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, filesToDelete, _i, filesToDelete_1, file;
            var _this = this;
            return __generator(this, function (_a) {
                logger_1.logger.debug('清理旧备份...');
                try {
                    files = fs_1.default.readdirSync(this.config.backupDir)
                        .filter(function (file) { return file.startsWith('azothpath_backup_') && file.endsWith('.db'); })
                        .map(function (file) { return ({
                        name: file,
                        path: path_1.default.join(_this.config.backupDir, file),
                        stat: fs_1.default.statSync(path_1.default.join(_this.config.backupDir, file))
                    }); })
                        .sort(function (a, b) { return b.stat.mtime.getTime() - a.stat.mtime.getTime(); });
                    // 如果备份数量超过限制，删除最旧的
                    if (files.length > this.config.maxBackups) {
                        filesToDelete = files.slice(this.config.maxBackups);
                        for (_i = 0, filesToDelete_1 = filesToDelete; _i < filesToDelete_1.length; _i++) {
                            file = filesToDelete_1[_i];
                            try {
                                fs_1.default.unlinkSync(file.path);
                                logger_1.logger.debug("\u5220\u9664\u65E7\u5907\u4EFD: ".concat(file.name));
                            }
                            catch (err) {
                                logger_1.logger.warn("\u5220\u9664\u5907\u4EFD\u6587\u4EF6\u5931\u8D25: ".concat(file.name), err);
                            }
                        }
                        logger_1.logger.info("\u6E05\u7406\u65E7\u5907\u4EFD\u5B8C\u6210 (\u5220\u9664 ".concat(filesToDelete.length, " \u4E2A\u6587\u4EF6)"));
                    }
                    else {
                        logger_1.logger.debug("\u5907\u4EFD\u6570\u91CF\u672A\u8D85\u8FC7\u9650\u5236 (".concat(files.length, "/").concat(this.config.maxBackups, ")"));
                    }
                }
                catch (error) {
                    logger_1.logger.error('清理旧备份失败', error);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 确保备份目录存在
     */
    DatabaseBackupService.prototype.ensureBackupDirExists = function () {
        if (!fs_1.default.existsSync(this.config.backupDir)) {
            logger_1.logger.info('创建备份目录', { path: this.config.backupDir });
            fs_1.default.mkdirSync(this.config.backupDir, { recursive: true });
        }
    };
    /**
     * 获取所有备份文件列表
     */
    DatabaseBackupService.prototype.getBackupList = function () {
        var _this = this;
        this.ensureBackupDirExists();
        try {
            var files = fs_1.default.readdirSync(this.config.backupDir)
                .filter(function (file) { return file.startsWith('azothpath_backup_') && file.endsWith('.db'); })
                .map(function (file) {
                var filePath = path_1.default.join(_this.config.backupDir, file);
                var stat = fs_1.default.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    size: stat.size,
                    mtime: stat.mtime
                };
            })
                .sort(function (a, b) { return b.mtime.getTime() - a.mtime.getTime(); });
            return files;
        }
        catch (error) {
            logger_1.logger.error('读取备份列表失败', error);
            return [];
        }
    };
    /**
     * 手动触发备份
     */
    DatabaseBackupService.prototype.manualBackup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger_1.logger.info('手动触发数据库备份');
                return [2 /*return*/, this.performBackup()];
            });
        });
    };
    /**
     * 获取备份服务状态
     */
    DatabaseBackupService.prototype.getStatus = function () {
        return {
            enabled: this.config.enabled,
            isRunning: this.isRunning,
            config: this.config,
            backupCount: this.getBackupList().length
        };
    };
    return DatabaseBackupService;
}());
// 创建单例实例
exports.databaseBackupService = new DatabaseBackupService();
