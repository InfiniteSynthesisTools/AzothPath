<template>
  <div class="task-management">
    <!-- 任务统计概览 -->
    <div class="task-stats">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic 
              :value="taskStats.total" 
              title="总任务数"
              :precision="0"
            >
              <template #prefix>
                <el-icon><Document /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic 
              :value="taskStats.active" 
              title="活跃任务"
              :precision="0"
            >
              <template #prefix>
                <el-icon><Clock /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic 
              :value="taskStats.completed" 
              title="已完成"
              :precision="0"
            >
              <template #prefix>
                <el-icon><CircleCheck /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic 
              :value="taskStats.total_prize" 
              title="总奖励"
              :precision="0"
            >
              <template #prefix>
                <el-icon><Star /></el-icon>
              </template>
            </el-statistic>
          </el-card>
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
import { ElMessage } from 'element-plus';
import { Document, Clock, CircleCheck, Star } from '@element-plus/icons-vue';
import { taskApi } from '@/api';
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
</style>
