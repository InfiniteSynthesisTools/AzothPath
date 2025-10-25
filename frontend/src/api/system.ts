import { api } from '@/utils/request';
import type { SystemInfo, BackupStatus } from '@/types/system';

export const systemApi = {
  // 获取系统信息
  getSystemInfo() {
    return api.get<SystemInfo>('/system/info');
  },

  // 获取健康状态
  getHealthStatus() {
    return api.get<{
      status: string;
      message: string;
      timestamp: string;
      timezone: string;
      uptime: number;
      totalRequests?: number;
      errorRate?: number;
    }>('/health');
  },

  // 获取数据库备份状态
  getBackupStatus() {
    return api.get<BackupStatus>('/system/backup/status');
  },

  // 手动触发备份
  manualBackup() {
    return api.post<{
      backupPath: string;
      timestamp: string;
    }>('/system/backup/manual');
  }
};
