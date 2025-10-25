# 物品管理 API

**基础URL：** `http://localhost:19198`  
**模块：** 物品管理

---

## 获取物品列表

### GET /api/items

获取物品列表

#### 请求信息
- **方法：** GET
- **路径：** `/api/items`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/items](http://localhost:19198/api/items)

#### 查询参数
- `page`: 页码（默认1）
- `length`: 每页数量（默认20）⚠️ 注意：参数名为 `length` 而非 `limit`
- `search`: 搜索关键词
- `type`: 物品类型（base, synthetic, 空字符串表示全部）
- `sortBy`: 排序字段（id, name, usage_count）
- `sortOrder`: 排序顺序（asc, desc）
- `exact`: 精确匹配（true/false）
- `includePrivate`: 是否包含未公开数据（管理员专用）

#### 响应示例
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

## 获取随机物品

### GET /api/items/random

获取随机物品

#### 请求信息
- **方法：** GET
- **路径：** `/api/items/random`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/items/random](http://localhost:19198/api/items/random)

#### 查询参数
- `type`: 物品类型（默认 synthetic 合成元素）
  - `synthetic`: 合成元素
  - `base`: 基础元素

#### 响应示例
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

## 获取单个物品详情

### GET /api/items/:id

获取单个物品详情（支持ID和物品名搜索）

#### 请求信息
- **方法：** GET
- **路径：** `/api/items/:id`
- **认证：** 无需认证
- **示例链接：** 
  - 按ID搜索：[http://localhost:19198/api/items/1](http://localhost:19198/api/items/1)
  - 按名称搜索：[http://localhost:19198/api/items/水](http://localhost:19198/api/items/水)

#### 路径参数
- `id` (string): 物品ID（数字）或物品名称（字符串）

#### 搜索方式
1. **数字ID搜索**：`/api/items/1` - 通过物品ID查找
2. **物品名搜索**：`/api/items/水` - 通过物品名称精确查找

---

## 更新物品公开状态

### PUT /api/items/:id/public

更新物品公开状态（需要管理员权限）

#### 请求信息
- **方法：** PUT
- **路径：** `/api/items/:id/public`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/items/1/public](http://localhost:19198/api/items/1/public)

#### 路径参数
- `id`: 物品ID

#### 请求参数
```json
{
  "is_public": 0 或 1  // 0: 未公开, 1: 公开
}
```

---

## 物品类型说明

### 基础材料
系统预置的基础材料：
- **金** 🪙
- **木** 🪵
- **水** 💧
- **火** 🔥
- **土** 🌍

### 物品属性
- `is_base`: 是否为基础材料（0=否, 1=是）
- `is_public`: 是否公开展示（0=否, 1=是）
- `usage_count`: 作为材料的使用次数
- `recipe_count`: 作为结果的配方数量

### 搜索功能
- **精确匹配**: 设置 `exact=true` 进行精确搜索
- **模糊搜索**: 默认支持模糊匹配
- **类型筛选**: 通过 `type` 参数筛选基础材料或合成材料

---

## 相关文档

- [API文档首页](../README.md)
- [通用信息](../common.md)
- [认证说明](../common.md#认证说明)
- [错误处理](../common.md#错误处理)
