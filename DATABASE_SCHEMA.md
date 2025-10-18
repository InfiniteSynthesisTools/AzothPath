# 数据库字段对照表

## ⚠️ 重要规则
**前后端 API 字段名与数据库字段名完全一致，不进行任何转换！**

## 核心表结构

### 1. `user` 表（用户）

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

### 2. `recipes` 表（配方）

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

### 3. `recipe_likes` 表（配方点赞）

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

### 4. `items` 表（物品词典）

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

### 5. `task` 表（悬赏任务）

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

### 6. `import_tasks` 表（批量导入任务汇总）

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

### 7. `import_tasks_content` 表（批量导入任务明细）

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

## API 响应示例

### 用户信息
```json
{
  "id": 1,
  "name": "admin",
  "auth": 9,
  "contribute": 100,
  "level": 1,
  "created_at": "2025-10-18T12:00:00Z"
}
```

### 配方列表（含 JOIN）
```json
{
  "id": 1,
  "item_a": "金",
  "item_b": "木",
  "result": "合金",
  "user_id": 1,
  "likes": 5,
  "created_at": "2025-10-18T12:00:00Z",
  "creator_name": "admin"
}
```

### 贡献榜
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

---

## 常见错误

### ❌ 错误字段名
- `creator_id` → ✅ 使用 `user_id`
- `username` → ✅ 使用 `name`
- `role` → ✅ 使用 `auth`
- `total_contribution` → ✅ 使用 `contribute`

### ✅ 点赞数字段
- `likes` 字段直接存储在 `recipes` 表中（冗余设计）
- 点赞/取消点赞时需要同时更新 `recipes.likes` 和 `recipe_likes` 表
- 提高查询性能，避免每次都 COUNT 统计

```sql
-- ✅ 正确：直接查询 likes 字段
SELECT * FROM recipes WHERE likes > 10 ORDER BY likes DESC;

-- ✅ 点赞操作（事务）
BEGIN TRANSACTION;
INSERT INTO recipe_likes (recipe_id, user_id) VALUES (1, 1);
UPDATE recipes SET likes = likes + 1 WHERE id = 1;
COMMIT;
```

---

## 前端类型定义参考

```typescript
// types/user.ts
export interface User {
  id: number;
  name: string;
  auth: number;  // 1=user, 9=admin
  contribute: number;
  level: number;
  created_at: string;
}

// types/recipe.ts
export interface Recipe {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;
  likes: number;  // 点赞数（直接从数据库获取）
  created_at: string;
  creator_name?: string;  // JOIN 时返回
  is_liked?: boolean;  // 前端本地状态
}
```
