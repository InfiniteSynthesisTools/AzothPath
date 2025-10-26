<template>
  <div class="task-management">
    <!-- 任务统计概览 -->
    <div class="task-stats">
      <el-row :gutter="20">
        <el-col :span="6">
          <StatCard 
            emoji="📋"
            :value="taskStats.total"
            label="总任务数"
            type="primary"
          />
        </el-col>
        <el-col :span="6">
          <StatCard 
            emoji="⏰"
            :value="taskStats.active"
            label="活跃任务"
            type="warning"
          />
        </el-col>
        <el-col :span="6">
          <StatCard 
            emoji="✅"
            :value="taskStats.completed"
            label="已完成"
            type="success"
          />
        </el-col>
        <el-col :span="6">
          <StatCard 
            emoji="💰"
            :value="taskStats.total_prize"
            label="总奖励"
            type="info"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 任务管理选项卡 -->
    <div class="task-tabs">
      <el-tabs v-model="activeTab" type="card" class="task-tabs-container">
        <el-tab-pane label="📤 配方上传任务" name="upload">
          <UploadTaskManagement />
        </el-tab-pane>
        
        <el-tab-pane label="📋 任务看板任务" name="board">
          <BoardTaskManagement />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { taskApi } from '@/api';
import StatCard from '@/components/StatCard.vue';
import UploadTaskManagement from './UploadTaskManagement.vue';
import BoardTaskManagement from './BoardTaskManagement.vue';

// 响应式数据
const activeTab = ref('upload'); // 默认显示配方上传任务
const taskStats = ref({
  total: 0,
  active: 0,
  completed: 0,
  total_prize: 0
});

// 方法
const loadTaskStats = async () => {
  try {
    const stats = await taskApi.getStats();
    // 响应拦截器已经处理了数据结构，直接使用stats
    taskStats.value = {
      total: stats.total || 0,
      active: stats.active || 0,
      completed: stats.completed || 0,
      total_prize: stats.total_prize || 0
    };
  } catch (error) {
    console.error('加载任务统计失败:', error);
    // 保持默认值
  }
};

// 生命周期
onMounted(() => {
  loadTaskStats();
});
</script>

<style scoped>
.task-management {
  padding: 20px;
  background: var(--color-bg-secondary);
  min-height: 100vh;
}

.task-stats {
  margin-bottom: 30px;
}

.task-tabs {
  margin-top: 30px;
}

.task-tabs-container {
  min-height: 500px;
}

:deep(.el-tabs__content) {
  padding: 20px 0;
}

/* 深色模式适配 */
[data-theme="dark"] .task-management {
  background: var(--color-bg-primary);
}

[data-theme="dark"] .el-card {
  background: var(--color-bg-surface);
  border-color: var(--color-border-primary);
}

[data-theme="dark"] .el-card .el-card__body {
  background: var(--color-bg-surface);
}

[data-theme="dark"] .el-tabs {
  background: var(--color-bg-surface);
}

[data-theme="dark"] .el-tabs__header {
  background: var(--color-bg-surface);
  border-color: var(--color-border-primary);
}

[data-theme="dark"] .el-tabs__item {
  color: var(--color-text-primary);
}

[data-theme="dark"] .el-tabs__item.is-active {
  color: var(--color-primary-500);
}

[data-theme="dark"] .el-tabs__nav-wrap::after {
  background-color: var(--color-border-primary);
}
</style>
