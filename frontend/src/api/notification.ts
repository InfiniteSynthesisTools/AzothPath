import { api } from '@/utils/request';

export interface Notification {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  target_user_id: number | null;
  is_read: number;
  is_active: number;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationRequest {
  title: string;
  content: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  target_user_id?: number | null;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  type?: string;
  target_user_id?: number | null;
  is_read?: number;
  is_active?: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
}

export const notificationApi = {
  // 获取用户通知列表
  getNotifications(params: NotificationListParams = {}): Promise<NotificationListResponse> {
    return api.get<NotificationListResponse>('/notifications', { params });
  },

  // 获取未读通知数量
  getUnreadCount(): Promise<{ count: number }> {
    return api.get<{ count: number }>('/notifications/unread-count');
  },

  // 获取通知详情
  getNotificationById(id: number): Promise<Notification> {
    return api.get<Notification>(`/notifications/${id}`);
  },

  // 标记通知为已读
  markAsRead(id: number): Promise<void> {
    return api.patch<void>(`/notifications/${id}/read`);
  },

  // 标记所有通知为已读
  markAllAsRead(): Promise<void> {
    return api.patch<void>('/notifications/read-all');
  },

  // 删除通知
  deleteNotification(id: number): Promise<void> {
    return api.delete<void>(`/notifications/${id}`);
  },

  // 创建通知（管理员）
  createNotification(data: CreateNotificationRequest): Promise<{ id: number }> {
    return api.post<{ id: number }>('/notifications', data);
  },

  // 获取所有通知（管理员）
  getAdminNotifications(params: NotificationListParams = {}): Promise<NotificationListResponse> {
    return api.get<NotificationListResponse>('/notifications/admin/list', { params });
  },

  // 管理员删除通知
  adminDeleteNotification(id: number): Promise<void> {
    return api.delete<void>(`/notifications/admin/${id}`);
  }
};
