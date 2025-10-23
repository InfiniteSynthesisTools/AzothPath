/**
 * 外部API配置
 * 统一管理所有外部API的配置
 */

export interface ApiConfig {
  validationApiUrl: string;
  timeout: number;
  retryCount: number;
  rateLimitInterval: number; // API请求最小间隔（毫秒）
  headers: Record<string, string>;
}

/**
 * 获取API配置
 */
export function getApiConfig(): ApiConfig {
  return {
    // 外部验证API配置
    // 新版API: https://hc.tsdo.in/api/check?itemA={A}&itemB={B}&result={C}
    validationApiUrl: process.env.VALIDATION_API_URL || 'https://hc.tsdo.in/api/check',
    
    // 请求配置
    timeout: parseInt(process.env.API_TIMEOUT || '5000'),
    retryCount: parseInt(process.env.API_RETRY_COUNT || '3'),
    
    // 限速配置：API请求最小间隔（毫秒）
    // 默认0ms，可通过环境变量 API_RATE_LIMIT_INTERVAL 调整
    rateLimitInterval: parseInt(process.env.API_RATE_LIMIT_INTERVAL || '0'),
    
    // 请求头配置
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'AzothPath/1.0',
      'Content-Type': 'application/json'
    }
  };
}

/**
 * 验证API配置
 */
export function validateApiConfig(): void {
  const config = getApiConfig();
  
  if (!config.validationApiUrl) {
    throw new Error('VALIDATION_API_URL 环境变量未设置');
  }
  
  try {
    new URL(config.validationApiUrl);
  } catch (error) {
    throw new Error(`无效的 VALIDATION_API_URL: ${config.validationApiUrl}`);
  }
  
  if (config.timeout <= 0) {
    throw new Error('API_TIMEOUT 必须大于0');
  }
  
  if (config.retryCount < 0) {
    throw new Error('API_RETRY_COUNT 不能为负数');
  }
  
  if (config.rateLimitInterval < 0) {
    throw new Error('API_RATE_LIMIT_INTERVAL 不能为负数');
  }
}

// 懒加载配置（确保环境变量已加载）
let _apiConfig: ApiConfig | null = null;
export const apiConfig = new Proxy({} as ApiConfig, {
  get(target, prop) {
    if (!_apiConfig) {
      _apiConfig = getApiConfig();
    }
    return _apiConfig[prop as keyof ApiConfig];
  }
});
