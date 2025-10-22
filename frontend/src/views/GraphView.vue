<template>
  <div class="graph-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>🗺️ 总图显示</h1>
      <p>可视化合成元素的层级结构和关系图谱</p>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.totalItems" title="总元素数">
              <template #prefix>
                <el-icon><Box /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.totalRecipes" title="合成配方数">
              <template #prefix>
                <el-icon><Document /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic :value="stats.maxDepth" title="最大深度">
              <template #prefix>
                <el-icon><TrendCharts /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
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
        <el-tab-pane label="冰柱图" name="icicle">
          <div class="tab-content">
            <h2>矩形冰柱图分析</h2>
            <p class="description">可视化元素的层级结构和合成路径，支持交互式探索。</p>
            
            <div class="chart-card">
              <div class="controls">
                <div class="input-group">
                  <div class="search-container">
                    <el-input
                      v-model="icicleSearch"
                      placeholder="输入元素名称实时搜索"
                      clearable
                      @input="debouncedRenderIcicle"
                    >
                      <template #prefix>
                        <el-icon><Search /></el-icon>
                      </template>
                    </el-input>
                  </div>
                  
                  <el-checkbox v-model="searchOnlyRoots" @change="debouncedRenderIcicle">
                    只搜索根节点
                  </el-checkbox>
                  
                  <div class="filter-group">
                    <span>深度:</span>
                    <el-input-number
                      v-model="minDepthFilter"
                      placeholder="最小"
                      :min="0"
                      :max="maxDepthFilter"
                      @change="debouncedRenderIcicle"
                    />
                    <el-input-number
                      v-model="maxDepthFilter"
                      placeholder="最大"
                      :min="minDepthFilter"
                      :max="20"
                      @change="debouncedRenderIcicle"
                    />
                  </div>
                  
                  <div class="filter-group">
                    <span>宽度:</span>
                    <el-input-number
                      v-model="minWidthFilter"
                      placeholder="最小"
                      :min="0"
                      :max="maxWidthFilter"
                      @change="debouncedRenderIcicle"
                    />
                    <el-input-number
                      v-model="maxWidthFilter"
                      placeholder="最大"
                      :min="minWidthFilter"
                      :max="10000"
                      @change="debouncedRenderIcicle"
                    />
                  </div>
                  
                  <div class="view-controls">
                    <el-button-group>
                      <el-button @click="zoomOut" title="缩小">
                        <el-icon><Minus /></el-icon>
                      </el-button>
                      <el-button @click="resetView" title="重置视图">
                        <el-icon><Refresh /></el-icon>
                      </el-button>
                      <el-button @click="zoomIn" title="放大">
                        <el-icon><Plus /></el-icon>
                      </el-button>
                    </el-button-group>
                  </div>
                </div>
              </div>
              
              <div class="chart-wrapper">
                <div id="icicle-container" class="chart-container" v-loading="loadingIcicle">
                  <div v-if="loadingIcicle" class="placeholder">
                    <el-icon size="48" color="#909399"><MapLocation /></el-icon>
                    <p>正在加载冰柱图数据...</p>
                  </div>
                  <div v-else-if="!hasData" class="placeholder">
                    <el-icon size="48" color="#909399"><MapLocation /></el-icon>
                    <p>请等待数据加载...</p>
                  </div>
                  <div v-else-if="!icicleChartData" class="placeholder">
                    <el-icon size="48" color="#909399"><Search /></el-icon>
                    <p>未找到符合条件的元素</p>
                  </div>
                  <div v-else class="icicle-chart-content" :style="chartTransform">
                    <div 
                      v-for="node in layoutNodes" 
                      :key="node.id || node.name"
                      class="icicle-node"
                      :style="{
                        left: node.x + 'px',
                        top: node.y + 'px',
                        width: node.width + 'px',
                        height: node.height + 'px',
                        backgroundColor: nodeColor(node),
                        zIndex: 10 - node.level
                      }"
                      @mouseover="showIcicleTooltip($event, node)"
                      @mouseout="hideIcicleTooltip"
                      @click="handleIcicleNodeClick(node)"
                    >
                      <div class="node-content">
                        <span class="node-emoji">{{ nodeEmoji(node) }}</span>
                        <span class="node-name">{{ node.name }}</span>
                        <span v-if="!node.isBase" class="node-value">{{ node.value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <el-button class="fullscreen-btn" @click="toggleFullscreen('icicle-container')">
                  <el-icon><FullScreen /></el-icon>
                  全屏
                </el-button>
              </div>
              
              <!-- 工具提示 -->
              <div 
                v-if="tooltipVisible && tooltipData" 
                class="icicle-tooltip"
                :style="{
                  left: tooltipPosition.x + 'px',
                  top: tooltipPosition.y + 'px'
                }"
              >
                <div class="tooltip-header">
                  <span class="tooltip-emoji">{{ nodeEmoji(tooltipData) }}</span>
                  <span class="tooltip-name">{{ tooltipData.name }}</span>
                </div>
                <div class="tooltip-content">
                  <div>{{ tooltipData.isBase ? '基础元素' : '合成元素' }}</div>
                  <div v-if="tooltipData.recipe" class="tooltip-recipe">
                    配方: {{ tooltipData.recipe.item_a }} + {{ tooltipData.recipe.item_b }}
                  </div>
                  <div>宽度: {{ tooltipData.value }}</div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

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
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Box,
  Document,
  Star,
  Search,
  FullScreen,
  MapLocation,
  Connection,
  TrendCharts,
  Minus,
  Plus,
  Refresh
} from '@element-plus/icons-vue';
import { recipeApi } from '@/api';

