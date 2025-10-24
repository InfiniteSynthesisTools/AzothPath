# 用户管理 API

**基础URL：** `http://localhost:19198`  
**模块：** 用户管理

---

## 用户注册

### POST /api/users/register

用户注册

#### 请求信息
- **方法：** POST
- **路径：** `/api/users/register`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/users/register](http://localhost:19198/api/users/register)

#### 请求参数
```json
{
  "username": "string",  // 3-20个字符
  "password": "string"   // 至少6个字符
}
```

#### 响应示例
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

## 用户登录

### POST /api/users/login

用户登录

#### 请求信息
- **方法：** POST
- **路径：** `/api/users/login`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/users/login](http://localhost:19198/api/users/login)

#### 请求参数
```json
{
  "username": "string",
  "password": "string"
}
```

#### 响应示例
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

## 获取当前用户信息

### GET /api/users/me

获取当前用户信息（需要认证）

#### 请求信息
- **方法：** GET
- **路径：** `/api/users/me`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/users/me](http://localhost:19198/api/users/me)

#### 认证方式
```
Authorization: Bearer <your_jwt_token>
```

#### 响应示例
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

## 获取特定用户信息

### GET /api/users/:id

获取特定用户信息（公开信息）

#### 请求信息
- **方法：** GET
- **路径：** `/api/users/:id`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/users/1](http://localhost:19198/api/users/1)

#### 路径参数
- `id`: 用户ID

#### 响应示例
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

## 贡献排行榜

### GET /api/users/contribution-rank

获取贡献排行榜

#### 请求信息
- **方法：** GET
- **路径：** `/api/users/contribution-rank`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/users/contribution-rank](http://localhost:19198/api/users/contribution-rank)

#### 查询参数
- `page`: 页码（默认1）
- `limit`: 每页数量（默认10）

#### 响应示例
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

## 用户详细统计

### GET /api/users/:id/stats

获取用户详细贡献统计

#### 请求信息
- **方法：** GET
- **路径：** `/api/users/:id/stats`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/users/1/stats](http://localhost:19198/api/users/1/stats)

#### 路径参数
- `id`: 用户ID

#### 响应示例
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

## 用户点赞的配方

### GET /api/users/:id/liked-recipes

获取用户点赞的配方列表

#### 请求信息
- **方法：** GET
- **路径：** `/api/users/:id/liked-recipes`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/users/1/liked-recipes](http://localhost:19198/api/users/1/liked-recipes)

#### 路径参数
- `id`: 用户ID

#### 查询参数
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）

---

## 管理员功能

### GET /api/users/admin/list

获取所有用户列表（管理员功能）

#### 请求信息
- **方法：** GET
- **路径：** `/api/users/admin/list`
- **认证：** 需要管理员权限（auth=9）
- **示例链接：** [http://localhost:19198/api/users/admin/list](http://localhost:19198/api/users/admin/list)

#### 查询参数
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `search`: 搜索关键词
- `role`: 角色筛选

---

### PUT /api/users/admin/:id/role

更新用户权限（管理员功能）

#### 请求信息
- **方法：** PUT
- **路径：** `/api/users/admin/:id/role`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/users/admin/1/role](http://localhost:19198/api/users/admin/1/role)

#### 请求参数
```json
{
  "role": 1 或 9  // 1: 普通用户, 9: 管理员
}
```

---

### PUT /api/users/admin/:id

更新用户信息（管理员功能）

#### 请求信息
- **方法：** PUT
- **路径：** `/api/users/admin/:id`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/users/admin/1](http://localhost:19198/api/users/admin/1)

#### 请求参数
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

#### 请求信息
- **方法：** DELETE
- **路径：** `/api/users/admin/:id`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/users/admin/1](http://localhost:19198/api/users/admin/1)

---

### GET /api/users/admin/count

获取用户总数（管理员功能）

#### 请求信息
- **方法：** GET
- **路径：** `/api/users/admin/count`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/users/admin/count](http://localhost:19198/api/users/admin/count)

#### 响应示例
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

## 相关文档

- [API文档首页](../README.md)
- [通用信息](../common.md)
- [认证说明](../common.md#认证说明)
- [错误处理](../common.md#错误处理)
