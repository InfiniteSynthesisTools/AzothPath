import { api } from '@/utils/request';

export const systemApi = {
  // 获取系统信息
  getSystemInfo() {
    return api.get<{
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
    }>('/system/info');
  }
};
