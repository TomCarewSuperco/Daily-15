import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";

// Relative base so the build runs from any folder or subpath on any static host.
export default defineConfig({
  base: "./",
  server: { host: "127.0.0.1", port: 8081 },
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
