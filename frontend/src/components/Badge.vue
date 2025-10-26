<template>
  <div 
    class="badge" 
    :class="[
      `badge--${type}`,
      `badge--${size}`,
      { 'badge--clickable': clickable }
    ]"
    @click="$emit('click', $event)"
  >
    <span v-if="emoji" class="badge__emoji">{{ emoji }}</span>
    <span class="badge__text">{{ text }}</span>
    <span v-if="count !== undefined" class="badge__count">{{ count }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  emoji?: string;
  text: string;
  count?: number;
  clickable?: boolean;
}

withDefaults(defineProps<Props>(), {
  type: 'default',
  size: 'md',
  clickable: false
});

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 12px;
  line-height: 1;
  transition: all var(--transition-base);
  border: 1px solid transparent;
  background: linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%);
  color: var(--color-primary-700);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

.badge::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.badge:hover::before {
  opacity: 1;
}

/* 类型变体 */
.badge--primary {
  background: linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%);
  color: var(--color-primary-700);
  border-color: var(--color-primary-200);
}

.badge--success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.2) 100%);
  color: var(--color-success);
  border-color: rgba(34, 197, 94, 0.3);
}

.badge--warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.2) 100%);
  color: var(--color-warning);
  border-color: rgba(245, 158, 11, 0.3);
}

.badge--error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%);
  color: var(--color-error);
  border-color: rgba(239, 68, 68, 0.3);
}

.badge--info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%);
  color: var(--color-info);
  border-color: rgba(59, 130, 246, 0.3);
}

.badge--default {
  background: linear-gradient(135deg, var(--color-gray-100) 0%, var(--color-gray-200) 100%);
  color: var(--color-gray-700);
  border-color: var(--color-gray-200);
}

/* 尺寸变体 */
.badge--sm {
  padding: 4px 8px;
  font-size: 11px;
  gap: 4px;
}

.badge--lg {
  padding: 8px 16px;
  font-size: 14px;
  gap: 8px;
}

/* 可点击状态 */
.badge--clickable {
  cursor: pointer;
}

.badge--clickable:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.badge--clickable:active {
  transform: translateY(0);
}

/* 徽章元素 */
.badge__emoji {
  font-size: 14px;
  line-height: 1;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
}

.badge--sm .badge__emoji {
  font-size: 12px;
}

.badge--lg .badge__emoji {
  font-size: 16px;
}

.badge__text {
  white-space: nowrap;
}

.badge__count {
  background: rgba(255, 255, 255, 0.8);
  border-radius: var(--radius-full);
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.badge--sm .badge__count {
  padding: 1px 4px;
  font-size: 9px;
  min-width: 16px;
}

.badge--lg .badge__count {
  padding: 3px 8px;
  font-size: 12px;
  min-width: 20px;
}

/* 深色主题适配 */
[data-theme="dark"] .badge {
  box-shadow: var(--shadow-sm);
}

[data-theme="dark"] .badge--primary {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%);
  color: var(--color-primary-300);
  border-color: rgba(59, 130, 246, 0.4);
}

[data-theme="dark"] .badge--success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.3) 100%);
  color: var(--color-success);
  border-color: rgba(34, 197, 94, 0.4);
}

[data-theme="dark"] .badge--warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.3) 100%);
  color: var(--color-warning);
  border-color: rgba(245, 158, 11, 0.4);
}

[data-theme="dark"] .badge--error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.3) 100%);
  color: var(--color-error);
  border-color: rgba(239, 68, 68, 0.4);
}

[data-theme="dark"] .badge--info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%);
  color: var(--color-info);
  border-color: rgba(59, 130, 246, 0.4);
}

[data-theme="dark"] .badge--default {
  background: linear-gradient(135deg, var(--color-gray-800) 0%, var(--color-gray-700) 100%);
  color: var(--color-gray-300);
  border-color: var(--color-gray-600);
}

[data-theme="dark"] .badge__count {
  background: rgba(0, 0, 0, 0.3);
  color: var(--color-text-primary);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .badge {
    padding: 5px 10px;
    font-size: 11px;
    gap: 5px;
  }
  
  .badge--sm {
    padding: 3px 6px;
    font-size: 10px;
    gap: 3px;
  }
  
  .badge--lg {
    padding: 7px 14px;
    font-size: 13px;
    gap: 7px;
  }
  
  .badge__emoji {
    font-size: 13px;
  }
  
  .badge--sm .badge__emoji {
    font-size: 11px;
  }
  
  .badge--lg .badge__emoji {
    font-size: 15px;
  }
}
</style>