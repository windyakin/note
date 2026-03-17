<script setup lang="ts">
import RichText from "../RichText.vue";
import { getRichText } from "./helpers";
import type { Block } from "@/lib/notion";

defineProps<{ block: Block }>();
</script>

<template>
  <p class="nr-paragraph">
    <RichText :texts="getRichText(block)" />
  </p>
</template>

<style scoped>
.nr-paragraph {
  margin: 0.4rem 0;
  line-height: 1.6;
}
.nr-paragraph:empty {
  min-height: 1rem;
}
</style>
