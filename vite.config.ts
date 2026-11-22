import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";
import { execSync } from "node:child_process";

// Commit and date shown in Profile, so it's clear which version is running.
function commit(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "local";
  }
}

// Relative base so the build runs from any folder or subpath on any static host.
export default defineConfig({
  base: "./",
  server: { host: "127.0.0.1", port: 8081 },
  plugins: [react()],
  define: {
    __APP_BUILD__: JSON.stringify(`${process.env.npm_package_version ?? "0"} · ${commit()} · ${new Date().toISOString().slice(0, 10)}`),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        // Libraries change less often than the app, so they get their own cached files.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@radix-ui")) return "radix";
          return undefined;
        },
      },
    },
  },
});
