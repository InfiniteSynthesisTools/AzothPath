<template>
  <div class="recipe-detail-page">
    <div class="page-container">
      <!-- 返回按钮 -->
      <div class="back-button">
        <el-button @click="goBack" :icon="ArrowLeft">返回</el-button>
      </div>

      <div class="detail-content" v-loading="loading">
        <!-- 配方详情卡片 -->
        <el-card class="recipe-detail-card" v-if="recipe">
          <template #header>
            <div class="card-header">
              <h2>配方详情</h2>
              <div class="recipe-actions">
                <el-button
                  :type="recipe.is_liked ? 'warning' : 'primary'"
                  @click="handleLike"
                  :loading="likeLoading"
                >
                  {{ recipe.is_liked ? '已赞' : '点赞' }}
                </el-button>
              </div>
            </div>
          </template>

          <!-- 配方公式 -->
          <div class="recipe-formula-large">
            <div class="material-item-large">
              <span v-if="recipe.item_a_emoji" class="emoji-large">{{ recipe.item_a_emoji }}</span>
              <span class="item-name-large">{{ recipe.item_a }}</span>
            </div>
            <div class="operator-large">+</div>
            <div class="material-item-large">
              <span v-if="recipe.item_b_emoji" class="emoji-large">{{ recipe.item_b_emoji }}</span>
              <span class="item-name-large">{{ recipe.item_b }}</span>
            </div>
            <div class="operator-large">=</div>
            <div class="result-item-large">
              <span v-if="recipe.result_emoji" class="emoji-large">{{ recipe.result_emoji }}</span>
              <span class="result-name-large">{{ recipe.result }}</span>
            </div>
          </div>

          <!-- 配方信息 -->
          <div class="recipe-info-grid">
            <div class="info-item">
              <label>配方ID</label>
              <span>{{ recipe.id }}</span>
            </div>
            <div class="info-item">
              <label>贡献者</label>
              <span>{{ recipe.creator_name }}</span>
            </div>
            <div class="info-item">
              <label>点赞数</label>
              <span class="like-count">❤️ {{ recipe.likes || 0 }}</span>
            </div>
            <div class="info-item">
              <label>创建时间</label>
              <span>{{ formatDate(recipe.created_at) }}</span>
            </div>
          </div>
        </el-card>

        <!-- 更多配方 -->
        <el-card class="more-recipes-card" v-if="moreRecipes.length > 0">
          <template #header>
            <h3>更多配方 ({{ recipe?.result }})</h3>
            <p class="recipe-description">以下是可以合成「{{ recipe?.result }}」的其他配方</p>
          </template>
          
          <div class="more-recipes-grid">
            <div 
              v-for="moreRecipe in moreRecipes" 
              :key="moreRecipe.id"
              class="more-recipe-card"
              @click="viewRecipe(moreRecipe.id)"
            >
              <div class="recipe-formula">
                <div class="material-box">
                  <span v-if="moreRecipe.item_a_emoji" class="emoji">{{ moreRecipe.item_a_emoji }}</span>
                  <span class="material-name">{{ moreRecipe.item_a }}</span>
                </div>
                <div class="plus-sign">+</div>
                <div class="material-box">
                  <span v-if="moreRecipe.item_b_emoji" class="emoji">{{ moreRecipe.item_b_emoji }}</span>
                  <span class="material-name">{{ moreRecipe.item_b }}</span>
                </div>
                <div class="equals-sign">=</div>
                <div class="result-box">
                  <span v-if="moreRecipe.result_emoji" class="emoji">{{ moreRecipe.result_emoji }}</span>
                  <span class="result-name">{{ moreRecipe.result }}</span>
                </div>
              </div>
              <div class="recipe-info">
                <div class="creator-info">
                  <span class="creator-name">👤 {{ moreRecipe.creator_name }}</span>
                </div>
                <div class="likes-info">
                  <span class="likes-count">❤️ {{ moreRecipe.likes || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 空状态 -->
        <el-empty v-if="!recipe && !loading" description="配方不存在" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import { recipeApi } from '@/api';
import { ElMessage } from 'element-plus';
import { formatDate } from '@/utils/format';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const likeLoading = ref(false);
const recipe = ref<any>(null);
const moreRecipes = ref<any[]>([]);

// 获取配方详情
const fetchRecipeDetail = async () => {
  const recipeId = route.params.id;
  if (!recipeId) return;

  loading.value = true;
  try {
    const data = await recipeApi.detail(Number(recipeId));
    recipe.value = data;
    // 获取更多配方 - 使用相同结果的配方
    const moreData = await recipeApi.list({ 
      result: recipe.value.result, 
      limit: 10 
    });
    moreRecipes.value = moreData.recipes.filter(r => r.id !== recipe.value.id);
  } catch (error) {
    console.error('获取配方详情失败:', error);
    ElMessage.error('获取配方详情失败');
  } finally {
    loading.value = false;
  }
};

// 点赞/取消点赞
const handleLike = async () => {
  if (!recipe.value) return;
  
  likeLoading.value = true;
  try {
    await recipeApi.like(recipe.value.id);
    recipe.value.is_liked = !recipe.value.is_liked;
    recipe.value.likes += recipe.value.is_liked ? 1 : -1;
  } catch (error) {
    console.error('点赞操作失败:', error);
    ElMessage.error('点赞操作失败');
  } finally {
    likeLoading.value = false;
  }
};

// 查看其他配方
const viewRecipe = (recipeId: number) => {
  router.push(`/recipes/${recipeId}`);
};

// 返回
const goBack = () => {
  router.go(-1);
};

// 使用统一的时间工具函数，已在上方导入

onMounted(() => {
  fetchRecipeDetail();
});
</script>

<style scoped>
.recipe-detail-page {
  min-height: calc(100vh - 200px);
  background-color: #f5f7fa;
}

.page-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.back-button {
  margin-bottom: 20px;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 配方详情卡片 */
.recipe-detail-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: #303133;
}

/* 大型配方公式 */
.recipe-formula-large {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 30px 0;
  padding: 30px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  flex-wrap: wrap;
}

.material-item-large, .result-item-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border-radius: 8px;
  background: white;
  border: 2px solid #e9ecef;
  min-width: 120px;
}

.result-item-large {
  background: #e8f4fd;
  border-color: #409eff;
}

.emoji-large {
  font-size: 32px;
  line-height: 1;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
  font-variant-emoji: emoji; /* 强制使用彩色 emoji */
}

.item-name-large, .result-name-large {
  font-weight: 600;
  color: #495057;
  font-size: 16px;
  text-align: center;
}

.result-name-large {
  color: #1f2937;
}

.operator-large {
  font-size: 24px;
  font-weight: 700;
  color: #6b7280;
}

/* 信息网格 */
.recipe-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.info-item span {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.like-count {
  color: #ef4444;
}

/* 更多配方 */
.more-recipes-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
}

.more-recipes-card h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.recipe-description {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  font-style: italic;
}

.more-recipes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.more-recipe-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.more-recipe-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #67c23a);
}

