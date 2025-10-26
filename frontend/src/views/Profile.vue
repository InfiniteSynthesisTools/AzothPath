<template>
  <div class="profile-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>{{ isViewingSelf ? '个人中心' : `${currentUser?.name || '用户'} 的资料` }}</h1>
      <p class="page-subtitle">{{ isViewingSelf ? '管理您的个人信息和收藏' : '查看用户的贡献' }}</p>
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
              <div 
                class="user-emoji-avatar-large"
                @click="openAvatarModal"
                :class="{ 'clickable': isViewingSelf }"
                title="点击修改头像"
              >
                {{ currentUser.emoji || '🙂' }}
              </div>
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

          <div v-else-if="isViewingSelf" class="not-logged-in">
            <el-empty description="请先登录" />
            <el-button type="primary" @click="$router.push('/login')">立即登录</el-button>
          </div>

          <div v-else-if="route.params.id === '0'" class="generic-profile">
            <el-empty description="请选择要查看的用户" />
            <p class="generic-tip">您可以通过贡献榜或其他页面查看其他用户的个人中心</p>
          </div>

          <div v-else class="user-not-found">
            <el-empty description="用户不存在" />
          </div>
        </el-card>

        <!-- 贡献统计卡片 -->
        <el-card class="stats-card" v-if="currentUser">
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
      <div class="profile-right" v-if="isViewingSelf && userStore.isLoggedIn">
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

  <!-- 头像修改模态框 -->
  <el-dialog
    v-model="avatarDialogVisible"
    title="修改头像"
    width="600px"
    destroy-on-close
  >
    <div class="avatar-dialog-content">
      <!-- 当前选中的头像预览 -->
      <div class="avatar-preview">
        <div class="preview-emoji">{{ selectedEmoji }}</div>
        <p class="preview-text">当前选择的头像</p>
      </div>

      <!-- 可用头像列表（用户发现的元素） -->
      <div class="avatar-selection">
        <h3 class="selection-title">您发现的元素</h3>
        
        <div v-if="discoveredItemsLoading" class="loading-container">
          <el-skeleton :rows="3" animated />
        </div>
        
        <div v-else-if="discoveredItems.length === 0" class="empty-container">
          <el-empty description="您还没有发现任何元素" />
          <p class="empty-tip">去发现更多元素吧！</p>
        </div>
        
        <div v-else class="emoji-grid">
          <div
            v-for="item in discoveredItems"
            :key="item.id"
            class="emoji-option"
            :class="{ 'selected': selectedEmoji === item.emoji }"
            @click="selectEmoji(item.emoji)"
            :title="item.name"
          >
            <div class="emoji">{{ item.emoji }}</div>
            <div class="emoji-name">{{ item.name }}</div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination-container" v-if="discoveredItemsTotal > discoveredItemsLimit">
          <el-pagination
            v-model:current-page="discoveredItemsPage"
            :page-size="discoveredItemsLimit"
            :total="discoveredItemsTotal"
            layout="prev, pager, next, jumper, total"
            @current-change="loadDiscoveredItems"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="avatarDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmUpdateAvatar">确认修改</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 头像相关样式 */
