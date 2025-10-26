<template>
  <div class="profile-page">
    <div class="page-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">
          <span class="title-emoji">{{ isViewingSelf ? '👤' : '👥' }}</span>
          {{ isViewingSelf ? '个人中心' : `${currentUser?.name || '用户'} 的资料` }}
        </h1>
        <p class="page-subtitle">{{ isViewingSelf ? '管理您的个人信息和收藏' : '查看用户的贡献' }}</p>
      </div>

      <div class="profile-content">
      <!-- 左侧：个人信息面板 -->
      <div class="profile-left">
        <!-- 用户信息卡片 -->
        <el-card class="user-info-card card-scale" shadow="hover">
          <template #header>
            <div class="card-header">
              <h3>👤 个人信息</h3>
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

        <!-- 贡献统计 -->
        <div class="stats-section" v-if="currentUser" style="margin-top: 24px;">
          <h3 class="stats-title">📊 贡献统计</h3>
          <div class="stats-list">
            <div class="stat-row">
              <span class="stat-icon">📋</span>
              <span class="stat-label">提交配方</span>
              <span class="stat-value">{{ userStats.recipe_count || 0 }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-icon">🧪</span>
              <span class="stat-label">发现物品</span>
              <span class="stat-value">{{ userStats.item_count || 0 }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-icon">✅</span>
              <span class="stat-label">完成任务</span>
              <span class="stat-value">{{ userStats.task_completed || 0 }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-icon">🏆</span>
              <span class="stat-label">总贡献</span>
              <span class="stat-value">{{ userStats.total_contribution || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：收藏配方 -->
      <div class="profile-right" v-if="isViewingSelf && userStore.isLoggedIn">
        <!-- 收藏配方卡片 -->
        <el-card class="liked-recipes-card card-scale" shadow="hover">
          <template #header>
            <div class="card-header">
              <h3>❤️ 我的收藏</h3>
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
                  <div class="recipe-display">
                    <span class="material clickable" @click.stop="goToElement(recipe.item_a)">
                      <span v-if="recipe.item_a_emoji" class="emoji">{{ recipe.item_a_emoji }}</span>
                      {{ recipe.item_a }}
                    </span>
                    <span class="plus">+</span>
                    <span class="material clickable" @click.stop="goToElement(recipe.item_b)">
                      <span v-if="recipe.item_b_emoji" class="emoji">{{ recipe.item_b_emoji }}</span>
                      {{ recipe.item_b }}
                    </span>
                    <span class="arrow">→</span>
                    <span class="result clickable" @click.stop="goToElement(recipe.result)">
                      <span v-if="recipe.result_emoji" class="emoji">{{ recipe.result_emoji }}</span>
                      {{ recipe.result }}
                    </span>
                  </div>
                  <div class="recipe-actions">
                    <button class="like-btn" :class="{ liked: recipe.is_liked }" @click.stop="toggleLikeRecipe(recipe)"
                      :disabled="togglingIds.has(recipe.id)" title="取消点赞">
                      <span class="heart">❤</span> {{ recipe.likes || 0 }}
                    </button>
                    <button class="copy-btn" @click.stop="copyRecipe(recipe)" title="复制配方">
                      <CopyIcon />
                    </button>
                  </div>
                  <div class="recipe-meta">
                    <span class="time">{{ formatTimeAgo(recipe.created_at) }}</span>
                  </div>
                </div>
              </div>            <!-- 分页 -->
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
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores';
import { userApi, recipeApi } from '@/api';
import { ElMessage, ElDialog } from 'element-plus';

import { formatDate, formatDateTime } from '@/utils/format';
import CopyIcon from '@/components/icons/CopyIcon.vue';
import { copyToClipboard } from '@/composables/useClipboard';

const route = useRoute();
const router = useRouter();
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

// 跳转到元素详情页面
const goToElement = async (elementName: string) => {
  try {
    // 通过精确匹配查询元素信息
    const response = await recipeApi.getItems({
      search: elementName,
      exact: true  // 使用精确匹配
    }) as any;

    if (response.items && response.items.length > 0) {
      const element = response.items[0];
      router.push(`/element/${element.id}`);
    } else {
      ElMessage.warning(`未找到元素: ${elementName}`);
    }
  } catch (error) {
    console.error('查询元素失败:', error);
    ElMessage.error('无法打开元素详情');
  }
};

// 点赞交互
const togglingIds = new Set<number>();
const toggleLikeRecipe = async (recipe: any) => {
  if (togglingIds.has(recipe.id)) return;
  togglingIds.add(recipe.id);
  try {
    const res = await recipeApi.like(recipe.id);
    recipe.is_liked = res.liked;
    recipe.likes = res.likes;
    
    // 如果取消点赞，从收藏列表中移除
    if (!res.liked) {
      likedRecipes.value = likedRecipes.value.filter(r => r.id !== recipe.id);
      likedRecipesTotal.value -= 1;
    }
  } catch (err: any) {
    // 未登录或其他错误
    if (err?.response?.status === 401) {
      ElMessage.warning('请先登录后再操作');
    } else {
      ElMessage.error(err?.response?.data?.message || '操作失败');
    }
  } finally {
    togglingIds.delete(recipe.id);
  }
};

// 格式化相对时间
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return formatDateTime(dateString);
  }
};

// 复制整条配方，如 "金 + 木 = 合金"
const copyRecipe = async (recipe: any) => {
  if (!recipe) return;
  const text = `${recipe.item_a} + ${recipe.item_b} = ${recipe.result}`;
  const ok = await copyToClipboard(text);
  if (ok) ElMessage.success(`已复制配方: ${text}`);
  else ElMessage.error('复制失败');
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
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  min-height: 100vh;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  margin-bottom: 40px;
  text-align: center;
}

.page-title {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  font-size: 18px;
  color: var(--color-text-secondary);
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.profile-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .profile-content {
    grid-template-columns: 1fr;
  }
}

/* 卡片样式 */
.user-info-card,
.stats-card,
.liked-recipes-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
}

.user-info-card:hover,
.stats-card:hover,
.liked-recipes-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-300);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-primary-100);
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* 用户信息卡片 */
.user-info-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding: 20px;
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
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: inset 0 0 0 2px var(--glass-border);
  font-size: 44px;
  line-height: 1;
  transition: all var(--transition-base);
}

