// Import 相关类型定义

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

export interface ImportTaskSummary {
  task: ImportTask;
  contents: ImportTaskContent[];
}

export interface ImportTaskListParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface ImportTaskListResponse {
  tasks: ImportTask[];
  total: number;
}

export interface ImportTaskContentListParams {
  task_id: number;
  page?: number;
  limit?: number;
  status?: string;
}

export interface ImportTaskContentListResponse {
  contents: ImportTaskContent[];
  total: number;
}

export interface SubmitRecipeResponse {
  taskId: number;
  message: string;
}
