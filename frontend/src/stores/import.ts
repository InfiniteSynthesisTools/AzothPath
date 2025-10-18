import { defineStore } from 'pinia';
import { ref } from 'vue';
import { importApi } from '@/api';
import type { ImportTask, ImportTaskContent, ImportTaskListParams } from '@/types';

export const useImportStore = defineStore('import', () => {
  // 状态
  const importTasks = ref<ImportTask[]>([]);
  const total = ref(0);
  const currentTask = ref<ImportTask | null>(null);
  const currentContents = ref<ImportTaskContent[]>([]);
  const loading = ref(false);

  // 获取导入任务列表
  const fetchImportTasks = async (params: ImportTaskListParams = {}) => {
    loading.value = true;
    try {
      const data = await importApi.listTasks(params);
      importTasks.value = data.tasks;
      total.value = data.total;
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 获取导入任务详情
  const fetchImportTask = async (taskId: number) => {
    loading.value = true;
    try {
      const data = await importApi.getTask(taskId);
      currentTask.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 获取导入任务的明细列表
  const fetchTaskContents = async (taskId: number, page = 1, limit = 50) => {
    loading.value = true;
    try {
      const data = await importApi.listTaskContents({
        task_id: taskId,
        page,
        limit
      });
      currentContents.value = data.contents;
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 获取导入任务的完整信息
  const fetchTaskSummary = async (taskId: number) => {
    loading.value = true;
    try {
      const data = await importApi.getTaskSummary(taskId);
      currentTask.value = data.task;
      currentContents.value = data.contents;
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 删除导入任务
  const deleteImportTask = async (taskId: number) => {
    loading.value = true;
    try {
      await importApi.deleteTask(taskId);
      // 从列表中移除
      importTasks.value = importTasks.value.filter((t: ImportTask) => t.id !== taskId);
      total.value -= 1;
    } finally {
      loading.value = false;
    }
  };

  // 轮询任务状态（用于实时更新进度）
  const pollTaskStatus = async (taskId: number, interval = 2000, maxAttempts = 100) => {
    let attempts = 0;
    
    const poll = async (): Promise<ImportTask> => {
      if (attempts >= maxAttempts) {
        throw new Error('轮询超时');
      }
      
      attempts++;
      const task = await importApi.getTask(taskId);
      
      // 如果任务已完成或失败，停止轮询
      if (task.status === 'completed' || task.status === 'failed') {
        return task;
      }
      
      // 继续轮询
      await new Promise(resolve => setTimeout(resolve, interval));
      return poll();
    };
    
    return poll();
  };

  return {
    // 状态
    importTasks,
    total,
    currentTask,
    currentContents,
    loading,
    // 方法
    fetchImportTasks,
    fetchImportTask,
    fetchTaskContents,
    fetchTaskSummary,
    deleteImportTask,
    pollTaskStatus
  };
});
