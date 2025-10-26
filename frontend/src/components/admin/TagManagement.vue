<template>
  <div class="tag-management">
    <!-- 标签统计概览 -->
    <div class="tag-stats">
      <el-row :gutter="20">
        <el-col :span="8">
          <StatCard 
            emoji="🏷️"
            :value="allTags.length"
            label="标签总数"
            type="primary"
          />
        </el-col>
        <el-col :span="8">
          <StatCard 
            emoji="📌"
            :value="taggedItemsCount"
            label="已标记元素"
            type="success"
          />
        </el-col>
        <el-col :span="8">
          <StatCard 
            emoji="📊"
            :value="avgTagsPerItem"
            label="平均标签数"
            type="info"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 标签列表 -->
    <el-card>
      <template #header>
        <div class="section-header">
          <h3>🏷️ 标签管理</h3>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            创建标签
          </el-button>
        </div>
      </template>

      <el-table 
        :data="allTags" 
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="标签名称" min-width="150">
          <template #default="{ row }">
            <el-tag :color="row.color" style="color: white; border: none;">
              {{ row.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="color" label="颜色" width="120">
          <template #default="{ row }">
            <div class="color-preview" :style="{ backgroundColor: row.color }">
              {{ row.color }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showEditDialog(row)">
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="danger"
              @click="deleteTag(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑标签对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '创建标签' : '编辑标签'"
      width="500px"
    >
      <el-form :model="formData" label-width="80px">
        <el-form-item label="标签名称" required>
          <el-input v-model="formData.name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input 
            v-model="formData.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入标签描述"
          />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="formData.color" show-alpha />
          <span style="margin-left: 10px;">{{ formData.color }}</span>
        </el-form-item>
        <el-form-item label="预览">
          <el-tag :color="formData.color" style="color: white; border: none;">
            {{ formData.name || '标签预览' }}
          </el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTag" :loading="submitting">
          {{ dialogMode === 'create' ? '创建' : '保存' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { tagApi } from '@/api';
import { formatDateTime } from '@/utils/format';
import StatCard from '@/components/StatCard.vue';

interface Tag {
  id: number;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

// 响应式数据
const loading = ref(false);
const allTags = ref<Tag[]>([]);
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const submitting = ref(false);
const formData = ref({
  id: 0,
  name: '',
  description: '',
  color: 'var(--color-primary-500)'
});

// 计算属性
const taggedItemsCount = computed(() => {
  // TODO: 从API获取已标记元素数量
  return 0;
});

const avgTagsPerItem = computed(() => {
  // TODO: 从API获取平均标签数
  return 0;
});

// 方法
const loadTags = async () => {
  loading.value = true;
  try {
    const result = await tagApi.getTags();
    allTags.value = result.tags || [];
  } catch (error) {
    console.error('加载标签列表失败:', error);
    ElMessage.error('加载标签列表失败');
  } finally {
    loading.value = false;
  }
};

const showCreateDialog = () => {
  dialogMode.value = 'create';
  formData.value = {
    id: 0,
    name: '',
    description: '',
    color: 'var(--color-primary-500)'
  };
  dialogVisible.value = true;
};

const showEditDialog = (tag: Tag) => {
  dialogMode.value = 'edit';
  formData.value = {
    id: tag.id,
    name: tag.name,
    description: tag.description || '',
    color: tag.color || 'var(--color-primary-500)'
  };
  dialogVisible.value = true;
};

const submitTag = async () => {
  if (!formData.value.name) {
    ElMessage.warning('请输入标签名称');
    return;
  }

  submitting.value = true;
  try {
    if (dialogMode.value === 'create') {
      await tagApi.createTag({
        name: formData.value.name,
        description: formData.value.description,
        color: formData.value.color
      });
      ElMessage.success('标签创建成功');
    } else {
      await tagApi.updateTag(formData.value.id, {
        name: formData.value.name,
        description: formData.value.description,
        color: formData.value.color
      });
      ElMessage.success('标签更新成功');
    }
    dialogVisible.value = false;
    loadTags();
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

const deleteTag = async (tag: Tag) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除标签"${tag.name}"吗？此操作将同时移除所有元素的该标签关联！`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    );

    await tagApi.deleteTag(tag.id);
    ElMessage.success('标签删除成功');
    loadTags();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

// 生命周期
onMounted(() => {
  loadTags();
});
</script>

<style scoped>
.tag-management {
  padding: 20px;
  background: var(--color-bg-secondary);
  min-height: 100vh;
}

.tag-stats {
  margin-bottom: 30px;
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

.color-preview {
  padding: 5px 10px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  text-align: center;
}

/* 深色模式适配 */
[data-theme="dark"] .tag-management {
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
