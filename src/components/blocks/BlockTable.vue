<script setup lang="ts">
import RichText from "../RichText.vue";
import type { Block, RichText as RichTextType } from "@/lib/notion";

const props = defineProps<{ block: Block }>();

const hasHeader: boolean = (props.block as any).table?.has_column_header ?? false;

function getCells(row: Block): RichTextType[][] {
  return (row as any).table_row?.cells ?? [];
}
</script>

<template>
  <div class="nr-table-wrapper">
    <table class="nr-table">
      <thead v-if="hasHeader && block.children?.length">
        <tr>
          <th
            v-for="(cell, ci) in getCells(block.children[0])"
            :key="ci"
            class="nr-th"
          >
            <RichText :texts="cell" />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, ri) in (block.children ?? []).slice(hasHeader ? 1 : 0)"
          :key="ri"
        >
          <td
            v-for="(cell, ci) in getCells(row)"
            :key="ci"
            class="nr-td"
          >
            <RichText :texts="cell" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.nr-table-wrapper {
  margin: 1rem 0;
  overflow-x: auto;
}
.nr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.nr-th,
.nr-td {
  border: 1px solid var(--c-border);
  padding: 0.5rem 1rem;
  text-align: left;
}
.nr-th {
  background: var(--c-code-bg);
  font-weight: 600;
}
</style>
