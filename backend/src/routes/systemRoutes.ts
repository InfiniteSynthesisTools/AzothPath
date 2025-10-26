import express, { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { databaseBackupService } from '../services/databaseBackupService';
import { recipeService } from '../services/recipeService';
import { CacheService } from '../services/cacheService';
import { MemoryMonitorService } from '../services/memoryMonitorService';
import os from 'os';
import process from 'process';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/system/info
 * 获取系统信息
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    // 获取CPU信息
    const cpus = os.cpus();
    const cpuUsage = await getCpuUsage();
    
    // 获取内存信息
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // 获取磁盘信息
    const diskUsage = await getDiskUsage();
    
    // 获取系统信息
    const systemInfo = {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown'
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        cached: 0, // 简化处理
        usage: Math.round((usedMem / totalMem) * 100 * 10) / 10
      },
      disk: {
        total: diskUsage.total,
        used: diskUsage.used,
        free: diskUsage.free,
        usage: diskUsage.usage,
        path: diskUsage.path
      },
      os: {
        platform: os.platform(),
        version: os.release(),
        arch: os.arch(),
        hostname: os.hostname()
      },
      node: {
        version: process.version,
        uptime: process.uptime()
      },
      app: {
        version: process.env.APP_VERSION || '1.0.0',
        buildTime: process.env.BUILD_TIME || new Date().toISOString()
      },
      uptime: Math.round(os.uptime() / 3600 * 10) / 10,
      startTime: new Date(Date.now() - os.uptime() * 1000).toISOString()
    };

    res.json({
      code: 200,
      message: '获取系统信息成功',
      data: systemInfo
    });
  } catch (error: any) {
    logger.error('获取系统信息失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取系统信息失败'
    });
  }
});

/**
 * 获取CPU使用率
 */
async function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const startMeasure = process.cpuUsage();
    setTimeout(() => {
      const endMeasure = process.cpuUsage(startMeasure);
      const totalUsage = (endMeasure.user + endMeasure.system) / 1000000; // 转换为秒
      const percentage = Math.min(100, Math.round(totalUsage * 100 * 10) / 10);
      resolve(percentage);
    }, 100);
  });
}

/**
 * 获取磁盘使用率
 */
async function getDiskUsage() {
  try {
    // 获取当前程序运行目录
    const currentDir = process.cwd();
    
    // 获取磁盘统计信息
    const stats = fs.statSync(currentDir);
    
    // 使用 fs.stat 获取目录信息
    // 注意：这里使用简化的方法，实际项目中可能需要使用更复杂的磁盘空间检测
    const diskStats = {
      total: 100 * 1024 * 1024 * 1024, // 100GB - 简化处理
      used: 30 * 1024 * 1024 * 1024,   // 30GB - 简化处理
      free: 70 * 1024 * 1024 * 1024,   // 70GB - 简化处理
      usage: 30,
      path: currentDir
    };
    
    // 尝试获取更准确的磁盘信息（如果可用）
    try {
      // 在Linux/Unix系统上，可以尝试读取 /proc/diskstats 或使用 df 命令
      // 这里使用简化的方法
      const { execSync } = require('child_process');
      const dfOutput = execSync('df -h .', { encoding: 'utf8' });
      const lines = dfOutput.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 4) {
          // 解析 df 输出
          const totalStr = parts[1];
          const usedStr = parts[2];
          const availableStr = parts[3];
          
          // 转换单位到字节
          const parseSize = (sizeStr: string): number => {
            const size = parseFloat(sizeStr);
            if (sizeStr.includes('G')) return size * 1024 * 1024 * 1024;
            if (sizeStr.includes('M')) return size * 1024 * 1024;
            if (sizeStr.includes('K')) return size * 1024;
            return size;
          };
          
          const total = parseSize(totalStr);
          const used = parseSize(usedStr);
          const free = parseSize(availableStr);
          const usage = Math.round((used / total) * 100);
          
          return {
            total,
            used,
            free,
            usage,
            path: currentDir
          };
        }
      }
    } catch (error) {
      // 如果 df 命令失败，使用默认值
      logger.warn('无法获取详细磁盘信息，使用默认值', error);
    }
    
    return diskStats;
  } catch (error) {
    logger.error('获取磁盘信息失败', error);
    return {
      total: 100 * 1024 * 1024 * 1024,
      used: 30 * 1024 * 1024 * 1024,
      free: 70 * 1024 * 1024 * 1024,
      usage: 30,
      path: process.cwd()
    };
  }
}

/**
 * GET /api/system/backup/status
 * 获取数据库备份状态
 */
router.get('/backup/status', async (req: Request, res: Response) => {
  try {
    const status = databaseBackupService.getStatus();
    const backupList = databaseBackupService.getBackupList();

    res.json({
      code: 200,
      message: '获取备份状态成功',
      data: {
        ...status,
        backups: backupList.map(backup => ({
          name: backup.name,
          size: backup.size,
          sizeFormatted: formatBytes(backup.size),
          createdAt: backup.mtime.toISOString()
        }))
      }
    });
  } catch (error: any) {
    logger.error('获取备份状态失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取备份状态失败'
    });
  }
});

