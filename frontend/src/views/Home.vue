<template>
  <div class="home">
    <div class="page-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">
          <span class="title-emoji">🧪</span>
          Azoth Path
        </h1>
        <p class="page-subtitle">无尽合成工具站</p>
      </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="8" :md="8" :lg="8">
          <el-card shadow="hover" class="card-scale">
            <el-statistic :value="stats.total_recipes" title="配方总数">
              <template #prefix>
                <el-icon>
                  <Document />
                </el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8">
          <el-card shadow="hover" class="card-scale">
            <el-statistic :value="stats.total_items" title="物品总数">
              <template #prefix>
                <el-icon>
                  <Box />
                </el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8">
          <el-card shadow="hover" class="card-scale">
            <el-statistic :value="stats.reachable_items" title="可合成物品">
              <template #prefix>
                <el-icon>
                  <CircleCheck />
                </el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 四个卡片区域 -->
    <div class="cards-section">
      <el-row :gutter="20">
        <!-- 探索元素 - 紧凑版 -->
        <el-col :xs="24" :sm="24" :md="24" :lg="24">
          <el-card class="explore-card card-scale" shadow="hover">
            <div class="explore-content">
              <div class="explore-left">
                <el-icon size="32" color="var(--color-primary-500)" class="float">
                  <StarFilled />
                </el-icon>
                <div class="explore-text">
                  <h3>🎲 探索元素</h3>
                  <p>随机发现一个意想不到的合成元素</p>
                </div>
              </div>
              <el-button type="primary" @click="exploreRandomElement" :loading="loadingRandomElement" class="ripple-effect">
                {{ loadingRandomElement ? '探索中...' : '随机探索' }}
              </el-button>
            </div>
          </el-card>
        </el-col>

        <!-- 最新配方 -->
        <el-col :xs="24" :sm="12" :md="12" :lg="12">
          <el-card class="feature-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <h3>🆕 最新配方</h3>
                <div class="card-actions">
                  <el-button type="text" size="small" @click="refreshLatest" :loading="loadingLatest" title="刷新最新配方">
                    <el-icon>
                      <Refresh />
                    </el-icon>
                  </el-button>
                </div>
              </div>
            </template>
            <div class="card-content" v-loading="loadingLatest">
              <div class="recipe-list">
                <div v-for="recipe in latestRecipes" :key="recipe.id" class="recipe-item">
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
                      :disabled="togglingIds.has(recipe.id)" title="点赞配方">
                      <span class="heart">❤</span> {{ recipe.likes || 0 }}
                    </button>
                    <button class="copy-btn" @click.stop="copyRecipe(recipe)" title="复制配方">
                      <CopyIcon />
                    </button>
                  </div>
                  <span class="time">{{ formatTimeAgo(recipe.created_at) }}</span>
                </div>
              </div>

            </div>
            <!-- 自动加载观察元素 -->
            <div class="auto-load-observer" v-if="latestHasMore">
              <div class="load-indicator" v-if="latestLoadingMore">
                <el-icon class="loading-icon"><Loading /></el-icon>
                <span>正在加载更多配方...</span>
              </div>
              <div ref="latestObserverTarget" class="observer-target"></div>
            </div>
          </el-card>
        </el-col>

        <!-- 最热配方 -->
        <el-col :xs="24" :sm="12" :md="12" :lg="12">
          <el-card class="feature-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <h3>🔥 最热配方</h3>
              </div>
            </template>
            <div class="card-content" v-loading="loadingPopular">
              <div class="recipe-list">
                <div v-for="recipe in popularRecipes" :key="recipe.id" class="recipe-item">
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
                      :disabled="togglingIds.has(recipe.id)" title="点赞配方">
                      <span class="heart">❤</span> {{ recipe.likes || 0 }}
                    </button>
                    <button class="copy-btn" @click.stop="copyRecipe(recipe)" title="复制配方">
                      <CopyIcon />
                    </button>
                  </div>
                  <span class="time">{{ formatTimeAgo(recipe.created_at) }}</span>
                </div>
              </div>

            </div>
            <!-- 自动加载观察元素 -->
            <div class="auto-load-observer" v-if="popularHasMore">
              <div class="load-indicator" v-if="popularLoadingMore">
                <el-icon class="loading-icon"><Loading /></el-icon>
                <span>正在加载更多配方...</span>
              </div>
              <div ref="popularObserverTarget" class="observer-target"></div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Box, CircleCheck, StarFilled, Loading } from '@element-plus/icons-vue';
