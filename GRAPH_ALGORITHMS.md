# 建图算法与图分类系统文档

## 概述

Azoth Path 系统实现了完整的建图功能，基于物品合成配方构建有向图，支持图论算法分析、图分类和统计指标计算。

## 1. 建图方法

### 1.1 图数据结构

系统基于合成配方构建有向图，其中：
- **节点 (Nodes)**: 物品
- **边 (Edges)**: 合成配方 (A + B → C)
- **基础材料**: 金、木、水、火、土

### 1.2 核心算法实现

#### 1.2.1 可达性分析 (BFS)

```typescript
// 从基础材料开始进行广度优先搜索
function analyzeReachability(): ReachableItems {
  const queue = [...baseItems];
  const reachableItems = new Set(baseItems);
  const validRecipes = new Set();
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    for (const recipe of itemToRecipes[current]) {
      const { item_a, item_b, result } = recipe;
      
      // 跳过材料不可达的配方
      if (!reachableItems.has(item_a) || !reachableItems.has(item_b)) {
        continue;
      }
      
      validRecipes.add(recipe);
      
      // 新物品加入队列
      if (!reachableItems.has(result)) {
        reachableItems.add(result);
        queue.push(result);
      }
    }
  }
  
  return { reachableItems, validRecipes };
}
```

#### 1.2.2 连通分量检测 (DFS)

```typescript
// 深度优先搜索检测连通分量
function detectConnectedComponents(): GraphComponent[] {
  const visited = new Set();
  const components: GraphComponent[] = [];
  
  for (const item of allItems) {
    if (!visited.has(item)) {
      const component = new Set();
      dfs(item, visited, component);
      components.push({
        items: Array.from(component),
        type: classifyComponent(component)
      });
    }
  }
  
  return components;
}
```

#### 1.2.3 循环依赖检测

```typescript
// 检测循环依赖模式
function detectCircularDependencies(): {
  selfLoopRecipes: Set<Recipe>;
  circularItems: Set<string>;
} {
  const selfLoopRecipes = new Set<Recipe>();
  const circularItems = new Set<string>();
  
  for (const recipe of recipes) {
    const { item_a, item_b, result } = recipe;
    
    // 自环检测: A + A = A
    if (item_a === result && item_b === result) {
      selfLoopRecipes.add(recipe);
      circularItems.add(result);
    }
    // 单边循环检测: A + B = A 或 A + B = B
    else if (item_a === result || item_b === result) {
      selfLoopRecipes.add(recipe);
      circularItems.add(result);
      circularItems.add(item_a === result ? item_b : item_a);
    }
  }
  
  return { selfLoopRecipes, circularItems };
}
```

## 2. 图分类系统

### 2.1 图类型定义

系统将物品图分为四种类型：

#### 2.1.1 孤立图 (Isolated Graph)
- **定义**: 无法从基础材料合成的物品
- **特征**: 没有入边或入边来自其他不可达物品
- **示例**: 系统测试显示有 665 个孤立图物品

#### 2.1.2 边界图 (Boundary Graph)
- **定义**: 可以直接从基础材料合成的物品
- **特征**: 合成深度为 1
- **示例**: 基础材料直接合成的物品

#### 2.1.3 循环图 (Circular Graph)
- **定义**: 包含循环依赖的物品
- **特征**: 存在 A + A = A 或 A + B = A 等循环配方
- **示例**: 自环配方物品

#### 2.1.4 线性图 (Linear Graph)
- **定义**: 正常的合成路径，无循环依赖
- **特征**: 从基础材料到目标物品的有向无环路径
- **示例**: 大多数可合成物品

### 2.2 分类算法

```typescript
interface GraphClassification {
  isolated: string[];      // 孤立图物品
  boundary: string[];      // 边界图物品  
  circular: string[];      // 循环图物品
  linear: string[];        // 线性图物品
}

function classifyGraph(): GraphClassification {
  const classification: GraphClassification = {
    isolated: [],
    boundary: [],
    circular: [],
    linear: []
  };
  
  for (const item of allItems) {
    if (circularItems.has(item)) {
      classification.circular.push(item);
    } else if (!reachableItems.has(item)) {
      classification.isolated.push(item);
    } else if (isBoundaryItem(item)) {
      classification.boundary.push(item);
    } else {
      classification.linear.push(item);
    }
  }
  
  return classification;
}
```

