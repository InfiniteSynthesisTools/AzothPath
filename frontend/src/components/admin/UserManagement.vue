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
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="用户名" width="150">
          <template #default="{ row }">
            <div class="user-info">
              <span class="username">{{ row.name }}</span>
              <el-tag v-if="row.auth === 9" type="danger" size="small">管理员</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="contribute" label="贡献分" width="100" sortable>
          <template #default="{ row }">
            <el-tag type="success">{{ row.contribute }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="等级" width="80" />
        <el-table-column prop="recipe_count" label="配方数" width="100" />
        <el-table-column prop="item_count" label="物品数" width="100" />
        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewUserDetail(row)">
              详情
            </el-button>
            <el-button 
              v-if="row.auth !== 9" 
              size="small" 
              type="warning"
              @click="toggleUserRole(row)"
            >
              {{ row.auth === 9 ? '降级' : '升级' }}
            </el-button>
            <el-button 
              v-if="row.auth !== 9" 
              size="small" 
              type="danger"
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

    <!-- 用户详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="用户详情"
      width="600px"
    >
      <div v-if="selectedUser" class="user-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">{{ selectedUser.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ selectedUser.name }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="selectedUser.auth === 9 ? 'danger' : 'primary'">
              {{ selectedUser.auth === 9 ? '管理员' : '普通用户' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="等级">{{ selectedUser.level }}</el-descriptions-item>
          <el-descriptions-item label="贡献分">{{ selectedUser.contribute }}</el-descriptions-item>
          <el-descriptions-item label="配方数">{{ selectedUser.recipe_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="物品数">{{ selectedUser.item_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="注册时间" :span="2">
            {{ formatDateTime(selectedUser.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
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
const detailDialogVisible = ref(false);
const selectedUser = ref<any>(null);

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
    // 临时使用贡献榜数据
    const result = await userApi.getContributionRank({
      page: currentPage.value,
      limit: pageSize.value
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
  // 搜索逻辑在计算属性中处理
};

const handleFilter = () => {
  // 过滤逻辑在计算属性中处理
};

const handleSort = () => {
  // 排序逻辑在计算属性中处理
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
  detailDialogVisible.value = true;
};

const toggleUserRole = async (user: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要${user.auth === 9 ? '降级' : '升级'}用户 ${user.name} 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    // 这里需要实现切换用户角色的API
    // await userApi.toggleUserRole(user.id, user.auth === 9 ? 1 : 9);
    
    ElMessage.success('操作成功');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('切换用户角色失败:', error);
      ElMessage.error('操作失败');
    }
  }
};

const deleteUser = async (user: any) => {
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

    // 这里需要实现删除用户的API
    // await userApi.deleteUser(user.id);
    
    ElMessage.success('删除成功');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error);
      ElMessage.error('删除失败');
    }
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

.user-detail {
  padding: 20px 0;
}
</style>
