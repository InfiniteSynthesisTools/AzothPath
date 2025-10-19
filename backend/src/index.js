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
var cors_1 = require("cors");
var dotenv_1 = require("dotenv");
var logger_1 = require("./utils/logger");
var api_1 = require("./config/api");
// 设置时区为 UTC+8 (中国标准时间)
process.env.TZ = 'Asia/Shanghai';
// 加载环境变量
dotenv_1.default.config();
// 验证必需的环境变量
var requiredEnvVars = ['JWT_SECRET'];
for (var _i = 0, requiredEnvVars_1 = requiredEnvVars; _i < requiredEnvVars_1.length; _i++) {
    var envVar = requiredEnvVars_1[_i];
    if (!process.env[envVar]) {
        logger_1.logger.error("\u7F3A\u5C11\u5FC5\u9700\u7684\u73AF\u5883\u53D8\u91CF: ".concat(envVar));
        process.exit(1);
    }
}
// 验证API配置
try {
    (0, api_1.validateApiConfig)();
    logger_1.logger.info('API配置验证通过');
}
catch (error) {
    logger_1.logger.error('API配置验证失败', error);
    process.exit(1);
}
var app = (0, express_1.default)();
var PORT = parseInt(process.env.PORT || '19198', 10);
// 中间件
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// 健康检查
app.get('/health', function (req, res) {
    // 获取当前时间（已设置为UTC+8）
    var now = new Date();
    res.json({
        status: 'ok',
        message: 'Server is running',
        timestamp: now.toISOString(),
        timezone: 'Asia/Shanghai (UTC+8)',
        uptime: process.uptime()
    });
});
// 导入路由
var userRoutes_1 = require("./routes/userRoutes");
var recipeRoutes_1 = require("./routes/recipeRoutes");
var importRoutes_1 = require("./routes/importRoutes");
var taskRoutes_1 = require("./routes/taskRoutes");
var itemsRoutes_1 = require("./routes/itemsRoutes");
var systemRoutes_1 = require("./routes/systemRoutes");
// 导入任务队列
var importTaskQueue_1 = require("./services/importTaskQueue");
// 导入数据库备份服务
var databaseBackupService_1 = require("./services/databaseBackupService");
// API 路由
app.get('/api', function (req, res) {
    res.json({
        message: 'Azoth Path API',
        version: '1.0.0',
        endpoints: {
            recipes: '/api/recipes',
            users: '/api/users',
            tasks: '/api/tasks',
            imports: '/api/import-tasks',
            items: '/api/items'
        }
    });
});
// 注册路由
app.use('/api/users', userRoutes_1.default);
app.use('/api/recipes', recipeRoutes_1.default);
app.use('/api/import-tasks', importRoutes_1.default);
app.use('/api/tasks', taskRoutes_1.default);
app.use('/api/items', itemsRoutes_1.default);
app.use('/api/system', systemRoutes_1.default);
// 错误处理中间件
app.use(function (err, req, res, next) {
    logger_1.logger.error('API错误', {
        method: req.method,
        url: req.url,
        error: err.message,
        stack: err.stack
    });
    res.status(err.status || 500).json(__assign({ code: err.status || 500, message: err.message || 'Internal Server Error' }, (process.env.NODE_ENV === 'development' && { stack: err.stack })));
});
// 404 处理
app.use(function (req, res) {
    res.status(404).json({
        code: 404,
        message: 'Not Found'
    });
});
// 启动服务器
try {
    // 启动服务器
    app.listen(PORT, function () { return __awaiter(void 0, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.logger.success("\u670D\u52A1\u5668\u542F\u52A8\u6210\u529F - \u7AEF\u53E3: ".concat(PORT));
                    logger_1.logger.info("API\u6587\u6863: http://localhost:".concat(PORT, "/api"));
                    logger_1.logger.info("\u5065\u5EB7\u68C0\u67E5: http://localhost:".concat(PORT, "/health"));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, importTaskQueue_1.importTaskQueue.start()];
                case 2:
                    _a.sent();
                    logger_1.logger.info('导入任务队列启动成功');
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    logger_1.logger.error('导入任务队列启动失败', error_1);
                    return [3 /*break*/, 4];
                case 4:
                    // 启动数据库自动备份服务
                    try {
                        databaseBackupService_1.databaseBackupService.start();
                        logger_1.logger.info('数据库备份服务启动成功');
                    }
                    catch (error) {
                        logger_1.logger.error('数据库备份服务启动失败', error);
                    }
                    return [2 /*return*/];
            }
        });
    }); });
}
catch (error) {
    logger_1.logger.error('启动服务器时发生错误', error);
}
exports.default = app;
