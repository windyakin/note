<script setup lang="ts">
import { getCaption, getMediaUrl } from "./helpers";
import type { Block } from "@/lib/notion";

const props = defineProps<{ block: Block }>();

const fileUrl = getMediaUrl(props.block);
const label =
  getCaption(props.block)
    .map((t: any) => t.plain_text)
    .join("") || fileUrl;
</script>

<template>
  <div class="nr-file">
    <a :href="fileUrl" target="_blank" rel="noopener noreferrer" class="nr-file-link">
      📎 {{ label }}
    </a>
  </div>
</template>

<style scoped>
.nr-file {
  margin: 0.25rem 0;
}
.nr-file-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--c-border);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  transition: background 0.15s;
}
.nr-file-link:hover {
  background: var(--c-code-bg);
  text-decoration: none;
}
</style>
