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
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.total_recipes" title="配方总数">
              <template #prefix>
                <el-icon><Document /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.total_items" title="物品总数">
              <template #prefix>
                <el-icon><Box /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.reachable_items" title="可合成物品">
              <template #prefix>
                <el-icon><CircleCheck /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.base_items" title="基础材料">
              <template #prefix>
                <el-icon><Star /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 四个卡片区域 -->
    <div class="cards-section">
      <el-row :gutter="20">
        <!-- 最新配方 -->
        <el-col :xs="24" :sm="12" :md="12" :lg="12">
          <el-card class="feature-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <h3>🆕 最新配方</h3>
              </div>
            </template>
            <div class="card-content" v-loading="loadingLatest">
              <div class="recipe-list">
                <div 
                  v-for="recipe in latestRecipes" 
                  :key="recipe.id" 
                  class="recipe-item"
                >
                  <div class="recipe-display">
                    <span class="material">
                      <span v-if="recipe.item_a_emoji" class="emoji">{{ recipe.item_a_emoji }}</span>
                      {{ recipe.item_a }}
                    </span>
                    <span class="plus">+</span>
                    <span class="material">
                      <span v-if="recipe.item_b_emoji" class="emoji">{{ recipe.item_b_emoji }}</span>
                      {{ recipe.item_b }}
                    </span>
                    <span class="arrow">→</span>
                    <span class="result">
                      <span v-if="recipe.result_emoji" class="emoji">{{ recipe.result_emoji }}</span>
                      {{ recipe.result }}
                    </span>
                  </div>
                  <div class="recipe-meta">
                    <button class="like-btn" :class="{ liked: recipe.is_liked }" @click="toggleLikeRecipe(recipe)" :disabled="togglingIds.has(recipe.id)">
                      <span class="heart">❤</span> {{ recipe.likes || 0 }}
                    </button>
                    <span class="time">{{ formatTimeAgo(recipe.created_at) }}</span>
                  </div>
                </div>
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
                <div 
                  v-for="recipe in popularRecipes" 
                  :key="recipe.id" 
                  class="recipe-item"
                >
                  <div class="recipe-display">
                    <span class="material">
                      <span v-if="recipe.item_a_emoji" class="emoji">{{ recipe.item_a_emoji }}</span>
                      {{ recipe.item_a }}
                    </span>
                    <span class="plus">+</span>
                    <span class="material">
                      <span v-if="recipe.item_b_emoji" class="emoji">{{ recipe.item_b_emoji }}</span>
                      {{ recipe.item_b }}
                    </span>
                    <span class="arrow">→</span>
                    <span class="result">
                      <span v-if="recipe.result_emoji" class="emoji">{{ recipe.result_emoji }}</span>
                      {{ recipe.result }}
                    </span>
                  </div>
                  <div class="recipe-meta">
                    <button class="like-btn" :class="{ liked: recipe.is_liked }" @click="toggleLikeRecipe(recipe)" :disabled="togglingIds.has(recipe.id)">
                      <span class="heart">❤</span> {{ recipe.likes || 0 }}
                    </button>
                    <span class="time">{{ formatTimeAgo(recipe.created_at) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 总图显示 -->
        <el-col :xs="24" :sm="24" :md="24" :lg="24">
          <el-card class="feature-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <h3>🗺️ 总图显示</h3>
              </div>
            </template>
            <div class="card-content placeholder">
              <div class="placeholder-content">
                <el-icon size="48" color="#909399"><MapLocation /></el-icon>
                <p>合成图谱总览</p>
                <p class="placeholder-desc">查看完整的合成关系图谱</p>
                <el-button type="primary" size="small" @click="goToGraph">
                  查看图谱
                </el-button>
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
import { Document, Box, CircleCheck, Star, MapLocation } from '@element-plus/icons-vue';
import { recipeApi } from '@/api';
import { formatDateTime } from '@/utils/format';

const router = useRouter();
const loadingLatest = ref(false);
const loadingPopular = ref(false);

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
const loadLatestRecipes = async () => {
  loadingLatest.value = true;
  try {
    const response = await recipeApi.list({
      page: 1,
      limit: 10,
      orderBy: 'created_at'
    }) as any;
    latestRecipes.value = response.recipes || [];
  } catch (error) {
    console.error('加载最新配方失败:', error);
  } finally {
    loadingLatest.value = false;
  }
};

// 加载最热配方
const loadPopularRecipes = async () => {
  loadingPopular.value = true;
  try {
    const response = await recipeApi.list({
      page: 1,
      limit: 10,
      orderBy: 'likes'
    }) as any;
    popularRecipes.value = response.recipes || [];
  } catch (error) {
    console.error('加载最热配方失败:', error);
  } finally {
    loadingPopular.value = false;
  }
};

// 跳转到图谱页面
const goToGraph = () => {
  router.push({ name: 'GraphView' });
};

onMounted(() => {
  loadStats();
  loadLatestRecipes();
  loadPopularRecipes();
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

.feature-card {
  height: 400px;
  margin-bottom: 20px;
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
  height: 320px;
  overflow-y: auto;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.recipe-item:hover {
  background: #f0f2f5;
  border-color: #d0d7de;
}

.recipe-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 0;
  flex: 1 1 auto;
  min-width: 0;
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
  flex: 0 0 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plus, .arrow {
  color: #909399;
  font-weight: bold;
  font-size: 10px;
  flex: 0 0 auto;
  white-space: nowrap;
}

.result {
  padding: 2px 6px;
  background: #e8f3ff; /* 浅色底 */
  color: #0969da; /* 与品牌色协调 */
  border-radius: 4px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.emoji {
  font-size: 12px;
  line-height: 1;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
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

.like-btn {
  border: 1px solid #e0e3e7;
  background: #ffffff;
  color: #f85149;
  border-radius: 12px;
  padding: 2px 8px;
  line-height: 1;
  font-size: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.like-btn:hover:not(:disabled) {
  background: #fff5f5;
}
.like-btn.liked {
  background: #ffe4e4;
  border-color: #ffc2c2;
}
.like-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
    padding: 30px 15px;
  }
  
  .hero-section h2 {
    font-size: 24px;
  }
  
  .hero-section p {
    font-size: 14px;
  }
  
  .stats-section,
  .cards-section {
    padding: 0 12px;
    margin: 20px auto;
  }
  
  /* 统计卡片单列显示 */
  .stats-section :deep(.el-col) {
    width: 100%;
    margin-bottom: 12px;
  }
  
  .feature-card {
    height: 300px;
    margin-bottom: 15px;
  }
  
  .card-content {
    height: 220px;
  }
  
  .recipe-display {
    flex-wrap: wrap;
    gap: 2px;
  }
  
  /* 移动端下整体改为上下布局，避免右侧信息拥挤 */
  .recipe-item {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  .recipe-meta {
    justify-content: space-between;
    white-space: normal;
  }
  
  /* 移动端限制宽度，避免过长导致拥挤 */
  .material, .result {
    max-width: 60px;
    font-size: 10px;
    flex: 0 1 auto;
  }
}

/* 小屏手机 */
@media (max-width: 375px) {
  .hero-section {
    padding: 20px 12px;
  }
  
  .hero-section h2 {
    font-size: 20px;
  }
  
  .feature-card {
    height: 280px;
  }
  
  .card-content {
    height: 200px;
  }
}
</style>
