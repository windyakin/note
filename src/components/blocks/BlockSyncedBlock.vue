<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import type { Block } from "@/lib/notion";

const NotionRenderer = defineAsyncComponent(() => import("../NotionRenderer.vue"));

defineProps<{ block: Block }>();
</script>

<template>
  <div>
    <NotionRenderer v-if="block.children?.length" :blocks="block.children" />
  </div>
</template>
