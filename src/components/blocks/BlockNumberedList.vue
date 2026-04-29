<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import RichText from "../RichText.vue";
import { getRichText } from "./helpers";
import type { Block } from "@/lib/notion";

const NotionRenderer = defineAsyncComponent(() => import("../NotionRenderer.vue"));

defineProps<{ items: Block[] }>();
</script>

<template>
  <ol class="nr-list nr-ol">
    <li v-for="item in items" :key="item.id" class="nr-li">
      <RichText :texts="getRichText(item)" />
      <NotionRenderer v-if="item.children?.length" :blocks="item.children" />
    </li>
  </ol>
</template>

<style scoped>
.nr-list {
  padding-left: 1.5em;
  margin: 0.5rem 0;
}
.nr-li {
  margin: 0.5rem 0;
}
.nr-li :deep(.notion-renderer) {
  margin-top: 2px;
}
</style>
