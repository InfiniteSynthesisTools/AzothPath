import { Database } from 'better-sqlite3';
import { EventEmitter } from 'events';

interface QueryJob {
  sql: string;
  params: any[];
  resolve: (value: any) => void;
  reject: (error: any) => void;
  type: 'all' | 'get' | 'run';
}

export class AsyncDatabase extends EventEmitter {
  private db: Database;
  private queue: QueryJob[] = [];
  private isProcessing = false;
  private maxConcurrentQueries = 5;
  private activeQueries = 0;
  
  constructor(db: Database) {
    super();
    this.db = db;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0 && this.activeQueries < this.maxConcurrentQueries) {
      const job = this.queue.shift();
      if (!job) continue;
      
      this.activeQueries++;
      
      // 使用setImmediate让出事件循环，避免阻塞
      setImmediate(() => {
        try {
          const startTime = Date.now();
          
          switch (job.type) {
            case 'all': {
              const stmt = this.db.prepare(job.sql);
              const rows = stmt.all(...job.params);
              const duration = Date.now() - startTime;
              
              // 记录慢查询
              if (duration > 100) { // 100ms 视为慢查询
                console.warn(`慢查询 (${duration}ms): ${job.sql}`);
              }
              
              job.resolve(rows);
              break;
            }
            case 'get': {
              const stmt = this.db.prepare(job.sql);
              const row = stmt.get(...job.params);
              const duration = Date.now() - startTime;
              
              if (duration > 100) {
                console.warn(`慢查询 (${duration}ms): ${job.sql}`);
              }
              
              job.resolve(row);
              break;
            }
            case 'run': {
              const stmt = this.db.prepare(job.sql);
              const info = stmt.run(...job.params);
              const duration = Date.now() - startTime;
              
              if (duration > 100) {
                console.warn(`慢写入 (${duration}ms): ${job.sql}`);
              }
              
              job.resolve({ 
                lastID: info.lastInsertRowid as number, 
                changes: info.changes 
              });
              break;
            }
          }
        } catch (error) {
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
  close() {
    this.db.close();
  }
}