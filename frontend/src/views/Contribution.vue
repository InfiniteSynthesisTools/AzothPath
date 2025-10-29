<template>
  <div class="contribution-page">
    <div class="page-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">
          <span class="title-emoji">🏆</span>
          贡献榜
        </h1>
        <p class="page-subtitle">感谢所有为社区做出贡献的用户</p>
      </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="24" :sm="8" :md="8" :lg="8">
          <StatCard 
            type="primary"
            emoji="👥"
            :value="stats.totalUsers"
            label="总用户数"
            :compact="true"
          />
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8">
          <StatCard 
            type="success"
            emoji="🏆"
            :value="stats.totalContributions"
            label="总贡献分"
            :compact="true"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 排行榜卡片列表 -->
    <div class="cards-section">
      <el-card class="leaderboard-card card-scale" shadow="hover">
        <template #header>
          <div class="card-header">
            <h3>🏆 排行榜</h3>
            <div class="card-actions"></div>
          </div>
        </template>
        <div class="card-content">
          <div class="leaderboard-list" v-loading="loading">
            <div 
              v-for="(user, index) in contributionRanks" 
              :key="user.id"
              class="leaderboard-item"
              :class="{ 'top-three': getGlobalRank(index) <= 3 }"
              @click="viewProfile(user.id)"
            >
              <!-- 排名 -->
              <div class="rank-section">
                <Badge 
                  :type="getRankType(getGlobalRank(index) - 1)"
                  size="lg"
                  :emoji="getRankIcon(getGlobalRank(index) - 1)"
                  :text="getGlobalRank(index) <= 3 ? '' : getGlobalRank(index).toString()"
                />
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
                <Badge 
                  type="success" 
                  size="sm"
                  emoji="🏆"
                  :text="`${user.contribute} 贡献分`"
                />
                <Badge 
                  type="primary" 
                  size="sm"
                  emoji="📋"
                  :text="`${user.recipe_count || 0} 配方`"
                />
                <Badge 
                  type="info" 
                  size="sm"
                  emoji="🧪"
                  :text="`${user.item_count || 0} 物品`"
                />
                
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
        </div>

        <!-- 桌面端分页 -->
        <div class="pagination" v-if="!isMobile">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 40, 60]"
            :total="total"
            layout="total, prev, pager, next"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>

        <!-- 移动端加载更多 -->
        <div class="mobile-load-more" v-else>
          <el-button
            v-if="hasMore"
            type="primary"
            size="small"
            :loading="loading"
            @click="loadMoreMobile"
          >加载更多</el-button>
          <span v-else class="no-more">没有更多了</span>
        </div>
      </el-card>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { userApi } from '@/api';
import StatCard from '@/components/StatCard.vue';
import Badge from '@/components/Badge.vue';
import { formatDate } from '@/utils/format';
import { ElMessage } from 'element-plus';


const router = useRouter();

const loading = ref(false);
const contributionRanks = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
// 排序筛选已移除，按后端默认排序展示
const isMobile = ref(window.innerWidth <= 768);

const stats = ref({
  totalUsers: 0,
  totalContributions: 0
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
    }
  } catch (error) {
    console.error('加载贡献榜失败:', error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 使用统一的时间工具函数，已在上方导入

// 计算全局排名
const getGlobalRank = (index: number) => {
  return (currentPage.value - 1) * pageSize.value + index + 1;
};

// 获取排名类型
const getRankType = (index: number) => {
  if (index === 0) return 'warning';
  if (index === 1) return 'default';
  if (index === 2) return 'info';
  return 'primary';
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
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth <= 768;
  });
});

const hasMore = computed(() => contributionRanks.value.length < total.value);

const loadMoreMobile = async () => {
  if (loading.value || !hasMore.value) return;
  loading.value = true;
  try {
    currentPage.value += 1;
    const response = await userApi.getContributionRank({
      page: currentPage.value,
      limit: pageSize.value
    }) as any;
    const next = response.users || [];
    contributionRanks.value = contributionRanks.value.concat(next);
    total.value = response.total || total.value;
  } catch (e) {
    console.error('加载更多失败:', e);
  } finally {
    loading.value = false;
  }
};

const handlePageChange = async () => {
  await loadData();
};

const handlePageSizeChange = async (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  await loadData();
};
</script>

<style scoped>
.contribution-page {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  min-height: 100vh;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  margin-bottom: 40px;
  text-align: center;
}

.page-title {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  font-size: 18px;
  color: var(--color-text-secondary);
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.stats-section {
  margin-bottom: 40px;
}

.stats-row :deep(.el-col) {
  display: flex;
}
.stats-row :deep(.el-col > *) {
  width: 100%;
}

.stats-row {
  align-items: stretch;
}

/* 统一统计卡片高度，保证两个卡片始终等高（仅在贡献榜页面生效） */
.contribution-page .stats-section :deep(.stat-card) {
  min-height: 180px;
}
@media (max-width: 768px) {
  .contribution-page .stats-section :deep(.stat-card) {
    min-height: 120px;
  }
}

.cards-section {
  margin: 40px 0 60px;
}

.leaderboard-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
}

.leaderboard-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-300);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-primary-100);
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 20px;
}

/* 排行榜列表 */
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 排行榜项目 */
.leaderboard-item {
  display: grid;
  grid-template-columns: 64px minmax(0,1fr) auto auto; /* 排名 | 用户信息 | 统计 | 操作 */
  align-items: center;
  padding: 16px 20px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  gap: 16px 20px;
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
.rank-section { display: flex; justify-content: center; align-items: center; }

/* 用户信息区域 */
.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  gap: 10px;
  align-items: center;
  flex-wrap: nowrap; /* 三个标签同一行 */
}
.user-stats-section :deep(.badge) { white-space: nowrap; }

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

.mobile-load-more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.mobile-load-more .no-more {
  color: var(--color-text-secondary);
  font-size: 12px;
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
  
  .leaderboard-item { grid-template-columns: 48px 1fr; }
  .user-stats-section { grid-column: 1 / -1; justify-content: center; flex-wrap: nowrap; }
  .action-section { grid-column: 1 / -1; justify-self: center; }
  
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
}

/* 深色主题：排行榜下拉选择器适配 */
/* 排序筛选已移除 */
</style>

<style>
/* 排序筛选已移除，相关暗黑弹层样式不再需要 */

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
