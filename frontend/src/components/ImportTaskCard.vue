<template>
  <el-card class="import-task-card" shadow="hover">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="task-id">#{{ task.id }}</div>
      <Badge 
        :type="getStatusType(task.status)" 
        size="sm"
        :emoji="getStatusEmoji(task.status)"
        :text="getStatusText(task.status)"
      />
    </div>

    <!-- 任务统计 -->
    <div class="task-stats">
      <div class="stat-item">
        <Badge 
          type="default" 
          size="sm"
          emoji="📊"
          :text="`${task.total_count} 总数`"
        />
      </div>
      <div class="stat-item">
        <Badge 
          type="success" 
          size="sm"
          emoji="✅"
          :text="`${task.success_count} 成功`"
        />
      </div>
      <div class="stat-item">
        <Badge 
          type="error" 
          size="sm"
          emoji="❌"
          :text="`${task.failed_count} 失败`"
        />
      </div>
      <div class="stat-item">
        <Badge 
          type="warning" 
          size="sm"
          emoji="🔄"
          :text="`${task.duplicate_count} 重复`"
        />
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
        type="warning" 
        size="small" 
        @click="$emit('fix-status', task)"
        v-if="task.status === 'processing' && task.success_count + task.failed_count + task.duplicate_count >= task.total_count"
        :loading="fixing"
      >
        修复状态
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
import { computed, ref } from 'vue';
import Badge from '@/components/Badge.vue';
import type { ImportTask } from '@/types';

interface Props {
  task: ImportTask;
}

const props = defineProps<Props>();
defineEmits<{
  detail: [task: ImportTask];
  delete: [task: ImportTask];
  'fix-status': [task: ImportTask];
}>();

const fixing = ref(false);

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
    case 'failed': return 'error';
    default: return 'info';
  }
};

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'processing': return '处理中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return status;
  }
};

// 获取状态emoji
const getStatusEmoji = (status: string) => {
  switch (status) {
    case 'processing': return '🔄';
    case 'completed': return '✅';
    case 'failed': return '❌';
    default: return '📝';
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
  transition: all 0.3s ease;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.import-task-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.95);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.task-id {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  padding: 8px 4px;
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
  flex-wrap: wrap;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .import-task-card {
    margin-bottom: 16px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 8px;
  }
  
  .task-id {
    font-size: 13px;
  }
  
  /* 任务统计移动端优化 */
  .task-stats {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .stat-item {
    padding: 6px;
  }
  
  .stat-label {
    font-size: 11px;
    margin-bottom: 2px;
  }
  
  .stat-value {
    font-size: 14px;
  }
  
  /* 进度条移动端优化 */
  .progress-section {
    margin-bottom: 12px;
  }
  
  .progress-info {
    font-size: 11px;
    margin-bottom: 6px;
  }
  
  /* 时间信息移动端优化 */
  .time-info {
    margin-bottom: 12px;
  }
  
  .time-item {
    font-size: 11px;
    margin-bottom: 2px;
  }
  
  /* 操作按钮移动端优化 */
  .card-actions {
    flex-direction: column;
    gap: 6px;
  }
  
  .card-actions .el-button {
    width: 100%;
    font-size: 12px;
    padding: 8px 12px;
  }
}

@media (max-width: 480px) {
  .import-task-card {
    margin-bottom: 12px;
  }
  
  .card-header {
    gap: 6px;
    margin-bottom: 10px;
    padding-bottom: 6px;
  }
  
  .task-id {
    font-size: 12px;
  }
  
  /* 任务统计小屏幕优化 */
  .task-stats {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 10px;
  }
  
  .stat-item {
    padding: 4px;
  }
  
  .stat-label {
    font-size: 10px;
    margin-bottom: 1px;
  }
  
  .stat-value {
    font-size: 13px;
  }
  
  /* 进度条小屏幕优化 */
  .progress-section {
    margin-bottom: 10px;
  }
  
  .progress-info {
    font-size: 10px;
    margin-bottom: 4px;
  }
  
  /* 时间信息小屏幕优化 */
  .time-info {
    margin-bottom: 10px;
  }
  
  .time-item {
    font-size: 10px;
    margin-bottom: 1px;
  }
  
  /* 操作按钮小屏幕优化 */
  .card-actions {
    gap: 4px;
  }
  
  .card-actions .el-button {
    font-size: 11px;
    padding: 6px 10px;
  }
}
</style>
