<template>
  <div class="element-list-page">
    <!-- 页面标题和搜索栏 -->
    <div class="page-header">
      <h1 class="page-title">元素列表</h1>
      <p class="page-subtitle">探索无尽合成世界中的所有元素</p>
      
      <!-- 搜索和筛选区域 -->
      <div class="search-section">
        <div class="search-wrapper">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索元素名称..."
            clearable
            size="large"
            class="search-input"
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        
        <div class="filters-wrapper">
          <el-select
            v-model="filterType"
            placeholder="筛选类型"
            clearable
            size="large"
            class="filter-select"
            @change="handleFilterChange"
          >
            <el-option label="全部类型" value="" />
            <el-option label="基础元素" value="base">
              <span class="option-emoji">⭐</span>
              <span>基础元素</span>
            </el-option>
            <el-option label="合成元素" value="synthetic">
              <span class="option-emoji">🔬</span>
              <span>合成元素</span>
            </el-option>
          </el-select>
          
          <el-select
            v-model="sortBy"
            placeholder="排序方式"
            size="large"
            class="sort-select"
            @change="handleSortChange"
          >
            <el-option label="按名称排序" value="name">
              <span class="option-emoji">🔤</span>
              <span>按名称</span>
            </el-option>
            <el-option label="按使用频率排序" value="usage">
              <span class="option-emoji">🔥</span>
              <span>按使用频率</span>
            </el-option>
            <el-option label="按配方数量排序" value="recipes">
              <span class="option-emoji">📊</span>
              <span>按配方数量</span>
            </el-option>
          </el-select>
        </div>
      </div>
    </div>

    <!-- 元素卡片列表 -->
    <div class="elements-container">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="6" animated />
      </div>
      
      <div v-else-if="elements.length === 0" class="empty-state">
        <el-empty description="暂无元素数据" />
      </div>
      
      <div v-else class="elements-grid">
        <el-card
          v-for="element in elements"
          :key="element.id"
          class="element-card"
          shadow="hover"
          @click="viewElementDetail(element)"
        >
          <div class="element-header">
            <div class="element-emoji">
              {{ element.emoji || '🔘' }}
            </div>
            <div class="element-info">
              <h3 class="element-name">{{ element.name }}</h3>
              <div class="element-meta">
                <span class="element-type" :class="element.is_base ? 'base' : 'synthetic'">
                  {{ element.is_base ? '基础元素' : '合成元素' }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="element-stats">
            <div class="stat-item">
              <span class="stat-label">配方数量</span>
              <span class="stat-value">{{ element.recipe_count || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">使用频率</span>
              <span class="stat-value">{{ element.usage_count || 0 }}</span>
            </div>
          </div>
          
        </el-card>
      </div>
    </div>

    <!-- 分页组件 -->
    <div v-if="elements.length > 0" class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="totalElements"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
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

// 响应式数据
const elements = ref<Element[]>([]);
const loading = ref(false);
const searchKeyword = ref('');
const filterType = ref('synthetic');
const sortBy = ref('usage');
const currentPage = ref(1);
const pageSize = ref(20);
const totalElements = ref(0);

const router = useRouter();

// 获取元素列表
const fetchElements = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchKeyword.value || undefined,
      type: filterType.value || undefined,
      sortBy: sortBy.value,
      sortOrder: 'desc'
    };

    const response = await recipeApi.getItems(params);
    if (response) {
      elements.value = response.items || [];
      totalElements.value = response.total || 0;
    } else {
      ElMessage.error('获取元素列表失败');
    }
  } catch (error) {
    console.error('获取元素列表失败:', error);
    ElMessage.error('获取元素列表失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1;
  fetchElements();
};

// 筛选处理
const handleFilterChange = () => {
  currentPage.value = 1;
  fetchElements();
};

// 排序处理
const handleSortChange = () => {
  currentPage.value = 1;
  fetchElements();
};

// 分页处理
const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchElements();
};

const handlePageSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  fetchElements();
};

// 查看元素配方
const viewElementRecipes = (element: Element) => {
  // 这里可以跳转到配方列表页面，按元素筛选
  ElMessage.info(`查看 ${element.name} 的配方`);
};

// 查看元素合成路径
const viewElementPath = (element: Element) => {
  // 这里可以跳转到合成路径页面
  ElMessage.info(`查看 ${element.name} 的合成路径`);
};

