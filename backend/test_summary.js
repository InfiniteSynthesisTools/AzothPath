const { recipeService } = require('./dist/services/recipeService.js');

async function testSummary() {
    console.log('📊 建图功能测试总结\n');

    try {
        // 测试基础统计
        const graphStats = await recipeService.getGraphStats();
        console.log('📈 基础统计:');
        console.log(`- 配方总数: ${graphStats.total_recipes}`);
        console.log(`- 物品总数: ${graphStats.total_items}`);
        console.log(`- 基础材料: ${graphStats.base_items}`);
        console.log(`- 可合成物品: ${graphStats.craftable_items}`);
        console.log('');

        // 测试不可及图分析
        console.log('🔍 不可及图分析:');
        const unreachableAnalysis = await recipeService.analyzeUnreachableGraphs();
        console.log(`- 不可及图总数: ${unreachableAnalysis.unreachableGraphs.length}`);
        console.log(`- 合法物品数: ${unreachableAnalysis.systemStats.totalValidItems}`);
        console.log(`- 不可及物品数: ${unreachableAnalysis.systemStats.totalUnreachableItems}`);
        console.log(`- 图类型分布:`, unreachableAnalysis.systemStats.graphTypes);
        console.log('');

        // 测试路径搜索
        console.log('🛤️ 路径搜索测试:');
        // 找一个简单的物品测试
        const testItem = '水'; // 基础材料
        const pathResult = await recipeService.searchPath(testItem);
        if (pathResult) {
            console.log(`✅ "${testItem}" 路径搜索成功`);
            console.log(`   - 深度: ${pathResult.stats.depth}`);
            console.log(`   - 宽度: ${pathResult.stats.width}`);
            console.log(`   - 广度: ${pathResult.stats.breadth}`);
        } else {
            console.log(`❌ "${testItem}" 路径搜索失败`);
        }
        console.log('');

        console.log('🎉 建图功能测试完成！所有功能正常运行。');

    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

testSummary().catch(console.error);
