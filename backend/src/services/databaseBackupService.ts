/**
 * 数据库自动备份服务
 * 
 * 功能：
 * 1. 每2小时执行一次备份
 * 2. 执行 WAL checkpoint（将WAL日志合并到主数据库）
 * 3. 复制数据库文件到备份目录
 * 4. 保留最近N个备份文件
 * 5. 清理过期备份
 */

import fs from 'fs';
import path from 'path';
import { getDatabase } from '../database/connection';
import { logger } from '../utils/logger';

interface BackupConfig {
  enabled: boolean;              // 是否启用自动备份
  intervalHours: number;         // 备份间隔（小时）
  backupDir: string;             // 备份目录
  maxBackups: number;            // 最多保留备份数量
  dbPath: string;                // 数据库文件路径
}

class DatabaseBackupService {
  private config: BackupConfig;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    // 从环境变量读取配置
    const dbPath = process.env.DB_PATH 
      ? path.resolve(path.join(__dirname, '../../'), process.env.DB_PATH)
      : path.resolve(path.join(__dirname, '../../'), 'database/azothpath.db');

    this.config = {
      enabled: process.env.DB_BACKUP_ENABLED !== 'false', // 默认启用
      intervalHours: parseInt(process.env.DB_BACKUP_INTERVAL_HOURS || '2'), // 默认2小时
      backupDir: process.env.DB_BACKUP_DIR 
        ? path.resolve(path.join(__dirname, '../../'), process.env.DB_BACKUP_DIR)
        : path.resolve(path.join(__dirname, '../../'), 'database/backups'),
      maxBackups: parseInt(process.env.DB_BACKUP_MAX_COUNT || '24'), // 默认保留24个备份（2天）
      dbPath
    };

    logger.info('数据库备份服务配置', {
      enabled: this.config.enabled,
      intervalHours: this.config.intervalHours,
      backupDir: this.config.backupDir,
      maxBackups: this.config.maxBackups,
      dbPath: this.config.dbPath
    });
  }

  /**
   * 启动自动备份服务
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('数据库自动备份已禁用');
      return;
    }

    if (this.isRunning) {
      logger.warn('数据库备份服务已在运行');
      return;
    }

    // 确保备份目录存在
    this.ensureBackupDirExists();

    // 立即执行一次备份
    this.performBackup().catch(err => {
      logger.error('首次备份失败', err);
    });

    // 设置定时任务
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    this.timer = setInterval(() => {
      this.performBackup().catch(err => {
        logger.error('定时备份失败', err);
      });
    }, intervalMs);

    this.isRunning = true;
    logger.success(`数据库自动备份服务已启动 (间隔: ${this.config.intervalHours}小时)`);
  }

  /**
   * 停止自动备份服务
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('数据库自动备份服务已停止');
  }

  /**
   * 执行备份
   */
  async performBackup(): Promise<string> {
    logger.info('开始数据库备份...');
    const startTime = Date.now();

    try {
      // 1. 执行 WAL checkpoint
      await this.walCheckpoint();

      // 2. 生成备份文件名（时间戳）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFileName = `azothpath_backup_${timestamp}.db`;
      const backupFilePath = path.join(this.config.backupDir, backupFileName);

      // 3. 复制数据库文件
      await this.copyDatabase(backupFilePath);

      // 4. 清理旧备份
      await this.cleanupOldBackups();

      const duration = Date.now() - startTime;
      logger.success(`数据库备份完成: ${backupFileName} (耗时: ${duration}ms)`);

      return backupFilePath;
    } catch (error) {
      logger.error('数据库备份失败', error);
      throw error;
    }
  }

  /**
   * 执行 WAL checkpoint（将WAL日志合并到主数据库）
   */
  private async walCheckpoint(): Promise<void> {
    logger.debug('执行 WAL checkpoint...');
    
    return new Promise<void>(async (resolve, reject) => {
      try {
        const db = await getDatabase();
        
        // PRAGMA wal_checkpoint(FULL) - 合并WAL
        db.run('PRAGMA wal_checkpoint(FULL)', (err) => {
          if (err) {
            logger.error('WAL checkpoint 失败', err);
            reject(err);
          } else {
            logger.debug('WAL checkpoint 完成');
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 复制数据库文件
   */
  private async copyDatabase(destPath: string): Promise<void> {
    logger.debug(`复制数据库文件: ${this.config.dbPath} -> ${destPath}`);

    return new Promise<void>((resolve, reject) => {
      // 检查源文件是否存在
      if (!fs.existsSync(this.config.dbPath)) {
        reject(new Error(`数据库文件不存在: ${this.config.dbPath}`));
        return;
      }

      // 使用流复制文件（适合大文件）
      const readStream = fs.createReadStream(this.config.dbPath);
      const writeStream = fs.createWriteStream(destPath);

      readStream.on('error', (err) => {
        logger.error('读取数据库文件失败', err);
        reject(err);
      });

      writeStream.on('error', (err) => {
        logger.error('写入备份文件失败', err);
        reject(err);
      });

      writeStream.on('finish', () => {
        logger.debug('数据库文件复制完成');
        resolve();
      });

      readStream.pipe(writeStream);
    });
  }

  /**
   * 清理旧备份（保留最近N个）
   */
  private async cleanupOldBackups(): Promise<void> {
    logger.debug('清理旧备份...');

    try {
      // 读取备份目录中的所有备份文件
      const files = fs.readdirSync(this.config.backupDir)
        .filter(file => file.startsWith('azothpath_backup_') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(this.config.backupDir, file),
          stat: fs.statSync(path.join(this.config.backupDir, file))
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime()); // 按修改时间降序

      // 如果备份数量超过限制，删除最旧的
      if (files.length > this.config.maxBackups) {
        const filesToDelete = files.slice(this.config.maxBackups);
        
        for (const file of filesToDelete) {
          try {
            fs.unlinkSync(file.path);
            logger.debug(`删除旧备份: ${file.name}`);
          } catch (err) {
            logger.warn(`删除备份文件失败: ${file.name}`, err);
          }
        }

        logger.info(`清理旧备份完成 (删除 ${filesToDelete.length} 个文件)`);
      } else {
        logger.debug(`备份数量未超过限制 (${files.length}/${this.config.maxBackups})`);
      }
    } catch (error) {
      logger.error('清理旧备份失败', error);
    }
  }

  /**
   * 确保备份目录存在
   */
  private ensureBackupDirExists(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      logger.info('创建备份目录', { path: this.config.backupDir });
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
  }

  /**
   * 获取所有备份文件列表
   */
  getBackupList(): Array<{ name: string; path: string; size: number; mtime: Date }> {
    this.ensureBackupDirExists();

    try {
      const files = fs.readdirSync(this.config.backupDir)
        .filter(file => file.startsWith('azothpath_backup_') && file.endsWith('.db'))
        .map(file => {
          const filePath = path.join(this.config.backupDir, file);
          const stat = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stat.size,
            mtime: stat.mtime
          };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      return files;
    } catch (error) {
      logger.error('读取备份列表失败', error);
      return [];
    }
  }

  /**
   * 手动触发备份
   */
  async manualBackup(): Promise<string> {
    logger.info('手动触发数据库备份');
    return this.performBackup();
  }

  /**
   * 获取备份服务状态
   */
  getStatus(): {
    enabled: boolean;
    isRunning: boolean;
    config: BackupConfig;
    backupCount: number;
  } {
    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      config: this.config,
      backupCount: this.getBackupList().length
    };
  }
}

// 创建单例实例
export const databaseBackupService = new DatabaseBackupService();
