const { recipeService } = require('./dist/services/recipeService');

async function testDirectedGraphStats() {
  console.log('🧪 测试有向图统计功能...\n');

  try {
    // 测试不可及图分析
    console.log('🔍 分析不可及图...');
    const analysisResult = await recipeService.analyzeUnreachableGraphs();
    
    console.log(`📊 系统统计:`);
    console.log(`- 总物品数: ${analysisResult.systemStats.totalValidItems + analysisResult.systemStats.totalUnreachableItems}`);
    console.log(`- 合法物品: ${analysisResult.systemStats.totalValidItems}`);
    console.log(`- 不可及物品: ${analysisResult.systemStats.totalUnreachableItems}`);
    console.log(`- 不可及图数量: ${analysisResult.systemStats.unreachableGraphCount}`);
    console.log(`- 图类型分布:`, analysisResult.systemStats.graphTypes);
    console.log('');

    // 分析有向图统计指标
    console.log('📈 有向图统计指标分析:');
    
    const graphsWithEdges = analysisResult.unreachableGraphs.filter(graph => graph.edges.length > 0);
    
    if (graphsWithEdges.length > 0) {
      console.log(`发现 ${graphsWithEdges.length} 个有边的图（非孤立图）`);
      
      graphsWithEdges.slice(0, 3).forEach((graph, index) => {
        console.log(`\n图 ${index + 1} (${graph.type}):`);
        console.log(`- 节点数: ${graph.stats.size}`);
        console.log(`- 边数: ${graph.edges.length}`);
        console.log(`- 总入度: ${graph.stats.inDegree}`);
        console.log(`- 总出度: ${graph.stats.outDegree}`);
        console.log(`- 平均度数: ${graph.stats.avgDegree.toFixed(2)}`);
        console.log(`- 图密度: ${graph.stats.density.toFixed(4)}`);
        console.log(`- 聚类系数: ${graph.stats.clustering.toFixed(4)}`);
        console.log(`- 边界节点数: ${graph.stats.boundaryNodes}`);
        
        // 显示边的关系
        console.log(`- 边示例: ${graph.edges.slice(0, 3).map(e => `${e.source}→${e.target}`).join(', ')}${graph.edges.length > 3 ? '...' : ''}`);
      });
    } else {
      console.log('⚠️ 没有发现包含边的图，所有不可及图都是孤立节点');
      
      // 显示孤立图的统计
      const isolatedGraphs = analysisResult.unreachableGraphs.filter(graph => graph.type === 'isolated');
      console.log(`\n孤立图统计 (${isolatedGraphs.length} 个):`);
      console.log(`- 所有孤立图的入度、出度、度数均为 0`);
      console.log(`- 所有孤立图的图密度、聚类系数均为 0`);
      console.log(`- 所有孤立图的边界节点数均为 0`);
    }

    // 测试合法图的统计
    console.log('\n🌳 合法图统计:');
    console.log(`- 最大深度: ${analysisResult.systemStats.validGraphStats.maxDepth}`);
    console.log(`- 平均深度: ${analysisResult.systemStats.validGraphStats.avgDepth.toFixed(2)}`);
    console.log(`- 最大宽度: ${analysisResult.systemStats.validGraphStats.maxWidth}`);
    console.log(`- 平均宽度: ${analysisResult.systemStats.validGraphStats.avgWidth.toFixed(2)}`);
    console.log(`- 最大广度: ${analysisResult.systemStats.validGraphStats.maxBreadth}`);
    console.log(`- 平均广度: ${analysisResult.systemStats.validGraphStats.avgBreadth.toFixed(2)}`);

    // 验证基础材料的广度计算
    console.log('\n💧 基础材料广度验证:');
    const baseItems = ['水', '火', '土', '金', '木'];
    for (const item of baseItems) {
      const pathResult = await recipeService.searchPath(item);
      if (pathResult) {
        console.log(`- "${item}": 广度 = ${pathResult.stats.breadth}`);
      }
    }

    console.log('\n✅ 有向图统计功能测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 运行测试
testDirectedGraphStats().catch(console.error);