import CopyIcon from '@/components/icons/CopyIcon.vue';
import { copyToClipboard } from '@/composables/useClipboard';
import { recipeApi } from '@/api';
import { formatDateTime } from '@/utils/format';

const router = useRouter();
const loadingLatest = ref(false);
const loadingPopular = ref(false);
const loadingRandomElement = ref(false);

// 最新/最热 列表分页状态
const latestPage = ref(1);
const latestLimit = ref(10);
const latestHasMore = ref(false);
const latestLoadingMore = ref(false);

const popularPage = ref(1);
const popularLimit = ref(10);
const popularHasMore = ref(false);
const popularLoadingMore = ref(false);

// 定义包含emoji的配方类型
interface RecipeWithEmoji {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;
  likes: number;
  created_at: string;
  creator_name?: string;
  item_a_emoji?: string;
  item_b_emoji?: string;
  result_emoji?: string;
  is_liked?: boolean;
}

const stats = ref({
  total_recipes: 0,
  total_items: 0,
  reachable_items: 0,
  unreachable_items: 0,
  valid_recipes: 0,
  invalid_recipes: 0,
  circular_recipes: 0,
  circular_items: 0,
  base_items: 5
});

const latestRecipes = ref<RecipeWithEmoji[]>([]);
const popularRecipes = ref<RecipeWithEmoji[]>([]);

// 观察器引用
const latestObserverTarget = ref<HTMLElement | null>(null);
const popularObserverTarget = ref<HTMLElement | null>(null);

// 观察器实例
let latestObserver: IntersectionObserver | null = null;
let popularObserver: IntersectionObserver | null = null;

// 防抖变量
let latestLoadDebounce: NodeJS.Timeout | null = null;
let popularLoadDebounce: NodeJS.Timeout | null = null;

