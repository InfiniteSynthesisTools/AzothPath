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
          <span v-if="node.emoji" class="node-emoji">{{ node.emoji }}</span>
          <span class="node-label">{{ node.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  console.log('visibleNodes computed:', {
    propsData: props.data,
    propsDataLength: props.data?.length
  })
  
  if (!props.data || props.data.length === 0) {
    chartHeight.value = 200 // 默认最小高度
    chartWidth.value = props.width
    return []
  }
  
  // 使用矩形冰柱图布局算法
  const nodes = calculateNodeLayout(props.data)
  
  // 动态计算图表高度和宽度
  if (nodes.length > 0) {
    const maxY = Math.max(...nodes.map(node => node.y + node.height))
    const maxX = Math.max(...nodes.map(node => node.x + node.width))
    chartHeight.value = Math.max(maxY + 100, 300) // 添加边距，最小高度300px
    chartWidth.value = Math.max(maxX + 100, props.width) // 添加边距，最小宽度为props.width
  } else {
    chartHeight.value = 200
    chartWidth.value = props.width
  }
  
  return nodes
})

// 矩形冰柱图布局算法
const calculateNodeLayout = (nodes: IcicleNode[]) => {
  const BASE_HEIGHT = 60;
  const SPACING = 2;
  
  // 计算每个节点的权重（基于子节点数量或固定值）
  const calculateNodeWeight = (node: IcicleNode): number => {
    if (node.children && node.children.length > 0) {
      // 父节点的权重等于所有子节点权重之和
      return node.children.reduce((sum: number, child: any) => sum + calculateNodeWeight(child), 0);
    } else {
      // 叶子节点的权重为1
      return 1;
    }
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
    // 设置当前节点的位置和尺寸
    node.x = x;
    node.y = y;
    node.width = width;
    node.height = BASE_HEIGHT;
    node.level = level;
    
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

// 扁平化节点树
const flattenNodes = (nodes: IcicleNode[]): IcicleNode[] => {
  const result: IcicleNode[] = []
  
  const traverse = (node: IcicleNode, depth: number = 0) => {
    // 添加当前节点
    result.push({
      ...node,
      depth
    })
    
    // 递归处理子节点
    if (node.children) {
      node.children.forEach(child => traverse(child, depth + 1))
    }
  }
  
  nodes.forEach(node => traverse(node))
  return result
}

// 获取节点样式
const getNodeStyle = (node: any) => {
  return {
    left: `${node.x || 0}px`,
    top: `${node.y || 0}px`,
    width: `${node.width || 100}px`,
    height: `${node.height || 30}px`,
    backgroundColor: getNodeColor(node)
  }
}

// 获取节点颜色
const getNodeColor = (node: any) => {
  if (node.isBase) {
    // 基础元素使用醒目的红色系
    return '#e74c3c';
  } else {
    // 合成元素使用渐变色，根据层级和宽度动态调整
    const level = node.level || 0;
    const value = node.value || 1;
    const hue = (level * 60 + value * 30) % 360;
    const saturation = Math.min(85, 70 + level * 5);
    const lightness = Math.max(40, 60 - level * 3);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}

// 节点点击事件
const onNodeClick = (node: IcicleNode) => {
  emit('nodeClick', node)
}

onMounted(() => {
  console.log('IcicleChart mounted with data:', props.data)
})
</script>

<style scoped>
.icicle-chart {
  width: 100%;
  min-height: 300px;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  box-sizing: border-box;
}

.chart-container {
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: visible;
  margin: 0 auto;
}

.icicle-node {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.icicle-node:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.node-content {
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.node-emoji {
  font-size: 14px;
}

.node-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>