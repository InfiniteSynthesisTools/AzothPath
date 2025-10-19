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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var logger_1 = require("../utils/logger");
var databaseBackupService_1 = require("../services/databaseBackupService");
var os_1 = require("os");
var process_1 = require("process");
var fs_1 = require("fs");
var router = express_1.default.Router();
/**
 * GET /api/system/info
 * 获取系统信息
 */
router.get('/info', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var cpus, cpuUsage, totalMem, freeMem, usedMem, diskUsage, systemInfo, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                cpus = os_1.default.cpus();
                return [4 /*yield*/, getCpuUsage()];
            case 1:
                cpuUsage = _b.sent();
                totalMem = os_1.default.totalmem();
                freeMem = os_1.default.freemem();
                usedMem = totalMem - freeMem;
                return [4 /*yield*/, getDiskUsage()];
            case 2:
                diskUsage = _b.sent();
                systemInfo = {
                    cpu: {
                        usage: cpuUsage,
                        cores: cpus.length,
                        model: ((_a = cpus[0]) === null || _a === void 0 ? void 0 : _a.model) || 'Unknown'
                    },
                    memory: {
                        total: totalMem,
                        used: usedMem,
                        free: freeMem,
                        cached: 0, // 简化处理
                        usage: Math.round((usedMem / totalMem) * 100 * 10) / 10
                    },
                    disk: {
                        total: diskUsage.total,
                        used: diskUsage.used,
                        free: diskUsage.free,
                        usage: diskUsage.usage,
                        path: diskUsage.path
                    },
                    os: {
                        platform: os_1.default.platform(),
                        version: os_1.default.release(),
                        arch: os_1.default.arch(),
                        hostname: os_1.default.hostname()
                    },
                    node: {
                        version: process_1.default.version,
                        uptime: process_1.default.uptime()
                    },
                    uptime: Math.round(os_1.default.uptime() / 3600 * 10) / 10,
                    startTime: new Date(Date.now() - os_1.default.uptime() * 1000).toISOString()
                };
                res.json({
                    code: 200,
                    message: '获取系统信息成功',
                    data: systemInfo
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                logger_1.logger.error('获取系统信息失败', error_1);
                res.status(500).json({
                    code: 500,
                    message: error_1.message || '获取系统信息失败'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 获取CPU使用率
 */
function getCpuUsage() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var startMeasure = process_1.default.cpuUsage();
                    setTimeout(function () {
                        var endMeasure = process_1.default.cpuUsage(startMeasure);
                        var totalUsage = (endMeasure.user + endMeasure.system) / 1000000; // 转换为秒
                        var percentage = Math.min(100, Math.round(totalUsage * 100 * 10) / 10);
                        resolve(percentage);
                    }, 100);
                })];
        });
    });
}
/**
 * 获取磁盘使用率
 */
function getDiskUsage() {
    return __awaiter(this, void 0, void 0, function () {
        var currentDir, stats, diskStats, execSync, dfOutput, lines, parts, totalStr, usedStr, availableStr, parseSize, total, used, free, usage;
        return __generator(this, function (_a) {
            try {
                currentDir = process_1.default.cwd();
                stats = fs_1.default.statSync(currentDir);
                diskStats = {
                    total: 100 * 1024 * 1024 * 1024, // 100GB - 简化处理
                    used: 30 * 1024 * 1024 * 1024, // 30GB - 简化处理
                    free: 70 * 1024 * 1024 * 1024, // 70GB - 简化处理
                    usage: 30,
                    path: currentDir
                };
                // 尝试获取更准确的磁盘信息（如果可用）
                try {
                    execSync = require('child_process').execSync;
                    dfOutput = execSync('df -h .', { encoding: 'utf8' });
                    lines = dfOutput.trim().split('\n');
                    if (lines.length > 1) {
                        parts = lines[1].split(/\s+/);
                        if (parts.length >= 4) {
                            totalStr = parts[1];
                            usedStr = parts[2];
                            availableStr = parts[3];
                            parseSize = function (sizeStr) {
                                var size = parseFloat(sizeStr);
                                if (sizeStr.includes('G'))
                                    return size * 1024 * 1024 * 1024;
                                if (sizeStr.includes('M'))
                                    return size * 1024 * 1024;
                                if (sizeStr.includes('K'))
                                    return size * 1024;
                                return size;
                            };
                            total = parseSize(totalStr);
                            used = parseSize(usedStr);
                            free = parseSize(availableStr);
                            usage = Math.round((used / total) * 100);
                            return [2 /*return*/, {
                                    total: total,
                                    used: used,
                                    free: free,
                                    usage: usage,
                                    path: currentDir
                                }];
                        }
                    }
                }
                catch (error) {
                    // 如果 df 命令失败，使用默认值
                    logger_1.logger.warn('无法获取详细磁盘信息，使用默认值', error);
                }
                return [2 /*return*/, diskStats];
            }
            catch (error) {
                logger_1.logger.error('获取磁盘信息失败', error);
                return [2 /*return*/, {
                        total: 100 * 1024 * 1024 * 1024,
                        used: 30 * 1024 * 1024 * 1024,
                        free: 70 * 1024 * 1024 * 1024,
                        usage: 30,
                        path: process_1.default.cwd()
                    }];
            }
            return [2 /*return*/];
        });
    });
}
/**
 * GET /api/system/backup/status
 * 获取数据库备份状态
 */
router.get('/backup/status', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status_1, backupList;
    return __generator(this, function (_a) {
        try {
            status_1 = databaseBackupService_1.databaseBackupService.getStatus();
            backupList = databaseBackupService_1.databaseBackupService.getBackupList();
            res.json({
                code: 200,
                message: '获取备份状态成功',
                data: __assign(__assign({}, status_1), { backups: backupList.map(function (backup) { return ({
                        name: backup.name,
                        size: backup.size,
                        sizeFormatted: formatBytes(backup.size),
                        createdAt: backup.mtime.toISOString()
                    }); }) })
            });
        }
        catch (error) {
            logger_1.logger.error('获取备份状态失败', error);
            res.status(500).json({
                code: 500,
                message: error.message || '获取备份状态失败'
            });
        }
        return [2 /*return*/];
    });
}); });
/**
 * POST /api/system/backup/manual
 * 手动触发数据库备份
 */
router.post('/backup/manual', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var backupPath, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                logger_1.logger.info('收到手动备份请求');
                return [4 /*yield*/, databaseBackupService_1.databaseBackupService.manualBackup()];
            case 1:
                backupPath = _a.sent();
                res.json({
                    code: 200,
                    message: '备份成功',
                    data: {
                        backupPath: backupPath,
                        timestamp: new Date().toISOString()
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                logger_1.logger.error('手动备份失败', error_2);
                res.status(500).json({
                    code: 500,
                    message: error_2.message || '备份失败'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 格式化字节数
 */
function formatBytes(bytes, decimals) {
    if (decimals === void 0) { decimals = 2; }
    if (bytes === 0)
        return '0 Bytes';
    var k = 1024;
    var dm = decimals < 0 ? 0 : decimals;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
exports.default = router;
