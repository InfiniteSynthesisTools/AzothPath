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
      const data = await taskApi.list(searchParams.value);
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
      const data = await taskApi.detail(id);
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
      const data = await taskApi.create({
        item_name: itemName,
        prize
      });
      // 添加到列表开头
      tasks.value.unshift(data);
      total.value += 1;
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 更新任务（管理员）
  const updateTask = async (id: number, updates: Partial<Task>) => {
    loading.value = true;
    try {
      const data = await taskApi.update(id, updates);
      // 更新列表中的任务
      const index = tasks.value.findIndex((t: Task) => t.id === id);
      if (index !== -1) {
        tasks.value[index] = data;
      }
      // 更新当前任务
      if (currentTask.value?.id === id) {
        currentTask.value = data;
      }
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 删除任务（管理员）
  const deleteTask = async (id: number) => {
    loading.value = true;
    try {
      await taskApi.delete(id);
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
