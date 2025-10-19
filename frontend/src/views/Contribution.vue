<template>
  <div class="contribution-page">
    <div class="page-header">
      <h1>🏆 贡献榜</h1>
      <p>感谢所有为社区做出贡献的用户</p>
    </div>

    <!-- 统计信息 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalUsers }}</div>
          <div class="stat-label">总用户数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <el-icon><Medal /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalContributions }}</div>
          <div class="stat-label">总贡献分</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <el-icon><Star /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.avgLevel.toFixed(1) }}</div>
          <div class="stat-label">平均等级</div>
        </div>
      </div>
    </div>

    <!-- 排行榜卡片列表 -->
    <div class="leaderboard-container">
      <div class="leaderboard-header">
        <h2>排行榜</h2>
        <el-select v-model="sortBy" placeholder="排序方式" style="width: 150px">
          <el-option label="贡献分" value="contribute" />
          <el-option label="等级" value="level" />
        </el-select>
      </div>

      <div class="leaderboard-list" v-loading="loading">
        <div 
          v-for="(user, index) in contributionRanks" 
          :key="user.id"
          class="leaderboard-item"
          :class="{ 'top-three': index < 3 }"
          @click="viewProfile(user.id)"
        >
          <!-- 排名 -->
          <div class="rank-section">
            <div class="rank-badge" :class="getRankClass(index)">
              <span v-if="index < 3" class="rank-icon">{{ getRankIcon(index) }}</span>
              <span v-else class="rank-number">{{ index + 1 }}</span>
            </div>
          </div>

          <!-- 用户信息 -->
          <div class="user-section">
            <el-avatar :size="50" :style="{ backgroundColor: getAvatarColor() }">
              {{ user.name.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="user-info">
              <h3 class="user-name">{{ user.name }}</h3>
              <p class="join-date">加入于 {{ formatDate(user.created_at) }}</p>
            </div>
          </div>

          <!-- 统计数据 -->
          <div class="user-stats-section">
            <div class="user-stat-item primary">
              <span class="user-stat-value">{{ user.contribute }}</span>
              <span class="user-stat-label">贡献分</span>
            </div>
            <div class="user-stat-item">
              <span class="user-stat-value">{{ user.recipe_count || 0 }}</span>
              <span class="user-stat-label">配方</span>
            </div>
            <div class="user-stat-item">
              <span class="user-stat-value">{{ user.item_count || 0 }}</span>
              <span class="user-stat-label">物品</span>
            </div>
            <div class="user-stat-item">
              <span class="user-stat-value">Lv.{{ user.level }}</span>
              <span class="user-stat-label">等级</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-section">
            <el-button type="primary" link>
              查看详情
            </el-button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="contributionRanks.length === 0" class="empty-state">
          <el-empty description="暂无用户数据" />
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
            :page-sizes="[20, 40, 60]"
          :total="total"
          layout="total, prev, pager, next"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { userApi } from '@/api';
import { formatDate } from '@/utils/time';
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
        (sum: number, item: any) => sum + (item.contribute || 0), 
        0
      );
      stats.value.avgLevel = response.users.reduce(
        (sum: number, item: any) => sum + (item.level || 0), 
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

// 使用统一的时间工具函数，已在上方导入

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

// 获取头像颜色 - 与个人页面保持一致
const getAvatarColor = () => {
  // 默认使用蓝色，与个人页面保持一致
  return '#409eff';
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
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 200px);
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 28px;
  color: #303133;
  margin: 0 0 8px 0;
  font-weight: 500;
}

.page-header p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

/* 排行榜容器 */
.leaderboard-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.leaderboard-header h2 {
  font-size: 18px;
  color: #303133;
  margin: 0;
  font-weight: 500;
}

/* 排行榜列表 */
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 排行榜项目 */
.leaderboard-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  gap: 20px;
}

.leaderboard-item.top-three {
  background: #f8f9ff;
  border-color: #e6f7ff;
}

/* 排名区域 */
.rank-section {
  flex-shrink: 0;
}

.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-weight: 600;
  font-size: 16px;
}

.rank-gold {
  background: #fff3cd;
  color: #856404;
  border: 2px solid #ffeaa7;
}

.rank-silver {
  background: #f8f9fa;
  color: #6c757d;
  border: 2px solid #dee2e6;
}

.rank-bronze {
  background: #fdf2e9;
  color: #d97706;
  border: 2px solid #fed7aa;
}

.rank-number {
  color: #606266;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
}

.rank-icon {
  font-size: 20px;
}

/* 用户信息区域 */
.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 2px 0;
  line-height: 1.2;
}

.join-date {
  font-size: 13px;
  color: #909399;
  margin: 0;
  line-height: 1.2;
}

/* 用户统计数据区域 */
.user-stats-section {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
}

.user-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  height: 48px;
  padding: 6px 8px;
  border-radius: 4px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}

.user-stat-item.primary {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.user-stat-value {
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  margin-bottom: 2px;
}

.user-stat-label {
  font-size: 11px;
  color: #909399;
  line-height: 1;
}

.user-stat-item.primary .user-stat-label {
  color: rgba(255, 255, 255, 0.8);
}

/* 操作区域 */
.action-section {
  flex-shrink: 0;
}

/* 空状态 */
.empty-state {
  padding: 60px 0;
  text-align: center;
}

/* 分页 */
.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

/* 顶部统计卡片区域 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 30px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #f8f9fa;
  border-radius: 50%;
  color: #409eff;
  font-size: 18px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  line-height: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .leaderboard-item {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .user-section {
    justify-content: center;
  }
  
  .user-stats-section {
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .user-stat-item {
    min-width: 45px;
    height: 44px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .stat-card {
    padding: 12px;
  }
}
</style>
