# 配方管理 API

**基础URL：** `http://localhost:19198`  
**模块：** 配方管理

---

## 获取配方列表

### GET /api/recipes

获取配方列表

#### 请求信息
- **方法：** GET
- **路径：** `/api/recipes`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/recipes](http://localhost:19198/api/recipes)

#### 查询参数
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `search`: 搜索关键词
- `orderBy`: 排序字段（created_at, likes等）
- `result`: 按结果筛选
- `cursor`: 游标分页（用于大数据量）
- `includePrivate`: 是否包含未公开数据（管理员专用，默认1）
- `includeStats`: 是否包含统计信息（默认0）

#### 响应示例
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

## 获取配方详情

### GET /api/recipes/:id

获取配方详情

#### 请求信息
- **方法：** GET
- **路径：** `/api/recipes/:id`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/recipes/1](http://localhost:19198/api/recipes/1)

#### 路径参数
- `id`: 配方ID

#### 响应示例
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

## 提交配方

### POST /api/recipes/submit

提交配方（需要认证）

#### 请求信息
- **方法：** POST
- **路径：** `/api/recipes/submit`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/recipes/submit](http://localhost:19198/api/recipes/submit)

#### 请求参数
```json
{
  "item_a": "string",    // 物品A名称
  "item_b": "string",    // 物品B名称
  "result": "string"     // 合成结果
}
```

#### 验证规则
- 物品名称长度不超过50个字符
- 只能包含中文、英文、数字、空格、连字符和下划线

#### 响应示例
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

## 点赞配方

### POST /api/recipes/:id/like

点赞/取消点赞配方（需要认证）

#### 请求信息
- **方法：** POST
- **路径：** `/api/recipes/:id/like`
- **认证：** Bearer Token
- **示例链接：** [http://localhost:19198/api/recipes/1/like](http://localhost:19198/api/recipes/1/like)

#### 路径参数
- `id`: 配方ID

#### 响应示例
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

## 更新配方公开状态

### PUT /api/recipes/:id/public

更新配方公开状态（需要管理员权限）

#### 请求信息
- **方法：** PUT
- **路径：** `/api/recipes/:id/public`
- **认证：** 需要管理员权限
- **示例链接：** [http://localhost:19198/api/recipes/1/public](http://localhost:19198/api/recipes/1/public)

#### 路径参数
- `id`: 配方ID

#### 请求参数
```json
{
  "is_public": 0 或 1  // 0: 未公开, 1: 公开
}
```

---

## 搜索合成路径

### GET /api/recipes/path/:item

搜索合成路径

#### 请求信息
- **方法：** GET
- **路径：** `/api/recipes/path/:item`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/recipes/path/蒸汽](http://localhost:19198/api/recipes/path/蒸汽)

#### 路径参数
- `item`: 物品名称（需要URL编码）

#### 响应示例
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

## 获取最短路径树

### GET /api/recipes/shortest-path/:item

获取单个物品的最短路径树

#### 请求信息
- **方法：** GET
- **路径：** `/api/recipes/shortest-path/:item`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/recipes/shortest-path/蒸汽](http://localhost:19198/api/recipes/shortest-path/蒸汽)

#### 路径参数
- `item`: 物品名称（需要URL编码）

---

## 获取图统计信息

### GET /api/recipes/graph/stats

获取图统计信息

#### 请求信息
- **方法：** GET
- **路径：** `/api/recipes/graph/stats`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/recipes/graph/stats](http://localhost:19198/api/recipes/graph/stats)

#### 响应示例
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

## 批量获取配方

### GET /api/recipes/batch

批量获取配方（用于大数据量场景）

#### 请求信息
- **方法：** GET
- **路径：** `/api/recipes/batch`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/recipes/batch](http://localhost:19198/api/recipes/batch)

#### 查询参数
- `batchSize`: 批次大小（默认1000）
- `lastId`: 上次获取的最后一个ID
- `search`: 搜索关键词

---

## 按需生成冰柱图

### GET /api/recipes/icicle-chart/on-demand/:item

按需生成指定物品的冰柱图

#### 请求信息
- **方法：** GET
- **路径：** `/api/recipes/icicle-chart/on-demand/:item`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/recipes/icicle-chart/on-demand/蒸汽](http://localhost:19198/api/recipes/icicle-chart/on-demand/蒸汽)

#### 路径参数
- `item`: 物品名称（需要URL编码）

#### 查询参数
- `maxDepth`: 最大深度限制（可选）
- `includeStats`: 是否包含统计信息（true/false）

#### 响应示例
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

## 获取元素可达性统计

### GET /api/recipes/reachability/:item

获取元素的可达性统计信息

#### 请求信息
- **方法：** GET
- **路径：** `/api/recipes/reachability/:item`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/recipes/reachability/蒸汽](http://localhost:19198/api/recipes/reachability/蒸汽)

#### 路径参数
- `item`: 物品名称（需要URL编码）

#### 响应示例
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

## 相关文档

- [API文档首页](../README.md)
- [通用信息](../common.md)
- [认证说明](../common.md#认证说明)
- [错误处理](../common.md#错误处理)
