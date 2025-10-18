import request from '@/utils/request';
import type {
  User,
  LoginForm,
  RegisterForm,
  LoginResponse,
  ContributionRankResponse
} from '@/types';

export const userApi = {
  // 用户登录
  login(data: LoginForm) {
    return request.post<LoginResponse>('/users/login', data);
  },

  // 用户注册
  register(data: RegisterForm) {
    return request.post<LoginResponse>('/users/register', data);
  },

  // 获取当前用户信息
  getCurrentUser() {
    return request.get<User>('/users/me');
  },

  // 获取用户信息
  getUser(id: number) {
    return request.get<User>(`/users/${id}`);
  },

  // 更新用户信息
  updateUser(id: number, data: Partial<User>) {
    return request.put<User>(`/users/${id}`, data);
  },

  // 获取贡献榜
  getContributionRank(params: { page?: number; limit?: number; period?: 'total' | 'month' | 'week' } = {}) {
    return request.get<ContributionRankResponse>('/users/contribution-rank', { params });
  },

  // 获取用户的贡献配方
  getUserRecipes(userId: number, params: { page?: number; limit?: number } = {}) {
    return request.get<{ recipes: any[]; total: number }>(`/users/${userId}/recipes`, { params });
  }
};
