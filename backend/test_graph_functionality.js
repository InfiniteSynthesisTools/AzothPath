const { recipeService } = require('./dist/services/recipeService');

async function testGraphFunctionality() {
  console.log('🧪 开始测试建图功能...\n');

  try {
    // 1. 测试图统计信息
    console.log('📊 测试图统计信息...');
    const graphStats = await recipeService.getGraphStats();
    console.log('图统计信息:', graphStats);
    console.log('');

    // 2. 测试不可及图分析
    console.log('🔍 测试不可及图分析...');
    const analysisResult = await recipeService.analyzeUnreachableGraphs();
    console.log(`发现 ${analysisResult.unreachableGraphs.length} 个不可及图`);
    
    // 显示系统统计
    console.log('系统统计:');
    console.log(`- 合法物品: ${analysisResult.systemStats.totalValidItems}`);
    console.log(`- 不可及物品: ${analysisResult.systemStats.totalUnreachableItems}`);
    console.log(`- 不可及图数量: ${analysisResult.systemStats.unreachableGraphCount}`);
    console.log(`- 图类型分布:`, analysisResult.systemStats.graphTypes);
    console.log('');

    // 3. 显示前几个不可及图的详细信息
    console.log('📋 不可及图详细信息:');
    analysisResult.unreachableGraphs.slice(0, 5).forEach((graph, index) => {
      console.log(`\n图 ${index + 1}:`);
      console.log(`- ID: ${graph.id}`);
      console.log(`- 类型: ${graph.type}`);
      console.log(`- 节点数: ${graph.nodes.length}`);
      console.log(`- 边数: ${graph.edges.length}`);
      console.log(`- 统计:`, graph.stats);
      console.log(`- 节点示例: ${graph.nodes.slice(0, 3).join(', ')}${graph.nodes.length > 3 ? '...' : ''}`);
    });

    // 4. 测试合成路径搜索
    console.log('\n🔎 测试合成路径搜索...');
    // 选择一个已知的可合成物品进行测试
    const testItems = ['水', '火', '土', '金', '木']; // 基础材料
    for (const item of testItems) {
      try {
        const pathResult = await recipeService.searchPath(item);
        if (pathResult) {
          console.log(`✅ "${item}" 的合成路径存在`);
          console.log(`   - 深度: ${pathResult.stats.depth}`);
          console.log(`   - 宽度: ${pathResult.stats.width}`);
          console.log(`   - 广度: ${pathResult.stats.breadth}`);
          console.log(`   - 总材料数: ${pathResult.stats.total_materials}`);
        } else {
          console.log(`❌ "${item}" 的合成路径不存在`);
        }
      } catch (error) {
        console.log(`⚠️  "${item}" 路径搜索出错: ${error.message}`);
      }
    }

    console.log('\n🎉 建图功能测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 运行测试
testGraphFunctionality().catch(console.error);
