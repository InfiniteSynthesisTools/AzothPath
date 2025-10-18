import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;
    
    // 如果后端返回的是标准格式 { code, message, data }
    if (data.code !== undefined) {
      // 2xx 状态码都视为成功
      if (data.code >= 200 && data.code < 300) {
        // 返回内层 data，如果不存在则返回整个响应
        return data.data !== undefined ? data.data : data;
      } else {
        ElMessage.error(data.message || '请求失败');
        return Promise.reject(new Error(data.message || '请求失败'));
      }
    }
    
    // 直接返回数据
    return data;
  },
  (error) => {
    console.error('响应错误:', error);
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          ElMessage.error('未登录或登录已过期，请重新登录');
          // 清除 token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // 跳转到登录页
          window.location.href = '/login';
          break;
        case 403:
          ElMessage.error('没有权限访问该资源');
          break;
        case 404:
          ElMessage.error('请求的资源不存在');
          break;
        case 500:
          ElMessage.error('服务器错误，请稍后重试');
          break;
        default:
          ElMessage.error(data?.message || '请求失败');
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接');
    } else {
      ElMessage.error('请求配置错误');
    }
    
    return Promise.reject(error);
  }
);

// 类型安全的包装器
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 导出类型安全的请求方法
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return request.get(url, config);
  },
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return request.post(url, data, config);
  },
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return request.put(url, data, config);
  },
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return request.delete(url, config);
  }
};

export default request;
