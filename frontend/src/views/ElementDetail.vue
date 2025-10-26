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
              {{ truncateEmoji(item.emoji) }} {{ item.name }}
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
          {{ truncateEmoji(element.emoji) }}
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
              <div class="stat-icon">{{ truncateEmoji(element.discoverer_emoji) || '👤' }}</div>
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
            <span>冰柱图加载中...（复杂物品可能需要几秒钟）</span>
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
                    <span class="ingredient-emoji">{{ truncateEmoji(recipe.item_a_emoji) }}</span>
                    <span class="ingredient-name">{{ recipe.item_a }}</span>
                  </div>
                  <span class="operator">+</span>
                  <div class="ingredient-card" @click="goToElementDetail(recipe.item_b)">
                    <span class="ingredient-emoji">{{ truncateEmoji(recipe.item_b_emoji) }}</span>
                    <span class="ingredient-name">{{ recipe.item_b }}</span>
                  </div>
                  <span class="operator">=</span>
                  <div class="result-card">
                    <span class="result-emoji">{{ truncateEmoji(element.emoji) }}</span>
                    <span class="result-name">{{ element.name }}</span>
                  </div>
                  <button class="like-btn" :class="{ liked: recipe.is_liked }" @click.stop="toggleLikeRecipe(recipe)" :disabled="toggling[recipe.id] === true">
                    <span class="heart">❤</span> {{ recipe.likes || 0 }}
                  </button>
                  <button class="copy-btn" @click.stop="copyRecipe(recipe)" title="复制配方">
                    <CopyIcon />
                  </button>
                  <button class="detail-btn" @click.stop="goToRecipeDetail(recipe)" title="查看详情">
                    <span>➔</span>
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
            :layout="isMobile ? 'total, sizes, prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
        
        <!-- 无配方提示 -->
        <div v-else class="no-recipes">
          <el-empty description="暂无配方数据" />
        </div>
      </div>

      <!-- 作为材料的配方列表卡片 -->
      <div class="material-recipes-section" v-if="materialRecipes.length > 0">
        <div class="section-header">
          <h2 class="section-title">作为材料的配方</h2>
          <div class="section-subtitle">此物品作为材料出现的配方</div>
        </div>
        
        <!-- 作为材料的配方列表 -->
        <div class="recipes-list">
          <div 
            v-for="recipe in paginatedMaterialRecipes" 
            :key="recipe.id" 
            class="recipe-card"
          >
            <div class="recipe-header">
              <div class="recipe-formula">
                <div class="ingredient-cards">
                  <div class="ingredient-card" @click="goToElementDetail(recipe.item_a)">
                    <span class="ingredient-emoji">{{ truncateEmoji(recipe.item_a_emoji) }}</span>
                    <span class="ingredient-name">{{ recipe.item_a }}</span>
                  </div>
                  <span class="operator">+</span>
                  <div class="ingredient-card" @click="goToElementDetail(recipe.item_b)">
                    <span class="ingredient-emoji">{{ truncateEmoji(recipe.item_b_emoji) }}</span>
                    <span class="ingredient-name">{{ recipe.item_b }}</span>
                  </div>
                  <span class="operator">=</span>
                  <div class="result-card" @click="goToElementDetail(recipe.result)">
                    <span class="result-emoji">{{ truncateEmoji(recipe.result_emoji) }}</span>
                    <span class="result-name">{{ recipe.result }}</span>
                  </div>
                  <button class="like-btn" :class="{ liked: recipe.is_liked }" @click.stop="toggleLikeRecipe(recipe)" :disabled="toggling[recipe.id] === true">
                    <span class="heart">❤</span> {{ recipe.likes || 0 }}
                  </button>
                  <button class="copy-btn" @click.stop="copyRecipe(recipe)" title="复制配方">
                    <CopyIcon />
                  </button>
                  <button class="detail-btn" @click.stop="goToRecipeDetail(recipe)" title="查看详情">
                    <span>➔</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="recipe-footer">
              <div class="recipe-meta">
                <span class="recipe-depth">深度: {{ recipe.depth || 0 }}</span>
                <span class="recipe-width">宽度: {{ recipe.width || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 分页组件 -->
        <div class="pagination-section" v-if="materialRecipes.length > 0">
          <el-pagination
            v-model:current-page="materialCurrentPage"
            v-model:page-size="materialPageSize"
            :page-sizes="[5, 10, 20, 50]"
            :total="materialRecipes.length"
            :layout="isMobile ? 'total, sizes, prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
            @size-change="handleMaterialSizeChange"
            @current-change="handleMaterialCurrentChange"
          />
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
import { truncateEmoji } from '@/utils/emoji';

interface Element {
  id: number;
  name: string;
  emoji?: string;
  is_base: number;
  usage_count?: number;
  recipe_count?: number;
  discoverer_name?: string;
  discoverer_emoji?: string;
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
const materialRecipes = ref<RecipeDetail[]>([]);
const loading = ref(false);
const recipesLoading = ref(false);
const currentPage = ref(1);
const pageSize = ref(5);
const materialCurrentPage = ref(1);
const materialPageSize = ref(5);

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

// 移动端检测
const isMobile = ref(false);

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

// 计算分页后的作为材料的配方列表
const paginatedMaterialRecipes = computed(() => {
  const start = (materialCurrentPage.value - 1) * materialPageSize.value;
  const end = start + materialPageSize.value;
  return materialRecipes.value.slice(start, end);
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
      
      // 获取作为材料的配方列表
      await fetchMaterialRecipes();
      
      // 获取可达性统计信息
      const reachabilityResult = await fetchReachabilityStats(elementData.name);
      
      // 异步加载冰柱图数据（不阻塞主流程）
      if (reachabilityResult.reachable) {
        // 在后台加载，不使用 await，并添加超时保护
        setTimeout(() => {
          fetchIcicleChartData(elementData.name).catch(error => {
            console.error('后台加载冰柱图数据失败:', error);
          });
        }, 100); // 延迟100ms，确保主流程先完成
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

// 从包含emoji的节点名称中提取纯文本元素名称
const extractElementName = (nodeName: string): string => {
  console.log('开始提取元素名称:', nodeName);
  
  try {
    // 简单方法：使用空格分割，取最后一个非空部分
    const parts = nodeName.split(' ');
    // 过滤掉空字符串和只包含特殊字符的部分
    const validParts = parts.filter(part => {
      const trimmed = part.trim();
      return trimmed && !/^[\s\u200B-\u200D\uFEFF\xA0]+$/.test(trimmed);
    });
    const elementName = validParts[validParts.length - 1] || nodeName;
    
    console.log('提取结果:', { original: nodeName, parts, validParts, elementName });
    return elementName;
  } catch (error) {
    console.error('提取元素名称失败:', error);
    // 最终备用方法：返回原始名称
    return nodeName;
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

// 获取作为材料的配方列表（作为item_a或item_b出现的配方）
const fetchMaterialRecipes = async () => {
  try {
    const elementName = element.value?.name;
    if (!elementName) return;
    
    // 获取该物品作为item_a出现的配方
    const responseA = await recipeApi.list({ 
      material: elementName,
      includeStats: true
    });
    
    // 收集所有作为材料出现的配方
    let allMaterialRecipes: RecipeDetail[] = [];
    if (responseA && responseA.recipes && Array.isArray(responseA.recipes)) {
      allMaterialRecipes = responseA.recipes;
    }
    
    // 按照最简排序算法对配方进行排序
    materialRecipes.value = sortRecipesBySimplestPath(allMaterialRecipes);
  } catch (error: any) {
    console.error('获取作为材料的配方失败:', error);
    materialRecipes.value = [];
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

// 作为材料配方分页大小改变
const handleMaterialSizeChange = (size: number) => {
  materialPageSize.value = size;
  materialCurrentPage.value = 1;
};

// 作为材料配方当前页改变
const handleMaterialCurrentChange = (page: number) => {
  materialCurrentPage.value = page;
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
      // 优先使用节点的 id 字段，它通常是纯文本元素名称
      let elementName = node.id;
      
      // 如果 id 是带前缀的（base_, synthetic_, leaf_），则从名称中提取
      if (elementName.startsWith('base_') || elementName.startsWith('synthetic_') || elementName.startsWith('leaf_')) {
        elementName = extractElementName(node.name);
      }
      
      // 最终备用方案：如果提取的名称仍然有问题，使用节点的原始名称
      if (!elementName || elementName.includes('️') || /^[\s\u200B-\u200D\uFEFF\xA0]+$/.test(elementName)) {
        console.warn('提取的元素名称有问题，使用原始名称:', elementName);
        elementName = node.name;
      }
      
      console.log('提取元素名称:', { 
        original: node.name, 
        extracted: elementName,
        nodeId: node.id,
        isBase: node.isBase
      });
      
      // 添加更详细的调试信息
      console.log('节点详细信息:', {
        name: node.name,
        emoji: node.emoji,
        id: node.id,
        isBase: node.isBase,
        value: node.value
      });
      
      await goToElementDetail(elementName);
    }
  } catch (error) {
    console.error('处理冰柱图节点点击失败:', error);
  }
};

// 跳转到元素详情页面
const goToElementDetail = async (elementName: string) => {
  try {
    console.log('开始搜索元素:', elementName);
    
    // 通过搜索API获取元素列表，使用精确匹配参数
    const response = await recipeApi.getItems({ 
      search: elementName, 
      limit: 1,
      exact: true // 使用精确匹配
    });
    
    console.log('搜索API响应:', response);
    
    if (response && response.items && response.items.length > 0) {
      const elementData = response.items[0]; // 精确匹配应该只有一个结果
      console.log('找到元素数据:', elementData);
      
      if (elementData && elementData.id) {
        // 使用 replace 而不是 push 来确保页面重新加载
        console.log('跳转到元素详情页:', elementData.id);
        router.replace(`/element/${elementData.id}`);
      } else {
        console.warn('元素数据无效:', elementData);
        ElMessage.warning(`未找到元素: ${elementName}`);
      }
    } else {
      console.warn('搜索API返回空结果:', { elementName, response });
      ElMessage.warning(`未找到元素: ${elementName}`);
    }
  } catch (error) {
    console.error('跳转到元素详情失败:', error);
    ElMessage.error('跳转失败，请稍后重试');
  }
};

// 跳转到配方详情页
const goToRecipeDetail = (recipe: RecipeDetail) => {
  router.push({
    name: 'RecipeDetail',
    params: { id: recipe.id }
  });
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

// 检测移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

// 组件挂载时获取数据
onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
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
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
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
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-base);
  border: 1px dashed var(--color-border-primary);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history-label {
  font-size: 13px;
  color: var(--color-text-secondary);
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
  background: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border-primary);
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
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  flex-shrink: 0;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-md);
}

.element-info {
  flex: 1;
}

.element-name {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-text-primary);
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
  color: var(--color-text-tertiary);
}

.element-stats-section {
  margin-bottom: 40px;
}

.stat-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-md);
}

.stat-card:hover {
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-border-accent);
}

.stat-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
  border-radius: var(--radius-base);
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* 冰柱图可视化板块样式 */
.icicle-chart-section {
  margin-top: 40px;
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border-primary);
}

.icicle-chart-container {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-lg);
  padding: 20px;
  min-height: 400px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  overflow-x: auto;
  overflow-y: visible;
  width: 100%;
  box-shadow: var(--shadow-sm);
  -webkit-overflow-scrolling: touch;
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
.recipes-section,
.material-recipes-section {
  margin-top: 40px;
}

.section-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-primary);
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.section-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.recipes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recipe-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}

