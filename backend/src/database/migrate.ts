import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// 从 backend/src/database/migrate.ts 到项目根目录是 ../../../
const PROJECT_ROOT = path.join(__dirname, '../../../');
const DB_PATH = process.env.DB_PATH 
  ? path.join(PROJECT_ROOT, process.env.DB_PATH)
  : path.join(PROJECT_ROOT, 'database/azothpath.db');

interface MigrationResult {
  success: boolean;
  message: string;
  changes?: string[];
}

/**
 * 检查表是否存在指定的列
 */
async function checkColumnExists(db: sqlite3.Database, table: string, column: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      const exists = rows.some(row => row.name === column);
      resolve(exists);
    });
  });
}

/**
 * 执行 SQL 语句
 */
async function execSQL(db: sqlite3.Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * 迁移数据库到最新版本
 */
async function migrateDatabase(): Promise<MigrationResult> {
  console.log('🔧 Starting database migration...');
  console.log(`📁 Database path: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    return {
      success: false,
      message: 'Database file does not exist. Please run npm run db:init first.'
    };
  }

  const changes: string[] = [];

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, async (err) => {
      if (err) {
        reject({ success: false, message: `Error opening database: ${err.message}` });
        return;
      }

      console.log('✅ Database opened');

      try {
        // Migration 1: Add 'likes' column to recipes table
        const hasLikesColumn = await checkColumnExists(db, 'recipes', 'likes');
        if (!hasLikesColumn) {
          console.log('📝 Adding "likes" column to recipes table...');
          await execSQL(db, 'ALTER TABLE recipes ADD COLUMN likes INTEGER DEFAULT 0');
          await execSQL(db, 'CREATE INDEX IF NOT EXISTS idx_recipes_likes ON recipes(likes DESC)');
          changes.push('Added "likes" column to recipes table');
          console.log('✅ "likes" column added');
        } else {
          console.log('✓ "likes" column already exists');
        }

        // Migration 2: Update existing recipes to sync likes count
        console.log('📝 Syncing likes count from recipe_likes table...');
        await execSQL(db, `
          UPDATE recipes 
          SET likes = (
            SELECT COUNT(*) 
            FROM recipe_likes 
            WHERE recipe_likes.recipe_id = recipes.id
          )
          WHERE EXISTS (SELECT 1 FROM recipe_likes WHERE recipe_likes.recipe_id = recipes.id)
        `);
        changes.push('Synced likes count for existing recipes');
        console.log('✅ Likes count synced');

        // 在这里添加更多的迁移逻辑...

        db.close((err) => {
          if (err) {
            reject({ success: false, message: `Error closing database: ${err.message}` });
          } else {
            console.log('🎉 Migration completed successfully!');
            resolve({
              success: true,
              message: changes.length > 0 
                ? `Applied ${changes.length} migration(s)` 
                : 'Database is already up to date',
              changes
            });
          }
        });
      } catch (error: any) {
        db.close();
        reject({ success: false, message: `Migration failed: ${error.message}` });
      }
    });
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateDatabase()
    .then((result) => {
      console.log('✨', result.message);
      if (result.changes && result.changes.length > 0) {
        console.log('\n📋 Changes applied:');
        result.changes.forEach((change, index) => {
          console.log(`  ${index + 1}. ${change}`);
        });
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Migration failed:', err.message || err);
      process.exit(1);
    });
}

export default migrateDatabase;
