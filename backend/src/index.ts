import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 导入路由
import userRoutes from './routes/userRoutes';
import recipeRoutes from './routes/recipeRoutes';

// API 路由
app.get('/api', (req, res) => {
  res.json({
    message: 'Azoth Path API',
    version: '1.0.0',
    endpoints: {
      recipes: '/api/recipes',
      users: '/api/users',
      tasks: '/api/tasks',
      imports: '/api/import-tasks'
    }
  });
});

// 注册路由
app.use('/api/users', userRoutes);
app.use('/api/recipes', recipeRoutes);
// TODO: 任务和导入路由
// app.use('/api/tasks', taskRoutes);
// app.use('/api/import-tasks', importRoutes);

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
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
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 API documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

export default app;
