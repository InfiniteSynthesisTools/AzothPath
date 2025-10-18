import sqlite3
from typing import Dict, List, Set, Tuple, Optional
from collections import deque, defaultdict
import time


class RecipeGraph:
    """合成配方图 - 用于计算合成路径"""
    
    def __init__(self, db_path="crafting_recipes.db", auto_load=True):
        self.db_path = db_path
        # 基础物品（不需要合成的物品）
        self.base_items = {"金", "木", "水", "火", "土", "宝石"}
        
        # 图结构
        self.recipes = []  # [(item_a, item_b, result)]
        self.item_to_recipes = defaultdict(list)  # result -> [(item_a, item_b)]
        self.all_items = set()
        
        # 可达性标记
        self.reachable_items = set()  # 可以从基础物品合成出来的物品
        self.valid_recipes = set()  # 合法的配方（材料都可达）
        
        # 循环依赖标记
        self.self_loop_recipes = set()  # A+A=A 或 A+B=A 的配方
        self.circular_items = set()  # 存在循环依赖的物品
        
        # 脏标记 - 用于延迟刷新
        self._dirty = False
        self._last_recipe_count = 0
        
        # 加载数据
        if auto_load:
            self.load_recipes()
            self.detect_circular_dependencies()
            self.analyze_reachability()
            self._last_recipe_count = len(self.recipes)
    
    def normalize_recipe(self, item_a: str, item_b: str, result: str) -> Tuple:
        """
        规范化配方：A+B=C 和 B+A=C 被视为同一配方
        返回规范化后的配方（按字典序排序材料）
        """
        # 按字典序排序材料，确保 A+B 和 B+A 得到相同结果
        if item_a <= item_b:
            return (item_a, item_b, result)
        else:
            return (item_b, item_a, result)
    
    def load_recipes(self):
        """从数据库加载所有配方，自动去重 A+B=C 和 B+A=C"""
        start_time = time.time()
        
        # 清空现有数据（防止重复加载累加）
        self.recipes = []
        self.item_to_recipes = defaultdict(list)
        self.all_items = set()
        self.reachable_items = set()
        self.valid_recipes = set()
        self.self_loop_recipes = set()
        self.circular_items = set()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT item_a, item_b, result FROM recipes')
        rows = cursor.fetchall()
        conn.close()
        
        # 使用 set 来自动去重规范化后的配方
        unique_recipes = set()
        duplicate_count = 0
        
        for item_a, item_b, result in rows:
            # 规范化配方
            normalized = self.normalize_recipe(item_a, item_b, result)
            
            # 检查是否重复
            if normalized in unique_recipes:
                duplicate_count += 1
                continue
            
            unique_recipes.add(normalized)
            
            # 使用规范化后的配方
            norm_a, norm_b, _ = normalized
            self.recipes.append((norm_a, norm_b, result))
            self.item_to_recipes[result].append((norm_a, norm_b))
            self.all_items.add(norm_a)
            self.all_items.add(norm_b)
            self.all_items.add(result)
        
        # 基础物品也加入到所有物品集合
        self.all_items.update(self.base_items)
        
        elapsed = time.time() - start_time
        print(f"📊 加载了 {len(rows)} 条原始配方")
        if duplicate_count > 0:
            print(f"🔄 去重了 {duplicate_count} 条重复配方 (A+B=C ⇔ B+A=C)")
        print(f"✅ 实际使用 {len(self.recipes)} 条唯一配方")
        print(f"📦 共 {len(self.all_items)} 种物品")
        print(f"⏱️  加载耗时: {elapsed*1000:.2f} ms")
    
    def detect_circular_dependencies(self):
        """
        检测循环依赖：A+A=A 或 A+B=A 的情况
        这些配方不会增加新的可达物品，但需要特殊处理
        """
        start_time = time.time()
        
        for item_a, item_b, result in self.recipes:
            # 检测自循环: A+A=A 或 A+B=A 或 B+A=A
            if result == item_a or result == item_b:
                self.self_loop_recipes.add((item_a, item_b, result))
                self.circular_items.add(result)
        
        elapsed = time.time() - start_time
        
        if self.self_loop_recipes:
            print(f"⚠️  检测到 {len(self.self_loop_recipes)} 个循环依赖配方:")
            for item_a, item_b, result in list(self.self_loop_recipes)[:5]:
                print(f"   - {item_a} + {item_b} = {result}")
            if len(self.self_loop_recipes) > 5:
                print(f"   ... 还有 {len(self.self_loop_recipes) - 5} 个")
            print(f"⏱️  循环检测耗时: {elapsed*1000:.2f} ms")
    
    def analyze_reachability(self):
        """
        分析可达性：从基础物品出发，使用优化的BFS找出所有可以合成的物品
        优化版本 - 处理循环依赖，避免重复计算
        时间复杂度: O(V + E) where V=物品数, E=配方数
        """
        start_time = time.time()
        
        # 初始化：基础物品都是可达的
        self.reachable_items = set(self.base_items)
        
        # 使用队列进行BFS (而不是多轮全局扫描)
        queue = deque(self.base_items)
        processed = set(self.base_items)  # 已处理的物品，避免重复
        iteration = 0
        recipes_checked = 0  # 配方检查次数统计
        items_processed = 0  # 物品处理次数统计
        
        while queue:
            iteration += 1
            # 批量处理当前层
            current_reachable = set(queue)
            queue.clear()
            
            # 遍历所有配方，找出新可达的物品
            for item_a, item_b, result in self.recipes:
                recipes_checked += 1
                
                # 优化1: 如果结果已经可达，跳过（处理循环依赖）
                if result in self.reachable_items:
                    # 但如果材料都可达，仍需标记为合法配方
                    if (item_a in self.reachable_items and 
                        item_b in self.reachable_items):
                        self.valid_recipes.add((item_a, item_b, result))
                    continue
                
                # 优化2: 只有当材料新变为可达时才检查
                materials_reachable = (item_a in self.reachable_items and 
                                     item_b in self.reachable_items)
                
                if materials_reachable:
                    # 新物品可达
                    self.reachable_items.add(result)
                    self.valid_recipes.add((item_a, item_b, result))
                    
                    # 只有首次处理的物品才加入队列
                    if result not in processed:
                        queue.append(result)
                        processed.add(result)
                        items_processed += 1
        
        elapsed = time.time() - start_time
        unreachable_count = len(self.all_items) - len(self.reachable_items)
        valid_recipe_count = len(self.valid_recipes)
        invalid_recipe_count = len(self.recipes) - valid_recipe_count
        
        # 计算理论复杂度
        theoretical_ops = len(self.all_items) + len(self.recipes)
        
        print(f"🔍 可达性分析完成 (迭代 {iteration} 轮):")
        print(f"   ✅ 可达物品: {len(self.reachable_items)} 种")
        print(f"   ❌ 不可达物品: {unreachable_count} 种")
        print(f"   ✅ 合法配方: {valid_recipe_count} 条")
        print(f"   ❌ 非法配方: {invalid_recipe_count} 条")
        
        # 报告循环依赖中可达的物品
        reachable_circular = self.circular_items & self.reachable_items
        if reachable_circular:
            print(f"   🔄 循环依赖但可达: {len(reachable_circular)} 种")
        
        # 效率分析
        print(f"\n📈 效率分析:")
        print(f"   ⏱️  总耗时: {elapsed*1000:.2f} ms")
        print(f"   🔄 BFS迭代轮数: {iteration}")
        print(f"   📝 配方检查次数: {recipes_checked:,}")
        print(f"   📦 物品处理次数: {items_processed}")
        print(f"   💡 理论复杂度: O(V+E) = O({len(self.all_items)}+{len(self.recipes)}) = {theoretical_ops:,}")
        print(f"   ⚡ 实际操作次数: {recipes_checked:,} (约 {iteration} × {len(self.recipes)})")
        if elapsed > 0:
            print(f"   🚀 处理速度: {recipes_checked/elapsed:,.0f} 次/秒")
            print(f"   📊 每配方耗时: {elapsed*1000000/recipes_checked:.2f} μs")
    
    def can_craft(self, item: str) -> bool:
        """判断物品是否可以合成"""
        return item in self.reachable_items
    
    def get_crafting_paths(self, target: str) -> List[List[Tuple]]:
        """
        获取目标物品的所有合成路径
        返回: [[(item_a, item_b, result), ...], ...]
        """
        if not self.can_craft(target):
            return []
        
        # 如果是基础物品，不需要合成
        if target in self.base_items:
            return []
        
        paths = []
        
        # 获取所有可以合成目标物品的配方
        for item_a, item_b in self.item_to_recipes[target]:
            # 只考虑合法配方
            if (item_a, item_b, target) in self.valid_recipes:
                paths.append([(item_a, item_b, target)])
        
        return paths
    
    def build_crafting_tree(self, target: str, max_depth: int = 10, _stats: dict = None) -> Optional[Dict]:
        """
        构建完整的合成树（递归展开所有依赖）
        返回树形结构 - 只返回第一条路径
        """
        # 统计递归调用次数
        if _stats is not None:
            _stats['recursive_calls'] = _stats.get('recursive_calls', 0) + 1
        
        if not self.can_craft(target):
            return None
        
        # 如果是基础物品
        if target in self.base_items:
            return {
                "item": target,
                "is_base": True,
                "children": []
            }
        
        # 获取一个合成配方（优先选择材料都可达的）
        recipes = self.item_to_recipes[target]
        
        for item_a, item_b in recipes:
            if (item_a, item_b, target) not in self.valid_recipes:
                continue
            
            # 递归构建子树
            tree_a = self.build_crafting_tree(item_a, max_depth - 1, _stats)
            tree_b = self.build_crafting_tree(item_b, max_depth - 1, _stats)
            
            if tree_a and tree_b:
                return {
                    "item": target,
                    "is_base": False,
                    "recipe": (item_a, item_b),
                    "children": [tree_a, tree_b]
                }
        
        # 没有找到合法配方
        return None
    
    def build_all_crafting_trees(self, target: str, max_depth: int = 100, _memo: dict = None, _in_progress: set = None) -> List[Dict]:
        """
        构建所有可能的合成树（返回所有合成路径）
        返回: [tree1, tree2, ...]
        使用记忆化避免重复计算，_in_progress 用于检测循环依赖
        """
        # 初始化顶层调用的共享数据结构
        is_top_level = (_memo is None and _in_progress is None)
        if _memo is None:
            _memo = {}
        if _in_progress is None:
            _in_progress = set()
        
        # 检测循环依赖：如果物品正在被处理，说明遇到循环，直接返回空
        if target in _in_progress:
            return []
        
        # 检查缓存
        if target in _memo:
            return _memo[target]
        
        if not self.can_craft(target):
            _memo[target] = []
            return []
        
        # 如果是基础物品
        if target in self.base_items:
            result = [{
                "item": target,
                "is_base": True,
                "children": []
            }]
            _memo[target] = result
            return result
        
        if max_depth <= 0:
            _memo[target] = []
            return []
        
        # 标记当前物品为处理中
        _in_progress.add(target)
        
        all_trees = []
        
        # 遍历所有合法配方
        recipes = self.item_to_recipes[target]
        for item_a, item_b in recipes:
            if (item_a, item_b, target) not in self.valid_recipes:
                continue
            
            # 递归获取材料的所有合成树
            trees_a = self.build_all_crafting_trees(item_a, max_depth - 1, _memo, _in_progress)
            trees_b = self.build_all_crafting_trees(item_b, max_depth - 1, _memo, _in_progress)
            
            # 组合所有可能的子树
            for tree_a in trees_a:
                for tree_b in trees_b:
                    all_trees.append({
                        "item": target,
                        "is_base": False,
                        "recipe": (item_a, item_b),
                        "children": [tree_a, tree_b]
                    })
        
        # 移除处理中标记
        _in_progress.remove(target)
        
        # 缓存结果（即使是空列表也缓存，因为已经完成处理）
        _memo[target] = all_trees
        return all_trees
    
    def calculate_base_materials(self, target: str, tree: Dict = None) -> Dict[str, int]:
        """
        计算合成目标物品需要的所有基础材料数量
        返回: {"金": 2, "木": 3, ...}
        """
        if tree is None:
            stats = {}
            tree = self.build_crafting_tree(target, _stats=stats)
            if not tree:
                return {}
        
        materials = defaultdict(int)
        
        def count_materials(node):
            if node["is_base"]:
                materials[node["item"]] += 1
            else:
                for child in node["children"]:
                    count_materials(child)
        
        count_materials(tree)
        
        return dict(materials)
    
    def analyze_tree_stats(self, tree: Dict) -> Dict:
        """分析合成树的统计信息"""
        materials = self.calculate_base_materials(None, tree)
        total_materials = sum(materials.values())
        
        # 计算树的深度
        def get_depth(node):
            if node["is_base"]:
                return 0
            return 1 + max(get_depth(child) for child in node["children"])
        
        # 计算合成步骤数
        def count_steps(node):
            if node["is_base"]:
                return 0
            return 1 + sum(count_steps(child) for child in node["children"])
        
        depth = get_depth(tree)
        steps = count_steps(tree)
        
        return {
            "materials": materials,
            "total_materials": total_materials,
            "depth": depth,
            "steps": steps,
            "material_types": len(materials)
        }
    
    def get_crafting_depth(self, target: str) -> int:
        """计算合成深度（需要多少步）"""
        if target in self.base_items:
            return 0
        
        if not self.can_craft(target):
            return -1
        
        # BFS计算最短路径
        queue = deque([(target, 0)])
        visited = {target}
        
        while queue:
            item, depth = queue.popleft()
            
            if item in self.base_items:
                continue
            
            # 获取合成配方
            for item_a, item_b in self.item_to_recipes[item]:
                if (item_a, item_b, item) not in self.valid_recipes:
                    continue
                
                for material in [item_a, item_b]:
                    if material not in visited:
                        visited.add(material)
                        if material in self.base_items:
                            return depth + 1
                        queue.append((material, depth + 1))
        
        return -1
    
    def print_crafting_tree(self, target: str, indent: int = 0):
        """以树形结构打印合成路径"""
        if not self.can_craft(target):
            print(f"{'  ' * indent}❌ {target} (无法合成)")
            return
        
        if target in self.base_items:
            print(f"{'  ' * indent}🔹 {target} (基础材料)")
            return
        
        # 获取一个配方
        recipes = self.item_to_recipes[target]
        found = False
        
        for item_a, item_b in recipes:
            if (item_a, item_b, target) in self.valid_recipes:
                print(f"{'  ' * indent}📦 {target}")
                print(f"{'  ' * (indent + 1)}├─ {item_a}")
                self.print_crafting_tree(item_a, indent + 2)
                print(f"{'  ' * (indent + 1)}└─ {item_b}")
                self.print_crafting_tree(item_b, indent + 2)
                found = True
                break
        
        if not found:
            print(f"{'  ' * indent}❌ {target} (配方不完整)")
    
    def get_unreachable_items(self) -> Set[str]:
        """获取所有不可达的物品"""
        return self.all_items - self.reachable_items
    
    def get_invalid_recipes(self) -> List[Tuple]:
        """获取所有非法配方（材料不可达）"""
        invalid = []
        for item_a, item_b, result in self.recipes:
            if (item_a, item_b, result) not in self.valid_recipes:
                invalid.append((item_a, item_b, result))
        return invalid
    
    def get_circular_recipes(self) -> List[Tuple]:
        """获取所有循环依赖配方（A+A=A 或 A+B=A）"""
        return list(self.self_loop_recipes)
    
    def analyze_complexity(self):
        """分析图的复杂度统计"""
        # 计算入度（有多少种方式可以合成某个物品）
        in_degree = defaultdict(int)
        for _, _, result in self.recipes:
            in_degree[result] += 1
        
        # 计算出度（某个物品可以参与多少种合成）
        out_degree = defaultdict(int)
        for item_a, item_b, _ in self.recipes:
            out_degree[item_a] += 1
            out_degree[item_b] += 1
        
        max_in = max(in_degree.values()) if in_degree else 0
        max_out = max(out_degree.values()) if out_degree else 0
        
        return {
            "max_in_degree": max_in,
            "max_out_degree": max_out,
            "avg_in_degree": sum(in_degree.values()) / len(in_degree) if in_degree else 0,
            "avg_out_degree": sum(out_degree.values()) / len(out_degree) if out_degree else 0,
            "circular_count": len(self.self_loop_recipes),
            "circular_items": len(self.circular_items)
        }
    
    def mark_dirty(self):
        """标记图为脏状态，需要重新分析"""
        self._dirty = True
    
    def is_dirty(self) -> bool:
        """检查图是否需要重新加载"""
        if self._dirty:
            return True
        
        # 检查数据库中的配方数量是否变化
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM recipes')
            current_count = cursor.fetchone()[0]
            conn.close()
            
            if current_count != self._last_recipe_count:
                return True
        except:
            pass
        
        return False
    
    def refresh_if_dirty(self) -> bool:
        """如果图是脏的，则刷新"""
        if self.is_dirty():
            self.load_recipes()
            self.detect_circular_dependencies()
            self.analyze_reachability()
            self._dirty = False
            self._last_recipe_count = len(self.recipes)
            return True
        return False
    
    def add_recipe_to_memory(self, item_a: str, item_b: str, result: str) -> bool:
        """将配方添加到内存图中（不写数据库，用于批量导入）
        
        Args:
            item_a: 材料A
            item_b: 材料B
            result: 合成结果
            
        Returns:
            True 如果是新配方，False 如果已存在
        """
        # 规范化配方
        normalized = self.normalize_recipe(item_a, item_b, result)
        
        # 检查是否重复
        if normalized in set(self.recipes):
            return False
        
        # 添加到图结构
        norm_a, norm_b, _ = normalized
        self.recipes.append((norm_a, norm_b, result))
        self.item_to_recipes[result].append((norm_a, norm_b))
        self.all_items.add(norm_a)
        self.all_items.add(norm_b)
        self.all_items.add(result)
        
        # 检测是否为循环依赖
        if result == norm_a or result == norm_b:
            self.self_loop_recipes.add((norm_a, norm_b, result))
            self.circular_items.add(result)
        
        # 标记需要重新分析可达性
        self._dirty = True
        
        return True
    
    # ================================
    # 数据查询方法（供 API 使用）
    # ================================
    
    def get_all_recipes(self) -> List[Tuple[str, str, str]]:
        """获取所有配方列表"""
        return self.recipes.copy()
    
    def query_recipes(self, material: str = None, result: str = None, 
                     exact: bool = False, limit: int = None, offset: int = 0) -> List[Tuple[str, str, str]]:
        """
        查询配方
        
        Args:
            material: 材料名称（匹配 item_a 或 item_b）
            result: 结果物品名称
            exact: 是否精确匹配（False 为模糊匹配）
            limit: 返回数量限制
            offset: 偏移量（用于分页）
        
        Returns:
            [(item_a, item_b, result), ...]
        """
        recipes = self.recipes
        
        # 过滤材料
        if material:
            if exact:
                recipes = [r for r in recipes if r[0] == material or r[1] == material]
            else:
                recipes = [r for r in recipes if material in r[0] or material in r[1]]
        
        # 过滤结果
        if result:
            if exact:
                recipes = [r for r in recipes if r[2] == result]
            else:
                recipes = [r for r in recipes if result in r[2]]
        
        # 分页
        if limit is not None:
            recipes = recipes[offset:offset + limit]
        elif offset > 0:
            recipes = recipes[offset:]
        
        return recipes
    
    def get_recipes_for_item(self, item: str) -> List[Tuple[str, str]]:
        """获取合成某个物品的所有配方（材料对）"""
        return self.item_to_recipes.get(item, []).copy()
    
    def count_recipes(self, material: str = None, result: str = None, exact: bool = False) -> int:
        """
        统计符合条件的配方数量
        
        Args:
            material: 材料名称
            result: 结果物品名称
            exact: 是否精确匹配
        
        Returns:
            配方数量
        """
        return len(self.query_recipes(material=material, result=result, exact=exact))
    
    def recipe_exists(self, item_a: str, item_b: str, result: str) -> bool:
        """检查配方是否存在（考虑规范化）"""
        normalized = self.normalize_recipe(item_a, item_b, result)
        return normalized in [(r[0], r[1], r[2]) for r in self.recipes]
    
    def get_all_items_list(self) -> List[str]:
        """获取所有物品列表"""
        return sorted(list(self.all_items))
    
    def get_graph_stats(self) -> Dict:
        """获取图的统计信息"""
        return {
            "total_recipes": len(self.recipes),
            "total_items": len(self.all_items),
            "reachable_items": len(self.reachable_items),
            "unreachable_items": len(self.all_items - self.reachable_items),
            "valid_recipes": len(self.valid_recipes),
            "invalid_recipes": len(self.recipes) - len(self.valid_recipes),
            "circular_recipes": len(self.self_loop_recipes),
            "circular_items": len(self.circular_items),
            "base_items": len(self.base_items)
        }


