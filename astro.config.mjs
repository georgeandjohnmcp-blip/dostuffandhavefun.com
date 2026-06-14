import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://dostuffandhavefun.com",
  integrations: [sitemap()]
});
