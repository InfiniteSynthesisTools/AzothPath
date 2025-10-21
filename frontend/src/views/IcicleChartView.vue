<template>
  <div class="icicle-chart-view">
    <div class="page-header">
      <h1 class="page-title">合成系统冰柱图</h1>
      <p class="page-description">
        可视化展示所有元素的合成层级关系，基础元素为红色，合成元素根据层级显示不同颜色
      </p>
    </div>
    
    <div class="chart-container">
      <div class="simple-icicle-chart">
        <div class="chart-info">
          <p>冰柱图功能正在开发中...</p>
          <p>该功能将展示所有元素的合成层级关系，基础元素宽度为1，合成元素宽度为子元素宽度之和。</p>
          <el-button type="primary" @click="testApi">测试API</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { recipeApi } from '@/api';

const testApi = async () => {
  try {
    const response = await recipeApi.getIcicleChart();
    ElMessage.success('API测试成功，数据已返回');
    console.log('冰柱图数据:', (response as any).data);
  } catch (error: any) {
    console.error('API测试失败:', error);
    ElMessage.error('API测试失败: ' + (error.response?.data?.message || error.message));
  }
};
</script>

<style scoped>
.icicle-chart-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
  color: white;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.page-description {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.chart-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.simple-icicle-chart {
  text-align: center;
}

.chart-info {
  color: #606266;
  line-height: 1.6;
}

.chart-info p {
  margin-bottom: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .icicle-chart-view {
    padding: 12px;
  }
  
  .page-title {
    font-size: 28px;
  }
  
  .page-description {
    font-size: 14px;
  }
  
  .chart-container {
    padding: 24px;
  }
}
</style>