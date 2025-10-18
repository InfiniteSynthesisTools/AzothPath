<template>
  <div class="about-page">
    <div class="page-container">
      <el-card>
        <h1>关于 Azoth Path</h1>
        <p>Azoth Path（无尽合成工具站）是一个社区驱动的合成配方数据库，致力于帮助玩家发现和分享配方。</p>
        <h2>联系我们</h2>
        <p>GitHub: <a href="https://github.com/InfiniteSynthesisTools/AzothPath" target="_blank">AzothPath</a></p>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.about-page {
  min-height: calc(100vh - 200px);
  background-color: #f5f7fa;
  padding: 30px 20px;
}

.page-container {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #303133;
  margin-bottom: 20px;
}

h2 {
  color: #606266;
  margin-top: 30px;
  margin-bottom: 15px;
}

p {
  color: #606266;
  line-height: 1.8;
  margin-bottom: 10px;
}

a {
  color: #409eff;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
