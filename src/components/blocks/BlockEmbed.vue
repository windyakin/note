<script setup lang="ts">
import RichText from "../RichText.vue";
import { getCaption } from "./helpers";
import type { Block } from "@/lib/notion";

const props = defineProps<{ block: Block }>();

const embedUrl: string = (props.block as any).embed?.url ?? "";
</script>

<template>
  <div class="nr-embed">
    <div class="nr-video-container">
      <iframe
        :src="embedUrl"
        frameborder="0"
        allowfullscreen
        class="nr-video-iframe"
        loading="lazy"
      />
    </div>
    <div v-if="getCaption(block).length" class="nr-caption">
      <RichText :texts="getCaption(block)" />
    </div>
  </div>
</template>

<style scoped>
.nr-embed {
  margin: 1rem 0;
}
.nr-video-container {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  border-radius: 0.375rem;
}
.nr-video-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.nr-caption {
  font-size: 0.8125rem;
  color: var(--c-text-sub);
  margin-top: 0.25rem;
  text-align: center;
}
</style>
