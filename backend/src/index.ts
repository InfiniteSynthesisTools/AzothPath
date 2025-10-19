import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from './utils/logger';
import { validateApiConfig } from './config/api';
import { getDatabase } from './database/connection';

// 设置时区为 UTC+8 (中国标准时间)
process.env.TZ = 'Asia/Shanghai';

// 加载环境变量
dotenv.config();

// 验证必需的环境变量
const requiredEnvVars = ['JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`缺少必需的环境变量: ${envVar}`);
    process.exit(1);
  }
}

// 验证API配置
try {
  validateApiConfig();
  logger.info('API配置验证通过');
} catch (error) {
  logger.error('API配置验证失败', error);
  process.exit(1);
}

const app: Application = express();
const PORT = parseInt(process.env.PORT || '19198', 10);

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  // 获取当前时间（已设置为UTC+8）
  const now = new Date();
  
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: now.toISOString(),
    timezone: 'Asia/Shanghai (UTC+8)',
    uptime: process.uptime()
  });
});

// 导入路由
import userRoutes from './routes/userRoutes';
import recipeRoutes from './routes/recipeRoutes';
import importRoutes from './routes/importRoutes';
import taskRoutes from './routes/taskRoutes';
import itemsRoutes from './routes/itemsRoutes';
import systemRoutes from './routes/systemRoutes';

// 导入任务队列
import { importTaskQueue } from './services/importTaskQueue';

// API 路由
app.get('/api', (req, res) => {
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
app.use('/api/users', userRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/import-tasks', importRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/system', systemRoutes);

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('API错误', {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack
  });
  
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: 'Not Found'
  });
});

// 启动服务器
try {
  // 启动服务器
  app.listen(PORT, async () => {
    logger.success(`服务器启动成功 - 端口: ${PORT}`);
    logger.info(`API文档: http://localhost:${PORT}/api`);
    logger.info(`健康检查: http://localhost:${PORT}/health`);
    
    // 启动导入任务队列
    try {
      await importTaskQueue.start();
      logger.info('导入任务队列启动成功');
    } catch (error) {
      logger.error('导入任务队列启动失败', error);
    }
  });


} catch (error) {
  logger.error('启动服务器时发生错误', error);
}

export default app;
