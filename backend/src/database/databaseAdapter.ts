// 数据库适配器 - 提供向后兼容的接口，同时使用新的异步数据库
import { AsyncDatabase, asyncDatabase } from './asyncDatabase';
import { logger } from '../utils/logger';

export class DatabaseAdapter {
  private asyncDb: AsyncDatabase;
  private initialized = false;

  constructor() {
    this.asyncDb = asyncDatabase;
  }

  async init(): Promise<void> {
    if (!this.initialized) {
      await this.asyncDb.init();
      this.initialized = true;
    }
  }

  // 向后兼容的方法
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await this.init();
    return this.asyncDb.all<T>(sql, params);
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    await this.init();
    return this.asyncDb.get<T>(sql, params);
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    await this.init();
    return this.asyncDb.run(sql, params);
  }

  async transaction<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T> {
    await this.init();
    return this.asyncDb.transaction(async (asyncDb) => {
      // 在事务回调中创建一个新的适配器实例
      const adapterInTransaction = new DatabaseAdapter();
      // 使用同一个asyncDb实例
      (adapterInTransaction as any).asyncDb = asyncDb;
      (adapterInTransaction as any).initialized = true;
      return callback(adapterInTransaction);
    });
  }

  async close(): Promise<void> {
    return this.asyncDb.close();
  }

  // 获取队列状态（用于监控）
  getQueueStatus() {
    return this.asyncDb.getQueueStatus();
  }

  // 设置最大并发查询数
  setMaxConcurrentQueries(max: number) {
    this.asyncDb.setMaxConcurrentQueries(max);
  }
}

// 创建单例实例
export const databaseAdapter = new DatabaseAdapter();

// 导出向后兼容的接口
export default databaseAdapter;