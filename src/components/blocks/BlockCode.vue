<script setup lang="ts">
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("css", css);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("php", php);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("python", python);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("scss", scss);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);

import RichText from "../RichText.vue";
import { getCaption } from "./helpers";
import type { Block, RichText as RichTextType } from "@/lib/notion";

const NOTION_LANG_MAP: Record<string, string> = {
  "plain text": "plaintext",
  "c++": "cpp",
  "c#": "csharp",
  "f#": "plaintext",
  "objective-c": "plaintext",
  "abap": "plaintext",
  "arduino": "cpp",
  "coffeescript": "plaintext",
  "dockerfile": "bash",
  "elixir": "plaintext",
  "elm": "plaintext",
  "erlang": "plaintext",
  "flow": "javascript",
  "fortran": "plaintext",
  "graphql": "plaintext",
  "groovy": "java",
  "haskell": "plaintext",
  "html": "xml",
  "julia": "plaintext",
  "latex": "plaintext",
  "less": "scss",
  "lisp": "plaintext",
  "livescript": "plaintext",
  "lua": "plaintext",
  "mermaid": "plaintext",
  "nix": "plaintext",
  "ocaml": "plaintext",
  "perl": "plaintext",
  "powershell": "bash",
  "prolog": "plaintext",
  "protobuf": "plaintext",
  "purescript": "plaintext",
  "r": "plaintext",
  "reason": "plaintext",
  "sass": "scss",
  "scala": "java",
  "scheme": "plaintext",
  "smalltalk": "plaintext",
  "solidity": "plaintext",
  "toml": "yaml",
  "tsx": "typescript",
  "vb.net": "plaintext",
  "verilog": "plaintext",
  "vhdl": "plaintext",
  "visual basic": "plaintext",
  "webassembly": "plaintext",
};

const props = defineProps<{ block: Block }>();

const lang: string = (props.block as any).code?.language ?? "";
const text: string = ((props.block as any).code?.rich_text ?? [] as RichTextType[])
  .map((t: RichTextType) => t.plain_text)
  .join("");

const hlLang = NOTION_LANG_MAP[lang.toLowerCase()] ?? (hljs.getLanguage(lang) ? lang : "plaintext");
const highlighted = hljs.highlight(text, { language: hlLang }).value;
</script>

<template>
  <div class="nr-code-wrapper">
    <div class="nr-code-header">
      <span class="nr-code-lang">{{ lang }}</span>
    </div>
    <pre class="nr-code"><code v-html="highlighted"></code></pre>
    <div v-if="getCaption(block).length" class="nr-caption">
      <RichText :texts="getCaption(block)" />
    </div>
  </div>
</template>

<style>
@import "highlight.js/styles/github.css";
</style>

<style scoped>

.nr-code-wrapper {
  margin: 1rem 0;
  border: 1px solid var(--c-border);
  border-radius: 0.375rem;
  overflow: hidden;
}
.nr-code-header {
  background: var(--c-code-bg);
  padding: 0.25rem 1rem;
  border-bottom: 1px solid var(--c-border);
}
.nr-code-lang {
  font-family: var(--f-code);
  font-size: 0.75rem;
  color: var(--c-text-sub);
  text-transform: lowercase;
}
.nr-code {
  background: var(--c-code-bg);
  padding: 1rem;
  margin-bottom: 0;
  overflow-x: auto;
  font-family: var(--f-code);
  line-height: 1.6;
  tab-size: 2;
}
.nr-code code {
  font-family: inherit;
  background: transparent;
  padding: 0;
}
.nr-caption {
  font-size: 0.8125rem;
  color: var(--c-text-sub);
  margin-top: 0.25rem;
  text-align: center;
}
</style>
