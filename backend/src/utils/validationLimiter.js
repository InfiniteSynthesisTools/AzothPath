"use strict";
/**
 * 验证API限速器
 * 限制API请求速率，防止触发外部API限速
 *
 * 工作原理：
 * - 所有HTTP请求进入队列
 * - 队列按顺序执行，确保请求间隔 >= minInterval
 * - 多个任务可以并发调用，但HTTP请求会被串行化
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
exports.validationLimiter = void 0;
var api_1 = require("../config/api");
var logger_1 = require("./logger");
var ValidationLimiter = /** @class */ (function () {
    function ValidationLimiter() {
        this.lastValidationTime = 0;
        this.queue = [];
        this.processing = false;
        // 从配置文件中读取限速间隔
        this.minInterval = api_1.apiConfig.rateLimitInterval;
        logger_1.logger.info("\u9A8C\u8BC1\u9650\u901F\u5668\u521D\u59CB\u5316: \u6700\u5C0F\u95F4\u9694 ".concat(this.minInterval, "ms"));
    }
    /**
     * 限速验证请求
     * @param validationFn 验证函数（包含HTTP请求）
     * @returns Promise<T> 验证结果
     */
    ValidationLimiter.prototype.limitValidation = function (validationFn) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var executeValidation = function () { return __awaiter(_this, void 0, void 0, function () {
                            var result, error_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, validationFn()];
                                    case 1:
                                        result = _a.sent();
                                        resolve(result);
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_1 = _a.sent();
                                        reject(error_1);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); };
                        _this.queue.push(executeValidation);
                        _this.processQueue();
                    })];
            });
        });
    };
    /**
     * 处理验证队列（自动维护请求间隔）
     */
    ValidationLimiter.prototype.processQueue = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now, timeSinceLastValidation, waitTime, validationFn, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.processing || this.queue.length === 0) {
                            return [2 /*return*/];
                        }
                        this.processing = true;
                        _a.label = 1;
                    case 1:
                        if (!(this.queue.length > 0)) return [3 /*break*/, 8];
                        now = Date.now();
                        timeSinceLastValidation = now - this.lastValidationTime;
                        if (!(timeSinceLastValidation < this.minInterval)) return [3 /*break*/, 3];
                        waitTime = this.minInterval - timeSinceLastValidation;
                        logger_1.logger.debug("\u9A8C\u8BC1\u9650\u901F: \u7B49\u5F85 ".concat(waitTime, "ms (\u6700\u5C0F\u95F4\u9694: ").concat(this.minInterval, "ms)"));
                        return [4 /*yield*/, this.delay(waitTime)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        validationFn = this.queue.shift();
                        if (!validationFn) return [3 /*break*/, 7];
                        this.lastValidationTime = Date.now();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, validationFn()];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        error_2 = _a.sent();
                        return [3 /*break*/, 7];
                    case 7: return [3 /*break*/, 1];
                    case 8:
                        this.processing = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 延迟函数
     * @param ms 延迟毫秒数
     */
    ValidationLimiter.prototype.delay = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    /**
     * 获取队列状态
     */
    ValidationLimiter.prototype.getQueueStatus = function () {
        return {
            queueLength: this.queue.length,
            isProcessing: this.processing,
            lastValidationTime: this.lastValidationTime
        };
    };
    /**
     * 清空队列（用于测试或紧急停止）
     */
    ValidationLimiter.prototype.clearQueue = function () {
        this.queue = [];
        this.processing = false;
    };
    /**
     * 获取预计完成时间（毫秒）
     */
    ValidationLimiter.prototype.getEstimatedCompletionTime = function () {
        var queueLength = this.queue.length;
        if (queueLength === 0)
            return 0;
        var now = Date.now();
        var timeSinceLastValidation = now - this.lastValidationTime;
        var timeToNextValidation = Math.max(0, this.minInterval - timeSinceLastValidation);
        return timeToNextValidation + (queueLength - 1) * this.minInterval;
    };
    return ValidationLimiter;
}());
// 创建全局实例
exports.validationLimiter = new ValidationLimiter();