// 点赞交互（调用后端 POST /api/recipes/:id/like）
const togglingIds = new Set<number>();
const toggleLikeRecipe = async (recipe: RecipeWithEmoji) => {
  if (togglingIds.has(recipe.id)) return;
  togglingIds.add(recipe.id);
  try {
    const res = await recipeApi.like(recipe.id);
    recipe.is_liked = res.liked;
    recipe.likes = res.likes;
  } catch (err: any) {
    // 未登录或其他错误
    if (err?.response?.status === 401) {
      ElMessage.warning('请先登录后再点赞');
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
const copyRecipe = async (recipe: RecipeWithEmoji) => {
  if (!recipe) return;
  const text = `${recipe.item_a} + ${recipe.item_b} = ${recipe.result}`;
  const ok = await copyToClipboard(text);
  if (ok) ElMessage.success(`已复制配方: ${text}`);
  else ElMessage.error('复制失败');
};

// 加载统计数据
const loadStats = async () => {
  try {
    const data = await recipeApi.getGraphStats();
    stats.value = data as any;
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

// 加载最新配方
// 加载最新配方，append=true 时追加到列表
const loadLatestRecipes = async (page: number = 1, append = false) => {
  if (!append) loadingLatest.value = true;
  try {
    const response = await recipeApi.list({
      page,
      limit: latestLimit.value,
      orderBy: 'created_at'
    }) as any;

    const recipes = response.recipes || [];
    // 如果是追加则合并并去重（基于 id）
    if (append) {
      const existingIds = new Set(latestRecipes.value.map(r => r.id));
      const toAdd = recipes.filter((r: any) => !existingIds.has(r.id));
      latestRecipes.value = latestRecipes.value.concat(toAdd);
    } else {
      latestRecipes.value = recipes;
    }

    // 优先使用后端返回的 hasMore 字段，否则根据返回长度判断
    if (typeof response.hasMore === 'boolean') {
      latestHasMore.value = response.hasMore;
    } else {
      latestHasMore.value = recipes.length >= latestLimit.value;
    }

    latestPage.value = page;
  } catch (error) {
    console.error('加载最新配方失败:', error);
  } finally {
    latestLoadingMore.value = false;
    loadingLatest.value = false;
  }
};

// 加载最热配方
// 加载最热配方，append=true 时追加到列表
const loadPopularRecipes = async (page: number = 1, append = false) => {
  if (!append) loadingPopular.value = true;
  try {
    const response = await recipeApi.list({
      page,
      limit: popularLimit.value,
      orderBy: 'likes'
    }) as any;

    const recipes = response.recipes || [];
    if (append) {
      const existingIds = new Set(popularRecipes.value.map(r => r.id));
      const toAdd = recipes.filter((r: any) => !existingIds.has(r.id));
      popularRecipes.value = popularRecipes.value.concat(toAdd);
    } else {
      popularRecipes.value = recipes;
    }

    if (typeof response.hasMore === 'boolean') {
      popularHasMore.value = response.hasMore;
    } else {
      popularHasMore.value = recipes.length >= popularLimit.value;
    }

    popularPage.value = page;
  } catch (error) {
    console.error('加载最热配方失败:', error);
  } finally {
    popularLoadingMore.value = false;
    loadingPopular.value = false;
  }
};

// 自动加载最新配方
const autoLoadMoreLatest = async () => {
  if (latestLoadingMore.value || !latestHasMore.value) return;
  latestLoadingMore.value = true;
  await loadLatestRecipes(latestPage.value + 1, true);
};

// 自动加载最热配方
const autoLoadMorePopular = async () => {
  if (popularLoadingMore.value || !popularHasMore.value) return;
  popularLoadingMore.value = true;
  await loadPopularRecipes(popularPage.value + 1, true);
};

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

// 随机探索元素
const exploreRandomElement = async () => {
  loadingRandomElement.value = true;
  try {
    // 调用后端随机接口
    const randomItem = await recipeApi.getRandomItem('synthetic');

    if (randomItem) {
      ElMessage.success(`发现元素: ${randomItem.emoji || '🔘'} ${randomItem.name}`);
      
      // 跳转到元素详情页
      router.push(`/element/${randomItem.id}`);
    } else {
      ElMessage.warning('暂无可探索的元素');
    }
  } catch (error) {
    console.error('探索元素失败:', error);
    ElMessage.error('探索失败，请稍后重试');
  } finally {
    loadingRandomElement.value = false;
  }
};

// 刷新最新配方（卡片右上角按钮）
const refreshLatest = async () => {
  try {
    // 重新加载第一页数据并替换列表
    await loadLatestRecipes(1, false);
    ElMessage.success('已刷新最新配方');
  } catch (err) {
    console.error('刷新最新配方失败:', err);
    ElMessage.error('刷新最新配方失败');
  }
};

// 初始化观察器
const initObservers = () => {
  // 清理旧的观察器
  if (latestObserver) latestObserver.disconnect();
  if (popularObserver) popularObserver.disconnect();

  // 创建最新配方观察器
  if (latestObserverTarget.value) {
    latestObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && latestHasMore.value && !latestLoadingMore.value) {
          // 防抖处理，避免频繁触发
          if (latestLoadDebounce) clearTimeout(latestLoadDebounce);
          latestLoadDebounce = setTimeout(() => {
            autoLoadMoreLatest();
          }, 300);
        }
      });
    }, {
      rootMargin: '100px 0px', // 提前100px触发
      threshold: 0.1
    });
    
    latestObserver.observe(latestObserverTarget.value);
  }

  // 创建最热配方观察器
  if (popularObserverTarget.value) {
    popularObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && popularHasMore.value && !popularLoadingMore.value) {
          // 防抖处理，避免频繁触发
          if (popularLoadDebounce) clearTimeout(popularLoadDebounce);
          popularLoadDebounce = setTimeout(() => {
            autoLoadMorePopular();
          }, 300);
        }
      });
    }, {
      rootMargin: '100px 0px', // 提前100px触发
      threshold: 0.1
    });
    
    popularObserver.observe(popularObserverTarget.value);
  }
};

