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

    <!-- 最新配方 -->
    <div class="recipes-section">
      <el-card>
        <template #header>
          <div class="section-header">
            <h3>📋 最新配方</h3>
            <el-button type="primary" link @click="router.push('/recipes')">
              查看全部 →
            </el-button>
          </div>
        </template>
        <div class="recipe-list" v-loading="loadingRecipes">
          <div 
            v-for="recipe in latestRecipes" 
            :key="recipe.id" 
            class="recipe-item"
          >
            <div class="recipe-content">
              <div class="materials">
                <span class="material">
                  <span v-if="recipe.item_a_emoji" class="emoji">{{ recipe.item_a_emoji }}</span>
                  <span class="text">{{ recipe.item_a }}</span>
                </span>
                <span class="plus">+</span>
                <span class="material">
                  <span v-if="recipe.item_b_emoji" class="emoji">{{ recipe.item_b_emoji }}</span>
                  <span class="text">{{ recipe.item_b }}</span>
                </span>
              </div>
              <div class="arrow">→</div>
              <div class="result">
                <span v-if="recipe.result_emoji" class="emoji">{{ recipe.result_emoji }}</span>
                <span class="text">{{ recipe.result }}</span>
              </div>
            </div>
            <div class="recipe-info">
              <span class="author">{{ recipe.creator_name || '未知' }}</span>
              <span class="likes">❤️ {{ recipe.likes || 0 }}</span>
              <span class="time">{{ formatTime(recipe.created_at) }}</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { recipeApi } from '@/api';

const router = useRouter();
const loadingRecipes = ref(false);

// 定义包含emoji的配方类型
interface RecipeWithEmoji {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;
  is_verified: number;
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
  base_items: 6
});

const latestRecipes = ref<RecipeWithEmoji[]>([]);

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
  loadingRecipes.value = true;
  try {
    const response = await recipeApi.list({
      page: 1,
      limit: 10
    }) as any;
    latestRecipes.value = response.recipes || [];
  } catch (error) {
    console.error('加载最新配方失败:', error);
  } finally {
    loadingRecipes.value = false;
  }
};


// 格式化时间
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

onMounted(() => {
  loadStats();
  loadLatestRecipes();
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

.search-card, .path-search-card {
  max-width: 800px;
  margin: 20px auto;
}

.path-search-card h3 {
  margin-bottom: 15px;
  text-align: left;
  color: white;
}

.stats-section {
  max-width: 1400px;
  margin: 40px auto;
  padding: 0 20px;
}

.recipes-section {
  max-width: 1400px;
  margin: 40px auto 60px;
  padding: 0 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

/* Emoji 样式 */
.item-with-emoji {
  display: flex;
  align-items: center;
  gap: 6px;
}

.emoji {
  font-size: 16px;
  line-height: 1;
}

/* 搜索建议样式 */
.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e4e7ed;
  border-top: none;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f5f7fa;
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: #f5f7fa;
}

.suggestion-item:last-child {
  border-bottom: none;
}

/* 配方列表布局 */
.recipe-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.recipe-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafbfc;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.recipe-item:hover {
  background: #f5f7fa;
  border-color: #d0d7de;
}

.recipe-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.materials {
  display: flex;
  align-items: center;
  gap: 8px;
}

.material {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: white;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.plus {
  font-size: 16px;
  color: #656d76;
  font-weight: 600;
}

.arrow {
  font-size: 18px;
  color: #0969da;
  font-weight: 600;
  margin: 0 4px;
}

.result {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #0969da;
  color: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
}

.emoji {
  font-size: 16px;
  line-height: 1;
}

.text {
  font-size: 14px;
}

.recipe-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #656d76;
}

.author {
  font-weight: 500;
}

.likes {
  color: #f85149;
  font-weight: 500;
}

.time {
  color: #656d76;
}
</style>


