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
        <div class="search-controls">
          <div class="search-input-wrapper">
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
          
          <div class="sort-select-wrapper">
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
        layout="total, sizes, prev, next"
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
// 注意：已通过 v-model 绑定 currentPage，这里只触发数据加载，避免重复赋值导致两次请求
const handlePageChange = (_page: number) => {
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

// 说明：去掉对 currentPage/pageSize 的 watch，改由分页事件统一触发加载，
// 以避免与 @current-change/@size-change 同时触发造成的重复请求与状态错乱。

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
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
}

.page-header {
  margin-bottom: 24px;
  text-align: center;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.search-section {
  max-width: 800px;
  margin: 0 auto;
}

.search-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  width: 100%;
}

.search-input-wrapper {
  flex: 1;
  min-width: 0;
}

.search-input {
  width: 100%;
  --el-input-border-radius: var(--radius-lg);
}

.search-input :deep(.el-input__wrapper) {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-primary);
}

.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-accent);
}

.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px var(--color-primary-100), var(--shadow-md);
  border-color: var(--color-primary-400);
}

.sort-select-wrapper {
  flex-shrink: 0;
  width: 200px;
}

.sort-select {
  width: 100%;
}

.sort-select :deep(.el-input__wrapper) {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-primary);
}

.sort-select :deep(.el-input__wrapper:hover) {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-accent);
}

.sort-select :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px var(--color-primary-100), var(--shadow-md);
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
  transition: all var(--transition-base);
  border-radius: var(--radius-lg);
  cursor: pointer;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-primary);
  box-shadow: var(--shadow-sm);
}

.element-card :deep(.el-card__body) {
  padding: 20px;
}

.element-card:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-md);
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
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
  border: 1px solid var(--color-border-primary);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.element-card:hover .element-emoji {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-md);
}

.element-info {
  flex: 1;
  min-width: 0;
}

.element-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 6px 0;
  /* 避免中文被强制断开，保持自然换行且不截断 */
  word-break: break-word;
  overflow-wrap: anywhere;
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
  box-shadow: var(--shadow-xs);
  transition: all var(--transition-base);
}

.element-type.base {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
}

.element-type.synthetic {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
}

.element-card:hover .element-type {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-sm);
}

.element-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  padding: 16px 0;
  border-top: 1px solid var(--color-border-primary);
  border-bottom: 1px solid var(--color-border-primary);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  transition: all var(--transition-base);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
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
  padding: 16px 0;
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-primary);
}

.pagination-container :deep(.el-pagination) {
  display: flex;
  /* 保持上一页箭头、页码、下一页在同一行，避免换行造成“箭头跑到上一行” */
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.pagination-container :deep(.el-pagination__total) {
  font-size: 14px;
  color: var(--color-text-primary);
  margin-right: 8px;
  font-weight: 500;
}

.pagination-container :deep(.el-pagination__sizes) {
  margin-right: 8px;
}

.pagination-container :deep(.el-pagination__sizes .el-select) {
  width: 80px;
}

.pagination-container :deep(.el-pagination__sizes .el-input__inner) {
  font-size: 12px;
  padding: 4px 8px;
  height: 28px;
  border-radius: var(--radius-base);
  border: 1px solid var(--color-border-primary);
}

.pagination-container :deep(.el-pagination__prev),
.pagination-container :deep(.el-pagination__next) {
  width: 32px;
  height: 32px;
  font-size: 14px;
  margin: 0 4px;
  border-radius: var(--radius-base);
  border: 1px solid var(--color-border-primary);
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}

.pagination-container :deep(.el-pagination__prev:hover),
.pagination-container :deep(.el-pagination__next:hover) {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
  color: var(--color-text-primary);
}

.pagination-container :deep(.el-pagination__prev.is-disabled),
.pagination-container :deep(.el-pagination__next.is-disabled) {
  background: var(--color-bg-primary);
  border-color: var(--color-border-primary);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.pagination-container :deep(.el-pagination__jump) {
  margin-left: 8px;
  font-size: 14px;
}

.pagination-container :deep(.el-pagination__jump .el-input) {
  width: 50px;
}

/* 仅保留上一页/下一页后，去掉对 pager 的样式覆盖，避免无效选择器影响布局 */

/* 响应式设计 */
@media (max-width: 768px) {
  .element-list-page {
    padding: 12px;
  }
  
  .page-title {
    font-size: 22px;
  }
  
  .page-subtitle {
    font-size: 13px;
    margin-bottom: 16px;
  }
  
  .page-header {
    margin-bottom: 16px;
  }
  
  .search-section {
    max-width: 100%;
  }
  
  .search-controls {
    flex-direction: column;
    gap: 12px;
  }
  
  .search-input-wrapper {
    width: 100%;
  }
  
  .sort-select-wrapper {
    width: 100%;
  }
  
  .elements-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  
  /* 移动端卡片紧凑布局 */
  .element-card :deep(.el-card__body) {
    padding: 12px; /* 更紧凑 */
  }
  
  .element-header {
    gap: 10px;
    margin-bottom: 8px; /* 降低整体高度 */
  }
  
  .element-emoji {
    font-size: 28px;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-base);
  }
  
  .element-name {
    font-size: 16px;
    margin: 0 0 2px 0;
  }
  
  .element-type {
    font-size: 10px;
    padding: 3px 6px;
  }
  
  .element-stats {
    gap: 10px;
    margin-bottom: 0;
    padding: 8px 0 0 0; /* 减少上下留白 */
    border-top: 1px solid var(--color-border-primary);
    border-bottom: none;
  }
  
  .stat-label {
    font-size: 10px;
    margin-bottom: 2px;
  }
  
  .stat-value {
    font-size: 14px;
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
    margin-bottom: 6px;
  }
  
  .element-emoji {
    font-size: 24px;
    width: 34px;
    height: 34px;
  }
  
  .element-name {
    font-size: 15px;
  }
  
  .element-stats {
    gap: 8px;
    padding: 6px 0 0 0;
  }
  
  .stat-label {
    font-size: 9px;
  }
  
  .stat-value {
    font-size: 13px;
  }
  
  .search-controls {
    gap: 10px;
  }
  
  .search-input :deep(.el-input__wrapper) {
    border-radius: var(--radius-lg);
  }
  
  .sort-select :deep(.el-input__wrapper) {
    border-radius: var(--radius-lg);
  }
  
  .pagination-container {
    margin-top: 16px;
  }
}
</style>
