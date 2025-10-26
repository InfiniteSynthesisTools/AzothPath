<template>
  <div class="upload-task-management">
    <el-card>
      <template #header>
        <div class="section-header">
          <h3>📤 配方上传任务</h3>
          <el-button type="primary" @click="loadUploadTasks">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <el-table 
        :data="uploadTasks" 
        v-loading="uploadLoading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="任务ID" width="100" />
        <el-table-column prop="user_id" label="用户ID" width="100" />
        <el-table-column prop="total_count" label="总数" width="80" />
        <el-table-column prop="success_count" label="成功" width="80">
          <template #default="{ row }">
            <el-tag type="success">{{ row.success_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="failed_count" label="失败" width="80">
          <template #default="{ row }">
            <el-tag type="danger">{{ row.failed_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duplicate_count" label="重复" width="80">
          <template #default="{ row }">
            <el-tag type="warning">{{ row.duplicate_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewTaskDetail(row)">
              详情
            </el-button>
            <el-button 
              v-if="row.status === 'failed'"
              size="small" 
              type="warning"
              @click="retryTask(row)"
            >
              重试
            </el-button>
            <el-button 
              size="small" 
              type="danger"
              @click="deleteTask(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="uploadCurrentPage"
          v-model:page-size="uploadPageSize"
          :page-sizes="[10, 20, 50]"
          :total="uploadTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleUploadSizeChange"
          @current-change="handleUploadCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { importApi } from '@/api';
import { formatDateTime } from '@/utils/format';

// 响应式数据
const uploadLoading = ref(false);
const uploadTasks = ref<any[]>([]);
const uploadCurrentPage = ref(1);
const uploadPageSize = ref(20);
const uploadTotal = ref(0);

// 方法
const loadUploadTasks = async () => {
  uploadLoading.value = true;
  try {
    const result = await importApi.getImportTasks({
      page: uploadCurrentPage.value,
      limit: uploadPageSize.value
    });
    // 响应拦截器已经处理了数据结构，直接使用result
    uploadTasks.value = result.tasks || [];
    uploadTotal.value = result.total || 0;
  } catch (error) {
    console.error('加载配方上传任务失败:', error);
    ElMessage.error('加载配方上传任务失败');
  } finally {
    uploadLoading.value = false;
  }
};

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'completed': return 'success';
    case 'processing': return 'primary';
    case 'failed': return 'danger';
    case 'paused': return 'warning';
    default: return 'info';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active': return '活跃';
    case 'completed': return '已完成';
    case 'processing': return '处理中';
    case 'failed': return '失败';
    case 'paused': return '已暂停';
    default: return '未知';
  }
};

const viewTaskDetail = (row: any) => {
  ElMessage.info(`查看任务详情: ID ${row.id}`);
  // TODO: 实现任务详情弹窗
};

const retryTask = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要重试此任务吗？', '确认重试', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    await importApi.retryImportTask(row.id);
    ElMessage.success('重试成功');
    loadUploadTasks();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '重试失败');
    }
  }
};

const deleteTask = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除此任务吗？此操作不可恢复！', '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error',
    });
    
    await importApi.deleteImportTask(row.id);
    ElMessage.success('删除成功');
    loadUploadTasks();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

// 分页处理
const handleUploadSizeChange = (size: number) => {
  uploadPageSize.value = size;
  loadUploadTasks();
};

const handleUploadCurrentChange = (page: number) => {
  uploadCurrentPage.value = page;
  loadUploadTasks();
};

// 生命周期
onMounted(() => {
  loadUploadTasks();
});
</script>

<style scoped>
.upload-task-management {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text-primary);
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 深色模式适配 */
[data-theme="dark"] .upload-task-management {
  background: var(--color-bg-surface);
}

[data-theme="dark"] .el-card {
  background: var(--color-bg-surface);
  border-color: var(--color-border-primary);
}

[data-theme="dark"] .el-card .el-card__body {
  background: var(--color-bg-surface);
}

[data-theme="dark"] :deep(.el-table) {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
}

[data-theme="dark"] :deep(.el-table th) {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

[data-theme="dark"] :deep(.el-table td) {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
}

[data-theme="dark"] :deep(.el-table tr) {
  background: var(--color-bg-surface);
}

[data-theme="dark"] :deep(.el-table tr:hover) {
  background: var(--color-bg-tertiary);
}

[data-theme="dark"] :deep(.el-table--striped .el-table__body tr.el-table__row--striped) {
  background: var(--color-bg-tertiary);
}

[data-theme="dark"] :deep(.el-table--striped .el-table__body tr.el-table__row--striped:hover) {
  background: var(--color-bg-secondary);
}
</style>
