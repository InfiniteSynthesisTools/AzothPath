"use strict";
/**
 * 统一时间处理工具 - UTC+8 时区
 * 所有时间相关操作都使用此工具确保一致性
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUTC8Time = getCurrentUTC8Time;
exports.getCurrentUTC8TimeString = getCurrentUTC8TimeString;
exports.getCurrentUTC8TimeForDB = getCurrentUTC8TimeForDB;
exports.convertUTCToUTC8ForDB = convertUTCToUTC8ForDB;
exports.formatDateTimeForDB = formatDateTimeForDB;
exports.parseDBTimeToUTC8 = parseDBTimeToUTC8;
exports.convertUTCToUTC8 = convertUTCToUTC8;
exports.convertUTC8ToUTC = convertUTC8ToUTC;
exports.formatTimeForDisplay = formatTimeForDisplay;
exports.isValidUTC8Time = isValidUTC8Time;
exports.getCurrentUTC8Timestamp = getCurrentUTC8Timestamp;
/**
 * 获取当前UTC+8时间
 * @returns 当前UTC+8时间的Date对象
 */
function getCurrentUTC8Time() {
    var now = new Date();
    // 获取UTC时间并转换为UTC+8
    var utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return utc8Time;
}
/**
 * 获取当前UTC+8时间字符串 (ISO格式)
 * @returns 当前UTC+8时间的ISO字符串
 */
function getCurrentUTC8TimeString() {
    return getCurrentUTC8Time().toISOString();
}
/**
 * 获取当前UTC+8时间字符串 (数据库格式: YYYY-MM-DD HH:mm:ss)
 * @returns 当前UTC+8时间的数据库格式字符串
 */
function getCurrentUTC8TimeForDB() {
    var utc8Time = getCurrentUTC8Time();
    return formatDateTimeForDB(utc8Time);
}
/**
 * 将UTC时间转换为UTC+8时间字符串 (用于数据库存储)
 * @param utcDate UTC时间的Date对象
 * @returns UTC+8时间的数据库格式字符串
 */
function convertUTCToUTC8ForDB(utcDate) {
    var utc8Time = convertUTCToUTC8(utcDate);
    return formatDateTimeForDB(utc8Time);
}
/**
 * 将Date对象格式化为数据库时间格式 (UTC+8)
 * @param date Date对象
 * @returns 格式化的时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
function formatDateTimeForDB(date) {
    var year = date.getUTCFullYear();
    var month = String(date.getUTCMonth() + 1).padStart(2, '0');
    var day = String(date.getUTCDate()).padStart(2, '0');
    var hours = String(date.getUTCHours()).padStart(2, '0');
    var minutes = String(date.getUTCMinutes()).padStart(2, '0');
    var seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return "".concat(year, "-").concat(month, "-").concat(day, " ").concat(hours, ":").concat(minutes, ":").concat(seconds);
}
/**
 * 将数据库时间字符串转换为UTC+8的Date对象
 * @param dbTimeString 数据库时间字符串 (YYYY-MM-DD HH:mm:ss)
 * @returns UTC+8的Date对象
 */
function parseDBTimeToUTC8(dbTimeString) {
    // 数据库存储的是UTC时间，需要转换为UTC+8
    var utcDate = new Date(dbTimeString + 'Z'); // 添加Z表示UTC时间
    return convertUTCToUTC8(utcDate);
}
/**
 * 将UTC时间转换为UTC+8时间
 * @param utcDate UTC时间的Date对象
 * @returns UTC+8的Date对象
 */
function convertUTCToUTC8(utcDate) {
    return new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
}
/**
 * 将UTC+8时间转换为UTC时间
 * @param utc8Date UTC+8时间的Date对象
 * @returns UTC的Date对象
 */
function convertUTC8ToUTC(utc8Date) {
    return new Date(utc8Date.getTime() - (8 * 60 * 60 * 1000));
}
/**
 * 格式化时间为显示格式 (UTC+8)
 * @param date Date对象或时间字符串
 * @param format 格式类型
 * @returns 格式化后的时间字符串
 */
function formatTimeForDisplay(date, format) {
    if (format === void 0) { format = 'datetime'; }
    var dateObj = typeof date === 'string' ? new Date(date) : date;
    // 确保是UTC+8时间
    var utc8Date = convertUTCToUTC8(dateObj);
    switch (format) {
        case 'datetime':
            return utc8Date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Shanghai'
            });
        case 'date':
            return utc8Date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: 'Asia/Shanghai'
            });
        case 'time':
            return utc8Date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Shanghai'
            });
        case 'relative':
            return formatRelativeTime(utc8Date);
        default:
            return utc8Date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    }
}
/**
 * 格式化相对时间 (UTC+8)
 * @param date Date对象
 * @returns 相对时间字符串
 */
function formatRelativeTime(date) {
    var now = getCurrentUTC8Time();
    var diffMs = now.getTime() - date.getTime();
    var diffMinutes = Math.floor(diffMs / (1000 * 60));
    var diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMinutes < 1) {
        return '刚刚';
    }
    else if (diffMinutes < 60) {
        return "".concat(diffMinutes, "\u5206\u949F\u524D");
    }
    else if (diffHours < 24) {
        return "".concat(diffHours, "\u5C0F\u65F6\u524D");
    }
    else if (diffDays < 7) {
        return "".concat(diffDays, "\u5929\u524D");
    }
    else if (diffDays < 30) {
        return "".concat(Math.floor(diffDays / 7), "\u5468\u524D");
    }
    else {
        return formatTimeForDisplay(date, 'date');
    }
}
/**
 * 验证时间字符串是否为有效的UTC+8时间格式
 * @param timeString 时间字符串
 * @returns 是否为有效格式
 */
function isValidUTC8Time(timeString) {
    var date = new Date(timeString);
    return !isNaN(date.getTime());
}
/**
 * 获取时间戳 (UTC+8)
 * @returns UTC+8时间戳
 */
function getCurrentUTC8Timestamp() {
    return getCurrentUTC8Time().getTime();
}
