<template>
  <el-card class="import-task-card" shadow="hover">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="task-id">#{{ task.id }}</div>
      <el-tag :type="getStatusType(task.status)" size="small">
        {{ getStatusText(task.status) }}
      </el-tag>
    </div>

    <!-- 任务统计 -->
    <div class="task-stats">
      <div class="stat-item">
        <div class="stat-label">总配方数</div>
        <div class="stat-value">{{ task.total_count }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">成功</div>
        <div class="stat-value success">{{ task.success_count }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">失败</div>
        <div class="stat-value failed">{{ task.failed_count }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">重复</div>
        <div class="stat-value duplicate">{{ task.duplicate_count }}</div>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="progress-section" v-if="task.status === 'processing'">
      <div class="progress-info">
        <span>处理进度</span>
        <span>{{ progressPercentage }}%</span>
      </div>
      <el-progress 
        :percentage="progressPercentage" 
        :show-text="false"
        :stroke-width="6"
        :color="progressColor"
      />
    </div>

    <!-- 时间信息 -->
    <div class="time-info">
      <div class="time-item">
        <span class="time-label">创建时间:</span>
        <span class="time-value">{{ formatDate(task.created_at) }}</span>
      </div>
      <div class="time-item" v-if="task.updated_at !== task.created_at">
        <span class="time-label">更新时间:</span>
        <span class="time-value">{{ formatDate(task.updated_at) }}</span>
      </div>
    </div>

    <!-- 错误信息 -->
    <div class="error-info" v-if="task.error_details">
      <el-alert
        :title="task.error_details"
        type="error"
        :closable="false"
        show-icon
        size="small"
      />
    </div>

    <!-- 操作按钮 -->
    <div class="card-actions">
      <el-button 
        type="primary" 
        size="small" 
        @click="$emit('detail', task)"
        :disabled="task.status === 'processing'"
      >
        查看详情
      </el-button>
      <el-button 
        type="danger" 
        size="small" 
        @click="$emit('delete', task)"
        :disabled="task.status === 'processing'"
      >
        删除
      </el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ImportTask } from '@/types';

interface Props {
  task: ImportTask;
}

const props = defineProps<Props>();
defineEmits<{
  detail: [task: ImportTask];
  delete: [task: ImportTask];
}>();

// 计算进度百分比
const progressPercentage = computed(() => {
  const task = props.task;
  if (!task.total_count) return 0;
  
  const processed = task.success_count + task.failed_count + task.duplicate_count;
  return Math.round((processed / task.total_count) * 100);
});

// 计算进度条颜色
const progressColor = computed(() => {
  const percentage = progressPercentage.value;
  if (percentage < 30) return '#e6a23c';
  if (percentage < 70) return '#409eff';
  return '#67c23a';
});

// 获取状态类型
const getStatusType = (status: string) => {
  switch (status) {
    case 'processing': return 'warning';
    case 'completed': return 'success';
    case 'failed': return 'danger';
    default: return 'info';
  }
};

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'processing': return '🔄 处理中';
    case 'completed': return '✅ 已完成';
    case 'failed': return '❌ 失败';
    default: return status;
  }
};

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<style scoped>
.import-task-card {
  height: 100%;
  transition: all 0.3s;
  border-radius: 12px;
}

.import-task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.task-id {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

/* 任务统计 */
.task-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.stat-value.success {
  color: #67c23a;
}

.stat-value.failed {
  color: #f56c6c;
}

.stat-value.duplicate {
  color: #e6a23c;
}

/* 进度条 */
.progress-section {
  margin-bottom: 16px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #909399;
}

/* 时间信息 */
.time-info {
  margin-bottom: 16px;
}

.time-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  margin-bottom: 4px;
}

.time-label {
  color: #909399;
}

.time-value {
  color: #606266;
  font-family: 'Monaco', 'Consolas', monospace;
}

/* 错误信息 */
.error-info {
  margin-bottom: 16px;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
