## Azoth Path 产品需求文档 (PRD)

### 0. 产品信息

| 字段 | 值 | 备注 |
| :--- | :--- | :--- |
| **产品名称** | **Azoth Path** | |
| **副标题** | 无尽合成工具站 | |
| **产品目标** | 为游戏玩家提供快速检索和贡献合成路径的工具，活跃玩家社区。 | |

---

### 1. 数据整理与处理逻辑

#### 1.1 用户数据解析与入库流程

| 步骤/功能 | 描述 | 状态 |
| :--- | :--- | :--- |
| **数据输入** | 支持 $\text{A + B = C}$ 文本格式 和 JSON 格式批量导入（单条/批量）。 | 已确认 |
| **任务创建** | 创建 `import_tasks` 记录（自增 ID），返回 $\text{taskId}$ 供前端查询进度。 | 已确认 |
| **解析落库** | 解析后在 `import_tasks_content` 表中为每条配方创建明细记录，关联 $\text{task\_id}$，状态为 $\text{pending}$。 | 已确认 |
| **异步处理** | 后台任务队列异步处理 `import_tasks_content` 表中的记录，状态流转：$\text{pending} \rightarrow \text{processing} \rightarrow \text{success/failed/duplicate}$。 | 已确认 |
| **数据有效性校验** | 通过**外部验证 API** 校验配方有效性和词条 $\text{A, B, C}$ 是否是游戏中物件。 | 已确认 |
| **去重检查** | 检查 `recipes` 表中是否已存在相同配方（考虑字典序）。如果重复，标记为 $\text{duplicate}$ 状态。 | 已确认 |
| **新词条收录** | 如果校验发现新的词条（不在 `items` 表中），系统**自动收录**到 `items` 表。 | 已确认 |
| **成功入库** | 验证通过且无重复的配方写入 `recipes` 表，并在 `import_tasks_content` 记录中关联 $\text{recipe\_id}$，状态更新为 $\text{success}$。同时更新 `import_tasks` 的 $\text{success\_count}$。 | 已确认 |
| **验证 API 错误处理** | $\text{status } 400$ 或 $\text{status } 403$ 的数据标记为 $\text{failed}$，记录错误原因到 $\text{error\_message}$。其他失败状态同样记录错误信息。更新 `import_tasks` 的 $\text{failed\_count}$。 | 已确认 |
| **进度查询** | 前端通过 `task_id` 查询 `import_tasks` 获取汇总信息（总数、成功数、失败数、重复数），并可查询 `import_tasks_content` 获取明细列表和错误信息。 | 已确认 |
| **存档功能** | 已废弃（`note` 字段不再使用）。 | 已确认 |

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
| **任务生成条件** | 用户录入 $\text{A+B=C}$ 成功后，系统检查 $\text{A}$ 和 $\text{B}$ 是否满足以下条件： 1. 该词条在 `recipes` 表中**没有**作为产物的配方。 2. 该词条**不是**初始基础词条（金、木、水、火、土）。 3. 该词条**没有**活跃的悬赏任务（`task.status = active`）。若满足，则发布悬赏任务。 | 已确认 |
| **任务完成** | 用户提交 $\text{X+Y=目标词条}$ 成功后，若存在活跃任务，则任务完成。 | 已确认 |
| **重复完成处理** | 采用**先到先得**原则：**先进入数据库并完成验证**的配方拥有任务完成权。 | 已确认 |
| **任务移除** | 任务一旦完成，立即移除（状态改为 $\text{completed}$）。 | 已确认 |

#### 1.3 贡献度计算（实时）

* **基础贡献分：** 合成表成功录入 $\text{1 分/条}$。被点赞 $\text{2 分/条}$。
* **任务奖励：** 对应任务的悬赏 ($\text{task\_prize}$)，仅提供给**实际提交了任务目标配方**的用户。

---

### 2. 数据库设计

#### 2.1 `recipes` 表 (合成表)

