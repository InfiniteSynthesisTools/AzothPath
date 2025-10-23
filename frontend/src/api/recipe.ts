import { api } from '@/utils/request';
import type {
  Recipe,
  RecipeInput,
  RecipeSearchParams,
  RecipeListResponse,
  CraftingPath,
  SubmitRecipeResponse,
  IcicleChartData,
  IcicleNode
} from '@/types';

export const recipeApi = {
  // 获取配方列表（支持游标分页）
  list(params: RecipeSearchParams & { cursor?: string } = {}) {
    return api.get<RecipeListResponse & { hasMore?: boolean; nextCursor?: number }>('/recipes', { params });
  },

  // 获取按结果分组的配方列表
  listGrouped(params: RecipeSearchParams = {}) {
    return api.get<{
      grouped_recipes: Array<{
        result: string;
        result_emoji?: string;
        recipe_count: number;
        recipes: Recipe[];
      }>;
      total: number;
      page: number;
      limit: number;
    }>('/recipes/grouped', { params });
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

  // 搜索所有合成路径
  searchAllPaths(item: string, limit: number = 100) {
    return api.get<{ trees: CraftingPath[]; total: number }>('/recipes/path', {
      params: { item, mode: 'all', limit }
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

  // 创建优化索引（管理员功能）
  optimizeIndexes() {
    return api.post<{ message: string }>('/recipes/optimize');
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
   * 获取冰柱图数据
   */
  getIcicleChart(params?: { compress?: boolean; limit?: number }) {
    return api.get<IcicleChartData>('/recipes/icicle-chart', { params });
  },

  /**
   * 获取分页冰柱图数据
   */
  getPaginatedIcicleChart(params: { page?: number; pageSize?: number }) {
    return api.get<PaginatedIcicleChartData>('/recipes/icicle-chart/paginated', { params });
  },

  /**
   * 获取增量更新的冰柱图数据
   */
  getIncrementalIcicleChart(params: { lastVersion?: number }) {
    return api.get<{
      data: IcicleChartData;
      version: number;
      isFullUpdate: boolean;
      updatedNodes: string[];
    }>('/recipes/icicle-chart/incremental', { params });
  },

  /**
   * 获取冰柱图API性能统计信息
   */
  getIcicleChartPerformance() {
    return api.get<{
      totalRequests: number;
      compressedRequests: number;
      paginatedRequests: number;
      incrementalRequests: number;
      averageResponseTime: number;
      totalResponseTime: number;
      compressionRatio: number;
      paginationRatio: number;
      incrementalRatio: number;
    }>('/recipes/icicle-chart/performance');
  },

  /**
   * 获取单个物品的最短路径树（使用缓存优化）
   */
  getShortestPathTree(item: string) {
    return api.get<IcicleNode>('/recipes/shortest-path', {
      params: { item }
    });
  },

  // 刷新缓存（管理员功能）
  refreshCache(cacheType?: 'graph' | 'icicle' | 'all') {
    return api.post<{ message: string }>('/recipes/refresh-cache', { cacheType });
  },

  // 获取缓存状态（管理员功能）
  getCacheStatus() {
    return api.get<{
      hasGraphCache: boolean;
      graphCacheAge?: number;
      hasIcicleCache: boolean;
      icicleCacheAge?: number;
      shortestPathTreeCount?: number;
    }>('/recipes/cache-status');
  },

  // 性能测试（管理员功能）
  benchmark() {
    return api.post<{
      optimizedTime: number;
      originalTime: number;
      speedup: number;
      cacheHitRate: number;
    }>('/recipes/benchmark');
  }
};
