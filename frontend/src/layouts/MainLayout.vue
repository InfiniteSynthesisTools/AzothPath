<template>
  <div class="main-layout">
    <!-- 全局导航栏 -->
    <el-header class="header">
      <div class="header-content">
        <!-- 移动端菜单按钮 -->
        <el-button 
          class="mobile-menu-btn" 
          text 
          @click="mobileMenuVisible = true"
        >
          <el-icon :size="24"><Menu /></el-icon>
        </el-button>
        
        <div class="logo" @click="router.push('/')">
          <h1>Azoth Path</h1>
          <span class="subtitle">无尽合成工具站</span>
        </div>
        
        <!-- 桌面端导航菜单 -->
        <el-menu mode="horizontal" :default-active="activeMenu" router class="nav-menu desktop-only">
          <el-menu-item index="/">首页</el-menu-item>
          <el-menu-item index="/elements">元素</el-menu-item>
          <el-menu-item index="/tasks">任务</el-menu-item>
          <el-menu-item index="/import" v-if="userStore.isLoggedIn">导入</el-menu-item>
          <el-menu-item index="/contribution">贡献榜</el-menu-item>
          <el-menu-item index="/admin" v-if="userStore.isAdmin">管理</el-menu-item>
          <el-menu-item index="/graph">总图显示</el-menu-item>
          <el-menu-item>
            <a href="https://hc.tsdo.in/" target="_blank" style="text-decoration: none; color: inherit;">
              开始游戏 🎮
            </a>
          </el-menu-item>
        </el-menu>
        
        <div class="user-actions">
          <!-- 主题切换按钮 -->
          <ThemeToggle class="theme-toggle-wrapper" />
          
          <template v-if="userStore.isLoggedIn">
            <el-dropdown>
              <span class="user-info">
                <span class="user-avatar" :title="userStore.userInfo?.name">
                  {{ userStore.userInfo?.emoji || '🙂' }}
                </span>
                <span class="user-name">{{ userStore.userInfo?.name }}</span>
                <span class="user-level">Lv.{{ userStore.userInfo?.level }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="goToProfile">
                    <el-icon><User /></el-icon>
                    个人中心
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <el-button class="mobile-hidden" @click="router.push('/login')">登录</el-button>
            <el-button type="primary" @click="router.push('/register')">注册</el-button>
          </template>
        </div>
      </div>
    </el-header>
    
    <!-- 移动端抽屉菜单 -->
    <el-drawer
      v-model="mobileMenuVisible"
      direction="ltr"
      :size="280"
      class="mobile-menu-drawer"
    >
      <template #header>
        <div class="mobile-menu-header">
          <h3>✨ Azoth Path</h3>
        </div>
      </template>
      <el-menu 
        :default-active="activeMenu" 
        router 
        @select="mobileMenuVisible = false"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/elements">
          <el-icon><Document /></el-icon>
          <span>元素</span>
        </el-menu-item>
        <el-menu-item index="/tasks">
          <el-icon><Tickets /></el-icon>
          <span>任务</span>
        </el-menu-item>
        <el-menu-item index="/import" v-if="userStore.isLoggedIn">
          <el-icon><Upload /></el-icon>
          <span>导入</span>
        </el-menu-item>
        <el-menu-item index="/admin" v-if="userStore.isAdmin">
          <el-icon><Setting /></el-icon>
          <span>管理</span>
        </el-menu-item>
        <el-menu-item index="/graph">
          <el-icon><TrendCharts /></el-icon>
          <span>总图显示</span>
        </el-menu-item>
        <el-divider />
        <el-menu-item>
          <a href="https://hc.tsdo.in/" target="_blank" style="text-decoration: none; color: inherit; display: flex; align-items: center;">
            <span>开始游戏 🎮</span>
          </a>
        </el-menu-item>
        <el-divider v-if="!userStore.isLoggedIn" />
        <el-menu-item v-if="!userStore.isLoggedIn" index="/login">
          <el-icon><User /></el-icon>
          <span>登录</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>

    <!-- 内容区域 -->
    <div class="main-content" :class="{ 'with-sidebar': sidebarVisible }">
      <router-view :key="$route.fullPath" />
    </div>

    <!-- 侧边栏 -->
    <Sidebar 
      v-if="userStore.isLoggedIn"
      v-model:visible="sidebarVisible"
      :has-unread-notifications="hasUnreadNotifications"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores';
import { ElMessage } from 'element-plus';
import { 
  User, 
  SwitchButton, 
  Menu, 
  HomeFilled, 
  Document, 
  Tickets, 
  Upload, 
  Setting,
  TrendCharts
} from '@element-plus/icons-vue';
import Sidebar from '@/components/Sidebar.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// 侧边栏状态
const sidebarVisible = ref(false);
const hasUnreadNotifications = ref(false);

// 移动端菜单状态
const mobileMenuVisible = ref(false);

// 当前激活的菜单项
const activeMenu = computed(() => route.path);

// 监听路由变化，确保组件正确刷新
watch(() => route.fullPath, (newPath, oldPath) => {
  console.log('路由变化:', { oldPath, newPath });
  // 如果路由变化但组件没有刷新，强制重新加载
  if (newPath !== oldPath && location.pathname !== newPath) {
    console.warn('路由不匹配，强制刷新:', { vuePath: newPath, browserPath: location.pathname });
    // 强制同步浏览器地址栏和 Vue Router
    if (location.pathname !== newPath) {
      location.href = newPath;
    }
  }
});

// 添加全局点击事件监听器，确保导航链接正常工作
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const link = target.closest('a[href]');
  
  if (link && link.getAttribute('href')?.startsWith('/')) {
    const href = link.getAttribute('href');
    if (href && href !== route.path) {
      console.log('检测到导航链接点击:', href);
      // 确保 Vue Router 处理导航
      event.preventDefault();
      router.push(href);
    }
  }
});

