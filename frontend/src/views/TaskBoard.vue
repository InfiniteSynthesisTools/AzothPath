<template>
  <div class="task-board-page">
    <div class="page-container">
      <!-- 页面头部 -->
      <div class="page-header">
        <h1 class="page-title">
          <span class="title-emoji">📋</span>
          任务看板
        </h1>
        <p class="page-subtitle">管理和跟踪您的任务进度</p>
        <div class="header-actions">
          <el-button type="primary" @click="showCreateDialog = true" v-if="userStore.isLoggedIn">
            创建任务
          </el-button>
          <el-button @click="loadTasks">
            刷新
          </el-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">📊</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.total }}</div>
                <div class="stat-label">总任务数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">🎯</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.active }}</div>
                <div class="stat-label">活跃任务</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">✅</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.completed }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">💰</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.total_prize }}</div>
                <div class="stat-label">待领奖励</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 任务状态切换 -->
      <div class="status-tabs">
        <div class="tab-switch">
          <div 
            class="tab-item" 
            :class="{ active: activeTab === 'active' }"
            @click="switchTab('active')"
          >
            活跃任务
          </div>
          <div 
            class="tab-item" 
            :class="{ active: activeTab === 'completed' }"
            @click="switchTab('completed')"
          >
            已完成
          </div>
        </div>
      </div>

      <!-- 任务列表 -->
      <div class="task-list" v-loading="loading">
        <el-empty v-if="tasks.length === 0" description="暂无任务" />
        <el-row :gutter="20" v-else>
          <el-col 
            :xs="24" 
            :sm="12" 
            :md="8" 
            :lg="8"
            v-for="task in tasks" 
            :key="task.id"
            class="task-col"
          >
            <TaskCard 
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
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="currentTotal"
          :page-sizes="[20, 40, 60]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadTasks"
          @size-change="loadTasks"
        />
      </div>

      <!-- 创建任务对话框 -->
      <el-dialog
        v-model="showCreateDialog"
        title="创建任务"
        width="500px"
      >
        <el-alert
          title="创建规则"
          type="info"
          :closable="false"
          style="margin-bottom: 20px;"
        >
          <ul style="margin: 5px 0; padding-left: 20px; font-size: 13px;">
            <li>为尚未找到合成路径的物品创建悬赏任务</li>
            <li>基础材料（金木水火土）无需创建任务</li>
            <li>已有合成配方的物品无法创建任务</li>
            <li>每个物品只能有一个活跃任务</li>
          </ul>
        </el-alert>
        <el-form :model="createForm" label-width="100px">
          <el-form-item label="物品名称" required>
            <el-input 
              v-model="createForm.itemName" 
              placeholder="请输入需要悬赏的物品名称"
              clearable
            />
          </el-form-item>
          <!-- 只有管理员才显示奖励分数输入框 -->
          <el-form-item v-if="userStore.isAdmin" label="奖励分数" required>
            <el-input-number 
              v-model="createForm.prize" 
              :min="0" 
              :max="200"
              :step="5"
            />
            <span style="margin-left: 10px; color: #909399; font-size: 12px;">
              范围：0-200分
            </span>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button type="primary" @click="handleCreate" :loading="creating">
            创建任务
          </el-button>
        </template>
      </el-dialog>

      <!-- 任务详情对话框 -->
      <el-dialog
        v-model="showDetailDialog"
        title="任务详情"
        width="600px"
      >
        <div v-if="selectedTask" class="task-detail">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="任务 ID">
              {{ selectedTask.id }}
            </el-descriptions-item>
            <el-descriptions-item label="目标物品">
              <el-tag size="large">{{ selectedTask.item_name }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="奖励分数">
              <el-tag type="warning" size="large">💰 {{ selectedTask.prize }} 分</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="任务状态">
              <el-tag :type="selectedTask.status === 'active' ? 'success' : 'info'">
                {{ selectedTask.status === 'active' ? '🎯 活跃中' : '✅ 已完成' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="发布者">
              <el-tag type="primary" size="large">👤 {{ selectedTask.creator_name || '未知用户' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDateTime(selectedTask.created_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成时间" v-if="selectedTask.completed_at">
              {{ formatDateTime(selectedTask.completed_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成配方" v-if="selectedTask.recipe">
              <div class="recipe-info">
                <div>{{ selectedTask.recipe.item_a }} + {{ selectedTask.recipe.item_b }} = {{ selectedTask.recipe.result }}</div>
                <div class="creator">配方创建者: {{ selectedTask.recipe.creator_name }}</div>
              </div>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { taskApi, type Task, type TaskWithDetails, type TaskStats } from '@/api/task';
import { useUserStore } from '@/stores/user';
import TaskCard from '@/components/TaskCard.vue';
import { formatDateTime } from '@/utils/format';

const userStore = useUserStore();

// 统计数据
const stats = ref<TaskStats>({
  total: 0,
  active: 0,
  completed: 0,
  total_prize: 0
});

// 任务列表
const tasks = ref<Task[]>([]);
const loading = ref(false);

// 状态管理
const activeTab = ref('active');
const currentPage = ref(1);
const pageSize = ref(20);
const activeTotal = ref(0);
const completedTotal = ref(0);
const currentTotal = computed(() => activeTab.value === 'active' ? activeTotal.value : completedTotal.value);

// 创建任务
const showCreateDialog = ref(false);
const creating = ref(false);
const createForm = ref({
  itemName: '',
  prize: 0  // 默认为0（普通用户强制为0，管理员可修改）
});

// 任务详情
const showDetailDialog = ref(false);
const selectedTask = ref<TaskWithDetails | null>(null);

// 加载统计数据
const loadStats = async () => {
  try {
    const statsData = await taskApi.getStats();
    console.log('Stats data received:', statsData);
    stats.value = statsData;
  } catch (error: any) {
    console.error('Load stats error:', error);
    ElMessage.error('加载统计数据失败');
  }
};

// 加载任务列表
const loadTasks = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      status: activeTab.value as 'active' | 'completed',
      sortBy: 'created_at' as 'created_at' | 'prize',
      sortOrder: 'desc' as 'asc' | 'desc'
    };
    
    const result = await taskApi.getTasks(params);
    tasks.value = result.tasks;
    
    // 更新对应状态的总数
    if (activeTab.value === 'active') {
      activeTotal.value = result.total;
    } else {
      completedTotal.value = result.total;
    }
    
    // 同时刷新统计
    await loadStats();
  } catch (error: any) {
    ElMessage.error(error.message || '加载任务列表失败');
  } finally {
    loading.value = false;
  }
};

// 切换标签页
const switchTab = (tabName: 'active' | 'completed') => {
  activeTab.value = tabName;
  currentPage.value = 1; // 切换标签页时重置页码
  loadTasks();
};

// 查看任务详情
const handleViewDetail = async (task: Task) => {
  try {
    selectedTask.value = await taskApi.getTaskById(task.id);
    showDetailDialog.value = true;
  } catch (error: any) {
    ElMessage.error(error.message || '获取任务详情失败');
  }
};

// 创建任务
const handleCreate = async () => {
  // 只验证物品名称
  if (!createForm.value.itemName) {
    ElMessage.warning('请填写物品名称');
    return;
  }

  // 管理员需要验证奖励分数
  if (userStore.isAdmin && (createForm.value.prize === null || createForm.value.prize === undefined)) {
    ElMessage.warning('请填写奖励分数');
    return;
  }

  creating.value = true;
  try {
    await taskApi.createTask({
      itemName: createForm.value.itemName,
      prize: createForm.value.prize  // 普通用户为0，管理员可设置0-200
    });
    
    ElMessage.success('任务创建成功');
    showCreateDialog.value = false;
    createForm.value = { itemName: '', prize: 0 };  // 重置为默认值0
    await loadTasks();
  } catch (error: any) {
    ElMessage.error(error.message || '创建任务失败');
  } finally {
    creating.value = false;
  }
};


// 删除任务
const handleDeleteTask = async (task: Task) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除任务"${task.item_name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await taskApi.deleteTask(task.id);
    ElMessage.success('任务删除成功');
    await loadTasks();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除任务失败');
    }
  }
};


onMounted(() => {
  loadTasks();
});
</script>

<style scoped>
.task-board-page {
  min-height: calc(100vh - 200px);
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  transition: background var(--transition-base);
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
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
}

/* 统计卡片 */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border-primary);
  transition: all var(--transition-base);
}

.stat-card:hover {
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-lg);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--color-primary-500);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-tertiary);
}

