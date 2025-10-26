<template>
  <div class="icicle-chart">
    <!-- 图表容器 -->
    <div 
      ref="chartContainer"
      class="chart-container"
      :style="{ 
        width: `${chartWidth}px`, 
        height: `${chartHeight}px`
      }"
    >
      <!-- 节点渲染 -->
      <div 
        v-for="node in visibleNodes" 
        :key="node.id"
        class="icicle-node"
        :style="getNodeStyle(node)"
        @click="onNodeClick(node)"
      >
        <!-- 节点内容 -->
        <div class="node-content">
          <span class="node-label">{{ node.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { IcicleNode } from '@/types'

interface Props {
  data: IcicleNode[]
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 600
})

const emit = defineEmits<{
  nodeClick: [node: IcicleNode]
}>()

// 图表容器引用
const chartContainer = ref<HTMLElement>()

// 图表总高度（动态计算）
const chartHeight = ref(0)
// 图表总宽度（动态计算）
const chartWidth = ref(0)

// 使用矩形冰柱图布局算法
const visibleNodes = computed(() => {
  if (!props.data || props.data.length === 0) {
    chartHeight.value = 200 // 默认最小高度
    chartWidth.value = props.width
    return []
  }

  // 清空缓存以应对新数据
  weightCache.clear();
  styleCache.clear();

  // 使用矩形冰柱图布局算法
  const nodes = calculateNodeLayout(props.data)

  // 动态计算图表高度和宽度（优化：避免 map + Math.max）
  if (nodes.length > 0) {
    let maxY = 0
    let maxX = 0
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const nodeBottom = (node as any).y + (node as any).height
      const nodeRight = (node as any).x + (node as any).width
      
      if (nodeBottom > maxY) maxY = nodeBottom
      if (nodeRight > maxX) maxX = nodeRight
    }

    chartHeight.value = Math.max(maxY + 100, 300)
    // 优化宽度计算：确保图表宽度足够显示所有内容，但不超过实际需要的宽度
    chartWidth.value = Math.max(maxX, props.width)
  } else {
    chartHeight.value = 200
    chartWidth.value = props.width
  }

  return nodes
})

// 定义浅色系调色板常量，避免每次调用都重新创建
const LIGHT_COLOR_PALETTE = [
  '#ffd9b3', // 浅橙色
  '#ffe0b3', // 浅黄色
  '#c2edce', // 浅绿色
  '#c5b9f5', // 浅紫色
  '#f0bbd9'  // 浅粉色
];

// 权重计算缓存
const weightCache = new Map<IcicleNode, number>();

// 矩形冰柱图布局算法
const calculateNodeLayout = (nodes: IcicleNode[]) => {
  const BASE_HEIGHT = 60;
  const SPACING = 2;
  
  // 计算每个节点的权重（基于子节点数量或固定值）- 使用缓存避免重复计算
  const calculateNodeWeight = (node: IcicleNode): number => {
    if (weightCache.has(node)) {
      return weightCache.get(node)!;
    }
    
    let weight: number;
    if (node.children && node.children.length > 0) {
      // 父节点的权重等于所有子节点权重之和
      weight = node.children.reduce((sum: number, child: any) => sum + calculateNodeWeight(child), 0);
    } else {
      // 叶子节点的权重为1
      weight = 1;
    }
    
    weightCache.set(node, weight);
    return weight;
  };
  
  // 计算总权重
  const totalWeight = nodes.reduce((sum: number, node: any) => sum + calculateNodeWeight(node), 0);
  
  // 设置根节点位置和尺寸
  const rootX = 0;
  const rootY = 0;
  const rootWidth = Math.max(props.width - 100, totalWeight * 80);
  
  // 收集所有布局后的节点（包括所有层级的节点）
  const allLayoutNodes: any[] = [];
  
  // 递归布局所有节点
  const layoutNode = (node: IcicleNode, x: number, y: number, width: number, level: number = 0) => {
    // 设置节点的位置和尺寸
    (node as any).x = x;
    (node as any).y = y;
    (node as any).width = width;
    (node as any).height = BASE_HEIGHT;
    (node as any).level = level;
    
    // 将当前节点添加到结果数组中
    allLayoutNodes.push(node);
    
    // 如果有子节点，递归布局子节点
    if (node.children && node.children.length > 0) {
      const childY = y + BASE_HEIGHT + SPACING;
      let childX = x;
      
      // 计算每个子节点的权重
      const childWeights = node.children.map(child => calculateNodeWeight(child));
      const totalChildWeight = childWeights.reduce((sum, weight) => sum + weight, 0);
      
      // 布局每个子节点
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childWeight = childWeights[i];
        const childWidth = (childWeight / totalChildWeight) * width;
        
        layoutNode(child, childX, childY, childWidth, level + 1);
        childX += childWidth;
      }
    }
  };
  
  // 布局所有根节点
  let currentX = rootX;
  for (const node of nodes) {
    const nodeWeight = calculateNodeWeight(node);
    const nodeWidth = (nodeWeight / totalWeight) * rootWidth;
    layoutNode(node, currentX, rootY, nodeWidth);
    currentX += nodeWidth;
  }
  
  return allLayoutNodes;
}

