<template>
  <!-- 侧边栏切换按钮 -->
  <div class="sidebar-toggle" :class="{ 'sidebar-open': isOpen }">
    <el-button
      class="toggle-button"
      :type="hasNotifications ? 'danger' : 'primary'"
      circle
      @click="toggleSidebar"
    >
      <el-icon v-if="!isOpen">
        <Bell v-if="hasNotifications" />
        <ChatDotRound v-else />
      </el-icon>
      <el-icon v-else>
        <Close />
      </el-icon>
      
      <!-- 通知红点 -->
      <div v-if="hasNotifications && !isOpen" class="notification-badge"></div>
    </el-button>
  </div>

  <!-- 侧边栏内容 -->
  <div class="sidebar" :class="{ 'sidebar-open': isOpen }">
    <div class="sidebar-header">
      <h3>通知面板</h3>
      <el-button 
        text 
        circle 
        @click="toggleSidebar"
        class="close-button"
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <div class="sidebar-content">
      <!-- 上传任务卡片 -->
      <div class="section" v-if="uploadTasks.length > 0">
        <div class="section-header">
          <h4>上传任务</h4>
          <el-button 
            text 
            size="small" 
            @click="clearCompletedTasks"
            :disabled="!hasCompletedTasks"
          >
            清除已完成
          </el-button>
        </div>
        
        <div class="task-list">
          <div 
            v-for="task in uploadTasks" 
            :key="task.id" 
            class="task-card"
            :class="{
              'task-completed': task.status === 'completed',
              'task-failed': task.status === 'failed'
            }"
          >
            <div class="task-header">
              <span class="task-title">批量导入任务 #{{ task.id }}</span>
              <el-tag 
                :type="getTaskStatusType(task.status)" 
                size="small"
              >
                {{ getTaskStatusText(task.status) }}
              </el-tag>
            </div>
            
            <div class="task-progress" v-if="task.status === 'processing'">
              <el-progress 
                :percentage="calculateProgress(task)" 
                :show-text="false"
                :stroke-width="6"
              />
              <div class="progress-text">
                {{ task.success_count + task.failed_count + task.duplicate_count }} / {{ task.total_count }}
              </div>
            </div>
            
            <div class="task-stats">
              <div class="stat-item">
                <span class="stat-label">成功:</span>
                <span class="stat-value success">{{ task.success_count }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">失败:</span>
                <span class="stat-value failed">{{ task.failed_count }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">重复:</span>
                <span class="stat-value duplicate">{{ task.duplicate_count }}</span>
              </div>
            </div>
            
            <div class="task-time">
              {{ formatRelativeTime(task.created_at) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 系统通知 -->
      <div class="section">
        <div class="section-header">
          <h4>系统通知</h4>
        </div>
        
        <div class="notification-list">
          <div 
            v-for="notification in unarchivedNotifications" 
            :key="notification.id" 
            class="notification-item"
            :class="{ 'notification-unread': !notification.read }"
          >
            <div class="notification-icon">
              <el-icon :color="getNotificationColor(notification.type)">
                <component :is="getNotificationIcon(notification.type)" />
              </el-icon>
            </div>
            
            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-message">{{ notification.message }}</div>
              <div class="notification-time">{{ formatRelativeTime(notification.created_at) }}</div>
            </div>
            
            <div class="notification-actions">
              <el-button 
                v-if="!notification.read" 
                text 
                size="small" 
                @click="markAsRead(notification.id)"
              >
                标记已读
              </el-button>
              <el-button 
                v-if="notification.read && !notification.archived" 
                text 
                size="small" 
                @click="archiveNotification(notification.id)"
              >
                归档
              </el-button>
            </div>
          </div>
        </div>
        
        <div v-if="unarchivedNotifications.length === 0" class="empty-notifications">
          <el-empty description="暂无通知" :image-size="60" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Bell, ChatDotRound, Close, SuccessFilled, WarningFilled, InfoFilled } from '@element-plus/icons-vue';
import { useImportStore } from '@/stores/import';

// 侧边栏状态
const isOpen = ref(false);

// 导入任务存储
const importStore = useImportStore();

// 通知数据 - 从本地存储加载或使用默认数据
const loadNotifications = () => {
  const saved = localStorage.getItem('azoth_notifications');
  if (saved) {
    return JSON.parse(saved);
  }
  return [
    {
      id: 1,
      type: 'info',
      title: '欢迎使用 Azoth Path',
      message: '感谢您使用我们的合成路径搜索工具！',
      read: true,
      archived: false,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      type: 'success',
      title: '系统更新',
      message: '新增了最简路径排序功能',
      read: false,
      archived: false,
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    }
  ];
};

const notifications = ref(loadNotifications());

// 保存通知到本地存储
const saveNotifications = () => {
  localStorage.setItem('azoth_notifications', JSON.stringify(notifications.value));
};

// 监听通知变化并保存
watch(notifications, saveNotifications, { deep: true });

// 上传任务数据 - 使用实际的导入任务数据
const uploadTasks = computed(() => {
  // 只显示处理中的任务和最近完成的任务（最近1小时内）
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  return importStore.importTasks.filter(task => {
    // 显示所有处理中的任务
    if (task.status === 'processing') return true;
    
    // 显示最近1小时内完成或失败的任务
    const taskTime = new Date(task.created_at);
    return taskTime > oneHourAgo;
  });
});

// 计算属性
const unarchivedNotifications = computed(() => {
  return notifications.value.filter((n: any) => !n.archived);
});

const hasNotifications = computed(() => {
  return unarchivedNotifications.value.some((n: any) => !n.read) || uploadTasks.value.some((t: any) => t.status === 'processing');
});

const hasCompletedTasks = computed(() => {
  return uploadTasks.value.some((t: any) => t.status === 'completed' || t.status === 'failed');
});

// 方法
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

const calculateProgress = (task: any) => {
  const processed = task.success_count + task.failed_count + task.duplicate_count;
  return Math.round((processed / task.total_count) * 100);
};

const getTaskStatusType = (status: string) => {
  const types: Record<string, any> = {
    processing: 'primary',
    completed: 'success',
    failed: 'danger'
  };
  return types[status] || 'info';
};

const getTaskStatusText = (status: string) => {
  const texts: Record<string, string> = {
    processing: '处理中',
    completed: '已完成',
    failed: '失败'
  };
  return texts[status] || status;
};

const getNotificationIcon = (type: string) => {
  const icons: Record<string, any> = {
    success: SuccessFilled,
    warning: WarningFilled,
    info: InfoFilled
  };
  return icons[type] || InfoFilled;
};

const getNotificationColor = (type: string) => {
  const colors: Record<string, string> = {
    success: '#67c23a',
    warning: '#e6a23c',
    info: '#409eff'
  };
  return colors[type] || '#909399';
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
};

const markAsRead = (notificationId: number) => {
  const notification = notifications.value.find((n: any) => n.id === notificationId);
  if (notification) {
    notification.read = true;
    ElMessage.success('标记为已读');
  }
};

const archiveNotification = (notificationId: number) => {
  const notification = notifications.value.find((n: any) => n.id === notificationId);
  if (notification) {
    notification.archived = true;
    ElMessage.success('已归档');
  }
};

const clearCompletedTasks = () => {
  // 由于uploadTasks是计算属性，我们无法直接修改它
  // 这个功能现在由导入任务页面处理
  ElMessage.success('已完成的任务会自动从通知面板中移除');
};

// 轮询更新处理中的任务状态
let progressInterval: number | null = null;

const pollProcessingTasks = () => {
  // 检查是否有处理中的任务，如果有则刷新任务列表
  const hasProcessingTasks = importStore.importTasks.some(task => task.status === 'processing');
  if (hasProcessingTasks) {
    importStore.fetchImportTasks();
  }
};

onMounted(() => {
  // 加载当前用户的导入任务
  importStore.fetchImportTasks();
  
  // 每5秒检查一次处理中的任务状态
  progressInterval = window.setInterval(pollProcessingTasks, 5000);
});

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval);
  }
});
</script>