def interactive_calculator():
    """交互式合成计算器"""
    print("🚀 合成路径计算器")
    print("=" * 60)
    
    # 初始化图
    graph = RecipeGraph()
    print("=" * 60)
    
    while True:
        print("\n📋 功能菜单:")
        print("1. 查询物品合成路径（单条）")
        print("2. 查询所有合成路径并比较")
        print("3. 计算基础材料需求")
        print("4. 查看不可达物品")
        print("5. 查看非法配方")
        print("6. 查看循环依赖配方")
        print("7. 图复杂度分析")
        print("8. 退出")
        print("-" * 60)
        
        choice = input("请选择功能 (1-8): ").strip()
        
        if choice == "1":
            target = input("\n请输入目标物品: ").strip()
            
            if not target:
                print("❌ 物品名称不能为空")
                continue
            
            if target not in graph.all_items:
                print(f"❌ 物品 '{target}' 不存在于数据库中")
                continue
            
            if not graph.can_craft(target):
                print(f"❌ 物品 '{target}' 无法从基础物品合成（数据不完整）")
                continue
            
            if target in graph.base_items:
                print(f"✅ '{target}' 是基础材料，不需要合成")
                continue
            
            print(f"\n🌳 合成树:")
            print("=" * 60)
            graph.print_crafting_tree(target)
            
            # 计算合成深度
            depth = graph.get_crafting_depth(target)
            print(f"\n📏 合成深度: {depth} 步")
        
        elif choice == "2":
            target = input("\n请输入目标物品: ").strip()
            
            if not target:
                print("❌ 物品名称不能为空")
                continue
            
            if target not in graph.all_items:
                print(f"❌ 物品 '{target}' 不存在于数据库中")
                continue
            
            if not graph.can_craft(target):
                print(f"❌ 物品 '{target}' 无法从基础物品合成（数据不完整）")
                continue
            
            if target in graph.base_items:
                print(f"✅ '{target}' 是基础材料，不需要合成")
                continue
            
            print(f"\n🔍 正在查找所有合成路径...")
            start_time = time.time()
            all_trees = graph.build_all_crafting_trees(target)
            elapsed = time.time() - start_time
            
            if not all_trees:
                print(f"❌ 没有找到合成路径")
                continue
            
            print(f"✅ 找到 {len(all_trees)} 条不同的合成路径")
            print(f"⏱️  查找耗时: {elapsed*1000:.2f} ms")
            
            # 分析所有路径的统计信息
            print(f"\n📊 路径统计分析:")
            print("=" * 60)
            
            stats_list = []
            for i, tree in enumerate(all_trees):
                stats = graph.analyze_tree_stats(tree)
                stats['index'] = i
                stats_list.append(stats)
            
            # 按不同维度排序
            by_materials = sorted(stats_list, key=lambda x: x['total_materials'])
            by_depth = sorted(stats_list, key=lambda x: x['depth'])
            by_steps = sorted(stats_list, key=lambda x: x['steps'])
            by_types = sorted(stats_list, key=lambda x: x['material_types'])
            
            print(f"\n🏆 最优路径推荐:")
            print(f"  材料最少: 路径 #{by_materials[0]['index']+1} - {by_materials[0]['total_materials']} 个材料")
            print(f"  深度最浅: 路径 #{by_depth[0]['index']+1} - {by_depth[0]['depth']} 层")
            print(f"  步骤最少: 路径 #{by_steps[0]['index']+1} - {by_steps[0]['steps']} 步")
            print(f"  材料种类最少: 路径 #{by_types[0]['index']+1} - {by_types[0]['material_types']} 种")
            
            # 显示前5条路径的详细信息
            print(f"\n📋 路径详细对比 (前 {min(5, len(all_trees))} 条):")
            print("-" * 60)
            for i in range(min(5, len(all_trees))):
                stats = stats_list[i]
                print(f"\n路径 #{i+1}:")
                print(f"  总材料数: {stats['total_materials']} 个")
                print(f"  材料种类: {stats['material_types']} 种")
                print(f"  合成深度: {stats['depth']} 层")
                print(f"  合成步骤: {stats['steps']} 步")
                materials_str = ", ".join([f"{k}×{v}" for k, v in stats['materials'].items()])
                print(f"  材料组成: {materials_str}")
            
            if len(all_trees) > 5:
                print(f"\n... 还有 {len(all_trees) - 5} 条路径")
            
            # 询问是否查看具体路径
            show_detail = input("\n是否查看某条路径的详细合成树? (输入路径编号或按回车跳过): ").strip()
            if show_detail.isdigit():
                path_idx = int(show_detail) - 1
                if 0 <= path_idx < len(all_trees):
                    print(f"\n🌳 路径 #{path_idx+1} 的合成树:")
                    print("=" * 60)
                    
                    def print_tree(node, indent=0):
                        if node["is_base"]:
                            print(f"{'  ' * indent}🔹 {node['item']} (基础材料)")
                        else:
                            print(f"{'  ' * indent}📦 {node['item']}")
                            item_a, item_b = node['recipe']
                            print(f"{'  ' * (indent + 1)}├─ {item_a}")
                            print_tree(node['children'][0], indent + 2)
                            print(f"{'  ' * (indent + 1)}└─ {item_b}")
                            print_tree(node['children'][1], indent + 2)
                    
                    print_tree(all_trees[path_idx])
                else:
                    print("❌ 路径编号无效")
        
        elif choice == "3":
            target = input("\n请输入目标物品: ").strip()
            
            if not target:
                print("❌ 物品名称不能为空")
                continue
            
            if not graph.can_craft(target):
                print(f"❌ 物品 '{target}' 无法合成")
                continue
            
            start_time = time.time()
            stats = {}
            tree = graph.build_crafting_tree(target, _stats=stats)
            
            materials = defaultdict(int)
            if tree:
                def count_materials(node):
                    if node["is_base"]:
                        materials[node["item"]] += 1
                    else:
                        for child in node["children"]:
                            count_materials(child)
                count_materials(tree)
            
            elapsed = time.time() - start_time
            
            if materials:
                print(f"\n📊 合成 '{target}' 需要的基础材料:")
                print("=" * 60)
                total = sum(materials.values())
                for material, count in sorted(materials.items()):
                    print(f"  {material}: {count} 个")
                print(f"\n总计: {total} 个基础材料")
                print(f"\n⏱️  计算耗时: {elapsed*1000:.2f} ms")
                if stats.get('recursive_calls'):
                    print(f"🔄 递归调用次数: {stats['recursive_calls']}")
            else:
                print(f"✅ '{target}' 是基础材料")
        
        elif choice == "4":
            unreachable = graph.get_unreachable_items()
            
            if unreachable:
                print(f"\n❌ 不可达物品 ({len(unreachable)} 种):")
                print("=" * 60)
                for item in sorted(unreachable):
                    print(f"  - {item}")
                print("\n💡 提示: 这些物品无法从基础材料合成，可能是数据不完整")
            else:
                print("✅ 所有物品都可以从基础材料合成!")
        
        elif choice == "5":
            invalid = graph.get_invalid_recipes()
            
            if invalid:
                print(f"\n❌ 非法配方 ({len(invalid)} 条):")
                print("=" * 60)
                for item_a, item_b, result in invalid:
                    reason = []
                    if item_a not in graph.reachable_items:
                        reason.append(f"{item_a}不可达")
                    if item_b not in graph.reachable_items:
                        reason.append(f"{item_b}不可达")
                    print(f"  {item_a} + {item_b} = {result}  ({', '.join(reason)})")
                print("\n💡 提示: 这些配方的材料无法从基础物品合成")
            else:
                print("✅ 所有配方都是合法的!")
        
        elif choice == "6":
            circular = graph.get_circular_recipes()
            
            if circular:
                print(f"\n🔄 循环依赖配方 ({len(circular)} 条):")
                print("=" * 60)
                for item_a, item_b, result in circular:
                    status = "✅ 可达" if result in graph.reachable_items else "❌ 不可达"
                    print(f"  {item_a} + {item_b} = {result}  ({status})")
                print("\n💡 提示: 这些配方的结果物品也是材料之一")
            else:
                print("✅ 没有循环依赖配方!")
        
        elif choice == "7":
            stats = graph.analyze_complexity()
            
            print(f"\n📊 图复杂度分析:")
            print("=" * 60)
            print(f"  最大入度 (被合成方式): {stats['max_in_degree']}")
            print(f"  平均入度: {stats['avg_in_degree']:.2f}")
            print(f"  最大出度 (参与合成次数): {stats['max_out_degree']}")
            print(f"  平均出度: {stats['avg_out_degree']:.2f}")
            print(f"  循环配方数: {stats['circular_count']}")
            print(f"  循环物品数: {stats['circular_items']}")
            print(f"\n算法复杂度: O(V + E)")
            print(f"  V (物品数): {len(graph.all_items)}")
            print(f"  E (配方数): {len(graph.recipes)}")
            print(f"  实际复杂度: O({len(graph.all_items)} + {len(graph.recipes)}) = O({len(graph.all_items) + len(graph.recipes)})")
        
        elif choice == "8":
            print("\n👋 再见!")
            break
        
        else:
            print("❌ 无效的选择")


if __name__ == "__main__":
    try:
        interactive_calculator()
    except KeyboardInterrupt:
        print("\n\n👋 再见!")
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
