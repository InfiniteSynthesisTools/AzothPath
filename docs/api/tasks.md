# 任务管理 API

**基础URL：** `http://localhost:19198`  
**模块：** 任务管理

---

## 获取任务列表

### GET /api/tasks

获取任务列表

#### 请求信息
- **方法：** GET
- **路径：** `/api/tasks`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/tasks](http://localhost:19198/api/tasks)

#### 查询参数
- `page`: 页码
- `limit`: 每页数量
- `status`: 任务状态（active, completed）
- `sortBy`: 排序字段（created_at, prize）
- `sortOrder`: 排序顺序（asc, desc）

#### 响应示例
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

## 获取任务统计

### GET /api/tasks/stats

获取任务统计

#### 请求信息
- **方法：** GET
- **路径：** `/api/tasks/stats`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/tasks/stats](http://localhost:19198/api/tasks/stats)

#### 响应示例
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

## 获取任务详情

### GET /api/tasks/:id

获取任务详情

#### 请求信息
- **方法：** GET
- **路径：** `/api/tasks/:id`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/tasks/1](http://localhost:19198/api/tasks/1)

#### 路径参数
- `id`: 任务ID

---

## 创建任务

### POST /api/tasks

创建任务（需要认证）

#### 请求信息
- **方法：** POST
- **路径：** `/api/tasks`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/tasks](http://localhost:19198/api/tasks)

#### 请求参数
```json
{
  "itemName": "string",  // 物品名称
  "prize": 100          // 奖励分数（普通用户自动为0，管理员可设置0-200）
}
```

#### 响应示例
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

## 完成任务

### POST /api/tasks/:id/complete

完成任务（需要认证）

#### 请求信息
- **方法：** POST
- **路径：** `/api/tasks/:id/complete`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/tasks/1/complete](http://localhost:19198/api/tasks/1/complete)

#### 路径参数
- `id`: 任务ID

#### 请求参数
```json
{
  "recipeId": 1  // 配方ID
}
```

#### 响应示例
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

## 更新任务悬赏

### PATCH /api/tasks/:id

更新任务悬赏（需要管理员权限）

#### 请求信息
- **方法：** PATCH
- **路径：** `/api/tasks/:id`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/tasks/1](http://localhost:19198/api/tasks/1)

#### 路径参数
- `id`: 任务ID

#### 请求参数
```json
{
  "prize": 100  // 奖励分数（0-200）
}
```

---

## 删除任务

### DELETE /api/tasks/:id

删除任务（需要管理员权限）

#### 请求信息
- **方法：** DELETE
- **路径：** `/api/tasks/:id`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/tasks/1](http://localhost:19198/api/tasks/1)

#### 路径参数
- `id`: 任务ID

---

## 任务状态说明

### 任务状态
- `active`: 活跃任务，等待完成
- `completed`: 已完成任务

### 任务类型
- `find_recipe`: 寻找配方（物品无任何配方时）
- `find_more_recipes`: 寻找更多配方（物品已有配方，鼓励发现更多合成方式）

### 奖励机制
- **普通用户**: 创建任务时奖励自动设为0
- **管理员**: 可设置0-200分的奖励
- **自动完成**: 用户提交配方后，系统自动检查并完成任务
- **智能过滤**: 目标物品存在于材料中的配方不算完成任务（防止循环配方刷分）
- **先到先得**: 只有第一个完成验证的配方获得奖励

### 任务完成逻辑
系统会自动检查新提交的配方是否完成相关任务：

1. **配方验证**: 检查配方结果是否匹配任务目标物品
2. **材料检查**: 检查目标物品是否存在于配方材料中
3. **智能过滤**: 如果目标物品存在于材料中，该配方不算完成任务
4. **奖励发放**: 符合条件的配方会自动完成任务并发放奖励

**示例场景**：
- ✅ **会完成任务**: 任务寻找"合金"，配方"金 + 木 = 合金"
- ❌ **不会完成任务**: 任务寻找"合金"，配方"金 + 合金 = 合金"

---

## 相关文档

- [API文档首页](../README.md)
- [通用信息](../common.md)
- [认证说明](../common.md#认证说明)
- [错误处理](../common.md#错误处理)