## 3. 有向图统计指标

### 3.1 基础统计指标

#### 3.1.1 入度 (In-Degree)
- **定义**: 物品作为合成结果的配方数量
- **意义**: 表示该物品的合成方式多样性
- **计算**: `inDegree = itemToRecipes[item].length`

#### 3.1.2 出度 (Out-Degree)
- **定义**: 物品作为合成材料的配方数量
- **意义**: 表示该物品参与其他合成的活跃度
- **计算**: 统计所有配方中该物品作为 item_a 或 item_b 出现的次数

#### 3.1.3 平均度数 (Average Degree)
- **定义**: 所有物品的平均度数
- **计算**: `avgDegree = (sum(inDegree) + sum(outDegree)) / totalItems`

### 3.2 高级统计指标

#### 3.2.1 图密度 (Graph Density)
- **定义**: 实际边数与可能最大边数的比值
- **计算**: `density = actualEdges / (totalItems * (totalItems - 1))`
- **意义**: 表示图的稠密程度

#### 3.2.2 聚类系数 (Clustering Coefficient)
- **定义**: 节点邻居之间实际连接数与可能连接数的比值
- **计算**: 对于每个节点，计算其邻居之间的连接比例，然后取平均值
- **意义**: 表示图的聚集程度

#### 3.2.3 边界节点数 (Boundary Nodes)
- **定义**: 可以直接从基础材料合成的物品数量
- **计算**: 统计合成深度为 1 的物品数量

### 3.3 基础材料广度计算

#### 3.3.1 广度定义
- **基础材料广度**: 使用该基础材料作为输入材料的配方数量
- **意义**: 表示基础材料在合成网络中的重要性和易得性

#### 3.3.2 广度计算
```typescript
function calculateBaseMaterialBreadth(): Record<string, number> {
  const breadth: Record<string, number> = {};
  
  for (const baseItem of baseItems) {
    let count = 0;
    
    for (const recipe of recipes) {
      if (recipe.item_a === baseItem || recipe.item_b === baseItem) {
        count++;
      }
    }
    
    breadth[baseItem] = count;
  }
  
  return breadth;
}
```

## 4. 实现位置

### 4.1 核心算法文件
- **位置**: `backend/src/services/recipeService.ts`
- **主要函数**:
  - `buildRecipeGraph()` - 构建配方图
  - `analyzeReachability()` - 可达性分析
  - `classifyGraph()` - 图分类
  - `calculateGraphStats()` - 图统计计算

### 4.2 测试脚本
- **功能测试**: `backend/test_graph_functionality.js`
- **统计测试**: `backend/test_directed_graph_stats.js`

## 5. 测试结果

### 5.1 系统规模统计
- **总物品数**: 2012 个
- **合法物品**: 1347 个（可合成物品）
- **不可及物品**: 665 个（全部为孤立图）

### 5.2 基础材料广度
- **水**: 427
- **火**: 348  
- **土**: 332
- **金**: 551
- **木**: 486

### 5.3 图统计指标
- **平均入度**: 计算所有物品的平均合成方式
- **平均出度**: 计算所有物品的平均参与合成次数
- **图密度**: 表示合成网络的稠密程度
- **聚类系数**: 表示物品合成关系的聚集程度

## 6. 应用场景

### 6.1 合成路径搜索
- 基于建图算法实现高效的合成路径搜索
- 支持最简路径推荐（深度最小→宽度最小→广度最大）

### 6.2 物品分析
- 识别关键合成节点
- 分析合成网络的瓶颈和优化点

### 6.3 系统优化
- 基于图统计指标优化数据库查询
- 指导新配方的录入和验证

## 7. 扩展功能

### 7.1 可视化展示
- 图结构可视化
- 合成路径树形展示
- 统计指标图表

### 7.2 高级分析
- 社区检测算法
- 关键路径分析
- 网络中心性指标

---

**文档版本**: 1.0  
**最后更新**: 2025-10-19  
**维护者**: Azoth Path 开发团队
