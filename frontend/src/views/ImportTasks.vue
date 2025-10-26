<template>
  <div class="import-tasks-page">
    <div class="page-container">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">
            <span class="title-emoji">📥</span>
            导入任务
          </h1>
          <p class="page-subtitle">查看和管理您的批量导入任务</p>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="$router.push('/import')">
            ➕ 新建导入
          </el-button>
          <el-button @click="loadImportTasks">
            🔄 刷新
          </el-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total">📊</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.total }}</div>
                <div class="stat-label">总任务数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon processing">🔄</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.processing }}</div>
                <div class="stat-label">处理中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon completed">✅</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.completed }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon failed">❌</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.failed }}</div>
                <div class="stat-label">失败</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 筛选器 -->
      <el-card class="filter-card">
        <el-form :inline="true" :model="filters">
          <el-form-item label="任务状态">
            <el-select v-model="filters.status" placeholder="全部" clearable @change="loadImportTasks">
              <el-option label="全部" value="" />
              <el-option label="处理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="失败" value="failed" />
            </el-select>
          </el-form-item>
          <el-form-item label="排序方式">
            <el-select v-model="filters.sortBy" @change="loadImportTasks">
              <el-option label="创建时间" value="created_at" />
              <el-option label="配方数量" value="total_count" />
            </el-select>
          </el-form-item>
          <el-form-item label="排序顺序">
            <el-select v-model="filters.sortOrder" @change="loadImportTasks">
              <el-option label="降序" value="desc" />
              <el-option label="升序" value="asc" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 导入任务列表 -->
      <div class="task-list" v-loading="loading">
        <el-empty v-if="importTasks.length === 0" description="暂无导入任务" />
        <el-row :gutter="20" v-else>
          <el-col 
            :span="8" 
            v-for="task in importTasks" 
            :key="task.id"
            class="task-col"
          >
            <ImportTaskCard 
              :task="task" 
              @detail="handleViewDetail"
              @delete="handleDeleteTask"
            />
          </el-col>
        </el-row>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.limit"
          :total="total"
          :page-sizes="[20, 40, 60]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadImportTasks"
          @size-change="loadImportTasks"
        />
      </div>

      <!-- 任务详情对话框 -->
      <el-dialog
        v-model="showDetailDialog"
        title="导入任务详情"
        width="800px"
      >
        <div v-if="selectedTask" class="task-detail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="任务 ID">
              {{ selectedTask.id }}
            </el-descriptions-item>
            <el-descriptions-item label="任务状态">
              <el-tag :type="getStatusType(selectedTask.status)">
                {{ getStatusText(selectedTask.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="总配方数">
              {{ selectedTask.total_count }}
            </el-descriptions-item>
            <el-descriptions-item label="成功数">
              <el-tag type="success">{{ selectedTask.success_count }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="失败数">
              <el-tag type="danger">{{ selectedTask.failed_count }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="重复数">
              <el-tag type="warning">{{ selectedTask.duplicate_count }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDateTime(selectedTask.created_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{ formatDateTime(selectedTask.updated_at) }}
            </el-descriptions-item>
          </el-descriptions>

          <!-- 错误详情 -->
          <el-alert
            v-if="selectedTask.error_details"
            :title="`错误详情: ${selectedTask.error_details}`"
            type="error"
            :closable="false"
            style="margin-top: 20px;"
          />

          <!-- 任务明细 -->
          <el-divider content-position="left">任务明细</el-divider>
          <el-table
            :data="taskContents"
            v-loading="contentsLoading"
            style="width: 100%"
          >
            <el-table-column prop="item_a" label="材料A" width="120" />
            <el-table-column prop="item_b" label="材料B" width="120" />
            <el-table-column prop="result" label="结果" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getContentStatusType(row.status)" size="small">
                  {{ getContentStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="error_message" label="错误信息" min-width="200" show-overflow-tooltip />
          </el-table>
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useImportStore } from '@/stores/import';
import type { ImportTask, ImportTaskContent } from '@/types';
import ImportTaskCard from '@/components/ImportTaskCard.vue';
import { formatDateTime } from '@/utils/format';

const importStore = useImportStore();

// 统计数据
const stats = ref({
  total: 0,
  processing: 0,
  completed: 0,
  failed: 0
});

// 导入任务列表
const importTasks = ref<ImportTask[]>([]);
const total = ref(0);
const loading = ref(false);

// 筛选器
const filters = ref({
  page: 1,
  limit: 20,
  status: '' as '' | 'processing' | 'completed' | 'failed',
  sortBy: 'created_at' as 'created_at' | 'total_count',
  sortOrder: 'desc' as 'asc' | 'desc'
});

// 任务详情
const showDetailDialog = ref(false);
const selectedTask = ref<ImportTask | null>(null);
const taskContents = ref<ImportTaskContent[]>([]);
const contentsLoading = ref(false);

// 加载统计数据
const loadStats = async () => {
  try {
    // 从任务列表中计算统计
    const tasks = importTasks.value;
    stats.value = {
      total: tasks.length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };
  } catch (error: any) {
    console.error('Load stats error:', error);
  }
};

// 加载导入任务列表
const loadImportTasks = async () => {
  loading.value = true;
  try {
    const params = {
      page: filters.value.page,
      limit: filters.value.limit,
      status: filters.value.status || undefined
    };
    
    const result = await importStore.fetchImportTasks(params);
    importTasks.value = result.tasks;
    total.value = result.total;
    
    // 更新统计
    await loadStats();
  } catch (error: any) {
    ElMessage.error(error.message || '加载导入任务列表失败');
  } finally {
    loading.value = false;
  }
};

// 查看任务详情
const handleViewDetail = async (task: ImportTask) => {
  try {
    selectedTask.value = task;
    contentsLoading.value = true;
    
    // 获取任务明细
    const contents = await importStore.fetchTaskContents(task.id, 1, 50);
    taskContents.value = contents.contents;
    
    showDetailDialog.value = true;
  } catch (error: any) {
    ElMessage.error(error.message || '获取任务详情失败');
  } finally {
    contentsLoading.value = false;
  }
};

// 删除任务
const handleDeleteTask = async (task: ImportTask) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除导入任务 #${task.id} 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await importStore.deleteImportTask(task.id);
    ElMessage.success('导入任务删除成功');
    await loadImportTasks();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除导入任务失败');
    }
  }
};

// 获取状态类型
const getStatusType = (status: string) => {
  switch (status) {
    case 'processing': return 'warning';
    case 'completed': return 'success';
    case 'failed': return 'danger';
    default: return 'info';
  }
};

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'processing': return '🔄 处理中';
    case 'completed': return '✅ 已完成';
    case 'failed': return '❌ 失败';
    default: return status;
  }
};

// 获取明细状态类型
const getContentStatusType = (status: string) => {
  switch (status) {
    case 'success': return 'success';
    case 'failed': return 'danger';
    case 'duplicate': return 'warning';
    case 'processing': return 'warning';
    default: return 'info';
  }
};

// 获取明细状态文本
const getContentStatusText = (status: string) => {
  switch (status) {
    case 'success': return '成功';
    case 'failed': return '失败';
    case 'duplicate': return '重复';
    case 'processing': return '处理中';
    case 'pending': return '待处理';
    default: return status;
  }
};

// 使用统一的时间工具函数，已在上方导入

onMounted(() => {
  loadImportTasks();
});
</script>

<style scoped>
.import-tasks-page {
  min-height: calc(100vh - 200px);
  background-color: #f5f7fa;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-left h1 {
  font-size: 32px;
  color: #303133;
  margin: 0 0 10px 0;
}

.header-left p {
  font-size: 16px;
  color: #909399;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 10px;
}

/* 统计卡片 */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-icon.total {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stat-icon.processing {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.completed {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.failed {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 筛选器 */
.filter-card {
  margin-bottom: 20px;
}

/* 任务列表 */
.task-list {
  min-height: 400px;
}

.task-col {
  margin-bottom: 20px;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

/* 任务详情 */
.task-detail {
  padding: 20px 0;
}
</style>
