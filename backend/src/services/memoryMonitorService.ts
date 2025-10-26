import { logger } from '../utils/logger';
import os from 'os';
import process from 'process';

/**
 * 内存监控服务 - 监控Node.js内存使用情况，防止内存溢出
 */
export class MemoryMonitorService {
  private static instance: MemoryMonitorService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private memoryThreshold: number;
  private checkInterval: number;
  private gcEnabled: boolean;

  // 内存使用历史记录
  private memoryHistory: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    systemMemory: number;
  }> = [];

  private constructor() {
    // 默认内存阈值：1.5GB
    this.memoryThreshold = parseInt(process.env.MEMORY_THRESHOLD || '1572864000'); // 1.5GB in bytes
    // 默认检查间隔：30秒
    this.checkInterval = parseInt(process.env.MEMORY_CHECK_INTERVAL || '30000');
    // 是否启用GC
    this.gcEnabled = process.env.ENABLE_GC === 'true';
  }

  public static getInstance(): MemoryMonitorService {
    if (!MemoryMonitorService.instance) {
      MemoryMonitorService.instance = new MemoryMonitorService();
    }
    return MemoryMonitorService.instance;
  }

  /**
   * 启动内存监控
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      logger.warn('内存监控已在运行中');
      return;
    }

    logger.info(`启动内存监控 - 阈值: ${this.formatBytes(this.memoryThreshold)}, 检查间隔: ${this.checkInterval}ms`);
    
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkInterval);

    // 立即执行一次检查
    this.checkMemoryUsage();
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('内存监控已停止');
    }
  }

  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const systemMemory = os.freemem();
    const totalSystemMemory = os.totalmem();

    // 记录内存使用情况
    this.memoryHistory.push({
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      systemMemory
    });

    // 保持最近100条记录
    if (this.memoryHistory.length > 100) {
      this.memoryHistory = this.memoryHistory.slice(-100);
    }

    // 检查内存阈值
    if (memoryUsage.heapUsed > this.memoryThreshold) {
      this.handleMemoryWarning(memoryUsage);
    }

    // 定期记录内存使用情况（每10次检查记录一次）
    if (this.memoryHistory.length % 10 === 0) {
      this.logMemoryStats(memoryUsage, systemMemory, totalSystemMemory);
    }
  }

  /**
   * 处理内存警告
   */
  private handleMemoryWarning(memoryUsage: NodeJS.MemoryUsage): void {
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const thresholdMB = Math.round(this.memoryThreshold / 1024 / 1024);
    
    logger.warn(`内存使用警告: ${heapUsedMB}MB > ${thresholdMB}MB`);
    
    // 尝试强制垃圾回收
    if (this.gcEnabled && global.gc) {
      try {
        global.gc();
        logger.info('已执行强制垃圾回收');
      } catch (error) {
        logger.error('强制垃圾回收失败:', error);
      }
    }

    // 记录详细内存信息
    this.logDetailedMemoryInfo(memoryUsage);

    // 如果内存使用持续过高，可能需要采取更激进的措施
    if (memoryUsage.heapUsed > this.memoryThreshold * 1.2) {
      this.handleCriticalMemory(memoryUsage);
    }
  }

  /**
   * 处理严重内存问题
   */
  private handleCriticalMemory(memoryUsage: NodeJS.MemoryUsage): void {
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    logger.error(`严重内存问题: ${heapUsedMB}MB，接近内存限制`);
    
    // 记录堆栈跟踪以帮助调试
    const stackTrace = new Error().stack;
    logger.error('当前堆栈跟踪:', stackTrace);

    // 可以在这里添加更激进的清理措施
    // 例如：清除缓存、重启服务等
  }

  /**
   * 记录内存统计信息
   */
  private logMemoryStats(memoryUsage: NodeJS.MemoryUsage, freeMemory: number, totalMemory: number): void {
    const stats = {
      heapUsed: this.formatBytes(memoryUsage.heapUsed),
      heapTotal: this.formatBytes(memoryUsage.heapTotal),
      external: this.formatBytes(memoryUsage.external),
      rss: this.formatBytes(memoryUsage.rss),
      systemFree: this.formatBytes(freeMemory),
      systemTotal: this.formatBytes(totalMemory),
      systemUsage: Math.round((1 - freeMemory / totalMemory) * 100) + '%',
      uptime: Math.round(process.uptime()) + 's'
    };

    logger.debug('内存使用统计:', stats);
  }

  /**
   * 记录详细内存信息
   */
  private logDetailedMemoryInfo(memoryUsage: NodeJS.MemoryUsage): void {
    const details = {
      heapUsed: this.formatBytes(memoryUsage.heapUsed),
      heapTotal: this.formatBytes(memoryUsage.heapTotal),
      external: this.formatBytes(memoryUsage.external),
      rss: this.formatBytes(memoryUsage.rss),
      heapUsedPercentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) + '%',
      threshold: this.formatBytes(this.memoryThreshold),
      historySize: this.memoryHistory.length
    };

    logger.warn('详细内存信息:', details);
  }

  /**
   * 获取内存使用统计
   */
  getMemoryStats(): {
    current: {
      heapUsed: string;
      heapTotal: string;
      external: string;
      rss: string;
      heapUsedPercentage: string;
    };
    system: {
      free: string;
      total: string;
      usage: string;
    };
    history: Array<{
      timestamp: number;
      heapUsed: string;
      heapTotal: string;
      external: string;
      rss: string;
    }>;
    threshold: string;
    uptime: string;
  } {
    const memoryUsage = process.memoryUsage();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();

    return {
      current: {
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        external: this.formatBytes(memoryUsage.external),
        rss: this.formatBytes(memoryUsage.rss),
        heapUsedPercentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) + '%'
      },
      system: {
        free: this.formatBytes(freeMemory),
        total: this.formatBytes(totalMemory),
        usage: Math.round((1 - freeMemory / totalMemory) * 100) + '%'
      },
      history: this.memoryHistory.slice(-20).map(record => ({
        timestamp: record.timestamp,
        heapUsed: this.formatBytes(record.heapUsed),
        heapTotal: this.formatBytes(record.heapTotal),
        external: this.formatBytes(record.external),
        rss: this.formatBytes(record.rss)
      })),
      threshold: this.formatBytes(this.memoryThreshold),
      uptime: Math.round(process.uptime()) + 's'
    };
  }

  /**
   * 设置内存阈值
   */
  setMemoryThreshold(thresholdBytes: number): void {
    this.memoryThreshold = thresholdBytes;
    logger.info(`内存阈值已更新为: ${this.formatBytes(thresholdBytes)}`);
  }

  /**
   * 设置检查间隔
   */
  setCheckInterval(intervalMs: number): void {
    this.checkInterval = intervalMs;
    if (this.monitoringInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
    logger.info(`内存检查间隔已更新为: ${intervalMs}ms`);
  }

  /**
   * 格式化字节数为可读格式
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 强制垃圾回收（如果可用）
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      try {
        global.gc();
        logger.info('手动触发垃圾回收成功');
      } catch (error) {
        logger.error('手动垃圾回收失败:', error);
      }
    } else {
      logger.warn('垃圾回收不可用，请使用 --expose-gc 启动Node.js');
    }
  }

  /**
   * 清理内存历史记录
   */
  clearMemoryHistory(): void {
    this.memoryHistory = [];
    logger.info('内存历史记录已清除');
  }
}