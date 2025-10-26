<template>
  <span 
    :class="['emoji-wrapper', size]"
    :title="fallbackText"
  >
    <!-- 尝试显示 emoji -->
    <span 
      v-if="emoji" 
      class="emoji-icon"
      :style="{ fontSize: computedSize }"
      ref="emojiRef"
    >
      {{ emoji }}
    </span>
    
    <!-- 回退方案：显示首字母或默认图标 -->
    <span 
      v-else-if="fallbackText" 
      class="emoji-fallback"
      :style="{ fontSize: computedSize }"
    >
      {{ fallbackText.charAt(0) }}
    </span>
    
    <!-- 最终回退：问号图标 -->
    <span v-else class="emoji-empty">❓</span>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  emoji?: string;           // emoji 字符
  fallbackText?: string;    // 回退文本（物品名称）
  size?: 'small' | 'medium' | 'large';  // 尺寸
}

const props = withDefaults(defineProps<Props>(), {
  emoji: '',
  fallbackText: '',
  size: 'medium'
});

const emojiRef = ref<HTMLElement | null>(null);

const computedSize = computed(() => {
  switch (props.size) {
    case 'small': return '16px';
    case 'large': return '32px';
    default: return '20px';
  }
});

// 检测 emoji 是否能正常渲染（可选的高级功能）
const checkEmojiSupport = () => {
  if (!emojiRef.value || !props.emoji) return;
  
  // 使用 Canvas API 检测 emoji 是否能渲染（仅在需要时启用）
  // 暂时跳过检测，依赖浏览器原生渲染
};

onMounted(() => {
  checkEmojiSupport();
});
</script>

<style scoped>
.emoji-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.emoji-icon {
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
  font-variant-emoji: emoji;
  line-height: 1;
  display: inline-block;
}

.emoji-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2em;
  height: 1.2em;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
  color: white;
  font-weight: 600;
  font-size: 0.8em;
  text-transform: uppercase;
}

.emoji-empty {
  opacity: 0.5;
  filter: grayscale(100%);
}

/* 尺寸变体 */
.small .emoji-fallback {
  width: 1.1em;
  height: 1.1em;
  font-size: 0.7em;
}

.large .emoji-fallback {
  width: 1.3em;
  height: 1.3em;
  font-size: 0.85em;
}
</style>
