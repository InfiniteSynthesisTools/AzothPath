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
              <el-button link size="small" @click="goToElementDetail(recipe.item_a)" class="element-link">查看详情</el-button>
            </div>
          </div>
          
          <div class="operator-large">+</div>
          
          <div class="ingredient-item">
            <div class="ingredient-emoji-large">{{ recipe.item_b_emoji || '🔘' }}</div>
            <div class="ingredient-text">
              <div class="ingredient-name-large">{{ recipe.item_b }}</div>
              <el-button link size="small" @click="goToElementDetail(recipe.item_b)" class="element-link">查看详情</el-button>
            </div>
          </div>
          
          <div class="operator-large">=</div>
          
          <div class="result-item">
            <div class="result-emoji-large">{{ recipe.result_emoji || '🔘' }}</div>
            <div class="result-text">
              <div class="result-name-large">{{ recipe.result }}</div>
              <el-button link size="small" @click="goToElementDetail(recipe.result)" class="element-link">查看详情</el-button>
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
              <div class="stat-icon">👤</div>
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
                  :percentage="(recipe.depth || 0) * 10" 
                  :color="getDifficultyColor((recipe.depth || 0) * 10)"
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
                  :percentage="(recipe.width || 0) * 10" 
                  :color="getDifficultyColor((recipe.width || 0) * 10)"
                />
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8">
            <div class="difficulty-card">
              <div class="difficulty-label">广度</div>
              <div class="difficulty-value">{{ recipe.breadth || 0 }}</div>
              <div class="difficulty-bar">
                <el-progress 
                  :percentage="Math.min((recipe.breadth || 0) * 10, 100)" 
                  :color="getDifficultyColor(Math.min((recipe.breadth || 0) * 10, 100))"
                />
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 材料来源 -->
      <div class="material-sources-section">
        <h2 class="section-title">材料来源</h2>
        <el-row :gutter="20">
          <el-col :xs="12" :sm="12">
            <div class="source-card">
              <div class="source-title">{{ recipe.item_a }} 的合成方式</div>
              <div v-if="recipesForItemA.length > 0" class="recipes-source-list">
                <div v-for="r in recipesForItemA" :key="r.id" class="recipe-source-item">
                  <span class="recipe-formula">{{ r.item_a }} + {{ r.item_b }} = {{ r.result }}</span>
                  <el-button link size="small" @click="goToRecipeDetail(r)">查看</el-button>
                </div>
              </div>
              <div v-else class="no-source">
                <el-empty description="暂无合成方式" />
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="12">
            <div class="source-card">
              <div class="source-title">{{ recipe.item_b }} 的合成方式</div>
              <div v-if="recipesForItemB.length > 0" class="recipes-source-list">
                <div v-for="r in recipesForItemB" :key="r.id" class="recipe-source-item">
                  <span class="recipe-formula">{{ r.item_a }} + {{ r.item_b }} = {{ r.result }}</span>
                  <el-button link size="small" @click="goToRecipeDetail(r)">查看</el-button>
                </div>
              </div>
              <div v-else class="no-source">
                <el-empty description="暂无合成方式" />
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 衍生配方 -->
      <div class="derived-recipes-section">
        <h2 class="section-title">衍生配方</h2>
        <div class="section-subtitle">使用该配方结果作为材料的其他配方</div>
        <div v-if="derivedRecipes.length > 0" class="derived-recipes-list">
          <div v-for="r in derivedRecipes" :key="r.id" class="derived-recipe-item">
            <div class="derived-recipe-formula">
              <span class="formula-text">{{ r.item_a }} + {{ r.item_b }} = <strong>{{ r.result }}</strong></span>
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
import { ref, onMounted } from 'vue';
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

    const data = await recipeApi.detail(recipeId);
    if (data) {
      recipe.value = data;
      
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

// 获取物品的合成配方
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

// 跳转到元素详情页
const goToElementDetail = async (elementName: string) => {
  try {
    const response = await recipeApi.getItems({
      search: elementName,
      limit: 1,
      exact: true
    });
    
    if (response && response.items && response.items.length > 0) {
      const elementData = response.items[0];
      if (elementData && elementData.id) {
        router.push(`/element/${elementData.id}`);
      } else {
        ElMessage.warning(`未找到元素: ${elementName}`);
      }
    } else {
      ElMessage.warning(`未找到元素: ${elementName}`);
    }
  } catch (error) {
    console.error('跳转到元素详情失败:', error);
    ElMessage.error('跳转失败，请稍后重试');
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
  padding: 20px;
}

.back-section {
  margin-bottom: 20px;
}

.back-button {
  font-size: 16px;
}

.loading-container {
  padding: 40px 20px;
}

.recipe-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* 大卡片样式 */
.recipe-card-large {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.recipe-formula-large {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.ingredient-item,
.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 16px 20px;
  border-radius: 12px;
  flex: 1;
  min-width: 150px;
  max-width: 200px;
}

.ingredient-emoji-large,
.result-emoji-large {
  font-size: 32px;
  width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.ingredient-text,
.result-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ingredient-name-large,
.result-name-large {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.element-link {
  color: #409eff;
  padding: 2px 0;
  height: auto;
}

.operator-large {
  font-size: 24px;
  font-weight: bold;
  color: #606266;
  min-width: 30px;
  text-align: center;
}

/* 操作按钮 */
.recipe-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  color: #303133;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  color: #303133;
  margin: 0 0 24px 0;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.section-subtitle {
  font-size: 14px;
  color: #909399;
  margin-top: -12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 28px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
  word-break: break-word;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

/* 难度卡片 */
.difficulty-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #f0f0f0;
  text-align: center;
}

.difficulty-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.difficulty-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 12px;
}

.difficulty-bar {
  width: 100%;
}

/* 材料来源 */
.source-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #f0f0f0;
  min-height: 200px;
}

.source-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
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
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 14px;
}

.recipe-formula {
  flex: 1;
  color: #606266;
}

.no-source {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  color: #909399;
}

/* 衍生配方 */
.derived-recipes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.derived-recipe-item {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.derived-recipe-item:hover {
  background: white;
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.derived-recipe-formula {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.formula-text {
  flex: 1;
  color: #606266;
  font-size: 14px;
}

.no-recipes {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  background: #f8f9fa;
  border-radius: 10px;
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
    padding: 12px;
  }

  .recipe-card-large {
    padding: 20px;
  }

  .recipe-formula-large {
    gap: 10px;
    margin-bottom: 20px;
  }

  .ingredient-item,
  .result-item {
    min-width: 120px;
    max-width: 150px;
    padding: 12px 16px;
  }

  .ingredient-emoji-large,
  .result-emoji-large {
    font-size: 24px;
    width: 40px;
  }

  .ingredient-name-large,
  .result-name-large {
    font-size: 14px;
  }

  .operator-large {
    font-size: 20px;
    min-width: 20px;
  }

  .section-title {
    font-size: 20px;
    margin-bottom: 16px;
  }

  .action-btn {
    padding: 8px 16px;
    font-size: 12px;
  }
}
</style>
