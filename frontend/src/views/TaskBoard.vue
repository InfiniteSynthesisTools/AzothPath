<template>
  <div class="task-board-page">
    <div class="page-container">
      <!-- 页面头部 -->
      <div class="page-header">
        <h1>📋 任务看板</h1>
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
        <el-col :span="6">
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
        <el-col :span="6">
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
        <el-col :span="6">
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
        <el-col :span="6">
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
            :span="8" 
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
          <el-form-item label="奖励分数" required>
            <el-input-number 
              v-model="createForm.prize" 
              :min="1" 
              :max="1000"
              :step="5"
            />
            <span style="margin-left: 10px; color: #909399; font-size: 12px;">
              建议：10-100分
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
import { formatDateTime } from '@/utils/time';

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
  prize: 10
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
  if (!createForm.value.itemName || !createForm.value.prize) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  creating.value = true;
  try {
    await taskApi.createTask({
      itemName: createForm.value.itemName,
      prize: createForm.value.prize
    });
    
    ElMessage.success('任务创建成功');
    showCreateDialog.value = false;
    createForm.value = { itemName: '', prize: 10 };
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

// 使用统一的时间工具函数，已在上方导入

onMounted(() => {
  loadTasks();
});
</script>

<style scoped>
.task-board-page {
  min-height: calc(100vh - 200px);
  background-color: #f5f7fa;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 24px;
  color: #303133;
  margin: 0;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 统计卡片 */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
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
  background: #f0f2f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #409eff;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

/* 状态标签页 */
.status-tabs {
  margin-bottom: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.tab-switch {
  display: inline-flex;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 4px;
  position: relative;
}

.tab-item {
  position: relative;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s ease;
  z-index: 2;
}

.tab-item:hover {
  color: #409eff;
}

.tab-item.active {
  background: #ffffff;
  color: #409eff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
    padding: 15px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .stats-row .el-col {
    margin-bottom: 15px;
  }
  
  .stat-content {
    padding: 16px;
    gap: 12px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
  
  .stat-value {
    font-size: 20px;
  }
}
</style>
