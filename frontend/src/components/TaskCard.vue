<template>
  <el-card class="task-card" :class="{ completed: task.status === 'completed' }">
    <div class="task-header">
      <el-tag :type="task.status === 'active' ? 'success' : 'info'" size="large">
        {{ task.status === 'active' ? '🎯 活跃中' : '✅ 已完成' }}
      </el-tag>
      <el-dropdown v-if="showActions" trigger="click">
        <el-icon class="more-icon"><More /></el-icon>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="$emit('detail', task)">
              📋 查看详情
            </el-dropdown-item>
            <el-dropdown-item v-if="task.status === 'active' && canComplete" @click="$emit('complete', task)">
              ✅ 完成任务
            </el-dropdown-item>
            <el-dropdown-item v-if="isAdmin" divided @click="$emit('delete', task)">
              <span style="color: #f56c6c;">🗑️ 删除任务</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="task-body">
      <div class="task-title">
        <span class="item-name">{{ task.item_name }}</span>
      </div>
      
      <div class="task-prize">
        <el-tag type="warning" effect="dark" size="large">
          💰 {{ task.prize }} 贡献分
        </el-tag>
      </div>

      <div class="task-footer">
        <div class="task-time">
          <el-icon><Clock /></el-icon>
          {{ formatDate(task.created_at) }}
        </div>
      </div>
    </div>

    <div class="task-actions" v-if="task.status === 'active'">
      <el-button type="primary" size="small" @click="$emit('detail', task)" style="width: 100%">
        查看详情
      </el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { More, Clock } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import type { Task } from '@/api/task';

interface Props {
  task: Task;
  showActions?: boolean;
}

withDefaults(defineProps<Props>(), {
  showActions: true
});

defineEmits<{
  detail: [task: Task];
  complete: [task: Task];
  delete: [task: Task];
}>();

const userStore = useUserStore();

const isAdmin = computed(() => userStore.userInfo?.auth === 9);
const canComplete = computed(() => !!userStore.userInfo);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return date.toLocaleDateString('zh-CN');
};
</script>

<style scoped>
.task-card {
  height: 100%;
  transition: all 0.3s;
  cursor: pointer;
}

.task-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.task-card.completed {
  opacity: 0.8;
  background-color: #f5f7fa;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.more-icon {
  font-size: 20px;
  cursor: pointer;
  color: #909399;
  transition: color 0.3s;
}

.more-icon:hover {
  color: #409eff;
}

.task-body {
  padding: 10px 0;
}

.task-title {
  margin-bottom: 15px;
}

.item-name {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
  display: inline-block;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.task-prize {
  margin-bottom: 15px;
}

.task-footer {
  display: flex;
  align-items: center;
  color: #909399;
  font-size: 13px;
}

.task-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-actions {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}
</style>
