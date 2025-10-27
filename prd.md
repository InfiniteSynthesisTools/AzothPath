## Azoth Path 产品需求文档 (PRD)

> 目录（跳转到对应章节）

- 0. [产品信息](#0-产品信息)
- 1. [数据整理与处理逻辑](#1-数据整理与处理逻辑)
- 2. 图算法与路径搜索（见 3.x 小节）
- 3. [图算法与合成路径](#-图算法与合成路径)
- 4. [打包部署](#-打包部署)
- 5. [安全配置](#-🔒-安全配置)
- 6. [贡献指南](#-贡献指南)
- 7. [开源协议](#-开源协议)
- 8. [联系方式](#-联系方式)

—— 本文保持与代码实现同步，详细 API 请参阅 docs/api ——

**文档版本：** v2.0 | **更新日期：** 2025-10-19 | **文档状态：** 与代码实现同步 ✅

---

### 0. 产品信息

| 字段 | 值 | 备注 |
| :--- | :--- | :--- |
| **产品名称** | **Azoth Path** | |
| **副标题** | 无尽合成工具站 | |
| **产品目标** | 为游戏玩家提供快速检索和贡献合成路径的工具，活跃玩家社区。 | |
| **游戏信息** | 无尽合成 (https://hc.tsdo.in/) | 中文元素合成游戏 |
| **后端服务** | http://localhost:19198 | Express + TypeScript |
| **前端服务** | http://localhost:11451 | Vue 3 + Vite |
| **开发环境** | Node.js 18+, TypeScript, SQLite, Vue 3 | |
| **数据库** | SQLite (WAL 模式) | 位于 backend/database/azothpath.db |
| **文档参考** | API_DOCUMENTATION.md | 完整 API 端点说明 |

**核心功能状态：**
- ✅ 用户注册登录（JWT 认证）
- ✅ 配方提交与验证（外部 API 集成）
- ✅ 批量导入系统（异步队列处理）
- ✅ 合成路径搜索（BFS 算法）
- ✅ 点赞系统（切换式点赞）
- ✅ 任务悬赏系统（自动创建与完成）
- ✅ 贡献度实时计算
- ✅ 系统监控（CPU、内存、磁盘）
- 📋 拼音搜索（待实现）

---

### 1. 数据整理与处理逻辑

#### 1.1 用户数据解析与入库流程

| 步骤/功能 | 描述 | 状态 |
| :--- | :--- | :--- |
| **数据输入** | 支持 $\text{A + B = C}$ 文本格式批量导入。通过 `POST /api/import-tasks/batch` 提交。 | ✅ 已实现 |
| **任务创建** | 创建 `import_tasks` 记录（自增 ID），返回 $\text{taskId}$ 供前端查询进度。 | ✅ 已实现 |
| **解析落库** | 解析后在 `import_tasks_content` 表中为每条配方创建明细记录，关联 $\text{task\_id}$，初始状态为 $\text{pending}$。 | ✅ 已实现 |
| **异步处理** | 后台任务队列 (`importTaskQueue`) 异步处理明细记录，状态流转：$\text{pending} \rightarrow \text{processing} \rightarrow \text{success/failed/duplicate}$。 | ✅ 已实现 |
| **队列系统** | 使用 `validationLimiter` 限流，每次处理 10 个并发任务，避免触发外部 API 限流。 | ✅ 已实现 |
| **重试机制** | 失败任务自动重试，最多 3 次 (`MAX_RETRY_COUNT`)，超过后标记为 $\text{failed}$。 | ✅ 已实现 |
| **数据有效性校验** | 通过外部 API (`https://hc.tsdo.in/api/check`) 校验配方，使用 `validationLimiter` 串行化请求。 | ✅ 已实现 |
| **去重检查** | 在验证前检查 `recipes` 表，重复配方标记为 $\text{duplicate}$，并关联已存在的 `recipe_id`。 | ✅ 已实现 |
| **新词条收录** | 验证成功后，自动将 `item_a, item_b, result` 添加到 `items` 表（如不存在），并保存结果物品的 emoji。 | ✅ 已实现 |
| **成功入库** | 验证通过且无重复的配方写入 `recipes` 表，更新 `import_tasks_content` 状态为 $\text{success}$，实时更新 `import_tasks` 统计。 | ✅ 已实现 |
| **验证 API 错误处理** | 
  - Status 400: "这两个物件不能合成" → 标记为 failed<br>
  - Status 403: "包含非法物件（还没出现过的物件）" → 标记为 failed<br>
  - 网络错误: 允许重试<br>
  - 超时: 允许重试 | ✅ 已实现 |
| **进度查询** | 
  - `GET /api/import-tasks` - 获取任务列表<br>
  - `GET /api/import-tasks/:id` - 获取任务详情<br>
  - `GET /api/import-tasks/:id/contents` - 获取明细列表<br>
  - 实时更新统计计数器 | ✅ 已实现 |
| **队列状态监控** | `GET /api/import-tasks/validation-status` - 查看验证队列状态（队列长度、处理状态）。 | ✅ 已实现 |

**流程图示：**

```
用户提交数据 → 创建 import_tasks (返回 task_id)
                ↓
          解析 → 批量创建 import_tasks_content (pending)
                ↓
          后台任务队列拉取 task_id
                ↓
    处理明细记录 → 更新状态为 processing → 调用验证 API
                ↓
         ┌──────┴──────┐
    验证失败           验证成功
         ↓                ↓
   status=failed    检查是否重复
   记录错误信息          ↓
   更新failed_count  ┌──────┴──────┐
                  已存在           不存在
                    ↓              ↓
          status=duplicate  写入recipes表
          更新duplicate_count  status=success
                         关联recipe_id
                         更新success_count
                ↓
    所有明细处理完成 → 更新 import_tasks.status = completed
```

#### 1.2 任务（Task）生成与完成逻辑

| 方面 | 规则描述 | 状态 |
| :--- | :--- | :--- |
| **任务类型** | 
  - `find_recipe`: 寻找配方（物品无任何配方时）<br>
  - `find_more_recipes`: 寻找更多配方（物品已有配方，鼓励发现更多合成方式） | ✅ 已实现 |
| **手动创建** | 
  - 用户/管理员通过 `POST /api/tasks` 创建任务<br>
  - 需指定物品名称和奖励分数<br>
  - 系统自动检查是否已有配方，确定任务类型<br>
  - 基础材料（金木水火土）不能创建任务 | ✅ 已实现 |
| **自动创建** | 
  - 配方添加后，检查 `item_a` 和 `item_b` 是否需要创建任务<br>
  - 条件：该物品不是基础材料、没有配方、没有活跃任务<br>
  - 自动设置奖励为 10 分 | ✅ 已实现 |
| **任务完成** | 
  - 用户提交配方后，系统自动检查是否完成任务 (`checkAndCompleteTaskForRecipe`)<br>
  - 匹配逻辑：`recipes.result = task.item_name` 且 `task.status = 'active'`<br>
  - 更新任务状态为 `completed`，记录完成配方 ID 和完成时间 | ✅ 已实现 |
| **奖励发放** | 
  - 完成任务后，将 `task.prize` 加到用户的 `contribute` 字段<br>
  - 先到先得：最先完成验证的配方获得奖励 | ✅ 已实现 |
| **任务查询** | 
  - `GET /api/tasks` - 任务列表（支持分页、状态筛选、排序）<br>
  - `GET /api/tasks/:id` - 任务详情（含创建者和完成配方信息）<br>
  - `GET /api/tasks/stats` - 任务统计（总数、活跃数、完成数、总奖励） | ✅ 已实现 |

#### 1.3 贡献度计算（实时）

**基础规则：**
* **新配方奖励：** 成功插入 `recipes` 表 → +1 分
  - 重复提交的配方 → 不加分
* **新物品奖励：** 成功插入 `items` 表 → 每个新物品 +2 分
  - 配方包含 3 个物品（`item_a`, `item_b`, `result`）
  - 用户可能乱序导入，所以 `item_a` 和 `item_b` 也可能是新物品
  - 已存在的物品 → 不加分
  - 最多可获得 6 分（3 个新物品 × 2）
* **任务奖励：** 完成悬赏任务 → 获得 `task.prize` 分
  - 先到先得原则，只有第一个完成的用户获得奖励

**实现机制：**
- 配方验证成功后，`recipeService.submitRecipe` 实时计算贡献分
- 使用 `ensureItemExists` 方法检查并插入物品，返回贡献分
- 一次性更新用户的 `contribute` 字段
- 任务完成时，`taskService.completeTask` 单独发放奖励

**示例：**
```
提交配方: "金 + 木 = 合金"（假设都是新物品）
- 配方不存在 → +1 分
- "金" 不存在 → +2 分
- "木" 不存在 → +2 分
- "合金" 不存在 → +2 分
总计: +7 分（最多）

如果 "金" 和 "木" 已存在，"合金" 是新物品:
- 配方不存在 → +1 分
- "合金" 不存在 → +2 分
总计: +3 分
```

**查询接口：**
- `GET /api/users/contribution-rank` - 贡献排行榜（支持分页）
- `GET /api/users/:id/stats` - 用户详细贡献统计（配方数、物品数、任务数）

---

### 2. 数据库设计

#### 2.1 `recipes` 表 (合成表)

| 字段名 | 数据类型 | 说明 | 约束 | 补充说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | 唯一记录 ID | PRIMARY KEY, Auto Increment | |
| `item_a` | TEXT | 合成材料 A 的名称 | NOT NULL, Part of Unique Key | 写入时强制 $\text{item\_a} \leq \text{item\_b}$ (字典序，**允许相同**) |
| `item_b` | TEXT | 合成材料 B 的名称 | NOT NULL, Part of Unique Key | 写入时强制 $\text{item\_a} \leq \text{item\_b}$ (字典序，**允许相同**) |
| `result` | TEXT | 合成结果 C 的名称 | NOT NULL | 关联 `items.name` |
| `user_id` | INTEGER | 贡献者 ID | NOT NULL | 关联 `user.id` |
| `likes` | INTEGER | 点赞数 | DEFAULT 0 | **冗余字段**，提高查询性能，与 `recipe_likes` 表同步更新 |
| `created_at` | DATETIME | 记录创建时间 | DEFAULT CURRENT_TIMESTAMP | |

**约束：**
- `UNIQUE(item_a, item_b)` - 防止重复配方
- `CHECK (item_a <= item_b)` - 强制字典序，**允许 A+A=B 类型配方**

**索引：**
```sql
CREATE INDEX idx_recipes_result ON recipes(result);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_created_at ON recipes(created_at);
CREATE INDEX idx_recipes_likes ON recipes(likes DESC);
CREATE INDEX idx_recipes_search ON recipes(item_a, item_b, result);
CREATE INDEX idx_recipes_result_created ON recipes(result, created_at DESC);
CREATE INDEX idx_recipes_result_likes ON recipes(result, likes DESC);
```

#### 2.2 `items` 表 (词条/元素)

| 字段名 | 数据类型 | 说明 | 约束 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | 唯一记录 ID | PRIMARY KEY, Auto Increment | ✅ 已实现 |
| `name` | TEXT | 词条名称 | UNIQUE, NOT NULL | ✅ 已实现 |
| `emoji` | TEXT | 对应表情符号 | | ✅ 已实现（从外部 API 获取） |
| `pinyin` | TEXT | 拼音 | | 📋 待实现 |
| `is_base` | INTEGER | 是否为初始基础词条 | DEFAULT 0 (0=否, 1=是) | ✅ 已实现 |
| `created_at` | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP | ✅ 已实现 |

**基础材料：** 金、木、水、火、土（初始化时自动插入，`is_base = 1`）

**索引：**
```sql
CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_items_pinyin ON items(pinyin);  -- 用于拼音搜索
```


#### 2.3 `user` 表 (用户)

| 字段名 | 数据类型 | 说明 | 约束 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | 唯一用户 ID | PRIMARY KEY, Auto Increment | ✅ 已实现 |
| `name` | TEXT | 用户名 | UNIQUE, NOT NULL | ✅ 已实现 |
| `psw` | TEXT | 密码（存储 bcrypt hash 值） | NOT NULL | ✅ 已实现 |
| `auth` | INTEGER | 权限等级 | DEFAULT 1 | ✅ 已实现 (1=普通用户, 9=管理员) |
| `contribute` | INTEGER | 累积贡献分 | DEFAULT 0 | ✅ 已实现 |
| `level` | INTEGER | 用户等级 | DEFAULT 1 | ✅ 已实现 |
| `created_at` | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP | ✅ 已实现 |

**索引：**
```sql
CREATE INDEX idx_user_name ON user(name);
CREATE INDEX idx_user_contribute ON user(contribute DESC);
```

**默认管理员：** 用户名 `admin`，密码 `admin123`（bcrypt 加密）

#### 2.4 `task` 表 (悬赏任务)

| 字段名 | 数据类型 | 说明 | 约束 | 补充说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | 唯一任务 ID | PRIMARY KEY, Auto Increment | ✅ 已实现 |
| `item_name` | TEXT | 悬赏寻找配方的目标词条名称 | NOT NULL | 关联 `items.name` |
| `prize` | INTEGER | 任务悬赏的贡献点数 | NOT NULL | ✅ 已实现 |
| `status` | TEXT | 任务状态 | DEFAULT 'active' | active / completed |
| `task_type` | TEXT | 任务类型 | DEFAULT 'find_recipe' | find_recipe / find_more_recipes |
| `created_at` | DATETIME | 任务创建时间 | DEFAULT CURRENT_TIMESTAMP | |
| `created_by_user_id` | INTEGER | 创建任务的用户 ID | NOT NULL | 关联 `user.id` |
| `completed_by_recipe_id` | INTEGER | 完成任务的配方 ID | Nullable | 关联 `recipes.id` |
| `completed_at` | DATETIME | 任务完成时间 | Nullable | |

**任务类型说明：**
- `find_recipe`: 寻找配方（物品没有任何合成方式）
- `find_more_recipes`: 寻找更多配方（物品已有配方，但鼓励发现更多合成方式）

**索引：**
```sql
CREATE INDEX idx_task_status ON task(status);
CREATE INDEX idx_task_item_name ON task(item_name);
CREATE INDEX idx_task_task_type ON task(task_type);
CREATE INDEX idx_task_created_by_user_id ON task(created_by_user_id);
```

#### 2.5 `import_tasks` 表 (导入任务汇总)

| 字段名 | 数据类型 | 说明 | 约束 | 补充说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | 唯一任务 ID | PRIMARY KEY, Auto Increment | ✅ 已实现 |
| `user_id` | INTEGER | 发起用户 ID | NOT NULL | 关联 `user.id` |
| `total_count` | INTEGER | 总记录数 | NOT NULL | 本次导入的配方总数 |
| `success_count` | INTEGER | 成功数量 | DEFAULT 0 | 成功写入 `recipes` 的数量 |
| `failed_count` | INTEGER | 失败数量 | DEFAULT 0 | 验证失败或错误的数量 |
| `duplicate_count` | INTEGER | 重复数量 | DEFAULT 0 | 检测到重复的数量 |
| `status` | TEXT | 任务状态 | DEFAULT 'processing' | processing / completed / failed |
| `error_details` | TEXT | 错误详情 | Nullable | JSON 格式存储错误详情 |
| `created_at` | DATETIME | 任务创建时间 | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | DATETIME | 最后更新时间 | DEFAULT CURRENT_TIMESTAMP | 状态变更时更新 |

**状态说明：**
- `processing`: 处理中（有待处理或处理中的明细）
- `completed`: 已完成（所有明细都已处理）
- `failed`: 失败（任务级别的失败）

**索引：**
```sql
CREATE INDEX idx_import_tasks_user_id ON import_tasks(user_id);
CREATE INDEX idx_import_tasks_status ON import_tasks(status);
CREATE INDEX idx_import_tasks_created_at ON import_tasks(created_at);
```

#### 2.6 `import_tasks_content` 表 (导入任务明细)

| 字段名 | 数据类型 | 说明 | 约束 | 补充说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | 唯一记录 ID | PRIMARY KEY, Auto Increment | ✅ 已实现 |
| `task_id` | INTEGER | 所属任务 ID | NOT NULL | 关联 `import_tasks.id` |
| `item_a` | TEXT | 合成材料 A 的名称 | NOT NULL | 待验证的配方数据 |
| `item_b` | TEXT | 合成材料 B 的名称 | NOT NULL | 待验证的配方数据 |
| `result` | TEXT | 合成结果 C 的名称 | NOT NULL | 待验证的配方数据 |
| `status` | TEXT | 处理状态 | DEFAULT 'pending' | pending / processing / success / failed / duplicate |
| `retry_count` | INTEGER | 重试次数 | DEFAULT 0 | 最多重试 3 次 (`MAX_RETRY_COUNT`) |
| `error_message` | TEXT | 错误信息 | Nullable | 处理失败时记录原因 |
| `recipe_id` | INTEGER | 关联的配方 ID | Nullable | 成功或重复时指向配方记录，关联 `recipes.id` |
| `created_at` | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | DATETIME | 最后更新时间 | DEFAULT CURRENT_TIMESTAMP | 状态变更时更新 |

**状态流转：**
```
pending (待处理)
   ↓
processing (处理中)
   ↓
   ├─→ success (成功) - 配方验证通过且插入成功
   ├─→ failed (失败) - 验证失败或达到最大重试次数
   └─→ duplicate (重复) - 配方已存在
```

**索引：**
```sql
CREATE INDEX idx_import_tasks_content_task_id ON import_tasks_content(task_id);
CREATE INDEX idx_import_tasks_content_status ON import_tasks_content(status);
```

#### 2.7 `recipe_likes` 表 (配方点赞记录)

| 字段名 | 数据类型 | 说明 | 约束 | 补充说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | 唯一记录 ID | PRIMARY KEY, Auto Increment | ✅ 已实现 |
| `recipe_id` | INTEGER | 配方 ID | NOT NULL | 关联 `recipes.id` |
| `user_id` | INTEGER | 点赞用户 ID | NOT NULL | 关联 `user.id` |
| `created_at` | DATETIME | 点赞时间 | DEFAULT CURRENT_TIMESTAMP | |

**约束：**
- `UNIQUE(recipe_id, user_id)` - 防止重复点赞

**索引：**
```sql
CREATE INDEX idx_recipe_likes_recipe_id ON recipe_likes(recipe_id);
CREATE INDEX idx_recipe_likes_user_id ON recipe_likes(user_id);
```

**点赞机制：**
- 点赞时：插入 `recipe_likes` 记录，同时 `UPDATE recipes SET likes = likes + 1`
- 取消点赞时：删除 `recipe_likes` 记录，同时 `UPDATE recipes SET likes = likes - 1`
- `recipes.likes` 字段是冗余字段，提高查询性能
- 前端查询时通过 LEFT JOIN 判断当前用户是否已点赞

**导入处理流程：**

**系统架构：**
```
[用户] → [API 服务器] → [数据库]
                ↓
        [任务队列系统] → [验证限流器] → [外部 API]
                ↓
        [数据库更新]
```

**详细流程：**

1. **提交阶段**
   - 用户通过 `POST /api/import-tasks/batch` 提交文本格式配方
   - API 解析文本，创建 `import_tasks` 记录（返回 `taskId`）
   - 批量创建 `import_tasks_content` 明细记录（status=pending）

2. **队列处理** (`importTaskQueue`)
   - 定时轮询 (100ms 间隔)，每次处理最多 10 个并发任务
   - 从 `import_tasks_content` 表查询 `status=pending` 且 `retry_count < 3` 的记录
   - 使用 `processingIds` Set 防止重复处理

3. **去重检查**
   - 查询 `recipes` 表检查是否存在相同配方（考虑字典序 `item_a <= item_b`）
   - 如果重复：标记为 `duplicate`，关联已存在的 `recipe_id`，更新统计

4. **验证限流** (`validationLimiter`)
   - 所有 HTTP 请求通过全局限流器串行化
   - 避免触发外部 API 的速率限制
   - 队列机制确保请求按顺序处理

5. **外部 API 验证**
   - 调用 `https://hc.tsdo.in/api/check?itemA=xxx&itemB=xxx&result=yyy`
   - **新版 API 参数**：需要同时传递 `itemA`、`itemB`、`result` 三个参数
   - **响应状态码**：
     - Status 200 → 验证成功，返回 `{ item: string, emoji: string }`
     - Status 404 → 配方不匹配（结果不正确或配方不存在）
     - Status 400 → 参数错误（物品名称无效或格式不正确）
     - Status 403 → 包含非法物件（保留兼容性）
   - 网络错误/超时 → 增加 `retry_count`，允许重试（最多 3 次）

6. **数据入库**（验证成功后）
   - 插入 `recipes` 表（确保 `item_a <= item_b`）
   - 更新 `items` 表（自动收录新物品，保存 result 的 emoji）
   - 计算贡献分：新配方 +1 分，每个新物品 +2 分
   - 更新用户的 `contribute` 字段
   - 检查是否完成相关任务 (`checkAndCompleteTaskForRecipe`)

7. **统计更新**
   - 实时更新 `import_tasks` 的计数器（success_count, failed_count, duplicate_count）
   - 所有明细处理完成后，更新 `import_tasks.status = completed`

8. **进度查询**
   - `GET /api/import-tasks` - 获取用户的任务列表
   - `GET /api/import-tasks/:id` - 获取任务详情和统计
   - `GET /api/import-tasks/:id/contents` - 获取明细列表（支持状态筛选）
   - `GET /api/import-tasks/validation-status` - 查看验证队列状态

**性能监控：**
- 每个任务记录处理时间（去重检查、API 验证、数据库写入）
- 批次处理完成后输出总耗时和平均耗时
- 队列空闲时自动调整轮询间隔（100ms → 30s）

**错误处理：**
- 重试机制：网络错误/超时自动重试，最多 3 次
- 失败标记：达到最大重试次数后标记为 `failed`，记录错误信息
- 事务保护：数据库操作失败时回滚，确保数据一致性

---

### 3. 功能定义

#### 3.1 配方管理功能

| 功能点 | 权限 | API 端点 | 状态 |
| :--- | :--- | :--- | :--- |
| **配方列表** | 公开 | `GET /api/recipes` - 支持分页、搜索、排序、游标分页 | ✅ 已实现 |
| **配方详情** | 公开 | `GET /api/recipes/:id` - 包含创建者信息、物品 emoji | ✅ 已实现 |
| **提交配方** | 需认证 | `POST /api/recipes/submit` - 单条配方提交，实时验证 | ✅ 已实现 |
| **批量导入** | 需认证 | `POST /api/import-tasks/batch` - 异步处理，返回 taskId | ✅ 已实现 |
| **点赞/取消** | 需认证 | `POST /api/recipes/:id/like` - 切换点赞状态 | ✅ 已实现 |
| **路径搜索** | 公开 | `GET /api/recipes/path/:item` - BFS 算法计算最简路径 | ✅ 已实现 |
| **图统计** | 公开 | `GET /api/recipes/graph/stats` - 配方总数、物品数、可达性分析 | ✅ 已实现 |
| **批量获取** | 公开 | `GET /api/recipes/batch` - 游标分页，支持大数据量场景 | ✅ 已实现 |

**性能优化：**
- 使用 JOIN 替代子查询，提升查询性能
- 支持游标分页（cursor-based），适合大数据量
- 复合索引优化搜索和排序
- 覆盖索引避免回表查询

#### 3.2 合成表展示

**搜索功能：**
- 精确匹配优先：`item_a = ? OR item_b = ? OR result = ?`
- 模糊搜索：`item_a LIKE '%keyword%'` 等
- 支持按结果物品筛选：`result = ?`

**排序选项：**
- 创建时间 (created_at)
- 点赞数 (likes)
- ID (id)

**分页方式：**
- 传统分页：`page` + `limit`
- 游标分页：`cursor` + `limit`（性能更优）

**最简路径定义：** 深度最小 → 宽度最小 → 广度最大 → 字典序排序

##### 3.2.1 合成路径搜索算法设计（已实现）

##### 3.2.1 合成路径搜索算法设计（已实现）

**算法实现状态：** ✅ 已在 `recipeService.ts` 中完整实现

**核心数据结构：**
```typescript
interface CraftingTreeNode {
  item: string;
  is_base: boolean;
  recipe?: [string, string];
  children?: [CraftingTreeNode, CraftingTreeNode];
}

interface PathStats {
  depth: number;           // 合成深度（树的高度）
  width: number;           // 合成宽度（合成步骤总数）
  total_materials: number; // 基础材料总数
  breadth: number;         // 合成广度（配方易得性）
  materials: Record<string, number>; // 材料分布
}
```

**算法流程：**

1. **构建依赖图**
   - 从 `recipes` 表加载所有配方
   - 构建 `itemToRecipes` 映射：物品 → 可合成它的配方列表
   - 识别基础材料（金、木、水、火、土）

2. **BFS 构建合成树** (`buildCraftingTree`)
   ```typescript
   function buildTree(item: string, memo: Map): CraftingTreeNode {
     if (isBase(item)) return { item, is_base: true };
     if (memo.has(item)) return memo.get(item); // 记忆化
     
     const recipes = itemToRecipes[item];
     if (!recipes) return null; // 无法合成
     
     const recipe = recipes[0]; // 选择第一个配方
     const tree = {
       item,
       is_base: false,
       recipe: [recipe.item_a, recipe.item_b],
       children: [
         buildTree(recipe.item_a, memo),
         buildTree(recipe.item_b, memo)
       ]
     };
     
     memo.set(item, tree);
     return tree;
   }
   ```
   - **时间复杂度：** O(V + E)，V=物品数，E=配方数
   - **空间复杂度：** O(V) (递归栈 + 记忆化缓存)

3. **计算树统计信息** (`calculateTreeStats`)
   ```typescript
   function calculateStats(tree: CraftingTreeNode) {
     const materials = {}; // 基础材料统计
     let breadthSum = 0;   // 广度累积
     
     function traverse(node, depth) {
       if (node.is_base) {
         materials[node.item] = (materials[node.item] || 0) + 1;
         // 基础材料的广度 = 使用它作为输入的配方数
         breadthSum += countRecipesUsingMaterial(node.item);
         return { maxDepth: depth, steps: 0 };
       }
       
       // 合成材料的广度 = 能合成它的配方数
       const recipes = itemToRecipes[node.item];
       breadthSum += recipes.length;
       
       const [childA, childB] = node.children;
       const resultA = traverse(childA, depth + 1);
       const resultB = traverse(childB, depth + 1);
       
       return {
         maxDepth: Math.max(resultA.maxDepth, resultB.maxDepth),
         steps: 1 + resultA.steps + resultB.steps
       };
     }
     
     return { depth, width, breadth, materials };
   }
   ```

4. **最简路径排序规则**
   ```typescript
   paths.sort((a, b) => {
     if (a.depth !== b.depth) return a.depth - b.depth;     // 深度最小
     if (a.width !== b.width) return a.width - b.width;     // 宽度最小
     if (a.breadth !== b.breadth) return b.breadth - a.breadth; // 广度最大
     return a.item.localeCompare(b.item);                   // 字典序
   });
   ```

**广度计算说明：**
- **基础材料的广度：** 有多少配方使用该材料作为输入（`item_a` 或 `item_b`）
- **合成材料的广度：** 有多少种配方可以合成该材料（`itemToRecipes[item].length`）
- **总广度：** 树中所有节点（除根节点）的广度之和
- **意义：** 广度越大，表示材料/配方越常见，路径越容易获取

**API 端点：**
- `GET /api/recipes/path/:item` - 获取单个物品的最简合成路径
- 返回格式：`{ tree: CraftingTreeNode, stats: PathStats }`

**性能优化：**
- 记忆化（memoization）避免重复计算子树
- 支持循环依赖检测（A+A=A 类型配方）
- 对于无法合成的物品返回 null

#### 3.3 物品管理功能

| 功能点 | API 端点 | 状态 |
| :--- | :--- | :--- |
| **物品列表** | `GET /api/items` - 支持分页、搜索、类型筛选、排序 | ✅ 已实现 |
| **类型筛选** | `type=base` (基础材料) / `type=synthetic` (合成材料) | ✅ 已实现 |
| **搜索功能** | 按物品名称或 emoji 搜索 | ✅ 已实现 |
| **使用统计** | 显示物品作为材料的使用次数和作为结果的配方数 | ✅ 已实现 |

#### 3.4 用户管理功能

| 功能点 | API 端点 | 状态 |
| :--- | :--- | :--- |
| **用户注册** | `POST /api/users/register` - bcrypt 密码加密 | ✅ 已实现 |
| **用户登录** | `POST /api/users/login` - JWT Token 认证 | ✅ 已实现 |
| **当前用户** | `GET /api/users/me` - 获取登录用户信息 | ✅ 已实现 |
| **贡献排行** | `GET /api/users/contribution-rank` - 按贡献分排序 | ✅ 已实现 |
| **用户统计** | `GET /api/users/:id/stats` - 配方数、物品数、任务数 | ✅ 已实现 |
| **收藏配方** | `GET /api/users/:id/liked-recipes` - 用户点赞的配方列表 | ✅ 已实现 |

#### 3.5 任务管理功能

| 功能点 | API 端点 | 状态 |
| :--- | :--- | :--- |
| **任务列表** | `GET /api/tasks` - 支持分页、状态筛选、排序 | ✅ 已实现 |
| **任务详情** | `GET /api/tasks/:id` - 包含创建者和完成配方信息 | ✅ 已实现 |
| **创建任务** | `POST /api/tasks` - 手动创建悬赏任务 | ✅ 已实现 |
| **任务统计** | `GET /api/tasks/stats` - 总数、活跃数、完成数、总奖励 | ✅ 已实现 |
| **自动完成** | 配方添加后自动检查并完成相关任务 | ✅ 已实现 |
| **删除任务** | `DELETE /api/tasks/:id` - 仅管理员权限 | ✅ 已实现 |

#### 3.6 系统监控功能

| 功能点 | API 端点 | 状态 |
| :--- | :--- | :--- |
| **健康检查** | `GET /health` - 服务器状态、运行时间、时区 | ✅ 已实现 |
| **系统信息** | `GET /api/system/info` - CPU、内存、磁盘使用率 | ✅ 已实现 |
| **图统计** | `GET /api/recipes/graph/stats` - 配方图分析 | ✅ 已实现 |

---

### 4. 技术架构

#### 4.1 技术栈选型

| 技术层 | 技术选择 | 说明 |
| :--- | :--- | :--- |
| **前端框架** | Vue 3 + TypeScript | 使用 Composition API，提供类型安全和更好的开发体验 |
| **UI 组件库** | Element Plus / Naive UI | 提供丰富的组件库，加速开发 |
| **状态管理** | Pinia | Vue 3 官方推荐的状态管理库 |
| **路由管理** | Vue Router 4 | 前端路由管理 |
| **构建工具** | Vite | 快速的开发服务器和构建工具 |
| **后端框架** | Node.js + Express (TypeScript) | 轻量级 API 服务 |
| **数据库** | SQLite | 轻量级、无需独立服务器、适合中小型应用，异步连接层优化 |
| **API 文档** | 详见 API_DOCUMENTATION.md | 完整的 API 端点说明 |
| **代码规范** | ESLint + Prettier | 统一代码风格 |
| **包管理器** | npm | 依赖管理 |

#### 4.2 数据库实现细节（SQLite）

##### 4.2.1 SQLite 选型理由

* **轻量级：** 无需独立数据库服务器，直接文件存储
* **零配置：** 开箱即用，降低部署复杂度
* **跨平台：** 支持 Windows、Linux、macOS
* **性能优秀：** 对于中小型应用，读写性能完全满足需求
* **事务支持：** 完整的 ACID 事务支持
* **适用场景：** 单机部署、中小型用户量（< 100k 日活）

##### 4.2.2 数据库文件结构

```
/database
  ├── azothpath.db          # 主数据库文件
  ├── azothpath.db-shm      # 共享内存文件
  └── azothpath.db-wal      # Write-Ahead Log 文件
```

##### 4.2.3 SQLite 配置优化

```sql
-- 在 init.sql 中配置
PRAGMA journal_mode = WAL;        -- WAL 模式，提高并发性能
PRAGMA synchronous = NORMAL;      -- 平衡性能和安全
PRAGMA cache_size = -16000;       -- 16MB 缓存（优化后）
PRAGMA busy_timeout = 30000;      -- 30秒繁忙超时
PRAGMA journal_size_limit = 16777216; -- 16MB WAL文件限制
PRAGMA mmap_size = 67108864;      -- 64MB内存映射
```

##### 4.2.4 异步数据库连接层

**架构改进：**
- **异步操作**: 所有数据库操作改为异步模式，避免阻塞事件循环
- **查询队列管理**: 实现查询队列和并发控制，防止数据库连接过载
- **连接池优化**: 数据库连接复用和自动重连机制
- **性能监控**: 慢查询记录和性能指标收集

**核心组件：**
- `asyncDatabase.ts` - 异步数据库包装器，处理查询队列和并发控制
- `databaseAdapter.ts` - 数据库适配器层，提供统一的异步API接口
- 向后兼容的同步到异步迁移策略

##### 4.2.5 数据库表创建 SQL（SQLite 语法）

```sql
-- recipes 表
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_a TEXT NOT NULL,
  item_b TEXT NOT NULL,
  result TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  likes INTEGER DEFAULT 0,  -- 点赞数（冗余字段）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_a, item_b),
  CHECK (item_a < item_b)  -- 确保字典序
);

-- 为查询优化创建索引
CREATE INDEX IF NOT EXISTS idx_recipes_result ON recipes(result);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);

-- items 表
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  emoji TEXT,
  pinyin TEXT,
  is_base INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_pinyin ON items(pinyin);

-- user 表
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  psw TEXT NOT NULL,  -- 存储 bcrypt hash
  auth INTEGER DEFAULT 1,
  contribute INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_name ON user(name);
CREATE INDEX IF NOT EXISTS idx_user_contribute ON user(contribute DESC);

-- task 表
CREATE TABLE IF NOT EXISTS task (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  prize INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_by_recipe_id INTEGER,
  completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_task_status ON task(status);
CREATE INDEX IF NOT EXISTS idx_task_item_name ON task(item_name);

-- 导入任务汇总表
CREATE TABLE IF NOT EXISTS import_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing',  -- processing, completed, failed
  error_details TEXT,  -- JSON 格式存储错误详情
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_tasks_user_id ON import_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_import_tasks_status ON import_tasks(status);
CREATE INDEX IF NOT EXISTS idx_import_tasks_created_at ON import_tasks(created_at);

-- 点赞记录表
CREATE TABLE IF NOT EXISTS recipe_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recipe_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_likes_recipe_id ON recipe_likes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_likes_user_id ON recipe_likes(user_id);

-- 导入任务明细表
CREATE TABLE IF NOT EXISTS import_tasks_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  item_a TEXT NOT NULL,
  item_b TEXT NOT NULL,
  result TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, processing, success, failed, duplicate
  error_message TEXT,
  recipe_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_tasks_content_task_id ON import_tasks_content(task_id);
CREATE INDEX IF NOT EXISTS idx_import_tasks_content_status ON import_tasks_content(status);
CREATE INDEX IF NOT EXISTS idx_import_tasks_content_created_at ON import_tasks_content(created_at);
```

#### 4.3 前端架构设计（Vue 3 + TypeScript）

##### 4.3.1 项目目录结构

```
/frontend
  ├── public/              # 静态资源
  ├── src/
  │   ├── api/            # API 接口封装
  │   │   ├── recipe.ts
  │   │   ├── user.ts
  │   │   ├── task.ts
  │   │   ├── import.ts
  │   │   └── index.ts
  │   ├── assets/         # 资源文件（图片、样式等）
  │   ├── components/     # 公共组件
  │   │   ├── RecipeCard.vue
  │   │   ├── SearchBar.vue
  │   │   ├── TaskList.vue
  │   │   └── ContributionRank.vue
  │   ├── views/          # 页面组件
  │   │   ├── Home.vue
  │   │   ├── RecipeList.vue
  │   │   ├── RecipeDetail.vue
  │   │   ├── Import.vue
  │   │   ├── TaskBoard.vue
  │   │   ├── Profile.vue
  │   │   └── Admin.vue
  │   ├── stores/         # Pinia 状态管理
  │   │   ├── user.ts
  │   │   ├── recipe.ts
  │   │   └── task.ts
  │   ├── router/         # 路由配置
  │   │   └── index.ts
  │   ├── types/          # TypeScript 类型定义
  │   │   ├── recipe.ts
  │   │   ├── user.ts
  │   │   ├── task.ts
  │   │   └── import.ts
  │   ├── utils/          # 工具函数
  │   │   ├── request.ts  # Axios 封装
  │   │   ├── auth.ts     # 认证工具
  │   │   └── format.ts   # 格式化工具
  │   ├── App.vue
  │   └── main.ts
  ├── package.json
  ├── tsconfig.json
  └── vite.config.ts
```

##### 4.3.2 核心类型定义

```typescript
// types/recipe.ts
export interface Recipe {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;
  username?: string;
  likes: number;  // 点赞数
  created_at: string;
  is_liked?: boolean;  // 前端本地状态
}

export interface Item {
  id: number;
  name: string;
  emoji?: string;
  pinyin?: string;
  is_base: boolean;
}

export interface RecipeInput {
  text?: string;  // "A + B = C" 格式
  json?: RecipeJsonInput[];
}

export interface RecipeJsonInput {
  item_a: string;
  item_b: string;
  result: string;
}

// types/user.ts
export interface User {
  id: number;
  name: string;
  auth: number;
  contribute: number;
  level: number;
  created_at: string;
}

export interface LoginForm {
  name: string;
  password: string;
}

// types/task.ts
export interface Task {
  id: number;
  item_name: string;
  prize: number;
  status: 'active' | 'completed';
  created_at: string;
  completed_by_recipe_id?: number;
  completed_at?: string;
}

export interface ImportTask {
  id: number;
  user_id: number;
  total_count: number;
  success_count: number;
  failed_count: number;
  duplicate_count: number;
  status: 'processing' | 'completed' | 'failed';
  error_details?: string;
  created_at: string;
  updated_at: string;
}

// types/import.ts
export interface ImportTaskContent {
  id: number;
  task_id: number;  // 关联的任务 ID
  item_a: string;
  item_b: string;
  result: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'duplicate';
  error_message?: string;
  recipe_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ImportTaskSummary {
  task: ImportTask;
  contents: ImportTaskContent[];
}
```

##### 4.3.3 API 层封装示例

```typescript
// api/recipe.ts
import request from '@/utils/request';
import type { Recipe, RecipeInput, ImportTask } from '@/types';

export const recipeApi = {
  // 获取配方列表
  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    result?: string;
  }) {
    return request.get<{ recipes: Recipe[]; total: number }>('/api/recipes', { params });
  },

  // 获取配方详情
  detail(id: number) {
    return request.get<Recipe>(`/api/recipes/${id}`);
  },

  // 提交配方
  submit(data: RecipeInput) {
    return request.post<{ taskId: string }>('/api/recipes/submit', data);
  },

  // 查询导入任务进度
  getImportTask(taskId: string) {
    return request.get<ImportTask>(`/api/recipes/import-task/${taskId}`);
  },

  // 删除配方
  delete(id: number) {
    return request.delete(`/api/recipes/${id}`);
  },

  // 点赞配方
  like(id: number) {
    return request.post(`/api/recipes/${id}/like`);
  },

  // 取消点赞
  unlike(id: number) {
    return request.delete(`/api/recipes/${id}/like`);
  },

  // 搜索最简路径
  searchPath(target: string) {
    return request.get<{ path: Recipe[] }>('/api/recipes/path', {
      params: { target }
    });
  }
};

// api/import.ts
import request from '@/utils/request';
import type { ImportTask, ImportTaskContent, ImportTaskSummary } from '@/types';

export const importApi = {
  // 获取用户的导入任务列表
  listTasks(params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    return request.get<{ tasks: ImportTask[]; total: number }>('/api/import-tasks', { params });
  },

  // 获取导入任务详情（含明细）
  getTaskDetail(taskId: number, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    return request.get<ImportTaskSummary>(`/api/import-tasks/${taskId}`, { params });
  },

  // 获取导入任务明细列表
  getTaskContents(taskId: number, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    return request.get<{ contents: ImportTaskContent[]; total: number }>(
      `/api/import-tasks/${taskId}/contents`, 
      { params }
    );
  },

  // 提交单条配方（创建任务和明细）
  submitSingle(data: {
    item_a: string;
    item_b: string;
    result: string;
  }) {
    return request.post<{ taskId: number }>('/api/import-tasks/single', data);
  },

  // 提交批量配方（创建任务和多条明细）
  submitBatch(data: {
    text?: string;  // "A + B = C" 格式，多行
    json?: Array<{
      item_a: string;
      item_b: string;
      result: string;
    }>;
  }) {
    return request.post<{ taskId: number; totalCount: number }>('/api/import-tasks/batch', data);
  },

  // 重试失败的明细记录
  retryContent(contentId: number) {
    return request.post(`/api/import-tasks/contents/${contentId}/retry`);
  },

  // 重试整个任务（所有失败的明细）
  retryTask(taskId: number) {
    return request.post(`/api/import-tasks/${taskId}/retry`);
  },

  // 删除导入任务（级联删除明细）
  deleteTask(taskId: number) {
    return request.delete(`/api/import-tasks/${taskId}`);
  }
};
```

#### 4.4 后端架构设计（Node.js + TypeScript）

##### 4.4.1 项目目录结构

```
/backend
  ├── src/
  │   ├── controllers/    # 控制器层
  │   │   ├── recipeController.ts
  │   │   ├── userController.ts
  │   │   └── taskController.ts
  │   ├── services/       # 业务逻辑层
  │   │   ├── recipeService.ts
  │   │   ├── userService.ts
  │   │   ├── taskService.ts
  │   │   └── validationService.ts
  │   ├── models/         # 数据模型层（Prisma/TypeORM）
  │   ├── middlewares/    # 中间件
  │   │   ├── auth.ts
  │   │   ├── errorHandler.ts
  │   │   └── validator.ts
  │   ├── routes/         # 路由定义
  │   │   ├── recipe.ts
  │   │   ├── user.ts
  │   │   └── task.ts
  │   ├── utils/          # 工具函数
  │   │   ├── database.ts
  │   │   ├── password.ts
  │   │   └── logger.ts
  │   ├── types/          # 类型定义
  │   ├── config/         # 配置文件
  │   │   └── index.ts
  │   └── app.ts          # 应用入口
  ├── database/
  │   └── azothpath.db
  ├── package.json
  └── tsconfig.json
```

##### 4.4.2 核心 API 端点设计

```typescript
// routes/recipe.ts
import { Router } from 'express';
import { recipeController } from '@/controllers/recipeController';
import { authMiddleware } from '@/middlewares/auth';

const router = Router();

// 公开接口
router.get('/recipes', recipeController.list);
router.get('/recipes/:id', recipeController.detail);
router.get('/recipes/path', recipeController.searchPath);

// 需要认证的接口
router.post('/recipes/submit', authMiddleware, recipeController.submit);
router.get('/recipes/import-task/:taskId', authMiddleware, recipeController.getImportTask);
router.delete('/recipes/:id', authMiddleware, recipeController.delete);
router.post('/recipes/:id/like', authMiddleware, recipeController.like);
router.delete('/recipes/:id/like', authMiddleware, recipeController.unlike);

export default router;
```

##### 4.4.3 数据验证服务

```typescript
// services/validationService.ts
import axios from 'axios';

export class ValidationService {
  private apiEndpoint = process.env.GAME_API_ENDPOINT;

  /**
   * 验证配方是否有效
   * @param itemA 材料 A
   * @param itemB 材料 B
   * @param result 结果
   * @returns 验证结果
   */
  async validateRecipe(itemA: string, itemB: string, result: string): Promise<{
    valid: boolean;
    statusCode: number;
  }> {
    try {
      const response = await axios.post(`${this.apiEndpoint}/validate`, {
        item_a: itemA,
        item_b: itemB,
        result: result
      }, {
        timeout: 5000
      });

      return {
        valid: response.status === 200,
        statusCode: response.status
      };
    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      
      // 400 和 403 直接丢弃
      if (statusCode === 400 || statusCode === 403) {
        return { valid: false, statusCode };
      }

      // 其他错误需要记录到错误表
      throw new Error(`Validation API error: ${statusCode}`);
    }
  }

  /**
   * 验证词条是否存在
   */
  async validateItem(itemName: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiEndpoint}/items/${itemName}`, {
        timeout: 3000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
```

#### 4.5 部署架构

##### 4.5.1 开发环境

* **前端：** Vite Dev Server (Port 5173)
* **后端：** Node.js + ts-node-dev (Port 3000)
* **数据库：** SQLite 本地文件

##### 4.5.2 生产环境部署方案

| 组件 | 部署方式 | 说明 |
| :--- | :--- | :--- |
| **前端** | Nginx 静态托管 | Vite 构建后的静态文件 |
| **后端** | PM2 / Docker | Node.js 进程管理 |
| **数据库** | SQLite 文件 | 定期备份到对象存储（如 S3） |
| **反向代理** | Nginx | 统一入口，负载均衡 |
| **HTTPS** | Let's Encrypt | 免费 SSL 证书 |

##### 4.5.3 数据库备份策略

```bash
# 每日定时备份脚本
#!/bin/bash
DB_PATH="/path/to/database/azothpath.db"
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 使用 SQLite 的备份命令
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/azothpath_$DATE.db'"

# 压缩备份
gzip $BACKUP_DIR/azothpath_$DATE.db

# 保留最近 30 天的备份
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

#### 4.6 性能优化策略

##### 4.6.1 前端优化

* **代码分割：** Vue Router 懒加载
* **资源优化：** 图片压缩、CDN 加速
* **缓存策略：** LocalStorage 缓存用户信息和常用数据
* **虚拟滚动：** 长列表使用虚拟滚动组件
* **防抖节流：** 搜索框输入防抖

##### 4.6.2 后端优化

* **数据库索引：** 为常用查询字段建立索引
* **查询优化：** 避免 N+1 查询问题
* **缓存层：** Redis 缓存热点数据（可选）
* **异步处理：** 批量导入使用队列异步处理
* **连接池：** 数据库连接池复用

##### 4.6.3 SQLite 性能调优

* **WAL 模式：** 提高并发读写性能
* **批量操作：** 使用事务批量插入数据
* **定期 VACUUM：** 定期清理数据库碎片
* **合理索引：** 避免过度索引影响写入性能

---

### 5. 安全性考虑

| 安全措施 | 实现方式 |
| :--- | :--- |
| **密码加密** | 使用 bcrypt 进行密码哈希 |
| **JWT 认证** | 使用 JSON Web Token 进行用户认证 |
| **SQL 注入防护** | 使用 ORM 参数化查询 |
| **XSS 防护** | 前端输入转义，CSP 策略 |
| **CSRF 防护** | CSRF Token 验证 |
| **速率限制** | API 接口限流（防止滥用） |
| **输入验证** | 前后端双重验证 |

---

### 6. 开发流程与工具

#### 6.1 开发环境搭建

```bash
# 克隆项目
git clone https://github.com/InfiniteSynthesisTools/AzothPath.git
cd AzothPath

# 安装后端依赖
cd backend
npm install

# 初始化数据库
npm run db:init

# 启动后端开发服务器
npm run dev

# 安装前端依赖（新终端）
cd ../frontend
npm install

# 启动前端开发服务器
npm run dev
```

---

### 7. 已完成功能与系统变更

#### 7.1 通知系统功能
- [x] **通知表结构设计**：新增 `notifications` 表，支持系统通知、任务完成通知、点赞通知等
- [x] **通知类型**：支持 `system`、`task_completed`、`recipe_liked`、`import_completed` 等类型
- [x] **通知状态管理**：支持 `unread`、`read`、`archived` 状态
- [x] **实时通知**：用户操作触发实时通知生成
- [x] **侧边栏通知面板**：显示未读通知，支持标记已读和归档
- [x] **通知归档功能**：归档后的通知从侧边栏消失，保持界面整洁

#### 7.2 批量导入任务管理功能
- [x] **导入任务管理页面**：专门的页面用于管理批量导入任务
- [x] **任务状态监控**：实时显示导入任务的进度和状态
- [x] **明细查看**：查看每个导入任务的详细内容和处理结果
- [x] **单次上传优化**：支持单次上传不分成多个卡片，保持任务完整性
- [x] **任务重试机制**：支持对失败的任务进行重试
- [x] **任务删除功能**：支持删除不需要的导入任务

#### 7.3 个人中心功能修复
- [x] **用户统计信息**：修复用户统计信息显示问题，正确显示贡献度、配方数量等
- [x] **收藏配方显示**：修复收藏配方列表显示问题，正确显示用户点赞的配方
- [x] **API响应处理**：修复前后端数据格式不一致问题，确保TypeScript类型安全
- [x] **响应拦截器优化**：统一处理API响应，确保数据格式一致性

#### 7.4 API文档系统
- [x] **完整API文档**：创建 `API_DOCUMENTATION.md`，包含所有API端点的详细说明
- [x] **数据结构定义**：包含请求参数、响应格式、错误代码等完整信息
- [x] **使用指导**：在README和AI指南中添加API文档阅读指导
- [x] **前后端一致性**：确保API文档与实际实现保持一致

#### 7.5 技术架构变更
- [x] **前端架构优化**：
  - 修复TypeScript类型错误
  - 优化API调用和响应处理
  - 改进组件间数据流
- [x] **后端服务修复**：
  - 修复用户服务中的表名错误
  - 优化数据库查询性能
  - 改进错误处理机制
- [x] **数据库架构扩展**：
  - 新增通知系统相关表
  - 优化现有表索引
  - 改进数据一致性

#### 7.6 用户体验改进
- [x] **侧边栏优化**：改进通知显示和交互体验
- [x] **导入流程优化**：简化批量导入操作流程
- [x] **个人中心优化**：改进统计信息和收藏配方的显示
- [x] **错误处理改进**：提供更友好的错误提示和重试机制

### 8. 迭代计划

#### Phase 1: 核心功能（MVP）✅ 已完成
- [x] 用户注册登录
- [x] 配方录入（单条 + 批量）
- [x] 配方展示与搜索
- [x] 任务系统基础功能
- [x] 贡献度统计

#### Phase 2: 体验优化 ✅ 已完成
- [x] 最简路径算法实现
- [x] 点赞功能
- [x] 用户等级系统
- [x] 贡献榜排行
- [x] 拼音搜索支持
- [x] 通知系统
- [x] 批量导入任务管理
- [x] 个人中心功能完善

#### Phase 3: 高级功能
- [ ] 管理员后台
- [ ] 数据导出功能
- [ ] 社区互动功能
- [ ] 移动端适配
- [ ] 性能优化
- [ ] 高级搜索功能
- [ ] 数据可视化
- [ ] 多语言支持

### 9. 系统架构更新

#### 9.1 新增数据库表

##### 9.1.1 `notifications` 表（通知系统）
| 字段名 | 数据类型 | 说明 | 约束 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | 唯一通知ID | PRIMARY KEY AUTOINCREMENT |
| `user_id` | INTEGER | 接收用户ID | NOT NULL |
| `type` | VARCHAR | 通知类型 | NOT NULL |
| `title` | VARCHAR | 通知标题 | NOT NULL |
| `content` | TEXT | 通知内容 | |
| `related_id` | INTEGER | 关联对象ID | |
| `status` | VARCHAR | 通知状态 | DEFAULT 'unread' |
| `created_at` | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | DATETIME | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

#### 9.2 API端点扩展

##### 9.2.1 通知相关API
- `GET /api/notifications` - 获取用户通知列表
- `PUT /api/notifications/:id/read` - 标记通知为已读
- `PUT /api/notifications/:id/archive` - 归档通知
- `GET /api/notifications/unread-count` - 获取未读通知数量

##### 9.2.2 导入任务管理API
- `GET /api/import-tasks` - 获取导入任务列表
- `GET /api/import-tasks/:id` - 获取导入任务详情
- `GET /api/import-tasks/:id/contents` - 获取导入任务明细
- `POST /api/import-tasks/:id/retry` - 重试导入任务
- `DELETE /api/import-tasks/:id` - 删除导入任务

##### 9.2.3 用户统计API
- `GET /api/users/:id/stats` - 获取用户统计信息
- `GET /api/users/:id/liked-recipes` - 获取用户收藏的配方

#### 9.3 前端组件更新

##### 9.3.1 新增组件
- `Sidebar.vue` - 侧边栏组件，集成通知面板
- `ImportTasks.vue` - 导入任务管理页面
- `ImportTaskCard.vue` - 导入任务卡片组件

##### 9.3.2 更新组件
- `Profile.vue` - 个人中心页面，修复统计和收藏显示
- 所有API调用组件，优化响应处理逻辑

### 10. 开发指南更新

#### 10.1 API文档使用
- 详细API文档位于 `API_DOCUMENTATION.md`
- 包含所有端点的请求参数、响应格式和错误处理
- 前后端开发人员应参考此文档确保接口一致性

#### 10.2 数据库架构参考
- 完整数据库架构位于 `DATABASE_SCHEMA.md`
- 包含所有表结构、索引和关系说明
- 数据库变更应同步更新此文档

#### 10.3 开发环境配置
- 后端服务器运行在端口 19198 (`npm run dev` in backend/)
- 前端开发服务器运行在端口 11451 (`npm run dev` in frontend/)
- 使用热重载（HMR），无需手动重启服务器
- 数据库初始化：`npm run db:init` in backend/

### 11. 实现状态总结

#### 11.1 已完成功能（✅）

**核心功能：**
- ✅ 用户注册登录系统（bcrypt + JWT）
- ✅ 配方 CRUD 操作（提交、查询、删除）
- ✅ 批量导入系统（异步队列 + 验证限流）
- ✅ 外部 API 集成（https://hc.tsdo.in/api/check）
- ✅ 合成路径搜索（BFS 算法，记忆化优化）
- ✅ 点赞系统（切换式点赞，冗余字段优化）
- ✅ 任务悬赏系统（自动创建、自动完成）
- ✅ 贡献度实时计算（配方 +1 分，新物品 +2 分）
- ✅ 系统监控（健康检查、资源使用率）

**数据库：**
- ✅ 7 张核心表（recipes, items, user, task, import_tasks, import_tasks_content, recipe_likes）
- ✅ WAL 模式配置
- ✅ 复合索引优化
- ✅ CHECK 约束（item_a <= item_b，允许 A+A=B）
- ✅ 默认管理员账号（admin/admin123）

**API 端点：**
- ✅ 配方管理（10+ 端点）
- ✅ 用户管理（6+ 端点）
- ✅ 任务管理（6+ 端点）
- ✅ 导入管理（5+ 端点）
- ✅ 物品管理（1+ 端点）
- ✅ 系统监控（2+ 端点）

**性能优化：**
- ✅ 游标分页（cursor-based pagination）
- ✅ JOIN 替代子查询
- ✅ 记忆化缓存（合成树计算）
- ✅ 验证限流器（防止 API 速率限制）
- ✅ 队列系统（异步处理批量导入）

#### 11.2 待实现功能（📋）

**搜索功能：**
- 📋 拼音搜索（items 表 pinyin 字段已预留）
- 📋 高级搜索（多条件组合）

**用户体验：**
- 📋 多路径展示（目前只返回第一条路径）
- 📋 路径对比功能
- 📋 配方树可视化组件
- 📋 移动端适配

**管理功能：**
- 📋 管理员后台（配方管理、用户管理）
- 📋 数据导出功能
- 📋 日志查询界面

**测试与监控：**
- 📋 单元测试覆盖
- 📋 集成测试
- 📋 性能监控仪表板
- 📋 错误日志聚合

#### 11.3 技术债务与优化方向

**代码质量：**
- 增加单元测试覆盖率
- 完善错误处理机制
- 统一日志格式

**性能优化：**
- Redis 缓存层（可选）
- 数据库连接池优化
- 前端代码分割和懒加载

**安全加固：**
- CSRF Token 验证
- XSS 防护增强
- SQL 注入防护（已使用参数化查询）
- 敏感数据加密存储

**可维护性：**
- API 版本控制
- 数据库迁移脚本
- 自动化部署流程
- 监控告警系统

---

## 附录

### A. 相关文档索引

- **API 文档**: `API_DOCUMENTATION.md` - 完整的 API 端点说明和使用示例
- **数据库架构**: `DATABASE_SCHEMA.md` - 完整的数据库表结构和关系说明  
- **开发指南**: `.github/copilot-instructions.md` - AI 开发助手使用指南

### B. 快速启动命令

```bash
# 后端服务器
cd backend
npm install
npm run db:init  # 初始化数据库
npm run dev      # 启动开发服务器（端口 19198）

# 前端服务器
cd frontend
npm install
npm run dev      # 启动开发服务器（端口 11451）
```

### C. 数据库配置

```sql
-- SQLite 优化配置（backend/database/init.sql）
PRAGMA journal_mode = WAL;        -- WAL 模式
PRAGMA synchronous = NORMAL;      -- 平衡性能和安全
PRAGMA cache_size = -2000;        -- 8MB 缓存
PRAGMA busy_timeout = 5000;       -- 5秒繁忙超时
```

### D. 环境变量示例

```bash
# backend/.env
NODE_ENV=development
PORT=19198
JWT_SECRET=your_jwt_secret_here
GAME_API_ENDPOINT=https://hc.tsdo.in/api/check
DATABASE_PATH=./database/azothpath.db
```

---

**文档维护：** 本文档应随代码实现同步更新，保持与实际系统一致。

**最后更新：** 2025-10-19  
**文档版本：** v2.0 (与代码同步版本)
