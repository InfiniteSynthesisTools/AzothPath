import { api } from '@/utils/request';

export interface Tag {
  id: number;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

export interface CreateTagParams {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateTagParams {
  name?: string;
  description?: string;
  color?: string;
}

export const tagApi = {
  // 获取所有标签
  getTags() {
    return api.get<{ tags: Tag[] }>('/tags');
  },

  // 获取标签详情
  getTag(id: number) {
    return api.get<Tag>(`/tags/${id}`);
  },

  // 创建标签
  createTag(data: CreateTagParams) {
    return api.post<{ tagId: number }>('/tags', data);
  },

  // 更新标签
  updateTag(id: number, data: UpdateTagParams) {
    return api.patch(`/tags/${id}`, data);
  },

  // 删除标签
  deleteTag(id: number) {
    return api.delete(`/tags/${id}`);
  },

  // 获取标签的所有物品
  getTagItems(id: number, params?: { page?: number; limit?: number }) {
    return api.get<{ items: any[]; total: number; page: number; limit: number }>(
      `/tags/${id}/items`,
      { params }
    );
  },

  // 为物品添加标签
  addTagToItem(itemId: number, tagId: number) {
    return api.post(`/tags/items/${itemId}/tags`, { tagId });
  },

  // 从物品移除标签
  removeTagFromItem(itemId: number, tagId: number) {
    return api.delete(`/tags/items/${itemId}/tags/${tagId}`);
  },

  // 批量设置物品标签
  setItemTags(itemId: number, tagIds: number[]) {
    return api.put(`/tags/items/${itemId}/tags`, { tagIds });
  },

  // 获取物品的所有标签
  getItemTags(itemId: number) {
    return api.get<{ tags: Tag[] }>(`/tags/items/${itemId}/tags`);
  }
};
