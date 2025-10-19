/**
 * 系统管理相关类型定义
 */

// 数据库备份信息
export interface DatabaseBackup {
  name: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
}

// 备份配置
export interface BackupConfig {
  enabled: boolean;
  intervalHours: number;
  backupDir: string;
  maxBackups: number;
  dbPath: string;
}

// 备份状态
export interface BackupStatus {
  enabled: boolean;
  isRunning: boolean;
  config: BackupConfig;
  backupCount: number;
  backups: DatabaseBackup[];
}

// 系统信息
export interface SystemInfo {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
    path: string;
  };
  os: {
    platform: string;
    version: string;
    arch: string;
    hostname: string;
  };
  node: {
    version: string;
    uptime: number;
  };
  uptime: number;
  startTime: string;
}
