// User 相关类型定义

export interface User {
  id: number;
  name: string;
  auth: number;          // 1: 普通用户, 9: 管理员
  contribute: number;    // 累积贡献分
  level: number;         // 用户等级
  emoji: string | null;  // Emoji 头像
  created_at: string;
}

export interface LoginForm {
  username: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ContributionRankResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}
