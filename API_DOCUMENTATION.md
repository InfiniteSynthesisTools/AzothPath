# API 文档

> 相关文档：[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | [INSTALL.md](INSTALL.md) | [README.md](README.md)

## ⚠️ 重要规则
**前后端 API 字段名与数据库字段名完全一致，不进行任何转换！**

## 认证相关 API

### POST /api/auth/register
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

### POST /api/auth/login
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

---

## 用户相关 API

### GET /api/user/profile
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

### GET /api/user/contribution
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

### GET /api/user/stats
**获取用户统计信息**

**响应**:
```json
{
  "total_recipes": 50,
  "total_likes": 120,
  "completed_tasks": 8,
  "contribution_rank": 5
}
```

### GET /api/user/favorites
**获取用户收藏的配方**

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
      "is_liked": true
    }
  ],
  "total": 15
}
```

---

## 配方相关 API

### GET /api/recipes
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

### GET /api/recipes/:id
**获取配方详情**

**响应**:
```json
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
```

### POST /api/recipes
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

### POST /api/recipes/:id/like
**点赞/取消点赞配方**

**响应**:
```json
{
  "success": true,
  "likes": 6,
  "is_liked": true
}
```

### GET /api/recipes/search
**搜索配方**

**查询参数**:
- `q`: 搜索关键词
- `page`: 页码（默认1）
- `limit`: 每页数量（默认10）

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
  "total": 10,
  "page": 1,
  "limit": 10
}
```

---

## 物品相关 API

### GET /api/items
**获取物品列表**

**查询参数**:
- `search`: 搜索关键词（可选）
- `is_base`: 是否基础材料（可选：0,1）

**响应**:
```json
{
  "items": [
    {
      "id": 1,
      "name": "金",
      "emoji": "🥇",
      "pinyin": "jin",
      "is_base": 1,
      "created_at": "2025-10-18T12:00:00Z"
    }
  ],
  "total": 50
}
```

---

## 任务相关 API

### GET /api/tasks
**获取悬赏任务列表**

**查询参数**:
- `status`: 任务状态（可选：active, completed）

**响应**:
```json
{
  "tasks": [
    {
      "id": 1,
      "item_name": "龙",
      "prize": 10,
      "status": "active",
      "created_at": "2025-10-18T12:00:00Z",
      "completed_by_recipe_id": null,
      "completed_at": null
    }
  ],
  "total": 5
}
```

### POST /api/tasks/:id/complete
**完成任务**

**请求体**:
```json
{
  "recipe_id": 123
}
```

**响应**:
```json
{
  "success": true,
  "message": "任务完成",
  "contribute": 10
}
```

---

## 导入相关 API

### POST /api/import/batch
**批量导入配方**

**请求体**:
```json
{
  "recipes": [
    {
      "item_a": "金",
      "item_b": "木",
      "result": "合金"
    },
    {
      "item_a": "水",
      "item_b": "火",
      "result": "蒸汽"
    }
  ]
}
```

**响应**:
```json
{
  "task_id": 1,
  "total_count": 2,
  "status": "processing"
}
```

### GET /api/import/tasks
**获取导入任务列表**

**响应**:
```json
{
  "tasks": [
    {
      "id": 1,
      "user_id": 1,
      "total_count": 100,
      "success_count": 85,
      "failed_count": 10,
      "duplicate_count": 5,
      "status": "completed",
      "error_details": "{}",
      "created_at": "2025-10-18T12:00:00Z",
      "updated_at": "2025-10-18T12:05:00Z"
    }
  ],
  "total": 3
}
```

### GET /api/import/tasks/:id
**获取导入任务详情**

**响应**:
```json
{
  "id": 1,
  "user_id": 1,
  "total_count": 100,
  "success_count": 85,
  "failed_count": 10,
  "duplicate_count": 5,
  "status": "completed",
  "error_details": "{}",
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:05:00Z",
  "contents": [
    {
      "id": 1,
      "task_id": 1,
      "item_a": "金",
      "item_b": "木",
      "result": "合金",
      "status": "success",
      "error_message": null,
      "recipe_id": 123,
      "created_at": "2025-10-18T12:00:00Z"
    }
  ]
}
```

---

## 通知相关 API

### GET /api/notifications
**获取用户通知列表**

**查询参数**:
- `status`: 通知状态（可选：UNREAD, READ, ARCHIVED）
- `page`: 页码（默认1）
- `limit`: 每页数量（默认10）

**响应**:
```json
{
  "notifications": [
    {
      "id": 1,
      "title": "新配方点赞",
      "content": "您的配方\"合金\"获得了一个点赞",
      "type": "like",
      "sender_id": 2,
      "priority": 2,
      "action_url": "/recipe/1",
      "expires_at": "2025-10-25T12:00:00Z",
      "created_at": "2025-10-18T12:00:00Z",
      "status": "UNREAD",
      "read_at": null,
      "archived_at": null,
      "deleted_at": null
    }
  ],
  "total": 5,
  "unread_count": 3,
  "page": 1,
  "limit": 10
}
```

### PUT /api/notifications/:id/read
**标记通知为已读**

**响应**:
```json
{
  "success": true,
  "status": "READ"
}
```

### PUT /api/notifications/:id/archive
**归档通知**

**响应**:
```json
{
  "success": true,
  "status": "ARCHIVED"
}
```

### DELETE /api/notifications/:id
**删除通知**

**响应**:
```json
{
  "success": true,
  "status": "DELETED"
}
```

---

## 错误响应格式

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

---

## 前端类型定义参考

```typescript
// API 响应通用类型
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// 用户相关
export interface User {
  id: number;
  name: string;
  auth: number;
  contribute: number;
  level: number;
  created_at: string;
}

export interface UserStats {
  total_recipes: number;
  total_likes: number;
  completed_tasks: number;
  contribution_rank: number;
}

// 配方相关
export interface Recipe {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;
  likes: number;
  created_at: string;
  creator_name?: string;
  is_liked?: boolean;
}

// 任务相关
export interface Task {
  id: number;
  item_name: string;
  prize: number;
  status: string;
  created_at: string;
  completed_by_recipe_id?: number;
  completed_at?: string;
}

// 导入相关
export interface ImportTask {
  id: number;
  user_id: number;
  total_count: number;
  success_count: number;
  failed_count: number;
  duplicate_count: number;
  status: string;
  error_details: string;
  created_at: string;
  updated_at: string;
}

// 通知相关
export interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  sender_id: number;
  priority: number;
  action_url?: string;
  expires_at?: string;
  created_at: string;
  status: string;
  read_at?: string;
  archived_at?: string;
  deleted_at?: string;
}