.user-emoji-avatar-large.clickable:hover {
  transform: scale(1.1);
  box-shadow: inset 0 0 0 2px var(--color-primary-300);
}

.user-details {
  flex: 1;
}

.user-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-primary);
}

.user-field:last-child {
  border-bottom: none;
}

.user-field label {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.user-value {
  color: var(--color-text-primary);
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
  color: var(--color-warning);
  font-weight: bold;
}

.not-logged-in,
.generic-profile,
.user-not-found {
  text-align: center;
  padding: 40px 0;
}

.generic-tip {
  margin-top: 16px;
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

/* 贡献统计 */
.stats-section {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--color-border-primary);
}

.stats-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-bg-primary);
  border-radius: var(--radius-base);
  border: 1px solid var(--color-border-primary);
  transition: all var(--transition-base);
}

.stat-row:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
}

.stat-icon {
  font-size: 20px;
  margin-right: 12px;
}

.stat-label {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary-600);
}

/* 收藏配方卡片 */
.liked-recipes-content {
  min-height: 400px;
  padding: 20px;
}

.loading-container,
.empty-container {
  padding: 40px 0;
  text-align: center;
}

.empty-tip {
  margin-top: 8px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.recipes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-item {
  padding: 12px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  column-gap: 12px;
  row-gap: 0;
  box-shadow: var(--shadow-sm);
}

.recipe-item:hover {
  background: var(--color-bg-surface);
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.recipe-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 0;
  flex: 1 1 0;
  min-width: 0;
  flex-wrap: nowrap;
}

.material {
  padding: 4px 8px;
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-base);
  color: var(--color-primary-700);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  transition: all var(--transition-base);
}