// 跳转到个人中心
const goToProfile = () => {
  if (userStore.userInfo?.id) {
    router.push(`/profile/${userStore.userInfo.id}`);
  } else {
    router.push('/profile');
  }
};

// 退出登录
const handleLogout = () => {
  userStore.logout();
  ElMessage.success('已退出登录');
  router.push('/');
};
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-md);
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 60px;
  border-bottom: 1px solid var(--color-border-primary);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 20px;
  gap: 20px;
  background: var(--color-bg-surface);
}

/* 移动端菜单按钮 */
.mobile-menu-btn {
  display: none;
  padding: 8px;
  margin-right: -8px;
  color: var(--color-text-primary);
  transition: all var(--transition-base);
}

.mobile-menu-btn:hover {
  color: var(--color-primary-600);
  transform: scale(1.1);
}

.logo {
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.logo h1 {
  font-size: 24px;
  color: var(--color-primary-600);
  margin: 0;
  line-height: 1.2;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
  display: block;
}

.nav-menu {
  flex: 1;
  border: none;
  background: transparent;
}

:deep(.nav-menu .el-menu-item) {
  color: var(--color-text-secondary);
  font-weight: 500;
  transition: all var(--transition-base);
}

:deep(.nav-menu .el-menu-item:hover) {
  color: var(--color-primary-600);
  background: var(--color-primary-50);
}

:deep(.nav-menu .el-menu-item.is-active) {
  color: var(--color-primary-600);
  background: var(--color-primary-50);
  border-bottom: 2px solid var(--color-primary-500);
}

[data-theme="dark"] :deep(.nav-menu .el-menu-item:hover),
[data-theme="dark"] :deep(.nav-menu .el-menu-item.is-active) {
  background: var(--color-primary-900);
}

.user-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.theme-toggle-wrapper {
  margin-right: 8px;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-base);
  transition: all var(--transition-base);
  color: var(--color-text-primary);
}

