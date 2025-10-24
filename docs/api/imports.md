# 批量导入 API

**基础URL：** `http://localhost:19198`  
**模块：** 批量导入

---

## 批量导入配方

### POST /api/import-tasks/batch

批量导入配方（需要认证）

#### 请求信息
- **方法：** POST
- **路径：** `/api/import-tasks/batch`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/import-tasks/batch](http://localhost:19198/api/import-tasks/batch)

#### 请求参数
```json
{
  "text": "火+水=蒸汽\n土+水=泥浆\n..."
}
```

#### 响应示例
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

#### 配方格式说明
批量导入支持以下格式：
```
A+B=C
物品A+物品B=结果物品
火+水=蒸汽
土+水=泥浆
```

---

## 获取导入任务列表

### GET /api/import-tasks

获取用户的导入任务列表（需要认证）

#### 请求信息
- **方法：** GET
- **路径：** `/api/import-tasks`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/import-tasks](http://localhost:19198/api/import-tasks)

#### 查询参数
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `status`: 任务状态筛选

#### 响应示例
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

## 获取导入任务详情

### GET /api/import-tasks/:id

获取导入任务详情（需要认证）

#### 请求信息
- **方法：** GET
- **路径：** `/api/import-tasks/:id`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/import-tasks/1](http://localhost:19198/api/import-tasks/1)

#### 路径参数
- `id`: 导入任务ID

---

## 获取导入任务明细

### GET /api/import-tasks/:id/contents

获取导入任务明细（需要认证）

#### 请求信息
- **方法：** GET
- **路径：** `/api/import-tasks/:id/contents`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/import-tasks/1/contents](http://localhost:19198/api/import-tasks/1/contents)

#### 路径参数
- `id`: 导入任务ID

#### 查询参数
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `status`: 内容状态筛选

#### 状态说明
- `pending`: 待处理
- `processing`: 处理中
- `success`: 成功
- `failed`: 失败
- `duplicate`: 重复

---

## 获取验证队列状态

### GET /api/import-tasks/validation-status

获取验证队列状态（需要认证）

#### 请求信息
- **方法：** GET
- **路径：** `/api/import-tasks/validation-status`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/import-tasks/validation-status](http://localhost:19198/api/import-tasks/validation-status)

---

## 删除导入任务通知

### DELETE /api/import-tasks/:id/notification

删除导入任务通知（需要认证）

#### 请求信息
- **方法：** DELETE
- **路径：** `/api/import-tasks/:id/notification`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/import-tasks/1/notification](http://localhost:19198/api/import-tasks/1/notification)

#### 路径参数
- `id`: 导入任务ID

---

## 获取未读已完成任务

### GET /api/import-tasks/unread-completed

获取用户未读的已完成任务（需要认证）

#### 请求信息
- **方法：** GET
- **路径：** `/api/import-tasks/unread-completed`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/import-tasks/unread-completed](http://localhost:19198/api/import-tasks/unread-completed)

---

## 批量导入流程说明

### 处理流程
1. **提交阶段**: 用户提交文本格式配方
2. **任务创建**: 创建 `import_tasks` 记录，返回 `taskId`
3. **解析入库**: 解析后创建 `import_tasks_content` 明细记录
4. **异步处理**: 后台任务队列异步处理
5. **验证限流**: 使用 `validationLimiter` 串行化请求
6. **外部验证**: 调用 `https://hc.tsdo.in/api/check` 验证配方
7. **数据入库**: 验证成功后写入数据库
8. **统计更新**: 实时更新任务统计

### 验证规则
- **Status 200**: 验证成功
- **Status 400**: 参数错误，标记为 failed
- **Status 403**: 包含非法物件，标记为 failed
- **Status 404**: 配方不匹配，标记为 failed
- **网络错误**: 允许重试（最多3次）

### 贡献分计算
- **新配方**: +1 分
- **新物品**: 每个 +2 分（最多6分）
- **任务奖励**: 完成任务获得 `task.prize` 分

---

## 相关文档

- [API文档首页](../README.md)
- [通用信息](../common.md)
- [认证说明](../common.md#认证说明)
- [错误处理](../common.md#错误处理)
