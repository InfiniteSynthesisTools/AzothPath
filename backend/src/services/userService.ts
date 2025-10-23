import { database } from '../database/connection';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middlewares/auth';
import { getCurrentUTC8TimeForDB, convertUTCToUTC8ForDB } from '../utils/timezone';

// 用户完整信息（包含密码）
export interface User {
  id: number;
  name: string;
  psw: string;
  auth: number;  // 1=普通用户, 9=管理员
  contribute: number;
  level: number;
  emoji: string | null;
  created_at: string;
}

// 用户公开信息（不含密码）
export interface UserPublic {
  id: number;
  name: string;
  auth: number;  // 1=普通用户, 9=管理员
  contribute: number;
  level: number;
  emoji: string | null;
  created_at: string;
}

export interface LoginResult {
  token: string;
  user: UserPublic;
}

/**
 * 将数据库 User 转换为公开的 UserPublic（去除密码）
 */
function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    name: user.name,
    auth: user.auth,
    contribute: user.contribute,
    level: user.level,
    emoji: user.emoji ?? null,
    created_at: convertUTCToUTC8ForDB(new Date(user.created_at))
  };
}

/**
 * 转换数据库时间字段为UTC+8格式
 */
function convertDBTimeToUTC8(dbTime: string): string {
  return convertUTCToUTC8ForDB(new Date(dbTime));
}

export class UserService {
  /**
   * 用户注册
   */
  async register(username: string, password: string): Promise<LoginResult> {
    // 检查用户名是否已存在
    const existingUser = await database.get<User>(
      'SELECT * FROM user WHERE name = ?',
      [username]
    );

    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 随机分配一个emoji头像
    // 为避免循环依赖，仅在此处动态导入工具
    const { randomUserEmoji } = await import('../utils/emoji');
    const emoji = randomUserEmoji();

    // 插入新用户（带 emoji）
    const result = await database.run(
      'INSERT INTO user (name, psw, auth, contribute, level, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, 1, 0, 1, emoji, getCurrentUTC8TimeForDB()]  // auth=1 表示普通用户
    );

    // 生成 token
    const token = generateToken(result.lastID, 'user');

    return {
      token,
      user: {
        id: result.lastID,
        name: username,
        auth: 1,  // 普通用户
        contribute: 0,
        level: 1,
        emoji,
        created_at: getCurrentUTC8TimeForDB()
      }
    };
  }

  /**
   * 用户登录
   */
  async login(username: string, password: string): Promise<LoginResult> {
    // 查找用户
    const user = await database.get<User>(
      'SELECT * FROM user WHERE name = ?',
      [username]
    );

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.psw);
    if (!isValid) {
      throw new Error('用户名或密码错误');
    }

    // 生成 token (auth: 1=user, 9=admin)
    const role = user.auth === 9 ? 'admin' : 'user';
    const token = generateToken(user.id, role);

