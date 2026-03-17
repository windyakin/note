<script setup lang="ts">
import type { Block } from "@/lib/notion";

const props = defineProps<{ block: Block }>();

const url: string = (props.block as any).link_preview?.url ?? "";
const ogp = props.block.ogp ?? null;
</script>

<template>
  <a
    :href="url"
    class="nr-bookmark"
    target="_blank"
    rel="noopener noreferrer"
  >
    <div class="nr-bookmark-info">
      <span class="nr-bookmark-title">{{ ogp?.title ?? url }}</span>
      <span v-if="ogp?.description" class="nr-bookmark-desc">
        {{ ogp.description }}
      </span>
      <span class="nr-bookmark-url-row">
        <img
          v-if="ogp?.faviconUrl"
          :src="ogp.faviconUrl"
          class="nr-bookmark-favicon"
          width="16"
          height="16"
          loading="lazy"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <span v-if="ogp?.siteName" class="nr-bookmark-site-name">
          {{ ogp.siteName }}
        </span>
        <span class="nr-bookmark-url">{{ url }}</span>
      </span>
    </div>
    <div v-if="ogp?.imageUrl" class="nr-bookmark-cover">
      <img
        :src="ogp.imageUrl"
        :alt="ogp.title ?? ''"
        class="nr-bookmark-cover-img"
        loading="lazy"
      />
    </div>
    <div v-else class="nr-bookmark-link-icon">&#x2197;</div>
  </a>
</template>

<style scoped>
.nr-bookmark {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--c-border);
  border-radius: 0.375rem;
  overflow: hidden;
  margin: 1rem 0;
  background: var(--c-bookmark-bg);
  text-decoration: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.nr-bookmark:hover {
  border-color: var(--c-accent);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  text-decoration: none;
}
.nr-bookmark-info {
  flex: 1;
  padding: 1rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nr-bookmark-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--bs-body-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nr-bookmark-desc {
  font-size: 0.8125rem;
  color: var(--c-text-sub);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
}
.nr-bookmark-url {
  font-size: 0.75rem;
  color: var(--c-text-sub);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nr-bookmark-link-icon {
  padding: 1rem;
  font-size: 1.25rem;
  color: var(--c-text-sub);
  flex-shrink: 0;
  align-self: center;
}
.nr-bookmark-cover {
  flex-shrink: 0;
  width: 230px;
  overflow: hidden;
  border-left: 1px solid var(--c-border);
}
.nr-bookmark-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.nr-bookmark-url-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--c-text-sub);
  overflow: hidden;
}
.nr-bookmark-favicon {
  flex-shrink: 0;
  border-radius: 2px;
}
.nr-bookmark-site-name {
  flex-shrink: 0;
  font-weight: 500;
}
.nr-bookmark-site-name::after {
  content: "\00b7";
  margin-left: 4px;
}

@media (max-width: 576px) {
  .nr-bookmark {
    flex-direction: column;
  }
  .nr-bookmark-cover {
    width: 100%;
    max-height: 160px;
    border-left: none;
    border-top: 1px solid var(--c-border);
    order: -1;
  }
}
</style>
