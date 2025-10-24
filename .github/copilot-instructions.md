# Azoth Path - AI Agent Instructions

## 🚀 Quick Start Guide for AI Agents

**Project Type**: Community-driven recipe database for the game "无尽合成"

**Core Purpose**: Help players discover and share item synthesis paths with validation and reward system

**Quick Facts**:
- 🎮 **Game**: 无尽合成 (https://hc.tsdo.in/)
- 🏗️ **Architecture**: Vue 3 frontend + Node.js backend + SQLite database
- 🔍 **Core Feature**: BFS-based recipe path search with multi-path analysis
- 🏆 **Reward System**: Contribution scoring and task bounties
- 📊 **Database**: SQLite with no foreign keys (application-layer integrity)

**Key Files to Understand**:
- `prd.md` - Complete product requirements and technical specs
- `recipe_calculator.py` - Python reference for path search algorithms (917 lines)
- `backend/src/` - TypeScript backend with Express and async processing
- `frontend/src/` - Vue 3 SPA with TypeScript and Pinia stores
- `API_DOCUMENTATION.md` - Complete API interface documentation with examples

**Development Status**: 
- ✅ Backend running on http://localhost:19198
- ✅ Frontend running on http://localhost:11451  
- ✅ Database initialized and connected
- ✅ Hot reload enabled (no manual restart needed)
- ✅ Like system with toggle functionality implemented

## ⚠️ CRITICAL Development Rules

### DO NOT Restart Servers
**IMPORTANT**: The developer keeps both frontend and backend servers running continuously. AI Agent should:
- ✅ **NEVER** manually run `npm run dev` or restart servers
- ✅ **RELY** on hot-reload (Vite HMR for frontend, nodemon for backend)
- ✅ **TRUST** that file changes will auto-reload
- ✅ **ONLY** mention manual restart if explicitly required (e.g., after `.env` changes)

When making code changes:
- Frontend: Vite will automatically reload (HMR)
- Backend: nodemon will automatically restart on file save
- Database schema changes: May require manual `npm run db:init`

## 🎯 关键发现与架构洞察

### 核心数据流模式
- **配方提交**: 用户提交 → 外部API验证 → 自动收录物品 → 计算贡献分
- **点赞系统**: 需要同时更新 `recipes.likes` 和 `recipe_likes` 表
- **批量导入**: 异步任务队列处理，支持进度跟踪和错误重试

### 性能优化策略
- **数据库索引**: 复合索引优化搜索和排序性能
- **游标分页**: 支持大数据量场景的游标分页
- **JOIN优化**: 使用LEFT JOIN替代子查询提升查询性能
- **缓存策略**: 热门物品路径缓存，TTL 1小时

### 图算法实现
- **可达性分析**: BFS算法从基础材料开始分析
- **循环检测**: 检测A+A=A等循环依赖模式
- **图分类**: 孤立图、边界图、循环图、线性图
- **统计指标**: 入度、出度、图密度、聚类系数

## Project Overview
**Azoth Path（无尽合成工具站）** is a community-driven web tool for the game "无尽合成", helping players discover and share item synthesis recipes. The system validates recipes through external game API and rewards users for discovering new synthesis paths.

## ⚠️ CRITICAL Development Rules

### DO NOT Restart Servers
**IMPORTANT**: The developer keeps both frontend and backend servers running continuously. AI Agent should:
- ✅ **NEVER** manually run `npm run dev` or restart servers
- ✅ **RELY** on hot-reload (Vite HMR for frontend, nodemon for backend)
- ✅ **TRUST** that file changes will auto-reload
- ✅ **ONLY** mention manual restart if explicitly required (e.g., after `.env` changes)

When making code changes:
- Frontend: Vite will automatically reload (HMR)
- Backend: nodemon will automatically restart on file save
- Database schema changes: May require manual `npm run db:init`

### 关键开发工作流

#### 数据库操作模式
```typescript
// 所有数据库操作使用 database 单例
import { database } from '../database/connection';

// 查询模式
const recipes = await database.all<Recipe>('SELECT * FROM recipes WHERE is_public = 1');
const recipe = await database.get<Recipe>('SELECT * FROM recipes WHERE id = ?', [id]);

// 写入模式
const result = await database.run(
  'INSERT INTO recipes (item_a, item_b, result, user_id) VALUES (?, ?, ?, ?)',
  [itemA, itemB, result, userId]
);

// 事务模式
await database.transaction(async (tx) => {
  // 在事务中执行多个操作
  await tx.run('INSERT INTO recipes ...', params);
  await tx.run('UPDATE user SET contribute = contribute + ? WHERE id = ?', [points, userId]);
});
```

#### 前端状态管理模式
```typescript
// Pinia store 模式
const useRecipeStore = defineStore('recipe', () => {
  const recipes = ref<Recipe[]>([]);
  const loading = ref(false);
  
  const fetchRecipes = async (params?: RecipeSearchParams) => {
    loading.value = true;
    try {
      const data = await recipeApi.list(params);
      recipes.value = data.recipes;
      return data;
    } finally {
      loading.value = false;
    }
  };
  
  return { recipes, loading, fetchRecipes };
});
```

#### API 响应格式
```typescript
// 成功响应
{
  recipes: Recipe[],
  total: number,
  page: number,
  limit: number,
  hasMore: boolean,
  nextCursor?: number
}

// 错误响应
{
  code: number,
  message: string,
  ...(process.env.NODE_ENV === 'development' && { stack: string })
}
```

## Architecture

### Tech Stack
- **Frontend**: Vue 3 + TypeScript + Vite + Pinia (state management) + Element Plus/Naive UI
- **Backend**: Node.js + Express/Fastify + TypeScript
- **Database**: SQLite (no foreign keys by design - application-layer integrity)
- **ORM**: Prisma or TypeORM for type-safe database access

### Core Components
```
/frontend - Vue 3 SPA with Composition API
/backend - RESTful API server with async task processing
/database - SQLite file (azothpath.db) with WAL mode enabled
recipe_calculator.py - Python reference implementation for graph algorithms (917 lines)
                       Contains RecipeGraph class with BFS, memoization, cycle detection
                       To be ported to TypeScript backend for production use
```

## Database Design Philosophy

### No Foreign Keys Rule
**Critical**: All tables use auto-increment INTEGER primary keys WITHOUT foreign key constraints. Data integrity is managed at the application layer for flexibility.

### Core Tables Structure
1. **recipes** - Main synthesis records (item_a + item_b = result)
   - Enforces `item_a <= item_b` (lexical order) via CHECK constraint
   - UNIQUE constraint on (item_a, item_b) to prevent duplicates
   
2. **items** - Dictionary of all game items (自动收录 from API validation)
   
3. **user** - User accounts with contribution scoring
   
4. **task** - Bounty system for undiscovered recipes
   - 任务创建时不预先添加物品到 items 表
   - 等配方验证成功后，物品才会自动添加到 items 表
   
5. **import_tasks** - Batch import job summary (汇总表)
   - Status: processing → completed/failed
   - Counters: total_count, success_count, failed_count, duplicate_count
   
6. **import_tasks_content** - Individual recipe entries per import job (明细表)
   - Links to parent task via `task_id` (INTEGER, not UUID)
   - Status flow: pending → processing → success/failed/duplicate

### Key Design Decisions
- **Dictionary ordering**: `item_a` always < `item_b` to deduplicate "A+B=C" and "B+A=C"
- **Async processing**: Batch imports create task records first, then process items asynchronously
- **No cascading deletes**: Application handles cleanup logic explicitly

### Database Field Naming Convention (CRITICAL)
**IMPORTANT**: API 字段名称与数据库字段名称保持完全一致，不进行任何转换。

#### `user` 表字段定义

| Field | Type | Notes |
|-------|------|-------|
| `id` | INTEGER | Primary key |
| `name` | TEXT | 用户登录名 |
| `psw` | TEXT | bcrypt 密码哈希 |
| `auth` | INTEGER | 1=普通用户, 9=管理员 |
| `contribute` | INTEGER | 累积贡献分 |
| `level` | INTEGER | 用户等级 |
| `created_at` | DATETIME | 创建时间 |

#### `recipes` 表字段定义

| Field | Type | Notes |
|-------|------|-------|
| `id` | INTEGER | Primary key |
| `item_a` | TEXT | 材料A (item_a < item_b) |
| `item_b` | TEXT | 材料B |
| `result` | TEXT | 合成结果 |
| `user_id` | INTEGER | 创建者 ID |
| `likes` | INTEGER | 点赞数（冗余字段，提高查询性能） |
| `created_at` | DATETIME | 创建时间 |

**注意**: `likes` 字段是冗余字段，与 `recipe_likes` 表保持同步。点赞/取消点赞时需要同时更新两个表。

#### `recipe_likes` 表字段定义

| Field | Type | Notes |
|-------|------|-------|
| `id` | INTEGER | Primary key |
| `recipe_id` | INTEGER | 配方 ID |
| `user_id` | INTEGER | 点赞用户 ID |
| `created_at` | DATETIME | 点赞时间 |

**前后端统一规则**:
- ✅ API 请求/响应直接使用数据库字段名
- ✅ 前端类型定义使用数据库字段名
- ✅ 不需要字段转换函数
- ❌ 不使用 `username`、`role`、`creator_id`、`total_contribution` 等别名

Example:
```typescript
// User
{ id: 1, name: 'admin', auth: 9, contribute: 100, level: 1, created_at: '...' }

// Recipe (JOIN 查询)
{ id: 1, item_a: '金', item_b: '木', result: '合金', user_id: 1, 
  likes: 5, created_at: '...', creator_name: 'admin' }
```

## Data Flow & Processing

### Recipe Submission Flow
```
1. User submits (text "A+B=C" or JSON batch)
2. Create import_tasks record (返回 taskId)
3. Parse & create import_tasks_content entries (status: pending)
4. Background queue processes each entry:
   - Update status → processing
   - Call external validation API
   - Check duplicates in recipes table
   - Update status → success/failed/duplicate
   - Update parent task counters in real-time
5. When all items processed → import_tasks.status = completed
```

### External API Integration
- **Validation endpoint**: `https://hc.tsdo.in/api/check` (GET with itemA, itemB, result params)
- **Error handling**: 
  - Status 200 → Recipe validated successfully (save emoji from response)
  - Status 404 → Recipe mismatch (result incorrect or recipe doesn't exist)
  - Status 400 → Parameter error (invalid item names or incorrect format)
  - Status 403 → Contains illegal items (legacy compatibility)
  - Other errors → log to error_message, allow retry
- **Auto-discovery**: New items from API automatically added to `items` table with emoji

### 外部API验证流程
```typescript
// 在 importService.ts 中的验证逻辑
const response = await axios.get('https://hc.tsdo.in/api/check', {
  params: { itemA, itemB, result }
});

// 验证成功条件
if (response.status === 200 && response.data && response.data.result === expectedResult) {
  // 配方验证成功
  // 自动收录新物品到 items 表
  // 计算贡献分
}

// 错误处理
// 404: 配方不匹配
// 400: 参数错误
// 403: 包含非法物件（保留兼容性）
```

### 贡献分计算规则（关键理解）
**实时计算**（每次配方验证成功后更新）：
- **新配方奖励**: 成功插入 recipes 表 → +1 分
- **新物品奖励**: 成功插入 items 表 → 每个新物品 +2 分
  - 配方包含 3 个物品（item_a, item_b, result）
  - **用户可能乱序导入**，所以 item_a 和 item_b 也可能是新物品
  - 最多可获得 6 分（3 个新物品 × 2）
- **任务奖励**: 完成悬赏任务 → 获得任务设定的奖励分

**关键理解**:
- **外部 API 验证**: 游戏 API 有自己的物品库，不依赖我们的数据库
- **乱序导入**: 用户可能先导入 "铁剑 + 火焰 = 炎之剑"，但 "铁剑" 和 "火焰" 的配方还没导入
- **物品自动收录**: 验证成功后，item_a、item_b、result 都会被添加到 items 表（如果不存在）
- **emoji 获取**: API 只返回 result 的 emoji，item_a 和 item_b 的 emoji 初始为空（后续导入时更新）

### Contribution Score System
**实时计算规则**（每次配方验证成功后更新）:
1. **新配方奖励**: 成功插入 recipes 表 → +1 分
   - 已存在的配方（重复提交）→ 不加分
2. **新物品奖励**: 成功插入 items 表 → 每个新物品 +2 分
   - 配方包含 3 个物品（item_a, item_b, result）
   - **用户可能乱序导入**，所以 item_a 和 item_b 也可能是新物品
   - 已存在的物品 → 不加分
   - 最多可获得 6 分（3 个新物品 × 2）
3. **任务奖励**: 完成悬赏任务 → 获得任务设定的奖励分

**关键理解**:
- **外部 API 验证**: 游戏 API 有自己的物品库，不依赖我们的数据库
- **乱序导入**: 用户可能先导入 "铁剑 + 火焰 = 炎之剑"，但 "铁剑" 和 "火焰" 的配方还没导入
- **物品自动收录**: 验证成功后，item_a、item_b、result 都会被添加到 items 表（如果不存在）
- **emoji 获取**: API 只返回 result 的 emoji，item_a 和 item_b 的 emoji 初始为空（后续导入时更新）

**示例**:
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

### Task/Bounty System
**任务创建规则**:
1. 手动创建：管理员/用户发布悬赏（物品名称 + 奖励分）
   - 不检查物品是否存在于 items 表
   - 不预先添加物品到 items 表
   - 等配方验证成功后自动添加物品
2. 自动创建：配方提交后自动检测
   - Recipe successfully added (A+B=C)
   - Item A or B has no recipe (not in recipes.result)
   - Item is not base element (金木水火土)
4. No active task exists for that item

## Code Conventions

### TypeScript Types Pattern
```typescript
// Always define interfaces for database entities
export interface ImportTask {
  id: number;  // Auto-increment, never UUID
  user_id: number;
  total_count: number;
  // ... mirrors database exactly
}

// API responses wrap data
return request.get<{ tasks: ImportTask[]; total: number }>('/api/import-tasks');
```

### API Structure
- **Public routes**: `/api/recipes` (GET list/detail, path search)
- **Authenticated routes**: POST/DELETE operations require `authMiddleware`
- **Naming**: Use `taskId` (number) not `task_id` in URLs: `/api/import-tasks/${taskId}`

### Frontend State Management
```typescript
// Pinia stores mirror backend entities
stores/
  ├── user.ts - Authentication & user profile
  ├── recipe.ts - Recipe CRUD & search
  └── task.ts - Task/bounty management
```

## 🛠️ 开发工具与环境

### 前端开发环境
- **构建工具**: Vite 5.x + TypeScript 5.x
- **开发服务器**: http://localhost:11451 (代理到后端)
- **热重载**: Vite HMR 自动刷新
- **路径别名**: `@` 指向 `src/` 目录

### 后端开发环境  
- **运行时**: Node.js 18+ + TypeScript
- **开发服务器**: http://localhost:19198
- **热重载**: nodemon 自动重启
- **时区设置**: UTC+8 (中国标准时间)

### 数据库配置
```typescript
// SQLite 性能优化配置
PRAGMA journal_mode = WAL;        // 并发读写
PRAGMA synchronous = NORMAL;      // 安全与性能平衡
PRAGMA cache_size = -2000;        // 8MB 缓存
PRAGMA busy_timeout = 5000;       // 处理锁竞争
```

### 关键开发命令
```bash
# 前端开发
cd frontend && npm run dev        # 启动开发服务器
cd frontend && npm run build      # 构建生产版本

# 后端开发  
cd backend && npm run dev         # 启动开发服务器
cd backend && npm run db:init     # 初始化数据库
cd backend && npm run build       # 编译 TypeScript

# 完整启动（推荐）
./run.bat                         # Windows
./run.sh                          # Linux/macOS
```

## Critical Developer Workflows

### Database Initialization
```bash
cd backend
npm run db:init  # Creates tables from schema
```

### Development Servers
```bash
# Backend (port 19198)
cd backend && npm run dev

# Frontend (port 11451)
cd frontend && npm run dev
```

### SQLite Configuration
```typescript
// Always use these pragma settings
journal_mode: 'WAL'        // Concurrent reads/writes
synchronous: 'NORMAL'      // Balance safety/performance
cache_size: -2000          // 8MB cache
busy_timeout: 5000         // Handle lock contention
```

## Search & Path Optimization

### Graph-Based Recipe Path Algorithm (recipe_calculator.py)

The recipe search system is built on **directed graph traversal** with sophisticated optimizations to handle circular dependencies, unreachable items, and multi-path scenarios.

#### Core Data Structure: RecipeGraph

```python
class RecipeGraph:
    recipes: List[Recipe]              # All recipes (normalized)
    item_to_recipes: Dict[str, List]   # item → recipes that can craft it
    reachable_items: Set[str]          # Items craftable from base materials
    valid_recipes: Set[Recipe]         # Recipes with reachable materials
    base_items: Set[str]               # {"金", "木", "水", "火", "土", "宝石"}
    self_loop_recipes: Set[Recipe]     # Circular recipes (A+A=A)
    circular_items: Set[str]           # Items involved in cycles
```

### TypeScript 后端实现模式

#### 图算法实现位置
- **核心服务**: `backend/src/services/recipeService.ts`
- **主要算法**: `searchPath()`, `buildDependencyGraph()`
- **性能优化**: 使用 BFS 可达性分析 + 缓存策略

#### 图分类系统
系统将物品图分为四种类型：
- **孤立图 (Isolated Graph)**: 无法从基础材料合成的物品
- **边界图 (Boundary Graph)**: 可以直接从基础材料合成的物品  
- **循环图 (Circular Graph)**: 包含循环依赖的物品
- **线性图 (Linear Graph)**: 正常的合成路径，无循环依赖

#### 统计指标计算
```typescript
// 在 recipeService.ts 中的统计计算
const stats = {
  inDegree: totalInDegree,        // 总入度（被依赖次数）
  outDegree: totalOutDegree,      // 总出度（依赖其他节点次数）
  avgDegree: avgDegree,           // 平均度数
  density: density,               // 图密度
  clustering: clustering,         // 聚类系数
  boundaryNodes: boundaryNodes    // 边界节点数
};
```

#### Key Algorithms

**1. Recipe Normalization (O(1))**
```python
def normalize_recipe(item_a, item_b, result):
    # Always ensure item_a <= item_b (lexical order)
    # Automatically deduplicates "A+B=C" and "B+A=C"
    if item_a > item_b:
        item_a, item_b = item_b, item_a
    return (item_a, item_b, result)
```

**2. Circular Dependency Detection (O(n))**
- Identifies patterns: `A+A=A`, `A+B=A`, `A+B=B`
- Marks `self_loop_recipes` and `circular_items`
- Critical for preventing infinite loops in tree building

**3. Reachability Analysis (BFS - O(V+E))**
```python
def analyze_reachability():
    queue = deque(base_items)
    reachable = set(base_items)
    
    while queue:
        current = queue.popleft()
        for recipe in item_to_recipes[current]:
            item_a, item_b, result = recipe
            
            # Both materials must be reachable
            if item_a in reachable and item_b in reachable:
                valid_recipes.add(recipe)
                if result not in reachable:
                    reachable.add(result)
                    queue.append(result)
    
    return reachable, valid_recipes
```
- Complexity: O(V + E) where V = items, E = recipes
- Marks which items are craftable from base materials
- Filters out invalid recipes with unreachable materials

**4. Crafting Tree Building (O(V+E) with memoization)**
```python
def build_crafting_tree(item, memo={}):
    if item in base_items:
        return {"item": item, "is_base": True}
    
    if item in memo:
        return memo[item]  # Avoid recomputing subtrees
    
    recipes = item_to_recipes[item]
    if not recipes:
        return None
    
    # Pick first recipe (can extend to multi-path)
    item_a, item_b = recipes[0]
    tree = {
        "item": item,
        "is_base": False,
        "recipe": (item_a, item_b),
        "children": [
            build_crafting_tree(item_a, memo),
            build_crafting_tree(item_b, memo)
        ]
    }
    memo[item] = tree
    return tree
```

**5. Multi-Path Enumeration (O(k^d))**
```python
def build_all_crafting_trees(item, memo={}):
    if item in base_items:
        return [{"item": item, "is_base": True}]
    
    if item in memo:
        return memo[item]
    
    all_trees = []
    for recipe in item_to_recipes[item]:
        item_a, item_b = recipe
        trees_a = build_all_crafting_trees(item_a, memo)
        trees_b = build_all_crafting_trees(item_b, memo)
        
        # Cartesian product of all sub-paths
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
- Returns ALL possible crafting paths for an item
- Complexity: O(k^d) where k = avg recipes per item, d = depth
- Memoization prevents redundant subtree computation

#### Tree Analysis & Ranking

**Calculate Statistics:**
```python
def analyze_tree_stats(tree):
    return {
        "depth": max_depth,              # Tree height (合成深度)
        "steps": total_steps,            # Non-leaf nodes (合成步骤)
        "total_materials": sum(counts),  # Total base materials needed
        "material_types": len(materials), # Unique material types
        "materials": {material: count}    # Material distribution
    }
```

**"最简路径" Ranking Criteria (in order):**
1. **深度最小** (`depth` ascending) - Fewest synthesis layers
2. **宽度最小** (`steps` ascending) - Fewest recipes needed
3. **广度最大** (`material_types` descending) - Most base material variety
4. **字典序** (lexical order) - Stable tiebreaker

```typescript
// TypeScript backend implementation
paths.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    if (a.steps !== b.steps) return a.steps - b.steps;
    if (a.material_types !== b.material_types) return b.material_types - a.material_types;
    return a.item.localeCompare(b.item);
});
```

#### Query Methods

```python
# Filter recipes by material or result
query_recipes(material="火", result="凤凰", exact=True, limit=10, offset=0)

