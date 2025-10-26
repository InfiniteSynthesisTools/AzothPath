<template>
  <div class="recipe-detail-page">
    <!-- 返回按钮 -->
    <div class="back-section">
      <el-button 
        type="primary" 
        link 
        @click="goBack"
        class="back-button"
      >
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 配方详情内容 -->
    <div v-else-if="recipe" class="recipe-content">
      <!-- 配方大卡片 -->
      <div class="recipe-card-large">
        <div class="recipe-formula-large">
          <div class="ingredient-item">
            <div class="ingredient-emoji-large">{{ recipe.item_a_emoji || '🔘' }}</div>
            <div class="ingredient-text">
              <div class="ingredient-name-large">{{ recipe.item_a }}</div>
            </div>
          </div>
          
          <div class="operator-large">+</div>
          
          <div class="ingredient-item">
            <div class="ingredient-emoji-large">{{ recipe.item_b_emoji || '🔘' }}</div>
            <div class="ingredient-text">
              <div class="ingredient-name-large">{{ recipe.item_b }}</div>
            </div>
          </div>
          
          <div class="operator-large">=</div>
          
          <div class="result-item">
            <div class="result-emoji-large">{{ recipe.result_emoji || '🔘' }}</div>
            <div class="result-text">
              <div class="result-name-large">{{ recipe.result }}</div>
            </div>
          </div>
        </div>

        <!-- 配方操作按钮 -->
        <div class="recipe-actions">
          <button class="action-btn like-btn" :class="{ liked: recipe.is_liked }" @click="toggleLikeRecipe" :disabled="toggling">
            <span class="heart">❤</span> 
            <span class="count">{{ recipe.likes || 0 }}</span>
          </button>
          <button class="action-btn copy-btn" @click="copyRecipe" title="复制配方">
            <CopyIcon />
            <span>复制</span>
          </button>
          <button class="action-btn share-btn" @click="copyShareLink" title="复制分享链接">
            <span>🔗</span>
            <span>分享</span>
          </button>
        </div>
      </div>

      <!-- 配方信息统计 -->
      <div class="recipe-stats-section">
        <el-row :gutter="20">
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">{{ recipe.creator_emoji || '👤' }}</div>
              <div class="stat-content">
                <div class="stat-value">{{ recipe.creator_name || '未知用户' }}</div>
                <div class="stat-label">发现者</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">📅</div>
              <div class="stat-content">
                <div class="stat-value">{{ formatDate(recipe.created_at) }}</div>
                <div class="stat-label">发现时间</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">❤️</div>
              <div class="stat-content">
                <div class="stat-value">{{ recipe.likes || 0 }}</div>
                <div class="stat-label">点赞数</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">🔗</div>
              <div class="stat-content">
                <div class="stat-value">ID: {{ recipe.id }}</div>
                <div class="stat-label">配方编号</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 合成难度 -->
      <div class="difficulty-section">
        <h2 class="section-title">合成难度</h2>
        <el-row :gutter="20">
          <el-col :xs="12" :sm="8">
            <div class="difficulty-card">
              <div class="difficulty-label">深度</div>
              <div class="difficulty-value">{{ recipe.depth || 0 }}</div>
              <div class="difficulty-bar">
                <el-progress 
                  :percentage="Math.min((recipe.depth || 0) * 10, 100)" 
                  :color="getDifficultyColor(Math.min((recipe.depth || 0) * 10, 100))"
                  :show-text="true"
                  :format="(percentage: number) => `${recipe.depth || 0} (${percentage}%)`"
                />
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8">
            <div class="difficulty-card">
              <div class="difficulty-label">宽度</div>
              <div class="difficulty-value">{{ recipe.width || 0 }}</div>
              <div class="difficulty-bar">
                <el-progress 
                  :percentage="Math.min((recipe.width || 0) * 10, 100)" 
                  :color="getDifficultyColor(Math.min((recipe.width || 0) * 10, 100))"
                  :show-text="true"
                  :format="(percentage: number) => `${recipe.width || 0} (${percentage}%)`"
                />
              </div>
            </div>
          </el-col>

        </el-row>
      </div>

      <!-- 材料来源 -->
      <div class="material-sources-section">
        <h2 class="section-title">材料来源</h2>
        <div class="sources-container">
          <!-- 合并相同物品的合成方式 -->
          <div v-for="(sourceData, itemName) in mergedSources" :key="itemName" class="source-card">
            <div class="source-title">{{ itemName }} 的合成方式</div>
            <div v-if="sourceData.length > 0" class="recipes-source-list">
              <div v-for="r in sourceData" :key="r.id" class="recipe-source-item">
                <div class="recipe-formula">
                  <span class="ingredient-emoji">{{ r.item_a_emoji || '🔘' }}</span>
                  <span class="ingredient-name">{{ r.item_a }}</span>
                  <span class="operator">+</span>
                  <span class="ingredient-emoji">{{ r.item_b_emoji || '🔘' }}</span>
                  <span class="ingredient-name">{{ r.item_b }}</span>
                  <span class="operator">=</span>
                  <span class="result-emoji">{{ r.result_emoji || '🔘' }}</span>
                  <span class="result-name">{{ r.result }}</span>
                </div>
                <el-button link size="small" @click="goToRecipeDetail(r)">查看</el-button>
              </div>
            </div>
            <div v-else class="no-source">
              <el-empty description="暂无合成方式" />
            </div>
          </div>
        </div>
      </div>

      <!-- 衍生配方 -->
      <div class="derived-recipes-section">
        <h2 class="section-title">衍生配方</h2>
        <div v-if="derivedRecipes.length > 0" class="derived-recipes-list">
          <div v-for="r in derivedRecipes" :key="r.id" class="derived-recipe-item">
            <div class="derived-recipe-formula">
              <div class="formula-content">
                <span class="ingredient-emoji">{{ r.item_a_emoji || '🔘' }}</span>
                <span class="ingredient-name">{{ r.item_a }}</span>
                <span class="operator">+</span>
                <span class="ingredient-emoji">{{ r.item_b_emoji || '🔘' }}</span>
                <span class="ingredient-name">{{ r.item_b }}</span>
                <span class="operator">=</span>
                <span class="result-emoji">{{ r.result_emoji || '🔘' }}</span>
                <span class="result-name"><strong>{{ r.result }}</strong></span>
              </div>
              <el-button link size="small" @click="goToRecipeDetail(r)">查看</el-button>
            </div>
          </div>
        </div>
        <div v-else class="no-recipes">
          <el-empty description="暂无衍生配方" />
        </div>
      </div>

    </div>

    <!-- 配方不存在 -->
    <div v-else class="not-found">
      <el-empty description="配方不存在" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import CopyIcon from '@/components/icons/CopyIcon.vue';
