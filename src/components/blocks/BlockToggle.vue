<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import RichText from "../RichText.vue";
import { getRichText } from "./helpers";
import type { Block } from "@/lib/notion";

const NotionRenderer = defineAsyncComponent(() => import("../NotionRenderer.vue"));

defineProps<{ block: Block }>();
</script>

<template>
  <details class="nr-toggle">
    <summary class="nr-toggle-summary">
      <RichText :texts="getRichText(block)" />
    </summary>
    <div v-if="block.children?.length" class="nr-toggle-content">
      <NotionRenderer :blocks="block.children" />
    </div>
  </details>
</template>

<style scoped>
.nr-toggle {
  margin: 0.25rem 0;
}
.nr-toggle-summary {
  cursor: pointer;
  font-weight: 500;
  padding: 0.25rem 0;
  list-style: none;
}
.nr-toggle-summary::-webkit-details-marker {
  display: none;
}
.nr-toggle-summary::before {
  content: "\25B6";
  display: inline-block;
  font-size: 0.625rem;
  margin-right: 0.5rem;
  transition: transform 0.15s;
}
.nr-toggle:is(details[open]) > .nr-toggle-summary::before {
  transform: rotate(90deg);
}
.nr-toggle-content {
  padding-left: 1.25em;
}
</style>
