import { database } from '../database/connection';
import { logger } from '../utils/logger';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';

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

export interface CreateNotificationParams {
  title: string;
  content: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  target_user_id?: number | null;
  created_by_user_id: number;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  type?: string;
  target_user_id?: number | null;
  is_read?: number;
  is_active?: number;
}

export class NotificationService {
  /**
   * 创建通知
   */
  async createNotification(params: CreateNotificationParams): Promise<number> {
    const { title, content, type = 'info', target_user_id = null, created_by_user_id } = params;

    // 如果是全体用户通知，获取用户总数
    let totalTargetCount = 0;
    if (target_user_id === null) {
      const userCountResult = await database.get<{ count: number }>('SELECT COUNT(*) as count FROM user');
      totalTargetCount = userCountResult?.count || 0;
    } else {
      totalTargetCount = 1; // 单个用户通知
    }

    const result = await database.run(
      'INSERT INTO notifications (title, content, type, target_user_id, created_by_user_id, read_count, total_target_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, content, type, target_user_id, created_by_user_id, 0, totalTargetCount, getCurrentUTC8TimeForDB(), getCurrentUTC8TimeForDB()]
    );

    logger.info(`通知创建成功: ${title} (ID: ${result.lastID})`);
    return result.lastID!;
  }

  /**
   * 获取通知列表
   */
  async getNotifications(params: NotificationListParams = {}): Promise<{ notifications: Notification[]; total: number }> {
    const { page = 1, limit = 20, type, target_user_id, is_read, is_active = 1 } = params;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM notifications WHERE is_active = ?';
    const sqlParams: any[] = [is_active];

    if (type !== undefined) {
      sql += ' AND type = ?';
      sqlParams.push(type);
    }

    if (target_user_id !== undefined) {
      if (target_user_id === null) {
        sql += ' AND target_user_id IS NULL';
      } else {
        sql += ' AND target_user_id = ?';
        sqlParams.push(target_user_id);
      }
    }

    if (is_read !== undefined) {
      sql += ' AND is_read = ?';
      sqlParams.push(is_read);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const notifications = await database.all<Notification>(sql, sqlParams);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as count FROM notifications WHERE is_active = ?';
    const countParams: any[] = [is_active];

    if (type !== undefined) {
      countSql += ' AND type = ?';
      countParams.push(type);
    }

    if (target_user_id !== undefined) {
      if (target_user_id === null) {
        countSql += ' AND target_user_id IS NULL';
      } else {
        countSql += ' AND target_user_id = ?';
        countParams.push(target_user_id);
      }
    }

    if (is_read !== undefined) {
      countSql += ' AND is_read = ?';
      countParams.push(is_read);
    }

    const totalResult = await database.get<{ count: number }>(countSql, countParams);

    return {
      notifications,
      total: totalResult?.count || 0
    };
  }

  /**
   * 获取用户通知（包括全体通知）
   */
  async getUserNotifications(userId: number, params: {
    page?: number;
    limit?: number;
    is_read?: number;
  } = {}): Promise<{ notifications: Notification[]; total: number }> {
    const { page = 1, limit = 20, is_read } = params;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT * FROM notifications 
      WHERE is_active = 1 AND (target_user_id = ? OR target_user_id IS NULL)
    `;
    const sqlParams: any[] = [userId];

    if (is_read !== undefined) {
      sql += ' AND is_read = ?';
      sqlParams.push(is_read);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const notifications = await database.all<Notification>(sql, sqlParams);

    // 获取总数
    let countSql = `
      SELECT COUNT(*) as count FROM notifications 
      WHERE is_active = 1 AND (target_user_id = ? OR target_user_id IS NULL)
    `;
    const countParams: any[] = [userId];

    if (is_read !== undefined) {
      countSql += ' AND is_read = ?';
      countParams.push(is_read);
    }

    const totalResult = await database.get<{ count: number }>(countSql, countParams);

    return {
      notifications,
      total: totalResult?.count || 0
    };
  }

  /**
   * 获取通知详情
   */
  async getNotificationById(id: number): Promise<Notification | null> {
    const result = await database.get<Notification>(
      'SELECT * FROM notifications WHERE id = ?',
      [id]
    );
    return result || null;
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(id: number, userId: number): Promise<void> {
    // 验证通知是否存在且属于该用户
    const notification = await this.getNotificationById(id);
    if (!notification) {
      throw new Error('通知不存在');
    }

    if (notification.target_user_id !== null && notification.target_user_id !== userId) {
      throw new Error('没有权限操作此通知');
    }

    if (notification.target_user_id === null) {
      // 全体用户通知 - 检查是否已经标记为已读
      if (notification.is_read === 1) {
        // 已经标记为已读，不需要重复操作
        return;
      }
      
      // 更新 read_count 和 is_read
      await database.run(
        'UPDATE notifications SET read_count = read_count + 1, is_read = 1, updated_at = ? WHERE id = ?',
        [getCurrentUTC8TimeForDB(), id]
      );
    } else {
      // 单个用户通知 - 检查是否已经标记为已读
      if (notification.is_read === 1) {
        // 已经标记为已读，不需要重复操作
        return;
      }
      
      // 更新 is_read
      await database.run(
        'UPDATE notifications SET is_read = 1, updated_at = ? WHERE id = ?',
        [getCurrentUTC8TimeForDB(), id]
      );
    }

    logger.info(`通知 ${id} 已标记为已读`);
  }

  /**
   * 删除通知（软删除）
   */
  async deleteNotification(id: number, userId: number): Promise<void> {
    // 验证通知是否存在且属于该用户
    const notification = await this.getNotificationById(id);
    if (!notification) {
      throw new Error('通知不存在');
    }

    if (notification.target_user_id !== null && notification.target_user_id !== userId) {
      throw new Error('没有权限删除此通知');
    }

    await database.run(
      'UPDATE notifications SET is_active = 0, updated_at = ? WHERE id = ?',
      [getCurrentUTC8TimeForDB(), id]
    );

    logger.info(`通知 ${id} 已删除`);
  }

  /**
   * 管理员删除通知
   */
  async adminDeleteNotification(id: number): Promise<void> {
    const notification = await this.getNotificationById(id);
    if (!notification) {
      throw new Error('通知不存在');
    }

    await database.run(
      'UPDATE notifications SET is_active = 0, updated_at = ? WHERE id = ?',
      [getCurrentUTC8TimeForDB(), id]
    );

    logger.info(`管理员删除了通知 ${id}`);
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: number): Promise<number> {
    const result = await database.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE is_active = 1 AND is_read = 0 AND (target_user_id = ? OR target_user_id IS NULL)`,
      [userId]
    );
    return result?.count || 0;
  }

  /**
   * 批量标记为已读
   */
  async markAllAsRead(userId: number): Promise<void> {
    await database.run(
      `UPDATE notifications SET is_read = 1, updated_at = ? 
       WHERE is_active = 1 AND is_read = 0 AND (target_user_id = ? OR target_user_id IS NULL)`,
      [getCurrentUTC8TimeForDB(), userId]
    );

    logger.info(`用户 ${userId} 的所有通知已标记为已读`);
  }
}

export const notificationService = new NotificationService();
