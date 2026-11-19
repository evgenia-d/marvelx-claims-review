import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "web",
  plugins: [react({ babel: { plugins: ["babel-plugin-react-compiler"] } }), tailwindcss()],
  resolve: { alias: { "@shared": fileURLToPath(new URL("./shared", import.meta.url)) } },
  server: { port: 5173, proxy: { "/api": "http://localhost:8787" } },
});
