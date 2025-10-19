<template>
  <div class="crafting-tree-node">
    <!-- Crafting tree node component placeholder -->
    <p>CraftingTreeNode component - to be implemented</p>
  </div>
</template>

<script setup lang="ts">
import type { CraftingTreeNode as CraftingTreeNodeType } from '@/types/recipe';

interface Props {
  node: CraftingTreeNodeType;
}

defineProps<Props>();
</script>

<style scoped>
.crafting-tree-node {
  border: 1px solid #ccc;
  padding: 8px;
  margin: 4px;
  border-radius: 4px;
}
</style>
