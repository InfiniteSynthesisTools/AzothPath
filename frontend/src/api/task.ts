import { api } from '@/utils/request';

export interface Task {
  id: number;
  item_name: string;
  prize: number;
  status: 'active' | 'completed';
  created_at: string;
  completed_by_recipe_id?: number;
  completed_at?: string;
}

export interface TaskWithDetails extends Task {
  recipe?: {
    id: number;
    item_a: string;
    item_b: string;
    result: string;
    creator_name: string;
  };
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'completed';
  sortBy?: 'created_at' | 'prize';
  sortOrder?: 'asc' | 'desc';
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface TaskStats {
  total: number;
  active: number;
  completed: number;
  total_prize: number;
}

export const taskApi = {
  // 获取任务列表
  getTasks(params: TaskListParams = {}): Promise<TaskListResponse> {
    return api.get<TaskListResponse>('/tasks', { params });
  },

  // 获取任务统计
  getStats(): Promise<TaskStats> {
    return api.get<TaskStats>('/tasks/stats');
  },

  // 获取任务详情
  getTaskById(id: number): Promise<TaskWithDetails> {
    return api.get<TaskWithDetails>(`/tasks/${id}`);
  },

  // 创建任务
  createTask(data: { itemName: string; prize: number }): Promise<{ taskId: number }> {
    return api.post<{ taskId: number }>('/tasks', data);
  },

  // 完成任务
  completeTask(taskId: number, recipeId: number): Promise<{ taskId: number; prize: number; newContribution: number }> {
    return api.post<{ taskId: number; prize: number; newContribution: number }>(`/tasks/${taskId}/complete`, { recipeId });
  },

  // 删除任务（管理员）
  deleteTask(id: number): Promise<void> {
    return api.delete<void>(`/tasks/${id}`);
  }
};
