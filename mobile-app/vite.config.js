import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [nodePolyfills(), tailwindcss()],
  optimizeDeps: {
    exclude: ["@aztec/bb.js"],
  },
  resolve: {
    alias: {
      pino: "pino/browser.js",
    },
  },
});
