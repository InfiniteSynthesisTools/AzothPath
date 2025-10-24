<template>
  <div class="element-detail-page">
    <!-- 返回按钮和导航面包屑 -->
    <div class="back-section">
      <div class="breadcrumb-wrapper">
        <el-button 
          type="primary" 
          link 
          @click="goBack"
          class="back-button"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        
        <!-- 导航历史 -->
        <div class="nav-history" v-if="navigationHistory.length > 0">
          <div class="history-header">
            <span class="history-label">浏览历史 ({{ navigationHistory.length }})：</span>
            <el-button 
              v-if="navigationHistory.length > 10"
              link 
              size="small"
              @click="showAllHistory = !showAllHistory"
              class="toggle-history-btn"
            >
              {{ showAllHistory ? '收起' : '展开全部' }}
            </el-button>
          </div>
          <div class="history-tags">
            <el-tag
              v-for="item in displayedHistory"
              :key="item.id"
              size="small"
              @click="goToHistoryElement(item)"
              class="history-tag"
              closable
              @close="removeFromHistory(navigationHistory.indexOf(item))"
            >
              {{ item.emoji || '🔘' }} {{ item.name }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 元素详情内容 -->
    <div v-else-if="element" class="element-content">
      <!-- 元素头部信息 -->
      <div class="element-header">
        <div class="element-emoji">
          {{ element.emoji || '🔘' }}
        </div>
        <div class="element-info">
          <h1 class="element-name">{{ element.name }}</h1>
          <div class="element-meta">
            <el-tag 
              :type="element.is_base ? 'primary' : 'success'"
              class="element-type-tag"
            >
              {{ element.is_base ? '基础元素' : '合成元素' }}
            </el-tag>
            <span class="element-id">ID: {{ element.id }}</span>
          </div>
        </div>
      </div>

      <!-- 元素统计信息 -->
      <div class="element-stats-section">
        <el-row :gutter="20">
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-content">
                <div class="stat-value">{{ element.recipe_count || 0 }}</div>
                <div class="stat-label">配方数量</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">🔥</div>
              <div class="stat-content">
                <div class="stat-value">{{ element.usage_count || 0 }}</div>
                <div class="stat-label">使用频率</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">👤</div>
              <div class="stat-content">
                <div class="stat-value">{{ element.discoverer_name || '-' }}</div>
                <div class="stat-label">发现者</div>
              </div>
            </div>
          </el-col>
          <!-- 可达性统计卡片 -->
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">🔗</div>
              <div class="stat-content">
                <div v-if="reachabilityLoading" class="stat-value">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  加载中...
                </div>
                <div v-else class="stat-value">{{ reachabilityStats.reachable ? '可及' : '不可及' }}</div>
                <div class="stat-label">可达性</div>
              </div>
            </div>
          </el-col>
        </el-row>
        
        <!-- 可达性详细统计（仅在可及时显示） -->
        <el-row :gutter="20" v-if="reachabilityStats.reachable && !reachabilityLoading" style="margin-top: 20px;">
          <el-col :xs="12" :sm="4">
            <div class="stat-card">
              <div class="stat-icon">📏</div>
              <div class="stat-content">
                <div class="stat-value">{{ reachabilityStats.depth || 0 }}</div>
                <div class="stat-label">深度</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="4">
            <div class="stat-card">
              <div class="stat-icon">📐</div>
              <div class="stat-content">
                <div class="stat-value">{{ reachabilityStats.width || 0 }}</div>
                <div class="stat-label">宽度</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="4">
            <div class="stat-card">
              <div class="stat-icon">🌐</div>
              <div class="stat-content">
                <div class="stat-value">{{ reachabilityStats.breadth || 0 }}</div>
                <div class="stat-label">广度</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 冰柱图可视化板块 -->
      <div class="icicle-chart-section" v-if="reachabilityStats.reachable && !reachabilityLoading">
        <div class="section-header">
          <h2 class="section-title">最简合成冰柱图</h2>
          <div class="section-subtitle">以当前元素为根节点的最简合成路径可视化</div>
        </div>
        
        <div class="icicle-chart-container">
          <div v-if="icicleChartLoading" class="chart-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>冰柱图加载中...</span>
          </div>
          <div v-else-if="icicleChartData && icicleChartData.nodes && icicleChartData.nodes.length > 0" class="chart-content">
            <!-- 真正的冰柱图组件 -->
            <IcicleChart 
              :data="icicleChartData.nodes"
              :width="800"
              :height="500"
              @nodeClick="handleIcicleNodeClick"
            />
          </div>
          <div v-else-if="icicleChartData && icicleChartData.nodes && icicleChartData.nodes.length === 0" class="chart-info">
            <div class="info-icon">ℹ️</div>
            <div class="info-text">当前元素没有合成路径数据</div>
          </div>
          <div v-else class="chart-error">
            <div class="error-icon">❌</div>
            <div class="error-text">无法加载冰柱图数据</div>
          </div>
        </div>
      </div>

      <!-- 配方列表卡片 -->
      <div class="recipes-section" v-if="element && (element.recipe_count || 0) > 0">
        <div class="section-header">
          <h2 class="section-title">配方列表</h2>
          <div class="section-subtitle">按照最简排序算法排序</div>
        </div>
        
        <!-- 配方列表 -->
        <div class="recipes-list">
          <div 
            v-for="recipe in paginatedRecipes" 
            :key="recipe.id" 
            class="recipe-card"
          >
            <div class="recipe-header">
              <div class="recipe-left">
              </div>
              <div class="recipe-formula">
                <div class="ingredient-cards">
                  <div class="ingredient-card" @click="goToElementDetail(recipe.item_a)">
                    <span class="ingredient-emoji">{{ recipe.item_a_emoji || '🔘' }}</span>
                    <span class="ingredient-name">{{ recipe.item_a }}</span>
                  </div>
                  <span class="operator">+</span>
                  <div class="ingredient-card" @click="goToElementDetail(recipe.item_b)">
                    <span class="ingredient-emoji">{{ recipe.item_b_emoji || '🔘' }}</span>
                    <span class="ingredient-name">{{ recipe.item_b }}</span>
                  </div>
                  <span class="operator">=</span>
                  <div class="result-card">
                    <span class="result-emoji">{{ element.emoji || '🔘' }}</span>
                    <span class="result-name">{{ element.name }}</span>
                  </div>
                  <button class="like-btn" :class="{ liked: recipe.is_liked }" @click.stop="toggleLikeRecipe(recipe)" :disabled="toggling[recipe.id] === true">
                    <span class="heart">❤</span> {{ recipe.likes || 0 }}
                  </button>
                  <button class="copy-btn" @click.stop="copyRecipe(recipe)" title="复制配方">
                    <CopyIcon />
                  </button>
                </div>
              </div>
              <el-tag 
                size="small" 
                :type="isSelfCraftRecipe(recipe) ? 'warning' : 'success'"
              >
                {{ isSelfCraftRecipe(recipe) ? '自合成配方' : '合成配方' }}
              </el-tag>
            </div>
            
            <div class="recipe-footer">
              <div class="recipe-meta">
                <span class="recipe-depth">深度: {{ recipe.depth || 0 }}</span>
                <span class="recipe-width">宽度: {{ recipe.width || 0 }}</span>
                <span class="recipe-breadth">广度: {{ recipe.breadth || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 分页组件 -->
        <div class="pagination-section" v-if="recipes.length > 0">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[5, 10, 20, 50]"
            :total="recipes.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
        
        <!-- 无配方提示 -->
        <div v-else class="no-recipes">
          <el-empty description="暂无配方数据" />
        </div>
      </div>

    </div>

    <!-- 元素不存在 -->
    <div v-else class="not-found">
      <el-empty description="元素不存在" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Loading } from '@element-plus/icons-vue';
import CopyIcon from '@/components/icons/CopyIcon.vue';
import IcicleChart from '@/components/IcicleChart.vue';
import { copyToClipboard } from '@/composables/useClipboard';
import { recipeApi } from '@/api';

interface Element {
  id: number;
  name: string;
  emoji?: string;
  is_base: number;
  usage_count?: number;
  recipe_count?: number;
  discoverer_name?: string;
}

interface RecipeDetail {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;
  likes: number;
  created_at: string;
  creator_name?: string;
  is_liked?: boolean;
  item_a_emoji?: string;
  item_b_emoji?: string;
  result_emoji?: string;
  is_verified?: boolean;
  updated_at?: string;
  depth?: number;
  width?: number;
  breadth?: number;
}

const route = useRoute();
const router = useRouter();

const element = ref<Element | null>(null);
const recipes = ref<RecipeDetail[]>([]);
const loading = ref(false);
const recipesLoading = ref(false);
const currentPage = ref(1);
const pageSize = ref(5);

// 可达性统计
interface ReachabilityStats {
  reachable: boolean;
  depth?: number;
  width?: number;
  breadth?: number;
}

const reachabilityStats = ref<ReachabilityStats>({
  reachable: false,
  depth: 0,
  width: 0,
  breadth: 0
});
const reachabilityLoading = ref(false);

// 冰柱图数据
import type { IcicleChartData, IcicleNode } from '@/types'

const icicleChartData = ref<IcicleChartData | null>(null);
const icicleChartLoading = ref(false);

// 导航历史记录
interface NavigationItem {
  id: number;
  name: string;
  emoji?: string;
}

const navigationHistory = ref<NavigationItem[]>([]);
const showAllHistory = ref(false);

// 计算显示的历史记录
const displayedHistory = computed(() => {
  if (showAllHistory.value || navigationHistory.value.length <= 10) {
    return navigationHistory.value;
  }
  // 默认显示最近的10条
  return navigationHistory.value.slice(-10);
});

// 从 sessionStorage 恢复导航历史
const loadNavigationHistory = () => {
  try {
    const stored = sessionStorage.getItem('elementNavHistory');
    if (stored) {
      navigationHistory.value = JSON.parse(stored);
    }
  } catch (error) {
    console.error('加载导航历史失败:', error);
  }
};

// 保存导航历史到 sessionStorage
const saveNavigationHistory = () => {
  try {
    sessionStorage.setItem('elementNavHistory', JSON.stringify(navigationHistory.value));
  } catch (error) {
    console.error('保存导航历史失败:', error);
  }
};

// 添加到导航历史
const addToNavigationHistory = (item: NavigationItem) => {
  // 避免重复添加相同元素
  const existingIndex = navigationHistory.value.findIndex(h => h.id === item.id);
  if (existingIndex !== -1) {
    navigationHistory.value.splice(existingIndex, 1);
  }
  
  // 添加到历史记录（无限制）
  navigationHistory.value.push(item);
  
  saveNavigationHistory();
};

// 从历史记录中移除
const removeFromHistory = (index: number) => {
  navigationHistory.value.splice(index, 1);
  saveNavigationHistory();
};

// 跳转到历史元素
const goToHistoryElement = (item: NavigationItem) => {
  router.push(`/element/${item.id}`);
};

// 计算分页后的配方列表
const paginatedRecipes = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return recipes.value.slice(start, end);
});

