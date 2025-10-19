-- Azoth Path 数据库初始化脚本
-- SQLite 版本

-- 启用 WAL 模式
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -2000;
PRAGMA busy_timeout = 5000;

-- ====================================
-- 1. recipes 表 (合成配方)
-- ====================================
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_a TEXT NOT NULL,
  item_b TEXT NOT NULL,
  result TEXT NOT NULL,
  user_id INTEGER NOT NULL,  -- 关联 user.id（应用层管理）
  likes INTEGER DEFAULT 0,  -- 点赞数（冗余字段，提高查询性能）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_a, item_b),
  CHECK (item_a <= item_b)  -- 确保字典序 item_a <= item_b，允许相同材料
);

-- 基础索引
CREATE INDEX IF NOT EXISTS idx_recipes_result ON recipes(result);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_likes ON recipes(likes DESC);

-- ====================================
-- 2. items 表 (物品词典)
-- ====================================
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  emoji TEXT,
  pinyin TEXT,
  is_base INTEGER DEFAULT 0,  -- 0=false, 1=true
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_pinyin ON items(pinyin);

-- 插入基础材料
INSERT OR IGNORE INTO items (name, emoji, is_base) VALUES 
  ('金', '🪙', 1),
  ('木', '🪵', 1),
  ('水', '💧', 1),
  ('火', '🔥', 1),
  ('土', '🌍', 1);

-- ====================================
-- 3. user 表 (用户)
-- ====================================
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  psw TEXT NOT NULL,  -- bcrypt hash
  auth INTEGER DEFAULT 1,  -- 1=普通用户, 9=管理员
  contribute INTEGER DEFAULT 0,  -- 累积贡献分
  level INTEGER DEFAULT 1,  -- 用户等级
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_name ON user(name);
CREATE INDEX IF NOT EXISTS idx_user_contribute ON user(contribute DESC);

-- 创建默认管理员账号 (密码: admin123)
INSERT OR IGNORE INTO user (name, psw, auth) VALUES 
  ('admin', '$2a$10$LEIwAh14C0yGzPcXtSRKlOiv.CGuhoXz1M9n0Xajp7qyJ7B0H0eay', 9);

-- ====================================
-- 4. task 表 (悬赏任务)
-- ====================================
CREATE TABLE IF NOT EXISTS task (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,  -- 关联 items.name（应用层管理）
  prize INTEGER NOT NULL,
  status TEXT DEFAULT 'active',  -- active, completed
  task_type TEXT DEFAULT 'find_recipe',  -- find_recipe: 寻找配方, find_more_recipes: 寻找更多配方
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INTEGER NOT NULL,  -- 关联 user.id（应用层管理）
  completed_by_recipe_id INTEGER,  -- 关联 recipes.id（应用层管理）
  completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_task_status ON task(status);
CREATE INDEX IF NOT EXISTS idx_task_item_name ON task(item_name);
CREATE INDEX IF NOT EXISTS idx_task_task_type ON task(task_type);
CREATE INDEX IF NOT EXISTS idx_task_created_by_user_id ON task(created_by_user_id);

-- ====================================
-- 5. import_tasks 表 (批量导入任务汇总)
-- ====================================
CREATE TABLE IF NOT EXISTS import_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,  -- 关联 user.id（应用层管理）
  total_count INTEGER NOT NULL,  -- 总数
  success_count INTEGER DEFAULT 0,  -- 成功数
  failed_count INTEGER DEFAULT 0,  -- 失败数
  duplicate_count INTEGER DEFAULT 0,  -- 重复数
  status TEXT DEFAULT 'processing',  -- processing/completed/failed
  error_details TEXT,  -- 错误详情（JSON）
  notification_deleted INTEGER DEFAULT 0,  -- 通知是否被用户删除 (0=未删除, 1=已删除)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_tasks_user_id ON import_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_import_tasks_status ON import_tasks(status);
CREATE INDEX IF NOT EXISTS idx_import_tasks_created_at ON import_tasks(created_at);

-- ====================================
-- 6. import_tasks_content 表 (批量导入任务明细)
-- ====================================
CREATE TABLE IF NOT EXISTS import_tasks_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,  -- 关联 import_tasks.id
  item_a TEXT NOT NULL,
  item_b TEXT NOT NULL,
  result TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending/processing/success/failed/duplicate
  retry_count INTEGER DEFAULT 0,  -- 重试次数
  error_message TEXT,  -- 错误信息
  recipe_id INTEGER,  -- 关联 recipes.id（应用层管理）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_tasks_content_task_id ON import_tasks_content(task_id);
CREATE INDEX IF NOT EXISTS idx_import_tasks_content_status ON import_tasks_content(status);

-- ====================================
-- 性能优化索引（针对上万条数据优化）
-- ====================================

-- 复合索引优化搜索和排序
CREATE INDEX IF NOT EXISTS idx_recipes_search ON recipes(item_a, item_b, result);
CREATE INDEX IF NOT EXISTS idx_recipes_result_created ON recipes(result, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_result_likes ON recipes(result, likes DESC);

-- 覆盖索引优化（避免回表查询）
CREATE INDEX IF NOT EXISTS idx_recipes_cover ON recipes(id, created_at, likes, user_id);

-- ====================================
-- 7. recipe_likes 表 (配方点赞记录)
-- ====================================
CREATE TABLE IF NOT EXISTS recipe_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,  -- 关联 recipes.id（应用层管理）
  user_id INTEGER NOT NULL,  -- 关联 user.id（应用层管理）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recipe_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_likes_recipe_id ON recipe_likes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_likes_user_id ON recipe_likes(user_id);

-- ====================================
-- 初始化完成
-- ====================================
SELECT 'Database initialized successfully!' AS message;
