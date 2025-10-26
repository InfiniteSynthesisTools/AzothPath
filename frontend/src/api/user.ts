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

  // 更新当前用户头像
  updateUserAvatar(emoji: string) {
    return request.put<User>('/users/me/avatar', { emoji });
  },

  // 获取用户发现的元素列表
  getUserDiscoveredItems(userId: number, params: { page?: number; limit?: number } = {}) {
    return request.get<{ items: any[]; total: number; page: number; limit: number }>(`/users/${userId}/discovered-items`, { params });
  },

  // 获取贡献榜
  getContributionRank(params: { page?: number; limit?: number; period?: 'total' | 'month' | 'week' } = {}) {
    return request.get<ContributionRankResponse>('/users/contribution-rank', { params });
  },

  // 获取用户的贡献配方
  getUserRecipes(userId: number, params: { page?: number; limit?: number } = {}) {
    return request.get<{ recipes: any[]; total: number }>(`/users/${userId}/recipes`, { params });
  },

  // 获取用户点赞的配方
  getLikedRecipes(userId: number, params: { page?: number; limit?: number } = {}) {
    return request.get<{ recipes: any[]; total: number }>(`/users/${userId}/liked-recipes`, { params });
  },

  // 获取用户统计信息
  getUserStats(userId: number) {
    return request.get<{ stats: any }>(`/users/${userId}/stats`);
  },

  // ==================== 管理员功能 ====================

  // 获取所有用户列表（管理员功能）
  getAllUsers(params: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    role?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) {
    return request.get<{
      users: User[];
      total: number;
      page: number;
      limit: number;
    }>('/users/admin/list', { params });
  },

  // 更新用户权限（管理员功能）
  updateUserRole(userId: number, role: number) {
    return request.put<{ userId: number; newRole: number }>(`/users/admin/${userId}/role`, { role });
  },

  // 更新用户信息（管理员功能）
  updateUserInfo(userId: number, updates: {
    name?: string;
    contribute?: number;
    level?: number;
    auth?: number;
    emoji?: string;
    created_at?: string;
  }) {
    return request.put<{ userId: number; updates: any }>(`/users/admin/${userId}`, updates);
  },

  // 删除用户（管理员功能）
  deleteUser(userId: number) {
    return request.delete<{ userId: number }>(`/users/admin/${userId}`);
  },

  // 修改用户密码（管理员功能）
  updateUserPassword(userId: number, newPassword: string) {
    return request.put<{ userId: number }>(`/users/admin/${userId}/password`, { newPassword });
  },

  // 获取用户总数（管理员功能）
  getUserCount() {
    return request.get<{ total_users: number }>('/users/admin/count');
  }
};
