import { database } from '../database/connection';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middlewares/auth';

// 用户完整信息（包含密码）
export interface User {
  id: number;
  name: string;
  psw: string;
  auth: number;  // 1=普通用户, 9=管理员
  contribute: number;
  level: number;
  created_at: string;
}

// 用户公开信息（不含密码）
export interface UserPublic {
  id: number;
  name: string;
  auth: number;  // 1=普通用户, 9=管理员
  contribute: number;
  level: number;
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
    created_at: user.created_at
  };
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

    // 插入新用户
    const result = await database.run(
      'INSERT INTO user (name, psw, auth, contribute) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, 1, 0]  // auth=1 表示普通用户
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
        created_at: new Date().toISOString()
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
         u.created_at,
         (SELECT COUNT(*) FROM recipes WHERE user_id = u.id) as recipe_count,
         (SELECT COUNT(DISTINCT i.id) 
          FROM items i 
          INNER JOIN recipes r ON (r.item_a = i.name OR r.item_b = i.name OR r.result = i.name)
          WHERE r.user_id = u.id) as item_count
       FROM user u
       WHERE u.contribute > 0
       ORDER BY u.contribute DESC, u.created_at ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // 获取总数
    const totalResult = await database.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM user WHERE contribute > 0'
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
}

export const userService = new UserService();
