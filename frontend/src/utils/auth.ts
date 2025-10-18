import type { User } from '@/types';

// 存储 token
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

// 获取 token
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// 移除 token
export const removeToken = (): void => {
  localStorage.removeItem('token');
};

// 存储用户信息
export const setUser = (user: User): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

// 获取用户信息
export const getUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr) as User;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// 移除用户信息
export const removeUser = (): void => {
  localStorage.removeItem('user');
};

// 清除所有认证信息
export const clearAuth = (): void => {
  removeToken();
  removeUser();
};

// 检查是否已登录
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// 检查是否是管理员
export const isAdmin = (): boolean => {
  const user = getUser();
  return user?.auth === 9;
};
