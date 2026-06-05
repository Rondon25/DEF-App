import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/auth": {
        target: "http://localhost:8004",
        bypass: (req) =>
          req.method === "GET" && req.headers.accept?.includes("text/html") ? req.url : undefined,
      },
      "/staff": {
        target: "http://localhost:8004",
        bypass: (req) =>
          req.method === "GET" && req.headers.accept?.includes("text/html") ? req.url : undefined,
      },
      "/catalog": {
        target: "http://localhost:8004",
        bypass: (req) =>
          req.method === "GET" && req.headers.accept?.includes("text/html") ? req.url : undefined,
      },
      "/customers": {
        target: "http://localhost:8004",
        bypass: (req) =>
          req.method === "GET" && req.headers.accept?.includes("text/html") ? req.url : undefined,
      },
      "/orders": {
        target: "http://localhost:8004",
        bypass: (req) =>
          req.method === "GET" && req.headers.accept?.includes("text/html") ? req.url : undefined,
      },
      "/finance": {
        target: "http://localhost:8004",
        bypass: (req) =>
          req.method === "GET" && req.headers.accept?.includes("text/html") ? req.url : undefined,
      },
      "/admin":     "http://localhost:8004",
      "/uploads":   "http://localhost:8004",
      "/whatsapp":  "http://localhost:8004",
      "/health":    "http://localhost:8004",
    },
  },
});