/* 状态标签页 */
.status-tabs {
  margin-bottom: 20px;
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border-primary);
  padding: 20px;
}

.tab-switch {
  display: inline-flex;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-base);
  padding: 4px;
  position: relative;
}

.tab-item {
  position: relative;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
  z-index: 2;
}

.tab-item:hover {
  color: var(--color-primary-500);
}

.tab-item.active {
  background: var(--color-bg-primary);
  color: var(--color-primary-500);
  box-shadow: var(--shadow-sm);
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

.recipe-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.creator {
  font-size: 12px;
  color: #909399;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-container {
    padding: 12px;
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
    flex-direction: column;
    gap: 8px;
  }
  
  .stats-row {
    margin-bottom: 16px;
  }
  
  .stats-row :deep(.el-col) {
    margin-bottom: 12px;
  }
  
  .stat-card {
    margin-bottom: 0;
    border-radius: var(--radius-md);
  }
  
  .stat-content {
    padding: 12px;
    gap: 10px;
  }
  
  .stat-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
    background: var(--color-bg-tertiary);
  }
  
  .stat-value {
    font-size: 18px;
    color: var(--color-text-primary);
  }
  
  .stat-label {
    font-size: 12px;
    color: var(--color-text-tertiary);
  }
  
  .status-tabs {
    padding: 12px;
    margin-bottom: 16px;
    border-radius: var(--radius-md);
  }
  
  .tab-switch {
    width: 100%;
    justify-content: space-around;
    background: var(--color-bg-tertiary);
  }
  
  .tab-item {
    flex: 1;
    text-align: center;
    padding: 8px 12px;
    font-size: 13px;
    color: var(--color-text-secondary);
  }
  
  .tab-item.active {
    background: var(--color-bg-primary);
    color: var(--color-primary-500);
  }
  
  .task-col {
    margin-bottom: 16px;
  }
  
  .pagination-wrapper {
    margin-top: 20px;
  }
  
  .pagination-wrapper :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  
  .pagination-wrapper :deep(.el-pagination .el-pager) {
    display: flex;
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .page-container {
    padding: 10px;
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
  
  .header-actions .el-button {
    font-size: 13px;
    padding: 8px 12px;
  }
  
  .stat-content {
    padding: 10px;
    gap: 8px;
  }
  
  .stat-icon {
    width: 32px;
    height: 32px;
    font-size: 14px;
    background: var(--color-bg-tertiary);
  }
  
  .stat-value {
    font-size: 16px;
    color: var(--color-text-primary);
  }
  
  .stat-label {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }
  
  .status-tabs {
    padding: 10px;
    border-radius: var(--radius-md);
  }
  
  .tab-item {
    padding: 6px 10px;
    font-size: 12px;
    color: var(--color-text-secondary);
  }
  
  .tab-item.active {
    background: var(--color-bg-primary);
    color: var(--color-primary-500);
  }
  
  .task-col {
    margin-bottom: 12px;
  }
}
</style>
