import { defineStore } from 'pinia';
import { ref } from 'vue';
import { taskApi } from '@/api';
import type { Task, TaskSearchParams } from '@/types';

export const useTaskStore = defineStore('task', () => {
  // 状态
  const tasks = ref<Task[]>([]);
  const total = ref(0);
  const currentTask = ref<Task | null>(null);
  const loading = ref(false);
  const searchParams = ref<TaskSearchParams>({
    page: 1,
    limit: 20,
    status: 'active'  // 默认只显示活跃任务
  });

  // 获取任务列表
  const fetchTasks = async (params?: TaskSearchParams) => {
    loading.value = true;
    try {
      if (params) {
        searchParams.value = { ...searchParams.value, ...params };
      }
      const data = await taskApi.getTasks(searchParams.value);
      tasks.value = data.tasks;
      total.value = data.total;
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 获取任务详情
  const fetchTaskDetail = async (id: number) => {
    loading.value = true;
    try {
      const data = await taskApi.getTaskById(id);
      currentTask.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 创建任务（管理员）
  const createTask = async (itemName: string, prize: number) => {
    loading.value = true;
    try {
      const data = await taskApi.createTask({
        itemName,
        prize
      });
      // 创建任务后需要重新获取任务列表，因为API只返回taskId
      await fetchTasks();
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 更新任务（管理员）
  const updateTask = async (id: number, updates: Partial<Task>) => {
    loading.value = true;
    try {
      // 由于API中没有update方法，我们暂时不实现更新功能
      console.warn('更新任务功能暂未实现');
      // 这里可以调用后端的更新接口，但需要先确认后端是否有对应的API
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 删除任务（管理员）
  const deleteTask = async (id: number) => {
    loading.value = true;
    try {
      await taskApi.deleteTask(id);
      // 从列表中移除
      tasks.value = tasks.value.filter((t: Task) => t.id !== id);
      total.value -= 1;
    } finally {
      loading.value = false;
    }
  };

  // 重置搜索参数
  const resetSearchParams = () => {
    searchParams.value = {
      page: 1,
      limit: 20,
      status: 'active'
    };
  };

  return {
    // 状态
    tasks,
    total,
    currentTask,
    loading,
    searchParams,
    // 方法
    fetchTasks,
    fetchTaskDetail,
    createTask,
    updateTask,
    deleteTask,
    resetSearchParams
  };
});
