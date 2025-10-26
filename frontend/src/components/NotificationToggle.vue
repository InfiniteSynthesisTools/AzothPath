<template>
  <!-- 桌面端通知切换按钮 -->
  <el-button
    v-if="!isMobile"
    class="notification-toggle desktop-toggle"
    :type="hasUnread ? 'danger' : 'default'"
    circle
    @click="toggleNotifications"
  >
    <el-icon :size="18">
      <Bell />
    </el-icon>
    
    <!-- 未读通知红点 -->
    <div v-if="hasUnread" class="notification-badge"></div>
  </el-button>

  <!-- 移动端通知切换按钮 -->
  <div v-else class="notification-toggle mobile-toggle">
    <el-button
      class="mobile-notification-btn"
      :type="hasUnread ? 'danger' : 'default'"
      text
      @click="toggleMobileNotifications"
    >
      <el-icon :size="20">
        <Bell />
      </el-icon>
      <span class="mobile-btn-text">通知</span>
      
      <!-- 未读通知红点 -->
      <div v-if="hasUnread" class="notification-badge"></div>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bell } from '@element-plus/icons-vue';

// 定义props
const props = defineProps<{
  hasUnread?: boolean;
  isMobile?: boolean;
}>();

// 定义emits
const emit = defineEmits<{
  'toggle': [];
  'toggle-mobile': [];
}>();

// 计算属性
const hasUnread = computed(() => props.hasUnread ?? false);

// 方法
const toggleNotifications = () => {
  emit('toggle');
};

const toggleMobileNotifications = () => {
  emit('toggle-mobile');
};
</script>

<style scoped>
.notification-toggle {
  position: relative;
}

/* 桌面端样式 */
.desktop-toggle {
  width: 40px;
  height: 40px;
  transition: all var(--transition-base);
}

.desktop-toggle:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* 移动端样式 */
.mobile-toggle {
  width: 100%;
}

.mobile-notification-btn {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 0 16px;
  border-radius: 0;
  color: var(--color-text-primary);
  transition: all var(--transition-base);
}

.mobile-notification-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-primary-600);
}

.mobile-btn-text {
  font-size: 14px;
  font-weight: 500;
}

/* 通知红点样式 */
.notification-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background-color: #f56c6c;
  border-radius: 50%;
  border: 2px solid white;
  animation: pulse 2s infinite;
}

.mobile-toggle .notification-badge {
  top: 12px;
  right: 12px;
}

/* 红点动画 */
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .desktop-toggle {
    display: none;
  }
}

@media (min-width: 769px) {
  .mobile-toggle {
    display: none;
  }
}
</style>