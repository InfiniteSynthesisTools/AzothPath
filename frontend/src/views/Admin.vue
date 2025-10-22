<template>
  <div class="admin-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>🔧 管理后台</h1>
      <p>系统管理、数据监控和用户管理</p>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic 
              :value="systemStats.total_recipes" 
              title="配方总数"
              :precision="0"
            >
              <template #prefix>
                <el-icon><Document /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic 
              :value="systemStats.total_items" 
              title="元素总数"
              :precision="0"
            >
              <template #prefix>
                <el-icon><Box /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic 
              :value="systemStats.total_users" 
              title="用户总数"
              :precision="0"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic 
              :value="systemStats.active_tasks" 
              title="活跃任务"
              :precision="0"
            >
              <template #prefix>
                <el-icon><Clock /></el-icon>
              </template>
            </el-statistic>
          </el-card>
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
        
        <el-tab-pane label="📊 任务管理" name="tasks">
          <TaskManagement />
        </el-tab-pane>
        
        <el-tab-pane label="🏷️ 标签管理" name="tags">
          <TagManagement />
        </el-tab-pane>
        
        <el-tab-pane label="🧪 元素列表" name="elements">
          <ElementManagement />
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
import { Document, Box, User, Clock } from '@element-plus/icons-vue';
import { recipeApi, taskApi, userApi } from '@/api';
import UserManagement from '@/components/admin/UserManagement.vue';
import RecipeManagement from '@/components/admin/RecipeManagement.vue';
import TaskManagement from '@/components/admin/TaskManagement.vue';
import TagManagement from '@/components/admin/TagManagement.vue';
import ElementManagement from '@/components/admin/ElementManagement.vue';
import SystemDetails from '@/components/admin/SystemDetails.vue';

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

    // 加载用户统计
    const userStats = await userApi.getUserCount();
    systemStats.value.total_users = userStats.data?.total_users || 0;

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
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: #303133;
}

.page-header p {
  color: #606266;
  font-size: 1.1rem;
}

.stats-overview {
  margin-bottom: 30px;
}

.stat-card {
  text-align: center;
}

.admin-tabs {
  margin-top: 30px;
}

.admin-tabs-container {
  min-height: 500px;
}

:deep(.el-tabs__content) {
  padding: 20px 0;
}
</style>
