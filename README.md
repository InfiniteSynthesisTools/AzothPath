# ✨ Azoth Path - 无尽合成工具站

> 社区驱动的游戏配方数据库，帮助玩家发现和分享物品合成路径

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

## 📖 项目简介

Azoth Path 是一个为"无尽合成"游戏玩家打造的社区工具站，提供：
- 🔍 配方搜索与展示
- 📝 配方贡献与验证
- 🏆 任务悬赏系统
- 🌳 合成路径可视化
- 📊 贡献度排行榜

## 🚀 技术栈

> 详细技术架构请参考 [产品需求文档](prd.md#4-技术架构)

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
├── run.sh             # 快速启动脚本 (Linux/macOS)
└── run.bat            # 快速启动脚本 (Windows)
```

## ⚡ 快速开始

### 前置要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- Python >= 3.8 (可选，用于算法参考)

### 方法一：使用安装脚本（推荐）

#### Windows 系统
```bash
# 运行 Windows 安装脚本
run.bat
```

#### Linux/macOS 系统
```bash
# 运行 Linux/macOS 安装脚本
chmod +x run.sh
./run.sh
```

安装脚本将自动完成以下操作：
- 安装前端和后端依赖
- 初始化数据库
- 启动开发服务器

### 方法二：手动安装

#### 1. 克隆项目
```bash
git clone https://github.com/InfiniteSynthesisTools/AzothPath.git
cd AzothPath
```

#### 2. 安装前端依赖
```bash
cd frontend
npm install
```

#### 3. 安装后端依赖
```bash
cd ../backend
npm install
```

#### 4. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，修改必要的配置
# 特别注意修改 JWT_SECRET 为随机字符串
```

#### 5. 初始化数据库
```bash
# 在 backend 目录下执行
npm run db:init
```

这将创建数据库表结构。

#### 6. 启动开发服务器

##### 启动后端（终端1）
```bash
cd backend
npm run dev
```
后端将运行在 http://localhost:19198

##### 启动前端（终端2）
```bash
cd frontend
npm run dev
```
前端将运行在 http://localhost:11451

#### 7. 访问应用
打开浏览器访问: http://localhost:11451

## 📚 文档

- [产品需求文档 (PRD)](./prd.md) - 完整的产品设计和技术规范

## 🎯 核心功能

### 1. 配方管理
- 浏览和搜索配方数据库
- 提交新配方（文本或 JSON 格式）
- 配方验证和去重
- 配方点赞和排序（支持切换点赞状态）

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

### 主要接口类别
- **认证接口** - 用户登录、注册、信息获取
- **配方接口** - 配方管理、搜索、点赞
- **任务接口** - 悬赏任务管理
- **导入接口** - 批量导入配方
- **通知接口** - 用户通知管理

### 认证相关 API

#### POST /api/auth/register
**用户注册**

**请求体**:
```json
{
  "name": "username",
  "psw": "password"
}
```

**响应**:
```json
{
  "id": 1,
  "name": "username",
  "auth": 1,
  "contribute": 0,
  "level": 1,
  "created_at": "2025-10-18T12:00:00Z"
}
```

#### POST /api/auth/login
**用户登录**

**请求体**:
```json
{
  "name": "username",
  "psw": "password"
}
```

**响应**:
```json
{
  "id": 1,
  "name": "username",
  "auth": 1,
  "contribute": 0,
  "level": 1,
  "created_at": "2025-10-18T12:00:00Z"
}
```

### 用户相关 API

#### GET /api/user/profile
**获取当前用户信息**

**响应**:
```json
{
  "id": 1,
  "name": "username",
  "auth": 1,
  "contribute": 100,
  "level": 1,
  "created_at": "2025-10-18T12:00:00Z"
}
```

#### GET /api/user/contribution
**获取贡献榜**

**查询参数**:
- `page`: 页码（默认1）
- `limit`: 每页数量（默认10）

**响应**:
```json
{
  "users": [
    {
      "id": 1,
      "name": "admin",
      "auth": 9,
      "contribute": 100,
      "level": 1,
      "created_at": "2025-10-18T12:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10
}
```

### 配方相关 API

#### GET /api/recipes
**获取配方列表**

**查询参数**:
- `page`: 页码（默认1）
- `limit`: 每页数量（默认10）
- `search`: 搜索关键词（可选）
- `sort`: 排序方式（可选：latest, popular）

**响应**:
```json
{
  "recipes": [
    {
      "id": 1,
      "item_a": "金",
      "item_b": "木",
      "result": "合金",
      "user_id": 1,
      "likes": 5,
      "created_at": "2025-10-18T12:00:00Z",
      "creator_name": "admin",
      "is_liked": false
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

#### POST /api/recipes
**创建新配方**

**请求体**:
```json
{
  "item_a": "金",
  "item_b": "木",
  "result": "合金"
}
```

**响应**:
```json
{
  "id": 1,
  "item_a": "金",
  "item_b": "木",
  "result": "合金",
  "user_id": 1,
  "likes": 0,
  "created_at": "2025-10-18T12:00:00Z"
}
```

### 错误响应格式

```json
{
  "error": "错误类型",
  "message": "错误描述",
  "details": {}
}
```

### 常见错误码
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 权限不足
- `404`: 资源不存在
- `409`: 资源冲突（如重复配方）
- `500`: 服务器内部错误

## 🗄️ 数据库架构

### ⚠️ 重要规则
**前后端 API 字段名与数据库字段名完全一致，不进行任何转换！**

### 核心表结构

#### 1. `user` 表（用户）

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | INTEGER | 主键 | 1 |
| `name` | TEXT | 用户登录名 | 'admin' |
| `psw` | TEXT | bcrypt 密码哈希 | '$2a$10$...' |
| `auth` | INTEGER | 权限等级 | 1=普通用户, 9=管理员 |
| `contribute` | INTEGER | 累积贡献分 | 100 |
| `level` | INTEGER | 用户等级 | 1 |
| `created_at` | DATETIME | 创建时间 | '2025-10-18 ...' |

**索引**:
- `idx_user_name` ON `name`
- `idx_user_contribute` ON `contribute DESC`

---

#### 2. `recipes` 表（配方）

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | INTEGER | 主键 | 1 |
| `item_a` | TEXT | 材料A（字典序 item_a < item_b） | '金' |
| `item_b` | TEXT | 材料B | '木' |
| `result` | TEXT | 合成结果 | '合金' |
| `user_id` | INTEGER | 创建者 ID（关联 user.id） | 1 |
| `likes` | INTEGER | 点赞数（冗余字段） | 5 |
| `created_at` | DATETIME | 创建时间 | '2025-10-18 ...' |

**约束**:
- `UNIQUE(item_a, item_b)` - 防止重复配方
- `CHECK (item_a < item_b)` - 强制字典序

**索引**:
- `idx_recipes_result` ON `result`
- `idx_recipes_user_id` ON `user_id`
- `idx_recipes_created_at` ON `created_at`
- `idx_recipes_likes` ON `likes DESC` - 按点赞数排序

**⚠️ 注意**:
- ❌ 表中**没有** `creator_id` 字段，使用 `user_id`
- ✅ `likes` 字段是**冗余字段**，与 `recipe_likes` 表保持同步
- ✅ 点赞/取消点赞时需要**同时更新**两个表

**点赞/取消点赞操作**:
```sql
-- 点赞
INSERT INTO recipe_likes (recipe_id, user_id) VALUES (?, ?);
UPDATE recipes SET likes = likes + 1 WHERE id = ?;

-- 取消点赞
DELETE FROM recipe_likes WHERE recipe_id = ? AND user_id = ?;
UPDATE recipes SET likes = likes - 1 WHERE id = ?;
```

---

#### 3. `recipe_likes` 表（配方点赞）

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | INTEGER | 主键 | 1 |
| `recipe_id` | INTEGER | 配方 ID（关联 recipes.id） | 1 |
| `user_id` | INTEGER | 点赞用户 ID（关联 user.id） | 1 |
| `created_at` | DATETIME | 点赞时间 | '2025-10-18 ...' |

**约束**:
- `UNIQUE(recipe_id, user_id)` - 防止重复点赞

**索引**:
- `idx_recipe_likes_recipe_id` ON `recipe_id`
- `idx_recipe_likes_user_id` ON `user_id`

---

#### 4. `items` 表（物品词典）

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | INTEGER | 主键 | 1 |
| `name` | TEXT | 物品名称（唯一） | '金' |
| `emoji` | TEXT | 物品图标 | '🥇' |
| `pinyin` | TEXT | 拼音（用于搜索） | 'jin' |
| `is_base` | INTEGER | 是否基础材料 | 0=否, 1=是 |
| `created_at` | DATETIME | 创建时间 | '2025-10-18 ...' |

**索引**:
- `UNIQUE` ON `name`

---

#### 5. `task` 表（悬赏任务）

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | INTEGER | 主键 | 1 |
| `item_name` | TEXT | 目标物品名称 | '龙' |
| `prize` | INTEGER | 奖励积分 | 10 |
| `status` | TEXT | 任务状态 | 'active' / 'completed' |
| `created_at` | DATETIME | 创建时间 | '2025-10-18 ...' |
| `completed_by_recipe_id` | INTEGER | 完成任务的配方 ID | 123 |
| `completed_at` | DATETIME | 完成时间 | '2025-10-18 ...' |

**索引**:
- `idx_task_status` ON `status`
- `idx_task_item_name` ON `item_name`

---

#### 6. `import_tasks` 表（批量导入任务汇总）

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | INTEGER | 主键 | 1 |
| `user_id` | INTEGER | 导入用户 ID | 1 |
| `total_count` | INTEGER | 总数 | 100 |
| `success_count` | INTEGER | 成功数 | 85 |
| `failed_count` | INTEGER | 失败数 | 10 |
| `duplicate_count` | INTEGER | 重复数 | 5 |
| `status` | TEXT | 任务状态 | 'processing' / 'completed' / 'failed' |
| `error_details` | TEXT | 错误详情（JSON） | '{"errors": [...]}' |
| `created_at` | DATETIME | 创建时间 | '2025-10-18 ...' |
| `updated_at` | DATETIME | 更新时间 | '2025-10-18 ...' |

**索引**:
- `idx_import_tasks_user_id` ON `user_id`
- `idx_import_tasks_status` ON `status`
- `idx_import_tasks_created_at` ON `created_at`

---

#### 7. `import_tasks_content` 表（批量导入任务明细）

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | INTEGER | 主键 | 1 |
| `task_id` | INTEGER | 关联 import_tasks.id | 1 |
| `item_a` | TEXT | 材料A | '金' |
| `item_b` | TEXT | 材料B | '木' |
| `result` | TEXT | 合成结果 | '合金' |
| `status` | TEXT | 处理状态 | 'pending' / 'processing' / 'success' / 'failed' / 'duplicate' |
| `error_message` | TEXT | 错误信息 | 'Recipe validation failed' |
| `recipe_id` | INTEGER | 成功后的配方 ID | 123 |
| `created_at` | DATETIME | 创建时间 | '2025-10-18 ...' |

**索引**:
- `idx_import_tasks_content_task_id` ON `task_id`
- `idx_import_tasks_content_status` ON `status`

---

#### 8. `notifications` 表（通知模板）

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | INTEGER | 主键 | 1 |
| `title` | TEXT | 通知标题 | '新配方点赞' |
| `content` | TEXT | 通知内容 | '您的配方"合金"获得了一个点赞' |
| `type` | TEXT | 通知类型 | 'like' / 'comment' / 'system' / 'task' |
| `sender_id` | INTEGER | 发送者 ID（关联 user.id） | 2 |
| `priority` | INTEGER | 优先级 | 1=低, 2=中, 3=高 |
| `action_url` | TEXT | 操作链接 | '/recipe/1' |
| `expires_at` | DATETIME | 过期时间 | '2025-10-25 ...' |
| `created_at` | DATETIME | 创建时间 | '2025-10-18 ...' |

**索引**:
- `idx_notifications_type` ON `type`
- `idx_notifications_sender_id` ON `sender_id`
- `idx_notifications_priority` ON `priority`
- `idx_notifications_created_at` ON `created_at DESC`

---

#### 9. `user_notifications` 表（用户通知状态）

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | INTEGER | 主键 | 1 |
| `user_id` | INTEGER | 用户 ID（关联 user.id） | 1 |
| `notification_id` | INTEGER | 通知 ID（关联 notifications.id） | 1 |
| `status` | TEXT | 状态 | 'UNREAD' / 'READ' / 'ARCHIVED' / 'DELETED' |
| `read_at` | DATETIME | 阅读时间 | '2025-10-18 ...' |
| `archived_at` | DATETIME | 归档时间 | '2025-10-18 ...' |
| `deleted_at` | DATETIME | 删除时间 | '2025-10-18 ...' |
| `created_at` | DATETIME | 创建时间 | '2025-10-18 ...' |
| `updated_at` | DATETIME | 更新时间 | '2025-10-18 ...' |

**约束**:
- `UNIQUE(user_id, notification_id)` - 防止重复通知

**索引**:
- `idx_user_notifications_user_id` ON `user_id`
- `idx_user_notifications_notification_id` ON `notification_id`
- `idx_user_notifications_status` ON `status`
- `idx_user_notifications_created_at` ON `created_at DESC`

**状态流转规则**:
- 初始状态：`UNREAD`
- 用户阅读：`UNREAD` → `READ`
- 用户归档：`READ` → `ARCHIVED`
- 用户删除：`ARCHIVED` → `DELETED`
- 软删除：`deleted_at` 记录删除时间

---

## 🌳 图算法与合成路径

### 概述

Azoth Path 系统实现了完整的建图功能，基于物品合成配方构建有向图，支持图论算法分析、图分类和统计指标计算。

### 图数据结构

系统基于合成配方构建有向图，其中：
- **节点 (Nodes)**: 物品
- **边 (Edges)**: 合成配方 (A + B → C)
- **基础材料**: 金、木、水、火、土

### 核心算法实现

#### 可达性分析 (BFS)
从基础材料开始进行广度优先搜索，确定哪些物品可以通过合成获得。

#### 连通分量检测 (DFS)
深度优先搜索检测连通分量，识别相互关联的物品组。

#### 循环依赖检测
检测循环依赖模式，如 A + A = A 或 A + B = A 等循环配方。

### 图分类系统

系统将物品图分为四种类型：

#### 1. 孤立图 (Isolated Graph)
- **定义**: 无法从基础材料合成的物品
- **特征**: 没有入边或入边来自其他不可达物品

#### 2. 边界图 (Boundary Graph)
- **定义**: 可以直接从基础材料合成的物品
- **特征**: 合成深度为 1

#### 3. 循环图 (Circular Graph)
- **定义**: 包含循环依赖的物品
- **特征**: 存在 A + A = A 或 A + B = A 等循环配方

#### 4. 线性图 (Linear Graph)
- **定义**: 正常的合成路径，无循环依赖
- **特征**: 从基础材料到目标物品的有向无环路径

### 有向图统计指标

#### 基础统计指标
- **入度 (In-Degree)**: 物品作为合成结果的配方数量
- **出度 (Out-Degree)**: 物品作为合成材料的配方数量
- **平均度数 (Average Degree)**: 所有物品的平均度数

#### 高级统计指标
- **图密度 (Graph Density)**: 实际边数与可能最大边数的比值
- **聚类系数 (Clustering Coefficient)**: 节点邻居之间实际连接数与可能连接数的比值
- **边界节点数 (Boundary Nodes)**: 可以直接从基础材料合成的物品数量

### 基础材料广度计算

**基础材料广度**: 使用该基础材料作为输入材料的配方数量
- **水**: 427
- **火**: 348  
- **土**: 332
- **金**: 551
- **木**: 486

### 系统规模统计
- **总物品数**: 2012 个
- **合法物品**: 1347 个（可合成物品）
- **不可及物品**: 665 个（全部为孤立图）

### 实现位置
- **核心算法文件**: `backend/src/services/recipeService.ts`
- **主要函数**: `buildRecipeGraph()`, `analyzeReachability()`, `classifyGraph()`, `calculateGraphStats()`

## � 打包部署

### Windows 下打包

使用提供的打包脚本生成生产环境部署包：

```cmd
.\build.bat
```

脚本会自动完成：
1. ✅ 清理旧的构建文件
2. ✅ 构建前端 (Vite)
3. ✅ 构建后端 (TypeScript)
4. ✅ 复制必要文件
5. ✅ 生成部署配置和文档

所有文件会被打包到 `dist/` 目录：

```
dist/
├── frontend/              # 前端静态文件
├── backend/               # 后端应用
│   ├── dist/              # 编译后的 JS
│   ├── database/          # 数据库初始化脚本
│   ├── package.json
│   └── .env.example
├── logs/                  # 日志目录
├── start.sh               # Linux 启动脚本
├── ecosystem.config.js    # PM2 配置
├── nginx.conf             # Nginx 配置示例
└── DEPLOY.md              # 完整部署文档
```

### Ubuntu 服务器部署

详细部署步骤请查看：
- **快速指南**: [BUILD.md](BUILD.md)
- **完整文档**: `dist/DEPLOY.md` (打包后生成)

#### 快速部署流程

1. **上传文件到服务器**
   ```bash
   scp -r dist/ user@server:/var/www/azothpath/
   ```

2. **安装依赖**
   ```bash
   cd /var/www/azothpath/backend
   npm install --production
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   nano .env  # 修改配置
   ```

4. **初始化数据库**
   ```bash
   node dist/database/connection.js
   ```

5. **使用 PM2 启动**
   ```bash
   npm install -g pm2
   cd /var/www/azothpath
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save
   ```

6. **配置 Nginx**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/azothpath
   sudo ln -s /etc/nginx/sites-available/azothpath /etc/nginx/sites-enabled/
   sudo nano /etc/nginx/sites-available/azothpath  # 修改域名和路径
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### 访问地址

- **前端**: http://your-domain.com
- **后端 API**: http://your-domain.com/api
- **直接访问后端**: http://your-domain.com:19198

## �🔒 安全配置

### 已实施的安全修复

#### 🔴 严重安全问题修复

1. **JWT 密钥配置**
   - **问题**: 硬编码默认密钥
   - **修复**: 使用环境变量 `JWT_SECRET` 配置
   - **位置**: `backend/src/middlewares/auth.ts`
   - **生产环境要求**: 必须设置强密码作为 JWT_SECRET

2. **默认管理员账户**
   - **问题**: 存在默认管理员账户 `admin`，密码 `admin123`
   - **修复**: 生产环境必须删除或修改默认账户
   - **位置**: `database/init.sql`

#### 🟡 中等安全问题修复

3. **输入验证增强**
   - **问题**: 缺乏输入验证和长度限制
   - **修复**: 添加长度限制（50字符）和字符白名单验证
   - **位置**: `backend/src/routes/recipeRoutes.ts`
   - **验证规则**: 只允许中文、英文、数字、空格、连字符和下划线

4. **SQL 查询参数化**
   - **问题**: 动态 SQL 构建存在潜在注入风险
   - **修复**: 使用白名单验证 `orderBy` 参数
   - **位置**: `backend/src/services/recipeService.ts`

### 环境变量配置

创建 `.env` 文件（基于 `.env.example`）：

```env
# JWT 密钥（生产环境必须设置强密码）
JWT_SECRET=your_secure_jwt_secret_key_here

# 数据库路径（可选，默认使用 database/azothpath.db）
DB_PATH=database/azothpath.db

# 后端端口（可选，默认 19198）
PORT=19198

# 前端端口（可选，默认 11451）
VITE_PORT=11451

# 生产环境配置
NODE_ENV=production
```

### 生产环境部署检查清单

#### 部署前检查
- [ ] 设置强密码的 JWT_SECRET 环境变量
- [ ] 删除或修改默认管理员账户
- [ ] 配置生产环境数据库路径
- [ ] 启用 HTTPS
- [ ] 配置适当的 CORS 设置
- [ ] 设置防火墙规则

#### 运行时安全
- [ ] 定期更新依赖包
- [ ] 监控错误日志
- [ ] 实施速率限制
- [ ] 定期备份数据库

### 安全最佳实践

#### 1. 认证和授权
- 使用强密码策略
- 实施会话超时
- 使用 HTTPS 传输敏感数据

#### 2. 数据验证
- 对所有用户输入进行验证
- 使用参数化查询防止 SQL 注入
- 实施适当的长度和类型限制

#### 3. 错误处理
- 不向用户泄露敏感错误信息
- 记录详细的错误日志用于调试
- 使用统一的错误响应格式

#### 4. 依赖管理
- 定期更新依赖包
- 使用安全扫描工具检查漏洞
- 移除未使用的依赖

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

- [无尽合成](https://hc.tsdo.in/) 游戏
- Vue.js 社区
- Element Plus 团队
- 所有贡献者

## 📞 联系方式

- 项目主页: [GitHub](https://github.com/InfiniteSynthesisTools/AzothPath)
- 问题反馈: [Issues](https://github.com/InfiniteSynthesisTools/AzothPath/issues)

---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！
