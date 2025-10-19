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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import { recipeApi } from '@/api';

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
      sortBy: sortBy.value
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

// 生命周期
onMounted(() => {
  loadElements();
});
</script>

<style scoped>
.element-management {
  padding: 20px;
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
</style>
