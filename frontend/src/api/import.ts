import request from '@/utils/request';

export interface ImportTask {
  id: number;
  user_id: number;
  total_count: number;
  success_count: number;
  failed_count: number;
  duplicate_count: number;
  status: 'processing' | 'completed' | 'failed';
  error_details?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportTaskContent {
  id: number;
  task_id: number;
  item_a: string;
  item_b: string;
  result: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'duplicate';
  error_message?: string;
  recipe_id?: number;
  created_at: string;
  updated_at: string;
}

export interface BatchImportRequest {
  text: string;
}

export interface BatchImportResponse {
  taskId: number;
  totalCount: number;
}

export const importApi = {
  // 批量导入配方
  batchImport(data: BatchImportRequest) {
    return request.post<BatchImportResponse>('/import-tasks/batch', data);
  },

  // 获取导入任务列表
  getImportTasks(params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}) {
    return request.get<{ tasks: ImportTask[]; total: number }>('/import-tasks', { params });
  },

  // 获取导入任务详情
  getImportTask(taskId: number) {
    return request.get<ImportTask>(`/import-tasks/${taskId}`);
  },

  // 获取导入任务明细
  getImportTaskContents(taskId: number, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}) {
    return request.get<{ contents: ImportTaskContent[]; total: number }>(
      `/import-tasks/${taskId}/contents`,
      { params }
    );
  }
};