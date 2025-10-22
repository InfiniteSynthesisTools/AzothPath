import { logger } from '../utils/logger';

/**
 * 内存优化服务
 * 针对大数据量场景优化内存使用和垃圾回收策略
 */
export class MemoryOptimizationService {
  private memoryStats: MemoryStats[] = [];
  private optimizationEnabled = false;
  
  // 内存优化配置
  private readonly MEMORY_CHECK_INTERVAL = 60000; // 内存检查间隔（1分钟）
  private readonly HIGH_MEMORY_THRESHOLD = 0.8; // 高内存使用阈值（80%）
  private readonly CRITICAL_MEMORY_THRESHOLD = 0.9; // 临界内存使用阈值（90%）
  private readonly GC_TRIGGER_THRESHOLD = 0.7; // 垃圾回收触发阈值（70%）
  
  constructor() {
    // 检查是否支持内存监控
    if (this.supportsMemoryMonitoring()) {
      this.startMemoryMonitoring();
      this.optimizationEnabled = true;
      logger.info('内存优化服务已启用');
    } else {
      logger.warn('当前环境不支持内存监控，内存优化服务已禁用');
    }
  }
  
  /**
   * 检查是否支持内存监控
   */
  private supportsMemoryMonitoring(): boolean {
    return typeof process !== 'undefined' && 
           process.memoryUsage && 
           typeof process.memoryUsage === 'function';
  }
  
  /**
   * 启动内存监控
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.checkMemoryUsage();
    }, this.MEMORY_CHECK_INTERVAL);
  }
  
  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    if (!this.optimizationEnabled) return;
    
    const memoryUsage = process.memoryUsage();
    const totalMemory = this.getTotalMemory();
    const usedMemory = memoryUsage.heapUsed / 1024 / 1024; // MB
    const totalMemoryMB = totalMemory / 1024 / 1024; // MB
    const memoryRatio = usedMemory / totalMemoryMB;
    
    // 记录内存统计
    const memoryStat: MemoryStats = {
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      memoryRatio,
      usedMemoryMB: usedMemory,
      totalMemoryMB: totalMemoryMB
    };
    
    this.memoryStats.push(memoryStat);
    
    // 清理过期记录（保留最近100条）
    if (this.memoryStats.length > 100) {
      this.memoryStats = this.memoryStats.slice(-100);
    }
    
    // 检查内存使用情况并触发优化
    this.triggerMemoryOptimizations(memoryStat);
  }
  
  /**
   * 获取总内存大小
   */
  private getTotalMemory(): number {
    if (typeof process !== 'undefined' && process.config) {
      // 尝试从系统配置获取内存限制
      const maxOldSpaceSize = process.env.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1];
      if (maxOldSpaceSize) {
        return parseInt(maxOldSpaceSize) * 1024 * 1024; // MB to bytes
      }
    }
    
