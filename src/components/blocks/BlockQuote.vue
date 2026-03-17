<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import RichText from "../RichText.vue";
import { getRichText } from "./helpers";
import type { Block } from "@/lib/notion";

const NotionRenderer = defineAsyncComponent(() => import("../NotionRenderer.vue"));

defineProps<{ block: Block }>();
</script>

<template>
  <blockquote class="nr-quote">
    <RichText :texts="getRichText(block)" />
    <NotionRenderer v-if="block.children?.length" :blocks="block.children" />
  </blockquote>
</template>

<style scoped>
.nr-quote {
  border-left: 3px solid var(--bs-body-color);
  padding: 0.25rem 1rem;
  margin: 1rem 0;
}
</style>