# Get all recipes that craft an item
get_recipes_for_item("剑") → [("铁", "木"), ("钢", "火"), ...]

# Check if recipe exists
recipe_exists("金", "木", "合金") → bool

# Graph statistics
get_graph_stats() → {
    "total_recipes": 1000,
    "reachable_items": 850,
    "unreachable_items": 150,
    "circular_recipes": 5,
    ...
}
```

#### Integration with TypeScript Backend

**API Endpoints:**
```typescript
// Single optimal path
GET /api/recipes/path/:item → { tree, stats }

// All paths (paginated)
GET /api/recipes/path/:item?mode=all&limit=100 → { trees, total }

// Graph analysis
GET /api/recipes/graph/stats → { ...stats }
```

**Caching Strategy:**
- Redis cache for popular items (TTL 1 hour)
- Invalidate cache when recipes table updates
- Pre-compute paths for items with task bounties

**Performance Considerations:**
- For items with >1000 paths, limit to top 100 by ranking
- Use Web Workers in frontend for large tree rendering
- Consider lazy-loading subtrees in UI for deep paths (depth >10)

**Cycle Handling:**
- Items like "时间+时间=时间" are marked in `circular_items`
- BFS algorithm naturally handles cycles (visited set prevents loops)
- Display warning in UI: "⚠️ 此物品包含循环依赖配方"

## Security & Validation

### Password Handling
- Use bcrypt for hashing (stored in `user.psw`)
- JWT tokens for session management

### Input Validation
- **Both** frontend AND backend validation required
- Rate limiting on API endpoints to prevent abuse
- ORM parameterized queries to prevent SQL injection

### 安全配置要点
- **JWT 密钥**: 必须通过环境变量 `JWT_SECRET` 配置
- **默认管理员**: 生产环境必须删除或修改默认账户 (admin/admin123)
- **输入验证**: 限制为中文、英文、数字、空格、连字符和下划线
- **SQL 注入防护**: 使用参数化查询和白名单验证

## 🚀 部署与打包

### 打包流程
```bash
# Windows 打包
.\build.bat

