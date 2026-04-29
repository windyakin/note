<script setup lang="ts">
import type { RichText } from "@/lib/notion";

defineProps<{ texts: RichText[] }>();

function annotationClasses(annotations: RichText["annotations"]): string[] {
  const cls: string[] = [];
  if (annotations.bold) cls.push("nr-bold");
  if (annotations.italic) cls.push("nr-italic");
  if (annotations.strikethrough) cls.push("nr-strikethrough");
  if (annotations.underline) cls.push("nr-underline");
  if (annotations.code) cls.push("nr-inline-code");
  if (annotations.color && annotations.color !== "default") {
    cls.push(`nr-color-${annotations.color}`);
  }
  return cls;
}

function splitByNewline(text: string): string[] {
  return text.split("\n");
}
</script>

<template>
  <template v-for="(t, i) in texts" :key="i">
    <!-- mention -->
    <template v-if="t.type === 'mention'">
      <span class="nr-mention">
        <template v-for="(line, j) in splitByNewline(t.plain_text)" :key="j">
          <br v-if="j > 0" />{{ line }}
        </template>
      </span>
    </template>

    <!-- equation -->
    <template v-else-if="t.type === 'equation'">
      <code class="nr-equation">
        <template v-for="(line, j) in splitByNewline(t.plain_text)" :key="j">
          <br v-if="j > 0" />{{ line }}
        </template>
      </code>
    </template>

    <!-- text (default) -->
    <template v-else>
      <!-- リンク付き -->
      <a
        v-if="t.href"
        :href="t.href"
        :class="annotationClasses(t.annotations)"
        class="nr-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <template v-for="(line, j) in splitByNewline(t.plain_text)" :key="j">
          <br v-if="j > 0" />{{ line }}
        </template>
      </a>
      <!-- プレーンテキスト or アノテーション付き -->
      <span
        v-else
        :class="annotationClasses(t.annotations)"
      >
        <template v-for="(line, j) in splitByNewline(t.plain_text)" :key="j">
          <br v-if="j > 0" />{{ line }}
        </template>
      </span>
    </template>
  </template>
</template>

<style scoped>
.nr-bold {
  font-weight: 700;
}
.nr-italic {
  font-style: italic;
}
.nr-strikethrough {
  text-decoration: line-through;
}
.nr-underline {
  text-decoration: underline;
}
.nr-inline-code {
  font-family: var(--f-code);
  font-size: 0.85em;
  background: var(--c-code-bg);
  padding: 0.125em 0.35em;
  border-radius: 3px;
  color: #d63384;
}
.nr-link {
  color: var(--c-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.nr-mention {
  background: var(--c-accent-soft);
  padding: 0.125em 0.25em;
  border-radius: 3px;
  font-size: 0.9em;
}
.nr-equation {
  font-family: var(--f-code);
  font-style: italic;
}

/* Notion text colors */
.nr-color-gray { color: #9b9a97; }
.nr-color-brown { color: #64473a; }
.nr-color-orange { color: #d9730d; }
.nr-color-yellow { color: #dfab01; }
.nr-color-green { color: #0f7b6c; }
.nr-color-blue { color: #0b6e99; }
.nr-color-purple { color: #6940a5; }
.nr-color-pink { color: #ad1a72; }
.nr-color-red { color: #e03e3e; }

.nr-color-gray_background { background: #ebeced; }
.nr-color-brown_background { background: #e9e5e3; }
.nr-color-orange_background { background: #faebdd; }
.nr-color-yellow_background { background: #fbf3db; }
.nr-color-green_background { background: #ddedea; }
.nr-color-blue_background { background: #ddebf1; }
.nr-color-purple_background { background: #eae4f2; }
.nr-color-pink_background { background: #f4dfeb; }
.nr-color-red_background { background: #fbe4e4; }
</style>
