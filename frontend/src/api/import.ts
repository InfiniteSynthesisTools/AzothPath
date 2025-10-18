import request from '@/utils/request';
import type {
  ImportTask,
  ImportTaskContent,
  ImportTaskListParams,
  ImportTaskListResponse,
  ImportTaskContentListParams,
  ImportTaskContentListResponse
} from '@/types';

export const importApi = {
  // 获取用户的导入任务列表
  listTasks(params: ImportTaskListParams = {}) {
    return request.get<ImportTaskListResponse>('/import-tasks', { params });
  },

  // 获取导入任务详情
  getTask(taskId: number) {
    return request.get<ImportTask>(`/import-tasks/${taskId}`);
  },

  // 获取导入任务的明细列表
  listTaskContents(params: ImportTaskContentListParams) {
    return request.get<ImportTaskContentListResponse>('/import-tasks/contents', { params });
  },

  // 获取导入任务的完整信息（任务 + 明细）
  getTaskSummary(taskId: number) {
    return request.get<{
      task: ImportTask;
      contents: ImportTaskContent[];
    }>(`/import-tasks/${taskId}/summary`);
  },

  // 删除导入任务（及其所有明细）
  deleteTask(taskId: number) {
    return request.delete(`/import-tasks/${taskId}`);
  }
};
