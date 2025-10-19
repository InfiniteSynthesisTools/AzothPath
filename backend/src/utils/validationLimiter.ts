/**
 * 验证API限速器
 * 限制每秒只能验证一个配方，防止触发API限速
 */

class ValidationLimiter {
  private lastValidationTime: number = 0;
  private readonly minInterval: number = 1000; // 1秒间隔
  private queue: Array<() => void> = [];
  private processing: boolean = false;

  /**
   * 限速验证请求
   * @param validationFn 验证函数
   * @returns Promise<any> 验证结果
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
   * 处理验证队列
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastValidation = now - this.lastValidationTime;

      if (timeSinceLastValidation < this.minInterval) {
        // 需要等待
        const waitTime = this.minInterval - timeSinceLastValidation;
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
  getQueueStatus(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing
    };
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue = [];
    this.processing = false;
  }
}

// 创建全局实例
export const validationLimiter = new ValidationLimiter();
