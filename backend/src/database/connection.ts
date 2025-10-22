// better-sqlite3 使用 CommonJS 导出，使用 require() 保证兼容性
const BetterSqlite3: any = require('better-sqlite3');
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';

// 数据库路径配置 - 默认使用 backend 目录下的 database 文件夹
const DB_PATH = process.env.DB_PATH 
  ? path.resolve(path.join(__dirname, '../../'), process.env.DB_PATH)
  : path.resolve(path.join(__dirname, '../../'), 'database/azothpath.db');

const INIT_SQL_PATH = path.resolve(path.join(__dirname, '../../'), 'database/init.sql');

// 慢查询阈值（毫秒），默认 100ms，可通过环境变量覆盖
const SLOW_QUERY_MS = (() => {
  const v = parseInt(process.env.SLOW_QUERY_MS || '100', 10);
  return Number.isFinite(v) && v > 0 ? v : 100;
})();

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

// 创建数据库连接（better-sqlite3 实例）
let db: any | null = null;

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
    try {
      // 使用 better-sqlite3 以同步方式打开并执行 initSQL
      const tempDb = new BetterSqlite3(DB_PATH, { readonly: false, fileMustExist: false });

      // 设置PRAGMA
      try {
        tempDb.pragma('busy_timeout = 10000');
      } catch (err) {
        logger.warn('设置 busy_timeout 失败', err);
      }

      try {
        tempDb.exec(initSQL);
        logger.success('数据库表创建成功');
      } catch (err) {
        logger.error('执行初始化SQL失败', err);
        tempDb.close();
        reject(err);
        return;
      }

      try {
        tempDb.close();
      } catch (err) {
        logger.warn('关闭临时数据库失败', err);
      }

      logger.success('数据库初始化完成!');
      resolve();
    } catch (err) {
      logger.error('初始化数据库时发生错误', err);
      reject(err);
    }
  });
}

export async function getDatabase(): Promise<any> {
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

    try {
      db = new BetterSqlite3(DB_PATH, { readonly: false });
      logger.success('数据库连接成功');
    } catch (err) {
      logger.error('数据库连接失败', err);
      throw err;
    }

    // 设置PRAGMA
    try {
      db.pragma('foreign_keys = ON');
      db.pragma('journal_mode = WAL');
      db.pragma('synchronous = NORMAL');
      db.pragma('cache_size = -2000');
      db.pragma('busy_timeout = 5000');
    } catch (err) {
      logger.warn('设置 PRAGMA 出现问题', err);
    }
  }
  return db;
}

// 导出初始化函数供外部使用
export { initDatabase };

// Promise 化的数据库方法
export class Database {
  private db: any | null = null;
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

  private ensureInitialized(): any {
    if (!this.db || !this.initialized) {
      throw new Error('数据库未初始化，请先调用 init() 方法');
    }
    return this.db;
  }

  // 执行查询（返回所有结果）
  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const db = this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      try {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...params);
        const duration = Date.now() - startTime;

        // 数据库级别日志（仅记录慢查询和错误）
        if (duration > SLOW_QUERY_MS) {
          logger.database('SQL查询', {
            kind: 'all',
            sql,
            params,
            duration,
            rowCount: Array.isArray(rows) ? rows.length : undefined
          });
        }

        // 慢查询单独告警
        if (duration > SLOW_QUERY_MS) {
          logger.warn(`慢查询 (${duration}ms)`, { sql, params, duration });
        }

        resolve(rows as T[]);
      } catch (err: any) {
        const duration = Date.now() - startTime;
        logger.error('SQL查询失败', { 
          kind: 'all',
          sql, 
          params, 
          duration, 
          error: err?.message,
          code: err?.code,
          errno: err?.errno
        });
        reject(err);
      }
    });
  }

  // 执行查询（返回单个结果）
  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const db = this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      try {
        const stmt = db.prepare(sql);
        const row = stmt.get(...params);
        const duration = Date.now() - startTime;

        // 仅记录慢查询
        if (duration > SLOW_QUERY_MS) {
          logger.database('SQL查询', {
            kind: 'get',
            sql,
            params,
            duration,
            found: row ? 1 : 0
          });
        }

        if (duration > SLOW_QUERY_MS) {
          logger.warn(`慢查询 (${duration}ms)`, { sql, params, duration });
        }

        resolve(row as T | undefined);
      } catch (err: any) {
        const duration = Date.now() - startTime;
        logger.error('SQL查询失败', { 
          kind: 'get',
          sql, 
          params, 
          duration, 
          error: err?.message,
          code: err?.code,
          errno: err?.errno
        });
        reject(err);
      }
    });
  }

  // 执行修改操作（INSERT, UPDATE, DELETE）
  run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    const db = this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      try {
        const stmt = db.prepare(sql);
        const info = stmt.run(...params);
        const duration = Date.now() - startTime;

        // 仅记录慢写入
        if (duration > SLOW_QUERY_MS) {
          logger.database('SQL写入', {
            kind: 'run',
            sql,
            params,
            duration,
            changes: info.changes,
            lastID: Number(info.lastInsertRowid)
          });
        }

        if (duration > SLOW_QUERY_MS) {
          logger.warn(`慢写入 (${duration}ms)`, { sql, params, duration });
        }

        resolve({ lastID: info.lastInsertRowid as number, changes: info.changes });
      } catch (err: any) {
        const duration = Date.now() - startTime;
        logger.error('SQL写入失败', { 
          kind: 'run',
          sql, 
          params, 
          duration, 
          error: err?.message,
          code: err?.code,
          errno: err?.errno
        });
        reject(err);
      }
    });
  }

  // 执行事务
  async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    // better-sqlite3 supports transaction APIs; use explicit BEGIN/COMMIT to remain compatible
    const txnStart = Date.now();
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      await this.run('COMMIT');
      const txnDuration = Date.now() - txnStart;
      logger.database('事务提交', { duration: txnDuration, success: true });
      if (txnDuration > SLOW_QUERY_MS) {
        logger.warn(`慢事务 (${txnDuration}ms)`, { duration: txnDuration });
      }
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      const txnDuration = Date.now() - txnStart;
      logger.error('事务回滚', { duration: txnDuration, error: (error as any)?.message });
      throw error;
    }
  }

  // 关闭数据库连接
  close(): Promise<void> {
    const database = this.ensureInitialized();
    return new Promise((resolve, reject) => {
      try {
        database.close();
        this.db = null;
        this.initialized = false;
        resolve();
      } catch (err) {
        reject(err);
      }
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
