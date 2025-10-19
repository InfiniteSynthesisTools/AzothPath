<template>
  <div class="recipe-list-page">
    <div class="page-container">
      <div class="page-header">
        <h1>📚 配方列表</h1>
        <el-input
          v-model="searchText"
          placeholder="搜索配方（材料或结果）..."
          style="max-width: 500px"
          clearable
          @change="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
      </div>

      <el-card class="recipe-card">
        <div class="recipe-grid" v-loading="loading">
          <div 
            v-for="group in groupedRecipes" 
            :key="group.result"
            class="result-item-card"
            @click="viewGroupDetail(group.result)"
          >
            <div class="result-info">
              <div class="result-icon">
                <span v-if="group.result_emoji" class="emoji">{{ group.result_emoji }}</span>
              </div>
              <div class="result-details">
                <h3 class="result-name">{{ group.result }}</h3>
                <p class="recipe-count">{{ group.recipe_count }} 种合成方式</p>
              </div>
            </div>
            <div class="result-actions">
              <el-button type="primary" plain size="small">
                查看配方
              </el-button>
            </div>
          </div>
        </div>

        <div class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 40, 60]"
            :total="total"
            layout="total, sizes, prev, pager, next"
            @size-change="handlePageChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { recipeApi } from '@/api';
import { ElMessage } from 'element-plus';

const router = useRouter();

const loading = ref(false);
const searchText = ref('');
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const groupedRecipes = ref<any[]>([]);

const loadData = async () => {
  loading.value = true;
  try {
    const response = await recipeApi.listGrouped({
      search: searchText.value,
      page: currentPage.value,
      limit: pageSize.value
    });
    
    groupedRecipes.value = response.grouped_recipes || [];
    total.value = response.total || 0;
  } catch (error) {
    console.error('获取配方列表失败:', error);
    ElMessage.error('获取配方列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadData();
};

const handlePageChange = () => {
  loadData();
};


const viewGroupDetail = (resultName: string) => {
  // 跳转到第一个配方的详情页面，或者可以创建一个专门的页面显示该结果物品的所有配方
  const group = groupedRecipes.value.find(g => g.result === resultName);
  if (group && group.recipes.length > 0) {
    router.push(`/recipes/${group.recipes[0].id}`);
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.recipe-list-page {
  min-height: calc(100vh - 200px);
  background-color: #f5f7fa;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.page-header h1 {
  font-size: 24px;
  color: #303133;
  margin: 0;
  flex-shrink: 0;
  font-weight: 500;
}

.page-header .el-input {
  flex-shrink: 0;
  min-width: 350px;
}

.page-header .el-input :deep(.el-input__wrapper) {
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .page-header .el-input {
    width: 100%;
    min-width: auto;
  }
  
  .recipe-grid {
    grid-template-columns: 1fr;
    padding: 10px 0;
  }
  
  .result-item-card {
    padding: 8px;
  }
  
  .result-icon {
    width: 36px;
    height: 36px;
  }
  
  .result-icon .emoji {
    font-size: 18px;
  }
  
}

.recipe-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 配方网格布局 - 美观多列卡片 */
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px 0;
}

/* 合成物卡片 - 紧凑版 */
.result-item-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  text-align: left;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.result-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.result-icon {
  width: 40px;
  height: 40px;
  background: #e8f4fd;
  border: 1px solid #b3d9ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.result-icon .emoji {
  font-size: 20px;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.result-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.recipe-count {
  font-size: 11px;
  color: #6b7280;
  margin: 0;
}

.result-actions {
  flex-shrink: 0;
}

.result-actions .el-button {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
}

/* 配方公式 */
.recipe-formula {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.material-item, .result-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  min-width: 60px;
  justify-content: center;
}

.result-item {
  background: #e8f4fd;
  border-color: #b3d9ff;
}

.item-name, .result-name {
  font-weight: 500;
  color: #495057;
  font-size: 13px;
}

.result-name {
  color: #1f2937;
}

.operator {
  font-size: 16px;
  font-weight: 600;
  color: #6b7280;
  margin: 0 4px;
}

/* 配方信息 */
.recipe-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recipe-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.creator {
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
}

.likes {
  color: #ef4444;
  font-size: 12px;
  font-weight: 500;
}

.recipe-actions {
  display: flex;
  gap: 6px;
}

.recipe-actions .el-button {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

/* 分页样式 */
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  width: 100%;
}

.el-pagination {
  justify-content: center;
}

/* Emoji 样式 */
.emoji {
  font-size: 16px;
  line-height: 1;
}
</style>
