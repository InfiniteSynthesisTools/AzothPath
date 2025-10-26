<template>
  <div id="app">
    <el-config-provider>
      <router-view />
    </el-config-provider>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from '@/stores';
import '@/styles/mobile.css';
import '@/styles/design-system.css';

const userStore = useUserStore();

// 应用初始化
onMounted(() => {
  // 从 localStorage 恢复用户状态
  userStore.init();
});
</script>

<style>
/* 从 CDN 加载 Noto Color Emoji 字体 */
@font-face {
  font-family: 'Noto Color Emoji';
  font-display: swap; /* 字体加载前显示系统字体，加载后无缝切换 */
  src: 
    url('https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/fonts/NotoColorEmoji.ttf') format('truetype'),
    url('https://unpkg.com/noto-color-emoji-font@1.0.2/font/NotoColorEmoji.ttf') format('truetype');
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  /* 文字使用系统字体，emoji 回退到 Noto Color Emoji */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif,
    /* Emoji 字体放在最后，只在显示 emoji 时使用 */
    'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
}

/* 深色模式适配 */
[data-theme="dark"] #app {
  background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
}

/* 统一滚动条样式 - 防止页面切换时闪动 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-tertiary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-secondary);
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-primary);
}

::-webkit-scrollbar-corner {
  background: var(--color-bg-tertiary);
}

/* 深色主题滚动条 */
[data-theme="dark"] ::-webkit-scrollbar-track {
  background: var(--color-bg-tertiary);
}

[data-theme="dark"] ::-webkit-scrollbar-thumb {
  background: var(--color-border-secondary);
}

[data-theme="dark"] ::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-primary);
}

[data-theme="dark"] ::-webkit-scrollbar-corner {
  background: var(--color-bg-tertiary);
}

/* 确保所有页面都有滚动条空间 */
html {
  overflow-y: scroll;
}

body {
  overflow-y: auto;
}

/* 全局表格深色模式样式覆盖 */
[data-theme="dark"] :deep(.el-table) {
  background: var(--color-bg-surface) !important;
  color: var(--color-text-primary) !important;
}

[data-theme="dark"] :deep(.el-table th) {
  background: var(--color-bg-tertiary) !important;
  color: var(--color-text-primary) !important;
}

[data-theme="dark"] :deep(.el-table td) {
  background: var(--color-bg-surface) !important;
  color: var(--color-text-primary) !important;
}

[data-theme="dark"] :deep(.el-table tr) {
  background: var(--color-bg-surface) !important;
}

[data-theme="dark"] :deep(.el-table tr:hover) {
  background: var(--color-bg-tertiary) !important;
}

[data-theme="dark"] :deep(.el-table--striped .el-table__body tr.el-table__row--striped) {
  background: var(--color-bg-tertiary) !important;
}

[data-theme="dark"] :deep(.el-table--striped .el-table__body tr.el-table__row--striped:hover) {
  background: var(--color-bg-secondary) !important;
}
</style>
