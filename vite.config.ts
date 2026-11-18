import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Relative base so the build runs from any folder or subpath on any static host.
export default defineConfig({
  base: "./",
  server: { host: "127.0.0.1", port: 8081 },
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
