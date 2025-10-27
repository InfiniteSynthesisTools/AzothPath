<div align="center">
  <h1>Azoth Path（无尽合成工具站）</h1>
  <p>社区驱动的合成路径探索 · 验证 · 贡献分 · 批量导入</p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node 18+" />
    <img src="https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white" alt="Vue 3" />
    <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
    <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  </p>
  <p>
    <a href="#开发环境与快速开始">快速开始</a>
    · <a href="docs/api/README.md">API 文档</a>
    · <a href="#合成路径算法图算法">路径算法</a>
    · <a href="prd.md">PRD</a>
  </p>
</div>

一个由社区驱动的“无尽合成”配方与路径探索工具。它帮助玩家发现、验证并分享物品合成配方，内置路径搜索算法、贡献分奖励与批量导入能力。

- 游戏：无尽合成（https://hc.tsdo.in/）
- 架构：Vue 3 前端 + Node.js 后端 + SQLite 数据库
- 核心：基于 BFS 的多路径合成树与图分析
- 端口：前端 http://localhost:11451 · 后端 http://localhost:19198


## 目录
- [概览与特性](#概览与特性)
- [技术栈与目录结构](#技术栈与目录结构)
- [开发环境与快速开始](#开发环境与快速开始)
- [数据库与关键规则](#数据库与关键规则)
- [API 文档与类型](#api-文档与类型)
- [合成路径算法（图算法）](#合成路径算法图算法)
- [构建与部署](#构建与部署)
- [安全与校验](#安全与校验)
- [常见问题与排错](#常见问题与排错)


## 概览与特性
- 配方收录与验证：对接游戏官方校验 API，自动收录新物品
- 路径搜索：BFS 可达性分析 + 合成树构建 + 多路径枚举与排序
- 贡献分系统：新配方 +1，每个新物品 +2，任务奖励叠加
- 批量导入：异步任务队列、进度跟踪、重试与统计
- 点赞系统：冗余计数 + 明细表，读写性能与一致性兼顾
- 图分析：孤立/边界/循环/线性图分类与统计指标
- 性能优化：复合索引、JOIN 优化、缓存与 WAL 并发


## 技术栈与目录结构
- 前端：Vue 3 + TypeScript + Vite + Pinia
- 后端：Node.js + Express（TypeScript）
- 数据库：SQLite（应用层维护一致性）

```
AzothPath/
├─ backend/               # 后端服务（TS）
│  ├─ src/
│  │  ├─ routes/          # REST 路由
│  │  ├─ services/        # 业务逻辑（含图算法）
│  │  ├─ database/        # 数据库单例与适配
│  │  └─ utils/           # 日志、缓存、限流
│  ├─ database/init.sql   # SQLite 初始化脚本
│  └─ package.json
├─ frontend/              # 前端 SPA（Vue 3）
│  ├─ src/
│  │  ├─ api/             # axios 封装与接口
│  │  ├─ stores/          # Pinia 状态
│  │  └─ views/components # 视图与组件
│  └─ package.json
├─ docs/api/              # 分模块 API 文档
├─ prd.md                 # 产品与技术规格
├─ todo.md                # 开发备忘
└─ build.bat              # 一键打包脚本（Windows）
```


## 开发环境与快速开始

### 先决条件
- Node.js 18+，npm 或 pnpm/yarn
- Windows / macOS / Linux 均可（Windows 提供 `build.bat`）

### 安装依赖

```powershell
# 后端
cd backend
npm i

# 前端
cd ../frontend
npm i
```

### 初始化数据库

```powershell
cd backend
npm run db:init
```

- 数据库默认路径：`backend/database/azothpath.db`

### 启动开发

```powershell
# 后端（端口 19198）
cd backend
npm run dev

# 前端（端口 11451）
cd ../frontend
npm run dev
```

> 提示：开发期已启用热重载
> - 前端：Vite HMR 自动刷新
> - 后端：nodemon 自动重启

> 重要：本仓库在协作模式下常年保持服务常驻。变更代码后请依赖热重载，不要频繁手动重启服务；仅在变更 `.env` 或数据库模式时按需重启/重建。

<details>
<summary>常用命令速查（PowerShell）</summary>

```powershell
# 初始化数据库
cd backend
npm run db:init

# 本地开发
npm run dev            # 后端
cd ../frontend
npm run dev            # 前端

# 生产构建
cd ../frontend
npm run build          # 前端构建
cd ../backend
npm run build          # 后端构建

# Windows 一键打包
cd ..
./build.bat
```

</details>


## 数据库与关键规则

- 不使用外键：一致性由应用层维护（便于灵活演进）
- 配方去重规范：写入前始终保证 `item_a < item_b`（字典序）
- 点赞同步：`recipes.likes`（冗余计数）必须与 `recipe_likes` 明细保持同步
- 自增主键：所有表主键均为 INTEGER 自增；任务/内容关联使用数字 ID

核心表（简要）：
- `recipes`：配方主表（A+B=Result），约束 `UNIQUE(item_a, item_b)` 与 `CHECK (item_a < item_b)`
- `recipe_likes`：配方点赞明细，约束 `UNIQUE(recipe_id, user_id)`
- `items`：物品词典（唯一名、emoji、拼音、是否基础元素）
- `user`：用户（id/name/psw/auth/contribute/level/created_at）
- `task`：悬赏任务（active/completed）、完成记录与奖励
- `import_tasks`：批量导入任务汇总（processing → completed/failed）
- `import_tasks_content`：批量导入任务明细（pending → processing → success/failed/duplicate）

完整 SQL 参考：`backend/database/init.sql`

### 贡献分规则
- 新配方写入成功：+1 分
- 新物品自动收录：每个 +2 分（最多 3 个，共 +6 分）
- 任务奖励：根据任务设定额外加分
- 合计：单次最多 +7 分

示例：
- 全新 A、B、C：配方 +1；三件新物品 +6 → 共 +7
- 仅 C 新：配方 +1；C +2 → 共 +3


## API 文档与类型
- 分模块文档位于 `docs/api/`
  - `docs/api/README.md`（索引）
  - `docs/api/recipes.md`、`items.md`、`imports.md`、`tasks.md`、`users.md`、`system.md`、`tags.md`、`common.md`、`health.md`
- 前后端字段名与数据库字段名完全一致（不做字段映射转换）
- 前端类型定义在 `frontend/src/types/*`，与后端保持一致

后端路由位置：`backend/src/routes/*`
前端请求封装：`frontend/src/api/*`


## 合成路径算法（图算法）
实现位置：`backend/src/services/recipeService.ts`

核心思路：
- 规范化配方（A<=B），建立 item → recipes 映射
- 循环检测（A+A=A、A+B=A/B 等模式），标记循环项
- BFS 可达性分析（从基础材料起），得到可合成集合与有效配方
- 构建合成树（记忆化），支持多路径枚举与排名
- 图分类：孤立/边界/循环/线性
- 统计指标：入/出度、密度、聚类系数、边界节点等

路径接口（示例）：
- `GET /api/recipes/path/:item` → 单条“最简路径”树与统计
- `GET /api/recipes/path/:item?mode=all&limit=100` → 所有路径（分页）
- `GET /api/recipes/graph/stats` → 全局图指标

“最简路径”排序（优先级）：
1) 深度最小 2) 步数最少 3) 基础材料多样性最大 4) 结果字典序稳定

缓存：热门物品路径缓存（TTL 1h），配方更新时失效。


## 构建与部署

### 本地构建

```powershell
# 前端
cd frontend
npm run build

# 后端
cd ../backend
npm run build
```

### 一键打包（Windows）

```powershell
./build.bat
```

产物结构（示意）：
```
dist/
├─ frontend/           # 前端静态文件
├─ backend/            # 后端可运行产物
├─ logs/               # 日志目录
├─ start.sh            # Linux 启动脚本
└─ ecosystem.config.js # PM2 配置
```

### 必要环境变量（后端）
在 `backend/.env` 中配置：

```env
# 必需
JWT_SECRET=your_secure_jwt_secret_key_here

# 可选
DB_PATH=database/azothpath.db
PORT=19198
NODE_ENV=development
```

数据库性能 PRAGMA（默认已开启）：WAL、synchronous=NORMAL、cache_size=-2000、busy_timeout=5000。


## 安全与校验
- 密码：bcrypt 哈希存储于 `user.psw`
- 认证：JWT（Bearer Token），`JWT_SECRET` 必配
- 输入验证：前后端共同校验；仅允许常见安全字符集
- SQL 注入：参数化查询 + 白名单校验
- 默认管理员：生产环境请更改或移除默认账户


## 常见问题与排错
- 服务未响应端口：检查是否在正确目录执行 dev 命令，或端口占用
- 数据库锁竞争：已启用 WAL 与 busy_timeout，仍异常请重试或检查长事务
- 配方重复：确保写入前执行字典序规范化（`item_a < item_b`）
- 点赞不一致：务必在事务内同时更新 `recipes.likes` 与 `recipe_likes`
- 批量导入失败：查看 `import_tasks` 与 `import_tasks_content` 的错误详情与计数


## 贡献与维护
- 变更数据库模式：更新 `backend/database/init.sql` 并执行 `npm run db:init`
- 文档更新：请在不删减历史上下文的前提下增量完善（详见 `/.github/copilot-instructions.md` 指南）
- 性能监控：关注慢查询日志（>100ms）与缓存命中


---

如需更多细节，请查阅：
- `prd.md`（完整产品与技术规格）
- `docs/api/*`（接口说明与示例）
- `backend/src/services/recipeService.ts`（路径搜索与图算法实现）
- `backend/src/database/connection.ts`（数据库单例）
