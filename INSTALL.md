# Azoth Path - 完整项目安装指南

## 项目概述
Azoth Path（无尽合成工具站）是一个社区驱动的游戏配方数据库，帮助玩家发现和分享物品合成路径。

## 技术栈
- **前端**: Vue 3 + TypeScript + Element Plus + Vite
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite
- **认证**: JWT

## 项目结构
```
AzothPath/
├── frontend/           # 前端项目
│   ├── src/
│   │   ├── api/       # API 封装
│   │   ├── components/# 组件
│   │   ├── views/     # 页面
│   │   ├── stores/    # 状态管理
│   │   ├── router/    # 路由
│   │   ├── types/     # 类型定义
│   │   └── utils/     # 工具函数
│   ├── package.json
│   └── vite.config.ts
│
├── backend/            # 后端项目
│   ├── src/
│   │   ├── routes/    # API 路由
│   │   ├── controllers/# 控制器
│   │   ├── services/  # 业务逻辑
│   │   ├── middlewares/# 中间件
│   │   ├── database/  # 数据库操作
│   │   ├── types/     # 类型定义
│   │   └── index.ts   # 入口文件
│   ├── package.json
│   └── tsconfig.json
│
├── database/           # 数据库文件
│   ├── azothpath.db   # SQLite 数据库
│   └── init.sql       # 初始化脚本
│
├── recipe_calculator.py # Python 算法参考实现
├── prd.md             # 产品需求文档
└── README.md          # 本文件
```

## 快速开始

### 前置要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- Python >= 3.8 (可选，用于算法参考)

### 1. 克隆项目
```bash
git clone https://github.com/your-repo/AzothPath.git
cd AzothPath
```

### 2. 安装前端依赖
```bash
cd frontend
npm install
```

### 3. 安装后端依赖
```bash
cd ../backend
npm install
```

### 4. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，修改必要的配置
# 特别注意修改 JWT_SECRET 为随机字符串
```

### 5. 初始化数据库
```bash
# 在 backend 目录下执行
npm run db:init
```

这将创建数据库表结构。

### 6. 启动开发服务器

#### 启动后端（终端1）
```bash
cd backend
npm run dev
```
后端将运行在 http://localhost:3000

#### 启动前端（终端2）
```bash
cd frontend
npm run dev
```
前端将运行在 http://localhost:5173

### 7. 访问应用
打开浏览器访问: http://localhost:5173

## 数据库初始化说明

数据库将自动创建以下表：
- `recipes` - 配方表
- `items` - 物品表
- `user` - 用户表
- `task` - 任务表
- `import_tasks` - 导入任务汇总表
- `import_tasks_content` - 导入任务明细表
- `recipe_likes` - 配方点赞记录表

### 手动初始化（可选）
如果自动初始化失败，可以手动执行：

```bash
# 进入 database 目录
cd database

# 使用 sqlite3 执行初始化脚本
sqlite3 azothpath.db < init.sql
```

## 开发指南

### 前端开发
```bash
cd frontend
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览生产版本
```

### 后端开发
```bash
cd backend
npm run dev      # 启动开发服务器（热重载）
npm run build    # 编译 TypeScript
npm start        # 运行生产版本
```

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 提交前确保代码无编译错误

## 常见问题

### Q: 前端启动报错找不到模块？
A: 确保已执行 `npm install` 安装所有依赖

### Q: 后端连接数据库失败？
A: 检查 `.env` 文件中的 `DB_PATH` 配置是否正确，确保数据库文件存在

### Q: 跨域问题？
A: 前端开发服务器已配置代理，确保后端运行在 3000 端口

### Q: JWT token 过期？
A: 在 `.env` 中调整 `JWT_EXPIRES_IN` 配置，或重新登录

## API 文档

### 认证接口
- `POST /api/users/login` - 用户登录
- `POST /api/users/register` - 用户注册
- `GET /api/users/me` - 获取当前用户信息

### 配方接口
- `GET /api/recipes` - 获取配方列表
- `GET /api/recipes/:id` - 获取配方详情
- `POST /api/recipes/submit` - 提交配方
- `DELETE /api/recipes/:id` - 删除配方
- `POST /api/recipes/:id/like` - 点赞配方
- `DELETE /api/recipes/:id/like` - 取消点赞

### 任务接口
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取任务详情
- `POST /api/tasks` - 创建任务（管理员）
- `PUT /api/tasks/:id` - 更新任务（管理员）
- `DELETE /api/tasks/:id` - 删除任务（管理员）

### 导入接口
- `GET /api/import-tasks` - 获取导入任务列表
- `GET /api/import-tasks/:id` - 获取导入任务详情
- `GET /api/import-tasks/:id/summary` - 获取导入任务汇总
- `DELETE /api/import-tasks/:id` - 删除导入任务

详细 API 文档请参考 `prd.md` 第 4.4 节。

## 生产部署

### 构建前端
```bash
cd frontend
npm run build
```
构建产物在 `frontend/dist` 目录

### 构建后端
```bash
cd backend
npm run build
```
构建产物在 `backend/dist` 目录

### 生产环境配置
1. 修改 `.env` 中的 `NODE_ENV=production`
2. 设置强随机的 `JWT_SECRET`
3. 配置反向代理（Nginx/Caddy）
4. 启用 HTTPS
5. 配置数据库备份策略

### 使用 PM2 管理后端进程
```bash
npm install -g pm2
pm2 start dist/index.js --name azoth-path-backend
pm2 save
pm2 startup
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证
MIT License

## 联系方式
- 项目主页: [GitHub仓库链接]
- 问题反馈: [Issues链接]

## 致谢
- Infinite Craft 游戏社区
- 所有贡献者
