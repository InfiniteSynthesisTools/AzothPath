# Azoth Path 后端 API 文档

**项目名称：** Azoth Path - 无尽合成工具站
**后端地址：** http://localhost:19198
**数据库：** SQLite (WAL 模式)
**认证方式：** Bearer Token (JWT)
**时区：** UTC+8 (Asia/Shanghai)

---

## 目录

1. [系统健康检查](#系统健康检查)
2. [用户管理 API](#用户管理-api)
3. [配方管理 API](#配方管理-api)
4. [任务管理 API](#任务管理-api)
5. [批量导入 API](#批量导入-api)
6. [物品管理 API](#物品管理-api)
7. [标签管理 API](#标签管理-api)
8. [系统监控 API](#系统监控-api)
9. [通用信息](#通用信息)

---

## 通用响应格式

所有API响应都遵循以下格式：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

**状态码说明：**
- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 权限不足
- `404`: 资源不存在
- `500`: 服务器内部错误

---

## 系统健康检查

### GET /health
获取服务器健康状态

**响应示例：**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-10-19T13:31:20.248Z",
  "timezone": "Asia/Shanghai (UTC+8)",
  "uptime": 438.118606129
}
```

---

## 用户管理 API

### POST /api/users/register
用户注册

**请求参数：**
```json
{
  "username": "string",  // 3-20个字符
  "password": "string"   // 至少6个字符
}
```

**响应示例：**
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "auth": 1,
    "contribute": 0,
    "created_at": "2025-10-19T13:31:20.248Z"
  }
}
```

---

### POST /api/users/login
用户登录

**请求参数：**
```json
{
  "username": "string",
  "password": "string"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "testuser",
      "auth": 1,
      "contribute": 0
    }
  }
}
```

---

### GET /api/users/me
获取当前用户信息（需要认证）

**认证方式：** Bearer Token
```
Authorization: Bearer <your_jwt_token>
```

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "auth": 1,
    "contribute": 100,
    "created_at": "2025-10-19T13:31:20.248Z"
  }
}
```

---

### GET /api/users/:id
获取特定用户信息（公开信息）

**路径参数：**
- `id`: 用户ID

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "auth": 1,
    "contribute": 100
  }
}
```

---

### GET /api/users/contribution-rank
获取贡献排行榜

**查询参数：**
- `page`: 页码（默认1）
- `limit`: 每页数量（默认10）

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "users": [
      {
        "id": 1,
        "username": "testuser",
        "contribute": 100,
        "rank": 1
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### GET /api/users/:id/stats
获取用户详细贡献统计

**路径参数：**
- `id`: 用户ID

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "user_id": 1,
    "total_contribute": 100,
    "recipes_count": 5,
    "tasks_completed": 2,
    "likes_received": 10
  }
}
```

---

### GET /api/users/:id/liked-recipes
获取用户点赞的配方列表

**路径参数：**
- `id`: 用户ID

**查询参数：**
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）

---

### GET /api/users/admin/list
获取所有用户列表（管理员功能）

**认证要求：** 需要管理员权限（auth=9）

**查询参数：**
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `search`: 搜索关键词
- `role`: 角色筛选

---

### PUT /api/users/admin/:id/role
更新用户权限（管理员功能）

**认证要求：** 需要管理员权限

**请求参数：**
```json
{
  "role": 1 或 9  // 1: 普通用户, 9: 管理员
}
```

---

### PUT /api/users/admin/:id
更新用户信息（管理员功能）

**认证要求：** 需要管理员权限

**请求参数：**
```json
{
  "name": "string",        // 可选
  "contribute": number,    // 可选
  "level": number,         // 可选
  "auth": number,          // 可选
  "created_at": "string"   // 可选
}
```

---

### DELETE /api/users/admin/:id
删除用户（管理员功能）

**认证要求：** 需要管理员权限

---

### GET /api/users/admin/count
获取用户总数（管理员功能）

**认证要求：** 需要管理员权限

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total_users": 100
  }
}
```

---

## 配方管理 API

### GET /api/recipes
获取配方列表

**查询参数：**
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `search`: 搜索关键词
- `orderBy`: 排序字段（created_at, likes等）
- `result`: 按结果筛选
- `cursor`: 游标分页（用于大数据量）
- `includePrivate`: 是否包含未公开数据（管理员专用，默认1）
- `includeStats`: 是否包含统计信息（默认0）

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "recipes": [
      {
        "id": 1,
        "item_a": "火",
        "item_b": "水",
        "result": "蒸汽",
        "likes": 5,
        "created_at": "2025-10-19T13:31:20.248Z",
        "is_liked": false
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

---

---

### GET /api/recipes/:id
获取配方详情

**路径参数：**
- `id`: 配方ID

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "item_a": "火",
    "item_b": "水",
    "result": "蒸汽",
    "likes": 5,
    "created_at": "2025-10-19T13:31:20.248Z",
    "is_liked": false,
    "user": {
      "id": 1,
      "username": "testuser"
    }
  }
}
```

---

### POST /api/recipes/submit
提交配方（需要认证）

**请求参数：**
```json
{
  "item_a": "string",    // 物品A名称
  "item_b": "string",    // 物品B名称
  "result": "string"     // 合成结果
}
```

**验证规则：**
- 物品名称长度不超过50个字符
- 只能包含中文、英文、数字、空格、连字符和下划线

**响应示例：**
```json
{
  "code": 201,
  "message": "提交成功",
  "data": {
    "id": 1
  }
}
```

---

### POST /api/recipes/:id/like
点赞/取消点赞配方（需要认证）

**路径参数：**
- `id`: 配方ID

**响应示例：**
```json
{
  "code": 200,
  "message": "点赞成功",
  "data": {
    "liked": true,
    "likes_count": 6
  }
}
```

---

### PUT /api/recipes/:id/public
更新配方公开状态（需要管理员权限）

**路径参数：**
- `id`: 配方ID

**请求参数：**
```json
{
  "is_public": 0 或 1  // 0: 未公开, 1: 公开
}
```

---

### GET /api/recipes/path/:item
搜索合成路径

**路径参数：**
- `item`: 物品名称（需要URL编码）

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "item": "蒸汽",
    "path": [
      {
        "step": 1,
        "item_a": "火",
        "item_b": "水",
        "result": "蒸汽"
      }
    ]
  }
}
```

---

### GET /api/recipes/shortest-path/:item
获取单个物品的最短路径树

**路径参数：**
- `item`: 物品名称（需要URL编码）

---

### GET /api/recipes/graph/stats
获取图统计信息

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total_recipes": 1000,
    "total_items": 500,
    "reachable_items": 450,
    "unreachable_items": 50
  }
}
```

---

### GET /api/recipes/batch
批量获取配方（用于大数据量场景）

**查询参数：**
- `batchSize`: 批次大小（默认1000）
- `lastId`: 上次获取的最后一个ID
- `search`: 搜索关键词

---

---

### GET /api/recipes/icicle-chart/on-demand/:item
按需生成指定物品的冰柱图

**路径参数：**
- `item`: 物品名称（需要URL编码）

**查询参数：**
- `maxDepth`: 最大深度限制（可选）
- `includeStats`: 是否包含统计信息（true/false）

**响应示例：**
```json
{
  "code": 200,
  "message": "按需生成冰柱图成功",
  "data": {
    "nodes": [...],
    "links": [...]
  },
  "responseTime": 150,
  "metadata": {
    "maxDepth": "不限制",
    "nodeCount": 25
  }
}
```

---

### GET /api/recipes/reachability/:item
获取元素的可达性统计信息

**路径参数：**
- `item`: 物品名称（需要URL编码）

**响应示例：**
```json
{
  "code": 200,
  "message": "获取元素可达性统计成功",
  "data": {
    "item": "蒸汽",
    "reachable_count": 10,
    "unreachable_count": 5,
    "total_items": 15,
    "reachability_percentage": 66.7
  },
  "responseTime": 50
}
```

---

---

## 任务管理 API

### GET /api/tasks
获取任务列表

**查询参数：**
- `page`: 页码
- `limit`: 每页数量
- `status`: 任务状态（active, completed）
- `sortBy`: 排序字段（created_at, prize）
- `sortOrder`: 排序顺序（asc, desc）

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "tasks": [
      {
        "id": 1,
        "item_name": "钻石",
        "prize": 100,
        "status": "active",
        "created_at": "2025-10-19T13:31:20.248Z",
        "completed_at": null
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /api/tasks/stats
获取任务统计

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total": 100,
    "active": 50,
    "completed": 50,
    "total_prize": 5000
  }
}
```

---

### GET /api/tasks/:id
获取任务详情

**路径参数：**
- `id`: 任务ID

---

### POST /api/tasks
创建任务（需要认证）

**请求参数：**
```json
{
  "itemName": "string",  // 物品名称
  "prize": 100          // 奖励分数（普通用户自动为0，管理员可设置0-200）
}
```

**响应示例：**
```json
{
  "code": 201,
  "message": "任务创建成功",
  "data": {
    "taskId": 1
  }
}
```

---

### POST /api/tasks/:id/complete
完成任务（需要认证）

**路径参数：**
- `id`: 任务ID

**请求参数：**
```json
{
  "recipeId": 1  // 配方ID
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "🎉 任务完成！获得 100 贡献分",
  "data": {
    "task_id": 1,
    "recipe_id": 1,
    "prize": 100,
    "user_contribute": 200
  }
}
```

---

### PATCH /api/tasks/:id
更新任务悬赏（需要管理员权限）

**路径参数：**
- `id`: 任务ID

**请求参数：**
```json
{
  "prize": 100  // 奖励分数（0-200）
}
```

---

### DELETE /api/tasks/:id
删除任务（需要管理员权限）

**路径参数：**
- `id`: 任务ID

---

## 批量导入 API

### POST /api/import-tasks/batch
批量导入配方（需要认证）

**请求参数：**
```json
{
  "text": "火+水=蒸汽\n土+水=泥浆\n..."
}
```

**响应示例：**
```json
{
  "code": 201,
  "message": "批量导入已开始，请查看通知面板了解进度",
  "data": {
    "taskId": 1,
    "totalCount": 10
  }
}
```

---

### GET /api/import-tasks
获取用户的导入任务列表（需要认证）

**查询参数：**
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `status`: 任务状态筛选

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "tasks": [
      {
        "id": 1,
        "user_id": 1,
        "status": "processing",
        "total_count": 10,
        "success_count": 5,
        "error_count": 2,
        "created_at": "2025-10-19T13:31:20.248Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /api/import-tasks/:id
获取导入任务详情（需要认证）

**路径参数：**
- `id`: 导入任务ID

---

### GET /api/import-tasks/:id/contents
获取导入任务明细（需要认证）

**路径参数：**
- `id`: 导入任务ID

**查询参数：**
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `status`: 内容状态筛选

---

### GET /api/import-tasks/validation-status
获取验证队列状态（需要认证）

---

### DELETE /api/import-tasks/:id/notification
删除导入任务通知（需要认证）

**路径参数：**
- `id`: 导入任务ID

---

### GET /api/import-tasks/unread-completed
获取用户未读的已完成任务（需要认证）

---

## 物品管理 API

### GET /api/items
获取物品列表

**查询参数：**
- `page`: 页码（默认1）
- `length`: 每页数量（默认20）⚠️ 注意：参数名为 `length` 而非 `limit`
- `search`: 搜索关键词
- `type`: 物品类型（base, synthetic, 空字符串表示全部）
- `sortBy`: 排序字段（id, name, usage_count）
- `sortOrder`: 排序顺序（asc, desc）
- `exact`: 精确匹配（true/false）
- `includePrivate`: 是否包含未公开数据（管理员专用）

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "金",
        "emoji": "🥇",
        "is_base": 1,
        "usage_count": 5,
        "recipe_count": 2
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /api/items/random
获取随机物品

**查询参数：**
- `type`: 物品类型（默认 synthetic 合成元素）
  - `synthetic`: 合成元素
  - `base`: 基础元素

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "name": "金",
    "emoji": "🥇",
    "is_base": 1,
    "usage_count": 5,
    "recipe_count": 2
  }
}
```

**注意：** 此端点必须在 `/:id` 之前访问，否则 'random' 会被当作 ID 处理

---

### GET /api/items/:id
获取单个物品详情

**路径参数：**
- `id`: 物品ID

---

### PUT /api/items/:id/public
更新物品公开状态（需要管理员权限）

**路径参数：**
- `id`: 物品ID

**请求参数：**
```json
{
  "is_public": 0 或 1  // 0: 未公开, 1: 公开
}
```

---

## 标签管理 API

### GET /api/tags
获取所有标签

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "tags": [
      {
        "id": 1,
        "name": "基础元素",
        "description": "基础五元素",
        "color": "#FF0000"
      }
    ]
  }
}
```

---

### GET /api/tags/:id
获取标签详情

**路径参数：**
- `id`: 标签ID

---

### POST /api/tags
创建标签（需要管理员权限）

**请求参数：**
```json
{
  "name": "string",          // 标签名称
  "description": "string",   // 描述（可选）
  "color": "string"          // 颜色（可选）
}
```

---

### PATCH /api/tags/:id
更新标签（需要管理员权限）

**路径参数：**
- `id`: 标签ID

**请求参数：**
```json
{
  "name": "string",          // 可选
  "description": "string",   // 可选
  "color": "string"          // 可选
}
```

---

### DELETE /api/tags/:id
删除标签（需要管理员权限）

**路径参数：**
- `id`: 标签ID

---

### GET /api/tags/:id/items
获取拥有指定标签的所有物品

**路径参数：**
- `id`: 标签ID

**查询参数：**
- `page`: 页码
- `limit`: 每页数量

---

### POST /api/items/:id/tags
为物品添加标签（需要管理员权限）

**路径参数：**
- `id`: 物品ID

**请求参数：**
```json
{
  "tagId": 1  // 标签ID
}
```

---

### DELETE /api/items/:id/tags/:tagId
从物品移除标签（需要管理员权限）

**路径参数：**
- `id`: 物品ID
- `tagId`: 标签ID

---

### PUT /api/items/:id/tags
批量设置物品标签（需要管理员权限）

**路径参数：**
- `id`: 物品ID

**请求参数：**
```json
{
  "tagIds": [1, 2, 3]  // 标签ID数组
}
```

---

### GET /api/items/:id/tags
获取物品的所有标签

**路径参数：**
- `id`: 物品ID

---

## 系统监控 API

### GET /api/system/info
获取系统信息

**响应示例：**
```json
{
  "code": 200,
  "message": "获取系统信息成功",
  "data": {
    "cpu": {
      "usage": 0.1,
      "cores": 4,
      "model": "Intel(R) Celeron(R) N5095A @ 2.00GHz"
    },
    "memory": {
      "total": 16295723008,
      "used": 12172926976,
      "free": 4122796032,
      "cached": 0,
      "usage": 74.7
    },
    "disk": {
      "total": 500363689984,
      "used": 26843545600,
      "free": 473520144384,
      "usage": 5,
      "path": "/qy/AzothPath"
    },
    "os": {
      "platform": "linux",
      "version": "4.18.0-553.5.1.el8.x86_64",
      "arch": "x64",
      "hostname": "qingying-peixi"
    },
    "node": {
      "version": "v22.15.0",
      "uptime": 82.081620041
    },
    "uptime": 32.4,
    "startTime": "2025-10-18T05:13:31.546Z"
  }
}
```

---

### GET /api/system/backup/status
获取数据库备份状态

**响应示例：**
```json
{
  "code": 200,
  "message": "获取备份状态成功",
  "data": {
    "backups": [
      {
        "name": "azothpath_backup_20251019.db",
        "size": 1024000,
        "sizeFormatted": "1.00 MB",
        "createdAt": "2025-10-19T13:31:20.248Z"
      }
    ]
  }
}
```

---

### POST /api/system/backup/manual
手动触发数据库备份

**响应示例：**
```json
{
  "code": 200,
  "message": "备份成功",
  "data": {
    "backupPath": "/qy/AzothPath/database/backups/azothpath_backup_20251019.db",
    "timestamp": "2025-10-19T13:31:20.248Z"
  }
}
```

---

### GET /api/system/cache/status
获取图缓存状态

**响应示例：**
```json
{
  "code": 200,
  "message": "获取缓存状态成功",
  "data": {
    "hasGraphCache": true,
    "graphCacheAge": 15000,
    "ttl": 3600,
    "graphLastUpdatedFormatted": "2025-10-19T13:31:20.248Z",
    "graphAgeFormatted": "4小时10分钟15秒"
  }
}
```

---

### POST /api/system/cache/refresh
手动刷新图缓存

**响应示例：**
```json
{
  "code": 200,
  "message": "缓存刷新成功",
  "data": {
    "hasGraphCache": true,
    "graphCacheAge": 0
  }
}
```

---

## 通用信息

### API 首页
**GET /api**

返回API基本信息和可用端点列表

**响应示例：**
```json
{
  "message": "Azoth Path API",
  "version": "1.0.0",
  "endpoints": {
    "recipes": "/api/recipes",
    "users": "/api/users",
    "tasks": "/api/tasks",
    "imports": "/api/import-tasks",
    "items": "/api/items",
    "tags": "/api/tags"
  }
}
```

---

## 认证说明

大部分API需要JWT认证，在请求头中添加：

```
Authorization: Bearer <your_jwt_token>
```

### 用户权限级别

- `auth = 1`: 普通用户
- `auth = 9`: 管理员

### Token获取

通过 `POST /api/users/login` 获取token，在登录成功的响应中获得。

---

## 错误处理

### 常见错误码

- **400**: 请求参数错误
  - 用户名或密码为空
  - 配方参数不完整
  - 物品名称长度超限
  - 字符白名单验证失败

- **401**: 未授权
  - Token无效或过期
  - 用户名或密码错误

- **403**: 权限不足
  - 需要管理员权限
  - 没有权限查看资源

- **404**: 资源不存在
  - 用户不存在
  - 配方不存在
  - 任务不存在

- **500**: 服务器内部错误
  - 数据库连接失败
  - 系统错误

### 错误响应示例

```json
{
  "code": 400,
  "message": "用户名和密码不能为空"
}
```

---

## 限流策略

系统实现了多级限流保护：

1. **严格限流**: 配方提交等敏感操作
2. **一般限流**: 点赞、任务创建等操作
3. **任务创建限流**: 任务创建专用限流
4. **验证限流**: 批量导入验证专用限流

---

## 数据格式说明

### 时间格式
所有时间字段都使用UTC+8时区，格式为ISO 8601：
```
2025-10-19T13:31:20.248Z
```

### 分页格式
所有分页接口都使用统一格式：
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### 配方格式
批量导入配方支持以下格式：
```
A+B=C
物品A+物品B=结果物品
```