// 获取冰柱图数据（使用新的按需生成API）
const fetchIcicleChartData = async (elementName: string) => {
  icicleChartLoading.value = true;
  try {
    console.log('开始获取冰柱图数据，元素名称:', elementName);
    const response = await recipeApi.getIcicleChartOnDemand(elementName, {
      maxDepth: 15, // 限制深度避免过深
      includeStats: true // 包含统计信息
    });
    console.log('冰柱图API响应:', response);
    
    // 后端返回格式: { nodes: IcicleNode[], totalElements: number, maxDepth: number }
    if (response && response.nodes && response.nodes.length > 0) {
      // 直接使用后端返回的数据（已经是正确格式）
      icicleChartData.value = response;
      console.log('冰柱图数据设置成功:', icicleChartData.value);
    } else {
      // 元素不可达或没有冰柱图数据
      icicleChartData.value = { nodes: [], totalElements: 0, maxDepth: 0 };
      console.log('元素不可达或没有冰柱图数据，显示空冰柱图');
    }
  } catch (error: any) {
    console.error('获取冰柱图数据失败:', error);
    // 如果API调用失败，显示空冰柱图而不是错误信息
    icicleChartData.value = { nodes: [], totalElements: 0, maxDepth: 0 };
  } finally {
    icicleChartLoading.value = false;
  }
};