import { copyToClipboard } from '@/composables/useClipboard';
import { recipeApi } from '@/api';
import type { Recipe } from '@/types';

const route = useRoute();
const router = useRouter();

const recipe = ref<any>(null);
const loading = ref(false);
const toggling = ref(false);
const recipesForItemA = ref<Recipe[]>([]);
const recipesForItemB = ref<Recipe[]>([]);
const derivedRecipes = ref<Recipe[]>([]);

// 合并相同物品的材料来源
const mergedSources = computed(() => {
  const sources: Record<string, Recipe[]> = {};
  
  // 只处理主配方的两个材料
  const mainRecipe = recipe.value;
  if (!mainRecipe) return sources;
  
  // 总是显示两个材料来源，即使没有合成方式
  sources[mainRecipe.item_a] = recipesForItemA.value || [];
  sources[mainRecipe.item_b] = recipesForItemB.value || [];
  
  return sources;
});

// 格式化日期
const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// 根据百分比获取难度颜色
const getDifficultyColor = (percentage: number): string => {
  if (percentage <= 25) return '#67C23A'; // 绿色 - 简单
  if (percentage <= 50) return '#409EFF'; // 蓝色 - 中等
  if (percentage <= 75) return '#E6A23C'; // 橙色 - 困难
  return '#F56C6C'; // 红色 - 非常困难
};

