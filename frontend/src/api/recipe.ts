import { api } from '@/utils/request';
import type {
  Recipe,
  RecipeInput,
  RecipeSearchParams,
  RecipeListResponse,
  CraftingPath,
  SubmitRecipeResponse,
  IcicleNode
} from '@/types';

export const recipeApi = {
  // 获取配方列表（支持游标分页）
  list(params: RecipeSearchParams & { cursor?: string } = {}) {
    return api.get<RecipeListResponse & { hasMore?: boolean; nextCursor?: number }>('/recipes', { params });
  },

  // 获取配方详情
  detail(id: number) {
    return api.get<Recipe>(`/recipes/${id}`);
  },

  // 提交配方（批量或单条）
  submit(data: RecipeInput) {
    return api.post<SubmitRecipeResponse>('/recipes/submit', data);
  },

  // 删除配方
  delete(id: number) {
    return api.delete(`/recipes/${id}`);
  },

  // 点赞/取消点赞配方（切换状态）
  like(id: number) {
    return api.post<{ liked: boolean; likes: number }>(`/recipes/${id}/like`);
  },

  // 搜索合成路径（单条最简路径）
  searchPath(item: string) {
    return api.get<CraftingPath>('/recipes/path', {
      params: { item }
    });
  },

  // 获取图统计信息
  getGraphStats() {
    return api.get<{
      total_recipes: number;
      total_items: number;
      reachable_items: number;
      unreachable_items: number;
      valid_recipes: number;
      invalid_recipes: number;
      circular_recipes: number;
      circular_items: number;
      base_items: number;
    }>('/recipes/graph/stats');
  },

  // 批量获取配方（用于大数据量场景）
  getBatch(params: { batchSize?: number; lastId?: number; search?: string } = {}) {
    return api.get<{
      recipes: Recipe[];
      hasMore: boolean;
      lastId: number;
    }>('/recipes/batch', { params });
  },

  // 获取物品列表
  getItems(params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
    includePrivate?: string | boolean;
    exact?: boolean;  // 精确匹配物品名称
  } = {}) {
    return api.get<{
      items: any[];
      total: number;
      page: number;
      limit: number;
    }>('/items', { params });
  },

  // 获取单个物品详情
  getItemById(id: number) {
    return api.get<any>(`/items/${id}`);
  },

  // 获取随机物品
  getRandomItem(type: string = 'synthetic') {
    return api.get<any>('/items/random', { params: { type } });
  },

  /**
   * 按需生成单个物品的冰柱图数据
   * 返回格式: { nodes: IcicleNode[], totalElements: number, maxDepth: number }
   */
  getIcicleChartOnDemand(item: string, params?: { maxDepth?: number; includeStats?: boolean }) {
    return api.get<{
      nodes: IcicleNode[];
      totalElements: number;
      maxDepth: number;
    }>(`/recipes/icicle-chart/on-demand/${encodeURIComponent(item)}`, { params });
  },

  /**
   * 获取元素的可达性统计信息
   */
  getReachabilityStats(item: string) {
    return api.get<{
      reachable: boolean;
      depth?: number;
      width?: number;
      breadth?: number;
    }>(`/recipes/reachability/${encodeURIComponent(item)}`);
  }
};
