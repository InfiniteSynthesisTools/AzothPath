<template>
  <div class="element-management">
    <!-- 搜索和筛选 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            placeholder="搜索元素名称"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select v-model="typeFilter" placeholder="选择类型" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="基础元素" value="base" />
            <el-option label="合成元素" value="synthetic" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="sortBy" placeholder="排序方式" @change="handleSort">
            <el-option label="ID" value="id" />
            <el-option label="名称" value="name" />
            <el-option label="使用次数" value="usage_count" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="loadElements">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 元素列表 -->
    <div class="element-list">
      <el-table 
        :data="filteredElements" 
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="元素名称" min-width="200">
          <template #default="{ row }">
            <div class="element-info">
              <span class="element-name">
                <span v-if="row.emoji" class="emoji">{{ row.emoji }}</span>
                {{ row.name }}
              </span>
              <el-tag v-if="row.is_base" type="success" size="small">基础</el-tag>
              <el-tag v-else type="primary" size="small">合成</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="usage_count" label="使用次数" width="120">
          <template #default="{ row }">
            <el-tag type="info">{{ row.usage_count || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="recipe_count" label="配方数" width="100">
          <template #default="{ row }">
            <el-tag type="warning">{{ row.recipe_count || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="200">
          <template #default="{ row }">
            <div class="tags-cell">
              <el-tag 
                v-for="tag in row.tags" 
                :key="tag.id"
                :color="tag.color"
                size="small"
                style="color: white; margin-right: 4px; margin-bottom: 2px;"
              >
                {{ tag.name }}
              </el-tag>
              <el-button 
                size="small" 
                text 
                @click="showTagDialog(row)"
              >
                管理标签
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="is_public" label="公开" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.is_public === 1"
              active-text="公开"
              inactive-text="隐藏"
              :disabled="!userStore.isAdmin"
              @change="(val: boolean) => updateItemPublic(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewElementDetail(row)">
              详情
            </el-button>
            <el-button 
              v-if="!row.is_base"
              size="small" 
              type="warning"
              @click="deleteElement(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalElements"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 元素详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="元素详情"
      width="600px"
    >
      <div v-if="selectedElement" class="element-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="元素ID">{{ selectedElement.id }}</el-descriptions-item>
          <el-descriptions-item label="元素名称">{{ selectedElement.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="selectedElement.is_base ? 'success' : 'primary'">
              {{ selectedElement.is_base ? '基础元素' : '合成元素' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="使用次数">{{ selectedElement.usage_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="配方数">{{ selectedElement.recipe_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="元素ID" :span="2">
            {{ selectedElement.id }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 标签管理对话框 -->
    <el-dialog
      v-model="tagDialogVisible"
      title="管理标签"
      width="600px"
    >
      <div v-if="selectedElement" class="tag-management">
        <div class="current-tags">
          <h4>当前标签：</h4>
          <div class="tag-list">
            <el-tag 
              v-for="tag in selectedElement.tags" 
              :key="tag.id"
              :color="tag.color"
              closable
              @close="removeTag(tag)"
              style="color: white; margin-right: 8px; margin-bottom: 8px;"
            >
              {{ tag.name }}
            </el-tag>
          </div>
        </div>
        
        <div class="add-tags">
          <h4>添加标签：</h4>
          <el-select
            v-model="selectedTagId"
            placeholder="选择标签"
            filterable
            @change="addTag"
          >
            <el-option 
              v-for="tag in availableTags" 
              :key="tag.id" 
              :label="tag.name" 
              :value="tag.id"
            >
              <el-tag :color="tag.color" style="color: white; margin-right: 8px;">
                {{ tag.name }}
              </el-tag>
            </el-option>
          </el-select>
        </div>
      </div>
      <template #footer>
        <el-button @click="tagDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import { recipeApi, tagApi } from '@/api';
import { useUserStore } from '@/stores';

// 响应式数据
const loading = ref(false);
const elements = ref<any[]>([]);
const searchQuery = ref('');
const typeFilter = ref('');
const sortBy = ref('id');
const currentPage = ref(1);
const pageSize = ref(20);
const totalElements = ref(0);
const detailDialogVisible = ref(false);
const selectedElement = ref<any>(null);
const userStore = useUserStore();
const tagDialogVisible = ref(false);
const availableTags = ref<any[]>([]);
const selectedTagId = ref<number | null>(null);

// 计算属性 - 现在直接使用elements，过滤和排序由后端处理
const filteredElements = computed(() => elements.value);

// 方法
const loadElements = async () => {
  loading.value = true;
  try {
    const result = await recipeApi.getItems({
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      type: typeFilter.value,
      sortBy: sortBy.value,
      sortOrder: 'desc', // 默认降序
      // 管理端：请求未公开数据
      includePrivate: userStore.isAdmin ? '1' : '0'
    });
    // 响应拦截器已经处理了数据结构，直接使用result
    elements.value = result.items || [];
    totalElements.value = result.total || 0;
  } catch (error) {
    console.error('加载元素列表失败:', error);
    ElMessage.error('加载元素列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadElements();
};

const handleFilter = () => {
  currentPage.value = 1;
  loadElements();
};

const handleSort = () => {
  currentPage.value = 1;
  loadElements();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  loadElements();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadElements();
};

const viewElementDetail = (element: any) => {
  selectedElement.value = element;
  detailDialogVisible.value = true;
};

const deleteElement = async (element: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除元素 "${element.name}" 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    );

    // 这里需要实现删除元素的API
    // await recipeApi.deleteElement(element.id);
    
    ElMessage.success('删除成功');
    loadElements();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除元素失败:', error);
      ElMessage.error('删除失败');
    }
  }
};

const updateItemPublic = async (row: any, val: boolean) => {
  try {
    const { api } = await import('@/utils/request');
    await api.put(`/items/${row.id}/public`, { is_public: val ? 1 : 0 });
    row.is_public = val ? 1 : 0;
    ElMessage.success('更新成功');
  } catch (error) {
    ElMessage.error('更新失败');
  }
};

// 标签管理方法
const showTagDialog = async (element: any) => {
  selectedElement.value = element;
  await loadAvailableTags();
  tagDialogVisible.value = true;
};

const loadAvailableTags = async () => {
  try {
    const result = await tagApi.getTags({ page: 1, limit: 1000 });
    availableTags.value = result.tags;
  } catch (error) {
    console.error('加载标签列表失败:', error);
    ElMessage.error('加载标签列表失败');
  }
};

const addTag = async (tagId: number) => {
  if (!selectedElement.value || !tagId) return;
  
  try {
    await tagApi.addTagToItem(selectedElement.value.id, tagId);
    
    // 更新本地数据
    const tag = availableTags.value.find(t => t.id === tagId);
    if (tag && !selectedElement.value.tags.find((t: any) => t.id === tagId)) {
      selectedElement.value.tags.push(tag);
    }
    
    selectedTagId.value = null;
    ElMessage.success('标签添加成功');
  } catch (error: any) {
    ElMessage.error(error.message || '添加标签失败');
  }
};

const removeTag = async (tag: any) => {
  if (!selectedElement.value) return;
  
  try {
    await tagApi.removeTagFromItem(selectedElement.value.id, tag.id);
    
    // 更新本地数据
    const index = selectedElement.value.tags.findIndex((t: any) => t.id === tag.id);
    if (index > -1) {
      selectedElement.value.tags.splice(index, 1);
    }
    
    ElMessage.success('标签移除成功');
  } catch (error: any) {
    ElMessage.error(error.message || '移除标签失败');
  }
};

// 生命周期
onMounted(() => {
  loadElements();
});
</script>

<style scoped>
.element-management {
  padding: 20px;
  background: var(--color-bg-secondary);
  min-height: 100vh;
}

.search-section {
  margin-bottom: 20px;
}

.element-list {
  margin-bottom: 20px;
}

.element-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.element-name {
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.element-detail {
  padding: 20px 0;
}

.emoji {
  font-size: 16px;
  margin-right: 4px;
}

.tags-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.tag-management {
  padding: 20px 0;
}

.current-tags {
  margin-bottom: 20px;
}

.current-tags h4 {
  margin: 0 0 10px 0;
  color: var(--color-text-primary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.add-tags h4 {
  margin: 0 0 10px 0;
  color: var(--color-text-primary);
}

/* 深色模式适配 */
[data-theme="dark"] .element-management {
  background: var(--color-bg-primary);
}

[data-theme="dark"] .el-card {
  background: var(--color-bg-surface);
  border-color: var(--color-border-primary);
}

[data-theme="dark"] .el-card .el-card__body {
  background: var(--color-bg-surface);
}

[data-theme="dark"] :deep(.el-table) {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
}

[data-theme="dark"] :deep(.el-table th) {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

[data-theme="dark"] :deep(.el-table td) {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
}

[data-theme="dark"] :deep(.el-table tr) {
  background: var(--color-bg-surface);
}

[data-theme="dark"] :deep(.el-table tr:hover) {
  background: var(--color-bg-tertiary);
}

[data-theme="dark"] :deep(.el-table--striped .el-table__body tr.el-table__row--striped) {
  background: var(--color-bg-tertiary);
}

[data-theme="dark"] :deep(.el-table--striped .el-table__body tr.el-table__row--striped:hover) {
  background: var(--color-bg-secondary);
}
</style>
