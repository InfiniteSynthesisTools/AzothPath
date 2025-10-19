/**
 * 验证API限速器
 * 限制API请求速率，防止触发外部API限速
 * 
 * 工作原理：
 * - 所有HTTP请求进入队列
 * - 队列按顺序执行，确保请求间隔 >= minInterval
 * - 多个任务可以并发调用，但HTTP请求会被串行化
 */

import { apiConfig } from '../config/api';
import { logger } from './logger';

class ValidationLimiter {
  private lastValidationTime: number = 0;
  private readonly minInterval: number; // 从配置文件读取
  private queue: Array<() => void> = [];
  private processing: boolean = false;

  constructor() {
    // 从配置文件中读取限速间隔
    this.minInterval = apiConfig.rateLimitInterval;
    logger.info(`验证限速器初始化: 最小间隔 ${this.minInterval}ms`);
  }

  /**
   * 限速验证请求
   * @param validationFn 验证函数（包含HTTP请求）
   * @returns Promise<T> 验证结果
   */
  async limitValidation<T>(validationFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeValidation = async () => {
        try {
          const result = await validationFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.queue.push(executeValidation);
      this.processQueue();
    });
  }

  /**
   * 处理验证队列（自动维护请求间隔）
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastValidation = now - this.lastValidationTime;

      // 如果距离上次请求不足 minInterval，等待
      if (timeSinceLastValidation < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastValidation;
        logger.debug(`验证限速: 等待 ${waitTime}ms (最小间隔: ${this.minInterval}ms)`);
        await this.delay(waitTime);
      }

      // 执行验证
      const validationFn = this.queue.shift();
      if (validationFn) {
        this.lastValidationTime = Date.now();
        try {
          await validationFn();
        } catch (error) {
          // 错误已经在 validationFn 中处理
        }
      }
    }

    this.processing = false;
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { queueLength: number; isProcessing: boolean; lastValidationTime: number } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
      lastValidationTime: this.lastValidationTime
    };
  }

  /**
   * 清空队列（用于测试或紧急停止）
   */
  clearQueue(): void {
    this.queue = [];
    this.processing = false;
  }

  /**
   * 获取预计完成时间（毫秒）
   */
  getEstimatedCompletionTime(): number {
    const queueLength = this.queue.length;
    if (queueLength === 0) return 0;
    
    const now = Date.now();
    const timeSinceLastValidation = now - this.lastValidationTime;
    const timeToNextValidation = Math.max(0, this.minInterval - timeSinceLastValidation);
    
    return timeToNextValidation + (queueLength - 1) * this.minInterval;
  }
}

// 创建全局实例
export const validationLimiter = new ValidationLimiter();