.material.clickable {
  cursor: pointer;
}

.material.clickable:hover {
  background: var(--color-primary-100);
  border-color: var(--color-primary-400);
  color: var(--color-primary-800);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.plus,
.arrow {
  color: var(--color-text-secondary);
  font-weight: bold;
  font-size: 12px;
}

.result {
  padding: 4px 8px;
  background: linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%);
  color: var(--color-primary-800);
  border-radius: var(--radius-base);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-primary-300);
  transition: all var(--transition-base);
}

.result.clickable {
  cursor: pointer;
}

.result.clickable:hover {
  background: linear-gradient(135deg, var(--color-primary-200) 0%, var(--color-primary-300) 100%);
  color: var(--color-primary-900);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.emoji {
  font-size: 12px;
  line-height: 1;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
  margin-right: 4px;
}

.recipe-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  flex-shrink: 0;
}

.recipe-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #656d76;
  white-space: nowrap;
  flex: 0 0 auto;
}

.time {
  font-size: 10px;
  color: #656d76;
  white-space: nowrap;
  flex: 0 0 auto;
}

.like-btn {
  border: 1px solid rgba(239, 68, 68, 0.2);
  background: var(--glass-bg);
  color: #ef4444;
  border-radius: var(--radius-full);
  padding: 6px 12px;
  line-height: 1;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all var(--transition-bounce);
  min-width: 44px;
  height: 32px;
  font-weight: 600;
}

.like-btn:hover:not(:disabled) {
  background: rgba(254, 226, 226, 0.9);
  border-color: #ef4444;
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.like-btn.liked {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  border-color: #f87171;
  color: #dc2626;
}

.like-btn.liked:hover:not(:disabled) {
  background: linear-gradient(135deg, #fca5a5 0%, #f87171 100%);
  border-color: #ef4444;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.like-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.like-btn:active {
  transform: translateY(0);
}

.copy-btn {
  border: 1px solid var(--color-primary-200);
  background: var(--glass-bg);
  color: var(--color-primary-600);
  border-radius: var(--radius-full);
  padding: 6px;
  line-height: 1;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all var(--transition-bounce);
  width: 32px;
  height: 32px;
}

.copy-btn:hover {
  background: var(--color-primary-100);
  border-color: var(--color-primary-400);
  color: var(--color-primary-700);
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 12px var(--color-primary-200);
}

.copy-btn:active {
  transform: translateY(0) scale(1);
}

/* 分页 */
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
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
  
  .user-info-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  }
  
  .user-field {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
  
  .recipe-item {
    grid-template-columns: 1fr auto;
    align-items: stretch;
    gap: 8px;
  }
  
  .recipe-display {
    justify-content: center;
    margin-bottom: 8px;
  }
  
  .recipe-actions {
    justify-content: center;
    gap: 4px;
  }
  
  .recipe-meta {
    display: none;
  }
  
  /* 贡献统计移动端优化 */
  .stats-section {
    padding: 16px;
  }
  
  .stats-title {
    font-size: 16px;
    margin-bottom: 12px;
  }
  
  .stats-list {
    gap: 8px;
  }
  
  .stat-row {
    padding: 10px 12px;
  }
  
  .stat-icon {
    font-size: 18px;
    margin-right: 8px;
  }
  
  .stat-label {
    font-size: 13px;
  }
  
  .stat-value {
    font-size: 14px;
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
  
  /* 贡献统计小屏优化 */
  .stats-section {
    padding: 12px;
  }
  
  .stats-title {
    font-size: 15px;
    margin-bottom: 10px;
  }
  
  .stats-list {
    gap: 6px;
  }
  
  .stat-row {
    padding: 8px 10px;
  }
  
  .stat-icon {
    font-size: 16px;
    margin-right: 6px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .stat-value {
    font-size: 13px;
  }
}
</style>
