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
        <Badge 
          type="warning" 
          size="sm"
          emoji="💰"
          :text="`${task.prize} 贡献分`"
        />
      </div>

      <div class="task-footer">
        <div class="task-time">
          <el-icon><Clock /></el-icon>
          {{ formatDateTime(task.created_at) }}
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { More, Clock } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import Badge from '@/components/Badge.vue';
import type { Task } from '@/api/task';
import { formatDateTime } from '@/utils/format';

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
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  border: 1px solid var(--color-border-primary);
  background: var(--color-bg-surface);
  transition: all var(--transition-base);
}

.task-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-border-accent);
}

.task-card.completed {
  opacity: 0.8;
  background-color: var(--color-bg-tertiary);
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
  color: var(--color-text-tertiary);
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
  color: var(--color-text-primary);
  margin: 0;
}

.task-prize {
  margin-bottom: 12px;
}

.task-footer {
  display: flex;
  align-items: center;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.task-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-card {
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
  }
  
  .task-header {
    margin-bottom: 12px;
  }
  
  .task-tags {
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .task-tags .el-tag {
    font-size: 11px;
  }
  
  .task-tags .el-tag:not(:first-child) {
    margin-left: 0;
  }
  
  .more-icon {
    font-size: 14px;
  }
  
  .task-title {
    margin-bottom: 10px;
  }
  
  .item-name {
    font-size: 16px;
    color: var(--color-text-primary);
  }
  
  .task-prize {
    margin-bottom: 10px;
  }
  
  .task-time {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .task-header {
    margin-bottom: 10px;
  }
  
  .task-tags .el-tag {
    font-size: 10px;
    padding: 0 6px;
    height: 20px;
    line-height: 20px;
  }
  
  .item-name {
    font-size: 15px;
    color: var(--color-text-primary);
  }
  
  .task-time {
    font-size: 10px;
    color: var(--color-text-tertiary);
  }
}
</style>
