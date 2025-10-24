# 标签管理 API

**基础URL：** `http://localhost:19198`  
**模块：** 标签管理

---

## 获取所有标签

### GET /api/tags

获取所有标签

#### 请求信息
- **方法：** GET
- **路径：** `/api/tags`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/tags](http://localhost:19198/api/tags)

#### 响应示例
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

## 获取标签详情

### GET /api/tags/:id

获取标签详情

#### 请求信息
- **方法：** GET
- **路径：** `/api/tags/:id`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/tags/1](http://localhost:19198/api/tags/1)

#### 路径参数
- `id`: 标签ID

---

## 创建标签

### POST /api/tags

创建标签（需要管理员权限）

#### 请求信息
- **方法：** POST
- **路径：** `/api/tags`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/tags](http://localhost:19198/api/tags)

#### 请求参数
```json
{
  "name": "string",          // 标签名称
  "description": "string",   // 描述（可选）
  "color": "string"          // 颜色（可选）
}
```

---

## 更新标签

### PATCH /api/tags/:id

更新标签（需要管理员权限）

#### 请求信息
- **方法：** PATCH
- **路径：** `/api/tags/:id`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/tags/1](http://localhost:19198/api/tags/1)

#### 路径参数
- `id`: 标签ID

#### 请求参数
```json
{
  "name": "string",          // 可选
  "description": "string",   // 可选
  "color": "string"          // 可选
}
```

---

## 删除标签

### DELETE /api/tags/:id

删除标签（需要管理员权限）

#### 请求信息
- **方法：** DELETE
- **路径：** `/api/tags/:id`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/tags/1](http://localhost:19198/api/tags/1)

#### 路径参数
- `id`: 标签ID

---

## 获取拥有指定标签的物品

### GET /api/tags/:id/items

获取拥有指定标签的所有物品

#### 请求信息
- **方法：** GET
- **路径：** `/api/tags/:id/items`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/tags/1/items](http://localhost:19198/api/tags/1/items)

#### 路径参数
- `id`: 标签ID

#### 查询参数
- `page`: 页码
- `limit`: 每页数量

---

## 为物品添加标签

### POST /api/items/:id/tags

为物品添加标签（需要管理员权限）

#### 请求信息
- **方法：** POST
- **路径：** `/api/items/:id/tags`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/items/1/tags](http://localhost:19198/api/items/1/tags)

#### 路径参数
- `id`: 物品ID

#### 请求参数
```json
{
  "tagId": 1  // 标签ID
}
```

---

## 从物品移除标签

### DELETE /api/items/:id/tags/:tagId

从物品移除标签（需要管理员权限）

#### 请求信息
- **方法：** DELETE
- **路径：** `/api/items/:id/tags/:tagId`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/items/1/tags/1](http://localhost:19198/api/items/1/tags/1)

#### 路径参数
- `id`: 物品ID
- `tagId`: 标签ID

---

## 批量设置物品标签

### PUT /api/items/:id/tags

批量设置物品标签（需要管理员权限）

#### 请求信息
- **方法：** PUT
- **路径：** `/api/items/:id/tags`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/items/1/tags](http://localhost:19198/api/items/1/tags)

#### 路径参数
- `id`: 物品ID

#### 请求参数
```json
{
  "tagIds": [1, 2, 3]  // 标签ID数组
}
```

---

## 获取物品的所有标签

### GET /api/items/:id/tags

获取物品的所有标签

#### 请求信息
- **方法：** GET
- **路径：** `/api/items/:id/tags`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/items/1/tags](http://localhost:19198/api/items/1/tags)

#### 路径参数
- `id`: 物品ID

---

## 标签系统说明

### 标签功能
- **分类管理**: 为物品添加标签进行分类
- **颜色标识**: 支持为标签设置颜色
- **描述信息**: 为标签添加详细描述
- **批量操作**: 支持批量设置物品标签

### 权限控制
- **查看标签**: 所有用户都可以查看标签信息
- **管理标签**: 只有管理员可以创建、修改、删除标签
- **标签关联**: 只有管理员可以为物品添加或移除标签

### 使用场景
- **物品分类**: 按功能、类型、稀有度等对物品进行分类
- **搜索筛选**: 通过标签快速筛选相关物品
- **可视化**: 使用不同颜色标识不同类型的标签

---

## 相关文档

- [API文档首页](../README.md)
- [通用信息](../common.md)
- [认证说明](../common.md#认证说明)
- [错误处理](../common.md#错误处理)
