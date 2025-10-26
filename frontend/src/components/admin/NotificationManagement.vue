<template>
  <div class="notification-management">
    <el-card>
      <template #header>
        <div class="section-header">
          <h3>📢 通知管理</h3>
          <el-button type="primary" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon>
            发布通知
          </el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filter-section">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-select v-model="filters.type" placeholder="通知类型" clearable>
              <el-option label="全部" value="" />
              <el-option label="信息" value="info" />
              <el-option label="警告" value="warning" />
              <el-option label="成功" value="success" />
              <el-option label="错误" value="error" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="filters.target_user_id" placeholder="目标用户" clearable>
              <el-option label="全体用户" value="" />
              <el-option 
                v-for="user in userList" 
                :key="user.id" 
                :label="user.name" 
                :value="user.id" 
              />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="filters.is_read" placeholder="阅读状态" clearable>
              <el-option label="全部" value="" />
              <el-option label="未读" :value="0" />
              <el-option label="已读" :value="1" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-button type="primary" @click="loadNotifications">筛选</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 通知列表 -->
      <el-table 
        :data="notifications" 
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target_user_id" label="目标用户" width="120">
          <template #default="{ row }">
            <span v-if="row.target_user_id === null">全体用户</span>
            <span v-else>{{ getUserName(row.target_user_id) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="is_read" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_read ? 'success' : 'warning'">
              {{ row.is_read ? '已读' : '未读' }}
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
            <el-button size="small" @click="viewNotification(row)">
              查看
            </el-button>
            <el-button 
              size="small" 
              type="danger"
              @click="deleteNotification(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 创建通知对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="发布通知"
      width="600px"
      :before-close="handleCreateClose"
    >
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
        <el-form-item label="通知标题" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入通知标题" />
        </el-form-item>
        <el-form-item label="通知内容" prop="content">
          <el-input 
            v-model="createForm.content" 
            type="textarea" 
            :rows="4"
            placeholder="请输入通知内容" 
          />
        </el-form-item>
        <el-form-item label="通知类型" prop="type">
          <el-select v-model="createForm.type" placeholder="请选择通知类型">
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warning" />
            <el-option label="成功" value="success" />
            <el-option label="错误" value="error" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标用户" prop="target_user_id">
          <el-select v-model="createForm.target_user_id" placeholder="请选择目标用户" clearable>
            <el-option label="全体用户" value="" />
            <el-option 
              v-for="user in userList" 
              :key="user.id" 
              :label="user.name" 
              :value="user.id" 
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createNotification" :loading="creating">
          发布
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看通知对话框 -->
    <el-dialog
      v-model="showViewDialog"
      title="通知详情"
      width="600px"
    >
      <div v-if="currentNotification">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="标题">
            {{ currentNotification.title }}
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="getTypeTagType(currentNotification.type)">
              {{ getTypeText(currentNotification.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="目标用户">
            <span v-if="currentNotification.target_user_id === null">全体用户</span>
            <span v-else>{{ getUserName(currentNotification.target_user_id) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="已读状态">
            <el-tag :type="getReadStatusType(currentNotification)">
              {{ getReadStatusText(currentNotification) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(currentNotification.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(currentNotification.updated_at) }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="notification-content">
          <h4>通知内容：</h4>
          <p>{{ currentNotification.content }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { notificationApi, userApi } from '@/api';
import { formatDateTime } from '@/utils/format';
import type { Notification, CreateNotificationRequest } from '@/api/notification';

// 响应式数据
const loading = ref(false);
const creating = ref(false);
const notifications = ref<Notification[]>([]);
const userList = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const showCreateDialog = ref(false);
const showViewDialog = ref(false);
const currentNotification = ref<Notification | null>(null);

// 筛选条件
const filters = ref({
  type: '',
  target_user_id: undefined as number | string | undefined,
  is_read: undefined as number | undefined
});

// 创建通知表单
const createForm = ref({
  title: '',
  content: '',
  type: 'info',
  target_user_id: undefined as number | string | null | undefined
});

const createFormRef = ref();

const createRules = {
  title: [
    { required: true, message: '请输入通知标题', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入通知内容', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择通知类型', trigger: 'change' }
  ],
  target_user_id: [
    { required: false, message: '请选择目标用户', trigger: 'change' }
  ]
};

// 方法
const loadNotifications = async () => {
  loading.value = true;
  try {
    // 过滤掉空值和空字符串
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value
    };
    
    if (filters.value.type && filters.value.type !== '') {
      params.type = filters.value.type;
    }
    if (filters.value.target_user_id !== undefined && filters.value.target_user_id !== '' && filters.value.target_user_id !== null) {
      params.target_user_id = filters.value.target_user_id;
    }
    if (filters.value.is_read !== undefined) {
      params.is_read = filters.value.is_read;
    }
    
    const result = await notificationApi.getAdminNotifications(params);
    notifications.value = result.notifications;
    total.value = result.total;
    console.log('通知列表加载成功:', result);
  } catch (error) {
    console.error('加载通知列表失败:', error);
    ElMessage.error('加载通知列表失败');
  } finally {
    loading.value = false;
  }
};

const loadUserList = async () => {
  try {
    const result = await userApi.getAllUsers({ page: 1, limit: 1000 });
    userList.value = (result as any).users;
    console.log('用户列表加载成功:', userList.value);
  } catch (error) {
    console.error('加载用户列表失败:', error);
    ElMessage.error('加载用户列表失败');
  }
};

const resetFilters = () => {
  filters.value = {
    type: '',
    target_user_id: undefined,
    is_read: undefined
  };
  loadNotifications();
};

const getTypeTagType = (type: string) => {
  switch (type) {
    case 'info': return 'primary';
    case 'warning': return 'warning';
    case 'success': return 'success';
    case 'error': return 'danger';
    default: return 'info';
  }
};

const getTypeText = (type: string) => {
  switch (type) {
    case 'info': return '信息';
    case 'warning': return '警告';
    case 'success': return '成功';
    case 'error': return '错误';
    default: return '未知';
  }
};

const getUserName = (userId: number) => {
  const user = userList.value.find(u => u.id === userId);
  return user ? user.name : `用户${userId}`;
};

// 计算已读状态文本
const getReadStatusText = (notification: any) => {
  if (notification.target_user_id === null) {
    // 全体用户通知 - 显示已读比例
    const totalUsers = userList.value.length;
    const readCount = notification.read_count || 0;
    return `${readCount}/${totalUsers}`;
  } else {
    // 单个用户通知 - 显示已读/未读
    return notification.is_read ? '已读' : '未读';
  }
};

// 计算已读状态标签类型
const getReadStatusType = (notification: any) => {
  if (notification.target_user_id === null) {
    // 全体用户通知 - 根据已读比例显示颜色
    const totalUsers = userList.value.length;
    const readCount = notification.read_count || 0;
    const readRatio = totalUsers > 0 ? readCount / totalUsers : 0;
    
    if (readRatio === 1) return 'success';  // 全部已读
    if (readRatio > 0.5) return 'warning';  // 大部分已读
    return 'danger';  // 大部分未读
  } else {
    // 单个用户通知
    return notification.is_read ? 'success' : 'warning';
  }
};

const viewNotification = (row: Notification) => {
  currentNotification.value = row;
  showViewDialog.value = true;
};

const deleteNotification = async (row: Notification) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除通知"${row.title}"吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    );
    
    await notificationApi.adminDeleteNotification(row.id);
    ElMessage.success('删除成功');
    loadNotifications();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

const createNotification = async () => {
  if (!createFormRef.value) return;
  
  try {
    await createFormRef.value.validate();
    creating.value = true;
    
    // 处理目标用户ID，空字符串或undefined转换为null
    const formData = {
      ...createForm.value,
      target_user_id: (createForm.value.target_user_id === '' || createForm.value.target_user_id === undefined) ? null : createForm.value.target_user_id
    };
    
    await notificationApi.createNotification(formData as CreateNotificationRequest);
    ElMessage.success('通知发布成功');
    showCreateDialog.value = false;
    loadNotifications();
  } catch (error: any) {
    ElMessage.error(error.message || '发布失败');
  } finally {
    creating.value = false;
  }
};

const handleCreateClose = () => {
  createForm.value = {
    title: '',
    content: '',
    type: 'info',
    target_user_id: undefined
  };
  if (createFormRef.value) {
    createFormRef.value.resetFields();
  }
};

// 分页处理
const handleSizeChange = (size: number) => {
  pageSize.value = size;
  loadNotifications();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadNotifications();
};

// 生命周期
onMounted(() => {
  loadUserList();
  loadNotifications();
});
</script>

<style scoped>
.notification-management {
  padding: 20px;
  background: var(--color-bg-secondary);
  min-height: 100vh;
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

.filter-section {
  margin-bottom: 20px;
  padding: 20px;
  background-color: var(--color-bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--color-border-primary);
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.notification-content {
  margin-top: 20px;
  padding: 15px;
  background-color: var(--color-bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--color-border-primary);
}

.notification-content h4 {
  margin: 0 0 10px 0;
  color: var(--color-text-primary);
}

.notification-content p {
  margin: 0;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

/* 深色模式适配 */
[data-theme="dark"] .notification-management {
  background: var(--color-bg-primary);
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