.recipe-card:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-md);
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 16px;
}

.recipe-left {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.recipe-formula {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
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
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: all var(--transition-base);
  min-width: 110px;
  box-shadow: var(--shadow-xs);
}

.ingredient-card:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-sm);
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
  color: var(--color-text-primary);
}

.operator {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  padding: 0 2px;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-base);
  min-width: 110px;
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: all var(--transition-base);
}

.result-card:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-sm);
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
  color: var(--color-primary-700);
}

.like-btn {
  border: 1px solid var(--color-border-primary);
  background: var(--color-bg-surface);
  color: #f85149;
  border-radius: var(--radius-base);
  padding: 6px 10px;
  line-height: 1;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all var(--transition-base);
  min-width: 40px;
  height: 32px;
  box-shadow: var(--shadow-xs);
}

.like-btn:hover:not(:disabled) {
  background: #fff5f5;
  border-color: #f85149;
  box-shadow: var(--shadow-sm);
}

.like-btn.liked {
  background: #ffe4e4;
  border-color: #ffc2c2;
  color: #f85149;
}

.like-btn.liked:hover:not(:disabled) {
  background: #ffd4d0;
  border-color: #f85149;
  box-shadow: var(--shadow-sm);
}

.like-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.copy-btn {
  border: 1px solid var(--color-border-primary);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  border-radius: var(--radius-base);
  padding: 6px 10px;
  line-height: 1;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all var(--transition-base);
  width: 32px;
  height: 32px;
  box-shadow: var(--shadow-xs);
}

