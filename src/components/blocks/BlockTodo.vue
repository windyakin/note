<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import RichText from "../RichText.vue";
import { getRichText } from "./helpers";
import type { Block } from "@/lib/notion";

const NotionRenderer = defineAsyncComponent(() => import("../NotionRenderer.vue"));

const props = defineProps<{ block: Block }>();

const checked: boolean = (props.block as any).to_do?.checked ?? false;
</script>

<template>
  <div class="nr-todo">
    <label class="nr-todo-label">
      <input
        type="checkbox"
        :checked="checked"
        disabled
        class="nr-todo-checkbox"
      />
      <span :class="{ 'nr-todo-checked': checked }">
        <RichText :texts="getRichText(block)" />
      </span>
    </label>
    <NotionRenderer v-if="block.children?.length" :blocks="block.children" />
  </div>
</template>

<style scoped>
.nr-todo {
  margin: 2px 0;
}
.nr-todo-label {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: default;
}
.nr-todo-checkbox {
  margin-top: 0.35em;
  accent-color: var(--c-accent);
}
.nr-todo-checked {
  text-decoration: line-through;
  color: var(--c-text-sub);
}
</style>