    // 默认返回系统总内存的估算值
    return 4 * 1024 * 1024 * 1024; // 4GB
  }
  
  /**
   * 触发内存优化策略
   */
  private triggerMemoryOptimizations(memoryStat: MemoryStats): void {
    if (memoryStat.memoryRatio >= this.CRITICAL_MEMORY_THRESHOLD) {
      logger.warn(`内存使用临界（${(memoryStat.memoryRatio * 100).toFixed(1)}%），触发紧急优化`);
      this.emergencyMemoryCleanup();
    } else if (memoryStat.memoryRatio >= this.HIGH_MEMORY_THRESHOLD) {
      logger.warn(`内存使用较高（${(memoryStat.memoryRatio * 100).toFixed(1)}%），触发优化策略`);
      this.optimizeMemoryUsage();
    } else if (memoryStat.memoryRatio >= this.GC_TRIGGER_THRESHOLD) {
      // 触发垃圾回收（如果可用）
      this.triggerGarbageCollection();
    }
  }
  
  /**
   * 紧急内存清理
   */
  private emergencyMemoryCleanup(): void {
    logger.info('执行紧急内存清理...');
    
    // 强制垃圾回收（如果可用）
    this.triggerGarbageCollection(true);
    
    // 清理全局缓存（如果有）
    this.clearGlobalCaches();
    
    // 记录紧急清理事件
    logger.warn('紧急内存清理完成');
  }
  
  /**
   * 优化内存使用
   */
  private optimizeMemoryUsage(): void {
    logger.info('执行内存优化策略...');
    
    // 1. 触发垃圾回收
    this.triggerGarbageCollection();
    
    // 2. 优化缓存策略
    this.optimizeCacheStrategy();
    
    // 3. 减少内存分配
    this.reduceMemoryAllocations();
    
    logger.info('内存优化策略执行完成');
  }
  
  /**
   * 触发垃圾回收
   */
  private triggerGarbageCollection(force: boolean = false): void {
    if (typeof (global as any).gc === 'function') {
      try {
        if (force) {
          logger.info('强制触发垃圾回收...');
        } else {
          logger.debug('触发垃圾回收...');
        }
        
        (global as any).gc();
        
        if (force) {
          logger.info('垃圾回收完成');
        }
      } catch (error) {
        logger.warn('垃圾回收执行失败：', error);
      }
    } else if (force) {
      logger.warn('垃圾回收不可用，请使用 --expose-gc 参数启动应用');
    }
  }
  
  /**
   * 优化缓存策略
   */
  private optimizeCacheStrategy(): void {
    // 这里可以集成到具体的缓存服务中
    // 例如：减少缓存大小、清理过期缓存、使用更高效的数据结构等
    
    logger.debug('优化缓存策略...');
    
    // 示例：清理长时间未使用的缓存
    this.cleanupStaleCaches();
  }
  
  /**
   * 清理过期缓存
   */
  private cleanupStaleCaches(): void {
    // 这里需要与具体的缓存服务集成
    // 例如：清理超过一定时间未访问的缓存项
    
    // 示例实现（需要根据实际缓存结构调整）
    const now = Date.now();
    const CACHE_TTL = 30 * 60 * 1000; // 30分钟
    
    // 清理全局缓存（如果有）
    if ((global as any).cacheStore) {
      Object.keys((global as any).cacheStore).forEach(key => {
        const cacheItem = (global as any).cacheStore[key];
        if (cacheItem && now - cacheItem.lastAccess > CACHE_TTL) {
          delete (global as any).cacheStore[key];
        }
      });
    }
  }
  
  /**
   * 清理全局缓存
   */
  private clearGlobalCaches(): void {
    // 清理可能存在的全局缓存
    if ((global as any).cacheStore) {
      (global as any).cacheStore = {};
      logger.info('全局缓存已清理');
    }
    
    // 清理模块缓存（谨慎使用）
    // Object.keys(require.cache).forEach(key => {
    //   delete require.cache[key];
    // });
  }
  
  /**
   * 减少内存分配
   */
  private reduceMemoryAllocations(): void {
    // 优化策略：使用对象池、避免创建临时对象、重用数据结构等
    
    logger.debug('优化内存分配策略...');
    
    // 示例：优化字符串处理
    this.optimizeStringOperations();
    
    // 示例：优化数组操作
    this.optimizeArrayOperations();
  }
  
  /**
   * 优化字符串操作
   */
  private optimizeStringOperations(): void {
    // 避免不必要的字符串拼接
    // 使用模板字符串代替字符串连接
    // 重用字符串常量
  }
  
  /**
   * 优化数组操作
   */
  private optimizeArrayOperations(): void {
    // 使用更高效的数据结构
    // 避免创建不必要的数组副本
    // 使用对象池重用数组
  }
  
  /**
   * 预分配内存用于大数据处理
   */
  preallocateMemory(sizeMB: number): boolean {
    if (!this.optimizationEnabled) return false;
    
    const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const totalMemory = this.getTotalMemory() / 1024 / 1024;
    const availableMemory = totalMemory - currentMemory;
    
    if (availableMemory < sizeMB) {
      logger.warn(`内存不足：需要 ${sizeMB}MB，可用 ${availableMemory.toFixed(1)}MB`);
      return false;
    }
    
    logger.info(`预分配 ${sizeMB}MB 内存用于大数据处理`);
    
    // 实际的内存预分配策略需要根据具体需求实现
    // 例如：创建大型缓冲区、预初始化数据结构等
    
    return true;
  }
  
  /**
   * 获取内存使用统计
   */
  getMemoryStats(hours: number = 24): MemoryStats[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.memoryStats.filter(stat => stat.timestamp >= cutoffTime);
  }
  
  /**
   * 获取当前内存使用情况
   */
  getCurrentMemoryUsage(): MemoryStats | null {
    if (!this.optimizationEnabled) return null;
    
    const memoryUsage = process.memoryUsage();
    const totalMemory = this.getTotalMemory();
    const usedMemory = memoryUsage.heapUsed / 1024 / 1024;
    const totalMemoryMB = totalMemory / 1024 / 1024;
    const memoryRatio = usedMemory / totalMemoryMB;
    
    return {
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      memoryRatio,
      usedMemoryMB: usedMemory,
      totalMemoryMB: totalMemoryMB
    };
  }
  
  /**
   * 生成内存优化建议
   */
  generateOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const currentMemory = this.getCurrentMemoryUsage();
    
    if (!currentMemory) {
      return ['内存监控不可用，建议启用内存监控功能'];
    }
    
    if (currentMemory.memoryRatio > 0.6) {
      suggestions.push('内存使用较高，建议优化缓存策略');
    }
    
    if (currentMemory.memoryRatio > 0.7) {
      suggestions.push('内存使用接近阈值，建议启用垃圾回收');
    }
    
    if (currentMemory.memoryRatio > 0.8) {
      suggestions.push('内存使用过高，建议增加内存限制或优化算法');
    }
    
    // 基于历史数据生成建议
    const recentStats = this.getMemoryStats(1); // 最近1小时
    if (recentStats.length > 10) {
      const avgMemory = recentStats.reduce((sum, stat) => sum + stat.memoryRatio, 0) / recentStats.length;
      if (avgMemory > 0.5) {
        suggestions.push('内存使用持续较高，建议实施内存优化策略');
      }
    }
    
    return suggestions;
  }
  
  /**
   * 检查内存优化服务状态
   */
  isEnabled(): boolean {
    return this.optimizationEnabled;
  }
}

// 内存统计类型定义
interface MemoryStats {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  memoryRatio: number;
  usedMemoryMB: number;
  totalMemoryMB: number;
}

export default MemoryOptimizationService;