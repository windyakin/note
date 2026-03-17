<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import type { Block } from "@/lib/notion";

const NotionRenderer = defineAsyncComponent(() => import("../NotionRenderer.vue"));

defineProps<{ block: Block }>();
</script>

<template>
  <div class="nr-columns">
    <div
      v-for="col in (block.children ?? [])"
      :key="col.id"
      class="nr-column"
    >
      <NotionRenderer v-if="col.children?.length" :blocks="col.children" />
    </div>
  </div>
</template>

<style scoped>
.nr-columns {
  display: flex;
  gap: 1.5rem;
  margin: 1rem 0;
}
.nr-column {
  flex: 1;
  min-width: 0;
}

@media (max-width: 576px) {
  .nr-columns {
    flex-direction: column;
  }
}
</style>
