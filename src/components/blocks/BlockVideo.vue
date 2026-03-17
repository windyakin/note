<script setup lang="ts">
import RichText from "../RichText.vue";
import { getCaption, getMediaUrl } from "./helpers";
import type { Block } from "@/lib/notion";

const props = defineProps<{ block: Block }>();

function toYoutubeEmbed(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

const videoUrl = getMediaUrl(props.block);
const youtubeEmbed = toYoutubeEmbed(videoUrl);
</script>

<template>
  <figure class="nr-figure nr-video-figure">
    <template v-if="youtubeEmbed">
      <div class="nr-video-container">
        <iframe
          :src="youtubeEmbed"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="nr-video-iframe"
          loading="lazy"
        />
      </div>
    </template>
    <template v-else>
      <video :src="videoUrl" controls class="nr-video" />
    </template>
    <figcaption v-if="getCaption(block).length" class="nr-caption">
      <RichText :texts="getCaption(block)" />
    </figcaption>
  </figure>
</template>

<style scoped>
.nr-figure {
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
.nr-video {
  width: 100%;
  border-radius: 0.375rem;
}
.nr-caption {
  font-size: 0.8125rem;
  color: var(--c-text-sub);
  margin-top: 0.25rem;
  text-align: center;
}
</style>
