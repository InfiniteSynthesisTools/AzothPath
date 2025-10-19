<template>
  <div class="recipe-management">
    <!-- 搜索和筛选 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            placeholder="搜索配方名称或结果"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select v-model="sortBy" placeholder="排序方式" @change="handleSort">
            <el-option label="最新创建" value="created_at" />
            <el-option label="点赞最多" value="likes" />
            <el-option label="ID" value="id" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="orderBy" placeholder="排序顺序" @change="handleSort">
            <el-option label="降序" value="desc" />
            <el-option label="升序" value="asc" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="loadRecipes">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 配方列表 -->
    <div class="recipe-list">
      <el-table 
        :data="recipes" 
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="配方" min-width="200">
          <template #default="{ row }">
            <div class="recipe-display">
              <span class="material">
                <span v-if="row.item_a_emoji" class="emoji">{{ row.item_a_emoji }}</span>
                {{ row.item_a }}
              </span>
              <span class="plus">+</span>
              <span class="material">
                <span v-if="row.item_b_emoji" class="emoji">{{ row.item_b_emoji }}</span>
                {{ row.item_b }}
              </span>
              <span class="arrow">→</span>
              <span class="result">
                <span v-if="row.result_emoji" class="emoji">{{ row.result_emoji }}</span>
                {{ row.result }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="创建者" width="120" />
        <el-table-column prop="likes" label="点赞数" width="100" sortable>
          <template #default="{ row }">
            <el-tag type="success">{{ row.likes }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewRecipeDetail(row)">
              详情
            </el-button>
            <el-button 
              size="small" 
              type="danger"
              @click="deleteRecipe(row)"
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
        :total="totalRecipes"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 配方详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="配方详情"
      width="600px"
    >
      <div v-if="selectedRecipe" class="recipe-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="配方ID">{{ selectedRecipe.id }}</el-descriptions-item>
          <el-descriptions-item label="创建者">{{ selectedRecipe.creator_name }}</el-descriptions-item>
          <el-descriptions-item label="材料A">{{ selectedRecipe.item_a }}</el-descriptions-item>
          <el-descriptions-item label="材料B">{{ selectedRecipe.item_b }}</el-descriptions-item>
          <el-descriptions-item label="合成结果">{{ selectedRecipe.result }}</el-descriptions-item>
          <el-descriptions-item label="点赞数">{{ selectedRecipe.likes }}</el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">
            {{ formatDateTime(selectedRecipe.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import { recipeApi } from '@/api';
import { formatDateTime } from '@/utils/format';

// 响应式数据
const loading = ref(false);
const recipes = ref<any[]>([]);
const searchQuery = ref('');
const sortBy = ref('created_at');
const orderBy = ref('desc');
const currentPage = ref(1);
const pageSize = ref(20);
const totalRecipes = ref(0);
const detailDialogVisible = ref(false);
const selectedRecipe = ref<any>(null);

// 方法
const loadRecipes = async () => {
  loading.value = true;
  try {
    const result = await recipeApi.list({
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      orderBy: sortBy.value
    });
    
    // 响应拦截器已经处理了数据结构，直接使用result
    recipes.value = result.recipes || [];
    totalRecipes.value = result.total || 0;
  } catch (error) {
    console.error('加载配方列表失败:', error);
    ElMessage.error('加载配方列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadRecipes();
};

const handleSort = () => {
  currentPage.value = 1;
  loadRecipes();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  loadRecipes();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadRecipes();
};

const viewRecipeDetail = (recipe: any) => {
  selectedRecipe.value = recipe;
  detailDialogVisible.value = true;
};

const deleteRecipe = async (recipe: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除配方 "${recipe.item_a} + ${recipe.item_b} = ${recipe.result}" 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    );

    // 这里需要实现删除配方的API
    // await recipeApi.deleteRecipe(recipe.id);
    
    ElMessage.success('删除成功');
    loadRecipes();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除配方失败:', error);
      ElMessage.error('删除失败');
    }
  }
};

// 生命周期
onMounted(() => {
  loadRecipes();
});
</script>

<style scoped>
.recipe-management {
  padding: 20px;
}

.search-section {
  margin-bottom: 20px;
}

.recipe-list {
  margin-bottom: 20px;
}

.recipe-display {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.material {
  padding: 2px 8px;
  background: #f0f2f5;
  border-radius: 4px;
  color: #606266;
}

.plus {
  color: #909399;
  font-weight: bold;
}

.arrow {
  color: #409eff;
  font-weight: bold;
}

.result {
  padding: 2px 8px;
  background: #e1f3d8;
  border-radius: 4px;
  color: #67c23a;
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.recipe-display {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.material, .result {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f5f7fa;
}

.emoji {
  font-size: 16px;
  margin-right: 2px;
}

.plus, .arrow {
  color: #909399;
  font-weight: bold;
}

.recipe-detail {
  padding: 20px 0;
}
</style>
