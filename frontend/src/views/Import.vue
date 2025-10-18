<template>
  <div class="import-page">
    <div class="page-container">
      <div class="page-header">
        <h1>📥 导入配方</h1>
        <p>批量导入配方，支持文本格式：A+B=C</p>
      </div>

      <el-card class="import-card">
        <el-form label-width="100px">
          <el-form-item label="导入方式">
            <el-radio-group v-model="importMethod">
              <el-radio label="text">文本导入</el-radio>
              <el-radio label="file">文件导入</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="配方内容" v-if="importMethod === 'text'">
            <el-input
              v-model="recipeText"
              type="textarea"
              :rows="10"
              placeholder="每行一条配方，格式：金+木=合金"
            />
          </el-form-item>

          <el-form-item v-if="importMethod === 'file'">
            <el-upload
              drag
              action="#"
              accept=".txt"
              :auto-upload="false"
              :on-change="handleFileChange"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                拖拽文件到此处或 <em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  仅支持 .txt 文件，每行一条配方
                </div>
              </template>
            </el-upload>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleImport" :loading="importing">
              开始导入
            </el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>

        <el-divider>导入说明</el-divider>
        <el-alert
          title="配方格式说明"
          type="info"
          :closable="false"
        >
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>每行一条配方，格式：材料A+材料B=结果</li>
            <li>示例：金+木=合金</li>
            <li>材料和结果之间用加号(+)和等号(=)连接</li>
            <li>系统会自动验证配方有效性</li>
          </ul>
        </el-alert>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { importApi } from '@/api/import';

const router = useRouter();

const importMethod = ref('text');
const recipeText = ref('');
const importing = ref(false);

const handleFileChange = (file: any) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    recipeText.value = e.target?.result as string;
  };
  reader.readAsText(file.raw);
};

const handleImport = async () => {
  if (!recipeText.value.trim()) {
    ElMessage.warning('请输入配方内容');
    return;
  }

  if (importing.value) {
    ElMessage.warning('正在处理中，请稍候...');
    return;
  }

  importing.value = true;
  try {
    const result = await importApi.batchImport({ text: recipeText.value });
    ElMessage.success(`✅ 导入完成！成功导入 ${result.data.totalCount} 条配方`);
    handleReset();
    
    // 跳转到配方列表页面查看结果
    router.push('/recipes');
  } catch (error: any) {
    ElMessage.error(error.message || '导入失败');
  } finally {
    importing.value = false;
  }
};

const handleReset = () => {
  recipeText.value = '';
};
</script>

<style scoped>
.import-page {
  min-height: calc(100vh - 200px);
  background-color: #f5f7fa;
}

.page-container {
  max-width: 1000px;
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

.import-card {
  background: white;
}
</style>
