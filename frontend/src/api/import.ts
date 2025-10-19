import { api } from '@/utils/request';

export interface ImportTask {
  id: number;
  user_id: number;
  total_count: number;
  success_count: number;
  failed_count: number;
  duplicate_count: number;
  status: 'processing' | 'completed' | 'failed';
  error_details?: string;
  notification_deleted: number;  // 0=未删除, 1=已删除
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
  successCount: number;
  failedCount: number;
  duplicateCount: number;
}

export const importApi = {
  // 批量导入配方
  batchImport(data: BatchImportRequest): Promise<BatchImportResponse> {
    return api.post<BatchImportResponse>('/import-tasks/batch', data);
  },

  // 获取导入任务列表
  getImportTasks(params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{ tasks: ImportTask[]; total: number }> {
    return api.get<{ tasks: ImportTask[]; total: number }>('/import-tasks', { params });
  },

  // 获取导入任务详情
  getImportTask(taskId: number): Promise<ImportTask> {
    return api.get<ImportTask>(`/import-tasks/${taskId}`);
  },

  // 获取导入任务明细
  getImportTaskContents(taskId: number, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{ contents: ImportTaskContent[]; total: number }> {
    return api.get<{ contents: ImportTaskContent[]; total: number }>(
      `/import-tasks/${taskId}/contents`,
      { params }
    );
  },

  // 删除导入任务通知
  deleteNotification(taskId: number): Promise<void> {
    return api.delete(`/import-tasks/${taskId}/notification`);
  },

  // 获取未读的已完成任务
  getUnreadCompletedTasks(): Promise<ImportTask[]> {
    return api.get<ImportTask[]>('/import-tasks/unread-completed');
  }
};
