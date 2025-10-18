<template>
  <div class="recipe-list-page">
    <div class="page-container">
      <div class="page-header">
        <h1>📚 配方列表</h1>
        <el-input
          v-model="searchText"
          placeholder="搜索配方（材料或结果）..."
          style="max-width: 400px"
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
        <el-table :data="recipeStore.recipes" v-loading="recipeStore.loading">
          <el-table-column prop="item_a" label="材料A" />
          <el-table-column prop="item_b" label="材料B" />
          <el-table-column prop="result" label="结果" />
          <el-table-column prop="creator_name" label="贡献者" />
          <el-table-column prop="likes" label="点赞数" width="100" />
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button
                :type="row.is_liked ? 'warning' : 'primary'"
                size="small"
                @click="handleLike(row)"
              >
                {{ row.is_liked ? '已赞' : '点赞' }}
              </el-button>
              <el-button size="small" @click="viewDetail(row.id)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="recipeStore.total"
            layout="total, sizes, prev, pager, next, jumper"
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
import { useRecipeStore } from '@/stores';

const router = useRouter();
const recipeStore = useRecipeStore();

const searchText = ref('');
const currentPage = ref(1);
const pageSize = ref(20);

const handleSearch = () => {
  recipeStore.fetchRecipes({
    search: searchText.value,
    page: 1,
    limit: pageSize.value
  });
};

const handlePageChange = (page: number) => {
  recipeStore.fetchRecipes({
    page,
    limit: pageSize.value
  });
};

const handleLike = async (row: any) => {
  if (row.is_liked) {
    await recipeStore.unlikeRecipe(row.id);
  } else {
    await recipeStore.likeRecipe(row.id);
  }
};

const viewDetail = (id: number) => {
  router.push(`/recipes/${id}`);
};

onMounted(() => {
  recipeStore.fetchRecipes({ page: 1, limit: pageSize.value });
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
  padding: 30px 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 28px;
  color: #303133;
  margin: 0;
}

.recipe-card {
  background: white;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.el-pagination {
  margin-top: 20px;
  justify-content: center;
}
</style>