// 查看元素详情
const viewElementDetail = (element: Element) => {
  router.push(`/element/${element.id}`);
};

// 监听分页和筛选变化
watch([currentPage, pageSize], () => {
  fetchElements();
});

// 组件挂载时获取数据
onMounted(() => {
  fetchElements();
});
</script>

<style scoped>
.element-list-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 32px;
  text-align: center;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #909399;
  margin: 0 0 24px 0;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.search-wrapper {
  width: 100%;
}

.search-input {
  width: 100%;
  --el-input-border-radius: 24px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  background: #ffffff;
}

.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 20px rgba(103, 194, 58, 0.2);
}

.filters-wrapper {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.filter-select,
.sort-select {
  min-width: 200px;
  flex: 1;
  max-width: 280px;
}

.filter-select :deep(.el-input__wrapper),
.sort-select :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s;
  background: #ffffff;
}

.filter-select :deep(.el-input__wrapper:hover),
.sort-select :deep(.el-input__wrapper:hover) {
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.filter-select :deep(.el-input__wrapper.is-focus),
.sort-select :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 3px 12px rgba(103, 194, 58, 0.15);
}

.option-emoji {
  margin-right: 8px;
  font-size: 16px;
}

.search-input {
  width: 300px;
}

.filter-select,
.sort-select {
  width: 140px;
}

.elements-container {
  min-height: 400px;
}

.loading-container {
  padding: 40px 0;
}

.empty-state {
  padding: 80px 0;
}

.elements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.element-card {
  transition: all 0.3s ease;
  border-radius: 12px;
  cursor: pointer;
}

.element-card :deep(.el-card__body) {
  padding: 16px;
}

.element-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.element-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.element-emoji {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
  flex-shrink: 0;
}

.element-info {
  flex: 1;
  min-width: 0;
}

.element-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
  word-break: break-all;
}

.element-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.element-type {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.element-type.base {
  background: #e8f4fd;
  color: #409eff;
}

.element-type.synthetic {
  background: #f0f9ff;
  color: #67c23a;
}

.element-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.element-actions {
  display: flex;
  gap: 8px;
}

.element-actions .el-button {
  flex: 1;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .element-list-page {
    padding: 12px;
  }
  
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
  
  .search-section {
    max-width: 100%;
    gap: 12px;
  }
  
  .search-wrapper {
    width: 100%;
  }
  
  .filters-wrapper {
    width: 100%;
    flex-direction: column;
    gap: 8px;
  }
  
  .filter-select,
  .sort-select {
    width: 100%;
    max-width: 100%;
  }
  
  .elements-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 12px;
  }
  
  /* 移动端卡片紧凑布局 */
  .element-card :deep(.el-card__body) {
    padding: 12px;
  }
  
  .element-header {
    gap: 10px;
    margin-bottom: 10px;
  }
  
  .element-emoji {
    font-size: 28px;
    width: 40px;
    height: 40px;
    border-radius: 6px;
  }
  
  .element-name {
    font-size: 16px;
    margin: 0 0 3px 0;
  }
  
  .element-type {
    font-size: 11px;
    padding: 1px 6px;
  }
  
  .element-stats {
    gap: 12px;
    margin-bottom: 0;
    padding: 8px 0 0 0;
    border-top: 1px solid #f0f0f0;
    border-bottom: none;
  }
  
  .stat-label {
    font-size: 11px;
    margin-bottom: 2px;
  }
  
  .stat-value {
    font-size: 15px;
  }
  
  .pagination-container {
    margin-top: 20px;
  }
  
  .pagination-container :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .element-list-page {
    padding: 10px;
  }
  
  .elements-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  /* 超小屏幕更紧凑 */
  .element-card :deep(.el-card__body) {
    padding: 10px;
  }
  
  .element-header {
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .element-emoji {
    font-size: 24px;
    width: 36px;
    height: 36px;
  }
  
  .element-name {
    font-size: 15px;
  }
  
  .element-stats {
    gap: 10px;
    padding: 6px 0 0 0;
  }
  
  .stat-label {
    font-size: 10px;
  }
  
  .stat-value {
    font-size: 14px;
  }
  
  .search-input :deep(.el-input__wrapper) {
    border-radius: 20px;
  }
  
  .filter-select :deep(.el-input__wrapper),
  .sort-select :deep(.el-input__wrapper) {
    border-radius: 10px;
  }
  
  .pagination-container {
    margin-top: 16px;
  }
}
</style>
