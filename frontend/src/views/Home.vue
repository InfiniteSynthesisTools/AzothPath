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
        <el-col :xs="24" :sm="12" :lg="6">
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
                    <span class="likes">❤️ {{ recipe.likes || 0 }}</span>
                    <span class="time">{{ formatTimeAgo(recipe.created_at) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 最热配方 -->
        <el-col :xs="24" :sm="12" :lg="6">
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
                    <span class="likes">❤️ {{ recipe.likes || 0 }}</span>
                    <span class="time">{{ formatTimeAgo(recipe.created_at) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 总图显示 -->
        <el-col :xs="24" :sm="12" :lg="6">
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

        <!-- 进入游戏 -->
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="feature-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <h3>🎮 进入游戏</h3>
              </div>
            </template>
            <div class="card-content placeholder">
              <div class="placeholder-content">
                <el-icon size="48" color="#67C23A"><VideoPlay /></el-icon>
                <p>开始游戏</p>
                <p class="placeholder-desc">体验合成乐趣</p>
                <el-button type="success" size="small" @click="goToGame">
                  开始游戏
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
import { Document, Box, CircleCheck, Star, MapLocation, VideoPlay } from '@element-plus/icons-vue';
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

// 跳转到游戏页面
const goToGame = () => {
  // 这里可以跳转到游戏页面，暂时使用提示
  ElMessage.info('游戏功能开发中...');
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
}

.recipe-item:hover {
  background: #f0f2f5;
  border-color: #d0d7de;
}

.recipe-display {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-bottom: 4px;
}

.material {
  padding: 2px 6px;
  background: white;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.plus, .arrow {
  color: #909399;
  font-weight: bold;
  font-size: 10px;
}

.result {
  padding: 2px 6px;
  background: #0969da;
  color: white;
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.emoji {
  font-size: 12px;
  line-height: 1;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
}

.recipe-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #656d76;
}

.likes {
  color: #f85149;
  font-weight: 500;
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
  
  .material, .result {
    max-width: 60px;
    font-size: 10px;
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
