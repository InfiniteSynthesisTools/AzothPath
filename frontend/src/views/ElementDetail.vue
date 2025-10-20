<template>
  <div class="element-detail-page">
    <!-- 返回按钮 -->
    <div class="back-section">
      <el-button 
        type="primary" 
        link 
        @click="goBack"
        class="back-button"
      >
        <el-icon><ArrowLeft /></el-icon>
        返回元素列表
      </el-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 元素详情内容 -->
    <div v-else-if="element" class="element-content">
      <!-- 元素头部信息 -->
      <div class="element-header">
        <div class="element-emoji">
          {{ element.emoji || '🔘' }}
        </div>
        <div class="element-info">
          <h1 class="element-name">{{ element.name }}</h1>
          <div class="element-meta">
            <el-tag 
              :type="element.is_base ? 'primary' : 'success'"
              class="element-type-tag"
            >
              {{ element.is_base ? '基础元素' : '合成元素' }}
            </el-tag>
            <span class="element-id">ID: {{ element.id }}</span>
          </div>
        </div>
      </div>

      <!-- 元素统计信息 -->
      <div class="element-stats-section">
        <el-row :gutter="20">
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-content">
                <div class="stat-value">{{ element.recipe_count || 0 }}</div>
                <div class="stat-label">配方数量</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">🔥</div>
              <div class="stat-content">
                <div class="stat-value">{{ element.usage_count || 0 }}</div>
                <div class="stat-label">使用频率</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon">👤</div>
              <div class="stat-content">
                <div class="stat-value">{{ element.discoverer_name || '-' }}</div>
                <div class="stat-label">发现者</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

    </div>

    <!-- 元素不存在 -->
    <div v-else class="not-found">
      <el-empty description="元素不存在" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { recipeApi } from '@/api';

interface Element {
  id: number;
  name: string;
  emoji?: string;
  is_base: number;
  usage_count?: number;
  recipe_count?: number;
  discoverer_name?: string;
}

const route = useRoute();
const router = useRouter();

const element = ref<Element | null>(null);
const loading = ref(false);

// 获取元素详情
const fetchElementDetail = async () => {
  loading.value = true;
  try {
    const elementId = parseInt(route.params.id as string);
    
    if (isNaN(elementId)) {
      ElMessage.error('无效的元素ID');
      return;
    }

    // 使用专门的详情API获取单个元素
    const elementData = await recipeApi.getItemById(elementId);

    if (elementData) {
      element.value = elementData;
    } else {
      ElMessage.error('获取元素详情失败');
    }
  } catch (error: any) {
    console.error('获取元素详情失败:', error);
    if (error.response?.status === 404) {
      ElMessage.error('元素不存在');
    } else {
      ElMessage.error('获取元素详情失败，请稍后重试');
    }
  } finally {
    loading.value = false;
  }
};



// 返回上一页
const goBack = () => {
  router.back();
};

// 组件挂载时获取数据
onMounted(() => {
  fetchElementDetail();
});
</script>

<style scoped>
.element-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: calc(100vh - 60px);
}

.back-section {
  margin-bottom: 24px;
}

.back-button {
  font-size: 14px;
  color: #409eff;
}

.loading-container {
  padding: 40px 0;
}

.element-content {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.element-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.element-emoji {
  font-size: 64px;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 16px;
  flex-shrink: 0;
}

.element-info {
  flex: 1;
}

.element-name {
  font-size: 36px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 12px 0;
}

.element-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.element-type-tag {
  font-size: 14px;
  font-weight: 500;
}

.element-id {
  font-size: 14px;
  color: #909399;
}

.element-stats-section {
  margin-bottom: 40px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}


.not-found {
  padding: 80px 0;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .element-detail-page {
    padding: 16px;
  }

  .element-header {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .element-emoji {
    font-size: 48px;
    width: 80px;
    height: 80px;
  }

  .element-name {
    font-size: 28px;
  }

  .element-meta {
    justify-content: center;
  }


  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .element-content {
    padding: 20px;
  }

  .element-name {
    font-size: 24px;
  }
}
</style>