| 字段名 | 数据类型 | 说明 | 约束 | 补充说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INT/BIGINT | 唯一记录 $\text{ID}$ | $\text{Primary Key, Auto Increment}$ | |
| `item_a` | VARCHAR | 合成材料 $\text{A}$ 的名称 | $\text{Part of Unique Key}$ | 写入时强制 $\text{item\_a < item\_b}$ (字典序) |
| `item_b` | VARCHAR | 合成材料 $\text{B}$ 的名称 | $\text{Part of Unique Key}$ | 写入时强制 $\text{item\_a < item\_b}$ (字典序) |
| `result` | VARCHAR | 合成结果 $\text{C}$ 的名称 | | 关联 `items.name` |
| `user_id` | INT/BIGINT | 贡献者 $\text{ID}$ | | 关联 `user.id` |
| `is_verified` | BOOLEAN | 是否通过官方 $\text{API}$ 验证 | | |
| `created_at}$ | DATETIME | 记录创建时间 | | |

#### 2.2 `items` 表 (词条/元素)

| 字段名 | 数据类型 | 说明 | 约束 | 状态/待讨论 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INT/BIGINT | 唯一记录 $\text{ID}$ | $\text{Primary Key}$ | |
| `name` | VARCHAR | 词条名称 | $\text{Unique Key}$ | |
| `emoji` | VARCHAR | 对应表情符号 | | |
| `pinyin` | VARCHAR | 拼音 | | 迭代项 |
| `is_base` | BOOLEAN | 是否为初始基础词条 | $\text{Default: FALSE}$ | |


#### 2.3 `user` 表 (用户)

| 字段名 | 数据类型 | 说明 | 约束 | 状态/待讨论 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INT/BIGINT | 唯一用户 $\text{ID}$ | $\text{Primary Key}$ | |
| `name` | VARCHAR | 用户名 | $\text{Unique Key}$ | |
| `psw}$ | VARCHAR | 密码（存储 $\text{hash}$ 值） | | |
| `auth` | INT | 权限等级 | $\text{Default: 1}$ | $\text{1（普通）}, 9 \text{（管理员）}$ |
| `contribute` | INT | 累积贡献分 | $\text{Default: 0}$ | |
| `level` | 用户等级 | | | **待讨论：** 与 $\text{contribute}$ 的映射关系 |

#### 2.4 `task` 表 (悬赏任务)

| 字段名 | 数据类型 | 说明 | 约束 | 补充说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INT/BIGINT | 唯一任务 $\text{ID}$ | $\text{Primary Key, Auto Increment}$ | |
| `item_name` | VARCHAR | 悬赏寻找配方的**目标词条名称** | | 关联 `items.name` |
| `prize` | INT | 任务悬赏的贡献点数 | | |
| `status` | VARCHAR | 任务状态 | $\text{Default: active}$ | $\text{active, completed}$ |
| `created_at}$ | DATETIME | 任务创建时间 | | |
| `completed_by_recipe_id` | INT/BIGINT | 完成任务的配方 $\text{ID}$ | $\text{Nullable}$ | 关联 `recipes.id` |
| `completed_at}$ | DATETIME | 任务完成时间 | | |

#### 2.5 `import_tasks` 表 (导入任务汇总)

| 字段名 | 数据类型 | 说明 | 约束 | 补充说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INT/BIGINT | 唯一任务 $\text{ID}$ | $\text{Primary Key, Auto Increment}$ | 自增主键 |
| `user_id` | INT/BIGINT | 发起用户 $\text{ID}$ | | 关联 `user.id` |
| `total_count` | INT | 总记录数 | $\text{Default: 0}$ | 本次导入的配方总数 |
| `success_count` | INT | 成功数量 | $\text{Default: 0}$ | 成功写入 `recipes` 的数量 |
| `failed_count` | INT | 失败数量 | $\text{Default: 0}$ | 验证失败或错误的数量 |
| `duplicate_count` | INT | 重复数量 | $\text{Default: 0}$ | 检测到重复的数量 |
| `status` | VARCHAR | 任务状态 | $\text{Default: processing}$ | $\text{processing（处理中）}, \text{completed（已完成）}, \text{failed（失败）}$ |
| `error_details` | TEXT | 错误详情 | $\text{Nullable}$ | JSON 格式存储错误详情 |
| `created_at}$ | DATETIME | 任务创建时间 | $\text{Default: CURRENT\_TIMESTAMP}$ | |
| `updated_at}$ | DATETIME | 最后更新时间 | $\text{Default: CURRENT\_TIMESTAMP}$ | 状态变更时更新 |

