<script setup lang="ts">
import RichText from "../RichText.vue";
import { getCaption, getMediaUrl } from "./helpers";
import type { Block } from "@/lib/notion";

defineProps<{ block: Block }>();
</script>

<template>
  <figure class="nr-figure">
    <img
      :src="getMediaUrl(block)"
      :alt="getCaption(block).map((t: any) => t.plain_text).join('') || 'image'"
      class="nr-image"
      loading="lazy"
    />
    <figcaption v-if="getCaption(block).length" class="nr-caption">
      <RichText :texts="getCaption(block)" />
    </figcaption>
  </figure>
</template>

<style scoped>
.nr-figure {
  margin: 1rem 0;
}
.nr-image {
  display: block;
  border-radius: 0.375rem;
  max-width: 100%;
}
.nr-caption {
  font-size: 0.8125rem;
  color: var(--c-text-sub);
  margin-top: 0.25rem;
  text-align: center;
}
</style>
