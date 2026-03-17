<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import RichText from "../RichText.vue";
import { getRichText } from "./helpers";
import type { Block } from "@/lib/notion";

const NotionRenderer = defineAsyncComponent(() => import("../NotionRenderer.vue"));

const props = defineProps<{ block: Block }>();

function getIcon(): string {
  const icon = (props.block as any).callout?.icon;
  if (!icon) return "💡";
  if (icon.type === "emoji") return icon.emoji;
  return "💡";
}
</script>

<template>
  <div class="nr-callout">
    <span class="nr-callout-icon">{{ getIcon() }}</span>
    <div class="nr-callout-content">
      <RichText :texts="getRichText(block)" />
      <NotionRenderer v-if="block.children?.length" :blocks="block.children" />
    </div>
  </div>
</template>

<style scoped>
.nr-callout {
  display: flex;
  gap: 0.5rem;
  background: var(--c-callout-bg);
  border-radius: 0.375rem;
  padding: 1rem;
  margin: 1rem 0;
}
.nr-callout-icon {
  font-size: 1.25rem;
  line-height: 1.6;
  flex-shrink: 0;
}
.nr-callout-content {
  flex: 1;
  min-width: 0;
}
</style>
