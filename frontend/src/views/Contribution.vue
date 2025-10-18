<template>
  <div class="contribution-page">
    <div class="page-header">
      <h1>🏆 贡献榜</h1>
      <p>感谢所有为社区做出贡献的用户</p>
    </div>

    <el-card class="rank-card">
      <template #header>
        <div class="card-header">
          <span>排行榜</span>
          <el-select v-model="sortBy" placeholder="排序方式" style="width: 150px">
            <el-option label="贡献分" value="contribute" />
            <el-option label="等级" value="level" />
          </el-select>
        </div>
      </template>

      <el-table 
        :data="contributionRanks" 
        style="width: 100%"
        v-loading="loading"
        :default-sort="{ prop: 'user.contribute', order: 'descending' }"
      >
        <el-table-column label="排名" width="100" align="center">
          <template #default="{ $index }">
            <div class="rank-badge" :class="getRankClass($index)">
              <span v-if="$index < 3" class="rank-icon">{{ getRankIcon($index) }}</span>
              <span v-else class="rank-number">{{ $index + 1 }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="user.name" label="用户名" min-width="150">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="40" style="background-color: #409eff">
                {{ row.user.name.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="user-name">{{ row.user.name }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="user.contribute" label="贡献分" width="150" sortable align="center">
          <template #default="{ row }">
            <el-tag type="success" effect="dark" size="large">
              {{ row.user.contribute }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="user.level" label="等级" width="120" sortable align="center">
          <template #default="{ row }">
            <el-tag type="warning" effect="plain">
              Lv.{{ row.user.level }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="recipe_count" label="配方数量" width="120" sortable align="center" />

        <el-table-column prop="user.created_at" label="加入时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatDate(row.user.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewProfile(row.user.id)">
              查看主页
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 统计信息 -->
    <el-row :gutter="20" class="stats-section">
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic :value="stats.totalUsers" title="总用户数">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic :value="stats.totalContributions" title="总贡献分">
            <template #prefix>
              <el-icon><Medal /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic :value="stats.avgLevel" title="平均等级" :precision="1">
            <template #prefix>
              <el-icon><Star /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { userApi } from '@/api';
import { ElMessage } from 'element-plus';
import { User, Medal, Star } from '@element-plus/icons-vue';

const router = useRouter();

const loading = ref(false);
const contributionRanks = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const sortBy = ref('contribute');

const stats = ref({
  totalUsers: 0,
  totalContributions: 0,
  avgLevel: 0
});

// 加载排行榜数据
const loadData = async () => {
  loading.value = true;
  try {
    const response = await userApi.getContributionRank({
      page: currentPage.value,
      limit: pageSize.value
    }) as any;
    
    contributionRanks.value = response.users || [];
    total.value = response.total || 0;
    
    // 计算统计信息
    if (response.users && response.users.length > 0) {
      stats.value.totalUsers = response.total;
      stats.value.totalContributions = response.users.reduce(
        (sum: number, item: any) => sum + (item.user?.contribute || 0), 
        0
      );
      stats.value.avgLevel = response.users.reduce(
        (sum: number, item: any) => sum + (item.user?.level || 0), 
        0
      ) / response.users.length;
    }
  } catch (error) {
    console.error('加载贡献榜失败:', error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// 获取排名样式
const getRankClass = (index: number) => {
  if (index === 0) return 'rank-gold';
  if (index === 1) return 'rank-silver';
  if (index === 2) return 'rank-bronze';
  return '';
};

// 获取排名图标
const getRankIcon = (index: number) => {
  const icons = ['🥇', '🥈', '🥉'];
  return icons[index] || '';
};

// 查看用户主页
const viewProfile = (userId: number) => {
  router.push(`/profile/${userId}`);
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.contribution-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  font-size: 36px;
  color: #303133;
  margin: 0 0 10px 0;
}

.page-header p {
  font-size: 16px;
  color: #909399;
  margin: 0;
}

.rank-card {
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 24px;
  font-weight: bold;
}

.rank-gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  box-shadow: 0 4px 8px rgba(255, 215, 0, 0.4);
}

.rank-silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
  box-shadow: 0 4px 8px rgba(192, 192, 192, 0.4);
}

.rank-bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #e6a055 100%);
  box-shadow: 0 4px 8px rgba(205, 127, 50, 0.4);
}

.rank-number {
  font-size: 18px;
  color: #606266;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  font-weight: 500;
  color: #303133;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.stats-section {
  margin-top: 30px;
}
</style>
