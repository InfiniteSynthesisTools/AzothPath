"use strict";
/**
 * 统一日志工具
 * 提供结构化的日志输出，支持不同级别和颜色
 * 所有时间显示统一使用UTC+8
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var timezone_1 = require("./timezone");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["SUCCESS"] = 2] = "SUCCESS";
    LogLevel[LogLevel["DATABASE"] = 3] = "DATABASE";
    LogLevel[LogLevel["API"] = 4] = "API";
    LogLevel[LogLevel["INFO"] = 5] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 6] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var Logger = /** @class */ (function () {
    function Logger() {
        this.level = process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO;
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }
    /**
     * 检查是否支持颜色输出
     */
    Logger.prototype.supportsColor = function () {
        // 检查环境变量
        if (process.env.NO_COLOR) {
            return false;
        }
        // 强制启用颜色
        if (process.env.FORCE_COLOR === '1' || process.env.FORCE_COLOR === '2' || process.env.FORCE_COLOR === '3') {
            return true;
        }
        // 检查终端类型
        var term = process.env.TERM;
        if (term && (term.includes('color') || term.includes('256'))) {
            return true;
        }
        // 检查是否为TTY
        if (process.stdout.isTTY) {
            return true;
        }
        // 开发环境默认启用颜色
        return this.isDevelopment;
    };
    Logger.prototype.formatMessage = function (level, message, data) {
        var utc8Time = (0, timezone_1.getCurrentUTC8Time)();
        // 使用UTC+8时间格式化
        var timestamp = (0, timezone_1.formatDateTimeForDB)(utc8Time);
        var prefix = "[".concat(timestamp, "] ").concat(level, ":");
        if (data) {
            return "".concat(prefix, " ").concat(message, " ").concat(JSON.stringify(data));
        }
        return "".concat(prefix, " ").concat(message);
    };
    Logger.prototype.log = function (level, levelName, message, data) {
        if (level <= this.level) {
            var formattedMessage = this.formatMessage(levelName, message, data);
            var coloredMessage = this.supportsColor() ? this.addColor(level, formattedMessage) : formattedMessage;
            switch (level) {
                case LogLevel.ERROR:
                    console.error(coloredMessage);
                    break;
                case LogLevel.WARN:
                    console.warn(coloredMessage);
                    break;
                case LogLevel.SUCCESS:
                    console.log(coloredMessage); // SUCCESS使用console.log，显示绿色
                    break;
                default:
                    console.log(coloredMessage);
            }
        }
    };
    /**
     * 为日志消息添加颜色
     */
    Logger.prototype.addColor = function (level, message) {
        var resetColor = '\x1b[0m'; // 重置颜色
        var color = '\x1b[36m'; // 默认青色
        switch (level) {
            case LogLevel.ERROR:
                color = '\x1b[31m'; // 红色
                break;
            case LogLevel.WARN:
                color = '\x1b[33m'; // 黄色
                break;
            case LogLevel.INFO:
                color = '\x1b[36m'; // 青色
                break;
            case LogLevel.SUCCESS:
                color = '\x1b[32m'; // 绿色
                break;
            case LogLevel.DEBUG:
                color = '\x1b[37m'; // 白色
                break;
            case LogLevel.DATABASE:
                color = '\x1b[35m'; // 紫色
                break;
            case LogLevel.API:
                color = '\x1b[34m'; // 蓝色
                break;
        }
        return "".concat(color).concat(message).concat(resetColor);
    };
    Logger.prototype.error = function (message, data) {
        this.log(LogLevel.ERROR, 'ERROR', message, data);
    };
    Logger.prototype.warn = function (message, data) {
        this.log(LogLevel.WARN, 'WARN', message, data);
    };
    Logger.prototype.info = function (message, data) {
        this.log(LogLevel.INFO, 'INFO', message, data);
    };
    Logger.prototype.debug = function (message, data) {
        this.log(LogLevel.DEBUG, 'DEBUG', message, data);
    };
    Logger.prototype.success = function (message, data) {
        this.log(LogLevel.SUCCESS, 'SUCCESS', message, data);
    };
    Logger.prototype.database = function (message, data) {
        this.log(LogLevel.DATABASE, 'DATABASE', message, data);
    };
    Logger.prototype.api = function (message, data) {
        this.log(LogLevel.API, 'API', message, data);
    };
    return Logger;
}());
// 导出单例实例
exports.logger = new Logger();