// 获取配方详情
const fetchRecipeDetail = async () => {
  loading.value = true;
  try {
    const recipeId = parseInt(route.params.id as string);
    
    if (isNaN(recipeId)) {
      ElMessage.error('无效的配方ID');
      return;
    }

    // 获取配方详情，包含统计信息
    const data = await recipeApi.detail(recipeId);
    if (data) {
      recipe.value = data;
      console.log('配方详情数据:', data);
      console.log('深度:', data.depth, '宽度:', data.width);
      
      // 如果没有统计信息，尝试从列表API获取
      if (!data.depth && !data.width) {
        console.log('配方详情中没有统计信息，尝试从列表API获取...');
        try {
          const listResponse = await recipeApi.list({
            result: data.result,
            includeStats: true,
            limit: 1
          });
          if (listResponse.recipes && listResponse.recipes.length > 0) {
            const recipeWithStats = listResponse.recipes[0];
            recipe.value = {
              ...data,
              depth: recipeWithStats.depth,
              width: recipeWithStats.width,
              breadth: recipeWithStats.breadth
            };
            console.log('从列表API获取的统计信息:', {
              depth: recipeWithStats.depth,
              width: recipeWithStats.width,
              breadth: recipeWithStats.breadth
            });
          }
        } catch (error) {
          console.error('获取统计信息失败:', error);
        }
      }
      
      // 并行获取关联的配方
      await Promise.all([
        fetchRecipesForItem(data.item_a),
        fetchRecipesForItem(data.item_b),
        fetchDerivedRecipes(data.result)
      ]);
    } else {
      ElMessage.error('获取配方详情失败');
    }
  } catch (error: any) {
    console.error('获取配方详情失败:', error);
    if (error.response?.status === 404) {
      ElMessage.error('配方不存在');
    } else {
      ElMessage.error('获取配方详情失败，请稍后重试');
    }
  } finally {
    loading.value = false;
  }
};

// 获取物品的合成配方（该物品作为结果的配方）
const fetchRecipesForItem = async (itemName: string) => {
  try {
    const response = await recipeApi.list({
      result: itemName,
      limit: 5
    });
    
    if (response && response.recipes) {
      if (itemName === recipe.value?.item_a) {
        recipesForItemA.value = response.recipes;
      } else if (itemName === recipe.value?.item_b) {
        recipesForItemB.value = response.recipes;
      }
    }
  } catch (error: any) {
    console.error(`获取 ${itemName} 的配方失败:`, error);
  }
};

// 获取衍生配方（使用结果作为材料的配方）
const fetchDerivedRecipes = async (resultItem: string) => {
  try {
    const response = await recipeApi.list({
      material: resultItem,
      limit: 10
    });
    
    if (response && response.recipes) {
      derivedRecipes.value = response.recipes;
    }
  } catch (error: any) {
    console.error(`获取 ${resultItem} 的衍生配方失败:`, error);
  }
};

// 跳转到其他配方详情页
const goToRecipeDetail = (r: Recipe) => {
  router.push({
    name: 'RecipeDetail',
    params: { id: r.id }
  });
};

// 返回上一页
const goBack = () => {
  router.back();
};

// 复制整条配方文本
const copyRecipe = async () => {
  if (!recipe.value) return;
  const text = `${recipe.value.item_a} + ${recipe.value.item_b} = ${recipe.value.result}`;
  const ok = await copyToClipboard(text);
  if (ok) ElMessage.success(`已复制配方: ${text}`);
  else ElMessage.error('复制失败');
};

// 复制分享链接
const copyShareLink = async () => {
  if (!recipe.value) return;
  const link = `${window.location.origin}${router.currentRoute.value.fullPath}`;
  const ok = await copyToClipboard(link);
  if (ok) ElMessage.success('已复制分享链接');
  else ElMessage.error('复制失败');
};

