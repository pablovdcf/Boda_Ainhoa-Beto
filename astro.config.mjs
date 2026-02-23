import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  output: "static",
  integrations: [tailwind({ applyBaseStyles: false })],
  site: "https://boda-ainhoa-beto.vercel.app"
});

