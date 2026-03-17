<script setup lang="ts">
import RichText from "../RichText.vue";
import { getCaption } from "./helpers";
import type { Block } from "@/lib/notion";

const props = defineProps<{ block: Block }>();

const url: string = (props.block as any).bookmark?.url ?? "";
const ogp = props.block.ogp ?? null;
</script>

<template>
  <a
    :href="url"
    class="card nr-bookmark text-decoration-none my-3"
    target="_blank"
    rel="noopener noreferrer"
  >
    <div class="row g-0 nr-bookmark-row flex-column-reverse flex-sm-row">
      <div class="col-12 col-md-8">
        <div class="card-body d-flex flex-column h-100">
          <h6 class="card-title nr-bookmark-title mb-1">{{ ogp?.title ?? url }}</h6>
          <div v-if="ogp?.description" class="card-text nr-bookmark-desc text-body-secondary small mb-1">
            {{ ogp.description }}
          </div>
          <div v-else-if="getCaption(block).length" class="card-text nr-bookmark-desc text-body-secondary small mb-1">
            <RichText :texts="getCaption(block)" />
          </div>
          <div class="card-text d-flex align-items-center gap-1 mb-0 mt-auto nr-bookmark-site">
            <img
              v-if="ogp?.faviconUrl"
              :src="ogp.faviconUrl"
              class="rounded-1"
              width="16"
              height="16"
              loading="lazy"
              @error="($event.target as HTMLImageElement).style.display = 'none'"
            />
            <span v-if="ogp?.siteName" class="text-body-secondary fw-medium nr-bookmark-site-name">
              {{ ogp.siteName }}
            </span>
            <span class="text-body-secondary text-truncate">{{ url }}</span>
          </div>
        </div>
      </div>
      <div v-if="ogp?.imageUrl" class="col-12 col-md-4 nr-bookmark-cover rounded-end">
        <img :src="ogp.imageUrl" class="nr-bookmark-cover-bg" aria-hidden="true" />
        <img
          :src="ogp.imageUrl"
          :alt="ogp.title ?? ''"
          class="nr-bookmark-cover-img"
          loading="lazy"
        />
      </div>
      <div v-else class="col-12 col-md-4 d-flex align-items-center pe-3">
        <span class="text-body-secondary fs-5">&#x2197;</span>
      </div>
    </div>
  </a>
</template>

<style scoped>
.nr-bookmark {
  overflow: hidden;
}
.nr-bookmark:hover {
  border-color: var(--bs-primary) !important;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}
.nr-bookmark-cover {
  position: relative;
  overflow: hidden;
}
.nr-bookmark-cover-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(10px);
  transform: scale(1.1);
}
.nr-bookmark-title {
  font-size: 0.95rem;
}
.nr-bookmark-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
  font-size: 0.8rem;
  line-height: 1.1rem;
}
.nr-bookmark-site-name::after {
  content: "\00b7";
  margin-left: 4px;
}
.nr-bookmark-site {
  font-size: 0.8rem;
  white-space: nowrap;
}
.nr-bookmark-cover-img {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
@media (max-width: 575.98px) {
  .nr-bookmark-cover {
    width: 100%;
    max-height: 160px;
    border-radius: 0 !important;
    border-top-left-radius: var(--bs-card-border-radius) !important;
    border-top-right-radius: var(--bs-card-border-radius) !important;
  }
  .nr-bookmark-cover .nr-bookmark-cover-img {
    object-fit: cover;
  }
}
</style>
