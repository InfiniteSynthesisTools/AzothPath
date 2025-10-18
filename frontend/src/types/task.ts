// Task 相关类型定义

export interface Task {
  id: number;
  item_name: string;
  prize: number;
  status: 'active' | 'completed';
  created_at: string;
  completed_by_recipe_id?: number;
  completed_at?: string;
}

export interface TaskSearchParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'completed';
  item_name?: string;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
}
