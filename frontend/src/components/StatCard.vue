<template>
  <el-card class="stat-card" :class="{ compact }" shadow="hover">
    <div class="stat-content">
      <div class="stat-icon" :class="`stat-icon--${type}`">
        {{ emoji }}
      </div>
      <div class="stat-info">
        <div class="stat-value">{{ value }}</div>
        <div class="stat-label">{{ label }}</div>
      </div>
    </div>
    
    <!-- 趋势指示器 -->
    <div v-if="trend !== undefined" class="stat-trend" :class="`stat-trend--${trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'}`">
      <el-icon v-if="trend > 0"><TrendCharts /></el-icon>
      <el-icon v-else-if="trend < 0"><SortDown /></el-icon>
      <el-icon v-else><Minus /></el-icon>
      <span>{{ Math.abs(trend) }}%</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { TrendCharts, SortDown, Minus } from '@element-plus/icons-vue';

interface Props {
  type?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  emoji: string;
  value: string | number;
  label: string;
  trend?: number; // 百分比趋势，正数表示上升，负数表示下降
  compact?: boolean; // 紧凑模式（移动端/窄列展示）
}

withDefaults(defineProps<Props>(), {
  type: 'default',
  compact: false
});
</script>

<style scoped>
.stat-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
  height: 100%;
}

.stat-card:hover {
  box-shadow: var(--shadow-xl);
  border-color: var(--color-border-accent);
  transform: translateY(-2px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%);
  color: var(--color-primary-600);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.stat-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.stat-card:hover .stat-icon::before {
  opacity: 1;
}

/* 图标类型变体 */
.stat-icon--primary {
  background: linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%);
  color: var(--color-primary-600);
}

.stat-icon--success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.2) 100%);
  color: var(--color-success);
}

.stat-icon--warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.2) 100%);
  color: var(--color-warning);
}

.stat-icon--error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%);
  color: var(--color-error);
}

.stat-icon--info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%);
  color: var(--color-info);
}

.stat-icon--default {
  background: linear-gradient(135deg, var(--color-gray-100) 0%, var(--color-gray-200) 100%);
  color: var(--color-gray-600);
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: 4px;
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap; /* 避免换行导致卡片高度不一致 */
}

/* 趋势指示器 */
.stat-trend {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-sm);
}

.stat-trend--up {
  color: var(--color-success);
}

.stat-trend--down {
  color: var(--color-error);
}

.stat-trend--neutral {
  color: var(--color-text-tertiary);
}

/* 深色主题适配 */
[data-theme="dark"] .stat-card {
  background: var(--glass-bg);
  border-color: var(--glass-border);
}

[data-theme="dark"] .stat-icon {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%);
  color: var(--color-primary-400);
}

[data-theme="dark"] .stat-icon--primary {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%);
  color: var(--color-primary-400);
}

[data-theme="dark"] .stat-icon--success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.3) 100%);
  color: var(--color-success);
}

[data-theme="dark"] .stat-icon--warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.3) 100%);
  color: var(--color-warning);
}

[data-theme="dark"] .stat-icon--error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.3) 100%);
  color: var(--color-error);
}

[data-theme="dark"] .stat-icon--info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%);
  color: var(--color-info);
}

[data-theme="dark"] .stat-icon--default {
  background: linear-gradient(135deg, var(--color-gray-800) 0%, var(--color-gray-700) 100%);
  color: var(--color-gray-400);
}

[data-theme="dark"] .stat-value {
  background: linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

[data-theme="dark"] .stat-label {
  color: var(--color-text-secondary);
}

[data-theme="dark"] .stat-trend {
  background: var(--glass-bg);
  border-color: var(--glass-border);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stat-content {
    padding: 16px;
    gap: 12px;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
    border-radius: var(--radius-md);
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .stat-label {
    font-size: 13px;
  }
  
  .stat-trend {
    top: 8px;
    right: 8px;
    font-size: 11px;
    padding: 3px 6px;
  }
}

@media (max-width: 480px) {
  .stat-content {
    padding: 12px;
    gap: 10px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
  
  .stat-value {
    font-size: 20px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .stat-trend {
    top: 6px;
    right: 6px;
    font-size: 10px;
    padding: 2px 4px;
  }
}
</style>

<style scoped>
/* 紧凑模式（用于移动端三列并排）：改为纵向三行布局 */
.stat-card.compact .stat-content {
  padding: 10px;
  gap: 8px;
  flex-direction: column;      /* 纵向堆叠：图标 / 数字 / 文本 */
  align-items: center;
}
.stat-card.compact { 
  min-height: 120px; /* 保证卡片等高 */
  display: flex;
}
.stat-card.compact :deep(.el-card__body){
  height: 100%;
  display: flex;
  align-items: center;
}
.stat-card.compact .stat-icon {
  width: 32px;
  height: 32px;
  font-size: 16px;
  border-radius: var(--radius-md);
}
.stat-card.compact .stat-info {
  min-width: 0;
  text-align: center;          /* 数字与文字居中 */
}
.stat-card.compact .stat-value {
  font-size: clamp(16px, 4.5vw, 20px);  /* 随屏宽自适应，避免溢出 */
  background: none;
  -webkit-text-fill-color: initial;
  color: var(--color-text-primary);
  margin: 0;                   /* 去掉默认 margin-bottom，保持紧凑 */
  white-space: nowrap;
}
.stat-card.compact .stat-label {
  font-size: 12px;
  white-space: nowrap;
}
</style>