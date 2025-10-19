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
      const data = await importApi.getImportTasks(params);
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
      const data = await importApi.getImportTask(taskId);
      currentTask.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 获取导入任务的明细列表
  const fetchTaskContents = async (taskId: number, page = 1, limit = 20) => {
    loading.value = true;
    try {
      const data = await importApi.getImportTaskContents(taskId, { page, limit });
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
      // 由于API中没有getTaskSummary方法，我们分别获取任务详情和内容
      const [taskData, contentsData] = await Promise.all([
        importApi.getImportTask(taskId),
        importApi.getImportTaskContents(taskId, { page: 1, limit: 50 })
      ]);
      currentTask.value = taskData;
      currentContents.value = contentsData.contents;
      return { task: taskData, contents: contentsData.contents };
    } finally {
      loading.value = false;
    }
  };

  // 删除导入任务
  const deleteImportTask = async (taskId: number) => {
    loading.value = true;
    try {
      // 由于API中没有deleteTask方法，我们暂时不实现删除功能
      // 或者可以调用后端的删除接口，但需要先确认后端是否有对应的API
      console.warn('删除导入任务功能暂未实现');
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
      const task = await importApi.getImportTask(taskId);
      
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

  // 删除导入任务通知
  const deleteNotification = async (taskId: number) => {
    loading.value = true;
    try {
      await importApi.deleteNotification(taskId);
      // 从列表中移除已删除通知的任务
      importTasks.value = importTasks.value.filter((t: ImportTask) => t.id !== taskId);
      total.value -= 1;
    } finally {
      loading.value = false;
    }
  };

  // 清理所有已完成任务的通知
  const clearAllCompletedNotifications = async () => {
    loading.value = true;
    try {
      // 获取所有已完成的任务
      const completedTasks = importTasks.value.filter((t: ImportTask) => 
        t.status === 'completed' || t.status === 'failed'
      );
      
      // 批量删除所有已完成任务的通知
      const deletePromises = completedTasks.map(task => 
        importApi.deleteNotification(task.id)
      );
      
      await Promise.all(deletePromises);
      
      // 重新获取任务列表，确保与数据库同步
      await fetchImportTasks();
      
      return completedTasks.length;
    } finally {
      loading.value = false;
    }
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
    pollTaskStatus,
    deleteNotification,
    clearAllCompletedNotifications
  };
});
