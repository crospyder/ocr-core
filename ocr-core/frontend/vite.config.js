import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: ".",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: [
      "dms.spine-ict.hr",
      "localhost",
      "127.0.0.1"
    ],
    watch: {
      ignored: ['**/venv/**'],
    },
    proxy: {
      "/api": {
        target: "http://192.168.100.252:8000",
        changeOrigin: true,
        secure: false,
      },
      "/core": {
        target: "http://192.168.100.252:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    include: ["pdfjs-dist/build/pdf.worker.entry"]
  }
});