.more-recipe-card:hover {
  border-color: #409eff;
  background: linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%);
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.15);
}

.recipe-formula {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.material-box, .result-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  min-width: 80px;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.result-box {
  background: linear-gradient(135deg, #e8f4fd 0%, #f0f8ff 100%);
  border-color: #409eff;
}

.emoji {
  font-size: 18px;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
  font-variant-emoji: emoji; /* 强制使用彩色 emoji */
}

.material-name, .result-name {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.result-name {
  color: #1f2937;
}

.plus-sign, .equals-sign {
  font-size: 18px;
  font-weight: 700;
  color: #6b7280;
}

.recipe-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.creator-info, .likes-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.creator-name {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.likes-count {
  font-size: 13px;
  color: #ef4444;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .recipe-formula-large {
    flex-direction: column;
    gap: 16px;
  }
  
  .operator-large {
    transform: rotate(90deg);
  }
  
  .recipe-info-grid {
    grid-template-columns: 1fr;
  }
  
  .more-recipes-grid {
    grid-template-columns: 1fr;
  }
  
  .more-recipe-card {
    padding: 16px;
  }
  
  .recipe-formula {
    gap: 8px;
  }
  
  .material-box, .result-box {
    min-width: 70px;
    padding: 6px 10px;
  }
}
</style>