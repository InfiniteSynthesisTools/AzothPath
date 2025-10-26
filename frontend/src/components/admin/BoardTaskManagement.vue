<template>
  <div class="board-task-management">
    <el-card>
      <template #header>
        <div class="section-header">
          <h3>📋 任务看板任务</h3>
          <el-button type="primary" @click="loadBoardTasks">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <el-table 
        :data="boardTasks" 
        v-loading="boardLoading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="任务ID" width="100" />
        <el-table-column prop="item_name" label="目标物品" min-width="200" />
        <el-table-column prop="task_type" label="任务类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.task_type === 'find_recipe' ? 'primary' : 'success'">
              {{ row.task_type === 'find_recipe' ? '寻找配方' : '寻找更多配方' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="prize" label="奖励" width="100">
          <template #default="{ row }">
            <el-tag type="success">{{ row.prize }}</el-tag>
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
            <el-button size="small" @click="viewSystemTaskDetail(row)">
              详情
            </el-button>
            <el-button 
              v-if="row.status === 'active'"
              size="small" 
              type="primary"
              @click="editTaskPrize(row)"
            >
              编辑悬赏
            </el-button>
            <el-button 
              v-if="row.status === 'active'"
              size="small" 
              type="danger"
              @click="deleteTaskBoard(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="boardCurrentPage"
          v-model:page-size="boardPageSize"
          :page-sizes="[10, 20, 50]"
          :total="boardTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleBoardSizeChange"
          @current-change="handleBoardCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { taskApi } from '@/api';
import { formatDateTime } from '@/utils/format';

// 响应式数据
const boardLoading = ref(false);
const boardTasks = ref<any[]>([]);
const boardCurrentPage = ref(1);
const boardPageSize = ref(20);
const boardTotal = ref(0);

// 方法
const loadBoardTasks = async () => {
  boardLoading.value = true;
  try {
    const result = await taskApi.getTasks({
      page: boardCurrentPage.value,
      limit: boardPageSize.value
    });
    // 响应拦截器已经处理了数据结构，直接使用result
    boardTasks.value = result.tasks || [];
    boardTotal.value = result.total || 0;
  } catch (error) {
    console.error('加载任务看板任务失败:', error);
    ElMessage.error('加载任务看板任务失败');
  } finally {
    boardLoading.value = false;
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

const viewSystemTaskDetail = (row: any) => {
  ElMessage.info(`查看任务详情: ${row.item_name}`);
  // TODO: 实现任务详情弹窗
};

const editTaskPrize = async (row: any) => {
  try {
    const { value } = await ElMessageBox.prompt(
      `当前悬赏: ${row.prize} 分<br/>请输入新的悬赏值（0-200）`,
      '编辑任务悬赏',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^([0-9]|[1-9][0-9]|1[0-9][0-9]|200)$/,
        inputErrorMessage: '请输入 0-200 之间的整数',
        inputValue: row.prize.toString(),
        dangerouslyUseHTMLString: true
      }
    );

    const newPrize = parseInt(value);
    await taskApi.updateTask(row.id, { prize: newPrize });
    ElMessage.success('悬赏更新成功');
    loadBoardTasks();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '更新失败');
    }
  }
};

const deleteTaskBoard = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除任务"${row.item_name}"吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    );
    
    await taskApi.deleteTask(row.id);
    ElMessage.success('任务删除成功');
    loadBoardTasks();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

// 分页处理
const handleBoardSizeChange = (size: number) => {
  boardPageSize.value = size;
  loadBoardTasks();
};

const handleBoardCurrentChange = (page: number) => {
  boardCurrentPage.value = page;
  loadBoardTasks();
};

// 生命周期
onMounted(() => {
  loadBoardTasks();
});
</script>

<style scoped>
.board-task-management {
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
[data-theme="dark"] .board-task-management {
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
