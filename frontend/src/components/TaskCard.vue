<template>
  <el-card class="task-card" :class="{ completed: task.status === 'completed' }" @click="$emit('detail', task)">
    <div class="task-header">
      <div class="task-tags">
        <el-tag :type="task.status === 'active' ? 'success' : 'info'" size="small">
          {{ task.status === 'active' ? '活跃中' : '已完成' }}
        </el-tag>
        <el-tag :type="task.task_type === 'find_recipe' ? 'warning' : 'primary'" size="small" style="margin-left: 8px;">
          {{ task.task_type === 'find_recipe' ? '寻找配方' : '寻找更多配方' }}
        </el-tag>
      </div>
      <el-dropdown v-if="showActions && userStore.userInfo?.auth === 9" trigger="click" @click.stop>
        <el-icon class="more-icon"><More /></el-icon>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="$emit('delete', task)">
              <span style="color: #f56c6c;">删除任务</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="task-body">
      <div class="task-title">
        <h3 class="item-name">{{ task.item_name }}</h3>
      </div>
      
      <div class="task-prize">
        <span class="prize-text">{{ task.prize }} 贡献分</span>
      </div>

      <div class="task-footer">
        <div class="task-time">
          <el-icon><Clock /></el-icon>
          {{ formatTime(task.created_at) }}
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { More, Clock } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import type { Task } from '@/api/task';
import { formatTime } from '@/utils/time';

interface Props {
  task: Task;
  showActions?: boolean;
}

withDefaults(defineProps<Props>(), {
  showActions: true
});

defineEmits<{
  detail: [task: Task];
  delete: [task: Task];
}>();

const userStore = useUserStore();

</script>

<style scoped>
.task-card {
  height: 100%;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  border: 1px solid #e5e7eb;
}

.task-card.completed {
  opacity: 0.8;
  background-color: #f8f9fa;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.task-tags {
  display: flex;
  align-items: center;
}

.more-icon {
  font-size: 16px;
  cursor: pointer;
  color: #909399;
}

.task-body {
  padding: 0;
}

.task-title {
  margin-bottom: 12px;
}

.item-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.task-prize {
  margin-bottom: 12px;
}

.prize-text {
  font-size: 14px;
  color: #e6a23c;
  font-weight: 500;
  background: #fdf6ec;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #f5dab1;
}

.task-footer {
  display: flex;
  align-items: center;
  color: #6b7280;
  font-size: 12px;
}

.task-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .item-name {
    font-size: 16px;
  }
  
  .prize-text {
    font-size: 13px;
  }
  
  .task-time {
    font-size: 11px;
  }
}
</style>
