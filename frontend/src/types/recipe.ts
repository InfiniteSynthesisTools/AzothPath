// Recipe 相关类型定义

export interface Recipe {
  id: number;
  item_a: string;
  item_b: string;
  result: string;
  user_id: number;  // 数据库字段名
  likes: number;  // 点赞数（直接从数据库字段获取）
  created_at: string;
  creator_name?: string;  // JOIN 查询时返回
  is_liked?: boolean;  // 前端本地状态
}

export interface Item {
  id: number;
  name: string;
  emoji?: string;
  pinyin?: string;
  is_base: boolean;
  created_at?: string;
}

export interface RecipeInput {
  text?: string;  // "A + B = C" 格式
  json?: RecipeJsonInput[];
}

export interface RecipeJsonInput {
  item_a: string;
  item_b: string;
  result: string;
}

export interface RecipeSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  material?: string;
  result?: string;
}

export interface RecipeListResponse {
  recipes: Recipe[];
  total: number;
}

// 合成树节点
export interface CraftingTreeNode {
  item: string;
  is_base: boolean;
  recipe?: [string, string];
  children?: CraftingTreeNode[];
}

// 合成路径统计
export interface PathStats {
  depth: number;           // 合成深度
  steps: number;           // 合成步骤数
  total_materials: number; // 基础材料总数
  material_types: number;  // 基础材料种类数
  materials: Record<string, number>; // 材料详细分布
}

// 合成路径
export interface CraftingPath {
  tree: CraftingTreeNode;
  stats: PathStats;
}