.copy-btn:hover {
  background: #f0f9ff;
  border-color: #409eff;
  color: #409eff;
  box-shadow: var(--shadow-sm);
}

.detail-btn {
  border: 1px solid var(--color-border-primary);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  border-radius: var(--radius-base);
  padding: 6px 10px;
  line-height: 1;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all var(--transition-base);
  width: 32px;
  height: 32px;
  box-shadow: var(--shadow-xs);
}

.detail-btn:hover {
  background: #f0f9ff;
  border-color: #409eff;
  color: #409eff;
  box-shadow: var(--shadow-sm);
}

.recipe-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-primary);
}

.recipe-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
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
  padding: 16px 0;
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-primary);
}

/* 分页组件移动端优化 */
.pagination-section :deep(.el-pagination) {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.pagination-section :deep(.el-pagination__total) {
  font-size: 14px;
  color: var(--color-text-primary);
  margin-right: 8px;
  font-weight: 500;
}

.pagination-section :deep(.el-pagination__sizes) {
  margin-right: 8px;
}

.pagination-section :deep(.el-pagination__sizes .el-select) {
  width: 80px;
}

.pagination-section :deep(.el-pagination__sizes .el-input__inner) {
  font-size: 12px;
  padding: 4px 8px;
  height: 28px;
  border-radius: var(--radius-base);
  border: 1px solid var(--color-border-primary);
}

.pagination-section :deep(.el-pagination__sizes .el-input__suffix) {
  display: flex;
  align-items: center;
}

.pagination-section :deep(.el-pagination__sizes .el-select__caret) {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.pagination-section :deep(.el-pagination__prev),
.pagination-section :deep(.el-pagination__next) {
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

.pagination-section :deep(.el-pagination__prev:hover),
.pagination-section :deep(.el-pagination__next:hover) {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-accent);
  color: var(--color-text-primary);
}

.pagination-section :deep(.el-pagination__prev.is-disabled),
.pagination-section :deep(.el-pagination__next.is-disabled) {
  background: var(--color-bg-primary);
  border-color: var(--color-border-primary);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.pagination-section :deep(.el-pagination__jump) {
  margin-left: 8px;
  font-size: 14px;
}

.pagination-section :deep(.el-pagination__jump .el-input) {
  width: 50px;
}

.pagination-section :deep(.el-pagination__pager) {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-section :deep(.el-pager) {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-section :deep(.el-pager li) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: all var(--transition-base);
}

.pagination-section :deep(.el-pager li:hover) {
  background: var(--color-bg-secondary);
}

.pagination-section :deep(.el-pager li.is-active) {
  background: var(--color-primary-500);
  color: white;
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
    padding: 8px;
  }
  
  .element-content {
    padding: 16px;
    border-radius: 8px;
  }
  
  .back-button {
    font-size: 14px;
    margin-bottom: 12px;
  }

  .element-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 16px;
  }

  .element-emoji {
    font-size: 40px;
    width: 70px;
    height: 70px;
    border-radius: 10px;
  }

  .element-name {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .element-meta {
    justify-content: center;
    flex-direction: column;
    gap: 8px;
  }
  
  .element-type {
    font-size: 12px;
    padding: 4px 12px;
  }
  
  .element-id {
    font-size: 12px;
  }

  .element-stats-section {
    margin-bottom: 24px;
  }
  
  /* Element Plus 栅格系统移动端优化 */
  .element-stats-section .el-row {
    margin: 0 -6px;
  }
  
  .element-stats-section .el-col {
    padding: 0 6px;
    margin-bottom: 12px;
  }
  
  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 8px;
    padding: 12px;
    min-height: 80px;
  }
  
  .stat-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  .stat-value {
    font-size: 18px;
    font-weight: 700;
  }
  
  .stat-label {
    font-size: 12px;
    line-height: 1.2;
  }
  
  /* 浏览历史移动端优化 */
  .browsing-history {
    margin-bottom: 20px;
  }
  
  .history-title {
    font-size: 14px;
    margin-bottom: 8px;
  }
  
  .history-tags {
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .history-tag {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 12px;
    margin-bottom: 4px;
  }
  
  .history-tag .tag-emoji {
    font-size: 12px;
    margin-right: 4px;
  }
  
  .history-tag .tag-name {
    font-size: 11px;
  }
  
  .history-tag .tag-remove {
    width: 14px;
    height: 14px;
    font-size: 10px;
    margin-left: 4px;
  }
  
  /* 冰柱图移动端优化 */
  .icicle-chart-section {
    padding: 16px;
    margin-top: 32px;
  }
  
  .icicle-chart-container {
    padding: 16px;
    min-height: 300px;
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    /* 确保内容可以完全显示 */
    justify-content: flex-start;
  }
  
  /* 冰柱图内容区域优化 */
  .chart-content {
    min-width: 100%;
    width: max-content;
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
    gap: 12px;
  }
  
  .recipe-card {
    padding: 16px;
    border-radius: var(--radius-lg);
    margin-bottom: 0;
  }
  
  .recipe-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
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
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .ingredient-card,
  .result-card {
    padding: 6px 10px;
    min-width: 90px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 70px;
  }
  
  .operator {
    font-size: 13px;
    padding: 0 2px;
  }
  
  .like-btn,
  .copy-btn,
  .detail-btn {
    padding: 4px 8px;
    font-size: 12px;
    min-width: 32px;
    height: 28px;
  }
  
  .recipe-footer {
    margin-top: 12px;
    padding-top: 12px;
  }
  
  .recipe-meta {
    gap: 12px;
    font-size: 11px;
    flex-wrap: wrap;
  }
  
  /* 分页组件移动端优化 */
  .pagination-section {
    margin-top: 20px;
  }
  
  .pagination-section :deep(.el-pagination) {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }
  
  .pagination-section :deep(.el-pagination__total) {
    font-size: 13px;
    margin-right: 8px;
    margin-bottom: 0;
    font-weight: 500;
  }
  
  .pagination-section :deep(.el-pagination__sizes) {
    margin-right: 8px;
    margin-bottom: 0;
  }
  
  .pagination-section :deep(.el-pagination__sizes .el-select) {
    width: 70px;
  }
  
  .pagination-section :deep(.el-pagination__sizes .el-input__inner) {
    font-size: 11px;
    padding: 3px 6px;
    height: 26px;
  }
  
  .pagination-section :deep(.el-pagination__prev),
  .pagination-section :deep(.el-pagination__next) {
    width: 36px;
    height: 36px;
    font-size: 16px;
    margin: 0 6px;
  }
  
  .pagination-section :deep(.el-pagination__jump) {
    margin-left: 8px;
    margin-top: 0;
    font-size: 13px;
  }
  
  .pagination-section :deep(.el-pagination__jump .el-input) {
    width: 45px;
  }
  
  .pagination-section :deep(.el-pagination__jump .el-input__inner) {
    font-size: 11px;
    padding: 3px 5px;
    height: 26px;
  }
}

@media (max-width: 480px) {
  .element-detail-page {
    padding: 6px;
  }
  
  .element-content {
    padding: 12px;
    border-radius: 6px;
  }
  
  .back-button {
    font-size: 13px;
    margin-bottom: 10px;
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
    font-size: 11px;
  }
  
  /* 浏览历史小屏幕优化 */
  .browsing-history {
    margin-bottom: 16px;
  }
  
  .history-title {
    font-size: 13px;
    margin-bottom: 6px;
  }
  
  .history-tags {
    gap: 4px;
  }
  
  .history-tag {
    font-size: 11px;
    padding: 3px 6px;
    border-radius: 10px;
  }
  
  .history-tag .tag-emoji {
    font-size: 11px;
    margin-right: 3px;
  }
  
  .history-tag .tag-name {
    font-size: 10px;
  }
  
  .history-tag .tag-remove {
    width: 12px;
    height: 12px;
    font-size: 9px;
    margin-left: 3px;
  }
  
  /* 元素详情小屏幕优化 */
  .element-header {
    gap: 10px;
    margin-bottom: 16px;
    padding-bottom: 12px;
  }
  
  .element-emoji {
    font-size: 36px;
    width: 60px;
    height: 60px;
    border-radius: 8px;
  }
  
  .element-name {
    font-size: 20px;
    margin-bottom: 6px;
  }
  
  .element-meta {
    gap: 6px;
  }
  
  .element-type {
    font-size: 11px;
    padding: 3px 10px;
  }
  
  .element-id {
    font-size: 11px;
  }
  
  /* Element Plus 栅格系统小屏幕优化 */
  .element-stats-section .el-row {
    margin: 0 -4px;
  }
  
  .element-stats-section .el-col {
    padding: 0 4px;
    margin-bottom: 8px;
  }
  
  .stat-card {
    padding: 10px;
    min-height: 70px;
    gap: 6px;
  }
  
  .stat-icon {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
  
  .stat-value {
    font-size: 16px;
  }
  
  .stat-label {
    font-size: 10px;
    line-height: 1.1;
  }
  
  /* 冰柱图小屏幕优化 */
  .icicle-chart-section {
    padding: 12px;
    margin-top: 24px;
  }
  
  .icicle-chart-container {
    padding: 12px;
    min-height: 250px;
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    justify-content: flex-start;
  }
  
  .chart-content {
    min-width: 100%;
    width: max-content;
  }
  
  .section-title {
    font-size: 18px;
  }
  
  .recipes-list {
    gap: 10px;
  }
  
  .recipe-card {
    padding: 12px;
    border-radius: var(--radius-base);
    margin-bottom: 0;
  }
  
  .recipe-header {
    gap: 10px;
    margin-bottom: 10px;
  }
  
  .ingredient-cards {
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .ingredient-card,
  .result-card {
    padding: 4px 8px;
    min-width: 75px;
    flex-shrink: 0;
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60px;
  }
  
  .operator {
    font-size: 12px;
  }
  
  .like-btn,
  .copy-btn,
  .detail-btn {
    padding: 3px 6px;
    font-size: 11px;
    min-width: 28px;
    height: 24px;
  }
  
  .recipe-footer {
    margin-top: 10px;
    padding-top: 10px;
  }
  
  .recipe-meta {
    font-size: 10px;
    gap: 10px;
  }
  
  /* 分页组件小屏幕优化 */
  .pagination-section {
    margin-top: 16px;
  }
  
  .pagination-section :deep(.el-pagination) {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 6px;
  }
  
  .pagination-section :deep(.el-pagination__total) {
    font-size: 12px;
    margin-right: 6px;
    margin-bottom: 0;
    font-weight: 500;
  }
  
  .pagination-section :deep(.el-pagination__sizes) {
    margin-right: 6px;
    margin-bottom: 0;
  }
  
  .pagination-section :deep(.el-pagination__sizes .el-select) {
    width: 60px;
  }
  
  .pagination-section :deep(.el-pagination__sizes .el-input__inner) {
    font-size: 10px;
    padding: 2px 4px;
    height: 24px;
  }
  
  .pagination-section :deep(.el-pagination__prev),
  .pagination-section :deep(.el-pagination__next) {
    width: 32px;
    height: 32px;
    font-size: 14px;
    margin: 0 4px;
  }
  
  .pagination-section :deep(.el-pagination__jump) {
    margin-left: 6px;
    margin-top: 0;
    font-size: 12px;
  }
  
  .pagination-section :deep(.el-pagination__jump .el-input) {
    width: 40px;
  }
  
  .pagination-section :deep(.el-pagination__jump .el-input__inner) {
    font-size: 10px;
    padding: 2px 4px;
    height: 24px;
  }
}
</style>

