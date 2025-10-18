<template>
  <div class="home">
    <!-- Hero 横幅 -->
    <div class="hero-section">
      <h2>🎮 探索无尽合成的奥秘</h2>
      <p>收集、分享、发现 - 社区驱动的合成配方数据库</p>
      
      <!-- 搜索框 -->
      <el-card class="search-card">
        <el-input
          v-model="searchText"
          placeholder="搜索配方或物品名称..."
          size="large"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prepend>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
      </el-card>

      <!-- 快速路径搜索 -->
      <el-card class="path-search-card">
        <h3>🔍 查找合成路径</h3>
        <el-input
          v-model="pathSearchText"
          placeholder="输入目标物品名称，查找最简合成路径..."
          size="large"
          clearable
          @keyup.enter="handlePathSearch"
        >
          <template #append>
            <el-button type="success" @click="handlePathSearch" :loading="pathSearching">
              查找路径
            </el-button>
          </template>
        </el-input>
      </el-card>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.total_recipes" title="配方总数">
              <template #prefix>
                <el-icon><Document /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.total_items" title="物品总数">
              <template #prefix>
                <el-icon><Box /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.reachable_items" title="可合成物品">
              <template #prefix>
                <el-icon><CircleCheck /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.base_items" title="基础材料">
              <template #prefix>
                <el-icon><Star /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 最新配方 -->
    <div class="recipes-section">
      <el-card>
        <template #header>
          <div class="section-header">
            <h3>📋 最新配方</h3>
            <el-button type="primary" link @click="router.push('/recipes')">
              查看全部 →
            </el-button>
          </div>
        </template>
        <el-table 
          :data="latestRecipes" 
          style="width: 100%"
          v-loading="loadingRecipes"
        >
          <el-table-column prop="item_a" label="材料A" width="150" />
          <el-table-column label="+" width="60" align="center">
            <template #default>
              <span style="font-size: 18px; color: #909399;">+</span>
            </template>
          </el-table-column>
          <el-table-column prop="item_b" label="材料B" width="150" />
          <el-table-column label="=" width="60" align="center">
            <template #default>
              <span style="font-size: 18px; color: #409eff;">→</span>
            </template>
          </el-table-column>
          <el-table-column prop="result" label="结果" width="150">
            <template #default="{ row }">
              <el-tag type="success">{{ row.result }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="creator_name" label="创建者" width="120" />
          <el-table-column label="验证" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.is_verified" type="success" size="small">已验证</el-tag>
              <el-tag v-else type="info" size="small">未验证</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="likes" label="点赞" width="80" align="center">
            <template #default="{ row }">
              <span style="color: #f56c6c;">❤️ {{ row.likes }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.created_at) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useRecipeStore } from '@/stores';
import { recipeApi } from '@/api';
import { ElMessage } from 'element-plus';
import type { Recipe } from '@/types';

const router = useRouter();
const recipeStore = useRecipeStore();

const searchText = ref('');
const pathSearchText = ref('');
const pathSearching = ref(false);
const loadingRecipes = ref(false);

const stats = ref({
  total_recipes: 0,
  total_items: 0,
  reachable_items: 0,
  unreachable_items: 0,
  valid_recipes: 0,
  invalid_recipes: 0,
  circular_recipes: 0,
  circular_items: 0,
  base_items: 6
});

const latestRecipes = ref<Recipe[]>([]);

// 加载统计数据
const loadStats = async () => {
  try {
    const data = await recipeApi.getGraphStats();
    stats.value = data as any;
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

// 加载最新配方
const loadLatestRecipes = async () => {
  loadingRecipes.value = true;
  try {
    const response = await recipeApi.list({
      page: 1,
      limit: 10
    }) as any;
    latestRecipes.value = response.recipes || [];
  } catch (error) {
    console.error('加载最新配方失败:', error);
  } finally {
    loadingRecipes.value = false;
  }
};

// 处理搜索
const handleSearch = () => {
  if (!searchText.value.trim()) {
    ElMessage.warning('请输入搜索内容');
    return;
  }
  router.push({
    path: '/recipes',
    query: { search: searchText.value }
  });
};

// 处理路径搜索
const handlePathSearch = async () => {
  if (!pathSearchText.value.trim()) {
    ElMessage.warning('请输入目标物品名称');
    return;
  }
  
  pathSearching.value = true;
  try {
    const data = await recipeStore.searchPath(pathSearchText.value);
    // TODO: 显示路径结果（可以跳转到详情页或弹窗显示）
    console.log('搜索路径结果:', data);
    ElMessage.success('路径查找成功！');
  } catch (error: any) {
    ElMessage.error(error.message || '路径查找失败');
  } finally {
    pathSearching.value = false;
  }
};

// 格式化时间
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

onMounted(() => {
  loadStats();
  loadLatestRecipes();
});
</script>

<style scoped>
.home {
  background-color: #f5f7fa;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 60px 20px;
  text-align: center;
}

.hero-section h2 {
  font-size: 36px;
  margin-bottom: 10px;
}

.hero-section p {
  font-size: 18px;
  opacity: 0.9;
  margin-bottom: 30px;
}

.search-card, .path-search-card {
  max-width: 800px;
  margin: 20px auto;
}

.path-search-card h3 {
  margin-bottom: 15px;
  text-align: left;
  color: white;
}

.stats-section {
  max-width: 1400px;
  margin: 40px auto;
  padding: 0 20px;
}

.recipes-section {
  max-width: 1400px;
  margin: 40px auto 60px;
  padding: 0 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}
</style>
