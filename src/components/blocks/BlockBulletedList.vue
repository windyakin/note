<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import RichText from "../RichText.vue";
import { getRichText } from "./helpers";
import type { Block } from "@/lib/notion";

const NotionRenderer = defineAsyncComponent(() => import("../NotionRenderer.vue"));

defineProps<{ items: Block[] }>();
</script>

<template>
  <ul class="nr-list nr-ul">
    <li v-for="item in items" :key="item.id" class="nr-li">
      <RichText :texts="getRichText(item)" />
      <NotionRenderer v-if="item.children?.length" :blocks="item.children" />
    </li>
  </ul>
</template>

<style scoped>
.nr-list {
  padding-left: 1.5em;
  margin: 0.25rem 0;
}
.nr-li {
  margin: 2px 0;
}
.nr-li :deep(.notion-renderer) {
  margin-top: 2px;
}
</style>
