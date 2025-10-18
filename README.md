# ✨ Azoth Path - 无尽合成工具站

> 社区驱动的游戏配方数据库，帮助玩家发现和分享物品合成路径

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

## 📖 项目简介

Azoth Path 是一个为"Infinite Craft"游戏玩家打造的社区工具站，提供：
- 🔍 配方搜索与展示
- 📝 配方贡献与验证
- 🏆 任务悬赏系统
- 🌳 合成路径可视化
- 📊 贡献度排行榜

## 🚀 技术栈

### 前端
- **框架**: Vue 3 + TypeScript + Vite
- **UI 组件**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router 4

### 后端
- **运行时**: Node.js 18+
- **框架**: Express + TypeScript
- **数据库**: SQLite
- **认证**: JWT

## 📂 项目结构

```
AzothPath/
├── frontend/          # Vue 3 前端项目
├── backend/           # Node.js 后端项目
├── database/          # SQLite 数据库
├── prd.md             # 产品需求文档
├── INSTALL.md         # 安装指南
├── DATABASE_SCHEMA.md # 数据库架构文档
├── run.sh             # 快速启动脚本 (Linux/macOS)
└── run.bat            # 快速启动脚本 (Windows)
```

## ⚡ 快速开始

详细安装步骤请查看 [INSTALL.md](./INSTALL.md)

### 一键安装

```bash
# 克隆项目
git clone https://github.com/InfiniteSynthesisTools/AzothPath.git
cd AzothPath

# 安装前端依赖
cd frontend && npm install && cd ..

# 安装后端依赖
cd backend && npm install && cd ..

# 初始化数据库
cd backend && npm run db:init && cd ..

# 启动后端 (终端1)
cd backend && npm run dev

# 启动前端 (终端2)
cd frontend && npm run dev
```

访问: http://localhost:5173

## 📚 文档

- [产品需求文档 (PRD)](./prd.md) - 完整的产品设计和技术规范
- [安装指南 (INSTALL)](./INSTALL.md) - 详细的安装和配置说明
- [数据库架构 (DATABASE_SCHEMA)](./DATABASE_SCHEMA.md) - 数据库设计和表结构
- [AI Agent 指南](./.github/copilot-instructions.md) - 开发规范和架构说明

## 🎯 核心功能

### 1. 配方管理
- 浏览和搜索配方数据库
- 提交新配方（文本或 JSON 格式）
- 配方验证和去重
- 配方点赞和排序

### 2. 合成路径搜索
- 基于 BFS 的路径搜索算法
- 最简路径推荐（深度最小→宽度最小→广度最大）
- 多路径对比分析
- 合成树可视化

### 3. 任务系统
- 自动生成悬赏任务
- 任务完成奖励机制
- 任务看板展示

### 4. 社区功能
- 用户贡献度排行
- 配方点赞系统
- 个人中心统计

## 🔧 开发指南

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
npm run db:init  # 初始化数据库
```

### 数据库

默认管理员账号:
- 用户名: `admin`
- 密码: `admin123`

数据库位置: `database/azothpath.db`

## 📋 API 接口

### 配方 API
- `GET /api/recipes` - 获取配方列表
- `POST /api/recipes/submit` - 提交配方
- `GET /api/recipes/path` - 搜索合成路径

### 用户 API
- `POST /api/users/login` - 用户登录
- `POST /api/users/register` - 用户注册
- `GET /api/users/contribution-rank` - 贡献榜

### 任务 API
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务（管理员）

详细 API 文档请查看 [INSTALL.md#API文档](./INSTALL.md#api-文档)

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### Git 提交规范
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

## 📜 开源协议

本项目采用 [MIT License](./LICENSE) 开源协议

## 🙏 致谢

- [Infinite Craft](https://neal.fun/infinite-craft/) 游戏
- Vue.js 社区
- Element Plus 团队
- 所有贡献者

## 📞 联系方式

- 项目主页: [GitHub](https://github.com/InfiniteSynthesisTools/AzothPath)
- 问题反馈: [Issues](https://github.com/InfiniteSynthesisTools/AzothPath/issues)

---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！

