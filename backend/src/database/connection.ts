import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

// 数据库路径配置 - 默认使用项目根目录下的 database 文件夹
const DB_PATH = process.env.DB_PATH 
  ? path.resolve(path.join(__dirname, '../../'), process.env.DB_PATH)
  : path.resolve(path.join(__dirname, '../../../'), 'database/azothpath.db');

const INIT_SQL_PATH = path.resolve(path.join(__dirname, '../../../'), 'database/init.sql');

// 确保数据库目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  logger.info('创建数据库目录', { path: dbDir });
  fs.mkdirSync(dbDir, { recursive: true });
}

// 检查数据库文件是否存在
const dbExists = fs.existsSync(DB_PATH);
if (!dbExists) {
  logger.info('数据库文件不存在，将在首次连接时自动初始化');
}

logger.database(`数据库已配置 - ${dbExists ? '文件存在' : '文件不存在，将自动创建'}`);

// 创建数据库连接
let db: sqlite3.Database | null = null;

/**
 * 初始化数据库
 */
async function initDatabase(force: boolean = false): Promise<void> {
  logger.info('开始初始化数据库...');
  
  // 如果强制重建，删除旧数据库和相关文件
  if (force && fs.existsSync(DB_PATH)) {
    logger.warn('强制模式: 删除现有数据库...');
    
    // 删除所有相关文件
    const filesToDelete = [
      DB_PATH,
      DB_PATH + '-wal',
      DB_PATH + '-shm'
    ];
    
    filesToDelete.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          logger.debug(`删除文件: ${file}`);
        } catch (err) {
          logger.warn(`删除文件失败: ${file}`, err);
        }
      }
    });
    
    logger.success('旧数据库已删除');
  }

  // 读取初始化SQL
  const initSQL = fs.readFileSync(INIT_SQL_PATH, 'utf8');

  return new Promise<void>((resolve, reject) => {
    // 使用更长的超时时间和重试机制
    const tempDb = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        logger.error('数据库文件打开失败', err);
        reject(err);
        return;
      }

      logger.success('数据库文件已打开');

      // 设置数据库参数
      tempDb.run('PRAGMA busy_timeout = 10000', (err) => {
        if (err) {
          logger.warn('设置busy_timeout失败', err);
        }
      });

      // 执行初始化SQL
      tempDb.exec(initSQL, (err) => {
        if (err) {
          logger.error('执行初始化SQL失败', err);
          tempDb.close();
          reject(err);
          return;
        }

        logger.success('数据库表创建成功');

        tempDb.close((err) => {
          if (err) {
            logger.error('关闭数据库失败', err);
            reject(err);
          } else {
            logger.success('数据库初始化完成!');
            resolve();
          }
        });
      });
    });
  });
}

export async function getDatabase(): Promise<sqlite3.Database> {
  if (!db) {
    // 如果数据库文件不存在，先进行初始化
    if (!fs.existsSync(DB_PATH)) {
      logger.info('数据库文件不存在，开始自动初始化...');
      try {
        await initDatabase();
        logger.success('数据库初始化完成');
      } catch (error) {
        logger.error('数据库初始化失败', error);
        throw error;
      }
    }

    db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        logger.error('数据库连接失败', err);
        throw err;
      }
      logger.success('数据库连接成功');
    });

    // 配置数据库参数
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA synchronous = NORMAL');
    db.run('PRAGMA cache_size = -2000');
    db.run('PRAGMA busy_timeout = 5000');
  }
  return db;
}

// 导出初始化函数供外部使用
export { initDatabase };

// Promise 化的数据库方法
export class Database {
  private db: sqlite3.Database | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (!this.initialized) {
      // 直接使用全局数据库连接，避免重复初始化
      if (!db) {
        await getDatabase();
      }
      this.db = db;
      this.initialized = true;
    }
  }

  private ensureInitialized(): sqlite3.Database {
    if (!this.db || !this.initialized) {
      throw new Error('数据库未初始化，请先调用 init() 方法');
    }
    return this.db;
  }

  // 执行查询（返回所有结果）
  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const db = this.ensureInitialized();
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  // 执行查询（返回单个结果）
  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const db = this.ensureInitialized();
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  // 执行修改操作（INSERT, UPDATE, DELETE）
  run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    const db = this.ensureInitialized();
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
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
    const database = this.ensureInitialized();
    return new Promise((resolve, reject) => {
      database.close((err) => {
        if (err) reject(err);
        else {
          this.db = null;
          this.initialized = false;
          resolve();
        }
      });
    });
  }
}

// 创建单例实例
const database = new Database();

export { database };

// 如果直接运行此脚本
if (require.main === module) {
  // 检查命令行参数
  const forceMode = process.argv.includes('--force') || process.argv.includes('-f');
  
  if (forceMode) {
    logger.warn('强制模式已启用 - 现有数据库将被删除!');
  }
  
  initDatabase(forceMode)
    .then(() => {
      logger.success('所有操作完成!');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('初始化失败', err);
      process.exit(1);
    });
}
