<script setup lang="ts">
import { ref, defineAsyncComponent } from "vue";
import RichText from "../RichText.vue";
import { getRichText } from "./helpers";
import type { Block } from "@/lib/notion";

const NotionRenderer = defineAsyncComponent(() => import("../NotionRenderer.vue"));

const props = defineProps<{ block: Block; level: 1 | 2 | 3 }>();

const tag = props.level === 1 ? "h2" : props.level === 2 ? "h3" : "h4";
const className = `nr-heading nr-h${props.level}`;

const isToggleable: boolean =
  (props.block as any)[props.block.type]?.is_toggleable ?? false;

const open = ref(false);
function toggle() {
  open.value = !open.value;
}
</script>

<template>
  <component :is="tag" :class="className" :id="block.id">
    <template v-if="isToggleable">
      <button class="nr-toggle-btn" @click="toggle">
        <span class="nr-toggle-icon" :class="{ 'nr-open': open }">▶</span>
        <RichText :texts="getRichText(block)" />
      </button>
      <div v-if="open && block.children?.length" class="nr-toggle-content">
        <NotionRenderer :blocks="block.children" />
      </div>
    </template>
    <template v-else>
      <RichText :texts="getRichText(block)" />
    </template>
  </component>
</template>

<style scoped>
.nr-heading {
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
}
.nr-h1 {
  font-size: 1.8rem;
  margin-top: 2.5rem;
  margin-bottom: 0.5rem;
}
.nr-h2 {
  font-size: 1.5rem;
  margin-top: 1.5rem;
  margin-bottom: 0.25rem;
}
.nr-h3 {
  font-size: 1.2rem;
  margin-top: 1.5rem;
  margin-bottom: 0.25rem;
}
.nr-toggle-btn {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.nr-toggle-icon {
  font-size: 0.625rem;
  transition: transform 0.15s;
  display: inline-block;
}
.nr-toggle-icon.nr-open {
  transform: rotate(90deg);
}
.nr-toggle-content {
  padding-left: 1.25em;
}
</style>
