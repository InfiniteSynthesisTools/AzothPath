// 通用类型定义

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 导出所有类型
export * from './recipe';
export * from './user';
export * from './task';
export * from './import';