// 点赞/取消点赞
const toggleLikeRecipe = async () => {
  if (toggling.value) return;
  toggling.value = true;
  try {
    const res = await recipeApi.like(recipe.value.id);
    recipe.value.is_liked = res.liked;
    recipe.value.likes = res.likes;
    const message = res.liked ? '点赞成功' : '取消点赞成功';
    ElMessage.success(message);
  } catch (error: any) {
    if (error?.response?.status === 401) {
      ElMessage.warning('请先登录后再点赞');
    } else {
      ElMessage.error(error?.response?.data?.message || '操作失败');
    }
  } finally {
    toggling.value = false;
  }
};

// 组件挂载时获取数据
onMounted(() => {
  fetchRecipeDetail();
});
</script>

<style scoped>
.recipe-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: calc(100vh - 60px);
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
}

.back-section {
  margin-bottom: 24px;
}

.back-button {
  font-size: 14px;
  color: #409eff;
  align-self: flex-start;
}

.loading-container {
  padding: 40px 20px;
}

.recipe-content {
  background: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border-primary);
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* 大卡片样式 */
.recipe-card-large {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.recipe-formula-large {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.ingredient-item,
.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-primary);
  padding: 12px 16px;
  border-radius: var(--radius-base);
  flex: 1;
  min-width: 120px;
  max-width: 160px;
  border: 1px solid var(--color-border-primary);
}

.ingredient-emoji-large,
.result-emoji-large {
  font-size: 24px;
  width: 30px;
  text-align: center;
  flex-shrink: 0;
}

.ingredient-text,
.result-text {
  flex: 1;
  display: flex;
  align-items: center;
}

.ingredient-name-large,
.result-name-large {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.operator-large {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-text-tertiary);
  min-width: 20px;
  text-align: center;
}

/* 操作按钮 */
.recipe-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-base);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.action-btn:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.like-btn {
  color: #f56c6c;
}

.like-btn.liked {
  background: #fde6e6;
  color: #f56c6c;
}

.copy-btn {
  color: #409eff;
}

.share-btn {
  color: #67c23a;
}

.count {
  font-weight: 700;
}

/* 统计信息 */
.recipe-stats-section,
.difficulty-section,
.material-sources-section,
.derived-recipes-section {
  padding: 0;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-primary);
}

.section-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: -12px;
  margin-bottom: 20px;
}

/* 统计信息 */
.recipe-stats-section {
  margin-bottom: 40px;
}

.recipe-stats-section .el-row {
  margin: 0 -10px;
}

.recipe-stats-section .el-col {
  padding: 0 10px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.stat-card:hover {
  background: var(--color-bg-secondary);
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-accent);
}

.stat-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
  border-radius: var(--radius-base);
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* 难度卡片 */
.difficulty-card {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--color-border-primary);
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.difficulty-label {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.difficulty-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.difficulty-bar {
  width: 100%;
}

/* 材料来源 */
.sources-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.source-card {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--color-border-primary);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.source-card:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-md);
}

.source-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.recipes-source-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.recipe-source-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg-primary);
  border-radius: var(--radius-base);
  font-size: 14px;
  border: 1px solid var(--color-border-primary);
  transition: all var(--transition-base);
}

.recipe-source-item:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
}

.recipe-formula {
  flex: 1;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ingredient-emoji,
.result-emoji {
  font-size: 16px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ingredient-name,
.result-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.operator {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  padding: 0 4px;
}

.no-source {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-primary);
  color: var(--color-text-secondary);
}

/* 衍生配方 */
.derived-recipes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.derived-recipe-item {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--color-border-primary);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.derived-recipe-item:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-md);
}

