<template>
  <div class="profile-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>个人中心</h1>
      <p class="page-subtitle">管理您的个人信息和收藏</p>
    </div>

    <div class="profile-content">
      <!-- 左侧：个人信息面板 -->
      <div class="profile-left">
        <!-- 用户信息卡片 -->
        <el-card class="user-info-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">个人信息</span>
              <el-button 
                type="primary" 
                size="small" 
                @click="showEditDialog = true"
                :disabled="!userStore.isLoggedIn"
              >
                编辑信息
              </el-button>
            </div>
          </template>

          <div class="user-info-content" v-if="userStore.userInfo">
            <div class="user-avatar">
              <el-avatar :size="80" :style="{ backgroundColor: '#409eff' }">
                {{ userStore.userInfo.name.charAt(0).toUpperCase() }}
              </el-avatar>
            </div>
            
            <div class="user-details">
              <div class="user-field">
                <label>用户名</label>
                <span class="user-value">{{ userStore.userInfo.name }}</span>
              </div>
              
              <div class="user-field">
                <label>用户等级</label>
                <span class="user-value level-badge">Lv.{{ userStore.userInfo.level }}</span>
              </div>
              
              <div class="user-field">
                <label>贡献积分</label>
                <span class="user-value contribute-value">{{ userStore.userInfo.contribute }}</span>
              </div>
              
              <div class="user-field">
                <label>注册时间</label>
                <span class="user-value">{{ formatDate(userStore.userInfo.created_at) }}</span>
              </div>
              
              <div class="user-field">
                <label>用户权限</label>
                <span class="user-value">
                  <el-tag :type="userStore.isAdmin ? 'danger' : 'success'" size="small">
                    {{ userStore.isAdmin ? '管理员' : '普通用户' }}
                  </el-tag>
                </span>
              </div>
            </div>
          </div>

          <div v-else class="not-logged-in">
            <el-empty description="请先登录" />
            <el-button type="primary" @click="$router.push('/login')">立即登录</el-button>
          </div>
        </el-card>

        <!-- 贡献统计卡片 -->
        <el-card class="stats-card" v-if="userStore.isLoggedIn">
          <template #header>
            <div class="card-header">
              <span class="card-title">贡献统计</span>
            </div>
          </template>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ userStats.recipe_count || 0 }}</div>
              <div class="stat-label">提交配方</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ userStats.item_count || 0 }}</div>
              <div class="stat-label">发现物品</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ userStats.task_completed || 0 }}</div>
              <div class="stat-label">完成任务</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ userStats.total_contribution || 0 }}</div>
              <div class="stat-label">总贡献</div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 右侧：收藏配方和收件箱 -->
      <div class="profile-right" v-if="userStore.isLoggedIn">
        <!-- 收件箱卡片 -->
        <el-card class="inbox-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">收件箱</span>
              <span class="card-subtitle">已归档的消息</span>
            </div>
          </template>

          <div class="inbox-content">
            <div v-if="archivedNotifications.length === 0" class="empty-container">
              <el-empty description="没有归档的消息" />
            </div>

            <div v-else class="notifications-list">
              <div 
                v-for="notification in archivedNotifications" 
                :key="notification.id" 
                class="notification-item"
                :class="{ 'read': notification.read }"
              >
                <div class="notification-content">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-message">{{ notification.message }}</div>
                  <div class="notification-meta">
                    <span class="notification-time">{{ formatRelativeTime(notification.time) }}</span>
                    <span class="notification-status">
                      <el-tag v-if="notification.archived" size="small" type="info">已归档</el-tag>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 收藏配方卡片 -->
        <el-card class="liked-recipes-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">我的收藏</span>
              <span class="card-subtitle">点赞过的配方</span>
            </div>
          </template>

          <div class="liked-recipes-content">
            <div v-if="likedRecipesLoading" class="loading-container">
              <el-skeleton :rows="5" animated />
            </div>

            <div v-else-if="likedRecipes.length === 0" class="empty-container">
              <el-empty description="还没有收藏任何配方" />
              <p class="empty-tip">去配方列表给喜欢的配方点个赞吧！</p>
            </div>

            <div v-else class="recipes-list">
              <div 
                v-for="recipe in likedRecipes" 
                :key="recipe.id" 
                class="recipe-item"
                @click="$router.push(`/recipes/${recipe.id}`)"
              >
                <div class="recipe-content">
                  <div class="recipe-formula">
                    <span class="material">{{ recipe.item_a }}</span>
                    <span class="plus">+</span>
                    <span class="material">{{ recipe.item_b }}</span>
                    <span class="equals">=</span>
                    <span class="result">{{ recipe.result }}</span>
                  </div>
                  <div class="recipe-meta">
                    <span class="creator">由 {{ recipe.creator_name }} 创建</span>
                    <span class="likes">
                      <el-icon><Star /></el-icon>
                      {{ recipe.likes }}
                    </span>
                    <span class="liked-time">{{ formatRelativeTime(recipe.liked_at) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 分页 -->
            <div class="pagination-container" v-if="likedRecipesTotal > 0">
              <el-pagination
                v-model:current-page="likedRecipesPage"
                :page-size="likedRecipesLimit"
                :total="likedRecipesTotal"
                layout="prev, pager, next, total"
                @current-change="loadLikedRecipes"
              />
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 编辑信息对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑个人信息"
      width="500px"
      :before-close="handleEditDialogClose"
    >
      <div class="edit-form">
        <el-form :model="editForm" label-width="80px">
          <el-form-item label="用户名">
            <el-input v-model="editForm.name" disabled />
            <div class="form-tip">用户名不可修改</div>
          </el-form-item>
          
          <el-form-item label="等级">
            <el-input-number v-model="editForm.level" :min="1" :max="100" disabled />
            <div class="form-tip">等级由系统自动计算</div>
          </el-form-item>
          
          <el-form-item label="贡献积分">
            <el-input v-model="editForm.contribute" disabled />
            <div class="form-tip">贡献积分由系统自动计算</div>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" @click="showEditDialog = false" :disabled="true">
            保存（功能开发中）
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores';
import { userApi } from '@/api';
import { ElMessage } from 'element-plus';
import { Star } from '@element-plus/icons-vue';
import type { User } from '@/types';

const router = useRouter();
const userStore = useUserStore();

// 用户统计信息
const userStats = ref({
  total_contribution: 0,
  recipe_count: 0,
  item_count: 0,
  task_completed: 0
});

// 收藏配方相关
const likedRecipes = ref<any[]>([]);
const likedRecipesLoading = ref(false);
const likedRecipesPage = ref(1);
const likedRecipesLimit = ref(10);
const likedRecipesTotal = ref(0);

// 编辑对话框
const showEditDialog = ref(false);
const editForm = ref({
  name: '',
  level: 1,
  contribute: 0
});

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// 格式化相对时间
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周前`;
  } else {
    return formatDate(dateString);
  }
};

// 加载用户统计信息
const loadUserStats = async () => {
  if (!userStore.userInfo) return;
  
  try {
    console.log('Loading user stats for user ID:', userStore.userInfo.id);
    const response = await userApi.getUserStats(userStore.userInfo.id);
    console.log('User stats response:', response);
    userStats.value = response.stats;
  } catch (error) {
    console.error('Failed to load user stats:', error);
  }
};

// 加载收藏配方
const loadLikedRecipes = async () => {
  if (!userStore.userInfo) return;
  
  likedRecipesLoading.value = true;
  try {
    const response = await userApi.getLikedRecipes(userStore.userInfo.id, {
      page: likedRecipesPage.value,
      limit: likedRecipesLimit.value
    });
    
    likedRecipes.value = response.recipes;
    likedRecipesTotal.value = response.total;
  } catch (error) {
    console.error('Failed to load liked recipes:', error);
    ElMessage.error('加载收藏配方失败');
  } finally {
    likedRecipesLoading.value = false;
  }
};

// 初始化编辑表单
const initEditForm = () => {
  if (userStore.userInfo) {
    editForm.value = {
      name: userStore.userInfo.name,
      level: userStore.userInfo.level,
      contribute: userStore.userInfo.contribute
    };
  }
};

// 处理编辑对话框关闭
const handleEditDialogClose = (done: () => void) => {
  showEditDialog.value = false;
  done();
};

// 计算归档的通知
const archivedNotifications = computed(() => {
  const saved = localStorage.getItem('azoth_notifications');
  if (saved) {
    const notifications = JSON.parse(saved);
    return notifications.filter((n: any) => n.archived);
  }
  return [];
});

// 页面加载时初始化数据
onMounted(async () => {
  if (userStore.isLoggedIn) {
    await Promise.all([
      loadUserStats(),
      loadLikedRecipes()
    ]);
  }
});
</script>

<style scoped>
.profile-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 32px;
  color: #303133;
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 16px;
  color: #909399;
}

.profile-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .profile-content {
    grid-template-columns: 1fr;
  }
}

/* 卡片样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.card-subtitle {
  font-size: 14px;
  color: #909399;
}

/* 用户信息卡片 */
.user-info-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.user-avatar {
  flex-shrink: 0;
}

.user-details {
  flex: 1;
}

.user-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.user-field:last-child {
  border-bottom: none;
}

.user-field label {
  font-weight: 500;
  color: #606266;
}

.user-value {
  color: #303133;
}

.level-badge {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.contribute-value {
  color: #e6a23c;
  font-weight: bold;
}

.not-logged-in {
  text-align: center;
  padding: 40px 0;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 收件箱卡片 */
.inbox-card {
  margin-bottom: 20px;
}

.inbox-content {
  min-height: 200px;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

.notification-item.read {
  background: #f0f0f0;
  opacity: 0.7;
}

.notification-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.notification-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.notification-message {
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
}

.notification-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.notification-time {
  font-size: 12px;
}

.notification-status {
  display: flex;
  gap: 8px;
}

/* 收藏配方卡片 */
.liked-recipes-content {
  min-height: 400px;
}

.loading-container,
.empty-container {
  padding: 40px 0;
  text-align: center;
}

.empty-tip {
  margin-top: 8px;
  color: #909399;
  font-size: 14px;
}

.recipes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recipe-item {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.recipe-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.recipe-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-formula {
  font-size: 16px;
  font-weight: 500;
}

.material {
  color: #606266;
}

.plus, .equals {
  color: #909399;
  margin: 0 8px;
}

.result {
  color: #409eff;
  font-weight: bold;
}

.recipe-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.recipe-meta .likes {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #e6a23c;
}

.liked-time {
  margin-left: auto;
}

/* 分页 */
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 编辑表单 */
.edit-form {
  padding: 0 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
