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
| **数据输入** | 支持 $\text{A + B = C}$ 文本格式 和 JSON 格式批量导入。 | 已确认 |
| **过滤** | 通过**外部验证 API** 校验配方有效性。如果配方已存在（去重），**忽略**该条记录，并向用户**提示**。 | 已确认 |
| **数据有效性校验** | 通过**外部验证 API** 校验词条 $\text{A, B, C}$ 是否是游戏中物件。 | 已确认 |
| **新词条收录** | 如果校验发现新的词条（不在 `items` 表中），系统**自动收录**到 `items` 表。 | 已确认 |
| **合并（返回 taskid）** | 批量或单条数据入库为异步操作，返回 $\text{taskid}$ 供查询。 | 已确认 |
| **验证 API 错误处理** | $\text{status } 400$ 或 $\text{status } 403$ 的数据**直接丢弃**。其他失败状态存入**待处理/错误表**。 | 已确认 |
| **taskid 进度查询** | 提供进度、成功/失败条数、失败原因等详细信息。 | 已确认 |
| **存档功能** | 已废弃（`note` 字段不再使用）。 | 已确认 |

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
| `result` | VARCHAR | 合成结果 $\text{C}$ 的名称 | $\text{Foreign Key (items.name)}$ | |
| `user_id` | INT/BIGINT | 贡献者 $\text{ID}$ | $\text{Foreign Key (user.id)}$ | 字段名统一 |
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
| `item_name` | VARCHAR | 悬赏寻找配方的**目标词条名称** | $\text{Foreign Key (items.name)}$ | |
| `prize` | INT | 任务悬赏的贡献点数 | | |
| `status` | VARCHAR | 任务状态 | $\text{Default: active}$ | $\text{active, completed}$ |
| `created_at}$ | DATETIME | 任务创建时间 | | |
| `completed_by_recipe_id` | INT/BIGINT | 完成任务的配方 $\text{ID}$ | $\text{Foreign Key (recipes.id)}$ | |
| `completed_at}$ | DATETIME | 任务完成时间 | | |

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

#### 3.3 贡献榜

* **更新时间：** 采用**定时任务**更新（建议每 $\text{1 小时}$）。
* **维度：** 至少包含总贡献度。**待讨论：** 增加周/月贡献度维度。
