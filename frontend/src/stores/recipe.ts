import { defineStore } from 'pinia';
import { ref } from 'vue';
import { recipeApi } from '@/api';
import type { Recipe, RecipeSearchParams } from '@/types';

export const useRecipeStore = defineStore('recipe', () => {
  // 状态
  const recipes = ref<Recipe[]>([]);
  const total = ref(0);
  const currentRecipe = ref<Recipe | null>(null);
  const loading = ref(false);
  const searchParams = ref<RecipeSearchParams>({
    page: 1,
    limit: 20
  });

  // 获取配方列表（支持游标分页）
  const fetchRecipes = async (params?: RecipeSearchParams) => {
    loading.value = true;
    try {
      if (params) {
        searchParams.value = { ...searchParams.value, ...params };
      }
      const data = await recipeApi.list(searchParams.value);
      recipes.value = data.recipes;
      total.value = data.total;
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 批量获取配方（用于大数据量场景）
  const fetchRecipesBatch = async (params: { batchSize?: number; lastId?: number; search?: string }) => {
    loading.value = true;
    try {
      const data = await recipeApi.getBatch(params);
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 获取配方详情
  const fetchRecipeDetail = async (id: number) => {
    loading.value = true;
    try {
      const data = await recipeApi.detail(id);
      currentRecipe.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 提交配方
  const submitRecipe = async (text?: string, json?: any[]) => {
    loading.value = true;
    try {
      const data = await recipeApi.submit({ text, json });
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 删除配方
  const deleteRecipe = async (id: number) => {
    loading.value = true;
    try {
      await recipeApi.delete(id);
      // 从列表中移除
      recipes.value = recipes.value.filter(r => r.id !== id);
      total.value -= 1;
    } finally {
      loading.value = false;
    }
  };

  // 点赞/取消点赞配方（切换状态）
  const toggleLike = async (id: number) => {
    const result = await recipeApi.like(id);
    // 更新列表中的配方
    const recipe = recipes.value.find(r => r.id === id);
    if (recipe) {
      recipe.is_liked = result.liked;
      recipe.likes = result.likes;
    }
    // 更新当前配方
    if (currentRecipe.value?.id === id) {
      currentRecipe.value.is_liked = result.liked;
      currentRecipe.value.likes = result.likes;
    }
  };

  // 搜索合成路径
  const searchPath = async (item: string) => {
    loading.value = true;
    try {
      const data = await recipeApi.searchPath(item);
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 搜索所有合成路径
  const searchAllPaths = async (item: string, limit = 100) => {
    loading.value = true;
    try {
      const data = await recipeApi.searchAllPaths(item, limit);
      return data;
    } finally {
      loading.value = false;
    }
  };

  // 重置搜索参数
  const resetSearchParams = () => {
    searchParams.value = {
      page: 1,
      limit: 20
    };
  };

  return {
    // 状态
    recipes,
    total,
    currentRecipe,
    loading,
    searchParams,
    // 方法
    fetchRecipes,
    fetchRecipesBatch,
    fetchRecipeDetail,
    submitRecipe,
    deleteRecipe,
    toggleLike,
    searchPath,
    searchAllPaths,
    resetSearchParams
  };
});