// 清理观察器
const cleanupObservers = () => {
  if (latestObserver) {
    latestObserver.disconnect();
    latestObserver = null;
  }
  if (popularObserver) {
    popularObserver.disconnect();
    popularObserver = null;
  }
  if (latestLoadDebounce) clearTimeout(latestLoadDebounce);
  if (popularLoadDebounce) clearTimeout(popularLoadDebounce);
};

onMounted(() => {
  loadStats();
  loadLatestRecipes(1, false);
  loadPopularRecipes(1, false);
  
  // 延迟初始化观察器，确保DOM已渲染
  setTimeout(() => {
    initObservers();
  }, 100);
});

onUnmounted(() => {
  cleanupObservers();
});
</script>

<style scoped>
.home {
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


.stats-section {
  margin-bottom: 40px;
}

.stats-section :deep(.el-card) {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
}

.stats-section :deep(.el-card:hover) {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-300);
}

.stats-section :deep(.el-statistic__content) {
  color: var(--color-text-primary);
}

.stats-section :deep(.el-statistic__title) {
  color: var(--color-text-secondary);
}

.stats-section :deep(.el-icon) {
  color: var(--color-primary-500);
}

.cards-section {
  margin: 40px 0 60px;
}

.explore-card {
  margin-bottom: 20px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
}

.explore-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-300);
}

.explore-card :deep(.el-card__body) {
  padding: 24px;
}

.explore-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.explore-left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  min-width: 0;
}

.explore-left .el-icon {
  background: linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%);
  border-radius: var(--radius-full);
  padding: 12px;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.explore-left .el-icon:hover {
  transform: rotate(15deg) scale(1.1);
}

.explore-text h3 {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.explore-text p {
  margin: 0;
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.feature-card {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  min-height: 360px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
}

.feature-card:hover {
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

.card-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 20px;
}

.card-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--color-primary-100);
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--color-primary-50);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-content {
  text-align: center;
  color: #909399;
}

.placeholder-content p {
  margin: 10px 0;
  font-size: 16px;
}

.placeholder-desc {
  font-size: 14px !important;
  color: #c0c4cc;
  margin-bottom: 20px !important;
}

