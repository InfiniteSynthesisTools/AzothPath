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
          <el-card>
            <template #header>
              <h3>🖥️ 系统信息</h3>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="操作系统">{{ systemInfo.os.platform }}</el-descriptions-item>
              <el-descriptions-item label="系统版本">{{ systemInfo.os.version }}</el-descriptions-item>
              <el-descriptions-item label="主机名">{{ systemInfo.os.hostname }}</el-descriptions-item>
              <el-descriptions-item label="架构">{{ systemInfo.os.arch }}</el-descriptions-item>
              <el-descriptions-item label="Node.js版本">{{ systemInfo.node.version }}</el-descriptions-item>
              <el-descriptions-item label="启动时间">{{ formatDateTime(systemInfo.startTime) }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <!-- 内存详情 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <h3>💾 内存详情</h3>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="总内存">{{ formatBytes(systemInfo.memory.total) }}</el-descriptions-item>
              <el-descriptions-item label="已使用">{{ formatBytes(systemInfo.memory.used) }}</el-descriptions-item>
              <el-descriptions-item label="可用内存">{{ formatBytes(systemInfo.memory.free) }}</el-descriptions-item>
              <el-descriptions-item label="缓存">{{ formatBytes(systemInfo.memory.cached) }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 磁盘信息 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <h3>💿 磁盘信息</h3>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="磁盘路径">{{ systemInfo.disk.path || '未知' }}</el-descriptions-item>
              <el-descriptions-item label="总容量">{{ formatBytes(systemInfo.disk.total) }}</el-descriptions-item>
              <el-descriptions-item label="已使用">{{ formatBytes(systemInfo.disk.used) }}</el-descriptions-item>
              <el-descriptions-item label="可用空间">{{ formatBytes(systemInfo.disk.free) }}</el-descriptions-item>
              <el-descriptions-item label="使用率">{{ systemInfo.disk.usage }}%</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <!-- API状态 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <h3>🌐 API状态</h3>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="API状态">
                <el-tag :type="apiStatus.healthy ? 'success' : 'danger'">
                  {{ apiStatus.healthy ? '正常' : '异常' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="响应时间">{{ apiStatus.responseTime }}ms</el-descriptions-item>
              <el-descriptions-item label="请求总数">{{ apiStatus.totalRequests }}</el-descriptions-item>
              <el-descriptions-item label="错误率">{{ apiStatus.errorRate }}%</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 实时监控图表 -->
    <div class="monitoring-charts">
      <el-row :gutter="20">
        <el-col :span="24">
          <el-card>
            <template #header>
              <div class="section-header">
                <h3>📊 实时监控</h3>
                <el-button type="primary" @click="toggleMonitoring">
                  {{ monitoring ? '停止监控' : '开始监控' }}
                </el-button>
              </div>
            </template>
            <div class="chart-container">
              <div v-if="!monitoring" class="chart-placeholder">
                <el-icon size="48"><TrendCharts /></el-icon>
                <p>点击"开始监控"查看实时数据</p>
                <p class="chart-desc">CPU、内存、API响应时间趋势图</p>
              </div>
              <div v-else class="monitoring-data">
                <div class="monitoring-stats">
                  <div class="stat-item">
                    <span class="stat-label">CPU使用率:</span>
                    <span class="stat-value">{{ systemInfo.cpu.usage }}%</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">内存使用率:</span>
                    <span class="stat-value">{{ systemInfo.memory.usage }}%</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">API响应时间:</span>
                    <span class="stat-value">{{ apiStatus.responseTime }}ms</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">最后更新:</span>
                    <span class="stat-value">{{ lastUpdateTime }}</span>
                  </div>
                </div>
                <div class="monitoring-log">
                  <h4>监控日志</h4>
                  <div class="log-container">
                    <div v-for="(log, index) in monitoringLogs" :key="index" class="log-item">
                      <span class="log-time">{{ log.time }}</span>
                      <span class="log-message">{{ log.message }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Cpu, Monitor, Folder, Timer, TrendCharts } from '@element-plus/icons-vue';
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
  uptime: 0,
  startTime: ''
});

const apiStatus = ref({
  healthy: true,
  responseTime: 0,
  totalRequests: 0,
  errorRate: 0
});

const monitoring = ref(false);
let monitoringInterval: NodeJS.Timeout | null = null;
const lastUpdateTime = ref('');
const monitoringLogs = ref<Array<{ time: string; message: string }>>([]);

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
    
    // 添加监控日志
    if (monitoring.value) {
      addMonitoringLog(`系统信息已更新 - CPU: ${response.cpu.usage}%, 内存: ${response.memory.usage}%`);
    }
  } catch (error) {
    console.error('获取系统信息失败:', error);
    ElMessage.error('获取系统信息失败');
    
    if (monitoring.value) {
      addMonitoringLog(`获取系统信息失败: ${error}`);
    }
  }
};


const checkApiStatus = async () => {
  try {
    const startTime = Date.now();
    const response = await fetch('/health');
    const responseTime = Date.now() - startTime;
    
    apiStatus.value = {
      healthy: response.ok,
      responseTime,
      totalRequests: Math.floor(Math.random() * 10000) + 1000, // 模拟数据
      errorRate: Math.round(Math.random() * 5 * 10) / 10 // 模拟数据
    };
  } catch (error) {
    apiStatus.value = {
      healthy: false,
      responseTime: 0,
      totalRequests: 0,
      errorRate: 100
    };
  }
};

const addMonitoringLog = (message: string) => {
  const now = new Date();
  const time = now.toLocaleTimeString();
  monitoringLogs.value.unshift({ time, message });
  
  // 限制日志数量，只保留最近20条
  if (monitoringLogs.value.length > 20) {
    monitoringLogs.value = monitoringLogs.value.slice(0, 20);
  }
};

const toggleMonitoring = () => {
  monitoring.value = !monitoring.value;
  
  if (monitoring.value) {
    startMonitoring();
    addMonitoringLog('开始实时监控');
  } else {
    stopMonitoring();
    addMonitoringLog('停止实时监控');
  }
};

const startMonitoring = () => {
  monitoringInterval = setInterval(() => {
    refreshSystemInfo();
  }, 5000); // 每5秒刷新一次
};

const stopMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 生命周期
onMounted(() => {
  refreshSystemInfo();
});

onUnmounted(() => {
  stopMonitoring();
});
</script>

<style scoped>
.system-details {
  padding: 20px;
}

.system-overview {
  margin-bottom: 30px;
}

.system-info {
  margin-bottom: 30px;
}

.monitoring-charts {
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
}

.chart-container {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.chart-placeholder {
  text-align: center;
  color: #909399;
}

.chart-desc {
  font-size: 14px;
  margin-top: 10px;
}

.monitoring-data {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.monitoring-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.stat-label {
  font-weight: 500;
  color: #606266;
}

.stat-value {
  font-weight: bold;
  color: #303133;
  font-size: 16px;
}

.monitoring-log {
  flex: 1;
  min-height: 200px;
}

.monitoring-log h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 16px;
}

.log-container {
  height: 200px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 10px;
  background-color: #fafafa;
}

.log-item {
  display: flex;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: #909399;
  min-width: 80px;
  font-family: monospace;
}

.log-message {
  color: #606266;
  flex: 1;
}
</style>