# 生成目录结构
dist/
├── frontend/              # 前端静态文件
├── backend/               # 后端应用
├── logs/                  # 日志目录
├── start.sh               # Linux 启动脚本
└── ecosystem.config.js    # PM2 配置
```

### 生产环境要求
- **Node.js**: 18+ 版本
- **数据库**: SQLite 3.x
- **反向代理**: Nginx (推荐)
- **进程管理**: PM2 (推荐)

### 环境变量配置
```env
# 必需配置
JWT_SECRET=your_secure_jwt_secret_key_here

# 可选配置
DB_PATH=database/azothpath.db
PORT=19198
NODE_ENV=production
```

## 🚨 Common Pitfalls & Troubleshooting

### Database Issues
1. **Foreign Keys**: Don't create foreign keys - application-layer integrity only
2. **Recipe Normalization**: Always ensure `item_a < item_b` before insertion
3. **ID Types**: `taskId` is number (auto-increment), not string/UUID
4. **Task Relationships**: `import_tasks_content.task_id` links to parent task
5. **Counter Updates**: Always update parent task aggregates when processing content

### Development Issues
6. **Server Restart**: NEVER manually restart servers - rely on hot reload
7. **Database Schema**: Schema changes require `npm run db:init`
8. **Field Names**: API uses exact database field names (no transformation)
9. **Like Synchronization**: Must update both `recipes.likes` and `recipe_likes` tables
10. **Transaction Management**: Use `database.transaction()` for multi-step operations

### Integration Issues
11. **External API**: Handle 400/403 errors as immediate failures, others as retryable
12. **Contribution Scoring**: Real-time calculation on recipe validation success
13. **Item Discovery**: New items automatically added to `items` table from API
14. **Graph Algorithms**: BFS reachability analysis requires proper cycle detection
15. **Performance**: Monitor slow queries (>100ms) and optimize with indexes

### Debugging Tools
- **Database Logs**: All queries logged with timing in `backend/src/utils/logger.ts`
- **Slow Query Detection**: Automatic warnings for queries > 100ms
- **Transaction Tracing**: Complete transaction lifecycle logging
- **API Error Tracking**: Structured error responses with stack traces in development

## 🔄 Maintenance & Evolution

### Documentation Updates
When updating this file, follow these principles:
- ✅ **PRESERVE** all existing content and historical context
- ✅ **UPDATE** outdated information with current facts
- ✅ **ADD** new patterns and insights discovered from codebase analysis
- ✅ **MAINTAIN** cross-references between documentation files
- ✅ **DOCUMENT** architectural decisions and their rationale

### Codebase Evolution
- **Backward Compatibility**: Maintain API compatibility when possible
- **Database Migrations**: Use `database/init.sql` for schema changes
- **Type Safety**: Leverage TypeScript types across frontend and backend
- **Testing Strategy**: Focus on integration testing for critical data flows
- **Performance Monitoring**: Continuously monitor and optimize slow operations

## 🎯 AI Agent 最佳实践

### 代码修改模式
- **数据库操作**: 始终使用 `database` 单例，遵循事务模式
- **前端状态**: 使用 Pinia stores 管理状态，遵循响应式模式
- **API 设计**: 保持前后端字段名一致，不进行转换
- **错误处理**: 使用统一的错误响应格式

### 性能优化要点
- **数据库索引**: 为常用查询字段创建复合索引
- **查询优化**: 使用 JOIN 替代子查询，避免 N+1 查询
- **分页策略**: 大数据量场景使用游标分页
- **缓存策略**: 热门数据使用内存缓存

### 测试与验证
- **配方验证**: 依赖外部 API 进行配方有效性验证
- **数据一致性**: 确保 `recipes.likes` 与 `recipe_likes` 表同步
- **贡献分计算**: 实时计算，避免重复计分
- **图算法**: 验证循环依赖和可达性分析的正确性

## 🔧 Essential Architecture Patterns

### Database Singleton Pattern
**CRITICAL**: All database operations must use the singleton `database` instance from `backend/src/database/connection.ts`

```typescript
// ✅ CORRECT: Use database singleton
import { database } from '../database/connection';

