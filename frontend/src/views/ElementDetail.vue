<template>
  <div class="element-detail-page">
    <!-- 返回按钮 -->
    <div class="back-section">
      <el-button 
        type="primary" 
        link 
        @click="goBack"
        class="back-button"
      >
        <el-icon><ArrowLeft /></el-icon>
        返回元素列表
      </el-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 元素详情内容 -->
    <div v-else-if="element" class="element-content">
      <!-- 元素头部信息 -->
      <div class="element-header">
        <div class="element-emoji">
          {{ element.emoji || '🔘' }}
        </div>
        <div class="element-info">
          <h1 class="element-name">{{ element.name }}</h1>
          <div class="element-meta">
            <el-tag 
              :type="element.is_base ? 'primary' : 'success'"
              class="element-type-tag"
            >
              {{ element.is_base ? '基础元素' : '合成元素' }}
            </el-tag>
            <span class="element-id">ID: {{ element.id }}</span>
          </div>
        </div>
      </div>

      <!-- 元素统计信息 -->
      <div class="element-stats-section">
        <el-row :gutter="20">
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-content">
                <div class="stat-value">{{ element.recipe_count || 0 }}</div>
                <div class="stat-label">配方数量</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">🔥</div>
              <div class="stat-content">
                <div class="stat-value">{{ element.usage_count || 0 }}</div>
                <div class="stat-label">使用频率</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">👤</div>
              <div class="stat-content">
                <div class="stat-value">{{ element.discoverer_name || '-' }}</div>
                <div class="stat-label">发现者</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 配方列表卡片 -->
      <div class="recipes-section" v-if="element && element.recipe_count > 0">
        <div class="section-header">
          <h2 class="section-title">配方列表</h2>
          <div class="section-subtitle">按照最简排序算法排序</div>
        </div>
        
        <!-- 配方列表 -->
        <div class="recipes-list">
          <div 
            v-for="recipe in paginatedRecipes" 
            :key="recipe.id" 
            class="recipe-card"
          >
            <div class="recipe-header">
              <div class="recipe-formula">
                {{ recipe.item_a_emoji || '🔘' }} {{ recipe.item_a }} + {{ recipe.item_b_emoji || '🔘' }} {{ recipe.item_b }} = {{ element.emoji || '🔘' }} {{ element.name }}
              </div>
              <el-tag 
                size="small" 
                type="success"
              >
                合成配方
              </el-tag>
            </div>
            
            <div class="recipe-footer">
              <div class="recipe-meta">
                <span class="recipe-depth">深度: {{ recipe.depth || 0 }}</span>
                <span class="recipe-width">宽度: {{ recipe.width || 0 }}</span>
                <span class="recipe-breadth">广度: {{ recipe.breadth || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 分页组件 -->
        <div class="pagination-section" v-if="recipes.length > 0">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[5, 10, 20, 50]"
            :total="recipes.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
        
        <!-- 无配方提示 -->
        <div v-else class="no-recipes">
          <el-empty description="暂无配方数据" />
        </div>
      </div>

    </div>

    <!-- 元素不存在 -->
    <div v-else class="not-found">
      <el-empty description="元素不存在" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { recipeApi } from '@/api';

interface Element {
  id: number;
  name: string;
  emoji?: string;
  is_base: number;
  usage_count?: number;
  recipe_count?: number;
  discoverer_name?: string;
}

interface RecipeDetail {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;
  likes: number;
  created_at: string;
  creator_name?: string;
  is_liked?: boolean;
  item_a_emoji?: string;
  item_b_emoji?: string;
  result_emoji?: string;
  is_verified?: boolean;
  updated_at?: string;
  depth?: number;
  width?: number;
  breadth?: number;
}

const route = useRoute();
const router = useRouter();

const element = ref<Element | null>(null);
const recipes = ref<RecipeDetail[]>([]);
const loading = ref(false);
const recipesLoading = ref(false);
const currentPage = ref(1);
const pageSize = ref(5);

// 计算分页后的配方列表
const paginatedRecipes = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return recipes.value.slice(start, end);
});