.user-info:hover {
  background-color: var(--color-bg-tertiary);
  transform: translateY(-1px);
}

.user-level {
  font-size: 12px;
  color: var(--color-primary-500);
  font-weight: bold;
  background: var(--color-primary-100);
  padding: 2px 6px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-primary-200);
}

[data-theme="dark"] .user-level {
  background: var(--color-primary-900);
  border-color: var(--color-primary-700);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary);
  box-shadow: inset 0 0 0 1px var(--color-border-primary);
  font-size: 16px;
  line-height: 1;
  transition: all var(--transition-base);
}

.user-info:hover .user-avatar {
  transform: scale(1.1);
  box-shadow: inset 0 0 0 1px var(--color-primary-300), var(--shadow-sm);
}

.main-content {
  flex: 1;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  transition: margin-right 0.3s ease;
}

.main-content.with-sidebar {
  margin-right: 320px;
}

/* 移动端抽屉菜单样式 */
.mobile-menu-header h3 {
  margin: 0;
  color: var(--color-primary-600);
  font-size: 20px;
  font-weight: 700;
}

:deep(.mobile-menu-drawer .el-menu) {
  border-right: none;
  background: var(--color-bg-surface);
}

:deep(.mobile-menu-drawer .el-menu-item) {
  color: var(--color-text-primary);
  transition: all var(--transition-base);
}

:deep(.mobile-menu-drawer .el-menu-item:hover) {
  color: var(--color-primary-600);
  background: var(--color-primary-50);
}

[data-theme="dark"] :deep(.mobile-menu-drawer .el-menu-item:hover) {
  background: var(--color-primary-900);
}

:deep(.mobile-menu-drawer .el-menu-item) {
  height: 50px;
  line-height: 50px;
  font-size: 16px;
}

/* ========== 响应式设计 ========== */

/* 平板端 (768px - 1024px) */
@media (max-width: 1024px) {
  .header-content {
    padding: 0 15px;
    gap: 15px;
  }
  
  .nav-menu {
    display: none;
  }
  
  .main-content.with-sidebar {
    margin-right: 0;
  }
}

/* 移动端 (< 768px) */
@media (max-width: 768px) {
  .header {
    height: 56px;
  }
  
  .header-content {
    padding: 0 12px;
    gap: 12px;
  }
  
  /* 显示移动端菜单按钮 */
  .mobile-menu-btn {
    display: block;
  }
  
  /* 隐藏桌面端导航 */
  .desktop-only {
    display: none !important;
  }
  
  .logo h1 {
    font-size: 18px;
  }
  
  .subtitle {
    display: none;
  }
  
  .user-actions {
    gap: 6px;
  }
  
  .user-info {
    padding: 6px 8px;
    gap: 4px;
  }
  
  /* 隐藏用户名，只显示图标和等级 */
  .user-name {
    display: none;
  }
  
  .user-level {
    font-size: 11px;
  }

  .user-avatar {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }
  
/* 隐藏移动端的登录按钮 */
.mobile-hidden {
  display: none;
}

  .user-actions .el-button {
    padding: 8px 12px;
    font-size: 14px;
    transition: all var(--transition-base);
  }

  .user-actions .el-button:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  .main-content.with-sidebar {
    margin-right: 0;
  }
  
  /* 移动端主题切换按钮优化 */
  .theme-toggle-wrapper {
    margin-right: 4px;
  }
}/* 小屏手机 (< 375px) */
@media (max-width: 375px) {
  .header-content {
    padding: 0 8px;
    gap: 8px;
  }
  
  .logo h1 {
    font-size: 16px;
  }
  
  .user-actions .el-button {
    padding: 6px 10px;
    font-size: 13px;
  }
  
  /* 小屏手机主题切换按钮优化 */
  .theme-toggle-wrapper {
    margin-right: 2px;
  }
}
</style>
