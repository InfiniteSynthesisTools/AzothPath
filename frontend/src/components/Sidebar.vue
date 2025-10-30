<template>
  <!-- 侧边栏切换按钮（仅在 showToggleButton 为 true 时显示） -->
  <div v-if="showToggleButton" class="sidebar-toggle" :class="{ 'sidebar-open': isOpen }">
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
          <div class="section-actions">
            <el-button 
              text 
              size="small" 
              @click="refreshTaskStatus"
              :loading="loadingNotifications"
            >
              刷新
            </el-button>
            <el-button 
              text 
              size="small" 
              @click="clearCompletedTasks"
              :disabled="!hasCompletedTasks"
            >
              清除已完成
            </el-button>
          </div>
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
              {{ formatDateTime(task.created_at) }}
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
            :class="{ 'notification-unread': notification.is_read === 0 }"
          >
            <div class="notification-icon">
              <el-icon :color="getNotificationColor(notification.type)">
                <component :is="getNotificationIcon(notification.type)" />
              </el-icon>
            </div>
            
            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-message">{{ notification.content }}</div>
              <div class="notification-time">{{ formatDateTime(notification.created_at) }}</div>
            </div>
            
            <div class="notification-actions">
              <el-button 
                v-if="notification.is_read === 0" 
                text 
                size="small" 
                @click="markAsRead(notification.id)"
              >
                标记已读
              </el-button>
              <el-button 
                v-if="notification.is_read === 1 && notification.is_active === 1" 
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
import { formatDateTime } from '@/utils/format';
import { notificationApi } from '@/api';

// 定义props
const props = defineProps<{
  visible?: boolean;
  hasUnreadNotifications?: boolean;
  showToggleButton?: boolean;
}>();

// 定义emits
const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

// 侧边栏状态 - 使用props或内部状态
const isOpen = computed({
  get: () => props.visible ?? false,
  set: (value: boolean) => emit('update:visible', value)
});

// 导入任务存储
const importStore = useImportStore();

// 通知数据 - 从API加载
const notifications = ref<any[]>([]);
const loadingNotifications = ref(false);

// 加载通知数据
const loadNotifications = async () => {
  try {
    loadingNotifications.value = true;
    const result = await notificationApi.getNotifications({
      page: 1,
      limit: 50
    });
    notifications.value = result.notifications || [];
  } catch (error) {
    console.error('加载通知失败:', error);
    // 如果API失败，使用默认数据
    notifications.value = [
      {
        id: 1,
        type: 'info',
        title: '欢迎使用 Azoth Path',
        content: '感谢您使用我们的合成路径搜索工具！',
        is_read: 1,
        is_active: 1,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  } finally {
    loadingNotifications.value = false;
  }
};

// 移除本地存储相关代码，现在使用API

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
  return notifications.value.filter((n: any) => n.is_active === 1);
});

const hasNotifications = computed(() => {
  // 优先使用props，如果没有则使用计算值
  if (props.hasUnreadNotifications !== undefined) {
    return props.hasUnreadNotifications;
  }
  return unarchivedNotifications.value.some((n: any) => n.is_read === 0) || uploadTasks.value.some((t: any) => t.status === 'processing');
});

const hasCompletedTasks = computed(() => {
  return uploadTasks.value.some((t: any) => t.status === 'completed' || t.status === 'failed');
});

