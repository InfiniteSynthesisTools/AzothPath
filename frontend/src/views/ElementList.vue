<template>
  <div class="element-list-page">
    <!-- 页面标题和搜索栏 -->
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-emoji">🔍</span>
        元素列表
      </h1>
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
              <h3 class="element-name">
                {{ element.name }}
                <el-button type="text" icon size="small" @click.stop="copyName(element.name)">
                  <CopyIcon />
                </el-button>
              </h3>
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
import CopyIcon from '@/components/icons/CopyIcon.vue';
import { copyToClipboard } from '@/composables/useClipboard';
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

// (注) viewElementRecipes / viewElementPath 功能可在需要时复用或实现。

// 复制到剪贴板
const copyName = async (name: string) => {
  if (!name) return;
  const ok = await copyToClipboard(name);
  if (ok) ElMessage.success(`已复制: ${name}`);
  else ElMessage.error('复制失败');
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
  padding: 32px 24px;
  min-height: calc(100vh - 60px);
  background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-gray-50) 100%);
}

.page-header {
  margin-bottom: 40px;
  text-align: center;
}

.page-title {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-primary-700);
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 18px;
  color: var(--color-gray-600);
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.search-wrapper {
  width: 100%;
}

.search-input {
  width: 100%;
  --el-input-border-radius: var(--radius-2xl);
}

.search-input :deep(.el-input__wrapper) {
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
}

.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: var(--shadow-xl);
  transform: translateY(-2px);
  border-color: rgba(34, 197, 94, 0.3);
}

.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1), var(--shadow-xl);
  border-color: var(--color-primary-400);
}

.filters-wrapper {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.sort-select {
  min-width: 200px;
  flex: 1;
  max-width: 280px;
}

.sort-select :deep(.el-input__wrapper) {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
}

.sort-select :deep(.el-input__wrapper:hover) {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: rgba(34, 197, 94, 0.3);
}

.sort-select :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1), var(--shadow-lg);
  border-color: var(--color-primary-400);
}

.option-emoji {
  margin-right: 8px;
  font-size: 16px;
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.element-card {
  transition: all var(--transition-bounce);
  border-radius: var(--radius-xl);
  cursor: pointer;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg);
}

.element-card :deep(.el-card__body) {
  padding: 20px;
}

.element-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: var(--shadow-2xl);
  border-color: rgba(34, 197, 94, 0.4);
}

.element-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.element-emoji {
  font-size: 36px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
  border: 2px solid rgba(34, 197, 94, 0.2);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.element-card:hover .element-emoji {
  transform: rotate(10deg) scale(1.1);
  box-shadow: var(--shadow-lg);
}

.element-info {
  flex: 1;
  min-width: 0;
}

.element-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary-700);
  margin: 0 0 6px 0;
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 8px;
}

.element-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.element-type {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.element-type.base {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1d4ed8;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.element-type.synthetic {
  background: linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%);
  color: var(--color-primary-700);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.element-card:hover .element-type {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.element-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  padding: 16px 0;
  border-top: 1px solid rgba(34, 197, 94, 0.1);
  border-bottom: 1px solid rgba(34, 197, 94, 0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  transition: all var(--transition-base);
}

.element-card:hover .stat-item {
  transform: translateY(-2px);
}

.stat-label {
  font-size: 12px;
  color: var(--color-gray-600);
  margin-bottom: 6px;
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-primary-600);
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
  margin-top: 40px;
}

.pagination-container :deep(.el-pagination) {
  --el-pagination-bg-color: var(--glass-bg);
  --el-pagination-border-radius: var(--radius-lg);
  --el-pagination-button-bg-color: var(--glass-bg);
  --el-pagination-button-border-color: var(--glass-border);
}

.pagination-container :deep(.el-pagination .btn-prev),
.pagination-container :deep(.el-pagination .btn-next),
.pagination-container :deep(.el-pagination .number) {
  border-radius: var(--radius-base);
  transition: all var(--transition-base);
}

.pagination-container :deep(.el-pagination .number:hover) {
  background: rgba(34, 197, 94, 0.1);
  border-color: var(--color-primary-400);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.pagination-container :deep(.el-pagination .number.is-active) {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
  border-color: var(--color-primary-500);
  color: white;
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
