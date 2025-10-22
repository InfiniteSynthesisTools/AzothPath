/**
 * 统一日志工具
 * 提供结构化的日志输出，支持不同级别和颜色
 * 所有时间显示统一使用UTC+8
 */

import { getCurrentUTC8Time, formatDateTimeForDB } from './timezone';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DATABASE = 3,
  API = 4, 
  SUCCESS = 5,
  DEBUG = 6
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.level = process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * 检查是否支持颜色输出
   */
  private supportsColor(): boolean {
    // 检查环境变量
    if (process.env.NO_COLOR) {
      return false;
    }
    
    // 强制启用颜色
    if (process.env.FORCE_COLOR === '1' || process.env.FORCE_COLOR === '2' || process.env.FORCE_COLOR === '3') {
      return true;
    }
    
    // 检查终端类型
    const term = process.env.TERM;
    if (term && (term.includes('color') || term.includes('256'))) {
      return true;
    }
    
    // 检查是否为TTY
    if (process.stdout.isTTY) {
      return true;
    }
    
    // 开发环境默认启用颜色
    return this.isDevelopment;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const utc8Time = getCurrentUTC8Time();
    // 使用UTC+8时间格式化
    const timestamp = formatDateTimeForDB(utc8Time);
    const prefix = `[${timestamp}] ${level}:`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  private log(level: LogLevel, levelName: string, message: string, data?: any): void {
    if (level <= this.level) {
      const formattedMessage = this.formatMessage(levelName, message, data);
      const coloredMessage = this.supportsColor() ? this.addColor(level, formattedMessage) : formattedMessage;
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(coloredMessage);
          break;
        case LogLevel.WARN:
          console.warn(coloredMessage);
          break;
        case LogLevel.SUCCESS:
          console.log(coloredMessage); // SUCCESS使用console.log，显示绿色
          break;
        default:
          console.log(coloredMessage);
      }
    }
  }

  /**
   * 为日志消息添加颜色
   */
  private addColor(level: LogLevel, message: string): string {
    const resetColor = '\x1b[0m'; // 重置颜色
    let color = '\x1b[36m'; // 默认青色
    
    switch (level) {
      case LogLevel.ERROR:
        color = '\x1b[31m'; // 红色
        break;
      case LogLevel.WARN:
        color = '\x1b[33m'; // 黄色
        break;
      case LogLevel.INFO:
        color = '\x1b[36m'; // 青色
        break;
      case LogLevel.SUCCESS:
        color = '\x1b[32m'; // 绿色
        break;
      case LogLevel.DEBUG:
        color = '\x1b[37m'; // 白色
        break;
      case LogLevel.DATABASE:
        color = '\x1b[35m'; // 紫色
        break;
      case LogLevel.API:
        color = '\x1b[34m'; // 蓝色
        break;
    }
    
    return `${color}${message}${resetColor}`;
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  success(message: string, data?: any): void {
    this.log(LogLevel.SUCCESS, 'SUCCESS', message, data);
  }

  database(message: string, data?: any): void {
    this.log(LogLevel.DATABASE, 'DATABASE', message, data);
  }

  api(message: string, data?: any): void {
    this.log(LogLevel.API, 'API', message, data);
  }
}

// 导出单例实例
export const logger = new Logger();
