<script setup lang="ts">
import RichText from "../RichText.vue";
import { getCaption } from "./helpers";
import type { Block, RichText as RichTextType } from "@/lib/notion";

const props = defineProps<{ block: Block }>();

const lang: string = (props.block as any).code?.language ?? "";
const text: string = ((props.block as any).code?.rich_text ?? [] as RichTextType[])
  .map((t: RichTextType) => t.plain_text)
  .join("");
</script>

<template>
  <div class="nr-code-wrapper">
    <div class="nr-code-header">
      <span class="nr-code-lang">{{ lang }}</span>
    </div>
    <pre class="nr-code"><code>{{ text }}</code></pre>
    <div v-if="getCaption(block).length" class="nr-caption">
      <RichText :texts="getCaption(block)" />
    </div>
  </div>
</template>

<style scoped>
.nr-code-wrapper {
  margin: 1rem 0;
  border: 1px solid var(--c-border);
  border-radius: 0.375rem;
  overflow: hidden;
}
.nr-code-header {
  background: var(--c-code-bg);
  padding: 0.25rem 1rem;
  border-bottom: 1px solid var(--c-border);
}
.nr-code-lang {
  font-family: var(--f-code);
  font-size: 0.75rem;
  color: var(--c-text-sub);
  text-transform: lowercase;
}
.nr-code {
  background: var(--c-code-bg);
  padding: 1rem;
  overflow-x: auto;
  font-family: var(--f-code);
  font-size: 0.8125rem;
  line-height: 1.6;
  tab-size: 2;
}
.nr-code code {
  font-family: inherit;
}
.nr-caption {
  font-size: 0.8125rem;
  color: var(--c-text-sub);
  margin-top: 0.25rem;
  text-align: center;
}
</style>
