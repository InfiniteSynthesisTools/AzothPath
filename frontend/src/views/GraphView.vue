<template>
  <div class="graph-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-emoji">🗺️</span>
        总图显示
      </h1>
      <p class="page-subtitle">可视化合成元素的层级结构和关系图谱</p>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic :value="stats.totalItems" title="总元素数">
              <template #prefix>
                <el-icon><Box /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic :value="stats.totalRecipes" title="合成配方数">
              <template #prefix>
                <el-icon><Document /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic :value="stats.maxDepth" title="最大深度">
              <template #prefix>
                <el-icon><TrendCharts /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic :value="stats.baseItems" title="基础材料">
              <template #prefix>
                <el-icon><Star /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 标签页 -->
    <div class="tabs-section">
      <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
        <el-tab-pane label="有向图" name="dag">
          <div class="tab-content">
            <h2>有向无环图分析</h2>
            <p class="description">探索元素之间的合成关系，点击节点展开/收起其邻居。</p>
            
            <div class="chart-card">
              <div class="controls">
                <div class="input-group">
                  <div class="search-container">
                    <el-input
                      v-model="dagSearch"
                      placeholder="输入要搜索的元素名称"
                      clearable
                      @input="debouncedRenderDAG"
                    >
                      <template #prefix>
                        <el-icon><Search /></el-icon>
                      </template>
                    </el-input>
                  </div>
                  
                  <el-checkbox v-model="showNonSimple" @change="debouncedUpdateGraph">
                    显示非最简路径
                  </el-checkbox>
                  
                  <el-checkbox v-model="expandOnlyParents" @change="debouncedUpdateGraph">
                    展开素材
                  </el-checkbox>

                  <el-checkbox v-model="expandChildrenAndPeers" @change="debouncedUpdateGraph">
                    展开产物
                  </el-checkbox>
                </div>
              </div>
              
              <div class="controls">
                <div class="input-group">
                  <div class="filter-group">
                    <span>深度:</span>
                    <el-input-number
                      v-model="dagMinDepthFilter"
                      placeholder="最小"
                      :min="0"
                      :max="dagMaxDepthFilter"
                      @change="debouncedUpdateGraph"
                    />
                    <el-input-number
                      v-model="dagMaxDepthFilter"
                      placeholder="最大"
                      :min="dagMinDepthFilter"
                      :max="20"
                      @change="debouncedUpdateGraph"
                    />
                  </div>
                  
                  <div class="filter-group">
                    <span>宽度:</span>
                    <el-input-number
                      v-model="dagMinWidthFilter"
                      placeholder="最小"
                      :min="0"
                      :max="dagMaxWidthFilter"
                      @change="debouncedUpdateGraph"
                    />
                    <el-input-number
                      v-model="dagMaxWidthFilter"
                      placeholder="最大"
                      :min="dagMinWidthFilter"
                      :max="10000"
                      @change="debouncedUpdateGraph"
                    />
                  </div>
                </div>
              </div>

              <div class="chart-wrapper">
                <div id="dag-container" class="chart-container" v-loading="loadingDAG">
                  <div v-if="!hasData" class="placeholder">
                    <el-icon size="48" color="#909399"><Connection /></el-icon>
                    <p>请在上方输入框中输入元素名称进行搜索</p>
                  </div>
                  <div v-else-if="loadingDAG" class="placeholder">
                    <el-icon size="48" color="#909399"><Connection /></el-icon>
                    <p>正在加载有向图数据...</p>
                  </div>
                  <div v-else class="dag-chart-content">
                    <div class="dag-placeholder">
                      <el-icon size="64" color="#909399"><Connection /></el-icon>
                      <p style="margin-top: 16px; font-size: 16px;">有向图功能开发中</p>
                      <p style="margin-top: 8px; font-size: 14px;">当前搜索: "{{ dagSearch }}"</p>
                    </div>
                  </div>
                </div>
                <el-button class="fullscreen-btn" @click="toggleFullscreen('dag-container')">
                  <el-icon><FullScreen /></el-icon>
                  全屏
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Box,
  Document,
  Star,
  Search,
  FullScreen,
  Connection,
  TrendCharts,
} from '@element-plus/icons-vue';
import { recipeApi } from '@/api';

// 响应式数据
const activeTab = ref('dag');
const hasData = ref(false);
const loadingDAG = ref(false);

// 统计数据
const stats = reactive({
  totalItems: 0,
  totalRecipes: 0,
  maxDepth: 0,
  baseItems: 0
});

// 有向图相关数据
const dagSearch = ref('');
const showNonSimple = ref(false);
const expandOnlyParents = ref(true);
const expandChildrenAndPeers = ref(false);
const dagMinDepthFilter = ref(0);
const dagMaxDepthFilter = ref(20);
const dagMinWidthFilter = ref(0);
const dagMaxWidthFilter = ref(10000);