// 获取可达性统计信息
const fetchReachabilityStats = async (elementName: string) => {
  reachabilityLoading.value = true;
  try {
    const stats = await recipeApi.getReachabilityStats(elementName);
    reachabilityStats.value = stats;
    return stats; // 返回统计结果
  } catch (error: any) {
    console.error('获取可达性统计失败:', error);
    // 如果API调用失败，默认设置为不可及
    const defaultStats = {
      reachable: false,
      depth: 0,
      width: 0,
      breadth: 0
    };
    reachabilityStats.value = defaultStats;
    return defaultStats; // 返回默认统计结果
  } finally {
    reachabilityLoading.value = false;
  }
};

// 获取元素详情
const fetchElementDetail = async () => {
  loading.value = true;
  try {
    const elementId = parseInt(route.params.id as string);
    
    if (isNaN(elementId)) {
      ElMessage.error('无效的元素ID');
      return;
    }

    // 使用专门的详情API获取单个元素
    const elementData = await recipeApi.getItemById(elementId);

    if (elementData) {
      element.value = elementData;
      
      // 添加到导航历史
      addToNavigationHistory({
        id: elementData.id,
        name: elementData.name,
        emoji: elementData.emoji
      });
      
      // 获取配方列表
      await fetchRecipes();
      
      // 获取可达性统计信息
      const reachabilityResult = await fetchReachabilityStats(elementData.name);
      
      // 异步加载冰柱图数据（不阻塞主流程）
      if (reachabilityResult.reachable) {
        // 在后台加载，不使用 await
        fetchIcicleChartData(elementData.name).catch(error => {
          console.error('后台加载冰柱图数据失败:', error);
        });
      }
    } else {
      ElMessage.error('获取元素详情失败');
    }
  } catch (error: any) {
    console.error('获取元素详情失败:', error);
    if (error.response?.status === 404) {
      ElMessage.error('元素不存在');
    } else {
      ElMessage.error('获取元素详情失败，请稍后重试');
    }
  } finally {
    loading.value = false;
  }
};