// 响应式数据
const activeTab = ref('icicle');
const hasData = ref(false);
const loadingIcicle = ref(false);
const loadingDAG = ref(false);

// 统计数据
const stats = reactive({
  totalItems: 0,
  totalRecipes: 0,
  maxDepth: 0,
  baseItems: 0
});

// 冰柱图相关数据
const icicleSearch = ref('');
const searchOnlyRoots = ref(true);
const minDepthFilter = ref(0);
const maxDepthFilter = ref(20);
const minWidthFilter = ref(0);
const maxWidthFilter = ref(10000);
const icicleChartData = ref<any>(null);
const layoutNodes = ref<any[]>([]);
const tooltipVisible = ref(false);
const tooltipData = ref<any>(null);
const tooltipPosition = ref({ x: 0, y: 0 });

// 有向图相关数据
const dagSearch = ref('');
const showNonSimple = ref(false);
const expandOnlyParents = ref(true);
const expandChildrenAndPeers = ref(false);
const dagMinDepthFilter = ref(0);
const dagMaxDepthFilter = ref(20);
const dagMinWidthFilter = ref(0);
const dagMaxWidthFilter = ref(10000);

// 视图控制
const zoomLevel = ref(1);
const viewOffset = ref({ x: 0, y: 0 });

// 防抖函数
let debounceTimer: NodeJS.Timeout | null = null;
const debounce = (func: Function, wait: number) => {
  return (...args: any[]) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(null, args), wait);
  };
};

// 防抖函数实例
const debouncedRenderIcicle = debounce(() => {
  renderIcicleChart();
}, 300);

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
    
    // 统计数据加载完成后，自动渲染冰柱图
    if (activeTab.value === 'icicle') {
      nextTick(() => {
        renderIcicleChart();
      });
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
    ElMessage.error('加载统计数据失败');
  }
};

// 标签切换处理
const handleTabClick = (tab: any) => {
  if (tab.paneName === 'icicle' && hasData.value) {
    nextTick(() => {
      renderIcicleChart();
    });
  }
};

// 冰柱图渲染（真实实现）
const renderIcicleChart = async () => {
  if (!hasData.value) return;
  
  loadingIcicle.value = true;
  
  try {
    // 调用真实的后端API获取冰柱图数据
    const response = await recipeApi.getIcicleChart();
    icicleChartData.value = response;
    
    console.log('冰柱图数据:', icicleChartData.value);
    
    if (icicleChartData.value && icicleChartData.value.nodes) {
      console.log('开始渲染冰柱图，节点数量:', icicleChartData.value.nodes.length);
      // 计算布局节点
      layoutNodes.value = calculateNodeLayout(icicleChartData.value.nodes);
      
      // 应用视图变换
      applyViewTransform();
    } else {
      console.log('冰柱图数据为空');
    }
  } catch (error) {
    console.error('获取冰柱图数据失败:', error);
    ElMessage.error('获取冰柱图数据失败，请检查后端服务是否正常运行');
  } finally {
    loadingIcicle.value = false;
  }
};

// 计算每个节点的位置和尺寸
const calculateNodeLayout = (nodes: any[], startX = 0, startY = 0, level = 0) => {
  const baseWidth = 60; // 基础元素宽度
  const nodeHeight = 45; // 节点高度
  const verticalGap = 15; // 垂直间距
  const horizontalGap = 3; // 水平间距
  
  const layoutNodes: any[] = [];
  let currentX = startX;
  
  nodes.forEach(node => {
    // 计算节点宽度
    const nodeWidth = node.isBase ? baseWidth : Math.max(80, node.value * baseWidth);
    
    // 计算节点位置
    const layout = {
      ...node,
      x: currentX,
      y: startY + level * (nodeHeight + verticalGap),
      width: nodeWidth,
      height: nodeHeight,
      level: level
    };
    
    layoutNodes.push(layout);
    
    // 递归计算子节点布局
    if (node.children && node.children.length > 0) {
      const childLayouts = calculateNodeLayout(node.children, currentX, startY, level + 1);
      layoutNodes.push(...childLayouts);
    }
    
    currentX += nodeWidth + horizontalGap;
  });
  
  return layoutNodes;
};

