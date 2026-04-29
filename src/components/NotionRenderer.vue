<script setup lang="ts">
/**
 * NotionRenderer.vue
 *
 * Notion のブロック配列を受け取り、各ブロックタイプに応じた
 * コンポーネントへ振り分けて再帰的にレンダリングする。
 */
import type { Block } from "@/lib/notion";

import BlockParagraph from "./blocks/BlockParagraph.vue";
import BlockHeading from "./blocks/BlockHeading.vue";
import BlockBulletedList from "./blocks/BlockBulletedList.vue";
import BlockNumberedList from "./blocks/BlockNumberedList.vue";
import BlockTodo from "./blocks/BlockTodo.vue";
import BlockToggle from "./blocks/BlockToggle.vue";
import BlockCode from "./blocks/BlockCode.vue";
import BlockQuote from "./blocks/BlockQuote.vue";
import BlockCallout from "./blocks/BlockCallout.vue";
import BlockDivider from "./blocks/BlockDivider.vue";
import BlockImage from "./blocks/BlockImage.vue";
import BlockVideo from "./blocks/BlockVideo.vue";
import BlockBookmark from "./blocks/BlockBookmark.vue";

import BlockEmbed from "./blocks/BlockEmbed.vue";
import BlockTable from "./blocks/BlockTable.vue";
import BlockColumnList from "./blocks/BlockColumnList.vue";
import BlockFile from "./blocks/BlockFile.vue";
import BlockSyncedBlock from "./blocks/BlockSyncedBlock.vue";

defineProps<{ blocks: Block[] }>();

/** 連続する list_item を <ul>/<ol> でグルーピングするためのヘルパー */
function groupBlocks(blocks: Block[]) {
  const groups: Array<{ type: string; items: Block[] }> = [];

  for (const block of blocks) {
    const t = block.type;

    if (t === "bulleted_list_item" || t === "numbered_list_item") {
      const last = groups[groups.length - 1];
      if (last && last.type === t) {
        last.items.push(block);
      } else {
        groups.push({ type: t, items: [block] });
      }
    } else {
      groups.push({ type: t, items: [block] });
    }
  }

  return groups;
}
</script>

<template>
  <div class="notion-renderer">
    <template v-for="group in groupBlocks(blocks)" :key="group.items[0].id">
      <!-- Bulleted List -->
      <BlockBulletedList
        v-if="group.type === 'bulleted_list_item'"
        :items="group.items"
      />

      <!-- Numbered List -->
      <BlockNumberedList
        v-else-if="group.type === 'numbered_list_item'"
        :items="group.items"
      />

      <!-- Single blocks -->
      <template v-else v-for="block in group.items" :key="block.id">
        <BlockParagraph v-if="block.type === 'paragraph'" :block="block" />

        <BlockHeading v-else-if="block.type === 'heading_1'" :block="block" :level="1" />
        <BlockHeading v-else-if="block.type === 'heading_2'" :block="block" :level="2" />
        <BlockHeading v-else-if="block.type === 'heading_3'" :block="block" :level="3" />

        <BlockTodo v-else-if="block.type === 'to_do'" :block="block" />
        <BlockToggle v-else-if="block.type === 'toggle'" :block="block" />
        <BlockCode v-else-if="block.type === 'code'" :block="block" />
        <BlockQuote v-else-if="block.type === 'quote'" :block="block" />
        <BlockCallout v-else-if="block.type === 'callout'" :block="block" />
        <BlockDivider v-else-if="block.type === 'divider'" />
        <BlockImage v-else-if="block.type === 'image'" :block="block" />
        <BlockVideo v-else-if="block.type === 'video'" :block="block" />
        <BlockBookmark
          v-else-if="block.type === 'bookmark' || block.type === 'link_preview'"
          :block="block"
        />
        <BlockEmbed v-else-if="block.type === 'embed'" :block="block" />
        <BlockTable v-else-if="block.type === 'table'" :block="block" />
        <BlockColumnList v-else-if="block.type === 'column_list'" :block="block" />
        <BlockFile v-else-if="['file', 'pdf', 'audio'].includes(block.type)" :block="block" />
        <BlockSyncedBlock v-else-if="block.type === 'synced_block'" :block="block" />

        <!-- Unsupported block -->
        <div v-else class="nr-unsupported">
          <!-- {{ block.type }} ブロックは未対応です -->
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.notion-renderer > :deep(:first-child) {
  margin-top: 0 !important;
}
</style>