// 方法
const toggleSidebar = () => {
  const willOpen = !isOpen.value;
  isOpen.value = willOpen;
  
  // 打开侧边栏时加载任务数据和通知数据
  if (willOpen) {
    importStore.fetchImportTasks();
    loadNotifications();
  }
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


const markAsRead = async (notificationId: number) => {
  try {
    await notificationApi.markAsRead(notificationId);
    const notification = notifications.value.find((n: any) => n.id === notificationId);
    if (notification) {
      notification.is_read = 1;
    }
    ElMessage.success('标记为已读');
  } catch (error) {
    console.error('标记已读失败:', error);
    ElMessage.error('标记已读失败');
  }
};

const archiveNotification = async (notificationId: number) => {
  try {
    // 先标记为已读（如果还没有）
    const notification = notifications.value.find((n: any) => n.id === notificationId);
    if (notification && notification.is_read === 0) {
      await notificationApi.markAsRead(notificationId);
      notification.is_read = 1;
    }
    
    // 删除通知（实现归档效果）
    await notificationApi.deleteNotification(notificationId);
    
    // 从本地列表中移除
    const index = notifications.value.findIndex((n: any) => n.id === notificationId);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
    
    ElMessage.success('已归档');
  } catch (error) {
    console.error('归档失败:', error);
    ElMessage.error('归档失败');
  }
};

const clearCompletedTasks = async () => {
  try {
    // 获取所有已完成的任务
    const completedTasks = uploadTasks.value.filter(task => 
      task.status === 'completed' || task.status === 'failed'
    );
    
    if (completedTasks.length === 0) {
      ElMessage.info('没有需要清理的已完成任务');
      return;
    }
    
    // 批量删除已完成任务的通知
    const deletePromises = completedTasks.map(task => 
      importStore.deleteNotification(task.id)
    );
    
    await Promise.all(deletePromises);
    
    // 重新获取任务列表
    await importStore.fetchImportTasks();
    
    ElMessage.success(`已清理 ${completedTasks.length} 个已完成任务的通知`);
  } catch (error) {
    console.error('清理已完成任务失败:', error);
    ElMessage.error('清理任务失败，请稍后重试');
  }
};

// 手动刷新任务状态
const refreshTaskStatus = async () => {
  try {
    await importStore.fetchImportTasks();
    ElMessage.success('任务状态已刷新');
  } catch (error) {
    console.error('刷新任务状态失败:', error);
    ElMessage.error('刷新失败');
  }
};

// 轮询更新处理中的任务状态和通知
let progressInterval: number | null = null;
let notificationInterval: number | null = null;

const pollProcessingTasks = () => {
  // 只在侧边栏打开时才轮询
  if (!isOpen.value) return;
  
  // 检查是否有处理中的任务，如果有则刷新任务列表
  const hasProcessingTasks = importStore.importTasks.some(task => task.status === 'processing');
  if (hasProcessingTasks) {
    importStore.fetchImportTasks();
  }
};

// 轮询通知数据
const pollNotifications = () => {
  // 定期刷新通知数据，不管侧边栏是否打开
  loadNotifications();
};

// 启动轮询
const startPolling = () => {
  if (progressInterval) return; // 避免重复启动
  progressInterval = window.setInterval(pollProcessingTasks, 5000);
};

// 启动通知轮询
const startNotificationPolling = () => {
  if (notificationInterval) return; // 避免重复启动
  notificationInterval = window.setInterval(pollNotifications, 30000); // 30秒刷新一次通知
};

// 停止轮询
const stopPolling = () => {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
};

// 停止通知轮询
const stopNotificationPolling = () => {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
};

// 监听侧边栏打开/关闭状态
watch(isOpen, (newVal) => {
  if (newVal) {
    // 侧边栏打开：启动轮询
    startPolling();
  } else {
    // 侧边栏关闭：停止轮询
    stopPolling();
  }
});

onMounted(() => {
  // 页面加载时就获取通知数据
  loadNotifications();
  // 启动通知轮询
  startNotificationPolling();
});

onUnmounted(() => {
  stopPolling();
  stopNotificationPolling();
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

/* 侧边栏样式 - 桌面端 */
.sidebar {
  position: fixed;
  top: 60px; /* 从导航栏下方开始 */
  right: -320px;
  width: 320px;
  height: calc(100vh - 60px); /* 减去导航栏高度 */
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-lg);
  z-index: 9999; /* 大幅提高 z-index 确保在最上层 */
  transition: right var(--transition-base);
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border-primary);
}

.sidebar.sidebar-open {
  right: 0;
}

/* 移动端适配：左侧二次展开 */
@media (max-width: 768px) {
  .sidebar {
    width: 280px;
    height: calc(100vh - 60px); /* 导航栏高度 60px，避免遮挡顶部导航 */
    right: auto;
    left: -280px;
    top: 60px; /* 从导航栏下方开始，保持导航可见 */
    transition: left var(--transition-base);
    border-left: none;
    border-right: 1px solid var(--color-border-primary);
    z-index: 9999; /* 大幅提高 z-index 确保在最上层 */
  }
  
  .sidebar.sidebar-open {
    left: 0;
    right: auto;
  }
  
  .sidebar-toggle {
    display: none; /* 移动端隐藏浮动按钮 */
  }
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-primary);
  background: var(--color-bg-secondary);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--color-text-primary);
  font-weight: 600;
}

.close-button {
  padding: 4px;
  color: var(--color-text-secondary);
  transition: all var(--transition-base);
}

.close-button:hover {
  color: var(--color-primary-600);
  background-color: var(--color-bg-tertiary);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--color-bg-surface);
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

.section-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-primary);
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
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-base);
  background: var(--color-bg-secondary);
  transition: all var(--transition-base);
}

.task-card:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.task-card.task-completed {
  border-color: var(--color-success-400);
  background: var(--color-success-50);
}

.task-card.task-failed {
  border-color: var(--color-danger-400);
  background: var(--color-danger-50);
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
  color: var(--color-text-primary);
}

.task-progress {
  margin-bottom: 8px;
}

.progress-text {
  font-size: 12px;
  color: var(--color-text-secondary);
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
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 12px;
  font-weight: 500;
}

.stat-value.success {
  color: var(--color-success-600);
}

.stat-value.failed {
  color: var(--color-danger-600);
}

.stat-value.duplicate {
  color: var(--color-warning-600);
}

.task-time {
  font-size: 11px;
  color: var(--color-text-tertiary);
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
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-base);
  background: var(--color-bg-surface);
  transition: all var(--transition-base);
}

.notification-item.notification-unread {
  border-color: var(--color-primary-400);
  background: var(--color-primary-50);
}

.notification-item:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
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
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.notification-message {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-bottom: 4px;
}

.notification-time {
  font-size: 11px;
  color: var(--color-text-tertiary);
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