// 检测是否为自合成配方
const isSelfCraftRecipe = (recipe: RecipeDetail): boolean => {
  // a+a=a 类型：两个材料相同且等于结果
  if (recipe.item_a === recipe.result && recipe.item_b === recipe.result) {
    return true;
  }
  // a+b=a 类型：其中一个材料等于结果
  if (recipe.item_a === recipe.result || recipe.item_b === recipe.result) {
    return true;
  }
  return false;
};

// 最简排序算法：深度最小 → 宽度最小 → 广度最大 → 字典序排序，自合成配方排在最后
const sortRecipesBySimplestPath = (recipes: RecipeDetail[]): RecipeDetail[] => {
  return [...recipes].sort((a, b) => {
    // 自合成配方检测
    const isSelfCraftA = isSelfCraftRecipe(a);
    const isSelfCraftB = isSelfCraftRecipe(b);
    
    // 自合成配方永远排在最后
    if (isSelfCraftA && !isSelfCraftB) return 1;
    if (!isSelfCraftA && isSelfCraftB) return -1;
    if (isSelfCraftA && isSelfCraftB) {
      // 如果都是自合成配方，按ID排序
      return a.id - b.id;
    }
    
    // 1. 深度最小优先
    if (a.depth !== b.depth) {
      return (a.depth || 0) - (b.depth || 0);
    }
    
    // 2. 宽度最小优先
    if (a.width !== b.width) {
      return (a.width || 0) - (b.width || 0);
    }
    
    // 3. 广度最大优先
    if (a.breadth !== b.breadth) {
      return (b.breadth || 0) - (a.breadth || 0);
    }
    
    // 4. 字典序排序（按配方ID）
    return a.id - b.id;
  });
};

