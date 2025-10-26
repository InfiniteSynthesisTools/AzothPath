<template>
  <div class="system-details">
    <!-- 系统概览 -->
    <div class="system-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic 
              :value="systemInfo.cpu.usage" 
              title="CPU使用率"
              suffix="%"
              :precision="1"
            >
              <template #prefix>
                <el-icon><Cpu /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic 
              :value="systemInfo.memory.usage" 
              title="内存使用率"
              suffix="%"
              :precision="1"
            >
              <template #prefix>
                <el-icon><Monitor /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic 
              :value="systemInfo.disk.usage" 
              title="磁盘使用率"
              suffix="%"
              :precision="1"
            >
              <template #prefix>
                <el-icon><Folder /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <el-statistic 
              :value="systemInfo.uptime" 
              title="运行时间"
              suffix="小时"
              :precision="1"
            >
              <template #prefix>
                <el-icon><Timer /></el-icon>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详细信息 -->
    <div class="system-info">
      <el-row :gutter="20">
        <!-- 系统信息 -->
        <el-col :span="12">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Monitor /></el-icon>
                <span class="header-title">系统信息</span>
              </div>
            </template>
            <div class="info-content">
              <div class="info-item">
                <span class="info-label">操作系统</span>
                <el-tag type="info" size="small">{{ systemInfo.os.platform }}</el-tag>
              </div>
              <div class="info-item">
                <span class="info-label">系统版本</span>
                <span class="info-value">{{ systemInfo.os.version }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">主机名</span>
                <span class="info-value">{{ systemInfo.os.hostname }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">架构</span>
                <span class="info-value">{{ systemInfo.os.arch }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Node.js版本</span>
                <el-tag type="success" size="small">{{ systemInfo.node.version }}</el-tag>
              </div>
              <div class="info-item">
                <span class="info-label">应用版本</span>
                <el-tag type="primary" size="small">{{ systemInfo.app.version }}</el-tag>
              </div>
              <div class="info-item">
                <span class="info-label">构建时间</span>
                <span class="info-value">{{ systemInfo.app.buildTime }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">启动时间</span>
                <span class="info-value">{{ formatDateTime(systemInfo.startTime) }}</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 内存详情 -->
        <el-col :span="12">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Monitor /></el-icon>
                <span class="header-title">内存详情</span>
              </div>
            </template>
            <div class="info-content">
              <div class="info-item">
                <span class="info-label">总内存</span>
                <span class="memory-value">{{ formatBytes(systemInfo.memory.total) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">已使用</span>
                <span class="memory-used">{{ formatBytes(systemInfo.memory.used) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">可用内存</span>
                <span class="memory-free">{{ formatBytes(systemInfo.memory.free) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">缓存</span>
                <span class="info-value">{{ formatBytes(systemInfo.memory.cached) }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="info-row">
        <!-- 磁盘信息 -->
        <el-col :span="12">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Folder /></el-icon>
                <span class="header-title">磁盘信息</span>
              </div>
            </template>
            <div class="info-content">
              <div class="info-item">
                <span class="info-label">磁盘路径</span>
                <span class="disk-path">{{ systemInfo.disk.path || '未知' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">总容量</span>
                <span class="disk-value">{{ formatBytes(systemInfo.disk.total) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">已使用</span>
                <span class="disk-used">{{ formatBytes(systemInfo.disk.used) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">可用空间</span>
                <span class="disk-free">{{ formatBytes(systemInfo.disk.free) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">使用率</span>
                <el-progress 
                  :percentage="systemInfo.disk.usage" 
                  :color="getUsageColor(systemInfo.disk.usage)"
                  :show-text="true"
                  :stroke-width="8"
                />
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- API状态 -->
        <el-col :span="12">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon class="header-icon"><Timer /></el-icon>
                <span class="header-title">API状态</span>
              </div>
            </template>
            <div class="info-content">
              <div class="info-item">
                <span class="info-label">API状态</span>
                <el-tag :type="apiStatus.healthy ? 'success' : 'danger'" size="small">
                  {{ apiStatus.healthy ? '正常' : '异常' }}
                </el-tag>
              </div>
              <div class="info-item">
                <span class="info-label">响应时间</span>
                <span class="response-time">{{ apiStatus.responseTime }}ms</span>
              </div>
              <div class="info-item">
                <span class="info-label">请求总数</span>
                <el-tag type="primary" size="small">{{ apiStatus.totalRequests }}</el-tag>
              </div>
              <div class="info-item">
                <span class="info-label">错误率</span>
                <el-tag :type="apiStatus.errorRate > 5 ? 'danger' : 'success'" size="small">
                  {{ apiStatus.errorRate }}%
                </el-tag>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Cpu, Monitor, Folder, Timer } from '@element-plus/icons-vue';
import { formatDateTime } from '@/utils/format';
import { systemApi } from '@/api';

// 响应式数据
const systemInfo = ref({
  cpu: {
    usage: 0,
    cores: 0,
    model: ''
  },
  memory: {
    total: 0,
    used: 0,
    free: 0,
    cached: 0,
    usage: 0
  },
  disk: {
    total: 0,
    used: 0,
    free: 0,
    usage: 0,
    path: ''
  },
  os: {
    platform: '',
    version: '',
    arch: '',
    hostname: ''
  },
  node: {
    version: '',
    uptime: 0
  },
  app: {
    version: '',
    buildTime: ''
  },
  uptime: 0,
  startTime: ''
});

const apiStatus = ref({
  healthy: true,
  responseTime: 0,
  totalRequests: 0,
  errorRate: 0
});

const lastUpdateTime = ref('');

// 方法
const refreshSystemInfo = async () => {
  try {
    // 获取真实系统信息
    const response = await systemApi.getSystemInfo();
    systemInfo.value = response as any;

    // 获取API状态
    await checkApiStatus();
    
    // 更新最后更新时间
    lastUpdateTime.value = new Date().toLocaleTimeString();
  } catch (error) {
    console.error('获取系统信息失败:', error);
    ElMessage.error('获取系统信息失败');
  }
};


const checkApiStatus = async () => {
  try {
    const startTime = Date.now();
    const response = await systemApi.getHealthStatus();
    const responseTime = Date.now() - startTime;
    
    apiStatus.value = {
      healthy: response.status === 'ok',
      responseTime,
      totalRequests: response.totalRequests || 0,
      errorRate: response.errorRate || 0
    };
  } catch (error) {
    console.error('检查API状态失败:', error);
    apiStatus.value = {
      healthy: false,
      responseTime: 0,
      totalRequests: 0,
      errorRate: 100
    };
  }
};


const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getUsageColor = (usage: number) => {
  if (usage < 50) return 'var(--color-success)';
  if (usage < 80) return 'var(--color-warning)';
  return 'var(--color-error)';
};

// 生命周期
onMounted(() => {
  refreshSystemInfo();
});

</script>

<style scoped>
.system-details {
  padding: 20px;
  background: var(--color-bg-secondary);
  min-height: 100vh;
}

.system-overview {
  margin-bottom: 30px;
}

.system-info {
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

/* 卡片头部样式 */
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.header-icon {
  font-size: 20px;
  color: var(--color-primary-500);
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-success));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.5px;
}

/* 信息卡片样式 */
.info-card {
  height: 100%;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-primary);
}

.info-card .el-card__body {
  padding: 20px;
}

/* 响应时间样式 */
.response-time {
  font-weight: 600;
  color: var(--color-success);
}

/* 内存和磁盘数值样式 */
.memory-value, .disk-value {
  font-weight: 600;
  color: var(--color-primary-500);
}

.memory-used, .disk-used {
  font-weight: 600;
  color: var(--color-warning);
}

.memory-free, .disk-free {
  font-weight: 600;
  color: var(--color-success);
}

.disk-path {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-text-tertiary);
  background-color: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 行间距优化 */
.info-row {
  margin-top: 20px;
}

/* 信息内容样式 */
.info-content {
  padding: 0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-primary);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.info-value {
  color: var(--color-text-primary);
  font-weight: 500;
}

/* 深色模式适配 */
[data-theme="dark"] .system-details {
  background: var(--color-bg-primary);
}

[data-theme="dark"] .info-card {
  background: var(--color-bg-surface);
  border-color: var(--color-border-primary);
}

[data-theme="dark"] .info-card .el-card__body {
  background: var(--color-bg-surface);
}

[data-theme="dark"] .info-item {
  border-bottom-color: var(--color-border-primary);
}

[data-theme="dark"] .disk-path {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}

</style>