.derived-recipe-formula {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.formula-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.formula-text {
  flex: 1;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.no-recipes {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-primary);
  color: var(--color-text-secondary);
}

.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .recipe-detail-page {
    padding: 8px;
  }
  
  .recipe-content {
    padding: 16px;
    border-radius: 8px;
  }

  .back-button {
    font-size: 14px;
    margin-bottom: 12px;
  }

  .recipe-card-large {
    padding: 20px;
  }

  .recipe-formula-large {
    gap: 12px;
    margin-bottom: 16px;
  }

  .ingredient-item,
  .result-item {
    min-width: 100px;
    max-width: 140px;
    padding: 10px 12px;
  }

  .ingredient-emoji-large,
  .result-emoji-large {
    font-size: 20px;
    width: 24px;
  }

  .ingredient-name-large,
  .result-name-large {
    font-size: 12px;
  }

  .operator-large {
    font-size: 16px;
    min-width: 16px;
  }

  .action-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  /* 配方emoji移动端优化 */
  .recipe-formula {
    gap: 6px;
  }

  .ingredient-emoji,
  .result-emoji {
    font-size: 14px;
    width: 18px;
    height: 18px;
  }

  .ingredient-name,
  .result-name {
    font-size: 12px;
  }

  .operator {
    font-size: 12px;
    padding: 0 2px;
  }

  .formula-content {
    gap: 6px;
  }

  /* 材料来源移动端优化 */
  .sources-container {
    gap: 12px;
  }

  .source-card {
    padding: 16px;
  }

  .source-title {
    font-size: 14px;
    margin-bottom: 12px;
  }

  /* 统计卡片移动端优化 */
  .recipe-stats-section .el-row {
    margin: 0 -6px;
  }

  .recipe-stats-section .el-col {
    padding: 0 6px;
    margin-bottom: 12px;
  }

  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 8px;
    padding: 12px;
    min-height: 80px;
  }
  
  .stat-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  .stat-value {
    font-size: 18px;
    font-weight: 700;
  }
  
  .stat-label {
    font-size: 12px;
    line-height: 1.2;
  }
}

@media (max-width: 480px) {
  .recipe-detail-page {
    padding: 6px;
  }
  
  .recipe-content {
    padding: 12px;
    border-radius: 6px;
  }

  .back-button {
    font-size: 13px;
    margin-bottom: 10px;
  }

  /* 主配方公式小屏幕优化 */
  .recipe-card-large {
    padding: 16px;
  }

  .recipe-formula-large {
    gap: 8px;
    margin-bottom: 12px;
  }

  .ingredient-item,
  .result-item {
    min-width: 80px;
    max-width: 120px;
    padding: 8px 10px;
  }

  .ingredient-emoji-large,
  .result-emoji-large {
    font-size: 18px;
    width: 20px;
  }

  .ingredient-name-large,
  .result-name-large {
    font-size: 11px;
  }

  .operator-large {
    font-size: 14px;
    min-width: 12px;
  }

  /* 操作按钮小屏幕优化 */
  .action-btn {
    padding: 5px 10px;
    font-size: 11px;
  }

  /* 统计卡片小屏幕优化 */
  .recipe-stats-section .el-row {
    margin: 0 -4px;
  }

  .recipe-stats-section .el-col {
    padding: 0 4px;
    margin-bottom: 8px;
  }

  .stat-card {
    padding: 10px;
    min-height: 70px;
    gap: 6px;
  }
  
  .stat-icon {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
  
  .stat-value {
    font-size: 16px;
  }
  
  .stat-label {
    font-size: 10px;
    line-height: 1.1;
  }

  /* 材料来源小屏幕优化 */
  .sources-container {
    gap: 10px;
  }

  .source-card {
    padding: 12px;
  }

  .source-title {
    font-size: 13px;
    margin-bottom: 10px;
  }

  /* 配方emoji小屏幕优化 */
  .recipe-formula {
    gap: 4px;
  }

  .ingredient-emoji,
  .result-emoji {
    font-size: 12px;
    width: 16px;
    height: 16px;
  }

  .ingredient-name,
  .result-name {
    font-size: 11px;
  }

  .operator {
    font-size: 11px;
    padding: 0 1px;
  }

  .formula-content {
    gap: 4px;
  }
}
</style>