#### 2.6 `import_tasks_content` 表 (导入任务明细)

| 字段名 | 数据类型 | 说明 | 约束 | 补充说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INT/BIGINT | 唯一记录 $\text{ID}$ | $\text{Primary Key, Auto Increment}$ | |
| `task_id` | INT/BIGINT | 所属任务 $\text{ID}$ | $\text{Not Null}$ | 关联 `import_tasks.id` |
| `item_a` | VARCHAR | 合成材料 $\text{A}$ 的名称 | | 待验证的配方数据 |
| `item_b` | VARCHAR | 合成材料 $\text{B}$ 的名称 | | 待验证的配方数据 |
| `result` | VARCHAR | 合成结果 $\text{C}$ 的名称 | | 待验证的配方数据 |
| `status` | VARCHAR | 处理状态 | $\text{Default: pending}$ | $\text{pending（待处理）}, \text{processing（处理中）}, \text{success（成功）}, \text{failed（失败）}, \text{duplicate（重复）}$ |
| `error_message` | TEXT | 错误信息 | $\text{Nullable}$ | 处理失败时记录原因 |
| `recipe_id` | INT/BIGINT | 关联的配方 $\text{ID}$ | $\text{Nullable}$ | 成功后指向创建的配方记录，关联 `recipes.id` |
| `created_at}$ | DATETIME | 创建时间 | $\text{Default: CURRENT\_TIMESTAMP}$ | |
| `updated_at}$ | DATETIME | 最后更新时间 | $\text{Default: CURRENT\_TIMESTAMP}$ | 状态变更时更新 |

**导入处理流程：**

1. **提交阶段：** 用户通过文件/单条方式提交配方数据
2. **任务创建：** 系统生成一个 `import_tasks` 记录（自增 ID），状态为 $\text{processing}$
3. **解析落库：** 为每条配方在 `import_tasks_content` 表中创建明细记录，关联 `task_id`，初始状态为 $\text{pending}$
4. **异步处理：** 后台任务队列依次处理 `import_tasks_content` 表中的记录：
   - 更新明细状态为 $\text{processing}$
   - 调用外部验证 API 校验配方有效性
   - 检查是否重复（查询 `recipes` 表）
   - 根据验证结果更新明细 `status` 和相关字段
   - 实时更新 `import_tasks` 的统计计数
5. **查询进度：** 前端通过 `task_id` 查询导入任务的汇总信息和明细列表
6. **任务完成：** 所有明细处理完成后，更新 `import_tasks.status` 为 $\text{completed}$

---

### 3. 功能定义

#### 3.1 合成表收集与管理

| 功能点 | 权限 | 规则 | 状态/待讨论 |
| :--- | :--- | :--- | :--- |
| **删除** | **管理员** 或 **自己上传的**用户 | **用户删除限制**：**禁止**删除结果被其他配方引用的记录。 | **待讨论：** 引用的精确定义和检查机制 |
| **修改** | **仅管理员** | 用户不能修改自己上传的配方。 | 已确认 |

#### 3.2 合成表展示

* **搜索栏：** 模糊搜索、中间产物（$\text{item\_a, item\_b}$）搜索、目标产物（$\text{result}$）搜索。
* **最简路径定义：** 深度最小 $\rightarrow$ 宽度最小 $\rightarrow$ 广度最大 $\rightarrow$ 字典序排序。

##### 3.2.1 合成路径搜索算法设计

合成路径搜索基于**有向图遍历**，需要处理循环依赖（如 $\text{A+A=A}$）、不可达物品、配方去重等问题。参考 `recipe_calculator.py` 实现。

**核心数据结构**