    return {
      token,
      user: toUserPublic(user)
    };
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: number): Promise<UserPublic> {
    const user = await database.get<User>(
      'SELECT * FROM user WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new Error('用户不存在');
    }

    return toUserPublic(user);
  }

  /**
   * 获取特定用户信息（公开信息）
   */
  async getUserById(userId: number): Promise<UserPublic> {
    const user = await database.get<User>(
      'SELECT * FROM user WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new Error('用户不存在');
    }

    return toUserPublic(user);
  }

  /**
   * 获取贡献榜（实时计算）
   */
  async getContributionRank(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    // 查询用户基本信息和贡献分，按贡献分降序排列
    const users = await database.all<UserPublic>(
      `SELECT 
         u.id, 
         u.name, 
         u.auth, 
         u.contribute, 
         u.level,
         u.emoji,
         u.created_at,
         (SELECT COUNT(*) FROM recipes WHERE user_id = u.id) as recipe_count,
         (SELECT COUNT(DISTINCT i.id) 
          FROM items i 
          INNER JOIN recipes r ON (r.item_a = i.name OR r.item_b = i.name OR r.result = i.name)
          WHERE r.user_id = u.id) as item_count
       FROM user u
       WHERE 1=1
       ORDER BY u.contribute DESC, u.created_at ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // 获取总数
    const totalResult = await database.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM user'
    );

    return {
      users,
      total: totalResult?.count || 0,
      page,
      limit
    };
  }

  /**
   * 获取用户详细贡献统计
   */
  async getUserContributionStats(userId: number) {
    const user = await database.get<UserPublic>(
      'SELECT id, name, auth, contribute, level, created_at FROM user WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new Error('用户不存在');
    }

    // 转换时间为UTC+8
    user.created_at = convertDBTimeToUTC8(user.created_at);

    // 获取用户提交的配方数量
    const recipeCount = await database.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM recipes WHERE user_id = ?',
      [userId]
    );

    // 获取用户发现的新物品数量
    const itemCount = await database.get<{ count: number }>(
      `SELECT COUNT(DISTINCT i.id) as count
       FROM items i 
       INNER JOIN recipes r ON (r.item_a = i.name OR r.item_b = i.name OR r.result = i.name)
       WHERE r.user_id = ?`,
      [userId]
    );

    // 获取用户完成的任务数量
    const taskCount = await database.get<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM task 
       WHERE completed_by_recipe_id IN (SELECT id FROM recipes WHERE user_id = ?)`,
      [userId]
    );

    return {
      user,
      stats: {
        total_contribution: user.contribute,
        recipe_count: recipeCount?.count || 0,
        item_count: itemCount?.count || 0,
        task_completed: taskCount?.count || 0
      }
    };
  }

  /**
   * 获取用户点赞的配方列表
   */
  async getUserLikedRecipes(userId: number, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    // 检查用户是否存在
    const user = await database.get<UserPublic>(
      'SELECT id FROM user WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new Error('用户不存在');
    }

    // 查询用户点赞的配方
    const recipes = await database.all<any>(`
      SELECT 
        r.id,
        r.item_a,
        r.item_b,
        r.result,
        r.user_id,
        r.likes,
        r.created_at,
        u.name as creator_name,
        rl.created_at as liked_at
      FROM recipe_likes rl
      INNER JOIN recipes r ON rl.recipe_id = r.id
      INNER JOIN user u ON r.user_id = u.id
      WHERE rl.user_id = ?
      ORDER BY rl.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    // 获取总数
    const totalResult = await database.get<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM recipe_likes 
      WHERE user_id = ?
    `, [userId]);

    return {
      recipes,
      total: totalResult?.count || 0,
      page,
      limit
    };
  }

  /**
   * 增加用户贡献度
   */
  async incrementContribution(userId: number, amount: number = 1): Promise<void> {
    await database.run(
      'UPDATE user SET contribute = contribute + ? WHERE id = ?',
      [amount, userId]
    );
  }

  /**
   * 获取所有用户列表（管理员功能）
   */
  async getAllUsers(page: number = 1, limit: number = 20, search?: string, roleFilter?: string) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    // 搜索条件
    if (search) {
      whereClause += ' AND u.name LIKE ?';
      params.push(`%${search}%`);
    }

    // 角色过滤
    if (roleFilter) {
      whereClause += ' AND u.auth = ?';
      params.push(parseInt(roleFilter));
    }

    // 查询用户列表
    const users = await database.all<any>(
      `SELECT 
        u.id, 
        u.name, 
        u.auth, 
        u.contribute, 
        u.level,
        u.emoji,
        u.created_at,
        (SELECT COUNT(*) FROM recipes WHERE user_id = u.id) as recipe_count,
        (SELECT COUNT(DISTINCT i.id) 
         FROM items i 
         INNER JOIN recipes r ON (r.item_a = i.name OR r.item_b = i.name OR r.result = i.name)
         WHERE r.user_id = u.id) as item_count
      FROM user u
      ${whereClause}
      ORDER BY u.contribute DESC, u.created_at ASC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // 获取总数
    const totalResult = await database.get<{ count: number }>(`
      SELECT COUNT(*) as count FROM user u ${whereClause}
    `, params);

    return {
      users,
      total: totalResult?.count || 0,
      page,
      limit
    };
  }

  /**
   * 更新用户权限（管理员功能）
   */
  async updateUserRole(userId: number, newRole: number): Promise<void> {
    if (newRole !== 1 && newRole !== 9) {
      throw new Error('无效的角色值，必须是 1（普通用户）或 9（管理员）');
    }

    const result = await database.run(
      'UPDATE user SET auth = ? WHERE id = ?',
      [newRole, userId]
    );

    if (result.changes === 0) {
      throw new Error('用户不存在');
    }
  }

  /**
   * 更新用户信息（管理员功能）
   */
  async updateUserInfo(userId: number, updates: {
    name?: string;
    contribute?: number;
    level?: number;
    auth?: number;
    emoji?: string;
    created_at?: string;
  }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      // 检查用户名是否已存在
      if (updates.name) {
        const existingUser = await database.get<User>(
          'SELECT id FROM user WHERE name = ? AND id != ?',
          [updates.name, userId]
        );
        if (existingUser) {
          throw new Error('用户名已存在');
        }
      }
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.contribute !== undefined) {
      fields.push('contribute = ?');
      values.push(updates.contribute);
    }

    if (updates.level !== undefined) {
      fields.push('level = ?');
      values.push(updates.level);
    }

    if (updates.auth !== undefined) {
      if (updates.auth !== 1 && updates.auth !== 9) {
        throw new Error('无效的角色值，必须是 1（普通用户）或 9（管理员）');
      }
      fields.push('auth = ?');
      values.push(updates.auth);
    }

    if (updates.emoji !== undefined) {
      fields.push('emoji = ?');
      values.push(updates.emoji);
    }

    if (updates.created_at !== undefined) {
      // 验证日期格式
      const date = new Date(updates.created_at);
      if (isNaN(date.getTime())) {
        throw new Error('无效的日期格式');
      }
      fields.push('created_at = ?');
      values.push(updates.created_at);
    }

    if (fields.length === 0) {
      throw new Error('没有提供要更新的字段');
    }

    values.push(userId);

    const result = await database.run(
      `UPDATE user SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      throw new Error('用户不存在');
    }
  }

  /**
   * 删除用户（管理员功能）
   */
  async deleteUser(userId: number): Promise<void> {
    // 检查用户是否存在
    const user = await database.get<User>('SELECT id FROM user WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 开始事务
    await database.transaction(async (db) => {
      // 删除用户相关的点赞记录
      await db.run('DELETE FROM recipe_likes WHERE user_id = ?', [userId]);
      
      // 删除用户提交的配方
      await db.run('DELETE FROM recipes WHERE user_id = ?', [userId]);
      
      // 删除用户相关的任务
      await db.run('DELETE FROM task WHERE created_by_user_id = ?', [userId]);
      
      // 删除用户相关的导入任务
      await db.run('DELETE FROM import_tasks WHERE user_id = ?', [userId]);
      
      // 删除用户相关的通知
      await db.run('DELETE FROM notifications WHERE sender_id = ?', [userId]);
      await db.run('DELETE FROM user_notifications WHERE user_id = ?', [userId]);
      
      // 最后删除用户
      await db.run('DELETE FROM user WHERE id = ?', [userId]);
    });
  }

  /**
   * 获取用户总数（管理员功能）
   */
  async getUserCount(): Promise<number> {
    const result = await database.get<{ count: number }>('SELECT COUNT(*) as count FROM user');
    return result?.count || 0;
  }
}

export const userService = new UserService();
