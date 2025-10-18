<template>
  <div class="task-board-page">
    <div class="page-container">
      <div class="page-header">
        <h1>🎯 任务大厅</h1>
        <p>悬赏寻求合成路径的物品</p>
      </div>

      <el-card class="task-card">
        <el-empty description="任务功能开发中，敬请期待..." />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
// TODO: 实现任务列表展示
</script>

<style scoped>
.task-board-page {
  min-height: calc(100vh - 200px);
  background-color: #f5f7fa;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 32px;
  color: #303133;
  margin: 0 0 10px 0;
}

.page-header p {
  font-size: 16px;
  color: #909399;
  margin: 0;
}

.task-card {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
