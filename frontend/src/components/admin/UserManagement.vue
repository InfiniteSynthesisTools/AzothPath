<template>
  <div class="user-management">
    <!-- 搜索和筛选 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            placeholder="搜索用户名"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select v-model="roleFilter" placeholder="选择角色" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="普通用户" value="1" />
            <el-option label="管理员" value="9" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="sortBy" placeholder="排序方式" @change="handleSort">
            <el-option label="贡献分" value="contribute" />
            <el-option label="注册时间" value="created_at" />
            <el-option label="等级" value="level" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="loadUsers">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 用户列表 -->
    <div class="user-list">
      <el-table 
        :data="filteredUsers" 
        v-loading="loading"
        stripe
        style="width: 100%"
        @sort-change="handleSort"
      >
        <el-table-column prop="id" label="ID" width="80" sortable="custom" align="center" />
        
        <el-table-column prop="name" label="用户名" min-width="150" />
        
        <el-table-column prop="auth" label="角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.auth === 9 ? 'danger' : 'primary'" size="small">
              {{ row.auth === 9 ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="recipe_count" label="配方数" width="100" align="center" />
        
        <el-table-column prop="item_count" label="物品数" width="100" align="center" />
        
        <el-table-column prop="created_at" label="注册时间" width="180" sortable="custom">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button 
              size="small" 
              type="primary" 
              @click="viewUserDetail(row)"
            >
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="danger"
              :disabled="row.auth === 9"
              @click="deleteUser(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalUsers"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 用户编辑对话框 -->
    <el-dialog
      v-model="userDialogVisible"
      title="编辑用户"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedUser" class="user-edit">
        <!-- 用户基本信息展示 -->
        <div class="user-info-header">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="用户ID">{{ selectedUser.id }}</el-descriptions-item>
            <el-descriptions-item label="配方数">{{ selectedUser.recipe_count || 0 }}</el-descriptions-item>
            <el-descriptions-item label="物品数">{{ selectedUser.item_count || 0 }}</el-descriptions-item>
            <el-descriptions-item label="当前角色">
              <el-tag :type="selectedUser.auth === 9 ? 'danger' : 'primary'">
                {{ selectedUser.auth === 9 ? '管理员' : '普通用户' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 编辑表单 -->
        <div class="edit-form">
          <el-form
            ref="editFormRef"
            :model="editForm"
            :rules="editRules"
            label-width="100px"
          >
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="用户名" prop="name">
                  <el-input v-model="editForm.name" placeholder="请输入用户名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="角色" prop="auth">
                  <el-select v-model="editForm.auth" placeholder="选择角色" style="width: 100%">
                    <el-option label="普通用户" :value="1" />
                    <el-option label="管理员" :value="9" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            

            <el-form-item label="注册时间" prop="created_at">
              <el-date-picker
                v-model="editForm.created_at"
                type="datetime"
                placeholder="选择注册时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="userDialogVisible = false">
            取消
          </el-button>
          <el-button 
            type="primary" 
            @click="saveUserEdit" 
            :loading="editLoading"
          >
            <el-icon><Check /></el-icon>
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Search, Refresh, Check } from '@element-plus/icons-vue';
import { userApi } from '@/api';
import { formatDateTime } from '@/utils/format';

// 响应式数据
const loading = ref(false);
const users = ref<any[]>([]);
const searchQuery = ref('');
const roleFilter = ref('');
const sortBy = ref('contribute');
const currentPage = ref(1);
const pageSize = ref(20);
const totalUsers = ref(0);
const userDialogVisible = ref(false);
const selectedUser = ref<any>(null);

// 编辑相关
const editLoading = ref(false);
const editFormRef = ref<FormInstance>();
const editForm = ref({
  name: '',
  auth: 1,
  created_at: ''
});

// 表单验证规则
const editRules: FormRules = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  auth: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  created_at: [
    { required: true, message: '请选择注册时间', trigger: 'change' }
  ]
};

// 计算属性
const filteredUsers = computed(() => {
  let filtered = [...users.value];

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(user => 
      user.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  // 角色过滤
  if (roleFilter.value) {
    filtered = filtered.filter(user => user.auth.toString() === roleFilter.value);
  }

  // 排序
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'contribute':
        return b.contribute - a.contribute;
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'level':
        return b.level - a.level;
      default:
        return 0;
    }
  });

  return filtered;
});

// 方法
const loadUsers = async () => {
  loading.value = true;
  try {
    const result = await userApi.getAllUsers({
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      role: roleFilter.value
    });
    // 响应拦截器已经处理了数据结构，直接使用result
    const data = result as any;
    users.value = data.users || [];
    totalUsers.value = data.total || 0;
  } catch (error) {
    console.error('加载用户列表失败:', error);
    ElMessage.error('加载用户列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadUsers();
};

const handleFilter = () => {
  currentPage.value = 1;
  loadUsers();
};

const handleSort = () => {
  currentPage.value = 1;
  loadUsers();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  loadUsers();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadUsers();
};

const viewUserDetail = (user: any) => {
  selectedUser.value = user;
  // 初始化编辑表单数据
  editForm.value = {
    name: user.name,
    auth: user.auth,
    created_at: user.created_at
  };
  userDialogVisible.value = true;
};


const deleteUser = async (user: any) => {
  // 检查是否为管理员用户
  if (user.auth === 9) {
    ElMessage.warning('不能删除管理员用户');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除用户 ${user.name} 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    );

    await userApi.deleteUser(user.id);
    
    ElMessage.success('删除成功');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error);
      ElMessage.error('删除失败');
    }
  }
};


// 保存用户编辑
const saveUserEdit = async () => {
  if (!editFormRef.value || !selectedUser.value) return;
  
  try {
    await editFormRef.value.validate();
    editLoading.value = true;
    
    await userApi.updateUserInfo(selectedUser.value.id, editForm.value);
    
    ElMessage.success('用户信息更新成功');
    userDialogVisible.value = false;
    loadUsers();
  } catch (error) {
    console.error('更新用户信息失败:', error);
    ElMessage.error('更新失败');
  } finally {
    editLoading.value = false;
  }
};

// 生命周期
onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.user-management {
  padding: 20px;
}

.search-section {
  margin-bottom: 20px;
}

.user-list {
  margin-bottom: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.username {
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.user-edit {
  padding: 20px 0;
}

.user-info-header {
  margin-bottom: 30px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.edit-form {
  padding: 20px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-descriptions__content) {
  color: #303133;
}

:deep(.el-descriptions__body) {
  background-color: #fafafa;
}

:deep(.el-descriptions__table .el-descriptions__cell) {
  padding: 12px 15px;
}

:deep(.el-dialog__header) {
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-dialog__body) {
  padding: 30px 20px;
}

:deep(.el-dialog__footer) {
  padding: 20px;
  background-color: #f8f9fa;
}

/* 基础表格样式 */
:deep(.el-table__header th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table__body tr:hover > td) {
  background-color: #f5f7fa;
}
</style>