// 缓存节点样式，避免每次渲染都创建新对象
const styleCache = new Map<IcicleNode, any>();

// 获取节点样式
const getNodeStyle = (node: any) => {
  if (styleCache.has(node)) {
    return styleCache.get(node);
  }
  
  const style = {
    left: `${node.x || 0}px`,
    top: `${node.y || 0}px`,
    width: `${node.width || 100}px`,
    height: `${node.height || 30}px`,
    backgroundColor: getNodeColor(node)
  };
  
  styleCache.set(node, style);
  return style;
}

// 获取节点颜色 - 浅色系配色，使用常量调色板
const getNodeColor = (node: any) => {
  if (node.isBase) {
    // 基础元素使用浅色系 - 浅蓝色
    return '#a8d8f0';
  } else {
    // 合成元素使用浅色系渐变，根据层级调整
    const level = node.level || 0;
    const value = node.value || 1;
    
    // 根据层级选择颜色，并根据 value 调整亮度
    const paletteIndex = (level + Math.floor(value)) % LIGHT_COLOR_PALETTE.length;
    return LIGHT_COLOR_PALETTE[paletteIndex];
  }
}

// 节点点击事件
const onNodeClick = (node: IcicleNode) => {
  emit('nodeClick', node)
}
</script>

<style scoped>
.icicle-chart {
  width: 100%;
  min-height: 350px;
  background: transparent;
  border-radius: var(--radius-lg);
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0;
  box-sizing: border-box;
}

.chart-container {
  position: relative;
  background: transparent;
  border-radius: var(--radius-lg);
  overflow: visible;
  margin: 0 auto;
  min-width: 100%;
  min-height: 300px;
}

.icicle-node {
  position: absolute;
  border: 2px solid var(--color-primary-300);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
  z-index: 1;
  background: var(--color-bg-surface);
}

.icicle-node:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-500);
  z-index: 100;
  background: var(--color-primary-50);
}

.node-content {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  height: 100%;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 500;
}

.node-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .icicle-chart {
    padding: 0;
    min-height: 300px;
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    /* 确保内容可以完全显示 */
    justify-content: flex-start;
  }
  
  .chart-container {
    min-width: 100%;
    min-height: 250px;
    /* 确保容器宽度适应内容 */
    width: max-content;
  }
  
  .icicle-node {
    border-width: 1px;
    border-radius: var(--radius-sm);
    min-height: 28px;
  }
  
  .node-content {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .node-label {
    font-size: 12px;
    font-weight: 600;
  }
}

@media (max-width: 480px) {
  .icicle-chart {
    padding: 0;
    min-height: 250px;
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    justify-content: flex-start;
  }
  
  .chart-container {
    min-width: 100%;
    min-height: 220px;
    width: max-content;
  }
  
  .node-content {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .node-label {
    font-size: 11px;
  }
  
  .icicle-node {
    min-height: 24px;
  }
}
</style>