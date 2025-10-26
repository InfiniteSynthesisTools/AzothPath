# Azoth Path API 文档

**项目名称：** Azoth Path - 无尽合成工具站  
**后端地址：** http://localhost:19198  
**数据库：** SQLite (WAL 模式)  
**认证方式：** Bearer Token (JWT)  
**时区：** UTC+8 (Asia/Shanghai)

---

## 📚 文档目录

### 核心模块
- [🔧 系统健康检查](health.md) - 服务器状态监控
- [👥 用户管理](users.md) - 用户注册、登录、权限管理
- [📝 配方管理](recipes.md) - 配方CRUD、搜索、路径算法
- [🎯 任务管理](tasks.md) - 悬赏任务系统
- [📦 批量导入](imports.md) - 异步批量导入系统

### 数据模块
- [🏷️ 物品管理](items.md) - 物品词典、分类管理
- [🏷️ 标签管理](tags.md) - 标签系统、分类管理
- [📊 系统监控](system.md) - 系统状态、备份、缓存

### 通用信息
- [📋 通用信息](common.md) - 响应格式、认证、错误处理

---

## 🚀 快速开始

### 1. 健康检查
```bash
curl http://localhost:19198/api/health
```

### 2. 获取API信息
```bash
curl http://localhost:19198/api
```

### 3. 用户登录
```bash
curl -X POST http://localhost:19198/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

---

## 🔑 认证说明

### JWT Token
大部分API需要JWT认证，在请求头中添加：
```
Authorization: Bearer <your_jwt_token>
```

### 权限级别
- `auth = 1`: 普通用户
- `auth = 9`: 管理员

### 获取Token
通过登录接口获取：
```bash
POST /api/users/login
```

---

## 📊 API概览

### 公开接口（无需认证）
- `GET /api/health` - 健康检查（含请求统计和错误率）
- `GET /api` - API信息
- `GET /api/recipes` - 配方列表
- `GET /api/recipes/:id` - 配方详情
- `GET /api/recipes/path/:item` - 搜索合成路径
- `GET /api/recipes/shortest-path/:item` - 获取最短路径树
- `GET /api/recipes/graph/stats` - 获取图统计信息
- `GET /api/recipes/icicle-chart/on-demand/:item` - 按需生成冰柱图
- `GET /api/recipes/reachability/:item` - 获取元素可达性统计
- `GET /api/items` - 物品列表
- `GET /api/items/random` - 获取随机物品
- `GET /api/items/:id` - 获取物品详情
- `GET /api/tags` - 标签列表
- `GET /api/tags/:id` - 标签详情
- `GET /api/tags/:id/items` - 获取拥有指定标签的物品
- `GET /api/items/:id/tags` - 获取物品的所有标签
- `GET /api/tasks` - 任务列表
- `GET /api/tasks/stats` - 任务统计
- `GET /api/tasks/:id` - 任务详情
- `GET /api/system/info` - 系统信息
- `GET /api/system/backup/status` - 获取备份状态
- `GET /api/system/cache/status` - 获取缓存状态

### 需要认证的接口
- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `GET /api/users/me` - 当前用户信息
- `GET /api/users/:id` - 获取特定用户信息
- `GET /api/users/:id/stats` - 获取用户详细统计
- `GET /api/users/:id/liked-recipes` - 获取用户点赞的配方
- `POST /api/recipes/submit` - 提交配方
- `POST /api/recipes/:id/like` - 点赞配方
- `POST /api/tasks` - 创建任务
- `POST /api/tasks/:id/complete` - 完成任务
- `POST /api/import-tasks/batch` - 批量导入
- `GET /api/import-tasks` - 获取导入任务列表
- `GET /api/import-tasks/:id` - 获取导入任务详情
- `GET /api/import-tasks/:id/contents` - 获取导入任务明细
- `GET /api/import-tasks/validation-status` - 获取验证队列状态
- `DELETE /api/import-tasks/:id/notification` - 删除导入任务通知
- `GET /api/import-tasks/unread-completed` - 获取未读已完成任务
- `POST /api/system/backup/manual` - 手动触发备份
- `POST /api/system/cache/refresh` - 手动刷新缓存

### 管理员专用接口
- `GET /api/users/admin/list` - 用户列表
- `PUT /api/users/admin/:id/role` - 更新用户权限
- `PUT /api/users/admin/:id` - 更新用户信息
- `DELETE /api/users/admin/:id` - 删除用户
- `GET /api/users/admin/count` - 获取用户总数
- `PUT /api/recipes/:id/public` - 更新配方公开状态
- `PUT /api/items/:id/public` - 更新物品公开状态
- `POST /api/tags` - 创建标签
- `PATCH /api/tags/:id` - 更新标签
- `DELETE /api/tags/:id` - 删除标签
- `POST /api/items/:id/tags` - 为物品添加标签
- `DELETE /api/items/:id/tags/:tagId` - 从物品移除标签
- `PUT /api/items/:id/tags` - 批量设置物品标签
- `PATCH /api/tasks/:id` - 更新任务悬赏
- `DELETE /api/tasks/:id` - 删除任务
