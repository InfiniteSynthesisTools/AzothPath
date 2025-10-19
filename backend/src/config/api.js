"use strict";
/**
 * 外部API配置
 * 统一管理所有外部API的配置
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiConfig = void 0;
exports.getApiConfig = getApiConfig;
exports.validateApiConfig = validateApiConfig;
/**
 * 获取API配置
 */
function getApiConfig() {
    return {
        // 外部验证API配置
        validationApiUrl: process.env.VALIDATION_API_URL || 'https://hc.tsdo.in/api',
        // 请求配置
        timeout: parseInt(process.env.API_TIMEOUT || '5000'),
        retryCount: parseInt(process.env.API_RETRY_COUNT || '3'),
        // 限速配置：API请求最小间隔（毫秒）
        // 默认0ms，可通过环境变量 API_RATE_LIMIT_INTERVAL 调整
        rateLimitInterval: parseInt(process.env.API_RATE_LIMIT_INTERVAL || '0'),
        // 请求头配置
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'AzothPath/1.0',
            'Content-Type': 'application/json'
        }
    };
}
/**
 * 验证API配置
 */
function validateApiConfig() {
    var config = getApiConfig();
    if (!config.validationApiUrl) {
        throw new Error('VALIDATION_API_URL 环境变量未设置');
    }
    try {
        new URL(config.validationApiUrl);
    }
    catch (error) {
        throw new Error("\u65E0\u6548\u7684 VALIDATION_API_URL: ".concat(config.validationApiUrl));
    }
    if (config.timeout <= 0) {
        throw new Error('API_TIMEOUT 必须大于0');
    }
    if (config.retryCount < 0) {
        throw new Error('API_RETRY_COUNT 不能为负数');
    }
    if (config.rateLimitInterval < 0) {
        throw new Error('API_RATE_LIMIT_INTERVAL 不能为负数');
    }
}
// 懒加载配置（确保环境变量已加载）
var _apiConfig = null;
exports.apiConfig = new Proxy({}, {
    get: function (target, prop) {
        if (!_apiConfig) {
            _apiConfig = getApiConfig();
        }
        return _apiConfig[prop];
    }
});
