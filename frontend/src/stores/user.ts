import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { userApi } from '@/api';
import { setToken, setUser, getToken, getUser, clearAuth } from '@/utils/auth';
import type { User, LoginForm, RegisterForm } from '@/types';

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref<string | null>(getToken());
  const userInfo = ref<User | null>(getUser());
  const loading = ref(false);

  // 计算属性
  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => userInfo.value?.auth === 9);

  // 登录
  const login = async (form: LoginForm) => {
    loading.value = true;
    try {
      const data = await userApi.login(form);
      token.value = data.token;
      userInfo.value = data.user;
      setToken(data.token);
      setUser(data.user);
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 注册
  const register = async (form: RegisterForm) => {
    loading.value = true;
    try {
      const data = await userApi.register(form);
      token.value = data.token;
      userInfo.value = data.user;
      setToken(data.token);
      setUser(data.user);
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 退出登录
  const logout = () => {
    token.value = null;
    userInfo.value = null;
    clearAuth();
  };

  // 刷新用户信息
  const refreshUserInfo = async () => {
    if (!token.value) return;
    
    try {
      const data = await userApi.getCurrentUser();
      userInfo.value = data;
      setUser(data);
      return data;
    } catch (error) {
      // 如果刷新失败（比如 token 过期），清除认证信息
      logout();
      throw error;
    }
  };

  // 初始化（从 localStorage 恢复状态）
  const init = () => {
    token.value = getToken();
    userInfo.value = getUser();
  };

  return {
    // 状态
    token,
    userInfo,
    loading,
    // 计算属性
    isLoggedIn,
    isAdmin,
    // 方法
    login,
    register,
    logout,
    refreshUserInfo,
    init
  };
});