```typescript
interface RecipeGraph {
  recipes: Recipe[];                    // 所有配方列表
  itemToRecipes: Map<string, Recipe[]>; // item → 可合成它的配方列表
  reachableItems: Set<string>;          // 可从基础材料合成的物品集合
  validRecipes: Set<Recipe>;            // 材料可达的有效配方集合
  baseItems: Set<string>;               // 基础材料 {"金", "木", "水", "火", "土", "宝石"}
  selfLoopRecipes: Set<Recipe>;         // 循环依赖配方 (A+A=A, A+B=A 等)
  circularItems: Set<string>;           // 参与循环依赖的物品
}
```

**算法流程**

1. **配方规范化 (normalize_recipe)**
   - 确保 $\text{item\_a} \leq \text{item\_b}$ (字典序)
   - 自动去重 "A+B=C" 和 "B+A=C"
   - 时间复杂度: $O(1)$

2. **配方加载与去重 (load_recipes)**
   ```python
   normalized_set = set()  # 使用集合自动去重
   for recipe in db_recipes:
       normalized = normalize_recipe(recipe)
       normalized_set.add(normalized)
   ```
   - 时间复杂度: $O(n)$，$n$ 为配方总数

3. **循环依赖检测 (detect_circular_dependencies)**
   - 检测模式:
     - **自环:** $\text{A+A=A}$
     - **单边循环:** $\text{A+B=A}$ 或 $\text{A+B=B}$
   - 标记 `self_loop_recipes` 和 `circular_items`
   - 时间复杂度: $O(n)$

4. **可达性分析 (analyze_reachability)** — **核心算法**
   ```python
   queue = deque(base_items)           # 从基础材料开始
   reachable_items = set(base_items)
   
   while queue:
       current = queue.popleft()
       
       for recipe in item_to_recipes[current]:
           item_a, item_b, result = recipe
           
           # 跳过材料不可达的配方
           if item_a not in reachable_items or item_b not in reachable_items:
               continue
           
           valid_recipes.add(recipe)
           
           # 新物品加入队列
           if result not in reachable_items:
               reachable_items.add(result)
               queue.append(result)
   ```
   - **算法:** 广度优先搜索 (BFS)
   - **时间复杂度:** $O(V + E)$
     - $V$: 物品总数 (`all_items`)
     - $E$: 配方总数 (`recipes`)
   - **空间复杂度:** $O(V)$ (队列 + 集合)

5. **合成树构建 (build_crafting_tree)**
   ```python
   def build_tree(item):
       if item in base_items:
           return {"item": item, "is_base": True}
       
       if item in memo:  # 记忆化避免重复计算
           return memo[item]
       
       recipes = item_to_recipes[item]
       if not recipes:
           return None
       
       # 选择第一个有效配方（可扩展为多路径）
       item_a, item_b = recipes[0]
       tree = {
           "item": item,
           "is_base": False,
           "recipe": (item_a, item_b),
           "children": [build_tree(item_a), build_tree(item_b)]
       }
       memo[item] = tree
       return tree
   ```
   - **优化:** 记忆化 (memoization) 避免重复计算子树
   - **时间复杂度:** $O(V + E)$ (有记忆化)
   - **空间复杂度:** $O(V)$ (递归栈 + memo)

6. **多路径枚举 (build_all_crafting_trees)**
   ```python
   def build_all_trees(item):
       if item in base_items:
           return [{"item": item, "is_base": True}]
       
       if item in memo:
           return memo[item]
       
       all_trees = []
       for recipe in item_to_recipes[item]:
           item_a, item_b = recipe
           trees_a = build_all_trees(item_a)
           trees_b = build_all_trees(item_b)
           
           # 笛卡尔积组合所有子树
           for tree_a in trees_a:
               for tree_b in trees_b:
                   all_trees.append({
                       "item": item,
                       "recipe": recipe,
                       "children": [tree_a, tree_b]
                   })
       
       memo[item] = all_trees
       return all_trees
   ```
   - **时间复杂度:** $O(k^d)$
     - $k$: 每个物品的平均配方数
     - $d$: 合成树深度
   - **空间复杂度:** $O(k^d)$ (所有路径树)

