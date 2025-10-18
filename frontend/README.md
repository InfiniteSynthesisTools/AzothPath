# Azoth Path 前端项目

## 项目简介
Azoth Path（无尽合成工具站）前端项目，基于 Vue 3 + TypeScript + Element Plus 开发。

## 技术栈
- Vue 3 (Composition API)
- TypeScript
- Vite
- Pinia (状态管理)
- Vue Router 4
- Element Plus (UI 组件库)
- Axios (HTTP 请求)

## 项目结构
```
frontend/
├── public/              # 静态资源
├── src/
│   ├── api/            # API 接口封装
│   │   ├── recipe.ts   # 配方 API
│   │   ├── user.ts     # 用户 API
│   │   ├── task.ts     # 任务 API
│   │   ├── import.ts   # 导入 API
│   │   └── index.ts
│   ├── assets/         # 资源文件
│   ├── components/     # 公共组件
│   ├── views/          # 页面组件
│   ├── stores/         # Pinia 状态管理
│   │   ├── user.ts     # 用户状态
│   │   ├── recipe.ts   # 配方状态
│   │   ├── task.ts     # 任务状态
│   │   ├── import.ts   # 导入状态
│   │   └── index.ts
│   ├── router/         # 路由配置
│   │   └── index.ts
│   ├── types/          # TypeScript 类型定义
│   │   ├── recipe.ts
│   │   ├── user.ts
│   │   ├── task.ts
│   │   ├── import.ts
│   │   └── index.ts
│   ├── utils/          # 工具函数
│   │   ├── request.ts  # Axios 封装
│   │   ├── auth.ts     # 认证工具
│   │   └── format.ts   # 格式化工具
│   ├── App.vue
│   └── main.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 快速开始

### 安装依赖
```bash
cd frontend
npm install
```

### 开发模式
```bash
npm run dev
```
访问: http://localhost:5173

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 核心功能

### 1. 用户认证
- 用户注册/登录
- JWT Token 认证
- 权限管理（普通用户 / 管理员）

### 2. 配方管理
- 配方列表展示
- 配方搜索（材料 / 结果）
- 配方详情查看
- 配方点赞
- 配方删除（管理员）

### 3. 批量导入
- 文本格式导入（A + B = C）
- JSON 格式批量导入
- 导入进度实时查询
- 导入历史记录

### 4. 合成路径搜索
- 单条最简路径查询
- 多路径枚举与对比
- 路径统计分析（深度、步骤、材料）

### 5. 任务系统
- 任务看板展示
- 任务自动生成
- 任务奖励系统

### 6. 贡献榜
- 用户贡献度排名
- 多维度统计（总贡献 / 周贡献 / 月贡献）

## API 接口

### 配方接口
- `GET /api/recipes` - 获取配方列表
- `GET /api/recipes/:id` - 获取配方详情
- `POST /api/recipes/submit` - 提交配方
- `DELETE /api/recipes/:id` - 删除配方
- `POST /api/recipes/:id/like` - 点赞配方
- `GET /api/recipes/path` - 搜索合成路径
- `GET /api/recipes/graph/stats` - 获取图统计

### 用户接口
- `POST /api/users/login` - 用户登录
- `POST /api/users/register` - 用户注册
- `GET /api/users/me` - 获取当前用户
- `GET /api/users/contribution-rank` - 获取贡献榜

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
- `GET /api/import-tasks/contents` - 获取导入明细
- `DELETE /api/import-tasks/:id` - 删除导入任务

## 状态管理

### User Store
- 用户信息
- 登录/注册/登出
- 权限检查

### Recipe Store
- 配方列表
- 配方详情
- 配方搜索
- 路径查询

### Task Store
- 任务列表
- 任务管理

### Import Store
- 导入任务列表
- 导入进度查询
- 任务轮询

## 开发规范

### 命名规范
- 组件名：PascalCase (如: RecipeCard.vue)
- 文件名：kebab-case (如: recipe-card.vue) 或 PascalCase
- 变量名：camelCase (如: userName)
- 常量名：UPPER_CASE (如: API_BASE_URL)

### 代码风格
- 使用 TypeScript 严格模式
- 使用 Composition API
- 优先使用 `<script setup>`
- 组件 props 必须定义类型

### Git 提交规范
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

## 待实现功能
- [ ] 完善所有页面组件
- [ ] 添加单元测试
- [ ] 优化性能（虚拟滚动、懒加载）
- [ ] 添加国际化支持
- [ ] 主题切换功能
- [ ] 移动端适配

## License
MIT
