import { api } from '@/utils/request';
import type {
  Recipe,
  RecipeInput,
  RecipeSearchParams,
  RecipeListResponse,
  CraftingPath,
  SubmitRecipeResponse
} from '@/types';

export const recipeApi = {
  // 获取配方列表
  list(params: RecipeSearchParams = {}) {
    return api.get<RecipeListResponse>('/recipes', { params });
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
  }
};
