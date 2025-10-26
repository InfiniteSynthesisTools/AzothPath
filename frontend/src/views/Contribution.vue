<template>
  <div class="contribution-page">
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-emoji">🏆</span>
        贡献榜
      </h1>
      <p class="page-subtitle">感谢所有为社区做出贡献的用户</p>
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
            <div class="user-avatar-wrapper">
              <div class="user-emoji-avatar">
                {{ user.emoji || '🙂' }}
              </div>
            </div>
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
import { formatDate } from '@/utils/format';
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
  padding: 24px;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  min-height: calc(100vh - 60px);
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
  margin: 0 0 24px 0;
  line-height: 1.5;
}

/* 排行榜容器 */
.leaderboard-container {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-lg);
  margin-bottom: 20px;
  border: 1px solid var(--color-border-primary);
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
  color: var(--color-text-primary);
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
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  gap: 20px;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.leaderboard-item:hover {
  background: var(--color-bg-surface);
  border-color: var(--color-border-accent);
  box-shadow: var(--shadow-xl);
}

.leaderboard-item.top-three {
  background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-primary-100) 100%);
  border-color: var(--color-primary-200);
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
  box-shadow: var(--shadow-sm);
}

.rank-gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #856404;
  border: 2px solid #ffd700;
}

.rank-silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
  color: #4a5568;
  border: 2px solid #c0c0c0;
}

.rank-bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #e9b384 100%);
  color: #7c2d12;
  border: 2px solid #cd7f32;
}

.rank-number {
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
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

.user-avatar-wrapper {
  flex-shrink: 0;
}

.user-emoji-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: inset 0 0 0 2px var(--glass-border);
  font-size: 28px;
  line-height: 1;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 2px 0;
  line-height: 1.2;
}

.join-date {
  font-size: 13px;
  color: var(--color-text-secondary);
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
  border-radius: var(--radius-base);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-sm);
}

.user-stat-item.primary {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
  color: white;
  border-color: var(--color-primary-600);
}

.user-stat-value {
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  margin-bottom: 2px;
}

.user-stat-label {
  font-size: 11px;
  color: var(--color-text-secondary);
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
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
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
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.stat-card:hover {
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-border-accent);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--color-bg-primary);
  border-radius: 50%;
  color: var(--color-primary-500);
  font-size: 18px;
  box-shadow: var(--shadow-sm);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
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

@media (max-width: 480px) {
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
}
</style>
