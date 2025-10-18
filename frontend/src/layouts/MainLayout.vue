<template>
  <div class="main-layout">
    <!-- 全局导航栏 -->
    <el-header class="header">
      <div class="header-content">
        <div class="logo" @click="router.push('/')">
          <h1>✨ Azoth Path</h1>
          <span class="subtitle">无尽合成工具站</span>
        </div>
        <el-menu mode="horizontal" :default-active="activeMenu" router class="nav-menu">
          <el-menu-item index="/">首页</el-menu-item>
          <el-menu-item index="/recipes">配方列表</el-menu-item>
          <el-menu-item index="/tasks">任务看板</el-menu-item>
          <el-menu-item index="/import" v-if="userStore.isLoggedIn">导入配方</el-menu-item>
          <el-menu-item index="/contribution">贡献榜</el-menu-item>
          <el-menu-item index="/admin" v-if="userStore.isAdmin">管理后台</el-menu-item>
        </el-menu>
        <div class="user-actions">
          <template v-if="userStore.isLoggedIn">
            <el-dropdown>
              <span class="user-info">
                <el-icon><User /></el-icon>
                {{ userStore.userInfo?.name }}
                <span class="user-level">Lv.{{ userStore.userInfo?.level }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="router.push('/profile')">
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
            <el-button @click="router.push('/login')">登录</el-button>
            <el-button type="primary" @click="router.push('/register')">注册</el-button>
          </template>
        </div>
      </div>
    </el-header>

    <!-- 内容区域 -->
    <div class="main-content">
      <router-view />
    </div>

    <!-- 全局页脚 -->
    <el-footer class="footer">
      <div class="footer-content">
        <p>© 2025 Azoth Path - 社区驱动的无尽合成工具站</p>
        <div class="footer-links">
          <a href="https://github.com/InfiniteSynthesisTools/AzothPath" target="_blank">GitHub</a>
          <span>|</span>
          <a @click="router.push('/about')">关于我们</a>
        </div>
      </div>
    </el-footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores';
import { ElMessage } from 'element-plus';
import { User, SwitchButton } from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// 当前激活的菜单项
const activeMenu = computed(() => route.path);

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
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 1000;
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
}

.logo {
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.logo h1 {
  font-size: 24px;
  color: #409eff;
  margin: 0;
  line-height: 1.2;
}

.subtitle {
  font-size: 12px;
  color: #909399;
  display: block;
}

.nav-menu {
  flex: 1;
  border: none;
}

.user-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.user-level {
  font-size: 12px;
  color: #409eff;
  font-weight: bold;
}

.main-content {
  flex: 1;
  background-color: #f5f7fa;
}

.footer {
  background: #303133;
  color: white;
  text-align: center;
  padding: 30px 20px;
  margin-top: auto;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
}

.footer-content p {
  margin: 0 0 10px 0;
}

.footer-links {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.footer-links a {
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
}

.footer-links a:hover {
  text-decoration: underline;
}

.footer-links span {
  color: #909399;
}
</style>
