const { recipeService } = require('./dist/services/recipeService.js');

async function testGraphFunctions() {
    console.log('🧪 开始测试建图功能...\n');

    try {
        // 1. 测试基础图统计
        console.log('1. 测试基础图统计...');
        const graphStats = await recipeService.getGraphStats();
        console.log('基础图统计:', JSON.stringify(graphStats, null, 2));
        console.log('');

        // 2. 测试搜索合成路径
        console.log('2. 测试搜索合成路径...');
        // 先获取一些物品来测试
        const recipes = await recipeService.getRecipes({ limit: 5 });
        if (recipes.recipes.length > 0) {
            const testItem = recipes.recipes[0].result;
            console.log(`测试物品: ${testItem}`);
            const pathResult = await recipeService.searchPath(testItem);
            if (pathResult) {
                console.log(`路径搜索成功 - 深度: ${pathResult.stats.depth}, 宽度: ${pathResult.stats.width}, 广度: ${pathResult.stats.breadth}`);
                console.log(`材料统计:`, pathResult.stats.materials);
            } else {
                console.log('无法找到合成路径');
            }
        } else {
            console.log('没有配方数据，跳过路径搜索测试');
        }
        console.log('');

        // 3. 测试不可及图分析
        console.log('3. 测试不可及图分析...');
        const unreachableAnalysis = await recipeService.analyzeUnreachableGraphs();
        console.log(`不可及图数量: ${unreachableAnalysis.unreachableGraphs.length}`);
        console.log(`系统统计:`, JSON.stringify(unreachableAnalysis.systemStats, null, 2));
        
        // 显示不可及图详情
        if (unreachableAnalysis.unreachableGraphs.length > 0) {
            console.log('\n不可及图详情:');
            unreachableAnalysis.unreachableGraphs.forEach((graph, index) => {
                console.log(`图 ${index + 1}:`);
                console.log(`  - 类型: ${graph.type}`);
                console.log(`  - 节点数: ${graph.nodes.length}`);
                console.log(`  - 边数: ${graph.edges.length}`);
                console.log(`  - 统计: 深度=${graph.stats.depth}, 宽度=${graph.stats.width}, 广度=${graph.stats.breadth}`);
                console.log(`  - 节点: ${graph.nodes.join(', ')}`);
                if (graph.edges.length > 0) {
                    console.log(`  - 边: ${graph.edges.map(e => `${e.source}->${e.target}`).join(', ')}`);
                }
                console.log('');
            });
        } else {
            console.log('没有检测到不可及图');
        }

        console.log('✅ 所有测试完成！');

    } catch (error) {
        console.error('❌ 测试失败:', error);
        console.error('错误堆栈:', error.stack);
    }
}

// 运行测试
testGraphFunctions().catch(console.error);
