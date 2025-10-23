<template>
  <div class="home">
    <!-- Hero 横幅 -->
    <div class="hero-section">
      <h2>🎮 探索无尽合成的奥秘</h2>
      <p>收集、分享、发现 - 社区驱动的合成配方数据库</p>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="8" :md="8" :lg="8">
          <el-card shadow="hover">
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
          <el-card shadow="hover">
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
          <el-card shadow="hover">
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
          <el-card class="explore-card" shadow="hover">
            <div class="explore-content">
              <div class="explore-left">
                <el-icon size="32" color="#667eea">
                  <StarFilled />
                </el-icon>
                <div class="explore-text">
                  <h3>🎲 探索元素</h3>
                  <p>随机发现一个意想不到的合成元素</p>
                </div>
              </div>
              <el-button type="primary" @click="exploreRandomElement" :loading="loadingRandomElement">
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
            <!-- 卡片底部：加载更多按钮（固定显示，不在滚动区域内） -->
            <div class="card-footer">
              <div class="load-more" v-if="latestHasMore">
                <el-button type="primary" size="small" :loading="latestLoadingMore"
                  @click="loadMoreLatest">加载更多</el-button>
              </div>
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
            <!-- 卡片底部：加载更多按钮（固定显示，不在滚动区域内） -->
            <div class="card-footer">
              <div class="load-more" v-if="popularHasMore">
                <el-button type="primary" size="small" :loading="popularLoadingMore"
                  @click="loadMorePopular">加载更多</el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Box, CircleCheck, StarFilled } from '@element-plus/icons-vue';
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

// 加载更多处理
const loadMoreLatest = async () => {
  if (latestLoadingMore.value || !latestHasMore.value) return;
  latestLoadingMore.value = true;
  await loadLatestRecipes(latestPage.value + 1, true);
};

const loadMorePopular = async () => {
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

onMounted(() => {
  loadStats();
  loadLatestRecipes(1, false);
  loadPopularRecipes(1, false);
});
</script>

<style scoped>
.home {
  background-color: #f5f7fa;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 60px 20px;
  text-align: center;
}

.hero-section h2 {
  font-size: 36px;
  margin-bottom: 10px;
}

.hero-section p {
  font-size: 18px;
  opacity: 0.9;
  margin-bottom: 30px;
}

.stats-section {
  max-width: 1400px;
  margin: 40px auto;
  padding: 0 20px;
}

.cards-section {
  max-width: 1400px;
  margin: 40px auto 60px;
  padding: 0 20px;
}

.explore-card {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border: 1px solid #e4e7ed;
}

.explore-card :deep(.el-card__body) {
  padding: 20px;
}

.explore-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.explore-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.explore-text h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.explore-text p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.feature-card {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  min-height: 360px;
  /* allow content + footer */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.card-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding-bottom: 8px;
  /* space before footer */
}

.card-footer {
  padding: 10px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #fafbfc;
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
  padding: 8px;
  background: #fafbfc;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  transition: all 0.3s;
  /* 使用网格确保三列固定在同一行：配方内容 | 按钮 | 时间 */
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  column-gap: 8px;
  row-gap: 0;
}

.recipe-item:hover {
  background: #f0f2f5;
  border-color: #d0d7de;
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
  padding: 2px 6px;
  background: white;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  color: #606266;
  /* 宽度与文字内容相当 */
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.material.clickable {
  cursor: pointer;
  transition: all 0.2s;
}

.material.clickable:hover {
  background: #f0f2f5;
  border-color: #409eff;
  color: #409eff;
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
  padding: 2px 6px;
  background: #e8f3ff;
  /* 浅色底 */
  color: #0969da;
  /* 与品牌色协调 */
  border-radius: 4px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.result.clickable {
  cursor: pointer;
  transition: all 0.2s;
}

.result.clickable:hover {
  background: #d0e8ff;
  color: #0052b3;
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
  border: 1px solid #e0e3e7;
  background: #ffffff;
  color: #f85149;
  border-radius: 12px;
  padding: 3px 8px;
  line-height: 1;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.3s ease;
  min-width: 40px;
  height: 28px;
}

.like-btn:hover:not(:disabled) {
  background: #fff5f5;
  border-color: #f85149;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(248, 81, 73, 0.15);
}

.like-btn.liked {
  background: #ffe4e4;
  border-color: #ffc2c2;
  color: #f85149;
}

.like-btn.liked:hover:not(:disabled) {
  background: #ffd4d0;
  border-color: #f85149;
  box-shadow: 0 2px 8px rgba(248, 81, 73, 0.2);
}

.like-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.like-btn:active {
  transform: translateY(0);
}

.copy-btn {
  border: 1px solid #e0e3e7;
  background: #ffffff;
  color: #606266;
  border-radius: 12px;
  padding: 4px 8px;
  line-height: 1;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.3s ease;
  width: 28px;
  height: 28px;
}

.copy-btn:hover {
  background: #f0f9ff;
  border-color: #409eff;
  color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.copy-btn:active {
  transform: translateY(0);
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
  .hero-section {
    padding: 24px 16px;
  }

  .hero-section h2 {
    font-size: 22px;
    line-height: 1.3;
  }

  .hero-section p {
    font-size: 14px;
    line-height: 1.5;
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
  }

  .explore-text p {
    font-size: 13px;
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
  .hero-section {
    padding: 20px 12px;
  }

  .hero-section h2 {
    font-size: 20px;
  }

  .hero-section p {
    font-size: 13px;
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

/* 超小屏手机 */
@media (max-width: 375px) {
  .hero-section {
    padding: 16px 10px;
  }

  .hero-section h2 {
    font-size: 18px;
  }

  .hero-section p {
    font-size: 12px;
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
