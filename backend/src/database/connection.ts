import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

// 从 backend/src/database/connection.ts 到项目根目录是 ../../../
const PROJECT_ROOT = path.join(__dirname, '../../../');
const DB_PATH = process.env.DB_PATH 
  ? path.join(PROJECT_ROOT, process.env.DB_PATH)
  : path.join(PROJECT_ROOT, 'database/azothpath.db');

console.log('🔍 Database connection debug:');
console.log('  __dirname:', __dirname);
console.log('  PROJECT_ROOT:', PROJECT_ROOT);
console.log('  DB_PATH:', DB_PATH);
console.log('  File exists:', require('fs').existsSync(DB_PATH));

// 创建数据库连接
let db: sqlite3.Database | null = null;

export function getDatabase(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        throw err;
      }
      console.log('✅ Database connected');
    });

    // 启用外键约束（虽然我们的表没有定义外键，但这是最佳实践）
    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
}

// Promise 化的数据库方法
export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = getDatabase();
  }

  // 执行查询（返回所有结果）
  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  // 执行查询（返回单个结果）
  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  // 执行修改操作（INSERT, UPDATE, DELETE）
  run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  // 执行事务
  async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  // 关闭数据库连接
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    });
  }
}

// 导出单例实例
export const database = new Database();