// 获取配方列表
const fetchRecipes = async () => {
  recipesLoading.value = true;
  try {
    // 使用后端API获取配方列表，包含统计信息
    const response = await recipeApi.list({ 
      result: element.value?.name,
      includeStats: true // 添加这个参数来获取深度、宽度、广度数据
    });
    
    if (response && response.recipes && Array.isArray(response.recipes)) {
      // 按照最简排序算法对配方进行排序
      recipes.value = sortRecipesBySimplestPath(response.recipes);
    } else {
      recipes.value = [];
    }
  } catch (error: any) {
    console.error('获取配方列表失败:', error);
    ElMessage.error('获取配方列表失败，请稍后重试');
    recipes.value = [];
  } finally {
    recipesLoading.value = false;
  }
};

// 分页大小改变
const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
};

// 当前页改变
const handleCurrentChange = (page: number) => {
  currentPage.value = page;
};

// 冰柱图节点点击事件
const handleIcicleNodeClick = async (node: IcicleNode) => {
  try {
    console.log('冰柱图节点点击:', node);
    
    // 如果节点有配方信息，可以显示配方详情
    if (node.recipe) {
      ElMessage.info(`配方: ${node.recipe.item_a} + ${node.recipe.item_b} = ${node.name}`);
    }
    
    // 如果点击的不是当前元素，尝试跳转到该元素的详情页
    if (node.name !== element.value?.name) {
      await goToElementDetail(node.name);
    }
  } catch (error) {
    console.error('处理冰柱图节点点击失败:', error);
  }
};

// 跳转到元素详情页面
const goToElementDetail = async (elementName: string) => {
  try {
    // 通过搜索API获取元素列表，使用精确匹配参数
    const response = await recipeApi.getItems({ 
      search: elementName, 
      limit: 1,
      exact: true // 使用精确匹配
    });
    if (response && response.items && response.items.length > 0) {
      const elementData = response.items[0]; // 精确匹配应该只有一个结果
      if (elementData && elementData.id) {
        // 使用 replace 而不是 push 来确保页面重新加载
        router.replace(`/element/${elementData.id}`);
      } else {
        ElMessage.warning(`未找到元素: ${elementName}`);
      }
    } else {
      ElMessage.warning(`未找到元素: ${elementName}`);
    }
  } catch (error) {
    console.error('跳转到元素详情失败:', error);
    ElMessage.error('跳转失败，请稍后重试');
  }
};

// 返回上一页
const goBack = () => {
  router.back();
};

// 复制整条配方文本
const copyRecipe = async (recipe: RecipeDetail) => {
  if (!recipe) return;
  const text = `${recipe.item_a} + ${recipe.item_b} = ${recipe.result}`;
  const ok = await copyToClipboard(text);
  if (ok) ElMessage.success(`已复制配方: ${text}`);
  else ElMessage.error('复制失败');
};

// 点赞交互
const toggling = ref<Record<number, boolean>>({});
const toggleLikeRecipe = async (recipe: RecipeDetail) => {
  if (toggling.value[recipe.id]) return;
  toggling.value[recipe.id] = true;
  try {
    const res = await recipeApi.like(recipe.id);
    recipe.is_liked = res.liked;
    recipe.likes = res.likes;
  } catch (error: any) {
    if (error?.response?.status === 401) {
      ElMessage.warning('请先登录后再点赞');
    } else {
      ElMessage.error(error?.response?.data?.message || '操作失败');
    }
  } finally {
    toggling.value[recipe.id] = false;
  }
};