// 工具提示函数
const showIcicleTooltip = (event: MouseEvent, node: any) => {
  tooltipData.value = node;
  tooltipPosition.value = {
    x: event.clientX + 10,
    y: event.clientY + 10
  };
  tooltipVisible.value = true;
};

const hideIcicleTooltip = () => {
  tooltipVisible.value = false;
  tooltipData.value = null;
};

const handleIcicleNodeClick = (node: any) => {
  console.log('点击冰柱图节点:', node);
  ElMessage.info(`点击了: ${node.name}`);
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

// 视图控制函数
const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.2, 3);
  applyViewTransform();
};

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.2, 0.5);
  applyViewTransform();
};

const resetView = () => {
  zoomLevel.value = 1;
  viewOffset.value = { x: 0, y: 0 };
  applyViewTransform();
};

// 计算属性
const chartTransform = computed(() => {
  return {
    transform: `scale(${zoomLevel.value}) translate(${viewOffset.value.x}px, ${viewOffset.value.y}px)`,
    transformOrigin: 'top left'
  };
});

const nodeColor = (node: any) => {
  return node.isBase ? '#e74c3c' : `hsl(${(node.value * 137.5) % 360}, 70%, 60%)`;
};

const nodeEmoji = (node: any) => {
  return node.emoji || (node.isBase ? '🔘' : '⚗️');
};

const applyViewTransform = () => {
  // 现在通过计算属性自动应用变换
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
  background-color: #f5f7fa;
  min-height: 100vh;
  padding: 20px;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 20px;
  text-align: center;
  border-radius: 12px;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 32px;
  margin-bottom: 10px;
  font-weight: 600;
}

.page-header p {
  font-size: 16px;
  opacity: 0.9;
}

.stats-section {
  max-width: 1400px;
  margin: 0 auto 30px;
}

.tabs-section {
  max-width: 1400px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

:deep(.el-tabs__header) {
  margin: 0;
  background: #f8f9fa;
}

:deep(.el-tabs__item) {
  font-weight: 500;
}

.tab-content {
  padding: 24px;
}

.tab-content h2 {
  color: #303133;
  margin-bottom: 8px;
  font-size: 20px;
  font-weight: 600;
}

.description {
  color: #606266;
  margin-bottom: 20px;
  font-size: 14px;
}

.chart-card {
  background: #fafbfc;
  border: 1px solid #e8eaed;
  border-radius: 8px;
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
  color: #606266;
  font-size: 14px;
}

.chart-wrapper {
  position: relative;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.chart-container {
  height: 600px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  overflow: auto;
}

.placeholder {
  text-align: center;
  color: #909399;
}

.placeholder p {
  margin: 16px 0 0;
  font-size: 16px;
}

.fullscreen-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #409eff;
  color: #409eff;
  z-index: 10;
}

.fullscreen-btn:hover {
  background: #409eff;
  color: white;
}

/* 冰柱图节点样式 */
.icicle-chart-content {
  position: relative;
  min-width: 100%;
  min-height: 600px;
  background: #f8f9fa;
  border-radius: 8px;
}

.icicle-node {
  position: absolute;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  box-sizing: border-box;
  overflow: hidden;
}

.icicle-node:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100 !important;
}

.node-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  text-align: center;
  width: 100%;
}

.node-emoji {
  font-size: 16px;
  line-height: 1;
}

.node-name {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.node-value {
  font-size: 10px;
  opacity: 0.8;
}

/* 有向图样式 */
.dag-chart-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dag-placeholder {
  text-align: center;
  color: #909399;
}

/* 工具提示样式 */
.icicle-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  z-index: 1000;
  pointer-events: none;
  max-width: 200px;
  backdrop-filter: blur(4px);
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-weight: 600;
}

.tooltip-emoji {
  font-size: 16px;
}

.tooltip-name {
  font-size: 14px;
}

.tooltip-content {
  font-size: 12px;
  opacity: 0.9;
  line-height: 1.4;
}

.tooltip-recipe {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .graph-view {
    padding: 10px;
  }
  
  .page-header {
    padding: 30px 15px;
    margin-bottom: 20px;
  }
  
  .page-header h1 {
    font-size: 24px;
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
  
  .chart-container {
    height: 400px;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 20px 12px;
  }
  
  .page-header h1 {
    font-size: 20px;
  }
  
  .chart-container {
    height: 350px;
  }
}
</style>
