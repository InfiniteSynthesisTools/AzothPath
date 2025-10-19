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
  background-color: #f5f7fa;
}
</style>
