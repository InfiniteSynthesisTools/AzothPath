import { logger } from '../utils/logger';

/**
 * 性能监控服务
 * 跟踪大数据量场景下的性能表现，提供自动扩容建议
 */
export class PerformanceMonitorService {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  
  // 监控配置
  private readonly METRIC_RETENTION_DAYS = 7; // 指标保留天数
  private readonly ALERT_THRESHOLD_MS = 10000; // 警报阈值（毫秒）
  private readonly SCALING_THRESHOLD = 0.8; // 扩容阈值（80%利用率）
  
  constructor() {
    // 定期清理过期指标
    setInterval(() => this.cleanupOldMetrics(), 24 * 60 * 60 * 1000); // 每天清理一次
  }
  
  /**
   * 记录性能指标
   */
  recordMetric(
    operation: string,
    duration: number,
    dataSize: number = 0,
    success: boolean = true,
    metadata: Record<string, any> = {}
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      dataSize,
      success,
      timestamp: Date.now(),
      metadata
    };
    
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    this.metrics.get(operation)!.push(metric);
    
    // 检查是否需要触发警报
    this.checkForAlerts(metric);
    
    // 记录性能日志
    if (duration > this.ALERT_THRESHOLD_MS) {
      logger.warn(`性能警告：${operation} 耗时 ${duration}ms，数据量：${dataSize}`);
    }
  }
  
  /**
   * 检查性能警报
   */
  private checkForAlerts(metric: PerformanceMetric): void {
    if (metric.duration > this.ALERT_THRESHOLD_MS) {
      const alert: PerformanceAlert = {
        type: 'performance',
        operation: metric.operation,
        severity: metric.duration > 30000 ? 'high' : 'medium',
        message: `${metric.operation} 操作耗时过长：${metric.duration}ms`,
        timestamp: Date.now(),
        dataSize: metric.dataSize,
        suggestions: this.generateSuggestions(metric)
      };
      
      this.alerts.push(alert);
      logger.warn(`性能警报：${alert.message}`);
    }
  }
  
  /**
   * 生成优化建议
   */
  private generateSuggestions(metric: PerformanceMetric): string[] {
    const suggestions: string[] = [];
    
    if (metric.dataSize > 10000) {
      suggestions.push('数据量较大，建议启用分布式处理');
      suggestions.push('考虑实现增量处理策略，避免全量计算');
    }
    
    if (metric.duration > 30000) {
      suggestions.push('操作耗时过长，建议优化算法复杂度');
      suggestions.push('考虑增加缓存预热机制');
    }
    
    if (metric.operation.includes('icicle')) {
      suggestions.push('冰柱图生成建议使用批量处理');
      suggestions.push('考虑实现分层缓存策略');
    }
    
    return suggestions;
  }
  
  /**
   * 获取性能统计
   */
  getPerformanceStats(operation?: string, hours: number = 24): PerformanceStats {
    const now = Date.now();
    const cutoffTime = now - (hours * 60 * 60 * 1000);
    
    let operationsToCheck = operation ? [operation] : Array.from(this.metrics.keys());
    
    const stats: PerformanceStats = {
      totalOperations: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      successRate: 0,
      operations: {},
      scalingRecommendations: []
    };
    
    let totalDuration = 0;
    let totalSuccess = 0;
    let totalCount = 0;
    
    operationsToCheck.forEach(op => {
      const metrics = this.metrics.get(op) || [];
      const recentMetrics = metrics.filter(m => m.timestamp >= cutoffTime);
      
      if (recentMetrics.length === 0) return;
      
      const opStats = this.calculateOperationStats(recentMetrics);
      stats.operations[op] = opStats;
      
      totalDuration += opStats.totalDuration;
      totalSuccess += opStats.successCount;
      totalCount += opStats.count;
      
      stats.totalOperations += opStats.count;
      stats.maxDuration = Math.max(stats.maxDuration, opStats.maxDuration);
      stats.minDuration = Math.min(stats.minDuration, opStats.minDuration);
    });
    
    if (totalCount > 0) {
      stats.averageDuration = totalDuration / totalCount;
      stats.successRate = totalSuccess / totalCount;
    }
    
    // 生成扩容建议
    stats.scalingRecommendations = this.generateScalingRecommendations(stats);
    
    return stats;
  }
  
  /**
   * 计算单个操作的统计信息
   */
  private calculateOperationStats(metrics: PerformanceMetric[]): OperationStats {
    const stats: OperationStats = {
      count: metrics.length,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      totalDuration: 0,
      successCount: 0,
      dataSizeStats: {
        average: 0,
        max: 0,
        total: 0
      }
    };
    
    let totalDuration = 0;
    let totalDataSize = 0;
    
    metrics.forEach(metric => {
      totalDuration += metric.duration;
      totalDataSize += metric.dataSize;
      
      stats.maxDuration = Math.max(stats.maxDuration, metric.duration);
      stats.minDuration = Math.min(stats.minDuration, metric.duration);
      
      if (metric.success) {
        stats.successCount++;
      }
      
      stats.dataSizeStats.max = Math.max(stats.dataSizeStats.max, metric.dataSize);
    });
    
    if (metrics.length > 0) {
      stats.averageDuration = totalDuration / metrics.length;
      stats.totalDuration = totalDuration;
      stats.dataSizeStats.average = totalDataSize / metrics.length;
      stats.dataSizeStats.total = totalDataSize;
    }
    
    return stats;
  }
  
  /**
   * 生成扩容建议
   */
  private generateScalingRecommendations(stats: PerformanceStats): string[] {
    const recommendations: string[] = [];
    
    // 检查是否需要水平扩容
    if (stats.averageDuration > 5000) { // 平均耗时超过5秒
      recommendations.push('平均操作耗时较长，建议水平扩容增加处理节点');
    }
    
    // 检查数据量增长趋势
    Object.entries(stats.operations).forEach(([op, opStats]) => {
      if (opStats.dataSizeStats.average > 10000) {
        recommendations.push(`${op} 操作数据量较大，建议优化数据分片策略`);
      }
      
      // 计算成功率
      const successRate = opStats.successCount / opStats.count;
      if (successRate < 0.95) {
        recommendations.push(`${op} 操作成功率较低，建议增加重试机制`);
      }
    });
    
    // 检查内存使用情况（基于数据量估算）
    const totalDataSize = Object.values(stats.operations).reduce(
      (sum, opStats) => sum + opStats.dataSizeStats.total, 0
    );
    
    if (totalDataSize > 1000000) { // 总数据量超过1MB
      recommendations.push('总数据量较大，建议优化内存使用和垃圾回收策略');
    }
    
    return recommendations;
  }
  
  /**
   * 清理过期指标
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (this.METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    this.metrics.forEach((metrics, operation) => {
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoffTime);
      this.metrics.set(operation, filteredMetrics);
    });
    
    // 清理过期警报（保留最近7天）
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoffTime);
    
    logger.info(`性能监控：清理过期指标，保留最近 ${this.METRIC_RETENTION_DAYS} 天数据`);
  }
  
  /**
   * 获取当前警报
   */
  getAlerts(hours: number = 24): PerformanceAlert[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }
  
  /**
   * 重置监控数据
   */
  reset(): void {
    this.metrics.clear();
    this.alerts = [];
    logger.info('性能监控数据已重置');
  }
}

// 类型定义
interface PerformanceMetric {
  operation: string;
  duration: number;
  dataSize: number;
  success: boolean;
  timestamp: number;
  metadata: Record<string, any>;
}

interface OperationStats {
  count: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  totalDuration: number;
  successCount: number;
  dataSizeStats: {
    average: number;
    max: number;
    total: number;
  };
}

interface PerformanceStats {
  totalOperations: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  successRate: number;
  operations: Record<string, OperationStats>;
  scalingRecommendations: string[];
}

interface PerformanceAlert {
  type: 'performance' | 'scaling' | 'error';
  operation: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
  dataSize: number;
  suggestions: string[];
}

export default PerformanceMonitorService;