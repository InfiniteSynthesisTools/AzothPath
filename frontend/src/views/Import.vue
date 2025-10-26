<template>
  <div class="import-page">
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">
          <span class="title-emoji">📥</span>
          导入配方
        </h1>
        <p class="page-subtitle">批量导入配方，支持文本格式：A+B=C</p>
      </div>

      <el-card class="import-card">
        <el-form label-width="120px">
          <el-form-item label="导入方式">
            <el-radio-group v-model="importMethod">
              <el-radio label="text">
                <span style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 18px;">📝</span>
                  <span>文本导入</span>
                </span>
              </el-radio>
              <el-radio label="file">
                <span style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 18px;">📁</span>
                  <span>文件导入</span>
                </span>
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="配方内容" v-if="importMethod === 'text'">
            <el-input
              v-model="recipeText"
              type="textarea"
              :rows="10"
              placeholder="每行一条配方，格式：金+木=合金"
              :style="{
                '--el-input-border-radius': 'var(--radius-lg)',
                '--el-input-bg-color': 'var(--glass-bg)',
                '--el-input-border-color': 'var(--glass-border)'
              }"
            />
          </el-form-item>

          <el-form-item v-if="importMethod === 'file'">
            <el-upload
              drag
              action="#"
              accept=".txt"
              :auto-upload="false"
              :on-change="handleFileChange"
              class="glass-upload"
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
            <el-button 
              type="primary" 
              @click="handleImport" 
              :loading="importing"
              class="green-gradient-btn"
              style="padding: 12px 32px; font-size: 16px; font-weight: 600;"
            >
              {{ importing ? '导入中...' : '🚀 开始导入' }}
            </el-button>
            <el-button 
              @click="handleReset"
              style="padding: 12px 24px; font-size: 14px;"
            >
              重置
            </el-button>
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
    ElMessage.success(`✅ 导入完成！成功导入 ${result.totalCount} 条配方`);
    handleReset();
    
    // 跳转到首页查看结果
    router.push('/');
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
  background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-gray-50) 100%);
}

.page-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-primary-700);
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-header p {
  font-size: 18px;
  color: var(--color-gray-600);
  margin: 0;
  line-height: 1.6;
}

.import-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
}

.import-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: rgba(34, 197, 94, 0.3);
}

/* 上传组件样式 */
.glass-upload :deep(.el-upload-dragger) {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 2px dashed rgba(34, 197, 94, 0.3);
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
}

.glass-upload :deep(.el-upload-dragger:hover) {
  border-color: var(--color-primary-400);
  background: rgba(34, 197, 94, 0.05);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.glass-upload :deep(.el-icon--upload) {
  color: var(--color-primary-500);
  font-size: 48px;
  margin-bottom: 16px;
}

.glass-upload :deep(.el-upload__text) {
  color: var(--color-gray-700);
  font-size: 16px;
}

.glass-upload :deep(.el-upload__text em) {
  color: var(--color-primary-500);
  font-style: normal;
  font-weight: 600;
}

.glass-upload :deep(.el-upload__tip) {
  color: var(--color-gray-500);
  font-size: 14px;
  margin-top: 12px;
}

/* 表单样式优化 */
:deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--color-primary-700);
}

:deep(.el-radio) {
  margin-right: 24px;
}

:deep(.el-radio__label) {
  font-weight: 500;
}

:deep(.el-divider) {
  border-color: rgba(34, 197, 94, 0.1);
}

:deep(.el-alert) {
  border-radius: var(--radius-lg);
  background: rgba(34, 197, 94, 0.05);
  border: 1px solid rgba(34, 197, 94, 0.1);
}

:deep(.el-alert__title) {
  color: var(--color-primary-700);
  font-weight: 600;
}
</style>