.user-emoji-avatar-large {
  font-size: 4rem;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.user-emoji-avatar-large.clickable:hover {
  transform: scale(1.1);
}

/* 头像选择模态框样式 */
.avatar-dialog-content {
  padding: 10px 0;
}

.avatar-preview {
  text-align: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.preview-emoji {
  font-size: 6rem;
  line-height: 1;
  margin-bottom: 10px;
}

.preview-text {
  color: #606266;
  font-size: 14px;
}

.avatar-selection {
  margin-top: 20px;
}

.selection-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 15px;
  color: #303133;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.emoji-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.emoji-option:hover {
  background: #ecf5ff;
  transform: translateY(-2px);
}

.emoji-option.selected {
  background: #ecf5ff;
  border-color: #409eff;
}

.emoji {
  font-size: 2rem;
  margin-bottom: 5px;
}

.emoji-name {
  font-size: 12px;
  color: #606266;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.pagination-container {
  margin-top: 20px;
  text-align: center;
}

.loading-container,
.empty-container {
  padding: 30px 0;
}

.empty-tip {
  text-align: center;
  color: #909399;
  margin-top: 10px;
}
</style>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores';
import { userApi } from '@/api';
import { ElMessage, ElDialog } from 'element-plus';
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

// 头像修改相关
const avatarDialogVisible = ref(false);
const selectedEmoji = ref('');
const discoveredItems = ref<any[]>([]);
const discoveredItemsLoading = ref(false);
const discoveredItemsPage = ref(1);
const discoveredItemsLimit = ref(20);
const discoveredItemsTotal = ref(0);

// 收藏配方相关
const likedRecipes = ref<any[]>([]);
const likedRecipesLoading = ref(false);
const likedRecipesPage = ref(1);
const likedRecipesLimit = ref(20);
const likedRecipesTotal = ref(0);

// 使用统一的时间工具函数，已在上方导入

// 加载用户基本信息
const loadUserInfo = async () => {
  const userId = route.params.id ? parseInt(route.params.id as string) : (userStore.userInfo?.id || null);
  
  if (isViewingSelf.value && userId) {
    // 查看自己的资料，从API获取最新数据而不是只使用缓存
    try {
      const response = await userApi.getCurrentUser();
      console.log('当前用户API响应:', response);
      if (response) {
        currentUser.value = response;
        // 同时更新store中的数据以保持同步
        if (userStore.userInfo) {
          userStore.userInfo = response as any;
          localStorage.setItem('user', JSON.stringify(response));
        }
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
      // 如果API请求失败，回退到使用store中的数据
      currentUser.value = userStore.userInfo;
    }
  } else if (userId) {
    // 查看其他用户的资料，使用新的 API 获取
    try {
      const response = await userApi.getUser(userId);
      console.log('用户API响应:', response);
      if (response) {
        currentUser.value = response;
      } else {
        ElMessage.error('用户不存在');
        currentUser.value = null;
      }
    } catch (error: any) {
      console.error('Failed to load user info:', error);
      if (error.response?.status === 404) {
        ElMessage.error('用户不存在');
      } else {
        ElMessage.error('加载用户信息失败');
      }
      currentUser.value = null;
    }
  } else {
    // 没有用户ID且不是查看自己，这种情况不应该发生，因为路由有参数
    currentUser.value = null;
  }
};

// 加载用户统计信息
const loadUserStats = async () => {
  const userId = route.params.id 
    ? parseInt(route.params.id as string) 
    : userStore.userInfo?.id;
  
  if (!userId) return;
  
  try {
    console.log('正在加载用户统计信息，用户ID:', userId);
    const response = await userApi.getUserStats(userId);
    console.log('用户统计响应:', response);
    if (response && (response as any).stats) {
      userStats.value = (response as any).stats;
    } else {
      console.error('Invalid response structure:', response);
    }
  } catch (error) {
    console.error('Failed to load user stats:', error);
  }
};

// 打开头像修改模态框
function openAvatarModal() {
  if (!isViewingSelf.value) return;
  
  avatarDialogVisible.value = true;
  selectedEmoji.value = currentUser.value?.emoji || '🙂';
  discoveredItemsPage.value = 1;
  loadDiscoveredItems();
}

// 加载用户发现的元素
async function loadDiscoveredItems() {
  try {
    discoveredItemsLoading.value = true;
    const userId = currentUser.value?.id;
    if (!userId) return;
    
    const response = await userApi.getUserDiscoveredItems(userId, {
      page: discoveredItemsPage.value,
      limit: discoveredItemsLimit.value
    });
    
    discoveredItems.value = (response as any).items || [];
    discoveredItemsTotal.value = (response as any).total || 0;
  } catch (error) {
    console.error('加载用户发现的元素失败', error);
    ElMessage.error('加载发现的元素失败');
  } finally {
    discoveredItemsLoading.value = false;
  }
}

// 选择头像
function selectEmoji(emoji: string) {
  selectedEmoji.value = emoji;
}

// 确认更新头像
async function confirmUpdateAvatar() {
  try {
    const response = await userApi.updateUserAvatar(selectedEmoji.value);
    
    // 更新当前用户信息
    if ((response as any).emoji) {
      currentUser.value.emoji = (response as any).emoji;
      if (userStore.userInfo) {
        // 创建新的用户信息对象，确保响应式更新
        const updatedUserInfo = { ...userStore.userInfo, emoji: (response as any).emoji };
        userStore.userInfo = updatedUserInfo;
        // 更新localStorage中的用户信息
        localStorage.setItem('user', JSON.stringify(updatedUserInfo));
      }
    } else {
      // 后备方案，直接使用选择的emoji
      currentUser.value.emoji = selectedEmoji.value;
      if (userStore.userInfo) {
        // 创建新的用户信息对象，确保响应式更新
        const updatedUserInfo = { ...userStore.userInfo, emoji: selectedEmoji.value };
        userStore.userInfo = updatedUserInfo;
        // 更新localStorage中的用户信息
        localStorage.setItem('user', JSON.stringify(updatedUserInfo));
      }
    }
    
    ElMessage.success('头像更新成功');
    avatarDialogVisible.value = false;
  } catch (error: any) {
    console.error('更新头像失败', error);
    ElMessage.error(error.response?.data?.message || '更新头像失败');
  }
}

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
    
    console.log('喜欢的配方响应:', response);
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
    // 加载统计信息（无论是否登录都可以查看）
    await loadUserStats();
    
    // 只有查看自己的个人中心且已登录时才加载收藏配方
    if (isViewingSelf.value && userStore.isLoggedIn) {
      await loadLikedRecipes();
    }
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

.user-emoji-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  box-shadow: inset 0 0 0 2px #e4e7ed;
  font-size: 44px;
  line-height: 1;
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

.generic-profile {
  text-align: center;
  padding: 40px 0;
}

.generic-tip {
  margin-top: 16px;
  color: #909399;
  font-size: 14px;
  line-height: 1.5;
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
