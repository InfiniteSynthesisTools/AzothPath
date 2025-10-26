<template>
  <div class="theme-toggle-container">
    <button
      class="theme-toggle"
      :class="{ 'theme-switching': switching }"
      @click="toggleTheme"
      :title="currentTheme === 'light' ? '切换到深色模式' : '切换到浅色模式'"
      aria-label="切换主题"
    >
      <span class="theme-toggle-track">
        <span class="theme-toggle-thumb">
          <span class="theme-icon sun">☀️</span>
          <span class="theme-icon moon">🌙</span>
        </span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const currentTheme = ref<'light' | 'dark'>('light');
const switching = ref(false);

// 从 localStorage 获取主题设置
const getStoredTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem('azothpath-theme');
  return (stored as 'light' | 'dark') || 'light';
};

// 设置主题
const setTheme = (theme: 'light' | 'dark') => {
  const html = document.documentElement;
  
  // 添加切换动画类
  switching.value = true;
  
  // 设置主题属性
  html.setAttribute('data-theme', theme);
  currentTheme.value = theme;
  
  // 保存到 localStorage
  localStorage.setItem('azothpath-theme', theme);
  
  // 移除动画类
  setTimeout(() => {
    switching.value = false;
  }, 500);
};

// 切换主题
const toggleTheme = () => {
  const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
};

// 监听系统主题变化
const watchSystemTheme = () => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e: MediaQueryListEvent) => {
    // 只有在用户没有手动设置主题时才跟随系统
    const storedTheme = localStorage.getItem('azothpath-theme');
    if (!storedTheme) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  };
  
  mediaQuery.addEventListener('change', handleChange);
};

// 初始化主题
onMounted(() => {
  const storedTheme = getStoredTheme();
  
  // 如果没有存储的主题，检查系统偏好
  if (!storedTheme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  } else {
    setTheme(storedTheme);
  }
  
  // 监听系统主题变化
  watchSystemTheme();
});
</script>

<style scoped>
.theme-toggle-container {
  display: inline-flex;
  align-items: center;
}

.theme-toggle {
  position: relative;
  width: 52px;
  height: 28px;
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-full);
  background: var(--color-bg-surface);
  cursor: pointer;
  transition: all var(--transition-base);
  overflow: hidden;
  padding: 0;
  outline: none;
  box-shadow: var(--shadow-sm);
}

.theme-toggle:hover {
  border-color: var(--color-border-accent);
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

.theme-toggle-track {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%);
  transition: all var(--transition-base);
}

[data-theme="dark"] .theme-toggle-track {
  background: linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-900) 100%);
}

.theme-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-bg-primary);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-bounce);
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(0);
}

[data-theme="dark"] .theme-toggle-thumb {
  transform: translateX(24px);
  background: var(--color-bg-primary);
}

.theme-icon {
  font-size: 12px;
  line-height: 1;
  transition: all var(--transition-base);
  position: absolute;
}

.theme-icon.sun {
  opacity: 1;
  transform: scale(1);
}

.theme-icon.moon {
  opacity: 0;
  transform: scale(0.5);
}

[data-theme="dark"] .theme-icon.sun {
  opacity: 0;
  transform: scale(0.5);
}

[data-theme="dark"] .theme-icon.moon {
  opacity: 1;
  transform: scale(1);
}

/* 切换动画 */
.theme-switching {
  animation: theme-pulse 0.5s ease-in-out;
}

@keyframes theme-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .theme-toggle {
    width: 48px;
    height: 24px;
  }
  
  .theme-toggle-thumb {
    width: 18px;
    height: 18px;
  }
  
  [data-theme="dark"] .theme-toggle-thumb {
    transform: translateX(22px);
  }
  
  .theme-icon {
    font-size: 9px;
  }
}
</style>