// 获取元素详情
const fetchElementDetail = async () => {
  loading.value = true;
  try {
    const elementId = parseInt(route.params.id as string);
    
    if (isNaN(elementId)) {
      ElMessage.error('无效的元素ID');
      return;
    }

    // 使用专门的详情API获取单个元素
    const elementData = await recipeApi.getItemById(elementId);

    if (elementData) {
      element.value = elementData;
      // 获取配方列表
      await fetchRecipes(elementId);
    } else {
      ElMessage.error('获取元素详情失败');
    }
  } catch (error: any) {
    console.error('获取元素详情失败:', error);
    if (error.response?.status === 404) {
      ElMessage.error('元素不存在');
    } else {
      ElMessage.error('获取元素详情失败，请稍后重试');
    }
  } finally {
    loading.value = false;
  }
};

// 最简排序算法：深度最小 → 宽度最小 → 广度最大 → 字典序排序
const sortRecipesBySimplestPath = (recipes: RecipeDetail[]): RecipeDetail[] => {
  return [...recipes].sort((a, b) => {
    // 1. 深度最小优先
    if (a.depth !== b.depth) {
      return (a.depth || 0) - (b.depth || 0);
    }
    
    // 2. 宽度最小优先
    if (a.width !== b.width) {
      return (a.width || 0) - (b.width || 0);
    }
    
    // 3. 广度最大优先
    if (a.breadth !== b.breadth) {
      return (b.breadth || 0) - (a.breadth || 0);
    }
    
    // 4. 字典序排序（按配方ID）
    return a.id - b.id;
  });
};

// 获取配方列表
const fetchRecipes = async (elementId: number) => {
  recipesLoading.value = true;
  try {
    // 使用后端API获取配方列表
    const response = await recipeApi.list({ result: element.value?.name });
    
    if (response && response.recipes && Array.isArray(response.recipes)) {
      // 按照最简排序算法对配方进行排序
      recipes.value = sortRecipesBySimplestPath(response.recipes);
    } else {
      recipes.value = [];
    }
  } catch (error: any) {
    console.error('获取配方列表失败:', error);
    ElMessage.error('获取配方列表失败，请稍后重试');
    recipes.value = [];
  } finally {
    recipesLoading.value = false;
  }
};

// 分页大小改变
const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
};

// 当前页改变
const handleCurrentChange = (page: number) => {
  currentPage.value = page;
};

// 返回上一页
const goBack = () => {
  router.back();
};

// 组件挂载时获取数据
onMounted(() => {
  fetchElementDetail();
});
</script>

<style scoped>
.element-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: calc(100vh - 60px);
}

.back-section {
  margin-bottom: 24px;
}

.back-button {
  font-size: 14px;
  color: #409eff;
}

.loading-container {
  padding: 40px 0;
}

.element-content {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.element-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.element-emoji {
  font-size: 64px;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 16px;
  flex-shrink: 0;
}

.element-info {
  flex: 1;
}

.element-name {
  font-size: 36px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 12px 0;
}

.element-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.element-type-tag {
  font-size: 14px;
  font-weight: 500;
}

.element-id {
  font-size: 14px;
  color: #909399;
}

.element-stats-section {
  margin-bottom: 40px;
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
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 配方列表样式 */
.recipes-section {
  margin-top: 40px;
}

.section-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.section-subtitle {
  font-size: 14px;
  color: #909399;
}

.recipes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recipe-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.recipe-card:hover {
  background: #fff;
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.recipe-formula {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  flex: 1;
  margin-right: 16px;
}


.recipe-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

.recipe-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.recipe-depth,
.recipe-width,
.recipe-breadth {
  display: flex;
  align-items: center;
}

.pagination-section {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.no-recipes {
  padding: 40px 0;
  text-align: center;
}

.not-found {
  padding: 80px 0;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .element-detail-page {
    padding: 16px;
  }

  .element-header {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .element-emoji {
    font-size: 48px;
    width: 80px;
    height: 80px;
  }

  .element-name {
    font-size: 28px;
  }

  .element-meta {
    justify-content: center;
  }


  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .element-content {
    padding: 20px;
  }

  .element-name {
    font-size: 24px;
  }
}
</style>