.recipe-list {
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

.recipe-left {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
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
  flex: 0 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
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
  color: #909399;
  font-weight: bold;
  font-size: 10px;
  flex: 0 0 auto;
  white-space: nowrap;
}

.result {
  padding: 4px 8px;
  background: linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%);
  color: var(--color-primary-800);
  border-radius: var(--radius-base);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
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

.likes {
  color: #f85149;
  font-weight: 500;
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

/* ========== 响应式设计 ========== */

/* 平板端 */
@media (max-width: 1024px) {
  .hero-section {
    padding: 40px 20px;
  }

  .hero-section h2 {
    font-size: 32px;
  }

  .stats-section,
  .cards-section {
    padding: 0 15px;
    margin: 30px auto;
  }

  .feature-card {
    height: 350px;
  }

  .card-content {
    height: 270px;
  }
}

/* 移动端 */
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

  .stats-section,
  .cards-section {
    padding: 0 12px;
    margin: 16px auto;
  }

  /* 统计卡片单列显示 */
  .stats-section :deep(.el-col) {
    width: 100%;
    margin-bottom: 12px;
  }

  /* 探索元素卡片 - 移动端垂直布局 */
  .explore-card :deep(.el-card__body) {
    padding: 16px;
  }

  .explore-content {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .explore-left {
    flex-direction: column;
    gap: 10px;
  }

  .explore-text h3 {
    font-size: 16px;
    color: var(--color-text-primary);
  }

  .explore-text p {
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .feature-card {
    height: auto !important;
    min-height: 320px;
    margin-bottom: 16px;
  }

  .card-content {
    height: auto !important;
    min-height: 240px;
    max-height: none !important;
  }

  /* 配方项优化 - 移动端单行布局 */
  .recipe-item {
    padding: 10px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    column-gap: 4px;
    row-gap: 0;
  }

  .recipe-display {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 3px;
  }

  .recipe-actions {
    flex-shrink: 0;
    gap: 4px;
  }

  /* 物品标签优化 */
  .material,
  .result {
    flex: 0 1 auto;
    font-size: 11px;
    padding: 2px 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
  }

  .plus,
  .arrow {
    flex-shrink: 0;
    font-size: 10px;
  }

  .like-btn,
  .copy-btn {
    flex-shrink: 0;
  }

  .like-btn {
    min-width: 36px;
    height: 26px;
    font-size: 11px;
    padding: 2px 6px;
  }

  .copy-btn {
    width: 26px;
    height: 26px;
    padding: 3px 6px;
  }

  .time {
    flex-shrink: 0;
    font-size: 9px;
    display: none;
  }
}

/* 小屏手机 */
@media (max-width: 414px) {
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

  .explore-card :deep(.el-card__body) {
    padding: 12px;
  }

  .explore-text h3 {
    font-size: 15px;
  }

  .explore-text p {
    font-size: 12px;
  }

  .feature-card {
    min-height: 300px;
  }

  .card-content {
    min-height: 220px;
  }

  .recipe-item {
    padding: 8px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    column-gap: 3px;
    row-gap: 0;
  }

  .recipe-display {
    gap: 2px;
  }

  .recipe-actions {
    gap: 3px;
  }

  .material,
  .result {
    font-size: 10px;
    padding: 2px 4px;
    max-width: 70px;
  }

  .like-btn {
    min-width: 34px;
    height: 24px;
    font-size: 10px;
    padding: 1px 4px;
  }

  .copy-btn {
    width: 24px;
    height: 24px;
    padding: 2px 4px;
  }

  .time {
    font-size: 8px;
    display: none;
  }

  .plus,
  .arrow {
    font-size: 9px;
  }

  .recipe-meta .time {
    display: none;
    /* 超小屏隐藏时间 */
  }
}

/* 自动加载观察器样式 */
.auto-load-observer {
  padding: 20px;
  text-align: center;
  border-top: 1px solid var(--color-border-primary);
  background: var(--color-bg-tertiary);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
}

.load-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 14px;
  padding: 12px 0;
}

.loading-icon {
  animation: spin 1s linear infinite;
  color: var(--color-primary-500);
}

.observer-target {
  height: 1px;
  width: 100%;
  pointer-events: none;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 超小屏手机 */
@media (max-width: 375px) {
  .page-title {
    font-size: 18px;
  }
  
  .page-subtitle {
    font-size: 12px;
    margin-bottom: 10px;
  }
  
  .page-header {
    margin-bottom: 12px;
  }

  .explore-card :deep(.el-card__body) {
    padding: 10px;
  }

  .explore-text h3 {
    font-size: 14px;
  }

  .explore-text p {
    font-size: 11px;
  }

  .feature-card {
    min-height: 280px;
  }

  .card-content {
    min-height: 200px;
  }

  .recipe-item {
    padding: 6px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    column-gap: 2px;
    row-gap: 0;
  }

  .recipe-display {
    gap: 1px;
  }

  .recipe-actions {
    gap: 2px;
  }

  .material,
  .result {
    font-size: 9px;
    padding: 1px 3px;
    max-width: 60px;
  }

  .like-btn {
    min-width: 32px;
    height: 22px;
    font-size: 9px;
    padding: 1px 3px;
  }

  .copy-btn {
    width: 22px;
    height: 22px;
    padding: 2px 3px;
  }

  .time {
    font-size: 7px;
    display: none;
  }

  .plus,
  .arrow {
    font-size: 8px;
  }
}
</style>
