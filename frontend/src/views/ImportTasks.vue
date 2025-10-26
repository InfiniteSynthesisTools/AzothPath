<template>
  <div class="import-tasks-page">
    <div class="page-container">
      <!-- 页面头部 -->
      <div class="page-header">
        <h1 class="page-title">
          <span class="title-emoji">📥</span>
          导入任务
        </h1>
        <p class="page-subtitle">查看和管理您的批量导入任务</p>
        <div class="header-actions">
          <el-button type="primary" @click="$router.push('/import')" class="action-btn primary-btn">
            <el-icon><Plus /></el-icon>
            <span class="btn-text">新建导入</span>
          </el-button>
          <el-button @click="loadImportTasks" class="action-btn secondary-btn">
            <el-icon><Refresh /></el-icon>
            <span class="btn-text">刷新</span>
          </el-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
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
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
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
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
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
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
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


      <!-- 导入任务列表 -->
      <div class="task-list" v-loading="loading">
        <el-empty v-if="importTasks.length === 0" description="暂无导入任务" />
        <el-row :gutter="20" v-else>
          <el-col 
            :xs="24" 
            :sm="12" 
            :md="8" 
            :lg="8" 
            :xl="8"
            v-for="task in importTasks" 
            :key="task.id"
            class="task-col"
          >
            <ImportTaskCard 
              :task="task" 
              @detail="handleViewDetail"
              @delete="handleDeleteTask"
              @fix-status="handleFixStatus"
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
        :title="`任务详情 #${selectedTask?.id || ''}`"
        :width="isMobile ? '95%' : '1000px'"
        :fullscreen="isMobile"
        :close-on-click-modal="false"
        :close-on-press-escape="true"
        class="task-detail-dialog"
        :show-close="true"
        :center="false"
        :modal="true"
        :append-to-body="true"
      >
        <div v-if="selectedTask" class="task-detail">
          <!-- 任务概览 -->
          <div class="task-overview">
            <!-- 头部信息 -->
            <div class="overview-header">
              <div class="header-info">
                <h3 class="overview-title">任务概览 #{{ selectedTask.id }}</h3>
                <el-tag :type="getStatusType(selectedTask.status)" size="default" class="status-tag">
                  <el-icon class="status-icon">
                    <Check v-if="selectedTask.status === 'completed'" />
                    <Loading v-else-if="selectedTask.status === 'processing'" />
                    <Close v-else-if="selectedTask.status === 'failed'" />
                  </el-icon>
                  {{ getStatusText(selectedTask.status) }}
                </el-tag>
              </div>
              <div class="progress-section" v-if="selectedTask.status === 'processing'">
                <div class="progress-text">
                  进度: {{ Math.round(((selectedTask.success_count + selectedTask.failed_count + selectedTask.duplicate_count) / selectedTask.total_count) * 100) }}%
                </div>
                <el-progress 
                  :percentage="Math.round(((selectedTask.success_count + selectedTask.failed_count + selectedTask.duplicate_count) / selectedTask.total_count) * 100)"
                  :stroke-width="6"
                  :show-text="false"
                  color="#409eff"
                />
              </div>
            </div>
            
            <!-- 统计信息 -->
            <div class="stats-container">
              <div class="stat-card">
                <div class="stat-number">{{ selectedTask.total_count }}</div>
                <div class="stat-label">总配方数</div>
              </div>
              <div class="stat-card success">
                <div class="stat-number">{{ selectedTask.success_count }}</div>
                <div class="stat-label">成功</div>
              </div>
              <div class="stat-card failed">
                <div class="stat-number">{{ selectedTask.failed_count }}</div>
                <div class="stat-label">失败</div>
              </div>
              <div class="stat-card duplicate">
                <div class="stat-number">{{ selectedTask.duplicate_count }}</div>
                <div class="stat-label">重复</div>
              </div>
            </div>
          </div>

          <!-- 任务信息 -->
          <div class="task-info">
            <div class="info-header">
              <h3 class="info-title">
                <el-icon><InfoFilled /></el-icon>
                任务信息
              </h3>
            </div>
            <div class="info-content">
              <div class="info-row">
                <span class="info-label">创建时间</span>
                <span class="info-value">{{ formatDateTime(selectedTask.created_at) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">更新时间</span>
                <span class="info-value">{{ formatDateTime(selectedTask.updated_at) }}</span>
              </div>
              <div class="info-row" v-if="selectedTask.error_details">
                <span class="info-label">错误信息</span>
                <span class="info-value error">{{ selectedTask.error_details }}</span>
              </div>
            </div>
          </div>

          <!-- 配方明细 -->
          <div class="task-contents">
            <div class="contents-header">
              <h3 class="contents-title">
                <el-icon><List /></el-icon>
                配方明细
              </h3>
              <el-tag size="small" type="info" class="count-tag">
                共 {{ taskContents.length }} 条
              </el-tag>
            </div>
            <div class="table-wrapper">
              <el-table
                :data="taskContents"
                v-loading="contentsLoading"
                style="width: 100%"
                :header-cell-style="{ 
                  background: '#fafbfc', 
                  color: '#606266', 
                  fontWeight: '600',
                  borderBottom: '2px solid #e4e7ed'
                }"
                :row-style="{ height: '56px' }"
                empty-text="暂无配方明细"
                stripe
                :border="false"
              >
                <el-table-column prop="item_a" label="材料A" width="160">
                  <template #default="{ row }">
                    <div class="item-name">{{ row.item_a }}</div>
                  </template>
                </el-table-column>
                <el-table-column prop="item_b" label="材料B" width="160">
                  <template #default="{ row }">
                    <div class="item-name">{{ row.item_b }}</div>
                  </template>
                </el-table-column>
                <el-table-column prop="result" label="结果" width="160">
                  <template #default="{ row }">
                    <div class="item-name result">{{ row.result }}</div>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag :type="getContentStatusType(row.status)" size="small" effect="light">
                      {{ getContentStatusText(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="error_message" label="错误信息" min-width="200">
                  <template #default="{ row }">
                    <span v-if="row.error_message" class="error-message">{{ row.error_message }}</span>
                    <span v-else class="no-error">-</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, Check, Loading, Close, InfoFilled, List } from '@element-plus/icons-vue';
import { useImportStore } from '@/stores/import';
import type { ImportTask, ImportTaskContent } from '@/types';
import ImportTaskCard from '@/components/ImportTaskCard.vue';
import { formatDateTime } from '@/utils/format';

const importStore = useImportStore();

// 移动端检测
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

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
  limit: 20
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
      limit: filters.value.limit
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

// 修复任务状态
const handleFixStatus = async (task: ImportTask) => {
  try {
    await ElMessageBox.confirm(
      `确定要修复导入任务 #${task.id} 的状态吗？\n\n当前状态：${task.status}\n总配方数：${task.total_count}\n成功：${task.success_count}，失败：${task.failed_count}，重复：${task.duplicate_count}`,
      '修复状态确认',
      {
        confirmButtonText: '确定修复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 调用修复状态API
    const response = await fetch(`/api/import-tasks/${task.id}/fix-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const result = await response.json();
    
    if (result.code === 200) {
      ElMessage.success(`任务状态已修复：${result.data.status}`);
      await loadImportTasks();
    } else {
      ElMessage.error(result.message || '修复任务状态失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '修复任务状态失败');
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
  checkMobile();
  window.addEventListener('resize', checkMobile);
  loadImportTasks();
});
</script>

<style scoped>
.import-tasks-page {
  min-height: calc(100vh - 200px);
  background: linear-gradient(135deg, #f5f7fa 0%, #f0f2f5 100%);
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

.page-header {
  margin-bottom: 24px;
  text-align: center;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.title-emoji {
  font-size: 36px;
  margin-right: 12px;
  display: inline-block;
  -webkit-text-fill-color: initial !important;
  background: none !important;
  background-clip: initial !important;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 120px;
  justify-content: center;
}

.primary-btn {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
  border: none;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.primary-btn:hover {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.secondary-btn {
  background: white;
  border: 1px solid var(--color-border-primary);
  color: var(--color-text-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.secondary-btn:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-primary-300);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-text {
  font-size: 14px;
}

/* 统计卡片 */
.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.stat-card:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.95);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon.total {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
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


/* 任务列表 */
.task-list {
  min-height: 400px;
  padding: 0 4px;
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

/* 弹窗样式优化 */
:deep(.task-detail-dialog) {
  .el-dialog {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }
  
  .el-dialog__header {
    background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
    color: white;
    padding: 24px 32px;
    margin: 0;
  }
  
  .el-dialog__title {
    color: white;
    font-weight: 700;
    font-size: 20px;
  }
  
  .el-dialog__headerbtn .el-dialog__close {
    color: white;
    font-size: 22px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }
  
  .el-dialog__headerbtn .el-dialog__close:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  .el-dialog__body {
    padding: 0;
    background: #f8f9fa;
  }
}

/* 任务详情内容样式 */
.task-detail {
  padding: 32px;
  max-height: 70vh;
  overflow-y: auto;
}

.task-detail::-webkit-scrollbar {
  display: none;
}

.task-detail {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 任务概览 */
.task-overview {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e4e7ed;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 20px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.overview-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.status-tag {
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 6px;
}

.status-icon {
  margin-right: 6px;
  font-size: 14px;
}

.progress-section {
  min-width: 200px;
}

.progress-text {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

/* 统计容器 */
.stats-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px 16px;
  text-align: center;
  border: 1px solid #e4e7ed;
  transition: all 0.2s ease;
}

.stat-card:hover {
  background: #f0f2f5;
  border-color: #d0d7de;
}

.stat-card.success {
  background: #f0f9ff;
  border-color: #bae6fd;
}

.stat-card.success:hover {
  background: #e0f2fe;
}

.stat-card.failed {
  background: #fef2f2;
  border-color: #fecaca;
}

.stat-card.failed:hover {
  background: #fee2e2;
}

.stat-card.duplicate {
  background: #fffbeb;
  border-color: #fed7aa;
}

.stat-card.duplicate:hover {
  background: #fef3c7;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

/* 任务信息 */
.task-info {
  background: white;
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.info-header {
  margin-bottom: 24px;
}

.info-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f2f5;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.info-label {
  font-size: 14px;
  color: #909399;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
  font-family: 'Monaco', 'Consolas', monospace;
}

.info-value.error {
  color: #f56c6c;
  background: #fef0f0;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
}

/* 配方明细 */
.task-contents {
  background: white;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.contents-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.contents-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.count-tag {
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.table-wrapper {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 表格单元格样式 */
.item-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  word-break: break-all;
  line-height: 1.4;
  padding: 4px 0;
}

.item-name.result {
  color: #67c23a;
  font-weight: 600;
}

.error-message {
  color: #f56c6c;
  font-size: 12px;
  background: #fef0f0;
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
  line-height: 1.4;
}

.no-error {
  color: #c0c4cc;
  font-style: italic;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .task-detail {
    padding: 20px;
    max-height: 80vh;
  }
  
  .task-detail::-webkit-scrollbar {
    display: none;
  }
  
  .task-detail {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .task-overview,
  .task-info,
  .task-contents {
    padding: 20px;
    margin-bottom: 20px;
  }
  
  .task-overview {
    padding: 20px;
  }
  
  .overview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-info {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .progress-section {
    width: 100%;
    min-width: auto;
  }
  
  .stats-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .stat-card {
    padding: 16px 12px;
  }
  
  .stat-number {
    font-size: 20px;
  }
  
  .stat-label {
    font-size: 11px;
  }
  
  .overview-title {
    font-size: 16px;
  }
  
  .status-tag {
    font-size: 13px;
    padding: 5px 10px;
  }
  
  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 16px;
  }
  
  .contents-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .contents-title {
    font-size: 16px;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-container {
    padding: 20px 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .page-subtitle {
    font-size: 14px;
    margin-bottom: 16px;
  }
  
  .page-header {
    margin-bottom: 20px;
  }
  
  .header-actions {
    flex-direction: row;
    gap: 10px;
    justify-content: center;
  }
  
  .action-btn {
    flex: 1;
    min-width: 100px;
    max-width: 140px;
    padding: 10px 16px;
  }
  
  .btn-text {
    font-size: 13px;
  }
  
  /* 统计卡片移动端优化 */
  .stats-row {
    margin-bottom: 16px;
  }
  
  .stat-card {
    margin-bottom: 12px;
  }
  
  .stat-content {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .stat-icon {
    width: 50px;
    height: 50px;
    font-size: 24px;
    margin: 0 auto;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  /* 任务列表移动端优化 */
  .task-list {
    min-height: 300px;
  }
  
  .task-col {
    margin-bottom: 16px;
  }
  
  /* 分页移动端优化 */
  .pagination-wrapper {
    margin-top: 20px;
  }
  
  .pagination-wrapper :deep(.el-pagination) {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }
  
  .pagination-wrapper :deep(.el-pagination__total) {
    font-size: 12px;
    margin-right: 8px;
    margin-bottom: 8px;
  }
  
  .pagination-wrapper :deep(.el-pagination__sizes) {
    margin-right: 8px;
    margin-bottom: 8px;
  }
  
  .pagination-wrapper :deep(.el-pagination__sizes .el-select) {
    width: 70px;
  }
  
  .pagination-wrapper :deep(.el-pagination__sizes .el-input__inner) {
    font-size: 11px;
    padding: 3px 6px;
    height: 26px;
  }
  
  .pagination-wrapper :deep(.el-pagination__prev),
  .pagination-wrapper :deep(.el-pagination__next) {
    width: 32px;
    height: 32px;
    font-size: 14px;
    margin: 0 4px;
  }
  
  .pagination-wrapper :deep(.el-pagination__jump) {
    margin-left: 8px;
    margin-top: 0;
    font-size: 12px;
  }
  
  .pagination-wrapper :deep(.el-pagination__jump .el-input) {
    width: 45px;
  }
  
  .pagination-wrapper :deep(.el-pagination__jump .el-input__inner) {
    font-size: 11px;
    padding: 3px 5px;
    height: 26px;
  }
}

@media (max-width: 480px) {
  .page-container {
    padding: 16px 12px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .page-subtitle {
    font-size: 13px;
    margin-bottom: 12px;
  }
  
  .page-header {
    margin-bottom: 16px;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .action-btn {
    width: 100%;
    max-width: 200px;
    padding: 12px 20px;
  }
  
  .btn-text {
    font-size: 14px;
  }
  
  /* 统计卡片小屏幕优化 */
  .stats-row {
    margin-bottom: 12px;
  }
  
  .stat-card {
    margin-bottom: 8px;
  }
  
  .stat-content {
    gap: 8px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  
  .stat-value {
    font-size: 20px;
  }
  
  .stat-label {
    font-size: 11px;
  }
  
  /* 任务列表小屏幕优化 */
  .task-list {
    min-height: 250px;
  }
  
  .task-col {
    margin-bottom: 12px;
  }
  
  /* 分页小屏幕优化 */
  .pagination-wrapper {
    margin-top: 16px;
  }
  
  .pagination-wrapper :deep(.el-pagination) {
    gap: 6px;
  }
  
  .pagination-wrapper :deep(.el-pagination__total) {
    font-size: 11px;
    margin-right: 6px;
    margin-bottom: 6px;
  }
  
  .pagination-wrapper :deep(.el-pagination__sizes) {
    margin-right: 6px;
    margin-bottom: 6px;
  }
  
  .pagination-wrapper :deep(.el-pagination__sizes .el-select) {
    width: 60px;
  }
  
  .pagination-wrapper :deep(.el-pagination__sizes .el-input__inner) {
    font-size: 10px;
    padding: 2px 4px;
    height: 24px;
  }
  
  .pagination-wrapper :deep(.el-pagination__prev),
  .pagination-wrapper :deep(.el-pagination__next) {
    width: 28px;
    height: 28px;
    font-size: 12px;
    margin: 0 3px;
  }
  
  .pagination-wrapper :deep(.el-pagination__jump) {
    margin-left: 6px;
    font-size: 11px;
  }
  
  .pagination-wrapper :deep(.el-pagination__jump .el-input) {
    width: 40px;
  }
  
  .pagination-wrapper :deep(.el-pagination__jump .el-input__inner) {
    font-size: 10px;
    padding: 2px 4px;
    height: 24px;
  }
}
</style>

