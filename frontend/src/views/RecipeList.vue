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
          <el-table-column label="材料A" width="180" align="center">
            <template #default="{ row }">
              <span class="item-with-emoji">
                <span v-if="row.item_a_emoji" class="emoji">{{ row.item_a_emoji }}</span>
                <span>{{ row.item_a }}</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column label="材料B" width="180" align="center">
            <template #default="{ row }">
              <span class="item-with-emoji">
                <span v-if="row.item_b_emoji" class="emoji">{{ row.item_b_emoji }}</span>
                <span>{{ row.item_b }}</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column label="结果" width="180" align="center">
            <template #default="{ row }">
              <span class="item-with-emoji">
                <span v-if="row.result_emoji" class="emoji">{{ row.result_emoji }}</span>
                <span>{{ row.result }}</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="creator_name" label="贡献者" width="120" align="center" />
          <el-table-column prop="likes" label="点赞数" width="100" align="center">
            <template #default="{ row }">
              <span style="color: #f56c6c;">❤️ {{ row.likes || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center">
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px;
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
  font-size: 28px;
  color: #303133;
  margin: 0;
  flex-shrink: 0;
}

.page-header .el-input {
  flex-shrink: 0;
  min-width: 300px;
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
}

.recipe-card {
  background: white;
}

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
.item-with-emoji {
  display: flex;
  align-items: center;
  gap: 6px;
}

.emoji {
  font-size: 16px;
  line-height: 1;
}
</style>