<style scoped>
.sidebar-toggle {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  z-index: 2000;
  transition: right 0.3s ease;
}

.sidebar-toggle.sidebar-open {
  right: 320px;
}

.toggle-button {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50% 0 0 50%;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
}

.notification-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background-color: #f56c6c;
  border-radius: 50%;
  border: 2px solid white;
}

/* 侧边栏样式 */
.sidebar {
  position: fixed;
  top: 0;
  right: -320px;
  width: 320px;
  height: 100vh;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  z-index: 1999;
  transition: right 0.3s ease;
  display: flex;
  flex-direction: column;
}

.sidebar.sidebar-open {
  right: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fa;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.close-button {
  padding: 4px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 分区样式 */
.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

/* 任务卡片样式 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #f8f9fa;
}

.task-card.task-completed {
  border-color: #67c23a;
  background: #f0f9ff;
}

.task-card.task-failed {
  border-color: #f56c6c;
  background: #fef0f0;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.task-progress {
  margin-bottom: 8px;
}

.progress-text {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin-top: 4px;
}

.task-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 12px;
  font-weight: 500;
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

.task-time {
  font-size: 11px;
  color: #c0c4cc;
  text-align: right;
}

/* 通知列表样式 */
.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
}

.notification-item.notification-unread {
  border-color: #409eff;
  background: #f0f9ff;
}

.notification-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.notification-icon {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.notification-message {
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
  margin-bottom: 4px;
}

.notification-time {
  font-size: 11px;
  color: #909399;
}

.notification-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
}

.empty-notifications {
  padding: 20px 0;
  text-align: center;
}
</style>
