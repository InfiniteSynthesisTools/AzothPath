<template>
  <div class="admin-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-emoji">🔧</span>
        管理后台
      </h1>
      <p class="page-subtitle">系统管理、数据监控和用户管理</p>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <StatCard 
            type="primary"
            emoji="📋"
            :value="systemStats.total_recipes"
            label="配方总数"
          />
        </el-col>
        <el-col :span="6">
          <StatCard 
            type="success"
            emoji="🧪"
            :value="systemStats.total_items"
            label="元素总数"
          />
        </el-col>
        <el-col :span="6">
          <StatCard 
            type="info"
            emoji="👥"
            :value="systemStats.total_users"
            label="用户总数"
          />
        </el-col>
        <el-col :span="6">
          <StatCard 
            type="warning"
            emoji="🔄"
            :value="systemStats.active_tasks"
            label="活跃任务"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 管理功能选项卡 -->
    <div class="admin-tabs">
      <el-tabs v-model="activeTab" type="card" class="admin-tabs-container">
        <el-tab-pane label="👥 用户管理" name="users">
          <UserManagement />
        </el-tab-pane>
        
        <el-tab-pane label="📋 配方管理" name="recipes">
          <RecipeManagement />
        </el-tab-pane>
        
        <el-tab-pane label="🧪 元素管理" name="elements">
          <ElementManagement />
        </el-tab-pane>
        
        <el-tab-pane label="🏷️ 标签管理" name="tags">
          <TagManagement />
        </el-tab-pane>
        
        <el-tab-pane label="📊 任务管理" name="tasks">
          <TaskManagement />
        </el-tab-pane>
        
        <el-tab-pane label="📢 通知管理" name="notifications">
          <NotificationManagement />
        </el-tab-pane>
        
        <el-tab-pane label="⚙️ 系统详情" name="system">
          <SystemDetails />
        </el-tab-pane>
        
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

import { recipeApi, taskApi, userApi } from '@/api';
import StatCard from '@/components/StatCard.vue';
import UserManagement from '@/components/admin/UserManagement.vue';
import RecipeManagement from '@/components/admin/RecipeManagement.vue';
import TaskManagement from '@/components/admin/TaskManagement.vue';
import TagManagement from '@/components/admin/TagManagement.vue';
import ElementManagement from '@/components/admin/ElementManagement.vue';
import SystemDetails from '@/components/admin/SystemDetails.vue';
import NotificationManagement from '@/components/admin/NotificationManagement.vue';

// 响应式数据
const activeTab = ref('users'); // 默认显示用户管理
const systemStats = ref({
  total_recipes: 0,
  total_items: 0,
  total_users: 0,
  active_tasks: 0,
  reachable_items: 0,
  unreachable_items: 0
});

const loadSystemStats = async () => {
  try {
    // 加载配方统计
    const recipeStats = await recipeApi.getGraphStats();
    // 响应拦截器已经处理了数据结构，直接使用recipeStats
    systemStats.value = {
      ...systemStats.value,
      ...recipeStats
    };

    // 加载任务统计
    const taskStats = await taskApi.getStats();
    // 响应拦截器已经处理了数据结构，直接使用taskStats
    systemStats.value.active_tasks = taskStats.active || 0;

    // 加载用户统计 - 使用贡献榜API获取用户总数（不需要管理员权限）
    const userStats = await userApi.getContributionRank({ page: 1, limit: 1 }) as any;
    console.log('用户统计API响应:', userStats);
    // 根据控制台日志，total直接在响应对象中，不在data中
    systemStats.value.total_users = userStats.total || 0;
    console.log('设置用户总数:', systemStats.value.total_users);

  } catch (error) {
    console.error('加载系统统计失败:', error);
    ElMessage.error('加载系统统计失败');
  }
};

// 生命周期
onMounted(() => {
  loadSystemStats();
});
</script>

<style scoped>
.admin-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 24px;
  text-align: center;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.title-emoji {
  font-size: 36px;
  margin-right: 12px;
  display: inline-block;
  -webkit-text-fill-color: initial !important;
  background: none !important;
  background-clip: initial !important;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.stats-overview {
  margin-bottom: 30px;
}

.admin-tabs {
  margin-top: 30px;
}

.admin-tabs-container {
  min-height: 500px;
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border-primary);
}

:deep(.el-tabs__content) {
  padding: 20px 0;
  background: var(--color-bg-surface);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }
  
  .page-subtitle {
    font-size: 14px;
    margin-bottom: 16px;
  }
  
  .page-header {
    margin-bottom: 20px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 20px;
  }
  
  .page-subtitle {
    font-size: 13px;
    margin-bottom: 12px;
  }
  
  .page-header {
    margin-bottom: 16px;
  }
}
</style>
