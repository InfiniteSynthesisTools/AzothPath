<template>
  <div class="profile-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>{{ isViewingSelf ? '个人中心' : `${currentUser?.name || '用户'} 的资料` }}</h1>
      <p class="page-subtitle">{{ isViewingSelf ? '管理您的个人信息和收藏' : '查看用户的贡献和收藏' }}</p>
    </div>

    <div class="profile-content">
      <!-- 左侧：个人信息面板 -->
      <div class="profile-left">
        <!-- 用户信息卡片 -->
        <el-card class="user-info-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">个人信息</span>
            </div>
          </template>

          <div class="user-info-content" v-if="currentUser">
            <div class="user-avatar">
              <el-avatar :size="80" :style="{ backgroundColor: '#409eff' }" class="large-avatar-text">
                {{ currentUser.name.charAt(0).toUpperCase() }}
              </el-avatar>
            </div>
            
            <div class="user-details">
              <div class="user-field">
                <label>用户名</label>
                <span class="user-value">{{ currentUser.name }}</span>
              </div>
              
              <div class="user-field">
                <label>用户等级</label>
                <span class="user-value level-badge">Lv.{{ currentUser.level }}</span>
              </div>
              
              <div class="user-field">
                <label>贡献积分</label>
                <span class="user-value contribute-value">{{ currentUser.contribute }}</span>
              </div>
              
              <div class="user-field">
                <label>注册时间</label>
                <span class="user-value">{{ formatDate(currentUser.created_at) }}</span>
              </div>
              
              <div class="user-field">
                <label>用户权限</label>
                <span class="user-value">
                  <el-tag :type="isCurrentUserAdmin ? 'danger' : 'success'" size="small">
                    {{ isCurrentUserAdmin ? '管理员' : '普通用户' }}
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

      <!-- 右侧：收藏配方 -->
      <div class="profile-right" v-if="userStore.isLoggedIn">
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
                    <span class="liked-time">{{ formatDateTime(recipe.liked_at) }}</span>
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

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores';
import { userApi } from '@/api';
import { ElMessage } from 'element-plus';
import { Star } from '@element-plus/icons-vue';
import { formatDate, formatDateTime } from '@/utils/format';

const route = useRoute();
const userStore = useUserStore();

// 当前查看的用户信息（可能是自己或其他用户）
const currentUser = ref<any>(null);
const isViewingSelf = computed(() => {
  const userId = route.params.id ? parseInt(route.params.id as string) : null;
  return !userId || userId === userStore.userInfo?.id;
});

// 当前查看的用户是否是管理员
const isCurrentUserAdmin = computed(() => {
  if (isViewingSelf.value) {
    return userStore.isAdmin;
  }
  return currentUser.value?.auth === 9;
});

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
const likedRecipesLimit = ref(20);
const likedRecipesTotal = ref(0);

// 使用统一的时间工具函数，已在上方导入

// 加载用户基本信息
const loadUserInfo = async () => {
  const userId = route.params.id ? parseInt(route.params.id as string) : null;
  
  if (isViewingSelf.value) {
    // 查看自己的资料，使用 store 中的数据
    currentUser.value = userStore.userInfo;
  } else if (userId) {
    // 查看其他用户的资料，使用新的 API 获取
    try {
      const response = await userApi.getUser(userId);
      if (response && response.data) {
        currentUser.value = response.data;
      } else {
        ElMessage.error('用户不存在');
      }
    } catch (error: any) {
      console.error('Failed to load user info:', error);
      if (error.response?.status === 404) {
        ElMessage.error('用户不存在');
      } else {
        ElMessage.error('加载用户信息失败');
      }
    }
  }
};

// 加载用户统计信息
const loadUserStats = async () => {
  const userId = route.params.id 
    ? parseInt(route.params.id as string) 
    : userStore.userInfo?.id;
  
  if (!userId) return;
  
  try {
    console.log('Loading user stats for user ID:', userId);
    const response = await userApi.getUserStats(userId);
    console.log('User stats response:', response);
    console.log('Response data:', response.data);
    if (response && (response as any).stats) {
      userStats.value = (response as any).stats;
    } else {
      console.error('Invalid response structure:', response);
    }
  } catch (error) {
    console.error('Failed to load user stats:', error);
  }
};

// 加载收藏配方
const loadLikedRecipes = async () => {
  const userId = route.params.id 
    ? parseInt(route.params.id as string) 
    : userStore.userInfo?.id;
    
  if (!userId) return;
  
  likedRecipesLoading.value = true;
  try {
    const response = await userApi.getLikedRecipes(userId, {
      page: likedRecipesPage.value,
      limit: likedRecipesLimit.value
    });
    
    console.log('Liked recipes response:', response);
    console.log('Response data:', response.data);
    if (response && (response as any).recipes) {
      likedRecipes.value = (response as any).recipes;
      likedRecipesTotal.value = (response as any).total;
    } else {
      console.error('Invalid liked recipes response structure:', response);
    }
  } catch (error) {
    console.error('Failed to load liked recipes:', error);
    ElMessage.error('加载收藏配方失败');
  } finally {
    likedRecipesLoading.value = false;
  }
};

// 监听路由变化，重新加载数据
watch(() => route.params.id, () => {
  loadAllData();
}, { immediate: false });

// 加载所有数据
const loadAllData = async () => {
  await loadUserInfo();
  if (currentUser.value) {
    await Promise.all([
      loadUserStats(),
      loadLikedRecipes()
    ]);
  }
};


// 页面加载时初始化数据
onMounted(async () => {
  await loadAllData();
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

.large-avatar-text {
  font-size: 25px;
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

</style>
