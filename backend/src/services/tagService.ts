import { database } from '../database/connection';
import { logger } from '../utils/logger';
import { getCurrentUTC8TimeForDB } from '../utils/timezone';

export interface Tag {
  id: number;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

export interface ItemTag {
  id: number;
  item_id: number;
  tag_id: number;
  created_at: string;
}

export interface ItemWithTags {
  id: number;
  name: string;
  emoji?: string;
  tags: Tag[];
}

export class TagService {
  /**
   * 获取所有标签
   */
  async getAllTags(): Promise<Tag[]> {
    const tags = await database.all<Tag>(
      'SELECT * FROM tags ORDER BY name ASC'
    );
    return tags as Tag[];
  }

  /**
   * 获取单个标签
   */
  async getTagById(tagId: number): Promise<Tag | null> {
    const tag = await database.get<Tag>(
      'SELECT * FROM tags WHERE id = ?',
      [tagId]
    );
    return tag || null;
  }

  /**
   * 创建标签（仅管理员）
   */
  async createTag(name: string, description?: string, color?: string): Promise<number> {
    // 检查标签名是否已存在
    const existing = await database.get<{ id: number }>(
      'SELECT id FROM tags WHERE name = ?',
      [name]
    );

    if (existing) {
      throw new Error('标签名已存在');
    }

    const result = await database.run(
      'INSERT INTO tags (name, description, color, created_at) VALUES (?, ?, ?, ?)',
      [name, description || null, color || null, getCurrentUTC8TimeForDB()]
    );

    logger.info(`标签创建成功: ${name}`);
    return result.lastID!;
  }

  /**
   * 更新标签（仅管理员）
   */
  async updateTag(tagId: number, updates: { name?: string; description?: string; color?: string }) {
    const tag = await this.getTagById(tagId);
    if (!tag) {
      throw new Error('标签不存在');
    }

    // 如果更新名称，检查是否重复
    if (updates.name && updates.name !== tag.name) {
      const existing = await database.get<{ id: number }>(
        'SELECT id FROM tags WHERE name = ? AND id != ?',
        [updates.name, tagId]
      );

      if (existing) {
        throw new Error('标签名已存在');
      }
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }

    if (fields.length === 0) {
      return; // 没有更新
    }

    values.push(tagId);

    await database.run(
      `UPDATE tags SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    logger.info(`标签更新成功: ${tagId}`);
  }

  /**
   * 删除标签（仅管理员）
   */
  async deleteTag(tagId: number) {
    // 删除标签关联
    await database.run(
      'DELETE FROM item_tags WHERE tag_id = ?',
      [tagId]
    );

    // 删除标签
    const result = await database.run(
      'DELETE FROM tags WHERE id = ?',
      [tagId]
    );

    if (result.changes === 0) {
      throw new Error('标签不存在');
    }

    logger.info(`标签删除成功: ${tagId}`);
  }

  /**
   * 为物品添加标签
   */
  async addTagToItem(itemId: number, tagId: number) {
    // 检查物品是否存在
    const item = await database.get<{ id: number }>(
      'SELECT id FROM items WHERE id = ?',
      [itemId]
    );

    if (!item) {
      throw new Error('物品不存在');
    }

    // 检查标签是否存在
    const tag = await this.getTagById(tagId);
    if (!tag) {
      throw new Error('标签不存在');
    }

    // 检查是否已关联
    const existing = await database.get<{ id: number }>(
      'SELECT id FROM item_tags WHERE item_id = ? AND tag_id = ?',
      [itemId, tagId]
    );

    if (existing) {
      throw new Error('标签已关联');
    }

    // 添加关联
    await database.run(
      'INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)',
      [itemId, tagId, getCurrentUTC8TimeForDB()]
    );

    logger.info(`物品${itemId}添加标签${tagId}`);
  }

  /**
   * 从物品移除标签
   */
  async removeTagFromItem(itemId: number, tagId: number) {
    const result = await database.run(
      'DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?',
      [itemId, tagId]
    );

    if (result.changes === 0) {
      throw new Error('标签关联不存在');
    }

    logger.info(`物品${itemId}移除标签${tagId}`);
  }

  /**
   * 获取物品的所有标签
   */
  async getItemTags(itemId: number): Promise<Tag[]> {
    const tags = await database.all<Tag>(
      `SELECT t.* FROM tags t
       INNER JOIN item_tags it ON t.id = it.tag_id
       WHERE it.item_id = ?
       ORDER BY t.name ASC`,
      [itemId]
    );
    return tags as Tag[];
  }

  /**
   * 获取拥有指定标签的所有物品（支持分页）
   */
  async getItemsByTag(tagId: number, params: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    // 检查标签是否存在
    const tag = await this.getTagById(tagId);
    if (!tag) {
      throw new Error('标签不存在');
    }

    // 查询物品
    const items = await database.all<any[]>(
      `SELECT i.* FROM items i
       INNER JOIN item_tags it ON i.id = it.item_id
       WHERE it.tag_id = ?
       ORDER BY i.name ASC
       LIMIT ? OFFSET ?`,
      [tagId, limit, offset]
    );

    // 查询总数
    const countResult = await database.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM item_tags WHERE tag_id = ?`,
      [tagId]
    );

    return {
      items,
      total: countResult?.total || 0,
      page,
      limit
    };
  }

  /**
   * 批量为物品设置标签
   */
  async setItemTags(itemId: number, tagIds: number[]) {
    // 检查物品是否存在
    const item = await database.get<{ id: number }>(
      'SELECT id FROM items WHERE id = ?',
      [itemId]
    );

    if (!item) {
      throw new Error('物品不存在');
    }

    // 删除现有标签关联
    await database.run(
      'DELETE FROM item_tags WHERE item_id = ?',
      [itemId]
    );

    // 添加新标签关联
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        // 检查标签是否存在
        const tag = await this.getTagById(tagId);
        if (!tag) {
          logger.warn(`标签${tagId}不存在，跳过`);
          continue;
        }

        await database.run(
          'INSERT INTO item_tags (item_id, tag_id, created_at) VALUES (?, ?, ?)',
          [itemId, tagId, getCurrentUTC8TimeForDB()]
        );
      }
    }

    logger.info(`物品${itemId}标签已更新: [${tagIds.join(', ')}]`);
  }
}

export const tagService = new TagService();
