<template>
  <div class="task-board-page">
    <div class="page-container">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <h1>🎯 任务大厅</h1>
          <p>完成任务获得贡献分奖励</p>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="showCreateDialog = true" v-if="isAdmin">
            ➕ 创建任务
          </el-button>
          <el-button @click="loadTasks">
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
              <div class="stat-icon active">🎯</div>
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
              <div class="stat-icon prize">💰</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.total_prize }}</div>
                <div class="stat-label">待领奖励</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 筛选器 -->
      <el-card class="filter-card">
        <el-form :inline="true" :model="filters">
          <el-form-item label="任务状态">
            <el-select v-model="filters.status" placeholder="全部" clearable @change="loadTasks">
              <el-option label="全部" value="" />
              <el-option label="活跃中" value="active" />
              <el-option label="已完成" value="completed" />
            </el-select>
          </el-form-item>
          <el-form-item label="排序方式">
            <el-select v-model="filters.sortBy" @change="loadTasks">
              <el-option label="创建时间" value="created_at" />
              <el-option label="奖励金额" value="prize" />
            </el-select>
          </el-form-item>
          <el-form-item label="排序顺序">
            <el-select v-model="filters.sortOrder" @change="loadTasks">
              <el-option label="降序" value="desc" />
              <el-option label="升序" value="asc" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

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
              @complete="handleCompleteTask"
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
          :page-sizes="[12, 24, 48]"
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
            <el-descriptions-item label="创建时间">
              {{ formatDate(selectedTask.created_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成时间" v-if="selectedTask.completed_at">
              {{ formatDate(selectedTask.completed_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成配方" v-if="selectedTask.recipe">
              <div class="recipe-info">
                <div>{{ selectedTask.recipe.item_a }} + {{ selectedTask.recipe.item_b }} = {{ selectedTask.recipe.result }}</div>
                <div class="creator">创建者: {{ selectedTask.recipe.creator_name }}</div>
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

const userStore = useUserStore();

// 权限判断
const isAdmin = computed(() => userStore.userInfo?.auth === 9);

// 统计数据
const stats = ref<TaskStats>({
  total: 0,
  active: 0,
  completed: 0,
  total_prize: 0
});

// 任务列表
const tasks = ref<Task[]>([]);
const total = ref(0);
const loading = ref(false);

// 筛选器
const filters = ref({
  page: 1,
  limit: 12,
  status: '' as '' | 'active' | 'completed',
  sortBy: 'created_at' as 'created_at' | 'prize',
  sortOrder: 'desc' as 'asc' | 'desc'
});

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
    stats.value = await taskApi.getStats();
  } catch (error: any) {
    console.error('Load stats error:', error);
  }
};

// 加载任务列表
const loadTasks = async () => {
  loading.value = true;
  try {
    const params = {
      page: filters.value.page,
      limit: filters.value.limit,
      status: filters.value.status || undefined,
      sortBy: filters.value.sortBy,
      sortOrder: filters.value.sortOrder
    };
    
    const result = await taskApi.getTasks(params);
    tasks.value = result.tasks;
    total.value = result.total;
    
    // 同时刷新统计
    await loadStats();
  } catch (error: any) {
    ElMessage.error(error.message || '加载任务列表失败');
  } finally {
    loading.value = false;
  }
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

// 完成任务
const handleCompleteTask = async (task: Task) => {
  ElMessageBox.prompt('请输入完成该任务的配方 ID', '完成任务', {
    confirmButtonText: '提交',
    cancelButtonText: '取消',
    inputPattern: /^\d+$/,
    inputErrorMessage: '请输入有效的配方 ID'
  }).then(async ({ value }: any) => {
    try {
      const result = await taskApi.completeTask(task.id, parseInt(value));
      ElMessage.success(`🎉 任务完成！获得 ${result.prize} 贡献分`);
      await loadTasks();
    } catch (error: any) {
      ElMessage.error(error.message || '完成任务失败');
    }
  }).catch(() => {
    // 用户取消
  });
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

// 格式化日期
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.active {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.completed {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.prize {
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

.recipe-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.creator {
  font-size: 12px;
  color: #909399;
}
</style>
