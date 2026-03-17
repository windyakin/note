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
  <div class="form-check">
    <input
      type="checkbox"
      :checked="checked"
      class="form-check-input"
    />
    <label :class="['form-check-label', { 'text-decoration-line-through text-body-secondary': checked }]">
      <RichText :texts="getRichText(block)" />
    </label>
    <NotionRenderer v-if="block.children?.length" :blocks="block.children" />
  </div>
</template>

<style scoped>
.form-check-input {
  margin-top: calc((1lh - 1em) / 2);
  pointer-events: none;
}
</style>