const recipes = await database.all<Recipe>('SELECT * FROM recipes');
const result = await database.run('INSERT INTO recipes ...', params);
await database.transaction(async (tx) => {
  // Transaction operations
});

// ❌ WRONG: Don't create new database connections
import { getDatabase } from '../database/connection';
const db = await getDatabase(); // Avoid this pattern
```

### Frontend Store Pattern
**Pinia stores follow reactive patterns with TypeScript types:**

```typescript
// Example from frontend/src/stores/recipe.ts
const useRecipeStore = defineStore('recipe', () => {
  const recipes = ref<Recipe[]>([]);
  const loading = ref(false);
  
  const fetchRecipes = async (params?: RecipeSearchParams) => {
    loading.value = true;
    try {
      const data = await recipeApi.list(params);
      recipes.value = data.recipes;
      return data;
    } finally {
      loading.value = false;
    }
  };
  
  return { recipes, loading, fetchRecipes };
});
```

### API Layer Pattern
**Frontend API calls use axios wrapper with consistent error handling:**

```typescript
// Example from frontend/src/api/recipe.ts
export const recipeApi = {
  list(params: RecipeSearchParams) {
    return api.get<RecipeListResponse>('/recipes', { params });
  },
  
  like(id: number) {
    return api.post<{ liked: boolean; likes: number }>(`/recipes/${id}/like`);
  }
};
```

### Service Layer Pattern
**Backend services handle business logic with database operations:**

```typescript
// Example from backend/src/services/recipeService.ts
export class RecipeService {
  async searchPath(item: string): Promise<CraftingPath | null> {
    // BFS-based path search implementation
    // Uses database singleton for queries
  }
}
```

## 🚀 Critical Development Workflows

### Database Operations
- **Initialization**: `cd backend && npm run db:init`
- **Reset**: `cd backend && npm run db:reset` (force recreation)
- **Schema Changes**: Always update `database/init.sql` and run `db:init`

### Development Servers
- **Backend**: `cd backend && npm run dev` (port 19198, nodemon auto-restart)
- **Frontend**: `cd frontend && npm run dev` (port 11451, Vite HMR)
- **Hot Reload**: Both servers auto-reload on file changes - NO manual restart needed

### Build Commands
- **Frontend Build**: `cd frontend && npm run build`
- **Backend Build**: `cd backend && npm run build`
- **Production Start**: `cd backend && npm start`

## 📊 Data Flow Architecture

### Recipe Submission Pipeline
```
1. User submits recipe (text "A+B=C" or JSON batch)
2. Create import_tasks record (returns taskId)
3. Parse & create import_tasks_content entries (status: pending)
4. Background queue processes each entry:
   - Update status → processing
   - Call external validation API (https://hc.tsdo.in/api/check)
   - Check duplicates in recipes table
   - Update status → success/failed/duplicate
   - Update parent task counters in real-time
5. When all items processed → import_tasks.status = completed
```

### Contribution Score Calculation
**Real-time calculation on recipe validation success:**
- **New Recipe**: +1 point (successful insertion to recipes table)
- **New Item**: +2 points per new item (item_a, item_b, result)
- **Task Reward**: + task prize points
- **Maximum**: 7 points per recipe (1 + 3×2)

### External API Integration
- **Validation Endpoint**: `https://hc.tsdo.in/api/check` (GET with itemA, itemB, result params)
- **Error Handling**: 
  - Status 200 → Recipe validated successfully (save emoji from response)
  - Status 404 → Recipe mismatch (result incorrect or recipe doesn't exist)
  - Status 400 → Parameter error (invalid item names or incorrect format)
  - Status 403 → Contains illegal items (legacy compatibility)
  - Other errors → log to error_message, allow retry
- **Auto-Discovery**: New items automatically added to `items` table with emoji

## 🔍 Key Integration Points

### Database Schema Evolution
- **No Foreign Keys**: Application-layer integrity management
- **Dictionary Ordering**: `item_a` always < `item_b` (lexical order)
- **Redundant Fields**: `recipes.likes` synchronized with `recipe_likes` table
- **Async Processing**: Batch imports use task queue with progress tracking

### Graph Algorithm Implementation
- **Core Service**: `backend/src/services/recipeService.ts`
- **Algorithms**: BFS reachability analysis, cycle detection, multi-path enumeration
- **Graph Classification**: Isolated, boundary, circular, linear graphs
- **Performance**: Memoization, caching strategies, complexity analysis

### Frontend-Backend Communication
- **API Response Format**: Consistent `{ code, message, data }` structure
- **Field Naming**: Direct database field names (no transformation)
- **Error Handling**: Unified error codes and messages
- **Authentication**: JWT tokens with Bearer scheme

## ⚡ Performance Considerations

### Database Optimization
- **WAL Mode**: Concurrent reads/writes with journal_mode = WAL
- **Cache Size**: 8MB cache with cache_size = -2000
- **Busy Timeout**: 5-second timeout for lock contention
- **Index Strategy**: Compound indexes for common query patterns

### Frontend Optimization
- **Virtual Scrolling**: For large recipe lists
- **Lazy Loading**: Tree components for deep crafting paths
- **Caching**: API response caching for frequently accessed data
- **Bundle Splitting**: Code splitting for better initial load performance

### Backend Optimization
- **Query Logging**: All queries logged with timing and performance metrics
- **Slow Query Detection**: Automatic warning for queries > 100ms
- **Connection Pooling**: Better-sqlite3 connection management
- **Background Processing**: Async task queues for batch operations

## Database Schema Reference

### Complete Database Structure (from DATABASE_SCHEMA.md)

**⚠️ 重要规则**: 前后端 API 字段名与数据库字段名完全一致，不进行任何转换！

#### Core Tables

**1. `user` 表（用户）**
- `id` (INTEGER) - 主键
- `name` (TEXT) - 用户登录名
- `psw` (TEXT) - bcrypt 密码哈希
- `auth` (INTEGER) - 权限等级 (1=普通用户, 9=管理员)
- `contribute` (INTEGER) - 累积贡献分
- `level` (INTEGER) - 用户等级
- `created_at` (DATETIME) - 创建时间

**2. `recipes` 表（配方）**
- `id` (INTEGER) - 主键
- `item_a` (TEXT) - 材料A（字典序 item_a < item_b）
- `item_b` (TEXT) - 材料B
- `result` (TEXT) - 合成结果
- `user_id` (INTEGER) - 创建者 ID（关联 user.id）
- `likes` (INTEGER) - 点赞数（冗余字段）
- `created_at` (DATETIME) - 创建时间

**⚠️ 注意**: `likes` 字段是冗余字段，与 `recipe_likes` 表保持同步。点赞/取消点赞时需要同时更新两个表。

**3. `recipe_likes` 表（配方点赞）**
- `id` (INTEGER) - 主键
- `recipe_id` (INTEGER) - 配方 ID
- `user_id` (INTEGER) - 点赞用户 ID
- `created_at` (DATETIME) - 点赞时间

**4. `items` 表（物品词典）**
- `id` (INTEGER) - 主键
- `name` (TEXT) - 物品名称（唯一）
- `emoji` (TEXT) - 物品图标
- `pinyin` (TEXT) - 拼音（用于搜索）
- `is_base` (INTEGER) - 是否基础材料 (0=否, 1=是)
- `created_at` (DATETIME) - 创建时间

**5. `task` 表（悬赏任务）**
- `id` (INTEGER) - 主键
- `item_name` (TEXT) - 目标物品名称
- `prize` (INTEGER) - 奖励积分
- `status` (TEXT) - 任务状态 ('active' / 'completed')
- `created_at` (DATETIME) - 创建时间
- `completed_by_recipe_id` (INTEGER) - 完成任务的配方 ID
- `completed_at` (DATETIME) - 完成时间

**6. `import_tasks` 表（批量导入任务汇总）**
- `id` (INTEGER) - 主键
- `user_id` (INTEGER) - 导入用户 ID
- `total_count` (INTEGER) - 总数
- `success_count` (INTEGER) - 成功数
- `failed_count` (INTEGER) - 失败数
- `duplicate_count` (INTEGER) - 重复数
- `status` (TEXT) - 任务状态 ('processing' / 'completed' / 'failed')
- `error_details` (TEXT) - 错误详情（JSON）
- `created_at` (DATETIME) - 创建时间
- `updated_at` (DATETIME) - 更新时间

**7. `import_tasks_content` 表（批量导入任务明细）**
- `id` (INTEGER) - 主键
- `task_id` (INTEGER) - 关联 import_tasks.id
- `item_a` (TEXT) - 材料A
- `item_b` (TEXT) - 材料B
- `result` (TEXT) - 合成结果
- `status` (TEXT) - 处理状态 ('pending' / 'processing' / 'success' / 'failed' / 'duplicate')
- `error_message` (TEXT) - 错误信息
- `recipe_id` (INTEGER) - 成功后的配方 ID
- `created_at` (DATETIME) - 创建时间

### Key Database Constraints & Indexes

**recipes 表约束**:
- `UNIQUE(item_a, item_b)` - 防止重复配方
- `CHECK (item_a < item_b)` - 强制字典序

**recipe_likes 表约束**:
- `UNIQUE(recipe_id, user_id)` - 防止重复点赞

**items 表约束**:
- `UNIQUE(name)` - 物品名称唯一

### API 响应示例

```typescript
// User
{ id: 1, name: 'admin', auth: 9, contribute: 100, level: 1, created_at: '...' }

// Recipe (JOIN 查询)
{ id: 1, item_a: '金', item_b: '木', result: '合金', user_id: 1, 
  likes: 5, created_at: '...', creator_name: 'admin' }
```

## Documentation Maintenance Principles

### AI Agent Documentation Guidelines

**CRITICAL**: When iterating and improving project documentation, AI Agents must follow these principles:

1. **Preserve All Content**
   - ✅ **NEVER** delete existing documentation content
   - ✅ **ALWAYS** maintain historical context and decisions
   - ✅ **MARK** deprecated content with clear indicators (e.g., "⚠️ DEPRECATED", "🚫 OBSOLETE")
   - ✅ **ADD** new information while keeping old content for reference

2. **Iterative Improvement Process**
   - ✅ **UPDATE** outdated information with current facts
   - ✅ **CORRECT** factual errors (e.g., game name from "Infinite Craft" to "无尽合成")
   - ✅ **ENHANCE** clarity and organization without removing context
   - ✅ **ADD** missing information that improves understanding

3. **Version Control Awareness**
   - ✅ **RESPECT** existing Git commit history and documentation evolution
   - ✅ **MAINTAIN** cross-references between documents
   - ✅ **ENSURE** consistency across all documentation files

4. **Context Preservation**
   - ✅ **KEEP** technical decisions and rationale
   - ✅ **PRESERVE** architectural diagrams and code examples
   - ✅ **MAINTAIN** API specifications and database schemas
   - ✅ **DOCUMENT** changes made during iterations

### Documentation Update Examples

**Correct Approach:**
```markdown
## Game Information
- **Current**: 无尽合成
```

**Incorrect Approach:**
```markdown
## Game Information
- 无尽合成 (deletes historical reference to Infinite Craft)
```

## API Documentation Reference

### Complete API Documentation (from API_DOCUMENTATION.md)

**⚠️ 重要**: API 文档提供了所有后端接口的完整说明，包括请求/响应格式、错误码和前端类型定义。

#### API 文档结构
- **认证接口** - 用户登录、注册、获取当前用户信息
- **用户接口** - 用户资料、统计信息、收藏管理
- **配方接口** - 配方 CRUD、路径搜索、点赞系统
- **物品接口** - 物品词典查询、搜索
- **任务接口** - 悬赏任务管理、进度查询
- **导入接口** - 批量导入任务管理、进度跟踪
- **通知接口** - 系统通知、用户通知管理

#### 关键 API 端点
- `GET /api/recipes/path/:item` - 获取物品合成路径
- `POST /api/recipes` - 提交新配方
- `POST /api/import-tasks` - 创建批量导入任务
- `GET /api/notifications` - 获取用户通知列表
- `PUT /api/notifications/:id/read` - 标记通知为已读
- `PUT /api/notifications/:id/archive` - 归档通知

#### 前端类型定义
API 文档包含完整的前端 TypeScript 类型定义，确保前后端数据一致性：
- `User` - 用户信息类型
- `Recipe` - 配方类型
- `ImportTask` - 导入任务类型
- `Notification` - 通知类型
- `Task` - 悬赏任务类型

## 📚 文件引用
- `prd.md` - 完整的产品需求和技术规范文档
- `recipe_calculator.py` - Python 参考实现（917行），包含 RecipeGraph 类
  - 实现 BFS 可达性分析（O(V+E) 复杂度）
  - 多路径枚举与记忆化（O(k^d) 最坏情况）
  - 循环依赖检测（A+A=A 模式）
  - 树分析，包含深度/步骤/材料统计
  - **状态**: 参考实现，需要移植到 TypeScript 后端用于生产
- `API_DOCUMENTATION.md` - 完整的 API 接口文档，包含请求/响应示例和错误码
- Section 3.2.1 in prd.md - 完整的算法设计和复杂度分析
- Section 4.2.4 in prd.md - 完整的 SQL 模式和索引
- Section 4.3 in prd.md - 前端架构和类型定义
- Section 4.4 in prd.md - 后端架构和 API 端点

## File References
- `prd.md` - Complete product requirements and technical specifications
- `recipe_calculator.py` - Python reference implementation (917 lines) with RecipeGraph class
  - Implements BFS reachability analysis (O(V+E) complexity)
  - Multi-path enumeration with memoization (O(k^d) worst case)
  - Circular dependency detection for A+A=A patterns
  - Tree analysis with depth/steps/materials statistics
  - **Status**: Reference implementation, needs TypeScript port for production
- `API_DOCUMENTATION.md` - Complete API interface documentation with request/response examples and error codes
- Section 3.2.1 in prd.md - Complete algorithm design with complexity analysis
- Section 4.2.4 in prd.md - Complete SQL schema with indexes
- Section 4.3 in prd.md - Frontend architecture and type definitions
- Section 4.4 in prd.md - Backend architecture and API endpoints
