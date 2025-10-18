import request from '@/utils/request';
import type { Task, TaskSearchParams, TaskListResponse } from '@/types';

export const taskApi = {
  // 获取任务列表
  list(params: TaskSearchParams = {}) {
    return request.get<TaskListResponse>('/tasks', { params });
  },

  // 获取任务详情
  detail(id: number) {
    return request.get<Task>(`/tasks/${id}`);
  },

  // 创建任务（管理员）
  create(data: { item_name: string; prize: number }) {
    return request.post<Task>('/tasks', data);
  },

  // 更新任务（管理员）
  update(id: number, data: Partial<Task>) {
    return request.put<Task>(`/tasks/${id}`, data);
  },

  // 删除任务（管理员）
  delete(id: number) {
    return request.delete(`/tasks/${id}`);
  }
};
