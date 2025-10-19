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
              <div class="stat-icon">📅</div>
              <div class="stat-content">
                <div class="stat-value">{{ formatDate(element.created_at) }}</div>
                <div class="stat-label">创建时间</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">🔤</div>
              <div class="stat-content">
                <div class="stat-value">{{ element.pinyin || '-' }}</div>
                <div class="stat-label">拼音</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 配方信息 -->
      <div class="recipes-section">
        <h2 class="section-title">相关配方</h2>
        <div v-if="recipes.length === 0" class="empty-recipes">
          <el-empty description="暂无相关配方" />
        </div>
        <div v-else class="recipes-list">
          <el-card
            v-for="recipe in recipes"
            :key="recipe.id"
            class="recipe-card"
            shadow="hover"
          >
            <div class="recipe-content">
              <div class="recipe-inputs">
                <div class="recipe-label">输入元素：</div>
                <div class="inputs-list">
                  <span 
                    v-for="input in recipe.inputs" 
                    :key="input"
                    class="input-item"
                  >
                    {{ input }}
                  </span>
                </div>
              </div>
              <div class="recipe-arrow">→</div>
              <div class="recipe-result">
                <div class="recipe-label">输出元素：</div>
                <div class="result-item">{{ recipe.result }}</div>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <!-- 合成路径 -->
      <div class="crafting-path-section">
        <h2 class="section-title">合成路径</h2>
        <div class="path-info">
          <p v-if="element.is_base" class="path-message">
            这是一个基础元素，无法通过合成获得。
          </p>
          <div v-else class="path-actions">
            <el-button 
              type="primary" 
              @click="viewCraftingPath"
              :loading="pathLoading"
            >
              查看合成路径
            </el-button>
          </div>
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
import { ref, onMounted } from 'vue';
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
  pinyin?: string;
  created_at?: string;
}

interface Recipe {
  id: number;
  inputs: string[];
  result: string;
  result_emoji?: string;
}

const route = useRoute();
const router = useRouter();

const element = ref<Element | null>(null);
const recipes = ref<Recipe[]>([]);
const loading = ref(false);
const pathLoading = ref(false);

// 获取元素详情
const fetchElementDetail = async () => {
  loading.value = true;
  try {
    const elementId = parseInt(route.params.id as string);
    
    // 暂时使用列表API获取数据，后续可以添加专门的详情API
    const response = await recipeApi.getItems({
      page: 1,
      limit: 1000, // 获取所有元素
      search: '',
      type: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });

    if (response) {
      const foundElement = response.items.find((item: any) => item.id === elementId);
      if (foundElement) {
        element.value = foundElement;
        // 模拟获取相关配方
        await fetchRelatedRecipes(foundElement.name);
      } else {
        ElMessage.error('元素不存在');
      }
    } else {
      ElMessage.error('获取元素详情失败');
    }
  } catch (error) {
    console.error('获取元素详情失败:', error);
    ElMessage.error('获取元素详情失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

// 获取相关配方（模拟数据）
const fetchRelatedRecipes = async (elementName: string) => {
  try {
    // 这里可以调用实际的API获取相关配方
    // 暂时使用模拟数据
    recipes.value = [
      {
        id: 1,
        inputs: ['火', '水'],
        result: elementName,
        result_emoji: element.value?.emoji
      },
      {
        id: 2,
        inputs: ['土', '风'],
        result: elementName,
        result_emoji: element.value?.emoji
      }
    ];
  } catch (error) {
    console.error('获取相关配方失败:', error);
  }
};

// 查看合成路径
const viewCraftingPath = async () => {
  if (!element.value) return;
  
  pathLoading.value = true;
  try {
    const response = await recipeApi.searchPath(element.value.name);
    if (response) {
      // 这里可以跳转到合成路径页面或显示路径
      ElMessage.success(`已找到 ${element.value.name} 的合成路径`);
    } else {
      ElMessage.warning(`未找到 ${element.value.name} 的合成路径`);
    }
  } catch (error) {
    console.error('获取合成路径失败:', error);
    ElMessage.error('获取合成路径失败，请稍后重试');
  } finally {
    pathLoading.value = false;
  }
};

// 格式化日期
const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('zh-CN');
  } catch {
    return '-';
  }
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

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #409eff;
}

.recipes-section {
  margin-bottom: 40px;
}

.empty-recipes {
  padding: 40px 0;
}

.recipes-list {
  display: grid;
  gap: 16px;
}

.recipe-card {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.recipe-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.recipe-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px;
}

.recipe-inputs,
.recipe-result {
  flex: 1;
}

.recipe-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  font-weight: 500;
}

.inputs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.input-item {
  background: #f0f2f5;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  color: #303133;
}

.result-item {
  background: #409eff;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.recipe-arrow {
  font-size: 20px;
  color: #909399;
  font-weight: 700;
}

.crafting-path-section {
  margin-bottom: 40px;
}

.path-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 24px;
}

.path-message {
  font-size: 16px;
  color: #909399;
  text-align: center;
  margin: 0;
}

.path-actions {
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

  .recipe-content {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .recipe-arrow {
    transform: rotate(90deg);
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

  .section-title {
    font-size: 20px;
  }
}
</style>