// 防抖函数
let debounceTimer: NodeJS.Timeout | null = null;
const debounce = (func: Function, wait: number) => {
  return (...args: any[]) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(null, args), wait);
  };
};

const debouncedRenderDAG = debounce(() => {
  renderDAGChart();
}, 300);

const debouncedUpdateGraph = debounce(() => {
  updateDAGGraph();
}, 300);

// 加载统计数据
const loadStats = async () => {
  try {
    const data = await recipeApi.getGraphStats();
    stats.totalItems = data.total_items || 0;
    stats.totalRecipes = data.total_recipes || 0;
    stats.maxDepth = 0; // API暂时没有提供最大深度，设为0
    stats.baseItems = data.base_items || 0;
    hasData.value = true;
  } catch (error) {
    console.error('加载统计数据失败:', error);
    ElMessage.error('加载统计数据失败');
  }
};

// 标签切换处理
const handleTabClick = (tab: any) => {
  if (tab.paneName === 'dag' && hasData.value) {
    nextTick(() => {
      // renderDAGChart();
    });
  }
};

// 准备节点数据用于布局
const prepareNodesForLayout = (nodes: any[]): any[] => {
  return nodes.map(node => {
    // 确保节点有必要的属性
    if (!node.children) node.children = [];
    if (!node.level) node.level = 0;
    if (!node.value) node.value = 1;
    if (!node.isBase) node.isBase = false;
    
    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      node.children = prepareNodesForLayout(node.children);
    }
    
    return node;
  });
};

// 有向图渲染（简化实现）
const renderDAGChart = () => {
  if (!hasData.value) return;
  
  loadingDAG.value = true;
  
  // 这里应该调用API获取有向图数据
  // 暂时使用模拟数据
  setTimeout(() => {
    loadingDAG.value = false;
  }, 1000);
};

// 更新有向图
const updateDAGGraph = () => {
  if (activeTab.value === 'dag') {
    renderDAGChart();
  }
};

// 全屏切换
const toggleFullscreen = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (!document.fullscreenElement) {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

// 生命周期
onMounted(() => {
  loadStats();
  
  // 监听全屏变化
  document.addEventListener('fullscreenchange', () => {
    // 处理全屏变化
  });
});

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});


</script>

<style scoped>
.graph-view {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  min-height: 100vh;
  padding: 20px;
  transition: background var(--transition-base);
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

.title-emoji {
  font-size: 36px;
  margin-right: 12px;
  display: inline-block;
  -webkit-text-fill-color: initial !important;
  background: none !important;
  background-clip: initial !important;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.stats-section {
  max-width: 1400px;
  margin: 0 auto 40px;
  padding: 0 20px;
}

.stats-section :deep(.stat-card) {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.stats-section :deep(.stat-card:hover) {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-border-accent);
}

.stats-section :deep(.el-statistic__content) {
  color: var(--color-text-primary);
}

.stats-section :deep(.el-statistic__title) {
  color: var(--color-text-secondary);
}

.tabs-section {
  max-width: 1400px;
  margin: 0 auto;
  background: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border-primary);
  overflow: hidden;
}

:deep(.el-tabs__header) {
  margin: 0;
  background: var(--color-bg-tertiary);
}

:deep(.el-tabs__item) {
  font-weight: 500;
}

.tab-content {
  padding: 24px;
}

.tab-content h2 {
  color: var(--color-text-primary);
  margin-bottom: 8px;
  font-size: 20px;
  font-weight: 600;
}

.description {
  color: var(--color-text-secondary);
  margin-bottom: 20px;
  font-size: 14px;
}

.chart-card {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.controls {
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.search-container {
  flex: 1;
  min-width: 200px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.filter-group span {
  color: var(--color-text-secondary);
  font-size: 14px;
}

/* DAG Chart Placeholder */
.dag-chart-content {
  width: 100%;
  height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-lg);
}

.dag-placeholder {
  text-align: center;
  color: var(--color-text-tertiary);
}

.dag-placeholder p {
  margin: 16px 0 0;
  font-size: 16px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .graph-view {
    padding: 10px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .page-subtitle {
    font-size: 14px;
    margin-bottom: 16px;
  }
  
  .page-header {
    margin-bottom: 20px;
  }
  
  .tab-content {
    padding: 16px;
  }
  
  .input-group {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .search-container {
    min-width: auto;
  }
  
  .filter-group {
    justify-content: space-between;
    width: 100%;
  }
  
  .filter-group span {
    color: var(--color-text-secondary);
  }
  
  .dag-chart-content {
    height: 400px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-primary);
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 20px;
  }
  
  .page-subtitle {
    font-size: 13px;
    margin-bottom: 12px;
  }
  
  .page-header {
    margin-bottom: 16px;
  }
  
  .dag-chart-content {
    height: 350px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-primary);
  }
  
  .dag-placeholder {
    color: var(--color-text-tertiary);
  }
}
</style>
