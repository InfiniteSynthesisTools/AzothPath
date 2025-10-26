// 异步数据库连接层 - 使用队列机制避免阻塞
import { EventEmitter } from 'events';

// better-sqlite3 使用 CommonJS 导出，使用 require() 保证兼容性
const BetterSqlite3: any = require('better-sqlite3');
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

interface QueryJob {
  sql: string;
  params: any[];
  resolve: (value: any) => void;
  reject: (error: any) => void;
  type: 'all' | 'get' | 'run';
}

export class AsyncDatabase extends EventEmitter {
  private db: any | null = null;
  private queue: QueryJob[] = [];
  private isProcessing = false;
  private maxConcurrentQueries = 3; // 限制并发查询数
  private activeQueries = 0;
  private dbPath: string;
  private initialized = false;

  constructor(dbPath?: string) {
    super();
    // 使用与connection.ts相同的数据库路径配置
    this.dbPath = dbPath || (process.env.DB_PATH 
      ? path.resolve(path.join(__dirname, '../../'), process.env.DB_PATH)
      : path.resolve(path.join(__dirname, '../../'), 'database/azothpath.db'));
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    // 确保数据库目录存在
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 检查数据库文件是否存在，如果不存在则执行初始化SQL
    const dbExists = fs.existsSync(this.dbPath);
    const initSqlPath = path.resolve(path.join(__dirname, '../../'), 'database/init.sql');

    try {
      this.db = new BetterSqlite3(this.dbPath, { readonly: false });
      
      // 如果数据库文件不存在，执行初始化SQL
      if (!dbExists && fs.existsSync(initSqlPath)) {
        logger.info('数据库文件不存在，执行初始化SQL...');
        const initSQL = fs.readFileSync(initSqlPath, 'utf8');
        this.db.exec(initSQL);
        logger.success('数据库表创建成功');
      }
      
      // 设置PRAGMA - 优化并发性能和连接池
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = -16000'); // 16MB缓存
      this.db.pragma('busy_timeout = 30000'); // 30秒
      this.db.pragma('wal_autocheckpoint = 1000');
      this.db.pragma('journal_size_limit = 16777216'); // 16MB WAL文件限制
      this.db.pragma('temp_store = memory');
      this.db.pragma('page_size = 4096');
      this.db.pragma('mmap_size = 67108864'); // 64MB内存映射
      this.db.pragma('locking_mode = NORMAL');
      this.db.pragma('optimize');
      
      this.initialized = true;
      logger.success('异步数据库连接成功');
    } catch (err) {
      logger.error('异步数据库连接失败', err);
      throw err;
    }
  }

  private ensureInitialized(): any {
    if (!this.db || !this.initialized) {
      throw new Error('数据库未初始化，请先调用 init() 方法');
    }
    return this.db;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || this.activeQueries >= this.maxConcurrentQueries) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.queue.length > 0 && this.activeQueries < this.maxConcurrentQueries) {
      const job = this.queue.shift();
      if (!job) continue;
      
      this.activeQueries++;
      
      // 使用setImmediate让出事件循环，避免阻塞
      setImmediate(() => {
        const db = this.ensureInitialized();
        const startTime = Date.now();
        
        try {
          switch (job.type) {
            case 'all': {
              const stmt = db.prepare(job.sql);
              const rows = stmt.all(...job.params);
              const duration = Date.now() - startTime;
              
              // 记录慢查询
              if (duration > 100) {
                logger.warn(`慢查询 (${duration}ms): ${job.sql}`);
              }
              
              job.resolve(rows);
              break;
            }
            case 'get': {
              const stmt = db.prepare(job.sql);
              const row = stmt.get(...job.params);
              const duration = Date.now() - startTime;
              
              if (duration > 100) {
                logger.warn(`慢查询 (${duration}ms): ${job.sql}`);
              }
              
              job.resolve(row);
              break;
            }
            case 'run': {
              const stmt = db.prepare(job.sql);
              const info = stmt.run(...job.params);
              const duration = Date.now() - startTime;
              
              if (duration > 100) {
                logger.warn(`慢写入 (${duration}ms): ${job.sql}`);
              }
              
              job.resolve({ 
                lastID: info.lastInsertRowid as number, 
                changes: info.changes 
              });
              break;
            }
          }
        } catch (error) {
          logger.error('SQL执行失败', { 
            sql: job.sql, 
            params: job.params, 
            error: (error as any)?.message 
          });
          job.reject(error);
        } finally {
          this.activeQueries--;
          
          // 继续处理队列
          setImmediate(() => {
            this.isProcessing = false;
            this.processQueue();
          });
        }
      });
    }
    
    this.isProcessing = false;
  }

  // 异步执行查询（返回多个结果）
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        sql,
        params,
        resolve,
        reject,
        type: 'all'
      });
      this.processQueue();
    });
  }

  // 异步执行查询（返回单个结果）
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        sql,
        params,
        resolve,
        reject,
        type: 'get'
      });
      this.processQueue();
    });
  }

  // 异步执行修改操作
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        sql,
        params,
        resolve,
        reject,
        type: 'run'
      });
      this.processQueue();
    });
  }

  // 执行事务
  async transaction<T>(callback: (db: AsyncDatabase) => Promise<T>): Promise<T> {
    const txnStart = Date.now();
    
    // 使用 better-sqlite3 原生事务 API
    const transaction = this.db.transaction(() => {
      return callback(this);
    });
    
    try {
      const result = await transaction();
      const txnDuration = Date.now() - txnStart;
      logger.database('事务提交', { duration: txnDuration, success: true });
      if (txnDuration > 100) {
        logger.warn(`慢事务 (${txnDuration}ms)`, { duration: txnDuration });
      }
      return result;
    } catch (error) {
      const txnDuration = Date.now() - txnStart;
      logger.error('事务失败', { duration: txnDuration, error: (error as any)?.message });
      throw error;
    }
  }

  // 设置最大并发查询数
  setMaxConcurrentQueries(max: number) {
    this.maxConcurrentQueries = max;
  }

  // 获取队列状态
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      activeQueries: this.activeQueries,
      maxConcurrentQueries: this.maxConcurrentQueries
    };
  }

  // 关闭数据库连接
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.db) {
          this.db.close();
          this.db = null;
          this.initialized = false;
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }
}

// 创建单例实例
const asyncDatabase = new AsyncDatabase();

export { asyncDatabase };