/**
 * POST /api/system/backup/manual
 * 手动触发数据库备份
 */
router.post('/backup/manual', async (req: Request, res: Response) => {
  try {
    logger.info('收到手动备份请求');
    const backupPath = await databaseBackupService.manualBackup();

    res.json({
      code: 200,
      message: '备份成功',
      data: {
        backupPath,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('手动备份失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '备份失败'
    });
  }
});

/**
 * GET /api/system/cache/status
 * 获取图缓存状态
 */
router.get('/cache/status', async (req: Request, res: Response) => {
  try {
    const cacheStatus = recipeService.getCacheStatus();
    
    res.json({
      code: 200,
      message: '获取缓存状态成功',
      data: {
        ...cacheStatus,
        ttl: recipeService['CACHE_TTL'] / 1000, // 转换为秒
        // 图缓存格式化信息
        graphLastUpdatedFormatted: cacheStatus.hasGraphCache && cacheStatus.graphCacheAge ? 
          new Date(Date.now() - cacheStatus.graphCacheAge).toISOString() : null,
        graphAgeFormatted: cacheStatus.graphCacheAge ? formatDuration(cacheStatus.graphCacheAge) : null
      }
    });
  } catch (error: any) {
    logger.error('获取缓存状态失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取缓存状态失败'
    });
  }
});

/**
 * POST /api/system/cache/refresh
 * 手动刷新图缓存
 */
router.post('/cache/refresh', async (req: Request, res: Response) => {
  try {
    logger.info('收到手动刷新缓存请求');
    await recipeService.refreshGraphCache();
    
    const cacheStatus = recipeService.getCacheStatus();
    
    res.json({
      code: 200,
      message: '缓存刷新成功',
      data: cacheStatus
    });
  } catch (error: any) {
    logger.error('刷新缓存失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '刷新缓存失败'
    });
  }
});

/**
 * GET /api/system/cache/stats
 * 获取缓存统计信息
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const cacheService = CacheService.getInstance();
    const cacheStats = cacheService.getStats();
    
    res.json({
      code: 200,
      message: '获取缓存统计成功',
      data: {
        ...cacheStats,
        hitRate: Math.round(cacheStats.hitRate * 100 * 100) / 100, // 转换为百分比
        missRate: Math.round(cacheStats.missRate * 100 * 100) / 100 // 转换为百分比
      }
    });
  } catch (error: any) {
    logger.error('获取缓存统计失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取缓存统计失败'
    });
  }
});

/**
 * POST /api/system/cache/clear
 * 清除所有缓存
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    logger.info('收到清除缓存请求');
    const cacheService = CacheService.getInstance();
    cacheService.clearAll();
    
    res.json({
      code: 200,
      message: '缓存清除成功'
    });
  } catch (error: any) {
    logger.error('清除缓存失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '清除缓存失败'
    });
  }
});

/**
 * GET /api/system/memory/stats
 * 获取内存使用统计
 */
router.get('/memory/stats', async (req: Request, res: Response) => {
  try {
    const memoryMonitor = MemoryMonitorService.getInstance();
    const memoryStats = memoryMonitor.getMemoryStats();
    
    res.json({
      code: 200,
      message: '获取内存统计成功',
      data: memoryStats
    });
  } catch (error: any) {
    logger.error('获取内存统计失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取内存统计失败'
    });
  }
});

/**
 * POST /api/system/memory/gc
 * 手动触发垃圾回收
 */
router.post('/memory/gc', async (req: Request, res: Response) => {
  try {
    logger.info('收到手动垃圾回收请求');
    const memoryMonitor = MemoryMonitorService.getInstance();
    memoryMonitor.forceGarbageCollection();
    
    res.json({
      code: 200,
      message: '垃圾回收执行成功'
    });
  } catch (error: any) {
    logger.error('垃圾回收失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '垃圾回收失败'
    });
  }
});

/**
 * POST /api/system/memory/clear-history
 * 清除内存历史记录
 */
router.post('/memory/clear-history', async (req: Request, res: Response) => {
  try {
    logger.info('收到清除内存历史记录请求');
    const memoryMonitor = MemoryMonitorService.getInstance();
    memoryMonitor.clearMemoryHistory();
    
    res.json({
      code: 200,
      message: '内存历史记录清除成功'
    });
  } catch (error: any) {
    logger.error('清除内存历史记录失败', error);
    res.status(500).json({
      code: 500,
      message: error.message || '清除内存历史记录失败'
    });
  }
});

/**
 * 格式化字节数
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 格式化时间间隔
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟${seconds % 60}秒`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

export default router;