// 监听路由参数变化，当元素ID改变时重新获取数据
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      fetchElementDetail();
    }
  }
);

// 组件挂载时获取数据
onMounted(() => {
  loadNavigationHistory();
  fetchElementDetail();
});
</script>

<style scoped>
.element-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: calc(100vh - 60px);
}

.back-section {
  margin-bottom: 24px;
}

.breadcrumb-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.back-button {
  font-size: 14px;
  color: #409eff;
  align-self: flex-start;
}

.nav-history {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px dashed #dcdfe6;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history-label {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
  white-space: nowrap;
}

.toggle-history-btn {
  font-size: 12px;
  padding: 0 8px;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-tag {
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.history-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.loading-container {
  padding: 40px 0;
}

.element-content {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.element-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.element-emoji {
  font-size: 64px;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 16px;
  flex-shrink: 0;
}

.element-info {
  flex: 1;
}

.element-name {
  font-size: 36px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 12px 0;
}

.element-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.element-type-tag {
  font-size: 14px;
  font-weight: 500;
}

.element-id {
  font-size: 14px;
  color: #909399;
}

.element-stats-section {
  margin-bottom: 40px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 冰柱图可视化板块样式 */
.icicle-chart-section {
  margin-top: 40px;
}

.icicle-chart-container {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #606266;
}

.chart-loading .el-icon {
  font-size: 32px;
  color: #409eff;
}

.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  border: 2px dashed #dcdfe6;
}

.placeholder-icon {
  font-size: 48px;
}

.placeholder-text {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.placeholder-stats {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: #606266;
}

.placeholder-stats div {
  padding: 8px 16px;
  background: #f5f7fa;
  border-radius: 6px;
}

.chart-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #f56c6c;
}

.error-icon {
  font-size: 48px;
}

.error-text {
  font-size: 16px;
  font-weight: 500;
}

/* 配方列表样式 */
.recipes-section {
  margin-top: 40px;
}

.section-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.section-subtitle {
  font-size: 14px;
  color: #909399;
}

.recipes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recipe-card {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.recipe-card:hover {
  background: #fff;
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.recipe-left {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.recipe-formula {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  flex: 1;
  margin-right: 16px;
}

.ingredient-cards {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ingredient-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
}

.ingredient-card:hover {
  background: #f5f7fa;
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.ingredient-emoji {
  font-size: 18px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ingredient-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.operator {
  font-size: 14px;
  font-weight: 600;
  color: #909399;
  padding: 0 2px;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f0f9ff;
  border: 1px solid #bae0ff;
  border-radius: 6px;
  min-width: 100px;
}

.result-emoji {
  font-size: 18px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-name {
  font-size: 13px;
  font-weight: 500;
  color: #1890ff;
}

.like-btn {
  border: 1px solid #e0e3e7;
  background: #ffffff;
  color: #f85149;
  border-radius: 12px;
  padding: 3px 8px;
  line-height: 1;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.3s ease;
  min-width: 40px;
  height: 28px;
}
.like-btn:hover:not(:disabled) {
  background: #fff5f5;
  border-color: #f85149;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(248, 81, 73, 0.15);
}
.like-btn.liked {
  background: #ffe4e4;
  border-color: #ffc2c2;
  color: #f85149;
}
.like-btn.liked:hover:not(:disabled) {
  background: #ffd4d0;
  border-color: #f85149;
  box-shadow: 0 2px 8px rgba(248, 81, 73, 0.2);
}
.like-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.like-btn:active {
  transform: translateY(0);
}

.copy-btn {
  border: 1px solid #e0e3e7;
  background: #ffffff;
  color: #606266;
  border-radius: 12px;
  padding: 4px 8px;
  line-height: 1;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.3s ease;
  width: 28px;
  height: 28px;
}
.copy-btn:hover {
  background: #f0f9ff;
  border-color: #409eff;
  color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}
.copy-btn:active {
  transform: translateY(0);
}

.recipe-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.recipe-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #909399;
}

.recipe-depth,
.recipe-width,
.recipe-breadth {
  display: flex;
  align-items: center;
}

.pagination-section {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.no-recipes {
  padding: 40px 0;
  text-align: center;
}

.not-found {
  padding: 80px 0;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .element-detail-page {
    padding: 12px;
  }
  
  .element-content {
    padding: 20px;
    border-radius: 10px;
  }

  .element-header {
    flex-direction: column;
    text-align: center;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 20px;
  }

  .element-emoji {
    font-size: 48px;
    width: 80px;
    height: 80px;
    border-radius: 12px;
  }

  .element-name {
    font-size: 28px;
  }

  .element-meta {
    justify-content: center;
  }

  .element-stats-section {
    margin-bottom: 32px;
  }

  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
    padding: 16px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  
  .stat-value {
    font-size: 20px;
  }
  
  .stat-label {
    font-size: 13px;
  }
  
  /* 配方列表移动端优化 */
  .recipes-section {
    margin-top: 32px;
  }
  
  .section-header {
    margin-bottom: 16px;
    padding-bottom: 12px;
  }
  
  .section-title {
    font-size: 20px;
  }
  
  .section-subtitle {
    font-size: 13px;
  }
  
  .recipes-list {
    gap: 10px;
  }
  
  .recipe-card {
    padding: 12px;
    border-radius: 8px;
  }
  
  .recipe-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 10px;
  }
  
  .recipe-left {
    width: 100%;
    justify-content: space-between;
  }
  
  .recipe-formula {
    width: 100%;
    margin-right: 0;
    margin-bottom: 8px;
  }
  
  .ingredient-cards {
    gap: 6px;
  }
  
  .ingredient-card,
  .result-card {
    padding: 5px 8px;
    min-width: 80px;
    border-radius: 5px;
  }
  
  .ingredient-emoji,
  .result-emoji {
    font-size: 16px;
    width: 18px;
    height: 18px;
  }
  
  .ingredient-name,
  .result-name {
    font-size: 12px;
  }
  
  .operator {
    font-size: 13px;
    padding: 0 1px;
  }
  
  .recipe-footer {
    margin-top: 10px;
    padding-top: 10px;
  }
  
  .recipe-meta {
    gap: 10px;
    font-size: 10px;
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .element-detail-page {
    padding: 10px;
  }
  
  .element-content {
    padding: 16px;
  }

  .element-name {
    font-size: 24px;
  }
  
  .element-emoji {
    font-size: 40px;
    width: 70px;
    height: 70px;
  }
  
  .stat-card {
    padding: 12px;
  }
  
  .stat-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
  
  .stat-value {
    font-size: 18px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .section-title {
    font-size: 18px;
  }
  
  .recipes-list {
    gap: 8px;
  }
  
  .recipe-card {
    padding: 10px;
  }
  
  .recipe-header {
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .ingredient-cards {
    gap: 5px;
  }
  
  .ingredient-card,
  .result-card {
    padding: 4px 6px;
    min-width: 70px;
  }
  
  .ingredient-emoji,
  .result-emoji {
    font-size: 14px;
    width: 16px;
    height: 16px;
  }
  
  .ingredient-name,
  .result-name {
    font-size: 11px;
  }
  
  .operator {
    font-size: 12px;
  }
  
  .like-btn {
    padding: 2px 6px;
    font-size: 11px;
  }
  
  .recipe-footer {
    margin-top: 8px;
    padding-top: 8px;
  }
  
  .recipe-meta {
    font-size: 9px;
    gap: 8px;
  }
}
</style>
