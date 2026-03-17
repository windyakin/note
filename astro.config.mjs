import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";

export default defineConfig({
  site: "https://your-blog.pages.dev",
  output: "static",
  integrations: [vue()],
});