7. **最简路径排序**
   
   计算每棵树的统计指标:
   ```python
   stats = {
       "depth": max_depth,           # 合成深度（树的高度）
       "steps": total_steps,         # 合成步骤（非叶子节点数）
       "total_materials": sum(材料数量),  # 基础材料总数
       "material_types": len(材料种类),   # 基础材料种类数
       "materials": {材料: 数量}     # 材料详细分布
   }
   ```
   
   **排序优先级** (按顺序):
   1. **深度最小** (`depth` 升序): 合成层数最少
   2. **宽度最小** (`steps` 升序): 合成步骤最少
   3. **广度最大** (`material_types` 降序): 使用的基础材料种类最多
   4. **字典序** (结果字符串比较): 稳定排序的 tiebreaker
   
   ```typescript
   trees.sort((a, b) => {
       if (a.depth !== b.depth) return a.depth - b.depth;
       if (a.steps !== b.steps) return a.steps - b.steps;
       if (a.material_types !== b.material_types) return b.material_types - a.material_types;
       return a.item.localeCompare(b.item);
   });
   ```

**图复杂度分析**

```python
stats = {
    "max_in_degree": max(len(item_to_recipes[item])),  # 最多合成方式
    "avg_in_degree": sum(入度) / len(all_items),
    "max_out_degree": max(物品作为材料的次数),         # 最多参与合成
    "avg_out_degree": sum(出度) / len(all_items),
    "circular_count": len(self_loop_recipes),         # 循环配方数
    "circular_items": len(circular_items)             # 循环物品数
}
```

**实现建议**

- **后端 API:** 实现为 `/api/recipes/path?item=<name>&mode=all` 
  - `mode=single`: 返回最简路径
  - `mode=all`: 返回所有路径 (前 100 条)
- **前端展示:** 
  - 树形可视化组件 (递归渲染)
  - 路径对比表格 (材料、深度、步骤对比)

#### 3.3 贡献榜

* **更新时间：** 采用**定时任务**更新（建议每 $\text{1 小时}$）。
* **维度：** 至少包含总贡献度。**待讨论：** 增加日周贡献度维度。

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
| **后端框架** | Node.js + Express / Fastify (TypeScript) | 轻量级 API 服务 |
| **数据库** | SQLite | 轻量级、无需独立服务器、适合中小型应用 |
| **ORM** | Prisma / TypeORM | 提供 TypeScript 类型安全的数据库访问 |
| **API 文档** | Swagger / OpenAPI | 自动生成 API 文档 |
| **代码规范** | ESLint + Prettier | 统一代码风格 |
| **包管理器** | pnpm / npm | 依赖管理 |

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

```typescript
// database/config.ts
export const sqliteConfig = {
  filename: './database/azothpath.db',
  options: {
    // 启用 WAL 模式，提高并发性能
    journal_mode: 'WAL',
    // 同步模式：NORMAL 平衡性能和安全
    synchronous: 'NORMAL',
    // 缓存大小（页数）：2000 pages ≈ 8MB
    cache_size: -2000,
    // 设置繁忙超时（毫秒）
    busy_timeout: 5000
  }
};
```

##### 4.2.4 数据库表创建 SQL（SQLite 语法）

```sql
-- recipes 表
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_a TEXT NOT NULL,
  item_b TEXT NOT NULL,
  result TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  is_verified INTEGER DEFAULT 0,  -- SQLite 使用 INTEGER 存储布尔值
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
  is_verified: boolean;
  created_at: string;
  like_count?: number;
  is_liked?: boolean;
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

### 7. 迭代计划

#### Phase 1: 核心功能（MVP）
- [ ] 用户注册登录
- [ ] 配方录入（单条 + 批量）
- [ ] 配方展示与搜索
- [ ] 任务系统基础功能
- [ ] 贡献度统计

#### Phase 2: 体验优化
- [ ] 最简路径算法实现
- [ ] 点赞功能
- [ ] 用户等级系统
- [ ] 贡献榜排行
- [ ] 拼音搜索支持

#### Phase 3: 高级功能
- [ ] 管理员后台
- [ ] 数据导出功能
- [ ] 社区互动功能
- [ ] 移动端适配
- [ ] 性能优化
